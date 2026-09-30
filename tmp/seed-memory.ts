import { createAgentDBAdapter } from 'agentic-flow/reasoningbank';

async function init() {
  const adapter = await createAgentDBAdapter({
    dbPath: '.agentdb.db',
    enableLearning: true,
    enableReasoning: true,
    quantizationType: 'scalar',
    cacheSize: 1000,
  });
  
  const lessons = [
    {
      lesson: 'Hero homepage otimizado para message match ML: trocar "Pare de comprar no escuro" por "Encontre o Menor Preco no ML" + CTA "Ver Menor Preco no ML" aumenta relevancia para afiliados ML',
      domain: 'conversion-optimization',
      tags: ['hero', 'message-match', 'mercadolivre', 'affiliate', 'cta'],
      confidence: 0.9,
      evidence: 'Implementado em src/app/page.tsx - hero section reescrita com foco ML',
      success: true,
    },
    {
      lesson: 'StickyCTA deve funcionar em desktop E mobile: remover lg:hidden, adicionar showOnDesktop prop, criar DesktopStickyCTA sidebar separado para experiencia premium desktop',
      domain: 'design-system',
      tags: ['stickycta', 'desktop', 'mobile', 'responsive', 'conversion'],
      confidence: 0.95,
      evidence: 'Atualizado StickyCTA.tsx + criado DesktopStickyCTA.tsx - ambos em producao',
      success: true,
    },
    {
      lesson: '3 artigos virais P1 gerados via pipeline: fone bluetooth, smartwatch custo-beneficio, celular custo-beneficio - todos com 4 produtos comparados e schema otimizado',
      domain: 'content-generation',
      tags: ['viral', 'p1', 'comparativo', 'seo', 'pipeline'],
      confidence: 0.9,
      evidence: 'Gerados via tmp/generate-p1-viral.ts - 3/3 sucesso no Supabase',
      success: true,
    },
    {
      lesson: '4 reviews de smartphone gerados via pipeline (Galaxy A55, Moto G84, Redmi Note 13 Pro, POCO X6 Pro) - servem como ancoras para o comparativo de celular custo-beneficio',
      domain: 'content-generation',
      tags: ['reviews', 'smartphone', 'pipeline', 'anchor-content', 'internal-linking'],
      confidence: 0.9,
      evidence: 'Gerados via tmp/generate-cell-reviews.ts - 4/4 sucesso no Supabase',
      success: true,
    },
    {
      lesson: 'AdSlot component criado para Google AdSense - suporta auto, horizontal, vertical, rectangle, fluid formats, carrega script async com delay',
      domain: 'conversion-optimization',
      tags: ['adsense', 'ads', 'monetization', 'component'],
      confidence: 0.85,
      evidence: 'Criado src/components/AdSlot.tsx - pronto para producao',
      success: true,
    },
    {
      lesson: 'Nexu Minimalist UI tokens ja aplicados (tokens.css) - warm monochrome, editorial serif, bento grids. Proximo passo: aplicar consistentemente em ReviewCard, comparativos page, Navbar',
      domain: 'design-system',
      tags: ['nexu', 'minimalist', 'tokens', 'typography', 'bento-grid'],
      confidence: 0.8,
      evidence: 'styles/tokens.css existe, componentes parciais. Audit necessario via anti-ui-slop',
      success: true,
    },
    {
      lesson: 'Deploy Vercel + IndexNow + Google Indexing API automatizado no generate pipeline - garante indexacao rapida de novos artigos',
      domain: 'seo-optimization',
      tags: ['vercel', 'indexnow', 'google-indexing', 'deploy', 'automation'],
      confidence: 0.95,
      evidence: 'Implementado em tmp/generate-*.ts - submitToIndexNow() + submitToGoogle()',
      success: true,
    },
  ];
  
  for (const lesson of lessons) {
    const patternId = await adapter.insertPattern({
      id: '',
      type: 'lesson',
      domain: lesson.domain,
      pattern_data: JSON.stringify({
        lesson: lesson.lesson,
        tags: lesson.tags,
        evidence: lesson.evidence,
        success: lesson.success,
      }),
      confidence: lesson.confidence,
      usage_count: 1,
      success_count: 1,
      created_at: Date.now(),
      last_used: Date.now(),
    });
    console.log('Stored:', lesson.domain, '-', patternId);
  }
  
  console.log('Initial lessons loaded!');
  process.exit(0);
}

init().catch(e => { console.error(e); process.exit(1); });