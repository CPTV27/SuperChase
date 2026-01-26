#!/usr/bin/env node
/**
 * Multi-Agent Orchestrator
 *
 * DAG-based execution engine for composing and running agent workflows.
 * Supports parallel execution, dependency resolution, HITL checkpoints,
 * and unified cost tracking.
 *
 * @module core/orchestrator
 */

import { createLogger, generateTraceId } from '../lib/logger.js';
import { ValidationError, ExternalServiceError, withRetry } from '../lib/errors.js';
import costController from '../lib/cost-controller.js';
import { EventEmitter } from 'events';
import * as opennotebook from '../lib/opennotebook.js';

/**
 * Check if automation is paused (kill switch active)
 * @returns {boolean}
 */
function isAutomationPaused() {
  return globalThis.AUTOMATION_PAUSED === true;
}

const logger = createLogger({ module: 'orchestrator' });

/**
 * Agent execution states
 */
export const AgentState = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked',      // Waiting for dependencies
  PAUSED: 'paused',        // HITL checkpoint
  SKIPPED: 'skipped',      // Conditional skip
};

// Note: generateTraceId is imported from lib/logger.js for consistency

/**
 * Create a promise that rejects after a timeout
 * @param {number} ms - Timeout in milliseconds
 * @param {string} operation - Operation name for error message
 * @returns {Promise<never>}
 */
function createTimeout(ms, operation) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Run a promise with a timeout
 * @param {Promise} promise - Promise to run
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operation - Operation name for error message
 * @returns {Promise}
 */
async function withTimeout(promise, timeoutMs, operation) {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }
  return Promise.race([
    promise,
    createTimeout(timeoutMs, operation),
  ]);
}

/**
 * Topological sort for DAG execution order
 * @param {Map} nodes - Map of node ID to node definition
 * @returns {string[][]} - Array of execution layers (parallel groups)
 */
function topologicalLayers(nodes) {
  const inDegree = new Map();
  const adjList = new Map();

  // Initialize
  for (const [id, node] of nodes) {
    inDegree.set(id, 0);
    adjList.set(id, []);
  }

  // Build adjacency and in-degree
  for (const [id, node] of nodes) {
    for (const dep of (node.dependsOn || [])) {
      if (adjList.has(dep)) {
        adjList.get(dep).push(id);
        inDegree.set(id, inDegree.get(id) + 1);
      }
    }
  }

  // Kahn's algorithm with layers
  const layers = [];
  let remaining = new Set(nodes.keys());

  while (remaining.size > 0) {
    // Find all nodes with in-degree 0
    const layer = [];
    for (const id of remaining) {
      if (inDegree.get(id) === 0) {
        layer.push(id);
      }
    }

    if (layer.length === 0) {
      throw new ValidationError('Circular dependency detected in workflow');
    }

    // Remove this layer and update in-degrees
    for (const id of layer) {
      remaining.delete(id);
      for (const neighbor of adjList.get(id)) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      }
    }

    layers.push(layer);
  }

  return layers;
}

/**
 * Workflow Definition
 * Describes a DAG of agents with dependencies
 */
export class WorkflowDefinition {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description || '';
    this.version = config.version || '1.0.0';
    this.agents = new Map();
    this.checkpoints = new Set(config.checkpoints || []);
    this.metadata = config.metadata || {};
  }

  /**
   * Add an agent to the workflow
   * @param {string} id - Unique agent ID within workflow
   * @param {object} config - Agent configuration
   */
  addAgent(id, config) {
    this.agents.set(id, {
      id,
      type: config.type,           // Agent type from registry
      dependsOn: config.dependsOn || [],
      inputs: config.inputs || {},  // Static inputs
      inputMap: config.inputMap || {}, // Dynamic inputs from other agents
      options: config.options || {},
      condition: config.condition,  // Optional condition function
      checkpoint: config.checkpoint || false,
    });
    return this;
  }

  /**
   * Get execution layers (parallel groups)
   */
  getExecutionLayers() {
    return topologicalLayers(this.agents);
  }

  /**
   * Validate workflow definition
   */
  validate() {
    const errors = [];

    // Check all dependencies exist
    for (const [id, agent] of this.agents) {
      for (const dep of agent.dependsOn) {
        if (!this.agents.has(dep)) {
          errors.push(`Agent '${id}' depends on unknown agent '${dep}'`);
        }
      }
    }

    // Check for cycles (topological sort will throw if cycle exists)
    try {
      this.getExecutionLayers();
    } catch (e) {
      errors.push(e.message);
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid workflow definition', { errors });
    }

    return true;
  }

  /**
   * Serialize workflow for storage/transmission
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      agents: Object.fromEntries(this.agents),
      checkpoints: Array.from(this.checkpoints),
      metadata: this.metadata,
    };
  }

  /**
   * Create workflow from JSON
   */
  static fromJSON(json) {
    const workflow = new WorkflowDefinition({
      id: json.id,
      name: json.name,
      description: json.description,
      version: json.version,
      checkpoints: json.checkpoints,
      metadata: json.metadata,
    });

    for (const [id, config] of Object.entries(json.agents)) {
      workflow.addAgent(id, config);
    }

    return workflow;
  }
}

/**
 * Workflow Execution Context
 * Tracks state during workflow execution
 */
export class ExecutionContext extends EventEmitter {
  constructor(workflow, options = {}) {
    super();
    this.traceId = generateTraceId(workflow.id);
    this.workflow = workflow;
    this.startTime = null;
    this.endTime = null;

    // Agent states and outputs
    this.states = new Map();
    this.outputs = new Map();
    this.errors = new Map();
    this.timings = new Map();

    // Initialize all agents as pending
    for (const [id] of workflow.agents) {
      this.states.set(id, AgentState.PENDING);
    }

    // Execution options
    this.options = {
      maxRetries: options.maxRetries || 2,
      retryDelayMs: options.retryDelayMs || 1000,
      timeoutMs: options.timeoutMs || 600000,      // 10 min workflow timeout
      agentTimeoutMs: options.agentTimeoutMs || 300000, // 5 min per-agent timeout
      pauseOnCheckpoint: options.pauseOnCheckpoint ?? true,
      dryRun: options.dryRun || false,
      ...options,
    };

    // Global inputs available to all agents
    this.globalInputs = options.inputs || {};

    // Cost tracking
    this.costs = {
      estimated: 0,
      actual: 0,
      byAgent: {},
    };

    // Checkpoint state
    this.pendingCheckpoint = null;
    this.checkpointData = null;
  }

  /**
   * Get resolved inputs for an agent
   */
  getAgentInputs(agentId) {
    const agentDef = this.workflow.agents.get(agentId);
    const inputs = { ...this.globalInputs, ...agentDef.inputs };

    // Map outputs from dependencies
    for (const [inputKey, sourceSpec] of Object.entries(agentDef.inputMap)) {
      // sourceSpec can be "agentId" or "agentId.outputKey"
      const [sourceAgent, outputKey] = sourceSpec.split('.');
      const sourceOutput = this.outputs.get(sourceAgent);

      if (sourceOutput) {
        inputs[inputKey] = outputKey ? sourceOutput[outputKey] : sourceOutput;
      }
    }

    return inputs;
  }

  /**
   * Check if agent dependencies are satisfied
   */
  canRun(agentId) {
    const agentDef = this.workflow.agents.get(agentId);

    for (const dep of agentDef.dependsOn) {
      const depState = this.states.get(dep);
      if (depState !== AgentState.COMPLETED && depState !== AgentState.SKIPPED) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record agent completion
   */
  complete(agentId, output, timing, cost = 0) {
    this.states.set(agentId, AgentState.COMPLETED);
    this.outputs.set(agentId, output);
    this.timings.set(agentId, timing);
    this.costs.byAgent[agentId] = cost;
    this.costs.actual += cost;

    this.emit('agent:complete', { agentId, output, timing, cost });
  }

  /**
   * Record agent failure
   */
  fail(agentId, error, timing) {
    this.states.set(agentId, AgentState.FAILED);
    this.errors.set(agentId, error);
    this.timings.set(agentId, timing);

    this.emit('agent:failed', { agentId, error, timing });
  }

  /**
   * Pause at checkpoint
   */
  pause(agentId, data) {
    this.states.set(agentId, AgentState.PAUSED);
    this.pendingCheckpoint = agentId;
    this.checkpointData = data;

    this.emit('checkpoint', { agentId, data });
  }

  /**
   * Resume from checkpoint
   */
  resume(approved = true, feedback = null) {
    if (!this.pendingCheckpoint) {
      throw new ValidationError('No pending checkpoint to resume');
    }

    const agentId = this.pendingCheckpoint;
    this.pendingCheckpoint = null;

    if (approved) {
      // Mark as completed with checkpoint data
      this.states.set(agentId, AgentState.COMPLETED);
      this.emit('checkpoint:approved', { agentId, feedback });
    } else {
      this.states.set(agentId, AgentState.FAILED);
      this.errors.set(agentId, new Error(`Checkpoint rejected: ${feedback || 'No reason'}`));
      this.emit('checkpoint:rejected', { agentId, feedback });
    }

    return agentId;
  }

  /**
   * Get execution summary
   */
  getSummary() {
    const completed = [...this.states.values()].filter(s => s === AgentState.COMPLETED).length;
    const failed = [...this.states.values()].filter(s => s === AgentState.FAILED).length;
    const total = this.workflow.agents.size;

    return {
      traceId: this.traceId,
      workflow: this.workflow.id,
      status: this.pendingCheckpoint ? 'paused' : (failed > 0 ? 'failed' : (completed === total ? 'completed' : 'running')),
      progress: { completed, failed, total },
      duration: this.endTime ? this.endTime - this.startTime : Date.now() - this.startTime,
      costs: this.costs,
      outputs: Object.fromEntries(this.outputs),
      errors: Object.fromEntries([...this.errors].map(([k, v]) => [k, v.message])),
      timings: Object.fromEntries(this.timings),
    };
  }
}

/**
 * Agent Registry
 * Central registry of available agent types
 */
class AgentRegistry {
  constructor() {
    this.agents = new Map();
  }

  /**
   * Register an agent type
   * @param {string} type - Unique agent type identifier
   * @param {object} definition - Agent definition with run function
   */
  register(type, definition) {
    if (!definition.run || typeof definition.run !== 'function') {
      throw new ValidationError(`Agent '${type}' must have a run function`);
    }

    this.agents.set(type, {
      type,
      name: definition.name || type,
      description: definition.description || '',
      run: definition.run,
      inputSchema: definition.inputSchema || {},
      outputSchema: definition.outputSchema || {},
      estimateCost: definition.estimateCost || (() => 0),
    });

    logger.debug('Agent registered', { type });
  }

  /**
   * Get agent definition
   */
  get(type) {
    const agent = this.agents.get(type);
    if (!agent) {
      throw new ValidationError(`Unknown agent type: ${type}`);
    }
    return agent;
  }

  /**
   * Check if agent type exists
   */
  has(type) {
    return this.agents.has(type);
  }

  /**
   * List all registered agents
   */
  list() {
    return [...this.agents.values()].map(a => ({
      type: a.type,
      name: a.name,
      description: a.description,
    }));
  }
}

// Global agent registry
export const agentRegistry = new AgentRegistry();

/**
 * Orchestrator
 * Executes workflow definitions using registered agents
 */
export class Orchestrator {
  constructor(options = {}) {
    this.registry = options.registry || agentRegistry;
    this.activeExecutions = new Map();
  }

  /**
   * Execute a workflow
   * @param {WorkflowDefinition} workflow - Workflow to execute
   * @param {object} options - Execution options
   * @returns {Promise<ExecutionContext>}
   */
  async execute(workflow, options = {}) {
    // CRITICAL: Check kill switch before any execution
    if (isAutomationPaused()) {
      throw new ValidationError('Automation is paused - emergency kill switch is active. Resume via POST /api/emergency/resume');
    }

    // Validate workflow
    workflow.validate();

    // CRITICAL: Cost pre-flight check (skip for dry runs)
    if (!options.dryRun) {
      const estimatedCost = this.estimateWorkflowCost(workflow, options);
      const preFlightResult = costController.preFlightCheck(estimatedCost);

      if (!preFlightResult.allowed) {
        throw new ValidationError(`Budget check failed: ${preFlightResult.reason}`);
      }

      if (preFlightResult.warnings?.length > 0) {
        for (const warning of preFlightResult.warnings) {
          logger.warn('Cost warning', { workflow: workflow.id, warning });
        }
      }
    }

    // Create execution context
    const ctx = new ExecutionContext(workflow, options);
    ctx.startTime = Date.now();

    this.activeExecutions.set(ctx.traceId, ctx);

    // Initialize workflow notebook for persistence (non-blocking)
    if (!options.dryRun) {
      opennotebook.initWorkflow(ctx.traceId, workflow.name, {
        workflowId: workflow.id,
        businessId: options.inputs?.businessId,
        metadata: workflow.metadata,
      }).then(notebookId => {
        ctx.notebookId = notebookId;
      }).catch(() => {});
    }

    logger.info('Workflow execution starting', {
      traceId: ctx.traceId,
      workflow: workflow.id,
      agents: workflow.agents.size,
    });

    try {
      // Get execution layers
      const layers = workflow.getExecutionLayers();

      // Execute layer by layer
      for (const layer of layers) {
        // Check for paused state (checkpoint)
        if (ctx.pendingCheckpoint) {
          logger.info('Workflow paused at checkpoint', {
            traceId: ctx.traceId,
            checkpoint: ctx.pendingCheckpoint,
          });
          return ctx;
        }

        // Run all agents in this layer in parallel
        await this.executeLayer(ctx, layer);

        // Check if any failures should stop execution
        const failedAgents = layer.filter(id => ctx.states.get(id) === AgentState.FAILED);
        if (failedAgents.length > 0 && !options.continueOnError) {
          logger.warn('Workflow stopping due to agent failure', {
            traceId: ctx.traceId,
            failedAgents,
          });
          break;
        }
      }

      ctx.endTime = Date.now();

      const summary = ctx.getSummary();
      logger.info('Workflow execution complete', {
        traceId: ctx.traceId,
        status: summary.status,
        duration: summary.duration,
      });

      return ctx;

    } catch (error) {
      ctx.endTime = Date.now();
      logger.error('Workflow execution failed', {
        traceId: ctx.traceId,
        error: error.message,
      });
      throw error;

    } finally {
      if (!ctx.pendingCheckpoint) {
        this.activeExecutions.delete(ctx.traceId);

        // Update workflow status in OpenNotebook
        if (ctx.notebookId) {
          const summary = ctx.getSummary();
          opennotebook.updateWorkflowStatus(ctx.notebookId, summary.status, summary)
            .catch(() => {});
        }
      }
    }
  }

  /**
   * Execute a layer of agents in parallel
   */
  async executeLayer(ctx, agentIds) {
    const promises = agentIds.map(id => this.executeAgent(ctx, id));
    await Promise.allSettled(promises);
  }

  /**
   * Execute a single agent
   */
  async executeAgent(ctx, agentId) {
    // Enhanced kill switch: check both global AND notebook archived status
    const killCheck = await opennotebook.checkKillSwitch(ctx.notebookId);
    if (killCheck.killed) {
      ctx.fail(agentId, new Error(killCheck.reason), 0);
      logger.warn('Agent killed', { agentId, reason: killCheck.reason });
      return;
    }

    const agentDef = ctx.workflow.agents.get(agentId);
    const agentType = this.registry.get(agentDef.type);

    // Check condition
    if (agentDef.condition) {
      const shouldRun = agentDef.condition(ctx);
      if (!shouldRun) {
        ctx.states.set(agentId, AgentState.SKIPPED);
        logger.debug('Agent skipped by condition', { agentId });
        return;
      }
    }

    // Check dependencies
    if (!ctx.canRun(agentId)) {
      ctx.states.set(agentId, AgentState.BLOCKED);
      return;
    }

    ctx.states.set(agentId, AgentState.RUNNING);
    ctx.emit('agent:start', { agentId });

    const startTime = Date.now();

    try {
      // Get inputs
      const inputs = ctx.getAgentInputs(agentId);

      // Dry run mode
      if (ctx.options.dryRun) {
        const mockOutput = { _dryRun: true, agentId, inputs };
        ctx.complete(agentId, mockOutput, Date.now() - startTime, 0);
        return;
      }

      // Run agent with retry and timeout
      const runWithRetry = withRetry(
        () => agentType.run(inputs, { ...agentDef.options, traceId: ctx.traceId }),
        { maxRetries: ctx.options.maxRetries, baseDelayMs: ctx.options.retryDelayMs }
      );

      // Apply timeout if configured (default: 5 minutes per agent)
      const agentTimeoutMs = agentDef.options?.timeoutMs || ctx.options.agentTimeoutMs || 300000;
      const output = await withTimeout(
        runWithRetry(),
        agentTimeoutMs,
        `Agent '${agentId}'`
      );
      const timing = Date.now() - startTime;
      const cost = agentType.estimateCost(inputs, output);

      // Check for checkpoint
      if (agentDef.checkpoint && ctx.options.pauseOnCheckpoint) {
        ctx.pause(agentId, { output, timing, cost });
        return;
      }

      ctx.complete(agentId, output, timing, cost);

      // Store output to OpenNotebook for durability (non-blocking)
      if (ctx.notebookId) {
        opennotebook.storeAgentOutput(ctx.notebookId, agentId, output, {
          timing,
          cost,
          model: output._meta?.model,
        }).catch(() => {});
      }

    } catch (error) {
      const timing = Date.now() - startTime;
      ctx.fail(agentId, error, timing);
      logger.error('Agent execution failed', {
        agentId,
        error: error.message,
        timing,
      });
    }
  }

  /**
   * Resume a paused workflow
   */
  async resume(traceId, approved = true, feedback = null) {
    // CRITICAL: Check kill switch before resuming
    if (isAutomationPaused()) {
      throw new ValidationError('Automation is paused - emergency kill switch is active. Resume via POST /api/emergency/resume');
    }

    const ctx = this.activeExecutions.get(traceId);
    if (!ctx) {
      throw new ValidationError(`No active execution found: ${traceId}`);
    }

    // CRITICAL: Re-check budget before resuming (budget may have changed since pause)
    if (!ctx.options.dryRun) {
      const remainingCost = this.estimateRemainingCost(ctx);
      const preFlightResult = costController.preFlightCheck(remainingCost);

      if (!preFlightResult.allowed) {
        throw new ValidationError(`Budget check failed on resume: ${preFlightResult.reason}`);
      }
    }

    const resumedAgent = ctx.resume(approved, feedback);

    if (!approved) {
      ctx.endTime = Date.now();
      this.activeExecutions.delete(traceId);
      return ctx;
    }

    // Continue execution from where we left off
    const layers = ctx.workflow.getExecutionLayers();
    let foundResumePoint = false;

    for (const layer of layers) {
      if (!foundResumePoint) {
        if (layer.includes(resumedAgent)) {
          foundResumePoint = true;
        }
        continue;
      }

      await this.executeLayer(ctx, layer);
    }

    ctx.endTime = Date.now();
    this.activeExecutions.delete(traceId);

    return ctx;
  }

  /**
   * Get status of active execution
   */
  getStatus(traceId) {
    const ctx = this.activeExecutions.get(traceId);
    if (!ctx) {
      return null;
    }
    return ctx.getSummary();
  }

  /**
   * List active executions
   */
  listActive() {
    return [...this.activeExecutions.values()].map(ctx => ctx.getSummary());
  }

  /**
   * Estimate total workflow cost before execution
   * @param {WorkflowDefinition} workflow - Workflow to estimate
   * @param {object} options - Execution options
   * @returns {number} Estimated cost in USD
   */
  estimateWorkflowCost(workflow, options = {}) {
    let totalEstimate = 0;

    for (const [id, agentDef] of workflow.agents) {
      try {
        const agentType = this.registry.get(agentDef.type);
        const inputs = { ...options.inputs, ...agentDef.inputs };
        const agentCost = agentType.estimateCost(inputs);
        totalEstimate += agentCost;
      } catch (e) {
        // Agent not found or estimateCost failed - use conservative default
        // Assume ~2000 input tokens + 500 output tokens at GPT-4o rates
        totalEstimate += 0.01; // ~$0.01 per unknown agent
      }
    }

    return totalEstimate;
  }

  /**
   * Estimate remaining cost for a paused workflow
   * @param {ExecutionContext} ctx - Execution context
   * @returns {number} Estimated remaining cost in USD
   */
  estimateRemainingCost(ctx) {
    let remainingCost = 0;

    for (const [id, agentDef] of ctx.workflow.agents) {
      const state = ctx.states.get(id);
      // Only estimate for agents not yet completed
      if (state !== AgentState.COMPLETED && state !== AgentState.SKIPPED) {
        try {
          const agentType = this.registry.get(agentDef.type);
          const inputs = ctx.getAgentInputs(id);
          remainingCost += agentType.estimateCost(inputs);
        } catch (e) {
          remainingCost += 0.01; // Conservative default
        }
      }
    }

    return remainingCost;
  }
}

// Default orchestrator instance
export const orchestrator = new Orchestrator();

export default {
  Orchestrator,
  WorkflowDefinition,
  ExecutionContext,
  AgentState,
  agentRegistry,
  orchestrator,
};
