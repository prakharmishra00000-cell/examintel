# Task ID: cron2-feat-1 — AI Flashcards (Spaced Repetition)

**Agent:** full-stack-developer (Flashcards)
**Task:** Build AI-generated spaced repetition flashcards with review mode + mastery tracking

## Files Created
- `src/types/flashcard.ts` — Flashcard + FlashcardSet + FlashcardMastery types (with SM-2 fields: easeFactor, interval, repetitions, nextReview, lastReviewed, mastery).
- `src/store/flashcard-store.ts` — separate zustand+persist store (localStorage key `"examintel-flashcards"`). Exposes `sets`, `addSet`, `removeSet`, `updateCard(setId, cardId, quality 0-5)`, `getDueCards`, `clearAll`. SM-2 algorithm: easeFactor = max(1.3, EF + (0.1 - (5-q)*(0.08+(5-q)*0.02))), interval logic (1 → 6 → round(prev*EF)), mastery buckets (New / Learning / Reviewing / Mastered at reps>=3 && interval>=7).
- `src/app/api/flashcards/generate/route.ts` — POST endpoint, `runtime="nodejs"`, `dynamic="force-dynamic"`. Reads `{source, content, topic, count}` (default count=10). Uses `jsonWithFallback<FlashcardSet>(SYSTEM, USER, SCHEMA, isFlashcardSet)`. Returns `{set}` (with `sanitizeFlashcardSet` normalisation) or `{error}`. SCHEMA hint includes "FlashcardSet" so mock provider routes correctly.
- `src/components/views/flashcards.tsx` — `'use client'` named export `Flashcards`. Header + Tabs ("Generate" / "Review").
  - **Generate tab**: form (source label / topic / optional content textarea / count Select 5-10-15-20) + 4 quick chips + gradient Generate button calling `useApi().call<FlashcardSet>("/api/flashcards/generate", {...})`. On success → `addSet` + sonner toast + auto-switch to Review tab. Below: list of saved sets as cards showing topic, source, mastery progress (X/Y Mastered) + Progress bar + SourceBadgeList + "Review now" (gradient) + "Delete" buttons.
  - **Review tab**: StatsCard (always visible — total/due/mastered/learning/avg ease + mastery progress bar). Session flow: due-card carousel with 3D flip animation (framer-motion `rotateY`, two faces with `backfaceVisibility:hidden`), FRONT shows question + topic + difficulty badge, BACK shows answer. After flip → 4 SM-2 rating buttons (Again=red q0, Hard=amber q2, Good=sky q4, Easy=emerald q5) each calling `updateCard(setId, cardId, quality)` and advancing. Progress: "Card X of Y due" + Progress bar. Session summary at end with 🎉 confetti emoji burst + PartyPopper icon + "Reviewed N · M mastered" + "Review again" button. Empty state when no cards due.
- `src/lib/ai/mock-provider.ts` — added `if (schema.includes("flashcardset") || req.includes("flashcard generator"))` branch in `json()` BEFORE the generic fallback. New `mockFlashcards(query)` function returns 8-10 sample FlashcardSet cards. Routes on topic: SSC CGL → general awareness + polity + history + geography; Calculus → derivatives + integrals; English → vocabulary + synonyms + idioms; Reasoning → series + coding-decoding; Quant → formulas; else generic aptitude. Each card has easeFactor: 2.5, interval: 1, repetitions: 0, nextReview: today, mastery: "New".

## Files Modified
- `src/store/app-store.ts` — added `| "flashcards"` to the `ViewKey` union (between `"study-timer"` and `"progress-journal"`).
- `src/components/app-shell.tsx` — added `import { Flashcards }` from `@/components/views/flashcards`; added nav item `{ key: "flashcards", label: "Flashcards", icon: Layers, desc: "Spaced repetition" }` (Layers icon was already imported and is reused for Multi-Exam); added `case "flashcards": return <Flashcards />;` to the render switch; added `"flashcards"` to the mobile nav filter exclusion list (`!["my-research", "api-keys", "study-timer", "progress-journal", "flashcards"].includes(n.key)`).

## Styling Notes
- NO indigo/blue primary anywhere. Violet (`violet-500/600`) + Fuchsia (`fuchsia-500/600`) gradients on: header icon tile, Generate button, Start-review button, StatsCard border/background, active cards, mastery progress bars. Per-rating colours use rose/amber/sky/emerald (state, not brand).
- Card flip: `[perspective:1600px]` parent + `motion.div` with `style={{ transformStyle: "preserve-3d" }}` and `animate={{ rotateY: flipped ? 180 : 0 }}`. Front face has `backfaceVisibility: "hidden"`; back face same + `transform: "rotateY(180deg)"`. Both faces are absolutely positioned and fill the container.
- Mobile-first responsive: form grid collapses to single column on mobile (`grid gap-4 sm:grid-cols-2`); rating buttons go `grid-cols-2 sm:grid-cols-4`; saved sets list is `grid gap-3 sm:grid-cols-2`. Mobile bottom nav now excludes `flashcards` (covered by the sidebar/main nav and the slice(0,6) limit).

## Verification
- `bun run lint` — **0 errors, 0 warnings**.
- `bunx tsc --noEmit -p tsconfig.json` — **0 errors** in all new/modified files (flashcard.ts, flashcard-store.ts, route.ts, flashcards.tsx, mock-provider.ts, app-store.ts, app-shell.tsx). Remaining tsc errors are pre-existing in `multi-exam/optimize/route.ts` and `provider.ts` (owned by other agents) — not touched.

## Conventions Followed
- Used `jsonWithFallback` (not raw `getLLM().json`) per shared infra rules.
- Separate zustand store (mirrors `study-store.ts` pattern) — did NOT modify `app-store.ts`'s state shape, only added a `ViewKey` union member.
- Mock provider route keyed on SCHEMA HINT "flashcardset" (case-insensitive) — deterministic, won't mis-route other features.
- SM-2 algorithm matches standard spec; "Mastered" bucket requires `repetitions >= 3 && interval >= 7`.
- `FlashcardSet` has an `id` field (`fs_${Date.now()}_${rand}`) for stable removal/update; `updateCard` keys on `setId` (more robust than topic which could collide).
