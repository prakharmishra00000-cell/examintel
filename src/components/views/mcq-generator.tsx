"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ListChecks,
  FileText,
  Settings2,
  Play,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Clock,
  Send,
  Save,
  RotateCcw,
  Sparkles,
  BookOpen,
  Target,
  Hash,
  Layers,
  Tag,
  Upload,
  Check,
  X,
  CircleDashed,
  Timer,
  Award,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SourceBadgeList } from "@/components/shared/source-badge";
import { LoadingState, EmptyState } from "@/components/shared/states";
import { useAppStore } from "@/store/app-store";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { MCQSet, GeneratedMCQ } from "@/types";

// ---------------- configuration ----------------
type SourceKey = "Uploaded PDF" | "Syllabus" | "Topic" | "Custom";
type DifficultyKey = "Easy" | "Medium" | "Hard" | "Mixed Difficulty";
type QuestionTypeKey =
  | "MCQ"
  | "Multiple correct"
  | "Assertion & Reason"
  | "Match the following"
  | "Statement-based"
  | "True/False";

const SOURCES: { key: SourceKey; label: string; hint: string; icon: typeof FileText }[] = [
  { key: "Uploaded PDF", label: "Uploaded PDF", hint: "Paste PDF text — questions stay grounded", icon: FileText },
  { key: "Syllabus", label: "Syllabus", hint: "Paste syllabus text", icon: BookOpen },
  { key: "Topic", label: "Topic", hint: "Type a topic — AI generates practice", icon: Tag },
  { key: "Custom", label: "Custom", hint: "Paste any reference text", icon: Settings2 },
];

const QUICK_CHIPS = [
  "Eligibility",
  "Exam Pattern",
  "Syllabus",
  "Quantitative Aptitude",
  "Reasoning",
  "English",
  "General Awareness",
  "Recruitment Rules",
];

const DIFFICULTIES: { key: DifficultyKey; label: string; hint: string }[] = [
  { key: "Easy", label: "Easy", hint: "Concept recall" },
  { key: "Medium", label: "Medium", hint: "Application" },
  { key: "Hard", label: "Hard", hint: "Multi-step / analytical" },
  { key: "Mixed Difficulty", label: "Mixed", hint: "Balanced spread" },
];

const COUNT_CHIPS = [5, 10, 20, 30, 50];

const QUESTION_TYPES: { key: QuestionTypeKey; label: string; hint: string }[] = [
  { key: "MCQ", label: "MCQ", hint: "Single correct" },
  { key: "Multiple correct", label: "Multiple correct", hint: "Two or more correct" },
  { key: "Assertion & Reason", label: "Assertion & Reason", hint: "A/R statement pairs" },
  { key: "Match the following", label: "Match the following", hint: "List matching" },
  { key: "Statement-based", label: "Statement-based", hint: "Evaluate statements" },
  { key: "True/False", label: "True / False", hint: "Binary choice" },
];

const STEPS = [
  { id: 1, label: "Source & Topic", icon: FileText },
  { id: 2, label: "Difficulty", icon: Target },
  { id: 3, label: "Number", icon: Hash },
  { id: 4, label: "Question Type", icon: Layers },
  { id: 5, label: "Review & Generate", icon: Sparkles },
];

const DIFFICULTY_BADGE: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Hard: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  Mixed: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
};

// ---------------- helpers ----------------
function deriveMode(content: string): "Strict PDF Mode" | "Practice Mode" {
  return content.trim().length > 0 ? "Strict PDF Mode" : "Practice Mode";
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ---------------- Stepper ----------------
function Stepper({ current, onBack }: { current: number; onBack: (s: number) => void }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-1 overflow-x-auto">
        {STEPS.map((step, i) => {
          const done = current > step.id;
          const active = current === step.id;
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                onClick={() => step.id < current && onBack(step.id)}
                disabled={step.id >= current}
                className={cn(
                  "flex items-center gap-2 sm:gap-3 rounded-full transition-all",
                  step.id < current && "cursor-pointer hover:bg-accent/50",
                  step.id >= current && "cursor-default",
                )}
                aria-label={`Step ${step.id}: ${step.label}`}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    active &&
                      "border-violet-500 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30",
                    done && "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                    !active && !done && "border-border bg-background text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="hidden sm:flex flex-col text-left">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                    Step {step.id}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium leading-tight",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 sm:mx-2 rounded-full transition-colors",
                    current > step.id ? "bg-emerald-500/40" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Selectable Option Card ----------------
function OptionCard({
  active,
  onClick,
  icon: Icon,
  title,
  hint,
  accent = "violet",
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof FileText;
  title: string;
  hint?: string;
  accent?: "violet" | "emerald" | "amber";
}) {
  const accentMap: Record<string, { ring: string; bg: string; text: string; iconBg: string }> = {
    violet: {
      ring: "ring-violet-500/40 border-violet-500/50",
      bg: "bg-violet-500/5",
      text: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white",
    },
    emerald: {
      ring: "ring-emerald-500/40 border-emerald-500/50",
      bg: "bg-emerald-500/5",
      text: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white",
    },
    amber: {
      ring: "ring-amber-500/40 border-amber-500/50",
      bg: "bg-amber-500/5",
      text: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
    },
  };
  const a = accentMap[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-md",
        active
          ? cn(a.ring, a.bg, "ring-2")
          : "border-border bg-card hover:border-violet-500/30 hover:bg-violet-500/5",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all",
          active ? a.iconBg : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex flex-col flex-1 min-w-0">
        <span className={cn("font-medium", active ? a.text : "text-foreground")}>{title}</span>
        {hint && <span className="text-xs text-muted-foreground mt-0.5">{hint}</span>}
      </span>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all mt-1",
          active ? cn("border-transparent", a.iconBg) : "border-border",
        )}
      >
        {active && <Check className="h-3 w-3" />}
      </span>
    </button>
  );
}

// ---------------- Answer-state visual tokens ----------------
type AnswerState = "correct" | "wrong" | "unattempted";

const ANSWER_BADGE: Record<AnswerState, { className: string; label: string; icon: typeof Check }> = {
  correct: {
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    label: "Correct",
    icon: Check,
  },
  wrong: {
    className: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    label: "Incorrect",
    icon: X,
  },
  unattempted: {
    className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30",
    label: "Skipped",
    icon: CircleDashed,
  },
};

// ---------------- Main component ----------------
export function McqGenerator() {
  const api = useApi();
  const setContext = useAppStore((s) => s.setContext);
  const saveItem = useAppStore((s) => s.saveItem);

  // step state
  const [step, setStep] = useState<number>(1);

  // form state
  const [source, setSource] = useState<SourceKey>("Uploaded PDF");
  const [content, setContent] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [difficulty, setDifficulty] = useState<DifficultyKey>("Mixed Difficulty");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [customCount, setCustomCount] = useState<string>("");
  const [useCustomCount, setUseCustomCount] = useState<boolean>(false);
  const [questionType, setQuestionType] = useState<QuestionTypeKey>("MCQ");
  const [examName, setExamName] = useState<string>("");

  // generation state
  const [loading, setLoading] = useState<boolean>(false);
  const [mcqSet, setMcqSet] = useState<MCQSet | null>(null);

  // test-mode state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeQ, setActiveQ] = useState<number>(0);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // derived mode
  const mode = useMemo(() => deriveMode(content), [content]);

  // effective question count
  const effectiveCount = useCustomCount
    ? Math.min(50, Math.max(1, parseInt(customCount, 10) || 0))
    : questionCount;

  // effective topic label (used for context/save)
  const effectiveTopic = useMemo(() => {
    if (topic && topic.trim()) return topic.trim();
    if (customTopic && customTopic.trim()) return customTopic.trim();
    if (source === "Uploaded PDF") return "Uploaded PDF";
    if (source === "Syllabus") return "Syllabus";
    return "Custom";
  }, [topic, customTopic, source]);

  // ----------------- timer -----------------
  useEffect(() => {
    if (mcqSet && !submitted) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
    if (submitted && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [mcqSet, submitted]);

  const resetTestState = useCallback(() => {
    setAnswers({});
    setActiveQ(0);
    setSubmitted(false);
    setElapsed(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ----------------- handlers -----------------
  function handleNext() {
    setStep((s) => Math.min(5, s + 1));
  }

  function handleBack(to?: number) {
    setStep((s) => (typeof to === "number" ? to : Math.max(1, s - 1)));
  }

  function canProceedFromStep(s: number): boolean {
    if (s === 1) {
      if (source === "Uploaded PDF" || source === "Syllabus" || source === "Custom") {
        return content.trim().length > 0;
      }
      if (source === "Topic") {
        return topic.trim().length > 0 || customTopic.trim().length > 0;
      }
      return false;
    }
    return true;
  }

  function selectAnswer(qid: string, option: string) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qid]: option }));
  }

  async function handleGenerate() {
    setLoading(true);
    resetTestState();
    const body = {
      source,
      content,
      topic: effectiveTopic,
      difficulty: difficulty === "Mixed Difficulty" ? "Mixed" : difficulty,
      questionCount: effectiveCount,
      questionType,
      mode,
      examName,
    };
    const res = await api.call<{ set: MCQSet }>("/api/mcq/generate", body);
    setLoading(false);
    if (!res?.set) return;
    setMcqSet(res.set);
    setContext(`MCQ set: ${effectiveTopic}`, "mcq");
  }

  function handleSubmit() {
    setSubmitted(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function handleSave() {
    if (!mcqSet) return;
    const correct = computeScore().correct;
    const accuracy = mcqSet.mcqs.length > 0 ? Math.round((correct / mcqSet.mcqs.length) * 100) : 0;
    saveItem({
      type: "mcq",
      title: `${effectiveTopic} · ${mcqSet.questionCount}Q`,
      summary: `${accuracy}% accuracy`,
      data: { set: mcqSet, answers, elapsed, submitted },
    });
    toast.success("Saved to My Research", {
      description: `${effectiveTopic} · ${mcqSet.questionCount}Q · ${accuracy}% accuracy`,
    });
  }

  function handleGenerateAnother() {
    setMcqSet(null);
    resetTestState();
    setStep(1);
    setSource("Uploaded PDF");
    setContent("");
    setTopic("");
    setCustomTopic("");
    setQuestionCount(5);
    setUseCustomCount(false);
    setCustomCount("");
    setQuestionType("MCQ");
    setDifficulty("Mixed Difficulty");
    setExamName("");
  }

  function handleUploadTxt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setContent(text);
      toast.success(`Loaded ${file.name}`, { description: `${text.length.toLocaleString()} characters` });
    };
    reader.readAsText(file);
  }

  // ----------------- scoring -----------------
  function computeScore() {
    if (!mcqSet) return { correct: 0, incorrect: 0, unattempted: 0, total: 0, accuracy: 0 };
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    for (const m of mcqSet.mcqs) {
      const user = answers[m.id];
      if (!user) {
        unattempted += 1;
        continue;
      }
      // For "Multiple correct" correctAnswer is comma-separated; compare as sets
      const correctSet = new Set(m.correctAnswer.split(",").map((s) => s.trim()).filter(Boolean));
      const userSet = new Set(user.split(",").map((s) => s.trim()).filter(Boolean));
      const same =
        correctSet.size === userSet.size &&
        [...correctSet].every((s) => userSet.has(s));
      if (same) correct += 1;
      else incorrect += 1;
    }
    const total = mcqSet.mcqs.length;
    const attempted = total - unattempted;
    const accuracy = attempted > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, incorrect, unattempted, total, attempted, accuracy };
  }

  function answerStateFor(m: GeneratedMCQ): AnswerState {
    const user = answers[m.id];
    if (!user) return "unattempted";
    const correctSet = new Set(m.correctAnswer.split(",").map((s) => s.trim()).filter(Boolean));
    const userSet = new Set(user.split(",").map((s) => s.trim()).filter(Boolean));
    const same =
      correctSet.size === userSet.size &&
      [...correctSet].every((s) => userSet.has(s));
    return same ? "correct" : "wrong";
  }

  // ============================================================
  // CONFIGURATION WORKFLOW
  // ============================================================
  function renderStep() {
    if (step === 1) {
      return (
        <Card className="border-violet-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              Select Source & Topic
            </CardTitle>
            <CardDescription>
              Choose where the questions come from. Grounded content keeps answers verifiable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
              {SOURCES.map((s) => (
                <OptionCard
                  key={s.key}
                  active={source === s.key}
                  onClick={() => setSource(s.key)}
                  icon={s.icon}
                  title={s.label}
                  hint={s.hint}
                />
              ))}
            </div>

            {/* content / topic inputs based on source */}
            {(source === "Uploaded PDF" || source === "Syllabus" || source === "Custom") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">
                    {source === "Uploaded PDF" ? "PDF content" : source === "Syllabus" ? "Syllabus text" : "Reference text"}
                  </label>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-violet-500/30 bg-violet-500/5 px-2.5 py-1 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-colors">
                      <Upload className="h-3.5 w-3.5" /> Upload .txt
                    </span>
                    <input
                      type="file"
                      accept=".txt,text/plain"
                      className="sr-only"
                      onChange={handleUploadTxt}
                    />
                  </label>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    source === "Uploaded PDF"
                      ? "Paste the PDF text here. Each MCQ will be grounded in this content..."
                      : source === "Syllabus"
                        ? "Paste the syllabus text here..."
                        : "Paste any reference material..."
                  }
                  className="min-h-[160px] resize-y"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{content.trim().length.toLocaleString()} characters</span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full border",
                      content.trim().length > 0
                        ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                        : "border-border",
                    )}
                  >
                    Mode: {mode}
                  </span>
                </div>
              </div>
            )}

            {source === "Topic" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Topic</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Time, Speed & Distance"
                />
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Or pick a quick topic:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_CHIPS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTopic(c)}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-full border transition-all",
                          topic === c
                            ? "border-violet-500 bg-violet-500/15 text-violet-600 dark:text-violet-400"
                            : "border-border hover:border-violet-500/40 hover:bg-violet-500/5",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(source !== "Topic") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Topic label <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {QUICK_CHIPS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTopic(c)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full border transition-all",
                        topic === c
                          ? "border-violet-500 bg-violet-500/15 text-violet-600 dark:text-violet-400"
                          : "border-border hover:border-violet-500/40 hover:bg-violet-500/5",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <Input
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Custom topic label (e.g. Profit & Loss)"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Target exam <span className="text-muted-foreground text-xs">(optional, for tone)</span>
              </label>
              <Input
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. SSC CGL, GATE, UPSC Prelims"
              />
            </div>
          </CardContent>
        </Card>
      );
    }

    if (step === 2) {
      return (
        <Card className="border-violet-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              Choose Difficulty
            </CardTitle>
            <CardDescription>Pick the cognitive level of the questions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {DIFFICULTIES.map((d) => (
                <OptionCard
                  key={d.key}
                  active={difficulty === d.key}
                  onClick={() => setDifficulty(d.key)}
                  icon={Target}
                  title={d.label}
                  hint={d.hint}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (step === 3) {
      return (
        <Card className="border-violet-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              Number of Questions
            </CardTitle>
            <CardDescription>How many MCQs should the AI produce?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {COUNT_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setQuestionCount(c);
                    setUseCustomCount(false);
                  }}
                  className={cn(
                    "h-16 rounded-xl border text-lg font-bold transition-all",
                    !useCustomCount && questionCount === c
                      ? "border-violet-500 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500/30"
                      : "border-border hover:border-violet-500/30 hover:bg-violet-500/5",
                  )}
                >
                  {c}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustomCount(true)}
                className={cn(
                  "h-16 rounded-xl border text-sm font-medium transition-all",
                  useCustomCount
                    ? "border-violet-500 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500/30"
                    : "border-border hover:border-violet-500/30 hover:bg-violet-500/5",
                )}
              >
                Custom
              </button>
            </div>
            {useCustomCount && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom count (1–50)</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={customCount}
                  onChange={(e) => setCustomCount(e.target.value)}
                  placeholder="e.g. 15"
                />
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (step === 4) {
      return (
        <Card className="border-violet-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              Question Type
            </CardTitle>
            <CardDescription>Choose the format of the questions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {QUESTION_TYPES.map((q) => (
                <OptionCard
                  key={q.key}
                  active={questionType === q.key}
                  onClick={() => setQuestionType(q.key)}
                  icon={Layers}
                  title={q.label}
                  hint={q.hint}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    // step 5 — review
    return (
      <Card className="border-violet-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            Review & Generate
          </CardTitle>
          <CardDescription>Confirm the configuration, then generate the MCQ set.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ListChecks className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <h3 className="font-semibold text-sm">MCQ Configuration</h3>
            </div>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <ConfigRow label="Source" value={source} />
              <ConfigRow label="Topic" value={effectiveTopic} />
              <ConfigRow
                label="Difficulty"
                value={difficulty === "Mixed Difficulty" ? "Mixed" : difficulty}
              />
              <ConfigRow label="Questions" value={String(effectiveCount)} />
              <ConfigRow label="Type" value={questionType} />
              <ConfigRow label="Mode" value={mode} highlight />
            </dl>
            {examName && <ConfigRow label="Target exam" value={examName} className="mt-3" />}
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p>
              {mode === "Strict PDF Mode"
                ? "Strict PDF Mode: every question will be grounded in your uploaded content, with source passages quoted."
                : "Practice Mode: AI will generate exam-grade questions on the chosen topic without grounding content."}
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/20"
          >
            {loading ? (
              <>
                <Sparkles className="h-4 w-4 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate Questions
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ----------------- render question card (test mode + results) -----------------
  function renderQuestionCard(m: GeneratedMCQ, idx: number) {
    const userAns = answers[m.id];
    const state = submitted ? answerStateFor(m) : null;
    const correctSet = new Set(m.correctAnswer.split(",").map((s) => s.trim()).filter(Boolean));
    const isActive = idx === activeQ;
    const StateIcon = state ? ANSWER_BADGE[state].icon : null;

    return (
      <Card
        key={m.id}
        className={cn(
          "transition-all",
          isActive && !submitted && "ring-2 ring-violet-500/30 border-violet-500/40",
          state === "correct" && "border-emerald-500/30",
          state === "wrong" && "border-rose-500/30",
          state === "unattempted" && "border-zinc-500/30",
        )}
        id={`q-${m.id}`}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm font-bold">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base leading-relaxed font-medium">
                  {m.question}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Badge variant="outline" className={DIFFICULTY_BADGE[m.difficulty]}>
                    {m.difficulty}
                  </Badge>
                  {m.topic && (
                    <Badge variant="outline" className="text-muted-foreground border-border">
                      <Tag className="h-3 w-3" /> {m.topic}
                    </Badge>
                  )}
                  {m.validationStatus === "needs-review" && (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    >
                      <AlertTriangle className="h-3 w-3" /> Needs review
                    </Badge>
                  )}
                  {state && StateIcon && (
                    <Badge variant="outline" className={ANSWER_BADGE[state].className}>
                      <StateIcon className="h-3 w-3" /> {ANSWER_BADGE[state].label}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            {m.options.map((opt, i) => {
              const isSelected = userAns === opt;
              const isCorrect = correctSet.has(opt);
              const letter = String.fromCharCode(65 + i);
              // visual state per option
              let optClass = "border-border hover:border-violet-500/30 hover:bg-violet-500/5";
              if (submitted) {
                if (isCorrect) {
                  optClass = "border-emerald-500/50 bg-emerald-500/10";
                } else if (isSelected) {
                  optClass = "border-rose-500/50 bg-rose-500/10";
                } else {
                  optClass = "border-border opacity-60";
                }
              } else if (isSelected) {
                optClass = "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/30";
              }
              return (
                <button
                  key={i}
                  type="button"
                  disabled={submitted}
                  onClick={() => selectAnswer(m.id, opt)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                    optClass,
                    submitted && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold border",
                      isSelected && !submitted && "border-violet-500 bg-violet-500 text-white",
                      submitted && isCorrect && "border-emerald-500 bg-emerald-500 text-white",
                      submitted && isSelected && !isCorrect && "border-rose-500 bg-rose-500 text-white",
                      (!isSelected || submitted) && !isCorrect && !(submitted && isSelected) && "border-border text-muted-foreground",
                    )}
                  >
                    {letter}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {submitted && isCorrect && (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {submitted && isSelected && !isCorrect && (
                    <X className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* post-submit explanation + source */}
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 pt-2"
            >
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
                  Explanation
                </div>
                <p className="text-foreground/90 leading-relaxed">{m.explanation}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Your answer:</span>
                <Badge
                  variant="outline"
                  className={
                    state === "correct"
                      ? ANSWER_BADGE.correct.className
                      : state === "wrong"
                        ? ANSWER_BADGE.wrong.className
                        : ANSWER_BADGE.unattempted.className
                  }
                >
                  {userAns ?? "—"}
                </Badge>
                <span className="text-muted-foreground ml-2">Correct:</span>
                <Badge variant="outline" className={ANSWER_BADGE.correct.className}>
                  {m.correctAnswer}
                </Badge>
              </div>
              {m.sourcePassage && (
                <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-medium mb-1">
                    <FileText className="h-3.5 w-3.5" /> Source passage
                    {typeof m.sourcePage === "number" && (
                      <Badge variant="outline" className="ml-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">
                        Page {m.sourcePage}
                      </Badge>
                    )}
                  </div>
                  <p className="text-foreground/80 italic leading-relaxed">“{m.sourcePassage}”</p>
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ----------------- render MCQ set (after generation) -----------------
  function renderResults() {
    if (!mcqSet) return null;
    const score = computeScore();

    return (
      <div className="space-y-5">
        {/* summary card */}
        <Card className="border-violet-500/20">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  {mcqSet.topic}
                </CardTitle>
                <CardDescription className="mt-1">
                  {mcqSet.questionCount} questions · {mcqSet.questionType}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30">
                  <Sparkles className="h-3 w-3" /> {mcqSet.mode}
                </Badge>
                <Badge variant="outline" className={DIFFICULTY_BADGE[mcqSet.difficulty] ?? DIFFICULTY_BADGE.Mixed}>
                  {mcqSet.difficulty}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid sm:grid-cols-3 gap-4 text-sm">
              <ConfigRow label="Source" value={mcqSet.source} compact />
              <ConfigRow label="Question type" value={mcqSet.questionType} compact />
              <ConfigRow label="Mode" value={mcqSet.mode} compact />
            </dl>
          </CardContent>
        </Card>

        {/* score summary (after submit) */}
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
              <CardContent className="py-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Test complete</div>
                    <div className="text-xs text-muted-foreground">
                      Finished in {formatTimer(elapsed)} · {score.attempted} of {score.total} attempted
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ScoreStat label="Correct" value={score.correct} className="text-emerald-600 dark:text-emerald-400" icon={Check} />
                  <ScoreStat label="Incorrect" value={score.incorrect} className="text-rose-600 dark:text-rose-400" icon={X} />
                  <ScoreStat label="Skipped" value={score.unattempted} className="text-zinc-600 dark:text-zinc-300" icon={CircleDashed} />
                  <ScoreStat label="Accuracy" value={`${score.accuracy}%`} className="text-violet-600 dark:text-violet-400" icon={Target} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* test mode: palette + timer + questions */}
        {!submitted && (
          <div className="grid lg:grid-cols-[1fr_220px] gap-5">
            <div className="space-y-4 order-2 lg:order-1">
              {mcqSet.mcqs.map((m, i) => renderQuestionCard(m, i))}
            </div>
            <div className="order-1 lg:order-2 space-y-4 lg:sticky lg:top-4 self-start">
              <Card className="border-violet-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <Timer className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      Timer
                    </span>
                    <span className="font-mono text-base tabular-nums">{formatTimer(elapsed)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Attempted: {Object.keys(answers).length} / {mcqSet.mcqs.length}
                  </div>
                  {/* palette */}
                  <div className="grid grid-cols-5 lg:grid-cols-4 gap-1.5">
                    {mcqSet.mcqs.map((m, i) => {
                      const answered = !!answers[m.id];
                      const isActive = i === activeQ;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setActiveQ(i);
                            if (typeof document !== "undefined") {
                              document.getElementById(`q-${m.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }}
                          className={cn(
                            "h-8 w-8 rounded-md text-xs font-semibold border transition-all",
                            isActive
                              ? "border-violet-500 bg-violet-500 text-white"
                              : answered
                                ? "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                : "border-border text-muted-foreground hover:border-violet-500/30",
                          )}
                          aria-label={`Question ${i + 1}${answered ? " (answered)" : ""}`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-md shadow-violet-500/20"
                  >
                    <Send className="h-4 w-4" /> Submit Test
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* results: render all questions with explanations */}
        {submitted && (
          <div className="space-y-4">
            {mcqSet.mcqs.map((m, i) => renderQuestionCard(m, i))}
          </div>
        )}

        {/* sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" /> Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SourceBadgeList sources={mcqSet.sources} />
          </CardContent>
        </Card>

        {/* action bar */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white"
          >
            <Save className="h-4 w-4" /> Save to My Research
          </Button>
          <Button variant="outline" onClick={handleGenerateAnother}>
            <RotateCcw className="h-4 w-4" /> Generate another set
          </Button>
          {submitted && (
            <Button variant="outline" onClick={resetTestState}>
              <RefreshCw className="h-4 w-4" /> Retake test
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/20">
          <ListChecks className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">PDF-Grounded MCQ Generator</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure a 5-step guided workflow, then take an instant test with auto-graded results.
          </p>
        </div>
      </div>

      {mcqSet ? (
        renderResults()
      ) : (
        <>
          <Stepper current={step} onBack={(s) => setStep(s)} />

          {loading ? (
            <Card className="border-violet-500/20">
              <CardContent>
                <LoadingState label="Generating grounded MCQs — validating answers, tagging sources..." />
              </CardContent>
            </Card>
          ) : (
            <>
              {renderStep()}

              {/* step nav */}
              {step < 5 && (
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleBack()}
                    disabled={step === 1}
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    Step {step} of 5
                  </div>
                  <Button
                    onClick={handleNext}
                    disabled={!canProceedFromStep(step)}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {step === 5 && (
                <div className="flex items-center justify-start gap-2">
                  <Button variant="outline" onClick={() => handleBack()}>
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                </div>
              )}

              {step === 1 && !canProceedFromStep(1) && source !== "Topic" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Paste some content above to enable Strict PDF Mode (or switch to Topic source).
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- small presentational helpers ----------------
function ConfigRow({
  label,
  value,
  highlight,
  compact,
  className,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-medium text-right",
          compact ? "text-sm" : "text-sm",
          highlight && "text-violet-600 dark:text-violet-400",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function ScoreStat({
  label,
  value,
  className,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  className?: string;
  icon: typeof Check;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn("h-3 w-3", className)} />
        {label}
      </div>
      <div className={cn("text-2xl font-bold tabular-nums mt-1", className)}>{value}</div>
    </div>
  );
}
