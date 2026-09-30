import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const patterns = [
  {
    type: "lesson",
    domain: "conversion-optimization",
    pattern: {
      lesson: "Hero homepage otimizado para message match ML: trocar Pare de comprar no escuro por Encontre o Menor Preco no ML + CTA Ver Menor Preco no ML aumenta relevancia para afiliados ML",
      tags: ["hero", "message-match", "mercadolivre", "affiliate", "cta"],
      evidence: "Implementado em src/app/page.tsx - hero section reescrita com foco ML",
      success: true
    },
    confidence: 0.9
  },
  {
    type: "lesson",
    domain: "design-system",
    pattern: {
      lesson: "StickyCTA deve funcionar em desktop E mobile: remover lg:hidden, adicionar showOnDesktop prop, criar DesktopStickyCTA sidebar separado para experiencia premium desktop",
      tags: ["stickycta", "desktop", "mobile", "responsive", "conversion"],
      evidence: "Atualizado StickyCTA.tsx + criado DesktopStickyCTA.tsx - ambos em producao",
      success: true
    },
    confidence: 0.95
  },
  {
    type: "lesson",
    domain: "content-generation",
    pattern: {
      lesson: "3 artigos virais P1 gerados via pipeline: fone bluetooth, smartwatch custo-beneficio, celular custo-beneficio - todos com 4 produtos comparados e schema otimizado",
      tags: ["viral", "p1", "comparativo", "seo", "pipeline"],
      evidence: "Gerados via tmp/generate-p1-viral.ts - 3/3 sucesso no Supabase",
      success: true
    },
    confidence: 0.9
  },
  {
    type: "lesson",
    domain: "content-generation",
    pattern: {
      lesson: "4 reviews de smartphone gerados via pipeline (Galaxy A55, Moto G84, Redmi Note 13 Pro, POCO X6 Pro) - servem como ancoras para o comparativo de celular custo-beneficio",
      tags: ["reviews", "smartphone", "pipeline", "anchor-content", "internal-linking"],
      evidence: "Gerados via tmp/generate-cell-reviews.ts - 4/4 sucesso no Supabase",
      success: true
    },
    confidence: 0.9
  },
  {
    type: "lesson",
    domain: "conversion-optimization",
    pattern: {
      lesson: "AdSlot component criado para Google AdSense - suporta auto, horizontal, vertical, rectangle, fluid formats, carrega script async com delay",
      tags: ["adsense", "ads", "monetization", "component"],
      evidence: "Criado src/components/AdSlot.tsx - pronto para producao",
      success: true
    },
    confidence: 0.85
  },
  {
    type: "lesson",
    domain: "design-system",
    pattern: {
      lesson: "Nexu Minimalist UI tokens ja aplicados (tokens.css) - warm monochrome, editorial serif, bento grids. Proximo passo: aplicar consistentemente em ReviewCard, comparativos page, Navbar",
      tags: ["nexu", "minimalist", "tokens", "typography", "bento-grid"],
      evidence: "styles/tokens.css existe, componentes parciais. Audit necessario via anti-ui-slop",
      success: true
    },
    confidence: 0.8
  },
  {
    type: "lesson",
    domain: "seo-optimization",
    pattern: {
      lesson: "Deploy Vercel + IndexNow + Google Indexing API automatizado no generate pipeline - garante indexacao rapida de novos artigos",
      tags: ["vercel", "indexnow", "google-indexing", "deploy", "automation"],
      evidence: "Implementado em tmp/generate-*.ts - submitToIndexNow() + submitToGoogle()",
      success: true
    },
    confidence: 0.95
  },
];

async function run() {
  for (const p of patterns) {
    const patternJson = JSON.stringify(p.pattern);
    
    const child = spawn('npx', [
      'agentdb@latest',
      'store-pattern',
      '--type', p.type,
      '--domain', p.domain,
      '--pattern', patternJson,
      '--confidence', p.confidence.toString()
    ], {
      cwd: 'C:\\Users\\Henrique\\Desktop\\vetor-blog',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    child.stdout.on('data', (data) => console.log(data.toString().trim()));
    child.stderr.on('data', (data) => console.error(data.toString().trim()));
    
    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) resolve(code);
        else reject(new Error(`Exit code ${code}`));
      });
      child.on('error', reject);
    });
    
    console.log(`✅ Stored: ${p.domain}`);
  }
  
  console.log('All patterns stored!');
}

run().catch(e => { console.error(e); process.exit(1); });