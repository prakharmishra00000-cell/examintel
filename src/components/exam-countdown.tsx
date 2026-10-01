"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { differenceInCalendarDays, format, addDays, parseISO, startOfDay } from "date-fns";
import {
  CalendarClock,
  Target,
  Flag,
  AlarmClock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  Pencil,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCountdownStore, type ExamCountdown } from "@/store/countdown-store";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

type UrgencyLevel = "low" | "medium" | "high" | "critical";

interface UrgencyStyle {
  level: UrgencyLevel;
  border: string;
  glow: string;
  chipBg: string;
  chipText: string;
  ring: string;
  pulse: boolean;
  label: string;
}

function getUrgency(daysRemaining: number): UrgencyStyle {
  if (daysRemaining < 0) {
    return {
      level: "critical",
      border: "border-rose-500/60",
      glow: "shadow-rose-500/20",
      chipBg: "bg-rose-500/15",
      chipText: "text-rose-600 dark:text-rose-300",
      ring: "from-rose-500 to-rose-400",
      pulse: true,
      label: "Exam day",
    };
  }
  if (daysRemaining < 7) {
    return {
      level: "critical",
      border: "border-rose-500/60",
      glow: "shadow-rose-500/20",
      chipBg: "bg-rose-500/15",
      chipText: "text-rose-600 dark:text-rose-300",
      ring: "from-rose-500 to-rose-400",
      pulse: true,
      label: "Final stretch",
    };
  }
  if (daysRemaining < 30) {
    return {
      level: "high",
      border: "border-rose-500/40",
      glow: "shadow-rose-500/10",
      chipBg: "bg-rose-500/10",
      chipText: "text-rose-600 dark:text-rose-300",
      ring: "from-rose-500 to-fuchsia-500",
      pulse: false,
      label: "Crunch time",
    };
  }
  if (daysRemaining <= 60) {
    return {
      level: "medium",
      border: "border-amber-500/40",
      glow: "shadow-amber-500/10",
      chipBg: "bg-amber-500/10",
      chipText: "text-amber-600 dark:text-amber-300",
      ring: "from-amber-500 to-orange-400",
      pulse: false,
      label: "Accelerate",
    };
  }
  return {
    level: "low",
    border: "border-violet-500/40",
    glow: "shadow-violet-500/10",
    chipBg: "bg-violet-500/10",
    chipText: "text-violet-600 dark:text-violet-300",
    ring: "from-violet-500 to-fuchsia-500",
    pulse: false,
    label: "On track",
  };
}

function getMilestones(daysRemaining: number): string[] {
  if (daysRemaining < 7) return ["Light revision only", "Sleep well", "Exam logistics"];
  if (daysRemaining < 30) return ["Daily mocks", "Weak area crash course", "Formula revision", "Exam strategy"];
  if (daysRemaining <= 90) return ["Intensive practice", "Weak area focus", "Full mocks", "Final revision"];
  return ["Foundation phase", "Topic completion", "Practice phase", "Mock tests", "Final revision"];
}

interface MilestoneSuggestion {
  name: string;
  targetDate: Date;
  isPast: boolean;
}

function buildMilestones(countdown: ExamCountdown, daysRemaining: number): MilestoneSuggestion[] {
  const names = getMilestones(daysRemaining);
  const examDate = parseISO(countdown.examDate);
  const createdAt = parseISO(countdown.createdAt);
  // Span from creation to exam; fall back to remaining span if invalid.
  let span = differenceInCalendarDays(examDate, createdAt);
  if (!Number.isFinite(span) || span <= 0) span = Math.max(1, daysRemaining);
  const N = names.length;
  const today = startOfDay(new Date());
  return names.map((name, i) => {
    const offset = Math.round((span * (N - i)) / (N + 1));
    const targetDate = addDays(examDate, -offset);
    const targetDay = startOfDay(targetDate);
    // "Done" = the target day has fully passed (strictly before today).
    const done = differenceInCalendarDays(today, targetDay) > 0;
    return {
      name,
      targetDate,
      isPast: done,
    };
  });
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

// ----------------------------------------------------------------
// Empty / setup state — compact card with a small form
// ----------------------------------------------------------------

function EmptyCountdown() {
  const setCountdown = useCountdownStore((s) => s.setCountdown);
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetScore, setTargetScore] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = examName.trim();
    if (!name) {
      setError("Enter an exam name");
      return;
    }
    if (!examDate) {
      setError("Pick an exam date");
      return;
    }
    setError(null);
    setCountdown({
      examName: name,
      examDate: new Date(examDate).toISOString(),
      targetScore: targetScore.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent">
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Set your exam date</CardTitle>
            <CardDescription>Get a live countdown and auto-suggested prep milestones</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ec-exam-name" className="text-xs text-muted-foreground">
                Exam name
              </Label>
              <Input
                id="ec-exam-name"
                placeholder="e.g. GATE CS 2026"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-exam-date" className="text-xs text-muted-foreground">
                Exam date
              </Label>
              <Input
                id="ec-exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-target-score" className="text-xs text-muted-foreground">
              Target score <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Input
              id="ec-target-score"
              placeholder="e.g. 95 percentile, AIR 100, 700+"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              autoComplete="off"
            />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-rose-500">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-fuchsia-500" /> Milestones auto-tailored to your timeline
            </p>
            <Button
              type="submit"
              size="sm"
              className="ml-auto gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600 shadow-sm shadow-fuchsia-500/20"
            >
              <Plus className="h-3.5 w-3.5" /> Set countdown
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------
// Countdown unit box — gradient-bordered glass tile
// ----------------------------------------------------------------

function CountdownUnit({ value, label, ring }: { value: number; label: string; ring: string }) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${ring} p-px shadow-sm`}>
      <div className="rounded-[11px] bg-background/85 backdrop-blur-sm px-1 py-2.5 sm:py-3 text-center">
        <div className="text-2xl sm:text-3xl font-bold tabular-nums leading-none tracking-tight">
          {pad(value)}
        </div>
        <div className="mt-1 text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Edit dialog
// ----------------------------------------------------------------

function EditFormBody({
  current,
  onSaved,
  onCancel,
}: {
  current: ExamCountdown;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const setCountdown = useCountdownStore((s) => s.setCountdown);
  // This body is re-mounted by Radix each time the Dialog opens, so the
  // useState initializers always reflect the latest `current` value —
  // no useEffect re-sync needed.
  const [examName, setExamName] = useState(current.examName);
  const [examDate, setExamDate] = useState(format(parseISO(current.examDate), "yyyy-MM-dd"));
  const [targetScore, setTargetScore] = useState(current.targetScore ?? "");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const name = examName.trim();
    if (!name || !examDate) return;
    setCountdown({
      examName: name,
      examDate: new Date(examDate).toISOString(),
      targetScore: targetScore.trim() || undefined,
      // preserve original creation timestamp so progress bar stays accurate
      createdAt: current.createdAt,
    });
    onSaved();
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 pt-1">
      <div className="space-y-1.5">
        <Label htmlFor="ec-edit-name" className="text-xs text-muted-foreground">
          Exam name
        </Label>
        <Input id="ec-edit-name" value={examName} onChange={(e) => setExamName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ec-edit-date" className="text-xs text-muted-foreground">
          Exam date
        </Label>
        <Input id="ec-edit-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ec-edit-score" className="text-xs text-muted-foreground">
          Target score <span className="text-muted-foreground/60">(optional)</span>
        </Label>
        <Input
          id="ec-edit-score"
          value={targetScore}
          onChange={(e) => setTargetScore(e.target.value)}
          placeholder="e.g. AIR 100"
        />
      </div>
      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600"
        >
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditDialog({
  open,
  onOpenChange,
  current,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current: ExamCountdown;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-violet-500" /> Edit exam countdown
          </DialogTitle>
          <DialogDescription>Update your exam name, date, or target score.</DialogDescription>
        </DialogHeader>
        <EditFormBody current={current} onSaved={() => onOpenChange(false)} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------
// Active countdown — premium glass card
// ----------------------------------------------------------------

function ActiveCountdown({ countdown }: { countdown: ExamCountdown }) {
  const setCountdown = useCountdownStore((s) => s.setCountdown);
  const [now, setNow] = useState<Date>(() => new Date());
  const [editOpen, setEditOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Live countdown — tick every second
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const examDate = useMemo(() => parseISO(countdown.examDate), [countdown.examDate]);
  const createdAt = useMemo(() => parseISO(countdown.createdAt), [countdown.createdAt]);

  const diffMs = examDate.getTime() - now.getTime();
  const examDay = diffMs <= 0;
  const totalMs = Math.max(1, examDate.getTime() - createdAt.getTime());
  const elapsedMs = Math.min(totalMs, Math.max(0, now.getTime() - createdAt.getTime()));
  const progressPct = Math.round((elapsedMs / totalMs) * 100);

  const daysRemaining = differenceInCalendarDays(examDate, now);
  const urgency = getUrgency(daysRemaining);

  const days = Math.max(0, Math.floor(diffMs / 86_400_000));
  const hours = Math.max(0, Math.floor((diffMs % 86_400_000) / 3_600_000));
  const minutes = Math.max(0, Math.floor((diffMs % 3_600_000) / 60_000));
  const seconds = Math.max(0, Math.floor((diffMs % 60_000) / 1_000));

  const milestones = useMemo(
    () => buildMilestones(countdown, Math.max(0, daysRemaining)),
    [countdown, daysRemaining]
  );
  const completedCount = milestones.filter((m) => m.isPast).length;

  function handleClear() {
    setCountdown(null);
    setConfirmClear(false);
  }

  return (
    <>
      <Card
        className={`relative overflow-hidden ${urgency.border} ${urgency.glow} shadow-md bg-gradient-to-br from-background via-background to-violet-500/[0.04] backdrop-blur-sm`}
      >
        {/* Decorative gradient blobs */}
        <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />

        <CardHeader className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${urgency.ring} text-white shadow-sm ${
                  urgency.pulse ? "animate-pulse" : ""
                }`}
              >
                <AlarmClock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg truncate">{countdown.examName}</CardTitle>
                <CardDescription className="flex items-center gap-1.5 flex-wrap">
                  <CalendarClock className="h-3 w-3" />
                  {format(examDate, "EEE, d MMM yyyy")}
                  {countdown.targetScore ? (
                    <Badge variant="outline" className="gap-1 ml-1 text-[10px]">
                      <Target className="h-3 w-3" /> {countdown.targetScore}
                    </Badge>
                  ) : null}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setEditOpen(true)}
                aria-label="Edit countdown"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                onClick={() => setConfirmClear(true)}
                aria-label="Clear countdown"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          {/* Urgency chip */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${urgency.chipBg} ${urgency.chipText}`}
            >
              {urgency.level === "critical" ? (
                <AlertCircle className="h-3 w-3" />
              ) : urgency.level === "high" ? (
                <Hourglass className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              {examDay ? "Exam day — all the best!" : urgency.label}
            </span>
            {!examDay && (
              <span className="text-[11px] text-muted-foreground">
                {daysRemaining === 0
                  ? "Today is the day"
                  : daysRemaining === 1
                  ? "1 day remaining"
                  : `${daysRemaining} days remaining`}
              </span>
            )}
          </div>

          {/* Live countdown grid */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <CountdownUnit value={days} label="Days" ring={urgency.ring} />
            <CountdownUnit value={hours} label="Hours" ring={urgency.ring} />
            <CountdownUnit value={minutes} label="Minutes" ring={urgency.ring} />
            <CountdownUnit value={seconds} label="Seconds" ring={urgency.ring} />
          </div>

          {/* Progress bar — % of time elapsed from creation to exam */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> Prep timeline
              </span>
              <span className="font-medium tabular-nums">{progressPct}% elapsed</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${urgency.ring}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Started {format(createdAt, "d MMM")}</span>
              <span>{format(examDate, "d MMM yyyy")}</span>
            </div>
          </div>

          {/* Milestone suggestions */}
          <div className="rounded-xl border border-border/60 bg-background/60 backdrop-blur-sm p-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-xs font-semibold">Suggested milestones</span>
              </div>
              <Badge variant="secondary" className="text-[10px] gap-1">
                <CheckCircle2 className="h-3 w-3" /> {completedCount}/{milestones.length} done
              </Badge>
            </div>
            <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1 paper-palette-scroll">
              {milestones.map((m, i) => (
                <li
                  key={m.name}
                  className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-xs transition ${
                    m.isPast
                      ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                      : "border-border/50 bg-background/40"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      m.isPast
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                        : "bg-violet-500/15 text-violet-600 dark:text-violet-300"
                    }`}
                  >
                    {m.isPast ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className={`flex-1 truncate ${m.isPast ? "text-muted-foreground line-through" : "font-medium"}`}>
                    {m.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {format(m.targetDate, "d MMM")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <EditDialog open={editOpen} onOpenChange={setEditOpen} current={countdown} />

      {/* Clear confirmation dialog */}
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-500" /> Clear countdown?
            </DialogTitle>
            <DialogDescription>
              This will remove your exam countdown and milestone suggestions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmClear(false)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={handleClear}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------------------
// Main exported widget
// ----------------------------------------------------------------

// Lint-compliant "is client" guard — returns false during SSR and the first
// client render, then true. Avoids setState-in-effect by using
// useSyncExternalStore with different server/client snapshots.
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ExamCountdown() {
  const countdown = useCountdownStore((s) => s.countdown);
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);

  if (!mounted) {
    // Minimal skeleton to avoid SSR/CSR hydration mismatch from persisted store
    return (
      <Card className="border-violet-500/20">
        <CardContent className="p-6">
          <div className="h-32 animate-pulse rounded-lg bg-muted/40" />
        </CardContent>
      </Card>
    );
  }

  return countdown ? <ActiveCountdown countdown={countdown} /> : <EmptyCountdown />;
}
