# Redesign Vetor.blog (dark + amarelo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portar os 4 templates de referência para o App Router, trocando a identidade atual (light editorial) pelo sistema dark navy + amarelo, com rotas, schema, tracking e monetização funcionando.

**Architecture:** Tokens v2 em `styles/tokens.css` (único ponto de verdade, espelhado no `@theme` do Tailwind v4); shell global (header/footer) montado uma vez no `layout.tsx`; páginas server components compostas de blocos server + ilhas client mínimas (tracking, sticky CTA, barras); afiliados via rota `/go/` 302; dados continuam Supabase-com-fallback (`src/lib/data.ts`).

**Tech Stack:** Next.js 15 + React 19 + TypeScript, Tailwind v4 (sem config file), `next/font`, `next/image` via `SafeImage`, `node:test` para testes unitários, GA4 (property 458038617).

**Spec:** `C:\Users\Henrique\Desktop\site\vetor-blog-home.html`, `vetor-blog-review-template.html`, `vetor-blog-comparativo-template.html`, `vetor-blog-guia-template.html` + análise de 2026-10-01 (tokens, componentes e gaps levantados no chat). Em divergência, o HTML de referência manda no visual; este plano manda nos dados/rotas.

## Global Constraints

- Server Components por padrão; **nenhum handler `on*` em server component** (lição #2: build quebra no prerender) — interação via `data-hover*`+`HoverFX` ou client component com delegação em `document`.
- Gate por task: `npm run build` + `npm run lint` verdes antes do commit (padrão do repo: lint 0 erros).
- Host canônico `https://www.vetor.blog` em tudo (templates usam apex `https://vetor.blog` — normalizar; `seo.ts` e `metadataBase` já usam www).
- Copy pt-BR; sem rating/preço inventado (schema `Review`/`Offer` só de campos reais).
- Afiliados: href `/go/<slug>/` + `target="_blank"` + `rel="sponsored nofollow noopener"` + `data-aff-pos="<posição>"`.
- Eventos GA4 `affiliate_click` + `scroll_depth` (25/50/75/90) para a property 458038617.
- CSS: manter o padrão de 2 arquivos (`styles/tokens.css` + `src/app/globals.css`) + utilities Tailwind; **não criar** CSS Modules (repo tem 0).
- Commits pequenos, convencionais (`feat:`/`fix:`), um por task.

## Review Focus

- Com JS desabilitado, todo CTA de afiliado ainda navega (tracking é enhancement; `<a href>` real sempre). → teste na Task 9.
- `/go/<slug>` desconhecido retorna 404, nunca redirect para a home (vazamento de confiança). → teste na Task 9.
- `FAQPage` precisa espelhar o FAQ visível, pergunta por pergunta (mismatch = risco de spam). → teste na Task 11.
- Página sem `og:image` próprio cai para `/og.png` (nunca 404 de og:image). → teste na Task 11.
- Data de "preço checado em" e preço exibido vêm sempre dos campos de dados, nunca hardcoded. → teste na Task 4.

## File Structure

```
styles/tokens.css                      REWRITE  (paleta :root da referência)
scripts/design-tokens.test.mjs         CREATE   (contrato dos tokens)
src/app/globals.css                    MODIFY   (base da referência + @theme sync)
src/lib/fonts.ts                       MODIFY   (Inter via next/font)
src/components/SiteHeader.tsx          CREATE   (server: brand + 4 links + CTA)
src/components/SiteFooter.tsx          CREATE   (server: 7 links + disclosures)
src/components/VerdictCard.tsx         CREATE   (server: nota, preço, CTA)
src/components/AnswerBox.tsx           CREATE   (server: resposta rápida + CTA)
src/components/ScoreBarsStatic.tsx     CREATE   (server: barras por critério, sem animação)
src/components/CompareTable.tsx        REUSE    (ComparisonTable.tsx, restyle via tokens)
src/components/ProsCons.tsx            REUSE    (restyle via tokens)
src/components/AuthorBox.tsx           REUSE    (restyle via tokens)
src/components/ReviewCard.tsx          MODIFY   (visual home-card da referência)
src/components/AffiliateTracker.tsx    CREATE   (client: delegação click + scroll_depth)
src/components/Ga4.tsx                CREATE   (client: gtag NEXT_PUBLIC_GA_ID, só prod)
src/components/StickyBuyBar.tsx        CREATE   (client: IntersectionObserver veredito/rodapé)
src/components/NewsletterForm.tsx      CREATE   (server: form action=env)
src/components/RankCard.tsx            CREATE   (server: item de ranking do guia)
src/app/go/[slug]/route.ts             CREATE   (302 → affiliate_url, noindex)
src/app/guias/page.tsx                 CREATE   (+ [slug]/page.tsx + generateStaticParams)
src/data/guias.ts                      CREATE   (fallback: 1 guia sample)
src/app/ofertas/page.tsx               CREATE   (de getAllProductLinks)
src/app/{como-avaliamos,politica-editorial,afiliados,termos}/page.tsx  CREATE
src/lib/seo.ts                         MODIFY   (publisher #org, ItemList com names)
src/components/SchemaMarkup.tsx        MODIFY   (reutilizar #org; nada novo)
src/app/sitemap.ts                     MODIFY   (+ guias, ofertas, institucionais; - nada)
src/app/layout.tsx                     MODIFY   (themeColor, shell global, Ga4)
src/app/page.tsx                       REWRITE  (home da referência)
src/app/reviews/[slug]/page.tsx        REWRITE  (blocos da referência)
src/app/comparativos/[slug]/page.tsx   REWRITE  (+ importar generateStaticParams)
scripts/seo-contract.test.mjs          CREATE   (contrato #org, FAQPage, og fallback)
```

Remover ao final (só se `grep` provar 0 usos): `Navbar.tsx`, `VerdictBox.tsx` antigo, `TLDRBox.tsx`, `CustomCursor.tsx`, `NoiseOverlay.tsx`, `SmoothScroll.tsx`, `EntranceAnimations.tsx`, `DesktopStickyCTA.tsx`/`StickyCTA.tsx` (substituídos por `StickyBuyBar`).

---

### Task 1: Tokens v2 + fontes

**Files:**
- Modify: `styles/tokens.css` (rewrite completo do `:root`)
- Modify: `src/app/globals.css` (bloco `@theme` + base da referência, substituindo as ~865 linhas atuais)
- Modify: `src/lib/fonts.ts` (trocar Bebas/Syne/DM_Sans por Inter)
- Test: `scripts/design-tokens.test.mjs`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: variáveis `--bg #071018, --bg-2 #0d1722, --surface #ffffff, --surface-2 #f5f7f9, --text #101722, --muted #637082, --line #dfe5eb, --brand #ffe600, --brand-2 #f6ce00, --green #11b86a, --red #e84b4b, --dark #0c1118, --radius 22px, --max 1180px` + classes Tailwind `bg-ink/text-muted/border-line/...` via `@theme`; `inter` com variable `--font-sans` aplicada no `<html>`.

- [ ] **Step 1: Escrever o teste de contrato dos tokens**

`scripts/design-tokens.test.mjs`: lê `styles/tokens.css` e afirma que cada um dos 13 hex acima existe no `:root`. Rode `node --test scripts/design-tokens.test.mjs`. Esperado: FAIL (tokens atuais são outros).

- [ ] **Step 2: Reescrever `styles/tokens.css` com a paleta da referência**

Copiar os valores do `:root` de `vetor-blog-review-template.html:29-45` verbatim, mantendo os blocos `prefers-reduced-motion` e `:focus-visible` existentes (ajustar a cor do outline para `#5f8dff`, valor da referência).

- [ ] **Step 3: Sincronizar `@theme` em `src/app/globals.css` e trocar a base**

`@theme` espelha os mesmos hex (`--color-bg`, `--color-ink`, ...). Substituir o corpo vanilla atual pelas classes base da referência (container, skip-link, focus, site-header/nav, hero, verdict, article, toc, pros/cons, fact-grid, compare table, who-grid, faq, related, sidebar, footer, mobile-cta, breakpoints 980/720).

- [ ] **Step 4: Trocar fontes em `src/lib/fonts.ts`**

```ts
import { Inter } from "next/font/google";
export const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
```

Remover Bebas/Syne/DM_Sans e os stacks conflitantes (`Lyon Text/...`, `SF Pro/...`) de `tokens.css` e do `@theme`. Aplicar `inter.variable` no `<html>` em `layout.tsx`.

- [ ] **Step 5: Verificar**

Run: `node --test scripts/design-tokens.test.mjs` → PASS. Run: `npm run build` + `npm run lint` → verdes.

- [ ] **Step 6: Commit**

`git add styles/tokens.css src/app/globals.css src/lib/fonts.ts scripts/design-tokens.test.mjs src/app/layout.tsx && git commit -m "feat(design): tokens v2 dark+amarelo e Inter via next/font"`

### Task 2: Shell global (header/footer no layout)

**Files:**
- Create: `src/components/SiteHeader.tsx`, `src/components/SiteFooter.tsx`
- Modify: `src/app/layout.tsx` (montar shell; `themeColor #071018`)
- Modify: todas as pages que importam `Navbar`/`Footer` (remover imports; lista: `page.tsx`, `reviews/page.tsx`, `comparativos/page.tsx`, `comparativos/[slug]/page.tsx`, `tags/*`, `author/*`, `contato/sobre/metodologia/privacidade`)

**Interfaces:**
- Consumes: tokens da Task 1.
- Produces: `<SiteHeader />` (server, sem props; links Reviews/Comparativos/Guias/Ofertas + CTA "Ver reviews") e `<SiteFooter />` (server, sem props; 7 links: Sobre, Como avaliamos, Política editorial, Afiliados, Privacidade, Termos, Contato + 2 disclosures); `StickyReviewNav` continua sendo nav in-page do review (não é substituído).

- [ ] **Step 1: Criar `SiteHeader`/`SiteFooter` server components**

Markup verbatim de `vetor-blog-home.html:439-452` (header) e `748-772` (footer, versão 7 links — unifica os 3 templates).

- [ ] **Step 2: Montar no `layout.tsx`, remover imports por página**

`themeColor` → `#071018`. `grep -r "components/Navbar\|components/Footer" src/app` deve retornar 0 hits após a limpeza.

- [ ] **Step 3: Verificar**

Run: `npm run build` + `npm run lint` → verdes. Header/footer aparecem uma única vez por página.

- [ ] **Step 4: Commit**

`git commit -m "feat(layout): shell global SiteHeader/SiteFooter"`

### Task 3: Home

**Files:**
- Modify: `src/app/page.tsx` (rewrite; manter `revalidate = 300` e as 3 queries de `src/lib/data.ts`)
- Create: blocos home em `src/components/home/` (`HomeHero.tsx`, `HomeFeature.tsx`, `HomeStrip.tsx`, `IntentCards.tsx`, `RecentReviews.tsx`, `CompareTeasers.tsx`, `GuideTeasers.tsx`, `Picks.tsx`, `NewsletterForm.tsx`, `HomeCTA.tsx`) — server, exceto `NewsletterForm` (form puro, sem JS)
- Modify: `src/components/ReviewCard.tsx` (visual home-card quando `featured`)

**Interfaces:**
- Consumes: shell da Task 2; dados `fetchAllReviews()/fetchCategories()/fetchAllViralArticles()`.
- Produces: home com as 9 seções da referência; `NewsletterForm` com `action={process.env.NEXT_PUBLIC_NEWSLETTER_ACTION}`.

- [ ] **Step 1: Reescrever a home por seções**

Ordem verbatim `vetor-blog-home.html`: home-hero → strip → intent cards → ad-slot → recent reviews → comparativos → ad-slot → guias → picks → newsletter → CTA. `AdSlot` existente (`AdSlot.tsx`) com envs `NEXT_PUBLIC_ADSENSE_CLIENT`/`NEXT_PUBLIC_ADSENSE_SLOT_*`; sem env, renderiza placeholder como hoje.

- [ ] **Step 2: Verificar**

Run: `npm run build` + `npm run lint` → verdes.

- [ ] **Step 3: Commit**

`git commit -m "feat(home): home no novo design com 9 seções"`

### Task 4: Review `[slug]`

**Files:**
- Modify: `src/app/reviews/[slug]/page.tsx` (rewrite dos blocos; manter `generateStaticParams`, `generateMetadata`, `ReviewSchema/FAQSchema/BreadcrumbSchema`)
- Create: `src/components/VerdictCard.tsx`, `src/components/AnswerBox.tsx`, `src/components/ScoreBarsStatic.tsx`
- Modify: `src/components/ReviewCard.tsx` (relacionados), `ProsCons.tsx`, `AuthorBox.tsx` (restyle via tokens, mesmas props)
- Test: estender `scripts/seo-contract.test.mjs`? Não — teste aqui é de dados: afirmar que "Preço checado em" renderiza de `review.updated_at` (ver Review Focus 5)

**Interfaces:**
- Consumes: `Review` (`src/lib/types.ts`): `verdict_score/label/text/note`, `price_new`, `affiliate_url`, `hero_bars[]`, `pros/cons[]`, `compare_table`, `faq[]`, `sections[]`, `specs[]`.
- Produces: blocos hero-grid + verdict sticky, answer, TOC, resumo+pros/cons+fact-grid, barras, critérios, desempenho, ad-inline, preço, comparativo, público, conclusão, FAQ, autor, relacionados, sidebar buy-card, CTAs `/go/<slug>/` com `data-aff-pos` (hero, resposta-rapida, preco, conclusao, sidebar).

Mapeamento de campos (sem campo, sem bloco): nota=`verdict_score`; barras=`hero_bars[{label,value}]`; preço=`price_new` + "checado em"=`updated_at`; veredito=`verdict_*`; FAQ=`faq[]` (já alimenta `FAQSchema`); relacionados=mesma `category` (3, já existe).

- [ ] **Step 1: Criar `VerdictCard`/`AnswerBox`/`ScoreBarsStatic`**

Props: `VerdictCard({score, price, priceCheckedAt, affiliateSlug, verdictTitle, verdictText})`; `AnswerBox({product, idealFor, alternative, score, affiliateSlug})`; `ScoreBarsStatic({bars})`. Sem `use client`, sem `on*`.

- [ ] **Step 2: Reescrever os blocos da page na ordem da referência**

Manter toda a lógica de dados/schema/metadata; trocar só o JSX. CTAs apontam `/go/<slug>/` (rota criada na Task 9 — até lá, href pode existir sem destino; a Task 9 fecha o circuito).

- [ ] **Step 3: Verificar**

Run: `npm run build` + `npm run lint` → verdes. Página de exemplo renderiza nota/preço/FAQ dos dados.

- [ ] **Step 4: Commit**

`git commit -m "feat(review): página de review no novo design"`

### Task 5: Comparativo `[slug]`

**Files:**
- Modify: `src/app/comparativos/[slug]/page.tsx` (rewrite + **importar** `generateStaticParams` de `./generateStaticParams` — hoje órfão)
- Modify: `src/lib/seo.ts` (`generateViralArticleSchema`: adicionar `ItemList` de `products[{name, url}]` com `name` — Review Focus cobre names)
- Modify: links `product_url` → `/go/<slug>/` + `rel="sponsored nofollow noopener"` (hoje sem `sponsored`)
- Create: `src/components/VsCards.tsx`, `src/components/PickRow.tsx` (server)

**Interfaces:**
- Consumes: `ViralArticle` (`title, description, category, hero{imageUrl,bars}, products[{name,slug,imageUrl,product_url}]`).
- Produces: hero vs-cards, answer+pick-row, tabela de critérios, diferenças, escolha A/B, FAQ **só se** `article.faq` existir (campo hoje ausente no tipo — seção omitida até existir dado; nunca inventar), autor, sidebar.

- [ ] **Step 1: Corrigir `generateStaticParams` órfão + `sponsored`**

Importar o gerador existente na page; trocar `rel` dos links de produto. Um único `fetchpriority="high"` (primeira imagem vs).

- [ ] **Step 2: Reescrever blocos + `ItemList` com names**

- [ ] **Step 3: Verificar**

Run: `npm run build` + `npm run lint` → verdes.

- [ ] **Step 4: Commit**

`git commit -m "feat(comparativo): página de comparativo no novo design"`

### Task 6: Guias (rota nova)

**Files:**
- Create: `src/app/guias/page.tsx`, `src/app/guias/[slug]/page.tsx` (+ `generateStaticParams`, `generateMetadata` com OG + fallback `/og.png`)
- Create: `src/components/RankCard.tsx` (server; props `position, badge, product, price, score, pros, cons, affiliateSlug, reviewHref`)
- Create: `src/data/guias.ts` (fallback: 1 guia sample completo e marcado)
- Modify: `src/lib/data.ts` (adicionar `fetchAllGuias()/fetchGuiaBySlug()` — Supabase `viral_articles` com `category='guia'` primeiro, fallback `src/data/guias.ts`)

**Interfaces:**
- Consumes: `ViralArticle` quando `category === 'guia'`; senão o tipo `Guia` do seed (`slug, title, description, updatedAt, picks[{badge, product, price, score}], ranks[{...RankCard}], criteria[], method, faq[]`).
- Produces: índice com `ItemListSchema` + página com quick-picks, ranks, como-escolher, método, FAQ (+`FAQSchema`), autor, sidebar.

- [ ] **Step 1: Dados + índice**

`fetchAllGuias` com fallback; índice lista guias com `ItemListSchema`.

- [ ] **Step 2: Página `[slug]` nos blocos da referência**

- [ ] **Step 3: Verificar**

Run: `npm run build` + `npm run lint` → verdes (`/guias` e `/guias/<seed>` estáticas).

- [ ] **Step 4: Commit**

`git commit -m "feat(guias): rota de guias no novo design"`

### Task 7: Ofertas (rota nova)

**Files:**
- Create: `src/app/ofertas/page.tsx` (`export const revalidate = 3600`; `generateMetadata`)
- Interfaces: consumes `getAllProductLinks()` (`src/lib/product-links.ts`, service-key, server-only); produz grade de cards (nome, preço, CTA `/go/`); vazio → estado "sem ofertas hoje" (nunca 404).

- [ ] **Step 1: Implementar a página a partir de `getAllProductLinks`**
- [ ] **Step 2: Verificar** — `npm run build` + `npm run lint` → verdes.
- [ ] **Step 3: Commit** — `git commit -m "feat(ofertas): rota de ofertas"`

### Task 8: Páginas institucionais

**Files:**
- Create: `src/app/{como-avaliamos,politica-editorial,afiliados,termos}/page.tsx` (estáticas, shell global, `generateMetadata` cada)
- Modify: `src/app/sobre/page.tsx` (restyle; manter conteúdo)

Conteúdo inicial: adaptar o tom dos disclosures dos templates (afiliados, metodologia de avaliação, política editorial); marcar revisão editorial posterior no `SEO_LEDGER.md`.

- [ ] **Step 1: Criar as 4 páginas + restyle de `/sobre/`**
- [ ] **Step 2: Verificar** — `npm run build` + `npm run lint` → verdes.
- [ ] **Step 3: Commit** — `git commit -m "feat(pages): institucionais no novo design"`

### Task 9: `/go/` + tracking + GA4

**Files:**
- Create: `src/app/go/[slug]/route.ts` — `GET`: resolve slug → `affiliate_url` (reviews) ou `product_url` (viral/products); 302 + `X-Robots-Tag: noindex`; slug desconhecido → `notFound()` (nunca home)
- Create: `src/components/AffiliateTracker.tsx` (client, montado no layout): delegação `click` em `document` para `a[rel~="sponsored"]` → `gtag('affiliate_click', {link_url, link_text, position: dataset.affPos, page_path})`; `scroll_depth` 25/50/75/90 passivo; respeita `prefers-reduced-motion` para o que for animação (tracking é só leitura)
- Create: `src/components/Ga4.tsx` (client): carrega gtag com `NEXT_PUBLIC_GA_ID` somente em `production`; sem env, no-op
- Modify: `src/app/layout.tsx` (montar os dois)

**Interfaces:**
- Consumes: `fetchReviewBySlug`, `fetchViralArticleBySlug` (para resolver destino).
- Produces: redirect 302 funcional; eventos no dataLayer.

- [ ] **Step 1: Implementar a rota `/go/`**

- [ ] **Step 2: Implementar `AffiliateTracker` + `Ga4` e montar no layout**

- [ ] **Step 3: Verificar**

Run: `npm run build` + `npm run lint` → verdes. Com `npm run dev`: `curl -sI localhost:3000/go/<slug-real>` → `302`; slug inexistente → `404`. CTA com JS desabilitado ainda navega (Review Focus 1).

- [ ] **Step 4: Commit**

`git commit -m "feat(affiliate): rota /go/ 302 + tracking GA4"`

### Task 10: Monetização (AdSense + newsletter)

**Files:**
- Modify: `src/components/AdSlot.tsx` (aceitar `slot` via env; posições: home 2, review 3 — leaderboard, in-article 280px, sidebar 280px — comparativo 2, guia 1; manter `min-height` + `contain: layout` anti-CLS da referência)
- Modify: `src/components/home/NewsletterForm.tsx` (já criado na Task 3 — aqui só validar o `action` por env + texto LGPD)

- [ ] **Step 1: Ligar `AdSlot` aos envs e distribuir nos templates**
- [ ] **Step 2: Verificar** — `npm run build` + `npm run lint` → verdes.
- [ ] **Step 3: Commit** — `git commit -m "feat(monetizacao): AdSense por env + newsletter"`

### Task 11: Alinhamento SEO/schema

**Files:**
- Modify: `src/lib/seo.ts` (`generateOrganizationSchema`: adicionar `@id: https://www.vetor.blog/#org` + `logo`; `generateItemListSchema`: exigir `name` em todo item)
- Modify: `src/components/SchemaMarkup.tsx` (review `publisher` referencia `#org`)
- Modify: `src/app/sitemap.ts` (adicionar `/guias`, `/guias/<slugs>`, `/ofertas`, `/como-avaliamos`, `/politica-editorial`, `/afiliados`, `/termos`; garantir `/go/*` fora)
- Modify: `src/app/robots.ts` (adicionar `disallow: /go/`)
- Test: `scripts/seo-contract.test.mjs`

**Interfaces:**
- Produces: `scripts/seo-contract.test.mjs` com 3 testes: org tem `@id`+logo; `generateFAQSchema([{question,answer}])` gera `FAQPage` com `mainEntity` idêntico ao input; `resolveOgImage(pageImage?: string): string` (export de `src/lib/seo.ts`) retorna a imagem da página ou `/og.png`.

- [ ] **Step 1: Escrever o teste de contrato (FAIL primeiro)**

Run: `node --test scripts/seo-contract.test.mjs` → FAIL.

- [ ] **Step 2: Implementar mudanças em `seo.ts`/`SchemaMarkup`/`sitemap.ts`/`robots.ts` + `resolveOgImage` onde as OGs são montadas**

- [ ] **Step 3: Verificar**

Run: `node --test scripts/seo-contract.test.mjs` → PASS; `npm run build` + `npm run lint` → verdes.

- [ ] **Step 4: Commit**

`git commit -m "feat(seo): entidade #org, FAQPage fiel, sitemap completo"`

### Task 12: QA final + rollout

- [ ] **Step 1: Limpeza de código morto**

`grep` por `Navbar|VerdictBox|TLDRBox|CustomCursor|NoiseOverlay|SmoothScroll|EntranceAnimations|DesktopStickyCTA|StickyCTA` em `src/`: remover arquivos com 0 usos + classes CSS órfãs em `globals.css` (ex.: `.who-band`, `.scores-band` se não mais usadas). Verificar: `npm run build` + `npm run lint` → verdes após a remoção.

- [ ] **Step 2: Checagens de integridade**

`sitemap.xml` lista guias/ofertas/institucionais e não lista `/go/*`; redirect `/review/:slug → /reviews/:slug` intacto (`next.config.ts`); `feed.xml` responde; nenhuma página com `og:image` 404 (spot check nos slugs de exemplo).

- [ ] **Step 3: Deploy preview → produção**

Push da branch, preview na Vercel, spot check visual (home, 1 review, 1 comparativo, 1 guia, mobile 390px), merge, deploy prod, GA4 realtime com 1 clique de afiliado de teste.

- [ ] **Step 4: Registrar outcome**

7 dias depois, cruzar `metrics/SUMMARY.md` (tendência 7d) e anotar `outcome:` no item correspondente do `SEO_LEDGER.md` (regra Métricas → backlog do AGENTS.md). Commit final de fechamento se houver ajustes.

## Decisões assumidas (revisar)

1. Host canônico `www.vetor.blog` (repo) sobre apex (templates).
2. Inter via `next/font` como única fonte; remove Bebas/Syne/DM_Sans e stacks serifadas conflitantes.
3. `/guias/` lê `viral_articles` com `category='guia'` + seed estático de 1 guia até haver dados.
4. Newsletter = form com `action` por env (sem provider novo); AdSense = `AdSlot` existente com slot IDs por env.
5. Remove camadas de efeito (cursor custom, noise, lenis, entrance) para fidelidade e performance da referência; mantém `Reveal` (barato) e `HoverFX` (lição #2).
6. Comparativo sem FAQ/preço-por-produto até existir campo real (sem inventar).
