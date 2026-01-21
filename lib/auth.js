/**
 * Authentication & Authorization Module
 *
 * Provides API key authentication with role-based access control.
 * Supports both simple API keys and database-backed keys with permissions.
 *
 * @module lib/auth
 */

import crypto from 'crypto';
import { createLogger } from './logger.js';
import { AuthenticationError, ValidationError } from './errors.js';

const logger = createLogger({ module: 'auth' });

// ============================================
// Configuration
// ============================================

const API_KEY_PREFIX = 'sc_';
const API_KEY_HEADER = 'x-api-key';
const BEARER_PREFIX = 'Bearer ';

// Roles and their permissions
export const ROLES = {
  ADMIN: {
    permissions: ['*'], // All permissions
    description: 'Full system access'
  },
  USER: {
    permissions: [
      'read:tasks',
      'write:tasks',
      'read:briefing',
      'read:portfolio',
      'query:context',
      'search:twitter'
    ],
    description: 'Standard user access'
  },
  SERVICE: {
    permissions: [
      'read:tasks',
      'write:tasks',
      'read:briefing',
      'query:context',
      'council:run',
      'publish:content'
    ],
    description: 'Service account for automation'
  },
  READONLY: {
    permissions: [
      'read:tasks',
      'read:briefing',
      'read:portfolio',
      'query:context'
    ],
    description: 'Read-only access'
  }
};

// Permission to endpoint mapping
export const ENDPOINT_PERMISSIONS = {
  'GET /tasks': 'read:tasks',
  'POST /tasks': 'write:tasks',
  'GET /briefing': 'read:briefing',
  'POST /query': 'query:context',
  'POST /search-x': 'search:twitter',
  'POST /api/llm-council': 'council:run',
  'GET /api/llm-council/models': 'read:config',
  'GET /api/portfolio/units': 'read:portfolio',
  'POST /api/portfolio/units': 'write:portfolio',
  'PUT /api/portfolio/units': 'write:portfolio',
  'DELETE /api/portfolio/units': 'write:portfolio',
  'POST /api/publish/x': 'publish:content',
  'POST /api/emergency/kill-switch': 'admin:emergency',
  'POST /api/emergency/resume': 'admin:emergency',
  'GET /api/emergency/status': 'read:status'
};

// In-memory API key store (for simple deployments without database)
const inMemoryKeys = new Map();

// ============================================
// API Key Generation
// ============================================

/**
 * Generate a new API key
 * @param {Object} options
 * @param {string} options.name - Key name/description
 * @param {string} options.role - User role
 * @param {string[]} [options.permissions] - Override permissions
 * @returns {{key: string, hash: string, metadata: Object}}
 */
export function generateApiKey(options = {}) {
  const { name = 'API Key', role = 'USER', permissions } = options;

  // Generate random key: sc_<32 random chars>
  const randomPart = crypto.randomBytes(24).toString('base64url');
  const key = `${API_KEY_PREFIX}${randomPart}`;

  // Hash for storage (never store plain key)
  const hash = hashApiKey(key);

  const metadata = {
    name,
    role,
    permissions: permissions || ROLES[role]?.permissions || [],
    createdAt: new Date().toISOString()
  };

  return { key, hash, metadata };
}

/**
 * Hash an API key for secure storage
 * @param {string} key
 * @returns {string}
 */
export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Register an API key in memory store
 * @param {string} key - Plain API key
 * @param {Object} metadata - Key metadata
 */
export function registerApiKey(key, metadata) {
  const hash = hashApiKey(key);
  inMemoryKeys.set(hash, {
    ...metadata,
    lastUsedAt: null
  });
  logger.info('API key registered', { name: metadata.name, role: metadata.role });
}

/**
 * Initialize default API key from environment
 */
export function initializeDefaultKey() {
  const envKey = process.env.API_KEY;
  if (envKey && envKey !== 'NEEDS_VALUE') {
    registerApiKey(envKey, {
      name: 'Default API Key',
      role: 'ADMIN',
      permissions: ROLES.ADMIN.permissions,
      createdAt: new Date().toISOString()
    });
  }
}

// Initialize on module load
initializeDefaultKey();

// ============================================
// Authentication
// ============================================

/**
 * Extract API key from request
 * @param {Object} req - HTTP request
 * @returns {string|null}
 */
export function extractApiKey(req) {
  // Check X-API-Key header
  const apiKeyHeader = req.headers[API_KEY_HEADER] || req.headers['X-API-Key'];
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check Authorization header (Bearer token)
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    return authHeader.slice(BEARER_PREFIX.length);
  }

  // Check query parameter (for webhooks)
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const queryKey = url.searchParams.get('api_key');
  if (queryKey) {
    return queryKey;
  }

  return null;
}

/**
 * Validate API key and return user context
 * @param {string} key - API key
 * @returns {Object} User context with role and permissions
 */
export async function validateApiKey(key) {
  if (!key) {
    throw new AuthenticationError('API key required');
  }

  // Check if it looks like a valid key
  if (!key.startsWith(API_KEY_PREFIX) && key.length < 16) {
    throw new AuthenticationError('Invalid API key format');
  }

  const hash = hashApiKey(key);

  // Check in-memory store first
  if (inMemoryKeys.has(hash)) {
    const keyData = inMemoryKeys.get(hash);
    keyData.lastUsedAt = new Date().toISOString();
    return {
      authenticated: true,
      role: keyData.role,
      permissions: keyData.permissions,
      name: keyData.name
    };
  }

  // TODO: Check database if Prisma is configured
  // const prisma = getPrismaClient();
  // const apiKey = await prisma.apiKey.findUnique({ where: { key: hash } });

  throw new AuthenticationError('Invalid API key');
}

/**
 * Check if user has required permission
 * @param {Object} user - User context from validateApiKey
 * @param {string} permission - Required permission
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user?.permissions) return false;

  // Admin has all permissions
  if (user.permissions.includes('*')) return true;

  // Check specific permission
  return user.permissions.includes(permission);
}

/**
 * Get required permission for endpoint
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @returns {string|null}
 */
export function getEndpointPermission(method, path) {
  // Normalize path (remove trailing slash, params)
  const normalizedPath = path.replace(/\/[^/]+$/, '').replace(/\/$/, '') || path;

  // Check exact match first
  const key = `${method} ${path}`;
  if (ENDPOINT_PERMISSIONS[key]) {
    return ENDPOINT_PERMISSIONS[key];
  }

  // Check with normalized path
  const normalizedKey = `${method} ${normalizedPath}`;
  if (ENDPOINT_PERMISSIONS[normalizedKey]) {
    return ENDPOINT_PERMISSIONS[normalizedKey];
  }

  // Check pattern matches
  for (const [pattern, perm] of Object.entries(ENDPOINT_PERMISSIONS)) {
    const [patternMethod, patternPath] = pattern.split(' ');
    if (patternMethod === method && path.startsWith(patternPath.replace(/:\w+/g, ''))) {
      return perm;
    }
  }

  return null;
}

// ============================================
// Middleware
// ============================================

/**
 * Authentication middleware factory
 * @param {Object} options
 * @param {string[]} [options.excludePaths] - Paths that don't require auth
 * @param {boolean} [options.checkPermissions] - Whether to check endpoint permissions
 * @returns {Function} Middleware function
 */
export function authMiddleware(options = {}) {
  const {
    excludePaths = ['/health', '/api/health', '/api/metrics', '/openapi.json'],
    checkPermissions = true
  } = options;

  return async (req, res, next) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    // Skip auth for excluded paths
    if (excludePaths.some(p => path === p || path.startsWith(p + '/'))) {
      req.user = { authenticated: false, role: 'ANONYMOUS', permissions: [] };
      return next();
    }

    try {
      // Extract and validate API key
      const apiKey = extractApiKey(req);
      const user = await validateApiKey(apiKey);

      // Check endpoint permission if enabled
      if (checkPermissions) {
        const requiredPermission = getEndpointPermission(req.method, path);
        if (requiredPermission && !hasPermission(user, requiredPermission)) {
          throw new AuthenticationError(`Permission denied: ${requiredPermission}`);
        }
      }

      // Attach user to request
      req.user = user;
      next();

    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.writeHead(error.statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(error.toJSON()));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Authentication error' } }));
      }
    }
  };
}

/**
 * Require specific permission middleware
 * @param {string} permission - Required permission
 * @returns {Function} Middleware function
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      const error = new AuthenticationError(`Permission denied: ${permission}`);
      res.writeHead(error.statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(error.toJSON()));
      return;
    }
    next();
  };
}

// ============================================
// Utilities
// ============================================

/**
 * Get all registered API keys (names and roles only, not the actual keys)
 * @returns {Array}
 */
export function listApiKeys() {
  const keys = [];
  for (const [hash, data] of inMemoryKeys) {
    keys.push({
      hash: hash.slice(0, 8) + '...',
      name: data.name,
      role: data.role,
      createdAt: data.createdAt,
      lastUsedAt: data.lastUsedAt
    });
  }
  return keys;
}

/**
 * Revoke an API key
 * @param {string} key - Plain API key to revoke
 * @returns {boolean} Whether key was found and revoked
 */
export function revokeApiKey(key) {
  const hash = hashApiKey(key);
  const existed = inMemoryKeys.has(hash);
  inMemoryKeys.delete(hash);
  if (existed) {
    logger.info('API key revoked', { hash: hash.slice(0, 8) + '...' });
  }
  return existed;
}

export default {
  ROLES,
  ENDPOINT_PERMISSIONS,
  generateApiKey,
  hashApiKey,
  registerApiKey,
  extractApiKey,
  validateApiKey,
  hasPermission,
  getEndpointPermission,
  authMiddleware,
  requirePermission,
  listApiKeys,
  revokeApiKey
};
