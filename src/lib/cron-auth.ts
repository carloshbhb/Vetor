import { NextResponse } from "next/server";

export function verifyCronAuth(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return NextResponse.json(
      { error: "Server misconfiguration: CRON_SECRET not set" },
      { status: 500 }
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
