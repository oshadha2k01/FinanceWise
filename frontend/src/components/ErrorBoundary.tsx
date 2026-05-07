import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-rose-50 text-rose-900 rounded-xl p-8 border border-rose-200">
      <h2 className="text-lg font-bold mb-2">Oops! Something went wrong in this component.</h2>
      <pre className="text-sm bg-rose-100 p-4 rounded mb-4 overflow-auto max-w-full">
        {error.message}
      </pre>
      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-rose-600 text-white rounded hover:bg-rose-700 font-bold"
      >
        Try Again
      </button>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  );
}
