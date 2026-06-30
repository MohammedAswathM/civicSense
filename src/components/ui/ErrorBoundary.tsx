'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('CivicSense page error', error, info.componentStack);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <section className="max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          {process.env.NODE_ENV === 'development' && (
            <p className="mt-3 rounded bg-red-50 p-3 text-sm text-red-800">{this.state.error.message}</p>
          )}
          <button
            type="button"
            className="mt-4 rounded-md bg-civic-blue px-4 py-2 font-semibold text-white focus:ring-2 focus:ring-civic-blue"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </section>
      </main>
    );
  }
}
