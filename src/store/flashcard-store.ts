"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Flashcard, FlashcardSet } from "@/types/flashcard";

// ============================================================
// Flashcards store — client-side, persisted to localStorage
// Implements the SM-2 spaced repetition algorithm:
//   quality 0–2  → reset (repetition = 0, interval = 1)
//   quality 3    → first review keeps interval = 1
//   quality 4    → first review interval = 6, otherwise grows
//   quality 5    → "easy" — slightly larger jump
//   easeFactor = max(1.3, EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02)))
//   interval   = repetitions <= 1 ? 1
//               : repetitions == 2 ? 6
//               : round(interval * EF)
//   mastery buckets:
//     New        — repetitions === 0
//     Learning   — repetitions 1–2 OR interval < 7
//     Reviewing  — repetitions >= 3 && interval < 7
//     Mastered   — repetitions >= 3 && interval >= 7
// ============================================================

type Quality = 0 | 1 | 2 | 3 | 4 | 5;

interface FlashcardState {
  sets: FlashcardSet[];
  addSet: (set: FlashcardSet) => void;
  removeSet: (id: string) => void;
  updateCard: (setId: string, cardId: string, quality: Quality) => void;
  getDueCards: () => Flashcard[];
  clearAll: () => void;
}

function computeMastery(repetitions: number, interval: number): Flashcard["mastery"] {
  if (repetitions <= 0) return "New";
  if (repetitions < 3) return "Learning";
  if (interval >= 7) return "Mastered";
  return "Reviewing";
}

function applySM2(card: Flashcard, quality: Quality): Flashcard {
  // SM-2 ease factor update
  const q = quality;
  const newEF = Math.max(
    1.3,
    card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  let repetitions = card.repetitions;
  let interval = card.interval;

  if (q < 3) {
    // Lapse — start over
    repetitions = 0;
    interval = 1;
  } else {
    repetitions = card.repetitions + 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * newEF);
    }
  }

  const now = new Date();
  const next = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return {
    ...card,
    easeFactor: Math.round(newEF * 100) / 100,
    interval,
    repetitions,
    nextReview: next.toISOString(),
    lastReviewed: now.toISOString(),
    mastery: computeMastery(repetitions, interval),
  };
}

function isDue(card: Flashcard, now: number): boolean {
  const t = Date.parse(card.nextReview);
  if (Number.isNaN(t)) return true; // unknown date → treat as due
  return t <= now;
}

export const useFlashcardStore = create<FlashcardState>()(
  persist(
    (set, get) => ({
      sets: [],
      addSet: (newSet) =>
        set({
          sets: [newSet, ...get().sets],
        }),
      removeSet: (id) =>
        set({ sets: get().sets.filter((s) => s.id !== id) }),
      updateCard: (setId, cardId, quality) => {
        const sets = get().sets.map((s) => {
          if (s.id !== setId) return s;
          return {
            ...s,
            cards: s.cards.map((c) =>
              c.id === cardId ? applySM2(c, quality) : c
            ),
          };
        });
        set({ sets });
      },
      getDueCards: () => {
        const now = Date.now();
        const due: Flashcard[] = [];
        for (const s of get().sets) {
          for (const c of s.cards) {
            if (isDue(c, now)) due.push(c);
          }
        }
        return due;
      },
      clearAll: () => set({ sets: [] }),
    }),
    {
      name: "examintel-flashcards",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as any)
      ),
      partialize: (s) => ({ sets: s.sets }),
    }
  )
);
