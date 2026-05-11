#!/usr/bin/env node
// Local dev proxy — forwards /api/claude requests to Anthropic, bypassing browser CORS.
// Usage: node proxy.js
// Reads ANTHROPIC_API_KEY from .env automatically.

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
}

const PORT = 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('❌  ANTHROPIC_API_KEY not found in .env');
  process.exit(1);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-secret',
};

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.url !== '/api/claude' || req.method !== 'POST') {
    res.writeHead(404, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const proxy = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => (data += chunk));
      apiRes.on('end', () => {
        res.writeHead(apiRes.statusCode, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(data);
      });
    });

    proxy.on('error', (err) => {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Proxy error', detail: err.message }));
    });

    proxy.write(body);
    proxy.end();
  });
});

server.listen(PORT, () => {
  console.log(`✅  Claude proxy running at http://localhost:${PORT}/api/claude`);
  console.log(`    Using key: ...${API_KEY.slice(-6)}`);
});
