# OAuth MCP Server

A minimal OAuth-compliant MCP (Model Context Protocol) server designed to work with Claude Web's "Connect" button.

## Goal
Get Claude Web to connect via the "Connect" button and show "Connected" status.

## Architecture
- **Platform**: Cloudflare Workers
- **Transport**: Server-Sent Events (SSE)
- **Authentication**: OAuth 2.0 with PKCE
- **Protocol**: MCP (Model Context Protocol)

## Project Structure
```
oauth-mcp-server/
├── src/
│   ├── index.ts           # Main worker entry point
│   ├── oauth/             # OAuth implementation
│   │   ├── endpoints.ts   # OAuth endpoints (/authorize, /token, etc.)
│   │   └── utils.ts       # JWT utilities, crypto functions
│   ├── mcp/               # MCP protocol implementation
│   │   ├── protocol.ts    # MCP message handling
│   │   ├── tools.ts       # Minimal tools (echo, ping)
│   │   └── transport.ts   # SSE transport layer
│   └── types.ts           # TypeScript type definitions
├── wrangler.toml          # Cloudflare Workers configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── deployment.md          # Deployment instructions for Windsurf
```

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Cloudflare environment:
   ```bash
   npx wrangler login
   ```

3. Set secrets:
   ```bash
   npx wrangler secret put JWT_SECRET
   ```

4. Run locally:
   ```bash
   npm run dev
   ```

5. Deploy:
   ```bash
   npm run deploy
   ```

## Testing with Claude Web

1. Deploy the worker to get your URL
2. In Claude Web, click "Connect"
3. Use your worker URL as the server endpoint
4. Complete OAuth flow
5. Verify "Connected" status appears

## Next Steps for Windsurf

See `deployment.md` for detailed deployment and testing instructions.
