import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  const envVal = process.env.ADMIN_PASSWORD;
  const adminPassword = envVal && envVal.length > 0 ? envVal : "vetor-blog-admin-2026";

  if (password === adminPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
