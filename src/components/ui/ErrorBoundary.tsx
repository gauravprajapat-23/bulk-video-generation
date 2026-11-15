"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-panel2 p-8 text-center">
          <AlertTriangle size={32} className="text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-text">Something went wrong</p>
            <p className="mt-1 text-xs text-muted">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={this.handleReset}>
            <RefreshCw size={14} /> Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
