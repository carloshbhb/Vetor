require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('reviews')
    .select('slug,product,category,status,verdict_score,hero_overall_score,price_new,sections,pros,cons,faq,hero_bars,specs,compare_table,meta_title,meta_description,hero_lead,verdict_text,verdict_label')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`Total reviews: ${data.length}\n`);

  for (const r of data) {
    const sections = Array.isArray(r.sections) ? r.sections : 
      (typeof r.sections === 'string' ? JSON.parse(r.sections || '[]') : []);
    const totalContent = sections.reduce((acc, s) => acc + (s.content?.length || 0), 0);
    const sectionCount = sections.length;
    const pros = Array.isArray(r.pros) ? r.pros : JSON.parse(r.pros || '[]');
    const cons = Array.isArray(r.cons) ? r.cons : JSON.parse(r.cons || '[]');
    const faq = Array.isArray(r.faq) ? r.faq : JSON.parse(r.faq || '[]');
    const bars = Array.isArray(r.hero_bars) ? r.hero_bars : JSON.parse(r.hero_bars || '[]');
    const specs = Array.isArray(r.specs) ? r.specs : JSON.parse(r.specs || '[]');
    
    console.log(`--- ${r.slug} ---`);
    console.log(`  Product: ${r.product}`);
    console.log(`  Category: ${r.category}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Score: ${r.verdict_score || r.hero_overall_score}`);
    console.log(`  Price: ${r.price_new}`);
    console.log(`  Sections: ${sectionCount} (${totalContent} chars total)`);
    console.log(`  Pros: ${pros.length} | Cons: ${cons.length}`);
    console.log(`  FAQ: ${faq.length} | Bars: ${bars.length} | Specs: ${specs.length}`);
    console.log(`  Meta title: ${(r.meta_title || '').substring(0, 80)}`);
    console.log(`  Meta desc: ${(r.meta_description || '').substring(0, 120)}`);
    console.log(`  Hero lead: ${(r.hero_lead || '').substring(0, 120)}`);
    console.log(`  Verdict: ${r.verdict_label} - ${(r.verdict_text || '').substring(0, 80)}`);
    
    if (sectionCount > 0) {
      console.log(`  Section headings:`);
      for (const s of sections) {
        console.log(`    - [${s.id}] ${s.heading} (${s.content?.length || 0} chars)`);
      }
    }
    console.log('');
  }
}

main();
