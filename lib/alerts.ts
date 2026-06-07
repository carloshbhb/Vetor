// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Alert System
// ─────────────────────────────────────────────────────────────────────────────
// Monitora taxa de erro e envia alertas quando threshold é excedido

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitor';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AlertSeverity = 'warning' | 'critical';
export type AlertChannel = 'email' | 'webhook' | 'log';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metrics: {
    totalRuns: number;
    failedRuns: number;
    errorRate: number;
    threshold: number;
  };
  agentName: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface AlertConfig {
  errorRateThreshold: number;    // Default: 0.20 (20%)
  minRunsForAlert: number;      // Minimum runs to calculate rate
  cooldownMs: number;           // Cooldown between alerts
  channels: AlertChannel[];
  webhookUrl?: string;
  emailRecipients?: string[];
}

// ─── Default Config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AlertConfig = {
  errorRateThreshold: 0.20,
  minRunsForAlert: 5,
  cooldownMs: 60 * 60 * 1000, // 1 hour
  channels: ['log'],
};

// ─── Supabase Client ────────────────────────────────────────────────────────

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    _supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }

  return _supabase;
}

// ─── Alert History (in-memory cooldown tracker) ──────────────────────────────

const alertCooldowns: Map<string, number> = new Map();

// ─── Core Alert Functions ───────────────────────────────────────────────────

/**
 * Check error rate and trigger alert if threshold exceeded
 */
export async function checkErrorRate(agentName: string): Promise<Alert | null> {
  const config = getAlertConfig();
  const supabase = getSupabase();

  if (!supabase) {
    await logger.warn('Supabase not available for alert check', 'alerts');
    return null;
  }

  try {
    // Get metrics from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: metrics, error } = await supabase
      .from('agent_metrics')
      .select('success')
      .eq('agent_name', agentName)
      .gte('timestamp', twentyFourHoursAgo);

    if (error) throw error;

    if (!metrics || metrics.length < config.minRunsForAlert) {
      return null; // Not enough data
    }

    const totalRuns = metrics.length;
    const failedRuns = metrics.filter(m => !m.success).length;
    const errorRate = failedRuns / totalRuns;

    // Check if error rate exceeds threshold
    if (errorRate >= config.errorRateThreshold) {
      // Check cooldown
      const lastAlert = alertCooldowns.get(agentName) || 0;
      if (Date.now() - lastAlert < config.cooldownMs) {
        return null; // Still in cooldown
      }

      // Create alert
      const alert = await createAlert({
        severity: errorRate >= 0.5 ? 'critical' : 'warning',
        title: `Alta taxa de erro no ${agentName}`,
        message: `${failedRuns}/${totalRuns} execuções falharam nas últimas 24h (${(errorRate * 100).toFixed(1)}%)`,
        metrics: {
          totalRuns,
          failedRuns,
          errorRate,
          threshold: config.errorRateThreshold,
        },
        agentName,
      });

      // Set cooldown
      alertCooldowns.set(agentName, Date.now());

      return alert;
    }

    return null;
  } catch (error: any) {
    await logger.error('Failed to check error rate', 'alerts', error, { agentName });
    return null;
  }
}

/**
 * Create and dispatch an alert
 */
async function createAlert(data: Omit<Alert, 'id' | 'createdAt' | 'acknowledged'>): Promise<Alert> {
  const alert: Alert = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date().toISOString(),
    acknowledged: false,
  };

  // Log the alert
  await logger[data.severity === 'critical' ? 'critical' : 'warn'](
    `ALERT: ${data.title}`,
    'alerts',
    undefined,
    {
      agentName: data.agentName,
      errorRate: data.metrics.errorRate,
      threshold: data.metrics.threshold,
    }
  );

  // Save to Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('alerts').insert({
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        agent_name: alert.agentName,
        metrics: alert.metrics,
        created_at: alert.createdAt,
        acknowledged: alert.acknowledged,
      });
    } catch (error) {
      console.error('[Alerts] Failed to save alert:', error);
    }
  }

  // Dispatch to configured channels
  const config = getAlertConfig();
  for (const channel of config.channels) {
    await dispatchAlert(alert, channel);
  }

  return alert;
}

/**
 * Dispatch alert to a specific channel
 */
async function dispatchAlert(alert: Alert, channel: AlertChannel): Promise<void> {
  switch (channel) {
    case 'log':
      // Already logged in createAlert
      break;

    case 'webhook':
      await sendWebhook(alert);
      break;

    case 'email':
      await sendEmail(alert);
      break;
  }
}

/**
 * Send alert via webhook (Slack, Discord, etc.)
 */
async function sendWebhook(alert: Alert): Promise<void> {
  const config = getAlertConfig();
  const webhookUrl = config.webhookUrl || process.env.ALERT_WEBHOOK_URL;

  if (!webhookUrl) return;

  try {
    const payload = {
      text: `🚨 ${alert.severity.toUpperCase()}: ${alert.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🚨 ${alert.severity === 'critical' ? 'CRÍTICO' : 'AVISO'}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alert.title}*\n${alert.message}`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Agent:*\n${alert.agentName}` },
            { type: 'mrkdwn', text: `*Taxa de Erro:*\n${(alert.metrics.errorRate * 100).toFixed(1)}%` },
            { type: 'mrkdwn', text: `*Total:*\n${alert.metrics.totalRuns} execuções` },
            { type: 'mrkdwn', text: `*Falhas:*\n${alert.metrics.failedRuns}` },
          ],
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('[Alerts] Webhook failed:', error);
  }
}

/**
 * Send alert via email (placeholder - integrate with Resend, SendGrid, etc.)
 */
async function sendEmail(alert: Alert): Promise<void> {
  // Placeholder for email integration
  // In production, integrate with:
  // - Resend (resend.com)
  // - SendGrid
  // - AWS SES
  console.log(`[Alerts] Email alert would be sent: ${alert.title}`);
}

// ─── Config ─────────────────────────────────────────────────────────────────

function getAlertConfig(): AlertConfig {
  return {
    errorRateThreshold: parseFloat(process.env.ALERT_ERROR_THRESHOLD || '0.20'),
    minRunsForAlert: parseInt(process.env.ALERT_MIN_RUNS || '5'),
    cooldownMs: parseInt(process.env.ALERT_COOLDOWN_MS || '3600000'),
    channels: (process.env.ALERT_CHANNELS || 'log').split(',') as AlertChannel[],
    webhookUrl: process.env.ALERT_WEBHOOK_URL,
    emailRecipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(','),
  };
}

// ─── Query Functions ────────────────────────────────────────────────────────

/**
 * Get recent alerts
 */
export async function getRecentAlerts(limit: number = 20): Promise<Alert[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      severity: row.severity,
      title: row.title,
      message: row.message,
      metrics: row.metrics,
      agentName: row.agent_name,
      createdAt: row.created_at,
      acknowledged: row.acknowledged,
    }));
  } catch (error) {
    console.error('[Alerts] Failed to fetch alerts:', error);
    return [];
  }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('alerts')
      .update({ acknowledged: true })
      .eq('id', alertId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[Alerts] Failed to acknowledge alert:', error);
    return false;
  }
}

/**
 * Get alert statistics
 */
export async function getAlertStats(): Promise<{
  total: number;
  unacknowledged: number;
  critical: number;
  warning: number;
}> {
  const supabase = getSupabase();
  if (!supabase) return { total: 0, unacknowledged: 0, critical: 0, warning: 0 };

  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('severity, acknowledged');

    if (error) throw error;

    const alerts = data || [];
    return {
      total: alerts.length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
    };
  } catch (error) {
    console.error('[Alerts] Failed to get stats:', error);
    return { total: 0, unacknowledged: 0, critical: 0, warning: 0 };
  }
}
