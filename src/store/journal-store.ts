"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================================
// Progress Journal store — client-side, persisted to localStorage
// Tracks daily study log entries (what studied / blockers / wins)
// used for the AI weekly summary. Kept in a SEPARATE store so the
// shared `app-store.ts` infra is touched minimally (ViewKey only).
// ============================================================

export type JournalMood = "great" | "good" | "okay" | "struggle";

export interface JournalEntry {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  subject: string;
  topic: string;
  durationMinutes: number;
  mood: JournalMood;
  whatStudied: string;
  blockers: string;
  wins: string;
  createdAt: string; // ISO timestamp
}

interface JournalState {
  entries: JournalEntry[];
  addEntry: (e: Omit<JournalEntry, "id" | "createdAt">) => void;
  deleteEntry: (id: string) => void;
  clearAll: () => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (e) =>
        set({
          entries: [
            {
              ...e,
              id: `je_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              createdAt: new Date().toISOString(),
            },
            ...get().entries,
          ],
        }),
      deleteEntry: (id) =>
        set({ entries: get().entries.filter((x) => x.id !== id) }),
      clearAll: () => set({ entries: [] }),
    }),
    {
      name: "examintel-journal",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as any)
      ),
    }
  )
);
