"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================================
// Exam Countdown store — separate zustand store, persisted to
// localStorage under "examintel-countdown". Holds a single
// active exam countdown (exam name + date + optional target
// score + creation timestamp). Shared app-store is NOT touched.
// ============================================================

export interface ExamCountdown {
  examName: string;
  examDate: string; // ISO date string (YYYY-MM-DD or full ISO)
  targetScore?: string;
  createdAt: string; // ISO timestamp — used as the start of the progress bar
}

interface CountdownState {
  countdown: ExamCountdown | null;
  setCountdown: (c: ExamCountdown | null) => void;
}

export const useCountdownStore = create<CountdownState>()(
  persist(
    (set) => ({
      countdown: null,
      setCountdown: (c) => set({ countdown: c }),
    }),
    {
      name: "examintel-countdown",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage)
      ),
      partialize: (s) => ({ countdown: s.countdown }),
    }
  )
);
