// MCP Protocol implementation

import { 
  MCPMessage, 
  MCPInitializeParams, 
  MCPInitializeResult,
  MCPTool,
  MCPToolCall,
  MCPToolResult 
} from '../types';

/**
 * MCP Server capabilities and info
 */
const SERVER_INFO = {
  name: "oauth-mcp-server",
  version: "1.0.0"
};

const SERVER_CAPABILITIES = {
  tools: {
    listChanged: false
  }
};

/**
 * Available MCP tools
 */
const AVAILABLE_TOOLS: MCPTool[] = [
  {
    name: "echo",
    description: "Echo back the provided text",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to echo back"
        }
      },
      required: ["text"]
    }
  },
  {
    name: "ping",
    description: "Simple ping test that returns pong",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "timestamp",
    description: "Get current server timestamp",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  }
];

/**
 * Handle MCP protocol messages
 */
export function handleMCPMessage(message: MCPMessage): MCPMessage {
  try {
    switch (message.method) {
      case 'initialize':
        return handleInitialize(message);
      
      case 'tools/list':
        return handleToolsList(message);
      
      case 'tools/call':
        return handleToolsCall(message);
      
      case 'ping':
        return handlePing(message);
      
      default:
        return createErrorResponse(message.id, -32601, `Method not found: ${message.method}`);
    }
  } catch (error) {
    console.error('Error handling MCP message:', error);
    return createErrorResponse(message.id, -32603, 'Internal error');
  }
}

/**
 * Handle initialize request
 */
function handleInitialize(message: MCPMessage): MCPMessage {
  const params = message.params as MCPInitializeParams;
  
  // Validate protocol version
  if (!params.protocolVersion || !params.protocolVersion.startsWith('2024-')) {
    return createErrorResponse(message.id, -32602, 'Unsupported protocol version');
  }
  
  const result: MCPInitializeResult = {
    protocolVersion: params.protocolVersion,
    capabilities: SERVER_CAPABILITIES,
    serverInfo: SERVER_INFO
  };
  
  return {
    jsonrpc: "2.0",
    id: message.id,
    result
  };
}

/**
 * Handle tools/list request
 */
function handleToolsList(message: MCPMessage): MCPMessage {
  return {
    jsonrpc: "2.0",
    id: message.id,
    result: {
      tools: AVAILABLE_TOOLS
    }
  };
}

/**
 * Handle tools/call request
 */
function handleToolsCall(message: MCPMessage): MCPMessage {
  const params = message.params as { name: string; arguments?: Record<string, any> };
  
  if (!params.name) {
    return createErrorResponse(message.id, -32602, 'Missing tool name');
  }
  
  const tool = AVAILABLE_TOOLS.find(t => t.name === params.name);
  if (!tool) {
    return createErrorResponse(message.id, -32602, `Unknown tool: ${params.name}`);
  }
  
  let result: MCPToolResult;
  
  try {
    switch (params.name) {
      case 'echo':
        result = executeEcho(params.arguments);
        break;
      
      case 'ping':
        result = executePing();
        break;
      
      case 'timestamp':
        result = executeTimestamp();
        break;
      
      default:
        return createErrorResponse(message.id, -32602, `Tool not implemented: ${params.name}`);
    }
  } catch (error) {
    return createErrorResponse(message.id, -32603, `Tool execution failed: ${error}`);
  }
  
  return {
    jsonrpc: "2.0",
    id: message.id,
    result
  };
}

/**
 * Handle ping request
 */
function handlePing(message: MCPMessage): MCPMessage {
  return {
    jsonrpc: "2.0",
    id: message.id,
    result: {}
  };
}

/**
 * Execute echo tool
 */
function executeEcho(args?: Record<string, any>): MCPToolResult {
  const text = args?.text || '';
  
  return {
    content: [{
      type: "text",
      text: `Echo: ${text}`
    }]
  };
}

/**
 * Execute ping tool
 */
function executePing(): MCPToolResult {
  return {
    content: [{
      type: "text",
      text: "pong"
    }]
  };
}

/**
 * Execute timestamp tool
 */
function executeTimestamp(): MCPToolResult {
  const now = new Date();
  
  return {
    content: [{
      type: "text",
      text: `Current server time: ${now.toISOString()}`
    }]
  };
}

/**
 * Create standardized error response
 */
function createErrorResponse(id: string | number | undefined, code: number, message: string): MCPMessage {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message
    }
  };
}

/**
 * Validate MCP message structure
 */
export function validateMCPMessage(data: any): data is MCPMessage {
  return (
    data &&
    typeof data === 'object' &&
    data.jsonrpc === "2.0" &&
    (data.method || data.result !== undefined || data.error !== undefined)
  );
}