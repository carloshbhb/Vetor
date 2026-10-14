import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import {
  getPinterestConnectionInfo,
  publishDuePinterestPins,
  queuePublishedReviewPins,
} from "@/lib/pinterest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const connection = await getPinterestConnectionInfo();
    if (!connection.ready) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: connection.message,
      }, { status: 200 });
    }

    const queued = await queuePublishedReviewPins(10);
    const published = await publishDuePinterestPins(1);
    return NextResponse.json({
      success: true,
      queued: queued.queued,
      processed: published.processed,
      results: published.results,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no worker Pinterest.";
    console.error("[Pinterest cron] Worker failed:", message.slice(0, 250));
    return NextResponse.json({ success: false, error: message.slice(0, 250) }, { status: 500 });
  }
}
