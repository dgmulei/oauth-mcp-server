#!/bin/bash

# Quick test script for OAuth MCP Server
# Usage: ./test.sh <worker-url>

WORKER_URL=${1:-"http://localhost:8787"}

echo "Testing OAuth MCP Server at: $WORKER_URL"
echo "================================================"

echo "1. Testing health endpoint..."
curl -s "$WORKER_URL/" | jq . || curl -s "$WORKER_URL/"

echo -e "\n2. Testing OAuth discovery..."
curl -s "$WORKER_URL/.well-known/oauth-authorization-server" | jq . || echo "Discovery endpoint failed"

echo -e "\n3. Testing resource discovery..."
curl -s "$WORKER_URL/.well-known/oauth-protected-resource" | jq . || echo "Resource discovery failed"

echo -e "\n4. Testing CORS headers..."
curl -s -I -X OPTIONS "$WORKER_URL/" | grep -i "access-control"

echo -e "\n5. Testing authorization endpoint (should redirect)..."
curl -s -I "$WORKER_URL/authorize?response_type=code&client_id=test&redirect_uri=https://example.com&code_challenge=test&code_challenge_method=S256" | head -1

echo -e "\nTest complete!"
echo "If all tests pass, the server is ready for Claude Web integration."