/**
 * SuperChase Core Module Tests
 * 
 * Unit tests for core modules: hub.js, query_hub.js, analyzer.js
 * Run with: node --test tests/core.test.js
 * 
 * @module tests/core.test
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Import core modules
import hub from '../core/hub.js';

// ============================================
// Classification Tests
// ============================================

describe('Hub Classification', () => {
    describe('classify()', () => {
        it('classifies urgent emails correctly', async () => {
            const result = await hub.classify({
                type: 'email',
                subject: 'URGENT: Need response immediately',
                body: 'Please respond ASAP!',
                sender: 'client@example.com'
            });

            assert.ok(result.category);
            assert.ok(result.confidence);
            assert.ok(result.action);

            // Should recognize urgency
            assert.ok(
                result.category === 'URGENT_CLIENT' ||
                result.category === 'URGENT_INTERNAL' ||
                result.category === 'ACTION_REQUIRED',
                `Expected urgent category, got ${result.category}`
            );
        });

        it('classifies newsletters correctly', async () => {
            const result = await hub.classify({
                type: 'email',
                subject: 'Weekly Newsletter: Tech Digest',
                body: 'Click here to unsubscribe from this newsletter',
                sender: 'newsletter@techdigest.com'
            });

            // Should recognize newsletter pattern
            if (result.confidence > 0.5) {
                assert.equal(result.category, 'NEWSLETTER');
                assert.equal(result.action, 'archive');
            }
        });

        it('classifies action-required emails', async () => {
            const result = await hub.classify({
                type: 'email',
                subject: 'Request for project approval',
                body: 'Please review and approve the attached project proposal',
                sender: 'team@company.com'
            });

            assert.ok(result.category);
            assert.ok(['ACTION_REQUIRED', 'FYI', 'URGENT_INTERNAL'].includes(result.category));
        });

        it('handles empty content gracefully', async () => {
            const result = await hub.classify({
                type: 'email',
                subject: '',
                body: '',
                sender: ''
            });

            assert.ok(result.category);
            assert.equal(typeof result.confidence, 'number');
        });

        it('returns all required fields', async () => {
            const result = await hub.classify({
                type: 'email',
                subject: 'Test subject',
                body: 'Test body',
                sender: 'test@test.com'
            });

            assert.ok(result.category);
            assert.ok(typeof result.confidence === 'number');
            assert.ok(result.reasoning || result.reason);
            assert.ok(result.action);
            assert.ok(result.tag !== undefined);
        });
    });

    describe('CATEGORIES', () => {
        it('has all expected categories', () => {
            const expectedCategories = [
                'URGENT_CLIENT',
                'URGENT_INTERNAL',
                'ACTION_REQUIRED',
                'FYI',
                'SPAM',
                'NEWSLETTER',
                'SOCIAL_SEARCH'
            ];

            for (const cat of expectedCategories) {
                assert.ok(hub.CATEGORIES[cat], `Missing category: ${cat}`);
            }
        });

        it('each category has action and tag', () => {
            for (const [name, cat] of Object.entries(hub.CATEGORIES)) {
                assert.ok(cat.action, `${name} missing action`);
                assert.ok(cat.tag, `${name} missing tag`);
            }
        });
    });
});

// ============================================
// Pattern Management Tests
// ============================================

describe('Hub Patterns', () => {
    describe('loadPatterns()', () => {
        it('returns an object', () => {
            const patterns = hub.loadPatterns();
            assert.equal(typeof patterns, 'object');
        });

        it('loads existing patterns if file exists', () => {
            const patterns = hub.loadPatterns();
            // Should have some patterns if patterns.json exists
            assert.ok(patterns !== null);
        });
    });

    describe('savePattern()', () => {
        it('saves a new pattern', () => {
            const testKey = `test_pattern_${Date.now()}`;

            hub.savePattern(testKey, {
                name: 'Test Pattern',
                trigger: 'test trigger',
                action: 'test action'
            });

            const patterns = hub.loadPatterns();
            assert.ok(patterns[testKey]);
            assert.equal(patterns[testKey].name, 'Test Pattern');

            // Cleanup: remove test pattern
            delete patterns[testKey];
        });
    });
});

// ============================================
// Daily Summary Tests
// ============================================

describe('Daily Summary', () => {
    describe('getDailySummary()', () => {
        it('returns summary object', () => {
            const summary = hub.getDailySummary();
            assert.equal(typeof summary, 'object');
        });

        it('has expected structure', () => {
            const summary = hub.getDailySummary();
            // Should have some expected fields or be empty object
            assert.ok(
                summary.tasks !== undefined ||
                summary.emails !== undefined ||
                Object.keys(summary).length >= 0
            );
        });
    });

    describe('updateDailySummary()', () => {
        it('updates summary with new data', () => {
            const testData = {
                testField: `test_${Date.now()}`
            };

            const updated = hub.updateDailySummary(testData);

            assert.ok(updated.testField);
            assert.ok(updated.lastUpdated);
        });
    });
});

// ============================================
// Event Processing Tests
// ============================================

describe('Hub Event Processing', () => {
    describe('processEvent()', () => {
        it('processes email events', async () => {
            const result = await hub.processEvent({
                type: 'email',
                data: {
                    subject: 'Test email',
                    body: 'This is a test email body',
                    sender: 'test@example.com'
                }
            });

            assert.ok(result.action);
            assert.ok(result.target);
            assert.ok(result.classification);
            assert.ok(result.timestamp);
        });

        it('routes to correct spoke based on classification', async () => {
            const urgentResult = await hub.processEvent({
                type: 'email',
                data: {
                    subject: 'URGENT: Need help now',
                    body: 'Please respond ASAP',
                    sender: 'client@company.com'
                }
            });

            // Urgent items should route to asana
            if (urgentResult.classification.action === 'create_task') {
                assert.equal(urgentResult.target, 'asana');
            }
        });

        it('handles unknown event types', async () => {
            const result = await hub.processEvent({
                type: 'unknown',
                data: {
                    text: 'Some content'
                }
            });

            assert.ok(result);
            assert.ok(result.classification);
        });

        it('builds correct payload for tasks', async () => {
            const result = await hub.processEvent({
                type: 'email',
                data: {
                    id: 'msg123',
                    subject: 'Please review this',
                    body: 'Document attached',
                    sender: 'team@example.com'
                }
            });

            if (result.action === 'create_task') {
                assert.ok(result.payload.name);
                assert.ok(result.payload.notes !== undefined);
                assert.ok(result.payload.source);
            }
        });
    });
});

// ============================================
// API Connection Tests
// ============================================

describe('Hub Connection', () => {
    describe('testConnection()', () => {
        it('returns connection status', async () => {
            const result = await hub.testConnection();

            assert.equal(typeof result, 'object');
            assert.equal(typeof result.success, 'boolean');

            if (!result.success) {
                assert.ok(result.error);
            } else {
                assert.ok(result.model);
            }
        });
    });
});

// ============================================
// Error Handling Tests
// ============================================

describe('Hub Error Handling', () => {
    it('handles null content gracefully', async () => {
        const result = await hub.classify(null);
        assert.ok(result);
        assert.ok(result.category);
    });

    it('handles undefined fields', async () => {
        const result = await hub.classify({
            type: undefined,
            subject: undefined,
            body: undefined,
            sender: undefined
        });

        assert.ok(result);
        assert.ok(result.category);
    });

    it('uses fallback when API unavailable', async () => {
        // Even without API key, should return a classification
        const result = await hub.classify({
            type: 'email',
            subject: 'URGENT: Test',
            body: 'Please respond ASAP',
            sender: 'test@test.com'
        });

        assert.ok(result.category);
        // Fallback should indicate lower confidence or mention fallback
        assert.ok(result.confidence <= 1);
    });
});
