import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MercadoLivreNotification = {
  application_id?: string | number;
  applicationId?: string | number;
  app_id?: string | number;
  user_id?: string | number;
  userId?: string | number;
  topic?: string;
  _topic?: string;
  resource?: string;
  _resource?: string;
  attempts?: number | string;
  _attempts?: number | string;
  sent?: string;
  _sent?: string;
  received?: string;
  _received?: string;
  [key: string]: unknown;
};

function asNonEmptyString(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text && text.length <= maxLength ? text : null;
}

function validTimestamp(value: unknown): string | null {
  const text = asNonEmptyString(value, 100);
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function eventKey(input: {
  applicationId: string;
  userId: string | null;
  topic: string;
  resource: string;
  sentAt: string | null;
  sourceReceivedAt: string | null;
  requestId: string | null;
}) {
  const stable = [
    input.applicationId,
    input.userId || "",
    input.topic,
    input.resource,
    input.sentAt || input.sourceReceivedAt || input.requestId || "",
  ].join("|");
  return createHash("sha256").update(stable).digest("hex");
}

/**
 * Mercado Livre webhook callback.
 * Store the incoming event only; resource hydration and business processing
 * must run asynchronously from the persisted queue.
 */
export async function GET() {
  return NextResponse.json(
    { ok: true, service: "mercadolivre-notifications", accepts: ["POST"] },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 64 * 1024) {
    return NextResponse.json({ error: "Payload muito grande." }, { status: 413 });
  }

  let payload: MercadoLivreNotification;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
    }
    payload = body as MercadoLivreNotification;
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }

  const expectedApplicationId = process.env.ML_CLIENT_ID?.trim();
  if (!expectedApplicationId) {
    console.error("[ML notifications] ML_CLIENT_ID is not configured.");
    return NextResponse.json({ error: "Notificações não configuradas." }, { status: 503 });
  }

  const applicationId = asNonEmptyString(
    payload.application_id ?? payload.applicationId ?? payload.app_id,
    80
  );
  if (!applicationId || applicationId !== expectedApplicationId) {
    return NextResponse.json({ error: "Aplicação não reconhecida." }, { status: 403 });
  }

  const topic = asNonEmptyString(payload.topic ?? payload._topic, 120);
  const resource = asNonEmptyString(payload.resource ?? payload._resource, 1200);
  if (!topic || !/^[a-zA-Z0-9_:-]+$/.test(topic) || !resource || !resource.startsWith("/")) {
    return NextResponse.json({ error: "Notificação sem tópico ou recurso válidos." }, { status: 400 });
  }

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    console.error("[ML notifications] Supabase service client unavailable.");
    return NextResponse.json({ error: "Fila de notificações indisponível." }, { status: 503 });
  }

  const userId = asNonEmptyString(payload.user_id ?? payload.userId, 100);
  const sentAt = validTimestamp(payload.sent ?? payload._sent);
  const sourceReceivedAt = validTimestamp(payload.received ?? payload._received);
  const rawAttempts = Number(payload.attempts ?? payload._attempts ?? 1);
  const attempts = Number.isFinite(rawAttempts) ? Math.max(1, Math.min(1000, Math.trunc(rawAttempts))) : 1;
  const requestId = asNonEmptyString(request.headers.get("x-request-id"), 200);
  const dedupeKey = eventKey({
    applicationId,
    userId,
    topic,
    resource,
    sentAt,
    sourceReceivedAt,
    requestId,
  });

  const { error } = await supabase.from("ml_notification_events").upsert(
    {
      dedupe_key: dedupeKey,
      request_id: requestId,
      application_id: applicationId,
      user_id: userId,
      topic,
      resource,
      attempts,
      sent_at: sentAt,
      source_received_at: sourceReceivedAt,
      payload,
      status: "received",
      received_at: new Date().toISOString(),
    },
    { onConflict: "dedupe_key", ignoreDuplicates: true }
  );

  if (error) {
    console.error("[ML notifications] Failed to persist event:", error.message);
    return NextResponse.json({ error: "Não foi possível registrar a notificação." }, { status: 503 });
  }

  return NextResponse.json(
    { received: true },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
