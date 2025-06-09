// Server-Sent Events transport for MCP

import { MCPMessage, JWTPayload, Env } from '../types';
import { verifyJWT, getCORSHeaders } from '../oauth/utils';
import { handleMCPMessage, validateMCPMessage } from './protocol';

/**
 * Handle SSE connection for MCP communication
 */
export async function handleSSE(request: Request, env: Env): Promise<Response> {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { 
      status: 401,
      headers: getCORSHeaders()
    });
  }
  
  const token = authHeader.substring(7);
  let payload: JWTPayload;
  
  try {
    payload = await verifyJWT(token, env.JWT_SECRET);
  } catch (error) {
    return new Response('Invalid token', { 
      status: 401,
      headers: getCORSHeaders()
    });
  }
  
  // Create SSE stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  
  // Send initial connection event
  await writer.write(encoder.encode('event: connected\n'));
  await writer.write(encoder.encode('data: {"status":"connected"}\n\n'));
  
  // Handle incoming messages via separate endpoint
  // This is a simplified implementation - in production, you'd want WebSocket-like bidirectional communication
  
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...getCORSHeaders()
    }
  });
}

/**
 * Handle MCP message endpoint (POST requests)
 */
export async function handleMCPRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: getCORSHeaders()
    });
  }
  
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { 
      status: 401,
      headers: getCORSHeaders()
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    await verifyJWT(token, env.JWT_SECRET);
  } catch (error) {
    return new Response('Invalid token', { 
      status: 401,
      headers: getCORSHeaders()
    });
  }
  
  // Parse MCP message
  let message: MCPMessage;
  try {
    const body = await request.text();
    message = JSON.parse(body);
    
    if (!validateMCPMessage(message)) {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: "Invalid Request"
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error"
      }
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
    });
  }
  
  // Handle the message
  const response = handleMCPMessage(message);
  
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json', ...getCORSHeaders() }
  });
}

/**
 * Handle WebSocket upgrade for real-time MCP communication
 * Note: Cloudflare Workers supports WebSockets via Durable Objects
 */
export async function handleWebSocket(request: Request, env: Env): Promise<Response> {
  const upgradeHeader = request.headers.get('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected websocket', { status: 426 });
  }
  
  // For now, return not implemented - WebSocket support requires Durable Objects
  return new Response('WebSocket not implemented in minimal version', { 
    status: 501,
    headers: getCORSHeaders()
  });
}

/**
 * Send SSE message to client
 */
export function createSSEMessage(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleOptionsRequest(): Response {
  return new Response(null, {
    status: 200,
    headers: getCORSHeaders()
  });
}