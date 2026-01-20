#!/usr/bin/env node
/**
 * SuperChase API Server v2.1
 *
 * Exposes the Query Hub as an HTTP API for ElevenLabs Agent integration.
 * Now with structured logging, error handling, and health monitoring.
 * 
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

// Core imports
import queryHub from './core/query_hub.js';
import asana from './spokes/asana/pusher.js';
import twitter from './spokes/twitter/search.js';
import twitterPublish from './spokes/twitter/publish.js';
import portalQueue from './spokes/portal/queue.js';

// Agency multi-tenant support
import tenantManager from './core/tenant-manager.js';
import gbpClient from './spokes/gbp/client.js';

// Library imports for enhanced reliability
import { createLogger, generateRequestId } from './lib/logger.js';
import { AppError, ValidationError, AuthenticationError, withFallback } from './lib/errors.js';
import health, { recordRequest, getMetrics, getHealth, withCircuitBreaker } from './lib/health.js';

const logger = createLogger({ module: 'server' });

const PORT = process.env.PORT || process.env.API_PORT || 3849;
const API_KEY = process.env.API_KEY || 'superchase-local-dev';
const IS_DEV = API_KEY === 'superchase-local-dev';

const PATHS = {
  dailySummary: join(__dirname, 'memory', 'daily_summary.json'),
  auditLog: join(__dirname, 'cache', 'audit.jsonl'),
  roadmap: join(__dirname, 'ROADMAP.md'),
  limitlessContext: join(__dirname, 'memory', 'limitless_context.json'),
  patterns: join(__dirname, 'memory', 'patterns.json'),
  marketingQueue: join(__dirname, 'memory', 'marketing_queue.json')
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
  // Health check (basic)
  'GET /health': async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.1.0'
  }),

  // Detailed health with circuit breaker status
  'GET /api/health': async () => {
    return getHealth();
  },

  // Metrics endpoint
  'GET /api/metrics': async () => {
    return getMetrics();
  },

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
        } catch { }
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
  },

  // ============================================
  // Publishing API Endpoints (Marketing Agency)
  // ============================================

  // Post to X.com / Twitter
  'POST /api/publish/x': async (req) => {
    const body = await parseBody(req);
    const { text, thread } = body;

    if (!twitterPublish.isConfigured()) {
      return {
        success: false,
        error: 'Twitter publish not configured. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET in .env'
      };
    }

    // Thread posting
    if (thread && Array.isArray(thread)) {
      console.log(`[API] Publishing thread with ${thread.length} tweets`);
      const result = await twitterPublish.postThread(thread, body.delayMs || 30000);
      return result;
    }

    // Single tweet
    if (text) {
      console.log(`[API] Publishing single tweet`);
      const result = await twitterPublish.postTweet(text, {
        reply_to_id: body.reply_to_id
      });
      return result;
    }

    return {
      success: false,
      error: 'Either "text" (single tweet) or "thread" (array of tweets) is required'
    };
  },

  // Check X.com publish status
  'GET /api/publish/x/status': async () => {
    return twitterPublish.testConnection();
  },

  // ============================================
  // Client Portal API Endpoints
  // ============================================

  // List all portal clients
  'GET /api/portal/clients': async () => {
    return portalQueue.listClients();
  }
};

/**
 * Handle dynamic portal routes
 * Pattern: /api/portal/:clientId/:action
 */
async function handlePortalRoute(req, method, pathname) {
  const portalMatch = pathname.match(/^\/api\/portal\/([^/]+)\/?(.*)?$/);
  if (!portalMatch) return null;

  const clientId = portalMatch[1];
  const action = portalMatch[2] || 'queue';

  // Skip if it's the clients list endpoint
  if (clientId === 'clients') return null;

  console.log(`[Portal API] ${method} /${clientId}/${action}`);

  // GET /api/portal/:clientId/queue - Get queue state
  if (method === 'GET' && action === 'queue') {
    return portalQueue.parseQueue(clientId);
  }

  // POST /api/portal/:clientId/upload - Add to ingest
  if (method === 'POST' && action === 'upload') {
    const body = await parseBody(req);
    return portalQueue.addToIngest(clientId, {
      id: body.id || body.filename,
      source: body.source || 'Client Upload',
      notes: body.notes || '',
      type: body.type || 'Image'
    });
  }

  // POST /api/portal/:clientId/approve - Client approves item
  if (method === 'POST' && action === 'approve') {
    const body = await parseBody(req);
    if (!body.itemId) {
      return { success: false, error: 'itemId required' };
    }
    return portalQueue.approveItem(clientId, body.itemId);
  }

  // POST /api/portal/:clientId/process - Process ingest item
  if (method === 'POST' && action === 'process') {
    const body = await parseBody(req);
    if (!body.itemId) {
      return { success: false, error: 'itemId required' };
    }
    return portalQueue.processIngest(clientId, body.itemId, body.thread);
  }

  // POST /api/portal/:clientId/send-to-client - Send to client review
  if (method === 'POST' && action === 'send-to-client') {
    const body = await parseBody(req);
    if (!body.itemId) {
      return { success: false, error: 'itemId required' };
    }
    return portalQueue.sendToClient(clientId, body.itemId);
  }

  // POST /api/portal/:clientId/move - Move item between stages
  if (method === 'POST' && action === 'move') {
    const body = await parseBody(req);
    if (!body.itemId || !body.from || !body.to) {
      return { success: false, error: 'itemId, from, and to required' };
    }
    return portalQueue.moveItem(clientId, body.itemId, body.from, body.to);
  }

  // POST /api/portal/:clientId/gbp - Google Business Profile actions
  if (method === 'POST' && action === 'gbp') {
    const body = await parseBody(req);
    if (!body.action) {
      return { success: false, error: 'action required (post, media, qa, insights)' };
    }
    return tenantManager.routeToTenant(clientId, 'gbp', body.action, body);
  }

  return { success: false, error: `Unknown portal action: ${action}` };
}

/**
 * Handle tenant/agency API routes
 */
async function handleTenantRoute(req, method, pathname) {
  const parts = pathname.replace('/api/tenants/', '').split('/');
  const tenantId = parts[0];
  const action = parts[1];

  // GET /api/tenants - List all tenants
  if (!tenantId || tenantId === '') {
    if (method === 'GET') {
      try {
        const tenants = await tenantManager.listTenants();
        return { tenants, count: tenants.length };
      } catch (error) {
        return { tenants: [], count: 0, error: error.message };
      }
    }

    // POST /api/tenants - Create new tenant
    if (method === 'POST') {
      const body = await parseBody(req);
      if (!body.id || !body.name) {
        return { success: false, error: 'id and name required' };
      }
      try {
        const tenant = tenantManager.createTenant(body);
        return { success: true, tenant };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }

  // GET /api/tenants/:tenantId - Get tenant config
  if (method === 'GET' && !action) {
    try {
      const tenant = tenantManager.getTenant(tenantId);
      return { tenant };
    } catch (error) {
      return { error: error.message };
    }
  }

  // PUT /api/tenants/:tenantId - Update tenant config
  if (method === 'PUT' && !action) {
    const body = await parseBody(req);
    try {
      const tenant = tenantManager.updateTenant(tenantId, body);
      return { success: true, tenant };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return null;
}

/**
 * Main request handler with logging and metrics
 */
async function handleRequest(req, res) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || generateRequestId();
  const reqLogger = logger.child({ requestId });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const routeKey = `${req.method} ${url.pathname}`;

  reqLogger.info(`${routeKey}`);

  // Check API key (skip for health, metrics, and openapi)
  const skipAuth = ['health', 'openapi', 'metrics'].some(p => url.pathname.includes(p));
  if (!skipAuth) {
    if (!verifyApiKey(req)) {
      reqLogger.warn('Authentication failed');
      recordRequest(routeKey, Date.now() - startTime, false);
      res.writeHead(401, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'AUTHENTICATION_ERROR', message: 'Invalid API key' },
        requestId
      }));
      return;
    }
  }

  // Find matching route
  const handler = routes[routeKey];

  if (handler) {
    try {
      const result = await handler(req);
      const duration = Date.now() - startTime;

      // Handle AppError instances
      if (result instanceof AppError) {
        const errorResponse = result.toJSON(!IS_DEV);
        errorResponse.requestId = requestId;
        recordRequest(routeKey, duration, false);
        reqLogger.error(`Error: ${result.message}`, { statusCode: result.statusCode, duration });
        res.writeHead(result.statusCode, CORS_HEADERS);
        res.end(JSON.stringify(errorResponse));
        return;
      }

      const statusCode = result._httpStatus || 200;
      delete result._httpStatus;

      recordRequest(routeKey, duration, statusCode < 400);
      reqLogger.debug(`Complete`, { statusCode, duration });

      res.writeHead(statusCode, CORS_HEADERS);
      res.end(JSON.stringify({ ...result, requestId }));
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);

      // Handle known error types
      if (error instanceof AppError) {
        const errorResponse = error.toJSON(!IS_DEV);
        errorResponse.requestId = requestId;
        reqLogger.error(`AppError: ${error.message}`, { code: error.code, duration });
        res.writeHead(error.statusCode, CORS_HEADERS);
        res.end(JSON.stringify(errorResponse));
        return;
      }

      reqLogger.error(`Unhandled error: ${error.message}`, { stack: error.stack, duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: error.message },
        requestId
      }));
    }
    return;
  }

  // Try dynamic portal routes
  if (url.pathname.startsWith('/api/portal/')) {
    try {
      const result = await handlePortalRoute(req, req.method, url.pathname);
      if (result) {
        const duration = Date.now() - startTime;
        recordRequest(routeKey, duration, true);
        reqLogger.debug(`Portal route complete`, { duration });
        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`Portal error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'PORTAL_ERROR', message: error.message },
        requestId
      }));
      return;
    }
  }

  // Try dynamic tenant/agency routes
  if (url.pathname.startsWith('/api/tenants')) {
    try {
      const result = await handleTenantRoute(req, req.method, url.pathname);
      if (result) {
        const duration = Date.now() - startTime;
        recordRequest(routeKey, duration, true);
        reqLogger.debug(`Tenant route complete`, { duration });
        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`Tenant error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'TENANT_ERROR', message: error.message },
        requestId
      }));
      return;
    }
  }

  // 404 for unmatched routes
  const duration = Date.now() - startTime;
  recordRequest(routeKey, duration, false);
  reqLogger.debug(`Not found`, { duration });
  res.writeHead(404, CORS_HEADERS);
  res.end(JSON.stringify({
    error: { code: 'NOT_FOUND', message: 'Route not found' },
    requestId
  }));
}

/**
 * Start server
 */
const server = createServer(handleRequest);

server.listen(PORT, '0.0.0.0', () => {
  logger.info('SuperChase API Server v2.1 starting', { port: PORT });

  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║           SuperChase API Server v2.1                       ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health              - Health check (basic)`);
  console.log(`  GET  /api/health          - Health check (detailed)`);
  console.log(`  GET  /api/metrics         - Request metrics`);
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
  console.log(`  POST /api/briefing/trigger - Trigger morning briefing`);
  console.log(`  --- Publishing API ---`);
  console.log(`  POST /api/publish/x       - Post tweet or thread to X.com`);
  console.log(`  GET  /api/publish/x/status - Check X.com publish credentials`);
  console.log(`  --- Client Portal API ---`);
  console.log(`  GET  /api/portal/clients           - List all portal clients`);
  console.log(`  GET  /api/portal/:client/queue     - Get client queue state`);
  console.log(`  POST /api/portal/:client/upload    - Add asset to ingest`);
  console.log(`  POST /api/portal/:client/approve   - Client approves item`);
  console.log(`  POST /api/portal/:client/process   - Process ingest to agency`);
  console.log(`  POST /api/portal/:client/send-to-client - Send to client review`);
  console.log(`  POST /api/portal/:client/move      - Move item between stages\n`);
  console.log(`Mode: ${IS_DEV ? 'Development (no auth required)' : 'Production (API key required)'}`);
  console.log(`Logging: Structured JSON in production, human-readable in dev\n`);
});

export default server;
