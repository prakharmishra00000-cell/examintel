"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sigma,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  ChevronRight,
  Brain,
  Zap,
  Target,
  Timer,
  Flame,
  Save,
  ListChecks,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useFormulaStore, type Formula } from "@/store/formula-store";
import { useAppStore } from "@/store/app-store";
import { PremiumEmptyState } from "@/components/shared/premium-empty-state";

// ============================================================
// Formula Quiz — timed multiple-choice recall of formulas.
// Two modes:
//   1. "identify-formula": show name → pick correct formula string
//   2. "identify-name":     show formula → pick correct name
// ============================================================

type Phase = "setup" | "quiz" | "results";
type QuizMode = "identify-formula" | "identify-name";

interface QuizQuestion {
  promptFormula: Formula; // the correct one
  options: Formula[]; // 4 options (shuffled), promptFormula is included
  correctId: string;
}

interface AnswerRecord {
  question: QuizQuestion;
  selectedId: string | null; // null = timed out / skipped
  correct: boolean;
  timeMs: number;
}

interface QuizStats {
  lastScore: number;
  lastTotal: number;
  bestScore: number; // best accuracy %
  totalQuizzes: number;
}

// ---------- helpers ----------
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestion(
  pool: Formula[],
  distractorSource: Formula[],
  mode: QuizMode
): QuizQuestion | null {
  if (pool.length === 0) return null;
  const correct = pool[Math.floor(Math.random() * pool.length)];
  // Distractors come from the full formula list so we always have unique
  // options even when the filtered subject pool is tiny.
  const distractorPool = distractorSource.filter((f) => f.id !== correct.id);
  if (distractorPool.length === 0) {
    // Truly only one formula in the whole store — duplicate the correct one
    // as a last resort (the quiz is degenerate but won't crash).
    return {
      promptFormula: correct,
      options: [correct, correct, correct, correct],
      correctId: correct.id,
    };
  }
  // Pad if fewer than 3 distractors by allowing repeats from the pool.
  const distractors = shuffle(distractorPool).slice(0, 3);
  while (distractors.length < 3) {
    const pick = distractorPool[distractors.length % distractorPool.length];
    if (pick && !distractors.some((d) => d.id === pick.id)) {
      distractors.push(pick);
    } else {
      // cannot get more unique distractors; just stop
      break;
    }
  }
  const options = shuffle([correct, ...distractors]);
  // `mode` is used by the render layer to decide which field to display.
  void mode;
  return {
    promptFormula: correct,
    options,
    correctId: correct.id,
  };
}

const COUNT_OPTIONS = [5, 10, 15, 20];
const TIME_OPTIONS = [15, 30, 60, 0] as const; // 0 = no timer
const TIME_LABELS: Record<number, string> = { 15: "15s", 30: "30s", 60: "60s", 0: "No timer" };

const STATS_KEY = "examintel-formula-quiz-stats";

function loadStats(): QuizStats | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuizStats;
  } catch {
    return null;
  }
}

function saveStats(s: QuizStats) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// Timer color helper: violet (calm) → amber (<10s) → rose (<5s)
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

// ============================================================
// Main component
// ============================================================
export function FormulaQuiz() {
  const formulas = useFormulaStore((s) => s.formulas);
  const setView = useAppStore((s) => s.setView);
  const saveItem = useAppStore((s) => s.saveItem);

  // ---- setup state ----
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<QuizMode>("identify-formula");
  const [count, setCount] = useState<number>(10);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(30);
  const [subjectFilter, setSubjectFilter] = useState<string>("All");

  // ---- quiz state ----
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timerLeft, setTimerLeft] = useState<number>(timePerQuestion);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [quizStartTs, setQuizStartTs] = useState<number>(0);
  const [questionStartTs, setQuestionStartTs] = useState<number>(0);

  // ---- stats ----
  const [stats, setStats] = useState<QuizStats | null>(null);

  // Refs to escape stale closures in timer
  const revealLockRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load stats on mount
  useEffect(() => {
    setStats(loadStats());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // Subjects available in store (for filter chips)
  const subjects = useMemo(() => {
    const set = new Set<string>();
    formulas.forEach((f) => set.add(f.subject));
    return Array.from(set);
  }, [formulas]);

  // Filtered pool by subject
  const pool = useMemo(() => {
    if (subjectFilter === "All") return formulas;
    return formulas.filter((f) => f.subject === subjectFilter);
  }, [formulas, subjectFilter]);

  // ---------- quiz lifecycle ----------
  const startQuiz = useCallback(() => {
    if (pool.length === 0) {
      toast.error("No formulas available for the selected subject");
      return;
    }
    const actualCount = Math.min(count, pool.length * 4); // don't overflow
    const qs: QuizQuestion[] = [];
    let guard = 0;
    while (qs.length < actualCount && guard < actualCount * 10) {
      const q = buildQuestion(pool, formulas, mode);
      if (q) qs.push(q);
      guard++;
    }
    if (qs.length === 0) {
      toast.error("Could not build quiz questions");
      return;
    }
    setQuestions(qs);
    setCurrentIdx(0);
    setSelectedId(null);
    setRevealed(false);
    revealLockRef.current = false;
    setRecords([]);
    setTimerLeft(timePerQuestion);
    const now = Date.now();
    setQuizStartTs(now);
    setQuestionStartTs(now);
    setPhase("quiz");
  }, [pool, count, mode, timePerQuestion]);

  // Advance to next question (or finish)
  const advance = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setSelectedId(null);
    setRevealed(false);
    revealLockRef.current = false;
    if (currentIdx + 1 >= questions.length) {
      // finish
      setPhase("results");
      return;
    }
    setCurrentIdx((i) => i + 1);
    setTimerLeft(timePerQuestion);
    setQuestionStartTs(Date.now());
  }, [currentIdx, questions.length, timePerQuestion]);

  // Lock in an answer (user click or timeout)
  const lockAnswer = useCallback(
    (id: string | null) => {
      if (revealLockRef.current) return;
      revealLockRef.current = true;
      const q = questions[currentIdx];
      if (!q) return;
      const correct = id === q.correctId;
      setSelectedId(id);
      setRevealed(true);
      const rec: AnswerRecord = {
        question: q,
        selectedId: id,
        correct,
        timeMs: Date.now() - questionStartTs,
      };
      setRecords((prev) => [...prev, rec]);
      // Auto-advance after 1.5s
      advanceTimerRef.current = setTimeout(() => {
        advance();
      }, 1500);
    },
    [questions, currentIdx, questionStartTs, advance]
  );

  // ---------- timer effect ----------
  useEffect(() => {
    if (phase !== "quiz") return;
    if (timePerQuestion === 0) return; // no timer
    if (revealed) return; // pause countdown after reveal
    if (timerLeft <= 0) {
      lockAnswer(null); // timed out
      return;
    }
    const t = setTimeout(() => {
      setTimerLeft((s) => s - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, timePerQuestion, timerLeft, revealed, lockAnswer]);

  // ---------- results / stats ----------
  const score = records.filter((r) => r.correct).length;
  const total = questions.length;
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
  const totalTimeMs = quizStartTs ? Date.now() - quizStartTs : 0;

  useEffect(() => {
    if (phase === "results" && total > 0) {
      const prev = loadStats();
      const next: QuizStats = {
        lastScore: score,
        lastTotal: total,
        bestScore: Math.max(prev?.bestScore ?? 0, accuracy),
        totalQuizzes: (prev?.totalQuizzes ?? 0) + 1,
      };
      saveStats(next);
      setStats(next);
    }
  }, [phase]);

  const saveToResearch = () => {
    const review = records.map((r) => ({
      prompt: r.question.promptFormula.name,
      correctAnswer:
        mode === "identify-formula"
          ? r.question.promptFormula.formula
          : r.question.promptFormula.name,
      userAnswer:
        r.selectedId === null
          ? "(timed out)"
          : mode === "identify-formula"
            ? r.question.options.find((o) => o.id === r.selectedId)?.formula ?? "—"
            : r.question.options.find((o) => o.id === r.selectedId)?.name ?? "—",
      correct: r.correct,
    }));
    saveItem({
      type: "paper",
      title: "Formula Quiz",
      summary: `${score}/${total} · ${accuracy}%`,
      data: {
        type: "formula-quiz",
        score,
        total,
        accuracy,
        mode,
        questions: review,
      },
    });
    toast.success("Saved to My Research", {
      description: `${score}/${total} · ${accuracy}% accuracy`,
    });
  };

  const resetToSetup = () => {
    setPhase("setup");
    setQuestions([]);
    setRecords([]);
    setSelectedId(null);
    setRevealed(false);
    setCurrentIdx(0);
    revealLockRef.current = false;
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  // ---------- Empty state ----------
  if (pool.length === 0 && phase === "setup") {
    return (
      <div className="space-y-6">
        <QuizHeader />
        <PremiumEmptyState
          icon={Sigma}
          title="No formulas to quiz yet"
          description="Add formulas to your Formula Sheet first — then come back here to test your recall."
          ctaLabel="Open Formula Sheet"
          ctaIcon={ChevronRight}
          ctaOnClick={() => setView("formula-sheet")}
          accent="violet"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <QuizHeader />

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
              mode={mode}
              setMode={setMode}
              count={count}
              setCount={setCount}
              timePerQuestion={timePerQuestion}
              setTimePerQuestion={setTimePerQuestion}
              subjectFilter={subjectFilter}
              setSubjectFilter={setSubjectFilter}
              subjects={subjects}
              poolSize={pool.length}
              stats={stats}
              onStart={startQuiz}
            />
          </motion.div>
        )}

        {phase === "quiz" && questions[currentIdx] && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <QuizScreen
              question={questions[currentIdx]}
              currentIdx={currentIdx}
              total={questions.length}
              score={score}
              mode={mode}
              timerLeft={timerLeft}
              timePerQuestion={timePerQuestion}
              selectedId={selectedId}
              revealed={revealed}
              onAnswer={lockAnswer}
              onNext={advance}
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
              score={score}
              total={total}
              accuracy={accuracy}
              totalTimeMs={totalTimeMs}
              records={records}
              mode={mode}
              onRetry={startQuiz}
              onNewQuiz={resetToSetup}
              onOpenSheet={() => setView("formula-sheet")}
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

function QuizHeader() {
  return (
    <div className="flex items-start gap-3">
      <div className="relative shrink-0">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-40" />
        <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg">
          <Brain className="h-5 w-5" />
        </div>
      </div>
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Formula Quiz</h1>
        <p className="text-sm text-muted-foreground">
          Test your formula recall. Timed. Scored. Track your mastery.
        </p>
      </div>
    </div>
  );
}

// ---------- Setup screen ----------
function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all",
        active
          ? "border-violet-500/40 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 text-foreground shadow-sm"
          : "border-border/70 bg-background/40 text-muted-foreground hover:bg-accent hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

function SetupScreen({
  mode,
  setMode,
  count,
  setCount,
  timePerQuestion,
  setTimePerQuestion,
  subjectFilter,
  setSubjectFilter,
  subjects,
  poolSize,
  stats,
  onStart,
}: {
  mode: QuizMode;
  setMode: (m: QuizMode) => void;
  count: number;
  setCount: (n: number) => void;
  timePerQuestion: number;
  setTimePerQuestion: (n: number) => void;
  subjectFilter: string;
  setSubjectFilter: (s: string) => void;
  subjects: string[];
  poolSize: number;
  stats: QuizStats | null;
  onStart: () => void;
}) {
  const maxCount = Math.max(5, poolSize);
  const counts = COUNT_OPTIONS.filter((c) => c <= maxCount * 4 || c <= 5);
  // Always include at least 5 and 10 if possible.
  const safeCounts = Array.from(new Set([5, 10, ...counts, count]))
    .filter((c) => COUNT_OPTIONS.includes(c) && c <= maxCount * 4 + 5)
    .sort((a, b) => a - b);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Config card */}
      <Card className="lg:col-span-2 p-5 sm:p-6 border-border/70">
        <div className="space-y-6">
          {/* Mode */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Target className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Quiz Mode
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <ModeCard
                active={mode === "identify-formula"}
                onClick={() => setMode("identify-formula")}
                icon={Sigma}
                title="Identify Formula"
                desc="See the name → pick the right formula"
              />
              <ModeCard
                active={mode === "identify-name"}
                onClick={() => setMode("identify-name")}
                icon={ListChecks}
                title="Identify Name"
                desc="See the formula → pick the right name"
              />
            </div>
          </div>

          {/* Question count */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <ListChecks className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Questions
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {safeCounts.map((c) => (
                <Chip key={c} active={count === c} onClick={() => setCount(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>

          {/* Time per question */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Timer className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Time per Question
              </h2>
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
          </div>

          {/* Subject filter */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Brain className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Subject
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip active={subjectFilter === "All"} onClick={() => setSubjectFilter("All")}>
                All
              </Chip>
              {subjects.map((s) => (
                <Chip
                  key={s}
                  active={subjectFilter === s}
                  onClick={() => setSubjectFilter(s)}
                >
                  {s}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {poolSize} formula{poolSize === 1 ? "" : "s"} in this pool
            </p>
          </div>

          {/* Start button */}
          <Button
            onClick={onStart}
            size="lg"
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90 shadow-lg shadow-violet-500/20"
          >
            <Play className="h-4 w-4" />
            Start Quiz
          </Button>
        </div>
      </Card>

      {/* Stats / info side card */}
      <Card className="p-5 sm:p-6 border-border/70 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your Stats
          </h3>
        </div>
        {stats && stats.totalQuizzes > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatBox
                icon={Target}
                label="Last Score"
                value={`${stats.lastScore}/${stats.lastTotal}`}
                tone="violet"
              />
              <StatBox
                icon={Flame}
                label="Best Accuracy"
                value={`${stats.bestScore}%`}
                tone="amber"
              />
            </div>
            <StatBox
              icon={Brain}
              label="Quizzes Taken"
              value={String(stats.totalQuizzes)}
              tone="emerald"
              wide
            />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>No quizzes taken yet.</p>
            <p className="text-xs">
              Take your first quiz to start tracking mastery. Stats persist on this device.
            </p>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-border/60 space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-violet-500" />
            <span>4 options per question (1 correct + 3 distractors)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>Auto-advance 1.5s after answering</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Timeout counts as wrong</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
        active
          ? "border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 shadow-sm"
          : "border-border/70 bg-background/40 hover:border-border hover:bg-accent/50"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
            : "bg-muted text-muted-foreground group-hover:text-foreground"
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-tight">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
      </div>
      {active && (
        <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
      )}
    </button>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  tone,
  wide,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "violet" | "amber" | "emerald" | "rose";
  wide?: boolean;
}) {
  const tones: Record<string, string> = {
    violet: "from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-300",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-300",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-300",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-600 dark:text-rose-300",
  };
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-gradient-to-br p-3",
        wide && "col-span-2",
        tones[tone]
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide opacity-80">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

// ---------- Quiz screen ----------
function QuizScreen({
  question,
  currentIdx,
  total,
  score,
  mode,
  timerLeft,
  timePerQuestion,
  selectedId,
  revealed,
  onAnswer,
  onNext,
}: {
  question: QuizQuestion;
  currentIdx: number;
  total: number;
  score: number;
  mode: QuizMode;
  timerLeft: number;
  timePerQuestion: number;
  selectedId: string | null;
  revealed: boolean;
  onAnswer: (id: string | null) => void;
  onNext: () => void;
}) {
  const timerEnabled = timePerQuestion > 0;
  const prompt = question.promptFormula;
  const progressPct = (currentIdx / total) * 100;

  // Which field do we show as the prompt vs options, based on mode.
  const promptHeading =
    mode === "identify-formula"
      ? "Which formula matches this name?"
      : "What is this formula used for?";

  const timerColorCls = timerColor(timerLeft, timerEnabled);
  const ringCls = timerRingClass(timerLeft, timerEnabled);
  const bgCls = timerBgClass(timerLeft, timerEnabled);

  // Circle progress for the countdown
  const ringSize = 44;
  const stroke = 4;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringPct = timerEnabled
    ? Math.max(0, Math.min(1, timerLeft / timePerQuestion))
    : 1;
  const dashOffset = circumference * (1 - ringPct);

  return (
    <div className="space-y-4">
      {/* Top bar: question counter + score + timer */}
      <Card className="p-3 sm:p-4 border-border/70">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Badge
              variant="outline"
              className="border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300 tabular-nums"
            >
              Q {currentIdx + 1} / {total}
            </Badge>
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 tabular-nums"
            >
              <Trophy className="h-3 w-3 mr-1" />
              {score}
            </Badge>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2">
            {timerEnabled ? (
              <div
                className={cn(
                  "relative flex items-center justify-center rounded-full transition-colors",
                  bgCls
                )}
                style={{ width: ringSize, height: ringSize }}
              >
                <svg
                  width={ringSize}
                  height={ringSize}
                  className="absolute inset-0 -rotate-90"
                >
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={stroke}
                    className="stroke-muted/40"
                  />
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className={cn("transition-all duration-500", ringCls)}
                  />
                </svg>
                <span
                  className={cn(
                    "relative text-xs font-bold tabular-nums",
                    timerColorCls
                  )}
                >
                  {timerLeft}
                </span>
              </div>
            ) : (
              <Badge
                variant="outline"
                className="border-muted-foreground/20 bg-muted/30 text-muted-foreground"
              >
                <Clock className="h-3 w-3 mr-1" />
                No timer
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Question card */}
      <Card className="p-5 sm:p-7 border-border/70 overflow-hidden relative">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-20 bg-gradient-to-br from-violet-500 to-fuchsia-500" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-violet-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {promptHeading}
            </span>
          </div>

          {mode === "identify-formula" ? (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {prompt.subject} · {prompt.topic}
              </div>
              <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
                {prompt.name}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {prompt.description}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {prompt.subject} · {prompt.topic}
              </div>
              <div className="mt-2 rounded-lg border border-border/70 bg-muted/30 px-4 py-4 overflow-x-auto">
                <code className="font-mono text-base sm:text-lg font-semibold text-foreground break-words whitespace-pre-wrap">
                  {prompt.formula}
                </code>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {prompt.description}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Options */}
      <div className="grid sm:grid-cols-2 gap-3">
        {question.options.map((opt, i) => {
          const isSelected = selectedId === opt.id;
          const isCorrect = opt.id === question.correctId;
          // styling logic
          let state: "idle" | "correct" | "wrong" | "muted" = "idle";
          if (revealed) {
            if (isCorrect) state = "correct";
            else if (isSelected) state = "wrong";
            else state = "muted";
          }
          return (
            <OptionCard
              key={opt.id}
              index={i}
              state={state}
              disabled={revealed}
              onClick={() => onAnswer(opt.id)}
            >
              {mode === "identify-formula" ? (
                <code className="font-mono text-sm sm:text-base font-semibold break-words whitespace-pre-wrap">
                  {opt.formula}
                </code>
              ) : (
                <span className="text-sm sm:text-base font-semibold">
                  {opt.name}
                </span>
              )}
            </OptionCard>
          );
        })}
      </div>

      {/* Next button (manual advance, hidden until revealed) */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="text-xs text-muted-foreground">
          {revealed
            ? selectedId === question.correctId
              ? "Correct!"
              : selectedId === null
                ? "Time's up!"
                : "Not quite"
            : timerEnabled
              ? "Pick an answer before time runs out"
              : "Pick an answer"}
        </div>
        {revealed && (
          <Button
            onClick={onNext}
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <Progress
          value={progressPct}
          className="h-1.5 bg-muted/50"
        />
        <div className="text-[10px] text-muted-foreground text-right tabular-nums">
          {Math.round(progressPct)}%
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  index,
  state,
  disabled,
  onClick,
  children,
}: {
  index: number;
  state: "idle" | "correct" | "wrong" | "muted";
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const states: Record<string, string> = {
    idle: "border-border/70 bg-background hover:border-violet-500/40 hover:bg-violet-500/5 cursor-pointer",
    correct:
      "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30",
    wrong: "border-rose-500/50 bg-rose-500/10 ring-1 ring-rose-500/30",
    muted: "border-border/50 bg-muted/20 opacity-60",
  };
  const letters = ["A", "B", "C", "D", "E", "F"];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all min-h-[64px]",
        states[state],
        disabled && "cursor-default"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold transition-colors",
          state === "correct"
            ? "bg-emerald-500 text-white"
            : state === "wrong"
              ? "bg-rose-500 text-white"
              : state === "muted"
                ? "bg-muted text-muted-foreground"
                : "bg-muted/70 text-muted-foreground group-hover:bg-violet-500/20 group-hover:text-violet-600 dark:group-hover:text-violet-300"
        )}
      >
        {state === "correct" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : state === "wrong" ? (
          <XCircle className="h-4 w-4" />
        ) : (
          letters[index]
        )}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
    </button>
  );
}

// ---------- Results screen ----------
function ResultsScreen({
  score,
  total,
  accuracy,
  totalTimeMs,
  records,
  mode,
  onRetry,
  onNewQuiz,
  onOpenSheet,
  onSave,
}: {
  score: number;
  total: number;
  accuracy: number;
  totalTimeMs: number;
  records: AnswerRecord[];
  mode: QuizMode;
  onRetry: () => void;
  onNewQuiz: () => void;
  onOpenSheet: () => void;
  onSave: () => void;
}) {
  const badge =
    accuracy === 100
      ? { label: "Perfect!", icon: Trophy, tone: "amber" as const }
      : accuracy >= 80
        ? { label: "Excellent", icon: Zap, tone: "violet" as const }
        : accuracy >= 60
          ? { label: "Good", icon: Target, tone: "emerald" as const }
          : { label: "Keep Practicing", icon: Brain, tone: "rose" as const };

  const toneClasses: Record<string, string> = {
    amber: "from-amber-500 to-orange-500",
    violet: "from-violet-500 to-fuchsia-500",
    emerald: "from-emerald-500 to-teal-500",
    rose: "from-rose-500 to-pink-500",
  };

  const totalSec = Math.round(totalTimeMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <Card className="relative overflow-hidden border-border/70">
        <div
          className={cn(
            "absolute inset-0 opacity-10 bg-gradient-to-br",
            toneClasses[badge.tone]
          )}
        />
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative shrink-0">
            <div
              className={cn(
                "absolute inset-0 rounded-2xl blur-xl opacity-50 bg-gradient-to-br",
                toneClasses[badge.tone]
              )}
            />
            <div
              className={cn(
                "relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                toneClasses[badge.tone]
              )}
            >
              <badge.icon className="h-9 w-9" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r",
                toneClasses[badge.tone]
              )}
            >
              {badge.label}
            </div>
            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
              <span className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">
                {score}
              </span>
              <span className="text-2xl text-muted-foreground font-medium">
                / {total}
              </span>
              <span className="text-xl text-muted-foreground">·</span>
              <span className="text-2xl font-semibold text-violet-500 tabular-nums">
                {accuracy}%
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "identify-formula"
                ? "Identify Formula mode"
                : "Identify Name mode"}{" "}
              · completed in {timeStr}
            </p>
          </div>
        </div>
      </Card>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border-border/70 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500" />
          <div className="mt-1.5 text-2xl font-bold tabular-nums">{score}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Correct
          </div>
        </Card>
        <Card className="p-4 border-border/70 text-center">
          <XCircle className="h-5 w-5 mx-auto text-rose-500" />
          <div className="mt-1.5 text-2xl font-bold tabular-nums">
            {total - score}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Wrong
          </div>
        </Card>
        <Card className="p-4 border-border/70 text-center">
          <Clock className="h-5 w-5 mx-auto text-amber-500" />
          <div className="mt-1.5 text-2xl font-bold tabular-nums">{timeStr}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Time
          </div>
        </Card>
      </div>

      {/* Per-question review */}
      <Card className="p-0 border-border/70 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold">Review</h3>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {records.length} question{records.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
          {records.map((r, i) => {
            const userOpt =
              r.selectedId === null
                ? null
                : r.question.options.find((o) => o.id === r.selectedId) ?? null;
            const userText =
              userOpt === null
                ? "(timed out)"
                : mode === "identify-formula"
                  ? userOpt.formula
                  : userOpt.name;
            const correctText =
              mode === "identify-formula"
                ? r.question.promptFormula.formula
                : r.question.promptFormula.name;
            return (
              <div key={i} className="px-5 py-3.5">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                      r.correct
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-rose-500/15 text-rose-500"
                    )}
                  >
                    {r.correct ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Q{i + 1} · {r.question.promptFormula.subject} ·{" "}
                      {r.question.promptFormula.topic}
                    </div>
                    <div className="text-sm font-semibold">
                      {r.question.promptFormula.name}
                    </div>
                    <div className="flex flex-col gap-1 mt-1.5">
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-muted-foreground shrink-0 w-16">
                          Your answer:
                        </span>
                        <span
                          className={cn(
                            "font-mono break-words",
                            r.correct
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400 line-through decoration-rose-500/40"
                          )}
                        >
                          {userText}
                        </span>
                      </div>
                      {!r.correct && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0 w-16">
                            Correct:
                          </span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 break-words">
                            {correctText}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2.5">
        <Button
          onClick={onRetry}
          className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
        >
          <RotateCcw className="h-4 w-4" />
          Retry Quiz
        </Button>
        <Button onClick={onNewQuiz} variant="outline" className="gap-2">
          <Brain className="h-4 w-4" />
          New Quiz
        </Button>
        <Button onClick={onOpenSheet} variant="outline" className="gap-2">
          <Sigma className="h-4 w-4" />
          Open Formula Sheet
        </Button>
        <Button
          onClick={onSave}
          variant="outline"
          className="gap-2 ml-auto border-violet-500/30 bg-violet-500/5 text-violet-600 dark:text-violet-300 hover:bg-violet-500/10"
        >
          <Save className="h-4 w-4" />
          Save to My Research
        </Button>
      </div>
    </div>
  );
}
