"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileStack,
  Clock,
  ListChecks,
  CheckCircle2,
  XCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  TrendingUp,
  Sparkles,
  Save,
  RotateCcw,
  AlertTriangle,
  BookOpen,
  Target,
  Award,
  Gauge,
  Lightbulb,
  Hash,
  Layers,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useAppStore } from "@/store/app-store";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/states";
import { SourceBadgeList } from "@/components/shared/source-badge";
import type { GeneratedPaper, PerformanceAnalysis } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Local rich types that extend the shared PerformanceAnalysis breakdowns
// with an `attempted` count (the shared type doesn't expose it, but our
// analysis computes it and the UI uses it).
interface RichTopicBreakdown {
  topic: string;
  correct: number;
  total: number;
  attempted: number;
  accuracy: number;
}
interface RichDiffBreakdown {
  difficulty: string;
  correct: number;
  total: number;
  attempted: number;
  accuracy: number;
}
interface RichTypeBreakdown {
  type: string;
  correct: number;
  total: number;
  attempted: number;
  accuracy: number;
}

interface RichAnalysis extends Omit<
  PerformanceAnalysis,
  "topicWise" | "difficultyWise" | "questionTypeWise"
> {
  topicWise: RichTopicBreakdown[];
  difficultyWise: RichDiffBreakdown[];
  questionTypeWise: RichTypeBreakdown[];
}

// ============================================================
// AI Personalized Question Paper Generator
// ============================================================
// Three phases, all client-managed:
//   1. Configuration form
//   2. Test taking (timer + palette + radio options)
//   3. Results & analysis (computed client-side, no API call)
// ============================================================

type Phase = "config" | "test" | "results";
type Mode =
  | "Exam Simulation"
  | "Weakness-Focused"
  | "Balanced Practice"
  | "Concept Mastery"
  | "PYQ-Inspired"
  | "Mixed Difficulty";
type Difficulty = "Easy" | "Medium" | "Hard" | "Mixed";

const MODES: Mode[] = [
  "Exam Simulation",
  "Weakness-Focused",
  "Balanced Practice",
  "Concept Mastery",
  "PYQ-Inspired",
  "Mixed Difficulty",
];

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Mixed"];

// quick presets — fill the form with one click
const PRESETS: { label: string; cfg: PaperConfigForm }[] = [
  {
    label: "SSC CGL · Mini Mock",
    cfg: {
      examName: "SSC CGL",
      totalQuestions: 6,
      durationMinutes: 8,
      subjects: "Quantitative Aptitude, Reasoning, English, General Awareness",
      topics: "Percentage, Series, Vocabulary, Current Affairs",
      difficulty: "Medium",
      mode: "Exam Simulation",
      markingScheme: "+2 / -0.5",
      negativeMarking: "0.5",
    },
  },
  {
    label: "GATE CE · Concept Mastery",
    cfg: {
      examName: "GATE Civil Engineering",
      totalQuestions: 8,
      durationMinutes: 12,
      subjects: "Engineering Mathematics, Fluid Mechanics, Geotechnical",
      topics: "Open Channel Flow, Soil Compaction, Linear Algebra",
      difficulty: "Hard",
      mode: "Concept Mastery",
      markingScheme: "+1 / +2 NAT · -1/3 for MCQ",
      negativeMarking: "0.33",
    },
  },
  {
    label: "UPSC CSE · PYQ-Inspired",
    cfg: {
      examName: "UPSC Civil Services Prelims",
      totalQuestions: 10,
      durationMinutes: 15,
      subjects: "History, Polity, Geography, Economy",
      topics: "Ancient India, Fundamental Rights, Monsoon, Inflation",
      difficulty: "Mixed",
      mode: "PYQ-Inspired",
      markingScheme: "+2 / -0.66",
      negativeMarking: "0.66",
    },
  },
  {
    label: "Weakness-Focused Drill",
    cfg: {
      examName: "SSC CHSL",
      totalQuestions: 8,
      durationMinutes: 10,
      subjects: "Quantitative Aptitude",
      topics: "Time & Work, Profit & Loss, Average, Ratio",
      difficulty: "Hard",
      mode: "Weakness-Focused",
      markingScheme: "+2 / -0.5",
      negativeMarking: "0.5",
    },
  },
];

interface PaperConfigForm {
  examName: string;
  totalQuestions: number;
  durationMinutes: number;
  subjects: string;
  topics: string;
  difficulty: Difficulty;
  mode: Mode;
  markingScheme: string;
  negativeMarking: string;
}

const DEFAULT_CONFIG: PaperConfigForm = {
  examName: "SSC CGL",
  totalQuestions: 10,
  durationMinutes: 15,
  subjects: "Quantitative Aptitude, Reasoning, English, General Awareness",
  topics: "Percentage, Series, Vocabulary, Current Affairs",
  difficulty: "Medium",
  mode: "Balanced Practice",
  markingScheme: "+2 / -0.5",
  negativeMarking: "0.5",
};

// ---------------- styling tokens (static literals, JIT-safe) ----------------
const PALETTE_ATTEMPTED =
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40";
const PALETTE_UNATTEMPTED =
  "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/30";
const PALETTE_MARKED =
  "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40";
const PALETTE_CURRENT =
  "ring-2 ring-violet-500 ring-offset-1 ring-offset-background";

const DIFFICULTY_BADGE: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Hard: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

const MODE_BADGE: Record<Mode, string> = {
  "Exam Simulation": "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  "Weakness-Focused": "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  "Balanced Practice": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "Concept Mastery": "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
  "PYQ-Inspired": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "Mixed Difficulty": "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
};

const ACCURACY_BAR: Record<string, string> = {
  high: "bg-emerald-500",
  mid: "bg-amber-500",
  low: "bg-rose-500",
};

function accuracyClass(acc: number): keyof typeof ACCURACY_BAR {
  if (acc >= 80) return "high";
  if (acc >= 50) return "mid";
  return "low";
}

// ---------------- helpers ----------------
function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function parseList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// ---------------- performance analysis (client-side) ----------------
function computeAnalysis(
  paper: GeneratedPaper,
  answers: Record<string, number>,
  timeUsedSeconds: number
): RichAnalysis {
  const qs = paper.questions;
  const total = qs.length;
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;
  let score = 0;
  let maxMarks = 0;
  let negImpact = 0;

  type Bucket = { correct: number; total: number; attempted: number };
  const topicMap = new Map<string, Bucket>();
  const diffMap = new Map<string, Bucket>();
  const typeMap = new Map<string, Bucket>();
  const get = (m: Map<string, Bucket>, k: string): Bucket => {
    let v = m.get(k);
    if (!v) {
      v = { correct: 0, total: 0, attempted: 0 };
      m.set(k, v);
    }
    return v;
  };

  // per-question answer detail for error heuristics
  const topicUnattempted = new Map<string, number>();
  const topicIncorrect = new Map<string, number>();
  const diffIncorrect = new Map<string, number>();

  for (const q of qs) {
    maxMarks += q.marks;
    const tb = get(topicMap, q.topic);
    const db = get(diffMap, q.difficulty);
    const yb = get(typeMap, q.questionType);
    tb.total++;
    db.total++;
    yb.total++;

    const ans = answers[q.id];
    const isAnswered = typeof ans === "number" && ans >= 0 && ans < q.options.length;
    const correctIdx = q.options.indexOf(q.correctAnswer);

    if (!isAnswered) {
      unattempted++;
      topicUnattempted.set(q.topic, (topicUnattempted.get(q.topic) ?? 0) + 1);
    } else if (correctIdx >= 0 && ans === correctIdx) {
      correct++;
      score += q.marks;
      tb.correct++;
      tb.attempted++;
      db.correct++;
      db.attempted++;
      yb.correct++;
      yb.attempted++;
    } else {
      incorrect++;
      score -= q.negativeMarks;
      negImpact += q.negativeMarks;
      tb.attempted++;
      db.attempted++;
      yb.attempted++;
      topicIncorrect.set(q.topic, (topicIncorrect.get(q.topic) ?? 0) + 1);
      diffIncorrect.set(q.difficulty, (diffIncorrect.get(q.difficulty) ?? 0) + 1);
    }
  }

  const acc = (correct + incorrect) > 0 ? Math.round((correct / (correct + incorrect)) * 1000) / 10 : 0;

  const topicWise: RichTopicBreakdown[] = Array.from(topicMap.entries())
    .map(([topic, v]) => ({
      topic,
      correct: v.correct,
      total: v.total,
      attempted: v.attempted,
      accuracy: v.attempted > 0 ? Math.round((v.correct / v.attempted) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const difficultyWise: RichDiffBreakdown[] = Array.from(diffMap.entries()).map(([difficulty, v]) => ({
    difficulty,
    correct: v.correct,
    total: v.total,
    attempted: v.attempted,
    accuracy: v.attempted > 0 ? Math.round((v.correct / v.attempted) * 1000) / 10 : 0,
  }));

  const questionTypeWise: RichTypeBreakdown[] = Array.from(typeMap.entries()).map(([type, v]) => ({
    type,
    correct: v.correct,
    total: v.total,
    attempted: v.attempted,
    accuracy: v.attempted > 0 ? Math.round((v.correct / v.attempted) * 1000) / 10 : 0,
  }));

  const strengths = topicWise
    .filter((t) => t.accuracy >= 80 && t.total > 0)
    .map((t) => t.topic);
  const weakAreas = topicWise
    .filter((t) => t.accuracy < 70 && t.attempted > 0)
    .map((t) => t.topic);

  // error heuristics — simple, derived purely from the data
  const conceptualErrors: string[] = [];
  for (const d of difficultyWise) {
    if (d.difficulty === "Hard" && d.attempted > 0 && d.correct < d.attempted) {
      conceptualErrors.push(`${d.correct}/${d.attempted} correct on Hard questions — revisit underlying concepts.`);
    }
  }
  for (const [t, c] of topicIncorrect.entries()) {
    conceptualErrors.push(`${c} wrong on "${t}" — re-derive the core rule.`);
  }
  if (conceptualErrors.length === 0 && incorrect === 0) {
    conceptualErrors.push("No major conceptual errors detected on this attempt.");
  }

  const calculationErrors: string[] = [];
  for (const d of difficultyWise) {
    if (d.difficulty === "Medium" && d.attempted > 0 && d.correct < d.attempted) {
      calculationErrors.push(`${d.attempted - d.correct} Medium-difficulty slip(s) — slow down on arithmetic steps.`);
    }
  }
  if (negImpact > 0) {
    calculationErrors.push(`Negative-mark impact: −${negImpact.toFixed(2)} marks from incorrect attempts — re-check before submitting.`);
  }

  const questionSelectionErrors: string[] = [];
  for (const [t, c] of topicUnattempted.entries()) {
    questionSelectionErrors.push(`${c} unattempted on "${t}" — attempt every question where negative marking is recoverable.`);
  }
  if (unattempted > 0) {
    questionSelectionErrors.push(`${unattempted} question(s) skipped overall — practise timed attempts to reduce avoidance.`);
  }

  const recommendedPractice: string[] = [];
  for (const t of weakAreas.slice(0, 6)) {
    recommendedPractice.push(`Revise ${t} → 5 Level-1 variants → 5 PYQs → 1 mixed test.`);
  }
  if (strengths.length > 0) {
    recommendedPractice.push(`Maintain strengths (${strengths.slice(0, 3).join(", ")}) with weekly mixed-difficulty revision.`);
  }
  if (negImpact > 0) {
    recommendedPractice.push(`Drill "answer-only-if-confident" rule — current negative-mark cost: ${negImpact.toFixed(2)}.`);
  }
  if (recommendedPractice.length === 0) {
    recommendedPractice.push("Excellent attempt — move to a higher difficulty mode (Mixed Difficulty / Exam Simulation) next.");
  }

  const minutes = Math.floor(timeUsedSeconds / 60);
  const seconds = timeUsedSeconds % 60;
  const timeUsedStr = `${minutes}m ${seconds}s`;
  const avg = total > 0 ? Math.round((timeUsedSeconds / total) * 10) / 10 : 0;
  const avgTimeStr = `${Math.floor(avg)}s`;

  return {
    score: Math.round(score * 100) / 100,
    maxMarks,
    accuracy: acc,
    correct,
    incorrect,
    unattempted,
    timeUsed: timeUsedStr,
    avgTimePerQuestion: avgTimeStr,
    topicWise,
    difficultyWise,
    questionTypeWise,
    negativeMarkImpact: Math.round(negImpact * 100) / 100,
    strengths,
    weakAreas,
    conceptualErrors,
    calculationErrors,
    questionSelectionErrors,
    recommendedPractice,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------- component ----------------
export function PaperGenerator() {
  const api = useApi();
  const setContext = useAppStore((s) => s.setContext);
  const saveItem = useAppStore((s) => s.saveItem);

  const [phase, setPhase] = useState<Phase>("config");
  const [config, setConfig] = useState<PaperConfigForm>(DEFAULT_CONFIG);
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // test phase state
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [analysis, setAnalysis] = useState<RichAnalysis | null>(null);

  const submittedRef = useRef(false);

  // ---------- form helpers ----------
  function update<K extends keyof PaperConfigForm>(key: K, value: PaperConfigForm[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function applyPreset(cfg: PaperConfigForm) {
    setConfig(cfg);
    setError(null);
  }

  // ---------- generate ----------
  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setPaper(null);
    setAnalysis(null);

    const payload = {
      examName: config.examName.trim(),
      totalQuestions: Number(config.totalQuestions) || 10,
      durationMinutes: Number(config.durationMinutes) || 15,
      subjects: parseList(config.subjects),
      topics: parseList(config.topics),
      difficulty: config.difficulty,
      mode: config.mode,
      markingScheme: config.markingScheme.trim(),
      negativeMarking: config.negativeMarking.trim(),
      questionTypes: ["MCQ"],
      sections: [],
    };

    const res = await api.call<{ paper: GeneratedPaper; error?: string }>(
      "/api/paper/generate",
      { config: payload }
    );
    setLoading(false);

    if (!res || !res.paper || res.error) {
      setError(res?.error ?? "AI did not return a paper.");
      return;
    }

    setPaper(res.paper);
    setAnswers({});
    setMarked(new Set());
    setCurrentIdx(0);
    setAnalysis(null);
    submittedRef.current = false;
    setRemainingSeconds(res.paper.durationMinutes * 60);
    setContext(`${res.paper.examName} · ${res.paper.mode} paper`, "paper");
    setPhase("test");
  }

  // ---------- timer ----------
  useEffect(() => {
    if (phase !== "test") return;
    if (remainingSeconds <= 0) return;
    const t = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [phase, remainingSeconds]);

  // auto-submit at 0 (deferred via setTimeout so setState is not in effect body)
  useEffect(() => {
    if (phase !== "test") return;
    if (remainingSeconds > 0) return;
    if (submittedRef.current || !paper) return;
    submittedRef.current = true;
    const id = setTimeout(() => {
      const usedSeconds = Math.max(0, paper.durationMinutes * 60 - remainingSeconds);
      const a = computeAnalysis(paper, answers, usedSeconds);
      setAnalysis(a);
      setPhase("results");
    }, 0);
    return () => clearTimeout(id);
  }, [phase, remainingSeconds, paper, answers]);

  // ---------- answer / mark ----------
  function selectOption(qid: string, optIdx: number) {
    setAnswers((prev) => ({ ...prev, [qid]: optIdx }));
  }

  function toggleMark(qid: string) {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  }

  // ---------- submit ----------
  function handleSubmitManual() {
    if (submittedRef.current || !paper) return;
    submittedRef.current = true;
    const usedSeconds = Math.max(0, paper.durationMinutes * 60 - remainingSeconds);
    const a = computeAnalysis(paper, answers, usedSeconds);
    setAnalysis(a);
    setPhase("results");
  }

  // ---------- back to phase 1 ----------
  function handleAnother() {
    setPhase("config");
    setPaper(null);
    setAnalysis(null);
    setAnswers({});
    setMarked(new Set());
    setCurrentIdx(0);
    setRemainingSeconds(0);
    submittedRef.current = false;
    setError(null);
  }

  // ---------- save ----------
  function handleSave() {
    if (!paper || !analysis) return;
    saveItem({
      type: "paper",
      title: `${paper.examName} paper`,
      summary: `${analysis.score}/${analysis.maxMarks} · ${analysis.accuracy}%`,
      data: { paper, analysis, answers },
    });
    toast.success("Saved to My Research", {
      description: `${paper.examName} · ${analysis.score}/${analysis.maxMarks} · ${analysis.accuracy}%`,
    });
  }

  // ---------- derived ----------
  const currentQ = paper && phase === "test" ? paper.questions[currentIdx] : null;
  const attemptedCount = useMemo(
    () => (paper ? paper.questions.filter((q) => typeof answers[q.id] === "number").length : 0),
    [paper, answers]
  );
  const markedCount = marked.size;

  // ============================================================
  // PHASE 1 — CONFIG
  // ============================================================
  if (phase === "config") {
    return (
      <div className="space-y-6">
        <header className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
              <FileStack className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AI Personalized Question Paper Generator</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-3xl">
            Configure exam, difficulty, marking, and mode — then attempt the generated paper with timer, palette, and analysis.
          </p>
        </header>

        <Card className="border-violet-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-violet-500" />
              Paper Configuration
            </CardTitle>
            <CardDescription>
              Pick a preset or fine-tune every dimension. The AI will respect your configuration and tag every question as AI-generated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* presets */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quick presets:</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => applyPreset(p.cfg)}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-all hover:border-violet-500/40 hover:text-foreground hover:bg-violet-500/5 text-left"
                    title={`${p.cfg.examName} · ${p.cfg.mode}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* main grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Exam name">
                <Input
                  value={config.examName}
                  onChange={(e) => update("examName", e.target.value)}
                  placeholder="SSC CGL"
                  aria-label="Exam name"
                />
              </Field>
              <Field label="Total questions">
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={config.totalQuestions}
                  onChange={(e) => update("totalQuestions", Number(e.target.value) || 0)}
                  aria-label="Total questions"
                />
              </Field>
              <Field label="Duration (minutes)">
                <Input
                  type="number"
                  min={1}
                  max={300}
                  value={config.durationMinutes}
                  onChange={(e) => update("durationMinutes", Number(e.target.value) || 0)}
                  aria-label="Duration in minutes"
                />
              </Field>
              <Field label="Subjects (comma-separated)" className="sm:col-span-2">
                <Input
                  value={config.subjects}
                  onChange={(e) => update("subjects", e.target.value)}
                  placeholder="Quantitative Aptitude, Reasoning, English"
                  aria-label="Subjects"
                />
              </Field>
              <Field label="Topics (comma-separated)">
                <Input
                  value={config.topics}
                  onChange={(e) => update("topics", e.target.value)}
                  placeholder="Percentage, Series, Vocabulary"
                  aria-label="Topics"
                />
              </Field>
              <Field label="Difficulty">
                <SelectSimple
                  value={config.difficulty}
                  onChange={(v) => update("difficulty", v as Difficulty)}
                  options={DIFFICULTIES}
                />
              </Field>
              <Field label="Mode">
                <SelectSimple
                  value={config.mode}
                  onChange={(v) => update("mode", v as Mode)}
                  options={MODES}
                />
              </Field>
              <Field label="Marking scheme">
                <Input
                  value={config.markingScheme}
                  onChange={(e) => update("markingScheme", e.target.value)}
                  placeholder="+2 / -0.5"
                  aria-label="Marking scheme"
                />
              </Field>
              <Field label="Negative marking">
                <Input
                  value={config.negativeMarking}
                  onChange={(e) => update("negativeMarking", e.target.value)}
                  placeholder="0.5"
                  aria-label="Negative marking"
                />
              </Field>
            </div>

            {/* generate button */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={handleGenerate}
                disabled={loading || !config.examName.trim() || config.totalQuestions < 1 || config.durationMinutes < 1}
                className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-lg transition-all"
              >
                <Sparkles className="h-4 w-4" />
                {loading ? "Generating..." : "Generate Paper"}
              </Button>
              <Disclaimer />
            </div>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="p-6">
              <LoadingState label="AI is assembling your personalized paper..." />
            </CardContent>
          </Card>
        )}

        {error && !loading && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-5">
              <ErrorState message={error} onRetry={handleGenerate} />
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <EmptyState
            icon={FileStack}
            title="No paper generated yet"
            description="Fill the form above or pick a preset, then click Generate Paper. You'll attempt the paper with a countdown timer and a question palette, then receive a full performance analysis."
          />
        )}
      </div>
    );
  }

  // ============================================================
  // PHASE 2 — TEST TAKING
  // ============================================================
  if (phase === "test" && paper && currentQ) {
    const selectedIdx = answers[currentQ.id];
    const isMarked = marked.has(currentQ.id);

    return (
      <div className="space-y-5">
        {/* disclaimer top */}
        <Disclaimer />

        {/* top bar */}
        <Card className="border-violet-500/20">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <FileStack className="h-4 w-4 text-violet-500" />
                <span className="font-semibold text-sm">{paper.examName}</span>
                <Badge variant="outline" className={cn("text-xs", MODE_BADGE[paper.mode])}>
                  {paper.mode}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {paper.totalQuestions} Q · {paper.markingScheme}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-muted-foreground">Attempted</span>
                  <span className="font-semibold">{attemptedCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Flag className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-muted-foreground">Marked</span>
                  <span className="font-semibold">{markedCount}</span>
                </div>
                <div
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-mono font-semibold tabular-nums overflow-hidden",
                    remainingSeconds <= 60
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : remainingSeconds <= 300
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
                    remainingSeconds <= 30 && remainingSeconds > 0 && "animate-pulse"
                  )}
                  aria-label="Time remaining"
                >
                  {/* time elapsed progress bar */}
                  {paper && (
                    <div
                      className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-1000"
                      style={{ width: `${Math.min(100, ((paper.durationMinutes * 60 - remainingSeconds) / (paper.durationMinutes * 60)) * 100)}%` }}
                    />
                  )}
                  <Clock className={cn("h-3.5 w-3.5", remainingSeconds <= 30 && remainingSeconds > 0 && "animate-pulse")} />
                  {formatClock(remainingSeconds)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
          {/* palette */}
          <Card className="lg:sticky lg:top-4 self-start">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-violet-500" />
                Question Palette
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[360px] overflow-y-auto pr-1 paper-palette-scroll">
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5">
                  {paper.questions.map((q, i) => {
                    const isAttempted = typeof answers[q.id] === "number";
                    const isMarkedQ = marked.has(q.id);
                    const isCurrent = i === currentIdx;
                    const cls = isMarkedQ
                      ? PALETTE_MARKED
                      : isAttempted
                        ? PALETTE_ATTEMPTED
                        : PALETTE_UNATTEMPTED;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIdx(i)}
                        aria-label={`Go to question ${i + 1}${isMarkedQ ? " (marked for review)" : isAttempted ? " (attempted)" : " (not attempted)"}`}
                        className={cn(
                          "h-8 w-8 rounded-md border text-xs font-semibold transition-all hover:scale-105",
                          cls,
                          isCurrent && PALETTE_CURRENT
                        )}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* legend */}
              <div className="mt-4 space-y-1.5 text-xs">
                <LegendRow className={PALETTE_ATTEMPTED} label="Attempted" />
                <LegendRow className={PALETTE_UNATTEMPTED} label="Not attempted" />
                <LegendRow className={PALETTE_MARKED} label="Marked for review" />
              </div>
            </CardContent>
          </Card>

          {/* main question card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Q {currentIdx + 1} / {paper.questions.length}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {currentQ.section}
                </Badge>
                <Badge variant="outline" className={cn("text-xs", DIFFICULTY_BADGE[currentQ.difficulty])}>
                  {currentQ.difficulty}
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  <span className="text-violet-500">
                    {currentQ.questionType === "MCQ" && "○"}
                    {currentQ.questionType === "Multiple Correct" && "☑"}
                    {currentQ.questionType === "Assertion & Reason" && "⇄"}
                    {currentQ.questionType === "Match the Following" && "⇋"}
                    {currentQ.questionType === "Statement-based" && "≡"}
                    {currentQ.questionType === "True/False" && "✓"}
                  </span>
                  {currentQ.topic}
                </Badge>
                <Badge variant="outline" className="text-xs bg-muted/50">
                  {currentQ.questionType}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  +{currentQ.marks} · −{currentQ.negativeMarks}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentQ.question}</p>
              </div>

              {/* options */}
              <div className="space-y-2">
                {currentQ.options.map((opt, i) => {
                  const selected = selectedIdx === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectOption(currentQ.id, i)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-all",
                        selected
                          ? "border-violet-500 bg-violet-500/5 text-foreground"
                          : "border-border bg-background hover:border-violet-500/40 hover:bg-violet-500/5"
                      )}
                      aria-pressed={selected}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                          selected
                            ? "border-violet-500 bg-violet-500 text-white"
                            : "border-border bg-muted/30 text-muted-foreground"
                        )}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {selected && <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0" />}
                    </button>
                  );
                })}
                {currentQ.options.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No options provided for this question.</p>
                )}
              </div>

              {/* action bar */}
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleMark(currentQ.id)}
                  className={cn(
                    "gap-1.5",
                    isMarked && "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}
                >
                  <Flag className="h-3.5 w-3.5" />
                  {isMarked ? "Marked" : "Mark for Review"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIdx === paper.questions.length - 1}
                  onClick={() => setCurrentIdx((i) => Math.min(paper.questions.length - 1, i + 1))}
                  className="gap-1.5"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitManual}
                  className="ml-auto gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-lg transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ============================================================
  // PHASE 3 — RESULTS & ANALYSIS
  // ============================================================
  if (phase === "results" && paper && analysis) {
    return (
      <div className="space-y-6">
        <header className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Performance Analysis</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {paper.examName} · {paper.mode} · computed client-side from your attempt.
          </p>
        </header>

        <Disclaimer />

        {/* actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleSave}
            className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-lg transition-all"
          >
            <Save className="h-4 w-4" />
            Save to My Research
          </Button>
          <Button variant="outline" onClick={handleAnother} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Generate another paper
          </Button>
        </div>

        {/* score summary */}
        <Card className="border-violet-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-violet-500" />
              Score Summary
            </CardTitle>
            <CardDescription>
              {paper.markingScheme} · {paper.totalQuestions} questions · {paper.durationMinutes}-minute target
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile
                icon={Award}
                label="Score"
                value={`${analysis.score}`}
                sub={`/ ${analysis.maxMarks}`}
                accent="violet"
              />
              <StatTile
                icon={Target}
                label="Accuracy"
                value={`${analysis.accuracy}%`}
                accent={analysis.accuracy >= 80 ? "emerald" : analysis.accuracy >= 50 ? "amber" : "rose"}
              />
              <StatTile
                icon={CheckCircle2}
                label="Correct"
                value={`${analysis.correct}`}
                accent="emerald"
              />
              <StatTile
                icon={XCircle}
                label="Incorrect"
                value={`${analysis.incorrect}`}
                accent="rose"
              />
              <StatTile
                icon={Circle}
                label="Unattempted"
                value={`${analysis.unattempted}`}
                accent="zinc"
              />
              <StatTile
                icon={Clock}
                label="Time used"
                value={analysis.timeUsed}
                sub={`avg ${analysis.avgTimePerQuestion}`}
                accent="cyan"
              />
            </div>

            {/* negative impact callout */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <CalloutTile
                icon={AlertTriangle}
                tone="rose"
                title="Negative-mark impact"
                value={`−${analysis.negativeMarkImpact}`}
                hint={`${analysis.incorrect} incorrect attempts`}
              />
              <CalloutTile
                icon={Gauge}
                tone="violet"
                title="Attempt efficiency"
                value={`${analysis.correct + analysis.incorrect}/${analysis.correct + analysis.incorrect + analysis.unattempted}`}
                hint={`attempted out of ${paper.totalQuestions}`}
              />
            </div>
          </CardContent>
        </Card>

        {/* topic-wise performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-violet-500" />
              Topic-wise Performance
            </CardTitle>
            <CardDescription>Accuracy is computed over attempted questions per topic.</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.topicWise.length === 0 ? (
              <p className="text-sm text-muted-foreground">No topic data.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead className="text-center">Correct</TableHead>
                    <TableHead className="text-center">Attempted</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="w-[40%]">Accuracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.topicWise.map((t) => (
                    <TableRow key={t.topic}>
                      <TableCell className="font-medium">{t.topic}</TableCell>
                      <TableCell className="text-center">{t.correct}</TableCell>
                      <TableCell className="text-center">{t.attempted}</TableCell>
                      <TableCell className="text-center">{t.total}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={t.accuracy}
                            className={cn("h-2", accuracyClass(t.accuracy) === "high" ? "[&_[data-slot=progress-indicator]]:bg-emerald-500" : accuracyClass(t.accuracy) === "mid" ? "[&_[data-slot=progress-indicator]]:bg-amber-500" : "[&_[data-slot=progress-indicator]]:bg-rose-500")}
                          />
                          <span className="w-10 text-right text-xs tabular-nums">{t.accuracy}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* difficulty-wise + question-type-wise */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="h-4 w-4 text-violet-500" />
                Difficulty-wise Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.difficultyWise.length === 0 ? (
                <p className="text-sm text-muted-foreground">No difficulty data.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Difficulty</TableHead>
                      <TableHead className="text-center">Correct</TableHead>
                      <TableHead className="text-center">Attempted</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Accuracy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.difficultyWise.map((d) => (
                      <TableRow key={d.difficulty}>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", DIFFICULTY_BADGE[d.difficulty] ?? "")}>
                            {d.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{d.correct}</TableCell>
                        <TableCell className="text-center">{d.attempted}</TableCell>
                        <TableCell className="text-center">{d.total}</TableCell>
                        <TableCell className="text-center tabular-nums">{d.accuracy}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="h-4 w-4 text-violet-500" />
                Question-type Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.questionTypeWise.length === 0 ? (
                <p className="text-sm text-muted-foreground">No type data.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Correct</TableHead>
                      <TableHead className="text-center">Attempted</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Accuracy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.questionTypeWise.map((t) => (
                      <TableRow key={t.type}>
                        <TableCell className="font-medium">{t.type}</TableCell>
                        <TableCell className="text-center">{t.correct}</TableCell>
                        <TableCell className="text-center">{t.attempted}</TableCell>
                        <TableCell className="text-center">{t.total}</TableCell>
                        <TableCell className="text-center tabular-nums">{t.accuracy}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* strengths + weak areas */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-emerald-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Strengths
              </CardTitle>
              <CardDescription>Topics with accuracy ≥ 80%.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.strengths.length === 0 ? (
                <p className="text-sm text-muted-foreground">No strengths flagged on this attempt. Push for higher accuracy next time.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.strengths.map((t) => (
                    <Badge key={t} variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-rose-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4" />
                Weak Areas
              </CardTitle>
              <CardDescription>Topics with accuracy below 70%.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.weakAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground">No weak areas detected — great job!</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.weakAreas.map((t) => (
                    <Badge key={t} variant="outline" className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* recommended practice */}
        <Card className="border-violet-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-violet-500" />
              Recommended Practice
            </CardTitle>
            <CardDescription>A simple, ordered plan derived from your weak areas and strengths.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.recommendedPractice.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-[10px] font-semibold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* error heuristics */}
        <div className="grid gap-5 lg:grid-cols-3">
          <ErrorList title="Conceptual Errors" items={analysis.conceptualErrors} accent="rose" icon={AlertTriangle} />
          <ErrorList title="Calculation Errors" items={analysis.calculationErrors} accent="amber" icon={Gauge} />
          <ErrorList title="Selection Errors" items={analysis.questionSelectionErrors} accent="cyan" icon={Target} />
        </div>

        {/* answer key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-violet-500" />
              Answer Key
            </CardTitle>
            <CardDescription>Each question with the correct answer and explanation. Expand to inspect.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {paper.questions.map((q, i) => {
                const ans = answers[q.id];
                const isAnswered = typeof ans === "number" && ans >= 0 && ans < q.options.length;
                const correctIdx = q.options.indexOf(q.correctAnswer);
                const wasCorrect = isAnswered && ans === correctIdx;
                return (
                  <AccordionItem key={q.id} value={q.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex w-full items-start gap-3 pr-2 text-left">
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                            wasCorrect
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : isAnswered
                                ? "border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                : "border-zinc-500/30 bg-zinc-500/10 text-zinc-500"
                          )}
                        >
                          {wasCorrect ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : isAnswered ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Circle className="h-3 w-3" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-xs font-semibold">Q{i + 1}</span>
                            <Badge variant="outline" className="text-[10px]">{q.topic}</Badge>
                            <Badge variant="outline" className={cn("text-[10px]", DIFFICULTY_BADGE[q.difficulty])}>
                              {q.difficulty}
                            </Badge>
                          </div>
                          <p className="text-sm line-clamp-2">{q.question}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pl-9">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Options</p>
                          <ul className="space-y-1.5">
                            {q.options.map((opt, idx) => {
                              const isCorrect = idx === correctIdx;
                              const isPicked = isAnswered && ans === idx;
                              return (
                                <li
                                  key={idx}
                                  className={cn(
                                    "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm",
                                    isCorrect
                                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                      : isPicked
                                        ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                        : "border-border"
                                  )}
                                >
                                  <span className="text-xs font-semibold">{String.fromCharCode(65 + idx)}.</span>
                                  <span className="flex-1">{opt}</span>
                                  {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                                  {isPicked && !isCorrect && <XCircle className="h-3.5 w-3.5 text-rose-500" />}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                        <div className="rounded-md bg-muted/40 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Explanation</p>
                          <p className="text-sm leading-relaxed">{q.explanation}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Correct: <span className="font-semibold text-foreground">{q.correctAnswer}</span></span>
                          <span>·</span>
                          <span>+{q.marks} / −{q.negativeMarks}</span>
                          <span>·</span>
                          <span>{q.section}</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        {/* sources */}
        {paper.sources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <SourceBadgeList sources={paper.sources} />
            </CardContent>
          </Card>
        )}

        {/* bottom actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleSave}
            className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-lg transition-all"
          >
            <Save className="h-4 w-4" />
            Save to My Research
          </Button>
          <Button variant="outline" onClick={handleAnother} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Generate another paper
          </Button>
        </div>
      </div>
    );
  }

  // fallback (shouldn't hit)
  return (
    <EmptyState
      icon={FileStack}
      title="No active paper"
      description="Configure and generate a paper to begin."
    />
  );
}

// ============================================================
// sub-components
// ============================================================

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SelectSimple({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Selector"
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 pr-9 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>AI-generated practice paper. Not official or prediction.</span>
    </div>
  );
}

function LegendRow({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-4 w-4 rounded border", className)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

const STAT_TILE_ACCENTS: Record<string, string> = {
  violet: "text-violet-600 dark:text-violet-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  zinc: "text-zinc-600 dark:text-zinc-300",
  cyan: "text-cyan-600 dark:text-cyan-400",
};

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent: keyof typeof STAT_TILE_ACCENTS | string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", STAT_TILE_ACCENTS[accent] ?? "text-violet-500")} />
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={cn("text-xl font-bold tabular-nums", STAT_TILE_ACCENTS[accent] ?? "text-violet-500")}>{value}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

const CALLOUT_TONES: Record<string, { ring: string; bg: string; text: string }> = {
  rose: { ring: "border-rose-500/30", bg: "bg-rose-500/5", text: "text-rose-600 dark:text-rose-400" },
  violet: { ring: "border-violet-500/30", bg: "bg-violet-500/5", text: "text-violet-600 dark:text-violet-400" },
  emerald: { ring: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { ring: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-600 dark:text-amber-400" },
};

function CalloutTile({
  icon: Icon,
  tone,
  title,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof CALLOUT_TONES;
  title: string;
  value: string;
  hint?: string;
}) {
  const t = CALLOUT_TONES[tone];
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border p-3", t.ring, t.bg)}>
      <Icon className={cn("h-5 w-5 shrink-0", t.text)} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className={cn("text-lg font-bold tabular-nums", t.text)}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

const ERROR_LIST_ACCENTS: Record<string, string> = {
  rose: "border-rose-500/20 bg-rose-500/5",
  amber: "border-amber-500/20 bg-amber-500/5",
  cyan: "border-cyan-500/20 bg-cyan-500/5",
};

function ErrorList({
  title,
  items,
  accent,
  icon: Icon,
}: {
  title: string;
  items: string[];
  accent: "rose" | "amber" | "cyan";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const cls = ERROR_LIST_ACCENTS[accent];
  return (
    <Card className={cls}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className={cn("h-4 w-4", accent === "rose" ? "text-rose-500" : accent === "amber" ? "text-amber-500" : "text-cyan-500")} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None detected on this attempt.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                <span className="leading-relaxed">{e}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
