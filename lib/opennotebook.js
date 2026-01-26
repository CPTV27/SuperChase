/**
 * OpenNotebook Integration Layer
 *
 * Provides durability and cross-session visibility by syncing state to OpenNotebook.
 * In-memory state remains authoritative during execution; OpenNotebook is the
 * persistence/audit layer.
 *
 * Connects to OpenNotebook via HTTP API (default: localhost:5055)
 *
 * System Notebook: notebook:6pwuvpfp0sxmc0y8ji48
 * - Circuit Breaker Note: note:zphn79fc3mdo25cjmvbp
 * - Budget Config Note: note:aygut1iwzlje3520wpjb
 *
 * @module lib/opennotebook
 */

import { createLogger } from './logger.js';

const logger = createLogger({ module: 'opennotebook' });

// OpenNotebook API configuration
const OPENNOTEBOOK_URL = process.env.OPEN_NOTEBOOK_URL || 'http://localhost:5055';
const OPENNOTEBOOK_PASSWORD = process.env.OPEN_NOTEBOOK_PASSWORD || '';

// System notebook IDs
const SYSTEM_NOTEBOOK_ID = 'notebook:6pwuvpfp0sxmc0y8ji48';
const CIRCUIT_BREAKER_NOTE_ID = 'note:zphn79fc3mdo25cjmvbp';
const BUDGET_CONFIG_NOTE_ID = 'note:aygut1iwzlje3520wpjb';

// Cache for notebook states (reduces API calls)
const notebookCache = new Map();
const CACHE_TTL_MS = 30000; // 30 second cache

// Connection state
let connectionVerified = false;
let connectionFailed = false;

/**
 * Check if OpenNotebook integration is available
 * @returns {boolean}
 */
export function isAvailable() {
  return !connectionFailed;
}

/**
 * Verify OpenNotebook connection
 * @returns {Promise<boolean>}
 */
async function verifyConnection() {
  if (connectionVerified) return true;
  if (connectionFailed) return false;

  try {
    const response = await fetch(`${OPENNOTEBOOK_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      connectionVerified = true;
      logger.info('OpenNotebook connection verified', { url: OPENNOTEBOOK_URL });
      return true;
    }
  } catch (error) {
    connectionFailed = true;
    logger.warn('OpenNotebook not available', { url: OPENNOTEBOOK_URL, error: error.message });
  }

  return false;
}

/**
 * Make an OpenNotebook API call
 * @private
 */
async function callAPI(endpoint, method = 'GET', body = null) {
  if (!await verifyConnection()) {
    return null;
  }

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    };

    if (OPENNOTEBOOK_PASSWORD) {
      options.headers['Authorization'] = `Bearer ${OPENNOTEBOOK_PASSWORD}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${OPENNOTEBOOK_URL}${endpoint}`, options);

    if (!response.ok) {
      logger.warn('OpenNotebook API error', { endpoint, status: response.status });
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.warn('OpenNotebook API call failed', { endpoint, error: error.message });
    return null;
  }
}

// ============================================
// Circuit Breaker Sync
// ============================================

/**
 * Sync circuit breaker state to OpenNotebook
 * Called after each state change in withCircuitBreaker()
 *
 * @param {string} spokeName - Name of the spoke/service
 * @param {object} state - Circuit state object
 */
export async function syncCircuitState(spokeName, state) {
  if (!isAvailable()) return;

  try {
    // Update the circuit breaker note with new state
    await callAPI(`/api/notes/${CIRCUIT_BREAKER_NOTE_ID}`, 'PATCH', {
      content: JSON.stringify({
        type: 'circuit_breaker_state',
        circuits: {
          [spokeName]: {
            state: state.state,
            failures: state.failures,
            lastFailure: state.lastFailure,
            lastSuccess: state.lastSuccess,
            updatedAt: Date.now(),
          },
        },
      }),
    });

    logger.debug('Circuit state synced', { spokeName, state: state.state });
  } catch (error) {
    // Don't fail on sync errors - in-memory is authoritative
    logger.warn('Circuit state sync failed', { spokeName, error: error.message });
  }
}

/**
 * Hydrate circuit breaker state from OpenNotebook on startup
 * @returns {Promise<Map<string, object>|null>} Circuit states or null if unavailable
 */
export async function hydrateCircuitStates() {
  if (!isAvailable()) return null;

  try {
    const result = await callAPI(`/api/notes/${CIRCUIT_BREAKER_NOTE_ID}`);

    if (result?.content) {
      const content = typeof result.content === 'string'
        ? JSON.parse(result.content)
        : result.content;

      if (content.circuits) {
        logger.info('Circuit states hydrated from OpenNotebook', {
          count: Object.keys(content.circuits).length,
        });
        return new Map(Object.entries(content.circuits));
      }
    }

    return null;
  } catch (error) {
    logger.warn('Failed to hydrate circuit states', { error: error.message });
    return null;
  }
}

// ============================================
// Workflow Persistence
// ============================================

/**
 * Initialize a workflow notebook
 * Called on workflow start
 *
 * @param {string} workflowId - Workflow ID
 * @param {string} workflowName - Human-readable name
 * @param {object} metadata - Workflow metadata (businessId, etc.)
 * @returns {Promise<string|null>} Notebook ID or null if unavailable
 */
export async function initWorkflow(workflowId, workflowName, metadata = {}) {
  if (!isAvailable()) return null;

  try {
    const result = await callAPI('/api/notebooks', 'POST', {
      name: `Workflow: ${workflowName}`,
      description: JSON.stringify({
        workflowId,
        status: 'running',
        startedAt: new Date().toISOString(),
        ...metadata,
      }),
    });

    const notebookId = result?.id;

    if (notebookId) {
      logger.info('Workflow notebook created', { workflowId, notebookId });
      return notebookId;
    }

    return null;
  } catch (error) {
    logger.warn('Failed to create workflow notebook', { workflowId, error: error.message });
    return null;
  }
}

/**
 * Store agent output in workflow notebook
 * Called after each agent completes
 *
 * @param {string} notebookId - Workflow notebook ID
 * @param {string} agentId - Agent identifier
 * @param {object} output - Agent output
 * @param {object} metadata - Execution metadata (timing, cost, etc.)
 */
export async function storeAgentOutput(notebookId, agentId, output, metadata = {}) {
  if (!isAvailable() || !notebookId) return;

  try {
    await callAPI('/api/notes', 'POST', {
      notebook_id: notebookId,
      title: `Agent: ${agentId}`,
      content: JSON.stringify({
        agentId,
        output,
        ...metadata,
        completedAt: new Date().toISOString(),
      }),
    });

    logger.debug('Agent output stored', { notebookId, agentId });
  } catch (error) {
    logger.warn('Failed to store agent output', { agentId, error: error.message });
  }
}

/**
 * Update workflow status
 * Called on workflow completion or error
 *
 * @param {string} notebookId - Workflow notebook ID
 * @param {string} status - Final status (completed, failed, paused)
 * @param {object} summary - Execution summary
 */
export async function updateWorkflowStatus(notebookId, status, summary = {}) {
  if (!isAvailable() || !notebookId) return;

  try {
    await callAPI(`/api/notebooks/${notebookId}`, 'PATCH', {
      description: JSON.stringify({
        ...summary,
        status,
        endedAt: new Date().toISOString(),
      }),
      // Archive failed or completed workflows
      archived: status === 'failed' || status === 'completed',
    });

    logger.info('Workflow status updated', { notebookId, status });
  } catch (error) {
    logger.warn('Failed to update workflow status', { notebookId, error: error.message });
  }
}

/**
 * Load workflow state from OpenNotebook for resume
 *
 * @param {string} notebookId - Workflow notebook ID
 * @returns {Promise<object|null>} Workflow state or null
 */
export async function loadWorkflowState(notebookId) {
  if (!isAvailable() || !notebookId) return null;

  try {
    const notebook = await callAPI(`/api/notebooks/${notebookId}`);
    if (!notebook) return null;

    // Get notes for this notebook
    const notes = await callAPI(`/api/notebooks/${notebookId}/notes`);

    // Reconstruct execution state from notes
    const outputs = new Map();
    for (const note of notes || []) {
      const content = typeof note.content === 'string'
        ? JSON.parse(note.content)
        : note.content;

      if (content.agentId && content.output) {
        outputs.set(content.agentId, content.output);
      }
    }

    const description = typeof notebook.description === 'string'
      ? JSON.parse(notebook.description)
      : notebook.description;

    return {
      workflowId: description?.workflowId,
      status: description?.status,
      outputs,
      metadata: description,
    };
  } catch (error) {
    logger.warn('Failed to load workflow state', { notebookId, error: error.message });
    return null;
  }
}

// ============================================
// Kill Switch
// ============================================

/**
 * Check if workflow should be killed
 * Checks BOTH globalThis.AUTOMATION_PAUSED AND notebook.archived
 *
 * @param {string} [notebookId] - Workflow notebook ID (optional)
 * @returns {Promise<{killed: boolean, reason: string|null}>}
 */
export async function checkKillSwitch(notebookId = null) {
  // Check global kill switch first (fast, local)
  if (globalThis.AUTOMATION_PAUSED === true) {
    return { killed: true, reason: 'Global automation paused (kill switch active)' };
  }

  // If no notebook ID, only check global
  if (!notebookId || !isAvailable()) {
    return { killed: false, reason: null };
  }

  // Check notebook archived status (with caching)
  const cacheKey = `archived:${notebookId}`;
  const cached = notebookCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    if (cached.archived) {
      return { killed: true, reason: 'Workflow notebook archived' };
    }
    return { killed: false, reason: null };
  }

  try {
    const notebook = await callAPI(`/api/notebooks/${notebookId}`);

    const archived = notebook?.archived === true;
    notebookCache.set(cacheKey, { archived, timestamp: Date.now() });

    if (archived) {
      return { killed: true, reason: 'Workflow notebook archived' };
    }

    return { killed: false, reason: null };
  } catch (error) {
    // On error, don't kill - fail open for availability
    logger.warn('Kill switch check failed', { notebookId, error: error.message });
    return { killed: false, reason: null };
  }
}

// ============================================
// Cost Audit Trail
// ============================================

/**
 * Record cost to OpenNotebook audit trail
 * Called after costController.recordCost()
 *
 * @param {object} costData - Cost record
 */
export async function recordCost(costData) {
  if (!isAvailable()) return;

  try {
    await callAPI('/api/notes', 'POST', {
      notebook_id: SYSTEM_NOTEBOOK_ID,
      title: `Cost: ${costData.model} - $${costData.cost?.toFixed(6) || '0'}`,
      content: JSON.stringify({
        type: 'cost_record',
        ...costData,
        recordedAt: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Don't fail on audit log errors
    logger.debug('Cost audit record failed', { error: error.message });
  }
}

/**
 * Get budget configuration from OpenNotebook
 * @returns {Promise<object|null>} Budget config or null
 */
export async function getBudgetConfig() {
  if (!isAvailable()) return null;

  try {
    const result = await callAPI(`/api/notes/${BUDGET_CONFIG_NOTE_ID}`);

    if (result?.content) {
      return typeof result.content === 'string'
        ? JSON.parse(result.content)
        : result.content;
    }

    return null;
  } catch (error) {
    logger.warn('Failed to get budget config', { error: error.message });
    return null;
  }
}

// ============================================
// Exports
// ============================================

export default {
  // Availability
  isAvailable,

  // Circuit Breaker
  syncCircuitState,
  hydrateCircuitStates,

  // Workflow
  initWorkflow,
  storeAgentOutput,
  updateWorkflowStatus,
  loadWorkflowState,

  // Kill Switch
  checkKillSwitch,

  // Cost
  recordCost,
  getBudgetConfig,

  // Constants
  SYSTEM_NOTEBOOK_ID,
  CIRCUIT_BREAKER_NOTE_ID,
  BUDGET_CONFIG_NOTE_ID,
};
