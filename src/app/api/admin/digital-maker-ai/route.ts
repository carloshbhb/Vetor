import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { verifyCronAuth } from "@/lib/cron-auth";
import {
  DigitalMakerAIError,
  digitalMakerCall,
  digitalMakerListTools,
} from "@/lib/digital-maker-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type JsonRecord = Record<string, any>;

const PILOT_CHARACTER_NAME = "Vetor Stickman";
const PILOT_STYLE = "animated_cartoon";
const PILOT_PRODUCT = "Samsung Galaxy Fit3 Rosa Nude";
const PILOT_REVIEW_URL = "https://www.vetor.blog/reviews/samsung-galaxy-fit3-rosa-nude-review";

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

function authorize(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && request.headers.get("authorization") === "Bearer " + cronSecret) {
    return null;
  }
  return verifyAdminAuth(request);
}

function stringifySafe(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return String(value ?? "");
  }
}

function findValueByKey(value: unknown, keys: string[], depth = 0): unknown {
  if (depth > 10 || value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValueByKey(item, keys, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (typeof value !== "object") return undefined;
  const record = value as JsonRecord;
  for (const [key, item] of Object.entries(record)) {
    if (keys.some((candidate) => key.toLowerCase() === candidate.toLowerCase()) &&
        (typeof item === "string" || typeof item === "number" || typeof item === "boolean")) {
      return item;
    }
  }
  for (const item of Object.values(record)) {
    const found = findValueByKey(item, keys, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function findNumberByKeyPattern(value: unknown, pattern: RegExp, depth = 0): number | null {
  if (depth > 10 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNumberByKeyPattern(item, pattern, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  for (const [key, item] of Object.entries(value as JsonRecord)) {
    if (pattern.test(key) && typeof item === "number" && Number.isFinite(item)) return item;
  }
  for (const item of Object.values(value as JsonRecord)) {
    const found = findNumberByKeyPattern(item, pattern, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

function findStringByKeyPattern(value: unknown, pattern: RegExp, depth = 0): string {
  if (depth > 10 || value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKeyPattern(item, pattern, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value !== "object") return "";
  const record = value as JsonRecord;
  for (const [key, item] of Object.entries(record)) {
    if (pattern.test(key) && (typeof item === "string" || typeof item === "number")) {
      return String(item);
    }
  }
  for (const item of Object.values(record)) {
    const found = findStringByKeyPattern(item, pattern, depth + 1);
    if (found) return found;
  }
  return "";
}

function findPlanName(value: unknown): string {
  const byKey = findStringByKeyPattern(value, /plan|subscription|tier/i);
  const candidates = collectStrings(value).map((item) => item.trim()).filter(Boolean);
  const exact = candidates.find((item) =>
    /^(?:free|pro|premium|ultimate)(?:\\s+(?:plan|subscription))?$/i.test(item)
  );
  const matched = (exact || byKey).match(/\\b(premium|ultimate|pro|free)\\b/i);
  return matched ? matched[1].toLowerCase() : "";
}

function getAccountSummary(value: unknown): JsonRecord {
  const topLevelKeys = value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value as JsonRecord)
    : [];
  return {
    plan: findPlanName(value) || null,
    minutesRemaining: findNumberByKeyPattern(
      value,
      /(?:video.*minutes?.*(?:remaining|left|available)|minutes?.*(?:remaining|left|available)|(?:remaining|left|available).*minutes?|pool.*minutes?)/i
    ),
    topLevelKeys,
  };
}

function findJobId(value: unknown, depth = 0): string {
  if (depth > 10 || value === null || value === undefined) return "";
  if (typeof value === "string") {
    try {
      return findJobId(JSON.parse(value), depth + 1);
    } catch {
      return "";
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobId(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value !== "object") return "";
  const record = value as JsonRecord;
  for (const key of ["job_id", "jobId", "video_id", "videoId"]) {
    if (typeof record[key] === "string" && record[key].trim()) {
      return record[key].trim();
    }
  }
  for (const key of ["result", "structuredContent", "data", "content", "output", "video"]) {
    const found = findJobId(record[key], depth + 1);
    if (found) return found;
  }
  return "";
}

function collectStrings(value: unknown, depth = 0): string[] {
  if (depth > 8 || value === null || value === undefined) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item, depth + 1));
  if (typeof value !== "object") return [];
  return Object.entries(value as JsonRecord).flatMap(([key, item]) => [
    key,
    ...collectStrings(item, depth + 1),
  ]);
}

function findPortugueseLanguage(options: unknown): string | null {
  const values = collectStrings(options);
  const candidate = values.find((value) => /^(?:portuguese(?:\\s*\\([^)]*\\))?|português(?:\\s*\\([^)]*\\))?|pt(?:[-_]br)?)$/i.test(value.trim()));
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (/^portugu/i.test(trimmed)) return "Portuguese";
  if (/^pt[-_]br$/i.test(trimmed)) return trimmed.replace("_", "-");
  return "pt";
}

function findExistingCharacter(value: unknown, name: string, depth = 0): JsonRecord | null {
  if (depth > 10 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findExistingCharacter(item, name, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const record = value as JsonRecord;
  const candidateName = String(record.name || record.character_name || "").trim();
  if (candidateName.toLowerCase() === name.toLowerCase()) return record;
  for (const item of Object.values(record)) {
    const found = findExistingCharacter(item, name, depth + 1);
    if (found) return found;
  }
  return null;
}

function findImageUrl(value: unknown, depth = 0): string {
  if (depth > 10 || value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageUrl(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value !== "object") return "";
  const record = value as JsonRecord;
  for (const key of ["image_url", "imageUrl", "url", "image"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && /^https:\/\//i.test(candidate)) return candidate;
  }
  for (const item of Object.values(record)) {
    const found = findImageUrl(item, depth + 1);
    if (found) return found;
  }
  return "";
}

function findTool(tools: JsonRecord[], name: string): JsonRecord | undefined {
  return tools.find((tool) => String(tool.name || "").toLowerCase() === name.toLowerCase());
}

function getToolPropertyNames(tool: JsonRecord | undefined): string[] {
  const schema = tool?.inputSchema as JsonRecord | undefined;
  const properties = schema?.properties as JsonRecord | undefined;
  return properties ? Object.keys(properties) : [];
}

async function ensurePilotCharacter(tools: JsonRecord[], characterList: unknown) {
  const existing = findExistingCharacter(characterList, PILOT_CHARACTER_NAME);
  if (existing) {
    const existingStyle = String(existing.style || existing.style_preset || "").trim();
    if (existingStyle && existingStyle !== PILOT_STYLE) {
      throw new DigitalMakerAIError(
        "Já existe um personagem chamado Vetor Stickman no estilo " + existingStyle +
        ". Para não usar uma identidade visual incompatível nem criar outro personagem cobrado, o piloto foi interrompido.",
        409
      );
    }
    return {
      name: PILOT_CHARACTER_NAME,
      created: false,
      style: existingStyle || PILOT_STYLE,
      imageUrl: findImageUrl(existing),
      result: existing,
    };
  }

  const description = [
    "A friendly recurring stickman mascot for a Brazilian technology review channel.",
    "Full-body minimalist 2D vector cartoon, head to feet, standing upright on a plain white background.",
    "A large simple white circular head with a thick dark-navy outline, tiny expressive black eyes and a curved friendly mouth.",
    "Thin flexible dark-navy line arms and legs, clear readable hands, simple white torso with a small cobalt-blue Vetor badge and one bright-blue wrist accent.",
    "No realistic anatomy, no detailed facial features, no hair, no gradients on the character, no text, no props, no extra people.",
    "Very clean high-contrast flat illustration, playful and expressive, consistent proportions, suitable for pointing at product details and reacting to pros and cons.",
  ].join(" ");

  const createCharacterTool = findTool(tools, "create_character");
  if (createCharacterTool) {
    const result = await digitalMakerCall("create_character", {
      name: PILOT_CHARACTER_NAME,
      style: PILOT_STYLE,
      description,
    });
    return {
      name: PILOT_CHARACTER_NAME,
      created: true,
      style: PILOT_STYLE,
      imageUrl: findImageUrl(result),
      result,
    };
  }

  const drawTool = findTool(tools, "draw_character");
  const saveTool = findTool(tools, "save_character");
  if (drawTool && saveTool) {
    const drawKeys = getToolPropertyNames(drawTool);
    const drawArgs: JsonRecord = {};
    if (drawKeys.includes("description")) drawArgs.description = description;
    if (drawKeys.includes("style")) drawArgs.style = PILOT_STYLE;
    if (drawKeys.includes("style_preset")) drawArgs.style_preset = PILOT_STYLE;
    const draft = await digitalMakerCall("draw_character", drawArgs);

    const saveKeys = getToolPropertyNames(saveTool);
    const saveArgs: JsonRecord = {};
    if (saveKeys.includes("name")) saveArgs.name = PILOT_CHARACTER_NAME;
    if (saveKeys.includes("image_url")) {
      const imageUrl = findImageUrl(draft);
      if (imageUrl) saveArgs.image_url = imageUrl;
    }
    if (saveKeys.includes("style")) saveArgs.style = PILOT_STYLE;
    const saved = await digitalMakerCall("save_character", saveArgs);
    return {
      name: PILOT_CHARACTER_NAME,
      created: true,
      style: PILOT_STYLE,
      imageUrl: findImageUrl(saved) || findImageUrl(draft),
      result: { draft, saved },
    };
  }

  throw new DigitalMakerAIError(
    "A conta Digital Maker AI não anunciou a ferramenta de criação de personagem reutilizável. Nenhum vídeo foi iniciado.",
    403
  );
}

const PILOT_SCRIPT_PT = [
  "Esta é a Samsung Galaxy Fit3 Rosa Nude: uma smartband com corpo de alumínio e tela AMOLED de 1,6 polegada.",
  "A resolução de 256 por 402 pixels deixa notificações e informações de treino mais fáceis de consultar.",
  "A Samsung informa até 13 dias de bateria; o review do Vetor relata cerca de 10 a 12 dias em uso moderado.",
  "A pulseira acompanha frequência cardíaca, oxigênio no sangue, passos e sono.",
  "A resistência 5 ATM e IP68 acrescenta proteção para a rotina e para atividades na piscina.",
  "Mas existem limitações importantes: ela não tem GPS próprio, então é preciso levar o celular para registrar rotas ao ar livre.",
  "Também não oferece NFC para pagamentos por aproximação.",
  "A experiência é mais completa com Android, especialmente junto aos recursos do ecossistema Samsung.",
  "O veredito do Vetor é 9,2 de 10: uma boa escolha para quem valoriza tela, conforto, construção e autonomia.",
  "Não é a opção ideal para quem exige GPS independente ou pagamentos por aproximação no pulso.",
  "Consulte o review completo do Vetor e confira o preço e as condições atuais antes de comprar."
].join(" ");

const PILOT_SCRIPT_EN = [
  "Meet the Samsung Galaxy Fit3 Rosa Nude, a smart band with an aluminium body and a 1.6-inch AMOLED display.",
  "Its 256 by 402 resolution makes notifications and workout information easier to read.",
  "Samsung rates the battery for up to 13 days; the Vetor review reports around 10 to 12 days with moderate use.",
  "The band tracks heart rate, blood oxygen, steps and sleep.",
  "Its 5 ATM and IP68 ratings add protection for everyday routines and pool activities.",
  "But there are important trade-offs: it has no built-in GPS, so you still need your phone to record outdoor routes.",
  "It also lacks NFC contactless payments.",
  "The experience is strongest with Android, especially alongside Samsung's ecosystem features.",
  "Vetor's verdict is 9.2 out of 10: a strong choice for people who value the display, comfort, build and battery life.",
  "It is not the right pick for anyone who needs independent GPS or payments directly from the wrist.",
  "Read the full Vetor review and check today's price and seller terms before buying."
].join(" ");

async function runStickmanPilot() {
  const tools = await digitalMakerListTools();
  const account = await digitalMakerCall("get_account");
  const options = await digitalMakerCall("list_video_options");
  const characterList = await digitalMakerCall("list_characters");
  const latestVideo = await digitalMakerCall("check_video", {}).catch(() => null);

  const activeStatus = String(findValueByKey(latestVideo, ["status", "state"]) || "").toLowerCase();
  if (["processing", "pending", "queued", "generating", "rendering", "in_progress", "running", "started"].includes(activeStatus)) {
    return {
      success: false,
      blocked: "active_job",
      account,
      latestVideo,
      message: "Já existe um vídeo em processamento na conta Digital Maker AI. O piloto não foi duplicado.",
    };
  }

  const accountInfo = getAccountSummary(account);
  const plan = String(accountInfo.plan || "");
  const remainingMinutes = typeof accountInfo.minutesRemaining === "number"
    ? accountInfo.minutesRemaining
    : null;

  if (!plan) {
    throw new DigitalMakerAIError(
      "Digital Maker AI respondeu à consulta da conta, mas não foi possível identificar o plano. Campos retornados: " +
        (Array.isArray(accountInfo.topLevelKeys) ? accountInfo.topLevelKeys.join(", ") : "nenhum") +
        ". Nenhum personagem ou vídeo foi criado.",
      403
    );
  }

  const portugueseLanguage = findPortugueseLanguage(options);
  const language = portugueseLanguage || "en";
  const script = portugueseLanguage ? PILOT_SCRIPT_PT : PILOT_SCRIPT_EN;

  if (plan === "pro") {
    const character = await ensurePilotCharacter(tools, characterList);
    return {
      success: true,
      blocked: "video_plan",
      pilot: "stickman-review-galaxy-fit3",
      product: PILOT_PRODUCT,
      reviewUrl: PILOT_REVIEW_URL,
      account: accountInfo,
      language,
      character,
      message: "Personagem salvo. O plano Pro permite personagens, mas a geração de vídeos exige Premium ou Ultimate. Nenhum minuto de vídeo foi consumido.",
      costNote: "Foi usada uma imagem para criar o personagem; nenhum minuto de vídeo foi consumido.",
    };
  }

  if (!["premium", "ultimate"].includes(plan)) {
    throw new DigitalMakerAIError(
      "O plano " + plan + " não permite esta criação. Nenhum crédito foi consumido.",
      403
    );
  }

  if (remainingMinutes === null || remainingMinutes < 1) {
    throw new DigitalMakerAIError(
      remainingMinutes === null
        ? "Não foi possível confirmar a franquia de minutos antes de iniciar o piloto. Nenhum crédito foi consumido."
        : "A conta não tem pelo menos 1 minuto de vídeo disponível. Nenhum crédito foi consumido.",
      402
    );
  }

  const character = await ensurePilotCharacter(tools, characterList);

  const createVideoTool = findTool(tools, "create_video");
  if (!createVideoTool) {
    throw new DigitalMakerAIError(
      "O servidor não anunciou create_video. O personagem foi salvo, mas nenhum vídeo foi iniciado.",
      403
    );
  }

  const videoArgs: JsonRecord = {
    topic: "Samsung Galaxy Fit3 Rosa Nude: tela AMOLED, autonomia, sensores e limitações práticas",
    script,
    format: "multi",
    orientation: "landscape",
    language,
    style_preset: PILOT_STYLE,
    character: PILOT_CHARACTER_NAME,
    character_share: 1,
    motion: true,
    subtitle_style: "clean",
  };

  const videoResult = await digitalMakerCall("create_video", videoArgs);
  const jobId = findJobId(videoResult);
  return {
    success: true,
    pilot: "stickman-review-galaxy-fit3",
    product: PILOT_PRODUCT,
    reviewUrl: PILOT_REVIEW_URL,
    account: {
      plan,
      remainingMinutes,
    },
    language,
    providerStyle: "multi-scene still images with a recurring saved character and Ken Burns camera motion",
    character,
    videoArgs,
    videoResult,
    jobId,
    costNote: "A criação do personagem consome 1 imagem da franquia. O vídeo consome os minutos correspondentes à duração final do roteiro. Nenhum pacote adicional será comprado.",
  };
}

export async function GET(request: NextRequest) {
  const authError = authorize(request);
  if (authError) return authError;

  if (request.nextUrl.searchParams.get("health") === "1") {
    const [account, tools] = await Promise.allSettled([
      digitalMakerCall("get_account"),
      digitalMakerListTools(),
    ]);
    const errors = {
      account: account.status === "rejected" ? getErrorMessage(account.reason) : null,
      tools: tools.status === "rejected" ? getErrorMessage(tools.reason) : null,
    };
    if (account.status === "rejected") {
      return NextResponse.json(
        { success: false, account: null, toolCount: 0, errors },
        { status: getErrorStatus(account.reason) }
      );
    }
    if (tools.status === "rejected") {
      return NextResponse.json(
        { success: false, account: account.value, toolCount: 0, errors },
        { status: getErrorStatus(tools.reason) }
      );
    }
    return NextResponse.json(
      {
        success: true,
        account: account.value,
        accountSummary: getAccountSummary(account.value),
        deploymentSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        toolCount: tools.value.length,
        errors,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const [account, options, creations, tools, characters] = await Promise.allSettled([
    digitalMakerCall("get_account"),
    digitalMakerCall("list_video_options"),
    digitalMakerCall("list_creations"),
    digitalMakerListTools(),
    digitalMakerCall("list_characters"),
  ]);

  const result: JsonRecord = {
    success: true,
    account: account.status === "fulfilled" ? account.value : null,
    videoOptions: options.status === "fulfilled" ? options.value : null,
    creations: creations.status === "fulfilled" ? creations.value : null,
    characters: characters.status === "fulfilled" ? characters.value : null,
    tools: tools.status === "fulfilled"
      ? tools.value.map((tool) => ({
          name: typeof tool.name === "string" ? tool.name : "",
          description: typeof tool.description === "string" ? tool.description : "",
          inputSchema: tool.inputSchema || null,
        }))
      : [],
    errors: {
      account: account.status === "rejected" ? getErrorMessage(account.reason) : null,
      videoOptions: options.status === "rejected" ? getErrorMessage(options.reason) : null,
      creations: creations.status === "rejected" ? getErrorMessage(creations.reason) : null,
      tools: tools.status === "rejected" ? getErrorMessage(tools.reason) : null,
      characters: characters.status === "rejected" ? getErrorMessage(characters.reason) : null,
    },
  };

  if (
    account.status === "rejected" &&
    options.status === "rejected" &&
    creations.status === "rejected" &&
    tools.status === "rejected" &&
    characters.status === "rejected"
  ) {
    return jsonError(account.reason);
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: NextRequest) {
  const authError = authorize(request);
  if (authError) return authError;

  try {
    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    const action = getString(body.action, 40);

    if (action === "runStickmanPilot") {
      const result = await runStickmanPilot();
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    if (action === "checkVideo") {
      const jobId = getString(body.jobId, 160);
      const result = await digitalMakerCall("check_video", jobId ? { video_id: jobId } : {});
      return NextResponse.json({ success: true, action, result });
    }

    if (action === "listVideoScenes") {
      const videoId = getString(body.videoId, 160);
      const result = await digitalMakerCall("list_video_scenes", videoId ? { video_id: videoId, count: 60 } : { count: 60 });
      return NextResponse.json({ success: true, action, result });
    }

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
