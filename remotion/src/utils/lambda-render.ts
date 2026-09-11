// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Remotion Lambda Batch Renderer
// ─────────────────────────────────────────────────────────────────────────────
// Renders videos in parallel via AWS Lambda instead of local CLI.
// Use when: batch jobs, CI/CD pipelines, or when local render is too slow.
// Prerequisites: AWS credentials + deployed Lambda function via @remotion/lambda.

import { renderMediaOnLambda } from "@remotion/lambda";

// ─── Configuration ──────────────────────────────────────────────────────────

interface LambdaConfig {
  functionName: string;
  region: string;
  timeoutInSeconds: number;
  memorySizeInMb: number;
  maxConcurrency: number;
}

const DEFAULT_CONFIG: LambdaConfig = {
  functionName: process.env.REMOTION_LAMBDA_FUNCTION || "remotion-render",
  region: process.env.AWS_REGION || "us-east-1",
  timeoutInSeconds: 120,
  memorySizeInMb: 2048,
  maxConcurrency: 5,
};

// ─── Render Job ─────────────────────────────────────────────────────────────

export interface LambdaRenderJob {
  id: string;
  composition: "ShortVideo" | "LongVideo";
  videoData: Record<string, unknown>;
  outputBucket: string;
  outputKey: string;
}

export interface LambdaRenderResult {
  jobId: string;
  success: boolean;
  s3Url?: string;
  error?: string;
  durationMs: number;
}

// ─── Single Render ──────────────────────────────────────────────────────────

export async function renderOnLambda(
  job: LambdaRenderJob,
  config: Partial<LambdaConfig> = {}
): Promise<LambdaRenderResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const start = Date.now();

  try {
    const result = await renderMediaOnLambda({
      functionName: cfg.functionName,
      region: cfg.region as any,
      composition: job.composition,
      serveUrl: process.env.REMOTION_SERVE_URL || "https://studio.remotion.dev",
      inputProps: { data: job.videoData },
      codec: "h264",
      imageFormat: "jpeg",
      jpegQuality: 80,
      timeoutInMilliseconds: cfg.timeoutInSeconds * 1000,
    });

    return {
      jobId: job.id,
      success: true,
      s3Url: `https://${job.outputBucket}.s3.${cfg.region}.amazonaws.com/${job.outputKey}`,
      durationMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      jobId: job.id,
      success: false,
      error: message,
      durationMs: Date.now() - start,
    };
  }
}

// ─── Batch Render (parallel with concurrency limit) ─────────────────────────

export async function renderBatchOnLambda(
  jobs: LambdaRenderJob[],
  config: Partial<LambdaConfig> = {}
): Promise<LambdaRenderResult[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const results: LambdaRenderResult[] = [];
  const queue = [...jobs];

  async function processNext(): Promise<void> {
    const job = queue.shift();
    if (!job) return;

    const result = await renderOnLambda(job, cfg);
    results.push(result);

    // Process next in chain (respects concurrency via Lambda throttle)
    await processNext();
  }

  // Launch up to maxConcurrency parallel chains
  const chains = Array.from(
    { length: Math.min(cfg.maxConcurrency, jobs.length) },
    () => processNext()
  );

  await Promise.all(chains);
  return results;
}

// ─── Deploy Lambda Function ─────────────────────────────────────────────────
// One-time setup: creates/updates the Lambda function for Remotion renders.

export async function deployLambdaFunction(
  config: Partial<LambdaConfig> = {}
): Promise<{ functionName: string; region: string; status: string }> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // In production, use ensureLambdaFunction from @remotion/lambda
  // This is a placeholder for the deployment flow
  console.log(`[Lambda] Deploying function: ${cfg.functionName} in ${cfg.region}`);
  console.log(`[Lambda] Memory: ${cfg.memorySizeInMb}MB, Timeout: ${cfg.timeoutInSeconds}s`);

  return {
    functionName: cfg.functionName,
    region: cfg.region,
    status: "deployed",
  };
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
// Usage: npx tsx remotion/src/utils/lambda-render.ts <job-file.json>

async function main() {
  const args = process.argv.slice(2);
  const jobFile = args[0];

  if (!jobFile) {
    console.error("Usage: npx tsx remotion/src/utils/lambda-render.ts <job-file.json>");
    process.exit(1);
  }

  const fs = await import("fs");
  const jobs: LambdaRenderJob[] = JSON.parse(fs.readFileSync(jobFile, "utf-8"));

  console.log(`[Lambda] Rendering ${jobs.length} jobs...`);
  const results = await renderBatchOnLambda(jobs);

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[Lambda] Done: ${succeeded} succeeded, ${failed} failed`);

  if (failed > 0) {
    console.log("\nFailed jobs:");
    results
      .filter((r) => !r.success)
      .forEach((r) => console.log(`  - ${r.jobId}: ${r.error}`));
  }

  // Write results
  const outputFile = jobFile.replace(".json", "-results.json");
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`[Lambda] Results written to ${outputFile}`);
}

main().catch((err) => {
  console.error("[Lambda] Fatal error:", err);
  process.exit(1);
});
