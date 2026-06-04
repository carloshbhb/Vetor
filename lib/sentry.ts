// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Sentry Configuration
// ─────────────────────────────────────────────────────────────────────────────

// This file configures Sentry for error tracking and performance monitoring

export const sentryConfig = {
  // DSN from environment variable
  dsn: process.env.SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Tracing sample rate (1.0 = 100% of transactions)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay sample rate
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Disable Sentry in development if no DSN
  enabled: !!process.env.SENTRY_DSN,

  // beforeSend hook to filter sensitive data
  beforeSend: (event: SentryEvent) => {
    // Remove sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },
};

// Custom Sentry event types
interface SentryEvent {
  request?: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  };
  exception?: {
    values?: Array<{
      type: string;
      value: string;
      stacktrace?: {
        frames?: Array<{
          filename?: string;
          function?: string;
          lineno?: number;
          colno?: number;
        }>;
      };
    }>;
  };
  extra?: Record<string, unknown>;
}

// Helper to capture custom exceptions
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.withScope((scope: SentryScope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      window.Sentry.captureException(error);
    });
  }
}

// Helper to capture messages
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureMessage(message, level);
  }
}

// Helper to add breadcrumbs
export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.addBreadcrumb({
      category,
      message,
      data,
      level: 'info',
    });
  }
}

// Declare global types
declare global {
  interface Window {
    Sentry: {
      captureException: (error: Error) => void;
      captureMessage: (message: string, level: string) => void;
      withScope: (callback: (scope: SentryScope) => void) => void;
      addBreadcrumb: (breadcrumb: {
        category: string;
        message: string;
        data?: Record<string, unknown>;
        level: string;
      }) => void;
      showReportDialog?: (options: { eventId: string }) => void;
    };
  }
}

interface SentryScope {
  setExtra: (key: string, value: unknown) => void;
  setTag: (key: string, value: string) => void;
  setUser: (user: { id?: string; email?: string; username?: string }) => void;
}