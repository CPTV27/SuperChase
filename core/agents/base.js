/**
 * Base Agent Utilities
 *
 * Shared utilities for all agents including agent factory
 * and output validation. LLM querying is delegated to the
 * shared lib/llm-client.js module.
 *
 * @module core/agents/base
 */

import { createLogger } from '../../lib/logger.js';
import {
  queryLLM,
  queryLLMWithRetry,
  parseJSON,
  estimateTokens,
  estimateCost,
  resolveModel,
  MODEL_ALIASES,
} from '../../lib/llm-client.js';

const logger = createLogger({ module: 'agents:base' });

/**
 * Re-export LLM client functions for backward compatibility
 */
export {
  queryLLM,
  queryLLMWithRetry,
  parseJSON,
  estimateTokens,
  estimateCost,
  resolveModel,
  MODEL_ALIASES,
};

/**
 * Available models (alias for MODEL_ALIASES)
 * @deprecated Use MODEL_ALIASES from lib/llm-client.js
 */
export const MODELS = Object.fromEntries(
  Object.entries(MODEL_ALIASES).map(([alias, id]) => [
    alias,
    { id, costPer1k: { input: 0.003, output: 0.015 } } // Legacy format
  ])
);

/**
 * Create a standard agent definition
 *
 * @param {object} config - Agent configuration
 * @param {string} config.name - Agent name
 * @param {string} config.description - Agent description
 * @param {string} [config.model='claude-sonnet'] - Default model
 * @param {string|function} config.systemPrompt - System prompt or function(inputs) => prompt
 * @param {string|function} config.promptTemplate - User prompt or function(inputs) => prompt
 * @param {function} [config.outputParser=parseJSON] - Output parser function
 * @param {number} [config.temperature=0.7] - Default temperature
 * @param {boolean} [config.json=true] - Request JSON response
 * @returns {object} Agent definition for registry
 */
export function createAgent(config) {
  const {
    name,
    description,
    model = 'claude-sonnet',
    systemPrompt,
    promptTemplate,
    outputParser = parseJSON,
    temperature = 0.7,
    json = true,
  } = config;

  return {
    name,
    description,

    /**
     * Run the agent with given inputs
     * @param {object} inputs - Agent inputs
     * @param {object} [options] - Runtime options
     * @returns {Promise<object>} Agent output
     */
    async run(inputs, options = {}) {
      const startTime = Date.now();
      const traceId = options.traceId || `agent-${name}-${Date.now()}`;

      // Build prompt from template
      const prompt = typeof promptTemplate === 'function'
        ? promptTemplate(inputs)
        : promptTemplate;

      // Build system prompt
      const system = typeof systemPrompt === 'function'
        ? systemPrompt(inputs)
        : systemPrompt;

      logger.debug('Agent executing', { name, traceId });

      // Query LLM using shared client with retry
      const result = await queryLLMWithRetry({
        model: options.model || model,
        system,
        prompt,
        temperature: options.temperature || temperature,
        json,
        traceId,
        operation: `agent:${name}`,
      });

      // Parse output
      const output = json ? outputParser(result.content) : result.content;

      const timing = Date.now() - startTime;
      logger.debug('Agent completed', { name, timing, cost: result.cost, traceId });

      return {
        ...output,
        _meta: {
          agent: name,
          model: result.model,
          tokens: result.tokens,
          cost: result.cost,
          timing,
          traceId,
        },
      };
    },

    /**
     * Estimate cost for running this agent
     * @param {object} inputs - Agent inputs
     * @returns {number} Estimated cost in USD
     */
    estimateCost(inputs) {
      // Build the prompt to get accurate length
      const prompt = typeof promptTemplate === 'function'
        ? promptTemplate(inputs)
        : promptTemplate;

      const system = typeof systemPrompt === 'function'
        ? systemPrompt(inputs)
        : (systemPrompt || '');

      const inputTokens = estimateTokens(prompt + system);
      const outputTokens = 500; // Assume ~500 tokens output

      return estimateCost(model, inputTokens, outputTokens);
    },
  };
}

/**
 * Validate agent output against expected schema
 *
 * @param {object} output - Agent output
 * @param {object} schema - Expected schema (simple key: type mapping)
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateOutput(output, schema) {
  const errors = [];

  for (const [key, expectedType] of Object.entries(schema)) {
    if (!(key in output)) {
      errors.push(`Missing required field: ${key}`);
      continue;
    }

    const actualType = Array.isArray(output[key]) ? 'array' : typeof output[key];
    if (actualType !== expectedType) {
      errors.push(`Field '${key}' expected ${expectedType}, got ${actualType}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge multiple agent outputs into a combined result
 *
 * @param {object[]} outputs - Array of agent outputs
 * @param {object} [options] - Merge options
 * @returns {object} Merged output
 */
export function mergeOutputs(outputs, options = {}) {
  const { excludeMeta = true } = options;

  const merged = {};

  for (const output of outputs) {
    for (const [key, value] of Object.entries(output)) {
      if (excludeMeta && key === '_meta') continue;

      if (key in merged) {
        // Merge arrays
        if (Array.isArray(merged[key]) && Array.isArray(value)) {
          merged[key] = [...merged[key], ...value];
        }
        // Merge objects
        else if (typeof merged[key] === 'object' && typeof value === 'object') {
          merged[key] = { ...merged[key], ...value };
        }
        // Overwrite primitives
        else {
          merged[key] = value;
        }
      } else {
        merged[key] = value;
      }
    }
  }

  return merged;
}

export default {
  createAgent,
  validateOutput,
  mergeOutputs,
  queryLLM,
  queryLLMWithRetry,
  parseJSON,
  estimateTokens,
  estimateCost,
  resolveModel,
  MODEL_ALIASES,
  MODELS,
};
