---
name: seo-loop
description: Ciclo autônomo contínuo de SEO para o vetor.blog — audita, prioriza o backlog do SEO_LEDGER.md, despacha os agentes tech-seo/content-seo/pipeline-growth/web-perf, valida build/lint e registra progresso até ranquear. Use quando o usuário pedir para rodar o SEO, continuar o SEO, aumentar acessos, ranquear no Google ou invocar o seo-lead.
---

# SEO Loop — vetor.blog

Ciclo contínuo de melhoria de ranqueamento. O orquestrador é o agente **`seo-lead`**; especialistas: `tech-seo`, `content-seo`, `pipeline-growth`, `web-perf`.

## Fluxo de um ciclo

0. **Métricas** (antes de selecionar): ler `metrics/SUMMARY.md` e cruzar com o ledger — regra abaixo em "Métricas → backlog".
1. **Ler** `SEO_LEDGER.md` na raiz do projeto.
2. **Selecionar** o próximo item `status: todo` de maior prioridade (P0 > P1 > P2).
3. **Executar** com o `seo-lead` (ou diretamente com task tool):
   - Despachar especialistas em paralelo **somente se não conflitarem de arquivos**.
   - Cada especialista edita, reporta arquivos alterados.
4. **Gate de qualidade** (obrigatório):
   ```
   npm run build
   npm run lint
   ```
   Qualquer erro novo deve ser corrigido antes de concluir.
5. **Atualizar** `SEO_LEDGER.md`:
   - mover item para `done` com data e resumo de arquivos
   - adicionar follow-ups descobertos como novos itens
   - itens que saem de `done` ganham `outcome: improved|neutral|worse` na leitura 7 dias depois (sinal de `agentdb train` — gravar lição com `confidence 0.8` quando `improved`)
6. **Repetir** enquanto houver itens P0/P1 ou o usuário pedir novo ciclo.

## Métricas → backlog

Roa **antes** de escolher o item, usando `metrics/SUMMARY.md` (GA4 orgânico, T-1):

| Sinal | Ação |
|-------|------|
| `anomaly: true` | Não criar item a partir do salto/queda extrema do dia — investigar primeiro |
| Página em `topPages` com queda ≥20% (7d) | Novo item `P1` "investigar queda: <path>" (ou marcar `regressão` se `done` recente) |
| Página com subida ≥30% (7d) | Novo item `P3` "reforçar internal links/schema: <path>" |
| Item `P4` (keywords novas) | Só entra se tendência 28d estável/positiva; se tráfego cair, defender o que já ranqueia (P0/P1) |

Métrica-alvo única: **sessões orgânicas** (`topPages` só como suporte). Sem `metrics/SUMMARY.md` (ou >2 dias) → seguir o ledger normal e avisar "métricas desatualizadas".

## Prioridades (default)

| Pri | Tema | Exemplos |
|-----|------|----------|
| P0 | Indexabilidade quebrada | corpo do artigo não renderizado, admin indexável, filtro de categoria morto |
| P1 | Schema/validação | FAQ/Breadcrumb JSON-LD, Product schema com dados falsos |
| P2 | Arquitetura | hubs de categoria, paginação, RSS, internal links |
| P3 | Escala | pipeline product_links, upsert, IndexNow nos crons |
| P4 | Crescimento | keyword clusters, E-A-T, páginas de autoridade |

## Restrições
- Não commitar/push sem pedido explícito
- Não quebrar URLs
- Canonical: `https://www.vetor.blog`
- Conteúdo em pt-BR
- Medir sucesso: **sessões orgânicas** (`metrics/SUMMARY.md`); impressões/cliques GSC quando disponível (registrar no ledger quando houver dados)

## Inicialização (primeira vez)
Se `SEO_LEDGER.md` não existir, criá-lo com as fases P0–P4 da auditoria (corpo sections não renderizado, schemas não emitidos, categoria morta, rodapé `#`, www/apex, font preloads, admin sem noindex, Product schema arriscado, IndexNow só no GH Actions, insert não upsert).
