"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useAppStore } from "@/store/app-store";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const setView = useAppStore((s) => s.setView);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
      </div>
      <h2 className="mt-5 text-xl font-bold">Something went wrong</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        The view encountered an unexpected error. Your saved research is safe. Try reloading the view, or go back to the dashboard.
      </p>
      {error?.message && (
        <pre className="mt-4 max-w-lg overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-left text-[11px] text-muted-foreground">
          {error.message.slice(0, 500)}
        </pre>
      )}
      <div className="mt-5 flex gap-2">
        <Button size="sm" onClick={onReset} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
        <Button size="sm" variant="outline" onClick={() => { onReset(); setView("dashboard"); }} className="gap-1.5">
          <Home className="h-3.5 w-3.5" /> Dashboard
        </Button>
      </div>
    </div>
  );
}
