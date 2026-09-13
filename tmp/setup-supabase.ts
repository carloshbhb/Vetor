import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Supabase credentials not found in .env.local');
  process.exit(1);
}

async function setupDatabase() {
  console.log('🔧 Conectando ao Supabase...');
  console.log(`   URL: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, serviceKey);

  // Ler o schema SQL
  const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  console.log('📝 Executando schema SQL...');

  // Dividir em statements individuais
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      if (error) {
        // Tentar via query direta
        const { error: queryError } = await supabase
          .from('_setup')
          .select()
          .limit(0);
        
        if (queryError && !queryError.message.includes('does not exist')) {
          console.log(`  ⚠️  Statement pode ja existir: ${statement.substring(0, 60)}...`);
        }
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err: any) {
      console.log(`  ⚠️  ${err.message?.substring(0, 80)}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Resultado: ${successCount} sucesso, ${errorCount} pulados/erros`);

  // Verificar se as tabelas existem
  console.log('\n🔍 Verificando tabelas...');

  const { data: reviewsCheck, error: reviewsError } = await supabase
    .from('reviews')
    .select('count')
    .limit(1);

  if (reviewsError) {
    console.log('  ❌ Tabela "reviews" nao existe ou nao esta acessivel');
    console.log('     Execute o SQL manualmente no Supabase Dashboard:');
    console.log('     https://supabase.com/dashboard > SQL Editor > Cole supabase/schema.sql');
  } else {
    console.log('  ✅ Tabela "reviews" existe');
  }

  const { data: viralCheck, error: viralError } = await supabase
    .from('viral_articles')
    .select('count')
    .limit(1);

  if (viralError) {
    console.log('  ❌ Tabela "viral_articles" nao existe ou nao esta acessivel');
  } else {
    console.log('  ✅ Tabela "viral_articles" existe');
  }
}

setupDatabase().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
