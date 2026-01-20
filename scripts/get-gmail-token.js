#!/usr/bin/env node
/**
 * Gmail OAuth Token Generator
 *
 * Run this once to get a refresh token for Gmail API access.
 * Usage: node scripts/get-gmail-token.js
 */

import { createServer } from 'http';
import { URL } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load existing .env
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf8');

// Extract credentials
const CLIENT_ID = envContent.match(/GOOGLE_CLIENT_ID=(.+)/)?.[1]?.trim();
const CLIENT_SECRET = envContent.match(/GOOGLE_CLIENT_SECRET=(.+)/)?.[1]?.trim();

if (!CLIENT_ID || !CLIENT_SECRET || CLIENT_ID === 'NEEDS_VALUE') {
  console.error('ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env first');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3847/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
].join(' ');

// Build OAuth URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n=== Gmail OAuth Token Generator ===\n');
console.log('Opening browser for Google authorization...\n');

// Open browser
const openCmd = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';
exec(`${openCmd} "${authUrl.toString()}"`);

console.log('If browser does not open, visit this URL:\n');
console.log(authUrl.toString());
console.log('\nWaiting for callback on http://localhost:3847 ...\n');

// Start server to receive callback
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error</h1><p>${error}</p>`);
      console.error('Authorization error:', error);
      server.close();
      process.exit(1);
    }

    if (code) {
      console.log('Received authorization code, exchanging for tokens...\n');

      try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI
          })
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
          throw new Error(tokens.error_description || tokens.error);
        }

        if (!tokens.refresh_token) {
          throw new Error('No refresh token received. Try revoking app access at https://myaccount.google.com/permissions and run again.');
        }

        // Update .env file
        const updatedEnv = envContent.replace(
          /GOOGLE_REFRESH_TOKEN=.*/,
          `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
        );
        writeFileSync(envPath, updatedEnv);

        console.log('✓ Refresh token saved to .env\n');
        console.log('Gmail integration is now configured!\n');
        console.log('Test with: npm run triage:dry\n');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1>✓ Success!</h1>
              <p>Gmail OAuth configured. You can close this window.</p>
              <p style="color: #666;">Refresh token has been saved to .env</p>
            </body>
          </html>
        `);

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);

      } catch (err) {
        console.error('Token exchange failed:', err.message);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error</h1><p>${err.message}</p>`);
        server.close();
        process.exit(1);
      }
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3847, () => {
  console.log('Server listening on port 3847...');
});

// Timeout after 5 minutes
setTimeout(() => {
  console.error('\nTimeout: No callback received after 5 minutes');
  server.close();
  process.exit(1);
}, 5 * 60 * 1000);
