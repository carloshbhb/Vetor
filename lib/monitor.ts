// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Unified Monitoring System (Server + Client)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

export type LogLevel = 'info' | 'warning' | 'error' | 'critical';
export type ErrorType = 'client' | 'server' | 'agent';

export interface MonitorEvent {
  level: LogLevel;
  message: string;
  source: string;
  context?: Record<string, unknown>;
  error?: Error;
  timestamp: string;
}

export interface AgentMetric {
  agentName: string;
  operation: string;
  durationMs: number;
  success: boolean;
  provider?: string;
  tokenCount?: number;
  errorMessage?: string;
  timestamp: string;
}

// ─── Supabase Client ────────────────────────────────────────────────────────

let _supabase: SupabaseClient | null = null;
let _supabaseChecked = false;

function getSupabase(): SupabaseClient | null {
  if (_supabaseChecked) return _supabase;
  _supabaseChecked = true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    _supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  } else {
    _supabase = null;
  }

  return _supabase;
}

// ─── In-Memory Fallback ─────────────────────────────────────────────────────

const eventsMemory: MonitorEvent[] = [];
const metricsMemory: AgentMetric[] = [];
const MAX_EVENTS = 2000;
const MAX_METRICS = 5000;

// ─── Core Logging Functions ─────────────────────────────────────────────────

/**
 * Log an event to Supabase and optionally to GlitchTip/Sentry
 */
export async function logEvent(
  level: LogLevel,
  message: string,
  source: string,
  context?: Record<string, unknown>,
  error?: Error
): Promise<void> {
  const event: MonitorEvent = {
    level,
    message,
    source,
    context,
    error,
    timestamp: new Date().toISOString(),
  };

  // Console output
  const prefix = `[${source.toUpperCase()}]`;
  switch (level) {
    case 'critical':
    case 'error':
      console.error(`${prefix} ${message}`, error || '', context || '');
      break;
    case 'warning':
      console.warn(`${prefix} ${message}`, context || '');
      break;
    default:
      console.log(`${prefix} ${message}`, context || '');
  }

  // Save to Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error: insertError } = await supabase
        .from('error_logs')
        .insert({
          message: `${message}${error ? `: ${error.message}` : ''}`,
          stack: error?.stack,
          url: context?.url as string || source,
          timestamp: event.timestamp,
          type: 'server',
          severity: level === 'critical' ? 'error' : level,
        });

      if (insertError) {
        console.error('[Monitor] Failed to save event to Supabase:', insertError);
      }
    } catch (err) {
      console.error('[Monitor] Supabase error:', err);
    }
  }

  // Fallback to memory
  eventsMemory.unshift(event);
  if (eventsMemory.length > MAX_EVENTS) eventsMemory.pop();

  // Send to GlitchTip/Sentry if available (server-side)
  if (error && typeof globalThis !== 'undefined') {
    sendToGlitchTip(error, { source, level, ...context });
  }
}

/**
 * Record an agent performance metric
 */
export async function recordMetric(metric: Omit<AgentMetric, 'timestamp'>): Promise<void> {
  const fullMetric: AgentMetric = {
    ...metric,
    timestamp: new Date().toISOString(),
  };

  // Console output
  const status = metric.success ? '✅' : '❌';
  const duration = `${metric.durationMs}ms`;
  console.log(
    `[Metric] ${status} ${metric.agentName}.${metric.operation} ${duration}` +
    (metric.provider ? ` (${metric.provider})` : '') +
    (metric.errorMessage ? ` - ${metric.errorMessage}` : '')
  );

  // Save to Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('agent_metrics')
        .insert({
          agent_name: metric.agentName,
          operation: metric.operation,
          duration_ms: metric.durationMs,
          success: metric.success,
          provider: metric.provider,
          token_count: metric.tokenCount,
          error_message: metric.errorMessage,
          timestamp: fullMetric.timestamp,
        });

      if (error) {
        console.error('[Monitor] Failed to save metric to Supabase:', error);
      }
    } catch (err) {
      console.error('[Monitor] Supabase metric error:', err);
    }
  }

  // Fallback to memory
  metricsMemory.unshift(fullMetric);
  if (metricsMemory.length > MAX_METRICS) metricsMemory.pop();
}

// ─── Convenience Functions ──────────────────────────────────────────────────

export const logger = {
  info: (message: string, source: string, context?: Record<string, unknown>) =>
    logEvent('info', message, source, context),

  warn: (message: string, source: string, context?: Record<string, unknown>) =>
    logEvent('warning', message, source, context),

  error: (message: string, source: string, error?: Error, context?: Record<string, unknown>) =>
    logEvent('error', message, source, context, error),

  critical: (message: string, source: string, error?: Error, context?: Record<string, unknown>) =>
    logEvent('critical', message, source, context, error),
};

/**
 * Create a timer for measuring operation duration
 */
export function createTimer() {
  const start = Date.now();
  return {
    stop: () => Date.now() - start,
  };
}

// ─── GlitchTip/Sentry Server-Side Integration ───────────────────────────────

interface GlitchTipError {
  message: string;
  stack?: string;
  source?: string;
  level?: string;
  extra?: Record<string, unknown>;
}

/**
 * Send error to GlitchTip/Sentry via their HTTP API
 * This works server-side without needing the browser SDK
 */
async function sendToGlitchTip(error: Error, context?: Record<string, unknown>): Promise<void> {
  const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN || process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    // Parse DSN: https://examplePublicKey@o0.ingest.sentry.io/0
    const url = new URL(dsn);
    const projectId = url.pathname.replace('/', '');
    const apiUrl = `${url.protocol}//${url.host}/api/${projectId}/store/`;

    const payload: GlitchTipError = {
      message: error.message,
      stack: error.stack,
      source: context?.source as string,
      level: context?.level as string,
      extra: context,
    };

    // Use basic auth if DSN contains credentials
    const authHeader = url.username
      ? `Basic ${Buffer.from(`${url.username}:${url.password || ''}`).toString('base64')}`
      : undefined;

    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silently fail - monitoring should never break the app
  }
}

// ─── Query Functions ────────────────────────────────────────────────────────

/**
 * Get recent events from memory or Supabase
 */
export async function getRecentEvents(limit: number = 50): Promise<MonitorEvent[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(row => ({
        level: row.severity as LogLevel,
        message: row.message,
        source: row.url || 'unknown',
        timestamp: row.timestamp,
      }));
    } catch (err) {
      console.error('[Monitor] Failed to fetch events:', err);
    }
  }

  return eventsMemory.slice(0, limit);
}

/**
 * Get agent metrics from memory or Supabase
 */
export async function getAgentMetrics(limit: number = 100): Promise<AgentMetric[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('agent_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(row => ({
        agentName: row.agent_name,
        operation: row.operation,
        durationMs: row.duration_ms,
        success: row.success,
        provider: row.provider,
        tokenCount: row.token_count,
        errorMessage: row.error_message,
        timestamp: row.timestamp,
      }));
    } catch (err) {
      console.error('[Monitor] Failed to fetch metrics:', err);
    }
  }

  return metricsMemory.slice(0, limit);
}

/**
 * Get aggregated metrics for an agent
 */
export async function getAgentStats(agentName: string): Promise<{
  totalRuns: number;
  successRate: number;
  avgDurationMs: number;
  lastRun?: AgentMetric;
}> {
  const metrics = await getAgentMetrics(500);
  const agentMetrics = metrics.filter(m => m.agentName === agentName);

  if (agentMetrics.length === 0) {
    return { totalRuns: 0, successRate: 0, avgDurationMs: 0 };
  }

  const successful = agentMetrics.filter(m => m.success).length;
  const totalDuration = agentMetrics.reduce((sum, m) => sum + m.durationMs, 0);

  return {
    totalRuns: agentMetrics.length,
    successRate: successful / agentMetrics.length,
    avgDurationMs: totalDuration / agentMetrics.length,
    lastRun: agentMetrics[0],
  };
}
