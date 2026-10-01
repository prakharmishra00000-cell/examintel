"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Target,
  CheckCircle2,
  Flame,
  Clock,
  Brain,
  TrendingUp,
  Plus,
  Calendar,
  Zap,
  Minus,
  Pencil,
  Check,
  Sparkles,
  Trash2,
  Award,
} from "lucide-react";
import {
  format,
  subDays,
  isToday as isDateToday,
  parseISO,
} from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useStudyStore, type StudySession } from "@/store/study-store";
import { useJournalStore, type JournalEntry } from "@/store/journal-store";
import {
  useGoalsStore,
  type DailyGoal,
  computeLongestStreak,
  totalCompletedDays,
} from "@/store/goals-store";
import { AnimatedCounter } from "@/components/shared/premium-empty-state";
import type { SavedItem } from "@/types";

// ============================================================
// Daily Goals tracker — set study targets (minutes / questions
// / topics), track completion, and build streaks. Aggregates
// today's progress from study/journal stores + saved papers/mcq
// on mount via recomputeFromStores. Manual logging via quick-add
// buttons (+30 min / +10 Qs / +1 topic). Streaks grace for
// yesterday if today isn't yet complete.
// ============================================================

// ---------- Hydration-safe mounted guard ----------
// useSyncExternalStore with noop subscribe + true (client) / false (server)
// snapshots — the lint-compliant "is client" pattern that avoids
// react-hooks/set-state-in-effect.
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

// ---------- Ring color themes (NO indigo/blue) ----------
type RingColor = "violet" | "fuchsia" | "emerald";

const RING_THEME: Record<
  RingColor,
  {
    gradId: string;
    stops: { offset: string; color: string }[];
    text: string;
    glow: string;
    chip: string;
    bar: string;
    iconBg: string;
  }
> = {
  violet: {
    gradId: "ring-grad-violet",
    stops: [
      { offset: "0%", color: "#8b5cf6" },
      { offset: "100%", color: "#a855f7" },
    ],
    text: "text-violet-600 dark:text-violet-400",
    glow: "shadow-[0_0_24px_rgba(139,92,246,0.35)]",
    chip: "bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300",
    bar: "from-violet-500 to-purple-500",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-500",
  },
  fuchsia: {
    gradId: "ring-grad-fuchsia",
    stops: [
      { offset: "0%", color: "#d946ef" },
      { offset: "100%", color: "#ec4899" },
    ],
    text: "text-fuchsia-600 dark:text-fuchsia-400",
    glow: "shadow-[0_0_24px_rgba(217,70,239,0.35)]",
    chip: "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300",
    bar: "from-fuchsia-500 to-pink-500",
    iconBg: "bg-gradient-to-br from-fuchsia-500 to-pink-500",
  },
  emerald: {
    gradId: "ring-grad-emerald",
    stops: [
      { offset: "0%", color: "#10b981" },
      { offset: "100%", color: "#14b8a6" },
    ],
    text: "text-emerald-600 dark:text-emerald-400",
    glow: "shadow-[0_0_24px_rgba(16,185,129,0.35)]",
    chip: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    bar: "from-emerald-500 to-teal-500",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
  },
};

// ---------- Integration stats: pull from study/journal/saved ----------
function dayKeyFromISO(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return (iso || "").slice(0, 10);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function todayKey(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

interface IntegrationStats {
  totalMinutesToday: number;
  questionsAttemptedToday: number;
  topicsStudiedToday: number;
}

function computeIntegrationStats(
  sessions: StudySession[],
  entries: JournalEntry[],
  saved: SavedItem[]
): IntegrationStats {
  const tKey = todayKey();
  let minutes = 0;
  const topics = new Set<string>();

  // Study sessions (today)
  for (const s of sessions) {
    if (dayKeyFromISO(s.date) !== tKey) continue;
    minutes += Math.max(0, s.durationMinutes || 0);
    const topic = (s.topic || "").trim().toLowerCase();
    if (topic) topics.add(topic);
  }
  // Journal entries (today)
  for (const e of entries) {
    if ((e.date || "").slice(0, 10) !== tKey) continue;
    minutes += Math.max(0, e.durationMinutes || 0);
    const topic = (e.topic || "").trim().toLowerCase();
    if (topic) topics.add(topic);
  }

  // Questions attempted today (saved paper / mcq items created today)
  let questions = 0;
  for (const item of saved) {
    if (item.type !== "paper" && item.type !== "mcq") continue;
    if (dayKeyFromISO(item.createdAt) !== tKey) continue;
    const data = (item.data ?? null) as Record<string, unknown> | null;
    if (!data) continue;
    if (item.type === "paper") {
      const paper = (data as { paper?: { questions?: unknown[] } }).paper;
      const direct = (data as { questions?: unknown[] }).questions;
      const qs = Array.isArray(paper?.questions)
        ? paper!.questions!
        : Array.isArray(direct)
          ? direct
          : [];
      questions += qs.length;
    } else {
      const setData = (data as { set?: { mcqs?: unknown[] } }).set;
      const direct = (data as { mcqs?: unknown[] }).mcqs;
      const mcqs = Array.isArray(setData?.mcqs)
        ? setData!.mcqs!
        : Array.isArray(direct)
          ? direct
          : [];
      questions += mcqs.length;
    }
  }

  return {
    totalMinutesToday: minutes,
    questionsAttemptedToday: questions,
    topicsStudiedToday: topics.size,
  };
}

// ============================================================
// ProgressRing — SVG circular progress with gradient stroke
// ============================================================
function ProgressRing({
  value,
  goal,
  color,
  label,
  unit,
  icon: Icon,
  editMode,
  onAdjust,
}: {
  value: number;
  goal: number;
  color: RingColor;
  label: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  editMode: boolean;
  onAdjust: (delta: number) => void;
}) {
  const theme = RING_THEME[color];
  const r = 32;
  const c = 2 * Math.PI * r;
  const safeGoal = Math.max(1, goal);
  const pct = Math.max(0, Math.min(100, (Math.max(0, value) / safeGoal) * 100));
  const offset = c * (1 - pct / 100);
  const complete = value >= goal;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg viewBox="0 0 80 80" className="h-20 w-20 sm:h-24 sm:w-24">
          <defs>
            <linearGradient id={theme.gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              {theme.stops.map((s) => (
                <stop key={s.offset} offset={s.offset} stopColor={s.color} />
              ))}
            </linearGradient>
          </defs>
          {/* track */}
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-zinc-500/15 dark:text-zinc-400/10"
          />
          {/* progress arc */}
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={`url(#${theme.gradId})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 40 40)"
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)" }}
          />
          {/* completion check ring */}
          {complete && (
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              opacity="0.6"
            />
          )}
        </svg>
        {/* center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon
            className={cn(
              "h-3.5 w-3.5 mb-0.5",
              complete ? "text-emerald-500" : theme.text
            )}
          />
          <span className="text-xs font-bold leading-none">
            {Math.max(0, Math.round(value))}
            <span className="text-muted-foreground/60 font-medium">
              /{goal}
            </span>
          </span>
          <span className="text-[9px] text-muted-foreground mt-0.5">{unit}</span>
        </div>
      </div>

      <div className="text-center">
        <div className={cn("text-xs font-semibold", theme.text)}>{label}</div>
        <div className="text-[10px] text-muted-foreground">
          {Math.round(pct)}% · {Math.max(0, goal - Math.max(0, value))} left
        </div>
      </div>

      {/* +/- target adjuster (edit mode only) */}
      {editMode && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-6 w-6 rounded-full"
            onClick={() => onAdjust(-5)}
            title="Decrease target by 5"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-center">
            {goal}
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-6 w-6 rounded-full"
            onClick={() => onAdjust(5)}
            title="Increase target by 5"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// StreakCalendarDots — last N days as colored dots
// ============================================================
function StreakCalendarDots({ goals }: { goals: DailyGoal[] }) {
  const map = useMemo(() => {
    const m = new Map<string, DailyGoal>();
    for (const g of goals) m.set(g.date, g);
    return m;
  }, [goals]);

  const days = useMemo(() => {
    const out: { date: Date; key: string; state: "completed" | "missed" | "no-goal" }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = subDays(today, i);
      const key = d.toISOString().slice(0, 10);
      const g = map.get(key);
      let state: "completed" | "missed" | "no-goal" = "no-goal";
      if (g) state = g.completed ? "completed" : "missed";
      // Future days are always no-goal
      if (d > today) state = "no-goal";
      out.push({ date: d, key, state });
    }
    return out;
  }, [map]);

  const todayStr = todayKey();

  return (
    <div className="flex flex-wrap gap-1.5 justify-center">
      {days.map(({ date, key, state }) => {
        const isToday = key === todayStr;
        return (
          <div
            key={key}
            className="flex flex-col items-center gap-1"
            title={`${format(date, "EEE MMM d")} — ${
              state === "completed"
                ? "Completed"
                : state === "missed"
                  ? "Goal set, not met"
                  : "No goal set"
            }`}
          >
            <div
              className={cn(
                "h-3 w-3 rounded-full ring-1 ring-inset transition-colors",
                state === "completed" && "bg-emerald-500 ring-emerald-500/50",
                state === "missed" && "bg-rose-500/70 ring-rose-500/40",
                state === "no-goal" && "bg-zinc-400/20 ring-zinc-400/30",
                isToday && "scale-125 ring-2 ring-offset-1 ring-offset-background ring-violet-500"
              )}
            />
            <span
              className={cn(
                "text-[8px] tabular-nums",
                isToday ? "text-violet-500 font-bold" : "text-muted-foreground/60"
              )}
            >
              {format(date, "d")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// HistoryRow — one day in the 7-day history list
// ============================================================
function HistoryRow({ goal }: { goal: DailyGoal }) {
  const mPct = Math.min(100, (goal.minutesDone / Math.max(1, goal.minutesGoal)) * 100);
  const qPct = Math.min(100, (goal.questionsDone / Math.max(1, goal.questionsGoal)) * 100);
  const tPct = Math.min(100, (goal.topicsDone / Math.max(1, goal.topicsGoal)) * 100);
  const overall = Math.round((mPct + qPct + tPct) / 3);
  const d = parseISO(goal.date + "T00:00:00");
  const isToday = isDateToday(d);

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        goal.completed
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-card/50"
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {goal.completed ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : (
            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {format(d, "EEEE, MMM d")}
              {isToday && (
                <span className="ml-2 text-[10px] text-violet-500 font-semibold">
                  TODAY
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {goal.completed ? "Goal complete" : `${overall}% overall`}
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0",
            goal.completed
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "text-muted-foreground"
          )}
        >
          {overall}%
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-muted-foreground">Min</span>
            <span className="font-medium tabular-nums">
              {goal.minutesDone}/{goal.minutesGoal}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
              style={{ width: `${mPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-muted-foreground">Qs</span>
            <span className="font-medium tabular-nums">
              {goal.questionsDone}/{goal.questionsGoal}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all"
              style={{ width: `${qPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-muted-foreground">Top</span>
            <span className="font-medium tabular-nums">
              {goal.topicsDone}/{goal.topicsGoal}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
              style={{ width: `${tPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main view
// ============================================================
export function DailyGoals() {
  const mounted = useMounted();
  const setContext = useAppStore((s) => s.setContext);

  const goals = useGoalsStore((s) => s.goals);
  const streak = useGoalsStore((s) => s.streak);
  const defaultMinutes = useGoalsStore((s) => s.defaultMinutes);
  const defaultQuestions = useGoalsStore((s) => s.defaultQuestions);
  const defaultTopics = useGoalsStore((s) => s.defaultTopics);
  const ensureTodayGoal = useGoalsStore((s) => s.ensureTodayGoal);
  const updateProgress = useGoalsStore((s) => s.updateProgress);
  const updateTodayTargets = useGoalsStore((s) => s.updateTodayTargets);
  const recomputeFromStores = useGoalsStore((s) => s.recomputeFromStores);
  const setDefaults = useGoalsStore((s) => s.setDefaults);
  const clearAll = useGoalsStore((s) => s.clearAll);

  const sessions = useStudyStore((s) => s.sessions);
  const entries = useJournalStore((s) => s.entries);
  const saved = useAppStore((s) => s.saved);

  const [editMode, setEditMode] = useState(false);
  const [defaultsOpen, setDefaultsOpen] = useState(false);

  // Set AI assistant context on mount
  useEffect(() => {
    setContext("Daily Goals", "general");
  }, [setContext]);

  // Pull today's progress from source stores on mount + whenever
  // the source stores change. ensureTodayGoal first so today's
  // goal always exists; recomputeFromStores then sets today's
  // progress from the aggregated stats (absolute — overwrites).
  useEffect(() => {
    if (!mounted) return;
    ensureTodayGoal();
    const stats = computeIntegrationStats(sessions, entries, saved);
    recomputeFromStores(stats);
  }, [mounted, sessions, entries, saved, ensureTodayGoal, recomputeFromStores]);

  // Today's goal (recompute from store each render)
  const todayGoal = useMemo(() => {
    const k = todayKey();
    return goals.find((g) => g.date === k);
  }, [goals]);

  // Overall % across 3 rings
  const overallPct = todayGoal
    ? Math.round(
        (Math.min(100, (todayGoal.minutesDone / Math.max(1, todayGoal.minutesGoal)) * 100) +
          Math.min(100, (todayGoal.questionsDone / Math.max(1, todayGoal.questionsGoal)) * 100) +
          Math.min(100, (todayGoal.topicsDone / Math.max(1, todayGoal.topicsGoal)) * 100)) /
          3
      )
    : 0;

  const allMet = todayGoal?.completed ?? false;

  // Last 7 days history (including today)
  const last7 = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: DailyGoal[] = [];
    for (let i = 6; i >= 0; i--) {
      const key = subDays(today, i).toISOString().slice(0, 10);
      const g = goals.find((x) => x.date === key);
      if (g) out.push(g);
    }
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [goals]);

  // Derived streak stats
  const longest = useMemo(() => computeLongestStreak(goals), [goals]);
  const completedDays = useMemo(() => totalCompletedDays(goals), [goals]);
  const totalTracked = goals.length;

  // Quick add buttons
  const handleQuickAdd = (m: number, q: number, t: number) => {
    updateProgress(m, q, t);
    const parts: string[] = [];
    if (m) parts.push(`+${m} min`);
    if (q) parts.push(`+${q} Qs`);
    if (t) parts.push(`+${t} topic${t > 1 ? "s" : ""}`);
    toast.success(`Logged ${parts.join(" · ")}`);
  };

  const handleAdjustTarget = (
    field: "minutesGoal" | "questionsGoal" | "topicsGoal",
    delta: number
  ) => {
    if (!todayGoal) return;
    const current = todayGoal[field];
    updateTodayTargets({ [field]: Math.max(1, current + delta) });
  };

  const handleUpdateDefault = (
    field: "minutes" | "questions" | "topics",
    value: number
  ) => {
    const v = Math.max(1, Number.isFinite(value) ? value : 1);
    const next = {
      minutes: field === "minutes" ? v : defaultMinutes,
      questions: field === "questions" ? v : defaultQuestions,
      topics: field === "topics" ? v : defaultTopics,
    };
    setDefaults(next.minutes, next.questions, next.topics);
  };

  const handleClearAll = () => {
    if (!window.confirm("Clear all daily goal history? This cannot be undone.")) return;
    clearAll();
    toast.success("Goal history cleared");
  };

  // ---------- SSR fallback (server renders an empty shell) ----------
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
          <div className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"
      >
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
            <div className="relative h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
              <Target className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Daily Goals</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Set study targets. Track completion. Build streaks. Stay consistent.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300"
          >
            <Calendar className="h-3 w-3" />
            {format(new Date(), "EEEE, MMM d")}
          </Badge>
        </div>
      </motion.div>

      {/* ---------- Today's Goal card ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <Card
          className={cn(
            "relative overflow-hidden transition-all duration-500",
            allMet
              ? "border-emerald-500/40 shadow-[0_0_40px_-8px_rgba(16,185,129,0.45)]"
              : "border-border shadow-lg"
          )}
        >
          {/* gradient backdrop */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              allMet
                ? "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent opacity-100"
                : "bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent opacity-100"
            )}
          />
          <CardContent className="relative p-5 sm:p-6">
            {/* Top row: label + edit */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center text-white shadow",
                    allMet
                      ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                      : "bg-gradient-to-br from-violet-500 to-fuchsia-500"
                  )}
                >
                  {allMet ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Target className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold leading-none">
                    Today&apos;s Goal
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {allMet ? "All targets met — streak extended" : "Hit all 3 to extend your streak"}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant={editMode ? "default" : "outline"}
                onClick={() => setEditMode((v) => !v)}
                className={cn(
                  "h-8 gap-1.5",
                  editMode &&
                    "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent"
                )}
              >
                {editMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                <span className="text-xs">{editMode ? "Done" : "Edit"}</span>
              </Button>
            </div>

            {/* Hero % + celebration */}
            <div className="flex flex-col items-center justify-center mb-5 relative">
              <div className="relative">
                {/* celebration emoji burst */}
                <AnimatePresence>
                  {allMet && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute -top-7 -right-7 text-3xl pointer-events-none"
                    >
                      🎉
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {allMet && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ delay: 0.15 }}
                      className="absolute -top-5 -left-7 text-2xl pointer-events-none"
                    >
                      ⭐
                    </motion.div>
                  )}
                </AnimatePresence>

                <div
                  className={cn(
                    "text-5xl sm:text-6xl font-bold tabular-nums bg-clip-text text-transparent bg-gradient-to-br transition-all",
                    allMet
                      ? "from-emerald-500 to-teal-500"
                      : "from-violet-500 via-fuchsia-500 to-pink-500"
                  )}
                >
                  {overallPct}%
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {allMet ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Goal complete! Great work today.
                  </span>
                ) : todayGoal ? (
                  <span>
                    {3 -
                      (Number(todayGoal.minutesDone >= todayGoal.minutesGoal) +
                        Number(todayGoal.questionsDone >= todayGoal.questionsGoal) +
                        Number(todayGoal.topicsDone >= todayGoal.topicsGoal))}{" "}
                    of 3 targets remaining
                  </span>
                ) : (
                  <span>Set today&apos;s targets to begin</span>
                )}
              </div>
            </div>

            {/* 3 progress rings */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
              <ProgressRing
                value={todayGoal?.minutesDone ?? 0}
                goal={todayGoal?.minutesGoal ?? defaultMinutes}
                color="violet"
                label="Minutes"
                unit="min"
                icon={Clock}
                editMode={editMode}
                onAdjust={(d) => handleAdjustTarget("minutesGoal", d)}
              />
              <ProgressRing
                value={todayGoal?.questionsDone ?? 0}
                goal={todayGoal?.questionsGoal ?? defaultQuestions}
                color="fuchsia"
                label="Questions"
                unit="qs"
                icon={Brain}
                editMode={editMode}
                onAdjust={(d) => handleAdjustTarget("questionsGoal", d)}
              />
              <ProgressRing
                value={todayGoal?.topicsDone ?? 0}
                goal={todayGoal?.topicsGoal ?? defaultTopics}
                color="emerald"
                label="Topics"
                unit="topics"
                icon={TrendingUp}
                editMode={editMode}
                onAdjust={(d) => handleAdjustTarget("topicsGoal", d)}
              />
            </div>

            {/* Quick add buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAdd(30, 0, 0)}
                className="gap-1.5 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 text-violet-700 dark:text-violet-300"
              >
                <Clock className="h-3.5 w-3.5" />
                +30 min
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAdd(0, 10, 0)}
                className="gap-1.5 border-fuchsia-500/30 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300"
              >
                <Brain className="h-3.5 w-3.5" />
                +10 questions
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAdd(0, 0, 1)}
                className="gap-1.5 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                +1 topic
              </Button>
            </div>

            {/* integration hint */}
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-2.5">
              <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Auto-synced today from your study sessions, journal entries, and saved papers/MCQs.
                Use quick-add for offline study or sessions the stores don&apos;t capture.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---------- Streak + Stats row ---------- */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Streak card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <Card className="h-full border-amber-500/20 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow">
                    <Flame className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="text-base">Current Streak</CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                >
                  {streak > 0 ? "On fire" : "Start today"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Big streak number */}
              <div className="flex items-end gap-3">
                <div className="text-5xl font-bold tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-amber-500 to-orange-500">
                  <AnimatedCounter value={streak} />
                </div>
                <div className="pb-1.5">
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    day streak
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {streak === 0
                      ? "Complete today to start"
                      : streak < 7
                        ? `${7 - streak} days to Week Warrior`
                        : "Consistency champion"}
                  </div>
                </div>
                {streak > 0 && (
                  <motion.div
                    initial={{ scale: 0.8, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="ml-auto pb-1"
                  >
                    <Flame className="h-10 w-10 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  </motion.div>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <div className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    <AnimatedCounter value={longest} />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Longest streak
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    <AnimatedCounter value={completedDays} />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Completed days
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <div className="text-lg font-bold tabular-nums text-violet-600 dark:text-violet-400">
                    <AnimatedCounter value={totalTracked} />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Days tracked
                  </div>
                </div>
              </div>

              {/* 14-day calendar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Last 14 days
                  </span>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Met
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-rose-500/70" /> Missed
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-zinc-400/30" /> No goal
                    </span>
                  </div>
                </div>
                <StreakCalendarDots goals={goals} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 7-day history */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <Card className="h-full shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="text-base">7-Day History</CardTitle>
                </div>
                <Badge variant="outline" className="text-muted-foreground">
                  {last7.length} {last7.length === 1 ? "day" : "days"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Recent daily goals and per-target progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {last7.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No history yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Set today&apos;s goal to start building your history.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scroll pr-1">
                  {last7.map((g) => (
                    <HistoryRow key={g.id} goal={g} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ---------- Defaults + Danger zone ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Default Targets</CardTitle>
                  <CardDescription className="text-xs">
                    Auto-applied to each new day&apos;s goal.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDefaultsOpen((v) => !v)}
                  className="h-8 text-xs gap-1.5"
                >
                  {defaultsOpen ? "Hide" : "Customize"}
                </Button>
              </div>
            </div>
          </CardHeader>
          {defaultsOpen && (
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="def-min" className="text-xs flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-violet-500" />
                    Default minutes
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="def-min"
                      type="number"
                      min={1}
                      value={defaultMinutes}
                      onChange={(e) =>
                        handleUpdateDefault("minutes", parseInt(e.target.value || "0", 10))
                      }
                      className="h-9"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => handleUpdateDefault("minutes", defaultMinutes - 15)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => handleUpdateDefault("minutes", defaultMinutes + 15)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Auto-applied to new days
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="def-q" className="text-xs flex items-center gap-1.5">
                    <Brain className="h-3 w-3 text-fuchsia-500" />
                    Default questions
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="def-q"
                      type="number"
                      min={1}
                      value={defaultQuestions}
                      onChange={(e) =>
                        handleUpdateDefault("questions", parseInt(e.target.value || "0", 10))
                      }
                      className="h-9"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => handleUpdateDefault("questions", defaultQuestions - 5)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => handleUpdateDefault("questions", defaultQuestions + 5)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Auto-applied to new days
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="def-t" className="text-xs flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    Default topics
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="def-t"
                      type="number"
                      min={1}
                      value={defaultTopics}
                      onChange={(e) =>
                        handleUpdateDefault("topics", parseInt(e.target.value || "0", 10))
                      }
                      className="h-9"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => handleUpdateDefault("topics", defaultTopics - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => handleUpdateDefault("topics", defaultTopics + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Auto-applied to new days
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-5">
                <Badge
                  variant="outline"
                  className="gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                >
                  <Check className="h-3 w-3" />
                  Changes apply automatically
                </Badge>
                <div className="ml-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearAll}
                    className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear history
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
          {!defaultsOpen && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-center">
                  <Clock className="h-4 w-4 text-violet-500 mx-auto mb-1" />
                  <div className="text-xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                    {defaultMinutes}
                  </div>
                  <div className="text-[10px] text-muted-foreground">default min/day</div>
                </div>
                <div className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 text-center">
                  <Brain className="h-4 w-4 text-fuchsia-500 mx-auto mb-1" />
                  <div className="text-xl font-bold tabular-nums text-fuchsia-600 dark:text-fuchsia-400">
                    {defaultQuestions}
                  </div>
                  <div className="text-[10px] text-muted-foreground">default Qs/day</div>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                  <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {defaultTopics}
                  </div>
                  <div className="text-[10px] text-muted-foreground">default topics/day</div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* ---------- Footer note ---------- */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <Award className="h-3.5 w-3.5 text-amber-500" />
        <span>
          Streaks count consecutive completed days — grace for yesterday if today isn&apos;t done yet.
        </span>
      </div>
    </div>
  );
}
