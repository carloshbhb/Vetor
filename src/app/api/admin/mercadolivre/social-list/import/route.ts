import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { importSocialList } from "@/lib/mercadolivre-refill";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  try {
    // Shared with the scheduled refill workflow: imports as product_link and
    // deduplicates by source_ref, item ID and normalized product URL.
    const result = await importSocialList(supabase);
    return NextResponse.json({
      ok: true,
      inserted: result.inserted,
      alreadyImported: result.alreadyImported,
      catalogTotal: result.catalogTotal,
      existingTotal: result.existingTotal,
      message: result.inserted
        ? result.inserted + " produto(s) enviado(s) à fila de pesquisa do Mercado Livre. Nenhum link de afiliado foi gerado ou aplicado."
        : "Todos os produtos sincronizados já estavam na fila de pesquisa.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
