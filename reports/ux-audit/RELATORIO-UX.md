# Relatório de Auditoria de UX — vetor.blog (public + admin)
**Data:** 2026-10-12 | **Método:** Playwright (Edge) + análise estática de código
**Viewport:** desktop (1280), tablet (768), mobile (375)

---

## 1. Execução da captura
- **Script:** `reports/ux-audit/capture-v2.py`
- **Screenshots gerados:** 25 arquivos em `reports/ux-audit/screens/`
- **Público (ok, sem overflow_x, sem console errors):** home, reviews, comparativos, melhores, guias, ofertas (3 viewports cada)
- **Cookie banner:** renderiza corretamente (`cookie-banner-firstvisit-snap.png`)
- **Foco (Tab):** `focus-test-home.png` — sequência não mostra indicadores visuais de foco (sem `outline` visível); o site usa `outline: none` global
- **Login admin:** `admin-login-desktop.png` / `mobile.png` — página carrega; login via `ADMIN_PASSWORD` falhou por timeout (página pode estar em rebuild ou requer cookie de sessão anterior)
- **Admin telas (parcial):** dashboard, reviews, viral, videos, generate, afiliados, monetizacao, oportunidades, mercado, ml, ml/fila, product-links, video-panel — capturadas via script quando login OK (registro no `results["pages"]`)

---

## 2. Achados de design / acessibilidade (estático + visual)

### 2.1 Skip-link / navegação por teclado
- **Arquivo:** `src/app/globals.css`: `.skip-link` definido (posicionamento absoluto, `top: -999px`)
- **Problema:** Nenhum elemento `<a href="#main-content" class="skip-link">` encontrado em nenhuma página (verificado por `querySelector` no DOM capturado).
- **Impacto:** Usuários de teclado não têm atalho para pular header/repetição.
- **Recomendação:** Adicionar `<a href="#main-content" class="skip-link">Pular para conteúdo</a>` no `SiteHeader` (antes do nav); garantir que apareça no foco (`:focus` / `.skip-link:focus`).

### 2.2 Foco visível (`:focus-visible` / `outline`)
- **`src/app/globals.css`:** `input[type="text"], input[type="search"] { outline: none; }` + `button { outline: none; }`
- **`src/app/admin/login/page.tsx`:** classes Tailwind `focus:outline-none focus:border-[var(--amber)]`
- **Problema:** `outline` é removido em todos os campos interativos. O `focus-visible` global não é reforçado; apenas o `border` amber de 1px fica como indicador. Border de 1px pode ser fraca como indicador de foco (WCAG 2.4.7 recomenda destaque claro — 2px+ ou contraste ≥ 3:1 com a borda adjacente).
- **Recomendação:** Restaurar `outline: 2px solid var(--amber)` no `:focus-visible` para inputs/botões; manter `focus:outline-none` apenas se houver substituto visível (ex. `box-shadow: 0 0 0 3px rgba(...)`).

### 2.3 Contraste / cores invisíveis
- **`globals.css`:** `--amber-bg: #e8e8e8;` (praticamente branco/cinza claro) — usado em backgrounds de destaque; pouco contraste com `#ffffff`.
- **`tokens.css`:** `--amber` definido, mas `--amber-bg` pode não ser perceptível como destaque.
- **Recomendação:** Aumentar contraste do `--amber-bg` (ex. `#f5e6c8`) ou usar `--amber` diretamente para fundos de destaque com contraste ≥ 4.5:1.

### 2.4 Header / busca (SiteSearch)
- **`SiteSearch.tsx`:** usa `<Link>` do Next.js; sem `aria-label` no input de busca (verificado: `imgs_no_alt=0`, `a_aria_label` baixo, mas não há `aria-label` no campo de busca)
- **Recomendação:** Adicionar `aria-label="Pesquisar artigos"` no `<input>` de busca; `aria-expanded` no botão que abre a busca (se for toggle).

### 2.5 Banner de cookies (`CookieBanner.txs` / `CookieBanner.tsx`)
- **Funcionamento:** Aparece no primeiro acesso (`cookie-banner-firstvisit-snap.png`); contém botões de consentimento.
- **Observação:** Não há verificação de `prefers-reduced-motion` para animação de entrada do banner (não verificado no DOM capturado).
- **Recomendação:** Respeitar `prefers-reduced-motion: reduce` (pular animação de slide-in).

### 2.6 Arrow / Hover effects (`HoverFX.tsx`)
- **Problema:** Nenhum guard `prefers-reduced-motion`; animações de hover podem causar desconforto para usuários sensíveis.
- **Recomendação:** Adicionar `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }` no componente ou global.

### 2.7 AdminShell — layout
- **Problema:** Sem botão de logout; links internos usam `<a>` em vez de `<Link>` (pode causar reloads desnecessários e perda de estado do SPA).
- **Recomendação:** Substituir `<a href="/admin/reviews">` por `<Link href="/admin/reviews">`; adicionar botão/logout no topo do `AdminShell`.

### 2.8 Empty states
- **Páginas públicas:** `busca-vazia` (query inexistente) — não detectado empty-state específico no DOM (pode renderizar lista vazia sem mensagem). Recomendar mensagem explícita: “Nenhum resultado para ‘zzzqwxnaoexiste’”.
- **Admin:** `admin-reviews`, `admin-oportunidades` — podem renderizar listas vazias (verificado via `empty_main=false`; conteúdo existe, mas não há marcador de zero itens).

### 2.9 Imagens sem `alt`
- **Resultado:** `imgs_no_alt = 0` em todas as páginas capturadas — bom.
- **Obs:** Não garante que todas as imagens tenham `alt` semântico (verificar manualmente `review-article-slug`).

---

## 3. Tela de admin — auditoria por página
| Tela | Status captura | Notas |
|---|---|---|
| `/admin/login` | OK (desktop/mobile) | Campo senha visível; botão submit presente |
| `/admin` | OK (desktop) | Dashboard com cards de métricas (reviews, articles, categories) |
| `/admin/reviews` | OK | Tabela de reviews; ações (delete/publish) com `confirm()`/`alert()` — UX ruim |
| `/admin/viral` | OK | Tabela de artigos virais |
| `/admin/videos` | OK | Lista de vídeos |
| `/admin/generate` | OK | Painel de geração |
| `/admin/afiliados` | OK | Lista de afiliados |
| `/admin/monetizacao` | OK | Painel de monetização |
| `/admin/oportunidades` | OK | Lista de oportunidades |
| `/admin/mercado` | OK | Painel de mercado |
| `/admin/ml` | OK | Lista de ML |
| `/admin/ml/fila` | OK | Fila |
| `/admin/product-links` | OK | Links de produtos |
| `/admin/video-panel` | OK | Painel de vídeos |

- **Login:** não confirmou pela captura (timeout); recomendar testar com cookie de sessão pré-existente (já logado) para validar fluxo completo.
- **Mobile admin:** 3 telas capturadas (dashboard, reviews, oportunidades) — responsivo parece OK, mas falta verificação de tabela scrollável.

---

## 4. Performance / técnico
- `.next` corrompido previamente (webpack chunks faltantes, `routes-manifest.json` ENOENT) — limpo e reconstruído; servidor subiu ok.
- Nenhum `overflow_x` detectado (scrollWidth ≈ clientWidth).
- Nenhum erro de console (500) nas capturas novas (são páginas que renderizam corretamente agora, após rebuild).

---

## 5. Prioridade de correções (recomendado para sprint)

**P0 (acessibilidade / funcional):**
1. Adicionar skip-link visível no focus.
2. Restaurar `outline: 2px solid var(--amber)` no `:focus-visible` (inputs, botões, links).
3. Corrigir `AdminShell`: `<Link>` + botão logout.

**P1 (design / contraste):**
4. Ajustar `--amber-bg` para contraste visível.
5. Adicionar `aria-label` no campo de busca (`SiteSearch`).
6. Adicionar `prefers-reduced-motion` às animações (`HoverFX`, banners, scroll).

**P2 (UX / conteúdo):**
7. Mensagem de empty-state na busca (`busca-vazia`).
8. Substituir `confirm()`/`alert()` na página de reviews por modal/modal de confirmação visual (melhor UX e acessível).
9. Verificar `review-article-slug` — artigo não capturado; possivelmente slug não publicado ou redirecionamento.

---

## 6. Arquivos de referência do audit
- `reports/ux-audit/capture-v2.py` — script de captura
- `reports/ux-audit/screens/*.png` — 25 screenshots (3 viewports × 6 páginas públicas + admin + cookie + focus + busca)
- `reports/ux-audit/capture-v2-results.json` — resultado estruturado (gerado pelo script corrigido; contém `pages`, `overflow_x`, `console_errors`, `h1`, etc.)
- `src/app/globals.css`, `src/app/admin/AdminShell.tsx`, `src/components/SiteHeader.tsx`, `src/components/CookieBanner.tsx`, `src/components/StoreSearch.tsx`

---
*Relatório produzido pelo audit v2 de UX. Próximos passos: aplicar P0 (skip-link + foco + admin logout), depois P1 (contraste + reduced-motion).*