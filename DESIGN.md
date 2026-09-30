# DESIGN.md

## Visão Geral do Projeto

**vetor.blog** — Site de reviews e comparativos de tecnologia com foco em afiliados Mercado Livre, otimizado para alta conversão e SEO.

## Design System Registrado

### Skills Ativas (Precedência)

1. **nexu-minimalist-ui** — Premium Utilitarian Minimalism (base)
2. **premium-frontend-ui** — Camada imersiva (hero, scroll narratives, micro-interactions)
3. **anti-ui-slop** — Quality gate (audit.md playbook antes de ship)
4. **nexu-design-protocols** — Orquestração de protocolos

### Protocolo Ativo
```
Current: minimalist-ui (Premium Utilitarian Minimalism)
Fallback: ui-constraints → design-system
```

## Tokens de Design (Fonte da Verdade)

```css
/* styles/tokens.css */
:root {
  --bg: #FFFFFF;
  --surface: #F7F6F3;
  --surface2: #FBFBFA;
  --ink: #111111;
  --body: #2F3437;
  --muted: #787774;
  --blue: #1F6C9F;
  --blue-lt: #E1F3FE;
  --cta: #111111;
  --cta-dk: #333333;
  --green: #346538;
  --red: #9F2F2D;
  --amber: #956400;
  --border: #EAEAEA;
  --border2: #DFDFDF;

  --font-display: 'Lyon Text', 'Newsreader', 'Playfair Display', 'Instrument Serif', serif;
  --font-heading: 'SF Pro Display', 'Geist Sans', 'Helvetica Neue', 'Switzer', sans-serif;
  --font-body: 'SF Pro Display', 'Geist Sans', 'Helvetica Neue', 'Switzer', sans-serif;
}
```

## Componentes Principais

| Componente | Arquivo | Status |
|------------|---------|--------|
| ReviewCard | `src/components/ReviewCard.tsx` | ✅ Nexu compliant |
| StickyCTA | `src/components/StickyCTA.tsx` | ✅ Desktop + Mobile |
| DesktopStickyCTA | `src/components/DesktopStickyCTA.tsx` | ✅ Sidebar desktop |
| AdSlot | `src/components/AdSlot.tsx` | ✅ AdSense ready |
| Navbar | `src/components/Navbar.tsx` | ✅ |
| Footer | `src/components/Footer.tsx` | ✅ |

## Páginas Principais

| Rota | Template | Descrição |
|------|----------|-----------|
| `/` | `src/app/page.tsx` | Home com hero ML-otimizado + P1 showcase |
| `/reviews/[slug]` | `src/app/reviews/[slug]/page.tsx` | Review detail |
| `/comparativos/[slug]` | `src/app/comparativos/[slug]/page.tsx` | Viral comparison |
| `/reviews/categoria/[cat]` | Hub de categoria | |

## Memory System (Persistente)

### Configuração
- **AgentDB**: `.agentdb.db` (768-dim, preset large)
- **MCP Server**: `npx agentdb@latest mcp` para Claude Code
- **Config**: `.claude/memory-config.json`
- **Hooks**: `.claude/hooks.json` + scripts em `.claude/hooks/`

### Domínios de Aprendizado
```
nextjs-performance
seo-optimization
conversion-optimization
mercadolivre-affiliate
code-quality
design-system
content-generation
```

### Auto-Capture Triggers
- ✅ Task completion
- ✅ Error resolution  
- ✅ Performance improvement
- ✅ Security fix
- ✅ User feedback positive

### Comandos Úteis
```bash
# Iniciar MCP server (uma vez)
npx agentdb@latest mcp
claude mcp add agentdb npx agentdb@latest mcp

# Buscar lições
npx agentdb@latest query .agentdb.db "[embedding]" -k 10

# Treinar modelos
npx agentdb@latest train .agentdb.db

# Stats
npx agentdb@latest stats .agentdb.db

# Promover lições → skills
npx agentdb@latest promote .agentdb.db --minConfidence 0.85
```

## SEO & Content Strategy

### P1 Keyword Clusters (Live)
1. **Melhor Fone Bluetooth 2026** → `/comparativos/melhor-fone-bluetooth...`
2. **Melhor Smartwatch Custo-Benefício 2026** → `/comparativos/melhor-smartwatch...`
3. **Melhor Celular Custo-Benefício 2026** → `/comparativos/melhor-celular...`

### Reviews de Suporte (Anchors)
- Galaxy A55, Moto G84, Redmi Note 13 Pro, POCO X6 Pro

### Pipeline
- `npm run generate` → 8 artigos (4 reviews + 4 virais)
- `tmp/generate-p1-viral.ts` → 3 artigos P1
- `tmp/generate-cell-reviews.ts` → 4 reviews smartphone

## Affiliate Integration

### Mercado Livre
- Tracking ID: `carloshbhb`
- Params: `matt_tool`, `matt_word=vetorblog`, `ref`, `tracking_id`
- Lib: `src/lib/mercadolivre-affiliate.ts`
- Extractor: `src/lib/product-extractor.ts`

### AdSense (Ready)
- Component: `src/components/AdSlot.tsx`
- Formats: auto, horizontal, vertical, rectangle, fluid
- Client: `ca-pub-XXXXXXXXXXXXXXXX` (configure em produção)

## Performance Targets

| Métrica | Target | Atual |
|---------|--------|-------|
| LCP | < 2.5s | — |
| FID | < 100ms | — |
| CLS | < 0.1 | — |
| Build Time | < 60s | ~38s |
| Static Pages | 293+ | ✅ |

## Deployment

- **Platform**: Vercel (custom domain `www.vetor.blog`)
- **IndexNow**: Automático via `submitToIndexNow()`
- **Google Indexing API**: Automático via `submitToGoogle()`
- **Revalidate**: 5min (home), 1h (reviews)

## Regras de Ouro (Não Negociáveis)

1. **Zero Inter/Roboto/Open Sans** — Use font-display/heading/body do tokens.css
2. **Zero Lucide/Feather/Heroicons** — Use Phosphor Bold/Fill ou Radix Icons
3. **Zero sombras pesadas** — Max `box-shadow: 0 1px 8px rgba(0,0,0,0.06)`
4. **Zero cores primárias em áreas grandes** — Warm monochrome only
5. **Zero gradientes/glassmorphism/neon** — Exceto navbar blur sutil
6. **Zero `rounded-full` em cards/containers** — Max 8-12px
7. **Zero emojis** — Use SVG icons ou texto
8. **Zero placeholders genéricos** — Conteúdo real sempre
9. **Zero clichês AI** — "Eleve", "Seamless", "Next-Gen" → linguagem direta
10. **CTA preto sólido** — `#111111`, hover `#333333`, scale(0.98)

## Comandos de Desenvolvimento

```bash
# Dev
npm run dev

# Build + Lint
npm run build
npm run lint

# Generate content
npm run generate          # 8 artigos
npx tsx tmp/generate-p1-viral.ts   # 3 P1 virais
npx tsx tmp/generate-cell-reviews.ts # 4 reviews

# Memory
npx agentdb@latest mcp                    # MCP server
npx agentdb@latest query .agentdb.db "..." -k 10
npx agentdb@latest stats .agentdb.db
npx agentdb@latest train .agentdb.db

# Deploy
npx vercel --prod
```

## Referências Rápidas

- **Nexu Minimalist UI**: `.agents/skills/nexu-minimalist-ui/SKILL.md`
- **Premium Frontend UI**: `.config/opencode/skills/premium-frontend-ui/SKILL.md`
- **Anti-UI-Slop**: `.config/opencode/skills/anti-ui-slop/reference/audit.md`
- **AgentDB Memory**: `.agents/skills/agentdb-memory-patterns/SKILL.md`
- **Ruflo Adaptive Memory**: `.agents/skills/ruflo-adaptive-memory/SKILL.md`
- **SEO Ledger**: `SEO_LEDGER.md`
- **Keyword Clusters**: `docs/seo/keyword-clusters-and-briefs.md`