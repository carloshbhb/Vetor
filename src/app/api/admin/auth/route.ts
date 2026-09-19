import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  const envPassword = process.env.ADMIN_PASSWORD;

  if (!envPassword) {
    return NextResponse.json({ error: "Server misconfiguration: ADMIN_PASSWORD not set" }, { status: 500 });
  }

  if (password === envPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
