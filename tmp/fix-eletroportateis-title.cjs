require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);
(async () => {
  const { error } = await sb
    .from('reviews')
    .update({
      product: 'Melhores Eletroportáteis 2026: Smart Band vs Galaxy Fit vs Air Fryer por R$199',
      meta_title: 'Melhores Eletroportáteis de R$199 em 2026: Smart Band, Galaxy Fit ou Air Fryer?',
      hero_headline_line2: 'Smart Band vs Galaxy Fit vs Air Fryer por R$199',
      hero_lead:
        'Orçamento de R$199 para eletroportáteis? Este guia compara os três usos mais comuns nessa faixa — Xiaomi Smart Band, Samsung Galaxy Fit e uma air fryer compacta — para decidir qual oferece o melhor valor no Brasil em 2026.',
    })
    .eq('slug', 'melhores-eletroportateis-2026-top-3-guia-de-compra');
  console.log(error ? error.message : 'atualizado');
})();
