export interface ReviewHeroBar {
  pct: number;
  label: string;
  value: number;
}

export interface ReviewSpec {
  label: string;
  value: string;
  highlight: boolean;
}

export interface ReviewSection {
  id: string;
  content: string;
  heading: string;
  tocEmoji: string;
  tocLabel: string;
}

export interface ReviewCompareRow {
  values: string[];
  winner: number;
  feature: string;
}

export interface ReviewCompareTable {
  rows: ReviewCompareRow[];
  caption: string;
  columns: string[];
  winnerCol: number;
}

export interface ReviewVerdict {
  score: number;
  label: string;
  text: string;
  note: string;
}

export interface ReviewFaq {
  question: string;
  answer: string;
}

export interface Review {
  id?: string;
  slug: string;
  status: string;
  product: string;
  category: string;
  marketplace: string;
  price_old: string;
  price_new: string;
  affiliate_url: string;
  image_url: string;
  ads_enabled: boolean;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  meta_reading_time: number;
  meta_canonical: string | null;
  meta_og_image: string | null;
  hero_headline_line1: string;
  hero_headline_line2: string;
  hero_headline_em: string;
  hero_lead: string;
  hero_overall_score: number;
  hero_bars: ReviewHeroBar[];
  specs: ReviewSpec[];
  sections: ReviewSection[];
  compare_table: ReviewCompareTable;
  pros: string[];
  cons: string[];
  testimonials: unknown[];
  verdict_score: number;
  verdict_label: string;
  verdict_text: string;
  verdict_note: string;
  schema_rating_value: number;
  schema_review_count: number;
  google_rank: number | null;
  last_rank_check: string | null;
  created_at: string;
  updated_at: string;
  faq: ReviewFaq[];
}

export interface ViralArticleHeroBar {
  label: string;
  value: string;
  imageUrl: string;
}

export interface ViralArticle {
  id?: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  hero: {
    imageUrl: string;
    bars: ViralArticleHeroBar[];
  };
  products: Array<{ name: string; slug: string; imageUrl: string }>;
  seo_title: string;
  seo_description: string;
  published_at: string;
  updated_at: string;
  created_at: string;
}

export interface Category {
  name: string;
  count: number;
}
