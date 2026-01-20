/**
 * Gmail Spoke - Email Triage
 *
 * Fetches unread emails and routes to Hub for classification.
 * Requires Google OAuth credentials (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN).
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

const GMAIL_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let accessToken = null;
let tokenExpiry = null;

/**
 * Check if Gmail is configured
 */
export function isConfigured() {
  return !!(
    GOOGLE_CLIENT_ID &&
    GOOGLE_CLIENT_SECRET &&
    GOOGLE_REFRESH_TOKEN &&
    GOOGLE_CLIENT_ID !== 'NEEDS_VALUE' &&
    GOOGLE_CLIENT_SECRET !== 'NEEDS_VALUE' &&
    GOOGLE_REFRESH_TOKEN !== 'NEEDS_VALUE'
  );
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken() {
  if (!isConfigured()) {
    throw new Error('Gmail not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
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
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer

    return accessToken;
  } catch (error) {
    console.error('[Gmail] Token refresh error:', error.message);
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
 * Fetch unread emails from Gmail
 * @param {number} limit - Max emails to fetch (default 5)
 * @returns {Promise<Array>} - List of email objects
 */
export async function fetchUnreadEmails(limit = 5) {
  if (!isConfigured()) {
    console.warn('[Gmail] Not configured - returning mock data');
    return getMockEmails();
  }

  try {
    const token = await getAccessToken();

    // Get list of unread message IDs
    const listResponse = await fetch(
      `${GMAIL_BASE_URL}/messages?q=is:unread&maxResults=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!listResponse.ok) {
      const error = await listResponse.json();
      throw new Error(error.error?.message || 'Failed to list messages');
    }

    const listData = await listResponse.json();
    const messages = listData.messages || [];

    // Fetch full details for each message
    const emails = await Promise.all(
      messages.map(msg => fetchEmailDetails(token, msg.id))
    );

    console.log(`[Gmail] Fetched ${emails.length} unread emails`);
    return emails.filter(Boolean);
  } catch (error) {
    console.error('[Gmail] Fetch error:', error.message);
    throw error;
  }
}

/**
 * Fetch full email details
 */
async function fetchEmailDetails(token, messageId) {
  try {
    const response = await fetch(
      `${GMAIL_BASE_URL}/messages/${messageId}?format=full`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      console.warn(`[Gmail] Failed to fetch message ${messageId}`);
      return null;
    }

    const data = await response.json();
    return parseEmail(data);
  } catch (error) {
    console.warn(`[Gmail] Error fetching ${messageId}:`, error.message);
    return null;
  }
}

/**
 * Parse Gmail API response into simplified email object
 */
function parseEmail(data) {
  const headers = data.payload?.headers || [];
  const getHeader = (name) =>
    headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  // Extract body (prefer plain text)
  let body = '';
  if (data.payload?.body?.data) {
    body = Buffer.from(data.payload.body.data, 'base64').toString('utf8');
  } else if (data.payload?.parts) {
    const textPart = data.payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
    }
  }

  return {
    id: data.id,
    threadId: data.threadId,
    subject: getHeader('subject'),
    sender: getHeader('from'),
    to: getHeader('to'),
    date: getHeader('date'),
    body: body.substring(0, 2000), // Limit body size
    snippet: data.snippet,
    labels: data.labelIds || []
  };
}

/**
 * Mark email as read
 */
export async function markAsRead(messageId) {
  if (!isConfigured()) {
    console.warn('[Gmail] Not configured - skipping mark as read');
    return { success: true, mock: true };
  }

  try {
    const token = await getAccessToken();
    const response = await fetch(
      `${GMAIL_BASE_URL}/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          removeLabelIds: ['UNREAD']
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to mark as read');
    }

    console.log(`[Gmail] Marked as read: ${messageId}`);
    return { success: true };
  } catch (error) {
    console.error('[Gmail] Mark as read error:', error.message);
    throw error;
  }
}

/**
 * Archive email (remove from inbox)
 */
export async function archiveEmail(messageId) {
  if (!isConfigured()) {
    console.warn('[Gmail] Not configured - skipping archive');
    return { success: true, mock: true };
  }

  try {
    const token = await getAccessToken();
    const response = await fetch(
      `${GMAIL_BASE_URL}/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          removeLabelIds: ['INBOX', 'UNREAD']
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to archive email');
    }

    console.log(`[Gmail] Archived: ${messageId}`);
    return { success: true };
  } catch (error) {
    console.error('[Gmail] Archive error:', error.message);
    throw error;
  }
}

/**
 * Mock emails for testing when Gmail is not configured
 */
function getMockEmails() {
  return [
    {
      id: 'mock-001',
      threadId: 'thread-001',
      subject: 'URGENT: Project deadline moved up',
      sender: 'client@example.com',
      body: 'Hi Chase, We need to move the deadline up by a week. Please confirm ASAP.',
      snippet: 'We need to move the deadline up by a week...',
      date: new Date().toISOString(),
      labels: ['INBOX', 'UNREAD'],
      mock: true
    },
    {
      id: 'mock-002',
      threadId: 'thread-002',
      subject: 'Weekly Newsletter - Industry Updates',
      sender: 'newsletter@techdigest.com',
      body: 'This week in tech: AI developments, market trends, and more. Unsubscribe link at bottom.',
      snippet: 'This week in tech: AI developments...',
      date: new Date().toISOString(),
      labels: ['INBOX', 'UNREAD'],
      mock: true
    },
    {
      id: 'mock-003',
      threadId: 'thread-003',
      subject: 'Re: Studio C booking for March',
      sender: 'miles@studioc.tv',
      body: 'Hey, confirming the March 15th booking. Let me know if you need any equipment changes.',
      snippet: 'Confirming the March 15th booking...',
      date: new Date().toISOString(),
      labels: ['INBOX', 'UNREAD'],
      mock: true
    }
  ];
}

export default {
  isConfigured,
  fetchUnreadEmails,
  markAsRead,
  archiveEmail
};
