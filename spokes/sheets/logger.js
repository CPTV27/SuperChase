#!/usr/bin/env node
/**
 * Google Sheets Spoke - Audit Logger
 *
 * Appends audit entries to Google Sheets for human review.
 * Sheets are WRITE-ONLY - never read from Sheets for system state.
 *
 * Uses Google Sheets API v4 with OAuth2.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const SHEET_ID = process.env.SHEET_ID;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

let accessToken = null;
let tokenExpiry = null;

/**
 * Check if Sheets logging is configured
 */
export function isConfigured() {
  return !!(
    SHEET_ID &&
    GOOGLE_CLIENT_ID &&
    GOOGLE_CLIENT_SECRET &&
    GOOGLE_REFRESH_TOKEN &&
    SHEET_ID !== 'NEEDS_VALUE'
  );
}

/**
 * Refresh access token
 */
async function refreshAccessToken() {
  if (!isConfigured()) {
    throw new Error('Google Sheets not configured');
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Token refresh failed');
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

    return accessToken;
  } catch (error) {
    console.error('[Sheets] Token refresh failed:', error.message);
    throw error;
  }
}

/**
 * Get valid access token
 */
async function getAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }
  return refreshAccessToken();
}

/**
 * Ensure the Audit Log tab exists, create if not
 */
async function ensureAuditTab() {
  const token = await getAccessToken();

  // Get spreadsheet metadata
  const metaResponse = await fetch(
    `${SHEETS_BASE_URL}/${SHEET_ID}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!metaResponse.ok) {
    throw new Error('Failed to fetch spreadsheet metadata');
  }

  const meta = await metaResponse.json();
  const sheets = meta.sheets || [];
  const hasAuditLog = sheets.some(s => s.properties.title === 'Audit Log');

  if (!hasAuditLog) {
    // Create Audit Log tab
    console.log('[Sheets] Creating Audit Log tab...');
    const createResponse = await fetch(
      `${SHEETS_BASE_URL}/${SHEET_ID}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            addSheet: {
              properties: { title: 'Audit Log' }
            }
          }]
        })
      }
    );

    if (!createResponse.ok) {
      console.warn('[Sheets] Could not create Audit Log tab');
    }

    // Add header row
    await appendRows('Audit Log', [[
      'Timestamp',
      'Action',
      'Category',
      'Confidence',
      'Subject',
      'Sender',
      'Source',
      'Result'
    ]]);
  }

  return true;
}

/**
 * Append rows to a sheet tab
 * @param {string} tabName - Sheet tab name
 * @param {Array<Array>} rows - Rows to append
 */
export async function appendRows(tabName, rows) {
  if (!isConfigured()) {
    console.warn('[Sheets] Not configured - skipping log');
    return { success: false, error: 'Not configured' };
  }

  try {
    const token = await getAccessToken();

    const response = await fetch(
      `${SHEETS_BASE_URL}/${SHEET_ID}/values/${encodeURIComponent(tabName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: rows
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Sheets] Append failed:', error.error?.message);
      return { success: false, error: error.error?.message };
    }

    const result = await response.json();
    return {
      success: true,
      updatedRange: result.updates?.updatedRange,
      updatedRows: result.updates?.updatedRows
    };

  } catch (error) {
    console.error('[Sheets] Append error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Log a triage event to Google Sheets
 * @param {Object} event - Triage event data
 */
export async function logTriageEvent(event) {
  const {
    timestamp = new Date().toISOString(),
    action = 'unknown',
    category = 'unknown',
    confidence = 0,
    subject = '',
    sender = '',
    source = 'triage',
    result = 'processed'
  } = event;

  // Ensure tab exists on first call
  await ensureAuditTab();

  const row = [
    timestamp,
    action,
    category,
    `${(confidence * 100).toFixed(0)}%`,
    subject.substring(0, 100),
    sender.substring(0, 50),
    source,
    result
  ];

  const response = await appendRows('Audit Log', [row]);

  if (response.success) {
    console.log(`[Sheets] Logged: ${action} - ${subject.substring(0, 30)}...`);
  }

  return response;
}

/**
 * Log multiple events in batch
 * @param {Array<Object>} events - Array of triage events
 */
export async function logTriageEventsBatch(events) {
  if (!isConfigured()) {
    console.warn('[Sheets] Not configured - skipping batch log');
    return { success: false, error: 'Not configured' };
  }

  await ensureAuditTab();

  const rows = events.map(event => [
    event.timestamp || new Date().toISOString(),
    event.action || 'unknown',
    event.category || 'unknown',
    `${((event.confidence || 0) * 100).toFixed(0)}%`,
    (event.subject || '').substring(0, 100),
    (event.sender || '').substring(0, 50),
    event.source || 'triage',
    event.result || 'processed'
  ]);

  const response = await appendRows('Audit Log', rows);

  if (response.success) {
    console.log(`[Sheets] Batch logged ${rows.length} events`);
  }

  return response;
}

/**
 * Test connection to Google Sheets
 */
export async function testConnection() {
  if (!isConfigured()) {
    return { success: false, error: 'Not configured' };
  }

  try {
    const token = await getAccessToken();

    const response = await fetch(
      `${SHEETS_BASE_URL}/${SHEET_ID}?fields=properties.title`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      spreadsheetTitle: data.properties?.title,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SHEET_ID}`
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default {
  isConfigured,
  appendRows,
  logTriageEvent,
  logTriageEventsBatch,
  testConnection
};
