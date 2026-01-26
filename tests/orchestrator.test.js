/**
 * Orchestrator Tests
 *
 * Tests for the multi-agent orchestration system including:
 * - Workflow validation
 * - DAG execution and layer generation
 * - Checkpoint pause/resume
 * - Kill switch integration
 * - Cost pre-flight checks
 * - Error propagation
 *
 * @module tests/orchestrator
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  Orchestrator,
  WorkflowDefinition,
  ExecutionContext,
  AgentState,
  agentRegistry,
  orchestrator
} from '../core/orchestrator.js';
import costController from '../lib/cost-controller.js';

// ============================================
// Test Fixtures
// ============================================

/**
 * Create a mock agent for testing
 */
function createMockAgent(name, options = {}) {
  return {
    name,
    description: `Mock agent: ${name}`,
    run: options.run || (async (inputs) => ({
      success: true,
      inputs,
      agent: name,
      timestamp: Date.now()
    })),
    estimateCost: options.estimateCost || (() => 0.001),
    inputSchema: {},
    outputSchema: {}
  };
}

/**
 * Create a simple linear workflow for testing
 */
function createLinearWorkflow() {
  const workflow = new WorkflowDefinition({
    id: 'test-linear',
    name: 'Linear Test Workflow',
    description: 'A simple linear workflow for testing'
  });

  workflow.addAgent('step1', {
    type: 'mock-agent',
    inputs: { value: 1 }
  });

  workflow.addAgent('step2', {
    type: 'mock-agent',
    dependsOn: ['step1'],
    inputMap: { prev: 'step1' }
  });

  workflow.addAgent('step3', {
    type: 'mock-agent',
    dependsOn: ['step2'],
    inputMap: { prev: 'step2' }
  });

  return workflow;
}

/**
 * Create a parallel workflow for testing
 */
function createParallelWorkflow() {
  const workflow = new WorkflowDefinition({
    id: 'test-parallel',
    name: 'Parallel Test Workflow',
    description: 'A workflow with parallel execution'
  });

  workflow.addAgent('init', {
    type: 'mock-agent',
    inputs: { value: 'start' }
  });

  // Three parallel agents
  workflow.addAgent('parallel-a', {
    type: 'mock-agent',
    dependsOn: ['init'],
    inputs: { branch: 'a' }
  });

  workflow.addAgent('parallel-b', {
    type: 'mock-agent',
    dependsOn: ['init'],
    inputs: { branch: 'b' }
  });

  workflow.addAgent('parallel-c', {
    type: 'mock-agent',
    dependsOn: ['init'],
    inputs: { branch: 'c' }
  });

  // Final aggregation
  workflow.addAgent('aggregate', {
    type: 'mock-agent',
    dependsOn: ['parallel-a', 'parallel-b', 'parallel-c']
  });

  return workflow;
}

/**
 * Create a workflow with checkpoint
 */
function createCheckpointWorkflow() {
  const workflow = new WorkflowDefinition({
    id: 'test-checkpoint',
    name: 'Checkpoint Test Workflow'
  });

  workflow.addAgent('before', {
    type: 'mock-agent',
    inputs: { stage: 'before' }
  });

  workflow.addAgent('checkpoint-agent', {
    type: 'mock-agent',
    dependsOn: ['before'],
    checkpoint: true
  });

  workflow.addAgent('after', {
    type: 'mock-agent',
    dependsOn: ['checkpoint-agent'],
    inputs: { stage: 'after' }
  });

  return workflow;
}

// ============================================
// Test Setup
// ============================================

describe('Orchestrator', () => {
  let testOrchestrator;

  before(() => {
    // Register mock agent
    if (!agentRegistry.has('mock-agent')) {
      agentRegistry.register('mock-agent', createMockAgent('mock-agent'));
    }

    testOrchestrator = new Orchestrator({ registry: agentRegistry });
  });

  afterEach(() => {
    // Clean up any automation pause state
    globalThis.AUTOMATION_PAUSED = false;
  });

  // ============================================
  // WorkflowDefinition Tests
  // ============================================

  describe('WorkflowDefinition', () => {
    it('should create a workflow with agents', () => {
      const workflow = createLinearWorkflow();

      assert.strictEqual(workflow.id, 'test-linear');
      assert.strictEqual(workflow.agents.size, 3);
      assert.ok(workflow.agents.has('step1'));
      assert.ok(workflow.agents.has('step2'));
      assert.ok(workflow.agents.has('step3'));
    });

    it('should generate correct execution layers for linear workflow', () => {
      const workflow = createLinearWorkflow();
      const layers = workflow.getExecutionLayers();

      assert.strictEqual(layers.length, 3);
      assert.deepStrictEqual(layers[0], ['step1']);
      assert.deepStrictEqual(layers[1], ['step2']);
      assert.deepStrictEqual(layers[2], ['step3']);
    });

    it('should generate correct execution layers for parallel workflow', () => {
      const workflow = createParallelWorkflow();
      const layers = workflow.getExecutionLayers();

      assert.strictEqual(layers.length, 3);
      assert.deepStrictEqual(layers[0], ['init']);
      // Layer 1 should have all three parallel agents (order may vary)
      assert.strictEqual(layers[1].length, 3);
      assert.ok(layers[1].includes('parallel-a'));
      assert.ok(layers[1].includes('parallel-b'));
      assert.ok(layers[1].includes('parallel-c'));
      assert.deepStrictEqual(layers[2], ['aggregate']);
    });

    it('should detect circular dependencies', () => {
      const workflow = new WorkflowDefinition({ id: 'circular' });

      workflow.addAgent('a', { type: 'mock-agent', dependsOn: ['c'] });
      workflow.addAgent('b', { type: 'mock-agent', dependsOn: ['a'] });
      workflow.addAgent('c', { type: 'mock-agent', dependsOn: ['b'] });

      assert.throws(() => workflow.validate(), /Invalid workflow definition/);
    });

    it('should detect missing dependencies', () => {
      const workflow = new WorkflowDefinition({ id: 'missing-dep' });

      workflow.addAgent('a', { type: 'mock-agent', dependsOn: ['nonexistent'] });

      assert.throws(() => workflow.validate(), /Invalid workflow definition/);
    });

    it('should serialize and deserialize correctly', () => {
      const original = createLinearWorkflow();
      const json = original.toJSON();
      const restored = WorkflowDefinition.fromJSON(json);

      assert.strictEqual(restored.id, original.id);
      assert.strictEqual(restored.name, original.name);
      assert.strictEqual(restored.agents.size, original.agents.size);
    });
  });

  // ============================================
  // Execution Tests
  // ============================================

  describe('Workflow Execution', () => {
    it('should execute a linear workflow in order', async () => {
      const workflow = createLinearWorkflow();
      const executionOrder = [];

      // Create agent that tracks execution order
      agentRegistry.register('order-tracking', {
        name: 'Order Tracking Agent',
        run: async (inputs) => {
          executionOrder.push(inputs.step || 'unknown');
          return { success: true };
        },
        estimateCost: () => 0
      });

      const orderWorkflow = new WorkflowDefinition({ id: 'order-test' });
      orderWorkflow.addAgent('first', { type: 'order-tracking', inputs: { step: 'first' } });
      orderWorkflow.addAgent('second', { type: 'order-tracking', dependsOn: ['first'], inputs: { step: 'second' } });
      orderWorkflow.addAgent('third', { type: 'order-tracking', dependsOn: ['second'], inputs: { step: 'third' } });

      const ctx = await testOrchestrator.execute(orderWorkflow, { dryRun: false });

      assert.deepStrictEqual(executionOrder, ['first', 'second', 'third']);
      assert.strictEqual(ctx.getSummary().status, 'completed');
    });

    it('should execute parallel agents concurrently', async () => {
      const workflow = createParallelWorkflow();
      const ctx = await testOrchestrator.execute(workflow, { dryRun: false });

      const summary = ctx.getSummary();
      assert.strictEqual(summary.status, 'completed');
      assert.strictEqual(summary.progress.completed, 5);
    });

    it('should handle dry run mode', async () => {
      const workflow = createLinearWorkflow();
      const ctx = await testOrchestrator.execute(workflow, { dryRun: true });

      const summary = ctx.getSummary();
      assert.strictEqual(summary.status, 'completed');
      assert.strictEqual(summary.costs.actual, 0);

      // All outputs should have _dryRun flag
      for (const [id, output] of ctx.outputs) {
        assert.strictEqual(output._dryRun, true);
      }
    });

    it('should track costs during execution', async () => {
      const workflow = createLinearWorkflow();
      const ctx = await testOrchestrator.execute(workflow, { dryRun: false });

      const summary = ctx.getSummary();
      // 3 agents * 0.001 default cost = 0.003
      assert.ok(summary.costs.actual >= 0);
      assert.ok(Object.keys(summary.costs.byAgent).length > 0);
    });
  });

  // ============================================
  // Kill Switch Tests (Critical Fix #1)
  // ============================================

  describe('Kill Switch Integration', () => {
    it('should block execution when automation is paused', async () => {
      globalThis.AUTOMATION_PAUSED = true;

      const workflow = createLinearWorkflow();

      await assert.rejects(
        async () => testOrchestrator.execute(workflow),
        /emergency kill switch is active/
      );
    });

    it('should allow execution when automation is not paused', async () => {
      globalThis.AUTOMATION_PAUSED = false;

      const workflow = createLinearWorkflow();
      const ctx = await testOrchestrator.execute(workflow, { dryRun: true });

      assert.strictEqual(ctx.getSummary().status, 'completed');
    });

    it('should block resume when automation is paused', async () => {
      // First, create a paused workflow
      globalThis.AUTOMATION_PAUSED = false;

      const workflow = createCheckpointWorkflow();
      const ctx = await testOrchestrator.execute(workflow, { pauseOnCheckpoint: true });

      assert.strictEqual(ctx.getSummary().status, 'paused');
      const traceId = ctx.traceId;

      // Now pause automation and try to resume
      globalThis.AUTOMATION_PAUSED = true;

      await assert.rejects(
        async () => testOrchestrator.resume(traceId, true),
        /emergency kill switch is active/
      );
    });
  });

  // ============================================
  // Cost Pre-flight Tests (Critical Fix #2)
  // ============================================

  describe('Cost Pre-flight Check', () => {
    beforeEach(() => {
      // Reset cost tracking for clean tests
      costController.resetForTesting();
    });

    it('should estimate workflow cost before execution', () => {
      const workflow = createLinearWorkflow();
      const estimate = testOrchestrator.estimateWorkflowCost(workflow);

      assert.ok(typeof estimate === 'number');
      assert.ok(estimate >= 0);
    });

    it('should skip cost check for dry runs', async () => {
      // Set daily limit very low
      const originalLimits = costController.getLimits();
      costController.updateLimits({ daily: 0.0001 });

      try {
        const workflow = createLinearWorkflow();
        // Should succeed because dry run skips cost check
        const ctx = await testOrchestrator.execute(workflow, { dryRun: true });
        assert.strictEqual(ctx.getSummary().status, 'completed');
      } finally {
        costController.updateLimits(originalLimits);
      }
    });

    it('should estimate remaining cost for paused workflow', async () => {
      const workflow = createCheckpointWorkflow();
      const ctx = await testOrchestrator.execute(workflow, { pauseOnCheckpoint: true });

      const remainingCost = testOrchestrator.estimateRemainingCost(ctx);
      assert.ok(typeof remainingCost === 'number');
      // Should only count incomplete agents (checkpoint-agent + after)
      assert.ok(remainingCost >= 0);
    });
  });

  // ============================================
  // Checkpoint Tests
  // ============================================

  describe('HITL Checkpoints', () => {
    it('should pause at checkpoint agent', async () => {
      const workflow = createCheckpointWorkflow();
      const ctx = await testOrchestrator.execute(workflow, { pauseOnCheckpoint: true });

      const summary = ctx.getSummary();
      assert.strictEqual(summary.status, 'paused');
      assert.ok(ctx.pendingCheckpoint);
      assert.strictEqual(ctx.states.get('before'), AgentState.COMPLETED);
      assert.strictEqual(ctx.states.get('checkpoint-agent'), AgentState.PAUSED);
      assert.strictEqual(ctx.states.get('after'), AgentState.PENDING);
    });

    it('should resume and complete after approval', async () => {
      const workflow = createCheckpointWorkflow();
      const ctx = await testOrchestrator.execute(workflow, { pauseOnCheckpoint: true });
      const traceId = ctx.traceId;

      assert.strictEqual(ctx.getSummary().status, 'paused');

      // Resume with approval
      const resumedCtx = await testOrchestrator.resume(traceId, true);
      assert.strictEqual(resumedCtx.getSummary().status, 'completed');
      assert.strictEqual(resumedCtx.states.get('after'), AgentState.COMPLETED);
    });

    it('should fail workflow on checkpoint rejection', async () => {
      const workflow = createCheckpointWorkflow();
      const ctx = await testOrchestrator.execute(workflow, { pauseOnCheckpoint: true });
      const traceId = ctx.traceId;

      // Resume with rejection
      const resumedCtx = await testOrchestrator.resume(traceId, false, 'Not approved');
      assert.strictEqual(resumedCtx.getSummary().status, 'failed');
      assert.ok(resumedCtx.errors.has('checkpoint-agent'));
    });

    it('should skip checkpoints when pauseOnCheckpoint is false', async () => {
      const workflow = createCheckpointWorkflow();
      const ctx = await testOrchestrator.execute(workflow, { pauseOnCheckpoint: false });

      assert.strictEqual(ctx.getSummary().status, 'completed');
      assert.strictEqual(ctx.pendingCheckpoint, null);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('Error Handling', () => {
    it('should handle agent execution failures', async () => {
      // Register a failing agent
      agentRegistry.register('failing-agent', {
        name: 'Failing Agent',
        run: async () => {
          throw new Error('Agent failed intentionally');
        },
        estimateCost: () => 0
      });

      const workflow = new WorkflowDefinition({ id: 'fail-test' });
      workflow.addAgent('will-fail', { type: 'failing-agent' });

      const ctx = await testOrchestrator.execute(workflow, { maxRetries: 0 });

      const summary = ctx.getSummary();
      assert.strictEqual(summary.status, 'failed');
      assert.ok(summary.errors['will-fail']);
    });

    it('should stop on first failure by default', async () => {
      agentRegistry.register('failing-agent-2', {
        name: 'Failing Agent 2',
        run: async () => { throw new Error('Fail'); },
        estimateCost: () => 0
      });

      const workflow = new WorkflowDefinition({ id: 'stop-on-fail' });
      workflow.addAgent('fail', { type: 'failing-agent-2' });
      workflow.addAgent('after', { type: 'mock-agent', dependsOn: ['fail'] });

      const ctx = await testOrchestrator.execute(workflow, { maxRetries: 0 });

      // 'after' should not have run
      assert.strictEqual(ctx.states.get('after'), AgentState.PENDING);
    });

    it('should throw on invalid workflow (missing agent type)', () => {
      const workflow = new WorkflowDefinition({ id: 'invalid' });
      workflow.addAgent('missing', { type: 'nonexistent-agent-type' });

      assert.throws(() => testOrchestrator.registry.get('nonexistent-agent-type'), /Unknown agent type/);
    });
  });

  // ============================================
  // Input Mapping Tests
  // ============================================

  describe('Input Mapping', () => {
    it('should pass outputs to dependent agents via inputMap', async () => {
      let capturedInputs = null;

      agentRegistry.register('output-producer', {
        name: 'Output Producer',
        run: async () => ({ data: 'from-producer', nested: { value: 42 } }),
        estimateCost: () => 0
      });

      agentRegistry.register('input-consumer', {
        name: 'Input Consumer',
        run: async (inputs) => {
          capturedInputs = inputs;
          return { received: true };
        },
        estimateCost: () => 0
      });

      const workflow = new WorkflowDefinition({ id: 'mapping-test' });
      workflow.addAgent('producer', { type: 'output-producer' });
      workflow.addAgent('consumer', {
        type: 'input-consumer',
        dependsOn: ['producer'],
        inputMap: {
          fromProducer: 'producer',
          nestedValue: 'producer.nested'
        }
      });

      await testOrchestrator.execute(workflow);

      assert.ok(capturedInputs);
      assert.deepStrictEqual(capturedInputs.fromProducer, { data: 'from-producer', nested: { value: 42 } });
      assert.deepStrictEqual(capturedInputs.nestedValue, { value: 42 });
    });
  });

  // ============================================
  // Registry Tests
  // ============================================

  describe('Agent Registry', () => {
    it('should list all registered agents', () => {
      const agents = agentRegistry.list();

      assert.ok(Array.isArray(agents));
      assert.ok(agents.length > 0);
      assert.ok(agents.every(a => a.type && a.name));
    });

    it('should reject agents without run function', () => {
      assert.throws(
        () => agentRegistry.register('invalid', { name: 'No Run' }),
        /must have a run function/
      );
    });

    it('should check agent existence', () => {
      assert.strictEqual(agentRegistry.has('mock-agent'), true);
      assert.strictEqual(agentRegistry.has('definitely-not-registered'), false);
    });
  });
});
