require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
(async () => {
  const { data } = await supabase.from('reviews').select('slug,sections').eq('slug', 'apple-watch-series-9').single();
  const sections = typeof data.sections === 'string' ? JSON.parse(data.sections) : data.sections;
  console.log('sections:', sections.length);
  for (const s of sections.slice(0, 3)) {
    const c = s.content || '';
    const doubleNL = (c.match(/\n\n/g) || []).length;
    const singleNL = (c.match(/\n/g) || []).length;
    const hasPTags = /<p[\s>]/i.test(c);
    console.log(`[${s.id}] heading="${s.heading}" len=${c.length} "\\n\\n"=${doubleNL} "\\n"=${singleNL} <p>tags=${hasPTags}`);
    console.log('first 120 chars:', JSON.stringify(c.slice(0, 120)));
  }
  // compare with a good one
  const { data: good } = await supabase.from('reviews').select('slug,sections').eq('slug', 'eufy').maybeSingle();
  if (good) {
    const gs = typeof good.sections === 'string' ? JSON.parse(good.sections) : good.sections;
    const c = gs[0]?.content || '';
    console.log('\neufy (publicado): \\n\\n=' + (c.match(/\n\n/g) || []).length, '<p>tags=' + /<p[\s>]/i.test(c));
  }
})();
