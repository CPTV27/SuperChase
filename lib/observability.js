/**
 * SuperChase Observability Module
 *
 * Comprehensive observability infrastructure:
 * - Prometheus-format metrics export
 * - Distributed tracing with spans
 * - Business metrics (LLM costs, council sessions, tasks)
 * - Alert rules and thresholds
 *
 * @module lib/observability
 */

import { createLogger } from './logger.js';
import { getMetrics as getHealthMetrics, getHealth } from './health.js';

const logger = createLogger({ module: 'observability' });

// ============================================
// Metrics Types
// ============================================

/**
 * Counter - monotonically increasing value
 */
class Counter {
  constructor(name, help, labels = []) {
    this.name = name;
    this.help = help;
    this.labels = labels;
    this.values = new Map();
  }

  inc(labelValues = {}, value = 1) {
    const key = this._labelKey(labelValues);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  get(labelValues = {}) {
    return this.values.get(this._labelKey(labelValues)) || 0;
  }

  _labelKey(labelValues) {
    if (this.labels.length === 0) return '__default__';
    return this.labels.map(l => `${l}="${labelValues[l] || ''}"`).join(',');
  }

  toPrometheus() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const [key, value] of this.values) {
      if (key === '__default__') {
        lines.push(`${this.name} ${value}`);
      } else {
        lines.push(`${this.name}{${key}} ${value}`);
      }
    }
    return lines.join('\n');
  }
}

/**
 * Gauge - value that can go up and down
 */
class Gauge {
  constructor(name, help, labels = []) {
    this.name = name;
    this.help = help;
    this.labels = labels;
    this.values = new Map();
  }

  set(labelValues = {}, value) {
    this.values.set(this._labelKey(labelValues), value);
  }

  inc(labelValues = {}, value = 1) {
    const key = this._labelKey(labelValues);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  dec(labelValues = {}, value = 1) {
    const key = this._labelKey(labelValues);
    const current = this.values.get(key) || 0;
    this.values.set(key, current - value);
  }

  get(labelValues = {}) {
    return this.values.get(this._labelKey(labelValues)) || 0;
  }

  _labelKey(labelValues) {
    if (this.labels.length === 0) return '__default__';
    return this.labels.map(l => `${l}="${labelValues[l] || ''}"`).join(',');
  }

  toPrometheus() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`];
    for (const [key, value] of this.values) {
      if (key === '__default__') {
        lines.push(`${this.name} ${value}`);
      } else {
        lines.push(`${this.name}{${key}} ${value}`);
      }
    }
    return lines.join('\n');
  }
}

/**
 * Histogram - distribution of values in buckets
 */
class Histogram {
  constructor(name, help, labels = [], buckets = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]) {
    this.name = name;
    this.help = help;
    this.labels = labels;
    this.buckets = buckets.sort((a, b) => a - b);
    this.data = new Map(); // key -> { buckets: [], sum: 0, count: 0 }
  }

  observe(labelValues = {}, value) {
    const key = this._labelKey(labelValues);
    if (!this.data.has(key)) {
      this.data.set(key, {
        buckets: this.buckets.map(() => 0),
        sum: 0,
        count: 0
      });
    }
    const data = this.data.get(key);
    data.sum += value;
    data.count++;
    for (let i = 0; i < this.buckets.length; i++) {
      if (value <= this.buckets[i]) {
        data.buckets[i]++;
      }
    }
  }

  _labelKey(labelValues) {
    if (this.labels.length === 0) return '__default__';
    return this.labels.map(l => `${l}="${labelValues[l] || ''}"`).join(',');
  }

  toPrometheus() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];
    for (const [key, data] of this.data) {
      const labelPart = key === '__default__' ? '' : `${key},`;
      let cumulative = 0;
      for (let i = 0; i < this.buckets.length; i++) {
        cumulative += data.buckets[i];
        lines.push(`${this.name}_bucket{${labelPart}le="${this.buckets[i]}"} ${cumulative}`);
      }
      lines.push(`${this.name}_bucket{${labelPart}le="+Inf"} ${data.count}`);
      lines.push(`${this.name}_sum{${key === '__default__' ? '' : key}} ${data.sum}`);
      lines.push(`${this.name}_count{${key === '__default__' ? '' : key}} ${data.count}`);
    }
    return lines.join('\n');
  }
}

// ============================================
// Metric Definitions
// ============================================

const metrics = {
  // HTTP metrics
  httpRequestsTotal: new Counter(
    'superchase_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
  ),
  httpRequestDuration: new Histogram(
    'superchase_http_request_duration_ms',
    'HTTP request duration in milliseconds',
    ['method', 'endpoint']
  ),

  // LLM Council metrics
  councilSessionsTotal: new Counter(
    'superchase_council_sessions_total',
    'Total LLM council sessions',
    ['status']
  ),
  councilCostDollars: new Counter(
    'superchase_council_cost_dollars',
    'Total LLM council cost in dollars',
    ['model']
  ),
  councilDuration: new Histogram(
    'superchase_council_duration_ms',
    'LLM council session duration',
    []
  ),

  // Task provider metrics
  taskOperationsTotal: new Counter(
    'superchase_task_operations_total',
    'Total task provider operations',
    ['operation', 'provider', 'status']
  ),

  // Spoke metrics
  spokeRequestsTotal: new Counter(
    'superchase_spoke_requests_total',
    'Total spoke requests',
    ['spoke', 'status']
  ),
  spokeCircuitState: new Gauge(
    'superchase_spoke_circuit_state',
    'Circuit breaker state (0=closed, 1=half-open, 2=open)',
    ['spoke']
  ),

  // Business metrics
  emailsProcessedTotal: new Counter(
    'superchase_emails_processed_total',
    'Total emails processed',
    ['category', 'action']
  ),
  activeTasksGauge: new Gauge(
    'superchase_active_tasks',
    'Current active tasks by project',
    ['project']
  ),
  memoryUsageBytes: new Gauge(
    'superchase_memory_usage_bytes',
    'Memory usage in bytes',
    ['type']
  ),

  // System metrics
  processUptimeSeconds: new Gauge(
    'superchase_process_uptime_seconds',
    'Process uptime in seconds'
  ),
  nodeVersion: new Gauge(
    'superchase_node_version',
    'Node.js version info',
    ['version']
  )
};

// ============================================
// Distributed Tracing
// ============================================

/**
 * Active spans for tracing
 * @type {Map<string, Object>}
 */
const activeSpans = new Map();

/**
 * Completed traces (keep last 100 for debugging)
 * @type {Array<Object>}
 */
const completedTraces = [];
const MAX_COMPLETED_TRACES = 100;

/**
 * Create a new trace span
 * @param {string} name - Span name
 * @param {Object} options - Span options
 * @returns {Object} Span object with end() method
 */
export function startSpan(name, options = {}) {
  const {
    traceId = generateTraceId(),
    parentSpanId = null,
    attributes = {}
  } = options;

  const spanId = generateSpanId();
  const startTime = Date.now();

  const span = {
    traceId,
    spanId,
    parentSpanId,
    name,
    startTime,
    endTime: null,
    duration: null,
    status: 'ok',
    attributes: { ...attributes },
    events: [],

    /**
     * Add an event to the span
     */
    addEvent(eventName, eventAttributes = {}) {
      this.events.push({
        name: eventName,
        timestamp: Date.now(),
        attributes: eventAttributes
      });
    },

    /**
     * Set span status
     */
    setStatus(status, message = null) {
      this.status = status;
      if (message) {
        this.attributes.statusMessage = message;
      }
    },

    /**
     * Add attributes
     */
    setAttributes(attrs) {
      Object.assign(this.attributes, attrs);
    },

    /**
     * End the span
     */
    end() {
      this.endTime = Date.now();
      this.duration = this.endTime - this.startTime;
      activeSpans.delete(this.spanId);

      // Store completed trace
      completedTraces.push({
        traceId: this.traceId,
        spanId: this.spanId,
        parentSpanId: this.parentSpanId,
        name: this.name,
        startTime: this.startTime,
        endTime: this.endTime,
        duration: this.duration,
        status: this.status,
        attributes: this.attributes,
        events: this.events
      });

      // Trim old traces
      while (completedTraces.length > MAX_COMPLETED_TRACES) {
        completedTraces.shift();
      }

      logger.debug(`Span completed: ${this.name}`, {
        traceId: this.traceId,
        spanId: this.spanId,
        durationMs: this.duration,
        status: this.status
      });

      return this;
    },

    /**
     * Create a child span
     */
    startChild(childName, childAttributes = {}) {
      return startSpan(childName, {
        traceId: this.traceId,
        parentSpanId: this.spanId,
        attributes: childAttributes
      });
    }
  };

  activeSpans.set(spanId, span);
  return span;
}

/**
 * Wrap an async function with tracing
 * @param {string} name - Span name
 * @param {Function} fn - Function to wrap
 * @param {Object} attributes - Span attributes
 * @returns {Promise<any>}
 */
export async function withTrace(name, fn, attributes = {}) {
  const span = startSpan(name, { attributes });
  try {
    const result = await fn(span);
    span.setStatus('ok');
    return result;
  } catch (error) {
    span.setStatus('error', error.message);
    span.setAttributes({ 'error.type': error.name, 'error.message': error.message });
    throw error;
  } finally {
    span.end();
  }
}

function generateTraceId() {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function generateSpanId() {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// ============================================
// Alert Rules
// ============================================

/**
 * @typedef {Object} AlertRule
 * @property {string} name
 * @property {string} severity - 'critical' | 'warning' | 'info'
 * @property {Function} condition - () => boolean
 * @property {string} message
 * @property {number} cooldownMs - Don't fire again within this period
 */

/** @type {AlertRule[]} */
const alertRules = [
  {
    name: 'high_error_rate',
    severity: 'critical',
    condition: () => {
      const health = getHealth();
      return parseFloat(health.metrics.successRate) < 95;
    },
    message: 'Error rate exceeded 5% threshold',
    cooldownMs: 5 * 60 * 1000 // 5 minutes
  },
  {
    name: 'circuit_breaker_open',
    severity: 'warning',
    condition: () => {
      const health = getHealth();
      return Object.values(health.circuits || {}).some(c => c.state === 'open');
    },
    message: 'One or more circuit breakers are open',
    cooldownMs: 10 * 60 * 1000 // 10 minutes
  },
  {
    name: 'slow_response_time',
    severity: 'warning',
    condition: () => {
      const health = getHealth();
      return health.metrics.p95ResponseTime > 5000; // 5 seconds
    },
    message: 'P95 response time exceeded 5 seconds',
    cooldownMs: 5 * 60 * 1000
  },
  {
    name: 'memory_high',
    severity: 'warning',
    condition: () => {
      const used = process.memoryUsage();
      return used.heapUsed > 500 * 1024 * 1024; // 500MB
    },
    message: 'Heap memory usage exceeded 500MB',
    cooldownMs: 15 * 60 * 1000
  }
];

/** @type {Map<string, number>} Last fired time per rule */
const alertCooldowns = new Map();

/** @type {Array<Object>} Recent alerts */
const firedAlerts = [];
const MAX_FIRED_ALERTS = 50;

/**
 * Check all alert rules and return active alerts
 * @returns {Array<Object>}
 */
export function checkAlerts() {
  const now = Date.now();
  const newAlerts = [];

  for (const rule of alertRules) {
    try {
      if (rule.condition()) {
        const lastFired = alertCooldowns.get(rule.name) || 0;
        if (now - lastFired >= rule.cooldownMs) {
          const alert = {
            name: rule.name,
            severity: rule.severity,
            message: rule.message,
            timestamp: new Date().toISOString()
          };
          newAlerts.push(alert);
          firedAlerts.push(alert);
          alertCooldowns.set(rule.name, now);

          logger.warn(`Alert fired: ${rule.name}`, {
            severity: rule.severity,
            message: rule.message
          });
        }
      }
    } catch (error) {
      logger.error(`Alert rule ${rule.name} failed`, { error: error.message });
    }
  }

  // Trim old alerts
  while (firedAlerts.length > MAX_FIRED_ALERTS) {
    firedAlerts.shift();
  }

  return newAlerts;
}

/**
 * Get recent alerts
 * @param {number} limit
 * @returns {Array<Object>}
 */
export function getRecentAlerts(limit = 20) {
  return firedAlerts.slice(-limit);
}

/**
 * Add a custom alert rule
 * @param {AlertRule} rule
 */
export function addAlertRule(rule) {
  alertRules.push(rule);
}

// ============================================
// Metrics Recording Helpers
// ============================================

/**
 * Record an HTTP request
 */
export function recordHttpRequest(method, endpoint, status, durationMs) {
  metrics.httpRequestsTotal.inc({ method, endpoint, status: String(status) });
  metrics.httpRequestDuration.observe({ method, endpoint }, durationMs);
}

/**
 * Record an LLM council session
 */
export function recordCouncilSession(status, durationMs, modelCosts = {}) {
  metrics.councilSessionsTotal.inc({ status });
  metrics.councilDuration.observe({}, durationMs);
  for (const [model, cost] of Object.entries(modelCosts)) {
    metrics.councilCostDollars.inc({ model }, cost);
  }
}

/**
 * Record a task operation
 */
export function recordTaskOperation(operation, provider, success) {
  metrics.taskOperationsTotal.inc({
    operation,
    provider,
    status: success ? 'success' : 'failure'
  });
}

/**
 * Record spoke request
 */
export function recordSpokeRequest(spoke, success) {
  metrics.spokeRequestsTotal.inc({
    spoke,
    status: success ? 'success' : 'failure'
  });
}

/**
 * Update circuit breaker state metric
 */
export function updateCircuitState(spoke, state) {
  const stateValue = state === 'closed' ? 0 : state === 'half-open' ? 1 : 2;
  metrics.spokeCircuitState.set({ spoke }, stateValue);
}

/**
 * Record email processing
 */
export function recordEmailProcessed(category, action) {
  metrics.emailsProcessedTotal.inc({ category, action });
}

/**
 * Update active tasks gauge
 */
export function setActiveTasks(project, count) {
  metrics.activeTasksGauge.set({ project }, count);
}

// ============================================
// System Metrics Collection
// ============================================

/**
 * Update system metrics (call periodically)
 */
export function updateSystemMetrics() {
  const memUsage = process.memoryUsage();
  metrics.memoryUsageBytes.set({ type: 'heap_used' }, memUsage.heapUsed);
  metrics.memoryUsageBytes.set({ type: 'heap_total' }, memUsage.heapTotal);
  metrics.memoryUsageBytes.set({ type: 'rss' }, memUsage.rss);
  metrics.memoryUsageBytes.set({ type: 'external' }, memUsage.external);

  metrics.processUptimeSeconds.set({}, process.uptime());
  metrics.nodeVersion.set({ version: process.version }, 1);
}

// ============================================
// Prometheus Export
// ============================================

/**
 * Get all metrics in Prometheus format
 * @returns {string}
 */
export function getPrometheusMetrics() {
  updateSystemMetrics();

  const lines = [
    '# SuperChase Metrics',
    `# Generated at ${new Date().toISOString()}`,
    ''
  ];

  for (const metric of Object.values(metrics)) {
    lines.push(metric.toPrometheus());
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get metrics as JSON (for dashboard)
 * @returns {Object}
 */
export function getMetricsJson() {
  updateSystemMetrics();

  const result = {};
  for (const [name, metric] of Object.entries(metrics)) {
    if (metric instanceof Counter || metric instanceof Gauge) {
      result[name] = Object.fromEntries(metric.values);
    } else if (metric instanceof Histogram) {
      result[name] = Object.fromEntries(
        [...metric.data.entries()].map(([key, data]) => [key, {
          count: data.count,
          sum: data.sum,
          avg: data.count > 0 ? data.sum / data.count : 0
        }])
      );
    }
  }

  return result;
}

// ============================================
// Trace Export
// ============================================

/**
 * Get recent traces
 * @param {number} limit
 * @returns {Array<Object>}
 */
export function getRecentTraces(limit = 50) {
  return completedTraces.slice(-limit);
}

/**
 * Get traces by trace ID
 * @param {string} traceId
 * @returns {Array<Object>}
 */
export function getTraceById(traceId) {
  return completedTraces.filter(t => t.traceId === traceId);
}

/**
 * Get active spans
 * @returns {Array<Object>}
 */
export function getActiveSpans() {
  return [...activeSpans.values()].map(span => ({
    traceId: span.traceId,
    spanId: span.spanId,
    name: span.name,
    startTime: span.startTime,
    elapsed: Date.now() - span.startTime,
    attributes: span.attributes
  }));
}

// ============================================
// Health Dashboard Data
// ============================================

/**
 * Get comprehensive observability data for dashboard
 * @returns {Object}
 */
export function getObservabilityDashboard() {
  const health = getHealth();
  const healthMetrics = getHealthMetrics();

  return {
    timestamp: new Date().toISOString(),
    status: health.status,
    uptime: health.uptime,
    metrics: {
      http: {
        totalRequests: metrics.httpRequestsTotal.get({ method: 'GET', endpoint: '/health', status: '200' }) +
                       metrics.httpRequestsTotal.get({ method: 'POST', endpoint: '/query', status: '200' }),
        successRate: health.metrics.successRate,
        avgResponseTime: health.metrics.avgResponseTime,
        p95ResponseTime: health.metrics.p95ResponseTime
      },
      council: {
        totalSessions: metrics.councilSessionsTotal.get({ status: 'success' }) +
                       metrics.councilSessionsTotal.get({ status: 'failure' }),
        successfulSessions: metrics.councilSessionsTotal.get({ status: 'success' })
      },
      memory: {
        heapUsed: metrics.memoryUsageBytes.get({ type: 'heap_used' }),
        heapTotal: metrics.memoryUsageBytes.get({ type: 'heap_total' }),
        rss: metrics.memoryUsageBytes.get({ type: 'rss' })
      }
    },
    circuits: health.circuits,
    recentAlerts: getRecentAlerts(10),
    activeSpans: getActiveSpans().length,
    recentTraces: getRecentTraces(5).map(t => ({
      traceId: t.traceId,
      name: t.name,
      duration: t.duration,
      status: t.status
    }))
  };
}

// ============================================
// HTTP Handler
// ============================================

/**
 * HTTP handler for observability endpoints
 * @param {Object} req
 * @returns {Promise<Object>}
 */
export async function handleObservabilityRequest(req) {
  const { endpoint } = req;

  switch (endpoint) {
    case 'prometheus':
      return {
        contentType: 'text/plain; charset=utf-8',
        body: getPrometheusMetrics(),
        status: 200
      };

    case 'metrics':
      return {
        ...getMetricsJson(),
        status: 200
      };

    case 'traces':
      return {
        traces: getRecentTraces(req.limit || 50),
        activeSpans: getActiveSpans(),
        status: 200
      };

    case 'trace':
      if (!req.traceId) {
        return { error: 'Missing traceId', status: 400 };
      }
      return {
        spans: getTraceById(req.traceId),
        status: 200
      };

    case 'alerts':
      return {
        alerts: getRecentAlerts(req.limit || 20),
        rules: alertRules.map(r => ({
          name: r.name,
          severity: r.severity,
          message: r.message
        })),
        status: 200
      };

    case 'dashboard':
      return {
        ...getObservabilityDashboard(),
        status: 200
      };

    default:
      return { error: 'Unknown endpoint', status: 404 };
  }
}

// Start periodic alert checking
let alertCheckInterval = null;

export function startAlertChecker(intervalMs = 60000) {
  if (alertCheckInterval) {
    clearInterval(alertCheckInterval);
  }
  alertCheckInterval = setInterval(() => {
    checkAlerts();
  }, intervalMs);
  logger.info('Alert checker started', { intervalMs });
}

export function stopAlertChecker() {
  if (alertCheckInterval) {
    clearInterval(alertCheckInterval);
    alertCheckInterval = null;
    logger.info('Alert checker stopped');
  }
}

export default {
  // Metrics
  metrics,
  getPrometheusMetrics,
  getMetricsJson,
  recordHttpRequest,
  recordCouncilSession,
  recordTaskOperation,
  recordSpokeRequest,
  updateCircuitState,
  recordEmailProcessed,
  setActiveTasks,
  updateSystemMetrics,

  // Tracing
  startSpan,
  withTrace,
  getRecentTraces,
  getTraceById,
  getActiveSpans,

  // Alerting
  checkAlerts,
  getRecentAlerts,
  addAlertRule,
  startAlertChecker,
  stopAlertChecker,

  // Dashboard
  getObservabilityDashboard,
  handleObservabilityRequest
};
