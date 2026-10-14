import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "vetor_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

function sessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || null;
}

function sessionToken(password: string, expiresAt: number): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(`vetor-admin-session:${expiresAt}:${password}`, "utf8")
    .digest("hex");
}

function cookieValue(request: Request): string | null {
  const raw = request.headers.get("cookie") || "";
  const match = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(ADMIN_SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

export function createAdminSessionCookie(password: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const signature = sessionToken(password, expiresAt);
  return {
    name: ADMIN_SESSION_COOKIE,
    value: signature ? `${expiresAt}.${signature}` : "",
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

  const session = cookieValue(request);
  if (!session) return false;

  const separator = session.indexOf(".");
  if (separator <= 0) return false;
  const expiresAtRaw = session.slice(0, separator);
  if (!/^\d{10}$/.test(expiresAtRaw)) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;

  const expectedSession = sessionToken(envPassword, expiresAt);
  const signature = session.slice(separator + 1);
  return Boolean(expectedSession && signature && safeEqual(signature, expectedSession));
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
