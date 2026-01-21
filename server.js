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
import path, { dirname, join } from 'path';
import fs, { readFileSync, existsSync } from 'fs';

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
import agencyReview from './spokes/agency/review.js';

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

    // Check Sheets audit log (optional - not a warning if disabled)
    status.spokes.sheets = {
      status: 'online',
      message: existsSync(PATHS.auditLog) ? 'Audit log active' : 'Audit log disabled'
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
 * Handle agency review API routes
 */
async function handleReviewRoute(req, method, pathname, url) {
  const parts = pathname.replace('/api/review/', '').split('/');
  const reviewId = parts[0];
  const action = parts[1];

  // GET /api/review/pulse - Get review status pulse (public, no auth needed)
  if (method === 'GET' && (reviewId === 'pulse' || !reviewId)) {
    return agencyReview.getReviewPulse();
  }

  // GET /api/review/:id - Get specific review item
  if (method === 'GET' && reviewId && !action) {
    try {
      return { item: agencyReview.getReviewItem(reviewId) };
    } catch (error) {
      return { error: error.message };
    }
  }

  // POST /api/review - Create new review item
  if (method === 'POST' && !reviewId) {
    const body = await parseBody(req);
    try {
      const item = agencyReview.createReviewItem(body);
      const submitted = agencyReview.submitForAgencyReview(item.id);
      return submitted;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // GET /api/review/:id/approve?token=xxx - Approve via secure link
  if (method === 'GET' && action === 'approve') {
    const token = url.searchParams.get('token');
    try {
      return agencyReview.agencyApprove(reviewId, token);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // GET /api/review/:id/reject?token=xxx&feedback=xxx - Reject via secure link
  if (method === 'GET' && action === 'reject') {
    const token = url.searchParams.get('token');
    const feedback = url.searchParams.get('feedback') || '';
    try {
      return agencyReview.agencyReject(reviewId, token, { feedback });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // POST /api/review/:id/client-approve - Client approves
  if (method === 'POST' && action === 'client-approve') {
    const body = await parseBody(req);
    try {
      return agencyReview.clientApprove(reviewId, body.clientId);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // POST /api/review/:id/revision - Client requests revision
  if (method === 'POST' && action === 'revision') {
    const body = await parseBody(req);
    try {
      return agencyReview.clientRequestRevision(reviewId, body.clientId, body.feedback);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // POST /api/review/:id/publish - Mark as published
  if (method === 'POST' && action === 'publish') {
    const body = await parseBody(req);
    try {
      return agencyReview.markPublished(reviewId, body);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // GET /api/review/list/:clientId - List reviews for a client
  if (method === 'GET' && reviewId === 'list' && action) {
    return { items: agencyReview.listReviewItems({ clientId: action }) };
  }

  return null;
}

/**
 * Handle Limitless Scout API routes
 * Pattern: /api/limitless/:action
 */
async function handleLimitlessRoute(req, method, pathname, url) {
  const action = pathname.replace('/api/limitless/', '').split('/')[0];

  // GET /api/limitless/feed - Get combined feed data
  if (method === 'GET' && action === 'feed') {
    try {
      const contextPath = path.join(process.cwd(), 'memory', 'limitless_context.json');
      const manifestPath = path.join(process.cwd(), 'manifest.jsonl');

      // Load context
      let context = null;
      if (fs.existsSync(contextPath)) {
        context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
      }

      // Load recent manifest entries (last 50)
      let manifest = [];
      if (fs.existsSync(manifestPath)) {
        const lines = fs.readFileSync(manifestPath, 'utf-8').trim().split('\n');
        manifest = lines.slice(-50).reverse().map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        }).filter(Boolean);
      }

      // Check scout configuration
      let scoutStatus = { configured: false, connected: false };
      try {
        const limitlessScout = await import('./spokes/limitless/scout.js');
        scoutStatus.configured = limitlessScout.isConfigured();
        if (scoutStatus.configured) {
          const connection = await limitlessScout.testConnection();
          scoutStatus = { ...scoutStatus, ...connection };
        }
      } catch (err) {
        scoutStatus.error = err.message;
      }

      return {
        context,
        manifest,
        scoutStatus,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      return { error: `Failed to load Limitless feed: ${error.message}` };
    }
  }

  // POST /api/limitless/scout - Trigger scout processing
  if (method === 'POST' && action === 'scout') {
    try {
      const body = await parseBody(req);
      const limitlessScout = await import('./spokes/limitless/scout.js');

      if (!limitlessScout.isConfigured()) {
        return { success: false, error: 'Limitless API not configured' };
      }

      // Run scout with options from body
      const result = await limitlessScout.processLifelogs({
        date: body.date,
        dryRun: body.dryRun || false
      });

      return {
        success: true,
        processed: result.processed,
        relevant: result.relevant,
        findings: result.findings?.length || 0,
        traceId: result.traceId
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // GET /api/limitless/search - Search lifelogs
  if (method === 'GET' && action === 'search') {
    try {
      const query = url.searchParams.get('q');
      if (!query) {
        return { results: [], error: 'Query parameter required' };
      }

      const limitlessScout = await import('./spokes/limitless/scout.js');
      if (!limitlessScout.isConfigured()) {
        return { results: [], error: 'Limitless API not configured' };
      }

      const results = await limitlessScout.searchLifelogs(query);
      return { results: results.data || [], query };
    } catch (error) {
      return { results: [], error: error.message };
    }
  }

  // GET /api/limitless/status - Get scout status
  if (method === 'GET' && action === 'status') {
    try {
      const limitlessScout = await import('./spokes/limitless/scout.js');
      const isConfigured = limitlessScout.isConfigured();

      if (!isConfigured) {
        return { configured: false, connected: false, error: 'API key not set' };
      }

      const connection = await limitlessScout.testConnection();
      return { configured: true, ...connection };
    } catch (error) {
      return { configured: false, connected: false, error: error.message };
    }
  }

  return null;
}

/**
 * Handle Marketing Agency API routes
 * Pattern: /api/marketing/:action
 */
async function handleMarketingRoute(req, method, pathname) {
  const action = pathname.replace('/api/marketing/', '').split('/')[0];

  // POST /api/marketing/brief - Generate a marketing brief
  if (method === 'POST' && action === 'brief') {
    try {
      const body = await parseBody(req);
      const clientId = body.clientId;

      if (!clientId) {
        return { success: false, error: 'clientId required' };
      }

      // Load GST for the client
      const gstPath = path.join(process.cwd(), 'clients', clientId, 'gst.json');
      if (!fs.existsSync(gstPath)) {
        return { success: false, error: `No GST found for client: ${clientId}` };
      }

      const gst = JSON.parse(fs.readFileSync(gstPath, 'utf-8'));

      // Find an active strategy
      const activeStrategy = gst.strategies?.find(s => s.status === 'active');
      if (!activeStrategy) {
        return { success: false, error: 'No active strategy found' };
      }

      // Create brief
      const briefId = `brief_${clientId}_${Date.now().toString(36)}`;
      const newBrief = {
        id: briefId,
        clientId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        source: 'Dashboard Trigger',
        strategist: {
          topic: `${activeStrategy.title} Content`,
          angle: activeStrategy.description,
          goalAlignment: {
            goalId: activeStrategy.goalId,
            strategyId: activeStrategy.id,
            rationale: `Aligned with strategy: ${activeStrategy.approach}`
          },
          blogOutline: ['Introduction', 'Key Insight', 'Application', 'Call to Action'],
          xHooks: [`Thread about ${activeStrategy.title}...`],
          voiceArchetype: gst._brand?.archetype || 'Thought Leader',
          toneGuidance: `Based on ${activeStrategy.approach}`
        }
      };

      // Add to marketing queue
      const queuePath = path.join(process.cwd(), 'memory', 'marketing_queue.json');
      let queue = { version: '1.0', lastUpdated: new Date().toISOString(), briefs: [] };

      if (fs.existsSync(queuePath)) {
        try {
          queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
        } catch { }
      }

      queue.briefs = queue.briefs || [];
      queue.briefs.push(newBrief);
      queue.lastUpdated = new Date().toISOString();

      fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

      return {
        success: true,
        briefId,
        message: `Brief created for ${clientId}`,
        topic: newBrief.strategist.topic
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // POST /api/marketing/draft - Draft content from pending brief
  if (method === 'POST' && action === 'draft') {
    try {
      const queuePath = path.join(process.cwd(), 'memory', 'marketing_queue.json');

      if (!fs.existsSync(queuePath)) {
        return { success: false, error: 'No marketing queue found' };
      }

      const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      const pendingBrief = queue.briefs?.find(b => b.status === 'pending');

      if (!pendingBrief) {
        return { success: false, error: 'No pending briefs to draft' };
      }

      // Mark as drafted (in real implementation, this would trigger AI drafting)
      pendingBrief.status = 'drafted';
      pendingBrief.draftedAt = new Date().toISOString();
      pendingBrief.draft = {
        blog: {
          title: pendingBrief.strategist.topic,
          wordCount: 800,
          status: 'ready'
        },
        thread: {
          posts: 4,
          status: 'ready'
        }
      };

      queue.lastUpdated = new Date().toISOString();
      fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

      return {
        success: true,
        briefId: pendingBrief.id,
        message: `Drafted content for ${pendingBrief.clientId}`,
        blog: pendingBrief.draft.blog,
        thread: pendingBrief.draft.thread
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // POST /api/marketing/publish - Publish drafted content
  if (method === 'POST' && action === 'publish') {
    try {
      const queuePath = path.join(process.cwd(), 'memory', 'marketing_queue.json');

      if (!fs.existsSync(queuePath)) {
        return { success: false, error: 'No marketing queue found' };
      }

      const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      const draftedBrief = queue.briefs?.find(b => b.status === 'drafted');

      if (!draftedBrief) {
        return { success: false, error: 'No drafted content to publish' };
      }

      // Mark as published
      draftedBrief.status = 'published';
      draftedBrief.publishedAt = new Date().toISOString();

      queue.lastUpdated = new Date().toISOString();
      fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

      // Log to manifest
      const manifestPath = path.join(process.cwd(), 'manifest.jsonl');
      const manifestEntry = {
        timestamp: new Date().toISOString(),
        agent: 'Publisher',
        finding: `Published content for ${draftedBrief.clientId}: ${draftedBrief.strategist.topic}`,
        type: 'CONTENT_PUBLISHED',
        status: 'Complete',
        marketing_trigger: false,
        clientId: draftedBrief.clientId
      };
      fs.appendFileSync(manifestPath, JSON.stringify(manifestEntry) + '\n');

      return {
        success: true,
        briefId: draftedBrief.id,
        message: `Published content for ${draftedBrief.clientId}`,
        clientId: draftedBrief.clientId
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // GET /api/marketing/queue - Get marketing queue status
  if (method === 'GET' && action === 'queue') {
    try {
      const queuePath = path.join(process.cwd(), 'memory', 'marketing_queue.json');

      if (!fs.existsSync(queuePath)) {
        return { briefs: [], counts: { pending: 0, drafted: 0, published: 0 } };
      }

      const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      const briefs = queue.briefs || [];

      return {
        briefs,
        counts: {
          pending: briefs.filter(b => b.status === 'pending').length,
          drafted: briefs.filter(b => b.status === 'drafted').length,
          published: briefs.filter(b => b.status === 'published').length
        },
        lastUpdated: queue.lastUpdated
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  return null;
}

/**
 * Handle client API routes (GST, config, etc.)
 * Pattern: /api/clients/:clientId/:resource
 */
async function handleClientRoute(req, method, pathname) {
  const match = pathname.match(/^\/api\/clients\/([^/]+)\/(.+)$/);
  if (!match) return null;

  const clientId = match[1];
  const resource = match[2];

  // GET /api/clients/:clientId/gst - Get GST manifest
  if (method === 'GET' && resource === 'gst') {
    try {
      const gstPath = path.join(process.cwd(), 'clients', clientId, 'gst.json');
      const configPath = path.join(process.cwd(), 'clients', clientId, 'config.json');
      const brandPath = path.join(process.cwd(), 'clients', clientId, 'brand.json');

      // Check if client exists
      if (!fs.existsSync(gstPath)) {
        return { error: `GST not found for client: ${clientId}` };
      }

      const gst = JSON.parse(fs.readFileSync(gstPath, 'utf-8'));

      // Optionally include config and brand info
      let config = null;
      let brand = null;

      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
      if (fs.existsSync(brandPath)) {
        brand = JSON.parse(fs.readFileSync(brandPath, 'utf-8'));
      }

      return {
        ...gst,
        _config: config ? { name: config.name, businessType: config.businessType } : null,
        _brand: brand ? { archetype: brand.voice?.archetype, colors: brand.colors } : null
      };
    } catch (error) {
      return { error: `Failed to load GST: ${error.message}` };
    }
  }

  // GET /api/clients/:clientId/config - Get client config
  if (method === 'GET' && resource === 'config') {
    try {
      const configPath = path.join(process.cwd(), 'clients', clientId, 'config.json');
      if (!fs.existsSync(configPath)) {
        return { error: `Config not found for client: ${clientId}` };
      }
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
      return { error: `Failed to load config: ${error.message}` };
    }
  }

  // GET /api/clients/:clientId/brand - Get brand config
  if (method === 'GET' && resource === 'brand') {
    try {
      const brandPath = path.join(process.cwd(), 'clients', clientId, 'brand.json');
      if (!fs.existsSync(brandPath)) {
        return { error: `Brand not found for client: ${clientId}` };
      }
      return JSON.parse(fs.readFileSync(brandPath, 'utf-8'));
    } catch (error) {
      return { error: `Failed to load brand: ${error.message}` };
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

  // Try dynamic review routes
  if (url.pathname.startsWith('/api/review')) {
    try {
      const result = await handleReviewRoute(req, req.method, url.pathname, url);
      if (result) {
        const duration = Date.now() - startTime;
        recordRequest(routeKey, duration, true);
        reqLogger.debug(`Review route complete`, { duration });
        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`Review error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'REVIEW_ERROR', message: error.message },
        requestId
      }));
      return;
    }
  }

  // Try dynamic client routes (GST, config, brand)
  if (url.pathname.startsWith('/api/clients/')) {
    try {
      const result = await handleClientRoute(req, req.method, url.pathname);
      if (result) {
        const duration = Date.now() - startTime;
        recordRequest(routeKey, duration, true);
        reqLogger.debug(`Client route complete`, { duration });
        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`Client error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'CLIENT_ERROR', message: error.message },
        requestId
      }));
      return;
    }
  }

  // Try dynamic Limitless routes
  if (url.pathname.startsWith('/api/limitless/')) {
    try {
      const result = await handleLimitlessRoute(req, req.method, url.pathname, url);
      if (result) {
        const duration = Date.now() - startTime;
        recordRequest(routeKey, duration, true);
        reqLogger.debug(`Limitless route complete`, { duration });
        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`Limitless error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'LIMITLESS_ERROR', message: error.message },
        requestId
      }));
      return;
    }
  }

  // Try dynamic Marketing routes
  if (url.pathname.startsWith('/api/marketing/')) {
    try {
      const result = await handleMarketingRoute(req, req.method, url.pathname);
      if (result) {
        const duration = Date.now() - startTime;
        recordRequest(routeKey, duration, true);
        reqLogger.debug(`Marketing route complete`, { duration });
        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`Marketing error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'MARKETING_ERROR', message: error.message },
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
