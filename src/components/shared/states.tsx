"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingState({ label = "AI is thinking...", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-muted-foreground py-6", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-medium text-destructive">Something went wrong</p>
          <p className="mt-1 text-muted-foreground">{message}</p>
          {onRetry && (
            <button onClick={onRetry} className="mt-3 text-xs font-medium underline text-foreground hover:opacity-70">
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon }: { title: string; description?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground mb-3" />}
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-md">{description}</p>}
    </div>
  );
}
