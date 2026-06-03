'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import ReviewErrorFallback from '@/components/review/ReviewErrorFallback';

interface ReviewPageWrapperProps {
  children: React.ReactNode;
}

export default function ReviewPageWrapper({ children }: ReviewPageWrapperProps) {
  return (
    <ErrorBoundary
      fallback={<ReviewErrorFallback />}
      onError={(error, errorInfo) => {
        console.error('[ReviewPage Error]', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
