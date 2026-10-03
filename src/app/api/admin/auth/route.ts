import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionCookie,
  isAdminAuthenticated,
} from "@/lib/admin-auth";

export async function GET(request: Request) {
  if (isAdminAuthenticated(request)) {
    return NextResponse.json({ authenticated: true }, { status: 200 });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}

export async function POST(request: Request) {
  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const envPassword = process.env.ADMIN_PASSWORD;

  if (!envPassword) {
    return NextResponse.json(
      { error: "Server misconfiguration: ADMIN_PASSWORD not set" },
      { status: 500 }
    );
  }

  if (!password || password !== envPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.set(createAdminSessionCookie(password));
  // Garante explicitamente o mesmo nome para facilitar auditoria/remoção futura.
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionCookie(password).value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
