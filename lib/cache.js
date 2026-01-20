/**
 * SuperChase Simple Cache
 * 
 * In-memory cache with TTL support for caching API responses
 * and expensive computations.
 * 
 * @module lib/cache
 */

/**
 * @typedef {Object} CacheEntry
 * @property {any} value - Cached value
 * @property {number} expiresAt - Expiration timestamp
 * @property {number} createdAt - Creation timestamp
 */

class SimpleCache {
    /**
     * @param {Object} options
     * @param {number} [options.defaultTTL=300000] - Default TTL in milliseconds (5 min)
     * @param {number} [options.maxSize=1000] - Maximum cache entries
     * @param {number} [options.cleanupInterval=60000] - Cleanup interval in ms
     */
    constructor(options = {}) {
        this.defaultTTL = options.defaultTTL ?? 5 * 60 * 1000; // 5 minutes
        this.maxSize = options.maxSize ?? 1000;
        this.cleanupInterval = options.cleanupInterval ?? 60 * 1000;

        /** @type {Map<string, CacheEntry>} */
        this.cache = new Map();

        /** @type {Map<string, number>} */
        this.hits = new Map();

        // Start cleanup timer
        this._startCleanup();
    }

    /**
     * Get a cached value
     * @param {string} key 
     * @returns {any|undefined}
     */
    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            return undefined;
        }

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }

        // Track hits
        this.hits.set(key, (this.hits.get(key) || 0) + 1);

        return entry.value;
    }

    /**
     * Set a cached value
     * @param {string} key 
     * @param {any} value 
     * @param {number} [ttl] - TTL in milliseconds
     */
    set(key, value, ttl) {
        // Evict if at capacity
        if (this.cache.size >= this.maxSize) {
            this._evictLRU();
        }

        this.cache.set(key, {
            value,
            expiresAt: Date.now() + (ttl ?? this.defaultTTL),
            createdAt: Date.now()
        });

        this.hits.set(key, 0);
    }

    /**
     * Delete a cached value
     * @param {string} key 
     * @returns {boolean}
     */
    delete(key) {
        this.hits.delete(key);
        return this.cache.delete(key);
    }

    /**
     * Check if key exists and is not expired
     * @param {string} key 
     * @returns {boolean}
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Clear all cached entries
     */
    clear() {
        this.cache.clear();
        this.hits.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    stats() {
        let expired = 0;
        let totalAge = 0;
        const now = Date.now();

        for (const [key, entry] of this.cache) {
            if (now > entry.expiresAt) {
                expired++;
            } else {
                totalAge += now - entry.createdAt;
            }
        }

        const activeEntries = this.cache.size - expired;

        return {
            size: this.cache.size,
            activeEntries,
            expiredEntries: expired,
            averageAgeMs: activeEntries > 0 ? Math.round(totalAge / activeEntries) : 0,
            maxSize: this.maxSize
        };
    }

    /**
     * Get or compute a cached value
     * @param {string} key 
     * @param {Function} compute - Async function to compute value if not cached
     * @param {number} [ttl] - TTL in milliseconds
     * @returns {Promise<any>}
     */
    async getOrCompute(key, compute, ttl) {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await compute();
        this.set(key, value, ttl);
        return value;
    }

    /**
     * Memoize an async function
     * @param {Function} fn - Async function to memoize
     * @param {Object} options
     * @param {Function} [options.keyFn] - Function to generate cache key from args
     * @param {number} [options.ttl] - TTL in milliseconds
     * @returns {Function}
     */
    memoize(fn, options = {}) {
        const { keyFn = JSON.stringify, ttl } = options;

        return async (...args) => {
            const key = keyFn(args);
            return this.getOrCompute(key, () => fn(...args), ttl);
        };
    }

    /**
     * Evict least recently used entry
     * @private
     */
    _evictLRU() {
        let minHits = Infinity;
        let minKey = null;

        for (const [key, hits] of this.hits) {
            if (hits < minHits) {
                minHits = hits;
                minKey = key;
            }
        }

        if (minKey) {
            this.delete(minKey);
        }
    }

    /**
     * Start periodic cleanup of expired entries
     * @private
     */
    _startCleanup() {
        this._cleanupTimer = setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.cache) {
                if (now > entry.expiresAt) {
                    this.cache.delete(key);
                    this.hits.delete(key);
                }
            }
        }, this.cleanupInterval);

        // Don't prevent process from exiting
        this._cleanupTimer.unref?.();
    }

    /**
     * Stop cleanup timer
     */
    destroy() {
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
        }
    }
}

// Singleton instance for app-wide caching
const appCache = new SimpleCache();

// Spoke-specific caches with different TTLs
const spokeCache = {
    asana: new SimpleCache({ defaultTTL: 2 * 60 * 1000 }), // 2 min
    twitter: new SimpleCache({ defaultTTL: 1 * 60 * 1000 }), // 1 min
    strategy: new SimpleCache({ defaultTTL: 10 * 60 * 1000 }) // 10 min
};

export { SimpleCache, appCache, spokeCache };
export default appCache;
