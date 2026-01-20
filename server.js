#!/usr/bin/env node
/**
 * SuperChase API Server
 *
 * Exposes the Query Hub as an HTTP API for ElevenLabs Agent integration.
 * Run with: node server.js
 * Default port: 3849
 */

import { createServer } from 'http';
import { URL } from 'url';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

import queryHub from './core/query_hub.js';
import asana from './spokes/asana/pusher.js';
import twitter from './spokes/twitter/search.js';

const PORT = process.env.PORT || process.env.API_PORT || 3849;
const API_KEY = process.env.API_KEY || 'superchase-local-dev';

const PATHS = {
  dailySummary: join(__dirname, 'memory', 'daily_summary.json'),
  auditLog: join(__dirname, 'cache', 'audit.jsonl'),
  roadmap: join(__dirname, 'ROADMAP.md'),
  limitlessContext: join(__dirname, 'memory', 'limitless_context.json'),
  patterns: join(__dirname, 'memory', 'patterns.json')
};

/**
 * CORS headers for ElevenLabs
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
  'Content-Type': 'application/json'
};

/**
 * Verify API key
 */
function verifyApiKey(req) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  return apiKey === API_KEY || API_KEY === 'superchase-local-dev';
}

/**
 * Parse JSON body from request
 */
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Route handlers
 */
const routes = {
  // Health check
  'GET /health': async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }),

  // Query business context
  'POST /query': async (req) => {
    const body = await parseBody(req);
    return queryHub.handleQueryRequest(body);
  },

  // Get current tasks
  'GET /tasks': async (req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get('limit')) || 10;

    try {
      const tasks = await asana.getTasks({ limit });
      return {
        tasks,
        count: tasks.length
      };
    } catch (error) {
      return {
        error: error.message,
        tasks: [],
        count: 0
      };
    }
  },

  // Get daily briefing
  'GET /briefing': async () => {
    if (existsSync(PATHS.dailySummary)) {
      try {
        return JSON.parse(readFileSync(PATHS.dailySummary, 'utf8'));
      } catch {
        return { error: 'Could not read briefing' };
      }
    }
    return { error: 'No briefing available' };
  },

  // OpenAPI spec
  'GET /openapi.json': async () => {
    const specPath = join(__dirname, 'openapi.json');
    if (existsSync(specPath)) {
      return JSON.parse(readFileSync(specPath, 'utf8'));
    }
    return { error: 'OpenAPI spec not found' };
  },

  // Search X.com / Twitter
  'POST /search-x': async (req) => {
    const body = await parseBody(req);
    const { query, topic, username, action = 'search' } = body;

    if (!twitter.isConfigured()) {
      return {
        success: false,
        error: 'Twitter API not configured. Set TWITTER_BEARER_TOKEN in .env'
      };
    }

    switch (action) {
      case 'research':
        if (!topic) return { error: 'topic required for research action' };
        return twitter.researchTopic(topic);

      case 'user':
        if (!username) return { error: 'username required for user action' };
        return twitter.getUserTweets(username);

      case 'trends':
        return twitter.getTrends();

      case 'search':
      default:
        if (!query) return { error: 'query required for search action' };
        return twitter.searchTweets(query, {
          maxResults: body.maxResults || 10,
          sortOrder: body.sortOrder || 'relevancy'
        });
    }
  },

  // X.com connection test
  'GET /search-x/status': async () => {
    return twitter.testConnection();
  },

  // ============================================
  // Dashboard API Endpoints
  // ============================================

  // Get audit logs (last 20 entries)
  'GET /api/logs': async (req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get('limit')) || 20;

    try {
      if (!existsSync(PATHS.auditLog)) {
        return { logs: [], count: 0 };
      }

      const content = readFileSync(PATHS.auditLog, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      const logs = lines.slice(-limit).reverse().map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);

      return {
        logs,
        count: logs.length,
        total: lines.length
      };
    } catch (error) {
      return { error: error.message, logs: [], count: 0 };
    }
  },

  // Get strategy from ROADMAP.md
  'GET /api/strategy': async () => {
    try {
      if (!existsSync(PATHS.roadmap)) {
        return { error: 'ROADMAP.md not found' };
      }

      const content = readFileSync(PATHS.roadmap, 'utf8');

      // Parse Build Now section
      const buildNowMatch = content.match(/## Build Now \(This Week\)([\s\S]*?)(?=---|\n## )/);
      const buildNow = buildNowMatch
        ? buildNowMatch[1].match(/### \d+\. (.+)/g)?.map(m => m.replace(/### \d+\. /, '')) || []
        : [];

      // Parse Strategic Priorities
      const salesAccelMatch = content.match(/### Sales Accelerator[\s\S]*?(?=###|---)/);
      const prodFactoryMatch = content.match(/### Production Factory[\s\S]*?(?=###|---)/);

      // Parse Someday section
      const somedayMatch = content.match(/## Someday \/ Maybe([\s\S]*?)(?=---|\n## |$)/);
      let someday = [];
      if (somedayMatch) {
        const tableRows = somedayMatch[1].match(/\| ([^|]+) \| ([^|]+) \| ([^|]+) \|/g);
        if (tableRows) {
          someday = tableRows.slice(1).map(row => {
            const cols = row.split('|').filter(c => c.trim());
            return {
              title: cols[0]?.trim(),
              status: cols[1]?.trim(),
              description: cols[2]?.trim()
            };
          });
        }
      }

      // Parse Friction section
      const frictionMatch = content.match(/## Friction to Resolve([\s\S]*?)(?=---|\n## )/);
      let friction = [];
      if (frictionMatch) {
        const tableRows = frictionMatch[1].match(/\| ([^|]+) \| ([^|]+) \| ([^|]+) \|/g);
        if (tableRows) {
          friction = tableRows.slice(1).map(row => {
            const cols = row.split('|').filter(c => c.trim());
            return {
              area: cols[0]?.trim(),
              symptom: cols[1]?.trim(),
              impact: cols[2]?.trim()
            };
          });
        }
      }

      // Parse Leverage opportunities
      const leverageMatch = content.match(/## Cross-Business Leverage Opportunities([\s\S]*?)(?=---|\n## )/);
      let leverage = [];
      if (leverageMatch) {
        const oppMatches = leverageMatch[1].match(/### ([^\n]+)[\s\S]*?- \*\*From:\*\* ([^→]+) → \*\*To:\*\* ([^\n]+)[\s\S]*?- \*\*Effort:\*\* ([^|]+) \| \*\*Impact:\*\* ([^\n]+)/g);
        if (oppMatches) {
          leverage = oppMatches.map(match => {
            const titleMatch = match.match(/### ([^\n]+)/);
            const fromToMatch = match.match(/- \*\*From:\*\* ([^→]+) → \*\*To:\*\* ([^\n]+)/);
            const effortMatch = match.match(/- \*\*Effort:\*\* ([^|]+) \| \*\*Impact:\*\* ([^\n]+)/);
            return {
              title: titleMatch?.[1]?.trim(),
              fromBusiness: fromToMatch?.[1]?.trim(),
              toBusiness: fromToMatch?.[2]?.trim(),
              effort: effortMatch?.[1]?.trim(),
              impact: effortMatch?.[2]?.trim()
            };
          });
        }
      }

      // Load limitless context for additional data
      let limitless = null;
      if (existsSync(PATHS.limitlessContext)) {
        try {
          limitless = JSON.parse(readFileSync(PATHS.limitlessContext, 'utf8'));
        } catch {}
      }

      return {
        buildNow,
        someday,
        friction,
        leverage,
        priorities: {
          salesAccelerator: salesAccelMatch ? 'Scan2Plan CPQ Fix' : null,
          productionFactory: prodFactoryMatch ? 'Natchez Template' : null
        },
        highValuePeople: limitless?.highValuePeople || {},
        recurringTopics: limitless?.recurringTopics || [],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Get spoke status
  'GET /api/status': async () => {
    const status = {
      timestamp: new Date().toISOString(),
      spokes: {}
    };

    // Check Asana
    try {
      const tasks = await asana.getTasks({ limit: 1 });
      status.spokes.asana = {
        status: tasks.length >= 0 ? 'online' : 'warning',
        message: `${tasks.length} tasks accessible`
      };
    } catch (error) {
      status.spokes.asana = { status: 'offline', message: error.message };
    }

    // Check Twitter
    try {
      const twitterStatus = await twitter.testConnection();
      status.spokes.twitter = {
        status: twitterStatus.success ? 'online' : 'offline',
        message: twitterStatus.message || twitterStatus.error
      };
    } catch (error) {
      status.spokes.twitter = { status: 'offline', message: error.message };
    }

    // Check Gmail (based on daily summary existence)
    status.spokes.gmail = {
      status: existsSync(PATHS.dailySummary) ? 'online' : 'warning',
      message: existsSync(PATHS.dailySummary) ? 'Last briefing available' : 'No recent briefing'
    };

    // Check Sheets audit log
    status.spokes.sheets = {
      status: existsSync(PATHS.auditLog) ? 'online' : 'warning',
      message: existsSync(PATHS.auditLog) ? 'Audit log active' : 'No audit log'
    };

    // Check Hub (Gemini) - verify patterns exist
    status.spokes.hub = {
      status: existsSync(PATHS.patterns) ? 'online' : 'warning',
      message: existsSync(PATHS.patterns) ? 'Patterns loaded' : 'No patterns'
    };

    // Check ElevenLabs (based on env)
    const hasElevenLabs = process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY !== 'NEEDS_VALUE';
    status.spokes.voice = {
      status: hasElevenLabs ? 'online' : 'offline',
      message: hasElevenLabs ? 'Voice configured' : 'API key not set'
    };

    return status;
  },

  // Trigger morning briefing
  'POST /api/briefing/trigger': async () => {
    try {
      // Dynamic import to avoid circular deps
      const { generateBriefing } = await import('./spokes/voice/briefing.js');

      console.log('[API] Triggering briefing generation...');
      const briefing = await generateBriefing();

      return {
        success: true,
        message: 'Briefing generated',
        briefing: briefing.briefing,
        stats: briefing.stats,
        generatedAt: briefing.generatedAt
      };
    } catch (error) {
      console.error('[API] Briefing trigger error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

/**
 * Main request handler
 */
async function handleRequest(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const routeKey = `${req.method} ${url.pathname}`;

  console.log(`[API] ${routeKey}`);

  // Check API key (skip for health and openapi)
  if (!url.pathname.includes('health') && !url.pathname.includes('openapi')) {
    if (!verifyApiKey(req)) {
      res.writeHead(401, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Invalid API key' }));
      return;
    }
  }

  // Find matching route
  const handler = routes[routeKey];

  if (handler) {
    try {
      const result = await handler(req);
      const statusCode = result._httpStatus || 200;
      delete result._httpStatus;

      res.writeHead(statusCode, CORS_HEADERS);
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error(`[API] Error:`, error.message);
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: error.message }));
    }
  } else {
    res.writeHead(404, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}

/**
 * Start server
 */
const server = createServer(handleRequest);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║           SuperChase API Server                            ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health              - Health check`);
  console.log(`  POST /query               - Query business context`);
  console.log(`  GET  /tasks               - Get current tasks`);
  console.log(`  GET  /briefing            - Get daily briefing`);
  console.log(`  POST /search-x            - Search X.com (Twitter)`);
  console.log(`  GET  /search-x/status     - X.com API status`);
  console.log(`  GET  /openapi.json        - OpenAPI specification`);
  console.log(`  --- Dashboard API ---`);
  console.log(`  GET  /api/logs            - Audit log entries`);
  console.log(`  GET  /api/strategy        - Roadmap & strategy data`);
  console.log(`  GET  /api/status          - Spoke connectivity status`);
  console.log(`  POST /api/briefing/trigger - Trigger morning briefing\n`);
  console.log(`API Key: ${API_KEY === 'superchase-local-dev' ? '(dev mode - no auth)' : 'required'}\n`);
});

export default server;
