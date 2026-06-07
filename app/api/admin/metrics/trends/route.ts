import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range') || '24h';

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    let previousStartTime: Date;

    switch (range) {
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartTime = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartTime = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
      case '24h':
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousStartTime = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        break;
    }

    // Fetch metrics for current period
    const { data: currentMetrics } = await supabase
      .from('agent_metrics')
      .select('*')
      .gte('timestamp', startTime.toISOString())
      .order('timestamp', { ascending: true });

    // Fetch metrics for previous period
    const { data: previousMetrics } = await supabase
      .from('agent_metrics')
      .select('*')
      .gte('timestamp', previousStartTime.toISOString())
      .lt('timestamp', startTime.toISOString());

    // Calculate hourly stats (last 24 hours)
    const hourly: { hour: string; total: number; success: number; failed: number; avgDuration: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const hourStart = new Date(now);
      hourStart.setHours(h, 0, 0, 0);
      const hourEnd = new Date(now);
      hourEnd.setHours(h + 1, 0, 0, 0);

      const hourMetrics = (currentMetrics || []).filter(m => {
        const t = new Date(m.timestamp);
        return t >= hourStart && t < hourEnd;
      });

      const total = hourMetrics.length;
      const success = hourMetrics.filter(m => m.success).length;
      const failed = total - success;
      const avgDuration = total > 0 
        ? hourMetrics.reduce((sum, m) => sum + m.duration_ms, 0) / total 
        : 0;

      hourly.push({
        hour: `${h.toString().padStart(2, '0')}:00`,
        total,
        success,
        failed,
        avgDuration,
      });
    }

    // Calculate daily stats
    const daily: { date: string; total: number; successRate: number }[] = [];
    const daysInRange = range === '30d' ? 30 : range === '7d' ? 7 : 1;
    
    for (let d = 0; d < daysInRange; d++) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayMetrics = (currentMetrics || []).filter(m => {
        const t = new Date(m.timestamp);
        return t >= dayStart && t < dayEnd;
      });

      const total = dayMetrics.length;
      const success = dayMetrics.filter(m => m.success).length;
      const successRate = total > 0 ? (success / total) * 100 : 100;

      daily.push({
        date: dayStart.toISOString().split('T')[0],
        total,
        successRate,
      });
    }

    // Calculate comparison
    const currentStats = calculateStats(currentMetrics || []);
    const previousStats = calculateStats(previousMetrics || []);
    const change = previousStats.successRate > 0 
      ? ((currentStats.successRate - previousStats.successRate) / previousStats.successRate) * 100
      : 0;

    return NextResponse.json({
      hourly,
      daily: daily.reverse(),
      comparison: {
        period1: previousStats,
        period2: currentStats,
        change,
      },
    });
  } catch (error: any) {
    console.error('[Metrics Trends] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar tendências: ' + error.message },
      { status: 500 }
    );
  }
}

function calculateStats(metrics: any[]): { successRate: number; avgDuration: number } {
  if (metrics.length === 0) {
    return { successRate: 100, avgDuration: 0 };
  }

  const success = metrics.filter(m => m.success).length;
  const successRate = (success / metrics.length) * 100;
  const avgDuration = metrics.reduce((sum, m) => sum + m.duration_ms, 0) / metrics.length;

  return { successRate, avgDuration };
}
