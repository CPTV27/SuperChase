#!/usr/bin/env node
/**
 * Gmail Connection Test
 *
 * Verifies OAuth2 credentials by listing Gmail labels.
 * Usage: node spokes/gmail/test_connection.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function testConnection() {
  console.log('\n=== Gmail Connection Test ===\n');

  // Check credentials
  const missing = [];
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'NEEDS_VALUE') missing.push('GOOGLE_CLIENT_ID');
  if (!GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET === 'NEEDS_VALUE') missing.push('GOOGLE_CLIENT_SECRET');
  if (!GOOGLE_REFRESH_TOKEN || GOOGLE_REFRESH_TOKEN === 'NEEDS_VALUE') missing.push('GOOGLE_REFRESH_TOKEN');

  if (missing.length > 0) {
    console.log('❌ FAIL: Missing credentials');
    console.log(`   Missing: ${missing.join(', ')}`);
    return { success: false, error: `Missing: ${missing.join(', ')}` };
  }

  console.log('✓ Credentials present');

  // Get access token
  console.log('  Refreshing access token...');
  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.log('❌ FAIL: Token refresh failed');
      console.log(`   Error: ${error.error_description || error.error}`);
      return { success: false, error: error.error_description || error.error };
    }

    const tokens = await tokenResponse.json();
    console.log('✓ Access token obtained');

    // Fetch labels
    console.log('  Fetching Gmail labels...');
    const labelsResponse = await fetch(`${GMAIL_BASE_URL}/labels`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!labelsResponse.ok) {
      const error = await labelsResponse.json();
      console.log('❌ FAIL: Labels fetch failed');
      console.log(`   Error: ${error.error?.message || 'Unknown error'}`);
      return { success: false, error: error.error?.message };
    }

    const labelsData = await labelsResponse.json();
    const labels = labelsData.labels || [];

    console.log(`✓ Connected! Found ${labels.length} labels\n`);
    console.log('Sample labels:');
    labels.slice(0, 5).forEach(label => {
      console.log(`  - ${label.name}`);
    });

    return {
      success: true,
      labelCount: labels.length,
      sampleLabels: labels.slice(0, 5).map(l => l.name)
    };

  } catch (error) {
    console.log('❌ FAIL: Connection error');
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run if called directly
const result = await testConnection();
console.log('\n' + JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
