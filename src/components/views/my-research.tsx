"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  Scale,
  Network,
  HelpCircle,
  Repeat2,
  FileStack,
  ListChecks,
  CalendarRange,
  Layers,
  Search,
  Trash2,
  ExternalLink,
  Download,
  Save,
  Sparkles,
  TrendingUp,
  Target,
  Clock,
  AlertCircle,
  Filter,
  Hash,
  BookOpen,
} from "lucide-react";

import { useAppStore } from "@/store/app-store";
import type { SavedItem, SavedType, PerformanceAnalysis } from "@/types";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ============================================================
// My Research — saved-items browser + performance dashboard
// ============================================================

type IconType = React.ComponentType<{ className?: string }>;

const TYPE_ICON: Record<SavedType, IconType> = {
  exam: FileText,
  comparison: Scale,
  dependency: Network,
  explanation: HelpCircle,
  evolution: Repeat2,
  paper: FileStack,
  pdf: FileText,
  mcq: ListChecks,
  preparation: CalendarRange,
  "multi-exam": Layers,
  note: BookOpen,
};

const TYPE_LABEL: Record<SavedType, string> = {
  exam: "Exam Research",
  comparison: "Comparison",
  dependency: "Dependency Map",
  explanation: "Question Explanation",
  evolution: "Question Evolution",
  paper: "Generated Paper",
  pdf: "PDF Analysis",
  mcq: "MCQ Set",
  preparation: "Preparation Plan",
  "multi-exam": "Multi-Exam Plan",
  note: "Study Note",
};

// Singular label for the stat card ("1 Exam Research" vs "2 Exam Research")
const TYPE_LABEL_SINGULAR: Record<SavedType, string> = {
  exam: "Exam",
  comparison: "Comparison",
  dependency: "Dependency Map",
  explanation: "Explanation",
  evolution: "Evolution",
  paper: "Paper",
  pdf: "PDF",
  mcq: "MCQ Set",
  preparation: "Plan",
  "multi-exam": "Multi-Exam",
  note: "Note",
};

// Color-coded badge classes per type — premium, NO indigo/blue primary
const TYPE_BADGE_CLASS: Record<SavedType, string> = {
  exam: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30",
  comparison: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30",
  dependency: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  explanation: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  evolution: "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
  paper: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
  pdf: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30",
  mcq: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
  preparation: "bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30",
  "multi-exam": "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30",
  note: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30",
};

// Soft icon background classes per type (matches badge hue)
const TYPE_ICON_CLASS: Record<SavedType, string> = {
  exam: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20",
  comparison: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/20",
  dependency: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20",
  explanation: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20",
  evolution: "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20",
  paper: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20",
  pdf: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/20",
  mcq: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20",
  preparation: "bg-teal-500/10 text-teal-600 dark:text-teal-300 border-teal-500/20",
  "multi-exam": "bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/20",
  note: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20",
};

const FILTER_VALUES = ["all", ...Object.keys(TYPE_LABEL) as SavedType[]] as const;
type FilterValue = (typeof FILTER_VALUES)[number];

const FILTER_LABEL: Record<FilterValue, string> = {
  all: "All",
  exam: "Exams",
  comparison: "Comparisons",
  dependency: "Dependencies",
  explanation: "Questions",
  evolution: "Evolutions",
  paper: "Papers",
  pdf: "PDFs",
  mcq: "MCQs",
  preparation: "Plans",
  "multi-exam": "Multi-Exam",
  note: "Notes",
};

// ---------- helpers ----------

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function numOr(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

// ---------- performance aggregation (defensive: data is `unknown`) ----------

interface PerfStat {
  attempts: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnattempted: number;
  totalScore: number;
  totalMaxMarks: number;
  // accuracy in percent, weighted by question count across attempts
  avgAccuracy: number;
}

function extractPaperPerf(data: unknown): PerfStat | null {
  // Expected shape (paper-generator): { paper, analysis, answers }
  const obj = (data ?? null) as { analysis?: unknown } | null;
  const a = obj?.analysis as Partial<PerformanceAnalysis> | undefined;
  if (!a) return null;
  const correct = numOr(a.correct, 0);
  const incorrect = numOr(a.incorrect, 0);
  const unattempted = numOr(a.unattempted, 0);
  const score = numOr(a.score, 0);
  const maxMarks = numOr(a.maxMarks, 0);
  const total = correct + incorrect + unattempted;
  const accuracy = total > 0
    ? (correct / total) * 100
    : typeof a.accuracy === "number"
      ? a.accuracy
      : 0;
  return {
    attempts: 1,
    totalCorrect: correct,
    totalIncorrect: incorrect,
    totalUnattempted: unattempted,
    totalScore: score,
    totalMaxMarks: maxMarks,
    avgAccuracy: accuracy,
  };
}

function extractMcqPerf(data: unknown): PerfStat | null {
  // Expected shape (mcq-generator): { set: { mcqs: [...] }, answers: Record<string,string>, elapsed, submitted }
  const obj = (data ?? null) as
    | {
        set?: { mcqs?: { id?: string; correctAnswer?: string }[] };
        answers?: Record<string, string>;
      }
    | null;
  const mcqs = obj?.set?.mcqs ?? [];
  const answers = obj?.answers ?? {};
  if (mcqs.length === 0) return null;
  let correct = 0;
  let attempted = 0;
  for (const q of mcqs) {
    const picked = q.id ? answers[q.id] : undefined;
    if (typeof picked === "string" && picked.length > 0) {
      attempted++;
      if (q.correctAnswer && picked === q.correctAnswer) correct++;
    }
  }
  const total = mcqs.length;
  const incorrect = Math.max(0, attempted - correct);
  const unattempted = Math.max(0, total - attempted);
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  return {
    attempts: 1,
    totalCorrect: correct,
    totalIncorrect: incorrect,
    totalUnattempted: unattempted,
    totalScore: correct,
    totalMaxMarks: total,
    avgAccuracy: accuracy,
  };
}

function extractPerf(item: SavedItem): PerfStat | null {
  if (item.type === "paper") return extractPaperPerf(item.data);
  if (item.type === "mcq") return extractMcqPerf(item.data);
  return null;
}

function aggregatePerf(items: SavedItem[]): PerfStat | null {
  const perfs = items.map(extractPerf).filter((p): p is PerfStat => p !== null);
  if (perfs.length === 0) return null;
  const totalQ = perfs.reduce(
    (acc, p) => acc + p.totalCorrect + p.totalIncorrect + p.totalUnattempted,
    0
  );
  const totalCorrect = perfs.reduce((a, p) => a + p.totalCorrect, 0);
  const totalIncorrect = perfs.reduce((a, p) => a + p.totalIncorrect, 0);
  const totalUnattempted = perfs.reduce((a, p) => a + p.totalUnattempted, 0);
  const totalScore = perfs.reduce((a, p) => a + p.totalScore, 0);
  const totalMaxMarks = perfs.reduce((a, p) => a + p.totalMaxMarks, 0);
  const avgAccuracy = totalQ > 0 ? (totalCorrect / totalQ) * 100 : 0;
  return {
    attempts: perfs.length,
    totalCorrect,
    totalIncorrect,
    totalUnattempted,
    totalScore,
    totalMaxMarks,
    avgAccuracy,
  };
}

// ---------- JSON syntax-highlighting-lite ----------

function highlightJSON(obj: unknown): React.ReactNode[] {
  let json: string;
  try {
    json = JSON.stringify(obj, null, 2);
  } catch {
    json = String(obj);
  }
  const regex =
    /("(?:[^"\\]|\\.)*"\s*:?)|(\b-?\d+(?:\.\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],])/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(json))) {
    if (m.index > lastIndex) {
      nodes.push(
        <span key={k++} className="text-muted-foreground/80">
          {json.slice(lastIndex, m.index)}
        </span>
      );
    }
    const tok = m[0];
    let cls = "text-foreground";
    if (m[1]) {
      // string OR key
      const isKey = /"\s*$/.test(m[1].replace(/"$/, "")) || m[1].trim().endsWith(":");
      cls = isKey
        ? "text-violet-500 dark:text-violet-300 font-medium"
        : "text-emerald-500 dark:text-emerald-300";
    } else if (m[2]) {
      cls = "text-amber-500 dark:text-amber-300";
    } else if (m[3]) {
      cls = "text-fuchsia-500 dark:text-fuchsia-300";
    } else {
      cls = "text-muted-foreground";
    }
    nodes.push(
      <span key={k++} className={cls}>
        {tok}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < json.length) {
    nodes.push(
      <span key={k++} className="text-muted-foreground">
        {json.slice(lastIndex)}
      </span>
    );
  }
  return nodes;
}

// ---------- small subcomponents ----------

function TypeBadge({ type }: { type: SavedType }) {
  return (
    <Badge variant="outline" className={`gap-1 font-normal ${TYPE_BADGE_CLASS[type]}`}>
      {TYPE_LABEL[type]}
    </Badge>
  );
}

function StatChip({
  icon: Icon,
  count,
  label,
  accent,
  onClick,
  active,
}: {
  icon: IconType;
  count: number;
  label: string;
  accent: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const isClickable = !!onClick;
  const Comp: any = isClickable ? "button" : "div";
  return (
    <Comp
      type={isClickable ? "button" : undefined}
      onClick={onClick}
      aria-pressed={isClickable ? active : undefined}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
        isClickable
          ? "hover:border-violet-500/40 hover:bg-violet-500/5 cursor-pointer"
          : ""
      } ${active ? "border-violet-500/40 bg-violet-500/5" : "border-border bg-background"}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${accent}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight">{count}</span>
        <span className="block text-[10px] text-muted-foreground leading-tight truncate">
          {label}
        </span>
      </span>
    </Comp>
  );
}

function ItemInspectorDialog({
  item,
  onOpenChange,
}: {
  item: SavedItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const Icon = item ? TYPE_ICON[item.type] : FileText;
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                item ? TYPE_ICON_CLASS[item.type] : ""
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="leading-tight break-words">
                {item?.title ?? ""}
              </DialogTitle>
              <DialogDescription className="mt-1 line-clamp-2">
                {item?.summary ?? ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {item && (
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={item.type} />
            <Badge variant="outline" className="gap-1 font-normal text-[10px]">
              <Clock className="h-3 w-3" />
              {new Date(item.createdAt).toLocaleString()}
            </Badge>
            <Badge variant="outline" className="gap-1 font-normal text-[10px]">
              <Hash className="h-3 w-3" />
              {item.id}
            </Badge>
          </div>
        )}
        <ScrollArea className="h-[55vh] rounded-lg border border-border bg-muted/30">
          <pre className="p-4 text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words">
            <code>{item ? highlightJSON(item.data) : null}</code>
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ---------- main component ----------

export function MyResearch() {
  const saved = useAppStore((s) => s.saved);
  const deleteItem = useAppStore((s) => s.deleteItem);
  const clearAll = useAppStore((s) => s.clearAll);
  const setAssistantOpen = useAppStore((s) => s.setAssistantOpen);
  const setView = useAppStore((s) => s.setView);
  const setContext = useAppStore((s) => s.setContext);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [inspector, setInspector] = useState<SavedItem | null>(null);

  // Per-type counts (for stats row)
  const counts = useMemo(() => {
    const map = new Map<SavedType, number>();
    for (const s of saved) {
      map.set(s.type, (map.get(s.type) ?? 0) + 1);
    }
    return map;
  }, [saved]);

  // Filtered items
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return saved.filter((s) => {
      if (filter !== "all" && s.type !== filter) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        TYPE_LABEL[s.type].toLowerCase().includes(q)
      );
    });
  }, [saved, search, filter]);

  // Performance aggregation across all saved paper/mcq items
  const perf = useMemo(() => aggregatePerf(saved), [saved]);
  const hasPracticeItems = saved.some((s) => s.type === "paper" || s.type === "mcq");

  const handleOpen = useCallback((item: SavedItem) => {
    setInspector(item);
    // surface as context so the AI assistant can discuss the item
    setContext(item.title, item.type);
  }, [setContext]);

  const handleExport = useCallback(() => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        count: saved.length,
        items: saved,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `examintel-research-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Exported JSON", {
        description: `${saved.length} item${saved.length === 1 ? "" : "s"} downloaded`,
      });
    } catch (e: any) {
      toast.error("Export failed", { description: String(e?.message ?? e).slice(0, 200) });
    }
  }, [saved]);

  const handleClearAll = useCallback(() => {
    clearAll();
    setInspector(null);
    toast.success("Cleared all saved research");
  }, [clearAll]);

  // Wire up store-level delete to actually remove via the store
  // (the AlertDialog action above only toasts; the actual deletion happens here)
  // We override the AlertDialogAction onClick to also call deleteItem.
  // Simpler approach: pass deleteItem down to the card. Refactored below.
  const handleDelete = useCallback(
    (id: string) => {
      deleteItem(id);
      if (inspector?.id === id) setInspector(null);
    },
    [deleteItem, inspector]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Research</h1>
            <Badge variant="secondary" className="gap-1">
              <Save className="h-3 w-3" />
              {saved.length} saved
            </Badge>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-3xl">
            All your saved intelligence — exams, comparisons, dependency maps, questions,
            papers, PDF analyses, MCQ sets, preparation plans, multi-exam strategies.
            Persisted in your browser.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 hover:border-violet-500/40 hover:bg-violet-500/5"
            onClick={handleExport}
            disabled={saved.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 hover:border-rose-500/40 hover:bg-rose-500/5 hover:text-rose-600 dark:hover:text-rose-300"
                disabled={saved.length === 0}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all saved research?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove all {saved.length} saved item
                  {saved.length === 1 ? "" : "s"} from your browser. Performance
                  analytics derived from papers and MCQ sets will also be lost. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={handleClearAll}
                >
                  Clear all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </motion.div>

      {/* Filter & search bar */}
      {saved.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, summary, or type…"
                aria-label="Search saved research"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 px-2">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </div>
          </div>

          {/* Type filter tabs (scrollable on mobile) */}
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as FilterValue)}
            className="w-full"
          >
            <ScrollArea className="w-full whitespace-nowrap pb-1">
              <TabsList className="inline-flex h-9">
                {FILTER_VALUES.map((v) => {
                  const count = v === "all" ? saved.length : counts.get(v as SavedType) ?? 0;
                  return (
                    <TabsTrigger
                      key={v}
                      value={v}
                      className="gap-1.5 px-3"
                      disabled={v !== "all" && count === 0}
                    >
                      {FILTER_LABEL[v]}
                      <span className="rounded-full bg-muted-foreground/10 px-1.5 py-0.5 text-[10px] tabular-nums">
                        {count}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </ScrollArea>
          </Tabs>
        </motion.div>
      )}

      {/* Stats row */}
      {saved.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {(Object.keys(TYPE_LABEL) as SavedType[])
            .filter((t) => (counts.get(t) ?? 0) > 0)
            .map((t) => {
              const count = counts.get(t) ?? 0;
              const Icon = TYPE_ICON[t];
              const label =
                count === 1 ? TYPE_LABEL_SINGULAR[t] : FILTER_LABEL[t];
              return (
                <StatChip
                  key={t}
                  icon={Icon}
                  count={count}
                  label={label}
                  accent={TYPE_ICON_CLASS[t]}
                  onClick={() => setFilter(filter === t ? "all" : t)}
                  active={filter === t}
                />
              );
            })}
        </div>
      )}

      {/* Item grid or empty state */}
      {saved.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10">
            <EmptyState
              icon={Save}
              title="No saved research yet"
              description="Start by researching an exam, analysing a PDF, generating a paper or MCQ set, or building a preparation plan — then click “Save to My Research” to keep it here."
            />
            <div className="mt-4 flex justify-center">
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                onClick={() => setView("exam-researcher")}
              >
                <Search className="h-3.5 w-3.5" />
                Research your first exam
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No items match your filter"
          description="Try adjusting your search query or selecting a different type filter."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <SavedItemCard
              key={item.id}
              item={item}
              onOpen={handleOpen}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Performance dashboard */}
      <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-500" />
            <CardTitle className="text-base">Performance Dashboard</CardTitle>
          </div>
          <CardDescription>
            Aggregated analytics across your saved papers and MCQ attempts. Discuss
            patterns and weak areas with the AI assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasPracticeItems || !perf ? (
            <EmptyState
              icon={Target}
              title="No attempts yet"
              description="Take a generated paper or MCQ set to surface performance analytics. Save the result and your aggregated stats will appear here."
            />
          ) : (
            <div className="space-y-4">
              {/* top metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Metric
                  label="Attempts"
                  value={String(perf.attempts)}
                  hint="saved papers + MCQ sets"
                  icon={Hash}
                />
                <Metric
                  label="Avg Accuracy"
                  value={`${perf.avgAccuracy.toFixed(1)}%`}
                  hint={`across ${perf.totalCorrect + perf.totalIncorrect + perf.totalUnattempted} questions`}
                  icon={Target}
                  tone={
                    perf.avgAccuracy >= 70
                      ? "good"
                      : perf.avgAccuracy >= 45
                        ? "mid"
                        : "bad"
                  }
                />
                <Metric
                  label="Correct"
                  value={String(perf.totalCorrect)}
                  hint={`of ${perf.totalCorrect + perf.totalIncorrect + perf.totalUnattempted} attempted`}
                  icon={TrendingUp}
                  tone="good"
                />
                <Metric
                  label="Incorrect"
                  value={String(perf.totalIncorrect)}
                  hint={`${perf.totalUnattempted} unattempted`}
                  icon={AlertCircle}
                  tone="bad"
                />
              </div>

              {/* accuracy bar */}
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium">Overall Accuracy</span>
                  <span className="text-muted-foreground tabular-nums">
                    {perf.totalCorrect}/{perf.totalCorrect + perf.totalIncorrect + perf.totalUnattempted} correct
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${pct(perf.totalCorrect, perf.totalCorrect + perf.totalIncorrect + perf.totalUnattempted)}%` }}
                    aria-label={`${perf.totalCorrect} correct`}
                  />
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${pct(perf.totalIncorrect, perf.totalCorrect + perf.totalIncorrect + perf.totalUnattempted)}%` }}
                    aria-label={`${perf.totalIncorrect} incorrect`}
                  />
                  <div
                    className="h-full bg-amber-500/50"
                    style={{ width: `${pct(perf.totalUnattempted, perf.totalCorrect + perf.totalIncorrect + perf.totalUnattempted)}%` }}
                    aria-label={`${perf.totalUnattempted} unattempted`}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Correct ({pctStr(perf.totalCorrect, perf.totalCorrect + perf.totalIncorrect + perf.totalUnattempted)})
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Incorrect ({pctStr(perf.totalIncorrect, perf.totalCorrect + perf.totalIncorrect + perf.totalUnattempted)})
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500/50" /> Unattempted ({pctStr(perf.totalUnattempted, perf.totalCorrect + perf.totalIncorrect + perf.totalUnattempted)})
                  </span>
                </div>
              </div>

              {/* AI assistant prompt */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-violet-500/20 bg-background/40 p-3">
                <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Discuss your performance with the AI</p>
                  <p className="text-xs text-muted-foreground">
                    Ask about weak topics, time strategy, negative-marking impact, or your
                    next-best study target — grounded in your saved attempts.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                  onClick={() => {
                    setContext("My performance summary", "general");
                    setAssistantOpen(true);
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Open AI Assistant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspector dialog */}
      <ItemInspectorDialog
        item={inspector}
        onOpenChange={(open) => !open && setInspector(null)}
      />
    </div>
  );
}

// ---------- helpers used inside render ----------

function pct(n: number, d: number): number {
  return d > 0 ? (n / d) * 100 : 0;
}
function pctStr(n: number, d: number): string {
  return `${pct(n, d).toFixed(0)}%`;
}

// ---------- Metric ----------

const METRIC_TONE: Record<string, string> = {
  good: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-300",
  mid: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-300",
  bad: "border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-300",
  neutral: "border-border bg-background",
};

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconType;
  tone?: "good" | "mid" | "bad" | "neutral";
}) {
  return (
    <div className={`rounded-lg border p-3 ${METRIC_TONE[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

// ---------- SavedItemCard ----------

function SavedItemCard({
  item,
  onOpen,
  onDelete,
}: {
  item: SavedItem;
  onOpen: (item: SavedItem) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = TYPE_ICON[item.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group h-full hover:border-violet-500/40 hover:shadow-md hover:shadow-violet-500/5 transition-all">
        <CardContent className="p-4 flex flex-col gap-3 h-full">
          {/* top row: icon + badge */}
          <div className="flex items-start justify-between gap-2">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg border ${TYPE_ICON_CLASS[item.type]}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <TypeBadge type={item.type} />
          </div>

          {/* title + summary */}
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-semibold leading-snug line-clamp-2 break-words">
              {item.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2 break-words">
              {item.summary}
            </p>
          </div>

          {/* footer: time + actions */}
          <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border/60">
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {timeAgo(item.createdAt)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 gap-1 text-xs hover:text-violet-600 dark:hover:text-violet-300"
                onClick={() => onOpen(item)}
                aria-label={`Open ${item.title}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 gap-1 text-xs hover:text-rose-600 dark:hover:text-rose-300"
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this saved item?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove{" "}
                      <span className="font-medium text-foreground">{item.title}</span>{" "}
                      from your saved research. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() => {
                        onDelete(item.id);
                        toast.success("Item deleted", { description: item.title });
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
