/**
 * Cost Controller
 *
 * Provides budget tracking, cost estimation, spend alerts, and rate limiting
 * for LLM API usage (OpenRouter, direct APIs, etc.).
 *
 * @module lib/cost-controller
 */

import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from './logger.js';
import { ValidationError } from './errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({ module: 'cost-controller' });

// ============================================
// Configuration
// ============================================

const COST_FILE = join(__dirname, '..', 'memory', 'cost_tracking.json');

// OpenRouter pricing per 1M tokens (as of Jan 2026)
// Source: https://openrouter.ai/docs#models
const MODEL_PRICING = {
  // OpenAI
  'openai/gpt-4o': { input: 2.50, output: 10.00 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  'openai/gpt-4-turbo': { input: 10.00, output: 30.00 },
  'openai/gpt-3.5-turbo': { input: 0.50, output: 1.50 },

  // Anthropic
  'anthropic/claude-3.5-sonnet': { input: 3.00, output: 15.00 },
  'anthropic/claude-3-opus': { input: 15.00, output: 75.00 },
  'anthropic/claude-3-sonnet': { input: 3.00, output: 15.00 },
  'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },

  // Google
  'google/gemini-2.0-flash-exp': { input: 0.00, output: 0.00 }, // Free during preview
  'google/gemini-pro': { input: 0.125, output: 0.375 },
  'google/gemini-1.5-pro': { input: 1.25, output: 5.00 },

  // Meta
  'meta-llama/llama-3.1-70b-instruct': { input: 0.52, output: 0.75 },
  'meta-llama/llama-3.1-8b-instruct': { input: 0.06, output: 0.06 },

  // Mistral
  'mistralai/mistral-large': { input: 2.00, output: 6.00 },
  'mistralai/mistral-medium': { input: 2.70, output: 8.10 },
  'mistralai/mixtral-8x7b-instruct': { input: 0.24, output: 0.24 }
};

// Default budget limits
const DEFAULT_LIMITS = {
  daily: 10.00,      // $10/day default
  monthly: 200.00,   // $200/month default
  perSession: 2.00,  // $2/council session max
  alertThreshold: 0.75 // Alert at 75% of budget
};

// Rate limiting
const RATE_LIMITS = {
  requestsPerMinute: 30,
  requestsPerHour: 300,
  sessionsPerDay: 100
};

// ============================================
// Cost Tracking State
// ============================================

let costState = {
  daily: {
    date: new Date().toISOString().split('T')[0],
    totalCost: 0,
    sessionCount: 0,
    requestCount: 0,
    byModel: {}
  },
  monthly: {
    month: new Date().toISOString().slice(0, 7),
    totalCost: 0,
    sessionCount: 0,
    requestCount: 0,
    byModel: {}
  },
  limits: { ...DEFAULT_LIMITS },
  rateTracking: {
    minute: { timestamp: Date.now(), count: 0 },
    hour: { timestamp: Date.now(), count: 0 }
  },
  alerts: []
};

// ============================================
// Persistence
// ============================================

/**
 * Load cost state from file
 */
function loadCostState() {
  try {
    if (fs.existsSync(COST_FILE)) {
      const data = JSON.parse(fs.readFileSync(COST_FILE, 'utf8'));

      // Check if we need to reset daily/monthly counters
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().slice(0, 7);

      if (data.daily?.date !== today) {
        data.daily = {
          date: today,
          totalCost: 0,
          sessionCount: 0,
          requestCount: 0,
          byModel: {}
        };
      }

      if (data.monthly?.month !== thisMonth) {
        data.monthly = {
          month: thisMonth,
          totalCost: 0,
          sessionCount: 0,
          requestCount: 0,
          byModel: {}
        };
      }

      costState = { ...costState, ...data };
      logger.debug('Cost state loaded', { daily: costState.daily.totalCost, monthly: costState.monthly.totalCost });
    }
  } catch (error) {
    logger.warn('Failed to load cost state, using defaults', { error: error.message });
  }
}

/**
 * Save cost state to file
 */
function saveCostState() {
  try {
    const dir = dirname(COST_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(COST_FILE, JSON.stringify(costState, null, 2));
  } catch (error) {
    logger.error('Failed to save cost state', { error: error.message });
  }
}

// Load state on module init
loadCostState();

// ============================================
// Cost Estimation
// ============================================

/**
 * Estimate token count from text (rough approximation)
 * @param {string} text
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Rough estimate: ~4 chars per token for English
  return Math.ceil(text.length / 4);
}

/**
 * Get pricing for a model
 * @param {string} model - Model identifier
 * @returns {{input: number, output: number}} Price per 1M tokens
 */
function getModelPricing(model) {
  // Direct match
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }

  // Try to match by provider/base model
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (model.includes(key.split('/')[1])) {
      return pricing;
    }
  }

  // Default to GPT-4o pricing for unknown models (conservative estimate)
  logger.warn('Unknown model pricing, using default', { model });
  return { input: 2.50, output: 10.00 };
}

/**
 * Calculate cost for a request
 * @param {string} model - Model identifier
 * @param {number} inputTokens - Input token count
 * @param {number} outputTokens - Output token count
 * @returns {number} Cost in USD
 */
function calculateCost(model, inputTokens, outputTokens) {
  const pricing = getModelPricing(model);
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Estimate council session cost
 * @param {string} query - User query
 * @param {string[]} models - Models to query
 * @param {string} chairmanModel - Chairman model
 * @returns {{estimated: number, breakdown: Object}}
 */
function estimateCouncilCost(query, models, chairmanModel) {
  const queryTokens = estimateTokens(query);

  // Stage 1: Each model gets the query
  const stage1InputTokens = queryTokens * models.length;
  const stage1OutputTokens = 500 * models.length; // ~500 tokens per response estimate

  // Stage 2: Review prompts (include all responses)
  const reviewPromptTokens = queryTokens + (500 * models.length) + 200; // Query + responses + instructions
  const stage2InputTokens = reviewPromptTokens * 2; // 2 reviewers
  const stage2OutputTokens = 300 * 2; // ~300 tokens per review

  // Stage 3: Chairman synthesis
  const synthesisPromptTokens = queryTokens + (500 * models.length) + 500; // Query + responses + rankings
  const stage3InputTokens = synthesisPromptTokens;
  const stage3OutputTokens = 800; // Longer synthesis

  // Calculate per-model costs
  const breakdown = {};
  let totalCost = 0;

  for (const model of models) {
    const cost = calculateCost(model, queryTokens, 500);
    breakdown[model] = { stage: 'response', cost };
    totalCost += cost;
  }

  // Add review costs (using first two council models)
  for (let i = 0; i < 2 && i < models.length; i++) {
    const reviewCost = calculateCost(models[i], reviewPromptTokens, 300);
    breakdown[`${models[i]}_review`] = { stage: 'review', cost: reviewCost };
    totalCost += reviewCost;
  }

  // Add chairman cost
  const chairmanCost = calculateCost(chairmanModel, synthesisPromptTokens, 800);
  breakdown[chairmanModel + '_chairman'] = { stage: 'synthesis', cost: chairmanCost };
  totalCost += chairmanCost;

  return {
    estimated: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
    breakdown,
    warning: totalCost > costState.limits.perSession
      ? `Estimated cost ($${totalCost.toFixed(4)}) exceeds session limit ($${costState.limits.perSession})`
      : null
  };
}

// ============================================
// Budget Enforcement
// ============================================

/**
 * Check if a request can proceed within budget
 * @param {number} estimatedCost - Estimated cost of the request
 * @returns {{allowed: boolean, reason?: string, remaining?: Object}}
 */
function checkBudget(estimatedCost) {
  const result = {
    allowed: true,
    remaining: {
      daily: costState.limits.daily - costState.daily.totalCost,
      monthly: costState.limits.monthly - costState.monthly.totalCost,
      perSession: costState.limits.perSession
    }
  };

  // Check per-session limit
  if (estimatedCost > costState.limits.perSession) {
    result.allowed = false;
    result.reason = `Estimated cost ($${estimatedCost.toFixed(4)}) exceeds per-session limit ($${costState.limits.perSession})`;
    return result;
  }

  // Check daily limit
  if (costState.daily.totalCost + estimatedCost > costState.limits.daily) {
    result.allowed = false;
    result.reason = `Would exceed daily budget. Current: $${costState.daily.totalCost.toFixed(2)}, Limit: $${costState.limits.daily}`;
    return result;
  }

  // Check monthly limit
  if (costState.monthly.totalCost + estimatedCost > costState.limits.monthly) {
    result.allowed = false;
    result.reason = `Would exceed monthly budget. Current: $${costState.monthly.totalCost.toFixed(2)}, Limit: $${costState.limits.monthly}`;
    return result;
  }

  return result;
}

/**
 * Check rate limits
 * @returns {{allowed: boolean, reason?: string, retryAfter?: number}}
 */
function checkRateLimits() {
  const now = Date.now();

  // Reset minute counter if needed
  if (now - costState.rateTracking.minute.timestamp > 60000) {
    costState.rateTracking.minute = { timestamp: now, count: 0 };
  }

  // Reset hour counter if needed
  if (now - costState.rateTracking.hour.timestamp > 3600000) {
    costState.rateTracking.hour = { timestamp: now, count: 0 };
  }

  // Check per-minute limit
  if (costState.rateTracking.minute.count >= RATE_LIMITS.requestsPerMinute) {
    const retryAfter = 60000 - (now - costState.rateTracking.minute.timestamp);
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${RATE_LIMITS.requestsPerMinute} requests per minute`,
      retryAfter: Math.ceil(retryAfter / 1000)
    };
  }

  // Check per-hour limit
  if (costState.rateTracking.hour.count >= RATE_LIMITS.requestsPerHour) {
    const retryAfter = 3600000 - (now - costState.rateTracking.hour.timestamp);
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${RATE_LIMITS.requestsPerHour} requests per hour`,
      retryAfter: Math.ceil(retryAfter / 1000)
    };
  }

  // Check daily session limit
  if (costState.daily.sessionCount >= RATE_LIMITS.sessionsPerDay) {
    return {
      allowed: false,
      reason: `Daily session limit reached: ${RATE_LIMITS.sessionsPerDay} sessions per day`
    };
  }

  return { allowed: true };
}

/**
 * Pre-flight check before making an LLM request
 * @param {number} estimatedCost - Estimated cost
 * @returns {{allowed: boolean, reason?: string, warnings?: string[]}}
 */
function preFlightCheck(estimatedCost) {
  const warnings = [];

  // Check rate limits
  const rateCheck = checkRateLimits();
  if (!rateCheck.allowed) {
    return rateCheck;
  }

  // Check budget
  const budgetCheck = checkBudget(estimatedCost);
  if (!budgetCheck.allowed) {
    return budgetCheck;
  }

  // Add warnings for approaching limits
  const dailyUsage = costState.daily.totalCost / costState.limits.daily;
  if (dailyUsage >= costState.limits.alertThreshold) {
    warnings.push(`Daily budget ${Math.round(dailyUsage * 100)}% used ($${costState.daily.totalCost.toFixed(2)}/$${costState.limits.daily})`);
  }

  const monthlyUsage = costState.monthly.totalCost / costState.limits.monthly;
  if (monthlyUsage >= costState.limits.alertThreshold) {
    warnings.push(`Monthly budget ${Math.round(monthlyUsage * 100)}% used ($${costState.monthly.totalCost.toFixed(2)}/$${costState.limits.monthly})`);
  }

  return {
    allowed: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    remaining: budgetCheck.remaining
  };
}

// ============================================
// Cost Recording
// ============================================

/**
 * Record a completed request's cost
 * @param {Object} data
 * @param {string} data.model - Model used
 * @param {number} data.inputTokens - Input tokens
 * @param {number} data.outputTokens - Output tokens
 * @param {number} [data.actualCost] - Actual cost if known from API response
 * @param {string} [data.traceId] - Session trace ID
 * @param {string} [data.operation] - Operation type (council, query, etc.)
 */
function recordCost(data) {
  const { model, inputTokens, outputTokens, actualCost, traceId, operation = 'unknown' } = data;

  // Calculate or use actual cost
  const cost = actualCost ?? calculateCost(model, inputTokens, outputTokens);

  // Update daily stats
  costState.daily.totalCost += cost;
  costState.daily.requestCount++;
  costState.daily.byModel[model] = (costState.daily.byModel[model] || 0) + cost;

  // Update monthly stats
  costState.monthly.totalCost += cost;
  costState.monthly.requestCount++;
  costState.monthly.byModel[model] = (costState.monthly.byModel[model] || 0) + cost;

  // Update rate tracking
  costState.rateTracking.minute.count++;
  costState.rateTracking.hour.count++;

  // Log
  logger.debug('Cost recorded', {
    model,
    cost: cost.toFixed(6),
    inputTokens,
    outputTokens,
    traceId
  });

  // Check for alerts
  checkAndSendAlerts();

  // Persist
  saveCostState();

  return { cost, recorded: true };
}

/**
 * Record a council session
 * @param {string} traceId - Session trace ID
 * @param {number} totalCost - Total session cost
 */
function recordSession(traceId, totalCost) {
  costState.daily.sessionCount++;
  costState.monthly.sessionCount++;

  logger.info('Council session cost recorded', {
    traceId,
    cost: totalCost.toFixed(4),
    dailyTotal: costState.daily.totalCost.toFixed(2),
    monthlyTotal: costState.monthly.totalCost.toFixed(2)
  });

  saveCostState();
}

// ============================================
// Alerts
// ============================================

/**
 * Check thresholds and queue alerts
 */
function checkAndSendAlerts() {
  const dailyUsage = costState.daily.totalCost / costState.limits.daily;
  const monthlyUsage = costState.monthly.totalCost / costState.limits.monthly;

  // Daily alert
  if (dailyUsage >= costState.limits.alertThreshold) {
    const alertKey = `daily_${costState.daily.date}`;
    if (!costState.alerts.includes(alertKey)) {
      costState.alerts.push(alertKey);
      emitAlert('daily_threshold', {
        usage: dailyUsage,
        spent: costState.daily.totalCost,
        limit: costState.limits.daily
      });
    }
  }

  // Monthly alert
  if (monthlyUsage >= costState.limits.alertThreshold) {
    const alertKey = `monthly_${costState.monthly.month}`;
    if (!costState.alerts.includes(alertKey)) {
      costState.alerts.push(alertKey);
      emitAlert('monthly_threshold', {
        usage: monthlyUsage,
        spent: costState.monthly.totalCost,
        limit: costState.limits.monthly
      });
    }
  }
}

/**
 * Emit a cost alert
 * @param {string} type - Alert type
 * @param {Object} data - Alert data
 */
async function emitAlert(type, data) {
  logger.warn('Cost alert triggered', { type, ...data });

  // Try to send notification if available
  try {
    const { notifyCostAlert } = await import('./notifications.js');
    const service = type === 'daily_threshold' ? 'LLM API (Daily)' : 'LLM API (Monthly)';
    await notifyCostAlert(service, data.spent, data.limit);
  } catch (error) {
    // Notifications not configured, just log
    logger.debug('Could not send cost alert notification', { error: error.message });
  }
}

// ============================================
// Configuration
// ============================================

/**
 * Update budget limits
 * @param {Object} newLimits - New limit values
 */
function updateLimits(newLimits) {
  costState.limits = {
    ...costState.limits,
    ...newLimits
  };
  saveCostState();
  logger.info('Budget limits updated', costState.limits);
}

/**
 * Get current limits
 * @returns {Object}
 */
function getLimits() {
  return { ...costState.limits };
}

// ============================================
// Reporting
// ============================================

/**
 * Get cost summary
 * @returns {Object}
 */
function getCostSummary() {
  return {
    daily: {
      date: costState.daily.date,
      spent: Math.round(costState.daily.totalCost * 100) / 100,
      limit: costState.limits.daily,
      remaining: Math.round((costState.limits.daily - costState.daily.totalCost) * 100) / 100,
      usage: Math.round((costState.daily.totalCost / costState.limits.daily) * 100),
      sessions: costState.daily.sessionCount,
      requests: costState.daily.requestCount,
      byModel: costState.daily.byModel
    },
    monthly: {
      month: costState.monthly.month,
      spent: Math.round(costState.monthly.totalCost * 100) / 100,
      limit: costState.limits.monthly,
      remaining: Math.round((costState.limits.monthly - costState.monthly.totalCost) * 100) / 100,
      usage: Math.round((costState.monthly.totalCost / costState.limits.monthly) * 100),
      sessions: costState.monthly.sessionCount,
      requests: costState.monthly.requestCount,
      byModel: costState.monthly.byModel
    },
    limits: costState.limits,
    rateLimits: RATE_LIMITS
  };
}

/**
 * Reset daily costs (for testing)
 */
function resetDaily() {
  costState.daily = {
    date: new Date().toISOString().split('T')[0],
    totalCost: 0,
    sessionCount: 0,
    requestCount: 0,
    byModel: {}
  };
  saveCostState();
}

/**
 * Reset all state for testing (includes rate tracking)
 */
function resetForTesting() {
  const now = Date.now();
  costState.daily = {
    date: new Date().toISOString().split('T')[0],
    totalCost: 0,
    sessionCount: 0,
    requestCount: 0,
    byModel: {}
  };
  costState.monthly = {
    month: new Date().toISOString().slice(0, 7),
    totalCost: 0,
    sessionCount: 0,
    requestCount: 0,
    byModel: {}
  };
  costState.rateTracking = {
    minute: { timestamp: now, count: 0 },
    hour: { timestamp: now, count: 0 }
  };
}

/**
 * Get model pricing info
 * @returns {Object}
 */
function getModelPricingInfo() {
  return { ...MODEL_PRICING };
}

export default {
  // Estimation
  estimateTokens,
  calculateCost,
  estimateCouncilCost,
  getModelPricing,
  getModelPricingInfo,

  // Budget enforcement
  checkBudget,
  checkRateLimits,
  preFlightCheck,

  // Recording
  recordCost,
  recordSession,

  // Configuration
  updateLimits,
  getLimits,

  // Reporting
  getCostSummary,
  resetDaily,
  resetForTesting,

  // Constants
  DEFAULT_LIMITS,
  RATE_LIMITS
};

export {
  estimateTokens,
  calculateCost,
  estimateCouncilCost,
  getModelPricing,
  getModelPricingInfo,
  checkBudget,
  checkRateLimits,
  preFlightCheck,
  recordCost,
  recordSession,
  updateLimits,
  getLimits,
  getCostSummary,
  resetDaily,
  resetForTesting,
  DEFAULT_LIMITS,
  RATE_LIMITS
};
