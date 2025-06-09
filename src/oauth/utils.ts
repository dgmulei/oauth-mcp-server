// OAuth utility functions

import { JWTPayload } from '../types';

/**
 * Generate a cryptographically secure random string
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

/**
 * Create a JWT token using HMAC-SHA256
 */
export async function createJWT(payload: JWTPayload, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encoder = new TextEncoder();
  
  // Base64URL encode header and payload
  const headerB64 = base64URLEncode(JSON.stringify(header));
  const payloadB64 = base64URLEncode(JSON.stringify(payload));
  
  const data = headerB64 + '.' + payloadB64;
  
  // Create HMAC key
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign the data
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureB64 = base64URLEncode(arrayBufferToString(signature));
  
  return data + '.' + signatureB64;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  
  const [headerB64, payloadB64, signatureB64] = parts;
  const encoder = new TextEncoder();
  
  // Verify signature
  const data = headerB64 + '.' + payloadB64;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const signature = stringToArrayBuffer(base64URLDecode(signatureB64));
  const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));
  
  if (!isValid) {
    throw new Error('Invalid JWT signature');
  }
  
  // Decode payload
  const payload: JWTPayload = JSON.parse(base64URLDecode(payloadB64));
  
  // Check expiration
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error('JWT token expired');
  }
  
  return payload;
}

/**
 * Verify PKCE code challenge
 */
export async function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: string = 'S256'
): Promise<boolean> {
  if (method !== 'S256') {
    throw new Error('Only S256 code challenge method is supported');
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = base64URLEncode(arrayBufferToString(digest));
  
  return challenge === codeChallenge;
}

/**
 * Base64URL encode (RFC 4648 Section 5)
 */
function base64URLEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL decode
 */
function base64URLDecode(str: string): string {
  // Add padding if needed
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

/**
 * Convert ArrayBuffer to string
 */
function arrayBufferToString(buffer: ArrayBuffer): string {
  return String.fromCharCode(...new Uint8Array(buffer));
}

/**
 * Convert string to ArrayBuffer
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const buffer = new ArrayBuffer(str.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i);
  }
  return buffer;
}

/**
 * Generate OAuth authorization code
 */
export function generateAuthCode(): string {
  return generateRandomString(32);
}

/**
 * Create CORS headers for cross-origin requests
 */
export function getCORSHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Max-Age': '86400',
  };
}