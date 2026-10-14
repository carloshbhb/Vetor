import { NextRequest, NextResponse } from "next/server";
import { POST as productionGenerationPost } from "../production-generation-test/route";

export const runtime = "nodejs";
export const maxDuration = 60;

// A separate CI route keeps deployment-race retries safe: older deployments lack
// this URL and return 404 without running the legacy generator.
export async function POST(request: NextRequest) {
  const body = await request.clone().json().catch(() => null);
  const isDeploymentInfo =
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    (body as { action?: unknown }).action === "deploymentInfo";

  if (!isDeploymentInfo) {
    const expectedCommit =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as { expectedCommit?: unknown }).expectedCommit
        : null;

    if (typeof expectedCommit !== "string" || !/^[0-9a-f]{40}$/i.test(expectedCommit)) {
      return NextResponse.json(
        { error: "expectedCommit SHA is required for this versioned endpoint." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  return productionGenerationPost(request);
}
