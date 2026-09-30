# Design: Ciclo de Aprendizado Autônomo do Agente (Hermes/opencode)

**Data:** 2026-09-30
**Status:** Aguardando revisão
**Classificação:** Arquitetural (subsystem novo)

## 1. Objetivo

Fazer com que o agente (Hermes / opencode) **aprenda continuamente e se aperfeiçoe** para atingir os objetivos do projeto, em vez de recomeçar do zero a cada sessão.

**Objetivo geral definido pelo usuário:** crescimento de **tráfego orgânico / posições no Google** do vetor.blog.

**Escopo completo (decisão "D"):** o agente deve melhorar em quatro frentes ao mesmo tempo:

1. **Memória operacional** — gravar lições e recuperá-las no início das sessões.
2. **Regras e skills** — promover lições recorrentes em mudanças duradouras (`AGENTS.md`, skills, prompts).
3. **Estratégia** — reordenar/criar itens do backlog (`SEO_LEDGER.md`) com base no que está performando.
4. **Medição contínua** — ciclo objetivo → ação → medição → ajuste.

## 2. Contexto atual (estado do repo)

| Peça | Estado |
|---|---|
| `.claude/hooks.json` + 3 scripts (`capture-lesson`, `track-pattern`, `consolidate-memory`) | **Quebrados** — importam `../lib/memory.ts`, que não existe (e `.js` não importa `.ts` sem build) |
| `.agentdb.db` (384 KB, 768-dim) | **Vazio** — 0 episódios, porque os hooks nunca funcionaram |
| `.claude/memory-config.json` | Config válido: 7 domínios, auto-capture, learning plugins |
| `agentdb.db` (4 KB) / `ruvector.db` (1.5 MB) | Secundários; `ruvector.db` não é SQLite legível pelo AgentDB (`SQLITE_NOTADB`) — **intocado** |
| `.opencode/skills/seo-loop/SKILL.md` + agentes `seo-lead`/`tech-seo`/`content-seo`/`pipeline-growth`/`web-perf` | Existentes; ciclo manual, sem insumo de métricas |
| Service account Google (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` em `.env.local`) | Existe; usada hoje só no **Indexing API** (escrita) |
| `~/.config/claude-seo/` | **Não existe** — GSC/GA4 não configurados |
| Comando `/learn` | Existe na **config global** `~/.config/opencode/opencode.jsonc` (`template: commands/learn.md`), junto de `/evolve`, `/promote`, `/instinct-*` |
| `.github/workflows/` | Já existe com 5 workflows (content/videos) — `metrics-daily.yml` entra ao lado |
| `SEO_LEDGER.md` | Tabela "Métricas" vazia aguardando baseline (GSC) — o `SUMMARY.md` do GA4 alimenta essa seção |
| `AGENTS.md` | Só contém o header de aviso do Next.js — o bloco do ciclo de aprendizado entra nele |

## 3. Decisões (registradas)

| Tema | Decisão | Opção descartada |
|---|---|---|
| Objetivo geral | GA/tráfego orgânico (leitura: métricas orgânicas) | — |
| Mecanismo de melhoria | Memória + regras/skills + estratégia (pilha completa) | Só memória (evita repetir erro, mas não aperfeiçoa) |
| Cadência | Captura ao fim de sessão **+** cron diário | Só sob demanda |
| Fonte de métricas | **GA4** (service account existente) | GSC (fase posterior) |
| Executor do ciclo | **GitHub Actions mede/persiste; agente local aprende** | Tudo local / tudo nuvem |
| Persistência de métricas | **Arquivo no repo** (`metrics/ga4-daily.json` + `SUMMARY.md`) | Supabase / BigQuery (YAGNI) |
| Abordagem geral | **1 — medição separada do aprendimento**, com `LEARNINGS.md` legível ao lado do `.db` | 2 (só markdown), 3 (tudo na nuvem) |

## 4. Arquitetura

```
┌─── NUVEM (GitHub Actions) ───────────────────────────┐
│ metrics-daily.yml  [cron diário 06:00 BRT]           │
│   └─ scripts/metrics/fetch-ga4.mjs                   │
│        service account (secret) → GA4 Data API       │
│        → metrics/ga4-daily.json                      │
│        → metrics/SUMMARY.md                          │
│        → commit automático                           │
└──────────────────────────────────────────────────────┘
                        │ repositório
                        ▼
┌─── LOCAL (opencode / Hermes) ────────────────────────┐
│ INÍCIO DE SESSÃO (AGENTS.md)                         │
│   1. ler metrics/SUMMARY.md (tendência 7/28 dias)    │
│   2. agentdb query .agentdb.db "<tópico>" -k 5       │
│   3. se houver "candidate: promote" → rodar /learn    │
│                                                         │
│ DURANTE (seo-lead / tech-seo / ...)                   │
│   4. seo-loop usa métricas p/ reordenar SEO_LEDGER   │
│                                                         │
│ FIM DE SESSÃO (hook sessionEnd, consertado)           │
│   5. consolidate-memory.js → lição no AgentDB         │
│   6. append em LEARNINGS.md                          │
│                                                         │
│ SEMANAL (/learn)                                      │
│   7. agentdb train + promote (≥0.85)                 │
│      → AGENTS.md / skills                            │
└──────────────────────────────────────────────────────┘
```

### Componentes

| # | Componente | Arquivo | Ação |
|---|---|---|---|
| 1 | Workflow de métricas | `.github/workflows/metrics-daily.yml` | novo |
| 2 | Coletor GA4 | `scripts/metrics/fetch-ga4.mjs` | novo |
| 3 | Saídas | `metrics/ga4-daily.json`, `metrics/SUMMARY.md` | novo |
| 4 | Lib de memória | `.claude/lib/memory.mjs` | novo |
| 5 | Hooks | `.claude/hooks/*.js` → `.mjs` + `hooks.json` **+ handler `session.deleted` no plugin ECC** | consertar/estender |
| 6 | Ciclo no prompt | `AGENTS.md` (bloco "Ciclo de Aprendizado") | editar |
| 7 | Lições legíveis | `LEARNINGS.md` | novo |
| 8 | Loop com métricas | `.opencode/skills/seo-loop/SKILL.md` | editar |
| 9 | Comando semanal | `/learn` (`opencode.jsonc` + `commands/learn.md`) | ajustar |

## 5. Coletor GA4

`scripts/metrics/fetch-ga4.mjs` — Node puro (`fetch` + JWT assinado via `node:crypto`), sem SDK novo.

1. **Auth:** JWT (escopo `analytics.readonly`) → `https://oauth2.googleapis.com/token`.
2. **Consulta** `properties/{GA4_PROPERTY_ID}/runReport` em 3 blocos (hoje, T-7, T-28):
   - sessões orgânicas (`sessionDefaultChannelGroup == "Organic"`): total + série diária;
   - páginas orgânicas (`pagePath` + `sessions`): top 20;
   - novos usuários orgânicos.
3. **`metrics/ga4-daily.json`** (schema versionado):
   ```json
   {
     "schemaVersion": 1,
     "date": "2026-09-30",
     "property": "properties/XXXXXXX",
     "organic": {
       "sessions": 1234, "delta7d": 0.12, "delta28d": 0.31,
       "daily": [{"date": "2026-09-30", "sessions": 41}]
     },
     "topPages": [{"path": "/reviews/x", "sessions": 88, "delta7d": 0.4}],
     "anomaly": false
   }
   ```
4. **`metrics/SUMMARY.md`** — ~15 linhas: tendência, top 10 páginas, maiores quedas/subidas da semana, e uma linha "perguntas em aberto".
5. **Gates:**
   - falha da API ou 0 sessões com property ativa → workflow **falha** (não grava lixo);
   - delta > 50% em 1 dia → `"anomaly": true` (o agente investiga, não extrai lição).
6. **Histórico:** o workflow apenas **appenda** o dia no `daily[]` (retenção 90 dias); nunca regenera.

**Limites aceitos:** atraso GA4 de 24–48h (hoje = T-1); sem posição média por query nesta fase (vira item `P4`); cron 06:00 BRT com alerta de falha do Actions.

## 6. Captura de lições

### `.claude/lib/memory.mjs` (novo)

- `storeLesson({lesson, domain, tags, confidence, evidence, success})`
- `storePattern(...)`
- Implementação: chama o CLI do AgentDB (`npx agentdb@latest ...`), JS puro, sem build.
- **Regra:** sempre que grava no `.db`, também appenda 1 linha em `LEARNINGS.md`
  (`data | domínio | lição | confiança`) — o `.md` é a fonte mínima legível.

### Hooks (conserto) — e onde eles realmente disparam

> **Descoberta da revisão:** o config do opencode **não tem chave `hooks`** (schema oficial não a suporta) e **não lê `.claude/hooks.json`**. Quem expõe eventos de hook no opencode é o **plugin ECC** (`~/.config/opencode/plugins/ecc-hooks.ts`), que já implementa `file.edited`, `tool.execute.before/after` e `session.deleted` (equivalente ao SessionEnd do Claude Code).
>
> Portanto a captura automática precisa de **dois ganchos distintos**:
> - **opencode:** novo handler no plugin ECC (hook `session.deleted`) chamando `memory.mjs`;
> - **Claude Code / Hermes:** `.claude/hooks.json` consertado (formato nativo deles);
> - **Fallback universal:** checklist de fim de sessão no `AGENTS.md` + comando `/learn` (funciona em qualquer harness, inclusive sem hook algum).

- `capture-lesson.js`, `track-pattern.js`, `consolidate-memory.js` → migrados para `.mjs`; `hooks.json` atualizado para chamá-los.
- `consolidate-memory.js` (sessionEnd) faz: (1) resume a sessão em 1 lição estruturada → AgentDB + `LEARNINGS.md`; (2) classifica domínio via `inferDomain` existente; (3) detecta repetição — 3ª ocorrência da mesma lição → marca `candidate: promote` no `.md`.
- No plugin ECC, o handler `session.deleted` chama o mesmo script (path do projeto via cwd), com `ECC_DISABLED_HOOKS` já existente como kill-switch.

### Início de sessão (`AGENTS.md`)

Bloco "Ciclo de Aprendizado", válido para opencode **e** Hermes (ambos leem `AGENTS.md`):

1. Ler `metrics/SUMMARY.md`;
2. `agentdb query .agentdb.db "<tópico>" -k 5`;
3. se houver `candidate: promote` → rodar `/learn`.

### Domínios (já em `memory-config.json`)

`nextjs-performance`, `seo-optimization`, `conversion-optimization`, `mercadolivre-affiliate`, `code-quality`, `design-system`, `content-generation`.

### Compatibilidade entre harnesses

Quem não disparar o hook (ex.: Hermes) não quebra: a captura manual (`/learn`) e o checklist de fim de sessão no `AGENTS.md` usam o mesmo caminho de gravação.

## 7. Estratégia (métricas → backlog)

Regra nova no `seo-loop`, **antes** de selecionar o próximo item do `SEO_LEDGER.md`:

1. Cruzar `metrics/SUMMARY.md` com o ledger:
   - página em `topPages` com **queda ≥ 20% (7d)** → novo item `P1` "investigar queda: <path>" (ou marcar `regressão` se `done` recente);
   - página com **subida ≥ 30%** → novo item `P3` "reforçar internal links/schema: <path>";
   - item `P4` (keywords novas) só entra se a tendência 28d estável/positiva; se o tráfego cair, prioridade passa a ser **defender o que já ranqueia** (P0/P1).
2. **Reward:** todo item que sai de `done` ganha `outcome: improved|neutral|worse` na leitura seguinte (7 dias depois). É o sinal usado por `agentdb train`.
3. **Loop fechado:** `done` + `outcome: improved` → lição com `confidence 0.8` → acumula → `promote` em `≥ 0.85` → regra fixa no `AGENTS.md`.

### Fronteiras (não faz)

- Não altera conteúdo/palavras-chave automaticamente — só **reordena e cria itens**.
- Não promove regra sem **3 ocorrências** + `confidence ≥ 0.85`.
- Métrica-alvo única: **sessões orgânicas** (`topPages` só como suporte).

## 8. Erros e degradação

| Falha | Comportamento |
|---|---|
| GA4 API falha / 0 sessões | Workflow falha; repo mantém último JSON bom; agente avisa "métricas desatualizadas (>2d)" |
| delta > 50%/dia | `anomaly: true` → `seo-loop` não cria item a partir dele |
| service account sem permissão (403) | erro explícito no log, workflow falha |
| AgentDB indisponível nos hooks | degrada para `LEARNINGS.md` + `warn`, sem quebrar a sessão |
| `.db` e `.md` divergem | `LEARNINGS.md` é canônico-legível; `/learn` reconcilia (`.md` → `.db`) |
| cron falha 2x | alerta de email do GitHub Actions |
| harness sem hooks | captura via checklist do `AGENTS.md` / `/learn` |

## 9. Testes

1. **Unitário** (`node --test`): `fetch-ga4.mjs` com resposta GA4 mockada (sintaxe, deltas, anomaly, ramos de erro).
2. **Integração local:** `storeLesson` → grava no `.db` **e** appenda no `LEARNINGS.md`; `agentdb query` devolve a lição.
3. **Workflow:** dispatch manual (`workflow_dispatch`) 1x para validar credenciais e formato.
4. **Gate do repo:** `npm run build && npm run lint` antes de fechar qualquer ciclo.
5. **Smoke do ciclo completo:** 1 `seo-loop` real verificando (a) leu o `SUMMARY.md`, (b) criou/reordenou item no ledger, (c) gravou 1 lição.

## 10. Fora de escopo (viram itens `P4` no `SEO_LEDGER.md`)

- GSC (posição média por query) e URL Inspection em lote;
- GA4 Web Vitals;
- uso do `ruvector.db`;
- federated memory / `hermes memory sync`;
- algoritmos avançados de RL (`decision-transformer`, `q-learning`, `actor-critic` — permanecem configurados, treinamos só o `train` básico do AgentDB).

## 11. Riscos

- **Captura depende de harness** — opencode não roda `.claude/hooks.json`; Claude Code/Hermes não rodam o plugin ECC. Mitigação: dois ganchos + fallback universal (`/learn` + checklist no `AGENTS.md`), e `LEARNINGS.md` como fonte mínima sempre gravável.
- **Overfitting de lição com poucos dados** → mitigado pelo gate de 3 ocorrências + `confidence ≥ 0.85`.
- **Ruído de métrica** (sazonalidade, dias 0 tráfego) → mitigado por janelas 7/28d e flag `anomaly`.
- **Secrets na Actions** → só `GA4_PROPERTY_ID` + JSON da service account como secrets; `GITHUB_TOKEN` para commit.
- **Custo de manutenção de 2 camadas** (nuvem + local) → aceito; cada metade é testável isoladamente.
