import { NextRequest, NextResponse } from 'next/server';
import { scanViralOutliers } from '@/lib/viral-scanner';
import { generateViralScript } from '@/lib/viral-script';
import { upsertScriptJob } from '@/lib/video-queue';
import { logger, recordMetric, createTimer } from '@/lib/monitor';
import { checkErrorRate } from '@/lib/alerts';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearerToken || req.nextUrl.searchParams.get('token');
  if (cronSecret && token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const timer = createTimer();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';

  try {
    await logger.info('Viral scan started', 'viral-scan');
    const scanResult = await scanViralOutliers({ maxResults: 10, minViewRatio: 10 });
    await logger.info('Outliers found', 'viral-scan', {
      total: scanResult.outliers.length,
      adaptations: scanResult.adaptationSuggestions.length,
    });

    let scriptsGenerated = 0;
    let jobsQueued = 0;
    const errors: string[] = [];

    for (const outlier of scanResult.outliers.slice(0, 5)) {
      try {
        const viralScript = await generateViralScript({
          outlier,
          siteUrl,
        });

        const slug = viralScript.script.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 80);

        const upsertResult = await upsertScriptJob({
          slug: `viral-${slug}`,
          product: outlier.adaptedAngle || outlier.title,
          status: 'script_ready',
          script: viralScript.script,
          render_engine: 'remotion',
          viralScore: viralScript.viralPotential,
          hookScore: viralScript.hookScore,
          source: 'viral',
        });

        if (upsertResult === 'created') {
          scriptsGenerated++;
          jobsQueued++;
        }

        await logger.info('Viral script generated', 'viral-scan', {
          outlier: outlier.title,
          hookScore: viralScript.hookScore,
          viralPotential: viralScript.viralPotential,
        });
      } catch (err: unknown) {
        const msg = `Failed for "${outlier.title}": ${err instanceof Error ? err.message : 'unknown'}`;
        errors.push(msg);
        await logger.warn('Viral script generation failed', 'viral-scan', { error: msg });
      }
    }

    const elapsedMs = timer.stop();
    await recordMetric({
      agentName: 'viral-scan',
      operation: 'full_cycle',
      durationMs: elapsedMs,
      success: true,
    });

    checkErrorRate('viral-scan').catch(() => {});

    return NextResponse.json({
      success: true,
      outliersFound: scanResult.outliers.length,
      scriptsGenerated,
      jobsQueued,
      topOutlier: scanResult.outliers[0]?.title || null,
      errors: errors.length > 0 ? errors : undefined,
      elapsedSeconds: Math.round(elapsedMs / 1000),
    });
  } catch (err: unknown) {
    const elapsedMs = timer.stop();
    const errorObj = err instanceof Error ? err : new Error(String(err));
    await logger.error('Viral scan failed', 'viral-scan', errorObj);
    await recordMetric({
      agentName: 'viral-scan',
      operation: 'full_cycle',
      durationMs: elapsedMs,
      success: false,
      errorMessage: errorObj.message,
    });
    checkErrorRate('viral-scan').catch(() => {});
    return NextResponse.json(
      { success: false, error: errorObj.message || 'Internal error' },
      { status: 500 }
    );
  }
}
