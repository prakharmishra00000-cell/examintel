"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================================
// Daily Goals store — client-side, persisted to localStorage
// under "examintel-goals". Tracks per-day study targets
// (minutes / questions / topics) + completion + streaks.
// Streak is computed (consecutive completed days ending today
// or yesterday, with a one-day grace window). Kept in a
// SEPARATE store so the shared `app-store.ts` infra is touched
// minimally (ViewKey only).
// ============================================================

export interface DailyGoal {
  id: string;
  date: string; // YYYY-MM-DD
  minutesGoal: number; // study minutes target
  questionsGoal: number; // questions to attempt
  topicsGoal: number; // distinct topics to study
  minutesDone: number;
  questionsDone: number;
  topicsDone: number;
  completed: boolean;
}

interface RecomputeStats {
  totalMinutesToday: number;
  questionsAttemptedToday: number;
  topicsStudiedToday: number;
}

interface GoalsState {
  goals: DailyGoal[];
  defaultMinutes: number; // default 120
  defaultQuestions: number; // default 20
  defaultTopics: number; // default 3
  streak: number; // computed: consecutive completed days ending today or yesterday
  setDefaults: (m: number, q: number, t: number) => void;
  getTodayGoal: () => DailyGoal | undefined;
  ensureTodayGoal: () => DailyGoal; // create if missing
  updateTodayTargets: (
    patch: Partial<Pick<DailyGoal, "minutesGoal" | "questionsGoal" | "topicsGoal">>
  ) => void;
  updateProgress: (
    minutesAdded: number,
    questionsAdded: number,
    topicsAdded: number
  ) => void;
  recomputeFromStores: (stats: RecomputeStats) => void;
  clearAll: () => void;
}

// ---------- Helpers ----------

function todayKey(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function isGoalComplete(g: DailyGoal): boolean {
  return (
    g.minutesDone >= g.minutesGoal &&
    g.questionsDone >= g.questionsGoal &&
    g.topicsDone >= g.topicsGoal
  );
}

function withCompletion(g: DailyGoal): DailyGoal {
  const complete = isGoalComplete(g);
  return g.completed === complete ? g : { ...g, completed: complete };
}

function newGoal(
  date: string,
  m: number,
  q: number,
  t: number
): DailyGoal {
  return {
    id: `goal_${date}_${Math.random().toString(36).slice(2, 6)}`,
    date,
    minutesGoal: Math.max(1, Math.round(m)),
    questionsGoal: Math.max(1, Math.round(q)),
    topicsGoal: Math.max(1, Math.round(t)),
    minutesDone: 0,
    questionsDone: 0,
    topicsDone: 0,
    completed: false,
  };
}

// Streak: consecutive completed days ending today or yesterday (grace).
// If today is not completed, look at yesterday; if yesterday is also
// not completed, streak is 0. Otherwise, walk backwards counting
// consecutive completed days.
function computeStreak(goals: DailyGoal[]): number {
  const map = new Map<string, boolean>();
  for (const g of goals) map.set(g.date, g.completed);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const cursor = new Date(today);
  if (!map.get(todayStr)) {
    // Grace: streak survives if yesterday was completed
    cursor.setDate(cursor.getDate() - 1);
    const yStr = cursor.toISOString().slice(0, 10);
    if (!map.get(yStr)) return 0;
  }

  let streak = 0;
  while (true) {
    const k = cursor.toISOString().slice(0, 10);
    if (!map.get(k)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Longest run of consecutive completed days across the entire goals array.
export function computeLongestStreak(goals: DailyGoal[]): number {
  const completedDates = Array.from(
    new Set(goals.filter((g) => g.completed).map((g) => g.date))
  ).sort();
  if (completedDates.length === 0) return 0;
  let longest = 1;
  let run = 1;
  for (let i = 1; i < completedDates.length; i++) {
    const prev = new Date(completedDates[i - 1] + "T00:00:00");
    const curr = new Date(completedDates[i] + "T00:00:00");
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  return longest;
}

export function totalCompletedDays(goals: DailyGoal[]): number {
  return goals.filter((g) => g.completed).length;
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      goals: [],
      defaultMinutes: 120,
      defaultQuestions: 20,
      defaultTopics: 3,
      streak: 0,

      setDefaults: (m, q, t) =>
        set({
          defaultMinutes: Math.max(1, Math.round(m)),
          defaultQuestions: Math.max(1, Math.round(q)),
          defaultTopics: Math.max(1, Math.round(t)),
        }),

      getTodayGoal: () => {
        const k = todayKey();
        return get().goals.find((g) => g.date === k);
      },

      ensureTodayGoal: () => {
        const k = todayKey();
        const existing = get().goals.find((g) => g.date === k);
        if (existing) return existing;
        const g = newGoal(
          k,
          get().defaultMinutes,
          get().defaultQuestions,
          get().defaultTopics
        );
        const goals = [...get().goals, g];
        set({ goals, streak: computeStreak(goals) });
        return g;
      },

      updateTodayTargets: (patch) => {
        const k = todayKey();
        const goals = [...get().goals];
        const idx = goals.findIndex((g) => g.date === k);
        if (idx === -1) {
          const fresh = newGoal(
            k,
            get().defaultMinutes,
            get().defaultQuestions,
            get().defaultTopics
          );
          if (patch.minutesGoal !== undefined)
            fresh.minutesGoal = Math.max(1, Math.round(patch.minutesGoal));
          if (patch.questionsGoal !== undefined)
            fresh.questionsGoal = Math.max(1, Math.round(patch.questionsGoal));
          if (patch.topicsGoal !== undefined)
            fresh.topicsGoal = Math.max(1, Math.round(patch.topicsGoal));
          goals.push(withCompletion(fresh));
        } else {
          const g = goals[idx];
          const updated: DailyGoal = {
            ...g,
            minutesGoal:
              patch.minutesGoal !== undefined
                ? Math.max(1, Math.round(patch.minutesGoal))
                : g.minutesGoal,
            questionsGoal:
              patch.questionsGoal !== undefined
                ? Math.max(1, Math.round(patch.questionsGoal))
                : g.questionsGoal,
            topicsGoal:
              patch.topicsGoal !== undefined
                ? Math.max(1, Math.round(patch.topicsGoal))
                : g.topicsGoal,
          };
          goals[idx] = withCompletion(updated);
        }
        set({ goals, streak: computeStreak(goals) });
      },

      updateProgress: (m, q, t) => {
        const k = todayKey();
        let goals = [...get().goals];
        let idx = goals.findIndex((g) => g.date === k);
        if (idx === -1) {
          const fresh = newGoal(
            k,
            get().defaultMinutes,
            get().defaultQuestions,
            get().defaultTopics
          );
          goals.push(fresh);
          idx = goals.length - 1;
        }
        const g = goals[idx];
        const updated = withCompletion({
          ...g,
          minutesDone: Math.max(0, g.minutesDone + m),
          questionsDone: Math.max(0, g.questionsDone + q),
          topicsDone: Math.max(0, g.topicsDone + t),
        });
        goals[idx] = updated;
        set({ goals, streak: computeStreak(goals) });
      },

      recomputeFromStores: (stats) => {
        const k = todayKey();
        let goals = [...get().goals];
        let idx = goals.findIndex((g) => g.date === k);
        if (idx === -1) {
          const fresh = newGoal(
            k,
            get().defaultMinutes,
            get().defaultQuestions,
            get().defaultTopics
          );
          goals.push(fresh);
          idx = goals.length - 1;
        }
        const g = goals[idx];
        const updated = withCompletion({
          ...g,
          minutesDone: Math.max(0, Math.round(stats.totalMinutesToday)),
          questionsDone: Math.max(0, Math.round(stats.questionsAttemptedToday)),
          topicsDone: Math.max(0, Math.round(stats.topicsStudiedToday)),
        });
        goals[idx] = updated;
        set({ goals, streak: computeStreak(goals) });
      },

      clearAll: () => set({ goals: [], streak: 0 }),
    }),
    {
      name: "examintel-goals",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : (undefined as unknown as Storage)
      ),
      partialize: (s) => ({
        goals: s.goals,
        defaultMinutes: s.defaultMinutes,
        defaultQuestions: s.defaultQuestions,
        defaultTopics: s.defaultTopics,
      }),
      onRehydrateStorage: () => (state) => {
        // Recompute streak from the freshly-loaded goals so the
        // initial render shows the correct streak without needing
        // a user interaction to trigger an update.
        if (state) {
          state.streak = computeStreak(state.goals);
        }
      },
    }
  )
);
