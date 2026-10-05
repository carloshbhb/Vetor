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

### 2026-10-04 · mercadolivre-affiliate · #10
Para centralizar links de afiliados do Mercado Livre, armazenar a URL oficial copiada da Central sem reconstruir parâmetros; mapear por produto e slug editorial e fazer /go priorizar o destino registrado, preservando links legados durante a migração gradual.
  Evidência: Implementado affiliate_url e affiliate_tag no cadastro central product_links, com /go resolvendo por slug, review_slug e URL do produto; orientações oficiais do programa dizem gerar links pelas ferramentas da Central.
  Confiança: 0.70 · sucesso

### 2026-10-04 · mercadolivre-affiliate · #11
A API autenticada do Mercado Livre pode enriquecer o cadastro com dados de catálogo (título, categoria, permalink, imagem e preço), mas deve permanecer separada da URL afiliada criada pela Central; guardar o destino afiliado copiado sem reconstruir seus parâmetros.
  Evidência: O painel central usa getProductWithPictures/getCategory para autopreencher produto; o campo affiliate_url continua manual e conserva a URL produzida pela Central.
  Confiança: 0.70 · sucesso

### 2026-10-04 · mercadolivre-affiliate · #10
Quando o remoto já substituiu um módulo local por uma central mais completa, portar os recursos exclusivos para a central atual; não reintroduzir a tela antiga como uma segunda fonte de verdade. Manter separados o permalink de catálogo e o destino oficial afiliado.
  Evidência: No GitHub, /admin/product-links redireciona para /admin/afiliados e affiliate_links já centraliza os destinos; integração adicionou consulta de catálogo e metadados sem recuperar a UI legada.
  Confiança: 0.70 · sucesso

### 2026-10-04 · code-quality · #10
Falha no login admin local com resposta 401 indica que o password POST difere de ADMIN_PASSWORD carregado de .env.local; diferenciar senha local de produção antes de alterar credenciais.
  Evidência: POST /api/admin/auth retornou 401; configuração local ADMIN_PASSWORD presente e sem whitespace externo; fluxo envia JSON password sem transformação
  Confiança: 0.70 · sucesso

### 2026-10-04 · code-quality · #11
A Central de Afiliados pede limit=500 no cliente, mas listAffiliateLinks fixa o teto em 200 e a tela não envia offset; estatísticas cobrem todo o conjunto enquanto a tabela omite os registros após 200.
  Evidência: GET /api/admin/affiliates?limit=500 respondeu 200; UI mostrou 243 no total e 200 exibidos; listAffiliateLinks limita a 200 e não há paginação
  Confiança: 0.80 · sucesso

### 2026-10-04 · code-quality · #12
A página de oportunidades dispara POST para sincronizar SEO history ao montar; se o endpoint falha com 500, mostrar erro mesmo com o dashboard GET carregado. Separar falha de sincronização do carregamento do dashboard e expor detalhe operacional sem bloquear as oportunidades.
  Evidência: GET /api/admin/opportunities respondeu 200; a página exibiu dashboard carregado mas histórico SEO falhou; terminal registrou POST /api/admin/seo-actions 500 duas vezes
  Confiança: 0.70 · sucesso

### 2026-10-05 · code-quality · #13
Before debugging a Supabase PostgREST table-not-found 500, compare the configured project ref with the remote migration and table inventory; local SQL files do not prove that the schema is deployed.
  Evidência: The configured project lacked public.seo_action_history despite local migrations; applying ordered additive migrations changed the admin SEO action request from 500 to 200.
  Confiança: 0.70 · sucesso

### 2026-10-05 · mercadolivre-affiliate · #14
Admin registries should return an exact filtered total with explicit limit and offset; batch health checks by requested IDs within the endpoint cap so the UI does not imply a full scan while checking only the first page.
  Evidência: The affiliate center had 243 rows while its UI requested 500 and backend clamped results to 200; pagination and explicit batches of at most 50 resolved the mismatch.
  Confiança: 0.70 · sucesso

### 2026-10-05 · code-quality · #15
Admin screens should read and mutate the same persisted backend collection through authenticated server APIs; synthetic queue rows and browser-side database writes bypassing custom admin auth create misleading controls.
  Evidência: The old video admin synthesized jobs while video_queue contained 591 rows; the consolidated screen now reads the real queue through authenticated routes.
  Confiança: 0.70 · sucesso
