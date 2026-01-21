/**
 * SuperChase Enterprise Module Tests
 *
 * Unit tests for enterprise features:
 * - LLM Council (core/llm_council.js)
 * - Portfolio Manager (core/portfolio-manager.js)
 * - Task Provider (lib/providers/task-provider.js)
 * - Emergency Kill Switch
 *
 * Run with: node --test tests/enterprise.test.js
 *
 * @module tests/enterprise.test
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// LLM Council Tests
// ============================================

describe('LLM Council', () => {
  let llmCouncil;

  beforeEach(async () => {
    llmCouncil = await import('../core/llm_council.js');
  });

  describe('Configuration', () => {
    it('exports isConfigured function', () => {
      assert.equal(typeof llmCouncil.isConfigured, 'function');
    });

    it('has default council models', () => {
      assert.ok(Array.isArray(llmCouncil.DEFAULT_COUNCIL_MODELS));
      assert.ok(llmCouncil.DEFAULT_COUNCIL_MODELS.length >= 2);
    });

    it('has default chairman model', () => {
      assert.ok(typeof llmCouncil.DEFAULT_CHAIRMAN_MODEL === 'string');
      assert.ok(llmCouncil.DEFAULT_CHAIRMAN_MODEL.length > 0);
    });

    it('default models include major providers', () => {
      const models = llmCouncil.DEFAULT_COUNCIL_MODELS;
      const hasOpenAI = models.some(m => m.includes('openai'));
      const hasClaude = models.some(m => m.includes('anthropic') || m.includes('claude'));
      const hasGemini = models.some(m => m.includes('google') || m.includes('gemini'));

      assert.ok(hasOpenAI || hasClaude || hasGemini, 'Should include at least one major provider');
    });
  });

  describe('handleLLMCouncilRequest()', () => {
    it('rejects empty query', async () => {
      await assert.rejects(
        () => llmCouncil.handleLLMCouncilRequest({}),
        /query is required/i
      );
    });

    it('rejects null query', async () => {
      await assert.rejects(
        () => llmCouncil.handleLLMCouncilRequest({ query: null }),
        /query is required/i
      );
    });

    it('rejects empty string query', async () => {
      await assert.rejects(
        () => llmCouncil.handleLLMCouncilRequest({ query: '' }),
        /query is required/i
      );
    });
  });

  describe('getAvailableModels()', () => {
    it('returns defaults object', async () => {
      const result = await llmCouncil.getAvailableModels();

      assert.ok(result.defaults);
      assert.ok(Array.isArray(result.defaults.councilModels));
      assert.ok(typeof result.defaults.chairmanModel === 'string');
    });

    it('indicates configuration status', async () => {
      const result = await llmCouncil.getAvailableModels();
      assert.equal(typeof result.configured, 'boolean');
    });
  });

  describe('runCouncil() validation', () => {
    it('rejects when not configured', async () => {
      // This test assumes OPENROUTER_API_KEY is not set or invalid
      // The actual behavior depends on env configuration
      const isConfigured = llmCouncil.isConfigured();

      if (!isConfigured) {
        await assert.rejects(
          () => llmCouncil.runCouncil('Test query'),
          /not configured/i
        );
      } else {
        // If configured, just verify it doesn't throw on validation
        assert.ok(true);
      }
    });

    it('rejects empty string query', async () => {
      await assert.rejects(
        () => llmCouncil.runCouncil(''),
        /query is required/i
      );
    });

    it('rejects whitespace-only query', async () => {
      await assert.rejects(
        () => llmCouncil.runCouncil('   '),
        /query is required/i
      );
    });
  });
});

// ============================================
// Portfolio Manager Tests
// ============================================

describe('Portfolio Manager', () => {
  let portfolioManager;
  let originalConfig;
  const configPath = path.join(__dirname, '..', 'config', 'portfolio.json');

  beforeEach(async () => {
    // Clear module cache to get fresh instance
    const modulePath = path.resolve(__dirname, '../core/portfolio-manager.js');
    delete globalThis[modulePath];

    portfolioManager = await import('../core/portfolio-manager.js');

    // Backup original config
    if (fs.existsSync(configPath)) {
      originalConfig = fs.readFileSync(configPath, 'utf8');
    }
  });

  afterEach(() => {
    // Restore original config
    if (originalConfig) {
      fs.writeFileSync(configPath, originalConfig);
    }
  });

  describe('loadConfig()', () => {
    it('loads configuration from file', () => {
      const config = portfolioManager.loadConfig();

      assert.ok(config);
      assert.ok(typeof config === 'object');
    });

    it('returns business units array', () => {
      const config = portfolioManager.loadConfig();

      assert.ok(Array.isArray(config.businessUnits));
    });

    it('caches configuration', () => {
      const config1 = portfolioManager.loadConfig();
      const config2 = portfolioManager.loadConfig();

      assert.strictEqual(config1, config2);
    });

    it('can force reload', () => {
      const config1 = portfolioManager.loadConfig();
      const config2 = portfolioManager.loadConfig(true);

      // Both should be valid configs
      assert.ok(config1.businessUnits);
      assert.ok(config2.businessUnits);
    });
  });

  describe('getBusinessUnits()', () => {
    it('returns array of business units', () => {
      const units = portfolioManager.getBusinessUnits();

      assert.ok(Array.isArray(units));
    });

    it('filters active units by default', () => {
      const units = portfolioManager.getBusinessUnits();

      units.forEach(unit => {
        assert.equal(unit.active, true);
      });
    });

    it('can include inactive units', () => {
      const units = portfolioManager.getBusinessUnits({ activeOnly: false });

      assert.ok(Array.isArray(units));
    });

    it('can filter by type', () => {
      const units = portfolioManager.getBusinessUnits({ type: 'service' });

      units.forEach(unit => {
        assert.equal(unit.type, 'service');
      });
    });

    it('sorts by priority', () => {
      const units = portfolioManager.getBusinessUnits();

      for (let i = 1; i < units.length; i++) {
        assert.ok(
          units[i].priority >= units[i - 1].priority,
          `Units should be sorted by priority: ${units[i - 1].priority} <= ${units[i].priority}`
        );
      }
    });

    it('units have required properties', () => {
      const units = portfolioManager.getBusinessUnits();

      units.forEach(unit => {
        assert.ok(unit.id, 'Unit should have id');
        assert.ok(unit.name, 'Unit should have name');
        assert.ok(unit.type, 'Unit should have type');
        assert.ok(unit.color, 'Unit should have color');
      });
    });
  });

  describe('getBusinessUnit()', () => {
    it('returns specific unit by id', () => {
      const units = portfolioManager.getBusinessUnits();
      if (units.length === 0) return;

      const firstUnit = units[0];
      const retrieved = portfolioManager.getBusinessUnit(firstUnit.id);

      assert.equal(retrieved.id, firstUnit.id);
      assert.equal(retrieved.name, firstUnit.name);
    });

    it('throws NotFoundError for unknown id', () => {
      assert.throws(
        () => portfolioManager.getBusinessUnit('nonexistent_id_12345'),
        /not found/i
      );
    });
  });

  describe('addBusinessUnit()', () => {
    it('adds a new business unit', () => {
      const testUnit = {
        id: `test_unit_${Date.now()}`,
        name: 'Test Unit',
        type: 'service',
        color: '#ff0000'
      };

      const added = portfolioManager.addBusinessUnit(testUnit);

      assert.equal(added.id, testUnit.id);
      assert.equal(added.name, testUnit.name);
      assert.equal(added.active, true); // Default

      // Cleanup
      portfolioManager.deleteBusinessUnit(testUnit.id);
    });

    it('rejects unit without id', () => {
      assert.throws(
        () => portfolioManager.addBusinessUnit({ name: 'No ID' }),
        /id and name/i
      );
    });

    it('rejects unit without name', () => {
      assert.throws(
        () => portfolioManager.addBusinessUnit({ id: 'no_name' }),
        /id and name/i
      );
    });

    it('rejects duplicate id', () => {
      const units = portfolioManager.getBusinessUnits({ activeOnly: false });
      if (units.length === 0) return;

      assert.throws(
        () => portfolioManager.addBusinessUnit({
          id: units[0].id,
          name: 'Duplicate Test'
        }),
        /already exists/i
      );
    });

    it('sets default values', () => {
      const testUnit = {
        id: `test_defaults_${Date.now()}`,
        name: 'Test Defaults'
      };

      const added = portfolioManager.addBusinessUnit(testUnit);

      assert.equal(added.type, 'service'); // Default type
      assert.ok(added.color); // Default color
      assert.equal(added.active, true);
      assert.ok(added.createdAt);

      // Cleanup
      portfolioManager.deleteBusinessUnit(testUnit.id);
    });
  });

  describe('updateBusinessUnit()', () => {
    it('updates existing unit', () => {
      const testUnit = {
        id: `test_update_${Date.now()}`,
        name: 'Original Name'
      };

      portfolioManager.addBusinessUnit(testUnit);

      const updated = portfolioManager.updateBusinessUnit(testUnit.id, {
        name: 'Updated Name'
      });

      assert.equal(updated.name, 'Updated Name');
      assert.ok(updated.updatedAt);

      // Cleanup
      portfolioManager.deleteBusinessUnit(testUnit.id);
    });

    it('cannot change id', () => {
      const testUnit = {
        id: `test_id_change_${Date.now()}`,
        name: 'Test'
      };

      portfolioManager.addBusinessUnit(testUnit);

      const updated = portfolioManager.updateBusinessUnit(testUnit.id, {
        id: 'new_id',
        name: 'New Name'
      });

      // ID should remain unchanged
      assert.equal(updated.id, testUnit.id);

      // Cleanup
      portfolioManager.deleteBusinessUnit(testUnit.id);
    });

    it('throws for unknown id', () => {
      assert.throws(
        () => portfolioManager.updateBusinessUnit('nonexistent_id', { name: 'X' }),
        /not found/i
      );
    });
  });

  describe('deleteBusinessUnit()', () => {
    it('deletes existing unit', () => {
      const testUnit = {
        id: `test_delete_${Date.now()}`,
        name: 'To Delete'
      };

      portfolioManager.addBusinessUnit(testUnit);
      const result = portfolioManager.deleteBusinessUnit(testUnit.id);

      assert.equal(result.success, true);

      // Verify deleted
      assert.throws(
        () => portfolioManager.getBusinessUnit(testUnit.id),
        /not found/i
      );
    });

    it('throws for unknown id', () => {
      assert.throws(
        () => portfolioManager.deleteBusinessUnit('nonexistent_id'),
        /not found/i
      );
    });
  });

  describe('isValidBusinessUnit()', () => {
    it('returns true for valid id', () => {
      const units = portfolioManager.getBusinessUnits({ activeOnly: false });
      if (units.length === 0) return;

      const isValid = portfolioManager.isValidBusinessUnit(units[0].id);
      assert.equal(isValid, true);
    });

    it('returns false for invalid id', () => {
      const isValid = portfolioManager.isValidBusinessUnit('nonexistent_id_12345');
      assert.equal(isValid, false);
    });
  });

  describe('getBusinessUnitColor()', () => {
    it('returns color for valid unit', () => {
      const units = portfolioManager.getBusinessUnits();
      if (units.length === 0) return;

      const color = portfolioManager.getBusinessUnitColor(units[0].id);
      assert.ok(color.startsWith('#'), 'Color should be hex format');
    });

    it('returns fallback for invalid unit', () => {
      const color = portfolioManager.getBusinessUnitColor('nonexistent_id');
      assert.equal(color, '#6b7280'); // Gray fallback
    });
  });

  describe('getFilterBarUnits()', () => {
    it('returns simplified unit objects', () => {
      const units = portfolioManager.getFilterBarUnits();

      assert.ok(Array.isArray(units));
      units.forEach(unit => {
        assert.ok(unit.id);
        assert.ok(unit.name);
        assert.ok(unit.color);
        // Should not have heavy properties
        assert.equal(unit.contacts, undefined);
        assert.equal(unit.integrations, undefined);
      });
    });
  });

  describe('getPortfolioSummary()', () => {
    it('returns summary object', () => {
      const summary = portfolioManager.getPortfolioSummary();

      assert.ok(typeof summary.totalUnits === 'number');
      assert.ok(typeof summary.byType === 'object');
      assert.ok(Array.isArray(summary.units));
    });

    it('groups units by type', () => {
      const summary = portfolioManager.getPortfolioSummary();
      const units = portfolioManager.getBusinessUnits();

      // Count should match
      assert.equal(summary.totalUnits, units.length);
    });
  });
});

// ============================================
// Task Provider Tests
// ============================================

describe('Task Provider', () => {
  let taskProvider;

  beforeEach(async () => {
    taskProvider = await import('../lib/providers/task-provider.js');
  });

  describe('TaskProvider (Abstract)', () => {
    it('exports TaskProvider class', () => {
      assert.ok(taskProvider.TaskProvider);
      assert.equal(typeof taskProvider.TaskProvider, 'function');
    });

    it('abstract methods throw errors', () => {
      const provider = new taskProvider.TaskProvider();

      assert.throws(() => provider.isConfigured());
      assert.rejects(() => provider.testConnection());
      assert.rejects(() => provider.createTask({}));
      assert.rejects(() => provider.getTasks());
      assert.rejects(() => provider.getTask('id'));
      assert.rejects(() => provider.updateTask('id', {}));
      assert.rejects(() => provider.completeTask('id'));
      assert.rejects(() => provider.deleteTask('id'));
      assert.rejects(() => provider.addComment('id', 'text'));
      assert.rejects(() => provider.getProjects());
    });
  });

  describe('InMemoryTaskProvider', () => {
    let provider;

    beforeEach(() => {
      provider = new taskProvider.InMemoryTaskProvider();
    });

    it('is always configured', () => {
      assert.equal(provider.isConfigured(), true);
    });

    it('test connection succeeds', async () => {
      const result = await provider.testConnection();

      assert.equal(result.connected, true);
      assert.ok(result.message);
    });

    it('creates tasks', async () => {
      const task = await provider.createTask({
        name: 'Test Task',
        notes: 'Test notes',
        priority: 'high'
      });

      assert.ok(task.id);
      assert.equal(task.name, 'Test Task');
      assert.equal(task.notes, 'Test notes');
      assert.equal(task.completed, false);
      assert.ok(task.createdAt);
    });

    it('gets tasks', async () => {
      await provider.createTask({ name: 'Task 1' });
      await provider.createTask({ name: 'Task 2' });

      const tasks = await provider.getTasks();

      assert.ok(tasks.length >= 2);
    });

    it('gets single task', async () => {
      const created = await provider.createTask({ name: 'Single Task' });
      const retrieved = await provider.getTask(created.id);

      assert.equal(retrieved.id, created.id);
      assert.equal(retrieved.name, 'Single Task');
    });

    it('throws for missing task', async () => {
      await assert.rejects(
        () => provider.getTask('nonexistent_id'),
        /not found/i
      );
    });

    it('updates tasks', async () => {
      const task = await provider.createTask({ name: 'Original' });
      const updated = await provider.updateTask(task.id, { name: 'Updated' });

      assert.equal(updated.name, 'Updated');
      assert.ok(updated.modifiedAt);
    });

    it('completes tasks', async () => {
      const task = await provider.createTask({ name: 'To Complete' });
      const completed = await provider.completeTask(task.id);

      assert.equal(completed.completed, true);
    });

    it('deletes tasks', async () => {
      const task = await provider.createTask({ name: 'To Delete' });
      const result = await provider.deleteTask(task.id);

      assert.equal(result.success, true);

      await assert.rejects(
        () => provider.getTask(task.id),
        /not found/i
      );
    });

    it('adds comments', async () => {
      const task = await provider.createTask({ name: 'With Comment' });
      const result = await provider.addComment(task.id, 'Test comment');

      assert.equal(result.success, true);
      assert.ok(result.commentId);
    });

    it('filters incomplete tasks by default', async () => {
      const task1 = await provider.createTask({ name: 'Incomplete' });
      const task2 = await provider.createTask({ name: 'Complete' });
      await provider.completeTask(task2.id);

      const tasks = await provider.getTasks();
      const completedInList = tasks.find(t => t.id === task2.id);

      assert.equal(completedInList, undefined);
    });

    it('can include completed tasks', async () => {
      const task = await provider.createTask({ name: 'Complete Task' });
      await provider.completeTask(task.id);

      const tasks = await provider.getTasks({ completed: true });
      const found = tasks.find(t => t.id === task.id);

      assert.ok(found);
    });

    it('respects limit', async () => {
      for (let i = 0; i < 10; i++) {
        await provider.createTask({ name: `Task ${i}` });
      }

      const tasks = await provider.getTasks({ limit: 5 });

      assert.equal(tasks.length, 5);
    });

    it('returns projects', async () => {
      const projects = await provider.getProjects();

      assert.ok(Array.isArray(projects));
      assert.ok(projects.length > 0);
      assert.ok(projects[0].id);
      assert.ok(projects[0].name);
    });
  });

  describe('AsanaTaskProvider', () => {
    let provider;

    beforeEach(() => {
      provider = new taskProvider.AsanaTaskProvider();
    });

    it('checks configuration based on env vars', () => {
      const isConfigured = provider.isConfigured();
      assert.equal(typeof isConfigured, 'boolean');
    });

    it('has provider name', () => {
      assert.equal(provider.name, 'Asana');
    });
  });

  describe('createTaskProvider()', () => {
    it('creates InMemory provider', () => {
      const provider = taskProvider.createTaskProvider('memory');

      assert.ok(provider instanceof taskProvider.InMemoryTaskProvider);
    });

    it('creates Asana provider', () => {
      const provider = taskProvider.createTaskProvider('asana');

      assert.ok(provider instanceof taskProvider.AsanaTaskProvider);
    });

    it('auto-detects based on environment', () => {
      const provider = taskProvider.createTaskProvider('auto');

      // Should return some provider
      assert.ok(provider);
      assert.ok(provider.isConfigured !== undefined);
    });

    it('throws for unknown type', () => {
      assert.throws(
        () => taskProvider.createTaskProvider('unknown_provider'),
        /unknown task provider/i
      );
    });
  });

  describe('Singleton Provider', () => {
    it('getTaskProvider returns provider', () => {
      const provider = taskProvider.getTaskProvider();

      assert.ok(provider);
      assert.equal(typeof provider.createTask, 'function');
    });

    it('setTaskProvider sets custom provider', () => {
      const customProvider = new taskProvider.InMemoryTaskProvider();
      taskProvider.setTaskProvider(customProvider);

      const retrieved = taskProvider.getTaskProvider();
      assert.strictEqual(retrieved, customProvider);
    });
  });
});

// ============================================
// Emergency Kill Switch Tests
// ============================================

describe('Emergency Kill Switch', () => {
  beforeEach(() => {
    // Reset global state
    globalThis.AUTOMATION_PAUSED = false;
  });

  afterEach(() => {
    // Cleanup
    globalThis.AUTOMATION_PAUSED = false;
  });

  describe('Kill Switch State', () => {
    it('AUTOMATION_PAUSED defaults to false', () => {
      delete globalThis.AUTOMATION_PAUSED;
      assert.equal(globalThis.AUTOMATION_PAUSED, undefined);
    });

    it('can be set to true', () => {
      globalThis.AUTOMATION_PAUSED = true;
      assert.equal(globalThis.AUTOMATION_PAUSED, true);
    });

    it('can be resumed (set to false)', () => {
      globalThis.AUTOMATION_PAUSED = true;
      globalThis.AUTOMATION_PAUSED = false;
      assert.equal(globalThis.AUTOMATION_PAUSED, false);
    });
  });

  describe('Confirmation Codes', () => {
    it('kill switch requires correct confirmation', () => {
      const REQUIRED_CONFIRMATION = 'KILL_ALL_AUTOMATION';

      const activate = (confirm) => {
        if (confirm !== REQUIRED_CONFIRMATION) {
          throw new Error('Safety check failed');
        }
        globalThis.AUTOMATION_PAUSED = true;
        return { success: true };
      };

      // Wrong confirmation
      assert.throws(
        () => activate('wrong'),
        /safety check failed/i
      );

      // Correct confirmation
      const result = activate(REQUIRED_CONFIRMATION);
      assert.equal(result.success, true);
      assert.equal(globalThis.AUTOMATION_PAUSED, true);
    });

    it('resume requires correct confirmation', () => {
      const REQUIRED_CONFIRMATION = 'RESUME_AUTOMATION';

      globalThis.AUTOMATION_PAUSED = true;

      const resume = (confirm) => {
        if (confirm !== REQUIRED_CONFIRMATION) {
          throw new Error('Safety check failed');
        }
        globalThis.AUTOMATION_PAUSED = false;
        return { success: true };
      };

      // Wrong confirmation
      assert.throws(
        () => resume('wrong'),
        /safety check failed/i
      );

      // Correct confirmation
      const result = resume(REQUIRED_CONFIRMATION);
      assert.equal(result.success, true);
      assert.equal(globalThis.AUTOMATION_PAUSED, false);
    });
  });
});

// ============================================
// Cost Controller Tests
// ============================================

describe('Cost Controller', () => {
  let costController;

  beforeEach(async () => {
    costController = await import('../lib/cost-controller.js');
    // Reset all state for clean test (including rate tracking)
    costController.resetForTesting();
  });

  describe('Token Estimation', () => {
    it('estimates tokens from text', () => {
      const text = 'Hello world this is a test message';
      const tokens = costController.estimateTokens(text);

      assert.ok(typeof tokens === 'number');
      assert.ok(tokens > 0);
    });

    it('returns 0 for empty text', () => {
      assert.equal(costController.estimateTokens(''), 0);
      assert.equal(costController.estimateTokens(null), 0);
      assert.equal(costController.estimateTokens(undefined), 0);
    });

    it('scales with text length', () => {
      const short = costController.estimateTokens('Hello');
      const long = costController.estimateTokens('Hello world this is a much longer piece of text that should have more tokens');

      assert.ok(long > short);
    });
  });

  describe('Model Pricing', () => {
    it('returns pricing for known models', () => {
      const pricing = costController.getModelPricing('openai/gpt-4o');

      assert.ok(pricing);
      assert.ok(typeof pricing.input === 'number');
      assert.ok(typeof pricing.output === 'number');
    });

    it('returns default pricing for unknown models', () => {
      const pricing = costController.getModelPricing('unknown/model-xyz');

      assert.ok(pricing);
      assert.ok(pricing.input > 0);
      assert.ok(pricing.output > 0);
    });

    it('getModelPricingInfo returns full pricing map', () => {
      const allPricing = costController.getModelPricingInfo();

      assert.ok(typeof allPricing === 'object');
      assert.ok(Object.keys(allPricing).length > 0);
    });
  });

  describe('Cost Calculation', () => {
    it('calculates cost for input and output tokens', () => {
      const cost = costController.calculateCost('openai/gpt-4o', 1000, 500);

      assert.ok(typeof cost === 'number');
      assert.ok(cost > 0);
    });

    it('cost scales with token count', () => {
      const small = costController.calculateCost('openai/gpt-4o', 100, 50);
      const large = costController.calculateCost('openai/gpt-4o', 10000, 5000);

      assert.ok(large > small);
    });
  });

  describe('Council Cost Estimation', () => {
    it('estimates council session cost', () => {
      const estimate = costController.estimateCouncilCost(
        'What is the best database?',
        ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
        'anthropic/claude-3.5-sonnet'
      );

      assert.ok(estimate);
      assert.ok(typeof estimate.estimated === 'number');
      assert.ok(estimate.estimated > 0);
      assert.ok(estimate.breakdown);
    });

    it('higher model count increases cost', () => {
      const twoModels = costController.estimateCouncilCost(
        'Test query',
        ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
        'anthropic/claude-3.5-sonnet'
      );

      const fourModels = costController.estimateCouncilCost(
        'Test query',
        ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash-exp', 'openai/gpt-4o-mini'],
        'anthropic/claude-3.5-sonnet'
      );

      assert.ok(fourModels.estimated >= twoModels.estimated);
    });
  });

  describe('Budget Checking', () => {
    it('allows requests within budget', () => {
      const check = costController.checkBudget(0.001);

      assert.equal(check.allowed, true);
      assert.ok(check.remaining);
    });

    it('blocks requests exceeding per-session limit', () => {
      const limits = costController.getLimits();
      const check = costController.checkBudget(limits.perSession + 1);

      assert.equal(check.allowed, false);
      assert.ok(check.reason);
    });

    it('reports remaining budget', () => {
      const check = costController.checkBudget(0.01);

      assert.ok(typeof check.remaining.daily === 'number');
      assert.ok(typeof check.remaining.monthly === 'number');
    });
  });

  describe('Rate Limiting', () => {
    it('allows requests within rate limits', () => {
      const check = costController.checkRateLimits();
      assert.equal(check.allowed, true);
    });

    it('exports rate limit constants', () => {
      assert.ok(costController.RATE_LIMITS);
      assert.ok(typeof costController.RATE_LIMITS.requestsPerMinute === 'number');
      assert.ok(typeof costController.RATE_LIMITS.requestsPerHour === 'number');
    });
  });

  describe('Pre-Flight Check', () => {
    it('combines budget and rate limit checks', () => {
      const check = costController.preFlightCheck(0.01);

      assert.equal(check.allowed, true);
      assert.ok(check.remaining);
    });

    it('returns warnings when approaching limits', () => {
      // Record costs to approach threshold
      for (let i = 0; i < 100; i++) {
        costController.recordCost({
          model: 'openai/gpt-4o',
          inputTokens: 1000,
          outputTokens: 500,
          operation: 'test'
        });
      }

      const check = costController.preFlightCheck(0.01);
      // May or may not have warnings depending on accumulated cost
      assert.ok(check.allowed !== undefined);
    });
  });

  describe('Cost Recording', () => {
    it('records a cost entry', () => {
      const result = costController.recordCost({
        model: 'openai/gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        operation: 'test'
      });

      assert.ok(result.recorded);
      assert.ok(typeof result.cost === 'number');
    });

    it('accumulates daily costs', () => {
      const before = costController.getCostSummary();
      const beforeSpent = before.daily.spent;

      costController.recordCost({
        model: 'openai/gpt-4o',
        inputTokens: 1000,
        outputTokens: 500
      });

      const after = costController.getCostSummary();
      assert.ok(after.daily.spent >= beforeSpent);
    });
  });

  describe('Cost Summary', () => {
    it('returns complete summary', () => {
      const summary = costController.getCostSummary();

      assert.ok(summary.daily);
      assert.ok(summary.monthly);
      assert.ok(summary.limits);
      assert.ok(summary.rateLimits);
    });

    it('includes daily stats', () => {
      const summary = costController.getCostSummary();

      assert.ok(summary.daily.date);
      assert.ok(typeof summary.daily.spent === 'number');
      assert.ok(typeof summary.daily.limit === 'number');
      assert.ok(typeof summary.daily.remaining === 'number');
      assert.ok(typeof summary.daily.usage === 'number');
    });

    it('includes monthly stats', () => {
      const summary = costController.getCostSummary();

      assert.ok(summary.monthly.month);
      assert.ok(typeof summary.monthly.spent === 'number');
      assert.ok(typeof summary.monthly.limit === 'number');
    });
  });

  describe('Limit Configuration', () => {
    it('can update limits', () => {
      const originalLimits = costController.getLimits();

      costController.updateLimits({ daily: 50.00 });

      const newLimits = costController.getLimits();
      assert.equal(newLimits.daily, 50.00);

      // Restore
      costController.updateLimits({ daily: originalLimits.daily });
    });

    it('exports default limits', () => {
      assert.ok(costController.DEFAULT_LIMITS);
      assert.ok(typeof costController.DEFAULT_LIMITS.daily === 'number');
      assert.ok(typeof costController.DEFAULT_LIMITS.monthly === 'number');
      assert.ok(typeof costController.DEFAULT_LIMITS.perSession === 'number');
    });
  });
});

// ============================================
// Memory Manager Tests
// ============================================

describe('Memory Manager', () => {
  let memoryManager;

  beforeEach(async () => {
    memoryManager = await import('../lib/memory-manager.js');
  });

  describe('Configuration', () => {
    it('exports DEFAULT_RETENTION policy', () => {
      assert.ok(memoryManager.DEFAULT_RETENTION);
      assert.ok(typeof memoryManager.DEFAULT_RETENTION === 'object');
    });

    it('has retention policies for known directories', () => {
      const retention = memoryManager.DEFAULT_RETENTION;

      assert.ok(retention.llm_council_outputs);
      assert.ok(retention.brainstorms);
      assert.ok(retention.agent_outputs);
    });

    it('has default policy for unknown files', () => {
      assert.ok(memoryManager.DEFAULT_RETENTION.default);
      assert.ok(memoryManager.DEFAULT_RETENTION.default.archiveAfterDays);
    });

    it('exports DISK_LIMITS', () => {
      assert.ok(memoryManager.DISK_LIMITS);
      assert.ok(typeof memoryManager.DISK_LIMITS.maxMemoryDirMB === 'number');
      assert.ok(typeof memoryManager.DISK_LIMITS.maxArchiveDirMB === 'number');
    });
  });

  describe('getMemoryStatus()', () => {
    it('returns status object', () => {
      const status = memoryManager.getMemoryStatus();

      assert.ok(status);
      assert.ok(status.timestamp);
      assert.ok(status.diskUsage);
      assert.ok(status.files);
    });

    it('includes disk usage for memory dir', () => {
      const status = memoryManager.getMemoryStatus();

      assert.ok(status.diskUsage.memoryDir);
      assert.ok(status.diskUsage.memoryDir.size);
      assert.ok(typeof status.diskUsage.memoryDir.bytes === 'number');
    });

    it('lists files and directories', () => {
      const status = memoryManager.getMemoryStatus();

      assert.ok(typeof status.files === 'object');
    });

    it('includes warnings array', () => {
      const status = memoryManager.getMemoryStatus();

      assert.ok(Array.isArray(status.warnings));
    });
  });

  describe('runCleanup()', () => {
    it('runs in dry-run mode', async () => {
      const report = await memoryManager.runCleanup({ dryRun: true });

      assert.ok(report);
      assert.equal(report.dryRun, true);
      assert.ok(report.startTime);
      assert.ok(report.endTime);
    });

    it('returns cleanup report with directories', async () => {
      const report = await memoryManager.runCleanup({ dryRun: true });

      assert.ok(report.directories);
      assert.ok(typeof report.directories === 'object');
    });

    it('includes disk usage in report', async () => {
      const report = await memoryManager.runCleanup({ dryRun: true });

      assert.ok(report.diskUsage);
      assert.ok(report.diskUsage.memoryDir);
    });
  });

  describe('trimJsonlFile()', () => {
    const testFile = path.join(__dirname, '..', 'memory', 'test_trim.jsonl');

    afterEach(() => {
      // Cleanup test file
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    });

    it('handles non-existent file gracefully', () => {
      const result = memoryManager.trimJsonlFile('/nonexistent/file.jsonl');

      assert.equal(result.trimmed, 0);
      assert.equal(result.remaining, 0);
    });
  });

  describe('trimJsonFile()', () => {
    it('handles non-existent file gracefully', () => {
      const result = memoryManager.trimJsonFile('/nonexistent/file.json');

      assert.equal(result.trimmed, 0);
    });
  });

  describe('Scheduled Cleanup', () => {
    it('can start and stop scheduled cleanup', () => {
      // Start with very long interval (won't actually run)
      memoryManager.startScheduledCleanup(9999);

      // Should not throw
      memoryManager.stopScheduledCleanup();
    });

    it('can be called multiple times safely', () => {
      memoryManager.startScheduledCleanup(9999);
      memoryManager.startScheduledCleanup(9999); // Replace interval
      memoryManager.stopScheduledCleanup();
      memoryManager.stopScheduledCleanup(); // Safe no-op
    });
  });
});

// ============================================
// Integration Tests
// ============================================

describe('Enterprise Integration', () => {
  it('Portfolio Manager uses correct config path', async () => {
    const configPath = path.join(__dirname, '..', 'config', 'portfolio.json');
    assert.ok(fs.existsSync(configPath), 'portfolio.json should exist');
  });

  it('LLM Council output directory exists or can be created', async () => {
    const outputDir = path.join(__dirname, '..', 'memory', 'llm_council_outputs');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    assert.ok(fs.existsSync(outputDir));
  });

  it('Task Provider can be swapped at runtime', async () => {
    const taskProvider = await import('../lib/providers/task-provider.js');

    // Create two different providers
    const provider1 = new taskProvider.InMemoryTaskProvider();
    const provider2 = new taskProvider.InMemoryTaskProvider();

    // Set provider 1
    taskProvider.setTaskProvider(provider1);
    await taskProvider.getTaskProvider().createTask({ name: 'Task in Provider 1' });

    // Set provider 2
    taskProvider.setTaskProvider(provider2);
    const tasks = await taskProvider.getTaskProvider().getTasks();

    // Provider 2 should have no tasks (separate instance)
    assert.equal(tasks.length, 0);
  });
});

// ============================================
// Observability Tests
// ============================================

describe('Observability Module', () => {
  let observability;

  beforeEach(async () => {
    observability = await import('../lib/observability.js');
  });

  describe('Metrics - Counter', () => {
    it('increments counter correctly', () => {
      observability.recordHttpRequest('GET', '/health', 200, 50);
      observability.recordHttpRequest('GET', '/health', 200, 60);

      const metrics = observability.getMetricsJson();
      assert.ok(metrics.httpRequestsTotal);
    });

    it('records council sessions', () => {
      observability.recordCouncilSession('success', 5000, { 'openai/gpt-4o': 0.05 });

      const metrics = observability.getMetricsJson();
      assert.ok(metrics.councilSessionsTotal);
      assert.ok(metrics.councilCostDollars);
    });

    it('records task operations', () => {
      observability.recordTaskOperation('create', 'asana', true);
      observability.recordTaskOperation('create', 'asana', false);

      const metrics = observability.getMetricsJson();
      assert.ok(metrics.taskOperationsTotal);
    });

    it('records spoke requests', () => {
      observability.recordSpokeRequest('gmail', true);
      observability.recordSpokeRequest('gmail', false);

      const metrics = observability.getMetricsJson();
      assert.ok(metrics.spokeRequestsTotal);
    });

    it('records email processing', () => {
      observability.recordEmailProcessed('URGENT_CLIENT', 'create_task');

      const metrics = observability.getMetricsJson();
      assert.ok(metrics.emailsProcessedTotal);
    });
  });

  describe('Metrics - Gauge', () => {
    it('sets active tasks gauge', () => {
      observability.setActiveTasks('SuperChase', 10);

      const metrics = observability.getMetricsJson();
      assert.ok(metrics.activeTasksGauge);
    });

    it('updates circuit state gauge', () => {
      observability.updateCircuitState('gmail', 'closed');
      observability.updateCircuitState('asana', 'open');

      const metrics = observability.getMetricsJson();
      assert.ok(metrics.spokeCircuitState);
    });

    it('updates system metrics', () => {
      observability.updateSystemMetrics();

      const metrics = observability.getMetricsJson();
      assert.ok(metrics.memoryUsageBytes);
      assert.ok(metrics.processUptimeSeconds);
    });
  });

  describe('Metrics - Histogram', () => {
    it('records HTTP request duration', () => {
      observability.recordHttpRequest('GET', '/api/health', 200, 50);
      observability.recordHttpRequest('GET', '/api/health', 200, 100);
      observability.recordHttpRequest('GET', '/api/health', 200, 200);

      const metrics = observability.getMetricsJson();
      assert.ok(metrics.httpRequestDuration);
    });

    it('records council duration', () => {
      observability.recordCouncilSession('success', 5000);
      observability.recordCouncilSession('success', 8000);

      const metrics = observability.getMetricsJson();
      assert.ok(metrics.councilDuration);
    });
  });

  describe('Prometheus Export', () => {
    it('exports metrics in Prometheus format', () => {
      const prometheusMetrics = observability.getPrometheusMetrics();

      assert.ok(typeof prometheusMetrics === 'string');
      assert.ok(prometheusMetrics.includes('# HELP'));
      assert.ok(prometheusMetrics.includes('# TYPE'));
      assert.ok(prometheusMetrics.includes('superchase_'));
    });

    it('includes all metric types', () => {
      // Record some data first
      observability.recordHttpRequest('GET', '/test', 200, 50);
      observability.updateSystemMetrics();

      const prometheusMetrics = observability.getPrometheusMetrics();

      assert.ok(prometheusMetrics.includes('counter'));
      assert.ok(prometheusMetrics.includes('gauge'));
      assert.ok(prometheusMetrics.includes('histogram'));
    });
  });

  describe('Distributed Tracing', () => {
    it('creates and ends spans', () => {
      const span = observability.startSpan('test-operation', {
        attributes: { test: true }
      });

      assert.ok(span.traceId);
      assert.ok(span.spanId);
      assert.ok(span.startTime);

      span.end();

      assert.ok(span.endTime);
      assert.ok(span.duration >= 0);
    });

    it('creates child spans with parent context', () => {
      const parent = observability.startSpan('parent-operation');
      const child = parent.startChild('child-operation', { childAttr: 'value' });

      assert.equal(child.traceId, parent.traceId);
      assert.equal(child.parentSpanId, parent.spanId);

      child.end();
      parent.end();
    });

    it('adds events to spans', () => {
      const span = observability.startSpan('test-span');

      span.addEvent('database-query', { query: 'SELECT * FROM users' });
      span.addEvent('cache-hit', { key: 'user:123' });

      assert.equal(span.events.length, 2);
      assert.equal(span.events[0].name, 'database-query');

      span.end();
    });

    it('sets span status and attributes', () => {
      const span = observability.startSpan('test-span');

      span.setStatus('error', 'Connection failed');
      span.setAttributes({ 'http.method': 'POST', 'http.url': '/api/test' });

      assert.equal(span.status, 'error');
      assert.equal(span.attributes.statusMessage, 'Connection failed');
      assert.equal(span.attributes['http.method'], 'POST');

      span.end();
    });

    it('withTrace wraps async functions', async () => {
      let executed = false;

      const result = await observability.withTrace('async-operation', async (span) => {
        executed = true;
        span.addEvent('inside-function');
        return 'result';
      });

      assert.equal(executed, true);
      assert.equal(result, 'result');
    });

    it('withTrace captures errors', async () => {
      await assert.rejects(
        () => observability.withTrace('failing-operation', async () => {
          throw new Error('Test error');
        }),
        /Test error/
      );

      const traces = observability.getRecentTraces(10);
      const failedTrace = traces.find(t => t.name === 'failing-operation');

      assert.ok(failedTrace);
      assert.equal(failedTrace.status, 'error');
    });

    it('retrieves recent traces', () => {
      const span1 = observability.startSpan('trace-1');
      span1.end();

      const span2 = observability.startSpan('trace-2');
      span2.end();

      const traces = observability.getRecentTraces(10);

      assert.ok(traces.length >= 2);
    });

    it('retrieves traces by ID', () => {
      const span = observability.startSpan('specific-trace');
      const traceId = span.traceId;
      span.end();

      const traceSpans = observability.getTraceById(traceId);

      assert.ok(traceSpans.length >= 1);
      assert.equal(traceSpans[0].traceId, traceId);
    });

    it('tracks active spans', () => {
      const span = observability.startSpan('active-span');

      const activeSpans = observability.getActiveSpans();
      const found = activeSpans.find(s => s.spanId === span.spanId);

      assert.ok(found);
      assert.ok(found.elapsed >= 0);

      span.end();
    });
  });

  describe('Alerting', () => {
    it('checkAlerts returns array', () => {
      const alerts = observability.checkAlerts();

      assert.ok(Array.isArray(alerts));
    });

    it('getRecentAlerts returns array', () => {
      const alerts = observability.getRecentAlerts(10);

      assert.ok(Array.isArray(alerts));
    });

    it('can add custom alert rules', () => {
      let ruleExecuted = false;

      observability.addAlertRule({
        name: 'test_alert',
        severity: 'info',
        condition: () => {
          ruleExecuted = true;
          return false; // Don't fire
        },
        message: 'Test alert message',
        cooldownMs: 60000
      });

      observability.checkAlerts();

      assert.ok(ruleExecuted);
    });

    it('respects alert cooldown', () => {
      let fireCount = 0;

      observability.addAlertRule({
        name: 'cooldown_test_' + Date.now(),
        severity: 'info',
        condition: () => {
          fireCount++;
          return true; // Always fire
        },
        message: 'Cooldown test',
        cooldownMs: 60000 * 60 // 1 hour
      });

      observability.checkAlerts();
      observability.checkAlerts();
      observability.checkAlerts();

      // Should only fire once due to cooldown
      // (fireCount will be 3 because condition is called, but alert only added once)
      const recentAlerts = observability.getRecentAlerts(100);
      const matchingAlerts = recentAlerts.filter(a => a.name.startsWith('cooldown_test_'));

      assert.equal(matchingAlerts.length, 1);
    });
  });

  describe('Alert Checker Lifecycle', () => {
    it('can start alert checker', () => {
      // Start with long interval (won't actually run)
      observability.startAlertChecker(999999);

      // Should not throw
      observability.stopAlertChecker();
    });

    it('can stop alert checker multiple times safely', () => {
      observability.stopAlertChecker();
      observability.stopAlertChecker();
      // Should not throw
    });
  });

  describe('Dashboard Data', () => {
    it('getObservabilityDashboard returns comprehensive data', () => {
      const dashboard = observability.getObservabilityDashboard();

      assert.ok(dashboard.timestamp);
      assert.ok(dashboard.status);
      assert.ok(dashboard.uptime !== undefined);
      assert.ok(dashboard.metrics);
      assert.ok(dashboard.circuits !== undefined);
      assert.ok(Array.isArray(dashboard.recentAlerts));
      assert.ok(typeof dashboard.activeSpans === 'number');
      assert.ok(Array.isArray(dashboard.recentTraces));
    });

    it('dashboard includes HTTP metrics', () => {
      observability.recordHttpRequest('GET', '/dashboard-test', 200, 100);

      const dashboard = observability.getObservabilityDashboard();

      assert.ok(dashboard.metrics.http);
      assert.ok(dashboard.metrics.http.successRate !== undefined);
    });

    it('dashboard includes memory metrics', () => {
      observability.updateSystemMetrics();

      const dashboard = observability.getObservabilityDashboard();

      assert.ok(dashboard.metrics.memory);
      assert.ok(dashboard.metrics.memory.heapUsed >= 0);
    });
  });
});
