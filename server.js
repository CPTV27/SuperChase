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
import fs, { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { createHmac } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Core imports
import queryHub from './core/query_hub.js';
import projectAgent from './core/project_agent.js';
import asana from './spokes/asana/pusher.js';
import twitter from './spokes/twitter/search.js';
import twitterPublish from './spokes/twitter/publish.js';
import portalQueue from './spokes/portal/queue.js';

// Agency multi-tenant support
import tenantManager from './core/tenant-manager.js';
import gbpClient from './spokes/gbp/client.js';
import agencyReview from './spokes/agency/review.js';

// Discovery spoke
import discovery from './spokes/discovery/index.js';

// S2P Command Center spoke
import { handleS2PRoute as handleS2PRouteV2 } from './spokes/s2p/routes.js';

// Library imports for enhanced reliability
import { createLogger, generateRequestId } from './lib/logger.js';
import { AppError, ValidationError, AuthenticationError, withFallback } from './lib/errors.js';
import health, { recordRequest, getMetrics, getHealth, withCircuitBreaker } from './lib/health.js';
import observability, {
  recordHttpRequest,
  startSpan,
  withTrace,
  startAlertChecker
} from './lib/observability.js';

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

    // Check Twitter (silenced - spend cap issues are billing, not system)
    try {
      const twitterStatus = await twitter.testConnection();
      const isSpendCap = twitterStatus.error?.includes('SpendCap');
      status.spokes.twitter = {
        status: twitterStatus.success ? 'online' : (isSpendCap ? 'online' : 'offline'),
        message: isSpendCap ? 'Spend cap reached (resets Feb 20)' : (twitterStatus.message || twitterStatus.error)
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

  // GET /api/today-focus - Unified action items for dashboard
  'GET /api/today-focus': async () => {
    const focus = {
      timestamp: new Date().toISOString(),
      reviews: { count: 0, items: [] },
      sparks: { count: 0, items: [] },
      tasks: { count: 0, items: [] },
      whales: { count: 0, items: [] },
      totalActions: 0
    };

    // 1. Get pending reviews from agency review
    try {
      const pulse = agencyReview.getReviewPulse();
      const pendingReviews = pulse.agencyPending || [];
      focus.reviews = {
        count: pendingReviews.length,
        items: pendingReviews.slice(0, 5).map(r => ({
          id: r.id,
          title: r.title,
          type: r.type,
          client: r.clientId,
          action: 'approve',
          actionUrl: `/review?id=${r.id}`
        }))
      };
    } catch (error) {
      logger.error('Today focus: reviews error', { error: error.message });
    }

    // 2. Get voice sparks from limitless
    try {
      const manifestPath = path.join(process.cwd(), 'manifest.jsonl');
      if (fs.existsSync(manifestPath)) {
        const lines = fs.readFileSync(manifestPath, 'utf-8').trim().split('\n');
        const recentSparks = lines
          .slice(-20)
          .reverse()
          .map(line => {
            try { return JSON.parse(line); } catch { return null; }
          })
          .filter(entry => entry && entry.type === 'voice_spark' && !entry.processed)
          .slice(0, 5);

        focus.sparks = {
          count: recentSparks.length,
          items: recentSparks.map(s => ({
            id: s.id || `spark-${Date.now()}`,
            title: s.topic || s.summary?.slice(0, 50) || 'Voice capture',
            source: 'limitless',
            timestamp: s.timestamp,
            action: 'process',
            actionUrl: '/sparks'
          }))
        };
      }
    } catch (error) {
      logger.error('Today focus: sparks error', { error: error.message });
    }

    // 3. Get tasks due today/overdue
    try {
      const allTasks = await asana.getTasks({ limit: 50 });
      const today = new Date().toISOString().split('T')[0];
      const urgentTasks = allTasks.filter(task => {
        if (!task.dueOn) return false;
        return task.dueOn <= today;
      }).slice(0, 5);

      focus.tasks = {
        count: urgentTasks.length,
        items: urgentTasks.map(t => ({
          id: t.gid,
          title: t.name,
          project: t.project,
          dueOn: t.dueOn,
          overdue: t.dueOn < today,
          action: 'complete',
          actionUrl: `/tasks?id=${t.gid}`
        }))
      };
    } catch (error) {
      logger.error('Today focus: tasks error', { error: error.message });
    }

    // 4. Get whale alerts from governance
    try {
      const whaleDir = path.join(process.cwd(), 'memory', 'whale_leads');
      if (fs.existsSync(whaleDir)) {
        const whaleFiles = fs.readdirSync(whaleDir).filter(f => f.endsWith('.json'));
        const whales = whaleFiles
          .map(f => {
            try {
              return JSON.parse(fs.readFileSync(path.join(whaleDir, f), 'utf-8'));
            } catch { return null; }
          })
          .filter(w => w && w.status === 'TIER_A_WHALE')
          .slice(0, 3);

        focus.whales = {
          count: whales.length,
          items: whales.map(w => ({
            id: w.id,
            title: w.project?.name || 'Whale Lead',
            sqft: w.project?.sqft,
            score: w.whaleScore?.total,
            tier: w.whaleScore?.tier,
            value: w.scanOpportunity?.estimatedValue?.mid,
            action: 'pursue',
            actionUrl: '/s2p'
          }))
        };
      }
    } catch (error) {
      logger.error('Today focus: whales error', { error: error.message });
    }

    // Calculate total actions needed
    focus.totalActions = focus.reviews.count + focus.sparks.count + focus.tasks.count + focus.whales.count;

    return focus;
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

  // Project Agent System
  'GET /api/projects': async () => {
    return {
      projects: projectAgent.getProjects(),
      agents: Object.entries(projectAgent.AGENT_PERSONAS).map(([id, p]) => ({
        id,
        name: p.name,
        role: p.role
      }))
    };
  },

  'POST /api/project-agent': async (req) => {
    const body = await parseBody(req);
    console.log(`[API] Project agent request: ${body.projectId} - ${body.task?.substring(0, 50)}...`);
    return projectAgent.handleProjectAgentRequest(body);
  },

  'POST /api/project-agent/team': async (req) => {
    const body = await parseBody(req);
    console.log(`[API] Full team request: ${body.projectId} - ${body.task?.substring(0, 50)}...`);
    return projectAgent.handleProjectAgentRequest({ ...body, runFullTeam: true });
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
  },

  // ============================================
  // LLM Council API Endpoints
  // ============================================

  // Run LLM Council deliberation
  'POST /api/llm-council': async (req) => {
    const body = await parseBody(req);
    const { handleLLMCouncilRequest } = await import('./core/llm_council.js');
    return handleLLMCouncilRequest(body);
  },

  // Get available LLM Council models
  'GET /api/llm-council/models': async () => {
    const { getAvailableModels } = await import('./core/llm_council.js');
    return getAvailableModels();
  },

  // Get cost status and budget information
  'GET /api/llm-council/costs': async () => {
    const { getCostStatus } = await import('./core/llm_council.js');
    return getCostStatus();
  },

  // Update budget limits
  'PUT /api/llm-council/costs/limits': async (req) => {
    const body = await parseBody(req);
    const { updateBudgetLimits } = await import('./core/llm_council.js');
    return updateBudgetLimits(body);
  },

  // Estimate cost for a query (without running)
  'POST /api/llm-council/estimate': async (req) => {
    const body = await parseBody(req);
    const { estimateCost } = await import('./core/llm_council.js');
    return estimateCost(body);
  },

  // ============================================
  // Competitive Intelligence API (Level 3 Council)
  // ============================================

  // Run competitive intel for a business unit
  'POST /api/competitive-intel/run': async (req) => {
    const body = await parseBody(req);
    const { chainToContent = false } = body;
    const { handleCompetitiveIntelRequest } = await import('./core/competitive_intel.js');
    const result = await handleCompetitiveIntelRequest(body);

    // Optionally chain to content council
    if (chainToContent && result.success) {
      (async () => {
        try {
          const { runContentCouncil } = await import('./core/content_council.js');
          logger.info('Auto-chaining to Content Council', { businessId: body.businessId });
          const contentResult = await runContentCouncil(body.businessId, { depth: 'quick' });
          logger.info('Content Council complete', { businessId: body.businessId, traceId: contentResult.traceId });
        } catch (e) {
          logger.warn('Background content council failed (non-blocking)', { error: e.message });
        }
      })();
      result.contentCouncil = 'generating';
    }

    return result;
  },

  // List all battlecards
  'GET /api/competitive-intel': async () => {
    const { listBattlecards } = await import('./core/competitive_intel.js');
    return { success: true, battlecards: listBattlecards() };
  },

  // ============================================
  // Content Council API (AI Content Factory)
  // ============================================

  // Run content council for a business unit
  'POST /api/content-council/run': async (req) => {
    const body = await parseBody(req);
    const { handleContentCouncilRequest } = await import('./core/content_council.js');
    return handleContentCouncilRequest(body);
  },

  // List all content sprints
  'GET /api/content-council': async () => {
    const { listContentSprints } = await import('./core/content_council.js');
    return { success: true, sprints: listContentSprints() };
  },

  // ============================================
  // Citation Verification API
  // ============================================

  // Verify a citation by re-fetching source
  'POST /api/citations/verify': async (req) => {
    const body = await parseBody(req);
    const { verifyCitation } = await import('./lib/citations.js');
    if (!body.citation) {
      throw new ValidationError('citation object is required');
    }
    return { success: true, result: await verifyCitation(body.citation) };
  },

  // Calculate citation quality for arbitrary sources
  'POST /api/citations/quality': async (req) => {
    const body = await parseBody(req);
    const { calculateCitationQuality } = await import('./lib/citations.js');
    if (!body.citations || !Array.isArray(body.citations)) {
      throw new ValidationError('citations array is required');
    }
    return { success: true, quality: calculateCitationQuality(body.citations) };
  },

  // ============================================
  // Portfolio Management API (Config-Driven)
  // ============================================

  // Get all business units
  'GET /api/portfolio/units': async () => {
    const portfolioManager = await import('./core/portfolio-manager.js');
    return {
      success: true,
      units: portfolioManager.getBusinessUnits({ activeOnly: false }),
      filterBar: portfolioManager.getFilterBarUnits()
    };
  },

  // Get single business unit
  'GET /api/portfolio/units/:id': async (req, params) => {
    const portfolioManager = await import('./core/portfolio-manager.js');
    return portfolioManager.getBusinessUnit(params.id);
  },

  // Add business unit
  'POST /api/portfolio/units': async (req) => {
    const body = await parseBody(req);
    const portfolioManager = await import('./core/portfolio-manager.js');
    return {
      success: true,
      unit: portfolioManager.addBusinessUnit(body)
    };
  },

  // Update business unit
  'PUT /api/portfolio/units/:id': async (req, params) => {
    const body = await parseBody(req);
    const portfolioManager = await import('./core/portfolio-manager.js');
    return {
      success: true,
      unit: portfolioManager.updateBusinessUnit(params.id, body)
    };
  },

  // Delete business unit
  'DELETE /api/portfolio/units/:id': async (req, params) => {
    const portfolioManager = await import('./core/portfolio-manager.js');
    return portfolioManager.deleteBusinessUnit(params.id);
  },

  // Get portfolio summary
  'GET /api/portfolio/summary': async () => {
    const portfolioManager = await import('./core/portfolio-manager.js');
    return portfolioManager.getPortfolioSummary();
  },

  // ============================================
  // Emergency Kill Switch
  // ============================================

  // Emergency shutdown - revokes API access and pauses all automation
  'POST /api/emergency/kill-switch': async (req) => {
    const body = await parseBody(req);

    // Require confirmation code for safety
    if (body.confirm !== 'KILL_ALL_AUTOMATION') {
      return {
        success: false,
        error: 'Safety check failed. Send confirm: "KILL_ALL_AUTOMATION"'
      };
    }

    console.log('\n🚨 EMERGENCY KILL SWITCH ACTIVATED 🚨\n');

    const actions = [];

    // 1. Set global automation pause flag
    globalThis.AUTOMATION_PAUSED = true;
    actions.push('Automation paused globally');

    // 2. Clear any cached auth tokens (in-memory)
    const { spokeCache, appCache } = await import('./lib/cache.js');
    // spokeCache is an object with named caches
    if (spokeCache) {
      for (const [name, cache] of Object.entries(spokeCache)) {
        if (cache && typeof cache.clear === 'function') {
          cache.clear();
          actions.push(`Cleared ${name} cache`);
        }
      }
    }
    if (appCache && typeof appCache.clear === 'function') {
      appCache.clear();
      actions.push('Cleared app cache');
    }

    // 3. Log the emergency action
    const fs = await import('fs');
    const killLog = {
      timestamp: new Date().toISOString(),
      action: 'EMERGENCY_KILL_SWITCH',
      reason: body.reason || 'Manual activation',
      initiator: body.initiator || 'API',
      actions
    };

    fs.appendFileSync(
      './memory/emergency_log.jsonl',
      JSON.stringify(killLog) + '\n'
    );

    return {
      success: true,
      message: '🚨 KILL SWITCH ACTIVATED - All automation paused',
      timestamp: killLog.timestamp,
      actions,
      recovery: 'POST /api/emergency/resume with confirm: "RESUME_AUTOMATION"'
    };
  },

  // Resume automation after kill switch
  'POST /api/emergency/resume': async (req) => {
    const body = await parseBody(req);

    if (body.confirm !== 'RESUME_AUTOMATION') {
      return {
        success: false,
        error: 'Safety check failed. Send confirm: "RESUME_AUTOMATION"'
      };
    }

    globalThis.AUTOMATION_PAUSED = false;

    const fs = await import('fs');
    fs.appendFileSync(
      './memory/emergency_log.jsonl',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        action: 'AUTOMATION_RESUMED',
        initiator: body.initiator || 'API'
      }) + '\n'
    );

    console.log('\n✅ AUTOMATION RESUMED ✅\n');

    return {
      success: true,
      message: 'Automation resumed',
      timestamp: new Date().toISOString()
    };
  },

  // Check automation status
  'GET /api/emergency/status': async () => {
    return {
      automationPaused: globalThis.AUTOMATION_PAUSED === true,
      timestamp: new Date().toISOString()
    };
  },

  // ============================================
  // Memory Management API
  // ============================================

  // Get memory status and disk usage
  'GET /api/memory/status': async () => {
    const memoryManager = await import('./lib/memory-manager.js');
    return memoryManager.getMemoryStatus();
  },

  // Run memory cleanup
  'POST /api/memory/cleanup': async (req) => {
    const body = await parseBody(req);
    const memoryManager = await import('./lib/memory-manager.js');
    return memoryManager.runCleanup({ dryRun: body.dryRun });
  },

  // Emergency cleanup (aggressive)
  'POST /api/memory/emergency-cleanup': async () => {
    const memoryManager = await import('./lib/memory-manager.js');
    return memoryManager.emergencyCleanup();
  },

  // ============================================
  // Governance & Hard Gate API Endpoints
  // ============================================

  // Get governance config for a business unit
  'GET /api/governance/:businessId': async (req, params) => {
    const businessId = params.businessId;
    const govPath = path.join(process.cwd(), 'clients', businessId, 'governance.json');
    const configPath = path.join(process.cwd(), 'clients', businessId, 'config.json');

    if (!fs.existsSync(configPath)) {
      return { error: `Business unit not found: ${businessId}` };
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const governance = fs.existsSync(govPath)
      ? JSON.parse(fs.readFileSync(govPath, 'utf-8'))
      : null;

    return {
      businessId,
      marginFloor: config.pricingEngine?.marginFloor || 0.40,
      hardGateEnabled: config.governance?.hardGateEnabled || false,
      governance,
      phase: config.phase || null
    };
  },

  // Verify a proposal against Hard Gates
  'POST /api/governance/:businessId/verify': async (req, params) => {
    const businessId = params.businessId;
    const body = await parseBody(req);
    const { proposedMargin, serviceType, customPricing } = body;

    const govPath = path.join(process.cwd(), 'clients', businessId, 'governance.json');
    const configPath = path.join(process.cwd(), 'clients', businessId, 'config.json');

    if (!fs.existsSync(configPath)) {
      return { error: `Business unit not found: ${businessId}` };
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const governance = fs.existsSync(govPath)
      ? JSON.parse(fs.readFileSync(govPath, 'utf-8'))
      : null;

    const marginFloor = config.pricingEngine?.marginFloor || 0.40;
    const violations = [];
    let approved = true;

    // Check margin floor
    if (proposedMargin !== undefined && proposedMargin < marginFloor) {
      violations.push({
        rule: 'MARGIN_FLOOR',
        message: `Proposed margin ${(proposedMargin * 100).toFixed(1)}% is below ${(marginFloor * 100).toFixed(0)}% Hard Gate`,
        severity: 'VETO',
        action: 'REJECTED'
      });
      approved = false;
    }

    // Check freelancing/custom pricing
    if (customPricing === true && governance?.hardGates?.noFreelancing?.enabled) {
      violations.push({
        rule: 'NO_FREELANCING',
        message: governance.hardGates.noFreelancing.violationMessage,
        severity: 'VETO',
        action: 'REJECTED'
      });
      approved = false;
    }

    // Check service type against P1-P22 portfolio
    if (serviceType && governance?.hardGates?.noBespokePricing?.enabled) {
      const validPods = governance.pods ? Object.keys(governance.pods) : [];
      // This would check against actual service catalog - simplified for demo
    }

    return {
      businessId,
      approved,
      marginFloor,
      proposedMargin,
      violations,
      auditorStatus: approved ? 'APPROVED' : 'VETOED',
      timestamp: new Date().toISOString()
    };
  },

  // Get whale leads
  'GET /api/governance/:businessId/whales': async (req, params) => {
    const whalesDir = path.join(process.cwd(), 'memory', 'whale_leads');
    if (!fs.existsSync(whalesDir)) {
      return { whales: [], count: 0 };
    }

    const files = fs.readdirSync(whalesDir).filter(f => f.endsWith('.json'));
    const whales = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(whalesDir, f), 'utf-8'));
      return {
        id: data.id,
        project: data.project?.name,
        sqft: data.project?.sqft,
        tier: data.whaleScore?.tier,
        score: data.whaleScore?.total,
        status: data.status,
        estimatedValue: data.scanOpportunity?.estimatedValue
      };
    });

    return {
      whales,
      count: whales.length,
      scoutMode: 'PHASE_1_WHALE'
    };
  },

  // ============================================
  // Observability API Endpoints
  // ============================================

  // Prometheus-format metrics (for Prometheus/Grafana scraping)
  'GET /api/observability/prometheus': async () => {
    return {
      _httpStatus: 200,
      _contentType: 'text/plain; charset=utf-8',
      _rawBody: observability.getPrometheusMetrics()
    };
  },

  // JSON metrics (for dashboard)
  'GET /api/observability/metrics': async () => {
    return observability.getMetricsJson();
  },

  // Distributed traces
  'GET /api/observability/traces': async (req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const traceId = url.searchParams.get('traceId');

    if (traceId) {
      return {
        spans: observability.getTraceById(traceId)
      };
    }

    return {
      traces: observability.getRecentTraces(limit),
      activeSpans: observability.getActiveSpans()
    };
  },

  // Alert status
  'GET /api/observability/alerts': async (req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get('limit')) || 20;

    // Check alerts now and return status
    const newAlerts = observability.checkAlerts();

    return {
      recentAlerts: observability.getRecentAlerts(limit),
      newAlerts,
      timestamp: new Date().toISOString()
    };
  },

  // Full observability dashboard data
  'GET /api/observability/dashboard': async () => {
    return observability.getObservabilityDashboard();
  },

  // ============================================
  // Context Injection API Endpoints
  // ============================================

  // List all onboarded businesses
  'GET /api/context/businesses': async () => {
    const ctx = await import('./lib/council-context.js');
    return {
      businesses: ctx.getOnboardedBusinesses()
    };
  },

  // Preview context injection for a query
  'POST /api/context/preview': async (req) => {
    const body = await parseBody(req);
    const { query } = body;

    if (!query) {
      return { error: 'query is required', status: 400 };
    }

    const ctx = await import('./lib/council-context.js');
    const result = await ctx.autoInjectContext(query);

    return {
      originalQuery: query,
      injected: result.injected,
      businessIds: result.businessIds,
      groundedQuery: result.query,
      contextLength: result.context?.context?.length || 0
    };
  },

  // ============================================
  // ONBOARDING API
  // ============================================

  // Research a business for onboarding
  'GET /api/onboard/research': async (req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const businessName = url.searchParams.get('name');

    if (!businessName) {
      return { error: 'name parameter is required', status: 400 };
    }

    const ctx = await import('./lib/council-context.js');
    const businessId = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if already exists
    const existing = await ctx.loadBusinessData(businessId);
    const portfolio = ctx.getOnboardedBusinesses();
    const portfolioEntry = portfolio.find(b => b.id === businessId);

    // Build researched data from existing sources
    const researched = [];
    const gaps = [];

    // Profile fields
    if (existing.config?.name || portfolioEntry?.name) {
      researched.push({
        field: 'name',
        label: 'Business Name',
        value: existing.config?.name || portfolioEntry?.name || businessName,
        confidence: existing.config?.name ? 'high' : 'medium',
        source: 'Internal data'
      });
    } else {
      researched.push({
        field: 'name',
        label: 'Business Name',
        value: businessName,
        confidence: 'medium',
        source: 'User input'
      });
    }

    // Business type
    if (existing.config?.businessType || portfolioEntry?.type) {
      researched.push({
        field: 'businessType',
        label: 'Business Type',
        value: existing.config?.businessType || portfolioEntry?.type,
        confidence: 'high',
        source: 'Internal config'
      });
    } else {
      gaps.push({
        id: 'businessType',
        question: 'What type of business is this?',
        field: 'businessType',
        required: true,
        options: [
          { label: 'Service Business', value: 'service' },
          { label: 'Brand/IP', value: 'brand' },
          { label: 'Client Project', value: 'client' },
          { label: 'Venue/Location', value: 'venue' }
        ]
      });
    }

    // Revenue model
    if (existing.config?.revenueModel) {
      researched.push({
        field: 'revenueModel',
        label: 'Revenue Model',
        value: existing.config.revenueModel,
        confidence: 'high',
        source: 'Internal config'
      });
    } else {
      gaps.push({
        id: 'revenueModel',
        question: 'How does this business generate revenue?',
        field: 'revenueModel',
        required: true,
        options: [
          { label: 'Project-based', value: 'project-based' },
          { label: 'Subscription/Retainer', value: 'subscription' },
          { label: 'Event-based', value: 'event-based' },
          { label: 'Product Sales', value: 'product-sales' }
        ]
      });
    }

    // Target market
    if (existing.config?.targetMarket) {
      researched.push({
        field: 'targetMarket',
        label: 'Target Market',
        value: existing.config.targetMarket,
        confidence: 'high',
        source: 'Internal config'
      });
    } else {
      gaps.push({
        id: 'targetMarket',
        question: 'Who is the target customer?',
        field: 'targetMarket',
        required: true
      });
    }

    // Value proposition
    if (existing.config?.valueProposition) {
      researched.push({
        field: 'valueProposition',
        label: 'Value Proposition',
        value: existing.config.valueProposition,
        confidence: 'high',
        source: 'Internal config'
      });
    }

    // Location
    if (existing.config?.location?.city) {
      researched.push({
        field: 'location',
        label: 'Location',
        value: `${existing.config.location.city}, ${existing.config.location.state}`,
        confidence: 'high',
        source: 'Internal config'
      });
    }

    // Check limitless context for intelligence
    if (existing.businessIntelligence?.clientData) {
      const intel = existing.businessIntelligence.clientData;
      if (intel.contacts) {
        researched.push({
          field: 'contacts',
          label: 'Key Contacts',
          value: intel.contacts.join(', '),
          confidence: 'high',
          source: 'Limitless intelligence'
        });
      }
      if (intel.tone) {
        researched.push({
          field: 'tone',
          label: 'Brand Tone',
          value: intel.tone,
          confidence: 'high',
          source: 'Limitless intelligence'
        });
      }
    }

    // GST goals
    if (existing.gst?.goals?.length > 0) {
      researched.push({
        field: 'goals',
        label: 'Current Goals',
        value: existing.gst.goals.map(g => g.title).join(', '),
        confidence: 'high',
        source: 'GST config'
      });
    } else {
      gaps.push({
        id: 'primaryGoal',
        question: 'What is the primary business goal?',
        field: 'primaryGoal',
        required: true,
        options: [
          { label: 'Increase Revenue', value: 'revenue', description: 'Hit a specific revenue target' },
          { label: 'Launch New Offering', value: 'launch', description: 'New product or service' },
          { label: 'Expand Market', value: 'expand', description: 'Enter new markets' },
          { label: 'Improve Operations', value: 'operations', description: 'Efficiency and systems' }
        ]
      });
    }

    return {
      businessId,
      businessName,
      existingData: !!existing.config,
      researched,
      gaps,
      sourcesChecked: ['portfolio.json', 'config.json', 'gst.json', 'limitless_context.json']
    };
  },

  // Complete onboarding - write config files
  'POST /api/onboard/complete': async (req) => {
    const body = await parseBody(req);
    const { businessId, businessName, researchedData, answers } = body;

    if (!businessId || !businessName) {
      return { error: 'businessId and businessName are required', status: 400 };
    }

    const clientDir = join(__dirname, 'clients', businessId);
    const portfolioPath = join(__dirname, 'config', 'portfolio.json');
    const filesCreated = [];

    // Ensure client directory exists
    if (!existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }

    // Build config from researched data + answers
    const dataMap = {};
    for (const item of (researchedData || [])) {
      dataMap[item.field] = item.value;
    }
    for (const [key, value] of Object.entries(answers || {})) {
      dataMap[key] = value;
    }

    // Read existing config or create new
    const configPath = join(clientDir, 'config.json');
    let config = {};
    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf8'));
    }

    // Merge new data
    config = {
      ...config,
      id: businessId,
      name: dataMap.name || businessName,
      businessType: dataMap.businessType || config.businessType || 'service',
      revenueModel: dataMap.revenueModel || config.revenueModel,
      targetMarket: dataMap.targetMarket || config.targetMarket,
      valueProposition: dataMap.valueProposition || config.valueProposition,
      createdAt: config.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Write config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    filesCreated.push(`clients/${businessId}/config.json`);

    // Create/update GST if goal provided
    if (dataMap.primaryGoal) {
      const gstPath = join(clientDir, 'gst.json');
      let gst = { businessId, goals: [], strategies: [], tactics: [] };
      if (existsSync(gstPath)) {
        gst = JSON.parse(readFileSync(gstPath, 'utf8'));
      }

      // Add goal if not exists
      const goalExists = gst.goals?.some(g =>
        g.title?.toLowerCase().includes(dataMap.primaryGoal.toLowerCase())
      );
      if (!goalExists) {
        const goalTitles = {
          revenue: 'Increase Revenue',
          launch: 'Launch New Offering',
          expand: 'Expand Market',
          operations: 'Improve Operations'
        };
        gst.goals = gst.goals || [];
        gst.goals.push({
          id: `goal_${businessId}_${Date.now()}`,
          title: goalTitles[dataMap.primaryGoal] || dataMap.primaryGoal,
          metric: dataMap.primaryGoal === 'revenue' ? 'revenue' : 'milestone',
          target: null,
          current: null,
          status: 'in_progress',
          deadline: '2026-12-31',
          createdAt: new Date().toISOString()
        });
      }
      gst.updatedAt = new Date().toISOString();

      fs.writeFileSync(gstPath, JSON.stringify(gst, null, 2));
      filesCreated.push(`clients/${businessId}/gst.json`);
    }

    // Update portfolio.json
    if (existsSync(portfolioPath)) {
      const portfolio = JSON.parse(readFileSync(portfolioPath, 'utf8'));
      const existingIndex = portfolio.businessUnits.findIndex(u => u.id === businessId);

      const entry = {
        id: businessId,
        name: dataMap.name || businessName,
        shortName: businessId.toUpperCase().slice(0, 3),
        type: dataMap.businessType || 'service',
        description: dataMap.valueProposition || config.valueProposition || '',
        active: true
      };

      if (existingIndex >= 0) {
        portfolio.businessUnits[existingIndex] = {
          ...portfolio.businessUnits[existingIndex],
          ...entry
        };
      } else {
        portfolio.businessUnits.push(entry);
      }

      fs.writeFileSync(portfolioPath, JSON.stringify(portfolio, null, 2));
      filesCreated.push('config/portfolio.json');
    }

    logger.info('Onboarding complete', { businessId, filesCreated });

    // Auto-trigger competitive intelligence in background (non-blocking)
    (async () => {
      try {
        const { runCompetitiveIntel } = await import('./core/competitive_intel.js');
        logger.info('Auto-triggering competitive intel', { businessId });
        const result = await runCompetitiveIntel(businessId, { depth: 'quick' });
        logger.info('Competitive intel complete', { businessId, traceId: result.traceId });
      } catch (e) {
        logger.warn('Background competitive intel failed (non-blocking)', { businessId, error: e.message });
      }
    })();

    return {
      success: true,
      businessId,
      businessName,
      filesCreated,
      competitiveIntel: 'generating', // Signal that battlecard is being generated
      message: `${businessName} has been onboarded successfully`
    };
  },

  // POST /api/demo/seed - Seed demo data for review queue
  'POST /api/demo/seed': async () => {
    // Token generation (must match spokes/agency/review.js logic)
    const REVIEW_SECRET = process.env.REVIEW_SECRET || 'superchase-review-2026';
    const genToken = (id, action) => createHmac('sha256', REVIEW_SECRET).update(`${id}:${action}:${REVIEW_SECRET}`).digest('hex').slice(0, 32);

    const demoItems = [
      {
        id: 'review-demo-001',
        clientId: 's2p',
        type: 'blog',
        title: 'Why LOD 350 Matters for Renovation Projects',
        content: 'When it comes to renovation projects, the level of detail in your BIM model can mean the difference between a smooth construction phase and costly change orders...\n\nLOD 350 provides the precision needed for MEP coordination, clash detection, and accurate quantity takeoffs. Our recent project at The Castle demonstrated how ±3mm variance control prevented $280K in potential conflicts.\n\n## Key Benefits\n- Precise MEP routing\n- Accurate clash detection\n- Reliable quantity takeoffs\n- Reduced RFIs during construction',
        status: 'AGENCY_REVIEW',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date().toISOString(),
        history: [
          { status: 'DRAFT', timestamp: new Date(Date.now() - 7200000).toISOString(), actor: 'content-council' },
          { status: 'AGENCY_REVIEW', timestamp: new Date(Date.now() - 3600000).toISOString(), actor: 'system' }
        ],
        approveToken: genToken('review-demo-001', 'approve'),
        rejectToken: genToken('review-demo-001', 'reject'),
        metadata: { source: 'Content Council', targetPersona: 'BP1', wordCount: 850 }
      },
      {
        id: 'review-demo-002',
        clientId: 's2p',
        type: 'social',
        title: 'X Thread: Point Cloud Processing Speed',
        content: 'Thread: How we cut point cloud processing time by 60%\n\n1/ Most scanning firms treat processing as an afterthought. We treat it as a competitive advantage.\n\n2/ The secret? Parallel processing pipelines and automated QC checks that catch issues before they become expensive problems.\n\n3/ Result: 3-5 week delivery instead of 8-12 weeks. Your design team isn\'t waiting on data.\n\n4/ DM for our processing workflow whitepaper.',
        status: 'AGENCY_REVIEW',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 43200000).toISOString(),
        history: [
          { status: 'DRAFT', timestamp: new Date(Date.now() - 86400000).toISOString(), actor: 'content-council' },
          { status: 'AGENCY_REVIEW', timestamp: new Date(Date.now() - 43200000).toISOString(), actor: 'system' }
        ],
        approveToken: genToken('review-demo-002', 'approve'),
        rejectToken: genToken('review-demo-002', 'reject'),
        metadata: { source: 'Content Council', threadLength: 4, platform: 'x.com' }
      },
      {
        id: 'review-demo-003',
        clientId: 'bigmuddy',
        type: 'blog',
        title: 'Silver Street Stories: The Blues Legacy of Clarksdale',
        content: 'Long before the crossroads became a tourist destination, Silver Street was where the real magic happened...\n\nThe Big Muddy Inn sits at the heart of this history, where legends like Muddy Waters and John Lee Hooker once played for crowds of cotton workers and travelers passing through the Delta.\n\n## The Golden Era\nIn the 1940s and 50s, Clarksdale was the epicenter of Delta blues...',
        status: 'CLIENT_REVIEW',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        history: [
          { status: 'DRAFT', timestamp: new Date(Date.now() - 172800000).toISOString(), actor: 'content-council' },
          { status: 'AGENCY_REVIEW', timestamp: new Date(Date.now() - 129600000).toISOString(), actor: 'system' },
          { status: 'CLIENT_REVIEW', timestamp: new Date(Date.now() - 86400000).toISOString(), actor: 'agency', note: 'Approved - great storytelling' }
        ],
        approveToken: genToken('review-demo-003', 'approve'),
        rejectToken: genToken('review-demo-003', 'reject'),
        metadata: { source: 'Content Council', wordCount: 1200 }
      },
      {
        id: 'review-demo-004',
        clientId: 'studioc',
        type: 'blog',
        title: 'Behind the Scenes: Virtual Production at Utopia Studios',
        content: 'Virtual production isn\'t just for Hollywood anymore. At Utopia Studios, we\'re bringing LED wall technology to independent creators...\n\nOur recent production for a Hudson Valley tourism campaign demonstrated how virtual backgrounds can transport viewers without the travel budget.\n\n## The Setup\n- 20ft curved LED wall\n- Unreal Engine real-time rendering\n- Motion capture integration',
        status: 'CLIENT_APPROVED',
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 43200000).toISOString(),
        history: [
          { status: 'DRAFT', timestamp: new Date(Date.now() - 259200000).toISOString(), actor: 'content-council' },
          { status: 'AGENCY_REVIEW', timestamp: new Date(Date.now() - 216000000).toISOString(), actor: 'system' },
          { status: 'CLIENT_REVIEW', timestamp: new Date(Date.now() - 172800000).toISOString(), actor: 'agency' },
          { status: 'CLIENT_APPROVED', timestamp: new Date(Date.now() - 43200000).toISOString(), actor: 'client:studioc', note: 'Approved - ready to publish!' }
        ],
        approveToken: genToken('review-demo-004', 'approve'),
        rejectToken: genToken('review-demo-004', 'reject'),
        metadata: { source: 'Content Council', wordCount: 950 }
      },
      {
        id: 'review-demo-005',
        clientId: 's2p',
        type: 'blog',
        title: 'Matterport vs Engineering-Grade Scanning: Know the Difference',
        content: 'Not all 3D scanning is created equal. While Matterport excels at virtual tours, it wasn\'t designed for construction documentation...\n\n## The Accuracy Gap\nMatterport: ±30mm tolerance\nEngineering-grade: ±3mm tolerance\n\nThat 10x difference matters when you\'re coordinating MEP systems or verifying structural dimensions.',
        status: 'REVISION',
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
        history: [
          { status: 'DRAFT', timestamp: new Date(Date.now() - 345600000).toISOString(), actor: 'content-council' },
          { status: 'AGENCY_REVIEW', timestamp: new Date(Date.now() - 302400000).toISOString(), actor: 'system' },
          { status: 'REVISION', timestamp: new Date(Date.now() - 172800000).toISOString(), actor: 'agency', feedback: 'Tone is too aggressive toward Matterport. Reframe as "right tool for the job" rather than competitor bashing.' }
        ],
        approveToken: genToken('review-demo-005', 'approve'),
        rejectToken: genToken('review-demo-005', 'reject'),
        metadata: { source: 'Content Council', wordCount: 750, lastFeedback: 'Tone is too aggressive toward Matterport. Reframe as "right tool for the job" rather than competitor bashing.' }
      },
      {
        id: 'review-demo-006',
        clientId: 'cptv',
        type: 'social',
        title: 'X Thread: Building in Public - Week 3',
        content: 'Thread: Building SuperChase OS in public - Week 3 update\n\n1/ This week we shipped: Today\'s Focus dashboard widget, S2P Lead Radar API, and fixed the sidebar (finally).\n\n2/ The whale lead system is now live. Already identified a $350K opportunity at CUNY Baruch.\n\n3/ Next up: Review queue integration and mobile quick actions.\n\n4/ Follow along as we build the AI-powered business operating system.',
        status: 'AGENCY_REVIEW',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        updatedAt: new Date(Date.now() - 900000).toISOString(),
        history: [
          { status: 'DRAFT', timestamp: new Date(Date.now() - 1800000).toISOString(), actor: 'content-council' },
          { status: 'AGENCY_REVIEW', timestamp: new Date(Date.now() - 900000).toISOString(), actor: 'system' }
        ],
        approveToken: genToken('review-demo-006', 'approve'),
        rejectToken: genToken('review-demo-006', 'reject'),
        metadata: { source: 'Content Council', threadLength: 4, platform: 'x.com', targetPersona: 'Builders' }
      }
    ];

    // Write to review queue
    const queuePath = join(__dirname, 'memory', 'review_queue.json');
    const memoryDir = join(__dirname, 'memory');
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }
    fs.writeFileSync(queuePath, JSON.stringify(demoItems, null, 2));

    return {
      success: true,
      seeded: demoItems.length,
      items: demoItems.map(i => ({ id: i.id, title: i.title, status: i.status, clientId: i.clientId })),
      message: `Seeded ${demoItems.length} demo review items`
    };
  },

  // GET /api/demo/reset - Reset demo data
  'GET /api/demo/reset': async () => {
    const queuePath = join(__dirname, 'memory', 'review_queue.json');
    if (fs.existsSync(queuePath)) {
      fs.writeFileSync(queuePath, '[]');
    }
    return { success: true, message: 'Demo data reset' };
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
 * Handle Competitive Intelligence API routes (dynamic)
 * Pattern: /api/competitive-intel/:businessId
 */
async function handleCompetitiveIntelRoute(req, method, pathname) {
  // Skip if it's the list endpoint or run endpoint
  if (pathname === '/api/competitive-intel' || pathname === '/api/competitive-intel/run') {
    return null;
  }

  const match = pathname.match(/^\/api\/competitive-intel\/([^/]+)$/);
  if (!match) return null;

  const businessId = match[1];

  if (method === 'GET') {
    const { getBattlecard } = await import('./core/competitive_intel.js');
    const card = getBattlecard(businessId);
    if (!card) {
      return { error: `No battlecard found for: ${businessId}`, _status: 404 };
    }
    return { success: true, battlecard: card };
  }

  return null;
}

/**
 * Handle Content Council API routes (dynamic)
 * Pattern: /api/content-council/:businessId[/heygen[/generate]]
 */
async function handleContentCouncilRoute(req, method, pathname) {
  // Skip if it's the list endpoint or run endpoint
  if (pathname === '/api/content-council' || pathname === '/api/content-council/run') {
    return null;
  }

  // Match /api/content-council/:businessId/heygen/generate
  const generateMatch = pathname.match(/^\/api\/content-council\/([^/]+)\/heygen\/generate$/);
  if (generateMatch && method === 'POST') {
    const businessId = generateMatch[1];
    const { getHeyGenPayload, generateHeyGenVideo } = await import('./core/content_council.js');
    const payload = getHeyGenPayload(businessId);
    if (!payload) {
      return { error: `No HeyGen payload found for: ${businessId}`, _status: 404 };
    }
    return generateHeyGenVideo(payload);
  }

  // Match /api/content-council/:businessId/heygen
  const heygenMatch = pathname.match(/^\/api\/content-council\/([^/]+)\/heygen$/);
  if (heygenMatch && method === 'GET') {
    const businessId = heygenMatch[1];
    const { getHeyGenPayload } = await import('./core/content_council.js');
    const payload = getHeyGenPayload(businessId);
    if (!payload) {
      return { error: `No HeyGen payload found for: ${businessId}`, _status: 404 };
    }
    return { success: true, heygenPayload: payload };
  }

  // Match /api/content-council/:businessId
  const match = pathname.match(/^\/api\/content-council\/([^/]+)$/);
  if (match && method === 'GET') {
    const businessId = match[1];
    const { getContentSprint } = await import('./core/content_council.js');
    const sprint = getContentSprint(businessId);
    if (!sprint) {
      return { error: `No content sprint found for: ${businessId}`, _status: 404 };
    }
    return { success: true, contentSprint: sprint };
  }

  return null;
}

/**
 * Handle Citation API routes (dynamic)
 * Pattern: /api/citations/battlecard/:businessId
 */
async function handleCitationRoute(req, method, pathname) {
  // Skip if it's the verify or quality endpoint
  if (pathname === '/api/citations/verify' || pathname === '/api/citations/quality') {
    return null;
  }

  const match = pathname.match(/^\/api\/citations\/battlecard\/([^/]+)$/);
  if (!match) return null;

  const businessId = match[1];

  if (method === 'GET') {
    const { getBattlecard } = await import('./core/competitive_intel.js');
    const card = getBattlecard(businessId);
    if (!card) {
      return { error: `No battlecard found for: ${businessId}`, _status: 404 };
    }
    return {
      success: true,
      businessId,
      citations: card.citations || { sources: [], quality: { score: 0, grade: 'F' } }
    };
  }

  return null;
}

/**
 * Handle Context API routes (dynamic)
 * Pattern: /api/context/:businessId[/validate]
 */
async function handleContextRoute(req, method, pathname) {
  // Skip if it's the businesses list endpoint or preview endpoint
  if (pathname === '/api/context/businesses' || pathname === '/api/context/preview') {
    return null;
  }

  // Match /api/context/:businessId/validate
  const validateMatch = pathname.match(/^\/api\/context\/([^/]+)\/validate$/);
  if (validateMatch && method === 'GET') {
    const businessId = validateMatch[1];
    const ctx = await import('./lib/council-context.js');
    return ctx.validateBusinessData(businessId);
  }

  // Match /api/context/:businessId
  const match = pathname.match(/^\/api\/context\/([^/]+)$/);
  if (match && method === 'GET') {
    const businessId = match[1];
    const ctx = await import('./lib/council-context.js');
    return ctx.buildContext(businessId);
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
 * Handle Governance API routes
 * Pattern: /api/governance/:businessId/:action?
 */
async function handleGovernanceRoute(req, method, pathname) {
  const match = pathname.match(/^\/api\/governance\/([^/]+)(?:\/(.*))?$/);
  if (!match) return null;

  const businessId = match[1];
  const action = match[2] || 'config';

  logger.info(`[Governance API] ${method} /${businessId}/${action}`);

  const govPath = path.join(process.cwd(), 'clients', businessId, 'governance.json');
  const configPath = path.join(process.cwd(), 'clients', businessId, 'config.json');

  // GET /api/governance/:businessId - Get governance config
  if (method === 'GET' && (!action || action === 'config')) {
    if (!fs.existsSync(configPath)) {
      return { error: `Business unit not found: ${businessId}` };
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const governance = fs.existsSync(govPath)
      ? JSON.parse(fs.readFileSync(govPath, 'utf-8'))
      : null;

    return {
      businessId,
      marginFloor: config.pricingEngine?.marginFloor || 0.40,
      hardGateEnabled: config.governance?.hardGateEnabled || (governance?.hardGates ? true : false),
      governance,
      phase: config.phase || null
    };
  }

  // POST /api/governance/:businessId/verify - Verify proposal against Hard Gates
  if (method === 'POST' && action === 'verify') {
    if (!fs.existsSync(configPath)) {
      return { error: `Business unit not found: ${businessId}` };
    }

    const body = await parseBody(req);
    const { proposedMargin, serviceType, customPricing } = body;

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const governance = fs.existsSync(govPath)
      ? JSON.parse(fs.readFileSync(govPath, 'utf-8'))
      : null;

    const marginFloor = config.pricingEngine?.marginFloor || 0.40;
    const violations = [];
    let approved = true;

    // Check margin floor
    if (proposedMargin !== undefined && proposedMargin < marginFloor) {
      violations.push({
        rule: 'MARGIN_FLOOR',
        message: `HARD GATE VIOLATION: Proposed margin ${(proposedMargin * 100).toFixed(1)}% is below ${(marginFloor * 100).toFixed(0)}% minimum`,
        severity: 'VETO',
        action: 'REJECTED'
      });
      approved = false;
    }

    // Check freelancing/custom pricing
    if (customPricing === true && governance?.hardGates?.noFreelancing?.enabled) {
      violations.push({
        rule: 'NO_FREELANCING',
        message: governance.hardGates.noFreelancing.violationMessage || 'FREELANCING DETECTED: Custom pricing outside P1-P22 portfolio is not allowed',
        severity: 'VETO',
        action: 'REJECTED'
      });
      approved = false;
    }

    return {
      businessId,
      approved,
      marginFloor,
      proposedMargin,
      violations,
      auditorStatus: approved ? 'APPROVED' : 'VETOED',
      timestamp: new Date().toISOString()
    };
  }

  // GET /api/governance/:businessId/whales - Get whale leads
  if (method === 'GET' && action === 'whales') {
    const whalesDir = path.join(process.cwd(), 'memory', 'whale_leads');
    if (!fs.existsSync(whalesDir)) {
      fs.mkdirSync(whalesDir, { recursive: true });
      return { whales: [], count: 0, scoutMode: 'PHASE_1_WHALE' };
    }

    const files = fs.readdirSync(whalesDir).filter(f => f.endsWith('.json'));
    const whales = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(whalesDir, f), 'utf-8'));
      return {
        id: data.id,
        project: data.project?.name,
        sqft: data.project?.sqft,
        tier: data.whaleScore?.tier,
        score: data.whaleScore?.total,
        status: data.status,
        estimatedValue: data.scanOpportunity?.estimatedValue
      };
    });

    return {
      whales,
      count: whales.length,
      scoutMode: 'PHASE_1_WHALE'
    };
  }

  // GET /api/governance/:businessId/personas - Get persona configs
  if (method === 'GET' && action === 'personas') {
    const personasPath = path.join(process.cwd(), 'clients', businessId, 'personas.json');
    if (!fs.existsSync(personasPath)) {
      return { error: `Personas not configured for: ${businessId}` };
    }
    return JSON.parse(fs.readFileSync(personasPath, 'utf-8'));
  }

  return { error: `Unknown governance action: ${action}` };
}

/**
 * Handle S2P Lead Radar API routes
 * Pattern: /api/s2p/:action
 */
async function handleS2PRoute(req, method, pathname) {
  const match = pathname.match(/^\/api\/s2p(?:\/(.*))?$/);
  if (!match) return null;

  const action = match[1] || 'signals';
  const vaultPath = path.join(process.cwd(), 'memory', 's2p_prospect_vault.jsonl');

  logger.info(`[S2P API] ${method} /${action}`);

  // Load prospects from vault
  function loadProspects() {
    if (!fs.existsSync(vaultPath)) {
      return [];
    }
    return fs.readFileSync(vaultPath, 'utf-8')
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line); }
        catch { return null; }
      })
      .filter(Boolean);
  }

  // GET /api/s2p/signals - Get all lead signals
  if (method === 'GET' && action === 'signals') {
    const prospects = loadProspects();
    const signals = prospects.map(p => ({
      id: p.id,
      source: p.source,
      firmName: p.firmName,
      signalType: p.signalType,
      location: p.location,
      projectType: p.projectType,
      urgencyLevel: p.urgencyLevel,
      distanceToMeeting: p.distanceToMeeting,
      timestamp: p.timestamp,
      status: p.status || 'new'
    }));

    // Sort by distanceToMeeting (highest first = hottest leads)
    signals.sort((a, b) => (b.distanceToMeeting || 0) - (a.distanceToMeeting || 0));

    return {
      signals,
      count: signals.length,
      hotLeads: signals.filter(s => (s.distanceToMeeting || 0) >= 80).length
    };
  }

  // GET /api/s2p/prospects - Get full prospect details
  if (method === 'GET' && action === 'prospects') {
    const prospects = loadProspects();

    // Sort by distanceToMeeting
    prospects.sort((a, b) => (b.distanceToMeeting || 0) - (a.distanceToMeeting || 0));

    return {
      prospects,
      count: prospects.length,
      summary: {
        total: prospects.length,
        hot: prospects.filter(p => (p.distanceToMeeting || 0) >= 80).length,
        warm: prospects.filter(p => (p.distanceToMeeting || 0) >= 50 && (p.distanceToMeeting || 0) < 80).length,
        cold: prospects.filter(p => (p.distanceToMeeting || 0) < 50).length,
        byStatus: {
          new: prospects.filter(p => p.status === 'new').length,
          contacted: prospects.filter(p => p.status === 'contacted').length,
          meeting: prospects.filter(p => p.status === 'meeting').length,
          proposal: prospects.filter(p => p.status === 'proposal').length,
          won: prospects.filter(p => p.status === 'won').length,
          lost: prospects.filter(p => p.status === 'lost').length
        }
      }
    };
  }

  // GET /api/s2p/prospects/:id - Get specific prospect
  if (method === 'GET' && action.startsWith('prospects/')) {
    const prospectId = action.replace('prospects/', '');
    const prospects = loadProspects();
    const prospect = prospects.find(p => p.id === prospectId);

    if (!prospect) {
      return { error: `Prospect not found: ${prospectId}` };
    }

    return { prospect };
  }

  // POST /api/s2p/prospects/:id/outreach - Record outreach activity
  if (method === 'POST' && action.match(/^prospects\/[^/]+\/outreach$/)) {
    const prospectId = action.split('/')[1];
    const body = await parseBody(req);

    const prospects = loadProspects();
    const prospectIndex = prospects.findIndex(p => p.id === prospectId);

    if (prospectIndex === -1) {
      return { error: `Prospect not found: ${prospectId}` };
    }

    // Update prospect with outreach
    const prospect = prospects[prospectIndex];
    prospect.outreachHistory = prospect.outreachHistory || [];
    prospect.outreachHistory.push({
      timestamp: new Date().toISOString(),
      type: body.type || 'email',
      note: body.note,
      outcome: body.outcome
    });
    prospect.status = body.newStatus || prospect.status;

    // Rewrite vault file
    const lines = prospects.map(p => JSON.stringify(p));
    fs.writeFileSync(vaultPath, lines.join('\n') + '\n');

    return { success: true, prospect };
  }

  // GET /api/s2p/dashboard - Get dashboard summary
  if (method === 'GET' && action === 'dashboard') {
    const prospects = loadProspects();
    const whalesDir = path.join(process.cwd(), 'memory', 'whale_leads');
    let whales = [];

    if (fs.existsSync(whalesDir)) {
      const files = fs.readdirSync(whalesDir).filter(f => f.endsWith('.json'));
      whales = files.map(f => JSON.parse(fs.readFileSync(path.join(whalesDir, f), 'utf-8')));
    }

    return {
      prospects: {
        total: prospects.length,
        hot: prospects.filter(p => (p.distanceToMeeting || 0) >= 80).length,
        new: prospects.filter(p => p.status === 'new').length
      },
      whales: {
        total: whales.length,
        tierA: whales.filter(w => w.whaleScore?.tier === 'A').length,
        totalValue: whales.reduce((sum, w) => sum + (w.scanOpportunity?.estimatedValue?.mid || 0), 0)
      },
      recentActivity: prospects
        .filter(p => p.outreachHistory?.length > 0)
        .slice(0, 5)
        .map(p => ({
          firmName: p.firmName,
          lastOutreach: p.outreachHistory[p.outreachHistory.length - 1]
        }))
    };
  }

  // Fall back to new S2P routes from spokes/s2p/routes.js
  const v2Result = await handleS2PRouteV2(req, method, pathname);
  if (v2Result) {
    return v2Result;
  }

  return { error: `Unknown S2P action: ${action}` };
}

/**
 * Handle Business Discovery API routes
 * Pattern: /api/discover/:businessId/:action
 */
async function handleDiscoveryRoute(req, method, pathname) {
  const match = pathname.match(/^\/api\/discover\/([^/]+)(?:\/(.*))?$/);
  if (!match) return null;

  const businessId = match[1];
  const action = match[2] || 'status';

  logger.info(`[Discovery API] ${method} /${businessId}/${action}`);

  // GET /api/discover/:businessId/status - Get discovery status
  if (method === 'GET' && action === 'status') {
    return discovery.getDiscoveryStatus(businessId);
  }

  // GET /api/discover/:businessId/questions - Get discovery questions
  if (method === 'GET' && action === 'questions') {
    return discovery.getDiscoveryQuestions(businessId);
  }

  // POST /api/discover/:businessId/upload - Handle file upload
  if (method === 'POST' && action === 'upload') {
    try {
      const { default: formidable } = await import('formidable');

      const form = formidable({
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowEmptyFiles: false,
        multiples: true,
      });

      return new Promise((resolve, reject) => {
        form.parse(req, async (err, fields, files) => {
          if (err) {
            resolve({ success: false, error: `Upload error: ${err.message}` });
            return;
          }

          // Handle both single and multiple files
          const fileArray = Array.isArray(files.files)
            ? files.files
            : (files.files ? [files.files] : []);

          // Also check for 'file' field name
          const singleFile = Array.isArray(files.file)
            ? files.file
            : (files.file ? [files.file] : []);

          const allFiles = [...fileArray, ...singleFile];

          if (allFiles.length === 0) {
            resolve({ success: false, error: 'No files uploaded' });
            return;
          }

          const result = await discovery.handleUpload(businessId, allFiles);
          resolve(result);
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // POST /api/discover/:businessId/extract - Trigger AI extraction
  if (method === 'POST' && action === 'extract') {
    return discovery.handleExtraction(businessId);
  }

  // POST /api/discover/:businessId/answers - Save user answers
  if (method === 'POST' && action === 'answers') {
    const body = await parseBody(req);
    return discovery.saveAnswers(businessId, body.answers || body);
  }

  // POST /api/discover/:businessId/commit - Commit discovery to configs
  if (method === 'POST' && action === 'commit') {
    return discovery.commitDiscovery(businessId);
  }

  return { success: false, error: `Unknown discovery action: ${action}` };
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
        recordHttpRequest(req.method, url.pathname, result.statusCode, duration);
        reqLogger.error(`Error: ${result.message}`, { statusCode: result.statusCode, duration });
        res.writeHead(result.statusCode, CORS_HEADERS);
        res.end(JSON.stringify(errorResponse));
        return;
      }

      const statusCode = result._httpStatus || 200;
      const contentType = result._contentType || 'application/json';
      const rawBody = result._rawBody;
      delete result._httpStatus;
      delete result._contentType;
      delete result._rawBody;

      recordRequest(routeKey, duration, statusCode < 400);
      recordHttpRequest(req.method, url.pathname, statusCode, duration);
      reqLogger.debug(`Complete`, { statusCode, duration });

      // Handle raw body responses (like Prometheus metrics)
      if (rawBody !== undefined) {
        res.writeHead(statusCode, { ...CORS_HEADERS, 'Content-Type': contentType });
        res.end(rawBody);
        return;
      }

      res.writeHead(statusCode, CORS_HEADERS);
      res.end(JSON.stringify({ ...result, requestId }));
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      recordHttpRequest(req.method, url.pathname, 500, duration);

      // Handle known error types
      if (error instanceof AppError) {
        const errorResponse = error.toJSON(!IS_DEV);
        errorResponse.requestId = requestId;
        recordHttpRequest(req.method, url.pathname, error.statusCode, duration);
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

  // Try dynamic discovery routes
  if (url.pathname.startsWith('/api/discover/')) {
    try {
      const result = await handleDiscoveryRoute(req, req.method, url.pathname);
      if (result) {
        const duration = Date.now() - startTime;
        recordRequest(routeKey, duration, true);
        reqLogger.debug(`Discovery route complete`, { duration });
        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`Discovery error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'DISCOVERY_ERROR', message: error.message },
        requestId
      }));
      return;
    }
  }

  // Try dynamic governance routes
  if (url.pathname.startsWith('/api/governance/')) {
    try {
      const result = await handleGovernanceRoute(req, req.method, url.pathname);
      if (result) {
        const duration = Date.now() - startTime;
        recordRequest(routeKey, duration, true);
        reqLogger.debug(`Governance route complete`, { duration });
        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`Governance error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'GOVERNANCE_ERROR', message: error.message },
        requestId
      }));
      return;
    }
  }

  // Try dynamic S2P routes
  if (url.pathname.startsWith('/api/s2p')) {
    try {
      const result = await handleS2PRoute(req, req.method, url.pathname);
      if (result) {
        const duration = Date.now() - startTime;
        recordRequest(routeKey, duration, true);
        reqLogger.debug(`S2P route complete`, { duration });
        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`S2P error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'S2P_ERROR', message: error.message },
        requestId
      }));
      return;
    }
  }

  // Try dynamic Marketing routes
  if (url.pathname.startsWith('/api/marketing')) {
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

  // Try dynamic Competitive Intelligence routes
  if (url.pathname.startsWith('/api/competitive-intel/')) {
    try {
      const result = await handleCompetitiveIntelRoute(req, req.method, url.pathname);
      if (result) {
        const duration = Date.now() - startTime;
        const statusCode = result._status || 200;
        delete result._status;
        recordRequest(routeKey, duration, statusCode < 400);
        reqLogger.debug(`Competitive Intel route complete`, { duration });
        res.writeHead(statusCode, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`Competitive Intel error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'COMPETITIVE_INTEL_ERROR', message: error.message },
        requestId
      }));
      return;
    }
  }

  // Try dynamic Content Council routes
  if (url.pathname.startsWith('/api/content-council/')) {
    try {
      const result = await handleContentCouncilRoute(req, req.method, url.pathname);
      if (result) {
        const duration = Date.now() - startTime;
        const statusCode = result._status || 200;
        delete result._status;
        recordRequest(routeKey, duration, statusCode < 400);
        reqLogger.debug(`Content Council route complete`, { duration });
        res.writeHead(statusCode, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`Content Council error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'CONTENT_COUNCIL_ERROR', message: error.message },
        requestId
      }));
      return;
    }
  }

  // Try dynamic Citation routes
  if (url.pathname.startsWith('/api/citations/')) {
    try {
      const result = await handleCitationRoute(req, req.method, url.pathname);
      if (result) {
        const duration = Date.now() - startTime;
        const statusCode = result._status || 200;
        delete result._status;
        recordRequest(routeKey, duration, statusCode < 400);
        reqLogger.debug(`Citation route complete`, { duration });
        res.writeHead(statusCode, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`Citation error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'CITATION_ERROR', message: error.message },
        requestId
      }));
      return;
    }
  }

  // Try dynamic Context routes
  if (url.pathname.startsWith('/api/context/')) {
    try {
      const result = await handleContextRoute(req, req.method, url.pathname);
      if (result) {
        const duration = Date.now() - startTime;
        const statusCode = result._status || 200;
        delete result._status;
        recordRequest(routeKey, duration, statusCode < 400);
        reqLogger.debug(`Context route complete`, { duration });
        res.writeHead(statusCode, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`Context error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'CONTEXT_ERROR', message: error.message },
        requestId
      }));
      return;
    }
  }

  // Try S2P Command Center routes
  if (url.pathname.startsWith('/api/s2p/')) {
    try {
      const result = await handleS2PRoute(req, req.method, url.pathname);
      if (result) {
        const duration = Date.now() - startTime;
        const statusCode = result._status || 200;
        delete result._status;
        recordRequest(routeKey, duration, statusCode < 400);
        reqLogger.debug(`S2P route complete`, { duration });
        res.writeHead(statusCode, CORS_HEADERS);
        res.end(JSON.stringify({ ...result, requestId }));
        return;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordRequest(routeKey, duration, false);
      reqLogger.error(`S2P error: ${error.message}`, { duration });
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({
        error: { code: 'S2P_ERROR', message: error.message },
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

  // Start observability alert checker (check every 60 seconds)
  startAlertChecker(60000);

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
  console.log(`  POST /api/portal/:client/move      - Move item between stages`);
  console.log(`  --- LLM Council API ---`);
  console.log(`  POST /api/llm-council              - Run multi-model deliberation`);
  console.log(`  GET  /api/llm-council/models       - List available models`);
  console.log(`  --- Competitive Intelligence API ---`);
  console.log(`  POST /api/competitive-intel/run    - Generate battlecard`);
  console.log(`  GET  /api/competitive-intel/:id    - Get battlecard`);
  console.log(`  GET  /api/competitive-intel        - List all battlecards`);
  console.log(`  --- Content Council API ---`);
  console.log(`  POST /api/content-council/run      - Generate content sprint`);
  console.log(`  GET  /api/content-council/:id      - Get content sprint`);
  console.log(`  GET  /api/content-council/:id/heygen - Get HeyGen payload`);
  console.log(`  POST /api/content-council/:id/heygen/generate - Generate video`);
  console.log(`  GET  /api/content-council          - List all sprints`);
  console.log(`  --- Citation Verification API ---`);
  console.log(`  POST /api/citations/verify         - Verify a citation`);
  console.log(`  GET  /api/citations/battlecard/:id - Get battlecard citations`);
  console.log(`  POST /api/citations/quality        - Calculate citation quality`);
  console.log(`  --- Observability API ---`);
  console.log(`  GET  /api/observability/prometheus - Prometheus metrics (scrape)`);
  console.log(`  GET  /api/observability/metrics    - JSON metrics`);
  console.log(`  GET  /api/observability/traces     - Distributed traces`);
  console.log(`  GET  /api/observability/alerts     - Alert status`);
  console.log(`  GET  /api/observability/dashboard  - Full dashboard data\n`);
  console.log(`Mode: ${IS_DEV ? 'Development (no auth required)' : 'Production (API key required)'}`);
  console.log(`Logging: Structured JSON in production, human-readable in dev\n`);
});

export default server;
