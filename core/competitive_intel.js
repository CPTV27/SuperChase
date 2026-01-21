#!/usr/bin/env node
/**
 * Competitive Intelligence - Level 3 Council
 *
 * 360-degree Competitive & Industrial Offensive
 * Three-agent system: Librarian (Intel), Auditor (Reality Check), Architect (Strategy)
 *
 * @module core/competitive_intel
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createLogger } from '../lib/logger.js';
import { ExternalServiceError, ValidationError, withRetry } from '../lib/errors.js';
import councilContext from '../lib/council-context.js';
import {
  getCitationPromptRequirements,
  extractCitations,
  calculateCitationQuality,
  createCitationTrace,
  CITATION_TYPES
} from '../lib/citations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const logger = createLogger({ module: 'competitive-intel' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const OUTPUT_DIR = join(__dirname, '..', 'memory', 'battlecards');
const CLIENTS_DIR = join(__dirname, '..', 'clients');
const PORTFOLIO_PATH = join(__dirname, '..', 'config', 'portfolio.json');

// Agent models
const LIBRARIAN_MODEL = 'openai/gpt-4o';  // Best for web research synthesis
const AUDITOR_MODEL = 'anthropic/claude-3.5-sonnet';  // Best for constraint analysis
const ARCHITECT_MODEL = 'anthropic/claude-3.5-sonnet';  // Best for strategy

// Depth configurations
const DEPTH_CONFIG = {
  quick: { competitors: 3, keywords: 5, targets: 0, contentWeeks: 0 },
  standard: { competitors: 3, keywords: 20, targets: 25, contentWeeks: 2 },
  deep: { competitors: 5, keywords: 40, targets: 100, contentWeeks: 4 }
};

/**
 * Generate trace ID
 */
function generateTraceId() {
  return `intel-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Query model via OpenRouter
 */
async function queryModel(model, messages, options = {}) {
  const { temperature = 0.7 } = options;

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://superchase.app',
      'X-Title': 'SuperChase Competitive Intel'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ExternalServiceError('OpenRouter', `${model} query failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

const queryModelWithRetry = withRetry(queryModel, { maxRetries: 2, baseDelayMs: 1000 });

/**
 * Web search via brave/serper (simulated via OpenRouter for now)
 * In production, integrate SerpApi or Brave Search API
 */
async function webSearch(query) {
  logger.info('Web search', { query: query.slice(0, 50) });

  // For now, use OpenRouter with a search-capable model
  // In production: integrate SerpApi, Brave, or Google Custom Search
  const searchPrompt = `You are a web research assistant. Search for: "${query}"

Return JSON with:
{
  "results": [
    {"title": "...", "url": "...", "snippet": "..."}
  ],
  "relatedSearches": ["..."]
}

Base your response on your training data about real companies, websites, and market information.
Be specific and accurate. If you don't know, say so.`;

  try {
    const response = await queryModelWithRetry(LIBRARIAN_MODEL, [
      { role: 'system', content: 'You are a market research assistant with deep knowledge of industries and competitors.' },
      { role: 'user', content: searchPrompt }
    ], { temperature: 0.3 });

    return JSON.parse(response);
  } catch (e) {
    logger.warn('Web search parse failed', { error: e.message });
    return { results: [], relatedSearches: [] };
  }
}

/**
 * Fetch and parse sitemap
 */
async function fetchSitemap(domain) {
  logger.info('Fetching sitemap', { domain });

  const sitemapUrl = `https://${domain}/sitemap.xml`;

  try {
    const response = await fetch(sitemapUrl, {
      headers: { 'User-Agent': 'SuperChase-Intel/1.0' },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return { found: false, totalPages: 0, categories: {} };
    }

    const xml = await response.text();

    // Parse sitemap XML
    const urls = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
    const parsedUrls = urls.map(u => u.replace(/<\/?loc>/g, ''));

    // Categorize by path
    const categories = {
      blog: 0,
      products: 0,
      services: 0,
      caseStudies: 0,
      about: 0,
      other: 0
    };

    for (const url of parsedUrls) {
      const path = url.toLowerCase();
      if (path.includes('/blog') || path.includes('/post') || path.includes('/article')) {
        categories.blog++;
      } else if (path.includes('/product') || path.includes('/solution')) {
        categories.products++;
      } else if (path.includes('/service') || path.includes('/offering')) {
        categories.services++;
      } else if (path.includes('/case') || path.includes('/success') || path.includes('/customer')) {
        categories.caseStudies++;
      } else if (path.includes('/about') || path.includes('/team') || path.includes('/company')) {
        categories.about++;
      } else {
        categories.other++;
      }
    }

    return {
      found: true,
      totalPages: parsedUrls.length,
      categories,
      sampleUrls: parsedUrls.slice(0, 10)
    };
  } catch (e) {
    logger.warn('Sitemap fetch failed', { domain, error: e.message });
    return { found: false, totalPages: 0, categories: {}, error: e.message };
  }
}

/**
 * Load business unit config and constraints
 */
function loadBusinessConfig(businessId) {
  const configPath = join(CLIENTS_DIR, businessId, 'config.json');
  const gstPath = join(CLIENTS_DIR, businessId, 'gst.json');

  let config = {};
  let gst = {};

  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    logger.warn('Config not found', { businessId });
  }

  try {
    gst = JSON.parse(fs.readFileSync(gstPath, 'utf8'));
  } catch (e) {
    logger.warn('GST not found', { businessId });
  }

  // Load portfolio for constraints
  let portfolio = { businessUnits: [] };
  try {
    portfolio = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf8'));
  } catch (e) {}

  const unit = portfolio.businessUnits?.find(u => u.id === businessId) || {};

  return {
    ...config,
    gst,
    constraints: unit.constraints || {
      monthlyAdBudget: 1000,
      contentCapacity: 2,
      outreachCapacity: 25,
      serviceArea: ['US']
    },
    metadata: unit.metadata || {}
  };
}

/**
 * Agent 1: Intelligence Librarian
 * External research and competitor analysis
 */
async function runLibrarian(businessId, config, depth) {
  logger.info('Agent 1: Librarian starting', { businessId, depth });
  const startTime = Date.now();

  const depthConfig = DEPTH_CONFIG[depth];
  const industry = config.metadata?.industry || config.businessType || 'technology';
  const region = config.location?.region || config.location?.state || 'US';
  const businessName = config.name || businessId;

  // Build research prompt with citation requirements
  const citationRequirements = getCitationPromptRequirements('librarian');

  const researchPrompt = `You are the Chief Intelligence Officer conducting competitive analysis for ${businessName}.

**BUSINESS CONTEXT:**
- Industry: ${industry}
- Region: ${region}
- Target Market: ${config.targetMarket || 'B2B professionals'}
- Current Offerings: ${JSON.stringify(config.offerings?.map(o => o.name) || [])}
- Known Competitors: ${JSON.stringify(config.seo?.competitors || [])}

${citationRequirements}

**YOUR MISSION:**
Conduct a 360-degree competitive analysis. Return JSON with:

{
  "competitors": [
    {
      "name": "Company Name",
      "website": "example.com",
      "position": "market leader/challenger/niche",
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1", "weakness2"],
      "estimatedSize": "startup/smb/enterprise",
      "pricingModel": "subscription/project/hybrid",
      "targetAudience": "who they serve",
      "sourceUrl": "URL where you found this info",
      "confidence": 0.9
    }
  ],
  "keywordOpportunities": [
    {
      "keyword": "keyword phrase",
      "searchIntent": "informational/transactional/navigational",
      "competitionLevel": "low/medium/high",
      "estimatedVolume": "low/medium/high",
      "competitorCoverage": "none/partial/saturated",
      "sourceUrl": "URL or reasoning source",
      "confidence": 0.8
    }
  ],
  "contentGaps": [
    {
      "topic": "topic area",
      "reason": "why competitors miss this",
      "opportunity": "how to capitalize",
      "sourceUrl": "evidence URL"
    }
  ],
  "leadSources": [
    {
      "source": "source name",
      "type": "directory/linkedin/conference/other",
      "quality": "high/medium/low",
      "accessMethod": "how to access",
      "sourceUrl": "direct link to source"
    }
  ],
  "peopleAlsoAsk": [
    "question 1",
    "question 2"
  ],
  "sources": [
    {
      "id": 1,
      "text": "Key quote or data point",
      "url": "https://source-url.com",
      "type": "webpage",
      "confidence": 0.9
    }
  ]
}

Find ${depthConfig.competitors} competitors and ${depthConfig.keywords} keyword opportunities.
Be specific and actionable. Base on real market knowledge.
EVERY claim must have a source URL or be marked with low confidence.`;

  try {
    const response = await queryModelWithRetry(LIBRARIAN_MODEL, [
      { role: 'system', content: 'You are a competitive intelligence expert with deep market research skills. Return only valid JSON.' },
      { role: 'user', content: researchPrompt }
    ], { temperature: 0.4 });

    let data;
    try {
      data = JSON.parse(response);
    } catch (e) {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      data = jsonMatch ? JSON.parse(jsonMatch[0]) : { competitors: [], keywordOpportunities: [] };
    }

    // Enrich with sitemap data and add as citations
    const sitemapCitations = [];
    for (const competitor of (data.competitors || []).slice(0, 3)) {
      if (competitor.website) {
        competitor.sitemap = await fetchSitemap(competitor.website);
        if (competitor.sitemap?.found) {
          sitemapCitations.push({
            text: `${competitor.name} sitemap: ${competitor.sitemap.totalPages} pages indexed`,
            url: `https://${competitor.website}/sitemap.xml`,
            type: CITATION_TYPES.SITEMAP,
            confidence: 0.95,
            metadata: {
              totalPages: competitor.sitemap.totalPages,
              crawledAt: new Date().toISOString()
            }
          });
        }
      }
    }

    // Extract citations from response
    const responseCitations = extractCitations(data);
    const allCitations = [...responseCitations, ...sitemapCitations];
    const citationQuality = calculateCitationQuality(allCitations);

    const timing = Date.now() - startTime;
    logger.info('Librarian complete', {
      timing,
      competitors: data.competitors?.length,
      citations: allCitations.length,
      citationGrade: citationQuality.grade
    });

    return {
      ...data,
      citations: allCitations,
      citationQuality,
      timing,
      model: LIBRARIAN_MODEL
    };
  } catch (e) {
    logger.error('Librarian failed', { error: e.message });
    return {
      competitors: [],
      keywordOpportunities: [],
      contentGaps: [],
      leadSources: [],
      error: e.message,
      timing: Date.now() - startTime
    };
  }
}

/**
 * Agent 2: Audit Analyst
 * Constraint mapping and feasibility analysis
 */
async function runAuditor(businessId, config, librarianResults, depth) {
  logger.info('Agent 2: Auditor starting', { businessId });
  const startTime = Date.now();

  const constraints = config.constraints || {};

  const auditPrompt = `You are the Risk & Feasibility Analyst reviewing competitive intelligence.

**BUSINESS CONSTRAINTS:**
- Monthly Ad Budget: $${constraints.monthlyAdBudget || 1000}
- Content Capacity: ${constraints.contentCapacity || 2} posts/week
- Outreach Capacity: ${constraints.outreachCapacity || 25} contacts/week
- Service Area: ${JSON.stringify(constraints.serviceArea || ['US'])}
- Team Size: ${config.contacts?.operations?.length || 1}

**LIBRARIAN INTELLIGENCE:**
${JSON.stringify(librarianResults, null, 2)}

**YOUR MISSION:**
Apply traffic light classification and identify Blue Ocean opportunities.

Return JSON:
{
  "keywords": {
    "red": [
      {"keyword": "...", "reason": "why to avoid", "competitorSpend": "estimated"}
    ],
    "yellow": [
      {"keyword": "...", "reason": "proceed with caution", "risk": "..."}
    ],
    "green": [
      {"keyword": "...", "reason": "opportunity", "action": "recommended action"}
    ],
    "blueOcean": [
      {"keyword": "...", "reason": "untapped niche", "approach": "how to own it"}
    ]
  },
  "competitorFeasibility": [
    {
      "competitor": "name",
      "threatLevel": "high/medium/low",
      "vulnerabilities": ["...", "..."],
      "doNotCompete": ["areas to avoid"]
    }
  ],
  "leadSourceVerification": [
    {
      "source": "name",
      "verified": true/false,
      "quality": "high/medium/low",
      "recommendation": "use/skip/research more"
    }
  ],
  "budgetRecommendation": {
    "adSpend": {"recommended": 500, "allocation": {"search": 300, "social": 200}},
    "contentInvestment": "high/medium/low priority",
    "outreachPriority": "high/medium/low"
  },
  "warnings": ["critical warnings"],
  "opportunities": ["key opportunities within constraints"]
}

Be realistic about constraints. Flag anything that exceeds budget or capacity as Red.`;

  try {
    const response = await queryModelWithRetry(AUDITOR_MODEL, [
      { role: 'system', content: 'You are a risk analyst. Be conservative and realistic. Return only valid JSON.' },
      { role: 'user', content: auditPrompt }
    ], { temperature: 0.3 });

    let data;
    try {
      data = JSON.parse(response);
    } catch (e) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      data = jsonMatch ? JSON.parse(jsonMatch[0]) : { keywords: {}, warnings: [] };
    }

    const timing = Date.now() - startTime;
    logger.info('Auditor complete', { timing });

    return {
      ...data,
      timing,
      model: AUDITOR_MODEL
    };
  } catch (e) {
    logger.error('Auditor failed', { error: e.message });
    return {
      keywords: { red: [], yellow: [], green: [], blueOcean: [] },
      warnings: [e.message],
      timing: Date.now() - startTime
    };
  }
}

/**
 * Agent 3: Hormozi Architect
 * Strategy and action plan generation
 */
async function runArchitect(businessId, config, librarianResults, auditorResults, depth) {
  logger.info('Agent 3: Architect starting', { businessId });
  const startTime = Date.now();

  const depthConfig = DEPTH_CONFIG[depth];

  const architectPrompt = `You are the Strategy Architect using Alex Hormozi's frameworks.

**BUSINESS:**
- Name: ${config.name || businessId}
- Value Proposition: ${config.valueProposition || 'Not defined'}
- Target Market: ${config.targetMarket || 'B2B professionals'}
- Offerings: ${JSON.stringify(config.offerings?.map(o => ({ name: o.name, price: o.pricingNotes })) || [])}

**INTELLIGENCE (from Librarian):**
${JSON.stringify(librarianResults.competitors?.slice(0, 3), null, 2)}

**KEYWORD OPPORTUNITIES (Green/Blue Ocean from Auditor):**
${JSON.stringify([...(auditorResults.keywords?.green || []), ...(auditorResults.keywords?.blueOcean || [])], null, 2)}

**LEAD SOURCES:**
${JSON.stringify(librarianResults.leadSources, null, 2)}

**YOUR MISSION:**
Create an actionable battle plan.

Return JSON:
{
  "grandSlamOffer": {
    "headline": "compelling headline",
    "targetPainPoint": "specific pain from competitor weaknesses",
    "dreamOutcome": "what customer gets",
    "timeframe": "how fast",
    "effort": "how easy",
    "riskReversal": "guarantee or proof",
    "bonuses": ["bonus 1", "bonus 2"],
    "priceAnchor": "compared to X at $Y, you get..."
  },
  "outreachTargets": {
    "criteria": ["criterion 1", "criterion 2"],
    "topTier": [
      {"company": "name", "signal": "why now", "approach": "how to reach", "priority": 1}
    ],
    "scripts": {
      "email": "email template with {{variables}}",
      "linkedin": "linkedin message template",
      "coldCall": "call script outline"
    }
  },
  "contentPlan": {
    "pillarTopic": "main topic to own",
    "weeks": [
      {
        "week": 1,
        "pillar": {"title": "...", "keyword": "...", "wordCount": 2000},
        "supporting": [
          {"title": "...", "keyword": "...", "wordCount": 800}
        ]
      }
    ]
  },
  "actionItems": [
    {
      "task": "specific actionable task",
      "priority": "high/medium/low",
      "category": "content/outreach/ads/product",
      "dueInDays": 7,
      "asanaReady": true
    }
  ]
}

Generate ${depthConfig.targets} outreach targets and ${depthConfig.contentWeeks} weeks of content.
Make every action item specific and immediately executable.`;

  try {
    const response = await queryModelWithRetry(ARCHITECT_MODEL, [
      { role: 'system', content: 'You are a growth strategist using Hormozi principles. Be specific and actionable. Return only valid JSON.' },
      { role: 'user', content: architectPrompt }
    ], { temperature: 0.5 });

    let data;
    try {
      data = JSON.parse(response);
    } catch (e) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      data = jsonMatch ? JSON.parse(jsonMatch[0]) : { actionItems: [] };
    }

    const timing = Date.now() - startTime;
    logger.info('Architect complete', { timing, actionItems: data.actionItems?.length });

    return {
      ...data,
      timing,
      model: ARCHITECT_MODEL
    };
  } catch (e) {
    logger.error('Architect failed', { error: e.message });
    return {
      grandSlamOffer: {},
      actionItems: [],
      error: e.message,
      timing: Date.now() - startTime
    };
  }
}

/**
 * Run full competitive intelligence analysis
 */
async function runCompetitiveIntel(businessId, options = {}) {
  const { depth = 'standard' } = options;

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'NEEDS_VALUE') {
    throw new ExternalServiceError('OpenRouter', 'API key not configured');
  }

  const traceId = generateTraceId();
  const startTime = Date.now();

  logger.info('Competitive Intel starting', { traceId, businessId, depth });

  // Load business config
  const config = loadBusinessConfig(businessId);
  if (!config.name && !config.businessType) {
    throw new ValidationError(`Business unit not found: ${businessId}`);
  }

  // Run agents sequentially
  const librarianResults = await runLibrarian(businessId, config, depth);
  const auditorResults = await runAuditor(businessId, config, librarianResults, depth);
  const architectResults = await runArchitect(businessId, config, librarianResults, auditorResults, depth);

  const totalDuration = Date.now() - startTime;

  // Compile battlecard
  const battlecard = {
    businessId,
    businessName: config.name || businessId,
    generatedAt: new Date().toISOString(),
    traceId,
    depth,
    duration: totalDuration,

    competitors: librarianResults.competitors || [],

    keywords: auditorResults.keywords || {},

    grandSlamOffer: architectResults.grandSlamOffer || {},

    outreachTargets: architectResults.outreachTargets || {},

    contentPlan: architectResults.contentPlan || {},

    actionItems: architectResults.actionItems || [],

    // Citation trace for verification
    citations: {
      sources: librarianResults.citations || [],
      quality: librarianResults.citationQuality || { score: 0, grade: 'F' },
      trace: createCitationTrace(traceId, librarianResults.citations || [])
    },

    analysis: {
      librarian: {
        model: LIBRARIAN_MODEL,
        timing: librarianResults.timing,
        keywordCount: librarianResults.keywordOpportunities?.length || 0,
        contentGaps: librarianResults.contentGaps || [],
        leadSources: librarianResults.leadSources || [],
        peopleAlsoAsk: librarianResults.peopleAlsoAsk || [],
        citationCount: librarianResults.citations?.length || 0,
        citationGrade: librarianResults.citationQuality?.grade || 'F'
      },
      auditor: {
        model: AUDITOR_MODEL,
        timing: auditorResults.timing,
        warnings: auditorResults.warnings || [],
        opportunities: auditorResults.opportunities || [],
        budgetRecommendation: auditorResults.budgetRecommendation || {}
      },
      architect: {
        model: ARCHITECT_MODEL,
        timing: architectResults.timing
      }
    }
  };

  // Save battlecard
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = join(OUTPUT_DIR, `${businessId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(battlecard, null, 2));
  logger.info('Battlecard saved', { outputPath });

  // Also save timestamped version
  const archivePath = join(OUTPUT_DIR, `${businessId}-${traceId}.json`);
  fs.writeFileSync(archivePath, JSON.stringify(battlecard, null, 2));

  return {
    success: true,
    traceId,
    businessId,
    duration: totalDuration,
    battlecard,
    outputPath
  };
}

/**
 * Get existing battlecard
 */
function getBattlecard(businessId) {
  const path = join(OUTPUT_DIR, `${businessId}.json`);

  if (!fs.existsSync(path)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

/**
 * List all battlecards
 */
function listBattlecards() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    return [];
  }

  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.json') && !f.includes('-intel-'));

  return files.map(f => {
    const data = JSON.parse(fs.readFileSync(join(OUTPUT_DIR, f), 'utf8'));
    return {
      businessId: data.businessId,
      businessName: data.businessName,
      generatedAt: data.generatedAt,
      competitorCount: data.competitors?.length || 0,
      actionItemCount: data.actionItems?.length || 0
    };
  });
}

/**
 * HTTP request handler
 */
async function handleCompetitiveIntelRequest(body) {
  const { businessId, depth = 'standard' } = body;

  if (!businessId) {
    throw new ValidationError('businessId is required');
  }

  if (!['quick', 'standard', 'deep'].includes(depth)) {
    throw new ValidationError('depth must be quick, standard, or deep');
  }

  return await runCompetitiveIntel(businessId, { depth });
}

// CLI support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'run') {
    const businessId = args[1];
    const depth = args[2] || 'standard';

    if (!businessId) {
      console.error('Usage: node competitive_intel.js run <businessId> [depth]');
      process.exit(1);
    }

    console.log(`\nRunning Competitive Intelligence for: ${businessId} (${depth})\n`);

    runCompetitiveIntel(businessId, { depth })
      .then(result => {
        console.log('\n=== BATTLECARD GENERATED ===\n');
        console.log('Trace ID:', result.traceId);
        console.log('Duration:', result.duration, 'ms');
        console.log('Competitors:', result.battlecard.competitors?.length || 0);
        console.log('Action Items:', result.battlecard.actionItems?.length || 0);
        console.log('\nSaved to:', result.outputPath);

        if (result.battlecard.grandSlamOffer?.headline) {
          console.log('\n--- GRAND SLAM OFFER ---');
          console.log(result.battlecard.grandSlamOffer.headline);
        }
      })
      .catch(error => {
        console.error('Failed:', error.message);
        process.exit(1);
      });

  } else if (command === 'list') {
    const cards = listBattlecards();
    console.log('\n=== BATTLECARDS ===\n');
    if (cards.length === 0) {
      console.log('No battlecards generated yet.');
    } else {
      cards.forEach(card => {
        console.log(`${card.businessId} (${card.businessName})`);
        console.log(`  Generated: ${card.generatedAt}`);
        console.log(`  Competitors: ${card.competitorCount}, Actions: ${card.actionItemCount}`);
        console.log();
      });
    }

  } else if (command === 'view') {
    const businessId = args[1];
    if (!businessId) {
      console.error('Usage: node competitive_intel.js view <businessId>');
      process.exit(1);
    }

    const card = getBattlecard(businessId);
    if (!card) {
      console.log(`No battlecard found for: ${businessId}`);
    } else {
      console.log(JSON.stringify(card, null, 2));
    }

  } else {
    console.log('Competitive Intelligence CLI\n');
    console.log('Usage:');
    console.log('  node competitive_intel.js run <businessId> [quick|standard|deep]');
    console.log('  node competitive_intel.js list');
    console.log('  node competitive_intel.js view <businessId>');
  }
}

export default {
  runCompetitiveIntel,
  handleCompetitiveIntelRequest,
  getBattlecard,
  listBattlecards
};

export {
  runCompetitiveIntel,
  handleCompetitiveIntelRequest,
  getBattlecard,
  listBattlecards
};
