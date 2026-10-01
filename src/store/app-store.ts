"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SavedItem, SavedType } from "@/types";

// ============================================================
// Global app store — client-side, persisted to localStorage
// (Vercel-friendly: no DB setup required for user data)
// ============================================================

export type ViewKey =
  | "landing"
  | "dashboard"
  | "exam-researcher"
  | "exam-comparison"
  | "dependency-mapper"
  | "question-explainer"
  | "question-evolution"
  | "paper-generator"
  | "pdf-lab"
  | "mcq-generator"
  | "preparation-simulator"
  | "multi-exam-optimizer"
  | "my-research"
  | "study-timer"
  | "flashcards"
  | "progress-journal"
  | "exam-calendar"
  | "formula-sheet"
  | "formula-quiz"
  | "achievements"
  | "topic-mastery"
  | "analytics"
  | "revision-scheduler"
  | "api-keys";

export interface AIStatus {
  provider: string;
  available: boolean;
}

interface AppState {
  // navigation
  currentView: ViewKey;
  setView: (v: ViewKey) => void;
  // theme
  theme: "light" | "dark" | "system";
  setTheme: (t: "light" | "dark" | "system") => void;
  // saved research
  saved: SavedItem[];
  saveItem: (item: Omit<SavedItem, "id" | "createdAt">) => string;
  deleteItem: (id: string) => void;
  clearAll: () => void;
  // active context for AI assistant
  contextTitle: string;
  contextType: SavedType | "general";
  setContext: (title: string, type: SavedType | "general") => void;
  // assistant open state
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  // AI status (set from /api/status)
  aiStatus: AIStatus | null;
  setAiStatus: (s: AIStatus) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentView: "landing",
      setView: (v) => set({ currentView: v }),
      theme: "dark",
      setTheme: (t) => set({ theme: t }),
      saved: [],
      saveItem: (item) => {
        const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const full: SavedItem = { ...item, id, createdAt: new Date().toISOString() };
        set({ saved: [full, ...get().saved] });
        return id;
      },
      deleteItem: (id) => set({ saved: get().saved.filter((s) => s.id !== id) }),
      clearAll: () => set({ saved: [] }),
      contextTitle: "General",
      contextType: "general",
      setContext: (title, type) => set({ contextTitle: title, contextType: type }),
      assistantOpen: false,
      setAssistantOpen: (open) => set({ assistantOpen: open }),
      aiStatus: null,
      setAiStatus: (s) => set({ aiStatus: s }),
    }),
    {
      name: "examintel-store",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as any))),
      partialize: (s) => ({
        currentView: s.currentView,
        theme: s.theme,
        saved: s.saved,
        contextTitle: s.contextTitle,
        contextType: s.contextType,
      }),
    }
  )
);
