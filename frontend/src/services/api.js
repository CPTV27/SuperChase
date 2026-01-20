/**
 * SuperChase API Service
 * Connects to the Railway backend for live data
 */

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://superchase-production.up.railway.app'
  : '');

const API_KEY = 'sc_676782661b25ced4ffaa25c0a5b4bfa7b07985f6b49fe0ee';

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY
};

/**
 * Fetch health status
 */
export async function getHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

/**
 * Fetch current tasks from Asana
 */
export async function getTasks(limit = 10) {
  try {
    const res = await fetch(`${API_BASE}/tasks?limit=${limit}`, { headers });
    return await res.json();
  } catch (error) {
    return { tasks: [], error: error.message };
  }
}

/**
 * Fetch daily briefing
 */
export async function getBriefing() {
  try {
    const res = await fetch(`${API_BASE}/briefing`, { headers });
    return await res.json();
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Query George (business context)
 */
export async function queryGeorge(query) {
  try {
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query })
    });
    return await res.json();
  } catch (error) {
    return { answer: 'Connection error', error: error.message };
  }
}

/**
 * Search X.com / Twitter
 */
export async function searchTwitter(query, action = 'search') {
  try {
    const res = await fetch(`${API_BASE}/search-x`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, action })
    });
    return await res.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// Dashboard API - Phase 2
// ============================================

/**
 * Fetch audit logs
 */
export async function getLogs(limit = 20) {
  try {
    const res = await fetch(`${API_BASE}/api/logs?limit=${limit}`, { headers });
    return await res.json();
  } catch (error) {
    return { logs: [], error: error.message };
  }
}

/**
 * Fetch strategy data from ROADMAP.md
 */
export async function getStrategy() {
  try {
    const res = await fetch(`${API_BASE}/api/strategy`, { headers });
    return await res.json();
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Fetch spoke status
 */
export async function getSpokeStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`, { headers });
    return await res.json();
  } catch (error) {
    return { spokes: {}, error: error.message };
  }
}

/**
 * Trigger morning briefing generation
 */
export async function triggerBriefing() {
  try {
    const res = await fetch(`${API_BASE}/api/briefing/trigger`, {
      method: 'POST',
      headers
    });
    return await res.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default {
  getHealth,
  getTasks,
  getBriefing,
  queryGeorge,
  searchTwitter,
  // Phase 2
  getLogs,
  getStrategy,
  getSpokeStatus,
  triggerBriefing
};
