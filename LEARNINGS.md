# Lições aprendidas (LEARNINGS.md)

Espelho legível do AgentDB (fonte canônica: .agentdb.db).
Gerado por .claude/lib/memory.mjs - não editar linhas geradas à mão.

### 2026-09-30 · code-quality · #2
Componentes server do App Router nao podem receber handlers de evento (onMouse*, onSubmit): o build falha no prerender com erro de serializacao RSC. Solucao: trocar handlers por atributos data-* com JSON serializavel (data-hover, data-hover-base, data-hover-down, data-hover-up) e um unico componente client com delegacao de pointer events em document (HoverFX montado no layout). TypeScript nao valida atributos hifenizados, entao data-* passa sem erros de tipo.
  Evidência: npm run build falhava em / com 14 sites de handlers em ReviewCard/page/comparativos/reviews; migrados para data-hover*, build voltou a gerar 293 paginas com lint 0 erros.
  Confiança: 0.75 · sucesso

### 2026-10-01 · seo-optimization · #3
GA4 Data API nao tem channel group 'Organic' puro: sessionDefaultChannelGroup usa 'Organic Search'/'Organic Social'/'Organic Shopping'/'Organic Video'. Filtro EXACT 'Organic' casa com zero linhas. Solucao: inListFilter com a familia organica.
  Evidência: probe na property 458038617 retornou so Direct+Referral em 28d; fetch com EXACT retornava 0 sessoes
  Confiança: 0.80 · sucesso

### 2026-10-01 · code-quality · #4
node -e com dynamic import de path relativo falha no contexto [eval] (Invalid module ... is not a valid package name), mesmo com --input-type=module. Solucao: script .mjs em arquivo + pathToFileURL, ou wrapper CLI.
  Evidência: AGENTS.md corrigido para memory-cli.mjs apos 3 tentativas inline falharem
  Confiança: 0.70 · sucesso
