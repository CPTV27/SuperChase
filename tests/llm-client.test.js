/**
 * LLM Client Tests
 *
 * Tests for the unified LLM client module.
 *
 * @module tests/llm-client
 */

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  resolveModel,
  estimateTokens,
  estimateCost,
  parseJSON,
  MODEL_ALIASES,
} from '../lib/llm-client.js';

// ============================================
// Model Resolution Tests
// ============================================

describe('LLM Client', () => {
  describe('resolveModel()', () => {
    it('should resolve alias to full model ID', () => {
      assert.strictEqual(resolveModel('gpt-4o'), 'openai/gpt-4o');
      assert.strictEqual(resolveModel('claude-sonnet'), 'anthropic/claude-3.5-sonnet');
      assert.strictEqual(resolveModel('gemini-flash'), 'google/gemini-2.0-flash-exp');
    });

    it('should return full ID unchanged', () => {
      assert.strictEqual(resolveModel('openai/gpt-4o'), 'openai/gpt-4o');
      assert.strictEqual(resolveModel('anthropic/claude-3.5-sonnet'), 'anthropic/claude-3.5-sonnet');
    });

    it('should prefix unrecognized models with openai/', () => {
      assert.strictEqual(resolveModel('unknown-model'), 'openai/unknown-model');
    });
  });

  // ============================================
  // Token Estimation Tests
  // ============================================

  describe('estimateTokens()', () => {
    it('should estimate tokens from text length', () => {
      // ~4 chars per token
      assert.strictEqual(estimateTokens('a'.repeat(100)), 25);
      assert.strictEqual(estimateTokens('a'.repeat(400)), 100);
    });

    it('should handle empty input', () => {
      assert.strictEqual(estimateTokens(''), 0);
      assert.strictEqual(estimateTokens(null), 0);
      assert.strictEqual(estimateTokens(undefined), 0);
    });

    it('should round up', () => {
      assert.strictEqual(estimateTokens('abc'), 1); // 3/4 = 0.75 -> 1
    });
  });

  // ============================================
  // Cost Estimation Tests
  // ============================================

  describe('estimateCost()', () => {
    it('should calculate cost based on tokens', () => {
      const cost = estimateCost('gpt-4o', 1000, 500);
      assert.ok(cost > 0, 'Cost should be positive');
      assert.ok(cost < 1, 'Cost should be reasonable');
    });

    it('should handle zero tokens', () => {
      const cost = estimateCost('gpt-4o', 0, 0);
      assert.strictEqual(cost, 0);
    });

    it('should handle unknown models with default pricing', () => {
      const cost = estimateCost('unknown/model', 1000, 500);
      assert.ok(cost > 0, 'Should use default pricing');
    });
  });

  // ============================================
  // JSON Parsing Tests
  // ============================================

  describe('parseJSON()', () => {
    it('should parse raw JSON', () => {
      const result = parseJSON('{"key": "value"}');
      assert.deepStrictEqual(result, { key: 'value' });
    });

    it('should parse JSON from markdown code block', () => {
      const result = parseJSON('```json\n{"key": "value"}\n```');
      assert.deepStrictEqual(result, { key: 'value' });
    });

    it('should parse JSON from generic code block', () => {
      const result = parseJSON('```\n{"key": "value"}\n```');
      assert.deepStrictEqual(result, { key: 'value' });
    });

    it('should extract JSON object from mixed text', () => {
      const result = parseJSON('Here is the result: {"key": "value"} That was it.');
      assert.deepStrictEqual(result, { key: 'value' });
    });

    it('should parse JSON arrays', () => {
      const result = parseJSON('The array is: [1, 2, 3]');
      assert.deepStrictEqual(result, [1, 2, 3]);
    });

    it('should throw on invalid JSON', () => {
      assert.throws(() => parseJSON('not json at all'), /Could not parse JSON/);
    });

    it('should throw on empty input', () => {
      assert.throws(() => parseJSON(''), /Empty response/);
    });

    it('should handle nested objects', () => {
      const result = parseJSON('{"outer": {"inner": "value"}}');
      assert.deepStrictEqual(result, { outer: { inner: 'value' } });
    });
  });

  // ============================================
  // Model Aliases Tests
  // ============================================

  describe('MODEL_ALIASES', () => {
    it('should have OpenAI models', () => {
      assert.ok('gpt-4o' in MODEL_ALIASES);
      assert.ok('gpt-4o-mini' in MODEL_ALIASES);
    });

    it('should have Anthropic models', () => {
      assert.ok('claude-sonnet' in MODEL_ALIASES);
      assert.ok('claude-haiku' in MODEL_ALIASES);
    });

    it('should have Google models', () => {
      assert.ok('gemini-flash' in MODEL_ALIASES);
      assert.ok('gemini-pro' in MODEL_ALIASES);
    });

    it('should have all aliases pointing to valid model IDs', () => {
      for (const [alias, modelId] of Object.entries(MODEL_ALIASES)) {
        assert.ok(modelId.includes('/'), `${alias} should map to provider/model format`);
      }
    });
  });
});
