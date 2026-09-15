import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  const envVal = process.env.ADMIN_PASSWORD;
  const fallback = "vetor-blog-admin-2026";
  const adminPassword = envVal && envVal.length > 0 ? envVal : fallback;

  return NextResponse.json({
    debug: {
      envExists: envVal !== undefined,
      envLength: envVal ? envVal.length : -1,
      receivedLength: password ? password.length : -1,
      match: password === adminPassword,
    },
  });
}
