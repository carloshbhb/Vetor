import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { ReviewData, ReviewSummary } from './types';

// ─── Storage paths ───────────────────────────────────────────────────────────
const DATA_DIR     = path.join(process.cwd(), 'data');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(REVIEWS_FILE)) fs.writeFileSync(REVIEWS_FILE, '[]', 'utf-8');
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
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/** Return lightweight summaries for listing pages. */
export function getReviewSummaries(): ReviewSummary[] {
  return getAllReviews().map(({ id, slug, status, product, category, meta, hero, adsEnabled, createdAt, updatedAt, googleRank, lastRankCheck }) => ({
    id, slug, status, product, category, meta, hero, adsEnabled, createdAt, updatedAt, googleRank, lastRankCheck,
  }));
}

/** Return only published reviews. */
export function getPublishedReviews(): ReviewData[] {
  return getAllReviews().filter(r => r.status === 'published');
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
