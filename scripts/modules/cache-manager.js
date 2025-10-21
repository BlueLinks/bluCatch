/**
 * Cache management for scraper
 * Tracks which routes have been queried to avoid redundant API calls
 */

const MAX_CACHE_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Check if a location is cached and not stale
 * @param {Database} db - SQLite database instance
 * @param {string} locationId - Location ID (e.g., "kalos-route-2")
 * @param {number} maxAge - Maximum cache age in seconds
 * @returns {boolean} True if cached and fresh
 */
export function isCached(db, locationId, maxAge = MAX_CACHE_AGE) {
  const cacheKey = `route:${locationId}`;
  
  const cache = db.prepare(`
    SELECT last_queried_at, status FROM scraper_cache 
    WHERE cache_key = ?
  `).get(cacheKey);
  
  if (!cache) return false;
  if (cache.status !== 'complete') return false;
  
  // Check if cache is stale
  const age = Math.floor(Date.now() / 1000) - cache.last_queried_at;
  return age < maxAge;
}

/**
 * Mark a location as scraped
 * @param {Database} db - SQLite database instance
 * @param {string} locationId - Location ID
 * @param {string} status - Status ("complete", "partial", "failed")
 * @param {Object} metadata - Optional metadata object
 */
export function markLocationScraped(db, locationId, status = 'complete', metadata = null) {
  const cacheKey = `route:${locationId}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  
  db.prepare(`
    INSERT OR REPLACE INTO scraper_cache (cache_key, data_type, last_queried_at, status, metadata)
    VALUES (?, 'route', ?, ?, ?)
  `).run(cacheKey, timestamp, status, metadataJson);
}

/**
 * Get cache statistics
 * @param {Database} db - SQLite database instance
 * @returns {Object} Cache statistics
 */
export function getCacheStats(db) {
  const total = db.prepare('SELECT COUNT(*) as count FROM scraper_cache').get().count;
  const complete = db.prepare("SELECT COUNT(*) as count FROM scraper_cache WHERE status = 'complete'").get().count;
  const failed = db.prepare("SELECT COUNT(*) as count FROM scraper_cache WHERE status = 'failed'").get().count;
  
  return {
    total,
    complete,
    failed,
    partial: total - complete - failed
  };
}

/**
 * Clear stale cache entries
 * @param {Database} db - SQLite database instance
 * @param {number} maxAge - Maximum cache age in seconds
 * @returns {number} Number of entries cleared
 */
export function clearStaleCache(db, maxAge = MAX_CACHE_AGE) {
  const cutoffTime = Math.floor(Date.now() / 1000) - maxAge;
  
  const result = db.prepare(`
    DELETE FROM scraper_cache 
    WHERE last_queried_at < ?
  `).run(cutoffTime);
  
  return result.changes;
}

/**
 * Get all uncached locations
 * @param {Database} db - SQLite database instance
 * @returns {Array} Array of location objects
 */
export function getUncachedLocations(db) {
  return db.prepare(`
    SELECT l.* FROM locations l
    LEFT JOIN scraper_cache c ON c.cache_key = 'route:' || l.id
    WHERE c.cache_key IS NULL OR c.status != 'complete'
    ORDER BY l.generation, l.name
  `).all();
}

