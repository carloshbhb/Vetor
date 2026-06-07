import { NextResponse } from 'next/server';
import { getAgentMetrics, getAgentStats, getRecentEvents } from '@/lib/monitor';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [metrics, events, autonomousStats, serpStats] = await Promise.all([
      getAgentMetrics(100),
      getRecentEvents(50),
      getAgentStats('autonomous-agent'),
      getAgentStats('serp-tracker'),
    ]);

    // Calculate aggregate stats
    const totalRuns = autonomousStats.totalRuns + serpStats.totalRuns;
    const successRate = totalRuns > 0
      ? ((autonomousStats.totalRuns * autonomousStats.successRate) +
         (serpStats.totalRuns * serpStats.successRate)) / totalRuns
      : 0;
    const avgDuration = totalRuns > 0
      ? ((autonomousStats.totalRuns * autonomousStats.avgDurationMs) +
         (serpStats.totalRuns * serpStats.avgDurationMs)) / totalRuns
      : 0;

    // Group metrics by agent
    const byAgent: Record<string, { runs: number; successRate: number; avgDurationMs: number }> = {};
    for (const m of metrics) {
      if (!byAgent[m.agentName]) {
        byAgent[m.agentName] = { runs: 0, successRate: 0, avgDurationMs: 0 };
      }
      byAgent[m.agentName].runs++;
    }

    // Calculate success rates per agent
    for (const agent of Object.keys(byAgent)) {
      const agentMetrics = metrics.filter(m => m.agentName === agent);
      const successful = agentMetrics.filter(m => m.success).length;
      const totalDuration = agentMetrics.reduce((sum, m) => sum + m.durationMs, 0);
      byAgent[agent].successRate = agentMetrics.length > 0 ? successful / agentMetrics.length : 0;
      byAgent[agent].avgDurationMs = agentMetrics.length > 0 ? totalDuration / agentMetrics.length : 0;
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRuns,
        successRate: Math.round(successRate * 100),
        avgDurationMs: Math.round(avgDuration),
        autonomous: autonomousStats,
        serp: serpStats,
      },
      byAgent,
      recentMetrics: metrics.slice(0, 20),
      recentEvents: events.slice(0, 20),
    });
  } catch (error: any) {
    console.error('[Metrics API] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar métricas: ' + error.message },
      { status: 500 }
    );
  }
}
