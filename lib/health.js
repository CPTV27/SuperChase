/**
 * SuperChase Health Monitor
 * 
 * Monitors spoke health and provides metrics for observability.
 * Includes circuit breaker pattern for failing services.
 * 
 * @module lib/health
 */

import { createLogger } from './logger.js';
import { ServiceUnavailableError } from './errors.js';

const logger = createLogger({ module: 'health' });

// Lazy import to avoid circular dependencies
let opennotebook = null;
async function getOpenNotebook() {
  if (!opennotebook) {
    try {
      opennotebook = await import('./opennotebook.js');
    } catch {
      opennotebook = { syncCircuitState: () => {}, hydrateCircuitStates: () => null };
    }
  }
  return opennotebook;
}

/**
 * @typedef {Object} CircuitState
 * @property {'closed' | 'open' | 'half-open'} state
 * @property {number} failures
 * @property {number} lastFailure
 * @property {number} lastSuccess
 */

/**
 * @typedef {Object} SpokeHealth
 * @property {string} name
 * @property {'online' | 'offline' | 'warning'} status
 * @property {number} responseTimeMs
 * @property {string} message
 * @property {string} lastChecked
 */

/**
 * Circuit breaker configuration
 */
const CIRCUIT_CONFIG = {
    failureThreshold: 5,      // Failures before opening
    recoveryTimeout: 30000,   // ms before trying half-open
    halfOpenSuccesses: 2      // Successes to close circuit
};

/**
 * Circuit breaker states per spoke
 * @type {Map<string, CircuitState>}
 */
const circuits = new Map();

/**
 * Get or initialize circuit state
 * @param {string} spokeName 
 * @returns {CircuitState}
 */
function getCircuit(spokeName) {
    if (!circuits.has(spokeName)) {
        circuits.set(spokeName, {
            state: 'closed',
            failures: 0,
            lastFailure: 0,
            lastSuccess: Date.now(),
            halfOpenSuccesses: 0
        });
    }
    return circuits.get(spokeName);
}

/**
 * Record a successful call
 * @param {string} spokeName
 */
export function recordSuccess(spokeName) {
    const circuit = getCircuit(spokeName);
    const previousState = circuit.state;

    if (circuit.state === 'half-open') {
        circuit.halfOpenSuccesses++;
        if (circuit.halfOpenSuccesses >= CIRCUIT_CONFIG.halfOpenSuccesses) {
            circuit.state = 'closed';
            circuit.failures = 0;
            logger.info(`Circuit closed for ${spokeName}`);
        }
    } else {
        circuit.failures = 0;
    }

    circuit.lastSuccess = Date.now();

    // Sync to OpenNotebook if state changed
    if (circuit.state !== previousState) {
        getOpenNotebook().then(on => on.syncCircuitState(spokeName, circuit)).catch(() => {});
    }
}

/**
 * Record a failed call
 * @param {string} spokeName
 */
export function recordFailure(spokeName) {
    const circuit = getCircuit(spokeName);
    const previousState = circuit.state;

    circuit.failures++;
    circuit.lastFailure = Date.now();
    circuit.halfOpenSuccesses = 0;

    if (circuit.failures >= CIRCUIT_CONFIG.failureThreshold) {
        if (circuit.state !== 'open') {
            circuit.state = 'open';
            logger.warn(`Circuit opened for ${spokeName} after ${circuit.failures} failures`);
        }
    }

    // Sync to OpenNotebook if state changed
    if (circuit.state !== previousState) {
        getOpenNotebook().then(on => on.syncCircuitState(spokeName, circuit)).catch(() => {});
    }
}

/**
 * Check if spoke is available (circuit not open)
 * @param {string} spokeName 
 * @returns {boolean}
 */
export function isAvailable(spokeName) {
    const circuit = getCircuit(spokeName);

    if (circuit.state === 'closed') {
        return true;
    }

    if (circuit.state === 'open') {
        // Check if recovery timeout has passed
        const elapsed = Date.now() - circuit.lastFailure;
        if (elapsed >= CIRCUIT_CONFIG.recoveryTimeout) {
            circuit.state = 'half-open';
            circuit.halfOpenSuccesses = 0;
            logger.info(`Circuit half-open for ${spokeName}, attempting recovery`);
            return true;
        }
        return false;
    }

    // Half-open - allow limited traffic
    return true;
}

/**
 * Get circuit state for a spoke
 * @param {string} spokeName 
 * @returns {CircuitState}
 */
export function getCircuitState(spokeName) {
    return { ...getCircuit(spokeName) };
}

/**
 * Wrap a function with circuit breaker
 * @param {string} spokeName 
 * @param {Function} fn 
 * @returns {Function}
 */
export function withCircuitBreaker(spokeName, fn) {
    return async (...args) => {
        if (!isAvailable(spokeName)) {
            throw new ServiceUnavailableError(spokeName);
        }

        try {
            const result = await fn(...args);
            recordSuccess(spokeName);
            return result;
        } catch (error) {
            recordFailure(spokeName);
            throw error;
        }
    };
}

// ============================================
// Metrics Collection
// ============================================

/**
 * @typedef {Object} Metrics
 * @property {number} totalRequests
 * @property {number} successfulRequests
 * @property {number} failedRequests
 * @property {Object<string, number>} requestsByEndpoint
 * @property {number[]} responseTimes
 * @property {string} startedAt
 */

/** @type {Metrics} */
const metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    requestsByEndpoint: {},
    responseTimes: [],
    startedAt: new Date().toISOString()
};

/**
 * Record a request
 * @param {string} endpoint 
 * @param {number} responseTimeMs 
 * @param {boolean} success 
 */
export function recordRequest(endpoint, responseTimeMs, success) {
    metrics.totalRequests++;

    if (success) {
        metrics.successfulRequests++;
    } else {
        metrics.failedRequests++;
    }

    metrics.requestsByEndpoint[endpoint] = (metrics.requestsByEndpoint[endpoint] || 0) + 1;

    // Keep last 1000 response times
    metrics.responseTimes.push(responseTimeMs);
    if (metrics.responseTimes.length > 1000) {
        metrics.responseTimes.shift();
    }
}

/**
 * Get current metrics
 * @returns {Object}
 */
export function getMetrics() {
    const responseTimes = metrics.responseTimes;
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);

    return {
        ...metrics,
        uptime: Date.now() - new Date(metrics.startedAt).getTime(),
        averageResponseTime: responseTimes.length > 0
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0,
        p50ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0,
        p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0,
        p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0,
        successRate: metrics.totalRequests > 0
            ? (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2)
            : 100,
        circuits: Object.fromEntries(
            [...circuits.entries()].map(([name, state]) => [
                name,
                { state: state.state, failures: state.failures }
            ])
        )
    };
}

/**
 * Reset metrics
 */
export function resetMetrics() {
    metrics.totalRequests = 0;
    metrics.successfulRequests = 0;
    metrics.failedRequests = 0;
    metrics.requestsByEndpoint = {};
    metrics.responseTimes = [];
    metrics.startedAt = new Date().toISOString();
}

// ============================================
// Health Check
// ============================================

/**
 * Comprehensive health check
 * @returns {Object}
 */
export function getHealth() {
    const metricsData = getMetrics();
    const circuitStates = Object.fromEntries(circuits);

    // Determine overall status
    const openCircuits = [...circuits.values()].filter(c => c.state === 'open');
    let status = 'healthy';

    if (openCircuits.length > 0) {
        status = openCircuits.length >= circuits.size / 2 ? 'unhealthy' : 'degraded';
    }

    return {
        status,
        timestamp: new Date().toISOString(),
        uptime: metricsData.uptime,
        metrics: {
            requests: metricsData.totalRequests,
            successRate: metricsData.successRate,
            avgResponseTime: metricsData.averageResponseTime,
            p95ResponseTime: metricsData.p95ResponseTime
        },
        circuits: metricsData.circuits
    };
}

export default {
    recordSuccess,
    recordFailure,
    isAvailable,
    getCircuitState,
    withCircuitBreaker,
    recordRequest,
    getMetrics,
    resetMetrics,
    getHealth
};
