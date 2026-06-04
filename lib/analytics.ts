// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — GA4 Events Configuration
// ─────────────────────────────────────────────────────────────────────────────

// Custom events for GA4 tracking
export const GA4_EVENTS = {
  // Affiliate tracking
  AFFILIATE_CLICK: 'affiliate_click',
  AFFILIATE_IMPRESSION: 'affiliate_impression',
  
  // Content engagement
  ARTICLE_READ: 'article_read',
  ARTICLE_SCROLL: 'article_scroll',
  FAQ_EXPAND: 'faq_expand',
  SHARE_CLICK: 'share_click',
  
  // Search & navigation
  SEARCH: 'search',
  CATEGORY_VIEW: 'category_view',
  RELATED_CLICK: 'related_click',
  
  // User actions
  COMMENT_SUBMIT: 'comment_submit',
  RATING_SUBMIT: 'rating_submit',
  NEWSLETTER_SIGNUP: 'newsletter_signup',
  
  // Errors & performance
  ERROR_404: 'error_404',
  SLOW_PAGE: 'slow_page',
} as const;

// Event parameters schema
export interface GA4Event {
  event_name: string;
  params?: {
    [key: string]: string | number | boolean;
  };
}

// Track affiliate click with product details
export function trackAffiliateClick(product: string, marketplace: string, price: string) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', GA4_EVENTS.AFFILIATE_CLICK, {
    product_name: product,
    marketplace: marketplace,
    price: price,
    currency: 'BRL',
  });
}

// Track article read (when user scrolls 90%)
export function trackArticleRead(slug: string, title: string, readingTime: number) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', GA4_EVENTS.ARTICLE_READ, {
    article_slug: slug,
    article_title: title,
    reading_time: readingTime,
  });
}

// Track scroll depth
export function trackScrollDepth(slug: string, depth: number) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', GA4_EVENTS.ARTICLE_SCROLL, {
    article_slug: slug,
    scroll_depth: depth,
  });
}

// Track search
export function trackSearch(query: string, resultsCount: number) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', GA4_EVENTS.SEARCH, {
    search_term: query,
    results_count: resultsCount,
  });
}

// Track FAQ expand
export function trackFAQExpand(slug: string, question: string) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', GA4_EVENTS.FAQ_EXPAND, {
    article_slug: slug,
    question: question,
  });
}

// Track share click
export function trackShareClick(slug: string, platform: string) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', GA4_EVENTS.SHARE_CLICK, {
    article_slug: slug,
    platform: platform,
  });
}

// Track comment submit
export function trackCommentSubmit(slug: string) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', GA4_EVENTS.COMMENT_SUBMIT, {
    article_slug: slug,
  });
}

// Track rating submit
export function trackRatingSubmit(slug: string, rating: number) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', GA4_EVENTS.RATING_SUBMIT, {
    article_slug: slug,
    rating: rating,
  });
}

// Conversion tracking for affiliate purchases
export function trackPurchase(transactionId: string, value: number, items: { id: string; name: string; price: number }[]) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'purchase', {
    transaction_id: transactionId,
    value: value,
    currency: 'BRL',
    items: items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
    })),
  });
}