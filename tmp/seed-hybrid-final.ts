import { HybridReasoningBank } from 'agentic-flow/reasoningbank';

async function init() {
  // Use HybridReasoningBank which handles initialization internally
  const rb = new HybridReasoningBank({ 
    preferWasm: true,
    // We can't easily pass dbPath, but it should use .agentdb.db by default
  });
  
  const lessons = [
    {
      task: "Hero homepage otimizado para message match ML",
      input: "Hero section com message match generico",
      output: "Hero reescrito com foco ML + CTA direto para afiliados",
      success: true,
      reward: 0.9,
      sessionId: "session-conversion-001",
      metadata: { domain: "conversion-optimization", type: "lesson" },
      tags: ["hero", "message-match", "mercadolivre", "affiliate", "cta"]
    },
    {
      task: "StickyCTA responsivo desktop + mobile",
      input: "StickyCTA apenas mobile (lg:hidden)",
      output: "StickyCTA responsivo + DesktopStickyCTA sidebar",
      success: true,
      reward: 0.95,
      sessionId: "session-design-001",
      metadata: { domain: "design-system", type: "lesson" },
      tags: ["stickycta", "desktop", "mobile", "responsive", "conversion"]
    },
    {
      task: "3 artigos virais P1 gerados via pipeline",
      input: "Gap de conteudo comercial (zero artigos melhor X)",
      output: "3 artigos virais P1 publicados no Supabase",
      success: true,
      reward: 0.9,
      sessionId: "session-content-001",
      metadata: { domain: "content-generation", type: "lesson" },
      tags: ["viral", "p1", "comparativo", "seo", "pipeline"]
    },
    {
      task: "4 reviews smartphone gerados via pipeline",
      input: "Categoria celular sem reviews",
      output: "4 reviews smartphone publicados como ancoras",
      success: true,
      reward: 0.9,
      sessionId: "session-content-002",
      metadata: { domain: "content-generation", type: "lesson" },
      tags: ["reviews", "smartphone", "pipeline", "anchor-content", "internal-linking"]
    },
    {
      task: "AdSlot component para Google AdSense",
      input: "Sem componente AdSense",
      output: "AdSlot.tsx pronto para producao",
      success: true,
      reward: 0.85,
      sessionId: "session-conversion-002",
      metadata: { domain: "conversion-optimization", type: "lesson" },
      tags: ["adsense", "ads", "monetization", "component"]
    },
    {
      task: "Nexu Minimalist UI tokens aplicados",
      input: "Tokens definidos mas componentes parciais",
      output: "tokens.css ativo, audit necessario",
      success: true,
      reward: 0.8,
      sessionId: "session-design-002",
      metadata: { domain: "design-system", type: "lesson" },
      tags: ["nexu", "minimalist", "tokens", "typography", "bento-grid"]
    },
    {
      task: "Deploy Vercel + IndexNow; Google indexing uses sitemap and Search Console for ordinary review pages",
      input: "Deploy manual sem indexacao automatica",
      output: "Pipeline usa o cliente IndexNow compartilhado; Google para reviews depende de sitemap, links internos e Search Console",
      success: true,
      reward: 0.95,
      sessionId: "session-seo-001",
      metadata: { domain: "seo-optimization", type: "lesson" },
      tags: ["vercel", "indexnow", "google-indexing", "deploy", "automation"]
    },
  ];
  
  for (const lesson of lessons) {
    try {
      const episodeId = await rb.storePattern(lesson);
      console.log('Stored:', lesson.metadata.domain, '- episode:', episodeId);
    } catch (error) {
      console.error('Failed to store:', lesson.metadata.domain, error);
    }
  }
  
  console.log('Initial lessons loaded!');
  
  // Test retrieval
  const patterns = await rb.retrievePatterns("conversion optimization", { k: 5 });
  console.log('Retrieved patterns:', patterns.length);
  
  process.exit(0);
}

init().catch(e => { console.error(e); process.exit(1); });