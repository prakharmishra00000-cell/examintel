"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Flame,
  Brain,
  CheckCircle2,
  AlertCircle,
  Award,
  BarChart3,
  Sparkles,
  BookOpen,
  Clock,
  Layers,
  ArrowRight,
  Network,
  Repeat2,
  ListChecks,
  Lightbulb,
  HelpCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAppStore, type ViewKey } from "@/store/app-store";
import { useFlashcardStore } from "@/store/flashcard-store";
import { useStudyStore, type StudySession } from "@/store/study-store";
import { useJournalStore, type JournalEntry } from "@/store/journal-store";
import { AnimatedCounter, PremiumEmptyState } from "@/components/shared/premium-empty-state";
import type { SavedItem, PerformanceAnalysis } from "@/types";
import type { Flashcard, FlashcardSet } from "@/types/flashcard";

// ============================================================
// Topic Mastery Tracker
// Visual dashboard of per-topic mastery across all saved items
// + flashcards + study activity. Strength/weakness heatmap.
// Reads from 4 stores (app/flashcard/study/journal) — read-only,
// no new store required.
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

// ---------- Mastery score map ----------
// FlashcardMastery = New | Learning | Reviewing | Mastered
// DependencyNode.mastery = Not Started | Introduced | Learning | Practicing | Weak | Improving | Strong | Mastered
const MASTERY_SCORE: Record<string, number> = {
  Mastered: 100,
  Strong: 80,
  Improving: 60,
  Reviewing: 70,
  Practicing: 40,
  Learning: 20,
  Introduced: 10,
  Weak: 10,
  "Not Started": 0,
  New: 5,
};

function fcMasteryToScore(m: string): number {
  return MASTERY_SCORE[m] ?? 0;
}

// ---------- Status types ----------
type MasteryStatus = "Strong" | "Moderate" | "Weak" | "Not Started";

interface QuestionRef {
  source: "paper" | "mcq" | "explanation" | "evolution";
  itemId: string;
  title: string;
  difficulty?: string;
  correct?: number;
  total?: number;
  hasAccuracy: boolean;
}

interface TopicAgg {
  topic: string;
  subject: string | null;
  flashcards: Flashcard[];
  sessions: StudySession[];
  journal: JournalEntry[];
  questions: QuestionRef[];
  fcScore: number | null;
  qaScore: number | null;
  activityBoost: number;
  blend: number;
  score: number;
  status: MasteryStatus;
}

// ---------- Helpers ----------
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown, def = 0): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : def;
}

// ---------- Status styling (NO indigo/blue) ----------
const STATUS_STYLES: Record<
  MasteryStatus,
  {
    tile: string;
    tileHover: string;
    text: string;
    bar: string;
    bg: string;
    border: string;
    dot: string;
    grad: string;
  }
> = {
  Strong: {
    tile: "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    tileHover: "hover:bg-emerald-500/25 hover:border-emerald-500/50",
    text: "text-emerald-600 dark:text-emerald-400",
    bar: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    grad: "from-emerald-500 to-teal-500",
  },
  Moderate: {
    tile: "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300",
    tileHover: "hover:bg-amber-500/25 hover:border-amber-500/50",
    text: "text-amber-600 dark:text-amber-400",
    bar: "from-amber-500 to-orange-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    grad: "from-amber-500 to-orange-500",
  },
  Weak: {
    tile: "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300",
    tileHover: "hover:bg-rose-500/25 hover:border-rose-500/50",
    text: "text-rose-600 dark:text-rose-400",
    bar: "from-rose-500 to-pink-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    grad: "from-rose-500 to-pink-500",
  },
  "Not Started": {
    tile: "bg-zinc-500/10 border-zinc-500/25 text-zinc-600 dark:text-zinc-400",
    tileHover: "hover:bg-zinc-500/20 hover:border-zinc-500/40",
    text: "text-zinc-500 dark:text-zinc-400",
    bar: "from-zinc-500 to-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/30",
    dot: "bg-zinc-500",
    grad: "from-zinc-500 to-zinc-400",
  },
};

// ============================================================
// Aggregation core
// ============================================================

function aggregateTopics(
  saved: SavedItem[],
  sets: FlashcardSet[],
  sessions: StudySession[],
  entries: JournalEntry[],
): Map<string, TopicAgg> {
  const map = new Map<string, TopicAgg>();

  function get(topicRaw: string): TopicAgg | null {
    const topic = (topicRaw ?? "").trim();
    if (!topic) return null;
    let agg = map.get(topic);
    if (!agg) {
      agg = {
        topic,
        subject: null,
        flashcards: [],
        sessions: [],
        journal: [],
        questions: [],
        fcScore: null,
        qaScore: null,
        activityBoost: 0,
        blend: 0,
        score: 0,
        status: "Not Started",
      };
      map.set(topic, agg);
    }
    return agg;
  }

  // 1) Saved items
  for (const item of saved) {
    const data = (item.data ?? null) as Record<string, unknown> | null;
    if (!data) continue;

    if (item.type === "explanation") {
      const t = str((data as { topic?: unknown }).topic);
      if (!t) continue;
      const agg = get(t);
      if (!agg) continue;
      const subj = str((data as { subject?: unknown }).subject);
      if (subj && !agg.subject) agg.subject = subj;
      const diff = str((data as { difficulty?: unknown }).difficulty);
      agg.questions.push({
        source: "explanation",
        itemId: item.id,
        title: item.title,
        difficulty: diff,
        hasAccuracy: false,
      });
    } else if (item.type === "evolution") {
      const t = str((data as { topic?: unknown }).topic);
      if (!t) continue;
      const agg = get(t);
      if (!agg) continue;
      const subj = str((data as { subject?: unknown }).subject);
      if (subj && !agg.subject) agg.subject = subj;
      const diff = str((data as { difficulty?: unknown }).difficulty);
      agg.questions.push({
        source: "evolution",
        itemId: item.id,
        title: item.title,
        difficulty: diff,
        hasAccuracy: false,
      });
    } else if (item.type === "paper") {
      // data shape: { paper: GeneratedPaper, analysis?: PerformanceAnalysis, answers? }
      const paper = (data as { paper?: Record<string, unknown> }).paper;
      const questions = Array.isArray(paper?.questions)
        ? (paper!.questions as unknown as Array<Record<string, unknown>>)
        : Array.isArray((data as { questions?: unknown }).questions)
          ? ((data as { questions?: Array<Record<string, unknown>> }).questions as Array<Record<string, unknown>>)
          : [];
      const analysis = (data as { analysis?: PerformanceAnalysis }).analysis;
      const topicWise = analysis?.topicWise ?? [];
      for (const q of questions) {
        const t = str(q?.topic);
        if (!t) continue;
        const agg = get(t);
        if (!agg) continue;
        const tw = topicWise.find(
          (x) => x && x.topic && x.topic.trim().toLowerCase() === t.toLowerCase(),
        );
        const subj = str(q?.subject) ?? str((data as { subject?: unknown }).subject);
        if (subj && !agg.subject) agg.subject = subj;
        const diff = str(q?.difficulty);
        const hasAcc = !!tw && typeof tw.correct === "number" && typeof tw.total === "number";
        agg.questions.push({
          source: "paper",
          itemId: item.id,
          title: item.title,
          difficulty: diff,
          correct: tw?.correct,
          total: tw?.total,
          hasAccuracy: hasAcc,
        });
      }
    } else if (item.type === "mcq") {
      // data shape: { set: { mcqs: [...] }, answers: Record<id, picked>, ... }
      // OR legacy: { mcqs: [...] }
      const setData = (data as { set?: Record<string, unknown> }).set;
      const mcqs: Array<Record<string, unknown>> = Array.isArray(setData?.mcqs)
        ? (setData!.mcqs as Array<Record<string, unknown>>)
        : Array.isArray((data as { mcqs?: unknown }).mcqs)
          ? ((data as { mcqs?: Array<Record<string, unknown>> }).mcqs as Array<Record<string, unknown>>)
          : [];
      const answers = (data as { answers?: Record<string, string> }).answers ?? {};
      for (const m of mcqs) {
        const t = str(m?.topic);
        if (!t) continue;
        const agg = get(t);
        if (!agg) continue;
        const id = str(m?.id);
        const correctAnswer = str(m?.correctAnswer);
        const diff = str(m?.difficulty);
        let correct: number | undefined;
        let total: number | undefined;
        let hasAcc = false;
        if (id && answers[id]) {
          total = 1;
          correct = correctAnswer && answers[id] === correctAnswer ? 1 : 0;
          hasAcc = true;
        }
        agg.questions.push({
          source: "mcq",
          itemId: item.id,
          title: item.title,
          difficulty: diff,
          correct,
          total,
          hasAccuracy: hasAcc,
        });
      }
    }
  }

  // 2) Flashcards
  for (const set of sets) {
    for (const card of set.cards) {
      const t = str(card.topic);
      if (!t) continue;
      const agg = get(t);
      if (!agg) continue;
      agg.flashcards.push(card);
      // FlashcardSet.topic is the set's primary topic — use as subject hint only if blank
      const setTopic = str(set.topic);
      if (setTopic && !agg.subject) agg.subject = setTopic;
    }
  }

  // 3) Study sessions
  for (const s of sessions) {
    const t = str(s.topic);
    if (!t) continue;
    const agg = get(t);
    if (!agg) continue;
    agg.sessions.push(s);
    const subj = str(s.subject);
    if (subj && !agg.subject) agg.subject = subj;
  }

  // 4) Journal entries
  for (const e of entries) {
    const t = str(e.topic);
    if (!t) continue;
    const agg = get(t);
    if (!agg) continue;
    agg.journal.push(e);
    const subj = str(e.subject);
    if (subj && !agg.subject) agg.subject = subj;
  }

  // Compute scores
  for (const agg of map.values()) {
    // Flashcard mastery average
    if (agg.flashcards.length > 0) {
      const sum = agg.flashcards.reduce((a, c) => a + fcMasteryToScore(c.mastery), 0);
      agg.fcScore = sum / agg.flashcards.length;
    }

    // Question accuracy (only entries with actual attempt data)
    const scoredQs = agg.questions.filter(
      (q) => q.hasAccuracy && typeof q.correct === "number" && typeof q.total === "number" && (q.total ?? 0) > 0,
    );
    if (scoredQs.length > 0) {
      const totalC = scoredQs.reduce((a, q) => a + (q.correct ?? 0), 0);
      const totalT = scoredQs.reduce((a, q) => a + (q.total ?? 0), 0);
      agg.qaScore = totalT > 0 ? (totalC / totalT) * 100 : null;
    } else if (agg.questions.length > 0) {
      // Questions exist but no attempts recorded → neutral 50
      agg.qaScore = 50;
    } else {
      agg.qaScore = null;
    }

    // Activity boost: +5/session cap 20, +3/journal cap 15 (max 35)
    agg.activityBoost =
      Math.min(agg.sessions.length * 5, 20) + Math.min(agg.journal.length * 3, 15);

    // Weighted blend of FC (0.6) + QA (0.4) — renormalized if one missing
    let blend = 0;
    let weight = 0;
    if (agg.fcScore !== null) {
      blend += agg.fcScore * 0.6;
      weight += 0.6;
    }
    if (agg.qaScore !== null) {
      blend += agg.qaScore * 0.4;
      weight += 0.4;
    }
    agg.blend = weight > 0 ? blend / weight : 0;

    // Final = blend + activity boost, clamp 0-100
    const raw = agg.blend + agg.activityBoost;
    agg.score = Math.max(0, Math.min(100, Math.round(raw)));

    // Classify
    const hasAny =
      agg.flashcards.length > 0 ||
      agg.sessions.length > 0 ||
      agg.journal.length > 0 ||
      agg.questions.length > 0;
    if (!hasAny) agg.status = "Not Started";
    else if (agg.score >= 70) agg.status = "Strong";
    else if (agg.score >= 40) agg.status = "Moderate";
    else agg.status = "Weak";
  }

  return map;
}

// ============================================================
// Main view
// ============================================================

export function TopicMastery() {
  const mounted = useMounted();
  const setView = useAppStore((s) => s.setView);
  const saved = useAppStore((s) => s.saved);
  const sets = useFlashcardStore((s) => s.sets);
  const sessions = useStudyStore((s) => s.sessions);
  const entries = useJournalStore((s) => s.entries);

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MasteryStatus | "All">("All");

  const aggMap = useMemo(
    () => aggregateTopics(saved, sets, sessions, entries),
    [saved, sets, sessions, entries],
  );

  const topics = useMemo(() => Array.from(aggMap.values()), [aggMap]);

  // Sort by score desc
  const sorted = useMemo(
    () => [...topics].sort((a, b) => b.score - a.score),
    [topics],
  );

  const stats = useMemo(() => {
    const total = topics.length;
    const strong = topics.filter((t) => t.status === "Strong").length;
    const moderate = topics.filter((t) => t.status === "Moderate").length;
    const weak = topics.filter((t) => t.status === "Weak").length;
    const notStarted = topics.filter((t) => t.status === "Not Started").length;
    const started = topics.filter((t) => t.status !== "Not Started");
    const avgMastery =
      started.length > 0
        ? Math.round(started.reduce((a, t) => a + t.score, 0) / started.length)
        : 0;
    return { total, strong, moderate, weak, notStarted, avgMastery };
  }, [topics]);

  // Subject breakdown
  const subjects = useMemo(() => {
    const subjMap = new Map<string, { name: string; topics: TopicAgg[] }>();
    for (const t of topics) {
      const name = t.subject ?? "General";
      let bucket = subjMap.get(name);
      if (!bucket) {
        bucket = { name, topics: [] };
        subjMap.set(name, bucket);
      }
      bucket.topics.push(t);
    }
    const arr = Array.from(subjMap.values()).map((s) => {
      const started = s.topics.filter((t) => t.status !== "Not Started");
      const avg =
        started.length > 0
          ? Math.round(started.reduce((a, t) => a + t.score, 0) / started.length)
          : 0;
      return { name: s.name, count: s.topics.length, avg, started: started.length };
    });
    arr.sort((a, b) => b.avg - a.avg);
    return arr;
  }, [topics]);

  // Recommendations — weakest topics with attempts at "Not Started" included
  const recommendations = useMemo(() => {
    const weak = sorted
      .filter((t) => t.status === "Weak" || t.status === "Not Started")
      .slice(0, 5);
    return weak;
  }, [sorted]);

  const selectedAgg = selectedTopic ? aggMap.get(selectedTopic) ?? null : null;

  // Filtered heatmap
  const filtered = useMemo(() => {
    if (statusFilter === "All") return sorted;
    return sorted.filter((t) => t.status === statusFilter);
  }, [sorted, statusFilter]);

  // ---------- Hydration skeleton ----------
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  // ---------- Empty state ----------
  if (topics.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <PremiumEmptyState
          icon={Target}
          title="No topics tracked yet"
          description="Research an exam, explain a question, generate flashcards, or log a study session — your per-topic mastery heatmap will appear here automatically."
          ctaLabel="Research an exam"
          ctaIcon={Sparkles}
          ctaOnClick={() => setView("exam-researcher")}
          accent="violet"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Target}
          label="Total Topics"
          value={stats.total}
          accent="violet"
          sub={`${stats.notStarted} not started`}
        />
        <StatCard
          icon={TrendingUp}
          label="Strong Topics"
          value={stats.strong}
          accent="emerald"
          sub="Mastery ≥ 70%"
        />
        <StatCard
          icon={TrendingDown}
          label="Weak Topics"
          value={stats.weak}
          accent="rose"
          sub="Need attention"
        />
        <StatCard
          icon={BarChart3}
          label="Avg Mastery"
          value={stats.avgMastery}
          suffix="%"
          accent="amber"
          sub="Across active topics"
        />
      </div>

      {/* Heatmap */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  <Flame className="h-4 w-4" />
                </div>
                Mastery Heatmap
              </CardTitle>
              <CardDescription className="mt-1">
                Click any tile for a detailed breakdown. Hover for a quick summary.
              </CardDescription>
            </div>
            {/* Status filter chips */}
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                active={statusFilter === "All"}
                onClick={() => setStatusFilter("All")}
                label="All"
                count={topics.length}
              />
              {(["Strong", "Moderate", "Weak", "Not Started"] as MasteryStatus[]).map((s) => {
                const count = topics.filter((t) => t.status === s).length;
                if (count === 0) return null;
                return (
                  <FilterChip
                    key={s}
                    active={statusFilter === s}
                    onClick={() => setStatusFilter(s)}
                    label={s}
                    count={count}
                    status={s}
                  />
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No topics match this filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5">
              {filtered.map((t, i) => (
                <HeatmapTile
                  key={t.topic}
                  agg={t}
                  index={i}
                  onClick={() => setSelectedTopic(t.topic)}
                />
              ))}
            </div>
          )}
          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="font-medium">Legend:</span>
            {(["Strong", "Moderate", "Weak", "Not Started"] as MasteryStatus[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-sm", STATUS_STYLES[s].dot)} />
                {s}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StrengthsCard
          topics={sorted.filter((t) => t.status !== "Not Started").slice(0, 5)}
          onSelect={setSelectedTopic}
        />
        <WeaknessesCard
          topics={[...sorted]
            .filter((t) => t.status !== "Not Started")
            .reverse()
            .slice(0, 5)}
          onSelect={setSelectedTopic}
        />
      </div>

      {/* Subject breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <BarChart3 className="h-4 w-4" />
            </div>
            Subject Breakdown
          </CardTitle>
          <CardDescription>
            Average mastery across topics grouped by subject.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No subject data available.
            </div>
          ) : (
            <div className="space-y-3">
              {subjects.map((s, i) => {
                const status: MasteryStatus =
                  s.avg >= 70 ? "Strong" : s.avg >= 40 ? "Moderate" : s.avg > 0 ? "Weak" : "Not Started";
                const st = STATUS_STYLES[status];
                return (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("h-2 w-2 rounded-full shrink-0", st.dot)} />
                        <span className="font-medium truncate">{s.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {s.started}/{s.count} active
                        </Badge>
                      </div>
                      <span className={cn("text-xs font-semibold tabular-nums", st.text)}>
                        {s.avg}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.avg}%` }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 * i }}
                        className={cn("h-full rounded-full bg-gradient-to-r", st.bar)}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-500/[0.08] via-fuchsia-500/[0.04] to-transparent">
        <div className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Lightbulb className="h-4 w-4" />
            </div>
            Recommended Next Steps
          </CardTitle>
          <CardDescription>
            Targeted actions for your weakest topics. Bridge gaps before they cost you marks.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {recommendations.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>No weak topics — you&apos;re on track. Keep revising!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((t, i) => (
                <RecommendationRow
                  key={t.topic}
                  agg={t}
                  index={i}
                  onSelect={setSelectedTopic}
                  onNavigate={(v) => setView(v)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topic detail dialog */}
      <TopicDetailDialog
        agg={selectedAgg}
        open={!!selectedAgg}
        onOpenChange={(o) => {
          if (!o) setSelectedTopic(null);
        }}
        onNavigate={(v) => {
          setSelectedTopic(null);
          setView(v);
        }}
      />
    </div>
  );
}

// ============================================================
// Header
// ============================================================

function Header() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
            <Target className="h-5 w-5" />
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Topic Mastery Tracker</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Visualize your strengths and weaknesses across all topics. Powered by your saved
            research, flashcards, and activity.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Stat card
// ============================================================

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  accent,
  sub,
}: {
  icon: typeof Target;
  label: string;
  value: number;
  suffix?: string;
  accent: "violet" | "amber" | "emerald" | "rose";
  sub?: string;
}) {
  const accents: Record<string, { grad: string; text: string; bg: string }> = {
    violet: { grad: "from-violet-500 to-fuchsia-500", text: "text-violet-500", bg: "bg-violet-500/10" },
    amber: { grad: "from-amber-500 to-orange-500", text: "text-amber-500", bg: "bg-amber-500/10" },
    emerald: { grad: "from-emerald-500 to-teal-500", text: "text-emerald-500", bg: "bg-emerald-500/10" },
    rose: { grad: "from-rose-500 to-pink-500", text: "text-rose-500", bg: "bg-rose-500/10" },
  };
  const a = accents[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white", a.grad)}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <AnimatedCounter
              value={value}
              className={cn("text-2xl font-bold tabular-nums", a.text)}
            />
            {suffix && <span className={cn("text-sm font-semibold", a.text)}>{suffix}</span>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{sub}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================
// Filter chip
// ============================================================

function FilterChip({
  active,
  onClick,
  label,
  count,
  status,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  status?: MasteryStatus;
}) {
  const dotClass = status ? STATUS_STYLES[status].dot : "bg-violet-500";
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "border-violet-500/40 bg-violet-500/10 text-foreground"
          : "border-border bg-background/50 text-muted-foreground hover:text-foreground hover:bg-accent",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
      {label}
      <span className="text-[10px] text-muted-foreground/80 tabular-nums">{count}</span>
    </button>
  );
}

// ============================================================
// Heatmap tile
// ============================================================

function HeatmapTile({
  agg,
  index,
  onClick,
}: {
  agg: TopicAgg;
  index: number;
  onClick: () => void;
}) {
  const st = STATUS_STYLES[agg.status];
  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <motion.button
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.3) }}
          onClick={onClick}
          className={cn(
            "group relative flex min-h-[92px] flex-col justify-between rounded-lg border p-2.5 text-left transition-all",
            st.tile,
            st.tileHover,
          )}
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-xs font-semibold leading-tight line-clamp-2">
              {agg.topic}
            </span>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div className="flex items-center gap-1">
              {agg.flashcards.length > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 rounded bg-black/10 px-1 text-[9px] font-bold tabular-nums">
                  {agg.flashcards.length} card{agg.flashcards.length === 1 ? "" : "s"}
                </span>
              )}
              {agg.sessions.length > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 rounded bg-black/10 px-1 text-[9px] font-bold tabular-nums">
                  {agg.sessions.length} session{agg.sessions.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <span className="text-lg font-bold tabular-nums leading-none">
              {agg.status === "Not Started" ? "—" : `${agg.score}%`}
            </span>
          </div>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        <div className="space-y-1">
          <div className="font-semibold">{agg.topic}</div>
          <div className="text-[11px] opacity-90">
            {agg.subject ? `${agg.subject} · ` : ""}{agg.status} · {agg.status === "Not Started" ? "no activity" : `${agg.score}% mastery`}
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] opacity-90">
            <span>🎴 {agg.flashcards.length}</span>
            <span>⏱ {agg.sessions.length}</span>
            <span>📔 {agg.journal.length}</span>
            <span>❓ {agg.questions.length}</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================
// Strengths / Weaknesses cards
// ============================================================

function StrengthsCard({
  topics,
  onSelect,
}: {
  topics: TopicAgg[];
  onSelect: (t: string) => void;
}) {
  return (
    <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <Award className="h-4 w-4" />
          </div>
          Top Strengths
        </CardTitle>
        <CardDescription>Your 5 strongest topics — keep these sharp.</CardDescription>
      </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No strong topics yet. Keep practising!
          </div>
        ) : (
          <div className="space-y-2.5">
            {topics.map((t, i) => (
              <TopicRow key={t.topic} agg={t} rank={i + 1} accent="emerald" onClick={() => onSelect(t.topic)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeaknessesCard({
  topics,
  onSelect,
}: {
  topics: TopicAgg[];
  onSelect: (t: string) => void;
}) {
  return (
    <Card className="border-rose-500/20 bg-gradient-to-br from-rose-500/[0.06] to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
            <AlertCircle className="h-4 w-4" />
          </div>
          Needs Attention
        </CardTitle>
        <CardDescription>Your 5 weakest active topics — prioritise these.</CardDescription>
      </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No weak topics. You&apos;re on top of it!
          </div>
        ) : (
          <div className="space-y-2.5">
            {topics.map((t, i) => (
              <TopicRow key={t.topic} agg={t} rank={i + 1} accent="rose" onClick={() => onSelect(t.topic)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopicRow({
  agg,
  rank,
  accent,
  onClick,
}: {
  agg: TopicAgg;
  rank: number;
  accent: "emerald" | "rose";
  onClick: () => void;
}) {
  const st = STATUS_STYLES[agg.status];
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition hover:bg-accent hover:border-border/60"
    >
      <span className="text-[11px] font-bold tabular-nums text-muted-foreground w-4 text-center">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{agg.topic}</span>
          <span className={cn("text-xs font-semibold tabular-nums shrink-0", st.text)}>
            {agg.status === "Not Started" ? "—" : `${agg.score}%`}
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${agg.score}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn("h-full rounded-full bg-gradient-to-r", st.bar)}
          />
        </div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition shrink-0" />
    </button>
  );
}

// ============================================================
// Recommendation row
// ============================================================

function RecommendationRow({
  agg,
  index,
  onSelect,
  onNavigate,
}: {
  agg: TopicAgg;
  index: number;
  onSelect: (t: string) => void;
  onNavigate: (v: ViewKey) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
      className="rounded-xl border border-border/60 bg-background/60 p-3.5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-rose-500/15 px-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              #{index + 1}
            </span>
            <button
              onClick={() => onSelect(agg.topic)}
              className="text-sm font-semibold truncate hover:underline text-left"
            >
              {agg.topic}
            </button>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {agg.status === "Not Started" ? "Not started" : `${agg.score}% mastery`}
            </Badge>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {agg.status === "Not Started"
              ? "No activity yet. Start by mapping prerequisites, then practise variants."
              : "Review prerequisites → practise 5 Level-1 variants → attempt a mini-test."}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigate("dependency-mapper")}
          className="h-7 gap-1.5 text-[11px] border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/15 hover:text-violet-600 dark:hover:text-violet-300"
        >
          <Network className="h-3 w-3" />
          Map prerequisites
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigate("question-evolution")}
          className="h-7 gap-1.5 text-[11px] border-fuchsia-500/30 bg-fuchsia-500/5 hover:bg-fuchsia-500/15 hover:text-fuchsia-600 dark:hover:text-fuchsia-300"
        >
          <Repeat2 className="h-3 w-3" />
          Practise variants
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigate("mcq-generator")}
          className="h-7 gap-1.5 text-[11px] border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 hover:text-amber-600 dark:hover:text-amber-300"
        >
          <ListChecks className="h-3 w-3" />
          Attempt mini-test
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================
// Topic detail dialog
// ============================================================

function TopicDetailDialog({
  agg,
  open,
  onOpenChange,
  onNavigate,
}: {
  agg: TopicAgg | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onNavigate: (v: ViewKey) => void;
}) {
  if (!agg) return null;
  const st = STATUS_STYLES[agg.status];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", st.dot)} />
            {agg.topic}
          </DialogTitle>
          <DialogDescription>
            {agg.subject ? `${agg.subject} · ` : ""}{agg.status} · {agg.status === "Not Started" ? "no activity recorded" : `${agg.score}% mastery`}
          </DialogDescription>
        </DialogHeader>

        {/* Score breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <ScorePill label="Flashcards" value={agg.fcScore === null ? "—" : `${Math.round(agg.fcScore)}%`} icon={Layers} accent="violet" />
          <ScorePill label="Questions" value={agg.qaScore === null ? "—" : `${Math.round(agg.qaScore)}%`} icon={HelpCircle} accent="amber" />
          <ScorePill label="Activity" value={`+${agg.activityBoost}`} icon={Flame} accent="emerald" />
          <ScorePill label="Final" value={`${agg.score}%`} icon={Brain} accent="rose" />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="flashcards">
              Flashcards ({agg.flashcards.length})
            </TabsTrigger>
            <TabsTrigger value="sessions">
              Sessions ({agg.sessions.length})
            </TabsTrigger>
            <TabsTrigger value="journal">
              Journal ({agg.journal.length})
            </TabsTrigger>
            <TabsTrigger value="questions">
              Questions ({agg.questions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Mastery score</span>
                  <span className={cn("font-semibold tabular-nums", st.text)}>{agg.score}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${agg.score}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn("h-full rounded-full bg-gradient-to-r", st.bar)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <MiniStat label="Flashcards" value={agg.flashcards.length} />
                <MiniStat label="Sessions" value={agg.sessions.length} />
                <MiniStat label="Journal" value={agg.journal.length} />
                <MiniStat label="Questions" value={agg.questions.length} />
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground mb-1">How this score is computed</div>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Flashcard mastery average (weight 0.6)</li>
                  <li>Question accuracy from saved papers/MCQs (weight 0.4)</li>
                  <li>Activity boost: +5/session (cap 20), +3/journal (cap 15)</li>
                  <li>Final = weighted blend + activity boost, clamped 0–100</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="flashcards" className="mt-3">
            <ScrollArea className="max-h-72">
              {agg.flashcards.length === 0 ? (
                <EmptyDetail
                  icon={Layers}
                  text="No flashcards for this topic yet."
                  cta="Generate flashcards"
                  onCta={() => onNavigate("flashcards")}
                />
              ) : (
                <div className="space-y-2 pr-2">
                  {agg.flashcards.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-border/60 bg-muted/30 p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium leading-snug">{c.front}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 text-[10px]",
                            c.mastery === "Mastered"
                              ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : c.mastery === "Reviewing"
                                ? "border-amber-500/30 text-amber-600 dark:text-amber-400"
                                : "border-border text-muted-foreground",
                          )}
                        >
                          {c.mastery}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground leading-snug line-clamp-2">
                        {c.back}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sessions" className="mt-3">
            <ScrollArea className="max-h-72">
              {agg.sessions.length === 0 ? (
                <EmptyDetail
                  icon={Clock}
                  text="No study sessions on this topic."
                  cta="Start a session"
                  onCta={() => onNavigate("study-timer")}
                />
              ) : (
                <div className="space-y-2 pr-2">
                  {agg.sessions.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-border/60 bg-muted/30 p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">
                          {s.mode === "pomodoro" ? "Pomodoro" : "Free"} · {s.durationMinutes} min
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {s.completed && (
                        <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="journal" className="mt-3">
            <ScrollArea className="max-h-72">
              {agg.journal.length === 0 ? (
                <EmptyDetail
                  icon={BookOpen}
                  text="No journal entries for this topic."
                  cta="Write entry"
                  onCta={() => onNavigate("progress-journal")}
                />
              ) : (
                <div className="space-y-2 pr-2">
                  {agg.journal.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-lg border border-border/60 bg-muted/30 p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium capitalize">
                          Mood: {e.mood}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {e.date}
                        </span>
                      </div>
                      {e.whatStudied && (
                        <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                          {e.whatStudied}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="questions" className="mt-3">
            <ScrollArea className="max-h-72">
              {agg.questions.length === 0 ? (
                <EmptyDetail
                  icon={HelpCircle}
                  text="No saved questions for this topic."
                  cta="Generate questions"
                  onCta={() => onNavigate("mcq-generator")}
                />
              ) : (
                <div className="space-y-2 pr-2">
                  {agg.questions.map((q, i) => (
                    <div
                      key={`${q.itemId}-${i}`}
                      className="rounded-lg border border-border/60 bg-muted/30 p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{q.title}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                            {q.source}{q.difficulty ? ` · ${q.difficulty}` : ""}
                          </p>
                        </div>
                        {q.hasAccuracy && typeof q.correct === "number" && typeof q.total === "number" && (
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px]"
                          >
                            {q.correct}/{q.total}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ScorePill({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Target;
  accent: "violet" | "amber" | "emerald" | "rose";
}) {
  const accents: Record<string, string> = {
    violet: "text-violet-500",
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    rose: "text-rose-500",
  };
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-2 text-center">
      <Icon className={cn("h-3.5 w-3.5 mx-auto", accents[accent])} />
      <div className={cn("mt-1 text-sm font-bold tabular-nums", accents[accent])}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 py-2">
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyDetail({
  icon: Icon,
  text,
  cta,
  onCta,
}: {
  icon: typeof Target;
  text: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{text}</p>
      {cta && onCta && (
        <Button size="sm" variant="outline" onClick={onCta} className="mt-2 h-7 text-[11px]">
          {cta}
        </Button>
      )}
    </div>
  );
}
