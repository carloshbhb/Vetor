// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — AI Response Cache with TTL
// ─────────────────────────────────────────────────────────────────────────────
// File-based cache for AI responses with automatic expiration

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ─── Configuration ──────────────────────────────────────────────────────────

interface CacheConfig {
  defaultTTLMs: number;      // Default TTL in milliseconds
  maxEntries: number;        // Maximum cache entries
  cleanupIntervalMs: number; // How often to run cleanup
}

const CONFIG: CacheConfig = {
  defaultTTLMs: 24 * 60 * 60 * 1000, // 24 hours
  maxEntries: 5000,
  cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
};

// TTL presets for different content types
export const TTL_PRESETS = {
  PRODUCT_DISCOVERY: 6 * 60 * 60 * 1000,    // 6 hours (trends change fast)
  PRICE_DATA: 1 * 60 * 60 * 1000,           // 1 hour (prices fluctuate)
  REVIEW_GENERATION: 7 * 24 * 60 * 60 * 1000, // 7 days (stable content)
  SERP_RANKINGS: 4 * 60 * 60 * 1000,        // 4 hours
  GENERAL: 24 * 60 * 60 * 1000,             // 24 hours (default)
} as const;

// ─── File Operations ────────────────────────────────────────────────────────

function isReadOnly(): boolean {
  if (process.env.VERCEL === '1' || process.env.NETLIFY === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return true;
  }
  try {
    const dir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const testFile = path.join(dir, '.write-test-' + Math.random().toString(36).slice(2));
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return false;
  } catch {
    return true;
  }
}

const IS_READ_ONLY = isReadOnly();
const CACHE_FILE = IS_READ_ONLY
  ? path.join('/tmp', 'agentCache.json')
  : path.join(process.cwd(), 'tmp', 'agentCache.json');

interface CacheEntry {
  response: string;
  createdAt: string;
  expiresAt: string;
  ttlMs: number;
}

type CacheStore = Record<string, CacheEntry>;

function readCache(): CacheStore {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as CacheStore;
    }
  } catch {
    // ignore corrupted file
  }
  return {};
}

function writeCache(data: CacheStore): void {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[AgentCache] Unable to write cache:', e);
  }
}

// ─── Cache Operations ───────────────────────────────────────────────────────

/**
 * Get a cached response if it exists and hasn't expired
 */
export function getCachedResponse(prompt: string): string | undefined {
  const key = crypto.createHash('sha256').update(prompt).digest('hex');
  const cache = readCache();
  const entry = cache[key];

  if (!entry) return undefined;

  // Check if entry has expired
  const expiresAt = new Date(entry.expiresAt);
  if (expiresAt < new Date()) {
    // Entry expired, remove it
    delete cache[key];
    writeCache(cache);
    return undefined;
  }

  return entry.response;
}

/**
 * Cache a response with optional custom TTL
 */
export function setCachedResponse(
  prompt: string,
  response: string,
  ttlMs: number = CONFIG.defaultTTLMs
): void {
  const key = crypto.createHash('sha256').update(prompt).digest('hex');
  const cache = readCache();

  const now = new Date();
  const entry: CacheEntry = {
    response,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    ttlMs,
  };

  cache[key] = entry;

  // Run cleanup if cache is too large
  if (Object.keys(cache).length > CONFIG.maxEntries) {
    cleanupCache(cache);
  }

  writeCache(cache);
}

/**
 * Cache a response with a preset TTL
 */
export function setCachedResponseWithPreset(
  prompt: string,
  response: string,
  preset: keyof typeof TTL_PRESETS
): void {
  setCachedResponse(prompt, response, TTL_PRESETS[preset]);
}

/**
 * Remove a specific cache entry
 */
export function invalidateCache(prompt: string): void {
  const key = crypto.createHash('sha256').update(prompt).digest('hex');
  const cache = readCache();
  delete cache[key];
  writeCache(cache);
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  writeCache({});
}

// ─── Maintenance ────────────────────────────────────────────────────────────

/**
 * Remove expired entries and enforce max size
 */
function cleanupCache(cache: CacheStore): void {
  const now = new Date();

  // Remove expired entries
  const expiredKeys = Object.entries(cache)
    .filter(([_, entry]) => new Date(entry.expiresAt) < now)
    .map(([key]) => key);

  for (const key of expiredKeys) {
    delete cache[key];
  }

  // If still too large, remove oldest entries
  const entries = Object.entries(cache);
  if (entries.length > CONFIG.maxEntries) {
    const sorted = entries.sort((a, b) => {
      const dateA = new Date(a[1].createdAt).getTime();
      const dateB = new Date(b[1].createdAt).getTime();
      return dateA - dateB;
    });

    // Keep only the newest entries
    const toRemove = sorted.slice(0, sorted.length - CONFIG.maxEntries);
    for (const [key] of toRemove) {
      delete cache[key];
    }
  }

  console.log(`[AgentCache] Cleanup: removed ${expiredKeys.length} expired entries`);
}

/**
 * Run periodic cleanup (call this on app startup)
 */
let lastCleanup = 0;

export function scheduleCleanup(): void {
  if (IS_READ_ONLY) return; // Can't cleanup in read-only environments

  const now = Date.now();
  if (now - lastCleanup < CONFIG.cleanupIntervalMs) return;

  lastCleanup = now;

  try {
    const cache = readCache();
    const beforeCount = Object.keys(cache).length;
    cleanupCache(cache);
    const afterCount = Object.keys(cache).length;

    if (beforeCount !== afterCount) {
      writeCache(cache);
      console.log(`[AgentCache] Scheduled cleanup: ${beforeCount} → ${afterCount} entries`);
    }
  } catch (e) {
    console.warn('[AgentCache] Cleanup failed:', e);
  }
}

// ─── Stats ──────────────────────────────────────────────────────────────────

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalEntries: number;
  expiredEntries: number;
  totalSizeBytes: number;
} {
  const cache = readCache();
  const now = new Date();
  const entries = Object.values(cache);

  const expiredEntries = entries.filter(e => new Date(e.expiresAt) < now).length;
  const totalSizeBytes = JSON.stringify(cache).length;

  return {
    totalEntries: entries.length,
    expiredEntries,
    totalSizeBytes,
  };
}
