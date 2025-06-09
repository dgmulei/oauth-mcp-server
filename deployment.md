# Deployment Instructions for Windsurf

## Overview
This document contains step-by-step instructions for deploying the OAuth MCP Server to Cloudflare Workers and testing the integration with Claude Web.

## Prerequisites
- Cloudflare account (user confirmed they have one)
- Node.js installed
- Git (for version control)

## Phase 1: Initial Setup

### 1.1 Install Dependencies
```bash
cd /Users/davidmulei2025/Desktop/oauth-mcp-server
npm install
```

### 1.2 Install Wrangler CLI
```bash
npm install -g wrangler
```

### 1.3 Authenticate with Cloudflare
```bash
wrangler login
```
This will open a browser window for authentication.

### 1.4 Generate JWT Secret
```bash
openssl rand -base64 32
```
Copy the output - you'll need it for the next step.

### 1.5 Set Environment Variables
```bash
wrangler secret put JWT_SECRET
```
When prompted, paste the JWT secret from step 1.4.

## Phase 2: Deployment

### 2.1 Test Local Development
```bash
npm run dev
```
This should start the worker locally. Test these endpoints:
- http://localhost:8787/ (health check)
- http://localhost:8787/.well-known/oauth-authorization-server

### 2.2 Deploy to Cloudflare
```bash
npm run deploy
```

### 2.3 Note Your Worker URL
After deployment, Wrangler will display your worker URL, something like:
`https://oauth-mcp-server.your-subdomain.workers.dev`

**IMPORTANT**: Save this URL - you'll need it for testing.

## Phase 3: Testing OAuth Flow

### 3.1 Test OAuth Discovery
Visit these URLs in a browser and verify they return JSON:

1. `https://your-worker-url/.well-known/oauth-authorization-server`
2. `https://your-worker-url/.well-known/oauth-protected-resource`

Expected responses should include authorization and token endpoints.

### 3.2 Test Health Check
Visit: `https://your-worker-url/`

Should return server status and available endpoints.

### 3.3 Manual OAuth Flow Test (Optional)
You can test the OAuth flow manually:

1. **Authorization Request**:
   ```
   https://your-worker-url/authorize?response_type=code&client_id=test&redirect_uri=https://example.com&code_challenge=CHALLENGE&code_challenge_method=S256
   ```
   
   Should redirect to: `https://example.com?code=GENERATED_CODE`

2. **Token Exchange** (use curl or Postman):
   ```bash
   curl -X POST https://your-worker-url/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=GENERATED_CODE&redirect_uri=https://example.com&client_id=test&code_verifier=VERIFIER"
   ```

## Phase 4: Claude Web Integration Testing

### 4.1 Test in Claude Web
1. Open Claude Web interface
2. Look for "Connect" button (location may vary)
3. Enter your worker URL: `https://your-worker-url`
4. Complete OAuth authorization flow
5. Verify "Connected" status appears

### 4.2 Test MCP Communication
After connection, Claude should be able to:
- List available tools (echo, ping, timestamp, status)
- Execute tools and receive responses

## Phase 5: Debugging

### 5.1 Check Worker Logs
```bash
wrangler tail
```
This shows real-time logs from your worker.

### 5.2 Common Issues and Solutions

**Issue**: "Claude was unable to connect"
- **Check**: Worker URL is accessible and returns 200 for health check
- **Check**: OAuth discovery endpoints return valid JSON
- **Check**: CORS headers are properly set

**Issue**: "Invalid token" errors
- **Check**: JWT_SECRET is properly set in Cloudflare
- **Check**: Token expiration (currently set to 1 hour)

**Issue**: "Method not found" MCP errors
- **Check**: MCP protocol implementation matches expected message format
- **Check**: Tool names and schemas are correct

### 5.3 Testing Commands

Test OAuth endpoints:
```bash
# Test discovery
curl https://your-worker-url/.well-known/oauth-authorization-server

# Test health
curl https://your-worker-url/health
```

Test with authentication:
```bash
# Get a token first via OAuth flow, then:
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-worker-url/sse
```

## Phase 6: Success Criteria

✅ **Deployment Success**:
- Worker deploys without errors
- All endpoints respond correctly
- JWT secret is configured

✅ **OAuth Success**:
- Discovery endpoints return proper JSON
- Authorization flow completes
- Token exchange works

✅ **Claude Integration Success**:
- Claude Web shows "Connected" status
- No connection errors in logs
- MCP tools are available and working

## Phase 7: Next Steps (Post-Success)

If successful, consider:
1. Setting up custom domain (optional)
2. Adding more sophisticated tools
3. Implementing WebSocket transport for better performance
4. Adding proper user management and consent screens

## Emergency Rollback

If issues occur:
```bash
# Revert deployment
wrangler rollback

# Or redeploy previous version
git checkout HEAD~1
wrangler deploy
```

## Contact Points

If you encounter issues during deployment:
1. Check worker logs with `wrangler tail`
2. Verify all endpoints manually with curl
3. Test OAuth flow step-by-step
4. Report specific error messages for debugging

---

**Remember**: The goal is to see "Connected" status in Claude Web. Everything else is secondary to achieving this core objective.