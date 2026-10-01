"use client";

import { useState } from "react";
import {
  HelpCircle,
  Lightbulb,
  Brain,
  ListOrdered,
  Zap,
  GraduationCap,
  ChevronRight,
  Sparkles,
  Save,
  RotateCcw,
  Tag,
  GitBranch,
  BookOpen,
  Layers,
  Calculator,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { useAppStore } from "@/store/app-store";
import { LoadingState, EmptyState } from "@/components/shared/states";
import { SourceBadgeList } from "@/components/shared/source-badge";
import { motion, AnimatePresence } from "framer-motion";
import type { QuestionExplanation } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---- example chips ----
const EXAMPLE_QUESTIONS: string[] = [
  "A train 150 m long passes a pole in 15 seconds. Find its speed in km/h.",
  "If the cost price of an article is $200 and it is sold at a loss of 10%, find the selling price.",
  "Find the value of x: 2x + 5 = 17.",
  "A circle has radius 7 cm. Calculate its area. (Take π = 22/7)",
  "The sum of three consecutive integers is 60. Find the integers.",
  "A sum of money doubles itself in 8 years at simple interest. Find the rate of interest per annum.",
];

// ---- accent color tokens per level ----
type Accent = {
  text: string;
  bg: string;
  border: string;
  chip: string;
  ring: string;
  gradient: string;
};

const ACCENTS: Record<number, Accent> = {
  1: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    ring: "ring-amber-500/20",
    gradient: "from-amber-500 to-orange-500",
  },
  2: {
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
    ring: "ring-violet-500/20",
    gradient: "from-violet-500 to-purple-500",
  },
  3: {
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    chip: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    ring: "ring-sky-500/20",
    gradient: "from-sky-500 to-cyan-500",
  },
  4: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    ring: "ring-emerald-500/20",
    gradient: "from-emerald-500 to-teal-500",
  },
  5: {
    text: "text-fuchsia-600 dark:text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/30",
    chip: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
    ring: "ring-fuchsia-500/20",
    gradient: "from-fuchsia-500 to-pink-500",
  },
};

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Hard: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

export function QuestionExplainer() {
  const api = useApi();
  const setContext = useAppStore((s) => s.setContext);
  const saveItem = useAppStore((s) => s.saveItem);

  const [question, setQuestion] = useState<string>("");
  const [explanation, setExplanation] = useState<QuestionExplanation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // progressive reveal state — Level 1 always shown, others gated
  const [showL2, setShowL2] = useState(false);
  const [showL3, setShowL3] = useState(false);
  const [showL4, setShowL4] = useState(false);
  const [showL5, setShowL5] = useState(false);

  async function handleExplain(q?: string) {
    const text = (q ?? question).trim();
    if (!text) {
      toast.error("Please paste a question first");
      return;
    }
    setLoading(true);
    setError(null);
    // reset reveal state for new explanation
    setShowL2(false);
    setShowL3(false);
    setShowL4(false);
    setShowL5(false);
    setExplanation(null);

    const res = await api.call<{ explanation: QuestionExplanation; error?: string }>(
      "/api/question/explain",
      { question: text }
    );

    if (!res || !res.explanation || res.error) {
      setError(res?.error ?? "AI did not return an explanation.");
      setLoading(false);
      return;
    }
    setExplanation(res.explanation);
    setContext("Question: " + text.slice(0, 60), "explanation");
    setLoading(false);
  }

  function handleExampleClick(q: string) {
    setQuestion(q);
    handleExplain(q);
  }

  function handleReset() {
    setExplanation(null);
    setError(null);
    setQuestion("");
    setShowL2(false);
    setShowL3(false);
    setShowL4(false);
    setShowL5(false);
  }

  function handleSave() {
    if (!explanation) return;
    const title = (explanation.originalQuestion || question).slice(0, 60);
    const summary = `${explanation.topic ?? "Unknown topic"} · ${explanation.difficulty ?? "—"}`;
    saveItem({
      type: "explanation",
      title,
      summary,
      data: explanation,
    });
    toast.success("Saved to My Research", { description: summary });
  }

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <header className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
            <HelpCircle className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AI Question Explainer</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-3xl">
          Understand any question progressively — <span className="text-amber-600 dark:text-amber-400 font-medium">Quick Hint</span> →{" "}
          <span className="text-violet-600 dark:text-violet-400 font-medium">Concept</span> →{" "}
          <span className="text-sky-600 dark:text-sky-400 font-medium">Detailed Solution</span> →{" "}
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Exam Shortcut</span> →{" "}
          <span className="text-fuchsia-600 dark:text-fuchsia-400 font-medium">Learning Insight</span>.
        </p>
      </header>

      {/* ---------- Input form ---------- */}
      <Card className="border-violet-500/20">
        <CardContent className="p-5 space-y-4">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Paste your question here. e.g. A train 150m long passes a pole in 15 seconds. Find its speed."
            className="min-h-[120px] resize-y text-sm"
            aria-label="Question to explain"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => handleExplain()}
              disabled={loading || !question.trim()}
              className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-lg transition-all"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "Explaining..." : "Explain Question"}
            </Button>
            {explanation && (
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
            <p className="text-xs font-medium text-muted-foreground">Try an example:</p>
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
            <LoadingState label="AI is preparing a 5-level progressive explanation..." />
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
                <p className="font-medium text-destructive">Explanation failed</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => handleExplain()}>
                  Try again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------- Empty state ---------- */}
      {!explanation && !loading && !error && (
        <EmptyState
          icon={HelpCircle}
          title="No explanation yet"
          description="Paste any exam question above (or pick an example) and the AI will explain it across five progressive levels — from a quick hint to a learning insight."
        />
      )}

      {/* ---------- Result ---------- */}
      {explanation && !loading && (
        <div className="space-y-5">
          {/* Metadata */}
          <MetadataBar explanation={explanation} />

          {/* Original question echo */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Original Question
              </p>
              <p className="text-sm leading-relaxed">{explanation.originalQuestion}</p>
            </CardContent>
          </Card>

          {/* Level 1 — Quick Hint (always visible) */}
          <LevelCard
            level={1}
            title="Quick Hint"
            icon={Lightbulb}
            tagline="A small nudge — try it before revealing more."
          >
            <p className="text-sm leading-relaxed">{explanation.levels.level1_quickHint}</p>
          </LevelCard>

          {/* Level progress indicator — shows which levels are unlocked */}
          <LevelProgressIndicator
            unlocked={[true, showL2, showL3, showL4, showL5]}
          />

          {/* Level 2 — Concept */}
          <AnimatePresence>
          {showL2 && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: "hidden" }}
            >
            <LevelCard
              level={2}
              title="Concept"
              icon={Brain}
              tagline="Understand the underlying rule before solving."
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Concept</p>
                  <p className="text-sm font-medium">{explanation.levels.level2_concept.conceptName}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Core Rule" value={explanation.levels.level2_concept.coreRule} icon={Tag} accent={ACCENTS[2]} />
                  <Field label="Why It Applies" value={explanation.levels.level2_concept.whyItApplies} icon={GitBranch} accent={ACCENTS[2]} />
                  {explanation.levels.level2_concept.shortcut && (
                    <Field label="Shortcut" value={explanation.levels.level2_concept.shortcut} icon={Zap} accent={ACCENTS[2]} />
                  )}
                  {explanation.levels.level2_concept.commonMistake && (
                    <Field label="Common Mistake" value={explanation.levels.level2_concept.commonMistake} icon={AlertTriangle} accent={ACCENTS[2]} />
                  )}
                </div>
              </div>
            </LevelCard>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Level 3 — Detailed Solution */}
          <AnimatePresence>
          {showL3 && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: "hidden" }}
            >
            <LevelCard
              level={3}
              title="Detailed Solution"
              icon={ListOrdered}
              tagline="Step-by-step walkthrough with formula and calculation."
            >
              <div className="space-y-4">
                {/* Steps */}
                <ol className="space-y-2">
                  {explanation.levels.level3_detailedSolution.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white", ACCENTS[3].gradient)}>
                        {i + 1}
                      </span>
                      <span className="leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>

                {/* Formula */}
                {explanation.levels.level3_detailedSolution.formula && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <Calculator className="h-3.5 w-3.5" /> Formula
                    </p>
                    <pre className={cn("rounded-md border px-3 py-2 font-mono text-sm overflow-x-auto", ACCENTS[3].bg, ACCENTS[3].border)}>
                      {explanation.levels.level3_detailedSolution.formula}
                    </pre>
                  </div>
                )}

                {/* Substitution + Calculation */}
                {(explanation.levels.level3_detailedSolution.substitution || explanation.levels.level3_detailedSolution.calculation) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {explanation.levels.level3_detailedSolution.substitution && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Substitution</p>
                        <code className={cn("block rounded-md border px-3 py-2 font-mono text-sm", ACCENTS[3].bg, ACCENTS[3].border)}>
                          {explanation.levels.level3_detailedSolution.substitution}
                        </code>
                      </div>
                    )}
                    {explanation.levels.level3_detailedSolution.calculation && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Calculation</p>
                        <code className={cn("block rounded-md border px-3 py-2 font-mono text-sm", ACCENTS[3].bg, ACCENTS[3].border)}>
                          {explanation.levels.level3_detailedSolution.calculation}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                {/* Final Answer */}
                <div className={cn("rounded-lg border px-4 py-3 flex items-center gap-3", ACCENTS[3].bg, ACCENTS[3].border)}>
                  <CheckCircle2 className={cn("h-5 w-5 shrink-0", ACCENTS[3].text)} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Final Answer</p>
                    <p className={cn("text-base font-bold", ACCENTS[3].text)}>{explanation.levels.level3_detailedSolution.finalAnswer}</p>
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Explanation</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{explanation.levels.level3_detailedSolution.explanation}</p>
                </div>
              </div>
            </LevelCard>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Level 4 — Exam Shortcut (optional) */}
          <AnimatePresence>
          {showL4 && explanation.levels.level4_examShortcut && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: "hidden" }}
            >
            <LevelCard
              level={4}
              title="Exam Shortcut"
              icon={Zap}
              tagline="Faster path — save precious seconds on exam day."
            >
              <div className="space-y-4">
                <Field label="Method" value={explanation.levels.level4_examShortcut.method} icon={Zap} accent={ACCENTS[4]} />
                <div className="grid gap-3 sm:grid-cols-2">
                  {explanation.levels.level4_examShortcut.mentalCalculation && (
                    <Field label="Mental Calculation" value={explanation.levels.level4_examShortcut.mentalCalculation} icon={Calculator} accent={ACCENTS[4]} />
                  )}
                  {explanation.levels.level4_examShortcut.eliminationTechnique && (
                    <Field label="Elimination Technique" value={explanation.levels.level4_examShortcut.eliminationTechnique} icon={AlertTriangle} accent={ACCENTS[4]} />
                  )}
                </div>
                <Field label="Time-Saving Approach" value={explanation.levels.level4_examShortcut.timeSavingApproach} icon={CheckCircle2} accent={ACCENTS[4]} />
              </div>
            </LevelCard>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Level 5 — Learning Insight */}
          <AnimatePresence>
          {showL5 && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: "hidden" }}
            >
            <LevelCard
              level={5}
              title="Learning Insight"
              icon={GraduationCap}
              tagline="What to remember going forward."
            >
              <p className="text-sm leading-relaxed">{explanation.levels.level5_learningInsight}</p>
            </LevelCard>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Reveal buttons */}
          <Card className="bg-muted/20">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">Reveal next level</p>
              <div className="flex flex-wrap gap-2">
                <RevealButton label="Show Concept" icon={Brain} accent={ACCENTS[2]} shown={showL2} onClick={() => setShowL2(true)} disabled={showL2} />
                <RevealButton label="Show Detailed Solution" icon={ListOrdered} accent={ACCENTS[3]} shown={showL3} onClick={() => setShowL3(true)} disabled={showL3} />
                {explanation.levels.level4_examShortcut && (
                  <RevealButton label="Show Exam Shortcut" icon={Zap} accent={ACCENTS[4]} shown={showL4} onClick={() => setShowL4(true)} disabled={showL4} />
                )}
                <RevealButton label="Show Learning Insight" icon={GraduationCap} accent={ACCENTS[5]} shown={showL5} onClick={() => setShowL5(true)} disabled={showL5} />
              </div>
            </CardContent>
          </Card>

          {/* Sources */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources</p>
            <SourceBadgeList sources={explanation.sources} />
          </div>

          {/* Save action */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600">
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
// Sub-components
// ============================================================

function MetadataBar({ explanation }: { explanation: QuestionExplanation }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" /> Knowledge Graph Metadata
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {explanation.subject && (
            <Badge variant="outline" className="gap-1 border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/10">
              <BookOpen className="h-3 w-3" /> {explanation.subject}
            </Badge>
          )}
          {explanation.topic && (
            <Badge variant="outline" className="gap-1 border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10">
              <Tag className="h-3 w-3" /> {explanation.topic}
            </Badge>
          )}
          {explanation.subtopic && (
            <Badge variant="outline" className="gap-1 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10">
              <Layers className="h-3 w-3" /> {explanation.subtopic}
            </Badge>
          )}
          {explanation.concept && (
            <Badge variant="outline" className="gap-1 border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/10">
              <Brain className="h-3 w-3" /> {explanation.concept}
            </Badge>
          )}
          {explanation.difficulty && (
            <Badge variant="outline" className={cn("gap-1 font-medium", DIFFICULTY_STYLE[explanation.difficulty] ?? "")}>
              <Sparkles className="h-3 w-3" /> {explanation.difficulty}
            </Badge>
          )}
          {explanation.questionType && (
            <Badge variant="outline" className="gap-1 border-zinc-500/30 text-zinc-600 dark:text-zinc-300 bg-zinc-500/10">
              <HelpCircle className="h-3 w-3" /> {explanation.questionType}
            </Badge>
          )}
        </div>

        {explanation.relatedConcepts && explanation.relatedConcepts.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Related Concepts</p>
            <div className="flex flex-wrap gap-1.5">
              {explanation.relatedConcepts.map((c, i) => (
                <Badge key={i} variant="secondary" className="text-[11px] font-normal bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {explanation.prerequisites && explanation.prerequisites.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prerequisites</p>
            <div className="flex flex-wrap gap-1.5">
              {explanation.prerequisites.map((c, i) => (
                <Badge key={i} variant="secondary" className="text-[11px] font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LevelCard({
  level,
  title,
  icon: Icon,
  tagline,
  children,
}: {
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  children: React.ReactNode;
}) {
  const accent = ACCENTS[level];
  return (
    <Card className={cn("border-t-2 pt-5", accent.border)} data-level={level}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", accent.gradient)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span className={cn("text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5", accent.chip)}>
                Level {level}
              </span>
              {title}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">{tagline}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
}) {
  return (
    <div className={cn("rounded-md border px-3 py-2.5", accent.bg, accent.border)}>
      <p className={cn("text-[10px] font-semibold uppercase tracking-wide mb-1 flex items-center gap-1.5", accent.text)}>
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="text-sm leading-relaxed">{value}</p>
    </div>
  );
}

function RevealButton({
  label,
  icon: Icon,
  accent,
  shown,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
  shown: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "gap-2 transition-all",
        shown
          ? cn("opacity-60 cursor-default", accent.border, accent.text, accent.bg)
          : cn("hover:bg-transparent", accent.border, accent.text, accent.bg, "hover:shadow-sm")
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {!shown && <ChevronRight className="h-3.5 w-3.5" />}
      {shown && <CheckCircle2 className="h-3.5 w-3.5" />}
    </Button>
  );
}

// Gradient progress indicator showing which levels are unlocked (1-5)
function LevelProgressIndicator({ unlocked }: { unlocked: boolean[] }) {
  const labels = ["Hint", "Concept", "Solution", "Shortcut", "Insight"];
  const colors = ["amber", "violet", "sky", "emerald", "fuchsia"];
  const colorMap: Record<string, string> = {
    amber: "from-amber-500 to-orange-500 border-amber-500/40",
    violet: "from-violet-500 to-fuchsia-500 border-violet-500/40",
    sky: "from-sky-500 to-cyan-500 border-sky-500/40",
    emerald: "from-emerald-500 to-teal-500 border-emerald-500/40",
    fuchsia: "from-fuchsia-500 to-pink-500 border-fuchsia-500/40",
  };
  const unlockedCount = unlocked.filter(Boolean).length;
  return (
    <div className="flex items-center gap-1.5">
      {labels.map((label, i) => {
        const isUnlocked = unlocked[i];
        const c = colors[i];
        return (
          <div key={label} className="flex items-center gap-1.5 flex-1">
            <div
              className={cn(
                "flex-1 h-1.5 rounded-full transition-all duration-500",
                isUnlocked
                  ? `bg-gradient-to-r ${colorMap[c].split(" ")[0]} ${colorMap[c].split(" ")[1]}`
                  : "bg-muted"
              )}
            />
            <span
              className={cn(
                "text-[9px] font-medium transition-colors",
                isUnlocked ? "text-foreground" : "text-muted-foreground/50"
              )}
            >
              {label}
            </span>
            {i < labels.length - 1 && <div className="w-1" />}
          </div>
        );
      })}
      <span className="ml-2 text-[10px] text-muted-foreground shrink-0">
        {unlockedCount}/5
      </span>
    </div>
  );
}

export default QuestionExplainer;
