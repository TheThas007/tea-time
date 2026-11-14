import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050F2A] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 shadow-xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black mb-2 text-[#F2FDFF]">
            {this.props.fallbackTitle || "Something went wrong"}
          </h1>
          <p className="text-sm text-white/70 max-w-md mb-6 leading-relaxed">
            {this.state.error?.message || "An unexpected error occurred while rendering the page."}
          </p>
          {this.state.errorInfo && (
            <pre className="text-left bg-black/40 border border-white/10 rounded-2xl p-4 text-[11px] font-mono text-white/80 max-w-xl max-h-48 overflow-auto mb-6">
              {this.state.error?.stack || this.state.errorInfo.componentStack}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-full bg-[#7BBBFF] hover:bg-[#68aaff] text-[#050F2A] font-extrabold text-xs transition shadow-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Application</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

