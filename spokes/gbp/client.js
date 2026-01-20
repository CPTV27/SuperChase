/**
 * Google Business Profile Spoke
 * 
 * Automates Local Pack ranking through:
 * - Automated Google Updates from blog posts
 * - Fresh media uploads to GBP gallery
 * - Hyper-local FAQ management
 * 
 * Requires: Google Business Profile API access
 * Setup: https://developers.google.com/my-business/content/overview
 * 
 * @module spokes/gbp/client
 */

import { createLogger } from '../../lib/logger.js';
import { SimpleCache } from '../../lib/cache.js';
import { ExternalServiceError, withRetry } from '../../lib/errors.js';

const logger = createLogger({ spoke: 'gbp' });
const gbpCache = new SimpleCache({ defaultTTL: 10 * 60 * 1000 }); // 10 min cache

// GBP API Configuration
const GBP_API_KEY = process.env.GBP_API_KEY;
const GBP_BASE_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1';

/**
 * Check if GBP is configured
 * @returns {boolean}
 */
export function isConfigured() {
    return !!(GBP_API_KEY && GBP_API_KEY !== 'NEEDS_VALUE');
}

/**
 * Make authenticated request to GBP API
 * @param {string} endpoint 
 * @param {Object} options 
 * @returns {Promise<Object>}
 */
async function gbpRequest(endpoint, options = {}) {
    if (!isConfigured()) {
        throw new ExternalServiceError('Google Business Profile', 'API not configured');
    }

    const url = `${GBP_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${GBP_API_KEY}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new ExternalServiceError('Google Business Profile', `API error ${response.status}: ${error}`);
    }

    return response.json();
}

/**
 * Get location details
 * @param {string} locationId 
 * @returns {Promise<Object>}
 */
export async function getLocation(locationId) {
    const cacheKey = `gbp-location-${locationId}`;
    const cached = gbpCache.get(cacheKey);
    if (cached) return cached;

    logger.info('Fetching GBP location', { locationId });

    const result = await withRetry(async () => {
        return gbpRequest(`/locations/${locationId}`);
    }, { maxRetries: 2 });

    gbpCache.set(cacheKey, result);
    return result;
}

/**
 * Create a Google Update (post)
 * @param {string} locationId 
 * @param {Object} post
 * @param {string} post.summary - Post text (max 1500 chars)
 * @param {string} [post.callToAction] - CTA type: BOOK, ORDER, SHOP, LEARN_MORE, SIGN_UP, CALL
 * @param {string} [post.url] - CTA URL
 * @param {string} [post.mediaUrl] - Image URL
 * @returns {Promise<Object>}
 */
export async function createPost(locationId, post) {
    logger.info('Creating GBP post', { locationId, summary: post.summary?.substring(0, 50) });

    const payload = {
        languageCode: 'en-US',
        summary: post.summary.substring(0, 1500),
        topicType: 'STANDARD'
    };

    if (post.callToAction && post.url) {
        payload.callToAction = {
            actionType: post.callToAction,
            url: post.url
        };
    }

    if (post.mediaUrl) {
        payload.media = [{
            mediaFormat: 'PHOTO',
            sourceUrl: post.mediaUrl
        }];
    }

    return gbpRequest(`/locations/${locationId}/localPosts`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Upload media to GBP gallery
 * @param {string} locationId 
 * @param {Object} media
 * @param {string} media.url - Public URL of the image
 * @param {string} [media.category] - COVER, PROFILE, LOGO, EXTERIOR, INTERIOR, PRODUCT, AT_WORK, FOOD_AND_DRINK, MENU, COMMON_AREA, ROOMS, TEAMS, ADDITIONAL
 * @param {string} [media.description] - Alt text / description
 * @returns {Promise<Object>}
 */
export async function uploadMedia(locationId, media) {
    logger.info('Uploading media to GBP', { locationId, category: media.category });

    return gbpRequest(`/locations/${locationId}/media`, {
        method: 'POST',
        body: JSON.stringify({
            mediaFormat: 'PHOTO',
            sourceUrl: media.url,
            locationAssociation: {
                category: media.category || 'ADDITIONAL'
            },
            description: media.description
        })
    });
}

/**
 * Update Q&A with hyper-local FAQ
 * @param {string} locationId 
 * @param {Object} qa
 * @param {string} qa.question - The question
 * @param {string} qa.answer - The answer
 * @returns {Promise<Object>}
 */
export async function addQuestion(locationId, qa) {
    logger.info('Adding Q&A to GBP', { locationId, question: qa.question?.substring(0, 50) });

    // Note: Q&A API has limited write access - may need manual approval
    return gbpRequest(`/locations/${locationId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
            text: qa.question,
            author: { displayName: 'Business Owner' }
        })
    });
}

/**
 * Get location insights/analytics
 * @param {string} locationId 
 * @param {string} [startDate] - YYYY-MM-DD
 * @param {string} [endDate] - YYYY-MM-DD
 * @returns {Promise<Object>}
 */
export async function getInsights(locationId, startDate, endDate) {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    logger.info('Fetching GBP insights', { locationId });

    return gbpRequest(`/locations/${locationId}:reportInsights`, {
        method: 'POST',
        body: JSON.stringify({
            basicRequest: {
                metricRequests: [
                    { metric: 'QUERIES_DIRECT' },
                    { metric: 'QUERIES_INDIRECT' },
                    { metric: 'VIEWS_MAPS' },
                    { metric: 'VIEWS_SEARCH' },
                    { metric: 'ACTIONS_WEBSITE' },
                    { metric: 'ACTIONS_PHONE' },
                    { metric: 'ACTIONS_DRIVING_DIRECTIONS' }
                ],
                timeRange: {
                    startTime: `${startDate || thirtyDaysAgo}T00:00:00Z`,
                    endTime: `${endDate || today}T23:59:59Z`
                }
            }
        })
    });
}

/**
 * Handle tenant-routed GBP action
 * @param {string} action 
 * @param {Object} payload 
 * @param {Object} tenant - Tenant config
 * @returns {Promise<Object>}
 */
export async function handleAction(action, payload, tenant) {
    const locationId = tenant.integrations?.gbp?.locationId;

    if (!locationId) {
        return {
            success: false,
            error: 'GBP not configured for this tenant. Set integrations.gbp.locationId in config.'
        };
    }

    switch (action) {
        case 'post':
            return createPost(locationId, payload);

        case 'media':
            return uploadMedia(locationId, payload);

        case 'qa':
            return addQuestion(locationId, payload);

        case 'insights':
            return getInsights(locationId, payload.startDate, payload.endDate);

        case 'location':
            return getLocation(locationId);

        default:
            return { success: false, error: `Unknown GBP action: ${action}` };
    }
}

/**
 * Sync blog post to GBP as a Google Update
 * @param {Object} blogPost
 * @param {string} blogPost.title
 * @param {string} blogPost.excerpt
 * @param {string} blogPost.url
 * @param {string} [blogPost.image]
 * @param {Object} tenant - Tenant config
 * @returns {Promise<Object>}
 */
export async function syncBlogToGBP(blogPost, tenant) {
    const locationId = tenant.integrations?.gbp?.locationId;

    if (!locationId || !tenant.integrations?.gbp?.enabled) {
        logger.debug('GBP sync skipped - not enabled', { tenantId: tenant.id });
        return { synced: false, reason: 'GBP not enabled' };
    }

    const summary = `${blogPost.title}\n\n${blogPost.excerpt}`.substring(0, 1500);

    try {
        const result = await createPost(locationId, {
            summary,
            callToAction: 'LEARN_MORE',
            url: blogPost.url,
            mediaUrl: blogPost.image
        });

        logger.info('Blog synced to GBP', { tenantId: tenant.id, postId: result.name });
        return { synced: true, postId: result.name };
    } catch (error) {
        logger.error('GBP sync failed', { tenantId: tenant.id, error: error.message });
        return { synced: false, error: error.message };
    }
}

/**
 * Test GBP connection
 * @returns {Promise<Object>}
 */
export async function testConnection() {
    if (!isConfigured()) {
        return {
            connected: false,
            error: 'GBP_API_KEY not configured'
        };
    }

    try {
        // Test API access
        await gbpRequest('/accounts');
        return { connected: true };
    } catch (error) {
        return {
            connected: false,
            error: error.message
        };
    }
}

export default {
    isConfigured,
    getLocation,
    createPost,
    uploadMedia,
    addQuestion,
    getInsights,
    handleAction,
    syncBlogToGBP,
    testConnection
};
