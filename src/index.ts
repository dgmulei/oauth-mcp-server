// Main Cloudflare Worker entry point

import { Env } from './types';
import { getCORSHeaders } from './oauth/utils';
import { handleWellKnown, handleAuthorize, handleToken } from './oauth/endpoints';
import { handleSSE, handleMCPRequest, handleOptionsRequest } from './mcp/transport';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;
    const baseUrl = `${url.protocol}//${url.host}`;

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return handleOptionsRequest();
    }

    try {
      // OAuth Discovery Endpoints
      if (pathname.startsWith('/.well-known/')) {
        return await handleWellKnown(request, baseUrl);
      }

      // OAuth Authorization Endpoint
      if (pathname === '/authorize') {
        return await handleAuthorize(request, baseUrl);
      }

      // OAuth Token Endpoint  
      if (pathname === '/token') {
        return await handleToken(request, env);
      }

      // MCP SSE Endpoint
      if (pathname === '/sse' || pathname === '/mcp') {
        if (method === 'GET') {
          return await handleSSE(request, env);
        } else if (method === 'POST') {
          return await handleMCPRequest(request, env);
        }
      }

      // Health check endpoint
      if (pathname === '/health' || pathname === '/') {
        return new Response(JSON.stringify({
          status: 'healthy',
          server: 'oauth-mcp-server',
          version: '1.0.0',
          endpoints: {
            oauth_discovery: '/.well-known/oauth-authorization-server',
            oauth_resource: '/.well-known/oauth-protected-resource', 
            authorize: '/authorize',
            token: '/token',
            mcp_sse: '/sse',
            mcp_messages: '/mcp'
          }
        }), {
          headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
        });
      }

      // Default 404
      return new Response('Not Found', { 
        status: 404,
        headers: getCORSHeaders()
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: getCORSHeaders()
      });
    }
  },
};