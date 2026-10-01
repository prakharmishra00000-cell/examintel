"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Layers,
  GitBranch,
  AlertTriangle,
  Calendar,
  Target,
  ListChecks,
  Scale,
  ArrowRight,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Zap,
  Network,
  Clock,
  GitMerge,
  ShieldCheck,
} from "lucide-react";

import { useApi } from "@/hooks/use-api";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/states";
import { SourceBadgeList } from "@/components/shared/source-badge";
import type { MultiExamPlan, MultiExamConflict } from "@/types";
import { cn } from "@/lib/utils";

// ============================================================
// Types & constants
// ============================================================
type Priority = "Primary" | "Secondary" | "Backup";

interface ExamInput {
  id: string;
  name: string;
  priority: Priority;
  date: string;
  targetScore: string;
}

const PRIORITY_META: Record<
  Priority,
  { wrap: string; dot: string; chip: string; gradient: string; ring: string }
> = {
  Primary: {
    wrap: "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
    chip: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    gradient: "from-violet-500/15 to-violet-500/0",
    ring: "ring-violet-500/20",
  },
  Secondary: {
    wrap: "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    chip: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    gradient: "from-sky-500/15 to-sky-500/0",
    ring: "ring-sky-500/20",
  },
  Backup: {
    wrap: "border-zinc-500/40 bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
    dot: "bg-zinc-500",
    chip: "border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    gradient: "from-zinc-500/15 to-zinc-500/0",
    ring: "ring-zinc-500/20",
  },
};

const PRESET: ExamInput[] = [
  { id: "p1", name: "SSC CGL", priority: "Primary", date: "", targetScore: "" },
  { id: "p2", name: "Banking PO", priority: "Secondary", date: "", targetScore: "" },
  { id: "p3", name: "Railway NTPC", priority: "Backup", date: "", targetScore: "" },
];

const MAX_EXAMS = 5;

function makeId() {
  return `ex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ============================================================
// Main component
// ============================================================
export function MultiExamOptimizer() {
  const { call } = useApi();
  const saveItem = useAppStore((s) => s.saveItem);
  const setContext = useAppStore((s) => s.setContext);

  const [exams, setExams] = useState<ExamInput[]>([
    { id: makeId(), name: "", priority: "Primary", date: "", targetScore: "" },
    { id: makeId(), name: "", priority: "Secondary", date: "", targetScore: "" },
  ]);
  const [availableHours, setAvailableHours] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<MultiExamPlan | null>(null);

  // ----- exam config handlers -----
  const addExam = useCallback(() => {
    setExams((prev) => {
      if (prev.length >= MAX_EXAMS) return prev;
      // Pick next available priority
      const used = new Set(prev.map((e) => e.priority));
      const next: Priority = !used.has("Backup")
        ? "Backup"
        : !used.has("Secondary")
        ? "Secondary"
        : "Primary";
      return [...prev, { id: makeId(), name: "", priority: next, date: "", targetScore: "" }];
    });
  }, []);

  const removeExam = useCallback((id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateExam = useCallback(
    (id: string, patch: Partial<ExamInput>) => {
      setExams((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    []
  );

  const loadPreset = useCallback(() => {
    setExams(PRESET.map((p) => ({ ...p, id: makeId() })));
    setPlan(null);
    setError(null);
  }, []);

  // ----- optimize -----
  const validExams = exams.filter((e) => e.name.trim().length > 0);

  const optimize = useCallback(async () => {
    setError(null);
    if (validExams.length < 2) {
      setError("Please enter at least 2 exam names.");
      return;
    }
    setLoading(true);
    setPlan(null);

    const payload = {
      exams: validExams.map((e) => ({
        name: e.name.trim(),
        priority: e.priority,
        date: e.date?.trim() || undefined,
        targetScore: e.targetScore?.trim() || undefined,
      })),
      availableHours,
    };

    const res = await call<{ plan: MultiExamPlan } | { error: string }>(
      "/api/multi-exam/optimize",
      payload
    );

    if (res && "plan" in res && res.plan) {
      setPlan(res.plan);
      setContext(
        "Multi-exam: " + validExams.map((e) => e.name.trim()).join(" + "),
        "multi-exam"
      );
    } else if (res && "error" in res) {
      setError(res.error);
    } else {
      setError("Optimisation failed. Please try again.");
    }
    setLoading(false);
  }, [validExams, availableHours, call, setContext]);

  // ----- save -----
  const handleSave = useCallback(() => {
    if (!plan) return;
    const title = validExams.map((e) => e.name.trim()).join(" + ");
    const summary = `${validExams.length} exams · ${availableHours}h/day`;
    saveItem({ type: "multi-exam", title, summary, data: plan });
    toast.success("Saved to My Research", {
      description: `${title} · ${summary}`,
    });
  }, [plan, validExams, availableHours, saveItem]);

  return (
    <div className="space-y-8 pb-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row sm:items-start gap-4"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30 shrink-0">
          <Layers className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            AI Multi-Exam Preparation Optimizer
          </h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground max-w-3xl">
            Prepare for multiple exams without unnecessarily duplicating effort. Define
            Primary / Secondary / Backup and get one combined strategy.
          </p>
        </div>
      </motion.header>

      {/* Config Card */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-fuchsia-500" />
            Define your exams & constraints
          </CardTitle>
          <CardDescription>
            Add up to {MAX_EXAMS} exams. Assign each a priority — the AI respects your
            ranking and never re-prioritises exams on its own.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Exam rows */}
          <div className="space-y-3">
            {exams.map((ex, idx) => {
              const meta = PRIORITY_META[ex.priority];
              return (
                <div
                  key={ex.id}
                  className={cn(
                    "grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 rounded-lg border bg-muted/20 p-3 ring-1 sm:p-3",
                    meta.wrap,
                    meta.ring
                  )}
                >
                  {/* Name */}
                  <div className="sm:col-span-4 space-y-1">
                    <Label htmlFor={`ex-name-${ex.id}`} className="sr-only">
                      Exam {idx + 1} name
                    </Label>
                    <Input
                      id={`ex-name-${ex.id}`}
                      value={ex.name}
                      onChange={(e) => updateExam(ex.id, { name: e.target.value })}
                      placeholder={`Exam ${idx + 1} (e.g. SSC CGL)`}
                      className="bg-background/80"
                      aria-label={`Exam ${idx + 1} name`}
                    />
                  </div>

                  {/* Priority */}
                  <div className="sm:col-span-3">
                    <Label htmlFor={`ex-prio-${ex.id}`} className="sr-only">
                      Priority
                    </Label>
                    <Select
                      value={ex.priority}
                      onValueChange={(v: Priority) => updateExam(ex.id, { priority: v })}
                    >
                      <SelectTrigger id={`ex-prio-${ex.id}`} className="w-full bg-background/80">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Primary">Primary</SelectItem>
                        <SelectItem value="Secondary">Secondary</SelectItem>
                        <SelectItem value="Backup">Backup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date */}
                  <div className="sm:col-span-2">
                    <Label htmlFor={`ex-date-${ex.id}`} className="sr-only">
                      Target date
                    </Label>
                    <Input
                      id={`ex-date-${ex.id}`}
                      type="date"
                      value={ex.date}
                      onChange={(e) => updateExam(ex.id, { date: e.target.value })}
                      className="bg-background/80"
                      aria-label={`Exam ${idx + 1} target date`}
                    />
                  </div>

                  {/* Target score */}
                  <div className="sm:col-span-2">
                    <Label htmlFor={`ex-score-${ex.id}`} className="sr-only">
                      Target score
                    </Label>
                    <Input
                      id={`ex-score-${ex.id}`}
                      value={ex.targetScore}
                      onChange={(e) => updateExam(ex.id, { targetScore: e.target.value })}
                      placeholder="Score"
                      className="bg-background/80"
                      aria-label={`Exam ${idx + 1} target score`}
                    />
                  </div>

                  {/* Remove */}
                  <div className="sm:col-span-1 flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeExam(ex.id)}
                      aria-label={`Remove exam ${idx + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add / preset */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={addExam}
              disabled={exams.length >= MAX_EXAMS}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Exam
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={loadPreset}
              className="gap-1.5 text-muted-foreground hover:text-fuchsia-700 dark:hover:text-fuchsia-300"
            >
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
              Preset: SSC CGL (Primary) + Banking PO (Secondary) + Railway NTPC (Backup)
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {exams.length} / {MAX_EXAMS} exams
            </span>
          </div>

          {/* Available hours */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-2 border-t border-border/60">
            <div className="space-y-1.5 sm:max-w-[180px]">
              <Label htmlFor="avail-hrs" className="text-xs font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-violet-500" />
                Available hours / day
              </Label>
              <Input
                id="avail-hrs"
                type="number"
                min={1}
                max={16}
                step={0.5}
                value={availableHours}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setAvailableHours(Number.isFinite(v) && v > 0 ? v : 5);
                }}
                className="bg-background/80"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <Button
                onClick={optimize}
                disabled={loading || validExams.length < 2}
                className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                {loading ? "Optimising…" : "Optimize"}
              </Button>
              {plan && (
                <Button onClick={handleSave} variant="outline" className="gap-1.5">
                  <Save className="h-4 w-4" /> Save to My Research
                </Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {validExams.length < 2
                  ? "Add at least 2 exams with names"
                  : `${validExams.length} exams ready`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Body */}
      <div className="space-y-8">
        {loading && (
          <Card>
            <CardContent>
              <LoadingState label="Building knowledge map & minimising duplicated effort…" />
            </CardContent>
          </Card>
        )}

        {!loading && error && <ErrorState message={error} onRetry={optimize} />}

        {!loading && !error && !plan && (
          <EmptyState
            icon={Layers}
            title="No combined strategy yet"
            description="Define your exams above and hit Optimize. The AI builds a multi-exam knowledge map (COMMON + exam-specific), a combined strategy that minimises duplicated effort, surfaces conflicts, and produces a 7-day weekly schedule."
          />
        )}

        {!loading && !error && plan && <PlanView plan={plan} onSave={handleSave} />}
      </div>
    </div>
  );
}

// ============================================================
// Plan view
// ============================================================
function PlanView({ plan, onSave }: { plan: MultiExamPlan; onSave: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
          <Layers className="h-4 w-4 text-violet-500" />
          {plan.exams.map((e, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <span>{e.name}</span>
              <Badge
                variant="outline"
                className={cn("px-1.5 py-0 text-[10px] font-semibold", PRIORITY_META[e.priority].chip)}
              >
                {e.priority}
              </Badge>
              {i < plan.exams.length - 1 && (
                <span className="text-muted-foreground mx-0.5">+</span>
              )}
            </span>
          ))}
          <span className="text-muted-foreground ml-2 text-xs font-normal">
            · {plan.availableHours}h/day
          </span>
        </div>
        <Button onClick={onSave} variant="outline" size="sm" className="ml-auto gap-1.5">
          <Save className="h-3.5 w-3.5" /> Save to My Research
        </Button>
      </div>

      {/* 1. Exams overview */}
      <Section
        icon={Scale}
        title="Exams Overview"
        subtitle="The exams you are optimising across, with priorities preserved from your input."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plan.exams.map((e, i) => {
            const meta = PRIORITY_META[e.priority];
            return (
              <div
                key={i}
                className={cn(
                  "rounded-xl border bg-gradient-to-br to-transparent p-4 ring-1",
                  meta.wrap,
                  meta.ring,
                  meta.gradient
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                    <span className="font-semibold text-sm sm:text-base">{e.name}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", meta.chip)}
                  >
                    {e.priority}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Date
                    </div>
                    <div className="font-medium mt-0.5">
                      {e.date || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground inline-flex items-center gap-1">
                      <Target className="h-3 w-3" /> Target
                    </div>
                    <div className="font-medium mt-0.5">
                      {e.targetScore || "—"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 2. Knowledge Map (Tree) */}
      <Section
        icon={Network}
        title="Multi-Exam Knowledge Map"
        subtitle="COMMON topics (supporting multiple exams) at the centre. Exam-specific branches below each exam."
      >
        <KnowledgeTree plan={plan} />
      </Section>

      {/* 3. Combined Strategy */}
      <Section
        icon={GitMerge}
        title="Combined Strategy"
        subtitle="One unified plan that minimises duplicated effort — common prep first, exam-specific applications on top."
      >
        <CombinedStrategyView plan={plan} />
      </Section>

      {/* 4. Conflicts */}
      {plan.conflicts.length > 0 && (
        <Section
          icon={AlertTriangle}
          title="Conflicts Detected"
          subtitle="Where these exams disagree on pattern, marking, depth, awareness or technical requirements — and why it matters."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plan.conflicts.map((c, i) => (
              <ConflictCard key={i} conflict={c} index={i} />
            ))}
          </div>
        </Section>
      )}

      {/* 5. Weekly Schedule */}
      <Section
        icon={Calendar}
        title="Weekly Schedule"
        subtitle="A 7-day plan that fits your daily availability. Common foundations early, exam-specific applications sprinkled in."
      >
        <WeeklyScheduleView plan={plan} />
      </Section>

      {/* 6. Sources */}
      {plan.sources && plan.sources.length > 0 && (
        <Section
          icon={ShieldCheck}
          title="Sources & Provenance"
          subtitle="Every claim is tagged by origin — user input vs AI synthesis."
        >
          <SourceBadgeList sources={plan.sources} />
        </Section>
      )}
    </motion.div>
  );
}

// ============================================================
// Knowledge Map — premium tree visualization
// ============================================================
function KnowledgeTree({ plan }: { plan: MultiExamPlan }) {
  const { common, examSpecific } = plan.knowledgeMap;

  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4 sm:p-6 overflow-x-auto">
      <div className="min-w-[520px] space-y-4">
        {/* Root */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-white font-bold text-sm shadow-md shadow-fuchsia-500/20">
            <Layers className="h-4 w-4" />
            MULTI-EXAM PREPARATION
          </div>
        </div>

        {/* Trunk line */}
        <div className="flex justify-center">
          <div className="h-6 w-px bg-gradient-to-b from-violet-500/60 to-border" />
        </div>

        {/* COMMON branch */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="mt-1.5 inline-block h-3 w-3 rounded-sm border-2 border-violet-500 bg-violet-500/20 shrink-0" />
            <div className="flex-1 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Common
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ({common.length} topic{common.length === 1 ? "" : "s"})
                </span>
              </div>
              {common.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No shared topics identified — prep is fully exam-specific.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {common.map((t, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 font-normal"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* connector */}
          <div className="ml-1.5 h-4 w-px bg-border" />
        </div>

        {/* Per-exam branches */}
        {examSpecific.map((e, i) => {
          const meta = PRIORITY_META[e.priority];
          const isLast = i === examSpecific.length - 1;
          const shortName = shortBranch(e.exam);
          return (
            <div key={i} className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="mt-1.5 inline-block h-3 w-3 rounded-sm border-2 bg-muted shrink-0"
                  style={{ borderColor: "currentColor" }}
                >
                  <span className={cn("block h-full w-full", meta.dot)} style={{ opacity: 0.4 }} />
                </span>
                <div className={cn("flex-1 rounded-lg border p-3 bg-gradient-to-br to-transparent", meta.wrap, meta.gradient)}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("text-xs font-bold uppercase tracking-wide")}>
                      {shortName}-SPECIFIC
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("px-1.5 py-0 text-[10px] font-semibold", meta.chip)}
                    >
                      {e.priority}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      ({e.topics.length} topic{e.topics.length === 1 ? "" : "s"})
                    </span>
                  </div>
                  {e.topics.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No unique topics — fully covered by common prep.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {e.topics.map((t, j) => (
                        <Badge
                          key={j}
                          variant="outline"
                          className={cn("font-normal", meta.chip)}
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {!isLast && <div className="ml-1.5 h-4 w-px bg-border" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function shortBranch(name: string): string {
  if (!name) return "EXAM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 8).toUpperCase();
  }
  return parts
    .slice(0, 2)
    .map((p) => p.slice(0, 4))
    .join("")
    .toUpperCase();
}

// ============================================================
// Combined strategy renderer
// ============================================================
function CombinedStrategyView({ plan }: { plan: MultiExamPlan }) {
  const s = plan.combinedStrategy;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Common Preparation */}
      <StrategyCard
        icon={Layers}
        title="Common Preparation"
        subtitle="Prep shared topics once — this is the biggest effort-saver."
        accent="violet"
      >
        {s.commonPreparation.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shared prep identified.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {s.commonPreparation.map((t, i) => (
              <Badge
                key={i}
                variant="outline"
                className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 font-normal"
              >
                {t}
              </Badge>
            ))}
          </div>
        )}
      </StrategyCard>

      {/* Exam-Specific Preparation */}
      <StrategyCard
        icon={GitBranch}
        title="Exam-Specific Preparation"
        subtitle="What each exam adds on top of common prep."
        accent="fuchsia"
      >
        {s.examSpecificPreparation.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exam-specific prep identified.</p>
        ) : (
          <div className="space-y-2.5">
            {s.examSpecificPreparation.map((e, i) => {
              const examMeta = plan.exams.find((x) => x.name === e.exam);
              const meta = examMeta ? PRIORITY_META[examMeta.priority] : PRIORITY_META.Backup;
              return (
                <div key={i} className={cn("rounded-lg border p-2.5", meta.wrap)}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                    <span className="text-xs font-semibold">{e.exam}</span>
                  </div>
                  {e.topics.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      Nothing unique — covered by common prep.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {e.topics.map((t, j) => (
                        <Badge
                          key={j}
                          variant="outline"
                          className={cn("font-normal text-[11px]", meta.chip)}
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </StrategyCard>

      {/* Priority (which common foundations first) */}
      <StrategyCard
        icon={ListChecks}
        title="Priority — Common Foundations First"
        subtitle="Ordered leverage sequence for shared topics."
        accent="violet"
      >
        {s.priority.length === 0 ? (
          <p className="text-sm text-muted-foreground">No priority sequence provided.</p>
        ) : (
          <ol className="space-y-2">
            {s.priority.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-sm"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-[10px] font-bold">
                  {i + 1}
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        )}
      </StrategyCard>

      {/* Dependencies */}
      <StrategyCard
        icon={ArrowRight}
        title="Dependencies"
        subtitle="Prerequisite links across topics."
        accent="fuchsia"
      >
        {s.dependencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dependencies flagged.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {s.dependencies.map((d, i) => (
              <Badge
                key={i}
                variant="outline"
                className="border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 font-normal"
              >
                {d}
              </Badge>
            ))}
          </div>
        )}
      </StrategyCard>

      {/* Scheduling */}
      <StrategyCard
        icon={Calendar}
        title="Scheduling"
        subtitle="When to introduce exam-specific prep."
        accent="violet"
      >
        <BulletList items={s.scheduling} dotColor="text-violet-500" />
      </StrategyCard>

      {/* Revision */}
      <StrategyCard
        icon={Network}
        title="Revision"
        subtitle="Shared where appropriate + exam-specific focus."
        accent="fuchsia"
      >
        <BulletList items={s.revision} dotColor="text-fuchsia-500" />
      </StrategyCard>

      {/* Mock Testing */}
      <StrategyCard
        icon={Target}
        title="Mock Testing"
        subtitle="Exam-specific mocks closer to relevant exam."
        accent="violet"
        fullSpan
      >
        <BulletList items={s.mockTesting} dotColor="text-violet-500" />
      </StrategyCard>
    </div>
  );
}

function StrategyCard({
  icon: Icon,
  title,
  subtitle,
  accent,
  children,
  fullSpan,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  accent: "violet" | "fuchsia";
  children: React.ReactNode;
  fullSpan?: boolean;
}) {
  const color =
    accent === "violet"
      ? "text-violet-600 dark:text-violet-400"
      : "text-fuchsia-600 dark:text-fuchsia-400";
  const border =
    accent === "violet"
      ? "border-violet-500/20"
      : "border-fuchsia-500/20";
  const tint =
    accent === "violet"
      ? "bg-violet-500/15"
      : "bg-fuchsia-500/15";
  return (
    <div className={cn("rounded-xl border border-border/80 bg-card p-4 shadow-sm", fullSpan && "lg:col-span-2")}>
      <div className="flex items-start gap-2.5 mb-3">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", tint, border)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, dotColor }: { items: string[]; dotColor: string }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">None identified.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex items-start gap-2 text-sm leading-relaxed"
        >
          <span className={cn("mt-1.5", dotColor)}>▸</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

// ============================================================
// Conflict card
// ============================================================
function ConflictCard({ conflict, index }: { conflict: MultiExamConflict; index: number }) {
  return (
    <Alert
      key={index}
      variant="default"
      className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
    >
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          {conflict.type || "Conflict"}
        </span>
      </AlertTitle>
      <AlertDescription className="text-amber-800/90 dark:text-amber-200/90">
        {conflict.description && (
          <p className="leading-relaxed">{conflict.description}</p>
        )}
        {conflict.reason && (
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
            <span className="font-medium">Why it matters:</span> {conflict.reason}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

// ============================================================
// Weekly schedule
// ============================================================
function WeeklyScheduleView({ plan }: { plan: MultiExamPlan }) {
  const days = plan.weeklySchedule.slice(0, 7);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {days.map((d, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl border p-3 bg-card shadow-sm flex flex-col",
            i === 0
              ? "border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-transparent"
              : "border-border/80"
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wide">
              {d.day}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {d.sessions.length} session{d.sessions.length === 1 ? "" : "s"}
            </span>
          </div>
          {d.sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Rest / buffer day.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {d.sessions.map((s, j) => (
                <li
                  key={j}
                  className="flex items-start gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 leading-relaxed"
                >
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-violet-500" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Section wrapper
// ============================================================
function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-violet-500/20">
            <Icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {subtitle && (
              <CardDescription className="mt-0.5">{subtitle}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}
