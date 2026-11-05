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

### 2026-10-11 · code-quality · #16
Em um repositório Vetor que já contém um projeto Remotion em video/, não rodar o scaffold create-video por cima; instalar as skills oficiais com npx skills add remotion-dev/skills --yes na raiz para disponibilizá-las no projeto todo. Se npx remotion skills add falhar antes de executar por incompatibilidade de config, conferir APIs @remotion/cli instaladas: setParallelism foi substituído por setConcurrency.
  Evidência: Instalação das 12 skills oficiais confirmou no .agents/skills e skills-lock.json; npx remotion skills add inicialmente falhou com Config.setParallelism is not a function; config instalada fornece setConcurrency.
  Confiança: 0.70 · sucesso

### 2026-10-11 · code-quality · #17
Ao adaptar template Remotion para pipeline externo, manter caminhos de assets como URLs relativas à pasta public do projeto Remotion e copiar arquivos para essa pasta antes do render; caminhos absolutos do filesystem não são acessíveis ao Chromium da composição. Derivar duração da composição do mesmo timeline de frames usado pelas cenas para evitar trechos silenciosos excedentes.
  Evidência: process-video.ts copiava assets para public/assets na raiz do Next, mas o renderer usa video/public; mudança alinha cópia e props sob video/public/assets e duração passa a ser hook + cenas + CTA.
  Confiança: 0.70 · sucesso
- - -   R E F   L A Y O U T   R E G I S T R A D A   ( 2 0 2 6 - 1 0 - 1 3 )   - - -  
 L a y o u t   l a n d i n g   p a g e   S a m s u n g   G a l a x y   A 1 7 :   S F   S y m b o l s   b a n n e r ,   l i q u i d - g l a s s   C S S / G S A P ,   c o m p a r e _ t a b l e   R e v i e w C o m p a r e T a b l e   ( c o l u m n s = [ ' P r o d u t o ' , ' N o t a ' , ' I d e a l   p a r a ' ] ,   w i n n e r C o l ) .   I n s e r i d o   n o   s u p e r   p r o m p t   t m p / g e n e r a t e - 2 - l a n d i n g - p a g e s . t s   +   c o m e n t � r i o   n o   c o n t e n t .   P i p e l i n e   ( 2   L P s / d i a ,   0 3 : 0 0 )   i n t a c t o .  
 
### 2026-11-04 · content-generation · #18
Edge TTS pt-BR com EDGE_TTS_RATE=+5% e alinhamento por WordBoundary mantem legendas exatas em Shorts de cerca de 74s; remover URLs do CTA falado evita explosao de boundaries e reduz a duracao sem perder sincronia.
  Evidência: GitHub Actions 41827029997: rate=+5%, 74.11s, 174 WordBoundary, legendas exatas, QA pass, upload biGUps5le2I; ASUS antigo 132.096s deletado.
  Confiança: 0.90 · sucesso

### 2026-11-04 · code-quality · #19
Na tabela video_queue, voiceover_url e NOT NULL; ao resetar um item concluido para reprocessar, nao envie voiceover_url null. Limpe apenas campos nullable: status, youtube_video_id, youtube_url, completed_at, started_at e error_message.
  Evidência: API update retornou erro 23502 not-null violation ao tentar voiceover_url null; reset minimo funcionou e reprocessou o ASUS.
  Confiança: 0.90 · sucesso

### 2026-11-04 · content-generation · #20
Para substituir um video do YouTube sem duplicata publica: subir a nova versao pela fila, confirmar que esta publica, atualizar a referencia no banco e so entao apagar o video antigo via DELETE /youtube/v3/videos; antes, verificar se paginas publicas ainda referenciam o ID antigo.
  Evidência: ASUS 747Glfla104 substituido por biGUps5le2I; DELETE retornou 204; /comparativos/asus-vivobook-15-vs-dell-inspiron nao referenciava os IDs.
  Confiança: 0.85 · sucesso

### 2026-11-05 · mercadolivre-affiliate · #28
Candidato com match_status=error nao pode entrar em checkedIds do lote: o run re-selecionava os mesmos candidatos em loop e a fila travava. Tratar erro como ja verificado com cooldown de 6h.
  Evidência: run 41921926159 restantes travou em 425; run 41928856153 processou 240 candidatos; commit 25b135c
  Confiança: 0.70 · sucesso

### 2026-11-05 · mercadolivre-affiliate · #35
A Lista Social do Mercado Livre expoe o mesmo produto em varios item ids. A promocao precisa reivindicar o nome canonico E o item do Mercado Livre, senao a fila de reviews enche de duplicatas do mesmo anuncio.
  Evidência: run 41928856153 promoveu 77 linhas com duplicatas (Echo Dot, Intelbras iM5, JBL Tune 520BT); correcao no commit 2571ed9 com teste de regressao
  Confiança: 0.70 · sucesso

### 2026-11-05 · mercadolivre-affiliate · #36
Guard de acessorio por palavra rejeita o proprio anuncio: um celular com a especificacao Tela de 6.7 foi tratado como tela de reposicao. Use regra estrutural - anuncio de peca comeca por Tela ou Display, anuncio de dispositivo comeca por Celular, Tablet ou Notebook - e nunca trate source igual a matched como acessorio.
  Evidência: logs do run 41928856153 marcaram o Galaxy A17 como skippedAccessory; teste red-green em scripts/mercadolivre-refill.test.ts
  Confiança: 0.70 · sucesso

### 2026-11-05 · content-generation · #37
Rotulo de origem do link de afiliado (Lista Social) nunca pode virar categoria editorial de review: cria hub fino sem intencao de busca. Inferir a categoria pelo nome do produto e nunca aceitar rotulo de origem no fallback.
  Evidência: draft console-sony-playstation-5-edicao-slim-disk-1tb-branco foi gravado com category Lista social e normalizado para Acessorios para Games no run 41942751756
  Confiança: 0.70 · sucesso

### 2026-11-05 · seo-optimization · #38
Zero sessoes organicas com GA4 coletando normalmente e gargalo de indexacao e ranking, nao de instrumentacao. Antes de mexer no tracking, compare o total da propriedade com o recorte por canal na mesma propriedade.
  Evidência: ga4-channel-diagnostic run 41939494072: 10 sessoes em 28d e 160 em 90d, canais AI Assistant (9) e Direct (1), zero organico
  Confiança: 0.70 · sucesso

### 2026-11-05 · code-quality · #39
supabase-js exige Node 22 ou superior (WebSocket nativo) em scripts com service role, e o schema de producao diverge do supabase/schema.sql: reviews nao tem title nem notes (produto em product, corpo em sections JSONB) e landing_page_slug pertence a product_links, nao a affiliate_links.
  Evidência: runs 41939497568, 41939625902 e 41939902965 falharam ate a versao do Node e as colunas serem corrigidas
  Confiança: 0.70 · sucesso

### 2026-11-05 · code-quality · #40
No PowerShell 5.1 o redirecionamento de saida grava em UTF-16 e o git apply falha com No valid patches in input. Use git diff --output=arquivo para escrever patch em UTF-8. Ao passar textos com aspas para um CLI via PowerShell, prefira um script Node em vez de interpolacao de string.
  Evidência: patch de src/lib/mercadolivre-refill.ts foi perdido no ciclo red-green e reaplicado manualmente; licoes #21-#34 ficaram truncadas e foram removidas
  Confiança: 0.70 · sucesso
