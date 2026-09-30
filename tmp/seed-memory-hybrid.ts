import { HybridReasoningBank, SharedMemoryPool } from 'agentic-flow/reasoningbank';

async function init() {
  // Initialize the shared memory pool with our database
  const pool = SharedMemoryPool.getInstance();
  await pool.ensureInitialized({
    dbPath: '.agentdb.db',
    dimension: 768,
    embedder: 'Xenova/bge-base-en-v1.5'
  });
  
  const rb = new HybridReasoningBank({ preferWasm: true });
  
  const lessons = [
    {
      task: 'Hero homepage otimizado para message match ML: trocar "Pare de comprar no escuro" por "Encontre o Menor Preco no ML" + CTA "Ver Menor Preco no ML" aumenta relevancia para afiliados ML',
      input: 'Hero section com message match generico',
      output: 'Hero reescrito com foco ML + CTA direto para afiliados',
      success: true,
      reward: 0.9,
      sessionId: 'session-conversion-001',
      metadata: { domain: 'conversion-optimization', tags: ['hero', 'message-match', 'mercadolivre', 'affiliate', 'cta'] }
    },
    {
      task: 'StickyCTA deve funcionar em desktop E mobile: remover lg:hidden, adicionar showOnDesktop prop, criar DesktopStickyCTA sidebar separado para experiencia premium desktop',
      input: 'StickyCTA apenas mobile (lg:hidden)',
      output: 'StickyCTA responsivo + DesktopStickyCTA sidebar',
      success: true,
      reward: 0.95,
      sessionId: 'session-design-001',
      metadata: { domain: 'design-system', tags: ['stickycta', 'desktop', 'mobile', 'responsive', 'conversion'] }
    },
    {
      task: '3 artigos virais P1 gerados via pipeline: fone bluetooth, smartwatch custo-beneficio, celular custo-beneficio - todos com 4 produtos comparados e schema otimizado',
      input: 'Gap de conteudo comercial (zero artigos "melhor X")',
      output: '3 artigos virais P1 publicados no Supabase',
      success: true,
      reward: 0.9,
      sessionId: 'session-content-001',
      metadata: { domain: 'content-generation', tags: ['viral', 'p1', 'comparativo', 'seo', 'pipeline'] }
    },
    {
      task: '4 reviews de smartphone gerados via pipeline (Galaxy A55, Moto G84, Redmi Note 13 Pro, POCO X6 Pro) - servem como ancoras para o comparativo de celular custo-beneficio',
      input: 'Categoria celular sem reviews',
      output: '4 reviews smartphone publicados como ancoras',
      success: true,
      reward: 0.9,
      sessionId: 'session-content-002',
      metadata: { domain: 'content-generation', tags: ['reviews', 'smartphone', 'pipeline', 'anchor-content', 'internal-linking'] }
    },
    {
      task: 'AdSlot component criado para Google AdSense - suporta auto, horizontal, vertical, rectangle, fluid formats, carrega script async com delay',
      input: 'Sem componente AdSense',
      output: 'AdSlot.tsx pronto para producao',
      success: true,
      reward: 0.85,
      sessionId: 'session-conversion-002',
      metadata: { domain: 'conversion-optimization', tags: ['adsense', 'ads', 'monetization', 'component'] }
    },
    {
      task: 'Nexu Minimalist UI tokens ja aplicados (tokens.css) - warm monochrome, editorial serif, bento grids. Proximo passo: aplicar consistentemente em ReviewCard, comparativos page, Navbar',
      input: 'Tokens definidos mas componentes parciais',
      output: 'tokens.css ativo, audit necessario',
      success: true,
      reward: 0.8,
      sessionId: 'session-design-002',
      metadata: { domain: 'design-system', tags: ['nexu', 'minimalist', 'tokens', 'typography', 'bento-grid'] }
    },
    {
      task: 'Deploy Vercel + IndexNow + Google Indexing API automatizado no generate pipeline - garante indexacao rapida de novos artigos',
      input: 'Deploy manual sem indexacao automatica',
      output: 'Pipeline com submitToIndexNow() + submitToGoogle()',
      success: true,
      reward: 0.95,
      sessionId: 'session-seo-001',
      metadata: { domain: 'seo-optimization', tags: ['vercel', 'indexnow', 'google-indexing', 'deploy', 'automation'] }
    },
  ];
  
  for (const lesson of lessons) {
    const episodeId = await rb.storePattern(lesson);
    console.log('Stored:', lesson.metadata.domain, '- episode:', episodeId);
  }
  
  console.log('Initial lessons loaded!');
  
  // Test retrieval
  const patterns = await rb.retrievePatterns('conversion optimization', { k: 5 });
  console.log('Retrieved patterns:', patterns.length);
  
  process.exit(0);
}

init().catch(e => { console.error(e); process.exit(1); });