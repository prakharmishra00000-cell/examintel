"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================================
// PYQ Browser store — client-side, persisted to localStorage
// (key: "examintel-pyqs"). Tracks bookmarks + per-PYQ attempt
// results so the user can review weak areas later.
// ============================================================

export type AttemptResult = "correct" | "incorrect" | "unattempted";

interface PYQState {
  /** PYQ ids the user has bookmarked (star toggle). */
  bookmarked: string[];
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;

  /** pyqId -> attempt result (correct / incorrect / unattempted). */
  attempts: Record<string, AttemptResult>;
  recordAttempt: (id: string, result: AttemptResult) => void;
  getAttempt: (id: string) => AttemptResult | undefined;

  /** Reset all bookmarks + attempts (Settings → Clear). */
  clearAll: () => void;
}

export const usePyqStore = create<PYQState>()(
  persist(
    (set, get) => ({
      bookmarked: [],
      toggleBookmark: (id) =>
        set((s) => ({
          bookmarked: s.bookmarked.includes(id)
            ? s.bookmarked.filter((b) => b !== id)
            : [...s.bookmarked, id],
        })),
      isBookmarked: (id) => get().bookmarked.includes(id),

      attempts: {},
      recordAttempt: (id, result) =>
        set((s) => ({ attempts: { ...s.attempts, [id]: result } })),
      getAttempt: (id) => get().attempts[id],

      clearAll: () => set({ bookmarked: [], attempts: {} }),
    }),
    {
      name: "examintel-pyqs",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage)
      ),
      partialize: (s) => ({ bookmarked: s.bookmarked, attempts: s.attempts }),
    }
  )
);
