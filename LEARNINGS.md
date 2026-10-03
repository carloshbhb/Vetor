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

### 2026-10-01 · code-quality · #5
PowerShell interpreta colchetes como wildcard em Test-Path/Remove-Item: paths com [slug] retornam False falso ou apagam nada. Solucao: sempre usar -LiteralPath em paths com colchetes (rotas Next [slug]/[tag]).
  Evidência: Remove-Item do generateStaticParams orfao falhou silenciosamente; Test-Path mentiu False; re-delete com -LiteralPath funcionou
  Confiança: 0.80 · sucesso

### 2026-10-01 · code-quality · #6
Filtros de vitrine sobre dados do CMS (ex.: isGuiaLike) devem casar padroes reais e restritos: regex ampla (/^\\d+-/) puxou reviews-spam (titulo raspado, preco R, placeholder) para home e /guias. Vitrines usam dados curados; listar tudo e filtrar pouco expoe sujeira do banco.
  Evidência: home exibiu '20 MAIS VENDIDOR$ 669R$...' nos cards; fix restringiu para guia|melhores-|top-
  Confiança: 0.70 · sucesso

### 2026-10-02 · nextjs-performance · #7
Tailwind v4 preflight zera margens de <p>: qualquer seletor de artigo (.article p) precisa declarar margin/line-height explicitamente, senao o corpo renderiza como parede de texto
  Evidência: reviews do vetor.blog sem espacamento entre paragrafos (Apple Watch Series 9); fix globals.css .article p
  Confiança: 0.80 · sucesso

### 2026-10-02 · code-quality · #8
Wrapper <div> ao redor de componente que pode retornar null (AdPlacement/AdSlot sem env) vaza container vazio no HTML de producao; componente deve renderizar o proprio wrapper condicionalmente
  Evidência: div.container vazio encontrado na home e em /reviews/[slug] e /comparativos/[slug]; fix via wrapperClassName no AdPlacement
  Confiança: 0.80 · sucesso

### 2026-10-02 · seo-optimization · #9
Em paginas SSG do App Router, /reviews/categoria/X sem reviews retorna 404 por design (P0-10); validar categorias vazias antes de linkar
  Evidência: /reviews/categoria/Eletronicos 404 apos spam removido
  Confiança: 0.70 · sucesso
