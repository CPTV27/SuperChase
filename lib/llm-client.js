/**
 * Unified LLM Client
 *
 * Shared LLM client for all modules (agents, councils, intel).
 * Consolidates OpenRouter API calls with:
 * - Circuit breaker protection
 * - Cost tracking via cost-controller
 * - Consistent retry logic
 * - Request tracing
 *
 * @module lib/llm-client
 */

import { createLogger } from './logger.js';
import { ExternalServiceError, withRetry } from './errors.js';
import { withCircuitBreaker, recordSuccess, recordFailure } from './health.js';
import costController from './cost-controller.js';

const logger = createLogger({ module: 'llm-client' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Circuit breaker name for OpenRouter
const CIRCUIT_NAME = 'openrouter';

/**
 * Model aliases mapping friendly names to OpenRouter model IDs
 * Pricing is sourced from cost-controller.js
 */
export const MODEL_ALIASES = {
  // OpenAI
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',

  // Anthropic
  'claude-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-opus': 'anthropic/claude-3-opus',
  'claude-haiku': 'anthropic/claude-3-haiku',

  // Google
  'gemini-flash': 'google/gemini-2.0-flash-exp',
  'gemini-pro': 'google/gemini-pro',
  'gemini-1.5-pro': 'google/gemini-1.5-pro',

  // Meta
  'llama-70b': 'meta-llama/llama-3.1-70b-instruct',
  'llama-8b': 'meta-llama/llama-3.1-8b-instruct',

  // Mistral
  'mistral-large': 'mistralai/mistral-large',
  'mixtral': 'mistralai/mixtral-8x7b-instruct',
};

/**
 * Resolve model alias to full OpenRouter model ID
 * @param {string} model - Model name or alias
 * @returns {string} Full OpenRouter model ID
 */
export function resolveModel(model) {
  // If it's an alias, resolve it
  if (MODEL_ALIASES[model]) {
    return MODEL_ALIASES[model];
  }
  // If it already looks like a full ID (has a /), return as-is
  if (model.includes('/')) {
    return model;
  }
  // Default to treating it as an OpenAI model
  return `openai/${model}`;
}

/**
 * Estimate token count from text (rough approximation)
 * Uses ~4 characters per token for English text
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Calculate estimated cost for a request
 * @param {string} model - Model ID or alias
 * @param {number} inputTokens - Input token count
 * @param {number} outputTokens - Output token count
 * @returns {number} Estimated cost in USD
 */
export function estimateCost(model, inputTokens, outputTokens) {
  const modelId = resolveModel(model);
  return costController.calculateCost(modelId, inputTokens, outputTokens);
}

/**
 * Core LLM query function (internal, no circuit breaker)
 * @private
 */
async function _queryLLM(options) {
  const {
    model = 'claude-sonnet',
    system,
    prompt,
    messages: providedMessages,
    temperature = 0.7,
    maxTokens,
    json = false,
    traceId,
    operation = 'query',
  } = options;

  const modelId = resolveModel(model);

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'NEEDS_VALUE') {
    throw new ExternalServiceError('OpenRouter', 'API key not configured');
  }

  // Build messages array
  let messages;
  if (providedMessages) {
    messages = providedMessages;
  } else {
    messages = [];
    if (system) {
      messages.push({ role: 'system', content: system });
    }
    messages.push({ role: 'user', content: prompt });
  }

  const body = {
    model: modelId,
    messages,
    temperature,
  };

  if (maxTokens) {
    body.max_tokens = maxTokens;
  }

  if (json) {
    body.response_format = { type: 'json_object' };
  }

  const startTime = Date.now();

  logger.debug('LLM request', {
    model: modelId,
    messagesCount: messages.length,
    traceId,
  });

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://superchase.app',
      'X-Title': 'SuperChase AI',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new ExternalServiceError(
      'OpenRouter',
      `${model} query failed: ${response.status} - ${errorText}`
    );
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const latencyMs = Date.now() - startTime;

  // Get token counts (from API or estimate)
  const tokens = {
    input: data.usage?.prompt_tokens || estimateTokens(
      messages.map(m => m.content).join('')
    ),
    output: data.usage?.completion_tokens || estimateTokens(content),
  };

  // Calculate cost using cost-controller's pricing
  const cost = costController.calculateCost(modelId, tokens.input, tokens.output);

  // Record cost with cost-controller
  costController.recordCost({
    model: modelId,
    inputTokens: tokens.input,
    outputTokens: tokens.output,
    actualCost: data.usage?.total_cost, // Use API-reported cost if available
    traceId,
    operation,
  });

  logger.debug('LLM response', {
    model: modelId,
    tokens,
    cost: cost.toFixed(6),
    latencyMs,
    traceId,
  });

  return {
    content,
    tokens,
    cost,
    latencyMs,
    model: modelId,
    finishReason: data.choices?.[0]?.finish_reason,
  };
}

/**
 * Query LLM with circuit breaker protection
 *
 * @param {object} options - Query options
 * @param {string} [options.model='claude-sonnet'] - Model name or alias
 * @param {string} [options.system] - System prompt
 * @param {string} [options.prompt] - User prompt (use this OR messages)
 * @param {Array} [options.messages] - Full messages array (use this OR prompt)
 * @param {number} [options.temperature=0.7] - Temperature (0-2)
 * @param {number} [options.maxTokens] - Max output tokens
 * @param {boolean} [options.json=false] - Request JSON response format
 * @param {string} [options.traceId] - Trace ID for logging
 * @param {string} [options.operation='query'] - Operation type for cost tracking
 * @returns {Promise<{content: string, tokens: object, cost: number, latencyMs: number}>}
 */
export async function queryLLM(options) {
  const wrappedQuery = withCircuitBreaker(CIRCUIT_NAME, _queryLLM);

  try {
    const result = await wrappedQuery(options);
    return result;
  } catch (error) {
    // Re-throw with more context
    if (error.message?.includes('Circuit')) {
      throw new ExternalServiceError(
        'OpenRouter',
        'Service temporarily unavailable (circuit breaker open). Try again later.'
      );
    }
    throw error;
  }
}

/**
 * Query LLM with automatic retry on transient failures
 *
 * Retries on:
 * - 5xx server errors
 * - Rate limit errors (429)
 * - Network errors
 *
 * @param {object} options - Same as queryLLM
 * @param {object} [retryOptions] - Retry configuration
 * @returns {Promise<{content: string, tokens: object, cost: number}>}
 */
export async function queryLLMWithRetry(options, retryOptions = {}) {
  const {
    maxRetries = 2,
    baseDelayMs = 1000,
  } = retryOptions;

  const retryableQuery = withRetry(
    () => queryLLM(options),
    {
      maxRetries,
      baseDelayMs,
      shouldRetry: (error) => {
        // Retry on server errors
        if (error.statusCode >= 500) return true;
        // Retry on rate limits
        if (error.statusCode === 429) return true;
        // Retry on network errors
        if (error.message?.includes('fetch')) return true;
        if (error.message?.includes('network')) return true;
        return false;
      },
    }
  );

  return retryableQuery();
}

/**
 * Parse JSON from LLM response
 * Handles markdown code blocks and raw JSON
 *
 * @param {string} text - Raw LLM response
 * @returns {object} Parsed JSON object
 * @throws {Error} If JSON cannot be parsed
 */
export function parseJSON(text) {
  if (!text) {
    throw new Error('Empty response cannot be parsed as JSON');
  }

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Continue to next attempt
      }
    }

    // Try finding JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Continue to next attempt
      }
    }

    // Try finding JSON array
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // Fall through to error
      }
    }

    throw new Error('Could not parse JSON from response');
  }
}

/**
 * Stream LLM response (for real-time output)
 * Note: Requires SSE-compatible endpoint
 *
 * @param {object} options - Same as queryLLM
 * @param {function} onChunk - Callback for each chunk
 * @returns {Promise<{content: string, tokens: object, cost: number}>}
 */
export async function streamLLM(options, onChunk) {
  const {
    model = 'claude-sonnet',
    system,
    prompt,
    messages: providedMessages,
    temperature = 0.7,
    traceId,
  } = options;

  const modelId = resolveModel(model);

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'NEEDS_VALUE') {
    throw new ExternalServiceError('OpenRouter', 'API key not configured');
  }

  let messages;
  if (providedMessages) {
    messages = providedMessages;
  } else {
    messages = [];
    if (system) {
      messages.push({ role: 'system', content: system });
    }
    messages.push({ role: 'user', content: prompt });
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://superchase.app',
      'X-Title': 'SuperChase AI',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ExternalServiceError('OpenRouter', `Stream failed: ${response.status}`);
  }

  let fullContent = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            if (onChunk) onChunk(content);
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const tokens = {
    input: estimateTokens(messages.map(m => m.content).join('')),
    output: estimateTokens(fullContent),
  };

  const cost = costController.calculateCost(modelId, tokens.input, tokens.output);

  costController.recordCost({
    model: modelId,
    inputTokens: tokens.input,
    outputTokens: tokens.output,
    traceId,
    operation: 'stream',
  });

  recordSuccess(CIRCUIT_NAME);

  return { content: fullContent, tokens, cost };
}

/**
 * Check if LLM service is available
 * @returns {boolean}
 */
export function isLLMAvailable() {
  // Check API key
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'NEEDS_VALUE') {
    return false;
  }

  // Check circuit breaker
  const { isAvailable } = require('./health.js');
  return isAvailable(CIRCUIT_NAME);
}

/**
 * Get LLM service status
 * @returns {object}
 */
export function getLLMStatus() {
  const { getCircuitState } = require('./health.js');
  const circuitState = getCircuitState(CIRCUIT_NAME);

  return {
    available: isLLMAvailable(),
    apiKeyConfigured: !!OPENROUTER_API_KEY && OPENROUTER_API_KEY !== 'NEEDS_VALUE',
    circuitState: circuitState.state,
    failures: circuitState.failures,
    lastSuccess: circuitState.lastSuccess,
  };
}

export default {
  queryLLM,
  queryLLMWithRetry,
  streamLLM,
  parseJSON,
  estimateTokens,
  estimateCost,
  resolveModel,
  isLLMAvailable,
  getLLMStatus,
  MODEL_ALIASES,
};
