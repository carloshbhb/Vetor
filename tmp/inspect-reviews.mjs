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

const { data: sample, error } = await s
  .from("reviews")
  .select("*")
  .limit(1);
if (error) {
  console.log("select error:", error.message);
} else {
  console.log("reviews columns:", sample?.[0] ? Object.keys(sample[0]).sort() : "empty");
  console.log("sample slug:", sample?.[0]?.slug);
}

// probe unique with real columns
const cols = sample?.[0] ? Object.keys(sample[0]) : [];
const row = { slug: "__unique_probe_delete_me__" };
if (cols.includes("product")) row.product = "probe";
if (cols.includes("category")) row.category = "test";
// avoid NOT NULL columns other than slug/id
for (const k of ["title", "name"]) {
  if (cols.includes(k)) row[k] = "probe";
}
for (const k of ["description", "content", "body", "hero_lead"]) {
  if (cols.includes(k) && sample[0][k] !== null) row[k] = "probe";
}

const first = await s.from("reviews").upsert(row, { onConflict: "slug" });
console.log("reviews upsert1:", first.error ? first.error.message : "ok");
const second = await s.from("reviews").upsert({ ...row }, { onConflict: "slug" });
console.log("reviews upsert2:", second.error ? second.error.message : "ok");
const { data } = await s.from("reviews").select("*").eq("slug", row.slug);
console.log("probe rows:", data?.length);
await s.from("reviews").delete().eq("slug", row.slug);
console.log("cleanup ok");
