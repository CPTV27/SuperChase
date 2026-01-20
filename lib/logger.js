/**
 * SuperChase Structured Logger
 * 
 * Provides consistent, JSON-structured logging with:
 * - Log levels (debug, info, warn, error)
 * - Request tracing with correlation IDs
 * - Performance timing
 * - Context enrichment
 * 
 * @module lib/logger
 */

import { randomUUID } from 'crypto';

/**
 * @typedef {'debug' | 'info' | 'warn' | 'error'} LogLevel
 */

/**
 * @typedef {Object} LogContext
 * @property {string} [requestId] - Correlation ID for request tracing
 * @property {string} [spoke] - Spoke name (asana, twitter, voice, etc.)
 * @property {string} [action] - Action being performed
 * @property {number} [durationMs] - Operation duration in milliseconds
 * @property {Object} [metadata] - Additional context data
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Format a log entry as JSON (production) or human-readable (development)
 * @param {LogLevel} level 
 * @param {string} message 
 * @param {LogContext} context 
 */
function formatLog(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    ...context
  };

  if (isProduction) {
    return JSON.stringify(entry);
  }

  // Human-readable format for development
  const prefix = {
    debug: '🔍',
    info: '📘',
    warn: '⚠️',
    error: '❌'
  }[level] || '📝';

  const contextStr = Object.keys(context).length > 0
    ? ` ${JSON.stringify(context)}`
    : '';

  return `${prefix} [${timestamp.split('T')[1].slice(0, 8)}] ${message}${contextStr}`;
}

/**
 * Log at specified level
 * @param {LogLevel} level 
 * @param {string} message 
 * @param {LogContext} context 
 */
function log(level, message, context = {}) {
  if (LOG_LEVELS[level] < currentLevel) return;

  const formatted = formatLog(level, message, context);
  
  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

/**
 * Create a child logger with pre-set context
 * @param {LogContext} defaultContext 
 * @returns {Object} Logger instance with bound context
 */
function createLogger(defaultContext = {}) {
  return {
    debug: (msg, ctx = {}) => log('debug', msg, { ...defaultContext, ...ctx }),
    info: (msg, ctx = {}) => log('info', msg, { ...defaultContext, ...ctx }),
    warn: (msg, ctx = {}) => log('warn', msg, { ...defaultContext, ...ctx }),
    error: (msg, ctx = {}) => log('error', msg, { ...defaultContext, ...ctx }),
    
    /**
     * Create a child logger with additional context
     * @param {LogContext} childContext 
     */
    child: (childContext) => createLogger({ ...defaultContext, ...childContext }),
    
    /**
     * Time an async operation
     * @param {string} operationName 
     * @param {Function} fn 
     * @returns {Promise<any>}
     */
    async time(operationName, fn) {
      const start = Date.now();
      try {
        const result = await fn();
        const durationMs = Date.now() - start;
        this.debug(`${operationName} completed`, { durationMs });
        return result;
      } catch (error) {
        const durationMs = Date.now() - start;
        this.error(`${operationName} failed`, { durationMs, error: error.message });
        throw error;
      }
    }
  };
}

/**
 * Generate a new request ID
 * @returns {string}
 */
function generateRequestId() {
  return randomUUID().slice(0, 8);
}

/**
 * Request logger middleware context
 * @param {Object} req 
 * @returns {Object} Logger with request context
 */
function requestLogger(req) {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  return createLogger({ requestId });
}

// Default exports
export default createLogger();

export {
  createLogger,
  generateRequestId,
  requestLogger,
  log,
  LOG_LEVELS
};
