"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  RotateCcw,
  Calendar,
  Clock,
  CheckCircle2,
  Zap,
  Flame,
  Target,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Layers,
  Sigma,
  AlertTriangle,
  PartyPopper,
  Play,
  TrendingUp,
  Award,
  ListChecks,
  Circle,
  CalendarClock,
  Lightbulb,
  Brain,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAppStore, type ViewKey } from "@/store/app-store";
import { useFlashcardStore } from "@/store/flashcard-store";
import { useFormulaStore } from "@/store/formula-store";
import {
  PremiumEmptyState,
  AnimatedCounter,
} from "@/components/shared/premium-empty-state";
import type { Flashcard } from "@/types/flashcard";
import type { SavedItem } from "@/types";
import {
  format,
  addDays,
  startOfDay,
  endOfDay,
  isSameDay,
  differenceInCalendarDays,
} from "date-fns";

// ============================================================
// Revision Scheduler
// Spaced-repetition-driven daily revision plan:
//   1. Due flashcards (grouped by topic, SM-2 nextReview)
//   2. Formula refreshers (favorites + 5 random recall)
//   3. Weak topic drill (most repeated topic across saved research)
// Plus a 7-day upcoming strip, a stats card, and a time-budget
// slider with over-budget warnings.
// Reads from 3 stores (app/flashcard/formula) — read-only, no new store.
// ============================================================

// ---------- Hydration-safe mounted guard ----------
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// ---------- Task model ----------
type TaskType = "flashcards" | "formulas" | "weak-drill";

interface Task {
  id: string;
  type: TaskType;
  title: string;
  subtitle: string;
  estMin: number;
  topic: string;
  topicCount: number;
  count: number;
  target: ViewKey;
}

// ---------- Task type styling (NO indigo/blue) ----------
const TASK_STYLES: Record<
  TaskType,
  { grad: string; ring: string; text: string; bg: string; border: string; dot: string; iconBg: string }
> = {
  flashcards: {
    grad: "from-violet-500 to-fuchsia-500",
    ring: "ring-violet-500/20",
    text: "text-violet-600 dark:text-violet-300",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    dot: "bg-violet-500",
    iconBg: "bg-gradient-to-br from-violet-500 to-fuchsia-500",
  },
  formulas: {
    grad: "from-emerald-500 to-teal-500",
    ring: "ring-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
  },
  "weak-drill": {
    grad: "from-amber-500 to-orange-500",
    ring: "ring-amber-500/20",
    text: "text-amber-600 dark:text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
  },
};

const TASK_ICONS: Record<TaskType, React.ComponentType<{ className?: string }>> = {
  flashcards: Layers,
  formulas: Sigma,
  "weak-drill": Target,
};

// ---------- Helpers ----------
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function formatMin(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ============================================================
// Header
// ============================================================
function RevisionHeader() {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
              <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg">
                <RotateCcw className="h-5 w-5" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Revision Scheduler</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Spaced repetition meets your daily plan. Due flashcards, formula refreshers, and weak-topic drills — all scheduled for today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-violet-500/30 bg-violet-500/5 text-violet-600 dark:text-violet-300">
            <CalendarClock className="h-3 w-3" />
            {format(new Date(), "EEE, MMM d")}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Task row
// ============================================================
function TaskRow({
  task,
  done,
  onToggle,
  onStart,
}: {
  task: Task;
  done: boolean;
  onToggle: () => void;
  onStart: () => void;
}) {
  const s = TASK_STYLES[task.type];
  const Icon = TASK_ICONS[task.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border p-3 sm:p-4 transition-all",
        done ? cn(s.bg, s.border, "opacity-70") : cn("bg-card/60 hover:bg-card", "border-border hover:border-foreground/10"),
      )}
    >
      {/* checkbox */}
      <button
        onClick={onToggle}
        className="pt-0.5"
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        aria-pressed={done}
      >
        <div
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
            done
              ? cn(s.iconBg, "border-transparent text-white")
              : "border-input bg-background hover:border-foreground/40",
          )}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3 text-transparent" />}
        </div>
      </button>

      {/* body */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white shadow", s.iconBg)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <h4
            className={cn(
              "text-sm font-semibold leading-tight",
              done && "line-through text-muted-foreground",
            )}
          >
            {task.title}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{task.subtitle}</p>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Badge variant="outline" className={cn("gap-1 border-foreground/10", s.text, s.bg, s.border)}>
            <Clock className="h-3 w-3" />
            {formatMin(task.estMin)}
          </Badge>
          {task.topic && (
            <Badge variant="outline" className="max-w-[220px] truncate gap-1 border-foreground/10 text-muted-foreground">
              <Target className="h-3 w-3" />
              <span className="truncate">{task.topic}</span>
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 border-foreground/10 text-muted-foreground">
            <Zap className="h-3 w-3" />
            {task.count} {task.type === "flashcards" ? "cards" : task.type === "formulas" ? "formulas" : "items"}
          </Badge>
        </div>
      </div>

      {/* start */}
      <div className="flex shrink-0 items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={onStart}
              className={cn(
                "gap-1.5 text-xs font-medium transition-all",
                done
                  ? "text-muted-foreground hover:text-foreground"
                  : cn(s.text, "hover:bg-foreground/5"),
              )}
            >
              <Play className="h-3 w-3" />
              <span className="hidden sm:inline">Start</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            Open {task.type === "flashcards" ? "Flashcards" : task.type === "formulas" ? "Formula Quiz" : "Question Lab"}
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}

// ============================================================
// Main component
// ============================================================
export function RevisionScheduler() {
  const mounted = useMounted();
  const sets = useFlashcardStore((s) => s.sets);
  const formulas = useFormulaStore((s) => s.formulas);
  const favorites = useFormulaStore((s) => s.favorites);
  const saved = useAppStore((s) => s.saved);
  const saveItem = useAppStore((s) => s.saveItem);
  const setView = useAppStore((s) => s.setView);
  const setContext = useAppStore((s) => s.setContext);

  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [budget, setBudget] = useState(30);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);

  // -------- Due flashcards --------
  const dueCards = useMemo<Flashcard[]>(() => {
    if (!mounted) return [];
    const now = Date.now();
    const due: Flashcard[] = [];
    for (const s of sets) {
      for (const c of s.cards) {
        const t = Date.parse(c.nextReview);
        if (Number.isNaN(t) || t <= now) due.push(c);
      }
    }
    return due;
  }, [sets, mounted]);

  // -------- Due grouped by topic --------
  const dueByTopic = useMemo(() => {
    const m = new Map<string, Flashcard[]>();
    for (const c of dueCards) {
      const t = (c.topic || "General").trim() || "General";
      const arr = m.get(t) ?? [];
      arr.push(c);
      m.set(t, arr);
    }
    return m;
  }, [dueCards]);

  // -------- Formula refreshers: favorites + 5 random --------
  const formulaRefresher = useMemo(() => {
    const favs = formulas.filter((f) => favorites.includes(f.id));
    // Pick 5 random formulas for quick recall, preferring non-favorites.
    const nonFavPool = formulas.filter((f) => !favorites.includes(f.id));
    const source = nonFavPool.length >= 5 ? nonFavPool : formulas;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    const random5 = shuffled.slice(0, 5);
    const seen = new Set<string>();
    const all = [...favs, ...random5].filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
    return { favs, random5, all };
  }, [formulas, favorites]);

  // -------- Weak topic detection --------
  // Walk saved items of type explanation/evolution/paper/mcq; collect topic
  // strings and count unique-topic occurrences per item so a single paper
  // with 10 of the same topic doesn't dominate.
  const weakTopic = useMemo<{ topic: string; count: number } | null>(() => {
    const counts = new Map<string, number>();
    for (const item of saved) {
      if (!["explanation", "evolution", "paper", "mcq"].includes(item.type)) continue;
      const data = (item.data ?? null) as Record<string, unknown> | null;
      if (!data) continue;
      const topics: string[] = [];
      if (item.type === "explanation" || item.type === "evolution") {
        const t = str((data as { topic?: unknown }).topic);
        if (t) topics.push(t);
      } else if (item.type === "paper") {
        const paper = (data as { paper?: Record<string, unknown> }).paper;
        const questions = Array.isArray(paper?.questions)
          ? (paper!.questions as Array<Record<string, unknown>>)
          : Array.isArray((data as { questions?: unknown }).questions)
            ? ((data as { questions?: Array<Record<string, unknown>> }).questions as Array<Record<string, unknown>>)
            : [];
        for (const q of questions) {
          const t = str(q?.topic);
          if (t) topics.push(t);
        }
      } else if (item.type === "mcq") {
        const setData = (data as { set?: Record<string, unknown> }).set;
        const mcqs = Array.isArray(setData?.mcqs)
          ? (setData!.mcqs as Array<Record<string, unknown>>)
          : Array.isArray((data as { mcqs?: unknown }).mcqs)
            ? ((data as { mcqs?: Array<Record<string, unknown>> }).mcqs as Array<Record<string, unknown>>)
            : [];
        for (const m of mcqs) {
          const t = str(m?.topic);
          if (t) topics.push(t);
        }
      }
      // Dedup within an item (case-insensitive).
      const seen = new Set<string>();
      for (const raw of topics) {
        const key = raw.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        counts.set(raw, (counts.get(raw) ?? 0) + 1);
      }
    }
    let best: { topic: string; count: number } | null = null;
    for (const [topic, count] of counts) {
      if (!best || count > best.count) best = { topic, count };
    }
    return best;
  }, [saved]);

  // -------- Build tasks --------
  const tasks = useMemo<Task[]>(() => {
    const out: Task[] = [];
    if (dueCards.length > 0) {
      const topicList = Array.from(dueByTopic.keys());
      out.push({
        id: "flashcards",
        type: "flashcards",
        title: `Review ${dueCards.length} due flashcard${dueCards.length === 1 ? "" : "s"}`,
        subtitle: `${dueByTopic.size} topic${dueByTopic.size === 1 ? "" : "s"} due · grouped spaced-repetition session`,
        estMin: Math.max(1, Math.round(dueCards.length * 1.5)),
        topic: topicList.slice(0, 2).join(" · ") + (topicList.length > 2 ? ` +${topicList.length - 2}` : ""),
        topicCount: dueByTopic.size,
        count: dueCards.length,
        target: "flashcards",
      });
    }
    if (formulaRefresher.all.length > 0) {
      const favN = formulaRefresher.favs.length;
      const total = formulaRefresher.all.length;
      out.push({
        id: "formulas",
        type: "formulas",
        title: `Formula refreshers · ${total} formula${total === 1 ? "" : "s"}`,
        subtitle:
          favN > 0
            ? `${favN} favorite${favN === 1 ? "" : "s"} + 5 random recall drill`
            : "5 random formulas for quick recall",
        estMin: 5,
        topic: favN > 0 ? "Favorites + random" : "Random recall",
        topicCount: 0,
        count: total,
        target: "formula-quiz",
      });
    }
    if (weakTopic) {
      out.push({
        id: "weak-drill",
        type: "weak-drill",
        title: `Weak topic drill · ${weakTopic.topic}`,
        subtitle: `Appeared in ${weakTopic.count} saved item${weakTopic.count === 1 ? "" : "s"} — revisit core concepts`,
        estMin: 10,
        topic: weakTopic.topic,
        topicCount: weakTopic.count,
        count: weakTopic.count,
        target: "question-evolution",
      });
    }
    return out;
  }, [dueCards, dueByTopic, formulaRefresher, weakTopic]);

  const totalEst = tasks.reduce((s, t) => s + t.estMin, 0);
  const completedCount = tasks.filter((t) => completed.has(t.id)).length;
  const progressPct = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
  const allComplete = tasks.length > 0 && completedCount === tasks.length;
  const overBudget = totalEst > budget;

  // -------- Upcoming 7 days --------
  const upcoming = useMemo(() => {
    const days: { date: Date; count: number; cards: Flashcard[] }[] = [];
    const todayStart = startOfDay(new Date()).getTime();
    for (let i = 1; i <= 7; i++) {
      const date = addDays(new Date(), i);
      const start = startOfDay(date).getTime();
      const end = endOfDay(date).getTime();
      const cards: Flashcard[] = [];
      for (const s of sets) {
        for (const c of s.cards) {
          const t = Date.parse(c.nextReview);
          if (Number.isNaN(t)) continue;
          if (t >= start && t <= end) cards.push(c);
        }
      }
      void todayStart;
      days.push({ date, count: cards.length, cards });
    }
    return days;
  }, [sets]);

  const weekDue = useMemo(() => {
    const todayEnd = endOfDay(new Date()).getTime();
    const weekEnd = endOfDay(addDays(new Date(), 7)).getTime();
    let count = dueCards.length; // today's dues
    for (const s of sets) {
      for (const c of s.cards) {
        const t = Date.parse(c.nextReview);
        if (Number.isNaN(t)) continue;
        if (t > todayEnd && t <= weekEnd) count++;
      }
    }
    return count;
  }, [sets, dueCards.length]);

  // -------- Stats --------
  const allCards = useMemo(() => sets.flatMap((s) => s.cards), [sets]);
  const masteredCount = allCards.filter((c) => c.mastery === "Mastered").length;
  const avgEase =
    allCards.length > 0
      ? Math.round((allCards.reduce((s, c) => s + c.easeFactor, 0) / allCards.length) * 100) / 100
      : 0;

  // -------- Actions --------
  const toggleTask = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markAllComplete = () => {
    setCompleted(new Set(tasks.map((t) => t.id)));
    toast.success("All revision tasks marked complete", {
      description: "Outstanding work — stay consistent.",
    });
  };

  const resetTasks = () => {
    setCompleted(new Set());
    setSessionSaved(false);
    toast("Progress reset", { description: "Tasks unchecked for another pass." });
  };

  const startTask = (t: Task) => {
    setContext(t.title, "general");
    setView(t.target);
  };

  const saveSession = () => {
    saveItem({
      type: "preparation",
      title: `Revision session — ${format(new Date(), "MMM d, yyyy")}`,
      summary: `${completedCount}/${tasks.length} tasks · ${formatMin(totalEst)} est. · Due cards: ${dueCards.length} · Formulas: ${formulaRefresher.all.length} · Weak: ${weakTopic?.topic ?? "—"}`,
      data: {
        kind: "revision-session",
        completedTasks: tasks
          .filter((t) => completed.has(t.id))
          .map((t) => ({ id: t.id, type: t.type, title: t.title, estMin: t.estMin })),
        totalEstMin: totalEst,
        budgetMin: budget,
        dueCards: dueCards.length,
        formulas: formulaRefresher.all.length,
        weakTopic: weakTopic?.topic ?? null,
        masteredCards: masteredCount,
        savedAt: new Date().toISOString(),
      },
    });
    setSessionSaved(true);
    toast.success("Session saved to My Research", {
      description: "Find it under My Research → Preparation.",
      action: {
        label: "Open",
        onClick: () => setView("my-research"),
      },
    });
  };

  // -------- Empty state --------
  const isEmpty =
    !mounted ||
    (dueCards.length === 0 &&
      formulaRefresher.all.length === 0 &&
      !weakTopic &&
      saved.length === 0 &&
      sets.length === 0);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <RevisionHeader />
        <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <RevisionHeader />
        <PremiumEmptyState
          icon={RotateCcw}
          title="No revision data yet"
          description="Create flashcards, favourite formulas, or research an exam — the scheduler will auto-build your daily plan from due cards, favourites, and weak topics."
          ctaLabel="Create flashcards"
          ctaIcon={Layers}
          ctaOnClick={() => setView("flashcards")}
          accent="violet"
        />
      </div>
    );
  }

  const selectedDay = selectedDayIdx != null ? upcoming[selectedDayIdx] : null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <RevisionHeader />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ===== Main plan card ===== */}
          <Card className="lg:col-span-2 gap-0 py-0 overflow-hidden">
            <CardHeader className="py-5 border-b border-border/60 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-4 w-4 text-violet-500" />
                    Today&apos;s Revision Plan
                  </CardTitle>
                  <CardDescription>
                    {tasks.length === 0
                      ? "Nothing scheduled for today — you're all caught up."
                      : `${tasks.length} task${tasks.length === 1 ? "" : "s"} · ${completedCount} done · ${formatMin(totalEst)} total`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Total est.
                    </div>
                    <div
                      className={cn(
                        "text-sm font-bold",
                        overBudget ? "text-amber-600 dark:text-amber-400" : "text-foreground",
                      )}
                    >
                      {formatMin(totalEst)}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Budget
                    </div>
                    <div className="text-sm font-bold text-muted-foreground">{formatMin(budget)}</div>
                  </div>
                </div>
              </div>

              {/* progress */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {completedCount}/{tasks.length}
                  </span>
                </div>
                <Progress
                  value={progressPct}
                  className="h-2 bg-muted"
                />
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-3">
              {/* over-budget warning */}
              {overBudget && tasks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <div className="flex-1 text-xs leading-relaxed">
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      Over budget by {formatMin(totalEst - budget)}.
                    </span>{" "}
                    <span className="text-muted-foreground">
                      Tip: prioritise due flashcards first — spaced repetition is time-sensitive. Save formula refreshers for tomorrow if needed.
                    </span>
                  </div>
                </motion.div>
              )}

              {/* celebratory complete banner */}
              <AnimatePresence>
                {allComplete && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-4"
                  >
                    <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />
                    <div className="relative flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
                        <PartyPopper className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                            Today&apos;s revision complete!
                          </div>
                          <p className="text-xs text-muted-foreground">
                            You cleared all {tasks.length} task{tasks.length === 1 ? "" : "s"} in ~{formatMin(totalEst)}. Keep the streak alive — spaced repetition compounds.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!sessionSaved ? (
                            <Button
                              size="sm"
                              onClick={saveSession}
                              className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              Save session to My Research
                            </Button>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> Saved to My Research
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={resetTasks}
                            className="gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Reset
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* tasks */}
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="font-medium">No due tasks today</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                    No due flashcards, no favourites, and no weak topics detected. Come back tomorrow or create new material.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      done={completed.has(t.id)}
                      onToggle={() => toggleTask(t.id)}
                      onStart={() => startTask(t)}
                    />
                  ))}
                </div>
              )}

              {/* footer actions */}
              {tasks.length > 0 && !allComplete && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <div className="text-xs text-muted-foreground">
                    {completedCount > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {completedCount} of {tasks.length} complete
                      </span>
                    ) : (
                      <span>Check off tasks as you finish them.</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {completedCount > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={resetTasks}
                        className="gap-1.5 text-xs"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reset
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={markAllComplete}
                      className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark all complete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== Right column: stats + settings ===== */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                  Revision Stats
                </CardTitle>
                <CardDescription>Your spaced-repetition pulse</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <StatTile
                    icon={Flame}
                    label="Due today"
                    value={mounted ? <AnimatedCounter value={dueCards.length} /> : 0}
                    accent="violet"
                  />
                  <StatTile
                    icon={CalendarClock}
                    label="Due this week"
                    value={mounted ? <AnimatedCounter value={weekDue} /> : 0}
                    accent="amber"
                  />
                  <StatTile
                    icon={Award}
                    label="Cards mastered"
                    value={mounted ? <AnimatedCounter value={masteredCount} /> : 0}
                    accent="emerald"
                  />
                  <StatTile
                    icon={Brain}
                    label="Avg ease factor"
                    value={mounted ? avgEase.toFixed(2) : "0.00"}
                    accent="violet"
                  />
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Mastery distribution</span>
                    <span className="font-medium">{allCards.length} cards total</span>
                  </div>
                  <MasteryBars cards={allCards} />
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-fuchsia-500" />
                  Daily Time Budget
                </CardTitle>
                <CardDescription>
                  Set a daily revision cap. Tasks beyond budget are flagged for prioritisation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">10 min</span>
                  <span
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      overBudget ? "text-amber-600 dark:text-amber-400" : "text-foreground",
                    )}
                  >
                    {budget}
                    <span className="ml-1 text-xs font-medium text-muted-foreground">min</span>
                  </span>
                  <span className="text-xs text-muted-foreground">120 min</span>
                </div>
                <Slider
                  value={[budget]}
                  min={10}
                  max={120}
                  step={5}
                  onValueChange={(v) => setBudget(v[0] ?? 30)}
                  className="py-1"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[15, 30, 45, 60, 90].map((m) => (
                    <button
                      key={m}
                      onClick={() => setBudget(m)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[11px] font-medium transition",
                        budget === m
                          ? "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300"
                          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
                {overBudget ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Over budget by {formatMin(totalEst - budget)}
                    </div>
                    <p className="mt-1 text-muted-foreground leading-relaxed">
                      Prioritise due flashcards first — spaced repetition is time-sensitive.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Within budget
                    </div>
                    <p className="mt-1 text-muted-foreground leading-relaxed">
                      {totalEst === 0
                        ? "No tasks scheduled."
                        : `${formatMin(budget - totalEst)} of slack remaining today.`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ===== Upcoming 7-day strip ===== */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-violet-500" />
                  Upcoming Revisions
                </CardTitle>
                <CardDescription>Next 7 days of spaced-repetition dues</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1.5 border-foreground/10">
                <ListChecks className="h-3 w-3" />
                {upcoming.reduce((s, d) => s + d.count, 0)} cards queued
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
              {upcoming.map((d, i) => {
                const isToday = isSameDay(d.date, new Date());
                const isSel = selectedDayIdx === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDayIdx(isSel ? null : i)}
                    className={cn(
                      "group relative flex flex-col items-center justify-center rounded-lg border p-2.5 transition-all min-h-[88px]",
                      isSel
                        ? "border-violet-500/40 bg-violet-500/10"
                        : "border-border bg-muted/30 hover:bg-muted hover:border-foreground/20",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] uppercase font-semibold tracking-wider",
                        isToday ? "text-violet-500" : "text-muted-foreground",
                      )}
                    >
                      {format(d.date, "EEE")}
                    </span>
                    <span className="text-base font-bold tabular-nums">{format(d.date, "d")}</span>
                    <span
                      className={cn(
                        "text-xs tabular-nums font-medium",
                        d.count === 0
                          ? "text-muted-foreground/60"
                          : "text-violet-600 dark:text-violet-300",
                      )}
                    >
                      {d.count} due
                    </span>
                    {d.count > 0 && (
                      <div className="mt-1 h-1 w-8 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                          style={{ width: `${Math.min(100, d.count * 10)}%` }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day detail */}
            <AnimatePresence>
              {selectedDay && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-violet-500" />
                        <span className="text-sm font-semibold">
                          {format(selectedDay.date, "EEEE, MMM d")}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {differenceInCalendarDays(selectedDay.date, new Date())} day
                          {differenceInCalendarDays(selectedDay.date, new Date()) === 1 ? "" : "s"} away
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setView("flashcards")}
                        className="gap-1 text-xs text-violet-600 dark:text-violet-300"
                      >
                        Open Flashcards
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                    {selectedDay.cards.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        No cards due on this day. Use the time for new material or rest.
                      </p>
                    ) : (
                      <ScrollArea className="max-h-56">
                        <ul className="space-y-1.5 pr-2">
                          {selectedDay.cards.map((c) => (
                            <li
                              key={c.id}
                              className="flex items-start gap-2 rounded-md border border-border/60 bg-background/60 p-2"
                            >
                              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-500/10 text-violet-600 dark:text-violet-300">
                                <Layers className="h-3 w-3" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate">{c.front}</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <span className="truncate">{c.topic || "General"}</span>
                                  <span>·</span>
                                  <span>{c.mastery}</span>
                                  <span>·</span>
                                  <span>EF {c.easeFactor.toFixed(2)}</span>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* ===== Insight footer ===== */}
        <Card className="bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div className="flex-1 text-sm">
              <span className="font-semibold">How the plan is built:</span>{" "}
              <span className="text-muted-foreground">
                Due flashcards use the SM-2 spaced-repetition algorithm (nextReview &le; now).
                Formula refreshers mix your favourites with 5 random formulas for active recall.
                Weak topics are the most-repeated topics across your saved explanations, evolutions,
                papers, and MCQs.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView("topic-mastery")}
              className="gap-1.5 shrink-0"
            >
              <Target className="h-3.5 w-3.5" />
              Topic Mastery
            </Button>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

// ============================================================
// StatTile
// ============================================================
function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  accent: "violet" | "emerald" | "amber";
}) {
  const accents = {
    violet: "from-violet-500 to-fuchsia-500 text-violet-600 dark:text-violet-300 bg-violet-500/10",
    emerald: "from-emerald-500 to-teal-500 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10",
    amber: "from-amber-500 to-orange-500 text-amber-600 dark:text-amber-300 bg-amber-500/10",
  } as const;
  const a = accents[accent];
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5">
        <div className={cn("flex h-6 w-6 items-center justify-center rounded-md", a.split(" ").slice(2).join(" "))}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1.5 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

// ============================================================
// MasteryBars — mini stacked distribution
// ============================================================
function MasteryBars({ cards }: { cards: Flashcard[] }) {
  const buckets = useMemo(() => {
    const b = { New: 0, Learning: 0, Reviewing: 0, Mastered: 0 } as Record<string, number>;
    for (const c of cards) b[c.mastery] = (b[c.mastery] ?? 0) + 1;
    return b;
  }, [cards]);
  const total = cards.length || 1;
  const segs = [
    { key: "New", color: "bg-zinc-400" },
    { key: "Learning", color: "bg-amber-500" },
    { key: "Reviewing", color: "bg-violet-500" },
    { key: "Mastered", color: "bg-emerald-500" },
  ];
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {segs.map((s) => {
          const v = buckets[s.key] ?? 0;
          if (v === 0) return null;
          return (
            <div
              key={s.key}
              className={s.color}
              style={{ width: `${(v / total) * 100}%` }}
              title={`${s.key}: ${v}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
        {segs.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1 text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-sm", s.color)} />
            {s.key} <span className="font-medium text-foreground">{buckets[s.key] ?? 0}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
