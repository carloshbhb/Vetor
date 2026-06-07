// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Auto-Healing System
// ─────────────────────────────────────────────────────────────────────────────
// Detecta falhas recorrentes e aplica correções automáticas

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitor';

// ─── Types ──────────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
export type HealingAction = 'retry' | 'fallback' | 'circuit_break' | 'cooldown';

export interface HealthCheck {
  component: string;
  status: HealthStatus;
  lastCheck: string;
  consecutiveFailures: number;
  lastSuccess?: string;
  lastFailure?: string;
  action?: HealingAction;
}

export interface CircuitBreaker {
  component: string;
  isOpen: boolean;
  openedAt?: string;
  cooldownMs: number;
  failureCount: number;
  threshold: number;
}

// ─── State Management ───────────────────────────────────────────────────────

const circuitBreakers: Map<string, CircuitBreaker> = new Map();
const healthChecks: Map<string, HealthCheck> = new Map();

// ─── Configuration ──────────────────────────────────────────────────────────

interface AutoHealingConfig {
  failureThreshold: number;      // Consecutive failures to trigger healing
  cooldownMs: number;           // Cooldown after circuit break
  circuitBreakThreshold: number; // Failures to open circuit
  recoveryCheckIntervalMs: number;
}

const DEFAULT_CONFIG: AutoHealingConfig = {
  failureThreshold: 3,
  cooldownMs: 5 * 60 * 1000, // 5 minutes
  circuitBreakThreshold: 5,
  recoveryCheckIntervalMs: 60 * 1000, // 1 minute
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

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Record a success or failure for a component
 */
export async function recordHealthEvent(
  component: string,
  success: boolean,
  context?: Record<string, unknown>
): Promise<void> {
  const config = getConfig();
  const now = new Date();

  let health = healthChecks.get(component);
  if (!health) {
    health = {
      component,
      status: 'healthy',
      lastCheck: now.toISOString(),
      consecutiveFailures: 0,
    };
  }

  if (success) {
    // Reset failure count
    health.consecutiveFailures = 0;
    health.status = 'healthy';
    health.lastSuccess = now.toISOString();
    health.lastCheck = now.toISOString();
    health.action = undefined;

    // Close circuit breaker if open
    const breaker = circuitBreakers.get(component);
    if (breaker?.isOpen) {
      await logger.info(`Circuit breaker closed for ${component}`, 'auto-healing', {
        component,
        wasOpenFor: now.getTime() - new Date(breaker.openedAt!).getTime(),
      });
      circuitBreakers.set(component, {
        ...breaker,
        isOpen: false,
        openedAt: undefined,
        failureCount: 0,
      });
    }
  } else {
    // Increment failure count
    health.consecutiveFailures++;
    health.lastFailure = now.toISOString();
    health.lastCheck = now.toISOString();

    // Determine status and action
    if (health.consecutiveFailures >= config.circuitBreakThreshold) {
      health.status = 'unhealthy';
      health.action = 'circuit_break';
      await openCircuitBreaker(component);
    } else if (health.consecutiveFailures >= config.failureThreshold) {
      health.status = 'degraded';
      health.action = 'fallback';
      await logger.warn(`Component ${component} degraded, switching to fallback`, 'auto-healing', {
        component,
        consecutiveFailures: health.consecutiveFailures,
      });
    } else {
      health.status = 'healthy';
      health.action = 'retry';
    }
  }

  healthChecks.set(component, health);

  // Persist to Supabase
  await persistHealthCheck(health);
}

/**
 * Check if a component is healthy enough to use
 */
export function isComponentHealthy(component: string): boolean {
  const health = healthChecks.get(component);
  if (!health) return true; // Assume healthy if no data

  // Check circuit breaker
  const breaker = circuitBreakers.get(component);
  if (breaker?.isOpen) {
    const now = new Date();
    const openedAt = new Date(breaker.openedAt!);
    
    // Check if cooldown has passed
    if (now.getTime() - openedAt.getTime() >= breaker.cooldownMs) {
      // Allow a trial request
      return true;
    }
    return false;
  }

  return health.status !== 'unhealthy';
}

/**
 * Get the appropriate healing action for a component
 */
export function getHealingAction(component: string): HealingAction {
  const health = healthChecks.get(component);
  if (!health) return 'retry';

  return health.action || 'retry';
}

/**
 * Get health status for a component
 */
export function getHealthStatus(component: string): HealthCheck {
  return healthChecks.get(component) || {
    component,
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    consecutiveFailures: 0,
  };
}

/**
 * Get all health checks
 */
export function getAllHealthChecks(): HealthCheck[] {
  return Array.from(healthChecks.values());
}

// ─── Circuit Breaker ────────────────────────────────────────────────────────

async function openCircuitBreaker(component: string): Promise<void> {
  const config = getConfig();
  const now = new Date();

  circuitBreakers.set(component, {
    component,
    isOpen: true,
    openedAt: now.toISOString(),
    cooldownMs: config.cooldownMs,
    failureCount: config.circuitBreakThreshold,
    threshold: config.circuitBreakThreshold,
  });

  await logger.critical(`Circuit breaker opened for ${component}`, 'auto-healing', undefined, {
    component,
    cooldownMs: config.cooldownMs,
    action: 'All requests will be blocked until cooldown expires',
  });
}

/**
 * Check if circuit breaker is open
 */
export function isCircuitOpen(component: string): boolean {
  const breaker = circuitBreakers.get(component);
  if (!breaker?.isOpen) return false;

  const now = new Date();
  const openedAt = new Date(breaker.openedAt!);

  // Auto-close after cooldown
  if (now.getTime() - openedAt.getTime() >= breaker.cooldownMs) {
    circuitBreakers.set(component, {
      ...breaker,
      isOpen: false,
      openedAt: undefined,
    });
    return false;
  }

  return true;
}

// ─── Provider Fallback Logic ────────────────────────────────────────────────

const PROVIDER_FALLBACK_ORDER: Record<string, string[]> = {
  gemini: ['openrouter-deepseek', 'openrouter-llama', 'openrouter-gemma'],
  'openrouter-deepseek': ['openrouter-llama', 'openrouter-gemma', 'gemini'],
  'openrouter-llama': ['openrouter-gemma', 'gemini', 'openrouter-deepseek'],
  'openrouter-gemma': ['gemini', 'openrouter-deepseek', 'openrouter-llama'],
};

/**
 * Get next fallback provider
 */
export function getFallbackProvider(currentProvider: string): string | null {
  const fallbacks = PROVIDER_FALLBACK_ORDER[currentProvider];
  if (!fallbacks) return null;

  for (const fallback of fallbacks) {
    if (isComponentHealthy(`provider-${fallback}`)) {
      return fallback;
    }
  }

  return null; // All providers unhealthy
}

/**
 * Record provider health event
 */
export async function recordProviderHealth(
  provider: string,
  success: boolean,
  error?: string
): Promise<void> {
  await recordHealthEvent(`provider-${provider}`, success, { error });
}

// ─── Persistence ────────────────────────────────────────────────────────────

async function persistHealthCheck(health: HealthCheck): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.from('health_checks').upsert({
      component: health.component,
      status: health.status,
      last_check: health.lastCheck,
      consecutive_failures: health.consecutiveFailures,
      last_success: health.lastSuccess,
      last_failure: health.lastFailure,
      action: health.action,
    }, { onConflict: 'component' });
  } catch (error) {
    console.error('[Auto-Healing] Failed to persist health check:', error);
  }
}

/**
 * Get health check history
 */
export async function getHealthHistory(limit: number = 50): Promise<HealthCheck[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('health_checks')
      .select('*')
      .order('last_check', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(row => ({
      component: row.component,
      status: row.status,
      lastCheck: row.last_check,
      consecutiveFailures: row.consecutive_failures,
      lastSuccess: row.last_success,
      lastFailure: row.last_failure,
      action: row.action,
    }));
  } catch (error) {
    console.error('[Auto-Healing] Failed to fetch health history:', error);
    return [];
  }
}

// ─── Config ─────────────────────────────────────────────────────────────────

function getConfig(): AutoHealingConfig {
  return {
    failureThreshold: parseInt(process.env.AUTO_HEAL_FAILURE_THRESHOLD || '3'),
    cooldownMs: parseInt(process.env.AUTO_HEAL_COOLDOWN_MS || '300000'),
    circuitBreakThreshold: parseInt(process.env.AUTO_HEAL_CIRCUIT_THRESHOLD || '5'),
    recoveryCheckIntervalMs: parseInt(process.env.AUTO_HEAL_RECOVERY_INTERVAL || '60000'),
  };
}
