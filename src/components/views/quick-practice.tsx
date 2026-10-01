"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Zap,
  Clock,
  Flame,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
  Trophy,
  Brain,
  Target,
  Sparkles,
  Save,
  Play,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { PremiumEmptyState } from "@/components/shared/premium-empty-state";
import type {
  SavedItem,
  GeneratedPaper,
  MCQSet,
  QuestionEvolutionReport,
} from "@/types";

// ============================================================
// Quick Practice — rapid-fire random questions pulled from ALL
// saved MCQs / papers / evolution variants, with instant
// feedback + combo streak tracking.
// ============================================================

type Phase = "setup" | "practice" | "results";
type Source = "paper" | "mcq" | "evolution";
type Difficulty = "Easy" | "Medium" | "Hard";

interface QuickQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  difficulty: Difficulty;
  source: Source;
}

interface AnswerRecord {
  question: QuickQuestion;
  selectedIndex: number | null; // null = timed out
  correct: boolean;
  timeMs: number;
}

interface SessionStats {
  bestCombo: number;
  totalCorrect: number;
  totalQuestions: number;
  accuracy: number;
  lastUpdated: string;
}

const COUNT_OPTIONS = [5, 10, 15, 20];
const TIME_OPTIONS = [15, 30, 60, 0] as const; // 0 = no timer
const TIME_LABELS: Record<number, string> = {
  15: "15s",
  30: "30s",
  60: "60s",
  0: "No timer",
};
const DIFFICULTY_OPTIONS: (Difficulty | "All")[] = [
  "All",
  "Easy",
  "Medium",
  "Hard",
];
const STATS_KEY = "examintel-quick-practice-stats";

// ---------- helpers ----------
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadStats(): SessionStats | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionStats;
  } catch {
    return null;
  }
}

function saveStats(s: SessionStats) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// Aggregate all MCQ-style questions from saved items.
function aggregateQuestions(saved: SavedItem[]): QuickQuestion[] {
  const out: QuickQuestion[] = [];
  for (const item of saved) {
    if (item.type === "paper") {
      const paper = item.data as GeneratedPaper | undefined;
      if (paper?.questions?.length) {
        paper.questions.forEach((q, i) => {
          if (!q.options?.length || !q.correctAnswer) return;
          out.push({
            id: `${item.id}-p-${i}`,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            topic: q.topic || "General",
            difficulty: (q.difficulty as Difficulty) || "Medium",
            source: "paper",
          });
        });
      }
    } else if (item.type === "mcq") {
      const set = item.data as MCQSet | undefined;
      if (set?.mcqs?.length) {
        set.mcqs.forEach((m, i) => {
          if (!m.options?.length || !m.correctAnswer) return;
          out.push({
            id: `${item.id}-m-${i}`,
            question: m.question,
            options: m.options,
            correctAnswer: m.correctAnswer,
            topic: m.topic || "General",
            difficulty: (m.difficulty as Difficulty) || "Medium",
            source: "mcq",
          });
        });
      }
    } else if (item.type === "evolution") {
      const evo = item.data as QuestionEvolutionReport | undefined;
      if (evo?.variants?.length) {
        evo.variants.forEach((v, i) => {
          if (!v.options?.length || !v.correctAnswer) return;
          out.push({
            id: `${item.id}-e-${i}`,
            question: v.question,
            options: v.options,
            correctAnswer: v.correctAnswer,
            topic: evo.topic || "General",
            difficulty: (evo.difficulty as Difficulty) || "Medium",
            source: "evolution",
          });
        });
      }
    }
  }
  return out;
}

// Timer color helpers: violet (calm) → amber (<40%) → rose (<20%)
function timerColor(secondsLeft: number, enabled: boolean) {
  if (!enabled) return "text-violet-500";
  if (secondsLeft <= 5) return "text-rose-500";
  if (secondsLeft <= 10) return "text-amber-500";
  return "text-violet-500";
}
function timerRingClass(secondsLeft: number, enabled: boolean) {
  if (!enabled) return "stroke-violet-500";
  if (secondsLeft <= 5) return "stroke-rose-500";
  if (secondsLeft <= 10) return "stroke-amber-500";
  return "stroke-violet-500";
}
function timerBgClass(secondsLeft: number, enabled: boolean) {
  if (!enabled) return "bg-violet-500/10";
  if (secondsLeft <= 5) return "bg-rose-500/10";
  if (secondsLeft <= 10) return "bg-amber-500/10";
  return "bg-violet-500/10";
}

const diffBadgeClass = (d: Difficulty) =>
  d === "Easy"
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : d === "Medium"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400";

const sourceLabel = (s: Source) =>
  s === "paper" ? "Paper" : s === "mcq" ? "MCQ" : "Evolved";

const sourceBadgeClass = (s: Source) =>
  s === "paper"
    ? "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400"
    : s === "mcq"
      ? "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400"
      : "border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400";

// ============================================================
// Main component
// ============================================================
export function QuickPractice() {
  const saved = useAppStore((s) => s.saved);
  const setView = useAppStore((s) => s.setView);
  const saveItem = useAppStore((s) => s.saveItem);

  // ---- setup state ----
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState<number>(10);
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "All">(
    "All"
  );
  const [topicFilter, setTopicFilter] = useState<string>("All");
  const [timePerQuestion, setTimePerQuestion] = useState<number>(30);

  // ---- practice state ----
  const [questions, setQuestions] = useState<QuickQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timerLeft, setTimerLeft] = useState<number>(timePerQuestion);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [quizStartTs, setQuizStartTs] = useState<number>(0);
  const [questionStartTs, setQuestionStartTs] = useState<number>(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [flash, setFlash] = useState<{
    combo: number;
    msg: string;
    emoji: string;
  } | null>(null);

  // ---- stats ----
  const [stats, setStats] = useState<SessionStats | null>(null);

  // Refs to escape stale closures
  const revealLockRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboRef = useRef(0);

  // Load stats on mount
  useEffect(() => {
    setStats(loadStats());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // Aggregate the full question pool from all saved items.
  const allQuestions = useMemo(() => aggregateQuestions(saved), [saved]);

  // Unique topics for the topic filter chip row.
  const topics = useMemo(() => {
    const set = new Set<string>();
    allQuestions.forEach((q) => set.add(q.topic));
    return Array.from(set).sort();
  }, [allQuestions]);

  // Filtered pool by difficulty + topic.
  const pool = useMemo(() => {
    return allQuestions.filter((q) => {
      if (difficultyFilter !== "All" && q.difficulty !== difficultyFilter)
        return false;
      if (topicFilter !== "All" && q.topic !== topicFilter) return false;
      return true;
    });
  }, [allQuestions, difficultyFilter, topicFilter]);

  // ---------- combo flash ----------
  const triggerFlash = useCallback((c: number) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    const payload =
      c >= 10
        ? { combo: c, msg: "Unstoppable!", emoji: "💪" }
        : { combo: c, msg: "On Fire!", emoji: "🔥" };
    setFlash(payload);
    flashTimerRef.current = setTimeout(() => setFlash(null), 1300);
  }, []);

  // ---------- quiz lifecycle ----------
  const startPractice = useCallback(() => {
    if (pool.length === 0) {
      toast.error("No questions match the selected filters");
      return;
    }
    const actualCount = Math.min(count, pool.length);
    const picked = shuffle(pool).slice(0, actualCount);
    setQuestions(picked);
    setCurrentIdx(0);
    setSelectedIndex(null);
    setRevealed(false);
    revealLockRef.current = false;
    comboRef.current = 0;
    setCombo(0);
    setScore(0);
    setMaxCombo(0);
    setRecords([]);
    setFlash(null);
    setTimerLeft(timePerQuestion);
    const now = Date.now();
    setQuizStartTs(now);
    setQuestionStartTs(now);
    setPhase("practice");
  }, [pool, count, timePerQuestion]);

  const advance = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setSelectedIndex(null);
    setRevealed(false);
    revealLockRef.current = false;
    if (currentIdx + 1 >= questions.length) {
      setPhase("results");
      return;
    }
    setCurrentIdx((i) => i + 1);
    setTimerLeft(timePerQuestion);
    setQuestionStartTs(Date.now());
  }, [currentIdx, questions.length, timePerQuestion]);

  // Lock in an answer (user click or timeout).
  const lockAnswer = useCallback(
    (idx: number | null) => {
      if (revealLockRef.current) return;
      revealLockRef.current = true;
      const q = questions[currentIdx];
      if (!q) return;
      const correct =
        idx !== null && q.options[idx] === q.correctAnswer;
      setSelectedIndex(idx);
      setRevealed(true);
      const rec: AnswerRecord = {
        question: q,
        selectedIndex: idx,
        correct,
        timeMs: Date.now() - questionStartTs,
      };
      setRecords((prev) => [...prev, rec]);
      if (correct) {
        const nc = comboRef.current + 1;
        comboRef.current = nc;
        setCombo(nc);
        setScore((s) => s + nc);
        setMaxCombo((m) => Math.max(m, nc));
        if (nc === 5 || nc === 10) triggerFlash(nc);
      } else {
        comboRef.current = 0;
        setCombo(0);
      }
      advanceTimerRef.current = setTimeout(() => {
        advance();
      }, 1500);
    },
    [questions, currentIdx, questionStartTs, advance, triggerFlash]
  );

  // ---------- timer effect ----------
  useEffect(() => {
    if (phase !== "practice") return;
    if (timePerQuestion === 0) return; // no timer
    if (revealed) return; // pause after reveal
    if (timerLeft <= 0) {
      lockAnswer(null); // timed out
      return;
    }
    const t = setTimeout(() => {
      setTimerLeft((s) => s - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, timePerQuestion, timerLeft, revealed, lockAnswer]);

  // ---------- derived results ----------
  const total = questions.length;
  const correctCount = records.filter((r) => r.correct).length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const totalTimeMs = quizStartTs ? Date.now() - quizStartTs : 0;

  // Persist stats when entering results.
  useEffect(() => {
    if (phase === "results" && total > 0) {
      const prev = loadStats();
      const next: SessionStats = {
        bestCombo: Math.max(prev?.bestCombo ?? 0, maxCombo),
        totalCorrect: correctCount,
        totalQuestions: total,
        accuracy,
        lastUpdated: new Date().toISOString(),
      };
      saveStats(next);
      setStats(next);
    }
  }, [phase]);

  // ---------- actions ----------
  const saveToResearch = () => {
    saveItem({
      type: "paper",
      title: "Quick Practice Session",
      summary: `${correctCount}/${total} · ${accuracy}% · Max combo ×${maxCombo}`,
      data: {
        type: "quick-practice",
        score: correctCount,
        total,
        accuracy,
        maxCombo,
        totalTimeMs,
        settings: {
          count,
          difficulty: difficultyFilter,
          topic: topicFilter,
          timePerQuestion,
        },
        review: records.map((r) => ({
          question: r.question.question,
          topic: r.question.topic,
          difficulty: r.question.difficulty,
          source: r.question.source,
          userAnswer:
            r.selectedIndex === null
              ? "(timed out)"
              : r.question.options[r.selectedIndex],
          correctAnswer: r.question.correctAnswer,
          correct: r.correct,
        })),
      },
    });
    toast.success("Saved to My Research", {
      description: `${correctCount}/${total} · ${accuracy}% accuracy`,
    });
  };

  const practiceAgain = () => {
    // Re-run with same settings + same filters (fresh shuffle).
    startPractice();
  };

  const newSet = () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setPhase("setup");
    setQuestions([]);
    setRecords([]);
    setSelectedIndex(null);
    setRevealed(false);
    setCurrentIdx(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    comboRef.current = 0;
    revealLockRef.current = false;
    setFlash(null);
  };

  // ============================================================
  // RENDER
  // ============================================================

  // ---------- Empty state: no saved questions at all ----------
  if (allQuestions.length === 0 && phase === "setup") {
    return (
      <div className="space-y-6">
        <Header />
        <PremiumEmptyState
          icon={Zap}
          title="No saved questions to practice yet"
          description="Quick Practice pulls random MCQs from your saved papers, MCQ sets, and question-evolution variants. Generate some first, then come back to rapid-fire."
          ctaLabel="Generate a Paper"
          ctaIcon={Sparkles}
          ctaOnClick={() => setView("paper-generator")}
          accent="violet"
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView("mcq-generator")}
            className="gap-1.5"
          >
            <Brain className="h-3.5 w-3.5" />
            Open MCQ Generator
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView("question-evolution")}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Question Evolution Lab
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      <Header />

      <AnimatePresence mode="wait">
        {phase === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <SetupScreen
              count={count}
              setCount={setCount}
              difficultyFilter={difficultyFilter}
              setDifficultyFilter={setDifficultyFilter}
              topicFilter={topicFilter}
              setTopicFilter={setTopicFilter}
              topics={topics}
              timePerQuestion={timePerQuestion}
              setTimePerQuestion={setTimePerQuestion}
              poolSize={pool.length}
              totalPoolSize={allQuestions.length}
              onStart={startPractice}
              stats={stats}
            />
          </motion.div>
        )}

        {phase === "practice" && (
          <motion.div
            key="practice"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <PracticeScreen
              questions={questions}
              currentIdx={currentIdx}
              score={score}
              combo={combo}
              timePerQuestion={timePerQuestion}
              timerLeft={timerLeft}
              selectedIndex={selectedIndex}
              revealed={revealed}
              onAnswer={lockAnswer}
              flash={flash}
            />
          </motion.div>
        )}

        {phase === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <ResultsScreen
              total={total}
              correctCount={correctCount}
              accuracy={accuracy}
              maxCombo={maxCombo}
              totalTimeMs={totalTimeMs}
              records={records}
              onPracticeAgain={practiceAgain}
              onNewSet={newSet}
              onSave={saveToResearch}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function Header() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
            <Zap className="h-5 w-5" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Quick Practice
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Rapid-fire random questions from your saved pool — instant
            feedback & combo streaks.
          </p>
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-all border whitespace-nowrap",
        active
          ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent shadow-md shadow-violet-500/20"
          : "bg-card border-border hover:border-violet-500/40 hover:text-foreground text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

function SetupScreen({
  count,
  setCount,
  difficultyFilter,
  setDifficultyFilter,
  topicFilter,
  setTopicFilter,
  topics,
  timePerQuestion,
  setTimePerQuestion,
  poolSize,
  totalPoolSize,
  onStart,
  stats,
}: {
  count: number;
  setCount: (n: number) => void;
  difficultyFilter: Difficulty | "All";
  setDifficultyFilter: (d: Difficulty | "All") => void;
  topicFilter: string;
  setTopicFilter: (t: string) => void;
  topics: string[];
  timePerQuestion: number;
  setTimePerQuestion: (n: number) => void;
  poolSize: number;
  totalPoolSize: number;
  onStart: () => void;
  stats: SessionStats | null;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Config column */}
      <div className="space-y-4 lg:col-span-2">
        {/* Last session stats */}
        {stats && (
          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold">Last Session</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {new Date(stats.lastUpdated).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="Best Combo"
                value={`×${stats.bestCombo}`}
                icon={<Flame className="h-3.5 w-3.5 text-amber-500" />}
              />
              <StatTile
                label="Correct"
                value={`${stats.totalCorrect}/${stats.totalQuestions}`}
                icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
              />
              <StatTile
                label="Accuracy"
                value={`${stats.accuracy}%`}
                icon={<Target className="h-3.5 w-3.5 text-violet-500" />}
              />
              <StatTile
                label="Questions"
                value={String(stats.totalQuestions)}
                icon={<Brain className="h-3.5 w-3.5 text-fuchsia-500" />}
              />
            </div>
          </Card>
        )}

        {/* Question count */}
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold">Questions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {COUNT_OPTIONS.map((c) => (
              <Chip
                key={c}
                active={count === c}
                onClick={() => setCount(c)}
              >
                {c}
              </Chip>
            ))}
          </div>
        </Card>

        {/* Difficulty */}
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-fuchsia-500" />
            <span className="text-sm font-semibold">Difficulty</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_OPTIONS.map((d) => (
              <Chip
                key={d}
                active={difficultyFilter === d}
                onClick={() => setDifficultyFilter(d)}
              >
                {d}
              </Chip>
            ))}
          </div>
        </Card>

        {/* Topic */}
        {topics.length > 0 && (
          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-semibold">Topic</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {topics.length} topic{topics.length !== 1 ? "s" : ""} available
              </span>
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              <Chip
                active={topicFilter === "All"}
                onClick={() => setTopicFilter("All")}
              >
                All
              </Chip>
              {topics.map((t) => (
                <Chip
                  key={t}
                  active={topicFilter === t}
                  onClick={() => setTopicFilter(t)}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </Card>
        )}

        {/* Time per question */}
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold">Time per question</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((t) => (
              <Chip
                key={t}
                active={timePerQuestion === t}
                onClick={() => setTimePerQuestion(t)}
              >
                {TIME_LABELS[t]}
              </Chip>
            ))}
          </div>
        </Card>
      </div>

      {/* Start column */}
      <div className="lg:col-span-1">
        <Card className="sticky top-20 overflow-hidden p-5">
          <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 opacity-20 blur-3xl" />
          <div className="relative space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Ready to practice?
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold">{poolSize}</span>
                <span className="text-sm text-muted-foreground">
                  of {totalPoolSize} questions
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {poolSize === 0
                  ? "No questions match your filters. Loosen them to start."
                  : `${Math.min(
                      count,
                      poolSize
                    )} will be served in a random order.`}
              </p>
            </div>

            <Button
              onClick={onStart}
              disabled={poolSize === 0}
              className="w-full gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90 disabled:opacity-40"
              size="lg"
            >
              <Play className="h-4 w-4" />
              Start Practice
            </Button>

            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Questions</span>
                <span className="font-medium">{count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Difficulty</span>
                <span className="font-medium">{difficultyFilter}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Topic</span>
                <span className="max-w-[55%] truncate font-medium">
                  {topicFilter}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Timer</span>
                <span className="font-medium">
                  {timePerQuestion === 0 ? "Off" : `${timePerQuestion}s`}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function PracticeScreen({
  questions,
  currentIdx,
  score,
  combo,
  timePerQuestion,
  timerLeft,
  selectedIndex,
  revealed,
  onAnswer,
  flash,
}: {
  questions: QuickQuestion[];
  currentIdx: number;
  score: number;
  combo: number;
  timePerQuestion: number;
  timerLeft: number;
  selectedIndex: number | null;
  revealed: boolean;
  onAnswer: (idx: number | null) => void;
  flash: { combo: number; msg: string; emoji: string } | null;
}) {
  const q = questions[currentIdx];
  if (!q) return null;

  const total = questions.length;
  const progressPct = (currentIdx / total) * 100;
  const letters = ["A", "B", "C", "D", "E", "F"];

  // Timer ring geometry
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const pct =
    timePerQuestion > 0 ? Math.max(0, timerLeft) / timePerQuestion : 1;
  const dashOffset = circumference * (1 - pct);
  const timerEnabled = timePerQuestion > 0;

  // Combo display
  const flameSize =
    combo >= 10 ? "h-6 w-6" : combo >= 5 ? "h-5 w-5" : "h-4 w-4";
  const flameColor =
    combo >= 10
      ? "text-orange-500"
      : combo >= 5
        ? "text-amber-500"
        : combo >= 2
          ? "text-amber-400"
          : "text-muted-foreground/40";

  return (
    <div className="relative space-y-4">
      {/* Combo reward flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center"
          >
            <div className="flex items-center gap-3 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-6 py-3 shadow-xl backdrop-blur-md">
              <span className="text-3xl">{flash.emoji}</span>
              <div className="leading-none">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-2xl font-extrabold text-transparent">
                  {flash.msg}
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  Combo ×{flash.combo}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Counter */}
          <div className="flex flex-col items-center justify-center min-w-[52px]">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Question
            </span>
            <span className="text-lg font-bold leading-none">
              {currentIdx + 1}
              <span className="text-sm font-normal text-muted-foreground">
                /{total}
              </span>
            </span>
          </div>

          <div className="h-10 w-px bg-border" />

          {/* Score */}
          <div className="flex flex-col items-center justify-center min-w-[52px]">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Score
            </span>
            <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-lg font-bold leading-none text-transparent">
              {score}
            </span>
          </div>

          <div className="h-10 w-px bg-border" />

          {/* Combo */}
          <div className="flex flex-1 flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Combo
            </span>
            <div className="flex items-center gap-1.5">
              <motion.span
                animate={
                  combo >= 2
                    ? { scale: [1, 1.25, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.4 }}
                className="inline-flex"
              >
                <Flame className={cn(flameSize, flameColor)} />
              </motion.span>
              {combo >= 2 ? (
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-lg font-extrabold leading-none text-transparent">
                  ×{combo}
                </span>
              ) : (
                <span className="text-sm font-medium text-muted-foreground/60">
                  —
                </span>
              )}
            </div>
          </div>

          {/* Timer */}
          {timerEnabled ? (
            <div className="relative flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  className="stroke-muted/30"
                  strokeWidth="3"
                  fill="none"
                />
                <motion.circle
                  cx="24"
                  cy="24"
                  r={radius}
                  className={timerRingClass(timerLeft, timerEnabled)}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 0.3, ease: "linear" }}
                  transform="rotate(-90 24 24)"
                />
              </svg>
              <span
                className={cn(
                  "absolute text-sm font-bold",
                  timerColor(timerLeft, timerEnabled)
                )}
              >
                {timerLeft}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <Clock className="h-5 w-5 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground">∞</span>
            </div>
          )}
        </div>
      </Card>

      {/* Question card */}
      <Card className="relative overflow-hidden p-4 sm:p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 blur-3xl" />
        <div className="relative space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("gap-1", sourceBadgeClass(q.source))}
            >
              <Sparkles className="h-3 w-3" />
              {sourceLabel(q.source)}
            </Badge>
            <Badge variant="outline" className="gap-1 border-border text-muted-foreground">
              <Brain className="h-3 w-3" />
              {q.topic}
            </Badge>
            <Badge
              variant="outline"
              className={cn("gap-1", diffBadgeClass(q.difficulty))}
            >
              <Target className="h-3 w-3" />
              {q.difficulty}
            </Badge>
          </div>

          {/* Question text */}
          <div className="text-base font-medium leading-relaxed sm:text-lg">
            {q.question}
          </div>

          {/* Options */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {q.options.map((opt, i) => {
              const isCorrect = opt === q.correctAnswer;
              const isSelected = selectedIndex === i;
              const showCorrect = revealed && isCorrect;
              const showWrong = revealed && isSelected && !isCorrect;
              return (
                <button
                  key={i}
                  disabled={revealed}
                  onClick={() => onAnswer(i)}
                  className={cn(
                    "group relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                    "disabled:cursor-default",
                    !revealed &&
                      "border-border bg-card hover:border-violet-500/50 hover:bg-violet-500/5",
                    showCorrect &&
                      "border-emerald-500/40 bg-emerald-500/10",
                    showWrong && "border-rose-500/40 bg-rose-500/10",
                    revealed &&
                      !showCorrect &&
                      !showWrong &&
                      "border-border bg-card opacity-60"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition",
                      !revealed &&
                        "bg-muted text-muted-foreground group-hover:bg-violet-500/15 group-hover:text-violet-500",
                      showCorrect && "bg-emerald-500 text-white",
                      showWrong && "bg-rose-500 text-white",
                      revealed &&
                        !showCorrect &&
                        !showWrong &&
                        "bg-muted text-muted-foreground"
                    )}
                  >
                    {showCorrect ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : showWrong ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      letters[i]
                    )}
                  </span>
                  <span className="flex-1 pt-0.5 text-sm leading-snug">
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Feedback line */}
          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                  selectedIndex !== null &&
                    q.options[selectedIndex ?? -1] === q.correctAnswer
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {selectedIndex !== null &&
                q.options[selectedIndex ?? -1] === q.correctAnswer ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Correct! +{combo || 1} combo points
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    {selectedIndex === null
                      ? "Time's up! "
                      : "Not quite. "}
                    Answer:{" "}
                    <span className="font-semibold">
                      {q.correctAnswer}
                    </span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress value={progressPct} className="h-2" />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {currentIdx + 1} of {total} answered
          </span>
          <span>{Math.round(progressPct)}%</span>
        </div>
      </div>
    </div>
  );
}

function ResultsScreen({
  total,
  correctCount,
  accuracy,
  maxCombo,
  totalTimeMs,
  records,
  onPracticeAgain,
  onNewSet,
  onSave,
}: {
  total: number;
  correctCount: number;
  accuracy: number;
  maxCombo: number;
  totalTimeMs: number;
  records: AnswerRecord[];
  onPracticeAgain: () => void;
  onNewSet: () => void;
  onSave: () => void;
}) {
  const [openReview, setOpenReview] = useState<Set<number>>(new Set([0]));
  const toggleReview = (i: number) =>
    setOpenReview((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  // Performance badge
  const perf =
    accuracy === 100
      ? { label: "Perfect", emoji: "🏆", cls: "from-amber-500 to-yellow-500" }
      : accuracy >= 80
        ? {
            label: "Excellent",
            emoji: "⭐",
            cls: "from-emerald-500 to-teal-500",
          }
        : accuracy >= 60
          ? { label: "Good", emoji: "👍", cls: "from-violet-500 to-fuchsia-500" }
          : {
              label: "Keep Practicing",
              emoji: "💪",
              cls: "from-rose-500 to-orange-500",
            };

  const secondsTotal = Math.round(totalTimeMs / 1000);
  const timeStr =
    secondsTotal >= 60
      ? `${Math.floor(secondsTotal / 60)}m ${secondsTotal % 60}s`
      : `${secondsTotal}s`;

  return (
    <div className="space-y-4">
      {/* Hero score card */}
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div
          className={cn(
            "pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-br opacity-20 blur-3xl",
            perf.cls
          )}
        />
        <div className="relative grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-semibold text-muted-foreground">
                Session Complete
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <motion.span
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 16 }}
                className={cn(
                  "bg-gradient-to-r bg-clip-text text-6xl font-extrabold text-transparent",
                  perf.cls
                )}
              >
                {accuracy}%
              </motion.span>
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full bg-gradient-to-r px-3 py-1 text-sm font-bold text-white",
                  perf.cls
                )}
              >
                <span>{perf.emoji}</span>
                {perf.label}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              You answered{" "}
              <span className="font-semibold text-foreground">
                {correctCount}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">{total}</span>{" "}
              correctly.
            </p>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3">
            <ResultStat
              label="Correct"
              value={`${correctCount}/${total}`}
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            />
            <ResultStat
              label="Max Combo"
              value={`×${maxCombo}`}
              icon={<Flame className="h-4 w-4 text-amber-500" />}
            />
            <ResultStat
              label="Accuracy"
              value={`${accuracy}%`}
              icon={<Target className="h-4 w-4 text-violet-500" />}
            />
            <ResultStat
              label="Time Taken"
              value={timeStr}
              icon={<Clock className="h-4 w-4 text-fuchsia-500" />}
            />
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onPracticeAgain}
          className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
        >
          <RotateCcw className="h-4 w-4" />
          Practice Again
        </Button>
        <Button variant="outline" onClick={onNewSet} className="gap-2">
          <Play className="h-4 w-4" />
          New Set
        </Button>
        <Button variant="outline" onClick={onSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save to My Research
        </Button>
      </div>

      {/* Per-question review */}
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold">Question Review</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {records.length} questions
            </span>
          </div>
        </div>
        <div className="max-h-[28rem] overflow-y-auto">
          {records.map((r, i) => {
            const open = openReview.has(i);
            const letters = ["A", "B", "C", "D", "E", "F"];
            return (
              <div
                key={i}
                className={cn(
                  "border-b border-border/60 last:border-b-0",
                  r.correct ? "bg-emerald-500/[0.03]" : "bg-rose-500/[0.03]"
                )}
              >
                <button
                  onClick={() => toggleReview(i)}
                  className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-muted/40"
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      r.correct
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {r.correct ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">
                    <span className="text-muted-foreground">
                      Q{i + 1}.
                    </span>{" "}
                    {r.question.question}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "hidden shrink-0 sm:inline-flex",
                      sourceBadgeClass(r.question.source)
                    )}
                  >
                    {sourceLabel(r.question.source)}
                  </Badge>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-90"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2.5 px-3.5 pb-4 pt-1">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge
                            variant="outline"
                            className={diffBadgeClass(r.question.difficulty)}
                          >
                            {r.question.difficulty}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-border text-muted-foreground"
                          >
                            {r.question.topic}
                          </Badge>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                              <XCircle className="h-3 w-3" />
                              Your answer
                            </div>
                            <div className="text-sm">
                              {r.selectedIndex === null ? (
                                <span className="italic text-muted-foreground">
                                  (timed out)
                                </span>
                              ) : (
                                <span>
                                  <span className="font-semibold text-muted-foreground">
                                    {letters[r.selectedIndex]}.
                                  </span>{" "}
                                  {r.question.options[r.selectedIndex]}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Correct answer
                            </div>
                            <div className="text-sm">
                              {r.question.options.findIndex(
                                (o) => o === r.question.correctAnswer
                              ) >= 0 ? (
                                <span>
                                  <span className="font-semibold text-muted-foreground">
                                    {
                                      letters[
                                        r.question.options.findIndex(
                                          (o) => o === r.question.correctAnswer
                                        )
                                      ]
                                    }
                                    .
                                  </span>{" "}
                                  {r.question.correctAnswer}
                                </span>
                              ) : (
                                r.question.correctAnswer
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ResultStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
