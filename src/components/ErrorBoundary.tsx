import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Copy, Check, Terminal } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[CredSmart ErrorBoundary] Uncaught runtime error:", error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleCopyError = () => {
    const errorDetails = `CredSmart POS Error Report
Date: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Error: ${this.state.error?.name || "Error"}: ${this.state.error?.message || "Unknown error"}
Stack:
${this.state.error?.stack || "No stack trace available"}
Component Stack:
${this.state.errorInfo?.componentStack || "No component stack available"}`;

    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => {
        this.setState({ copied: false });
      }, 2500);
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkLoadError =
        this.state.error?.message?.includes("Failed to fetch dynamically imported module") ||
        this.state.error?.message?.includes("Loading chunk") ||
        this.state.error?.name === "ChunkLoadError";

      return (
        <div className="min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 select-none font-sans">
          <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header Icon & Branding */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                <AlertTriangle className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-mono uppercase tracking-widest font-semibold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    System Protection
                  </span>
                  {isChunkLoadError && (
                    <span className="px-2 py-0.5 text-[11px] font-mono uppercase tracking-widest font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Update Available
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                  {isChunkLoadError ? "Application Update Detected" : "Something went wrong"}
                </h1>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              {isChunkLoadError
                ? "A new version of CredSmart POS was deployed. Please reload the application to receive the latest updates and keep your session synchronized."
                : "CredSmart POS encountered an unexpected runtime issue in this view. Your database and records remain secure."}
            </p>

            {/* Error Message Box */}
            {this.state.error && (
              <div className="mb-6 p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl font-mono text-xs text-rose-300 break-words flex items-start gap-2.5">
                <Terminal className="w-4 h-4 shrink-0 text-slate-500 mt-0.5" />
                <span className="overflow-hidden text-ellipsis line-clamp-3">
                  {this.state.error.toString()}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <button
                onClick={this.handleReload}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-emerald-900/30"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>

              <button
                onClick={this.handleReset}
                className="flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold border border-slate-700 transition-all"
              >
                <RefreshCw className="w-4 h-4 opacity-70" />
                Try Recovering
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm font-semibold border border-slate-700 transition-all"
                title="Go to Home"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </button>
            </div>

            {/* Technical Diagnostics Accordion */}
            <div className="border-t border-slate-800/80 pt-4">
              <div className="flex items-center justify-between">
                <details className="w-full text-xs group">
                  <summary className="cursor-pointer text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-between font-mono list-none py-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 group-open:rotate-90 transition-transform">▶</span>
                      Technical Diagnostic Details
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.handleCopyError();
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans transition-colors border border-slate-700"
                    >
                      {this.state.copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy Trace</span>
                        </>
                      )}
                    </button>
                  </summary>
                  <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-400 overflow-x-auto max-h-48 scrollbar-thin">
                    <p className="font-semibold text-rose-400 mb-1">{this.state.error?.name}: {this.state.error?.message}</p>
                    <pre className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-400">
                      {this.state.error?.stack || "No stack trace available"}
                    </pre>
                    {this.state.errorInfo?.componentStack && (
                      <>
                        <p className="font-semibold text-slate-300 mt-2 mb-1">Component Hierarchy:</p>
                        <pre className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-500">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </>
                    )}
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
