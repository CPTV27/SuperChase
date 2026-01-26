#!/usr/bin/env node
/**
 * LLM Council - Multi-Model Deliberation Engine
 *
 * Based on karpathy/llm-council methodology:
 * - Stage 1: Parallel collection from multiple LLMs
 * - Stage 2: Anonymous peer review with blind ranking
 * - Stage 3: Chairman synthesis with weighted consideration
 *
 * Uses OpenRouter for unified access to diverse LLMs.
 *
 * @module core/llm_council
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createLogger, generateTraceId } from '../lib/logger.js';
import { ExternalServiceError, ValidationError, withRetry } from '../lib/errors.js';
import costController from '../lib/cost-controller.js';
import councilContext from '../lib/council-context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const logger = createLogger({ module: 'llm-council' });

// Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const DEFAULT_COUNCIL_MODELS = [
  'openai/gpt-4o',
  'anthropic/claude-3.5-sonnet',
  'google/gemini-2.0-flash-exp'
];

const DEFAULT_CHAIRMAN_MODEL = 'anthropic/claude-3.5-sonnet';
const DEFAULT_TEMPERATURE = 0.7;

const OUTPUT_DIR = join(__dirname, '..', 'memory', 'llm_council_outputs');

/**
 * Check if OpenRouter is configured
 * @returns {boolean}
 */
function isConfigured() {
  return !!OPENROUTER_API_KEY && OPENROUTER_API_KEY !== 'NEEDS_VALUE';
}

// Note: generateTraceId is imported from lib/logger.js for consistency

/**
 * Query a single model via OpenRouter
 * @param {string} model - Model identifier (e.g., 'openai/gpt-4o')
 * @param {string} query - The user query
 * @param {Object} options - Query options
 * @returns {Promise<{model: string, response: string, timing: number}>}
 */
async function queryModel(model, query, options = {}) {
  const { temperature = DEFAULT_TEMPERATURE, systemPrompt } = options;
  const startTime = Date.now();

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: query });

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://superchase.app',
      'X-Title': 'SuperChase LLM Council'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ExternalServiceError('OpenRouter', `${model} query failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const timing = Date.now() - startTime;

  // Extract token usage from response and record cost
  const usage = data.usage || {};
  const inputTokens = usage.prompt_tokens || costController.estimateTokens(query);
  const outputTokens = usage.completion_tokens || costController.estimateTokens(data.choices?.[0]?.message?.content || '');

  // Record the cost
  costController.recordCost({
    model,
    inputTokens,
    outputTokens,
    operation: 'council'
  });

  return {
    model,
    response: data.choices?.[0]?.message?.content || '',
    timing,
    tokens: { input: inputTokens, output: outputTokens }
  };
}

/**
 * Query model with retry logic
 */
const queryModelWithRetry = withRetry(queryModel, {
  maxRetries: 2,
  baseDelayMs: 1000,
  shouldRetry: (error) => {
    // Retry on 5xx errors or network issues
    return error.message?.includes('5') || error.message?.includes('network');
  }
});

/**
 * Stage 1: Parallel Collection
 * Query all models in parallel and collect responses
 *
 * @param {string} query - The user query
 * @param {string[]} models - List of model identifiers
 * @param {Object} options - Query options
 * @returns {Promise<Array<{model: string, response: string, timing: number}>>}
 */
async function stage1ParallelCollection(query, models, options = {}) {
  logger.info('Stage 1: Parallel Collection starting', { modelCount: models.length });

  const promises = models.map(model =>
    queryModelWithRetry(model, query, options)
      .catch(error => ({
        model,
        response: null,
        error: error.message,
        timing: 0
      }))
  );

  const results = await Promise.allSettled(promises);

  const collected = results.map(result =>
    result.status === 'fulfilled' ? result.value : result.reason
  );

  const successCount = collected.filter(r => r.response !== null).length;
  logger.info('Stage 1 complete', { successCount, failCount: models.length - successCount });

  return collected;
}

/**
 * Stage 2: Anonymous Peer Review
 * Each model reviews all responses anonymously and provides rankings
 *
 * @param {string} query - Original query
 * @param {Array} stage1Results - Results from Stage 1
 * @param {string[]} reviewerModels - Models to use for review (defaults to same as stage1)
 * @returns {Promise<{rankings: Object, aggregated: Array, labelToModel: Object}>}
 */
async function stage2AnonymousReview(query, stage1Results, reviewerModels = null) {
  logger.info('Stage 2: Anonymous Peer Review starting');

  // Filter successful responses
  const validResponses = stage1Results.filter(r => r.response !== null && r.response !== '');

  if (validResponses.length < 2) {
    throw new ValidationError('Insufficient responses for peer review (need at least 2)', {
      received: validResponses.length
    });
  }

  // Create anonymous labels (A, B, C, ...)
  const labels = 'ABCDEFGHIJ'.split('');
  const labelToModel = {};
  const modelToLabel = {};

  validResponses.forEach((result, idx) => {
    const label = labels[idx];
    labelToModel[label] = result.model;
    modelToLabel[result.model] = label;
  });

  // Build review prompt
  const responsesText = validResponses.map((result, idx) => {
    const label = labels[idx];
    return `**Response ${label}:**\n${result.response}\n`;
  }).join('\n---\n\n');

  const reviewPrompt = `You are evaluating responses to the following question:

**QUESTION:** ${query}

---

${responsesText}

---

**Your Task:**
Evaluate each response for:
1. Accuracy - Is the information correct?
2. Completeness - Does it fully address the question?
3. Clarity - Is it well-structured and easy to understand?
4. Usefulness - Would this be helpful to someone asking this question?

After your evaluation, you MUST provide your final ranking in this exact format on its own line:

FINAL RANKING: [Best, Second, Third, ...]

For example: FINAL RANKING: [B, A, C]

Provide your ranking from BEST to WORST. Include ALL responses in your ranking.`;

  // Use provided reviewers or default to stage1 models
  const reviewers = reviewerModels || DEFAULT_COUNCIL_MODELS.slice(0, 2);

  // Collect reviews
  const reviewPromises = reviewers.map(model =>
    queryModelWithRetry(model, reviewPrompt, {
      temperature: 0.3,
      systemPrompt: 'You are an expert evaluator. Be thorough but concise. Always end with FINAL RANKING: [X, Y, Z] format.'
    }).catch(error => ({
      model,
      response: null,
      error: error.message
    }))
  );

  const reviews = await Promise.allSettled(reviewPromises);
  const reviewResults = reviews.map(r => r.status === 'fulfilled' ? r.value : r.reason);

  // Parse rankings from each review
  const allRankings = [];
  const rankingRegex = /FINAL RANKING:\s*\[([A-Z,\s]+)\]/i;

  for (const review of reviewResults) {
    if (!review.response) continue;

    const match = review.response.match(rankingRegex);
    if (match) {
      const ranking = match[1].split(',').map(s => s.trim().toUpperCase());
      allRankings.push({ reviewer: review.model, ranking });
    }
  }

  // Aggregate rankings using Borda count
  const scores = {};
  labels.slice(0, validResponses.length).forEach(label => {
    scores[label] = 0;
  });

  for (const { ranking } of allRankings) {
    const n = ranking.length;
    ranking.forEach((label, position) => {
      if (scores.hasOwnProperty(label)) {
        // Borda: first place gets n-1 points, second gets n-2, etc.
        scores[label] += (n - 1 - position);
      }
    });
  }

  // Sort by score (highest first)
  const aggregated = Object.entries(scores)
    .map(([label, score]) => ({
      label,
      model: labelToModel[label],
      score
    }))
    .sort((a, b) => b.score - a.score);

  logger.info('Stage 2 complete', {
    reviewsCollected: allRankings.length,
    topRanked: aggregated[0]?.label
  });

  return {
    rankings: allRankings,
    aggregated,
    labelToModel,
    reviewResults
  };
}

/**
 * Stage 3: Chairman Synthesis
 * The chairman model synthesizes the best answer using all responses and rankings
 *
 * @param {string} query - Original query
 * @param {Array} stage1Results - Results from Stage 1
 * @param {Object} stage2Results - Results from Stage 2
 * @param {string} chairmanModel - Model to use for synthesis
 * @returns {Promise<{synthesis: string, timing: number}>}
 */
async function stage3ChairmanSynthesis(query, stage1Results, stage2Results, chairmanModel) {
  logger.info('Stage 3: Chairman Synthesis starting', { chairman: chairmanModel });

  const { aggregated, labelToModel } = stage2Results;
  const validResponses = stage1Results.filter(r => r.response !== null);

  // Build responses section with model attribution
  const responsesText = validResponses.map((result, idx) => {
    const label = 'ABCDEFGHIJ'[idx];
    return `**${result.model}** (Response ${label}):\n${result.response}\n`;
  }).join('\n---\n\n');

  // Build rankings section
  const rankingsText = aggregated.map((item, idx) =>
    `${idx + 1}. Response ${item.label} (${item.model}) - Score: ${item.score}`
  ).join('\n');

  const synthesisPrompt = `You are the Chairman of an LLM Council tasked with synthesizing the best possible answer.

**ORIGINAL QUESTION:**
${query}

---

**COUNCIL RESPONSES:**

${responsesText}

---

**PEER RANKING (by aggregate score):**
${rankingsText}

---

**Your Task as Chairman:**
1. Weight higher-ranked responses more heavily in your synthesis
2. Identify areas of agreement across responses
3. Resolve any contradictions by favoring higher-ranked perspectives
4. Synthesize a comprehensive, authoritative answer that represents the council's collective wisdom
5. Maintain accuracy and cite specific insights from top-ranked responses when relevant

Provide your synthesized answer now:`;

  const result = await queryModelWithRetry(chairmanModel, synthesisPrompt, {
    temperature: 0.5,
    systemPrompt: 'You are the Chairman of an expert council. Synthesize the best insights from all responses, giving more weight to higher-ranked responses. Be comprehensive but concise.'
  });

  logger.info('Stage 3 complete', { timing: result.timing });

  return {
    synthesis: result.response,
    timing: result.timing
  };
}

/**
 * Save council output to file
 * @param {string} traceId - Council session trace ID
 * @param {Object} output - Full council output
 */
function saveOutput(traceId, output) {
  const filename = `${traceId}.json`;
  const filepath = join(OUTPUT_DIR, filename);

  // Ensure directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
  logger.info('Council output saved', { filepath });

  return filepath;
}

/**
 * Run the full LLM Council deliberation
 *
 * @param {string} query - The question to deliberate on
 * @param {Object} options - Council options
 * @param {string[]} [options.models] - Models to query in Stage 1
 * @param {string} [options.chairmanModel] - Model for final synthesis
 * @param {number} [options.temperature] - Temperature for queries
 * @param {boolean} [options.saveOutput] - Whether to save output to file
 * @returns {Promise<Object>} Council results
 */
async function runCouncil(query, options = {}) {
  if (!isConfigured()) {
    throw new ExternalServiceError('OpenRouter', 'API key not configured. Set OPENROUTER_API_KEY in .env');
  }

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new ValidationError('Query is required and must be a non-empty string');
  }

  const {
    models = DEFAULT_COUNCIL_MODELS,
    chairmanModel = DEFAULT_CHAIRMAN_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    saveOutput: shouldSave = true,
    skipBudgetCheck = false
  } = options;

  const traceId = generateTraceId('council');
  const startTime = Date.now();

  // Estimate cost and run pre-flight checks
  const costEstimate = costController.estimateCouncilCost(query, models, chairmanModel);

  if (!skipBudgetCheck) {
    const preCheck = costController.preFlightCheck(costEstimate.estimated);
    if (!preCheck.allowed) {
      logger.warn('Council session blocked by cost controls', { traceId, reason: preCheck.reason });
      throw new ValidationError(`Cost control: ${preCheck.reason}`, {
        estimatedCost: costEstimate.estimated,
        remaining: preCheck.remaining
      });
    }

    if (preCheck.warnings?.length) {
      logger.warn('Cost warnings', { traceId, warnings: preCheck.warnings });
    }
  }

  logger.info('LLM Council session starting', {
    traceId,
    query: query.slice(0, 100) + '...',
    estimatedCost: costEstimate.estimated
  });

  try {
    // Stage 1: Parallel Collection
    const stage1Results = await stage1ParallelCollection(query, models, { temperature });

    // Stage 2: Anonymous Peer Review
    const stage2Results = await stage2AnonymousReview(query, stage1Results);

    // Stage 3: Chairman Synthesis
    const stage3Results = await stage3ChairmanSynthesis(
      query,
      stage1Results,
      stage2Results,
      chairmanModel
    );

    const totalDuration = Date.now() - startTime;

    const output = {
      traceId,
      query,
      timestamp: new Date().toISOString(),
      config: {
        models,
        chairmanModel,
        temperature
      },
      stages: {
        stage1: {
          responses: stage1Results.map(r => ({
            model: r.model,
            response: r.response?.slice(0, 500) + (r.response?.length > 500 ? '...' : ''),
            timing: r.timing,
            error: r.error
          }))
        },
        stage2: {
          rankings: stage2Results.rankings,
          aggregated: stage2Results.aggregated
        },
        stage3: {
          chairman: chairmanModel,
          timing: stage3Results.timing
        }
      },
      synthesis: stage3Results.synthesis,
      ranking: stage2Results.aggregated,
      duration: totalDuration
    };

    // Save to file if requested
    if (shouldSave) {
      output.outputFile = saveOutput(traceId, {
        ...output,
        stages: {
          ...output.stages,
          stage1: {
            responses: stage1Results // Full responses in file
          },
          stage2: {
            ...stage2Results,
            reviewResults: stage2Results.reviewResults // Full reviews in file
          }
        }
      });
    }

    // Get cost summary for this session
    const sessionCost = costController.getCostSummary();

    // Record the session completion
    costController.recordSession(traceId, sessionCost.daily.spent);

    logger.info('LLM Council session complete', {
      traceId,
      duration: totalDuration,
      estimatedCost: costEstimate.estimated
    });

    return {
      success: true,
      traceId,
      synthesis: stage3Results.synthesis,
      ranking: stage2Results.aggregated,
      duration: totalDuration,
      cost: {
        estimated: costEstimate.estimated,
        budgetRemaining: {
          daily: sessionCost.daily.remaining,
          monthly: sessionCost.monthly.remaining
        }
      }
    };

  } catch (error) {
    logger.error('LLM Council session failed', { traceId, error: error.message });
    throw error;
  }
}

/**
 * HTTP request handler for council endpoint
 * @param {Object} body - Request body
 * @returns {Promise<Object>}
 */
async function handleLLMCouncilRequest(body) {
  const {
    query,
    models,
    chairmanModel,
    temperature,
    autoInjectContext = true,  // Enable by default
    businessContext = null     // Explicit business IDs to include
  } = body;

  if (!query) {
    throw new ValidationError('query is required');
  }

  let finalQuery = query;
  let contextInfo = null;

  // Auto-inject context if enabled
  if (autoInjectContext) {
    // If explicit business context provided, use that
    if (businessContext && Array.isArray(businessContext)) {
      const ctx = businessContext.length === 1
        ? await councilContext.buildContext(businessContext[0])
        : await councilContext.buildMultiContext(businessContext);
      finalQuery = councilContext.injectContext(query, ctx);
      contextInfo = {
        injected: true,
        businessIds: businessContext,
        dataLoaded: ctx.dataLoaded || ctx.individual?.map(c => c.dataLoaded)
      };
      logger.info('Context injected (explicit)', { businessIds: businessContext });
    } else {
      // Auto-detect business mentions in query
      const result = await councilContext.autoInjectContext(query);
      if (result.injected) {
        finalQuery = result.query;
        contextInfo = {
          injected: true,
          businessIds: result.businessIds,
          autoDetected: true
        };
        logger.info('Context auto-injected', { businessIds: result.businessIds });
      }
    }
  }

  const councilResult = await runCouncil(finalQuery, { models, chairmanModel, temperature });

  // Include context info in response
  return {
    ...councilResult,
    contextInjection: contextInfo
  };
}

/**
 * Get cost summary and budget status
 * @returns {Object}
 */
function getCostStatus() {
  return costController.getCostSummary();
}

/**
 * Update budget limits
 * @param {Object} newLimits
 * @returns {Object}
 */
function updateBudgetLimits(newLimits) {
  costController.updateLimits(newLimits);
  return costController.getCostSummary();
}

/**
 * Estimate cost for a council query without running it
 * @param {Object} params
 * @returns {Object}
 */
function estimateCost(params) {
  const {
    query,
    models = DEFAULT_COUNCIL_MODELS,
    chairmanModel = DEFAULT_CHAIRMAN_MODEL
  } = params;

  const estimate = costController.estimateCouncilCost(query || '', models, chairmanModel);
  const preCheck = costController.preFlightCheck(estimate.estimated);

  return {
    estimate,
    budget: preCheck,
    pricing: costController.getModelPricingInfo()
  };
}

/**
 * Get list of available models from OpenRouter
 * @returns {Promise<Object>}
 */
async function getAvailableModels() {
  if (!isConfigured()) {
    return {
      configured: false,
      error: 'OpenRouter API key not configured',
      defaults: {
        councilModels: DEFAULT_COUNCIL_MODELS,
        chairmanModel: DEFAULT_CHAIRMAN_MODEL
      }
    };
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();

    // Filter to popular/recommended models
    const recommended = [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-opus',
      'google/gemini-2.0-flash-exp',
      'google/gemini-pro',
      'meta-llama/llama-3.1-70b-instruct',
      'mistralai/mistral-large'
    ];

    return {
      configured: true,
      defaults: {
        councilModels: DEFAULT_COUNCIL_MODELS,
        chairmanModel: DEFAULT_CHAIRMAN_MODEL
      },
      recommended,
      allModels: data.data?.map(m => ({
        id: m.id,
        name: m.name,
        contextLength: m.context_length,
        pricing: m.pricing
      })) || []
    };
  } catch (error) {
    return {
      configured: true,
      error: error.message,
      defaults: {
        councilModels: DEFAULT_COUNCIL_MODELS,
        chairmanModel: DEFAULT_CHAIRMAN_MODEL
      }
    };
  }
}

// CLI support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'test') {
    console.log('Testing LLM Council configuration...\n');
    console.log('OpenRouter configured:', isConfigured());
    console.log('Default models:', DEFAULT_COUNCIL_MODELS);
    console.log('Chairman model:', DEFAULT_CHAIRMAN_MODEL);
    console.log('Output directory:', OUTPUT_DIR);

    if (isConfigured()) {
      console.log('\nFetching available models...');
      getAvailableModels().then(result => {
        console.log('Models result:', JSON.stringify(result, null, 2));
      });
    }
  } else if (command === 'run') {
    const query = args.slice(1).join(' ');
    if (!query) {
      console.error('Usage: node llm_council.js run "Your question here"');
      process.exit(1);
    }

    console.log(`\nRunning LLM Council for: "${query}"\n`);

    runCouncil(query)
      .then(result => {
        console.log('\n=== COUNCIL RESULT ===\n');
        console.log('Trace ID:', result.traceId);
        console.log('Duration:', result.duration, 'ms');
        console.log('\n--- RANKINGS ---');
        result.ranking.forEach((r, i) => {
          console.log(`${i + 1}. ${r.model} (Score: ${r.score})`);
        });
        console.log('\n--- SYNTHESIS ---');
        console.log(result.synthesis);
      })
      .catch(error => {
        console.error('Council failed:', error.message);
        process.exit(1);
      });
  } else {
    console.log('LLM Council CLI\n');
    console.log('Usage:');
    console.log('  node llm_council.js test              - Test configuration');
    console.log('  node llm_council.js run "question"    - Run council deliberation');
  }
}

export default {
  runCouncil,
  handleLLMCouncilRequest,
  getAvailableModels,
  isConfigured,
  stage1ParallelCollection,
  stage2AnonymousReview,
  stage3ChairmanSynthesis,
  getCostStatus,
  updateBudgetLimits,
  estimateCost,
  DEFAULT_COUNCIL_MODELS,
  DEFAULT_CHAIRMAN_MODEL
};

export {
  runCouncil,
  handleLLMCouncilRequest,
  getAvailableModels,
  isConfigured,
  stage1ParallelCollection,
  stage2AnonymousReview,
  stage3ChairmanSynthesis,
  getCostStatus,
  updateBudgetLimits,
  estimateCost,
  DEFAULT_COUNCIL_MODELS,
  DEFAULT_CHAIRMAN_MODEL
};
