# SEO LEDGER — vetor.blog

Ciclo contínuo de ranqueamento. Orquestrador: agente `seo-lead`.
Canonical: `https://www.vetor.blog` · GSC configurado ✓

---

## Métricas (preencher a cada ciclo relevante)

| Data | Páginas indexadas (GSC) | Impressões 28d | Cliques 28d | Posição média | Notas |
|------|-------------------------|----------------|-------------|---------------|-------|
| — | — | — | — | — | baseline a coletar no GSC |

---

## Backlog

### P0 — Indexabilidade (desbloquear)

- [x] **P0-1** Renderizar `sections` nas reviews via `ReviewContent` ✅ 2026-09-23 — `#analise` + nav "Análise" + datas
- [x] **P0-2** FAQSchema + BreadcrumbSchema + breadcrumbs visuais + data publicação/leitura nas reviews ✅ 2026-09-23
- [x] **P0-3** `robots.ts` disallow `/admin` + `/api/` + `noindex` no admin layout (AdminShell extraído p/ metadata) ✅ 2026-09-23
- [x] **P0-4** Filtro de categoria com `searchParams` em `/reviews` ✅ 2026-09-23
- [x] **P0-5** Hubs `/reviews/categoria/[category]` + índice + sitemap ✅ 2026-09-23 (17 hubs SSG)
- [x] **P0-6** Rodapé → `/privacidade`, `/sobre`, `/metodologia`, `/contato` (páginas criadas) ✅ 2026-09-23
- [x] **P0-7** Unificar www em `src/`, `tmp/`, `scripts/` ✅ 2026-09-23 — **follow-up:** confirmar `NEXT_PUBLIC_SITE_URL` no Vercel
- [x] **P0-8** Remover 3 font preloads hardcoded de `layout.tsx` ✅ 2026-09-23
- [x] **P0-9** Homepage `revalidate = 300` ✅ 2026-09-23

### P1 — Schema & dados estruturados

- [x] **P1-1** `generateReviewSchema` seguro: sem brand falsa, sem InStock/price 0, sem ratingCount 1, reviewRating 10→5 ✅ 2026-09-23
- [x] **P1-2** `ItemList` em `/reviews` (respeita filtro) e `/comparativos` ✅ 2026-09-23
- [x] **P1-3** OG image default: `public/og.png` (1200×630) + `openGraph.images`/`twitter.images` no layout ✅ 2026-09-23
- [x] **P1-4** Canonical `/reviews` e `/comparativos` (+ paginação) ✅ 2026-09-23
- [x] **P1-5** SearchAction removido do WebSite schema (sem rota `/search`) ✅ 2026-09-23
- [x] **P1-6** `generateMetadata.ts` mortos deletados (×2) ✅ 2026-09-23
- [x] **P1-7** Comparativo 404 → `notFound()` ✅ 2026-09-23

### P2 — Arquitetura de conteúdo

- [x] **P2-1** Paginação `/reviews` ?page=24 + preserva category ✅ 2026-09-23
- [x] **P2-2** Produtos em comparativos linkados → `/reviews/[slug]` ✅ 2026-09-23
- [x] **P2-3** RSS `/feed.xml` (20 items, link no layout) ✅ 2026-09-23
- [x] **P2-4** Author pages `/author/[slug]` (E-A-T) ✅ 2026-09-23
- [x] **P2-5** Tag pages (se fizer sentido com dados) ✅ 2026-09-23 — 90 tags com ≥2 reviews a partir de `meta_keywords`

### P3 — Pipeline de escala com qualidade

- [x] **P3-1** Pipeline usa backlog `product_links` (`getNextReviewProductLink` + `markProductLinkReviewed`) ✅ 2026-09-23
- [x] **P3-2** Validação zod em `content-quality.ts` (admin 422 / cron skipped) ✅ 2026-09-23
- [x] **P3-3** Scores determinísticos (`deterministicScore` em `generate-viral.ts`) ✅ 2026-09-23
- [x] **P3-4** `src/lib/indexnow.ts` + ping nos crons `generate` e `viral-content` ✅ 2026-09-23 — **follow-up:** env `INDEXNOW_KEY` no Vercel + key file em `public/{key}.txt`
- [x] **P3-5** `upsert` onConflict `slug` em review + viral ✅ 2026-09-23 — **follow-up:** confirmar unique index em `reviews.slug` e `viral_articles.slug`
- [x] **P3-6** Draft→publish: inserts como draft, PATCH publish no admin, queries filtram published ✅ 2026-09-23
- [x] **P3-7** Auth Bearer nos botões admin (generate/reviews/viral/videos) ✅ 2026-09-23

### P4 — Crescimento

- [x] **P4-1** Keyword research (skills seo-plan/seo-cluster) → clusters de intenção de compra pt-BR ✅ 2026-09-23 — `docs/seo/keyword-clusters-and-briefs.md` (8 clusters, volume heuristic)
- [x] **P4-2** Content briefs orientados a volume/dificuldade → novos artigos ✅ 2026-09-23 — top 5 clusters com briefs no mesmo doc
- [x] **P4-3** Páginas de autoridade: sobre, metodologia, contato, privacidade ✅ 2026-09-23
- [x] **P4-4** Revisar titles/descriptions das top páginas ✅ 2026-09-23 — layout, /reviews, /comparativos, categorias, tags, autor, institucionais + fallbacks em review/comparativo (sem GSC impressions: titles otimizados por intent/length)
- [x] **P4-5** Web Vitals: analytics + revisão de fontes/imagens ✅ 2026-09-23 — `sizes` em ReviewCard/hero/related/comparativos, `remotePatterns` www.vetor.blog, fontes ok (next/font display:swap)

---

## Follow-ups operacionais (env/config)

| Item | Ação |
|------|------|
| `INDEXNOW_KEY` + `INDEXNOW_API_KEY` | ✅ 2026-09-23 no Vercel + `public/{key}.txt` |
| `GOOGLE_INDEXING_API_KEY` | ✅ 2026-09-23 — OAuth service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`) em `pingGoogleIndexing`; envs no Vercel |
| `NEXT_PUBLIC_SITE_URL` / `SITE_URL` | ✅ = `https://www.vetor.blog` no Vercel |
| Unique index `slug` | ✅ 2026-09-23 confirmado em `reviews` e `viral_articles` (upsert onConflict) |
| `public/og.png` | ✅ 2026-09-23 1200×630 + `openGraph.images` |
| Domínio Vercel | ✅ 2026-09-23 `vetor.blog`+`www` movidos de projeto `vetor` → `vetor-blog`; apex redirect→www |

---

## Histórico de ciclos

### Ciclo 0 — 2026-09-23
- Time de agentes: `seo-lead`, `tech-seo`, `content-seo`, `pipeline-growth`, `web-perf` em `.opencode/agents/`
- Skill `seo-loop` + comando `/seo-cycle`
- Auditoria inicial → backlog P0–P4

### Ciclo 1 — 2026-09-23 (Fase 0)
- **0A content-seo:** sections renderizadas, FAQ/Breadcrumb JSON-LD, breadcrumbs, datas
- **0B tech-seo:** robots/admin noindex, font preloads out, home revalidate 5m, www unify (10 arquivos), comparativo notFound
- **0C tech-seo:** filtro category, 17 hubs de categoria + sitemap, 4 páginas institucionais, rodapé real
- **0D pipeline-growth:** upsert slug, IndexNow helper + crons, scores determinísticos
- Gate: `npm run build` ✅ 199 pages · `npm run lint` ✅

### Ciclo 2 — 2026-09-23 (Fases 1 + 2A)
- **Fase 1:** schema Product seguro (omit brand/offer/rating falsos), ItemList, SearchAction removido, generateMetadata mortos apagados
- **Fase 2A:** paginação /reviews (24/pág), produtos em comparativos linkados
- Gate: `npm run build` ✅ 199 pages · `npm run lint` ✅

### Ciclo 3 — 2026-09-23 (P2-3 + P3)
- **P2-3:** `/feed.xml` RSS (20 reviews + viral, revalidate 1h) + alternate link no layout
- **P3-1:** pipeline consome backlog `product_links`
- **P3-2:** gate zod antes de publicar (admin 422, cron skipped)
- **P3-6:** conteúdo novo entra como `draft`; publish via admin PATCH; listagens/sitemap só published
- **P3-7:** Authorization Bearer em botões admin generate/reviews/viral/videos
- Gate: `npm run build` ✅ 200 pages · `npm run lint` ✅
- **Status:** P0–P3 done + follow-ups Vercel/Supabase/OG/Deploy ✅ 2026-09-23 · restam P2-4/2-5 (author/tag pages) e P4 (GSC/keywords/Vitals)

### Ciclo 4 — 2026-09-23 (Follow-ups Vercel + Supabase + OG)
- Env vars Vercel production: `SUPABASE_SERVICE_ROLE_KEY`, `INDEXNOW_KEY`, `INDEXNOW_API_KEY`, `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `GOOGLE_INDEXING_API_KEY`, `NEXT_PUBLIC_*` analytics
- `public/og.png` + key file IndexNow + `openGraph`/`twitter` no layout
- Unique index `slug` **confirmado** em `reviews` e `viral_articles` (upsert onConflict probe)
- Domínio realocado: projeto antigo `vetor` → `vetor-blog`; apex `vetor.blog` redirect→`www`
- Sitemap inclui páginas institucionais (`/sobre`, `/metodologia`, `/privacidade`, `/contato`, índice de categorias)
- Gate: `npm run build` ✅ · `npm run lint` ✅ · **deploy produção** `https://www.vetor.blog` ✅

### Ciclo 5 — 2026-09-23 (Time de agentes: P2-4, P2-5, P4-1/2, P4-5)
- **Agent A (content/E-E-A-T):** `src/data/authors.ts` (Editor Vetor), `/author`, `/author/[slug]`, `AuthorBox` no review, link Footer "Quem escreve", link em `/sobre`
- **Agent B (tags):** `src/lib/tags.ts` (`buildTagIndex` de `meta_keywords`, minCount=2), `/tags`, `/tags/[tag]` — 90 tags válidas em 142 reviews publicados
- **Agent C (perf):** `sizes` corrigidos (ReviewCard 340px, hero 80px, related 340px, comparativos 64px), `remotePatterns` `www.vetor.blog`, unused import SpecTable removido
- **Agent D (keywords):** `docs/seo/keyword-clusters-and-briefs.md` — 8 clusters de intenção comercial, 5 briefs competitivos
- **Orchestrator:** `sitemap.ts` + `/author` + `/tags` + author/tag pages consolidados
- Gate: `npm run build` · `npm run lint` · **deploy** (Ciclo 5)
- **Status:** P0–P3 + P2-4/2-5 + P4-1/2/3/5 done · restam P4-4 (GSC, blocked) e `GOOGLE_INDEXING_API_KEY` (service account)

### Ciclo 6 — 2026-09-23 (Indexing API + titles + GitHub)
- **Google Indexing API:** `pingGoogleIndexing` → OAuth RS256 JWT (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`) → `urlNotifications:publish`; cache de access_token; fallback legacy `GOOGLE_INDEXING_API_KEY`
- Env vars novas no Vercel production: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (adicionadas via CLI)
- Teste local: IndexNow 3 URLs + Google Indexing 3 URLs OK (`service_account=true`)
- **P4-4 titles:** layout default/template, `/reviews`, `/comparativos` (+detalhe), categorias, tags, autor, institucionais — keyword + brand + length
- Gate: `npm run lint` · `npm run build` (293 pages) · **push** `f43c088` → `origin/main` (`carloshbhb/Vetor`) · **deploy CLI** `3ol44cjv7` READY alias `www.vetor.blog`
- Smoke produção: home/comparativos/author/tags/reviews/sobre 200 com titles novos · sitemap 260 URLs (author+tags) · AuthorBox no review ✓ · robots disallow `/admin` ✓
- **Nota:** Git integration do projeto `vetor-blog` aponta para outro repo (`Vetor.blog`); push em `Vetor` **não** dispara deploy sozinho — usar `vercel --prod` ou reconectar o repo correto
- **Status:** P0–P3 + P2-4/2-5 + P4-1/2/3/4/5 done · restam: GSC impressions para refinar titles, conteúdo de intenção-compra (briefs prontas)
