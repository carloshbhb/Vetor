import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "vetor_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

function sessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.CRON_SECRET || null;
}

function sessionToken(password: string): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(password, "utf8").digest("hex");
}

function cookieValue(request: Request): string | null {
  const raw = request.headers.get("cookie") || "";
  const match = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(ADMIN_SESSION_COOKIE.length + 1)) : null;
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

export function createAdminSessionCookie(password: string) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: sessionToken(password) || "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function isAdminAuthenticated(request: Request): boolean {
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword) return false;

  const expectedSession = sessionToken(envPassword);
  if (!expectedSession) return false;

  const session = cookieValue(request);
  return Boolean(session && safeEqual(session, expectedSession));
}

export function verifyAdminAuth(request: Request): NextResponse | null {
  if (isAdminAuthenticated(request)) return null;
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Server misconfiguration: ADMIN_PASSWORD not set" },
      { status: 500 }
    );
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
