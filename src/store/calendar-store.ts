"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================================
// Exam Calendar store — client-side, persisted to localStorage
// Holds user-created custom events (exams / milestones /
// reminders) that augment the auto-aggregated calendar view
// (which already pulls from countdown / study / journal / saved
// stores). Kept in a SEPARATE store so shared `app-store.ts`
// infra is touched minimally (ViewKey only).
// ============================================================

export type CalendarEventType = "exam" | "milestone" | "reminder";

export interface CalendarCustomEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  notes?: string;
  createdAt: string; // ISO timestamp
}

interface CalendarState {
  events: CalendarCustomEvent[];
  addEvent: (e: Omit<CalendarCustomEvent, "id" | "createdAt">) => void;
  removeEvent: (id: string) => void;
  clearAll: () => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      addEvent: (e) =>
        set({
          events: [
            {
              ...e,
              id: `ce_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              createdAt: new Date().toISOString(),
            },
            ...get().events,
          ],
        }),
      removeEvent: (id) =>
        set({ events: get().events.filter((x) => x.id !== id) }),
      clearAll: () => set({ events: [] }),
    }),
    {
      name: "examintel-calendar",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as any)
      ),
      partialize: (s) => ({ events: s.events }),
    }
  )
);
