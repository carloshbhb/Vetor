---
name: seo-pro
description: Advanced SEO engineering for vetor.blog — technical SEO, E-E-A-T, structured data, indexing, Core Web Vitals, content strategy, SERP analysis. Use when auditing, optimizing, or creating SEO-related code (metadata, schemas, sitemaps, robots, indexing, content structure, internal linking).
---

# SEO Pro

Expert rules for search optimization in this repo (Next.js 14 review blog, Supabase, Vercel, autonomous-agent pipeline).

## 1. Technical SEO & System Architecture

### Core Web Vitals (CWV)
- **LCP < 2.5s**: Hero images must use `next/image` with `priority` + explicit `width`/`height`. Never lazy-load above-the-fold images. Preload critical assets via `<link rel="preload">` in layout.
- **INP < 200ms**: Keep server components heavy, client components light. Any interactive element (FAQ accordion, share buttons, comments) must lazy-load with `dynamic()` + `{ ssr: false }` to avoid hydration blocking main thread.
- **CLS < 0.1**: All images, ads, iframes, and embeds MUST have explicit dimensions (`width`/`height` or `aspect-ratio` CSS). Ad slots use `min-height` placeholder. No layout shift from dynamic content injection after mount.

### Indexability & Crawl Budget
- **Dynamic sitemap** (`app/sitemap.xml/route.ts`): Generate per-category and per-review URLs. Include `<lastmod>`, `<changefreq>`, `<priority>`. Max 50,000 URLs per sitemap; split into sitemap index if needed.
- **robots.txt** (`app/robots.txt/route.ts`): Block `/api/*`, `/tmp/*`, internal admin paths. Allow all crawlers on `/review/*`, `/`, `/research`, `/sobre`. Reference sitemap.
- **Canonical tags**: Every review page MUST set `alternates.canonical` to its own URL (not category, not paginated). Category pages use self-referencing canonical. Never canonicalize to a different domain.
- **IndexNow + Google Indexing** (`app/api/cron/indexing/route.ts`): Trigger on publish (autonomous-agent) and on update. Cap at 150 URLs/day to stay within budget. Priority: fresh > updated > stale.
- **Crawl waste signals**: Noindex thin pages, paginated category pages beyond page 3, internal search results, tag pages with <3 articles.

### Structured Data (JSON-LD)
- **Required schemas per review page** (already in `lib/seo.ts`, enforce completeness):
  - `Product` — name, image, brand, offers (price, currency, availability), review (nested)
  - `NewsArticle` — headline, datePublished, dateModified, author, publisher
  - `FAQPage` — at least 3 Q&A pairs per review
  - `BreadcrumbList` — Home > Category > Review
  - `Organization` — site-wide in layout, includes logo, sameAs (social profiles)
- **Missing schemas to add**:
  - `WebSite` with `SearchAction` (sitelinks searchbox in SERP)
  - `ItemList` for category pages (lists top reviews)
  - `HowTo` when review includes step-by-step setup guides
  - `VideoObject` when video is embedded (YouTube embeds in review pages)
- **Validation**: After any schema change, verify with Google Rich Results Test (manual) or check for JSON parse errors in build. Never emit malformed JSON-LD (missing `@context`, duplicate `@type`).

### Internal Linking & Pagerank Flow
- **Silo structure**: Each category (`/review/?category=wearables-smartbands`) is a topical silo. Reviews within a silo link to 2-3 sibling reviews in the same category.
- **Hub pages**: Create `/research/[category]` pages that link to all reviews in that category (hub-and-spoke model). These are the "pillar" content.
- **Cross-silo links**: Only 1-2 per page, contextual (e.g. "outro produto que testamos na categoria X"). Don't dilute silo authority.
- **Anchor text**: Use descriptive, keyword-rich anchors. Never "clique aqui" or "leia mais". Prefer "review completo do [product]" or "análise do [product]".

## 2. E-E-A-T & Content Strategy

### Experience, Expertise, Authoritativeness, Trustworthiness
- **Author schema** (`lib/author.ts`): Must include `name`, `url` (author page), `image`, `sameAs` (social profiles). Every review MUST reference the author.
- **First-hand experience signals**: Reviews must include "testamos por X dias", specific measurements, real photos (not stock). The autonomous-agent prompt should enforce these phrases.
- **Expertise signals**: Category-specific vocabulary, comparison tables with real specs, benchmark scores, pros/cons based on actual testing.
- **Trust signals**: Affiliate disclosure on every review, privacy policy link, consistent contact info, SSL, no misleading claims.

### Topical Authority
- **Content gap analysis**: For each category, map all sub-topics. Example for "Fones de Ouvido": TWS, over-ear, under-R$100, R$100-300, R$300+, noise cancelling, gaming, sport. Fill gaps before competitors.
- **Cluster strategy**: Group reviews by product type + price range + use case. Each cluster needs: hub page (pillar) + 5-10 spoke reviews + comparison articles.
- **Publishing cadence**: 2 reviews/day minimum (autonomous-agent) across diverse categories. Don't oversaturate one niche.

### SGE (Search Generative Experience) Optimization
- **Direct answers**: Each review MUST have a clear "Veredicto" section (2-3 sentences) answering "Vale a pena?". SGE extracts these.
- **Structured comparisons**: Use comparison tables (already present as `CompareTable`) — SGE parses tabular data for AI summaries.
- **FAQ prominence**: FAQ section near top (not hidden behind accordion for SGE crawling). Use `FAQPage` schema.
- **Entity optimization**: Product name + brand + key spec in first paragraph. SGE needs entity recognition signals.

## 3. Data Analysis & Competitive Intelligence

### Search Console Integration
- **API wrapper** (`app/api/search-console/route.ts`): Use for query analysis, page performance, index coverage.
- **Key metrics to monitor**: CTR by query, average position by page, crawl errors, mobile usability issues.
- **Anomaly detection**: If traffic drops >20% week-over-week, check: (a) Core Update timing, (b) robots.txt changes, (c) noindex tags, (d) canonical errors, (e) manual actions.

### SERP Feature Targeting
- **Featured snippets**: Structure answers as definitions (first paragraph = direct answer), lists (how-to steps), tables (comparisons).
- **People Also Ask**: Mine PAA questions from Google for each product, add as FAQ sections.
- **Image packs**: All review images must have descriptive alt text (product name + key feature). Use `next/image` with `alt` prop.
- **Video carousels**: Embed YouTube videos in reviews (already possible via `VideoObject` schema).

### Log Analysis (when available)
- **Googlebot crawl patterns**: Which pages get crawled most/least? Are important pages neglected?
- **Crawl budget waste**: Bot hitting 404s, redirect chains, parameter URLs?
- **Frequency**: How often does Googlebot revisit each review page?

## 4. Off-Page Authority & External Signals

### Link Profile
- **Toxic link patterns**: Mass directory submissions, PBN links, exact-match anchor over-optimization (>30% same anchor), links from penalized sites.
- **Healthy link velocity**: Steady growth, diverse anchors (branded 40%, keyword 30%, URL 20%, generic 10%).
- **Link acquisition**: Guest posts on tech blogs, product review roundups, HARO/Connectively for journalist queries, original research/data that naturally attracts links.

### Local SEO (if applicable)
- **NAP consistency**: Same Name, Address, Phone across all directories.
- **Google Business Profile**: Complete with categories, photos, posts, Q&A.
- **Local schema**: `LocalBusiness` with `geo` coordinates, `openingHours`.

## 5. Implementation Checklist for This Repo

When touching SEO-related code:
1. Verify `lib/seo.ts` functions emit valid JSON-LD (no missing fields).
2. Check `app/review/[slug]/page.tsx` metadata includes canonical, OG, Twitter card.
3. Verify sitemap includes all published reviews with correct `<lastmod>`.
4. Verify robots.txt allows crawling of review pages, blocks API/internal.
5. Run `npx tsc --noEmit` after changes.
6. Test with Google Rich Results Test (manual) for any new schema.
