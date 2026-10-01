"use client";

import { useMemo, useState } from "react";
import {
  Repeat2,
  TrendingUp,
  GitBranch,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Save,
  RotateCcw,
  ChevronRight,
  FileText,
  Brain,
  Target,
  Zap,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useApi } from "@/hooks/use-api";
import { useAppStore } from "@/store/app-store";
import { LoadingState, EmptyState } from "@/components/shared/states";
import { SourceBadgeList } from "@/components/shared/source-badge";
import type { EvolvedQuestion, QuestionEvolutionReport } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---- example chips ----
const EXAMPLE_QUESTIONS: string[] = [
  "A train 150m long passes a pole in 15 seconds. Find its speed in km/h.",
  "If the cost price of an article is $200 and it is sold at a loss of 10%, find the selling price.",
  "Find the value of x: 2x + 5 = 17.",
  "A circle has radius 7 cm. Calculate its area. (Take π = 22/7)",
  "The sum of three consecutive integers is 60. Find the integers.",
  "A sum of money doubles itself in 8 years at simple interest. Find the rate of interest per annum.",
];

// ---- per-level accent tokens (NO indigo/blue) ----
type LevelAccent = {
  text: string;
  bg: string;
  border: string;
  chip: string;
  ring: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  icon: typeof TrendingUp;
  shortName: string;
};

const LEVEL_ACCENTS: Record<number, LevelAccent> = {
  1: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    ring: "ring-emerald-500/20",
    gradient: "from-emerald-500 to-teal-500",
    badgeBg: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white",
    badgeText: "text-emerald-600 dark:text-emerald-400",
    icon: TrendingUp,
    shortName: "Easier",
  },
  2: {
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    chip: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    ring: "ring-sky-500/20",
    gradient: "from-sky-500 to-cyan-500",
    badgeBg: "bg-gradient-to-br from-sky-500 to-cyan-500 text-white",
    badgeText: "text-sky-600 dark:text-sky-400",
    icon: GitBranch,
    shortName: "Reframed",
  },
  3: {
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
    ring: "ring-violet-500/20",
    gradient: "from-violet-500 to-purple-500",
    badgeBg: "bg-gradient-to-br from-violet-500 to-purple-500 text-white",
    badgeText: "text-violet-600 dark:text-violet-400",
    icon: Layers,
    shortName: "Multi-Concept",
  },
  4: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    ring: "ring-amber-500/20",
    gradient: "from-amber-500 to-orange-500",
    badgeBg: "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
    badgeText: "text-amber-600 dark:text-amber-400",
    icon: Target,
    shortName: "Difficult",
  },
  5: {
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    chip: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    ring: "ring-rose-500/20",
    gradient: "from-rose-500 to-pink-500",
    badgeBg: "bg-gradient-to-br from-rose-500 to-pink-500 text-white",
    badgeText: "text-rose-600 dark:text-rose-400",
    icon: AlertTriangle,
    shortName: "Exam-Trap",
  },
};

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Hard: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

// ---- lineage flow steps ----
const LINEAGE_STEPS: { label: string; icon: typeof Brain }[] = [
  { label: "Source PYQ", icon: FileText },
  { label: "Concept Extraction", icon: Brain },
  { label: "Difficulty Analysis", icon: Target },
  { label: "Structure Analysis", icon: ListChecks },
  { label: "Question Evolution", icon: Sparkles },
];

// ============================================================
// Question Evolution Lab
// ============================================================
export function QuestionEvolution() {
  const api = useApi();
  const setContext = useAppStore((s) => s.setContext);
  const saveItem = useAppStore((s) => s.saveItem);

  const [question, setQuestion] = useState<string>("");
  const [report, setReport] = useState<QuestionEvolutionReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEvolve(q?: string) {
    const text = (q ?? question).trim();
    if (!text) {
      toast.error("Please paste a question first");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);

    const res = await api.call<{ report: QuestionEvolutionReport; error?: string }>(
      "/api/question/evolve",
      { question: text }
    );

    if (!res || !res.report || res.error) {
      setError(res?.error ?? "AI did not return an evolution report.");
      setLoading(false);
      return;
    }
    setReport(res.report);
    setContext("Evolution: " + text.slice(0, 60), "evolution");
    setLoading(false);
  }

  function handleExampleClick(q: string) {
    setQuestion(q);
    handleEvolve(q);
  }

  function handleReset() {
    setReport(null);
    setError(null);
    setQuestion("");
  }

  function handleSave() {
    if (!report) return;
    const title = (report.sourceQuestion || question).slice(0, 60);
    const summary = `${report.variants.length} variants · ${report.coreConcept}`;
    saveItem({
      type: "evolution",
      title,
      summary,
      data: report,
    });
    toast.success("Saved to My Research", { description: summary });
  }

  const verifiedCount = useMemo(
    () =>
      report
        ? report.variants.filter((v) => v.validationStatus === "verified").length
        : 0,
    [report]
  );

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <header className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
            <Repeat2 className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            AI Question Evolution Lab
          </h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-3xl">
          Turn one question into an entire practice family —{" "}
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            5 evolution levels
          </span>{" "}
          with validation and lineage.
        </p>
      </header>

      {/* ---------- Input form ---------- */}
      <Card className="border-violet-500/20">
        <CardContent className="p-5 space-y-4">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Paste a PYQ or any question. e.g. A train 150m long passes a pole in 15 seconds. Find its speed."
            className="min-h-[120px] resize-y text-sm"
            aria-label="Question to evolve"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => handleEvolve()}
              disabled={loading || !question.trim()}
              className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-lg transition-all"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "Evolving..." : "Evolve Question"}
            </Button>
            {report && (
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                New Question
              </Button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {question.length} chars
            </span>
          </div>

          {/* example chips */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Try an example:
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(q)}
                  disabled={loading}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-all hover:border-violet-500/40 hover:text-foreground hover:bg-violet-500/5 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  title={q}
                >
                  {q.length > 56 ? q.slice(0, 56) + "..." : q}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Loading ---------- */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <LoadingState label="AI is evolving a 5-level practice family..." />
          </CardContent>
        </Card>
      )}

      {/* ---------- Error ---------- */}
      {error && !loading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-destructive">
                  Evolution failed
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------- Empty state ---------- */}
      {!loading && !report && !error && (
        <EmptyState
          icon={Repeat2}
          title="No evolution yet"
          description="Paste a question above and hit Evolve — the AI will analyse it and produce 5 validated variants across easier, reframed, multi-concept, difficult, and exam-trap levels."
        />
      )}

      {/* ---------- Result ---------- */}
      {report && !loading && (
        <div className="space-y-6">
          {/* summary bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 gap-1"
            >
              <Repeat2 className="h-3 w-3" />
              {report.variants.length} variants
            </Badge>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1"
            >
              <CheckCircle2 className="h-3 w-3" />
              {verifiedCount} verified
            </Badge>
            {report.variants.length - verifiedCount > 0 && (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1"
              >
                <AlertTriangle className="h-3 w-3" />
                {report.variants.length - verifiedCount} needs review
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Brain className="h-3 w-3" />
              {report.coreConcept}
            </Badge>
            <div className="ml-auto">
              <Button
                onClick={handleSave}
                size="sm"
                className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600"
              >
                <Save className="h-4 w-4" />
                Save to My Research
              </Button>
            </div>
          </div>

          {/* ---------- Source question card ---------- */}
          <Card className="border-violet-500/20">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 gap-1"
                >
                  <FileText className="h-3 w-3" />
                  Source
                </Badge>
                <CardTitle className="text-base">Source Question</CardTitle>
              </div>
              <CardDescription className="text-sm">
                The original question that seeds the evolution family.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <blockquote className="border-l-2 border-violet-500/40 pl-4 italic text-foreground text-sm leading-relaxed">
                {report.sourceQuestion}
              </blockquote>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="gap-1">
                  <Brain className="h-3 w-3" />
                  <span className="text-muted-foreground">Concept:</span>{" "}
                  <span className={cn("font-medium text-violet-600 dark:text-violet-400")}>
                    {report.coreConcept}
                  </span>
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="text-muted-foreground">Subject:</span>{" "}
                  <span className="font-medium">{report.subject}</span>
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="text-muted-foreground">Topic:</span>{" "}
                  <span className="font-medium">{report.topic}</span>
                </Badge>
                {report.subtopic && (
                  <Badge variant="outline" className="gap-1">
                    <span className="text-muted-foreground">Subtopic:</span>{" "}
                    <span className="font-medium">{report.subtopic}</span>
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn("gap-1", DIFFICULTY_STYLE[report.difficulty] ?? DIFFICULTY_STYLE.Medium)}
                >
                  <Target className="h-3 w-3" />
                  <span className="text-muted-foreground">Source difficulty:</span>{" "}
                  <span className="font-medium">{report.difficulty}</span>
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* ---------- Lineage flow visualization ---------- */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  <GitBranch className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">Lineage Flow</CardTitle>
              </div>
              <CardDescription className="text-sm">
                How the AI transforms the source question into a practice family.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* horizontal flow — scrolls on mobile */}
              <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
                {LINEAGE_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const isLast = i === LINEAGE_STEPS.length - 1;
                  return (
                    <div
                      key={step.label}
                      className="flex items-center gap-1 shrink-0"
                    >
                      <div
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 min-w-[120px] transition-all",
                          isLast
                            ? "bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border-violet-500/30"
                            : "bg-background border-border"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-md",
                            isLast
                              ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium text-center leading-tight",
                            isLast ? "text-violet-600 dark:text-violet-400" : "text-foreground"
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                      {!isLast && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ---------- 5 Evolution Levels ---------- */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                <Layers className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold tracking-tight">
                5 Evolution Levels
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {report.variants.map((v) => (
                <EvolutionLevelCard key={v.level} variant={v} />
              ))}
            </div>
          </div>

          {/* ---------- Lineage explanation ---------- */}
          <Card className="border-violet-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  <GitBranch className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">Lineage Explanation</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">
                {report.lineage}
              </p>
            </CardContent>
          </Card>

          {/* ---------- Sources ---------- */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">Sources & Provenance</CardTitle>
              </div>
              <CardDescription className="text-sm">
                All variants are AI-generated. None are presented as original PYQs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SourceBadgeList sources={report.sources} />
            </CardContent>
          </Card>

          {/* ---------- Save button (bottom) ---------- */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600"
            >
              <Save className="h-4 w-4" />
              Save to My Research
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Evolution Level Card
// ============================================================
function EvolutionLevelCard({ variant }: { variant: EvolvedQuestion }) {
  const accent = LEVEL_ACCENTS[variant.level] ?? LEVEL_ACCENTS[1];
  const LevelIcon = accent.icon;
  const isVerified = variant.validationStatus === "verified";

  return (
    <Card
      className={cn(
        "border shadow-sm transition-all hover:shadow-md overflow-hidden",
        accent.border,
        "hover:-translate-y-0.5"
      )}
    >
      {/* level header band */}
      <div
        className={cn(
          "flex items-center gap-3 px-5 py-3 border-b",
          accent.bg,
          accent.border
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
            accent.badgeBg
          )}
        >
          <LevelIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("gap-1 font-semibold", accent.chip)}
            >
              Level {variant.level}
            </Badge>
            <span className={cn("text-sm font-semibold truncate", accent.text)}>
              {variant.levelName}
            </span>
          </div>
        </div>
        {/* validation status badge */}
        <Badge
          variant="outline"
          className={cn(
            "gap-1 shrink-0",
            isVerified
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
          )}
        >
          {isVerified ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          {isVerified ? "verified" : "needs-review"}
        </Badge>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* AI-Generated variant badge */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 gap-1"
          >
            <Sparkles className="h-3 w-3" />
            AI-Generated variant
          </Badge>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Not an original PYQ
          </span>
        </div>

        {/* question */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            Question
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {variant.question}
          </p>
        </div>

        {/* options */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            Options
          </p>
          <ul className="space-y-1.5">
            {variant.options.map((opt, i) => {
              const isCorrect = opt === variant.correctAnswer;
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                    isCorrect
                      ? cn(
                          "bg-emerald-500/10 border-emerald-500/40 text-foreground"
                        )
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-bold mt-0.5",
                      isCorrect
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span className="flex-1">{opt}</span>
                  {isCorrect && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* explanation (collapsible via Accordion) */}
        <Accordion type="single" collapsible defaultValue="explanation">
          <AccordionItem value="explanation" className="border-b-0">
            <AccordionTrigger className={cn("text-sm font-medium hover:no-underline", accent.text)}>
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Explanation
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-foreground leading-relaxed">
                {variant.explanation}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* shortcut */}
        {variant.shortcut && (
          <div
            className={cn(
              "rounded-md border px-3 py-2.5 space-y-1",
              "bg-emerald-500/5 border-emerald-500/30"
            )}
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5" />
              Shortcut
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {variant.shortcut}
            </p>
          </div>
        )}

        {/* common trap */}
        {variant.commonTrap && (
          <div
            className={cn(
              "rounded-md border px-3 py-2.5 space-y-1",
              accent.bg,
              accent.border
            )}
          >
            <p
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider",
                accent.text
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Common Trap
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {variant.commonTrap}
            </p>
          </div>
        )}

        {/* validation notes */}
        {variant.validationNotes && variant.validationNotes.length > 0 && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              Validation Notes
            </p>
            <ul className="space-y-0.5">
              {variant.validationNotes.map((n, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5"
                >
                  <span className="text-muted-foreground/60 mt-0.5">•</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
