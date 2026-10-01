"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
// Re-export the public types/values so consumers can import everything from
// the store module.
export { SEED_FORMULAS } from "./formula-seed";
import { SEED_FORMULAS } from "./formula-seed";
import type { Formula } from "./formula-seed";
export type { Formula };

// ============================================================
// Formula Sheet store — client-side, persisted to localStorage
// (Vercel-friendly: no DB setup required for user data)
//
// SEED_FORMULAS is the canonical built-in list (always up-to-date
// on app load). The persisted state stores only `favorites` and
// `customFormulas`; the `formulas` getter composes SEED_FORMULAS +
// customFormulas at access time so that any update to the seed list
// shows up immediately for existing users.
// ============================================================

// ---------- store interface ----------
interface FormulaState {
  // composed list = SEED_FORMULAS + customFormulas (read-only view)
  formulas: Formula[];
  favorites: string[]; // formula ids
  customFormulas: Formula[]; // user-added (for export/clear)
  toggleFavorite: (id: string) => void;
  addCustom: (f: Omit<Formula, "id">) => void;
  removeCustom: (id: string) => void;
  clearCustom: () => void;
}

function composeFormulas(custom: Formula[]): Formula[] {
  return [...SEED_FORMULAS, ...custom];
}

export const useFormulaStore = create<FormulaState>()(
  persist(
    (set, get) => ({
      formulas: composeFormulas([]),
      favorites: [],
      customFormulas: [],
      toggleFavorite: (id) => {
        const favs = get().favorites;
        const next = favs.includes(id)
          ? favs.filter((f) => f !== id)
          : [...favs, id];
        set({ favorites: next });
      },
      addCustom: (f) => {
        const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const next: Formula = { ...f, id };
        const custom = [next, ...get().customFormulas];
        set({ customFormulas: custom, formulas: composeFormulas(custom) });
      },
      removeCustom: (id) => {
        const custom = get().customFormulas.filter((c) => c.id !== id);
        const favs = get().favorites.filter((f) => f !== id);
        set({
          customFormulas: custom,
          favorites: favs,
          formulas: composeFormulas(custom),
        });
      },
      clearCustom: () => set({ customFormulas: [], formulas: composeFormulas([]) }),
    }),
    {
      name: "examintel-formulas",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage)
      ),
      partialize: (s) => ({
        // only persist user-owned state; built-in formulas always come from SEED_FORMULAS
        favorites: s.favorites,
        customFormulas: s.customFormulas,
      }),
      merge: (persisted, current) => {
        // Always use the latest SEED_FORMULAS (so new built-in formulas appear on
        // update). Persisted favorites + customFormulas are preserved.
        const p = (persisted ?? {}) as Partial<{
          favorites: string[];
          customFormulas: Formula[];
        }>;
        const favorites = Array.isArray(p.favorites) ? p.favorites : [];
        const customFormulas = Array.isArray(p.customFormulas)
          ? p.customFormulas
          : [];
        return {
          ...current,
          favorites,
          customFormulas,
          formulas: composeFormulas(customFormulas),
        };
      },
    }
  )
);
