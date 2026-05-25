// Simple file‑based cache for AI responses
// Used by lib/ai.ts to avoid duplicate LLM calls

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Determine writable location – same logic as db.backup.ts
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

function readCache(): Record<string, { response: string; createdAt: string }> {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as any;
    }
  } catch {
    // ignore corrupted file
  }
  return {};
}

function writeCache(data: Record<string, any>) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[AgentCache] Unable to write cache:', e);
  }
}

export function getCachedResponse(prompt: string): string | undefined {
  const key = crypto.createHash('sha256').update(prompt).digest('hex');
  const cache = readCache();
  const entry = cache[key];
  return entry?.response;
}

export function setCachedResponse(prompt: string, response: string): void {
  const key = crypto.createHash('sha256').update(prompt).digest('hex');
  const cache = readCache();
  cache[key] = { response, createdAt: new Date().toISOString() };
  writeCache(cache);
}
