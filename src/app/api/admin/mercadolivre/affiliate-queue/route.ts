import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "generated", "applied", "skipped"] as const;

type GenerationStatus = (typeof STATUSES)[number];

function isHttps(value: string) {
  return /^https:\/\//i.test(value.trim());
}

export async function GET(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const status = request.nextUrl.searchParams.get("status") as GenerationStatus | null;
  const query = supabase
    .from("affiliate_link_ml_matches")
    .select("id,affiliate_link_id,search_query,matched_item_id,matched_title,matched_url,sold_quantity,match_score,match_status,checked_at,affiliate_generation_status,generated_affiliate_url,generated_at,generation_notes,candidate_data,updated_at,affiliate_links!inner(name,slug,marketplace,category)")
    .order("updated_at", { ascending: false });

  const { data, error } = status && STATUSES.includes(status)
    ? await query.eq("affiliate_generation_status", status)
    : await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []).filter((row) => row.match_status === "matched" || row.match_status === "review");
  const counts = rows.reduce((acc, row) => {
    const key = String(row.affiliate_generation_status || "pending");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({ data: rows, counts });
}

export async function PATCH(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  let body: {
    id?: string;
    affiliateGenerationStatus?: GenerationStatus;
    generatedAffiliateUrl?: string | null;
    generationNotes?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: "Registro obrigatório." }, { status: 400 });

  const generationStatus = body.affiliateGenerationStatus;
  if (generationStatus && !STATUSES.includes(generationStatus)) {
    return NextResponse.json({ error: "Status de geração inválido." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (generationStatus) patch.affiliate_generation_status = generationStatus;

  if (body.generatedAffiliateUrl !== undefined) {
    const value = String(body.generatedAffiliateUrl || "").trim();
    if (value && !isHttps(value)) {
      return NextResponse.json({ error: "O link de afiliado precisa usar HTTPS." }, { status: 400 });
    }
    patch.generated_affiliate_url = value || null;
    if (value) {
      patch.generated_at = new Date().toISOString();
      patch.affiliate_generation_status = generationStatus || "generated";
    } else if (!generationStatus) {
      patch.affiliate_generation_status = "pending";
      patch.generated_at = null;
    }
  }

  if (body.generationNotes !== undefined) {
    patch.generation_notes = body.generationNotes == null ? null : String(body.generationNotes).trim() || null;
  }

  const { data, error } = await supabase
    .from("affiliate_link_ml_matches")
    .update(patch)
    .eq("id", body.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Registro não encontrado." }, { status: 400 });
  }

  return NextResponse.json({ data });
}
