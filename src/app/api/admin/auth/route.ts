import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createAdminSessionCookie,
  isAdminAuthenticated,
} from "@/lib/admin-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

const RATE_LIMIT_SECONDS = 15 * 60;

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function clientAddress(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  // When x-real-ip is unavailable, use the last proxy-appended X-Forwarded-For entry.
  const forwarded = request.headers.get("x-forwarded-for");
  const lastForwarded = forwarded?.split(",").map((part) => part.trim()).filter(Boolean).at(-1);
  return lastForwarded || "unknown";
}

function rateLimitSubject(request: Request, secret: string): string {
  return createHmac("sha256", secret)
    .update("vetor-admin-login:")
    .update(clientAddress(request))
    .digest("hex");
}

function tooManyAttempts(retryAfter: number) {
  return NextResponse.json(
    { error: "Muitas tentativas de login. Aguarde antes de tentar novamente." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: Request) {
  if (isAdminAuthenticated(request)) {
    return NextResponse.json({ authenticated: true }, { status: 200 });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}

export async function POST(request: Request) {
  let body: { password?: unknown; action?: unknown } | null;
  try {
    const parsed: unknown = await request.json();
    body = parsed && typeof parsed === "object"
      ? parsed as { password?: unknown; action?: unknown }
      : null;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const action = typeof body?.action === "string" ? body.action : "";
  if (action === "logout") {
    const response = NextResponse.json({ success: true, action: "logout" }, { status: 200 });
    response.cookies.delete("vetor_admin_session");
    return response;
  }

  const password = body && typeof body.password === "string" ? body.password : "";
  const envPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || process.env.CRON_SECRET;

  if (!envPassword) {
    return NextResponse.json(
      { error: "Server misconfiguration: ADMIN_PASSWORD not set" },
      { status: 500 }
    );
  }

  if (!sessionSecret) {
    return NextResponse.json(
      { error: "Server misconfiguration: ADMIN_SESSION_SECRET or CRON_SECRET not set" },
      { status: 500 }
    );
  }

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Login rate limiter unavailable; configure the Supabase service role key." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const subjectHash = rateLimitSubject(request, sessionSecret);
  const { data: rateRecord, error: rateLookupError } = await supabase
    .from("admin_login_rate_limits")
    .select("blocked_until")
    .eq("subject_hash", subjectHash)
    .maybeSingle();

  if (rateLookupError) {
    console.error("[admin-auth] Rate-limit lookup failed:", rateLookupError.message);
    return NextResponse.json(
      { error: "Login protection is temporarily unavailable. Try again later." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const blockedUntil = rateRecord?.blocked_until ? Date.parse(rateRecord.blocked_until) : 0;
  if (Number.isFinite(blockedUntil) && blockedUntil > Date.now()) {
    return tooManyAttempts(Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000)));
  }

  if (!password || !constantTimeEqual(password, envPassword)) {
    const { error: recordError } = await supabase.rpc("record_admin_login_failure", {
      p_subject_hash: subjectHash,
    });

    if (recordError) {
      console.error("[admin-auth] Rate-limit update failed:", recordError.message);
      return NextResponse.json(
        { error: "Login protection is temporarily unavailable. Try again later." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // A correct password clears previous failures for this IP.
  const { error: clearError } = await supabase
    .from("admin_login_rate_limits")
    .delete()
    .eq("subject_hash", subjectHash);

  if (clearError) {
    console.error("[admin-auth] Could not clear rate-limit record:", clearError.message);
  }

  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.set(createAdminSessionCookie(password));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
