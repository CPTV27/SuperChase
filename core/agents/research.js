/**
 * Research Agent
 *
 * Gathers context from multiple sources: brand.json, config.json, gst.json,
 * notebooks, and competitive intelligence. Synthesizes into actionable brief.
 *
 * @module core/agents/research
 */

import { createAgent } from './base.js';
import fs from 'fs/promises';
import { join } from 'path';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger({ module: 'agents:research' });
const CLIENTS_DIR = join(process.cwd(), 'clients');

/**
 * Safely read and parse a JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<object|null>} Parsed JSON or null if not found
 */
async function safeReadJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    // File not found or parse error - return null
    return null;
  }
}

/**
 * Load all context for a business unit (async)
 * @param {string} businessId - Business unit identifier
 * @returns {Promise<object>} Business context
 */
async function loadBusinessContext(businessId) {
  const businessDir = join(CLIENTS_DIR, businessId);

  // Load all files in parallel for better performance
  const [brand, config, gst, battlecard] = await Promise.all([
    safeReadJSON(join(businessDir, 'brand.json')),
    safeReadJSON(join(businessDir, 'config.json')),
    safeReadJSON(join(businessDir, 'gst.json')),
    safeReadJSON(join(process.cwd(), 'memory', 'battlecards', `${businessId}.json`)),
  ]);

  logger.debug('Business context loaded', {
    businessId,
    hasBrand: !!brand,
    hasConfig: !!config,
    hasGst: !!gst,
    hasBattlecard: !!battlecard,
  });

  return {
    businessId,
    brand,
    config,
    gst,
    battlecard,
  };
}

/**
 * Build the research prompt from context
 * @param {object} inputs - Agent inputs
 * @param {object} ctx - Business context
 * @returns {string} Formatted prompt
 */
function buildPrompt(inputs, ctx) {
  const { focus, customContext } = inputs;

  return `Analyze the following business context and create a research brief.

**BUSINESS: ${ctx.config?.name || ctx.businessId}**

**BRAND CONTEXT:**
${ctx.brand ? JSON.stringify({
  voice: ctx.brand.voice,
  colors: ctx.brand.colors,
  fonts: ctx.brand.fonts,
  stylePrompt: ctx.brand.stylePrompt,
}, null, 2) : 'Not available'}

**BUSINESS CONFIG:**
${ctx.config ? JSON.stringify({
  businessType: ctx.config.businessType,
  targetMarket: ctx.config.targetMarket,
  valueProposition: ctx.config.valueProposition,
  offerings: ctx.config.offerings?.map(o => o.name),
  seo: ctx.config.seo,
}, null, 2) : 'Not available'}

**GOALS & STRATEGIES:**
${ctx.gst ? JSON.stringify({
  goals: ctx.gst.goals?.map(g => ({ name: g.name, target: g.target, status: g.status })),
}, null, 2) : 'Not available'}

**COMPETITIVE INTEL:**
${ctx.battlecard ? JSON.stringify({
  grandSlamOffer: ctx.battlecard.grandSlamOffer,
  competitors: ctx.battlecard.competitors?.slice(0, 3).map(c => ({ name: c.name, weaknesses: c.weaknesses })),
  keywords: {
    green: ctx.battlecard.keywords?.green?.slice(0, 5),
    blueOcean: ctx.battlecard.keywords?.blueOcean?.slice(0, 3),
  },
}, null, 2) : 'Not available'}

${customContext ? `**ADDITIONAL CONTEXT:**\n${customContext}` : ''}

**FOCUS AREA:** ${focus || 'General overview'}

Return JSON:
{
  "businessSummary": "1-2 sentence description",
  "targetAudience": {
    "primary": "who they serve",
    "painPoints": ["pain 1", "pain 2", "pain 3"],
    "desires": ["desire 1", "desire 2"]
  },
  "brandVoice": {
    "tone": "descriptor",
    "personality": ["trait 1", "trait 2"],
    "vocabulary": ["word 1", "word 2", "word 3"]
  },
  "strategicPriorities": [
    {"priority": "...", "rationale": "..."}
  ],
  "competitiveAdvantages": ["advantage 1", "advantage 2"],
  "contentOpportunities": ["opportunity 1", "opportunity 2"],
  "keyMessages": ["message 1", "message 2", "message 3"],
  "warnings": ["any concerns or gaps"]
}`;
}

/**
 * Research Agent Definition
 *
 * Note: This agent uses a custom run function instead of createAgent's default
 * to support async context loading before prompt generation.
 */
export const researchAgent = {
  name: 'Research Agent',
  description: 'Gathers and synthesizes context from brand, config, GST, and competitive intel',

  async run(inputs, options = {}) {
    const { businessId } = inputs;
    const startTime = Date.now();

    if (!businessId) {
      throw new Error('Research agent requires businessId input');
    }

    // Load context asynchronously
    const ctx = await loadBusinessContext(businessId);

    // Build the prompt with loaded context
    const prompt = buildPrompt(inputs, ctx);

    // Use the base agent's LLM query
    const { queryLLMWithRetry, parseJSON } = await import('./base.js');

    const result = await queryLLMWithRetry({
      model: options.model || 'gpt-4o',
      system: `You are a research analyst gathering context for content and strategy work.
Your job is to synthesize information from multiple sources into a clear, actionable brief.
Be thorough but concise. Extract the most relevant insights.
Return only valid JSON.`,
      prompt,
      temperature: 0.3,
      json: true,
      traceId: options.traceId,
      operation: 'agent:research',
    });

    const output = parseJSON(result.content);
    const timing = Date.now() - startTime;

    return {
      ...output,
      _meta: {
        agent: 'research',
        model: result.model,
        tokens: result.tokens,
        cost: result.cost,
        timing,
        traceId: options.traceId,
        contextLoaded: {
          brand: !!ctx.brand,
          config: !!ctx.config,
          gst: !!ctx.gst,
          battlecard: !!ctx.battlecard,
        },
      },
    };
  },

  estimateCost(inputs) {
    // Estimate based on typical context size + output
    const inputTokens = 2000; // Context is usually ~2000 tokens
    const outputTokens = 500;
    // GPT-4o pricing: $2.50/1M input, $10/1M output
    return (inputTokens / 1_000_000) * 2.50 + (outputTokens / 1_000_000) * 10.00;
  },
};

export default researchAgent;
