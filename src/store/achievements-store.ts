"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { useStudyStore, type StudySession } from "@/store/study-store";
import { useJournalStore, type JournalEntry } from "@/store/journal-store";
import { useFlashcardStore } from "@/store/flashcard-store";
import { useCountdownStore } from "@/store/countdown-store";

// ============================================================
// Achievements & Stats store — gamification layer
// Separate zustand store persisted to localStorage under
// "examintel-achievements". Tracks 17 badges across 5
// categories (starter / practice / consistency / mastery /
// explorer), total XP, and derived level
//   level = floor(totalXp / 100) + 1
// The `recompute(stats)` action is idempotent — XP is only
// ever summed from currently-unlocked achievements, so it
// cannot be double-awarded.
// ============================================================

export type AchievementCategory =
  | "starter"
  | "practice"
  | "consistency"
  | "mastery"
  | "explorer";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name (mapped in the view)
  category: AchievementCategory;
  xp: number; // XP awarded when unlocked
  unlocked: boolean;
  unlockedAt?: string; // ISO timestamp
  progress?: number; // 0-100 for partial progress display
}

export interface AchievementStats {
  savedCount: number;
  studySessions: number;
  journalEntries: number;
  flashcardSets: number;
  streakDays: number;
  masteredCards: number;
  papersGenerated: number;
  examsResearched: number;
  hasCountdown: boolean;
  hasPlan: boolean;
  // ---- extended (derived from saved item types + other stores) ----
  questionsExplained: number;
  questionsEvolved: number;
  mcqSets: number;
  featuresUsed: number; // distinct core features touched (max 13)
}

interface AchievementsState {
  achievements: Achievement[];
  totalXp: number;
  level: number; // derived: floor(totalXp / 100) + 1
  recompute: (stats: AchievementStats) => void;
}

// ---- Seed: 17 achievements across 5 categories ----
const SEED: Achievement[] = [
  // Starter
  {
    id: "first-steps",
    title: "First Steps",
    description: "Set your exam countdown",
    icon: "Calendar",
    category: "starter",
    xp: 50,
    unlocked: false,
  },
  {
    id: "exam-explorer",
    title: "Exam Explorer",
    description: "Research your first exam",
    icon: "Search",
    category: "starter",
    xp: 50,
    unlocked: false,
  },
  {
    id: "plan-maker",
    title: "Plan Maker",
    description: "Create a preparation plan",
    icon: "CalendarRange",
    category: "starter",
    xp: 75,
    unlocked: false,
  },
  // Practice
  {
    id: "paper-power",
    title: "Paper Power",
    description: "Generate your first question paper",
    icon: "FileStack",
    category: "practice",
    xp: 75,
    unlocked: false,
  },
  {
    id: "question-master",
    title: "Question Master",
    description: "Explain 5 questions with the AI",
    icon: "HelpCircle",
    category: "practice",
    xp: 100,
    unlocked: false,
  },
  {
    id: "evolution-engineer",
    title: "Evolution Engineer",
    description: "Evolve a question into 5 variants",
    icon: "Repeat2",
    category: "practice",
    xp: 75,
    unlocked: false,
  },
  {
    id: "mcq-machine",
    title: "MCQ Machine",
    description: "Generate your first MCQ set",
    icon: "ListChecks",
    category: "practice",
    xp: 75,
    unlocked: false,
  },
  {
    id: "flashcard-fan",
    title: "Flashcard Fan",
    description: "Create your first flashcard set",
    icon: "Layers",
    category: "practice",
    xp: 75,
    unlocked: false,
  },
  // Consistency
  {
    id: "week-warrior",
    title: "Week Warrior",
    description: "Maintain a 7-day study streak",
    icon: "Flame",
    category: "consistency",
    xp: 150,
    unlocked: false,
  },
  {
    id: "fortnight-hero",
    title: "Fortnight Hero",
    description: "Maintain a 14-day study streak",
    icon: "TrendingUp",
    category: "consistency",
    xp: 250,
    unlocked: false,
  },
  {
    id: "monthly-master",
    title: "Monthly Master",
    description: "Maintain a 30-day study streak",
    icon: "Calendar",
    category: "consistency",
    xp: 500,
    unlocked: false,
  },
  {
    id: "journal-keeper",
    title: "Journal Keeper",
    description: "Write 7 journal entries",
    icon: "BookOpen",
    category: "consistency",
    xp: 100,
    unlocked: false,
  },
  // Mastery
  {
    id: "card-master",
    title: "Card Master",
    description: "Master 10 flashcards",
    icon: "Award",
    category: "mastery",
    xp: 200,
    unlocked: false,
  },
  {
    id: "scholar",
    title: "Scholar",
    description: "Master 50 flashcards",
    icon: "Crown",
    category: "mastery",
    xp: 500,
    unlocked: false,
  },
  {
    id: "paper-pro",
    title: "Paper Pro",
    description: "Generate 10 question papers",
    icon: "FileText",
    category: "mastery",
    xp: 300,
    unlocked: false,
  },
  // Explorer
  {
    id: "tool-explorer",
    title: "Tool Explorer",
    description: "Use 5 different features",
    icon: "Sparkles",
    category: "explorer",
    xp: 150,
    unlocked: false,
  },
  {
    id: "completionist",
    title: "Completionist",
    description: "Use all 13 core features",
    icon: "Trophy",
    category: "explorer",
    xp: 500,
    unlocked: false,
  },
];

// ---- Criteria evaluator ----
function evaluate(id: string, s: AchievementStats): { unlocked: boolean; progress: number } {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const ratio = (n: number, d: number) => clamp((n / d) * 100);
  const once = (n: number) => clamp(n * 100); // 1 = 100%
  switch (id) {
    case "first-steps":
      return { unlocked: s.hasCountdown, progress: s.hasCountdown ? 100 : 0 };
    case "exam-explorer":
      return { unlocked: s.examsResearched >= 1, progress: once(s.examsResearched) };
    case "plan-maker":
      return { unlocked: s.hasPlan, progress: s.hasPlan ? 100 : 0 };
    case "paper-power":
      return { unlocked: s.papersGenerated >= 1, progress: once(s.papersGenerated) };
    case "question-master":
      return { unlocked: s.questionsExplained >= 5, progress: ratio(s.questionsExplained, 5) };
    case "evolution-engineer":
      return { unlocked: s.questionsEvolved >= 1, progress: once(s.questionsEvolved) };
    case "mcq-machine":
      return { unlocked: s.mcqSets >= 1, progress: once(s.mcqSets) };
    case "flashcard-fan":
      return { unlocked: s.flashcardSets >= 1, progress: once(s.flashcardSets) };
    case "week-warrior":
      return { unlocked: s.streakDays >= 7, progress: ratio(s.streakDays, 7) };
    case "fortnight-hero":
      return { unlocked: s.streakDays >= 14, progress: ratio(s.streakDays, 14) };
    case "monthly-master":
      return { unlocked: s.streakDays >= 30, progress: ratio(s.streakDays, 30) };
    case "journal-keeper":
      return { unlocked: s.journalEntries >= 7, progress: ratio(s.journalEntries, 7) };
    case "card-master":
      return { unlocked: s.masteredCards >= 10, progress: ratio(s.masteredCards, 10) };
    case "scholar":
      return { unlocked: s.masteredCards >= 50, progress: ratio(s.masteredCards, 50) };
    case "paper-pro":
      return { unlocked: s.papersGenerated >= 10, progress: ratio(s.papersGenerated, 10) };
    case "tool-explorer":
      return { unlocked: s.featuresUsed >= 5, progress: ratio(s.featuresUsed, 5) };
    case "completionist":
      return { unlocked: s.featuresUsed >= 13, progress: ratio(s.featuresUsed, 13) };
    default:
      return { unlocked: false, progress: 0 };
  }
}

// ---- Streak calculator (consecutive active days ending today/yesterday) ----
function computeStreak(entries: JournalEntry[], sessions: StudySession[]): number {
  const days = new Set<string>();
  const norm = (iso: string) => {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };
  entries.forEach((e) => days.add(e.date.slice(0, 10)));
  sessions.forEach((s) => days.add(norm(s.date)));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = today.toISOString().slice(0, 10);

  // Grace: streak counts if today OR yesterday was active (today not yet started)
  let cursor = new Date(today);
  if (!days.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
  }

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ---- Stats computation (reads from all feature stores) ----
export function computeAchievementStats(): AchievementStats {
  const saved = useAppStore.getState().saved;
  const sessions = useStudyStore.getState().sessions;
  const entries = useJournalStore.getState().entries;
  const sets = useFlashcardStore.getState().sets;
  const countdown = useCountdownStore.getState().countdown;

  const masteredCards = sets.reduce(
    (sum, s) => sum + s.cards.filter((c) => c.mastery === "Mastered").length,
    0
  );

  // distinct features used (max 13): 10 saved-item types + flashcards + journal + study-timer
  const used = new Set<string>(saved.map((s) => s.type));
  if (sets.length > 0) used.add("flashcards");
  if (entries.length > 0) used.add("journal");
  if (sessions.length > 0) used.add("study-timer");

  return {
    savedCount: saved.length,
    studySessions: sessions.length,
    journalEntries: entries.length,
    flashcardSets: sets.length,
    streakDays: computeStreak(entries, sessions),
    masteredCards,
    papersGenerated: saved.filter((s) => s.type === "paper").length,
    examsResearched: saved.filter((s) => s.type === "exam").length,
    hasCountdown: countdown !== null,
    hasPlan: saved.some((s) => s.type === "preparation" || s.type === "multi-exam"),
    questionsExplained: saved.filter((s) => s.type === "explanation").length,
    questionsEvolved: saved.filter((s) => s.type === "evolution").length,
    mcqSets: saved.filter((s) => s.type === "mcq").length,
    featuresUsed: used.size,
  };
}

// ---- Hook: subscribe to all source stores and recompute on change ----
// Mount this in any component that displays achievements (widget + view)
// to keep XP / level / unlocked state live.
export function useRecomputeAchievements() {
  const saved = useAppStore((s) => s.saved);
  const sessions = useStudyStore((s) => s.sessions);
  const entries = useJournalStore((s) => s.entries);
  const sets = useFlashcardStore((s) => s.sets);
  const countdown = useCountdownStore((s) => s.countdown);
  const recompute = useAchievementsStore((s) => s.recompute);

  useEffect(() => {
    recompute(computeAchievementStats());
  }, [saved, sessions, entries, sets, countdown, recompute]);
}

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      achievements: SEED.map((a) => ({ ...a })),
      totalXp: 0,
      level: 1,
      recompute: (stats) => {
        const now = new Date().toISOString();
        const current = get().achievements;
        let totalChanged = false;
        const updated = current.map((a) => {
          const { unlocked, progress } = evaluate(a.id, stats);
          if (unlocked) {
            if (a.unlocked) {
              // already unlocked — refresh progress only (no XP re-award)
              return a.progress === 100
                ? a
                : { ...a, progress: 100 };
            }
            // newly unlocked
            totalChanged = true;
            return { ...a, unlocked: true, unlockedAt: now, progress: 100 };
          }
          // not unlocked — update partial progress
          return a.progress === progress ? a : { ...a, progress };
        });
        if (!totalChanged) {
          // progress may have changed even if no new unlocks
          const changed = updated.some((a, i) => a !== current[i]);
          if (!changed) return;
        }
        const totalXp = updated
          .filter((a) => a.unlocked)
          .reduce((sum, a) => sum + a.xp, 0);
        const level = Math.floor(totalXp / 100) + 1;
        set({ achievements: updated, totalXp, level });
      },
    }),
    {
      name: "examintel-achievements",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage)
      ),
      partialize: (s) => ({
        achievements: s.achievements,
        totalXp: s.totalXp,
        level: s.level,
      }),
    }
  )
);
