# Task ID: cron4-feat-2 — Topic Mastery Tracker

## Task
Build a Topic Mastery tracker — visual dashboard showing per-topic mastery across all saved items + flashcards, with a strength/weakness heatmap.

## Plan
1. Read worklog + shared infra (stores, app-shell, types, premium-empty-state, tooltip/dialog/tabs UI).
2. Create `/home/z/my-project/src/components/views/topic-mastery.tsx` (single `'use client'` file, named export `TopicMastery`).
3. Wire into `app-store.ts` ViewKey union (`| "topic-mastery"`) + `app-shell.tsx` (import, nav item in "tracking" group with Target icon, render switch case, mobile nav exclusion list).
4. Run `bun run lint`, fix any errors in my files only.
5. Append worklog entry.

## Implementation notes
- Aggregate topics from: saved (explanation/evolution/paper/mcq), flashcard sets, study sessions, journal entries.
- Mastery score (0-100): weighted blend of (flashcard mastery avg) + (question accuracy from saved paper.analysis.topicWise & mcq answers) + activity boost (sessions*5 cap 20, journal*3 cap 15 → max 35).
- Classify: Strong (≥70), Moderate (40-69), Weak (<40), Not Started (no activity + no cards).
- Layout: header → 4 stat cards (AnimatedCounter) → heatmap grid (emerald/amber/rose/zinc tiles, click for Dialog w/ Tabs) → strengths & weaknesses 2-col → subject breakdown bar chart (divs) → recommendations card (3 actions per weak topic) → PremiumEmptyState when no topics.
- Styling: NO indigo/blue; mastery colors strict (emerald/amber/rose/zinc); violet/fuchsia gradients on CTAs.
- Hydration-safe via useSyncExternalStore mounted guard (mirrors exam-calendar.tsx pattern).
