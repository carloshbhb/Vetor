export type ReviewStatus = "draft" | "generating_video" | "published" | "archived";

export type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  image_url: string;
  affiliate_url: string | null;
  price_cents: number | null;
  created_at: string;
};

export type Review = {
  id: string;
  slug: string;
  product_id: string;
  score: number;
  verdict: string;
  body_markdown: string;
  ai_model: string;
  ai_prompt_version: string;
  youtube_id: string | null;
  video_status: ReviewStatus;
  status: ReviewStatus;
  reviewed_at: string;
  created_at: string;
};

export type ReviewWithProduct = Review & { product: Product };

export type ComparisonSpec = {
  id: string;
  review_id: string;
  label: string;
  values: Record<string, string | number>;
  highlight_best: "max" | "min" | null;
};