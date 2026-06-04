// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — GlitchTip Configuration (Sentry-compatible)
// ─────────────────────────────────────────────────────────────────────────────

// GlitchTip is a free, open-source error tracking tool compatible with Sentry's API
// Website: https://glitchtip.com

export const glitchtipConfig = {
  // DSN from environment variable (GlitchTip DSN)
  dsn: process.env.NEXT_PUBLIC_GLITCHTIP_DSN,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Tracing sample rate (1.0 = 100% of transactions)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Disable GlitchTip in development if no DSN
  enabled: !!process.env.NEXT_PUBLIC_GLITCHTIP_DSN,

  // beforeSend hook to filter sensitive data
  beforeSend: (event: GlitchTipEvent) => {
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

// Custom GlitchTip event types
interface GlitchTipEvent {
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
    window.Sentry.withScope((scope: GlitchTipScope) => {
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
      withScope: (callback: (scope: GlitchTipScope) => void) => void;
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

interface GlitchTipScope {
  setExtra: (key: string, value: unknown) => void;
  setTag: (key: string, value: string) => void;
  setUser: (user: { id?: string; email?: string; username?: string }) => void;
}