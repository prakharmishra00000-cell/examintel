"use client";

import { cn } from "@/lib/utils";
import type { SourceRef, SourceType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, Search, User, Brain, Sparkles } from "lucide-react";

const META: Record<SourceType, { label: string; icon: typeof CheckCircle2; className: string }> = {
  OFFICIAL: { label: "Official Source", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  UPLOADED_DOCUMENT: { label: "Uploaded Document", icon: FileText, className: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30" },
  SEARCH_SOURCE: { label: "Search Source", icon: Search, className: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
  USER_INPUT: { label: "User Input", icon: User, className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30" },
  AI_ANALYSIS: { label: "AI Analysis", icon: Brain, className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  AI_GENERATED: { label: "AI-Generated", icon: Sparkles, className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
};

export function SourceBadge({ source, className }: { source: SourceRef; className?: string }) {
  const meta = META[source.type];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-normal", meta.className, className)}>
      <Icon className="h-3 w-3" />
      {source.label}
      {source.detail && <span className="text-muted-foreground">· {source.detail}</span>}
    </Badge>
  );
}

export function SourceBadgeList({ sources, className }: { sources?: SourceRef[]; className?: string }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {sources.map((s, i) => (
        <SourceBadge key={i} source={s} />
      ))}
    </div>
  );
}
