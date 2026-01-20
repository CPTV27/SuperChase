/**
 * SuperChase Error Handling
 * 
 * Custom error classes and utilities for consistent error handling
 * across the application.
 * 
 * @module lib/errors
 */

/**
 * Base application error with HTTP status code
 */
export class AppError extends Error {
    /**
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {string} code - Machine-readable error code
     * @param {Object} [details] - Additional error details
     */
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert to JSON response
     * @param {boolean} includeStack - Include stack trace (only in dev)
     * @returns {Object}
     */
    toJSON(includeStack = false) {
        return {
            error: {
                code: this.code,
                message: this.message,
                ...(Object.keys(this.details).length > 0 && { details: this.details }),
                ...(includeStack && { stack: this.stack })
            },
            _httpStatus: this.statusCode
        };
    }
}

/**
 * Validation error (400 Bad Request)
 */
export class ValidationError extends AppError {
    /**
     * @param {string} message 
     * @param {Object} [fields] - Field-specific errors
     */
    constructor(message, fields = {}) {
        super(message, 400, 'VALIDATION_ERROR', { fields });
    }
}

/**
 * Authentication error (401 Unauthorized)
 */
export class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

/**
 * Authorization error (403 Forbidden)
 */
export class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
    /**
     * @param {string} resource - Name of the missing resource
     * @param {string} [identifier] - Resource identifier
     */
    constructor(resource, identifier) {
        const message = identifier
            ? `${resource} '${identifier}' not found`
            : `${resource} not found`;
        super(message, 404, 'NOT_FOUND', { resource, identifier });
    }
}

/**
 * External service error (502 Bad Gateway)
 */
export class ExternalServiceError extends AppError {
    /**
     * @param {string} service - Name of the external service
     * @param {string} message - Error message
     * @param {Object} [details] - Additional details
     */
    constructor(service, message, details = {}) {
        super(`${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', { service, ...details });
        this.service = service;
    }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
    /**
     * @param {number} retryAfter - Seconds until retry is allowed
     */
    constructor(retryAfter = 60) {
        super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
        this.retryAfter = retryAfter;
    }
}

/**
 * Service unavailable (503)
 */
export class ServiceUnavailableError extends AppError {
    /**
     * @param {string} service - Name of the unavailable service
     */
    constructor(service) {
        super(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE', { service });
    }
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            // Wrap unknown errors
            throw new AppError(error.message, 500, 'INTERNAL_ERROR', {
                originalError: error.name
            });
        }
    };
}

/**
 * Safe fallback wrapper - returns fallback value on error
 * @param {Function} fn - Function to execute
 * @param {any} fallback - Fallback value on error
 * @param {Function} [onError] - Optional error callback
 * @returns {Function} Wrapped function
 */
export function withFallback(fn, fallback, onError) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            if (onError) onError(error);
            return typeof fallback === 'function' ? fallback(error, ...args) : fallback;
        }
    };
}

/**
 * Retry wrapper with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.baseDelayMs=1000] - Base delay in milliseconds
 * @param {Function} [options.shouldRetry] - Function to determine if error is retryable
 * @returns {Function} Wrapped function with retry logic
 */
export function withRetry(fn, options = {}) {
    const {
        maxRetries = 3,
        baseDelayMs = 1000,
        shouldRetry = () => true
    } = options;

    return async (...args) => {
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn(...args);
            } catch (error) {
                lastError = error;

                if (attempt === maxRetries || !shouldRetry(error)) {
                    throw error;
                }

                // Exponential backoff with jitter
                const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    };
}

export default {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ExternalServiceError,
    RateLimitError,
    ServiceUnavailableError,
    withErrorHandling,
    withFallback,
    withRetry
};
