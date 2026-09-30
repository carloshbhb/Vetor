<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Ciclo de aprendizado

Objetivo único: **crescer tráfego orgânico do vetor.blog**. Ciclo: medir → agir → aprender → promover.

### Início de sessão (obrigatório)

1. **Métricas**: ler `metrics/SUMMARY.md` (tendência 7/28d, top páginas, anomaly).
   - `anomaly: true` → investigar, **não** extrair lição do salto.
   - Arquivo com >2 dias → avisar "métricas desatualizadas" e seguir sem ele.
   - Sem arquivo → o workflow `metrics-daily.yml` ainda não rodou com credenciais.
2. **Lições do domínio da tarefa** (busca semântica no `.agentdb.db`):
   ```
   node -e "import('.claude/lib/memory.mjs').then(async m=>{console.log(JSON.stringify(await m.queryLessons({task:'<tópico>',k:5}),null,2));await m.closeMemory()})"
   ```
3. Se `LEARNINGS.md` marcar `candidate: promote` (3ª ocorrência da mesma lição) → rodar `/learn` nesta sessão.

### Fim de sessão (fallback universal)

Gravar 1 lição por erro ou decisão que valha reaproveitar:
```
node -e "import('.claude/lib/memory.mjs').then(async m=>{await m.storeLesson({lesson:'<texto>',domain:'<domínio>',confidence:0.7,evidence:'<prova>'});await m.closeMemory()})"
```
O espelho `LEARNINGS.md` é gravado junto automaticamente. Domínios válidos: `nextjs-performance`, `seo-optimization`, `conversion-optimization`, `mercadolivre-affiliate`, `code-quality`, `design-system`, `content-generation`.

**Regra de processo:** `closeMemory()` é one-way — nunca reabrir a memória no mesmo processo (trava a alocação do ruvector). Feche uma única vez, no final.

### Semanal (`/learn`)

Consolida lições, roda `agentdb train` e **promove** lições com ≥3 ocorrências e confiança média ≥0.85 para a seção `## Regras promovidas (auto)` deste arquivo.

### Métricas → backlog

Antes de escolher o próximo item do `SEO_LEDGER.md`, cruzar com `metrics/SUMMARY.md` (detalhes no skill `seo-loop`):
- página com **queda ≥20% em 7d** → item `P1` "investigar queda: <path>";
- página com **subida ≥30% em 7d** → item `P3` "reforçar internal links/schema: <path>";
- `P4` (keywords novas) só com tendência 28d estável/positiva; se cair, defender o que já ranqueia (P0/P1);
- todo item `done` ganha `outcome: improved|neutral|worse` 7 dias depois → sinal de `agentdb train`.
