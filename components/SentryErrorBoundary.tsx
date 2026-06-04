'use client';

import React from 'react';
import { captureException } from '@/lib/sentry';

interface SentryErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDialog?: boolean;
}

interface SentryErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export default class SentryErrorBoundary extends React.Component<
  SentryErrorBoundaryProps,
  SentryErrorBoundaryState
> {
  constructor(props: SentryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SentryErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Send error to Sentry
    captureException(error, {
      componentStack: errorInfo.componentStack,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Sentry ErrorBoundary]', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReportFeedback = () => {
    if (typeof window !== 'undefined' && window.Sentry && window.Sentry.showReportDialog) {
      // Open Sentry user feedback dialog
      const eventId = this.state.error?.message || 'unknown';
      window.Sentry.showReportDialog({ eventId });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[300px] flex items-center justify-center p-8 bg-red-50 rounded-xl border border-red-200">
          <div className="text-center max-w-md">
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-xl font-bold text-red-800 mb-2">
              Algo deu errado
            </h3>
            <p className="text-red-600 mb-6">
              Ocorreu um erro inesperado. Nossa equipe já foi notificada.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Tentar Novamente
              </button>
              {this.props.showDialog && (
                <button
                  onClick={this.handleReportFeedback}
                  className="px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Reportar Problema
                </button>
              )}
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-red-700 font-medium">
                  Detalhes do erro (desenvolvimento)
                </summary>
                <pre className="mt-2 p-4 bg-red-100 rounded-lg text-xs text-red-800 overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}