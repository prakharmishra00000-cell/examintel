# Task cron2-feat-2: Exam Countdown Widget

**Agent:** full-stack-developer (Exam Countdown)

## Task
Build an Exam Countdown widget — set exam date, see live countdown + auto-suggested prep milestones. Integrate into the Dashboard.

1. `src/store/countdown-store.ts` — separate zustand store with persist (localStorage key `"examintel-countdown"`), exposing `ExamCountdown { examName, examDate (ISO), targetScore?, createdAt (ISO) }` + `useCountdownStore` (`countdown`, `setCountdown`).
2. `src/components/exam-countdown.tsx` — `'use client'` named export `ExamCountdown`: compact set-up form when empty; premium live-countdown card (Days/Hours/Minutes/Seconds, 1s tick), progress bar, auto-suggested milestones with backwards-computed target dates + check-when-done, urgency styling (violet/amber/rose/pulsing-rose), Edit + Clear.
3. Integrate into `src/components/views/dashboard.tsx` — 2-col grid (lg) with the existing priority card.

## Work Log
- Read `/home/z/my-project/worklog.md` to absorb prior agents' conventions (Tasks 0, 4-a, 5-a, 7-a, feat-3, cron-review-1). Confirmed shared infra OFF-LIMITS.
- Inspected `app-store.ts` (zustand + persist + localStorage + SSR-safe `createJSONStorage`) and `dashboard.tsx` (welcome → priority card → quick actions → two-col → banner; violet/fuchsia gradient language; framer-motion fade-ins).
- Created `countdown-store.ts` mirroring the established persisted-store pattern (separate store, `partialize` persists only `countdown`, storage resolves to `undefined` on SSR).
- Built `exam-countdown.tsx` with three sub-components: `EmptyCountdown` (compact form), `CountdownUnit` (gradient-bordered glass tile), `ActiveCountdown` (premium card), plus `EditFormBody` + `EditDialog` for editing. Used `date-fns` `differenceInCalendarDays` / `format` / `addDays` / `parseISO` / `startOfDay` for all calculations.
- Milestone logic: 3–5 milestones chosen by `daysRemaining` band (>90d / 30–90d / <30d / <7d); target date = `addDays(examDate, -round(span * (N-i)/(N+1)))` where `span = differenceInCalendarDays(examDate, createdAt)`; "done" when the target day is strictly before today.
- Urgency styling: `getUrgency()` returns border/glow/chip/ring/pulse per band — violet (>60d), amber (30–60d), rose (<30d), pulsing-rose icon tile (<7d). `animate-pulse` applied to the icon tile only (not the whole card) so text stays readable.
- Integrated into dashboard: wrapped `<ExamCountdown />` + the existing priority card in `grid grid-cols-1 lg:grid-cols-2 gap-4 items-start`; both wrapped in framer-motion fade-in divs. No existing content removed.
- Lint: initial run flagged 2 `react-hooks/set-state-in-effect` errors. Fixed both: (1) extracted `EditFormBody` child so Radix's DialogContent unmount re-inits `useState` — eliminated the re-sync `useEffect`; (2) replaced `useEffect(() => setMounted(true), [])` hydration guard with `useSyncExternalStore` (noop subscribe + `true`/`false` server/client snapshots). Final: **0 errors, 0 warnings** in my files.
- Verified dev.log shows `GET / 200` with no compile errors.

## Files Created / Modified
- **Created** `/home/z/my-project/src/store/countdown-store.ts`
- **Created** `/home/z/my-project/src/components/exam-countdown.tsx`
- **Modified** `/home/z/my-project/src/components/views/dashboard.tsx` (added import + 2-col grid wrapper around `<ExamCountdown />` and the priority card)

## Key Decisions
- **Separate store** (not added to `app-store.ts`) — matches the established pattern from `study-store.ts` and keeps the shared store untouched as required.
- **`useSyncExternalStore` for hydration guard** — the lint-compliant "is client" check. Returns `false` during SSR + first client render, `true` after, with no `setState`-in-effect. Renders a pulse skeleton until mounted to avoid SSR/CSR mismatch from the persisted store.
- **Remount-based form state in EditDialog** — `EditFormBody` holds form state via `useState` initializers from `current`; Radix Dialog unmounts `DialogContent` when closed so the body remounts fresh each open with the latest values. No `useEffect` re-sync needed → lint-clean. Preserves `createdAt` on save so the progress bar stays accurate.
- **Pulse on icon tile, not whole card** — applying `animate-pulse` to the entire critical-urgency card would pulse all text opacity and hurt readability; pulsing just the alarm icon tile gives the "urgent" feel while keeping content legible.
- **Milestone "done" = target day strictly before today** — uses `differenceInCalendarDays(today, startOfDay(targetDate)) > 0` so a milestone due today still shows as active (in progress), not done.
- **Reused `paper-palette-scroll` class** for the milestone list scrollbar instead of editing `globals.css` (kept shared/CSS files untouched).

## Styling
- NO indigo/blue anywhere. Violet (`violet-500`) + Fuchsia (`fuchsia-500`) gradients on all primary actions, empty-card border, icon tiles, progress bar, edit/clear confirm buttons.
- Urgency colours per spec: violet (>60d), amber (30–60d), rose (<30d), pulsing-rose (<7d).
- Premium glass card: `bg-gradient-to-br from-background via-background to-violet-500/[0.04] backdrop-blur-sm`, two decorative blurred gradient blobs (fuchsia top-right, violet bottom-left).
- Mobile-first: 4-col countdown grid uses `gap-2 sm:gap-3` + `text-2xl sm:text-3xl`; form `grid-cols-1 sm:grid-cols-2`; dialog `sm:max-w-md`; dashboard wrapper `grid-cols-1 lg:grid-cols-2`.
- Touch targets: icon buttons `h-8 w-8`, primary buttons `size sm`.

## Lint
`cd /home/z/my-project && bun run lint 2>&1 | tail -25` → **0 errors, 0 warnings** in my files. (1 pre-existing warning in `flashcards.tsx` — unused eslint-disable directive, owned by another agent, out of scope.)

## Shared Infra Touched
None. `app-store.ts`, `types/index.ts`, `lib/ai/*`, `components/ui/*`, `components/shared/*`, `app-shell.tsx`, `globals.css` all unchanged.
