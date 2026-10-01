"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Timer,
  Play,
  Pause,
  Square,
  RotateCcw,
  Flame,
  Clock,
  Calendar,
  Plus,
  Trash2,
  Trophy,
  Brain,
  Coffee,
  CheckCircle2,
  SkipForward,
} from "lucide-react";

import { useStudyStore, type StudySession } from "@/store/study-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// ----- Constants ---------------------------------------------------------

const POMODORO_WORK = 25 * 60; // seconds
const POMODORO_BREAK = 5 * 60; // seconds

type Mode = "pomodoro" | "free";
type Phase = "work" | "break";

// ----- Helpers -----------------------------------------------------------

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** Local YYYY-MM-DD key for a date. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Get the Monday of the week containing `d` (local). */
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon = 0 ... Sun = 6
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ----- Sound (Web Audio) -------------------------------------------------

let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const Ctor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      audioCtx = Ctor ? new Ctor() : null;
    } catch {
      audioCtx = null;
    }
  }
  return audioCtx;
}

function playBeep(freq = 880, durationMs = 320) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  } catch {
    /* ignore */
  }
}

function playChime() {
  playBeep(880, 240);
  setTimeout(() => playBeep(1175, 320), 220);
}

// ----- Stats -------------------------------------------------------------
function computeStreaks(sessions: StudySession[]) {
  const completed = sessions.filter((s) => s.completed);
  const daySet = new Set(completed.map((s) => dayKey(new Date(s.date))));

  let current = 0;
  // Walk backwards from today; allow today to be empty (streak still alive)
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // If today has no session, start checking from yesterday for "current"
  let probe = new Date(cursor);
  if (!daySet.has(dayKey(probe))) {
    probe.setDate(probe.getDate() - 1);
  }
  while (daySet.has(dayKey(probe))) {
    current += 1;
    probe.setDate(probe.getDate() - 1);
  }

  // Longest streak: walk all distinct sorted days
  const sortedDays = Array.from(daySet).sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of sortedDays) {
    const d = new Date(k + "T00:00:00");
    if (prev) {
      const diffDays = Math.round(
        (d.getTime() - prev.getTime()) / 86400000
      );
      if (diffDays === 1) run += 1;
      else run = 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest, totalSessions: completed.length };
}

function computeWeek(sessions: StudySession[]) {
  const weekStart = startOfWeek(new Date());
  const totals = [0, 0, 0, 0, 0, 0, 0];
  let weekMinutes = 0;
  for (const s of sessions) {
    if (!s.completed) continue;
    const d = new Date(s.date);
    const diffDays = Math.floor(
      (startOfWeek(d).getTime() - weekStart.getTime()) / 86400000
    );
    if (diffDays === 0) {
      const idx = (d.getDay() + 6) % 7;
      totals[idx] += s.durationMinutes;
      weekMinutes += s.durationMinutes;
    }
  }
  return { totals, weekMinutes };
}

// ----- Main component ----------------------------------------------------

export function StudyTimer() {
  const sessions = useStudyStore((s) => s.sessions);
  const addSession = useStudyStore((s) => s.addSession);
  const deleteSession = useStudyStore((s) => s.deleteSession);

  // form / subject tagging
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");

  // timer mode
  const [mode, setMode] = useState<Mode>("pomodoro");
  const [phase, setPhase] = useState<Phase>("work");
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_WORK);
  const [running, setRunning] = useState(false);
  // free-timer custom minutes
  const [freeMinutes, setFreeMinutes] = useState(45);
  const [freeInput, setFreeInput] = useState("45");

  // confetti burst
  const [burst, setBurst] = useState(false);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // interval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- total seconds for current timer (for progress ring) ----
  const totalSeconds = useMemo(() => {
    if (mode === "pomodoro") return phase === "work" ? POMODORO_WORK : POMODORO_BREAK;
    return Math.max(1, Math.min(180, freeMinutes)) * 60;
  }, [mode, phase, freeMinutes]);

  // NOTE: secondsLeft is reset in event handlers (onModeChange, handleSkip,
  // handleReset, applyFreeMinutes, handleComplete) — no useEffect needed.

  // ---- cleanup on unmount ----
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (burstTimer.current) clearTimeout(burstTimer.current);
    };
  }, []);

  // ---- save a work session ----
  const saveWorkSession = useCallback(
    (durationMinutes: number, m: Mode, subj: string, top: string) => {
      addSession({
        subject: subj.trim() || "Untitled",
        topic: top.trim() || "General",
        durationMinutes,
        date: new Date().toISOString(),
        mode: m,
        completed: true,
      });
    },
    [addSession]
  );

  // ---- trigger completion: sound + toast + burst ----
  const celebrate = useCallback((msg: string) => {
    playChime();
    setBurst(true);
    if (burstTimer.current) clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(() => setBurst(false), 1800);
    toast.success(msg, {
      description: "Great focus — session saved to your history.",
      duration: 4000,
    });
  }, []);

  // ---- handle phase completion ----
  const handleComplete = useCallback(() => {
    if (mode === "pomodoro") {
      if (phase === "work") {
        // Save the work session
        saveWorkSession(25, "pomodoro", subject, topic);
        celebrate("Pomodoro complete! Time for a 5-min break.");
        setPhase("break");
        setSecondsLeft(POMODORO_BREAK);
        // keep running so break auto-starts
      } else {
        // Break finished — back to work, auto pause
        playBeep(660, 200);
        toast.info("Break over. Ready for the next pomodoro?", {
          duration: 4000,
        });
        setPhase("work");
        setSecondsLeft(POMODORO_WORK);
        setRunning(false);
      }
    } else {
      // Free timer complete
      const mins = Math.max(1, Math.min(180, freeMinutes));
      saveWorkSession(mins, "free", subject, topic);
      celebrate(`Focus session complete — ${mins} min logged!`);
      setRunning(false);
      setSecondsLeft(mins * 60);
    }
  }, [mode, phase, subject, topic, freeMinutes, saveWorkSession, celebrate]);

  // ---- interval effect ----
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // we'll handle completion in the next tick to avoid setState-in-callback warning
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [running]);

  // watch for hitting zero while running
  useEffect(() => {
    if (running && secondsLeft === 0) {
      // Defer completion to escape the effect body (avoids
      // cascading renders & setState-in-effect lint rule).
      const id = setTimeout(() => handleComplete(), 0);
      return () => clearTimeout(id);
    }
  }, [secondsLeft, running, handleComplete]);

  // ---- controls ----
  const canStart =
    subject.trim().length > 0 && (mode === "pomodoro" || freeMinutes >= 1);

  const toggleRun = () => {
    if (!canStart) {
      toast.error("Add a subject first", {
        description: "Tag every focus session with a subject + topic.",
      });
      return;
    }
    // resume audio context on user gesture
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") void ctx.resume();
    setRunning((r) => !r);
  };

  const handleReset = () => {
    setRunning(false);
    if (mode === "pomodoro") {
      setPhase("work");
      setSecondsLeft(POMODORO_WORK);
    } else {
      const m = Math.max(1, Math.min(180, freeMinutes));
      setSecondsLeft(m * 60);
    }
  };

  const handleSkip = () => {
    if (mode === "pomodoro") {
      if (phase === "work") {
        // Skipping work does NOT save (no completion)
        setPhase("break");
        setSecondsLeft(POMODORO_BREAK);
      } else {
        setPhase("work");
        setSecondsLeft(POMODORO_WORK);
        setRunning(false);
      }
    } else {
      setRunning(false);
      const m = Math.max(1, Math.min(180, freeMinutes));
      setSecondsLeft(m * 60);
    }
  };

  const onModeChange = (m: string) => {
    setRunning(false);
    const next = m as Mode;
    setMode(next);
    if (next === "pomodoro") {
      setPhase("work");
      setSecondsLeft(POMODORO_WORK);
    } else {
      const mn = Math.max(1, Math.min(180, freeMinutes));
      setSecondsLeft(mn * 60);
    }
  };

  const applyFreeMinutes = () => {
    const n = parseInt(freeInput, 10);
    if (isNaN(n) || n < 1) {
      toast.error("Enter a number between 1 and 180");
      return;
    }
    const clamped = Math.max(1, Math.min(180, n));
    setFreeMinutes(clamped);
    setFreeInput(String(clamped));
    if (!running) setSecondsLeft(clamped * 60);
  };

  // ---- derived stats ----
  const streaks = useMemo(() => computeStreaks(sessions), [sessions]);
  const week = useMemo(() => computeWeek(sessions), [sessions]);
  const maxDay = Math.max(1, ...week.totals);

  const todayKey = dayKey(new Date());
  const todaySessions = useMemo(
    () => sessions.filter((s) => dayKey(new Date(s.date)) === todayKey),
    [sessions, todayKey]
  );
  const recentSessions = useMemo(() => sessions.slice(0, 20), [sessions]);

  // ---- progress for ring ----
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const ringGradient =
    phase === "work"
      ? "url(#gradViolet)"
      : "url(#gradEmerald)";

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Study Timer
            </h1>
            <p className="text-sm text-muted-foreground">
              Focus sessions with Pomodoro. Track streaks. Build consistency.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ---------------- LEFT: timer ---------------- */}
        <Card className="lg:col-span-2 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-violet-500" /> Focus Engine
            </CardTitle>
            <CardDescription>
              Tag each session with a subject + topic, then start the timer.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Subject + Topic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="study-subject">Subject</Label>
                <Input
                  id="study-subject"
                  placeholder="e.g. Quantitative Aptitude"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="study-topic">Topic</Label>
                <Input
                  id="study-topic"
                  placeholder="e.g. Time, Speed & Distance"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={80}
                />
              </div>
            </div>

            {/* Mode tabs */}
            <Tabs value={mode} onValueChange={onModeChange}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="pomodoro" className="gap-1.5">
                  <Timer className="h-3.5 w-3.5" /> Pomodoro (25/5)
                </TabsTrigger>
                <TabsTrigger value="free" className="gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Free Timer
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pomodoro" className="mt-4 space-y-4">
                <PhaseRing
                  secondsLeft={secondsLeft}
                  totalSeconds={totalSeconds}
                  phase={phase}
                  ringGradient={ringGradient}
                  dashOffset={dashOffset}
                  circumference={circumference}
                  radius={radius}
                />
                <PhaseSwitcher phase={phase} onSkip={handleSkip} />
              </TabsContent>

              <TabsContent value="free" className="mt-4 space-y-4">
                <div className="flex justify-center items-center gap-2">
                  <Label htmlFor="free-min" className="text-xs text-muted-foreground m-0">
                    Minutes
                  </Label>
                  <Input
                    id="free-min"
                    type="number"
                    min={1}
                    max={180}
                    value={freeInput}
                    onChange={(e) => setFreeInput(e.target.value)}
                    onBlur={applyFreeMinutes}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applyFreeMinutes();
                    }}
                    className="w-24 text-center"
                  />
                  <span className="text-xs text-muted-foreground">
                    (1–180)
                  </span>
                </div>
                <PhaseRing
                  secondsLeft={secondsLeft}
                  totalSeconds={totalSeconds}
                  phase={"work"}
                  ringGradient={ringGradient}
                  dashOffset={dashOffset}
                  circumference={circumference}
                  radius={radius}
                  freeLabel={`${freeMinutes} min focus`}
                />
              </TabsContent>
            </Tabs>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="lg"
                onClick={toggleRun}
                disabled={mode === "pomodoro" && phase === "break" ? false : !canStart}
                className={`h-11 px-6 text-sm font-semibold text-white shadow-lg transition-all ${
                  running
                    ? "bg-gradient-to-r from-rose-500 to-orange-500 shadow-rose-500/30"
                    : "bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-violet-500/30"
                }`}
              >
                {running ? (
                  <>
                    <Pause className="h-4 w-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Start
                  </>
                )}
              </Button>
              <Button variant="outline" size="lg" onClick={handleReset} className="h-11">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
              <Button variant="outline" size="lg" onClick={handleSkip} className="h-11">
                <SkipForward className="h-4 w-4" /> Skip
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {mode === "pomodoro"
                ? phase === "work"
                  ? "25 min focus → 5 min break, auto-cycles."
                  : "On break. Skip back to work anytime."
                : `Custom focus: ${freeMinutes} min. Auto-saves on completion.`}
            </p>
          </CardContent>

          {/* Emoji burst overlay */}
          <AnimatePresence>
            {burst && (
              <motion.div
                key="burst"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {["🎉", "⭐", "🔥", "✨", "💯", "🚀", "🧠"].map((e, i) => (
                  <motion.span
                    key={i}
                    className="absolute text-3xl sm:text-4xl"
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                    animate={{
                      x: (i - 3) * 70,
                      y: -120 - (i % 3) * 30,
                      opacity: [0, 1, 0],
                      scale: 1.2,
                      rotate: (i - 3) * 20,
                    }}
                    transition={{ duration: 1.6, delay: i * 0.05 }}
                  >
                    {e}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* ---------------- RIGHT: stats + history ---------------- */}
        <div className="space-y-4">
          {/* Streak card */}
          <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent">
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-2xl" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-4 w-4 text-amber-500" /> Streak Power
              </CardTitle>
              <CardDescription>Consistency compounds. Keep it lit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold leading-none bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                  {streaks.current}
                </span>
                <span className="text-sm text-muted-foreground mb-1">day streak</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border bg-background/50 p-2">
                  <div className="text-lg font-semibold">{streaks.longest}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Longest
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background/50 p-2">
                  <div className="text-lg font-semibold">{streaks.totalSessions}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Sessions
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background/50 p-2">
                  <div className="text-lg font-semibold">{week.weekMinutes}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    This Week
                  </div>
                </div>
              </div>
              {streaks.current >= 3 && (
                <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {streaks.current}-day streak — you&apos;re on fire!
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add manual session */}
          <ManualSessionDialog onAdd={addSession} />

          {/* Today's sessions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-violet-500" /> Today&apos;s Sessions
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {todaySessions.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {todaySessions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No sessions yet today. Start your first pomodoro above.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 study-scroll">
                  {todaySessions.map((s) => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      onDelete={() => deleteSession(s.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-violet-500" /> This Week
              </CardTitle>
              <CardDescription>Minutes studied per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-1.5 h-32">
                {week.totals.map((min, i) => {
                  const h = Math.round((min / maxDay) * 100);
                  const isToday =
                    dayKey(new Date()) ===
                    dayKey(
                      new Date(
                        startOfWeek(new Date()).getTime() + i * 86400000
                      )
                    );
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div className="text-[10px] text-muted-foreground h-3">
                        {min > 0 ? min : ""}
                      </div>
                      <div className="w-full h-20 flex items-end">
                        <motion.div
                          className={`w-full rounded-t-md ${
                            isToday
                              ? "bg-gradient-to-t from-fuchsia-500 to-violet-400"
                              : "bg-gradient-to-t from-violet-500/40 to-violet-400/30"
                          }`}
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(4, h)}%` }}
                          transition={{ duration: 0.4, delay: i * 0.05 }}
                        />
                      </div>
                      <div
                        className={`text-[10px] ${
                          isToday
                            ? "font-semibold text-violet-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {DAY_LABELS[i]}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Total: {week.weekMinutes} min</span>
                <span>Goal: 150 min/day</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent sessions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Sessions</CardTitle>
              <CardDescription>Last 20 across all days</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {recentSessions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Your study history will appear here.
                </p>
              ) : (
                <ScrollArea className="h-64 pr-3">
                  <div className="space-y-2">
                    {recentSessions.map((s) => (
                      <SessionRow
                        key={s.id}
                        session={s}
                        onDelete={() => deleteSession(s.id)}
                        showDate
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <style jsx global>{`
        .study-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .study-scroll::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}

// ----- Subcomponents -----------------------------------------------------

function PhaseRing({
  secondsLeft,
  totalSeconds,
  phase,
  ringGradient,
  dashOffset,
  circumference,
  radius,
  freeLabel,
}: {
  secondsLeft: number;
  totalSeconds: number;
  phase: Phase;
  ringGradient: string;
  dashOffset: number;
  circumference: number;
  radius: number;
  freeLabel?: string;
}) {
  const pct =
    totalSeconds > 0 ? Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100) : 0;
  const isWork = phase === "work";
  return (
    <div className="relative mx-auto flex h-[260px] w-[260px] items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 260 260">
        <defs>
          <linearGradient id="gradViolet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
          <linearGradient id="gradEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle
          cx="130"
          cy="130"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-border"
        />
        {/* progress */}
        <circle
          cx="130"
          cy="130"
          r={radius}
          fill="none"
          stroke={ringGradient}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        <span
          className={`text-[10px] uppercase tracking-[0.2em] font-semibold ${
            isWork ? "text-violet-500" : "text-emerald-500"
          }`}
        >
          {freeLabel ? "Free Focus" : isWork ? "Work" : "Break"}
        </span>
        <span className="mt-1 text-5xl font-bold tabular-nums tracking-tight">
          {fmt(secondsLeft)}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">{pct}% complete</span>
      </div>
    </div>
  );
}

function PhaseSwitcher({
  phase,
  onSkip,
}: {
  phase: Phase;
  onSkip: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Badge
        variant="outline"
        className={`gap-1.5 ${
          phase === "work"
            ? "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        }`}
      >
        {phase === "work" ? (
          <>
            <Brain className="h-3 w-3" /> Work phase
          </>
        ) : (
          <>
            <Coffee className="h-3 w-3" /> Break phase
          </>
        )}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={onSkip}
        className="h-7 text-xs"
      >
        {phase === "work" ? (
          <>
            <SkipForward className="h-3 w-3" /> Skip to break
          </>
        ) : (
          <>
            <SkipForward className="h-3 w-3" /> Skip to work
          </>
        )}
      </Button>
    </div>
  );
}

function SessionRow({
  session,
  onDelete,
  showDate,
}: {
  session: StudySession;
  onDelete: () => void;
  showDate?: boolean;
}) {
  const d = new Date(session.date);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = d.toLocaleDateString([], { month: "short", day: "numeric" });
  return (
    <div className="group flex items-start gap-2 rounded-lg border border-border p-2.5 hover:bg-accent/40 transition">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
          session.mode === "pomodoro"
            ? "bg-violet-500/15 text-violet-500"
            : "bg-fuchsia-500/15 text-fuchsia-500"
        }`}
      >
        {session.completed ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <Square className="h-3.5 w-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{session.subject}</p>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {showDate ? dateStr : time}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{session.topic}</p>
          <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
            <Clock className="h-3 w-3" /> {session.durationMinutes}m
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <Badge
            variant="outline"
            className={`text-[9px] ${
              session.mode === "pomodoro"
                ? "border-violet-500/30 text-violet-600 dark:text-violet-300"
                : "border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-300"
            }`}
          >
            {session.mode}
          </Badge>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition"
        onClick={onDelete}
        aria-label="Delete session"
      >
        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  );
}

function ManualSessionDialog({
  onAdd,
}: {
  onAdd: (s: Omit<StudySession, "id">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("25");
  const [mode, setMode] = useState<"pomodoro" | "free">("pomodoro");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  });

  const reset = () => {
    setSubject("");
    setTopic("");
    setDuration("25");
    setMode("pomodoro");
  };

  const handleAdd = () => {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    const mins = parseInt(duration, 10);
    if (isNaN(mins) || mins < 1 || mins > 600) {
      toast.error("Duration must be 1–600 minutes");
      return;
    }
    const iso = new Date(date + "T" + new Date().toTimeString().slice(0, 8)).toISOString();
    onAdd({
      subject: subject.trim(),
      topic: topic.trim() || "General",
      durationMinutes: mins,
      date: iso,
      mode,
      completed: true,
    });
    toast.success("Manual session added");
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-1.5">
          <Plus className="h-4 w-4" /> Add manual session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a past study session</DialogTitle>
          <DialogDescription>
            Track sessions you completed offline — yesterday&apos;s revision, last
            weekend&apos;s mock, etc.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="m-subject">Subject</Label>
            <Input
              id="m-subject"
              placeholder="e.g. General Studies"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-topic">Topic</Label>
            <Input
              id="m-topic"
              placeholder="e.g. Indian Polity — Fundamental Rights"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-duration">Duration (min)</Label>
              <Input
                id="m-duration"
                type="number"
                min={1}
                max={600}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-date">Date</Label>
              <Input
                id="m-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-mode">Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "pomodoro" | "free")}>
              <SelectTrigger id="m-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pomodoro">Pomodoro</SelectItem>
                <SelectItem value="free">Free timer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleAdd}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
          >
            <Plus className="h-4 w-4" /> Add session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
