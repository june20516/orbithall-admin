"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <div className="rounded-lg bg-red-50 p-6 dark:bg-red-900/20">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              오류가 발생했습니다
            </p>
            <p className="mt-2 text-xs text-red-600 dark:text-red-500">
              {this.state.error.message}
            </p>
            <button
              onClick={this.reset}
              className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
