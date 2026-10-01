"use client";

import { useState, useMemo, useCallback, useEffect, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Target,
  Clock,
  Zap,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Flag,
  Timer,
  ListChecks,
  RotateCcw,
  Sparkles,
  Save,
  RefreshCw,
  CircleDashed,
  ShieldAlert,
  Hourglass,
  ListOrdered,
  ScrollText,
} from "lucide-react";

import { useApi } from "@/hooks/use-api";
import { useAppStore } from "@/store/app-store";
import type { ExamStrategy } from "@/types";
import type { SourceRef } from "@/types";
import { SourceBadgeList } from "@/components/shared/source-badge";
import { LoadingState } from "@/components/shared/states";
import { PremiumEmptyState } from "@/components/shared/premium-empty-state";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ============================================================
// Exam Strategy Guide — AI-powered exam-day strategist
// Produces a tailored strategy (time allocation, attempt order,
// negative-marking rules, revision buffer, section targets,
// last-5-minute tactics, common mistakes) per exam type.
// ============================================================

const QUICK_CHIPS = [
  { label: "SSC CGL", examName: "SSC CGL", sections: "General Intelligence & Reasoning, General Awareness, Quantitative Aptitude, English Comprehension", totalQuestions: 100, durationMinutes: 60, negativeMarking: "0.5 per incorrect" },
  { label: "GATE CS", examName: "GATE CS", sections: "General Aptitude, Engineering Mathematics, Technical (CS)", totalQuestions: 65, durationMinutes: 180, negativeMarking: "1/3 for 1-mark, 2/3 for 2-mark" },
  { label: "UPSC CSE", examName: "UPSC CSE Prelims", sections: "General Studies Paper I (History, Polity, Geography, Economy, Environment, Current Affairs)", totalQuestions: 100, durationMinutes: 120, negativeMarking: "1/3 for incorrect (2-mark questions)" },
  { label: "Banking PO", examName: "IBPS PO Prelims", sections: "Reasoning Ability, Quantitative Aptitude, English Language", totalQuestions: 100, durationMinutes: 60, negativeMarking: "0.25 per incorrect" },
];

const EXAM_TYPE_META: Record<
  ExamStrategy["examType"],
  { badge: string; ring: string; icon: typeof Target; label: string; description: string; grad: string }
> = {
  "Speed-focused": {
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    ring: "ring-amber-500/30",
    icon: Zap,
    label: "Speed-focused",
    description: "Speed >> accuracy. Bank quick wins, skip hard ones.",
    grad: "from-amber-500 to-orange-500",
  },
  "Accuracy-focused": {
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    ring: "ring-emerald-500/30",
    icon: Target,
    label: "Accuracy-focused",
    description: "Quality over quantity. Solve carefully, skip if unsure.",
    grad: "from-emerald-500 to-teal-500",
  },
  "Elimination-based": {
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
    ring: "ring-violet-500/30",
    icon: Brain,
    label: "Elimination-based",
    description: "Eliminate 2 options, guess selectively.",
    grad: "from-violet-500 to-fuchsia-500",
  },
  "Mixed": {
    badge: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
    ring: "ring-fuchsia-500/30",
    icon: Trophy,
    label: "Mixed (Speed + Accuracy)",
    description: "Balanced — speed on quick wins, accuracy on sets.",
    grad: "from-fuchsia-500 to-pink-500",
  },
};

const PRIORITY_BADGE: Record<"High" | "Medium" | "Low", string> = {
  High: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  Medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Low: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
};

const ACTION_BADGE: Record<"Guess" | "Skip" | "Eliminate then guess", { cls: string; icon: typeof Target }> = {
  Guess: { cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  Skip: { cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30", icon: CircleDashed },
  "Eliminate then guess": { cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: ShieldAlert },
};

// ---------- Subcomponents ----------

function SectionHeader({
  icon: Icon,
  title,
  description,
  accent = "violet",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  accent?: "violet" | "amber" | "emerald" | "rose" | "sky" | "fuchsia";
}) {
  const accentMap: Record<string, { bg: string; text: string }> = {
    violet: { bg: "bg-violet-500/10 border-violet-500/20", text: "text-violet-600 dark:text-violet-400" },
    amber: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
    emerald: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
    rose: { bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-600 dark:text-rose-400" },
    sky: { bg: "bg-sky-500/10 border-sky-500/20", text: "text-sky-600 dark:text-sky-400" },
    fuchsia: { bg: "bg-fuchsia-500/10 border-fuchsia-500/20", text: "text-fuchsia-600 dark:text-fuchsia-400" },
  };
  const a = accentMap[accent] ?? accentMap.violet;
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", a.bg)}>
        <Icon className={cn("h-4 w-4", a.text)} />
      </div>
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

function StrategyCard({
  icon,
  title,
  description,
  accent = "violet",
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  accent?: "violet" | "amber" | "emerald" | "rose" | "sky" | "fuchsia";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader className="pb-3">
        <SectionHeader icon={icon} title={title} description={description} accent={accent} />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ExamTypeBadge({ type }: { type: ExamStrategy["examType"] }) {
  const meta = EXAM_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4 ring-1", meta.badge, meta.ring)}>
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", meta.grad)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{meta.label}</span>
          <Badge variant="outline" className={cn("font-normal", meta.badge)}>{type}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "High" | "Medium" | "Low" }) {
  return (
    <Badge variant="outline" className={cn("font-normal", PRIORITY_BADGE[priority])}>
      {priority}
    </Badge>
  );
}

function ActionBadge({ action }: { action: "Guess" | "Skip" | "Eliminate then guess" }) {
  const meta = ACTION_BADGE[action];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("font-normal gap-1", meta.cls)}>
      <Icon className="h-3 w-3" />
      {action}
    </Badge>
  );
}

function AttemptOrderStepper({ steps }: { steps: ExamStrategy["attemptOrder"] }) {
  const sorted = [...steps].sort((a, b) => a.step - b.step);
  return (
    <ol className="relative space-y-3">
      {/* vertical line */}
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-500/40 via-fuchsia-500/30 to-transparent" />
      {sorted.map((s, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05 }}
          className="relative pl-12"
        >
          <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-violet-500/40 bg-background text-sm font-semibold text-violet-600 dark:text-violet-400 shadow-sm">
            {s.step}
          </div>
          <div className="rounded-lg border border-border bg-card/60 p-3 hover:border-violet-500/30 transition-colors">
            <p className="font-medium text-sm leading-snug">{s.action}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.rationale}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

function RevisionCallout({ minutes }: { minutes: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-5">
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20">
          <Hourglass className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Revision Buffer</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight">
            Reserve <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">{minutes} min</span> for revision
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Reserve this time up-front. Revisit flagged questions, verify bubble rows, and take a final swing at 50/50s.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionTargetsList({ targets }: { targets: ExamStrategy["sectionTargets"] }) {
  if (!targets || targets.length === 0) {
    return <p className="text-sm text-muted-foreground">No section targets provided.</p>;
  }
  return (
    <div className="space-y-3">
      {targets.map((t, i) => {
        const acc = Math.max(0, Math.min(100, t.targetAccuracy));
        const accCls =
          acc >= 90 ? "from-emerald-500 to-teal-500"
          : acc >= 80 ? "from-violet-500 to-fuchsia-500"
          : acc >= 70 ? "from-amber-500 to-orange-500"
          : "from-rose-500 to-pink-500";
        return (
          <div key={i} className="rounded-lg border border-border bg-card/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{t.section}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Safe attempts: <span className="font-semibold text-foreground">{t.safeAttempts}</span>
                </p>
              </div>
              <Badge variant="outline" className="font-normal bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30">
                {acc}% target accuracy
              </Badge>
            </div>
            <div className="mt-2.5 relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${acc}%` }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: "easeOut" }}
                className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r", accCls)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LastFiveMinutesList({ items }: { items: ExamStrategy["lastFiveMinutes"] }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground">No last-minute actions provided.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05 }}
          className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{item.action}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.detail}</p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

function CommonMistakesGrid({ mistakes }: { mistakes: ExamStrategy["commonMistakes"] }) {
  if (!mistakes || mistakes.length === 0) {
    return <p className="text-sm text-muted-foreground">No common mistakes provided.</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {mistakes.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.04 }}
          className="rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-3"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{m.mistake}</p>
              <div className="mt-2 flex items-start gap-1.5 rounded-md bg-emerald-500/[0.06] border border-emerald-500/15 px-2 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">{m.prevention}</p>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ---------- Main component ----------
export function ExamStrategy() {
  const api = useApi();
  const saveItem = useAppStore((s) => s.saveItem);
  const setContext = useAppStore((s) => s.setContext);

  // form state
  const [examName, setExamName] = useState<string>("");
  const [totalQuestions, setTotalQuestions] = useState<string>("100");
  const [durationMinutes, setDurationMinutes] = useState<string>("60");
  const [negativeMarking, setNegativeMarking] = useState<string>("0.5 per incorrect");
  const [sections, setSections] = useState<string>("General Intelligence & Reasoning, General Awareness, Quantitative Aptitude, English Comprehension");

  // result state
  const [loading, setLoading] = useState<boolean>(false);
  const [strategy, setStrategy] = useState<ExamStrategy | null>(null);
  const [error, setError] = useState<string | null>(null);

  // mount-safe + context
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  useEffect(() => {
    setContext("Exam Strategy Guide", "general");
  }, [setContext]);

  const totalMin = useMemo(() => {
    const v = parseInt(durationMinutes, 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
  }, [durationMinutes]);

  const allocatedMin = useMemo(() => {
    if (!strategy) return 0;
    return strategy.timeAllocation.reduce((a, s) => a + (Number(s.minutes) || 0), 0);
  }, [strategy]);

  const applyChip = useCallback((chip: (typeof QUICK_CHIPS)[number]) => {
    setExamName(chip.examName);
    setTotalQuestions(String(chip.totalQuestions));
    setDurationMinutes(String(chip.durationMinutes));
    setNegativeMarking(chip.negativeMarking);
    setSections(chip.sections);
    toast.success("Preset applied", { description: chip.label });
  }, []);

  async function generate() {
    if (!examName.trim()) {
      toast.error("Exam name required", { description: "Enter the exam name or pick a quick preset." });
      return;
    }
    setLoading(true);
    setError(null);
    const payload = {
      examName: examName.trim(),
      totalQuestions: parseInt(totalQuestions, 10) || 0,
      durationMinutes: parseInt(durationMinutes, 10) || 0,
      negativeMarking: negativeMarking.trim(),
      sections: sections
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const res = await api.call<{ strategy: ExamStrategy } | { error: string }>(
      "/api/exam-strategy/generate",
      payload
    );
    setLoading(false);
    if (!res) return;
    if ("error" in res) {
      setError(res.error);
      toast.error("Strategy generation failed", { description: res.error.slice(0, 200) });
      return;
    }
    setStrategy(res.strategy);
    setContext(`Exam Strategy: ${res.strategy.examName}`, "preparation");
    toast.success("Strategy generated", {
      description: `${res.strategy.examType} · ${res.strategy.timeAllocation.length} sections · ${res.strategy.attemptOrder.length} steps`,
    });
  }

  function saveToResearch() {
    if (!strategy) return;
    saveItem({
      type: "preparation",
      title: `${strategy.examName} strategy`,
      summary: `${strategy.examType}`,
      data: strategy,
    });
    toast.success("Saved to My Research", {
      description: `${strategy.examName} · ${strategy.examType}`,
    });
  }

  // ---------- Empty state before generation ----------
  if (!mounted) {
    return <div className="h-96 animate-pulse rounded-2xl bg-muted/30" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-start gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 border border-violet-500/20">
              <Target className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Exam Strategy Guide</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              AI-powered exam-day strategy. Time allocation, attempt order, negative marking rules, and last-minute tactics — tailored to your exam.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Configuration form */}
      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/[0.03] to-transparent">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            Configure your exam
          </CardTitle>
          <CardDescription>
            Tell the strategist your exam's structure — it'll calibrate the strategy to the exam's signature style (speed, accuracy, elimination, or mixed).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick chips */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Quick presets</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_CHIPS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => applyChip(c)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:shadow-sm",
                    examName === c.examName
                      ? "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      : "border-border bg-background hover:border-violet-500/30 hover:bg-violet-500/5 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exam name */}
          <div>
            <Label htmlFor="examName" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Exam name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="examName"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="e.g. SSC CGL, GATE CS, UPSC CSE Prelims, IBPS PO"
              className="bg-background"
            />
          </div>

          {/* Numeric grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="totalQuestions" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Total questions
              </Label>
              <Input
                id="totalQuestions"
                type="number"
                min={1}
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(e.target.value)}
                placeholder="100"
                className="bg-background"
              />
            </div>
            <div>
              <Label htmlFor="durationMinutes" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Duration (minutes)
              </Label>
              <Input
                id="durationMinutes"
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="60"
                className="bg-background"
              />
            </div>
          </div>

          {/* Negative marking */}
          <div>
            <Label htmlFor="negativeMarking" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Negative marking scheme
            </Label>
            <Input
              id="negativeMarking"
              value={negativeMarking}
              onChange={(e) => setNegativeMarking(e.target.value)}
              placeholder="e.g. 0.5 per incorrect, 1/3 for 1-mark, no negative"
              className="bg-background"
            />
          </div>

          {/* Sections */}
          <div>
            <Label htmlFor="sections" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Sections <span className="text-muted-foreground/70">(comma-separated)</span>
            </Label>
            <Input
              id="sections"
              value={sections}
              onChange={(e) => setSections(e.target.value)}
              placeholder="Reasoning, Quant, English, General Awareness"
              className="bg-background"
            />
          </div>

          {/* Generate button */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              onClick={generate}
              disabled={loading || !examName.trim()}
              className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating strategy...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Strategy
                </>
              )}
            </Button>
            {strategy && (
              <Button
                onClick={saveToResearch}
                variant="outline"
                className="gap-1.5 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/40"
              >
                <Save className="h-4 w-4 text-violet-500" />
                Save to My Research
              </Button>
            )}
            {totalMin > 0 && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {totalMin} min total
              </span>
            )}
          </div>

          {loading && <LoadingState label="Tailoring strategy to your exam..." />}

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                <p className="text-rose-700 dark:text-rose-300">{error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state OR strategy rendering */}
      {!strategy && !loading && !error && (
        <PremiumEmptyState
          icon={Target}
          title="No strategy yet"
          description="Configure your exam above and click Generate Strategy. You'll get a tailored exam-day plan: time allocation, attempt order, negative-marking rules, revision buffer, section targets, last-5-minute tactics, and common mistakes — calibrated to the exam type."
          accent="violet"
          ctaLabel="Generate Strategy"
          ctaIcon={Sparkles}
          ctaOnClick={generate}
        />
      )}

      {strategy && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-5"
        >
          {/* Exam header + type badge */}
          <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/[0.03] to-transparent">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Target className="h-5 w-5 text-violet-500" />
                    {strategy.examName}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {totalMin > 0 ? `${totalMin} min · ` : ""}
                    {strategy.timeAllocation.length} sections · revision buffer {strategy.revisionBuffer} min
                  </CardDescription>
                </div>
                <Button
                  onClick={saveToResearch}
                  size="sm"
                  className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save to My Research
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ExamTypeBadge type={strategy.examType} />
            </CardContent>
          </Card>

          {/* Revision buffer callout (prominent, near top) */}
          <RevisionCallout minutes={strategy.revisionBuffer} />

          {/* 1. Time allocation table */}
          <StrategyCard
            icon={Clock}
            title="Time allocation per section"
            description={`Allocated ${allocatedMin} min + ${strategy.revisionBuffer} min revision buffer ${totalMin > 0 ? `· ${totalMin} min total` : ""}`}
            accent="violet"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Section</TableHead>
                  <TableHead className="text-center">Minutes</TableHead>
                  <TableHead className="text-center">Questions</TableHead>
                  <TableHead className="text-center">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strategy.timeAllocation.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.section}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.minutes}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.questions}</TableCell>
                    <TableCell className="text-center">
                      <PriorityBadge priority={row.priority} />
                    </TableCell>
                  </TableRow>
                ))}
                {strategy.timeAllocation.length > 0 && (
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-center tabular-nums font-semibold">{allocatedMin}</TableCell>
                    <TableCell className="text-center tabular-nums font-semibold">
                      {strategy.timeAllocation.reduce((a, s) => a + (Number(s.questions) || 0), 0)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">+{strategy.revisionBuffer} buffer</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </StrategyCard>

          {/* 2. Attempt order */}
          <StrategyCard
            icon={ListOrdered}
            title="Attempt order"
            description="Ordered steps to traverse the paper — calibrated to the exam type."
            accent="violet"
          >
            <AttemptOrderStepper steps={strategy.attemptOrder} />
          </StrategyCard>

          {/* 3. Negative marking strategy */}
          <StrategyCard
            icon={ShieldAlert}
            title="Negative marking strategy"
            description="Decision rules: when to guess, skip, or eliminate-then-guess."
            accent="amber"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Situation</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                  <TableHead>Threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strategy.negativeMarkingStrategy.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="align-top">{row.situation}</TableCell>
                    <TableCell className="text-center align-top">
                      <ActionBadge action={row.action} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground align-top leading-relaxed">{row.threshold}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </StrategyCard>

          {/* 4. Section targets */}
          <StrategyCard
            icon={Trophy}
            title="Section-wise targets"
            description="Safe attempts + target accuracy per section — calibrate your cut-off strategy."
            accent="fuchsia"
          >
            <SectionTargetsList targets={strategy.sectionTargets} />
          </StrategyCard>

          {/* 5. Last 5 minutes */}
          <StrategyCard
            icon={Timer}
            title="Last 5 minutes"
            description="Critical actions for the final countdown — verify, don't start fresh."
            accent="amber"
          >
            <LastFiveMinutesList items={strategy.lastFiveMinutes} />
          </StrategyCard>

          {/* 6. Common mistakes */}
          <StrategyCard
            icon={AlertTriangle}
            title="Common exam-day mistakes"
            description="High-frequency mistakes + concrete prevention tips."
            accent="rose"
          >
            <CommonMistakesGrid mistakes={strategy.commonMistakes} />
          </StrategyCard>

          {/* 7. Sources */}
          {strategy.sources && strategy.sources.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <SectionHeader
                  icon={ScrollText}
                  title="Sources"
                  description="Where this strategy draws its reasoning from."
                  accent="emerald"
                />
              </CardHeader>
              <CardContent>
                <SourceBadgeList sources={strategy.sources as unknown as SourceRef[]} />
              </CardContent>
            </Card>
          )}

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              onClick={generate}
              variant="outline"
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              Regenerate
            </Button>
            <Button
              onClick={saveToResearch}
              className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
            >
              <Save className="h-4 w-4" />
              Save to My Research
            </Button>
          </div>

          {/* Final nudge */}
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.04] p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Flag className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
            <p>
              <span className="font-medium text-foreground">Exam-eve tip:</span> Re-read this strategy the night before your exam. Internalise the attempt order, internalise the negative-marking rules, and trust your revision buffer. You've prepared — now execute.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
