import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { getVideoById, updateVideoStatus } from "@/lib/video-orchestrator";
import { generateVideoScript } from "@/lib/script-generator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json().catch(() => ({}));
    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
    if (!videoId) return NextResponse.json({ error: "videoId é obrigatório." }, { status: 400 });

    const video = await getVideoById(videoId);
    if (!video) return NextResponse.json({ error: "Vídeo não encontrado na fila." }, { status: 404 });

    if (typeof video.script_text === "string" && video.script_text.trim()) {
      try {
        const existing = JSON.parse(video.script_text);
        if (Array.isArray(existing.scenes) && existing.scenes.length >= 5) {
          return NextResponse.json({ success: true, reused: true, videoId, script: existing });
        }
      } catch {
        // Replace a corrupted script only when a new script passes validation.
      }
    }

    const script = await generateVideoScript({
      title: video.product_title,
      category: video.product_category || "Tecnologia",
      price: video.product_price || "Consulte o preço",
      marketplace: (video.product_url || "").toLowerCase().includes("amazon")
        ? "Amazon"
        : (video.product_url || "").toLowerCase().includes("shopee")
          ? "Shopee"
          : "Mercado Livre",
    });
    if (!script.hook || script.scenes.length < 5 || script.scenes.length > 7) {
      return NextResponse.json({ error: "Roteiro gerado não passou pela validação de estrutura." }, { status: 422 });
    }
    await updateVideoStatus(videoId, {
      script_text: JSON.stringify(script),
      script_hook: script.hook,
      error_message: null,
    });
    return NextResponse.json({ success: true, videoId, scenes: script.scenes.length, script });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[generate-video-script] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
