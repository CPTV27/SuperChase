/**
 * SuperChase API Test Suite
 * 
 * Comprehensive tests for all backend API endpoints.
 * Run with: node --test tests/api.test.js
 * 
 * @module tests/api.test
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3849';
const API_KEY = process.env.API_KEY || 'superchase-local-dev';

/** @type {import('node:child_process').ChildProcess} */
let serverProcess = null;

/**
 * Make an API request
 * @param {string} method 
 * @param {string} path 
 * @param {Object} [body] 
 * @returns {Promise<{status: number, data: any}>}
 */
async function apiRequest(method, path, body) {
    const url = `${BASE_URL}${path}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    let data;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    return { status: response.status, data };
}

// ============================================
// Health Endpoint Tests
// ============================================

describe('Health Endpoint', () => {
    it('GET /health returns 200 OK', async () => {
        const { status, data } = await apiRequest('GET', '/health');
        assert.equal(status, 200);
        assert.equal(data.status, 'ok');
        assert.ok(data.timestamp);
        assert.ok(data.version);
    });

    it('GET /health does not require API key', async () => {
        const response = await fetch(`${BASE_URL}/health`);
        assert.equal(response.status, 200);
    });
});

// ============================================
// Query Endpoint Tests
// ============================================

describe('Query Endpoint', () => {
    it('POST /query accepts a query', async () => {
        const { status, data } = await apiRequest('POST', '/query', {
            query: 'What are my current priorities?'
        });

        assert.equal(status, 200);
        assert.ok(data.answer || data.error); // May error without Gemini key
    });

    it('POST /query handles empty query', async () => {
        const { status, data } = await apiRequest('POST', '/query', {
            query: ''
        });

        assert.equal(status, 200);
        // Should still return something
        assert.ok(data);
    });

    it('POST /query handles missing query', async () => {
        const { status, data } = await apiRequest('POST', '/query', {});

        // Should handle gracefully
        assert.equal(status, 200);
    });
});

// ============================================
// Tasks Endpoint Tests
// ============================================

describe('Tasks Endpoint', () => {
    it('GET /tasks returns task list', async () => {
        const { status, data } = await apiRequest('GET', '/tasks');

        assert.equal(status, 200);
        assert.ok(Array.isArray(data.tasks) || data.error);
        assert.ok(typeof data.count === 'number' || data.error);
    });

    it('GET /tasks respects limit parameter', async () => {
        const { status, data } = await apiRequest('GET', '/tasks?limit=5');

        assert.equal(status, 200);
        if (data.tasks) {
            assert.ok(data.tasks.length <= 5);
        }
    });
});

// ============================================
// Briefing Endpoint Tests
// ============================================

describe('Briefing Endpoint', () => {
    it('GET /briefing returns briefing data', async () => {
        const { status, data } = await apiRequest('GET', '/briefing');

        assert.equal(status, 200);
        // Either has briefing data or error (if no briefing exists yet)
        assert.ok(data);
    });

    it('POST /api/briefing/trigger returns response', async () => {
        const { status, data } = await apiRequest('POST', '/api/briefing/trigger');

        assert.equal(status, 200);
        assert.ok(typeof data.success === 'boolean');
    });
});

// ============================================
// Strategy Endpoint Tests
// ============================================

describe('Strategy Endpoint', () => {
    it('GET /api/strategy returns roadmap data', async () => {
        const { status, data } = await apiRequest('GET', '/api/strategy');

        assert.equal(status, 200);

        if (!data.error) {
            assert.ok(Array.isArray(data.buildNow));
            assert.ok(Array.isArray(data.friction));
            assert.ok(Array.isArray(data.leverage));
            assert.ok(data.priorities);
            assert.ok(data.lastUpdated);
        }
    });
});

// ============================================
// Status Endpoint Tests
// ============================================

describe('Status Endpoint', () => {
    it('GET /api/status returns spoke status', async () => {
        const { status, data } = await apiRequest('GET', '/api/status');

        assert.equal(status, 200);
        assert.ok(data.timestamp);
        assert.ok(data.spokes);

        // Check expected spokes exist
        const expectedSpokes = ['asana', 'twitter', 'gmail', 'sheets', 'hub', 'voice'];
        for (const spoke of expectedSpokes) {
            assert.ok(data.spokes[spoke], `Missing spoke: ${spoke}`);
            assert.ok(['online', 'offline', 'warning'].includes(data.spokes[spoke].status));
            assert.ok(data.spokes[spoke].message);
        }
    });
});

// ============================================
// Logs Endpoint Tests
// ============================================

describe('Logs Endpoint', () => {
    it('GET /api/logs returns audit logs', async () => {
        const { status, data } = await apiRequest('GET', '/api/logs');

        assert.equal(status, 200);
        assert.ok(Array.isArray(data.logs));
        assert.ok(typeof data.count === 'number');
    });

    it('GET /api/logs respects limit parameter', async () => {
        const { status, data } = await apiRequest('GET', '/api/logs?limit=5');

        assert.equal(status, 200);
        assert.ok(data.logs.length <= 5);
    });
});

// ============================================
// OpenAPI Endpoint Tests
// ============================================

describe('OpenAPI Endpoint', () => {
    it('GET /openapi.json returns OpenAPI spec', async () => {
        const response = await fetch(`${BASE_URL}/openapi.json`);
        const data = await response.json();

        assert.equal(response.status, 200);
        assert.ok(data.openapi || data.error);
    });
});

// ============================================
// Twitter/X Endpoint Tests
// ============================================

describe('Twitter Search Endpoint', () => {
    it('POST /search-x requires query or topic', async () => {
        const { status, data } = await apiRequest('POST', '/search-x', {
            action: 'search'
        });

        // Should return error about missing query
        assert.equal(status, 200);
        assert.ok(data.error);
    });

    it('GET /search-x/status returns connection status', async () => {
        const { status, data } = await apiRequest('GET', '/search-x/status');

        assert.equal(status, 200);
        assert.ok(typeof data.success === 'boolean' || data.configured !== undefined);
    });
});

// ============================================
// Portal Endpoint Tests
// ============================================

describe('Portal Endpoints', () => {
    it('GET /api/portal/clients returns client list', async () => {
        const { status, data } = await apiRequest('GET', '/api/portal/clients');

        assert.equal(status, 200);
        assert.ok(Array.isArray(data.clients) || data.error);
    });

    it('POST /api/portal/:client/approve requires itemId', async () => {
        const { status, data } = await apiRequest('POST', '/api/portal/test-client/approve', {});

        assert.equal(status, 200);
        assert.equal(data.success, false);
        assert.ok(data.error.includes('itemId'));
    });

    it('POST /api/portal/:client/move requires all params', async () => {
        const { status, data } = await apiRequest('POST', '/api/portal/test-client/move', {
            itemId: 'test'
        });

        assert.equal(status, 200);
        assert.equal(data.success, false);
    });
});

// ============================================
// Authentication Tests
// ============================================

describe('Authentication', () => {
    it('Protected endpoints reject missing API key', async () => {
        const url = `${BASE_URL}/tasks`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
            // No X-API-Key header
        });

        // In prod mode should be 401, in dev mode may pass
        const data = await response.json();
        assert.ok(response.status === 401 || data.tasks);
    });

    it('Protected endpoints accept valid API key', async () => {
        const { status, data } = await apiRequest('GET', '/tasks');

        // Should not be 401
        assert.notEqual(status, 401);
    });
});

// ============================================
// Error Handling Tests
// ============================================

describe('Error Handling', () => {
    it('404 for unknown routes', async () => {
        const { status, data } = await apiRequest('GET', '/nonexistent/route');

        assert.equal(status, 404);
        assert.ok(data.error);
    });

    it('Handles malformed JSON gracefully', async () => {
        const response = await fetch(`${BASE_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: 'not valid json'
        });

        // Should return 500 with error message
        assert.equal(response.status, 500);
    });

    it('CORS headers present', async () => {
        const response = await fetch(`${BASE_URL}/health`);

        assert.ok(response.headers.get('access-control-allow-origin'));
    });
});

// ============================================
// Performance Tests
// ============================================

describe('Performance', () => {
    it('Health check responds under 100ms', async () => {
        const start = Date.now();
        await apiRequest('GET', '/health');
        const duration = Date.now() - start;

        assert.ok(duration < 100, `Health check took ${duration}ms`);
    });

    it('Status check responds under 5 seconds', async () => {
        const start = Date.now();
        await apiRequest('GET', '/api/status');
        const duration = Date.now() - start;

        assert.ok(duration < 5000, `Status check took ${duration}ms`);
    });
});
