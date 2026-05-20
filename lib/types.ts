// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Central Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoreBar {
  label: string;  // e.g. "Tela"
  value: number;  // 0–10
  pct: number;    // 0–100 (for CSS width)
}

export interface SpecItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface ReviewSection {
  id: string;        // slug: "tela-display"
  heading: string;   // H2 content
  tocLabel: string;  // short label for TOC
  tocEmoji: string;  // emoji for TOC
  content: string;   // Markdown (rendered server-side)
}

export interface CompareRow {
  feature: string;
  values: string[];
  winner: number;    // 1-based index, 0 = tie
}

export interface CompareTable {
  caption: string;
  columns: string[];  // first column is main product
  winnerCol: number;  // 1-based
  rows: CompareRow[];
}

export interface Testimonial {
  name: string;
  city: string;
  state: string;   // BR state abbreviation
  monthYear: string; // e.g. "jan/2026"
  text: string;
  stars: number;   // 1–5
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface SchemaRating {
  ratingValue: number;
  reviewCount: number;
}

export interface ReviewData {
  id: string;
  slug: string;
  status: 'draft' | 'published';

  // SEO / Meta
  meta: {
    title: string;
    description: string;
    keywords: string;
    readingTime: number;
    canonical?: string;
    ogImage?: string;
  };

  // Product info
  product: string;
  category: string;
  marketplace: string;
  priceOld: string;
  priceNew: string;
  affiliateUrl: string;
  imageUrl: string;

  // Ads
  adsEnabled: boolean;

  // Hero
  hero: {
    headlineLine1: string;
    headlineLine2: string;
    headlineEm: string;
    lead: string;
    overallScore: number;
    bars: ScoreBar[];
  };

  // Content
  specs: SpecItem[];
  sections: ReviewSection[];
  compareTable: CompareTable;
  pros: string[];
  cons: string[];
  testimonials: Testimonial[];
  verdict: {
    score: number;
    label: string;
    text: string;
    note: string;
  };
  faq: FAQItem[];

  // Schema.org rating
  schemaRating: SchemaRating;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Partial version used on listing pages (no heavy content)
export type ReviewSummary = Pick<
  ReviewData,
  | 'id' | 'slug' | 'status' | 'product' | 'category'
  | 'meta' | 'hero' | 'adsEnabled' | 'createdAt' | 'updatedAt'
>;
