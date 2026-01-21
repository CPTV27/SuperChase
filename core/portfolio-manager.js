/**
 * Portfolio Manager - Config-Driven Business Unit Management
 *
 * Replaces hard-coded business unit references with a dynamic configuration system.
 * Business units can be added, removed, or modified via config/portfolio.json.
 *
 * @module core/portfolio-manager
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../lib/logger.js';
import { ValidationError, NotFoundError } from '../lib/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger({ module: 'portfolio-manager' });

const CONFIG_PATH = join(__dirname, '..', 'config', 'portfolio.json');
const CACHE_TTL = 60 * 1000; // 1 minute cache

let cachedConfig = null;
let cacheTimestamp = 0;

/**
 * @typedef {Object} BusinessUnit
 * @property {string} id - Unique identifier (e.g., 's2p', 'studio')
 * @property {string} name - Display name
 * @property {string} shortName - Short display name for UI
 * @property {string} type - service, brand, client, venue
 * @property {string} color - Hex color code
 * @property {string} icon - Icon identifier
 * @property {string} description - Brief description
 * @property {number} priority - Sort order (lower = higher priority)
 * @property {boolean} active - Whether unit is active
 * @property {Array} contacts - Associated contacts
 * @property {Object} integrations - External system IDs
 * @property {Object} metadata - Additional metadata
 */

/**
 * Load portfolio configuration
 * @param {boolean} [forceReload=false] - Bypass cache
 * @returns {Object} Portfolio config
 */
export function loadConfig(forceReload = false) {
  const now = Date.now();

  if (!forceReload && cachedConfig && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedConfig;
  }

  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Portfolio config not found: ${CONFIG_PATH}`);
  }

  try {
    cachedConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    cacheTimestamp = now;
    return cachedConfig;
  } catch (error) {
    logger.error('Failed to load portfolio config', { error: error.message });
    throw error;
  }
}

/**
 * Save portfolio configuration
 * @param {Object} config
 */
export function saveConfig(config) {
  config.updatedAt = new Date().toISOString();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  cachedConfig = config;
  cacheTimestamp = Date.now();
  logger.info('Portfolio config saved');
}

/**
 * Get all business units
 * @param {Object} [options]
 * @param {boolean} [options.activeOnly=true] - Only return active units
 * @param {string} [options.type] - Filter by type
 * @returns {BusinessUnit[]}
 */
export function getBusinessUnits(options = {}) {
  const { activeOnly = true, type } = options;
  const config = loadConfig();

  let units = config.businessUnits || [];

  if (activeOnly) {
    units = units.filter(u => u.active);
  }

  if (type) {
    units = units.filter(u => u.type === type);
  }

  return units.sort((a, b) => a.priority - b.priority);
}

/**
 * Get a single business unit by ID
 * @param {string} id
 * @returns {BusinessUnit}
 */
export function getBusinessUnit(id) {
  const config = loadConfig();
  const unit = config.businessUnits.find(u => u.id === id);

  if (!unit) {
    throw new NotFoundError('Business unit', id);
  }

  return unit;
}

/**
 * Add a new business unit
 * @param {BusinessUnit} unit
 * @returns {BusinessUnit}
 */
export function addBusinessUnit(unit) {
  if (!unit.id || !unit.name) {
    throw new ValidationError('Business unit requires id and name');
  }

  const config = loadConfig();

  // Check for duplicate ID
  if (config.businessUnits.some(u => u.id === unit.id)) {
    throw new ValidationError(`Business unit already exists: ${unit.id}`);
  }

  const newUnit = {
    id: unit.id,
    name: unit.name,
    shortName: unit.shortName || unit.name,
    type: unit.type || 'service',
    color: unit.color || '#6b7280',
    icon: unit.icon || 'building',
    description: unit.description || '',
    priority: unit.priority ?? config.businessUnits.length + 1,
    active: unit.active !== false,
    contacts: unit.contacts || [],
    integrations: unit.integrations || {},
    metadata: unit.metadata || {},
    createdAt: new Date().toISOString()
  };

  config.businessUnits.push(newUnit);
  saveConfig(config);

  logger.info('Business unit added', { id: newUnit.id, name: newUnit.name });
  return newUnit;
}

/**
 * Update a business unit
 * @param {string} id
 * @param {Partial<BusinessUnit>} updates
 * @returns {BusinessUnit}
 */
export function updateBusinessUnit(id, updates) {
  const config = loadConfig();
  const index = config.businessUnits.findIndex(u => u.id === id);

  if (index === -1) {
    throw new NotFoundError('Business unit', id);
  }

  // Don't allow changing ID
  delete updates.id;

  config.businessUnits[index] = {
    ...config.businessUnits[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  saveConfig(config);

  logger.info('Business unit updated', { id });
  return config.businessUnits[index];
}

/**
 * Delete a business unit
 * @param {string} id
 * @returns {{success: boolean}}
 */
export function deleteBusinessUnit(id) {
  const config = loadConfig();
  const index = config.businessUnits.findIndex(u => u.id === id);

  if (index === -1) {
    throw new NotFoundError('Business unit', id);
  }

  config.businessUnits.splice(index, 1);
  saveConfig(config);

  logger.info('Business unit deleted', { id });
  return { success: true };
}

/**
 * Get business unit types
 * @returns {Object}
 */
export function getBusinessUnitTypes() {
  const config = loadConfig();
  return config.types || {};
}

/**
 * Get portfolio defaults
 * @returns {Object}
 */
export function getDefaults() {
  const config = loadConfig();
  return config.defaults || {};
}

/**
 * Get business units formatted for frontend filter bar
 * @returns {Array<{id: string, name: string, color: string, icon: string}>}
 */
export function getFilterBarUnits() {
  return getBusinessUnits({ activeOnly: true }).map(u => ({
    id: u.id,
    name: u.shortName || u.name,
    color: u.color,
    icon: u.icon
  }));
}

/**
 * Get portfolio summary for dashboard
 * @returns {Object}
 */
export function getPortfolioSummary() {
  const units = getBusinessUnits({ activeOnly: true });

  const byType = {};
  for (const unit of units) {
    if (!byType[unit.type]) byType[unit.type] = [];
    byType[unit.type].push(unit);
  }

  return {
    totalUnits: units.length,
    byType,
    units: units.map(u => ({
      id: u.id,
      name: u.name,
      shortName: u.shortName,
      type: u.type,
      color: u.color
    }))
  };
}

/**
 * Validate business unit ID exists
 * @param {string} id
 * @returns {boolean}
 */
export function isValidBusinessUnit(id) {
  try {
    getBusinessUnit(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get color for business unit (with fallback)
 * @param {string} id
 * @returns {string}
 */
export function getBusinessUnitColor(id) {
  try {
    return getBusinessUnit(id).color;
  } catch {
    return '#6b7280'; // gray fallback
  }
}

export default {
  loadConfig,
  saveConfig,
  getBusinessUnits,
  getBusinessUnit,
  addBusinessUnit,
  updateBusinessUnit,
  deleteBusinessUnit,
  getBusinessUnitTypes,
  getDefaults,
  getFilterBarUnits,
  getPortfolioSummary,
  isValidBusinessUnit,
  getBusinessUnitColor
};
