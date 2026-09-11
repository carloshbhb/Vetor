import { NextRequest, NextResponse } from 'next/server';
import { scanTrendingProducts } from '@/lib/trend-scanner';
import { validateKeywords } from '@/lib/keyword-validator';
import { updateProductPool } from '@/lib/product-pool';
import { logger, recordMetric, createTimer } from '@/lib/monitor';
import { checkErrorRate } from '@/lib/alerts';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearerToken || req.nextUrl.searchParams.get('token');

  if (cronSecret && token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const timer = createTimer();

  try {
    await logger.info('Prospection scan started', 'prospection');
    const scanResult = await scanTrendingProducts({ maxResults: 20 });
    await logger.info('Trends scanned', 'prospection', {
      total: scanResult.trends.length,
      newProducts: scanResult.newProducts,
    });

    const validation = await validateKeywords(scanResult.trends);
    await logger.info('Keywords validated', 'prospection', {
      prioritize: validation.summary.prioritize,
      consider: validation.summary.consider,
      skip: validation.summary.skip,
    });

    const poolResult = await updateProductPool(validation.validated);
    await logger.info('Pool updated', 'prospection', {
      added: poolResult.added,
      removed: poolResult.removed,
      poolSize: poolResult.poolSize,
    });

    const elapsedMs = timer.stop();
    await recordMetric({
      agentName: 'prospection',
      operation: 'full_cycle',
      durationMs: elapsedMs,
      success: true,
    });

    checkErrorRate('prospection').catch(() => {});

    return NextResponse.json({
      success: true,
      trendsFound: scanResult.trends.length,
      keywordsValidated: validation.validated.length,
      poolAdded: poolResult.added,
      poolRemoved: poolResult.removed,
      poolSize: poolResult.poolSize,
      elapsedSeconds: Math.round(elapsedMs / 1000),
    });
  } catch (err: any) {
    const elapsedMs = timer.stop();
    await logger.error('Prospection failed', 'prospection', err);
    await recordMetric({
      agentName: 'prospection',
      operation: 'full_cycle',
      durationMs: elapsedMs,
      success: false,
      errorMessage: err?.message || 'Unknown error',
    });
    checkErrorRate('prospection').catch(() => {});
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
