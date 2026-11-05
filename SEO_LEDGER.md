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
- [x] **P0-10** Reviews-spam com slug/título-lixo publicadas e linkadas na home (ex.: `20-mais-vendidor-669r-4965225-offfrete-grtis-...` → title `20º MAIS VENDIDOR$ 669R$ 4965225% OFFFrete grátis…`, sem `noindex`) → despublicar ou `noindex` + tirar do feed da home + normalizar slugs restantes com 301 📅 2026-10-01 — verificado em produção; lição memória #6 (regex de vitrine)
  - **done 2026-10-01:** 5 reviews → `draft` (2 spam + 3 finas de P1-8; backup `tmp/backup-p0-10-2026-10-01.json`); 2 × 301 em `next.config.ts` → `/reviews/categoria`; **bugfix `src/lib/data.ts`: `fetchReviewBySlug` só cai no fallback estático se o Supabase não estiver configurado** (antes `staticReviews` renderizava `airpods-pro-2`/`redmi-watch-5` mesmo com draft → 200). Evidência prod: spam 308→200, drafts 404, home 0 links alvo, sitemap 0 URLs exatas, publicada (`eufy`) 200. Categoria `Eletrônicos` ficou vazia (só as 2 spam tinham) → hub 404 correto.
  - **novo achado:** categorias duplicadas por caixa/acentos (`Eletroportateis`/`Eletroportáteis`, `Wearables`/`Wearables / Smartbands`, `Acessorios Gamer`/`Acessórios para Games`, `Mercado Livre Frete Grátis`/`mercado livre frete gratis`) → hub interno dividido.

### P1 — Schema & dados estruturados

- [x] **P1-1** `generateReviewSchema` seguro: sem brand falsa, sem InStock/price 0, sem ratingCount 1, reviewRating 10→5 ✅ 2026-09-23
- [x] **P1-2** `ItemList` em `/reviews` (respeita filtro) e `/comparativos` ✅ 2026-09-23
- [x] **P1-3** OG image default: `public/og.png` (1200×630) + `openGraph.images`/`twitter.images` no layout ✅ 2026-09-23
- [x] **P1-4** Canonical `/reviews` e `/comparativos` (+ paginação) ✅ 2026-09-23
- [x] **P1-5** SearchAction removido do WebSite schema (sem rota `/search`) ✅ 2026-09-23
- [x] **P1-6** `generateMetadata.ts` mortos deletados (×2) ✅ 2026-09-23
- [x] **P1-7** Comparativo 404 → `notFound()` ✅ 2026-09-23
- [x] **P1-8** 5 reviews finas <300 chars (`airpods-pro-2`, `redmi-watch-5`, `sony-wf-1000xm5`, 2 de marketplace) → gerar 1.500+ palavras com seções padrão (design/desempenho/bateria/prós-contras/veredito) — rewrite pula por design; precisa de geração 📅 2026-10-01 — risco Helpful Content
  - **done 2026-10-01 (mudança de premissa, decisão do usuário):** os 3 finos eram **duplicatas do mesmo produto** de reviews já publicadas (`airpods-pro-2-review-2026`, `xiaomi-redmi-watch-5`, `sony-wf-1000xm5-fone-anc-premium`) → gerar conteúdo criaria canibalização. Resolvido com **301** (3 regras em `next.config.ts`) em vez de geração; as 2 finas de marketplace já resolvidas no P0-10 (301 → `/reviews/categoria`). Evidência prod: 3 cadeias 308 → 200 nas publicadas do mesmo produto. Não republicar estes slugs.
- [x] **P1-9** Home sem `<img>` no HTML (0 imgs vs 31 links; reviews têm `SafeImage`+`_next/image`) → investigar feed/`ReviewCard` (imageUrl ausente?) para descoberta de imagem 📅 2026-10-01
  - **done 2026-10-01:** causa = a home **não usa `ReviewCard`**; seus blocos (`home-feature`, `home-review-main/small`, `pick`) eram só texto. Adicionado `SafeImage`+`safeImageSrc` em 7 pontos (featured, main, 2 thumbs, 3 picks) com `aspect-ratio` fixo (zero CLS) + `sizes`. Evidência prod: home SSR com **7 `<img>`** (era 0), todas → 200. **Não é bug de dados:** 137/137 publicadas têm `image_url`. Follow-ups: (a) 8/137 publicadas com `image_url` = placeholder (ex.: `apple-watch-series-9`) → completar imagem no CMS; (b) listagens `/reviews`, tags e categorias seguem sem `<img>` (só texto) → estender imagem ao `ReviewCard` se valer.

### P2 — Arquitetura de conteúdo

- [x] **P2-1** Paginação `/reviews` ?page=24 + preserva category ✅ 2026-09-23
- [x] **P2-2** Produtos em comparativos linkados → `/reviews/[slug]` ✅ 2026-09-23
- [x] **P2-3** RSS `/feed.xml` (20 items, link no layout) ✅ 2026-09-23
- [x] **P2-4** Author pages `/author/[slug]` (E-A-T) ✅ 2026-09-23
- [x] **P2-5** Tag pages (se fizer sentido com dados) ✅ 2026-09-23 — 90 tags com ≥2 reviews a partir de `meta_keywords`
- [x] **P2-6** `author: Person` no JSON-LD das reviews + `datePublished`/`dateModified` ✅ 2026-10-03 — autor canônico `Editor Vetor` e URL da página de autor adicionados ao schema das reviews.
- [ ] **P2-7** Política de refresh de artigos antigos (AW9 rebrand "2026"): `dateModified` real ou URL nova, evitar duplicação com guias "melhores … 2026"; title AW9 com marca duplicada (`| Vetor Blog | vetor.blog`) 📅 2026-10-01
- [x] **P2-8** Categorias duplicadas por caixa/acentos (`Eletroportateis`/`Eletroportáteis`, `Wearables`/`Wearables / Smartbands`, `Acessorios Gamer`/`Acessórios para Games`, `Mercado Livre Frete Grátis`/`mercado livre frete gratis`) ✅ 2026-10-03 — categorias normalizadas no pipeline; aliases legados dos hubs redirecionam permanentemente para a URL canônica.

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
| IndexNow | Cliente partilhado em `src/lib/indexnow.ts`; arquivo de chave público na raiz retorna HTTP 200. O status de cada POST é registrado como submitted, pending validation, rejected ou retryable. |
| Google Indexing API | **Não usar para reviews/comparativos**: elegível somente para JobPosting e livestream BroadcastEvent em VideoObject. Sitemap + Search Console + links internos são o fluxo correto para o Vetor.blog. |
| `NEXT_PUBLIC_SITE_URL` / `SITE_URL` | ✅ = `https://www.vetor.blog` no Vercel |
| Unique index `slug` | ✅ 2026-09-23 confirmado em `reviews` e `viral_articles` (upsert onConflict) |
| `public/og.png` | ✅ 2026-09-23 1200×630 + `openGraph.images` |
| Domínio Vercel | ✅ 2026-09-23 `vetor.blog`+`www` movidos de projeto `vetor` → `vetor-blog`; apex redirect→www |

---

### Ciclo 10 — 2026-10-03 (Normalização de URLs e categorias)
- Canonical/Open Graph padronizados com trailing slash nas páginas de descoberta; sitemap alinhado ao mesmo padrão.
- `trailingSlash: true` ativado no Next.js; redirects antigos passam a apontar diretamente para URLs canônicas com `/`.
- Hubs de categoria normalizam aliases de caixa/acentuação e redirecionam aliases legados para a categoria canônica.
- P2-6 e P2-8 atualizados como concluídos.

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
- Env vars Vercel production: SUPABASE_SERVICE_ROLE_KEY, INDEXNOW_API_KEY, SITE_URL, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_* analytics. IndexNow key must match the public key file at the domain root.
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
- **Status:** P0–P3 + P2-4/2-5 + P4-1/2/3/5 done · P4-4 (GSC) remains blocked. Google Indexing API is not an implementation gap for product review pages; those page types are not eligible for that API.

### Ciclo 6 — 2026-09-23 (Indexing API + titles + GitHub)
- **Google Indexing API:** não é usada no fluxo de reviews/comparativos; a API oficial é restrita a JobPosting e BroadcastEvent em VideoObject. Não interpretar uma variável de ambiente como prova de submissão ou indexação.
- Env vars novas no Vercel production: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (adicionadas via CLI)
- Teste local: IndexNow 3 URLs + Google Indexing 3 URLs OK (`service_account=true`)
- **P4-4 titles:** layout default/template, `/reviews`, `/comparativos` (+detalhe), categorias, tags, autor, institucionais — keyword + brand + length
- Gate: `npm run lint` · `npm run build` (293 pages) · **push** `f43c088` → `origin/main` (`carloshbhb/Vetor`) · **deploy CLI** `3ol44cjv7` READY alias `www.vetor.blog`
- Smoke produção: home/comparativos/author/tags/reviews/sobre 200 com titles novos · sitemap 260 URLs (author+tags) · AuthorBox no review ✓ · robots disallow `/admin` ✓
- **Nota:** Git integration do projeto `vetor-blog` aponta para outro repo (`Vetor.blog`); push em `Vetor` **não** dispara deploy sozinho — usar `vercel --prod` ou reconectar o repo correto
- **Status:** P0–P3 + P2-4/2-5 + P4-1/2/3/4/5 done · restam: GSC impressions para refinar titles, conteúdo de intenção-compra (briefs prontas)

### Ciclo 7 — 2026-09-23 (Links de afiliado ML / meli)
- **Diagnóstico:** ML **não tem API pública oficial** de afiliados para gerar `meli.la` (gerador de links é o painel; OAuth `ml_tokens` vazio → API autenticada indisponível); tracking `matt_*` é client-side
- **Dados:** `product_links` 107/107 com `affiliate_id=vetorblog` inválido → reescritos p/ `matt_tool=carloshbhb&matt_word=vetorblog&ref=carloshbhb&tracking_id=carloshbhb`; `reviews` 13 plain ML → matt_* (138/142 meli-like; 4 restantes multi/non-ML intocados)
- **Code:** `generateAffiliateUrl` (product-extractor) ML usa `matt_*` (fallback env `ML_TRACKING_ID`); scripts `tmp/test-ml-links.ts`, `tmp/fix-meli-links.ts`
- Gate: `npm run lint` ✅ · `npm run build` ✅ 293 pages · **push** `65e8fec` · **deploy CLI** READY `www.vetor.blog`
- **Status:** links de produto no padrão meli/tracking · bloqueios restantes: OAuth ML (interativo) p/ enriquecer via API, meli.la em massa só via painel/cookie (não oficial)

### Ciclo 8 — 2026-10-01 (Fix git integration Vercel)
- **Diagnóstico:** projeto `vetor-blog` (dono de `www.vetor.blog`) conectado ao repo morto `Vetor.blog` (último push mai/2026); pushes no repo ativo `Vetor` buildavam no projeto legado `vetor` (`vetor-pi.vercel.app`)
- **Fix via CLI:** `vercel git connect https://github.com/carloshbhb/Vetor.git` no `vetor-blog` + `vercel git disconnect` no `vetor` (fim dos builds duplicados)
- Deploy de teste deste commit deve disparar auto-deploy em `vetor-blog`

### Ciclo 9 — 2026-10-01 (Auditoria externa → backlog)
- **Confirmado:** slug/título-lixo publicado e linkado na home (→ P0-10) · home sem `<img>` no HTML (→ P1-9) · 5 reviews finas (→ P1-8) · author/Person não detectado no schema + datas vazias AW9 (→ P2-6) · rebadge de ano AW9 (→ P2-7)
- **Refutado:** "home com apenas 3 links / JS-renderizada" — produção tem **31 `<a>`** server-rendered com cards de artigo no HTML inicial
- **Métricas:** zero sessões orgânicas 56d (`metrics/SUMMARY.md`) → prioridade em base/indexação (P0/P1), não em P4


### Ciclo 11 — 2026-10-05 (Crescimento orgânico — etapa 2)
- Corrigida a ponte legada `/categoria/:category/` → `/reviews/categoria/:category/` para recuperar hubs que ainda recebem impressões.
- Ajustado o redirect de `/review/:slug/` → `/reviews/:slug/` para respeitar `trailingSlash: true` e reduzir risco de cadeia de redirects.
- Reviews agora conseguem expor um bloco de cluster adicional quando a categoria tem guia de compra, mas não possui páginas de intenção com dados suficientes.
- Revisão de SEO aplicada no Supabase às 10 páginas prioritárias da etapa anterior; Echo Dot 5 foi corrigido para a categoria `Casa Inteligente`.
- Não foi introduzido nenhum mecanismo artificial para AI Search; a arquitetura reforça hubs, links internos e intenção comercial.

### Ciclo 12 — 2026-10-06 (Cluster Moto G06)
- Publicado em produção o review `moto-g06-128gb-review` e o comparativo `moto-g06-vs-moto-g17-vs-galaxy-a07`.
- Conteúdo editorial sincronizado com GitHub por migration idempotente, preservando review, FAQ, comparação, SEO on-page e dados de afiliado já publicados no Supabase.
- `src/app/sitemap.ts` passou a revalidar a cada 5 minutos para que novas reviews/comparativos do Supabase sejam refletidos sem depender de um novo conteúdo manual no sitemap.
- Próximo passo operacional: submissão do sitemap e URLs ao Google Search Console/IndexNow e inspeção das duas URLs.

### Ciclo 13 � 2026-10-13 (Pipeline landing page � Samsung Galaxy A17 / 2 LPs/dia)
- **Item:** Pipeline generate-2-landing-pages executado (teste completo).
- **Resultado:** 2 landing pages geradas (8bitdo-ultimate-2c, xiaomi-mi-home-security-camera-2k-cam-seg); compare_table corrigido para ReviewCompareTable; refer�ncia layout (SF Symbols banner / liquid-glass CSS / GSAP / compare_table schema) inserida no super prompt.
- **IndexNow:** aceito (ccepted: 1 por URL).
- **Gate:** 
pm run build ? (244/244); 
pm run lint ? (0 warnings).
- **Outcome:** improved � pipeline operando com refer�ncia de layout registrada e compila��o limpa; pr�ximo: acompanhar 7d para gentdb train (confian�a =0.85 ap�s 3 ocorr�ncias).
- **Arquivos:** 	mp/generate-2-landing-pages.ts (ref layout + tipos corrigidos), LEARNINGS.md, commit d872c1 (push main).

### Ciclo 14 - 2026-11-04 (Pipeline de conteudo restaurado + diagnostico GA4)
- **Causa raiz do travamento:** a Lista Social do ML era importada em `affiliate_links` como `source_type='social_list'` (rejeitado pelo check constraint de producao) e com `destination_url=""`; nada promovia esses registros para `comparison_product`, e 3 produtos com `landing_page_slug` travavam a fila -> zero reviews novos.
- **Pipeline no ar:** `scripts/refill-content-queue.ts` + `.github/workflows/refill-content-queue.yml` (02:30 UTC + dispatch) fazem sync -> import -> boost de `seo_keywords` -> matching com deadline -> promocao -> limpeza de LP -> dispatch do `generate-daily-review` (04:15 UTC).
- **Run de producao `41928856153` (45m07s, sucesso):** sync 249/291 (parcial), import 0 inseridos/397 ja importados (dedup ok), SEO 120 keywords/613 links, matching 12 lotes x 20 = 240 candidatos, **promocao 77** produtos para `comparison_product` + destino HTTPS com `matt_*`.
- **Primeiro draft apos a quebra:** `console-sony-playstation-5-edicao-slim-disk-1tb-branco` (2.136 palavras, 6 headings, FAQ 5, specs 5, veredito 8 "Recomendado"), `status=draft`, sem publicacao automatica.
- **Estado da fila (inspecao read-only):** 735 `affiliate_links` (173 `comparison_product/active`, 125 `comparison_product/paused`, 315 `product_link/active` aguardando matching) e 548 matches (238 `matched`, 255 `review`, 55 `error`).
- **GA4 - questao fechada:** o zero organico **nao e falha de instrumentacao**. Na mesma propriedade (`458038617`) ha 10 sessoes em 28d e 160 em 90d, todas em canais `AI Assistant` (9) e `Direct` (1), com zero organico. Conclusao: a tag coleta; o gargalo e indexacao/ranking, nao tracking. Workflow novo `ga4-channel-diagnostic.yml` mantem essa comparacao acessivel.
- **Qualidade de fila corrigida:** guard de acessorio refeito (falso positivo descartava celulares legitimos por "Tela de 6.7"), promocao passou a gerar 1 registro por produto (a Lista Social repete o mesmo produto em varios item ids) e a categoria editorial nunca mais herda rotulo de origem ("Lista Social" viraria hub fino).
- **Decisao de escopo mantida:** `tmp/generate-8-articles.ts` continua manual; a escala diaria e `generate-daily-review` (drafts) + cron viral (1 comparativo/dia com quality gate). Nada foi publicado automaticamente. commit d872c1 (push main).

### Ciclo 15 - 2026-11-05 (pipeline rodando + hardening do code review)
- **Cron viral confirmado:** a inspecao `42051850253` mostra `viral_articles` com **22 artigos** e publicacao nova em `2026-11-05T06:56:24Z` (`galaxy-s24-vs-iphone-15-vs-pixel-8-qual-o-melhor-smartphone-em-2026`). O cron das 06:00 UTC funciona; a conclusao anterior de "nao publicou" era falsa porque os virais vivem em `viral_articles`, nao em `reviews`.
- **Refill #4 (`41944556372`, sha `d085640`):** sucesso em 33m45s. Matching 185 candidatos em 10 lotes (185 -> 0, 3 erros); promocao 316 considerados -> **66 promovidos**, 116 `skippedExisting`, 45 `skippedUnsafe`, 13 `skippedAccessory`, 76 `duplicateMatches`, 0 erros.
- **Refill agendado (`42004973045`, 09:45Z):** sucesso. Import 1/437, matching 58 candidatos, promocao 4 promovidos, 178 `skippedExisting`, 46 `skippedUnsafe`, 13 `skippedAccessory`, 77 `duplicateMatches`.
- **Drafts diarios:** `41948516161` -> `xiaomi-redmi-note-13-pro-5g`; `42006611145` -> `behringer-c-1`; agendado `42026188519` -> `sensor-magnetico-intelbras-mibo-asa-3001-sem-fio`. Todos `status=draft`, `content_type=review`, 1.958-2.192 palavras, 6 headings, FAQ, specs, imagem e link de afiliado.
- **Code review - P0:** removido `archiveLandingPageCoveredProducts` de `src/lib/mercadolivre-refill.ts` e `scripts/refill-content-queue.ts`. A limpeza arquivava a propria linha dona do `landing_page_slug`, quebrando CTAs das LPs publicadas.
- **Code review - P1:** promocao otimista compara `status`, `source_type` e `destination_url` exatos e exige `.select("id")` (zero linhas -> `skippedConcurrent`; inativa -> `skippedInactive`); guard de acessorio por token inteiro grava o motivo em `match_status='review'`; boost de SEO restrito a `source_type='product_link'` com `source_ref` da Lista Social; categoria editorial inferida (Consoles, Controles, Casa Inteligente) e nunca herdada do rotulo de origem.
- **Code review - P2/P3:** deadline opcional no batch de matching; `checked_at` invalido passa a cair para `updated_at` (o teste novo encontrou o bug real antes do fix); HTTP 403 da busca de anuncios sem candidato vira `no_match` via `resolveSearchOutcomeWithoutCandidate`, em vez de erro permanente.
- **Estado final da fila (inspecao `42051850253`):** reviews 124 published/review + 6 draft/review + 3 published/lp + 5 draft/lp; `affiliate_links` 736 (243 `comparison_product/active`, 125 `comparison_product/paused`, 246 `product_link/active`, 119 `review/active`, 3 `review/paused`; 248 promovidos com destino); fila de review 179 (10 elegiveis, 8 travados por LP); matches 733 (336 `matched`, 342 `review`, 55 `error` residuais de 403, que o fix recicla como `no_match` no proximo refill).
- **Categorias normalizadas:** `console-sony-playstation-5-...` -> `Consoles`, `controle-gamesir-nova-lite-...` -> `Acessorios para Games`, `sensor-magnetico-intelbras-mibo-...` -> `Casa Inteligente`; 11 drafts inspecionados, 3 alterados, 7 inalterados, 0 com rotulo de origem; `behringer-c-1` mantido em `Audio Profissional` (categoria editorial valida, sem inferencia nova).
- **Verificacao e commit:** guardrails passam (`mercadolivre-refill`, `mercadolivre-match-batch`, `mercadolivre-search-guardrails`, `product-category`), `npx tsc --noEmit` limpo, `npx next build` isolado passou (o `npm run build` completo caiu uma vez em `Collecting page data` por codigo nativo do Windows e passou na repeticao), `git diff --check` limpo. Commit `38d19e0` na `main` (13 arquivos; `ruvector.db`, `supabase/.temp/cli-latest`, `.agentdb.db` e `LEARNINGS.md` fora).
- **Pendencias conscientes:** 55 matches `error` antigos so mudam de estado no proximo refill; P2/P3 restantes do review (corrida de importacao sem unique em `source_ref`, refresh global de OAuth do ML, budget do viral, `reasoning_format` enviado a todos os modelos, ordem de env da NVIDIA, erros silenciosos de SEO/sync, drift de slug, `ML_TRACKING_ID` duplicado, colisao de prefixo de nome canonico e contador da fila do daily-review) ficam para o proximo ciclo.
