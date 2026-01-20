/**
 * SuperChase Agency - Tenant Manager
 * 
 * Manages multi-client "Agency Mode" with isolated tenant data
 * but shared core logic (Scout, Editor, Publisher).
 * 
 * Architecture:
 * - Each client is a "tenant" with isolated data
 * - All tenants share the same processing pipeline
 * - Config lives in /clients/{client_id}/config.json
 * 
 * @module core/tenant-manager
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../lib/logger.js';
import { SimpleCache } from '../lib/cache.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({ module: 'tenant-manager' });
const tenantCache = new SimpleCache({ defaultTTL: 5 * 60 * 1000 }); // 5 min cache

const CLIENTS_DIR = join(__dirname, '..', 'clients');

/**
 * @typedef {Object} TenantConfig
 * @property {string} id - Unique client identifier (e.g., 'bigmuddy')
 * @property {string} name - Display name
 * @property {string} businessType - Type of business
 * @property {Object} branding - Brand voice and visual identity
 * @property {Object} seo - SEO configuration
 * @property {Object} integrations - External service configs
 * @property {Object} workflows - Automated workflow settings
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * Get tenant directory path
 * @param {string} clientId 
 * @returns {string}
 */
function getTenantDir(clientId) {
    return join(CLIENTS_DIR, clientId);
}

/**
 * Get tenant config path
 * @param {string} clientId 
 * @returns {string}
 */
function getConfigPath(clientId) {
    return join(getTenantDir(clientId), 'config.json');
}

/**
 * Check if tenant exists
 * @param {string} clientId 
 * @returns {boolean}
 */
export function tenantExists(clientId) {
    return existsSync(getConfigPath(clientId));
}

/**
 * Get tenant configuration
 * @param {string} clientId 
 * @returns {TenantConfig}
 */
export function getTenant(clientId) {
    const cacheKey = `tenant-${clientId}`;
    const cached = tenantCache.get(cacheKey);
    if (cached) return cached;

    const configPath = getConfigPath(clientId);

    if (!existsSync(configPath)) {
        throw new NotFoundError('Tenant', clientId);
    }

    try {
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        tenantCache.set(cacheKey, config);
        return config;
    } catch (error) {
        logger.error('Failed to load tenant config', { clientId, error: error.message });
        throw error;
    }
}

/**
 * List all tenants
 * @returns {TenantConfig[]}
 */
export function listTenants() {
    if (!existsSync(CLIENTS_DIR)) {
        return [];
    }

    const dirs = readdirSync(CLIENTS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    return dirs.map(id => {
        try {
            return getTenant(id);
        } catch {
            return null;
        }
    }).filter(Boolean);
}

/**
 * Create a new tenant
 * @param {Object} options
 * @param {string} options.id - Unique client ID (lowercase, no spaces)
 * @param {string} options.name - Display name
 * @param {string} options.businessType - Type of business
 * @param {Object} [options.branding] - Brand configuration
 * @param {Object} [options.seo] - SEO configuration
 * @returns {TenantConfig}
 */
export function createTenant(options) {
    const { id, name, businessType } = options;

    // Validate ID
    if (!id || !/^[a-z0-9-]+$/.test(id)) {
        throw new ValidationError('Client ID must be lowercase alphanumeric with hyphens');
    }

    if (tenantExists(id)) {
        throw new ValidationError(`Tenant "${id}" already exists`);
    }

    const tenantDir = getTenantDir(id);

    // Create tenant directory structure
    mkdirSync(tenantDir, { recursive: true });
    mkdirSync(join(tenantDir, 'assets'), { recursive: true });
    mkdirSync(join(tenantDir, 'content'), { recursive: true });
    mkdirSync(join(tenantDir, 'queue'), { recursive: true });

    const now = new Date().toISOString();

    /** @type {TenantConfig} */
    const config = {
        id,
        name,
        businessType,
        branding: {
            voice: options.branding?.voice || 'professional',
            tone: options.branding?.tone || 'friendly',
            colors: options.branding?.colors || {},
            fonts: options.branding?.fonts || {}
        },
        seo: {
            primaryKeywords: options.seo?.primaryKeywords || [],
            localKeywords: options.seo?.localKeywords || [],
            contentPillars: options.seo?.contentPillars || [],
            competitors: options.seo?.competitors || []
        },
        integrations: {
            gbp: { enabled: false, locationId: null },
            website: { platform: null, apiKey: null },
            social: { platforms: [] }
        },
        workflows: {
            autoPublish: false,
            requireApproval: true,
            notifyOnContent: true
        },
        createdAt: now,
        updatedAt: now
    };

    writeFileSync(getConfigPath(id), JSON.stringify(config, null, 2));

    logger.info('Tenant created', { clientId: id, name });

    return config;
}

/**
 * Update tenant configuration
 * @param {string} clientId 
 * @param {Partial<TenantConfig>} updates 
 * @returns {TenantConfig}
 */
export function updateTenant(clientId, updates) {
    const current = getTenant(clientId);

    const updated = {
        ...current,
        ...updates,
        id: current.id, // Prevent ID changes
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString()
    };

    writeFileSync(getConfigPath(clientId), JSON.stringify(updated, null, 2));

    // Invalidate cache
    tenantCache.delete(`tenant-${clientId}`);

    logger.info('Tenant updated', { clientId });

    return updated;
}

/**
 * Route API call to tenant-specific handler
 * @param {string} clientId 
 * @param {string} spoke - Spoke to route to
 * @param {string} action - Action to perform
 * @param {Object} payload - Request payload
 * @returns {Promise<Object>}
 */
export async function routeToTenant(clientId, spoke, action, payload) {
    const tenant = getTenant(clientId);

    logger.info('Routing to tenant', { clientId, spoke, action });

    // Add tenant context to payload
    const enrichedPayload = {
        ...payload,
        _tenant: {
            id: tenant.id,
            name: tenant.name,
            branding: tenant.branding,
            seo: tenant.seo
        }
    };

    // Route to appropriate spoke
    switch (spoke) {
        case 'gbp':
            const gbpSpoke = await import('../spokes/gbp/client.js');
            return gbpSpoke.handleAction(action, enrichedPayload, tenant);

        case 'content':
            const contentSpoke = await import('../spokes/brainstorm/ingest.js');
            return contentSpoke.processBrainstorm(payload.content, {
                source: `Tenant: ${tenant.name}`
            });

        case 'portal':
            const portalSpoke = await import('../spokes/portal/queue.js');
            return portalSpoke[action]?.(clientId, payload);

        default:
            throw new ValidationError(`Unknown spoke: ${spoke}`);
    }
}

/**
 * Get tenant-specific asset path
 * @param {string} clientId 
 * @param {string} assetType 
 * @returns {string}
 */
export function getTenantAssetPath(clientId, assetType) {
    const tenant = getTenant(clientId);
    return join(getTenantDir(clientId), 'assets', assetType);
}

/**
 * Get tenant content queue
 * @param {string} clientId 
 * @returns {Object}
 */
export function getTenantQueue(clientId) {
    const queuePath = join(getTenantDir(clientId), 'queue', 'pending.json');

    if (!existsSync(queuePath)) {
        return { items: [], updatedAt: null };
    }

    return JSON.parse(readFileSync(queuePath, 'utf8'));
}

export default {
    tenantExists,
    getTenant,
    listTenants,
    createTenant,
    updateTenant,
    routeToTenant,
    getTenantAssetPath,
    getTenantQueue
};
