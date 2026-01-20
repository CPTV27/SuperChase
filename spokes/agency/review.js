/**
 * Agency Review Spoke - Human-in-the-Loop Content Workflow
 * 
 * Manages the multi-stage content approval pipeline:
 * 1. Ingest & Draft → AI generates content
 * 2. Agency Review → Internal approval (you)
 * 3. Client Review → Client portal approval
 * 4. Auto-Publish → Multi-platform distribution
 * 
 * @module spokes/agency/review
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes, createHmac } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { createLogger } from '../../lib/logger.js';
import { SimpleCache } from '../../lib/cache.js';
import { AppError, NotFoundError, ValidationError } from '../../lib/errors.js';
import tenantManager from '../../core/tenant-manager.js';

const logger = createLogger({ spoke: 'agency-review' });
const reviewCache = new SimpleCache({ defaultTTL: 30 * 60 * 1000 }); // 30 min cache

// Configuration
const REVIEW_SECRET = process.env.REVIEW_SECRET || 'superchase-review-2026';
const BASE_URL = process.env.BASE_URL || 'https://superchase-production.up.railway.app';

const PATHS = {
    reviewQueue: join(__dirname, '..', '..', 'memory', 'review_queue.json'),
    manifest: join(__dirname, '..', '..', 'manifest.jsonl')
};

/**
 * Content status in the workflow
 */
export const ContentStatus = {
    DRAFT: 'DRAFT',                    // AI generated, pending agency review
    AGENCY_REVIEW: 'AGENCY_REVIEW',    // Awaiting internal approval
    AGENCY_APPROVED: 'AGENCY_APPROVED', // You approved, ready for client
    CLIENT_REVIEW: 'CLIENT_REVIEW',     // Awaiting client approval
    CLIENT_APPROVED: 'CLIENT_APPROVED', // Client approved, ready to publish
    PUBLISHED: 'PUBLISHED',             // Live
    REJECTED: 'REJECTED',               // Rejected at any stage
    REVISION: 'REVISION'                // Needs revision
};

/**
 * @typedef {Object} ReviewItem
 * @property {string} id - Unique review ID
 * @property {string} clientId - Tenant/client ID
 * @property {string} type - Content type (blog, social, gbp)
 * @property {string} title - Content title
 * @property {string} content - Full content
 * @property {string} status - Current workflow status
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 * @property {Object[]} history - Status change history
 * @property {string} approveToken - Secure token for approval
 * @property {string} rejectToken - Secure token for rejection
 * @property {Object} metadata - Additional metadata
 */

/**
 * Generate secure token for approval links
 * @param {string} itemId 
 * @param {string} action - 'approve' or 'reject'
 * @returns {string}
 */
function generateToken(itemId, action) {
    const data = `${itemId}:${action}:${REVIEW_SECRET}`;
    return createHmac('sha256', REVIEW_SECRET).update(data).digest('hex').slice(0, 32);
}

/**
 * Verify approval token
 * @param {string} itemId 
 * @param {string} action 
 * @param {string} token 
 * @returns {boolean}
 */
export function verifyToken(itemId, action, token) {
    const expected = generateToken(itemId, action);
    return token === expected;
}

/**
 * Load review queue
 * @returns {ReviewItem[]}
 */
function loadQueue() {
    if (!existsSync(PATHS.reviewQueue)) {
        return [];
    }
    try {
        return JSON.parse(readFileSync(PATHS.reviewQueue, 'utf8'));
    } catch {
        return [];
    }
}

/**
 * Save review queue
 * @param {ReviewItem[]} queue 
 */
function saveQueue(queue) {
    const dir = dirname(PATHS.reviewQueue);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    writeFileSync(PATHS.reviewQueue, JSON.stringify(queue, null, 2));
}

/**
 * Create a new review item
 * @param {Object} options
 * @param {string} options.clientId - Tenant/client ID
 * @param {string} options.type - Content type
 * @param {string} options.title - Content title
 * @param {string} options.content - Full content
 * @param {Object} [options.metadata] - Additional metadata
 * @returns {ReviewItem}
 */
export function createReviewItem(options) {
    const { clientId, type, title, content, metadata = {} } = options;

    // Validate client exists
    try {
        tenantManager.getTenant(clientId);
    } catch {
        throw new NotFoundError('Client', clientId);
    }

    const id = `review-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const item = {
        id,
        clientId,
        type,
        title,
        content,
        status: ContentStatus.DRAFT,
        createdAt: now,
        updatedAt: now,
        history: [
            { status: ContentStatus.DRAFT, timestamp: now, actor: 'system' }
        ],
        approveToken: generateToken(id, 'approve'),
        rejectToken: generateToken(id, 'reject'),
        metadata
    };

    // Add to queue
    const queue = loadQueue();
    queue.push(item);
    saveQueue(queue);

    // Log to manifest
    appendFileSync(PATHS.manifest, JSON.stringify({
        timestamp: now,
        agent: 'Agency Review',
        finding: `New draft created: ${title}`,
        type: 'CONTENT_DRAFT',
        status: 'PENDING',
        clientId,
        reviewId: id
    }) + '\n');

    logger.info('Review item created', { id, clientId, type, title });

    return item;
}

/**
 * Get review item by ID
 * @param {string} id 
 * @returns {ReviewItem}
 */
export function getReviewItem(id) {
    const queue = loadQueue();
    const item = queue.find(i => i.id === id);

    if (!item) {
        throw new NotFoundError('Review item', id);
    }

    return item;
}

/**
 * Update review item status
 * @param {string} id 
 * @param {string} newStatus 
 * @param {Object} [options]
 * @param {string} [options.actor] - Who made the change
 * @param {string} [options.note] - Optional note
 * @param {string} [options.feedback] - Revision feedback
 * @returns {ReviewItem}
 */
export function updateStatus(id, newStatus, options = {}) {
    const { actor = 'system', note = '', feedback = '' } = options;

    const queue = loadQueue();
    const index = queue.findIndex(i => i.id === id);

    if (index === -1) {
        throw new NotFoundError('Review item', id);
    }

    const now = new Date().toISOString();

    queue[index].status = newStatus;
    queue[index].updatedAt = now;
    queue[index].history.push({
        status: newStatus,
        timestamp: now,
        actor,
        note,
        feedback
    });

    if (feedback) {
        queue[index].metadata.lastFeedback = feedback;
    }

    saveQueue(queue);

    logger.info('Review status updated', { id, newStatus, actor });

    return queue[index];
}

/**
 * List review items with optional filters
 * @param {Object} [filters]
 * @param {string} [filters.clientId]
 * @param {string} [filters.status]
 * @param {string} [filters.type]
 * @returns {ReviewItem[]}
 */
export function listReviewItems(filters = {}) {
    let queue = loadQueue();

    if (filters.clientId) {
        queue = queue.filter(i => i.clientId === filters.clientId);
    }
    if (filters.status) {
        queue = queue.filter(i => i.status === filters.status);
    }
    if (filters.type) {
        queue = queue.filter(i => i.type === filters.type);
    }

    return queue.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/**
 * Get pending items requiring agency review
 * @returns {ReviewItem[]}
 */
export function getPendingAgencyReview() {
    return listReviewItems({ status: ContentStatus.AGENCY_REVIEW });
}

/**
 * Get pending items requiring client review
 * @param {string} [clientId] 
 * @returns {ReviewItem[]}
 */
export function getPendingClientReview(clientId) {
    const filters = { status: ContentStatus.CLIENT_REVIEW };
    if (clientId) filters.clientId = clientId;
    return listReviewItems(filters);
}

/**
 * Submit content for agency review
 * @param {string} id 
 * @returns {Object}
 */
export function submitForAgencyReview(id) {
    const item = updateStatus(id, ContentStatus.AGENCY_REVIEW, {
        actor: 'system',
        note: 'Submitted for agency review'
    });

    return {
        success: true,
        item,
        approveUrl: `${BASE_URL}/api/review/${id}/approve?token=${item.approveToken}`,
        rejectUrl: `${BASE_URL}/api/review/${id}/reject?token=${item.rejectToken}`,
        message: `Review "${item.title}" is ready for approval`
    };
}

/**
 * Agency approves content (moves to client review)
 * @param {string} id 
 * @param {string} token 
 * @param {Object} [options]
 * @returns {Object}
 */
export function agencyApprove(id, token, options = {}) {
    const item = getReviewItem(id);

    if (!verifyToken(id, 'approve', token)) {
        throw new ValidationError('Invalid approval token');
    }

    if (item.status !== ContentStatus.AGENCY_REVIEW) {
        throw new ValidationError(`Cannot approve item in status: ${item.status}`);
    }

    const updated = updateStatus(id, ContentStatus.CLIENT_REVIEW, {
        actor: 'agency',
        note: options.note || 'Approved by agency'
    });

    // Log to manifest
    appendFileSync(PATHS.manifest, JSON.stringify({
        timestamp: new Date().toISOString(),
        agent: 'Agency Review',
        finding: `Agency approved: ${updated.title}`,
        type: 'CONTENT_APPROVED',
        status: 'CLIENT_REVIEW',
        clientId: updated.clientId,
        reviewId: id
    }) + '\n');

    return {
        success: true,
        item: updated,
        message: `Content approved and sent to ${updated.clientId} for client review`
    };
}

/**
 * Agency rejects content
 * @param {string} id 
 * @param {string} token 
 * @param {Object} options
 * @param {string} [options.feedback] - Revision feedback
 * @returns {Object}
 */
export function agencyReject(id, token, options = {}) {
    const item = getReviewItem(id);

    if (!verifyToken(id, 'reject', token)) {
        throw new ValidationError('Invalid rejection token');
    }

    const { feedback = '' } = options;

    // If feedback provided, mark for revision; otherwise reject
    const newStatus = feedback ? ContentStatus.REVISION : ContentStatus.REJECTED;

    const updated = updateStatus(id, newStatus, {
        actor: 'agency',
        note: feedback ? 'Revision requested' : 'Rejected',
        feedback
    });

    return {
        success: true,
        item: updated,
        message: feedback
            ? `Revision requested for "${updated.title}": ${feedback}`
            : `Content "${updated.title}" rejected`
    };
}

/**
 * Client approves content (ready to publish)
 * @param {string} id 
 * @param {string} clientId - Must match item's clientId
 * @returns {Object}
 */
export function clientApprove(id, clientId) {
    const item = getReviewItem(id);

    if (item.clientId !== clientId) {
        throw new ValidationError('Client mismatch');
    }

    if (item.status !== ContentStatus.CLIENT_REVIEW) {
        throw new ValidationError(`Cannot approve item in status: ${item.status}`);
    }

    const updated = updateStatus(id, ContentStatus.CLIENT_APPROVED, {
        actor: `client:${clientId}`,
        note: 'Approved by client - ready to publish'
    });

    // Log to manifest
    appendFileSync(PATHS.manifest, JSON.stringify({
        timestamp: new Date().toISOString(),
        agent: 'Agency Review',
        finding: `Client approved: ${updated.title}`,
        type: 'CONTENT_CLIENT_APPROVED',
        status: 'READY_TO_PUBLISH',
        clientId: updated.clientId,
        reviewId: id
    }) + '\n');

    return {
        success: true,
        item: updated,
        message: `Content "${updated.title}" approved by client - ready to publish!`
    };
}

/**
 * Client requests revision
 * @param {string} id 
 * @param {string} clientId 
 * @param {string} feedback 
 * @returns {Object}
 */
export function clientRequestRevision(id, clientId, feedback) {
    const item = getReviewItem(id);

    if (item.clientId !== clientId) {
        throw new ValidationError('Client mismatch');
    }

    const updated = updateStatus(id, ContentStatus.REVISION, {
        actor: `client:${clientId}`,
        note: 'Client requested revision',
        feedback
    });

    return {
        success: true,
        item: updated,
        message: `Revision requested: ${feedback}`
    };
}

/**
 * Mark content as published
 * @param {string} id 
 * @param {Object} publishInfo
 * @param {string} publishInfo.platform - Where it was published
 * @param {string} [publishInfo.url] - Published URL
 * @returns {Object}
 */
export function markPublished(id, publishInfo) {
    const item = getReviewItem(id);

    if (item.status !== ContentStatus.CLIENT_APPROVED) {
        throw new ValidationError('Content must be client-approved before publishing');
    }

    const updated = updateStatus(id, ContentStatus.PUBLISHED, {
        actor: 'system',
        note: `Published to ${publishInfo.platform}${publishInfo.url ? ` at ${publishInfo.url}` : ''}`
    });

    // Update metadata with publish info
    const queue = loadQueue();
    const index = queue.findIndex(i => i.id === id);
    if (index !== -1) {
        queue[index].metadata.publishedAt = new Date().toISOString();
        queue[index].metadata.publishedTo = publishInfo.platform;
        queue[index].metadata.publishedUrl = publishInfo.url;
        saveQueue(queue);
    }

    // Log to manifest
    appendFileSync(PATHS.manifest, JSON.stringify({
        timestamp: new Date().toISOString(),
        agent: 'Agency Publisher',
        finding: `Published: ${updated.title} to ${publishInfo.platform}`,
        type: 'CONTENT_PUBLISHED',
        status: 'LIVE',
        clientId: updated.clientId,
        reviewId: id,
        url: publishInfo.url
    }) + '\n');

    logger.info('Content published', { id, platform: publishInfo.platform, url: publishInfo.url });

    return {
        success: true,
        item: updated,
        message: `Content published to ${publishInfo.platform}!`
    };
}

/**
 * Generate notification message for pending reviews
 * @returns {Object}
 */
export function getReviewPulse() {
    const agencyPending = getPendingAgencyReview();
    const clientPending = listReviewItems({ status: ContentStatus.CLIENT_REVIEW });
    const readyToPublish = listReviewItems({ status: ContentStatus.CLIENT_APPROVED });
    const needsRevision = listReviewItems({ status: ContentStatus.REVISION });

    return {
        pulse: 'Agency Review Pulse',
        timestamp: new Date().toISOString(),
        counts: {
            agencyReview: agencyPending.length,
            clientReview: clientPending.length,
            readyToPublish: readyToPublish.length,
            needsRevision: needsRevision.length
        },
        agencyPending: agencyPending.map(i => ({
            id: i.id,
            clientId: i.clientId,
            title: i.title,
            type: i.type,
            approveUrl: `${BASE_URL}/api/review/${i.id}/approve?token=${i.approveToken}`,
            rejectUrl: `${BASE_URL}/api/review/${i.id}/reject?token=${i.rejectToken}`
        })),
        clientPending: clientPending.map(i => ({
            id: i.id,
            clientId: i.clientId,
            title: i.title
        })),
        readyToPublish: readyToPublish.map(i => ({
            id: i.id,
            clientId: i.clientId,
            title: i.title
        })),
        needsRevision: needsRevision.map(i => ({
            id: i.id,
            clientId: i.clientId,
            title: i.title,
            feedback: i.metadata?.lastFeedback
        }))
    };
}

export default {
    ContentStatus,
    createReviewItem,
    getReviewItem,
    updateStatus,
    listReviewItems,
    getPendingAgencyReview,
    getPendingClientReview,
    submitForAgencyReview,
    agencyApprove,
    agencyReject,
    clientApprove,
    clientRequestRevision,
    markPublished,
    getReviewPulse,
    verifyToken
};
