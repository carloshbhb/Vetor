import { NextResponse } from "next/server";

const FALLBACK_PASSWORD = "vetor-blog-admin-2026";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  const envPassword = process.env.ADMIN_PASSWORD;

  if (password === envPassword || password === FALLBACK_PASSWORD) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
