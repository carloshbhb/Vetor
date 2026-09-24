import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const raw = readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, "");
}

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

const sql = `
SELECT tc.table_name, tc.constraint_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE' AND kcu.column_name = 'slug'
ORDER BY tc.table_name;
`;

const t = await s.rpc("exec_sql", { sql });
if (t.error) {
  console.log("exec_sql unavailable:", t.error.message);
} else {
  console.log("unique slug constraints:", JSON.stringify(t.data, null, 2));
}

const r = await s.from("reviews").select("slug").limit(1);
console.log("reviews readable:", !r.error, r.data?.[0]?.slug ?? "");
const v = await s.from("viral_articles").select("slug").limit(1);
console.log("viral readable:", !v.error, v.data?.[0]?.slug ?? "");
