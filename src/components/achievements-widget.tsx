"use client";

import { motion } from "framer-motion";
import { Trophy, ArrowRight, Zap, Star, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import {
  useAchievementsStore,
  useRecomputeAchievements,
} from "@/store/achievements-store";
import { CATEGORY_COLORS, ACHIEVEMENT_ICONS } from "@/lib/achievements-helpers";
import { cn } from "@/lib/utils";

// Compact Achievements dashboard widget: level circle + XP bar + 3 recent badges.
// Calls `useRecomputeAchievements()` so XP/level stays live whenever any
// source store (saved / study / journal / flashcards / countdown) changes.
export function AchievementsWidget() {
  // Subscribe to source stores + recompute on change
  useRecomputeAchievements();

  const setView = useAppStore((s) => s.setView);
  const achievements = useAchievementsStore((s) => s.achievements);
  const totalXp = useAchievementsStore((s) => s.totalXp);
  const level = useAchievementsStore((s) => s.level);

  // XP into current level + progress to next level
  const xpIntoLevel = totalXp % 100;
  const xpToNext = 100;
  const pct = Math.round((xpIntoLevel / xpToNext) * 100);

  // 3 most-recently-unlocked badges
  const recent = [...achievements]
    .filter((a) => a.unlocked && a.unlockedAt)
    .sort((a, b) => (a.unlockedAt! < b.unlockedAt! ? 1 : -1))
    .slice(0, 3);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/[0.04] to-transparent">
      {/* Decorative glow blobs */}
      <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />

      <CardHeader className="relative flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-500" /> Achievements
          </CardTitle>
          <CardDescription className="text-[11px]">
            {unlockedCount}/{achievements.length} badges unlocked
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView("achievements")}
          className="gap-1.5 text-violet-500 hover:text-violet-400"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="relative space-y-4">
        <div className="flex items-center gap-4">
          {/* Level circle */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-60" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/85 backdrop-blur-sm">
                <div className="text-center leading-none">
                  <div className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    Lvl
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-gradient-violet">
                    {level}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* XP + progress */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">
                Level {level}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {xpIntoLevel}/{xpToNext} XP to Level {level + 1}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              />
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Zap className="h-3 w-3 text-amber-500" />
              <span className="tabular-nums">{totalXp.toLocaleString()} total XP</span>
            </div>
          </div>
        </div>

        {/* Recent badges */}
        {recent.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground shrink-0">
              Recent
            </span>
            <div className="flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
              {recent.map((a) => {
                const Icon = ACHIEVEMENT_ICONS[a.icon] ?? Sparkles;
                const c = CATEGORY_COLORS[a.category];
                return (
                  <div
                    key={a.id}
                    title={`${a.title} — +${a.xp} XP`}
                    className="group flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background/60 py-1 pl-1 pr-2.5"
                  >
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm",
                        c.grad
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-medium truncate max-w-[80px]">
                      {a.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <span>No badges yet — research an exam or set a countdown to unlock your first!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
