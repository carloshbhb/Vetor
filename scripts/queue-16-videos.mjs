import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_KEY;
const supabase = createClient(url, key);

const topics = [
  // Reviews
  { title: 'Apple iPhone 16 Pro', category: 'smartphones', price: 'R$ 9.499', type: 'review' },
  { title: 'Samsung Galaxy S25 Ultra', category: 'smartphones', price: 'R$ 8.999', type: 'review' },
  { title: 'Sony WH-1000XM6', category: 'fones', price: 'R$ 2.499', type: 'review' },
  { title: 'Apple AirPods Pro 3', category: 'fones', price: 'R$ 2.199', type: 'review' },
  { title: 'Nintendo Switch 2', category: 'games', price: 'R$ 3.999', type: 'review' },
  { title: 'MacBook Air M4', category: 'notebooks', price: 'R$ 12.999', type: 'review' },
  { title: 'Samsung Galaxy Watch 8', category: 'wearables', price: 'R$ 1.899', type: 'review' },
  { title: 'Google Pixel 9 Pro', category: 'smartphones', price: 'R$ 6.999', type: 'review' },
  // Comparisons
  { title: 'iPhone 16 Pro vs Galaxy S25 Ultra', category: 'smartphones', type: 'comparison' },
  { title: 'AirPods Pro 3 vs Galaxy Buds vs Sony WF', category: 'fones', type: 'comparison' },
  { title: 'MacBook Air M4 vs Dell XPS 14', category: 'notebooks', type: 'comparison' },
  { title: 'Galaxy Watch 8 vs Apple Watch Ultra', category: 'wearables', type: 'comparison' },
  { title: 'Nintendo Switch 2 vs Steam Deck', category: 'games', type: 'comparison' },
  { title: 'Pixel 9 Pro vs iPhone 16 Pro', category: 'smartphones', type: 'comparison' },
  { title: 'Samsung TV vs LG TV 2026', category: 'tv', type: 'comparison' },
  { title: 'PlayStation 5 vs Xbox Series X', category: 'games', type: 'comparison' },
];

async function main() {
  console.log('🎬 Enfileirando 16 vídeos...');

  const entries = topics.map((t, i) => ({
    product_url: `https://vetor.blog/${t.type === 'review' ? 'reviews' : 'comparativos'}/${t.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`,
    product_title: t.title,
    product_category: t.category,
    product_price: t.price || 'Consultar',
    product_image_url: '',
    affiliate_url: '',
    script_text: JSON.stringify({
      hook: t.type === 'review'
        ? `O ${t.title} vale ${t.price || 'a pena'}? Descubra agora!`
        : `${t.title} — qual é o melhor? Veja nossa análise completa!`,
      scenes: [
        { id: 1, text: t.type === 'review' ? `Apresentando o ${t.title}` : `Comparativo: ${t.title}`, duration: 8, visualCue: 'Intro', brollKeywords: ['tech'] },
        { id: 2, text: 'Análise detalhada dos principais recursos', duration: 8, visualCue: 'Features', brollKeywords: ['features'] },
        { id: 3, text: 'Qualidade, design e custo-benefício', duration: 8, visualCue: 'Design', brollKeywords: ['design'] },
        { id: 4, text: 'Nosso veredicto final', duration: 5, visualCue: 'Verdict', brollKeywords: ['verdict'] },
      ],
      totalDuration: 29,
      callToAction: 'Links na descrição do vídeo no site! Acesse vetor.blog para mais!',
    }),
    script_hook: t.type === 'review'
      ? `O ${t.title} vale ${t.price || 'a pena'}? Descubra agora!`
      : `${t.title} — qual é o melhor? Veja nossa análise completa!`,
    status: 'pending',
    scheduled_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase.from('video_queue').insert(entries).select('id, product_title');

  if (error) {
    console.error('Erro:', error.message);
  } else {
    console.log(`✅ ${data.length} vídeos enfileirados:`);
    data.forEach(v => console.log(`   - ${v.product_title} (${v.id})`));
  }
}

main();
