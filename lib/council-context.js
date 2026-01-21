/**
 * Council Context Injection System
 *
 * Automatically loads and formats business unit data to ground LLM Council
 * queries in real data, preventing hallucination.
 *
 * Usage:
 *   import { buildContext, injectContext } from './lib/council-context.js';
 *   const context = await buildContext('s2p');
 *   const groundedQuery = injectContext(userQuery, context);
 *
 * @module lib/council-context
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const logger = createLogger({ module: 'council-context' });

// File paths for business unit data
const PATHS = {
  portfolio: join(ROOT, 'config', 'portfolio.json'),
  clientsDir: join(ROOT, 'clients'),
  memoryDir: join(ROOT, 'memory')
};

/**
 * Load JSON file safely
 * @param {string} filepath
 * @returns {Object|null}
 */
function loadJson(filepath) {
  try {
    if (existsSync(filepath)) {
      return JSON.parse(readFileSync(filepath, 'utf8'));
    }
  } catch (e) {
    logger.warn(`Failed to load ${filepath}`, { error: e.message });
  }
  return null;
}

/**
 * Get business unit from portfolio
 * @param {string} businessId
 * @returns {Object|null}
 */
function getBusinessUnit(businessId) {
  const portfolio = loadJson(PATHS.portfolio);
  if (!portfolio?.businessUnits) return null;
  return portfolio.businessUnits.find(u => u.id === businessId) || null;
}

/**
 * Load all data for a business unit
 * @param {string} businessId
 * @returns {Object}
 */
export async function loadBusinessData(businessId) {
  const clientDir = join(PATHS.clientsDir, businessId);

  const data = {
    businessId,
    portfolio: getBusinessUnit(businessId),
    config: loadJson(join(clientDir, 'config.json')),
    gst: loadJson(join(clientDir, 'gst.json')),
    brand: loadJson(join(clientDir, 'brand.json')),
    // Additional context sources
    limitless: loadJson(join(PATHS.memoryDir, 'limitless_context.json')),
    recentActivity: loadRecentActivity(businessId)
  };

  // Extract business-specific limitless intelligence
  if (data.limitless) {
    const keyMap = {
      's2p': 'Scan2Plan',
      'studio': 'StudioC',
      'bigmuddy': 'BigMuddy',
      'cptv': 'CPTV',
      'tuthill': 'Tuthill',
      'utopia': 'Utopia'
    };
    const key = keyMap[businessId] || businessId;
    data.businessIntelligence = {
      clientData: data.limitless.clientIntelligence?.[key] || null,
      decisions: data.limitless.executiveDecisions?.[key] || [],
      friction: (data.limitless.frictionLog || []).filter(f =>
        f.area?.toLowerCase().includes(businessId) ||
        f.area?.toLowerCase().includes(data.config?.name?.toLowerCase() || '')
      )
    };
  }

  return data;
}

/**
 * Load recent activity/audit entries for a business
 * @param {string} businessId
 * @returns {Array}
 */
function loadRecentActivity(businessId) {
  const auditPath = join(ROOT, 'cache', 'audit.jsonl');
  if (!existsSync(auditPath)) return [];

  try {
    const lines = readFileSync(auditPath, 'utf8').trim().split('\n');
    return lines
      .slice(-50) // Last 50 entries
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(entry => entry && (
        entry.business === businessId ||
        entry.project?.toLowerCase().includes(businessId)
      ))
      .slice(-10); // Keep last 10 relevant
  } catch {
    return [];
  }
}

/**
 * Build formatted context string for a business unit
 * @param {string} businessId
 * @param {Object} options
 * @returns {Promise<Object>} Context object with formatted sections
 */
export async function buildContext(businessId, options = {}) {
  const {
    includeGST = true,
    includePricing = true,
    includeBrand = true,
    includeIntelligence = true,
    maxLength = 4000
  } = options;

  logger.info('Building context', { businessId, options });

  const data = await loadBusinessData(businessId);

  if (!data.config && !data.portfolio) {
    logger.warn('No data found for business', { businessId });
    return {
      businessId,
      found: false,
      context: `WARNING: No data found for business "${businessId}". Results may be unreliable.`,
      sections: {}
    };
  }

  const sections = {};

  // === BASIC PROFILE ===
  sections.profile = formatProfile(data);

  // === BUSINESS MODEL & PRICING ===
  if (includePricing && data.config) {
    sections.businessModel = formatBusinessModel(data.config);
    if (data.config.pricingEngine) {
      sections.pricing = formatPricing(data.config);
    }
    if (data.config.offerings) {
      sections.offerings = formatOfferings(data.config.offerings);
    }
  }

  // === GOALS, STRATEGIES, TACTICS ===
  if (includeGST && data.gst) {
    sections.goals = formatGST(data.gst);
  }

  // === BRAND VOICE ===
  if (includeBrand && data.brand) {
    sections.brand = formatBrand(data.brand);
  }

  // === BUSINESS INTELLIGENCE ===
  if (includeIntelligence && data.businessIntelligence) {
    sections.intelligence = formatIntelligence(data.businessIntelligence);
  }

  // Combine all sections
  let context = Object.entries(sections)
    .filter(([_, content]) => content)
    .map(([name, content]) => content)
    .join('\n\n');

  // Truncate if too long
  if (context.length > maxLength) {
    context = context.substring(0, maxLength) + '\n[...context truncated]';
  }

  return {
    businessId,
    found: true,
    context,
    sections,
    dataLoaded: {
      config: !!data.config,
      gst: !!data.gst,
      brand: !!data.brand,
      intelligence: !!data.businessIntelligence?.clientData
    }
  };
}

/**
 * Format profile section
 */
function formatProfile(data) {
  const config = data.config || {};
  const portfolio = data.portfolio || {};

  return `=== BUSINESS PROFILE ===
Name: ${config.name || portfolio.name || data.businessId}
Type: ${config.businessType || portfolio.type || 'Unknown'}
Description: ${portfolio.description || config.valueProposition || 'N/A'}
Location: ${config.location ? `${config.location.city}, ${config.location.state}` : 'N/A'}
Service Area: ${config.location?.serviceArea?.join(', ') || 'N/A'}`;
}

/**
 * Format business model section
 */
function formatBusinessModel(config) {
  if (!config.revenueModel && !config.targetMarket) return null;

  return `=== BUSINESS MODEL ===
Revenue Model: ${config.revenueModel || 'Not specified'}
Target Market: ${config.targetMarket || 'Not specified'}
Value Proposition: ${config.valueProposition || 'Not specified'}`;
}

/**
 * Format pricing section
 */
function formatPricing(config) {
  const pe = config.pricingEngine;
  if (!pe) return null;

  const rates = pe.baseRates ?
    Object.entries(pe.baseRates)
      .map(([k, v]) => `${k}: $${v}/sqft`)
      .join(', ') : 'See pricing engine';

  return `=== PRICING (ACTUAL - DO NOT INVENT) ===
Minimum Project: $${pe.minimumProject || 'N/A'}
Margin Floor: ${pe.marginFloor ? (pe.marginFloor * 100) + '%' : 'N/A'}
Base Rates: ${rates}
LOD Multipliers: ${pe.lodMultipliers ? Object.entries(pe.lodMultipliers).map(([k,v]) => `LOD ${k}=${v}x`).join(', ') : 'N/A'}
Travel: $${pe.travelRate || 3}/mile, scan day fee $${pe.scanDayFee || 300} at ${pe.scanDayThreshold || 75}+ miles
Source: ${pe.source || 'config.json'}

CRITICAL: Use these actual rates. Do NOT invent pricing tiers or packages.`;
}

/**
 * Format offerings section
 */
function formatOfferings(offerings) {
  if (!offerings?.length) return null;

  const list = offerings.map(o =>
    `- ${o.name}: ${o.description}${o.pricingNotes ? ` (${o.pricingNotes})` : ''}`
  ).join('\n');

  return `=== OFFERINGS ===
${list}`;
}

/**
 * Format GST section
 */
function formatGST(gst) {
  const parts = ['=== GOALS, STRATEGIES, TACTICS ==='];

  if (gst.goals?.length) {
    parts.push('\nGOALS:');
    for (const goal of gst.goals) {
      const progress = goal.target ?
        Math.round((goal.current / goal.target) * 100) : 0;
      parts.push(`- ${goal.title}`);
      parts.push(`  Metric: ${goal.metric}, Target: ${goal.target}, Current: ${goal.current} (${progress}%)`);
      parts.push(`  Deadline: ${goal.deadline || 'None'}, Status: ${goal.status}`);
    }
  }

  if (gst.strategies?.length) {
    parts.push('\nACTIVE STRATEGIES:');
    for (const strat of gst.strategies.filter(s => s.status === 'active')) {
      parts.push(`- ${strat.title}: ${strat.description || strat.approach}`);
    }
  }

  if (gst.tactics?.length) {
    const pending = gst.tactics.filter(t => t.status === 'pending');
    if (pending.length) {
      parts.push(`\nPENDING TACTICS: ${pending.length} items`);
      for (const tactic of pending.slice(0, 3)) {
        parts.push(`- ${tactic.title} (${tactic.channel}, due: ${tactic.scheduledFor || 'TBD'})`);
      }
    }
  }

  return parts.join('\n');
}

/**
 * Format brand section
 */
function formatBrand(brand) {
  if (!brand?.voice) return null;

  const vocab = brand.voice.vocabulary;
  const include = vocab?.include?.slice(0, 10).join(', ') || 'N/A';
  const avoid = vocab?.avoid?.slice(0, 5).join(', ') || 'N/A';

  return `=== BRAND VOICE ===
Tone: ${brand.voice.tone || 'professional'}
Use these terms: ${include}
Avoid: ${avoid}`;
}

/**
 * Format intelligence section
 */
function formatIntelligence(intel) {
  if (!intel) return null;

  const parts = ['=== BUSINESS INTELLIGENCE ==='];

  if (intel.clientData?.preferences?.length) {
    parts.push(`Preferences: ${intel.clientData.preferences.join('; ')}`);
  }

  if (intel.decisions?.length) {
    parts.push(`Recent Decisions: ${intel.decisions.slice(0, 3).join('; ')}`);
  }

  if (intel.friction?.length) {
    parts.push(`Current Friction: ${intel.friction.map(f => f.symptom || f.area).join('; ')}`);
  }

  return parts.length > 1 ? parts.join('\n') : null;
}

/**
 * Inject context into a query
 * @param {string} query - User's original query
 * @param {Object} context - Context object from buildContext()
 * @returns {string} Query with injected context
 */
export function injectContext(query, context) {
  if (!context?.found || !context.context) {
    return query;
  }

  return `${context.context}

---

QUERY: ${query}

INSTRUCTIONS:
- Base your analysis on the ACTUAL data provided above
- Do NOT invent pricing, metrics, or business details not shown
- If data is missing, say "this information was not provided" rather than guessing
- Reference specific numbers from the context when making recommendations`;
}

/**
 * Build context for multiple business units
 * @param {string[]} businessIds
 * @returns {Promise<Object>}
 */
export async function buildMultiContext(businessIds, options = {}) {
  const contexts = await Promise.all(
    businessIds.map(id => buildContext(id, options))
  );

  const combined = contexts
    .filter(c => c.found)
    .map(c => `\n### ${c.businessId.toUpperCase()} ###\n${c.context}`)
    .join('\n\n');

  return {
    businessIds,
    found: contexts.filter(c => c.found).length,
    context: combined,
    individual: contexts
  };
}

/**
 * Extract business mentions from query
 * @param {string} query
 * @returns {string[]}
 */
export function extractBusinessMentions(query) {
  const mentions = [];
  const patterns = [
    /@(s2p|studio|cptv|tuthill|bigmuddy|utopia)\b/gi,
    /\b(scan2plan|scan 2 plan)\b/gi,
    /\b(studio c|studioc)\b/gi,
    /\b(big muddy|bigmuddy)\b/gi,
    /\b(chase pierson tv|cptv)\b/gi,
    /\b(tuthill design|tuthill)\b/gi,
    /\b(utopia studios|utopia)\b/gi
  ];

  const idMap = {
    'scan2plan': 's2p',
    'scan 2 plan': 's2p',
    'studio c': 'studio',
    'studioc': 'studio',
    'big muddy': 'bigmuddy',
    'chase pierson tv': 'cptv',
    'tuthill design': 'tuthill',
    'utopia studios': 'utopia'
  };

  for (const pattern of patterns) {
    const matches = query.match(pattern);
    if (matches) {
      for (const match of matches) {
        const clean = match.replace('@', '').toLowerCase();
        const id = idMap[clean] || clean;
        if (!mentions.includes(id)) {
          mentions.push(id);
        }
      }
    }
  }

  return mentions;
}

/**
 * Auto-inject context based on query mentions
 * @param {string} query
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function autoInjectContext(query, options = {}) {
  const mentions = extractBusinessMentions(query);

  if (mentions.length === 0) {
    logger.debug('No business mentions found in query');
    return {
      query,
      injected: false,
      businessIds: []
    };
  }

  logger.info('Auto-injecting context', { mentions });

  const context = mentions.length === 1
    ? await buildContext(mentions[0], options)
    : await buildMultiContext(mentions, options);

  const groundedQuery = injectContext(query, context);

  return {
    query: groundedQuery,
    originalQuery: query,
    injected: true,
    businessIds: mentions,
    context
  };
}

/**
 * Get list of all onboarded business units
 * @returns {Array}
 */
export function getOnboardedBusinesses() {
  const portfolio = loadJson(PATHS.portfolio);
  if (!portfolio?.businessUnits) return [];

  return portfolio.businessUnits.map(u => ({
    id: u.id,
    name: u.name,
    type: u.type,
    active: u.active,
    hasConfig: existsSync(join(PATHS.clientsDir, u.id, 'config.json')),
    hasGST: existsSync(join(PATHS.clientsDir, u.id, 'gst.json')),
    hasBrand: existsSync(join(PATHS.clientsDir, u.id, 'brand.json'))
  }));
}

/**
 * Validate business unit has minimum required data
 * @param {string} businessId
 * @returns {Object}
 */
export async function validateBusinessData(businessId) {
  const data = await loadBusinessData(businessId);

  const issues = [];

  if (!data.config) {
    issues.push('Missing config.json');
  } else {
    if (!data.config.revenueModel) issues.push('Missing revenue model');
    if (!data.config.targetMarket) issues.push('Missing target market');
    if (!data.config.valueProposition) issues.push('Missing value proposition');
    if (!data.config.offerings?.length) issues.push('Missing offerings');
  }

  if (!data.gst) {
    issues.push('Missing gst.json');
  } else {
    if (!data.gst.goals?.length) issues.push('No goals defined');
  }

  return {
    businessId,
    valid: issues.length === 0,
    issues,
    completeness: {
      profile: !!data.portfolio,
      config: !!data.config,
      gst: !!data.gst,
      brand: !!data.brand,
      pricing: !!data.config?.pricingEngine
    }
  };
}

export default {
  loadBusinessData,
  buildContext,
  buildMultiContext,
  injectContext,
  autoInjectContext,
  extractBusinessMentions,
  getOnboardedBusinesses,
  validateBusinessData
};
