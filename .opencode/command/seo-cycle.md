---
description: Roda um ciclo completo do time de SEO (seo-lead) — audita, implementa, valida build/lint e atualiza o SEO_LEDGER.md.
agent: seo-lead
---

Execute um ciclo SEO completo para este repositório seguindo a skill `seo-loop`:

1. Leia `SEO_LEDGER.md` (crie com o backlog P0–P4 se não existir).
2. Execute o próximo item de maior prioridade usando os agentes especialistas (`tech-seo`, `content-seo`, `pipeline-growth`, `web-perf`) via task tool, em paralelo quando não conflitarem de arquivos.
3. Rode `npm run build` e `npm run lint`; corrija erros.
4. Atualize `SEO_LEDGER.md` com o que foi feito e follow-ups.
5. Reporte: item concluído, arquivos alterados, próximo item do backlog.

Escopo do usuário: $ARGUMENTS
