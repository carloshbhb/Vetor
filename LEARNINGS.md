# Lições aprendidas (LEARNINGS.md)

Espelho legível do AgentDB (fonte canônica: .agentdb.db).
Gerado por .claude/lib/memory.mjs - não editar linhas geradas à mão.

### 2026-09-30 · code-quality · #2
Componentes server do App Router nao podem receber handlers de evento (onMouse*, onSubmit): o build falha no prerender com erro de serializacao RSC. Solucao: trocar handlers por atributos data-* com JSON serializavel (data-hover, data-hover-base, data-hover-down, data-hover-up) e um unico componente client com delegacao de pointer events em document (HoverFX montado no layout). TypeScript nao valida atributos hifenizados, entao data-* passa sem erros de tipo.
  Evidência: npm run build falhava em / com 14 sites de handlers em ReviewCard/page/comparativos/reviews; migrados para data-hover*, build voltou a gerar 293 paginas com lint 0 erros.
  Confiança: 0.75 · sucesso
