"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarRange,
  Target,
  Clock,
  TrendingUp,
  RefreshCw,
  Layers,
  Flag,
  ListChecks,
  Sparkles,
  Save,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  Gauge,
  CalendarClock,
  Compass,
  Brain,
  Repeat,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  CircleDashed,
  Rocket,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SourceBadgeList } from "@/components/shared/source-badge";
import { LoadingState, EmptyState } from "@/components/shared/states";
import { useAppStore } from "@/store/app-store";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { PreparationPlan, PreparationPhase, DailyPlan } from "@/types";

// ============================================================
// Constants
// ============================================================
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
type Level = (typeof LEVELS)[number];

type ReplanStrategy = "compress" | "extend" | "increase" | "redistribute";

const QUICK_PRESETS: {
  label: string;
  targetExam: string;
  hours: number;
  daysPerWeek: number;
  offsetDays: number;
  currentLevel: Level;
  subjects: string;
  strong: string;
  weak: string;
  targetScore: string;
}[] = [
  {
    label: "SSC CGL · 4h/day · 6 months",
    targetExam: "SSC CGL",
    hours: 4,
    daysPerWeek: 6,
    offsetDays: 180,
    currentLevel: "Beginner",
    subjects: "Quantitative Aptitude, Reasoning, English, General Awareness",
    strong: "General Awareness",
    weak: "Quantitative Aptitude",
    targetScore: "180/200",
  },
  {
    label: "GATE ME · 6h/day · 4 months",
    targetExam: "GATE Mechanical Engineering",
    hours: 6,
    daysPerWeek: 6,
    offsetDays: 120,
    currentLevel: "Intermediate",
    subjects: "Engineering Maths, Thermodynamics, Strength of Materials, Manufacturing, Theory of Machines, Fluid Mechanics",
    strong: "Strength of Materials",
    weak: "Thermodynamics",
    targetScore: "65/100",
  },
  {
    label: "UPSC CSE · 8h/day · 12 months",
    targetExam: "UPSC Civil Services Examination",
    hours: 8,
    daysPerWeek: 7,
    offsetDays: 365,
    currentLevel: "Beginner",
    subjects: "Polity, History, Geography, Economy, Environment, Current Affairs, Ethics, Optional",
    strong: "Polity",
    weak: "Economy",
    targetScore: "Cutoff+",
  },
];

const REPLAN_OPTIONS: { value: ReplanStrategy; label: string; description: string }[] = [
  {
    value: "compress",
    label: "Compress schedule",
    description: "Increase study days/week, condense revision blocks, keep exam date fixed.",
  },
  {
    value: "extend",
    label: "Extend schedule",
    description: "Push the exam date target later so each phase stretches out naturally.",
  },
  {
    value: "increase",
    label: "Increase daily study time",
    description: "Bump hours/day upward — pack more into each existing day.",
  },
  {
    value: "redistribute",
    label: "Keep exam date & redistribute",
    description: "Hold the exam date; rebalance hours across remaining phases proportionally.",
  },
];

// ============================================================
// Helpers
// ============================================================
function defaultDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

function daysFromToday(dateStr: string): number {
  if (!dateStr) return 0;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((t - today) / 86400000);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function parseList(s: string): string[] {
  return s
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// ============================================================
// Phase metadata (icons + gradient)
// ============================================================
const PHASE_META: Record<number, { icon: typeof Layers; gradient: string; ring: string }> = {
  1: { icon: Layers, gradient: "from-violet-500 to-violet-600", ring: "ring-violet-500/30" },
  2: { icon: BookOpen, gradient: "from-fuchsia-500 to-fuchsia-600", ring: "ring-fuchsia-500/30" },
  3: { icon: Target, gradient: "from-pink-500 to-rose-500", ring: "ring-pink-500/30" },
  4: { icon: Repeat, gradient: "from-amber-500 to-orange-500", ring: "ring-amber-500/30" },
  5: { icon: Timer, gradient: "from-emerald-500 to-teal-500", ring: "ring-emerald-500/30" },
  6: { icon: Rocket, gradient: "from-cyan-500 to-fuchsia-500", ring: "ring-cyan-500/30" },
};

// ============================================================
// Main component
// ============================================================
export function PreparationSimulator() {
  const { call } = useApi();
  const setContext = useAppStore((s) => s.setContext);
  const saveItem = useAppStore((s) => s.saveItem);

  // form state
  const [targetExam, setTargetExam] = useState("SSC CGL");
  const [examDate, setExamDate] = useState(defaultDate(90));
  const [currentLevel, setCurrentLevel] = useState<Level>("Beginner");
  const [availableHoursPerDay, setAvailableHoursPerDay] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(6);
  const [subjects, setSubjects] = useState("Quantitative Aptitude, Reasoning, English, General Awareness");
  const [strongSubjects, setStrongSubjects] = useState("General Awareness");
  const [weakSubjects, setWeakSubjects] = useState("Quantitative Aptitude");
  const [targetScore, setTargetScore] = useState("180/200");
  const [previousPreparation, setPreviousPreparation] = useState("");
  const [multiExamStatus, setMultiExamStatus] = useState("");

  // result state
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PreparationPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // replan state
  const [missedDays, setMissedDays] = useState(3);
  const [replanStrategy, setReplanStrategy] = useState<ReplanStrategy>("compress");
  const [replanning, setReplanning] = useState(false);

  const daysToExam = useMemo(() => daysFromToday(examDate), [examDate]);

  const buildPayload = useCallback(
    (overrides?: Partial<{ adaptiveNote: string; examDate: string; availableHoursPerDay: number; daysPerWeek: number }>) => {
      return {
        targetExam,
        examDate: overrides?.examDate ?? examDate,
        currentLevel,
        availableHoursPerDay: overrides?.availableHoursPerDay ?? availableHoursPerDay,
        daysPerWeek: overrides?.daysPerWeek ?? daysPerWeek,
        subjects: parseList(subjects),
        strongSubjects: parseList(strongSubjects),
        weakSubjects: parseList(weakSubjects),
        previousPreparation,
        targetScore,
        multiExamStatus,
        adaptiveNote: overrides?.adaptiveNote,
      };
    },
    [targetExam, examDate, currentLevel, availableHoursPerDay, daysPerWeek, subjects, strongSubjects, weakSubjects, previousPreparation, targetScore, multiExamStatus]
  );

  async function simulate(payload: ReturnType<typeof buildPayload>, label: string) {
    setLoading(true);
    setError(null);
    const res = await call<{ plan: PreparationPlan } | { error: string }>(
      "/api/preparation/simulate",
      payload
    );
    setLoading(false);
    if (!res) return;
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setPlan(res.plan);
    setContext(`Preparation: ${res.plan.targetExam}`, "preparation");
    toast.success(label, {
      description: `${res.plan.totalDays} days · ${res.plan.phases.length} phases · ${res.plan.dailyPlans.length} sample days`,
    });
  }

  function applyPreset(p: (typeof QUICK_PRESETS)[number]) {
    setTargetExam(p.targetExam);
    setExamDate(defaultDate(p.offsetDays));
    setAvailableHoursPerDay(p.hours);
    setDaysPerWeek(p.daysPerWeek);
    setCurrentLevel(p.currentLevel);
    setSubjects(p.subjects);
    setStrongSubjects(p.strong);
    setWeakSubjects(p.weak);
    setTargetScore(p.targetScore);
    toast.success("Preset applied", { description: p.label });
  }

  async function handleReplan() {
    if (!plan) return;
    setReplanning(true);
    setError(null);
    try {
      let payload = buildPayload();
      const note = `Student missed approximately ${missedDays} days of preparation. Strategy: ${replanStrategy}. Dependency order, weak areas, target score, and remaining syllabus MUST be preserved. Re-balance the remaining phases and daily plans to recover gracefully.`;
      if (replanStrategy === "compress") {
        payload = buildPayload({ adaptiveNote: note, daysPerWeek: Math.min(7, daysPerWeek + 1) });
      } else if (replanStrategy === "extend") {
        const extended = defaultDate(daysToExam + Math.max(missedDays, 7));
        payload = buildPayload({ adaptiveNote: note, examDate: extended });
        setExamDate(extended);
      } else if (replanStrategy === "increase") {
        const newH = Math.min(12, availableHoursPerDay + 1);
        setAvailableHoursPerDay(newH);
        payload = buildPayload({ adaptiveNote: note, availableHoursPerDay: newH });
      } else {
        // redistribute — keep everything, just request rebalancing
        payload = buildPayload({ adaptiveNote: note });
      }
      await simulate(payload, "Preparation replanned");
    } finally {
      setReplanning(false);
    }
  }

  function saveToResearch() {
    if (!plan) return;
    saveItem({
      type: "preparation",
      title: `${plan.targetExam} plan`,
      summary: `${plan.totalDays} days · ${plan.availableHoursPerDay}h/day`,
      data: plan,
    });
    toast.success("Saved to My Research", {
      description: `${plan.targetExam} · ${plan.totalDays} days · ${plan.availableHoursPerDay}h/day`,
    });
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15 border border-violet-500/20">
            <CalendarRange className="h-5 w-5 text-violet-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              AI Preparation Simulator
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Build and adapt your 6-phase preparation journey with realistic daily plans that respect your actual available time.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Configuration form */}
      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/[0.03] to-transparent">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-violet-500" />
            Configure your preparation context
          </CardTitle>
          <CardDescription>
            Every plan is adapted to your exact time budget. Be honest with your hours/day — the simulator will match it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset chips */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Quick presets
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-300 transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of inputs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Target exam" icon={Target}>
              <Input
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                placeholder="e.g. SSC CGL"
              />
            </Field>

            <Field label="Exam date" icon={CalendarClock}>
              <Input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {daysToExam > 0 ? `${daysToExam} days from now` : daysToExam === 0 ? "today" : `${Math.abs(daysToExam)} days ago`}
              </p>
            </Field>

            <Field label="Current level" icon={Gauge}>
              <Select value={currentLevel} onValueChange={(v) => setCurrentLevel(v as Level)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Available hours / day" icon={Clock}>
              <Input
                type="number"
                min={1}
                max={14}
                step={0.5}
                value={availableHoursPerDay}
                onChange={(e) => setAvailableHoursPerDay(Number(e.target.value) || 1)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Daily plans will match this budget exactly.
              </p>
            </Field>

            <Field label="Study days / week" icon={CalendarRange}>
              <Input
                type="number"
                min={1}
                max={7}
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value) || 1)}
              />
            </Field>

            <Field label="Target score" icon={Flag}>
              <Input
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                placeholder="e.g. 180/200"
              />
            </Field>

            <Field label="Subjects (comma-separated)" icon={Layers}>
              <Input
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                placeholder="Quant, Reasoning, English..."
              />
            </Field>

            <Field label="Strong subjects" icon={TrendingUp}>
              <Input
                value={strongSubjects}
                onChange={(e) => setStrongSubjects(e.target.value)}
                placeholder="Subjects you're good at"
              />
            </Field>

            <Field label="Weak subjects" icon={AlertTriangle}>
              <Input
                value={weakSubjects}
                onChange={(e) => setWeakSubjects(e.target.value)}
                placeholder="Subjects you struggle with"
              />
            </Field>

            <Field label="Multi-exam context" icon={Compass} className="sm:col-span-2 lg:col-span-1">
              <Input
                value={multiExamStatus}
                onChange={(e) => setMultiExamStatus(e.target.value)}
                placeholder='e.g. "Also preparing for Banking PO"'
              />
            </Field>

            <div className="sm:col-span-2 lg:col-span-2">
              <Field label="Previous preparation (what have you already studied?)" icon={BookOpen}>
                <Textarea
                  value={previousPreparation}
                  onChange={(e) => setPreviousPreparation(e.target.value)}
                  placeholder="e.g. I've completed basic Quant up to Percentages, English grammar basics, and read NCERT Polity once..."
                  className="min-h-20 resize-y"
                />
              </Field>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              onClick={() => simulate(buildPayload(), "Preparation simulated")}
              disabled={loading || !targetExam.trim() || !examDate}
              className="gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-md shadow-violet-500/20"
            >
              {loading ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Simulating...
                </>
              ) : (
                <>
                  <CalendarRange className="h-3.5 w-3.5" /> Simulate Preparation
                </>
              )}
            </Button>
            {plan && (
              <Button variant="outline" onClick={saveToResearch} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> Save to My Research
              </Button>
            )}
            {plan && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPlan(null);
                  setError(null);
                }}
                className="ml-auto"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && !plan && (
        <Card>
          <CardContent className="p-6">
            <LoadingState label="Designing your 6-phase journey — sequencing foundations, generating realistic daily plans, and adapting to your time budget..." />
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-rose-600 dark:text-rose-400">Could not simulate preparation</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => simulate(buildPayload(), "Preparation simulated")}
                className="mt-3 h-7 gap-1.5"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !plan && !error && (
        <EmptyState
          icon={ListChecks}
          title="No preparation plan yet"
          description="Configure your context above and hit Simulate. ExamIntel will produce a 6-phase journey with day-by-day plans matched to your exact hours/day, plus revision and mock-test schedules."
        />
      )}

      {/* Result */}
      {!loading && plan && <PlanView plan={plan} onReplan={() => {}} />}

      {/* Adaptive replanning panel */}
      {!loading && plan && (
        <AdaptiveReplanPanel
          missedDays={missedDays}
          setMissedDays={setMissedDays}
          replanStrategy={replanStrategy}
          setReplanStrategy={setReplanStrategy}
          onReplan={handleReplan}
          replanning={replanning}
        />
      )}
    </div>
  );
}

// ============================================================
// Field wrapper
// ============================================================
function Field({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}

// ============================================================
// Plan View
// ============================================================
function PlanView({ plan, onReplan: _onReplan }: { plan: PreparationPlan; onReplan: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* 1. Overview card */}
      <OverviewCard plan={plan} />

      {/* 2. 6-Phase journey */}
      <PhaseJourney phases={plan.phases} />

      {/* 3. Daily plans */}
      <DailyPlansCard plan={plan} />

      {/* 4. Strong vs Weak subjects */}
      <StrongWeakCard plan={plan} />

      {/* 5. Revision & Mock test schedules */}
      <SchedulesCard plan={plan} />

      {/* 6. Adaptive notes */}
      <AdaptiveNotesCard notes={plan.adaptiveNotes} />

      {/* 7. Sources */}
      <SourcesCard sources={plan.sources} />
    </motion.div>
  );
}

// ============================================================
// 1. Overview card
// ============================================================
function OverviewCard({ plan }: { plan: PreparationPlan }) {
  const daysLeft = daysFromToday(plan.examDate);
  const items: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }[] = [
    { icon: Target, label: "Target exam", value: plan.targetExam },
    { icon: CalendarClock, label: "Exam date", value: formatDate(plan.examDate) },
    { icon: Gauge, label: "Current level", value: plan.currentLevel },
    { icon: Clock, label: "Hours / day", value: `${plan.availableHoursPerDay}h` },
    { icon: CalendarRange, label: "Days / week", value: `${plan.daysPerWeek}` },
    { icon: ListChecks, label: "Total days", value: `${plan.totalDays}` },
  ];
  if (plan.targetScore) {
    items.push({ icon: Flag, label: "Target score", value: plan.targetScore });
  }
  return (
    <Card className="border-violet-500/20 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Plan overview
            </CardTitle>
            <CardDescription className="mt-1">
              Your adaptive preparation blueprint — every day below is matched to your time budget.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "gap-1",
              daysLeft > 30
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : daysLeft > 7
                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            <CalendarClock className="h-3 w-3" />
            {daysLeft > 0 ? `${daysLeft} days to exam` : daysLeft === 0 ? "exam today" : "exam passed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <it.icon className="h-3.5 w-3.5" />
                {it.label}
              </div>
              <p className="mt-1 text-sm font-semibold truncate" title={it.value}>
                {it.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 2. Phase journey (stepper)
// ============================================================
function PhaseJourney({ phases }: { phases: PreparationPhase[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-500" />
          6-Phase preparation journey
        </CardTitle>
        <CardDescription>
          Foundation → Topic completion → Practice → Revision → Mock tests → Final revision. Each phase builds on the previous.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {phases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No phases returned.</p>
        ) : (
          <ol className="relative space-y-4">
            {phases.map((p, idx) => {
              const meta = PHASE_META[p.phase] ?? PHASE_META[idx + 1] ?? PHASE_META[1];
              const Icon = meta.icon;
              return (
                <li key={p.phase} className="relative pl-12 sm:pl-14">
                  {/* connector line */}
                  {idx < phases.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[18px] sm:left-[22px] top-10 bottom-[-16px] w-px bg-gradient-to-b from-violet-500/40 to-violet-500/10"
                    />
                  )}
                  {/* phase circle */}
                  <div
                    className={cn(
                      "absolute left-0 top-0 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md ring-4",
                      meta.gradient,
                      meta.ring
                    )}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  {/* phase card */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                          Phase {p.phase}
                        </span>
                        <h3 className="text-sm font-semibold">{p.name}</h3>
                      </div>
                      <Badge variant="outline" className="gap-1 text-[11px]">
                        <Clock className="h-3 w-3" /> {p.duration}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Goal:</span> {p.goal}
                    </p>
                    {p.tasks.length > 0 && (
                      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                        {p.tasks.map((task, i) => (
                          <TaskCheckbox key={i} task={task} phaseId={p.phase} taskIdx={i} />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function TaskCheckbox({ task, phaseId, taskIdx }: { task: string; phaseId: number; taskIdx: number }) {
  const id = `phase-${phaseId}-task-${taskIdx}`;
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-2 rounded-md border border-transparent hover:border-border hover:bg-muted/30 px-2 py-1.5 cursor-pointer transition"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-3.5 w-3.5 rounded border-input accent-violet-600 cursor-pointer"
      />
      <span className="text-xs text-foreground/90">{task}</span>
    </label>
  );
}

// ============================================================
// 3. Daily plans
// ============================================================
function DailyPlansCard({ plan }: { plan: PreparationPlan }) {
  if (!plan.dailyPlans || plan.dailyPlans.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-violet-500" />
              Sample daily plans
            </CardTitle>
            <CardDescription className="mt-1">
              {plan.dailyPlans.length} representative days across phases — total hours per day match your {plan.availableHoursPerDay}h budget.
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <Clock className="h-3 w-3" /> {plan.availableHoursPerDay}h/day target
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-3 paper-palette-scroll snap-x snap-mandatory">
          {plan.dailyPlans.map((d, i) => (
            <DailyPlanCard key={i} day={d} budget={plan.availableHoursPerDay} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DailyPlanCard({ day, budget }: { day: DailyPlan; budget: number }) {
  const delta = Math.abs(day.totalHours - budget);
  const onTarget = delta <= 0.5;
  const phaseLabel = phaseForDay(day.day);
  return (
    <div
      className="snap-start shrink-0 w-72 rounded-lg border border-border bg-card p-4 hover:border-violet-500/30 transition shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 border border-violet-500/20 text-xs font-semibold text-violet-600 dark:text-violet-300">
            D{day.day}
          </div>
          <div>
            <p className="text-xs font-semibold">{formatDate(day.date)}</p>
            <p className="text-[10px] text-muted-foreground">{phaseLabel}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 text-[10px]",
            onTarget
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          )}
          title={onTarget ? "Matches daily budget" : `Off by ${delta}h`}
        >
          <Clock className="h-3 w-3" /> {day.totalHours}h
        </Badge>
      </div>

      <div className="space-y-2">
        {day.sessions.map((s, i) => (
          <div key={i} className="rounded-md border border-border bg-muted/30 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-violet-600 dark:text-violet-300 truncate">
                {s.subject}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {s.durationHours}h
              </span>
            </div>
            <p className="mt-0.5 text-xs font-medium truncate" title={s.topic}>
              {s.topic}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
              {s.activity}
            </p>
          </div>
        ))}
      </div>

      {day.notes && (
        <p className="mt-3 text-[11px] text-muted-foreground border-t border-border pt-2 italic">
          {day.notes}
        </p>
      )}
    </div>
  );
}

// Map day number → approximate phase label for visualization
function phaseForDay(dayNum: number): string {
  if (dayNum <= 14) return "Phase 1 · Foundation";
  if (dayNum <= 45) return "Phase 2 · Topic Completion";
  if (dayNum <= 75) return "Phase 3 · Practice";
  if (dayNum <= 100) return "Phase 4 · Revision";
  if (dayNum <= 120) return "Phase 5 · Mock Tests";
  return "Phase 6 · Final Revision";
}

// ============================================================
// 4. Strong vs Weak subjects
// ============================================================
function StrongWeakCard({ plan }: { plan: PreparationPlan }) {
  const strong = plan.strongSubjects ?? [];
  const weak = plan.weakSubjects ?? [];
  if (strong.length === 0 && weak.length === 0) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Strong subjects
          </CardTitle>
          <CardDescription>Leverage these — spend proportionally less time maintaining them.</CardDescription>
        </CardHeader>
        <CardContent>
          {strong.length === 0 ? (
            <p className="text-sm text-muted-foreground">No strong subjects specified.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {strong.map((s, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-3 w-3" /> {s}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-rose-500/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Weak subjects
          </CardTitle>
          <CardDescription>Front-load foundations here — your mock-test scores will swing with these.</CardDescription>
        </CardHeader>
        <CardContent>
          {weak.length === 0 ? (
            <p className="text-sm text-muted-foreground">No weak subjects specified.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {weak.map((s, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="gap-1 border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                >
                  <CircleDashed className="h-3 w-3" /> {s}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 5. Revision & Mock test schedules
// ============================================================
function SchedulesCard({ plan }: { plan: PreparationPlan }) {
  const revision = plan.revisionSchedule ?? [];
  const mocks = plan.mockTestSchedule ?? [];
  if (revision.length === 0 && mocks.length === 0) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="h-4 w-4 text-amber-500" />
            Revision schedule
          </CardTitle>
          <CardDescription>Spaced repetition — first pass within 2 days, weekly, then monthly.</CardDescription>
        </CardHeader>
        <CardContent>
          {revision.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revision schedule provided.</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto paper-palette-scroll pr-2">
              {revision.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span className="text-foreground/90">{r}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-emerald-500" />
            Mock test schedule
          </CardTitle>
          <CardDescription>Full-length simulations — spaced across Phase 5 & 6, ending 5-7 days before the exam.</CardDescription>
        </CardHeader>
        <CardContent>
          {mocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mock test schedule provided.</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto paper-palette-scroll pr-2">
              {mocks.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="text-foreground/90">{m}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 6. Adaptive notes
// ============================================================
function AdaptiveNotesCard({ notes }: { notes: string[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/[0.03] to-transparent">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-violet-500" />
          Adaptive notes
        </CardTitle>
        <CardDescription>
          How this plan was adapted to your specific profile — time budget, weak areas, dependencies, and exam proximity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {notes.map((n, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-3 flex items-start gap-2"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 border border-violet-500/20">
                <Brain className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <p className="text-xs text-foreground/90">{n}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 7. Sources
// ============================================================
function SourcesCard({ sources }: { sources: PreparationPlan["sources"] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-violet-500" />
          Sources & basis
        </CardTitle>
        <CardDescription>
          How each part of this plan was derived — user-provided profile, AI adaptive analysis, and dependency reasoning.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SourceBadgeList sources={sources} />
      </CardContent>
    </Card>
  );
}

// ============================================================
// Adaptive replanning panel
// ============================================================
function AdaptiveReplanPanel({
  missedDays,
  setMissedDays,
  replanStrategy,
  setReplanStrategy,
  onReplan,
  replanning,
}: {
  missedDays: number;
  setMissedDays: (n: number) => void;
  replanStrategy: ReplanStrategy;
  setReplanStrategy: (s: ReplanStrategy) => void;
  onReplan: () => void;
  replanning: boolean;
}) {
  return (
    <Card className="border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/5 via-violet-500/[0.03] to-transparent">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-fuchsia-500" />
          Adaptive replanning
        </CardTitle>
        <CardDescription>
          Life happens. If you missed days, ExamIntel will rebalance your plan while preserving dependency order, exam date, weak areas, and remaining syllabus.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
          <Field label="Days missed" icon={AlertTriangle}>
            <Input
              type="number"
              min={1}
              max={60}
              value={missedDays}
              onChange={(e) => setMissedDays(Math.max(1, Number(e.target.value) || 1))}
              className="w-24"
            />
          </Field>

          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
              <ArrowRight className="h-3.5 w-3.5" />
              Recovery strategy
            </label>
            <RadioGroup
              value={replanStrategy}
              onValueChange={(v) => setReplanStrategy(v as ReplanStrategy)}
              className="grid gap-2 sm:grid-cols-2"
            >
              {REPLAN_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`replan-${opt.value}`}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition",
                    replanStrategy === opt.value
                      ? "border-fuchsia-500/40 bg-fuchsia-500/10"
                      : "border-border hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5"
                  )}
                >
                  <RadioGroupItem
                    id={`replan-${opt.value}`}
                    value={opt.value}
                    className="mt-0.5 data-[state=checked]:border-fuchsia-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{opt.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-violet-500/20 bg-violet-500/5 p-2.5">
          <ShieldCheck className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Preserved on replan:</span> dependency order, exam date (unless "extend" chosen), weak subjects, target score, and remaining syllabus coverage.
          </p>
        </div>

        <Button
          onClick={onReplan}
          disabled={replanning}
          className="gap-1.5 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white shadow-md shadow-fuchsia-500/20"
        >
          {replanning ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Replanning...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" /> Replan with new strategy
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
