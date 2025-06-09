// OAuth endpoints implementation

import { 
  OAuthConfig, 
  AuthorizeRequest, 
  TokenRequest, 
  TokenResponse,
  AuthSession,
  JWTPayload,
  Env 
} from '../types';
import { 
  generateAuthCode, 
  generateRandomString, 
  verifyCodeChallenge, 
  createJWT,
  getCORSHeaders 
} from './utils';

// In-memory session store (for production, use Cloudflare KV)
const sessions = new Map<string, AuthSession>();

/**
 * Get OAuth discovery configuration
 */
export function getOAuthConfig(baseUrl: string): OAuthConfig {
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mcp"]
  };
}

/**
 * Handle OAuth authorization endpoint
 */
export async function handleAuthorize(request: Request, baseUrl: string): Promise<Response> {
  const url = new URL(request.url);
  const params = url.searchParams;
  
  // Parse authorization request
  const authRequest: Partial<AuthorizeRequest> = {
    response_type: params.get('response_type') || '',
    client_id: params.get('client_id') || '',
    redirect_uri: params.get('redirect_uri') || '',
    scope: params.get('scope') || 'mcp',
    state: params.get('state') || undefined,
    code_challenge: params.get('code_challenge') || '',
    code_challenge_method: params.get('code_challenge_method') || 'S256'
  };
  
  // Validate request
  if (authRequest.response_type !== 'code') {
    return redirectWithError(authRequest.redirect_uri!, 'unsupported_response_type', authRequest.state);
  }
  
  if (!authRequest.client_id || !authRequest.redirect_uri || !authRequest.code_challenge) {
    return redirectWithError(authRequest.redirect_uri!, 'invalid_request', authRequest.state);
  }
  
  if (authRequest.code_challenge_method !== 'S256') {
    return redirectWithError(authRequest.redirect_uri!, 'invalid_request', authRequest.state);
  }
  
  // Generate authorization code
  const code = generateAuthCode();
  
  // Store session
  const session: AuthSession = {
    code,
    codeChallenge: authRequest.code_challenge,
    codeChallengeMethod: authRequest.code_challenge_method,
    redirectUri: authRequest.redirect_uri,
    clientId: authRequest.client_id,
    scope: authRequest.scope,
    state: authRequest.state,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  };
  
  sessions.set(code, session);
  
  // For minimal implementation, auto-approve (in production, show consent page)
  const redirectUrl = new URL(authRequest.redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (authRequest.state) {
    redirectUrl.searchParams.set('state', authRequest.state);
  }
  
  return Response.redirect(redirectUrl.toString(), 302);
}

/**
 * Handle OAuth token endpoint
 */
export async function handleToken(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'invalid_request' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
    });
  }
  
  let tokenRequest: Partial<TokenRequest>;
  
  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      tokenRequest = {
        grant_type: formData.get('grant_type') as string,
        code: formData.get('code') as string,
        redirect_uri: formData.get('redirect_uri') as string,
        client_id: formData.get('client_id') as string,
        code_verifier: formData.get('code_verifier') as string
      };
    } else {
      tokenRequest = await request.json();
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
    });
  }
  
  // Validate token request
  if (tokenRequest.grant_type !== 'authorization_code') {
    return new Response(JSON.stringify({ error: 'unsupported_grant_type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
    });
  }
  
  if (!tokenRequest.code || !tokenRequest.redirect_uri || !tokenRequest.client_id || !tokenRequest.code_verifier) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
    });
  }
  
  // Retrieve session
  const session = sessions.get(tokenRequest.code);
  if (!session) {
    return new Response(JSON.stringify({ error: 'invalid_grant' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
    });
  }
  
  // Check expiration
  if (Date.now() > session.expiresAt) {
    sessions.delete(tokenRequest.code);
    return new Response(JSON.stringify({ error: 'invalid_grant' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
    });
  }
  
  // Validate session
  if (session.redirectUri !== tokenRequest.redirect_uri || session.clientId !== tokenRequest.client_id) {
    return new Response(JSON.stringify({ error: 'invalid_grant' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
    });
  }
  
  // Verify PKCE code challenge
  try {
    const isValid = await verifyCodeChallenge(
      tokenRequest.code_verifier,
      session.codeChallenge,
      session.codeChallengeMethod
    );
    
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'invalid_grant' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
    });
  }
  
  // Generate access token
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    sub: session.clientId,
    iss: new URL(request.url).origin,
    aud: 'mcp-server',
    exp: now + 3600, // 1 hour
    iat: now,
    scope: session.scope
  };
  
  const accessToken = await createJWT(payload, env.JWT_SECRET);
  
  // Clean up session
  sessions.delete(tokenRequest.code);
  
  const tokenResponse: TokenResponse = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: session.scope
  };
  
  return new Response(JSON.stringify(tokenResponse), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
  });
}

/**
 * Helper function to redirect with OAuth error
 */
function redirectWithError(redirectUri: string, error: string, state?: string): Response {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error);
  if (state) {
    url.searchParams.set('state', state);
  }
  return Response.redirect(url.toString(), 302);
}

/**
 * Handle OAuth discovery endpoints
 */
export async function handleWellKnown(request: Request, baseUrl: string): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  if (pathname === '/.well-known/oauth-authorization-server') {
    return new Response(JSON.stringify(getOAuthConfig(baseUrl)), {
      headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
    });
  }
  
  if (pathname === '/.well-known/oauth-protected-resource') {
    return new Response(JSON.stringify({
      resource_server: baseUrl,
      authorization_servers: [baseUrl],
      scopes_supported: ["mcp"],
      bearer_methods_supported: ["header"]
    }), {
      headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
    });
  }
  
  return new Response('Not Found', { status: 404 });
}