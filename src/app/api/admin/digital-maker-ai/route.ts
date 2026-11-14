import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  DigitalMakerAIError,
  digitalMakerCall,
  digitalMakerListTools,
} from "@/lib/digital-maker-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type JsonRecord = Record<string, unknown>;

function getString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação no Digital Maker AI.";
}

function getErrorStatus(error: unknown): number {
  if (error instanceof DigitalMakerAIError) return error.status;
  return 502;
}

function jsonError(error: unknown) {
  return NextResponse.json(
    { success: false, error: getErrorMessage(error) },
    { status: getErrorStatus(error) }
  );
}

export async function GET(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const [account, options, creations, tools] = await Promise.allSettled([
    digitalMakerCall("get_account"),
    digitalMakerCall("list_video_options"),
    digitalMakerCall("list_creations"),
    digitalMakerListTools(),
  ]);

  const result: JsonRecord = {
    success: true,
    account: account.status === "fulfilled" ? account.value : null,
    videoOptions: options.status === "fulfilled" ? options.value : null,
    creations: creations.status === "fulfilled" ? creations.value : null,
    tools: tools.status === "fulfilled"
      ? tools.value.map((tool) => ({
          name: typeof tool.name === "string" ? tool.name : "",
          description: typeof tool.description === "string" ? tool.description : "",
        }))
      : [],
    errors: {
      account: account.status === "rejected" ? getErrorMessage(account.reason) : null,
      videoOptions: options.status === "rejected" ? getErrorMessage(options.reason) : null,
      creations: creations.status === "rejected" ? getErrorMessage(creations.reason) : null,
      tools: tools.status === "rejected" ? getErrorMessage(tools.reason) : null,
    },
  };

  if (
    account.status === "rejected" &&
    options.status === "rejected" &&
    creations.status === "rejected" &&
    tools.status === "rejected"
  ) {
    return jsonError(account.reason);
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const action = getString(body.action, 40);

    if (action === "previewSingleImage") {
      const topic = getString(body.topic, 700);
      const faceSide = body.faceSide === "right" ? "right" : "left";
      if (!topic) {
        return NextResponse.json(
          { success: false, error: "Informe o tema do vídeo para gerar a imagem de prévia." },
          { status: 400 }
        );
      }
      const result = await digitalMakerCall("preview_single_image", {
        topic,
        face_side: faceSide,
      });
      return NextResponse.json({ success: true, action, result, faceSide });
    }

    if (action === "createVideo") {
      const topic = getString(body.topic, 700);
      const script = getString(body.script, 18000);
      if (!topic && !script) {
        return NextResponse.json(
          { success: false, error: "Informe um tema ou um roteiro para o vídeo." },
          { status: 400 }
        );
      }

      const orientation = body.orientation === "vertical" ? "vertical" : "landscape";
      const format = ["multi", "single", "whiteboard"].includes(String(body.format))
        ? String(body.format)
        : "multi";

      if (orientation === "vertical" && format !== "multi") {
        return NextResponse.json(
          { success: false, error: "Shorts verticais exigem o formato Multi Scene." },
          { status: 400 }
        );
      }

      if (orientation === "vertical" && script) {
        // Vertical Shorts are English-only; the UI keeps this mode separate from
        // Vetor's Portuguese Remotion workflow.
        const language = getString(body.language, 12).toLowerCase();
        if (language && language !== "en" && language !== "english") {
          return NextResponse.json(
            { success: false, error: "Shorts verticais do Digital Maker AI são aceitos somente em inglês." },
            { status: 400 }
          );
        }
      }

      const args: JsonRecord = {
        ...(topic ? { topic } : {}),
        ...(script ? { script } : {}),
        orientation,
        format,
      };

      if (script) {
        const words = script.split(/\s+/).filter(Boolean).length;
        if (words < 40) {
          return NextResponse.json(
            { success: false, error: "O roteiro próprio precisa conter pelo menos 40 palavras." },
            { status: 400 }
          );
        }
        if (format === "single") {
          return NextResponse.json(
            { success: false, error: "Roteiro próprio não é aceito no formato Single Scene. Use Multi Scene ou Whiteboard." },
            { status: 400 }
          );
        }
      }

      if (format === "single") {
        const imageUrl = getString(body.singleImageUrl, 2000);
        const faceSide = body.faceSide === "right" ? "right" : "left";
        if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
          return NextResponse.json(
            { success: false, error: "Gere e aprove a imagem prévia antes de criar um vídeo Single Scene." },
            { status: 400 }
          );
        }
        args.single_image_url = imageUrl;
        args.face_side = faceSide;
      }

      if (format === "whiteboard") {
        const hand = getString(body.whiteboardHand, 20);
        if (!["none", "light", "brown", "dark"].includes(hand)) {
          return NextResponse.json(
            { success: false, error: "Escolha a opção de mão do Whiteboard (incluindo 'sem mão') antes de continuar." },
            { status: 400 }
          );
        }
        args.whiteboard_hand = hand;
      }

      if (orientation === "vertical") {
        const duration = Number(body.durationSeconds);
        if (![15, 30, 45, 60].includes(duration)) {
          return NextResponse.json(
            { success: false, error: "Shorts precisam ter 15, 30, 45 ou 60 segundos." },
            { status: 400 }
          );
        }
        args.duration_seconds = duration;
      } else if (!script) {
        const duration = Number(body.durationMinutes);
        if (!Number.isInteger(duration) || duration < 1 || duration > 60) {
          return NextResponse.json(
            { success: false, error: "A duração horizontal deve ser de 1 a 60 minutos." },
            { status: 400 }
          );
        }
        args.duration_minutes = duration;
      }

      const result = await digitalMakerCall("create_video", args);
      return NextResponse.json({ success: true, action, result });
    }

    if (action === "checkVideo") {
      const jobId = getString(body.jobId, 160);
      if (!jobId) {
        return NextResponse.json(
          { success: false, error: "Informe o ID do job de vídeo." },
          { status: 400 }
        );
      }
      const result = await digitalMakerCall("check_video", { job_id: jobId });
      return NextResponse.json({ success: true, action, result });
    }

    if (action === "generateImage") {
      const prompt = getString(body.prompt, 1400);
      const imageType = getString(body.imageType, 40);
      const allowedTypes = ["youtube_thumbnail", "youtube_banner", "logo", "mockup"];
      if (!prompt || !allowedTypes.includes(imageType)) {
        return NextResponse.json(
          { success: false, error: "Informe a descrição e um tipo de imagem válido." },
          { status: 400 }
        );
      }
      const result = await digitalMakerCall("generate_image", {
        prompt,
        image_type: imageType,
      });
      return NextResponse.json({ success: true, action, result });
    }

    if (action === "findChannels") {
      const niche = getString(body.niche, 160);
      if (!niche) {
        return NextResponse.json(
          { success: false, error: "Informe um nicho para pesquisar canais." },
          { status: 400 }
        );
      }
      const limit = Math.min(50, Math.max(1, Math.floor(Number(body.limit) || 10)));
      const result = await digitalMakerCall("find_faceless_channels", {
        niche,
        limit,
        sort_by: "revenue",
      });
      return NextResponse.json({ success: true, action, result });
    }

    if (action === "searchTrends") {
      const keyword = getString(body.keyword, 160);
      if (!keyword) {
        return NextResponse.json(
          { success: false, error: "Informe uma palavra-chave para pesquisar tendências." },
          { status: 400 }
        );
      }
      const result = await digitalMakerCall("search_trends", { keyword });
      return NextResponse.json({ success: true, action, result });
    }

    return NextResponse.json(
      { success: false, error: "Ação não reconhecida para Digital Maker AI." },
      { status: 400 }
    );
  } catch (error) {
    return jsonError(error);
  }
}
