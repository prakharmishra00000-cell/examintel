# Task cron2-feat-3 — full-stack-developer (Progress Journal)

## Task
Build a daily study journal with AI weekly summary:
- `src/store/journal-store.ts` — separate zustand + persist store (localStorage key `examintel-journal`)
- `src/app/api/journal/summary/route.ts` — POST endpoint calling `getLLM().chat()` for a weekly markdown summary
- `src/components/views/progress-journal.tsx` — `ProgressJournal` view (form + AI summary + grouped timeline + stats)
- Wire `progress-journal` into `ViewKey` union + AppShell nav/render + mobile nav exclusion + explicit mobile button

## Files Created
1. `src/store/journal-store.ts` — zustand store with persist. Exports `JournalEntry`, `JournalMood`, `useJournalStore`. Methods: `addEntry(Omit<id|createdAt>)`, `deleteEntry(id)`, `clearAll()`. Storage key `examintel-journal`. IDs prefixed `je_`. Mirrors `study-store.ts` shape.
2. `src/app/api/journal/summary/route.ts` — `runtime="nodejs"`, `dynamic="force-dynamic"`. POST reads `{ entries }`, validates non-empty (400 if empty), compacts entries to a token-friendly text block, calls `getLLM().chat([system, user])`. System prompt enforces 6 markdown sections: Total Study Time, Subjects Covered, Key Wins, Recurring Blockers, Mood Trend, Recommendations (exactly 3). Returns `{ summary, provider }` or `{ error }` (400/500/502).
3. `src/components/views/progress-journal.tsx` — `'use client'` named export `ProgressJournal`. ~660 lines. Layout: header + 4-card stats bar (Total Entries / Study Time / Top Subject / Avg Mood) + two-column grid (lg:grid-cols-3). Left col: New Entry form card (date input, subject w/ datalist of 13 common subjects, topic, duration number, 4-emoji mood buttons, 3 textareas, gradient Save button). Right col: Weekly AI Summary card (generate button → fetch /api/journal/summary, renders via `react-markdown`) + Timeline. Timeline groups entries: Today / Yesterday / Earlier this week / Older-by-month. Each entry card expands on click to show full what-studied / blockers (rose tone) / wins (emerald tone) + delete. EmptyState when no entries. Toasts via sonner.

## Wiring
- `src/store/app-store.ts`: added `| "progress-journal"` to `ViewKey` union.
- `src/components/app-shell.tsx`:
  - imported `BookOpen` from lucide-react
  - imported `{ ProgressJournal } from "@/components/views/progress-journal"`
  - added nav item `{ key: "progress-journal", label: "Journal", icon: BookOpen, desc: "Daily study log" }` (between Study Timer and API Keys)
  - added `case "progress-journal": return <ProgressJournal />;` to render switch
  - added `"progress-journal"` to the mobile nav filter exclusion list
  - added explicit Journal quick-button to mobile bottom nav (between Timer and Saved) for mobile accessibility

## Accent Colors Used (per spec — NO indigo/blue primary)
- Primary action gradient: violet → fuchsia (Save button, Generate button, header icon)
- Mood colors: great=emerald, good=sky, okay=amber, struggle=rose
- Stats cards: violet / fuchsia / emerald / amber gradient borders
- Summary card: violet/fuchsia tinted background

## Lint Status
- My files (`journal-store.ts`, `journal/summary/route.ts`, `progress-journal.tsx`, modified `app-store.ts`, modified `app-shell.tsx`): ZERO lint errors.
- Pre-existing errors in `src/components/exam-countdown.tsx` (2 × `react-hooks/set-state-in-effect`) are from another agent's task and were NOT touched per shared-infra rules.

## Key Notes for Downstream Agents
- The journal store is fully separate from `app-store` and `study-store` — no shared infra modified beyond the ViewKey union.
- The summary endpoint uses `llm.chat()` (free-text markdown), NOT `llm.json()`. The view renders markdown via `react-markdown` with a `prose` wrapper.
- The summary is cached in component state (`summary`) and cleared when a new entry is added or deleted (so stale summaries don't persist after data changes). It is NOT persisted to localStorage — regenerating is cheap and ensures freshness.
- `weekEntries` uses `subDays(new Date(), 6)` (rolling 7-day window incl. today), not calendar week.
- Mood → score mapping for avg: great=4, good=3, okay=2, struggle=1.
- The form validates subject, topic, duration>0, and whatStudied (toasts on missing fields).
