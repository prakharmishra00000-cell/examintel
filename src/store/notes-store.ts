"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================================
// Study Notes store — client-side, persisted to localStorage
// (key: "examintel-notes"). Markdown notes organized by subject,
// topic, tags with pin support. Kept in a SEPARATE store so the
// shared `app-store.ts` infra is touched minimally (ViewKey only).
// ============================================================

export interface StudyNote {
  id: string;
  title: string;
  content: string; // markdown
  subject: string;
  topic: string;
  tags: string[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  pinned: boolean;
}

interface NotesState {
  notes: StudyNote[];
  addNote: (note: Omit<StudyNote, "id" | "createdAt" | "updatedAt">) => string;
  updateNote: (id: string, patch: Partial<StudyNote>) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  clearAll: () => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      addNote: (note) => {
        const now = new Date().toISOString();
        const id = `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const full: StudyNote = {
          ...note,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set({ notes: [full, ...get().notes] });
        return id;
      },
      updateNote: (id, patch) =>
        set({
          notes: get().notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
          ),
        }),
      deleteNote: (id) =>
        set({ notes: get().notes.filter((n) => n.id !== id) }),
      togglePin: (id) =>
        set({
          notes: get().notes.map((n) =>
            n.id === id ? { ...n, pinned: !n.pinned } : n
          ),
        }),
      clearAll: () => set({ notes: [] }),
    }),
    {
      name: "examintel-notes",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage)
      ),
      partialize: (s) => ({ notes: s.notes }),
    }
  )
);
