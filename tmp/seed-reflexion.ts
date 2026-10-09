import { SharedMemoryPool } from 'agentic-flow/memory/SharedMemoryPool.js';
import { ReflexionMemory } from 'agentic-flow/reasoningbank.js';

async function init() {
  // Initialize the shared memory pool
  const pool = SharedMemoryPool.getInstance({
    dbPath: '.agentdb.db',
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    embeddingDimension: 384,
  });
  
  await pool.ensureInitialized();
  
  const db = pool.getDatabase();
  const embedder = pool.getEmbedder();
  const vectorBackend = pool.getVectorBackend();
  
  const reflexion = new ReflexionMemory(db, embedder, vectorBackend);
  
  const lessons = [
    {
      task: "Hero homepage otimizado para message match ML",
      input: "Hero section com message match generico",
      output: "Hero reescrito com foco ML + CTA direto para afiliados",
      success: true,
      reward: 0.9,
      sessionId: "session-conversion-001",
      tags: ["hero", "message-match", "mercadolivre", "affiliate", "cta"],
      metadata: { domain: "conversion-optimization", type: "lesson" }
    },
    {
      task: "StickyCTA responsivo desktop + mobile",
      input: "StickyCTA apenas mobile (lg:hidden)",
      output: "StickyCTA responsivo + DesktopStickyCTA sidebar",
      success: true,
      reward: 0.95,
      sessionId: "session-design-001",
      tags: ["stickycta", "desktop", "mobile", "responsive", "conversion"],
      metadata: { domain: "design-system", type: "lesson" }
    },
    {
      task: "3 artigos virais P1 gerados via pipeline",
      input: "Gap de conteudo comercial (zero artigos melhor X)",
      output: "3 artigos virais P1 publicados no Supabase",
      success: true,
      reward: 0.9,
      sessionId: "session-content-001",
      tags: ["viral", "p1", "comparativo", "seo", "pipeline"],
      metadata: { domain: "content-generation", type: "lesson" }
    },
    {
      task: "4 reviews smartphone gerados via pipeline",
      input: "Categoria celular sem reviews",
      output: "4 reviews smartphone publicados como ancoras",
      success: true,
      reward: 0.9,
      sessionId: "session-content-002",
      tags: ["reviews", "smartphone", "pipeline", "anchor-content", "internal-linking"],
      metadata: { domain: "content-generation", type: "lesson" }
    },
    {
      task: "AdSlot component para Google AdSense",
      input: "Sem componente AdSense",
      output: "AdSlot.tsx pronto para producao",
      success: true,
      reward: 0.85,
      sessionId: "session-conversion-002",
      tags: ["adsense", "ads", "monetization", "component"],
      metadata: { domain: "conversion-optimization", type: "lesson" }
    },
    {
      task: "Nexu Minimalist UI tokens aplicados",
      input: "Tokens definidos mas componentes parciais",
      output: "tokens.css ativo, audit necessario",
      success: true,
      reward: 0.8,
      sessionId: "session-design-002",
      tags: ["nexu", "minimalist", "tokens", "typography", "bento-grid"],
      metadata: { domain: "design-system", type: "lesson" }
    },
    {
      task: "Deploy Vercel + IndexNow; Google indexing uses sitemap and Search Console for ordinary review pages",
      input: "Deploy manual sem indexacao automatica",
      output: "Pipeline usa o cliente IndexNow compartilhado; Google para reviews depende de sitemap, links internos e Search Console",
      success: true,
      reward: 0.95,
      sessionId: "session-seo-001",
      tags: ["vercel", "indexnow", "google-indexing", "deploy", "automation"],
      metadata: { domain: "seo-optimization", type: "lesson" }
    },
  ];
  
  for (const lesson of lessons) {
    const episodeId = await reflexion.storeEpisode(lesson);
    console.log('Stored:', lesson.metadata.domain, '- episode:', episodeId);
  }
  
  console.log('Initial lessons loaded!');
  
  // Test retrieval
  const patterns = await reflexion.retrieveRelevant({
    task: "conversion optimization",
    k: 5,
    minReward: 0.7,
    onlySuccesses: true
  });
  console.log('Retrieved patterns:', patterns.length);
  
  process.exit(0);
}

init().catch(e => { console.error(e); process.exit(1); });