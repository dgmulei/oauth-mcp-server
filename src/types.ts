// Type definitions for OAuth MCP Server

export interface Env {
  JWT_SECRET: string;
}

// OAuth Types
export interface OAuthConfig {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  code_challenge_methods_supported: string[];
  scopes_supported: string[];
}

export interface AuthorizeRequest {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: string;
}

export interface TokenRequest {
  grant_type: string;
  code: string;
  redirect_uri: string;
  client_id: string;
  code_verifier: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// MCP Protocol Types
export interface MCPMessage {
  jsonrpc: "2.0";
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: {
    roots?: {
      listChanged?: boolean;
    };
    sampling?: {};
  };
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: {
    tools?: {
      listChanged?: boolean;
    };
    resources?: {
      listChanged?: boolean;
    };
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments?: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

// Session Types
export interface AuthSession {
  code: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  clientId: string;
  scope?: string;
  state?: string;
  expiresAt: number;
}

export interface JWTPayload {
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  scope?: string;
}