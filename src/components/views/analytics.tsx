"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Award,
  Brain,
  Calendar,
  Activity,
  PieChart,
  Lightbulb,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Timer,
  Trophy,
  ListChecks,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { useAppStore } from "@/store/app-store";
import { useStudyStore, type StudySession } from "@/store/study-store";
import { useJournalStore, type JournalEntry } from "@/store/journal-store";
import { useFlashcardStore } from "@/store/flashcard-store";
import {
  useAchievementsStore,
  useRecomputeAchievements,
} from "@/store/achievements-store";
import { AnimatedCounter, PremiumEmptyState } from "@/components/shared/premium-empty-state";
import type { SavedItem, PerformanceAnalysis } from "@/types";

// ============================================================
// Analytics Dashboard
// Unified insights across all exam-preparation activity:
//   - Performance trends over time
//   - Time distribution by subject (study + journal)
//   - Daily study activity (stacked sessions vs journal)
//   - Mastery by subject (radar)
//   - Difficulty-wise performance (grouped bars)
//   - Topic performance table (sortable)
//   - Auto-generated text insights
// Reads live from 5 stores (app/study/journal/flashcard/achievements).
// Read-only — no new store, no API route.
// ============================================================

// ---------- Chart palette (NO indigo/blue) ----------
const CHART = {
  violet: "#8b5cf6",
  fuchsia: "#d946ef",
  emerald: "#10b981",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  rose: "#f43f5e",
} as const;
const PIE_PALETTE = [
  CHART.violet,
  CHART.fuchsia,
  CHART.emerald,
  CHART.amber,
  CHART.sky,
  CHART.rose,
];

// ---------- Hydration-safe mounted guard (mirrors topic-mastery.tsx) ----------
// useSyncExternalStore with noop subscribe + true(client)/false(server) —
// the lint-compliant "is client" pattern that avoids react-hooks/set-state-in-effect.
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// ---------- Small defensive helpers ----------
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function numOr(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

// Normalize subject strings (trim, collapse spaces, fallback "General").
function normSubject(s: unknown): string {
  const t = str(s);
  if (!t) return "General";
  return t.replace(/\s+/g, " ");
}

// Parse "1m 30s" / "45s" / "90" / "1.5 min" → seconds.
function parseSeconds(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (!s) return null;
  // pattern "Xm Ys"
  let m = s.match(/(\d+)\s*m(?:\s*(\d+(?:\.\d+)?)\s*s)?/);
  if (m) {
    const mins = parseInt(m[1]!, 10);
    const secs = m[2] ? parseFloat(m[2]) : 0;
    return mins * 60 + secs;
  }
  // pattern "Xs"
  m = s.match(/^(\d+(?:\.\d+)?)\s*s/);
  if (m) return parseFloat(m[1]!);
  // pattern "X min" / "X mins"
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:min|mins|minutes)/);
  if (m) return parseFloat(m[1]!) * 60;
  // bare number
  m = s.match(/^(\d+(?:\.\d+)?)/);
  if (m) return parseFloat(m[1]!);
  return null;
}

// ---------- Types ----------
type RangeKey = "7" | "30" | "all";

interface AttemptPoint {
  id: string;
  dateISO: string;
  title: string;
  type: "paper" | "mcq";
  accuracy: number; // 0-100
  correct: number;
  incorrect: number;
  unattempted: number;
  total: number;
  hasAnalysis: boolean;
  difficultyBreakdown: Record<
    "Easy" | "Medium" | "Hard",
    { correct: number; incorrect: number; unattempted: number }
  >;
  topicMap: Map<string, { correct: number; incorrect: number; unattempted: number; total: number }>;
  avgTimePerQuestionSec: number | null;
}

// ---------- Range helpers ----------
function rangeCutoffMs(range: RangeKey): number | null {
  if (range === "all") return null;
  const days = range === "7" ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}
function withinRange(iso: string, cutoff: number | null): boolean {
  if (cutoff === null) return true;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return true; // keep if unparseable (better to show than hide)
  return t >= cutoff;
}
function rangeDays(range: RangeKey): number {
  if (range === "all") return 90; // cap "all time" daily chart at last 90 days for readability
  return range === "7" ? 7 : 30;
}
function rangeLabel(range: RangeKey): string {
  return range === "all" ? "all time" : `last ${range} days`;
}

// ---------- Attempt extractor (papers + mcqs) ----------
// Paper shape: { paper: GeneratedPaper, analysis?: PerformanceAnalysis, answers?: Record<string,string> }
// MCQ shape: { set: { mcqs: GeneratedMCQ[] }, answers?: Record<string,string>, ... }
function extractAttempt(item: SavedItem): AttemptPoint | null {
  const data = (item.data ?? null) as Record<string, unknown> | null;
  if (!data) return null;

  // Use item.createdAt as the attempt date (when the user saved/attemped it).
  const dateISO = item.createdAt;

  // Difficulty buckets keyed by difficulty string
  const diffBuckets: AttemptPoint["difficultyBreakdown"] = {
    Easy: { correct: 0, incorrect: 0, unattempted: 0 },
    Medium: { correct: 0, incorrect: 0, unattempted: 0 },
    Hard: { correct: 0, incorrect: 0, unattempted: 0 },
  };
  function bucketFor(diff?: string): keyof AttemptPoint["difficultyBreakdown"] | null {
    const d = (diff ?? "").trim().toLowerCase();
    if (d === "easy") return "Easy";
    if (d === "medium" || d === "moderate") return "Medium";
    if (d === "hard" || d === "difficult") return "Hard";
    return null;
  }

  const topicMap = new Map<
    string,
    { correct: number; incorrect: number; unattempted: number; total: number }
  >();
  function pushTopic(
    topic: string | undefined,
    correct: number,
    incorrect: number,
    unattempted: number,
  ) {
    const t = (topic ?? "").trim();
    if (!t) return;
    const cur = topicMap.get(t) ?? { correct: 0, incorrect: 0, unattempted: 0, total: 0 };
    cur.correct += correct;
    cur.incorrect += incorrect;
    cur.unattempted += unattempted;
    cur.total += correct + incorrect + unattempted;
    topicMap.set(t, cur);
  }

  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;
  let total = 0;
  let accuracy = 0;
  let hasAnalysis = false;
  let avgTimePerQuestionSec: number | null = null;

  if (item.type === "paper") {
    const paper = (data as { paper?: Record<string, unknown> }).paper;
    const questions = Array.isArray(paper?.questions)
      ? (paper!.questions as unknown as Array<Record<string, unknown>>)
      : Array.isArray((data as { questions?: unknown }).questions)
        ? ((data as { questions?: Array<Record<string, unknown>> }).questions as Array<Record<string, unknown>>)
        : [];
    const analysis = (data as { analysis?: PerformanceAnalysis }).analysis;
    const answers =
      (data as { answers?: Record<string, string> }).answers ?? undefined;

    if (analysis) {
      hasAnalysis = true;
      correct = numOr(analysis.correct, 0);
      incorrect = numOr(analysis.incorrect, 0);
      unattempted = numOr(analysis.unattempted, 0);
      total = correct + incorrect + unattempted;
      const denom = total > 0 ? total : numOr(analysis.maxMarks, 0);
      accuracy = total > 0
        ? (correct / total) * 100
        : typeof analysis.accuracy === "number"
          ? analysis.accuracy
          : 0;
      // difficulty-wise from analysis if present (correct/total only)
      const dw = analysis.difficultyWise ?? [];
      for (const d of dw) {
        const b = bucketFor(d.difficulty);
        if (!b) continue;
        const t = numOr(d.total, 0);
        const c = numOr(d.correct, 0);
        // If we have per-question answers below, prefer that; otherwise split here.
        diffBuckets[b].correct += c;
        diffBuckets[b].incorrect += Math.max(0, t - c);
        diffBuckets[b].unattempted += 0;
      }
      // topic-wise from analysis (correct/total only — split remaining as incorrect)
      for (const tw of analysis.topicWise ?? []) {
        const t = numOr(tw.total, 0);
        const c = numOr(tw.correct, 0);
        pushTopic(tw.topic, c, Math.max(0, t - c), 0);
      }
      avgTimePerQuestionSec = parseSeconds(analysis.avgTimePerQuestion);
    }

    // If we have per-question answers, recompute granular difficulty/topic breakdown
    if (questions.length > 0 && answers && typeof answers === "object") {
      // Reset difficulty counters if analysis-derived (so we don't double-count).
      if (hasAnalysis) {
        diffBuckets.Easy = { correct: 0, incorrect: 0, unattempted: 0 };
        diffBuckets.Medium = { correct: 0, incorrect: 0, unattempted: 0 };
        diffBuckets.Hard = { correct: 0, incorrect: 0, unattempted: 0 };
        topicMap.clear();
      }
      let gc = 0,
        gi = 0,
        gu = 0;
      for (const q of questions) {
        const qid = str(q.id);
        const diff = str(q.difficulty);
        const topic = str(q.topic);
        const correctAnswer = str(q.correctAnswer);
        const picked = qid ? answers[qid] : undefined;
        const b = bucketFor(diff);
        const hasPicked = typeof picked === "string" && picked.trim().length > 0;
        if (hasPicked && correctAnswer) {
          if (picked === correctAnswer) {
            gc++;
            if (b) diffBuckets[b].correct++;
            pushTopic(topic, 1, 0, 0);
          } else {
            gi++;
            if (b) diffBuckets[b].incorrect++;
            pushTopic(topic, 0, 1, 0);
          }
        } else {
          gu++;
          if (b) diffBuckets[b].unattempted++;
          pushTopic(topic, 0, 0, 1);
        }
      }
      // Prefer granular counts if any exist
      if (gc + gi + gu > 0) {
        correct = gc;
        incorrect = gi;
        unattempted = gu;
        total = gc + gi + gu;
        accuracy = total > 0 ? (gc / total) * 100 : 0;
        hasAnalysis = true;
      }
    }
  } else if (item.type === "mcq") {
    const set = (data as { set?: Record<string, unknown> }).set;
    const mcqs = Array.isArray(set?.mcqs)
      ? (set!.mcqs as unknown as Array<Record<string, unknown>>)
      : Array.isArray((data as { mcqs?: unknown }).mcqs)
        ? ((data as { mcqs?: Array<Record<string, unknown>> }).mcqs as Array<Record<string, unknown>>)
        : [];
    const answers =
      (data as { answers?: Record<string, string> }).answers ?? undefined;

    if (mcqs.length === 0) return null;

    // Reset (no analysis-derived counts for mcqs)
    let gc = 0,
      gi = 0,
      gu = 0;
    for (const q of mcqs) {
      const qid = str(q.id);
      const diff = str(q.difficulty);
      const topic = str(q.topic) ?? str(set?.topic);
      const correctAnswer = str(q.correctAnswer);
      const picked = qid ? answers?.[qid] : undefined;
      const b = bucketFor(diff);
      const hasPicked = typeof picked === "string" && picked.trim().length > 0;
      if (hasPicked && correctAnswer) {
        if (picked === correctAnswer) {
          gc++;
          if (b) diffBuckets[b].correct++;
          pushTopic(topic, 1, 0, 0);
        } else {
          gi++;
          if (b) diffBuckets[b].incorrect++;
          pushTopic(topic, 0, 1, 0);
        }
      } else {
        gu++;
        if (b) diffBuckets[b].unattempted++;
        pushTopic(topic, 0, 0, 1);
      }
    }
    correct = gc;
    incorrect = gi;
    unattempted = gu;
    total = mcqs.length;
    accuracy = total > 0 ? (gc / total) * 100 : 0;
    hasAnalysis = true;
    avgTimePerQuestionSec = null; // mcq sets don't carry avgTimePerQuestion
  } else {
    return null;
  }

  if (total === 0 && !hasAnalysis) return null;

  return {
    id: item.id,
    dateISO,
    title: item.title,
    type: item.type,
    accuracy: Math.round(accuracy * 10) / 10,
    correct,
    incorrect,
    unattempted,
    total,
    hasAnalysis,
    difficultyBreakdown: diffBuckets,
    topicMap,
    avgTimePerQuestionSec,
  };
}

// ---------- Mastery score map (for radar) ----------
const MASTERY_SCORE: Record<string, number> = {
  Mastered: 100,
  Strong: 80,
  Reviewing: 70,
  Improving: 60,
  Practicing: 40,
  Learning: 20,
  New: 5,
  Weak: 10,
  Introduced: 10,
  "Not Started": 0,
};

// ---------- Custom tooltip ----------
interface TipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}
function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: TipPayloadItem[];
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur px-3 py-2 shadow-lg text-xs">
      {label !== undefined && (
        <div className="font-medium text-foreground mb-1">{String(label)}</div>
      )}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full inline-block"
              style={{ backgroundColor: p.color ?? CHART.violet }}
            />
            <span className="text-muted-foreground">{p.name ?? p.dataKey}</span>
            <span className="ml-auto font-semibold tabular-nums text-foreground">
              {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Component
// ============================================================
export function Analytics() {
  useRecomputeAchievements(); // keep achievements level live
  const mounted = useMounted();

  const saved = useAppStore((s) => s.saved);
  const sessions = useStudyStore((s) => s.sessions);
  const entries = useJournalStore((s) => s.entries);
  const sets = useFlashcardStore((s) => s.sets);
  const totalXp = useAchievementsStore((s) => s.totalXp);
  const level = useAchievementsStore((s) => s.level);

  const [range, setRange] = useState<RangeKey>("30");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ---------- Aggregated metrics (memoized) ----------
  const data = useMemo(() => {
    const cutoff = rangeCutoffMs(range);

    // Attempts: filter by createdAt within range
    const allAttempts: AttemptPoint[] = saved
      .map(extractAttempt)
      .filter((a): a is AttemptPoint => a !== null);
    const attempts = allAttempts.filter((a) => withinRange(a.dateISO, cutoff));

    // Total study minutes (sessions + journal) within range
    const sessFiltered = sessions.filter((s) =>
      withinRange(s.date, cutoff),
    );
    const jourFiltered = entries.filter((e) => withinRange(e.createdAt, cutoff));
    const totalStudyMinutes =
      sessFiltered.reduce((sum, s) => sum + numOr(s.durationMinutes, 0), 0) +
      jourFiltered.reduce((sum, e) => sum + numOr(e.durationMinutes, 0), 0);

    // Avg accuracy across attempts that have analysis (weighted by total questions)
    const attemptsWithAnalysis = attempts.filter((a) => a.hasAnalysis && a.total > 0);
    let avgAccuracy = 0;
    if (attemptsWithAnalysis.length > 0) {
      const totCorrect = attemptsWithAnalysis.reduce((s, a) => s + a.correct, 0);
      const totTotal = attemptsWithAnalysis.reduce((s, a) => s + a.total, 0);
      avgAccuracy = totTotal > 0 ? (totCorrect / totTotal) * 100 : 0;
    }

    // Questions attempted (sum of total across papers + mcqs in range)
    const questionsAttempted = attempts.reduce(
      (sum, a) => sum + (a.total > 0 ? a.total : 0),
      0,
    );

    // Performance trend (AreaChart): sorted attempts ascending by date
    const trend = [...attempts]
      .filter((a) => a.hasAnalysis && a.total > 0)
      .sort((a, b) => Date.parse(a.dateISO) - Date.parse(b.dateISO))
      .slice(-30) // cap to last 30 attempts
      .map((a) => ({
        date: new Date(a.dateISO).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        accuracy: a.accuracy,
        label: a.title,
      }));

    // Time distribution by subject (PieChart)
    const subjectMinutes = new Map<string, number>();
    for (const s of sessFiltered) {
      const subj = normSubject(s.subject);
      subjectMinutes.set(subj, (subjectMinutes.get(subj) ?? 0) + numOr(s.durationMinutes, 0));
    }
    for (const e of jourFiltered) {
      const subj = normSubject(e.subject);
      subjectMinutes.set(subj, (subjectMinutes.get(subj) ?? 0) + numOr(e.durationMinutes, 0));
    }
    const pieData = [...subjectMinutes.entries()]
      .map(([name, minutes]) => ({ name, hours: +(minutes / 60).toFixed(2), minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8); // cap to top 8 subjects

    // Daily study activity (stacked BarChart): last N days
    const days = rangeDays(range);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyMap = new Map<string, { date: string; sessions: number; journal: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, {
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        sessions: 0,
        journal: 0,
      });
    }
    const normDay = (iso: string) => {
      const d = new Date(iso);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().slice(0, 10);
    };
    for (const s of sessFiltered) {
      const key = normDay(s.date);
      const row = dailyMap.get(key);
      if (row) row.sessions += numOr(s.durationMinutes, 0);
    }
    for (const e of jourFiltered) {
      const key = e.date?.slice(0, 10) ?? normDay(e.createdAt);
      const row = dailyMap.get(key);
      if (row) row.journal += numOr(e.durationMinutes, 0);
    }
    const daily = [...dailyMap.values()];

    // Mastery by subject (RadarChart)
    // Subjects derived from: study sessions, journal entries, flashcard set topics,
    // paper examNames, mcq set topics.
    const radarSubjects = new Set<string>();
    sessFiltered.forEach((s) => radarSubjects.add(normSubject(s.subject)));
    jourFiltered.forEach((e) => radarSubjects.add(normSubject(e.subject)));
    sets.forEach((s) => radarSubjects.add(normSubject(s.topic)));
    for (const item of saved) {
      const d = (item.data ?? null) as Record<string, unknown> | null;
      if (!d) continue;
      if (item.type === "paper") {
        const paper = d.paper as Record<string, unknown> | undefined;
        radarSubjects.add(normSubject(paper?.examName ?? "Paper"));
      } else if (item.type === "mcq") {
        const set = d.set as Record<string, unknown> | undefined;
        radarSubjects.add(normSubject(set?.topic ?? "MCQ"));
      }
    }

    // Per-subject mastery score
    const radarData: { subject: string; mastery: number }[] = [];
    for (const subj of radarSubjects) {
      // flashcard mastery (avg MASTERY_SCORE across cards whose set.topic normalizes to subj)
      let fcSum = 0;
      let fcN = 0;
      for (const s of sets) {
        if (normSubject(s.topic) !== subj) continue;
        for (const c of s.cards) {
          fcSum += MASTERY_SCORE[c.mastery] ?? 0;
          fcN++;
        }
      }
      // question accuracy (avg of attempts whose examName/set.topic/subject normalizes to subj)
      let accSum = 0;
      let accN = 0;
      for (const item of saved) {
        if (!withinRange(item.createdAt, cutoff)) continue;
        const d = (item.data ?? null) as Record<string, unknown> | null;
        if (!d) continue;
        let subjField: string | undefined;
        if (item.type === "paper") {
          const paper = d.paper as Record<string, unknown> | undefined;
          subjField = str(paper?.examName);
        } else if (item.type === "mcq") {
          const set = d.set as Record<string, unknown> | undefined;
          subjField = str(set?.topic);
        }
        if (subjField && normSubject(subjField) !== subj) continue;
        if (subjField) {
          const a = extractAttempt(item);
          if (a && a.hasAnalysis && a.total > 0) {
            accSum += a.accuracy;
            accN++;
          }
        }
      }
      const fcScore = fcN > 0 ? fcSum / fcN : null;
      const accScore = accN > 0 ? accSum / accN : null;
      let mastery = 0;
      if (fcScore !== null && accScore !== null) {
        mastery = 0.5 * fcScore + 0.5 * accScore;
      } else if (fcScore !== null) {
        mastery = fcScore;
      } else if (accScore !== null) {
        mastery = accScore;
      }
      radarData.push({ subject: subj, mastery: Math.round(mastery) });
    }
    // Keep top 8 subjects by mastery for readability
    radarData.sort((a, b) => b.mastery - a.mastery);
    const radar = radarData.slice(0, 8);

    // Difficulty-wise performance (grouped BarChart)
    const diffAgg = {
      Easy: { correct: 0, incorrect: 0, unattempted: 0 },
      Medium: { correct: 0, incorrect: 0, unattempted: 0 },
      Hard: { correct: 0, incorrect: 0, unattempted: 0 },
    };
    for (const a of attempts) {
      for (const k of ["Easy", "Medium", "Hard"] as const) {
        diffAgg[k].correct += a.difficultyBreakdown[k].correct;
        diffAgg[k].incorrect += a.difficultyBreakdown[k].incorrect;
        diffAgg[k].unattempted += a.difficultyBreakdown[k].unattempted;
      }
    }
    const difficulty = [
      {
        difficulty: "Easy",
        Correct: diffAgg.Easy.correct,
        Incorrect: diffAgg.Easy.incorrect,
        Unattempted: diffAgg.Easy.unattempted,
      },
      {
        difficulty: "Medium",
        Correct: diffAgg.Medium.correct,
        Incorrect: diffAgg.Medium.incorrect,
        Unattempted: diffAgg.Medium.unattempted,
      },
      {
        difficulty: "Hard",
        Correct: diffAgg.Hard.correct,
        Incorrect: diffAgg.Hard.incorrect,
        Unattempted: diffAgg.Hard.unattempted,
      },
    ];

    // Topic performance table (from attempts' topicMap)
    const topicAgg = new Map<
      string,
      { attempts: number; correct: number; total: number; avgTimeSec: number; timeSamples: number }
    >();
    for (const a of attempts) {
      for (const [topic, v] of a.topicMap.entries()) {
        if (v.total === 0) continue;
        const cur = topicAgg.get(topic) ?? {
          attempts: 0,
          correct: 0,
          total: 0,
          avgTimeSec: 0,
          timeSamples: 0,
        };
        cur.attempts += 1;
        cur.correct += v.correct;
        cur.total += v.total;
        if (a.avgTimePerQuestionSec !== null) {
          // Add this attempt's avgTimePerQuestion contribution.
          cur.avgTimeSec += a.avgTimePerQuestionSec;
          cur.timeSamples += 1;
        }
        topicAgg.set(topic, cur);
      }
    }
    const topicRows = [...topicAgg.entries()]
      .map(([topic, v]) => ({
        topic,
        attempts: v.attempts,
        accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 1000) / 10 : 0,
        avgTime:
          v.timeSamples > 0 && v.avgTimeSec > 0
            ? Math.round((v.avgTimeSec / v.timeSamples) * 10) / 10
            : null,
      }))
      .sort((a, b) => (sortDir === "desc" ? b.accuracy - a.accuracy : a.accuracy - b.accuracy));

    // Insights
    // Strongest subject by accuracy (only subjects with attempts)
    const subjAcc = new Map<string, { correct: number; total: number }>();
    for (const item of saved) {
      if (!withinRange(item.createdAt, cutoff)) continue;
      const d = (item.data ?? null) as Record<string, unknown> | null;
      if (!d) continue;
      let subjField: string | undefined;
      if (item.type === "paper") {
        const paper = d.paper as Record<string, unknown> | undefined;
        subjField = str(paper?.examName);
      } else if (item.type === "mcq") {
        const set = d.set as Record<string, unknown> | undefined;
        subjField = str(set?.topic);
      }
      if (!subjField) continue;
      const subj = normSubject(subjField);
      const a = extractAttempt(item);
      if (a && a.hasAnalysis && a.total > 0) {
        const cur = subjAcc.get(subj) ?? { correct: 0, total: 0 };
        cur.correct += a.correct;
        cur.total += a.total;
        subjAcc.set(subj, cur);
      }
    }
    const subjAccList = [...subjAcc.entries()]
      .map(([subj, v]) => ({
        subject: subj,
        accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 1000) / 10 : 0,
        total: v.total,
      }))
      .filter((x) => x.total >= 1)
      .sort((a, b) => b.accuracy - a.accuracy);
    const strongest = subjAccList[0];
    const weakest = subjAccList[subjAccList.length - 1];

    // Most studied topic (by total minutes across sessions + journal)
    const topicMinutes = new Map<string, number>();
    for (const s of sessFiltered) {
      const t = str(s.topic);
      if (!t) continue;
      topicMinutes.set(t, (topicMinutes.get(t) ?? 0) + numOr(s.durationMinutes, 0));
    }
    for (const e of jourFiltered) {
      const t = str(e.topic);
      if (!t) continue;
      topicMinutes.set(t, (topicMinutes.get(t) ?? 0) + numOr(e.durationMinutes, 0));
    }
    const mostStudiedTopic = [...topicMinutes.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      attempts,
      totalStudyMinutes,
      avgAccuracy,
      questionsAttempted,
      trend,
      pieData,
      daily,
      radar,
      difficulty,
      topicRows,
      strongest,
      weakest,
      mostStudiedTopic,
      hasAnyData:
        attempts.length > 0 ||
        sessFiltered.length > 0 ||
        jourFiltered.length > 0 ||
        sets.length > 0,
      filteredSessCount: sessFiltered.length,
      filteredJourCount: jourFiltered.length,
    };
  }, [saved, sessions, entries, sets, range, sortDir]);

  // ---------- Skeleton (during hydration) ----------
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="h-7 w-56 rounded-md bg-muted/60 animate-pulse" />
          <div className="h-4 w-80 max-w-full rounded-md bg-muted/40 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-border bg-muted/30 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-72 rounded-xl border border-border bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ---------- Empty state ----------
  if (!data.hasAnyData) {
    return (
      <div className="space-y-6">
        <AnalyticsHeader />
        <PremiumEmptyState
          icon={BarChart3}
          accent="violet"
          title="No analytics yet"
          description="Attempt a paper or MCQ set, study with the timer, or write a journal entry to see your insights here."
          ctaLabel="Generate a paper"
          ctaIcon={Sparkles}
          ctaOnClick={() => useAppStore.getState().setView("paper-generator")}
        />
      </div>
    );
  }

  // ---------- KPI cards ----------
  const kpis = [
    {
      label: "Total Study Time",
      value: data.totalStudyMinutes,
      suffix: "min",
      icon: Clock,
      grad: "from-violet-500 to-fuchsia-500",
      sub: `${data.filteredSessCount + data.filteredJourCount} sessions in ${rangeLabel(range)}`,
    },
    {
      label: "Avg Accuracy",
      value: Math.round(data.avgAccuracy * 10) / 10,
      suffix: "%",
      icon: Target,
      grad: "from-emerald-500 to-teal-500",
      sub: `${data.attempts.filter((a) => a.hasAnalysis && a.total > 0).length} attempts`,
    },
    {
      label: "Questions Attempted",
      value: data.questionsAttempted,
      suffix: "",
      icon: ListChecks,
      grad: "from-fuchsia-500 to-pink-500",
      sub: `${data.attempts.length} saved papers & MCQs`,
    },
    {
      label: "Current Level",
      value: level,
      suffix: "",
      icon: Trophy,
      grad: "from-amber-500 to-orange-500",
      sub: `${totalXp} XP total`,
    },
  ];

  return (
    <div className="space-y-6 pb-4">
      <AnalyticsHeader />

      {/* Time range selector */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">Range:</span>
        {([
          { k: "7" as RangeKey, label: "7 days" },
          { k: "30" as RangeKey, label: "30 days" },
          { k: "all" as RangeKey, label: "All time" },
        ]).map((r) => (
          <button
            key={r.k}
            onClick={() => setRange(r.k)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition border",
              range === r.k
                ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent shadow-md shadow-violet-500/20"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Row 1: KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const KIcon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="relative overflow-hidden border-border/70 hover:border-border transition-colors">
                <div className={cn("absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-25 bg-gradient-to-br", kpi.grad)} />
                <CardContent className="relative p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md", kpi.grad)}>
                      <KIcon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold tabular-nums tracking-tight">
                    <AnimatedCounter value={kpi.value} />
                    <span className="text-sm text-muted-foreground ml-1">{kpi.suffix}</span>
                  </div>
                  <div className="text-xs font-medium mt-0.5">{kpi.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{kpi.sub}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Row 2: Performance Trend + Time Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm">Performance Trend</CardTitle>
                <CardDescription className="text-xs">Accuracy % over recent attempts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.trend.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground text-center px-6">
                No analysed attempts in {rangeLabel(range)}. Generate &amp; attempt a paper to populate this chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.violet} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={CHART.violet} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip content={<ChartTooltip suffix="%" />} />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    name="Accuracy"
                    stroke={CHART.violet}
                    strokeWidth={2.5}
                    fill="url(#perfGrad)"
                    dot={{ r: 3, fill: CHART.violet, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: CHART.fuchsia }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-500">
                <PieChart className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm">Time Distribution</CardTitle>
                <CardDescription className="text-xs">Hours studied per subject</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.pieData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground text-center px-6">
                No study sessions or journal entries in {rangeLabel(range)}.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={220} className="!w-full sm:!w-1/2">
                  <RPieChart>
                    <Pie
                      data={data.pieData}
                      dataKey="hours"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={84}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {data.pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip suffix="h" />} />
                  </RPieChart>
                </ResponsiveContainer>
                <div className="flex-1 w-full sm:w-1/2 space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {data.pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 rounded-sm inline-block shrink-0"
                        style={{ backgroundColor: PIE_PALETTE[i % PIE_PALETTE.length] }}
                      />
                      <span className="flex-1 truncate text-foreground/90">{d.name}</span>
                      <span className="tabular-nums font-medium text-foreground">
                        {d.hours}h
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
                        {d.minutes}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Daily Activity + Mastery Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm">Daily Study Activity</CardTitle>
                <CardDescription className="text-xs">Minutes per day, stacked by source</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(0, Math.floor(data.daily.length / 8))}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip content={<ChartTooltip suffix=" min" />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
                <Bar dataKey="sessions" name="Sessions" stackId="a" fill={CHART.violet} radius={[0, 0, 0, 0]} />
                <Bar dataKey="journal" name="Journal" stackId="a" fill={CHART.fuchsia} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm">Mastery by Subject</CardTitle>
                <CardDescription className="text-xs">Avg mastery 0–100 (flashcards + accuracy)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.radar.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground text-center px-6">
                No subject activity yet. Study a subject or create flashcards to see your mastery map.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={data.radar} outerRadius={88}>
                  <PolarGrid stroke="currentColor" className="text-border" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="currentColor" className="text-muted-foreground" tickCount={5} />
                  <Radar
                    name="Mastery"
                    dataKey="mastery"
                    stroke={CHART.violet}
                    strokeWidth={2}
                    fill={CHART.violet}
                    fillOpacity={0.35}
                  />
                  <Tooltip content={<ChartTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Difficulty-wise performance */}
      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Difficulty-wise Performance</CardTitle>
              <CardDescription className="text-xs">Correct vs incorrect vs unattempted across difficulty levels</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.difficulty} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
              <XAxis
                dataKey="difficulty"
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
              <Bar dataKey="Correct" name="Correct" fill={CHART.emerald} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Incorrect" name="Incorrect" fill={CHART.rose} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Unattempted" name="Unattempted" fill={CHART.amber} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 5: Topic performance table */}
      {data.topicRows.length > 0 && (
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">Topic Performance</CardTitle>
                  <CardDescription className="text-xs">Accuracy breakdown per topic — click accuracy to sort</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                {data.topicRows.length} topics
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="h-9 px-3 text-xs font-semibold text-muted-foreground">Topic</th>
                    <th className="h-9 px-3 text-xs font-semibold text-muted-foreground text-right">Attempts</th>
                    <th className="h-9 px-3 text-xs font-semibold text-muted-foreground">
                      <button
                        onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Accuracy
                        {sortDir === "desc" ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronUp className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="h-9 px-3 text-xs font-semibold text-muted-foreground text-right">Avg time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topicRows.slice(0, 50).map((row) => (
                    <tr key={row.topic} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-medium truncate max-w-[260px]">{row.topic}</td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">{row.attempts}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[120px]">
                            <div
                              className={cn(
                                "h-full rounded-full bg-gradient-to-r",
                                row.accuracy >= 70
                                  ? "from-emerald-500 to-teal-500"
                                  : row.accuracy >= 40
                                    ? "from-amber-500 to-orange-500"
                                    : "from-rose-500 to-pink-500",
                              )}
                              style={{ width: `${Math.min(100, Math.max(0, row.accuracy))}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums font-medium w-12 text-right">
                            {row.accuracy}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground text-xs">
                        {row.avgTime !== null ? `${row.avgTime}s` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 6: Insights card */}
      <Card className="relative overflow-hidden border-violet-500/30">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl opacity-25 bg-gradient-to-br from-violet-500 to-fuchsia-500" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full blur-3xl opacity-15 bg-gradient-to-br from-fuchsia-500 to-violet-500" />
        <CardHeader className="pb-2 relative">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Insights</CardTitle>
              <CardDescription className="text-xs">Auto-generated from your activity</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-3">
          <InsightLine
            icon={Trophy}
            iconColor="text-amber-500"
            text={
              data.strongest
                ? <>Your strongest subject is <strong className="text-foreground">{data.strongest.subject}</strong> ({data.strongest.accuracy}% accuracy).</>
                : <>Attempt a paper or MCQ set to surface your strongest subject.</>
            }
          />
          <InsightLine
            icon={Clock}
            iconColor="text-violet-500"
            text={<>You&apos;ve studied <strong className="text-foreground">{data.totalStudyMinutes}</strong> minutes in <span className="text-foreground/80">{rangeLabel(range)}</span>.</>}
          />
          <InsightLine
            icon={Brain}
            iconColor="text-fuchsia-500"
            text={
              data.mostStudiedTopic
                ? <>Most studied topic: <strong className="text-foreground">{data.mostStudiedTopic[0]}</strong> ({data.mostStudiedTopic[1]} minutes).</>
                : <>Start a study session or write a journal entry to track your most-studied topic.</>
            }
          />
          <InsightLine
            icon={Target}
            iconColor="text-rose-500"
            text={
              data.weakest
                ? <>Recommendation: focus on <strong className="text-foreground">{data.weakest.subject}</strong> — currently at {data.weakest.accuracy}% accuracy.</>
                : <>Keep practising — when you have multiple subjects tracked, personalised recommendations will appear here.</>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Header (presentational) ----------
function AnalyticsHeader() {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Unified insights across all your exam preparation activity. Trends, distribution, and performance breakdowns.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- Insight line (presentational) ----------
function InsightLine({
  icon: Icon,
  iconColor,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  text: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm text-muted-foreground">
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconColor)} />
      <div className="flex-1 leading-relaxed">{text}</div>
    </div>
  );
}
