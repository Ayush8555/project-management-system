/**
 * Enhanced in-memory cache with TTL, LRU eviction, and auto-cleanup.
 * Suitable for single-instance deployments (100 users).
 * Replace with Redis for horizontal scaling.
 */

const MAX_CACHE_SIZE = 1000;
const cache = new Map();

/**
 * Get a cached value by key. Returns null if expired or missing.
 */
export function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  // LRU: move to end (most recently used)
  cache.delete(key);
  cache.set(key, item);
  return item.value;
}

/**
 * Set a cached value with TTL in seconds.
 */
export function setCache(key, value, ttlSeconds = 30) {
  // LRU eviction: if at capacity, delete the oldest entry
  if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, {
    value,
    expiry: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Get a cached value, or compute and cache it if missing.
 * Prevents thundering herd: concurrent calls for the same key
 * will share the same fetch promise.
 */
const pendingFetches = new Map();

export async function getOrSet(key, fetchFn, ttlSeconds = 30) {
  const cached = getCache(key);
  if (cached !== null) return cached;

  // Deduplicate concurrent fetches for the same key
  if (pendingFetches.has(key)) {
    return pendingFetches.get(key);
  }

  const fetchPromise = fetchFn().then((value) => {
    setCache(key, value, ttlSeconds);
    pendingFetches.delete(key);
    return value;
  }).catch((err) => {
    pendingFetches.delete(key);
    throw err;
  });

  pendingFetches.set(key, fetchPromise);
  return fetchPromise;
}

/**
 * Invalidate all cache entries matching a pattern substring.
 */
export function invalidateCache(pattern) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

/**
 * Clear the entire cache.
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get cache stats for monitoring.
 */
export function getCacheStats() {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}

// Auto-cleanup expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (now > item.expiry) {
      cache.delete(key);
    }
  }
}, 60_000).unref?.(); // .unref() prevents this timer from keeping Node.js alive
