/**
 * SuperChase Hub - Central Orchestrator
 *
 * Uses Gemini 2.0 Flash for intent classification.
 * All spokes connect through this hub; spokes never talk directly.
 *
 * BUSINESS CONTEXT:
 * - Scan2Plan: Reality capture & 3D scanning (Owen, Agata - Operations)
 * - Studio C: Production-as-a-service at Utopia Studios (Miles - Technical Director)
 * - CPTV Media Network: Local media networks (daytime tv.us, community pilots)
 * - Tuthill Design: Editorial vision, methodology, taste
 * - Purist: Product brand (Patricia, Chris - Partners)
 * - Big Muddy Inn: Client venue (Tracy, Amy - Owners)
 *
 * HIGH-VALUE STAKEHOLDERS:
 * - Owen: Scan2Plan Operations/Sales
 * - Agata: Scan2Plan Operations
 * - Tracy: Big Muddy Inn Owner
 * - Amy: Big Muddy Inn Owner/Singer
 * - Patricia: Purist Partner
 * - Chris: Purist Partner
 * - Miles: Studio C Technical Director
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Classification categories for email triage
const CATEGORIES = {
  URGENT_CLIENT: { action: 'create_task', priority: 'high', tag: 'client' },
  URGENT_INTERNAL: { action: 'create_task', priority: 'high', tag: 'internal' },
  ACTION_REQUIRED: { action: 'create_task', priority: 'medium', tag: 'action' },
  FYI: { action: 'log_only', priority: 'low', tag: 'fyi' },
  SPAM: { action: 'archive', priority: null, tag: 'spam' },
  NEWSLETTER: { action: 'archive', priority: null, tag: 'newsletter' },
  SOCIAL_SEARCH: { action: 'search_social', priority: null, tag: 'research' }
};

/**
 * Classify content using Gemini 2.0 Flash
 * @param {Object} content - Content to classify { type, subject, body, sender }
 * @returns {Promise<Object>} - { category, confidence, reasoning }
 */
export async function classify(content) {
  // Handle null/undefined content
  if (!content || typeof content !== 'object') {
    console.warn('[Hub] Invalid content provided, using fallback');
    return fallbackClassify({});
  }

  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'NEEDS_VALUE') {
    console.warn('[Hub] GEMINI_API_KEY not set, using fallback classification');
    return fallbackClassify(content);
  }

  const prompt = buildClassificationPrompt(content);

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Hub] Gemini API error:', error);
      return fallbackClassify(content);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return parseClassificationResponse(text, content);
  } catch (error) {
    console.error('[Hub] Classification error:', error.message);
    return fallbackClassify(content);
  }
}

/**
 * Build the classification prompt for Gemini
 */
function buildClassificationPrompt(content) {
  return `You are an email classifier for an executive assistant system.

Classify this ${content.type || 'email'} into ONE of these categories:
- URGENT_CLIENT: From a client, needs immediate response
- URGENT_INTERNAL: Internal team, time-sensitive
- ACTION_REQUIRED: Needs action but not urgent
- FYI: Informational only
- SPAM: Junk/unsolicited
- NEWSLETTER: Subscriptions/marketing

Email:
From: ${content.sender || 'Unknown'}
Subject: ${content.subject || 'No Subject'}
Body: ${(content.body || '').substring(0, 500)}

Respond in JSON format only:
{"category": "CATEGORY_NAME", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`;
}

/**
 * Parse Gemini's response into structured classification
 */
function parseClassificationResponse(text, content) {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const category = parsed.category?.toUpperCase() || 'FYI';

      return {
        category,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'No reasoning provided',
        action: CATEGORIES[category]?.action || 'log_only',
        priority: CATEGORIES[category]?.priority || 'low',
        tag: CATEGORIES[category]?.tag || 'unknown'
      };
    }
  } catch (e) {
    console.warn('[Hub] Failed to parse Gemini response:', e.message);
  }

  return fallbackClassify(content);
}

/**
 * Fallback classification when Gemini is unavailable
 * Uses simple keyword matching
 */
function fallbackClassify(content) {
  const subject = (content.subject || '').toLowerCase();
  const body = (content.body || '').toLowerCase();
  const sender = (content.sender || '').toLowerCase();
  const combined = `${subject} ${body}`;

  // Urgent keywords
  if (combined.includes('urgent') || combined.includes('asap') || combined.includes('emergency')) {
    return {
      category: 'URGENT_CLIENT',
      confidence: 0.6,
      reasoning: 'Fallback: Contains urgent keywords',
      action: 'create_task',
      priority: 'high',
      tag: 'client'
    };
  }

  // Action keywords
  if (combined.includes('please') || combined.includes('request') || combined.includes('need')) {
    return {
      category: 'ACTION_REQUIRED',
      confidence: 0.5,
      reasoning: 'Fallback: Contains action keywords',
      action: 'create_task',
      priority: 'medium',
      tag: 'action'
    };
  }

  // Newsletter patterns
  if (combined.includes('unsubscribe') || combined.includes('newsletter')) {
    return {
      category: 'NEWSLETTER',
      confidence: 0.7,
      reasoning: 'Fallback: Newsletter pattern detected',
      action: 'archive',
      priority: null,
      tag: 'newsletter'
    };
  }

  // Default to FYI
  return {
    category: 'FYI',
    confidence: 0.3,
    reasoning: 'Fallback: No specific pattern matched',
    action: 'log_only',
    priority: 'low',
    tag: 'fyi'
  };
}

/**
 * Load learned patterns from memory
 */
export function loadPatterns() {
  const patternsPath = join(__dirname, '..', 'memory', 'patterns.json');
  try {
    if (existsSync(patternsPath)) {
      return JSON.parse(readFileSync(patternsPath, 'utf8'));
    }
  } catch (e) {
    console.warn('[Hub] Failed to load patterns:', e.message);
  }
  return {};
}

/**
 * Save learned pattern to memory
 */
export function savePattern(key, pattern) {
  const patternsPath = join(__dirname, '..', 'memory', 'patterns.json');
  const patterns = loadPatterns();
  patterns[key] = { ...pattern, updated: new Date().toISOString() };
  writeFileSync(patternsPath, JSON.stringify(patterns, null, 2));
  console.log(`[Hub] Saved pattern: ${key}`);
}

/**
 * Update daily summary cache for voice briefing
 */
export function updateDailySummary(data) {
  const summaryPath = join(__dirname, '..', 'memory', 'daily_summary.json');
  const existing = existsSync(summaryPath)
    ? JSON.parse(readFileSync(summaryPath, 'utf8'))
    : {};

  const updated = {
    ...existing,
    ...data,
    lastUpdated: new Date().toISOString()
  };

  writeFileSync(summaryPath, JSON.stringify(updated, null, 2));
  console.log('[Hub] Daily summary updated');
  return updated;
}

/**
 * Get daily summary for voice briefing
 */
export function getDailySummary() {
  const summaryPath = join(__dirname, '..', 'memory', 'daily_summary.json');
  try {
    if (existsSync(summaryPath)) {
      return JSON.parse(readFileSync(summaryPath, 'utf8'));
    }
  } catch (e) {
    console.warn('[Hub] Failed to load daily summary:', e.message);
  }
  return { tasks: [], emails: [], lastUpdated: null };
}

/**
 * Process an event through the Hub
 * @param {Object} event - Event to process { type, data }
 * @param {string} event.type - Event type: 'email', 'voice', 'chat'
 * @param {Object} event.data - Event payload
 * @returns {Promise<Object>} - { action, target, payload, classification }
 */
export async function processEvent(event) {
  const { type = 'unknown', data = {} } = event;

  console.log(`[Hub] Processing ${type} event`);

  // Classify the event
  const classification = await classify({
    type,
    subject: data.subject || data.text || '',
    body: data.body || data.content || '',
    sender: data.sender || data.from || 'unknown'
  });

  // Determine routing based on classification
  const result = {
    action: classification.action,
    target: determineTarget(classification),
    payload: buildPayload(type, data, classification),
    classification,
    timestamp: new Date().toISOString()
  };

  console.log(`[Hub] Routed to: ${result.target} (${classification.category})`);

  return result;
}

/**
 * Determine which spoke should handle this
 */
function determineTarget(classification) {
  switch (classification.action) {
    case 'create_task':
      return 'asana';
    case 'archive':
      return 'gmail';
    case 'log_only':
      return 'sheets';
    case 'search_social':
      return 'twitter';
    default:
      return 'none';
  }
}

/**
 * Build payload for the target spoke
 */
function buildPayload(type, data, classification) {
  if (classification.action === 'create_task') {
    return {
      name: data.subject || data.text || 'Untitled Task',
      notes: data.body || data.content || '',
      priority: classification.priority,
      source: type,
      metadata: {
        category: classification.category,
        confidence: classification.confidence,
        originalId: data.id
      }
    };
  }
  return data;
}

/**
 * Test Gemini API connection
 * @returns {Promise<Object>} - { success, model, error }
 */
export async function testConnection() {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'NEEDS_VALUE') {
    return { success: false, error: 'GEMINI_API_KEY not set' };
  }

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Reply with just: OK' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      success: true,
      model: GEMINI_MODEL,
      response: text.trim()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default {
  classify,
  processEvent,
  testConnection,
  loadPatterns,
  savePattern,
  updateDailySummary,
  getDailySummary,
  CATEGORIES
};
