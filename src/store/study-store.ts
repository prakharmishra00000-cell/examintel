"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================================
// Study timer store — client-side, persisted to localStorage
// Tracks focus sessions (Pomodoro + Free), used for streaks &
// weekly charts. Kept in a SEPARATE store so the shared
// `app-store.ts` infra is not modified.
// ============================================================

export interface StudySession {
  id: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  date: string; // ISO string
  mode: "pomodoro" | "free";
  completed: boolean;
}

interface StudyState {
  sessions: StudySession[];
  addSession: (s: Omit<StudySession, "id">) => void;
  deleteSession: (id: string) => void;
  clearAll: () => void;
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
      sessions: [],
      addSession: (s) =>
        set({
          sessions: [
            {
              ...s,
              id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            },
            ...get().sessions,
          ],
        }),
      deleteSession: (id) =>
        set({ sessions: get().sessions.filter((x) => x.id !== id) }),
      clearAll: () => set({ sessions: [] }),
    }),
    {
      name: "examintel-study",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as any)
      ),
    }
  )
);
