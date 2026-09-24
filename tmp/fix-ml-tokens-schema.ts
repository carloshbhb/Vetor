import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const statements = [
    `ALTER TABLE ml_tokens ALTER COLUMN refresh_token DROP NOT NULL;`,
    `ALTER TABLE ml_tokens ALTER COLUMN refresh_token SET DEFAULT '';`,
  ];

  for (const sql of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error('Error:', sql, error.message);
    } else {
      console.log('OK:', sql);
    }
  }
}

main();
