/**
 * SuperChase Library Tests
 * 
 * Unit tests for lib modules: logger.js, errors.js, cache.js
 * Run with: node --test tests/lib.test.js
 * 
 * @module tests/lib.test
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

// Import library modules
import logger, { createLogger, generateRequestId } from '../lib/logger.js';
import {
    AppError,
    ValidationError,
    AuthenticationError,
    NotFoundError,
    ExternalServiceError,
    RateLimitError,
    withErrorHandling,
    withFallback,
    withRetry
} from '../lib/errors.js';
import { SimpleCache, appCache, spokeCache } from '../lib/cache.js';

// ============================================
// Logger Tests
// ============================================

describe('Logger', () => {
    describe('createLogger()', () => {
        it('creates a logger with all log methods', () => {
            const log = createLogger();

            assert.equal(typeof log.debug, 'function');
            assert.equal(typeof log.info, 'function');
            assert.equal(typeof log.warn, 'function');
            assert.equal(typeof log.error, 'function');
        });

        it('creates child loggers with inherited context', () => {
            const parentLog = createLogger({ service: 'test' });
            const childLog = parentLog.child({ component: 'child' });

            assert.equal(typeof childLog.info, 'function');
        });

        it('logs messages without errors', () => {
            const log = createLogger({ test: true });

            // These should not throw
            log.debug('Debug message');
            log.info('Info message');
            log.warn('Warning message');
            log.error('Error message');

            assert.ok(true);
        });
    });

    describe('generateRequestId()', () => {
        it('generates unique IDs', () => {
            const id1 = generateRequestId();
            const id2 = generateRequestId();

            assert.notEqual(id1, id2);
        });

        it('generates 8-character IDs', () => {
            const id = generateRequestId();
            assert.equal(id.length, 8);
        });
    });

    describe('time()', () => {
        it('times async operations', async () => {
            const log = createLogger();

            const result = await log.time('test operation', async () => {
                await delay(10);
                return 'done';
            });

            assert.equal(result, 'done');
        });

        it('handles errors in timed operations', async () => {
            const log = createLogger();

            await assert.rejects(async () => {
                await log.time('failing operation', async () => {
                    throw new Error('Test error');
                });
            });
        });
    });
});

// ============================================
// Error Tests
// ============================================

describe('Custom Errors', () => {
    describe('AppError', () => {
        it('creates error with all properties', () => {
            const error = new AppError('Test error', 500, 'TEST_ERROR', { foo: 'bar' });

            assert.equal(error.message, 'Test error');
            assert.equal(error.statusCode, 500);
            assert.equal(error.code, 'TEST_ERROR');
            assert.deepEqual(error.details, { foo: 'bar' });
            assert.ok(error.timestamp);
            assert.ok(error.stack);
        });

        it('converts to JSON correctly', () => {
            const error = new AppError('Test', 400, 'BAD_REQUEST');
            const json = error.toJSON();

            assert.equal(json.error.code, 'BAD_REQUEST');
            assert.equal(json.error.message, 'Test');
            assert.equal(json._httpStatus, 400);
        });
    });

    describe('ValidationError', () => {
        it('has correct status code', () => {
            const error = new ValidationError('Invalid input', { field: 'email' });

            assert.equal(error.statusCode, 400);
            assert.equal(error.code, 'VALIDATION_ERROR');
        });
    });

    describe('AuthenticationError', () => {
        it('has correct status code', () => {
            const error = new AuthenticationError();

            assert.equal(error.statusCode, 401);
            assert.equal(error.code, 'AUTHENTICATION_ERROR');
        });
    });

    describe('NotFoundError', () => {
        it('formats message with resource and identifier', () => {
            const error = new NotFoundError('Task', 'task-123');

            assert.equal(error.message, "Task 'task-123' not found");
            assert.equal(error.statusCode, 404);
        });

        it('formats message without identifier', () => {
            const error = new NotFoundError('Resource');

            assert.equal(error.message, 'Resource not found');
        });
    });

    describe('ExternalServiceError', () => {
        it('includes service name', () => {
            const error = new ExternalServiceError('Asana', 'API timeout');

            assert.equal(error.service, 'Asana');
            assert.equal(error.statusCode, 502);
            assert.ok(error.message.includes('Asana'));
        });
    });

    describe('RateLimitError', () => {
        it('includes retry after', () => {
            const error = new RateLimitError(120);

            assert.equal(error.statusCode, 429);
            assert.equal(error.retryAfter, 120);
        });
    });
});

describe('Error Wrappers', () => {
    describe('withErrorHandling()', () => {
        it('passes through successful results', async () => {
            const fn = withErrorHandling(async () => 'success');
            const result = await fn();

            assert.equal(result, 'success');
        });

        it('re-throws AppErrors unchanged', async () => {
            const fn = withErrorHandling(async () => {
                throw new ValidationError('Bad input');
            });

            await assert.rejects(fn, ValidationError);
        });

        it('wraps unknown errors in AppError', async () => {
            const fn = withErrorHandling(async () => {
                throw new Error('Unknown error');
            });

            await assert.rejects(fn, AppError);
        });
    });

    describe('withFallback()', () => {
        it('returns result on success', async () => {
            const fn = withFallback(async () => 'success', 'fallback');
            const result = await fn();

            assert.equal(result, 'success');
        });

        it('returns fallback on error', async () => {
            const fn = withFallback(
                async () => { throw new Error('fail'); },
                'fallback'
            );
            const result = await fn();

            assert.equal(result, 'fallback');
        });

        it('supports fallback function', async () => {
            const fn = withFallback(
                async () => { throw new Error('fail'); },
                (error) => `caught: ${error.message}`
            );
            const result = await fn();

            assert.equal(result, 'caught: fail');
        });
    });

    describe('withRetry()', () => {
        it('returns on first success', async () => {
            let attempts = 0;
            const fn = withRetry(async () => {
                attempts++;
                return 'success';
            });

            const result = await fn();
            assert.equal(result, 'success');
            assert.equal(attempts, 1);
        });

        it('retries on failure', async () => {
            let attempts = 0;
            const fn = withRetry(async () => {
                attempts++;
                if (attempts < 3) throw new Error('fail');
                return 'success';
            }, { baseDelayMs: 10 });

            const result = await fn();
            assert.equal(result, 'success');
            assert.equal(attempts, 3);
        });

        it('throws after max retries', async () => {
            let attempts = 0;
            const fn = withRetry(async () => {
                attempts++;
                throw new Error('always fails');
            }, { maxRetries: 2, baseDelayMs: 10 });

            await assert.rejects(fn);
            assert.equal(attempts, 3); // 1 initial + 2 retries
        });
    });
});

// ============================================
// Cache Tests
// ============================================

describe('SimpleCache', () => {
    let cache;

    beforeEach(() => {
        cache = new SimpleCache({ defaultTTL: 1000 });
    });

    describe('get/set', () => {
        it('stores and retrieves values', () => {
            cache.set('key', 'value');
            assert.equal(cache.get('key'), 'value');
        });

        it('returns undefined for missing keys', () => {
            assert.equal(cache.get('missing'), undefined);
        });

        it('respects TTL', async () => {
            cache.set('key', 'value', 50);
            assert.equal(cache.get('key'), 'value');

            await delay(100);
            assert.equal(cache.get('key'), undefined);
        });
    });

    describe('has/delete', () => {
        it('checks existence correctly', () => {
            cache.set('key', 'value');
            assert.equal(cache.has('key'), true);
            assert.equal(cache.has('missing'), false);
        });

        it('deletes entries', () => {
            cache.set('key', 'value');
            cache.delete('key');
            assert.equal(cache.has('key'), false);
        });
    });

    describe('clear()', () => {
        it('removes all entries', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.clear();

            assert.equal(cache.has('key1'), false);
            assert.equal(cache.has('key2'), false);
        });
    });

    describe('stats()', () => {
        it('returns cache statistics', () => {
            cache.set('key', 'value');
            const stats = cache.stats();

            assert.ok(typeof stats.size === 'number');
            assert.ok(typeof stats.activeEntries === 'number');
            assert.ok(typeof stats.maxSize === 'number');
        });
    });

    describe('getOrCompute()', () => {
        it('returns cached value if exists', async () => {
            cache.set('key', 'cached');

            let computed = false;
            const result = await cache.getOrCompute('key', async () => {
                computed = true;
                return 'computed';
            });

            assert.equal(result, 'cached');
            assert.equal(computed, false);
        });

        it('computes and caches if missing', async () => {
            const result = await cache.getOrCompute('key', async () => 'computed');

            assert.equal(result, 'computed');
            assert.equal(cache.get('key'), 'computed');
        });
    });

    describe('memoize()', () => {
        it('memoizes function calls', async () => {
            let calls = 0;
            const expensiveFn = async (x) => {
                calls++;
                return x * 2;
            };

            const memoized = cache.memoize(expensiveFn);

            await memoized(5);
            await memoized(5);
            await memoized(5);

            assert.equal(calls, 1);
        });
    });
});

describe('Spoke Caches', () => {
    it('has separate cache for asana', () => {
        assert.ok(spokeCache.asana instanceof SimpleCache);
    });

    it('has separate cache for twitter', () => {
        assert.ok(spokeCache.twitter instanceof SimpleCache);
    });

    it('has separate cache for strategy', () => {
        assert.ok(spokeCache.strategy instanceof SimpleCache);
    });
});

describe('App Cache', () => {
    it('is a singleton SimpleCache instance', () => {
        assert.ok(appCache instanceof SimpleCache);
    });
});
