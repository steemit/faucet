/**
 * Simple global in-memory cache module
 * Used to cache config table data and reduce database queries
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map(); // Store timers for automatic cleanup of expired items
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {*} value - Cache value
   * @param {number} ttl - Time to live in seconds, default 300 seconds (5 minutes)
   */
  set(key, value, ttl = 300) {
    // Clear existing timer for this key if present
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set cache value
    const expireAt = Date.now() + ttl * 1000;
    this.cache.set(key, {
      value,
      expireAt,
    });

    // Set automatic cleanup timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl * 1000);
    this.timers.set(key, timer);
  }

  /**
   * Get cache value
   * @param {string} key - Cache key
   * @returns {*} Cache value, returns undefined if not found or expired
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > item.expireAt) {
      this.delete(key);
      return undefined;
    }

    return item.value;
  }

  /**
   * Delete cache item
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
  }

  /**
   * Check if cache exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }
    if (Date.now() > item.expireAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get cache size
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }
}

// Create global singleton
const globalCache = new MemoryCache();

export default globalCache;
