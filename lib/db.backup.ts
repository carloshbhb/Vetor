import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { ReviewData, ReviewSummary } from './types';

// ─── Storage paths ───────────────────────────────────────────────────────────
const BUNDLED_FILE = path.join(process.cwd(), 'data', 'reviews.json');

// Bulletproof check to see if we can write to the bundled file system
function checkIsReadOnly(): boolean {
  if (process.env.VERCEL === '1' || process.env.NETLIFY === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return true;
  }
  try {
    const dir = path.dirname(BUNDLED_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const testFile = path.join(dir, '.write-test-' + Math.random().toString(36).slice(2));
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return false;
  } catch (err) {
    console.warn('[Database] Bulletproof check: File system is read-only. Fallback to /tmp/reviews.json.', err);
    return true;
  }
}

const IS_READ_ONLY = checkIsReadOnly();
const REVIEWS_FILE = IS_READ_ONLY 
  ? path.join('/tmp', 'reviews.json')
  : BUNDLED_FILE;

function ensureDataDir() {
  if (IS_READ_ONLY) {
    if (!fs.existsSync(REVIEWS_FILE)) {
      // Seed /tmp/reviews.json with the pre-compiled reviews.json inside the app bundle
      try {
        if (fs.existsSync(BUNDLED_FILE)) {
          fs.copyFileSync(BUNDLED_FILE, REVIEWS_FILE);
          console.log('[Database] Seeded /tmp/reviews.json from bundled reviews database.');
        } else {
          fs.writeFileSync(REVIEWS_FILE, '[]', 'utf-8');
          console.log('[Database] Created empty database at /tmp/reviews.json.');
        }
      } catch (err) {
        console.error('Failed to seed /tmp/reviews.json database:', err);
      }
    }
  } else {
    const DATA_DIR = path.dirname(REVIEWS_FILE);
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(REVIEWS_FILE)) fs.writeFileSync(REVIEWS_FILE, '[]', 'utf-8');
  }
}

function readAll(): ReviewData[] {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf-8')) as ReviewData[];
  } catch {
    return [];
  }
}

function writeAll(reviews: ReviewData[]) {
  ensureDataDir();
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), 'utf-8');
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Return all reviews sorted newest-first (full data). */
export function getAllReviews(): ReviewData[] {
  const reviews = readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  console.log('[DB Backup] getAllReviews returning', reviews.length, 'reviews');
  return reviews;
}

/** Return lightweight summaries for listing pages. */
export function getReviewSummaries(): ReviewSummary[] {
  return getAllReviews().map(({ id, slug, status, product, category, meta, hero, adsEnabled, createdAt, updatedAt, googleRank, lastRankCheck }) => ({
    id, slug, status, product, category, meta, hero, adsEnabled, createdAt, updatedAt, googleRank, lastRankCheck,
  }));
}

/** Return only published reviews. */
export function getPublishedReviews(): ReviewData[] {
  const all = getAllReviews();
  const published = all.filter(r => r.status === 'published');
  console.log('[DB Backup] getPublishedReviews returning', published.length, 'published reviews');
  return published;
}

/** Find by id. */
export function getReviewById(id: string): ReviewData | undefined {
  return readAll().find(r => r.id === id);
}

/** Find by slug (for public page). */
export function getReviewBySlug(slug: string): ReviewData | undefined {
  return readAll().find(r => r.slug === slug && r.status === 'published');
}

/** Create a new review. Returns the new id. */
export function createReview(data: Omit<ReviewData, 'id' | 'createdAt' | 'updatedAt'>): string {
  const reviews = readAll();
  const now = new Date().toISOString();
  const review: ReviewData = { ...data, id: uuidv4(), createdAt: now, updatedAt: now };
  reviews.push(review);
  writeAll(reviews);
  return review.id;
}

/** Update an existing review. Returns false if not found. */
export function updateReview(id: string, patch: Partial<Omit<ReviewData, 'id' | 'createdAt'>>): boolean {
  const reviews = readAll();
  const idx = reviews.findIndex(r => r.id === id);
  if (idx === -1) return false;
  reviews[idx] = { ...reviews[idx], ...patch, updatedAt: new Date().toISOString() };
  writeAll(reviews);
  return true;
}

/** Delete a review. Returns false if not found. */
export function deleteReview(id: string): boolean {
  const reviews = readAll();
  const filtered = reviews.filter(r => r.id !== id);
  if (filtered.length === reviews.length) return false;
  writeAll(filtered);
  return true;
}

/** All slugs for published reviews (for generateStaticParams). */
export function getPublishedSlugs(): string[] {
  return getPublishedReviews().map(r => r.slug);
}
