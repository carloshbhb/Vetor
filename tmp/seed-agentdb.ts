import { AgentDB } from 'agentdb';

async function init() {
  // Initialize AgentDB with our database
  const agentdb = new AgentDB({
    path: '.agentdb.db',
    dimension: 768,
    embedder: 'Xenova/bge-base-en-v1.5'
  });
  
  await agentdb.initialize();
  
  const lessons = [
    {
      content: 'Hero homepage otimizado para message match ML: trocar "Pare de comprar no escuro" por "Encontre o Menor Preco no ML" + CTA "Ver Menor Preco no ML" aumenta relevancia para afiliados ML',
      metadata: { 
        domain: 'conversion-optimization', 
        tags: ['hero', 'message-match', 'mercadolivre', 'affiliate', 'cta'],
        type: 'lesson',
        success: true,
        confidence: 0.9,
        evidence: 'Implementado em src/app/page.tsx - hero section reescrita com foco ML'
      }
    },
    {
      content: 'StickyCTA deve funcionar em desktop E mobile: remover lg:hidden, adicionar showOnDesktop prop, criar DesktopStickyCTA sidebar separado para experiencia premium desktop',
      metadata: { 
        domain: 'design-system', 
        tags: ['stickycta', 'desktop', 'mobile', 'responsive', 'conversion'],
        type: 'lesson',
        success: true,
        confidence: 0.95,
        evidence: 'Atualizado StickyCTA.tsx + criado DesktopStickyCTA.tsx - ambos em producao'
      }
    },
    {
      content: '3 artigos virais P1 gerados via pipeline: fone bluetooth, smartwatch custo-beneficio, celular custo-beneficio - todos com 4 produtos comparados e schema otimizado',
      metadata: { 
        domain: 'content-generation', 
        tags: ['viral', 'p1', 'comparativo', 'seo', 'pipeline'],
        type: 'lesson',
        success: true,
        confidence: 0.9,
        evidence: 'Gerados via tmp/generate-p1-viral.ts - 3/3 sucesso no Supabase'
      }
    },
    {
      content: '4 reviews de smartphone gerados via pipeline (Galaxy A55, Moto G84, Redmi Note 13 Pro, POCO X6 Pro) - servem como ancoras para o comparativo de celular custo-beneficio',
      metadata: { 
        domain: 'content-generation', 
        tags: ['reviews', 'smartphone', 'pipeline', 'anchor-content', 'internal-linking'],
        type: 'lesson',
        success: true,
        confidence: 0.9,
        evidence: 'Gerados via tmp/generate-cell-reviews.ts - 4/4 sucesso no Supabase'
      }
    },
    {
      content: 'AdSlot component criado para Google AdSense - suporta auto, horizontal, vertical, rectangle, fluid formats, carrega script async com delay',
      metadata: { 
        domain: 'conversion-optimization', 
        tags: ['adsense', 'ads', 'monetization', 'component'],
        type: 'lesson',
        success: true,
        confidence: 0.85,
        evidence: 'Criado src/components/AdSlot.tsx - pronto para producao'
      }
    },
    {
      content: 'Nexu Minimalist UI tokens ja aplicados (tokens.css) - warm monochrome, editorial serif, bento grids. Proximo passo: aplicar consistentemente em ReviewCard, comparativos page, Navbar',
      metadata: { 
        domain: 'design-system', 
        tags: ['nexu', 'minimalist', 'tokens', 'typography', 'bento-grid'],
        type: 'lesson',
        success: true,
        confidence: 0.8,
        evidence: 'styles/tokens.css existe, componentes parciais. Audit necessario via anti-ui-slop'
      }
    },
    {
      content: 'Deploy Vercel + IndexNow; Google indexing uses sitemap and Search Console for ordinary review pages — notificação não garante indexação; Google usa sitemap, links internos e Search Console',
      metadata: { 
        domain: 'seo-optimization', 
        tags: ['vercel', 'indexnow', 'google-indexing', 'deploy', 'automation'],
        type: 'lesson',
        success: true,
        confidence: 0.95,
        evidence: 'IndexNow centralizado; Google Indexing API não é elegível para reviews comuns'
      }
    },
  ];
  
  for (const lesson of lessons) {
    const id = await agentdb.insert(lesson.content, lesson.metadata);
    console.log('Stored:', lesson.metadata.domain, '- id:', id);
  }
  
  console.log('Initial lessons loaded!');
  
  // Test search
  const results = await agentdb.search('conversion optimization', { k: 5 });
  console.log('Search results:', results.length);
  
  // Stats
  const stats = await agentdb.stats();
  console.log('Stats:', stats);
  
  await agentdb.close();
  process.exit(0);
}

init().catch(e => { console.error(e); process.exit(1); });