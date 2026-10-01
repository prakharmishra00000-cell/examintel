"use client";

// ============================================================
// OnboardingWizard — 3-step first-time setup dialog
// Auto-opens on first visit (localStorage: "examintel_onboarded"),
// saves a starter profile, then navigates to Exam Researcher.
// Violet → fuchsia gradient accents · glass-morphism · framer-motion
// ============================================================

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  GraduationCap,
  Rocket,
  Sparkles,
  Target,
  X,
} from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STORAGE_KEY = "examintel_onboarded";

const EXAM_CHIPS = [
  "SSC CGL",
  "GATE CS",
  "UPSC CSE",
  "RRB JE",
  "CAT",
  "GATE ME",
  "Banking PO",
  "Railways NTPC",
];

const HOURS_CHIPS = [2, 4, 6, 8];
const DAYS_CHIPS = [4, 5, 6, 7];
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
type Level = (typeof LEVELS)[number];

const STEP_META = [
  {
    icon: Target,
    title: "Your goal exam",
    hint: "Pick the exam you're preparing for — or type your own.",
  },
  {
    icon: Clock,
    title: "Your study capacity",
    hint: "Tell us how much time you can dedicate each week.",
  },
  {
    icon: Rocket,
    title: "Exam date & start",
    hint: "Optionally set a target date and review your starter profile.",
  },
] as const;

// Direction-aware slide variants so back/forward feel natural.
const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

export function OnboardingWizard() {
  const saveItem = useAppStore((s) => s.saveItem);
  const setContext = useAppStore((s) => s.setContext);
  const setView = useAppStore((s) => s.setView);

  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);

  // form state
  const [exam, setExam] = React.useState("");
  const [hours, setHours] = React.useState<number>(4);
  const [days, setDays] = React.useState<number>(6);
  const [level, setLevel] = React.useState<Level | "">("");
  const [examDate, setExamDate] = React.useState("");
  const [finished, setFinished] = React.useState(false);

  // Auto-open on first visit (no localStorage flag yet).
  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        t = setTimeout(() => setOpen(true), 450);
      }
    } catch {
      /* localStorage unavailable — skip auto-open */
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, []);

  const markOnboarded = React.useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const skip = React.useCallback(() => {
    markOnboarded();
    setOpen(false);
  }, [markOnboarded]);

  const handleOpenChange = (o: boolean) => {
    if (!o && !finished) {
      // user dismissed (esc / outside click / X) before finishing → skip
      skip();
    } else {
      setOpen(o);
    }
  };

  const canNext = () => {
    if (step === 0) return exam.trim().length > 0;
    if (step === 1) return hours > 0 && days > 0 && level !== "";
    return true;
  };

  const next = () => {
    setDirection(1);
    setStep((s) => Math.min(2, s + 1));
  };

  const back = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const finish = () => {
    const cleanExam = exam.trim();
    saveItem({
      type: "preparation",
      title: `Starter profile: ${cleanExam}`,
      summary: `${hours}h/day · ${days}d/week · ${level}`,
      data: {
        exam: cleanExam,
        hours,
        days,
        level,
        examDate: examDate || undefined,
        onboarded: true,
      },
    });
    markOnboarded();
    setFinished(true);
    // Brief celebratory pause, then navigate to Exam Researcher.
    window.setTimeout(() => {
      setOpen(false);
      setContext(cleanExam, "exam");
      setView("exam-researcher");
    }, 1400);
  };

  const progressValue = ((step + 1) / 3) * 100;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Mobile: full-screen.
          "top-0 left-0 translate-x-0 translate-y-0 h-[100dvh] w-screen max-w-none rounded-none gap-0 p-0 overflow-hidden border-violet-500/25 bg-background/85 backdrop-blur-xl",
          // Desktop: centered glass modal.
          "sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:rounded-3xl sm:border sm:shadow-2xl",
          "flex flex-col"
        )}
      >
        <DialogTitle className="sr-only">
          Welcome to ExamIntel — onboarding
        </DialogTitle>
        <DialogDescription className="sr-only">
          A quick 3-step setup to personalise your preparation journey.
        </DialogDescription>

        {/* Custom skip button (top-right X) */}
        <button
          type="button"
          onClick={skip}
          aria-label="Skip onboarding"
          className="absolute right-3 top-3 z-30 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:outline-none"
        >
          <X className="size-4" />
        </button>

        {/* Header — title + step counter + progress */}
        <div className="relative px-5 pt-6 pb-4 sm:px-7 sm:pt-7">
          <div className="flex items-center gap-3 pr-10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/30">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500/80">
                Step {step + 1} of 3
              </p>
              <h2 className="truncate text-base font-semibold text-foreground sm:text-lg">
                {STEP_META[step].title}
              </h2>
            </div>
          </div>
          <p className="mt-2 pr-8 text-sm text-muted-foreground">
            {STEP_META[step].hint}
          </p>
          <Progress value={progressValue} className="mt-4 h-1.5 bg-muted" />
        </div>

        {/* Body — animated step content */}
        <div className="relative flex-1 overflow-y-auto px-5 pb-5 sm:px-7">
          <AnimatePresence mode="wait" custom={direction}>
            {finished ? (
              <motion.div
                key="finished"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex min-h-[260px] flex-col items-center justify-center py-10 text-center"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 14,
                    delay: 0.05,
                  }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40"
                >
                  <Check className="size-10" strokeWidth={3} />
                </motion.div>
                <h3 className="mt-5 text-xl font-bold text-foreground">
                  You&apos;re all set!
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Taking you to Exam Researcher to deep-dive into{" "}
                  <span className="font-medium text-foreground">
                    {exam.trim()}
                  </span>
                  …
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: "easeInOut" }}
                className="py-2"
              >
                {step === 0 && (
                  <StepExam exam={exam} setExam={setExam} />
                )}
                {step === 1 && (
                  <StepCapacity
                    hours={hours}
                    setHours={setHours}
                    days={days}
                    setDays={setDays}
                    level={level}
                    setLevel={setLevel}
                  />
                )}
                {step === 2 && (
                  <StepReview
                    exam={exam.trim()}
                    hours={hours}
                    days={days}
                    level={level}
                    examDate={examDate}
                    setExamDate={setExamDate}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer — navigation */}
        {!finished && (
          <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-background/40 px-5 py-4 sm:px-7">
            <Button
              type="button"
              variant="ghost"
              onClick={back}
              disabled={step === 0}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Back
            </Button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={skip}
                className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Skip for now
              </button>
              {step < 2 ? (
                <Button
                  type="button"
                  onClick={next}
                  disabled={!canNext()}
                  className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-40"
                >
                  Next <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={finish}
                  disabled={!canNext()}
                  className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-40"
                >
                  <Rocket className="size-4" /> Start my preparation journey
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------
// Chip — quick-select pill
// ------------------------------------------------------------
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
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "border-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-fuchsia-500/20"
          : "border-border bg-background text-muted-foreground hover:border-violet-500/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------
// Step 1 — target exam
// ------------------------------------------------------------
function StepExam({
  exam,
  setExam,
}: {
  exam: string;
  setExam: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="ob-exam" className="text-sm font-medium">
          Target exam
        </Label>
        <Input
          id="ob-exam"
          value={exam}
          onChange={(e) => setExam(e.target.value)}
          placeholder="e.g. SSC CGL, GATE CS, UPSC CSE…"
          className="h-11"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Popular exams
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAM_CHIPS.map((c) => (
            <Chip
              key={c}
              active={exam.trim().toLowerCase() === c.toLowerCase()}
              onClick={() => setExam(c)}
            >
              {c}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Step 2 — study capacity
// ------------------------------------------------------------
function StepCapacity({
  hours,
  setHours,
  days,
  setDays,
  level,
  setLevel,
}: {
  hours: number;
  setHours: (n: number) => void;
  days: number;
  setDays: (n: number) => void;
  level: Level | "";
  setLevel: (l: Level) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="ob-hours"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <Clock className="size-3.5 text-violet-500" /> Hours per day
        </Label>
        <Input
          id="ob-hours"
          type="number"
          min={1}
          max={16}
          value={hours === 0 ? "" : hours}
          onChange={(e) => setHours(Number(e.target.value) || 0)}
          className="h-11"
          placeholder="e.g. 4"
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {HOURS_CHIPS.map((h) => (
            <Chip key={h} active={hours === h} onClick={() => setHours(h)}>
              {h}h
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="ob-days"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <Clock className="size-3.5 text-fuchsia-500" /> Days per week
        </Label>
        <Input
          id="ob-days"
          type="number"
          min={1}
          max={7}
          value={days === 0 ? "" : days}
          onChange={(e) => setDays(Number(e.target.value) || 0)}
          className="h-11"
          placeholder="e.g. 6"
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {DAYS_CHIPS.map((d) => (
            <Chip key={d} active={days === d} onClick={() => setDays(d)}>
              {d}d
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="ob-level"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <GraduationCap className="size-3.5 text-violet-500" /> Current level
        </Label>
        <Select value={level || undefined} onValueChange={(v) => setLevel(v as Level)}>
          <SelectTrigger id="ob-level" className="h-11 w-full">
            <SelectValue placeholder="Select your level" />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Step 3 — exam date (optional) + summary review
// ------------------------------------------------------------
function StepReview({
  exam,
  hours,
  days,
  level,
  examDate,
  setExamDate,
}: {
  exam: string;
  hours: number;
  days: number;
  level: Level | "";
  examDate: string;
  setExamDate: (v: string) => void;
}) {
  const prettyDate = examDate
    ? new Date(examDate + "T00:00:00").toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="ob-date"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <Target className="size-3.5 text-violet-500" /> Target exam date{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="ob-date"
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          className="h-11"
        />
      </div>

      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500/80">
          Your starter profile
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <SummaryTile label="Exam" value={exam || "—"} />
          <SummaryTile label="Level" value={level || "—"} />
          <SummaryTile label="Capacity" value={`${hours}h / day`} />
          <SummaryTile label="Cadence" value={`${days}d / week`} />
        </div>
        {prettyDate && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2 text-xs">
            <Target className="size-3.5 text-fuchsia-500" />
            <span className="text-muted-foreground">Target date:</span>
            <span className="font-medium text-foreground">{prettyDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/60 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}
