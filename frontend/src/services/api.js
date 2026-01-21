/**
 * SuperChase API Service
 * Connects to the Railway backend for live data
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - Online/offline detection
 * - Consistent error handling
 */

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://superchase-production.up.railway.app'
  : '');

const API_KEY = 'sc_676782661b25ced4ffaa25c0a5b4bfa7b07985f6b49fe0ee';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY
};

/**
 * Check if we're online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, options = {}, config = {}) {
  const {
    maxRetries = MAX_RETRIES,
    timeout = DEFAULT_TIMEOUT,
    retryOn = [502, 503, 504]
  } = config;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check online status
      if (!isOnline()) {
        throw new Error('No internet connection');
      }

      const response = await fetchWithTimeout(url, options, timeout);

      // If response is ok, return it
      if (response.ok) {
        return response;
      }

      // Check if we should retry this status code
      if (retryOn.includes(response.status) && attempt < maxRetries) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        console.warn(`API request failed with ${response.status}, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Return non-ok response for caller to handle
      return response;

    } catch (error) {
      lastError = error;

      // Don't retry on abort (timeout) or offline
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }

      if (!isOnline() || attempt >= maxRetries) {
        throw error;
      }

      // Retry with exponential backoff
      const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
      console.warn(`API request error: ${error.message}, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Standard API request wrapper
 */
async function apiRequest(endpoint, options = {}, defaultValue = null) {
  try {
    const response = await fetchWithRetry(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ...defaultValue,
        error: data.error?.message || `Request failed: ${response.status}`
      };
    }

    return data;
  } catch (error) {
    console.error(`API error (${endpoint}):`, error.message);
    return {
      ...defaultValue,
      error: error.message
    };
  }
}

/**
 * Fetch health status
 */
export async function getHealth() {
  return apiRequest('/health', {}, { status: 'error' });
}

/**
 * Fetch current tasks from Asana
 */
export async function getTasks(limit = 10) {
  return apiRequest(`/tasks?limit=${limit}`, {}, { tasks: [], count: 0 });
}

/**
 * Fetch daily briefing
 */
export async function getBriefing() {
  return apiRequest('/briefing', {}, {});
}

/**
 * Query George (business context)
 */
export async function queryGeorge(query) {
  return apiRequest('/query', {
    method: 'POST',
    body: JSON.stringify({ query })
  }, { answer: 'Connection error' });
}

/**
 * Search X.com / Twitter
 */
export async function searchTwitter(query, action = 'search') {
  return apiRequest('/search-x', {
    method: 'POST',
    body: JSON.stringify({ query, action })
  }, { success: false });
}

// ============================================
// Dashboard API - Phase 2
// ============================================

/**
 * Fetch audit logs
 */
export async function getLogs(limit = 20) {
  return apiRequest(`/api/logs?limit=${limit}`, {}, { logs: [], count: 0, total: 0 });
}

/**
 * Fetch strategy data from ROADMAP.md
 */
export async function getStrategy() {
  return apiRequest('/api/strategy', {}, {});
}

/**
 * Fetch spoke status
 */
export async function getSpokeStatus() {
  return apiRequest('/api/status', {}, { spokes: {} });
}

/**
 * Trigger morning briefing generation
 */
export async function triggerBriefing() {
  return apiRequest('/api/briefing/trigger', { method: 'POST' }, { success: false });
}

// ============================================
// Agency Mode API - Phase 3
// ============================================

/**
 * Fetch review pulse (content approval workflow status)
 */
export async function getReviewPulse() {
  return apiRequest('/api/review/pulse', {}, {
    counts: {},
    agencyPending: [],
    clientPending: [],
    readyToPublish: [],
    needsRevision: []
  });
}

/**
 * Fetch request metrics
 */
export async function getMetrics() {
  return apiRequest('/api/metrics', {}, {
    requests: 0,
    successRate: '0',
    avgResponseTime: 0
  });
}

/**
 * Fetch all tenants
 */
export async function getTenants() {
  return apiRequest('/api/tenants', {}, { tenants: [], count: 0 });
}

/**
 * Fetch client portal queue
 */
export async function getClientQueue(clientId) {
  return apiRequest(`/api/portal/${clientId}/queue`, {}, { success: false, queue: null });
}

/**
 * Fetch client GST (Goals, Strategies, Tactics) manifest
 */
export async function getClientGST(clientId) {
  return apiRequest(`/api/clients/${clientId}/gst`, {}, {});
}

// ============================================
// Limitless Scout API - Phase 5
// ============================================

/**
 * Fetch Limitless feed (context + manifest entries)
 */
export async function getLimitlessFeed() {
  return apiRequest('/api/limitless/feed', {}, {});
}

/**
 * Trigger Limitless Scout to process lifelogs
 */
export async function triggerLimitlessScout(options = {}) {
  return apiRequest('/api/limitless/scout', {
    method: 'POST',
    body: JSON.stringify(options)
  }, { success: false });
}

/**
 * Search Limitless lifelogs
 */
export async function searchLimitless(query) {
  return apiRequest(`/api/limitless/search?q=${encodeURIComponent(query)}`, {}, { results: [] });
}

// ============================================
// Cost & Memory Management
// ============================================

/**
 * Get LLM Council cost status
 */
export async function getCostStatus() {
  return apiRequest('/api/llm-council/costs', {}, {});
}

/**
 * Get memory status
 */
export async function getMemoryStatus() {
  return apiRequest('/api/memory/status', {}, {});
}

export default {
  // Utilities
  isOnline,
  // Core
  getHealth,
  getTasks,
  getBriefing,
  queryGeorge,
  searchTwitter,
  // Phase 2
  getLogs,
  getStrategy,
  getSpokeStatus,
  triggerBriefing,
  // Phase 3 - Agency Mode
  getReviewPulse,
  getMetrics,
  getTenants,
  getClientQueue,
  // Phase 4 - GST Dashboard
  getClientGST,
  // Phase 5 - Limitless Scout
  getLimitlessFeed,
  triggerLimitlessScout,
  searchLimitless,
  // Cost & Memory
  getCostStatus,
  getMemoryStatus
};
