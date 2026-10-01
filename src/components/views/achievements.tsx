"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Zap,
  Flame,
  BookOpen,
  Save,
  Timer,
  Layers,
  Award,
  Lock,
  CheckCircle2,
  Sparkles,
  Crown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";
import { useStudyStore } from "@/store/study-store";
import { useJournalStore } from "@/store/journal-store";
import { useFlashcardStore } from "@/store/flashcard-store";
import { useCountdownStore } from "@/store/countdown-store";
import {
  useAchievementsStore,
  useRecomputeAchievements,
  computeAchievementStats,
  type Achievement,
  type AchievementCategory,
} from "@/store/achievements-store";
import { AnimatedCounter } from "@/components/shared/premium-empty-state";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  ACHIEVEMENT_ICONS,
} from "@/lib/achievements-helpers";
import { cn } from "@/lib/utils";

// ============================================================
// Achievements & Stats view — gamification surface
// Header → Level badge + XP + progress + unlocked count
// Stats grid (6 cards w/ AnimatedCounter)
// Recently unlocked (last 3, celebratory)
// Achievements grouped by category (5 sections)
// Locked = grayscale Lock; Unlocked = gradient glow
// ============================================================

export function Achievements() {
  // Subscribe to all source stores + recompute on change
  useRecomputeAchievements();

  const setView = useAppStore((s) => s.setView);
  const achievements = useAchievementsStore((s) => s.achievements);
  const totalXp = useAchievementsStore((s) => s.totalXp);
  const level = useAchievementsStore((s) => s.level);

  // Live stats for the 6-card grid (read directly from source stores)
  const saved = useAppStore((s) => s.saved);
  const sessions = useStudyStore((s) => s.sessions);
  const entries = useJournalStore((s) => s.entries);
  const sets = useFlashcardStore((s) => s.sets);
  const countdown = useCountdownStore((s) => s.countdown);

  const stats = useMemo(() => computeAchievementStats(), [saved, sessions, entries, sets, countdown]);

  const xpIntoLevel = totalXp % 100;
  const pct = Math.round((xpIntoLevel / 100) * 100);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  // Recently unlocked (last 3) — celebratory showcase
  const recent = useMemo(
    () =>
      [...achievements]
        .filter((a) => a.unlocked && a.unlockedAt)
        .sort((a, b) => (a.unlockedAt! < b.unlockedAt! ? 1 : -1))
        .slice(0, 3),
    [achievements]
  );

  // Grouped by category
  const grouped = useMemo(() => {
    const m = new Map<AchievementCategory, Achievement[]>();
    for (const cat of CATEGORY_ORDER) m.set(cat, []);
    for (const a of achievements) {
      const arr = m.get(a.category);
      if (arr) arr.push(a);
    }
    return m;
  }, [achievements]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Achievements & Stats</h1>
          <Badge variant="secondary" className="gap-1">
            <Trophy className="h-3 w-3 text-amber-500" /> Gamified
          </Badge>
        </div>
        <p className="mt-1.5 text-muted-foreground">
          Level up your preparation. Unlock badges, earn XP, and track your growth.
        </p>
      </motion.div>

      {/* Top: Level + XP + progress + unlocked count */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.03 }}
      >
        <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/[0.05] to-transparent">
          <div className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
          <CardContent className="relative p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Large level badge */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-lg opacity-70" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-xl shadow-violet-500/30">
                  <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full bg-background/85 backdrop-blur-sm">
                    <div className="text-center leading-none">
                      <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Level
                      </div>
                      <div className="mt-0.5 text-4xl font-bold tabular-nums text-gradient-violet">
                        {level}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* XP + progress */}
              <div className="min-w-0 flex-1 w-full">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <AnimatedCounter value={totalXp} className="tabular-nums" /> Total XP
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Level {level} · {xpIntoLevel}/100 XP to Level {level + 1}
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Award className="h-3 w-3 text-amber-500" />
                    {unlockedCount}/{achievements.length} unlocked
                  </Badge>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats grid (6 cards w/ AnimatedCounter) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={Save} label="Saved Items" value={stats.savedCount} accent="violet" />
        <StatCard icon={Timer} label="Study Sessions" value={stats.studySessions} accent="amber" />
        <StatCard icon={BookOpen} label="Journal Entries" value={stats.journalEntries} accent="emerald" />
        <StatCard icon={Layers} label="Flashcard Sets" value={stats.flashcardSets} accent="rose" />
        <StatCard icon={Flame} label="Current Streak" value={stats.streakDays} suffix="d" accent="rose" />
        <StatCard icon={Crown} label="Mastered Cards" value={stats.masteredCards} accent="amber" />
      </div>

      {/* Recently unlocked (celebratory) */}
      {recent.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-fuchsia-500/[0.04] to-transparent">
            <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-amber-500" /> Recently Unlocked
              </CardTitle>
              <CardDescription>Your freshest wins</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recent.map((a, i) => {
                  const Icon = ACHIEVEMENT_ICONS[a.icon] ?? Sparkles;
                  const c = CATEGORY_COLORS[a.category];
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.06 * i }}
                      className={cn(
                        "relative overflow-hidden rounded-xl border bg-background/60 p-3.5",
                        c.border
                      )}
                    >
                      <div className={cn("pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-25 blur-2xl", c.grad)} />
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", c.grad)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{a.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{a.description}</div>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Zap className="h-3 w-3 text-amber-500" /> +{a.xp} XP
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {a.unlockedAt ? new Date(a.unlockedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Achievements grouped by category */}
      {CATEGORY_ORDER.map((cat) => {
        const list = grouped.get(cat) ?? [];
        if (list.length === 0) return null;
        const c = CATEGORY_COLORS[cat];
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn("h-1.5 w-8 rounded-full bg-gradient-to-r", c.grad)} />
              <h2 className="text-sm font-semibold uppercase tracking-wide">{CATEGORY_LABELS[cat]}</h2>
              <span className="text-[11px] text-muted-foreground">
                {list.filter((a) => a.unlocked).length}/{list.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((a, i) => (
                <AchievementCard key={a.id} achievement={a} index={i} />
              ))}
            </div>
          </div>
        );
      })}

      {/* CTA back to dashboard */}
      <Card className="border-dashed">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <TrendingUp className="h-5 w-5 text-violet-500" />
          <div className="flex-1">
            <p className="font-medium text-sm">Keep going — every action earns XP</p>
            <p className="text-xs text-muted-foreground">
              Research exams, generate papers, explain questions, build flashcards, keep a daily journal — all unlock badges and push you toward the next level.
            </p>
          </div>
          <button
            onClick={() => setView("dashboard")}
            className="text-xs text-violet-500 hover:text-violet-400 underline-offset-2 hover:underline"
          >
            Back to dashboard
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Stats card with AnimatedCounter ----
function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  accent,
}: {
  icon: typeof Save;
  label: string;
  value: number;
  suffix?: string;
  accent: "violet" | "amber" | "emerald" | "rose" | "sky";
}) {
  const accents: Record<string, { grad: string; text: string; bg: string }> = {
    violet: { grad: "from-violet-500 to-fuchsia-500", text: "text-violet-500", bg: "bg-violet-500/10" },
    amber: { grad: "from-amber-500 to-orange-500", text: "text-amber-500", bg: "bg-amber-500/10" },
    emerald: { grad: "from-emerald-500 to-teal-500", text: "text-emerald-500", bg: "bg-emerald-500/10" },
    rose: { grad: "from-rose-500 to-pink-500", text: "text-rose-500", bg: "bg-rose-500/10" },
    sky: { grad: "from-sky-500 to-cyan-500", text: "text-sky-500", bg: "bg-sky-500/10" },
  };
  const a = accents[accent];
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white", a.grad)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <AnimatedCounter
            value={value}
            className={cn("text-2xl font-bold tabular-nums", a.text)}
          />
          {suffix && <span className={cn("text-sm font-semibold", a.text)}>{suffix}</span>}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

// ---- Achievement card (locked / unlocked + progress) ----
function AchievementCard({ achievement: a, index }: { achievement: Achievement; index: number }) {
  const Icon = ACHIEVEMENT_ICONS[a.icon] ?? Sparkles;
  const c = CATEGORY_COLORS[a.category];
  const unlocked = a.unlocked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.4) }}
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 transition",
        unlocked
          ? cn(c.border, "bg-gradient-to-br from-background via-background to-transparent shadow-md", c.glow)
          : "border-border bg-muted/30"
      )}
    >
      {/* Subtle shine on unlocked */}
      {unlocked && (
        <>
          <div className={cn("pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br opacity-20 blur-2xl", c.grad)} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent" />
        </>
      )}

      <div className="relative flex items-start gap-3">
        {/* Icon */}
        {unlocked ? (
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", c.grad)}>
            <Icon className="h-5 w-5" />
          </div>
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground">
            <Lock className="h-5 w-5" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={cn("text-sm font-semibold leading-tight truncate", !unlocked && "text-muted-foreground")}>
                {a.title}
              </h3>
              <p className={cn("text-[11px] leading-snug mt-0.5", unlocked ? "text-muted-foreground" : "text-muted-foreground/80")}>
                {a.description}
              </p>
            </div>
            <Badge
              variant={unlocked ? "default" : "outline"}
              className={cn(
                "shrink-0 gap-1 text-[10px]",
                unlocked && cn("bg-gradient-to-r text-white border-transparent", c.grad)
              )}
            >
              <Zap className="h-3 w-3" /> {a.xp}
            </Badge>
          </div>

          {/* Progress bar (locked + partial) OR unlocked indicator */}
          {unlocked ? (
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Unlocked</span>
              {a.unlockedAt && (
                <span className="text-muted-foreground">
                  · {new Date(a.unlockedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>
          ) : a.progress !== undefined && a.progress > 0 ? (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Progress</span>
                <span className="tabular-nums">{a.progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r transition-all", c.grad)}
                  style={{ width: `${a.progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
              <Lock className="h-3 w-3" />
              <span>Not started</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
