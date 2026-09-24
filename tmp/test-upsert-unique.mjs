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

const { data: sample } = await s.from("reviews").select("*").limit(1);
const cols = sample?.[0] ? Object.keys(sample[0]) : [];
console.log("cols:", cols.join(","));

// Build a minimal row that satisfies NOT NULL: use defaults similar to createReview
const base = {
  slug: "__probe_unique__",
  status: "draft",
  product: "probe",
  category: "test",
  marketplace: "",
  price_old: "",
  price_new: "0",
  affiliate_url: "",
  image_url: "https://example.com/x.png",
  ads_enabled: false,
  meta_title: "probe",
  meta_description: "probe",
  meta_keywords: "",
  meta_reading_time: 5,
  hero_headline_line1: "",
  hero_headline_line2: "",
  hero_headline_em: "",
  hero_lead: "",
  hero_overall_score: 0,
  hero_bars: [],
  specs: [],
  sections: [],
  compare_table: { rows: [], caption: "", columns: [], winnerCol: 0 },
  pros: [],
  cons: [],
  testimonials: [],
  verdict_score: 0,
  verdict_label: "",
  verdict_text: "",
  verdict_note: "",
  schema_rating_value: 0,
  schema_review_count: 1,
  faq: [],
};

// only keep known columns
const row = {};
for (const k of Object.keys(base)) if (cols.includes(k)) row[k] = base[k];
if (cols.includes("created_at")) row.created_at = new Date().toISOString();
if (cols.includes("updated_at")) row.updated_at = new Date().toISOString();

const a = await s.from("reviews").upsert(row, { onConflict: "slug" }).select("slug,product");
console.log("ins1:", a.error ? a.error.message : "ok " + JSON.stringify(a.data));

const b = await s
  .from("reviews")
  .upsert({ ...row, product: "p2" }, { onConflict: "slug" })
  .select("slug,product");
console.log("ins2:", b.error ? b.error.message : "ok " + JSON.stringify(b.data));

const count = await s
  .from("reviews")
  .select("slug", { count: "exact", head: true })
  .eq("slug", row.slug);
console.log("count:", count.count);

await s.from("reviews").delete().eq("slug", row.slug);
console.log("cleanup done");
