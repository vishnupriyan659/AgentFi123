import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an uncaught render error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card rounded-2xl p-6 border border-destructive/30 bg-destructive/10 my-4 text-center animate-fade-in">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground font-mono mb-1">
            {this.props.fallbackTitle || "An unexpected error occurred in this view"}
          </h3>
          <p className="text-xs text-muted-foreground font-mono mb-4 break-all max-w-md mx-auto">
            {this.state.error?.message || "Render exception encountered."}
          </p>
          <Button
            onClick={this.handleReset}
            variant="outline"
            className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 font-mono"
          >
            <RefreshCw className="h-4 w-4" /> Reset & Reload View
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
