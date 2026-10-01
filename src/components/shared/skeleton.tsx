"use client";

import { cn } from "@/lib/utils";

// Shimmer skeleton primitives for AI-loading states.
// Replaces the plain "AI is thinking..." text with premium shimmer blocks.

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted/60", className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border p-5 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={4} />
    </div>
  );
}

export function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Premium AI-thinking state with animated gradient brain icon
export function AIThinkingState({ label = "AI is generating your intelligence report...", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-xl opacity-40 animate-pulse" />
        <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
          <svg className="h-6 w-6 text-white animate-spin" style={{ animationDuration: "2s" }} viewBox="0 0 24 24" fill="none">
            <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1 1 7.87A3 3 0 0 1 14 19a3 3 0 0 1-2 .77A3 3 0 0 1 10 19a3 3 0 0 1-3-5.13A4 4 0 0 1 8 6a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
      <p className="mt-4 text-sm font-medium">{label}</p>
      <div className="mt-2 flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-violet-500/60"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
