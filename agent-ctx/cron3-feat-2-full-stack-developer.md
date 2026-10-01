# Task: cron3-feat-2 — Exam Calendar (Monthly View)

**Agent:** full-stack-developer (Exam Calendar)
**Task:** Build monthly calendar view showing exam dates, milestones, and tasks aggregated from all stores.

## Work Log

- Read `/home/z/my-project/worklog.md` (rounds 0 → cron-review-2) to absorb conventions: separate zustand+persist stores for self-contained features (mirrors `study-store.ts` / `journal-store.ts` / `countdown-store.ts`), violet/fuchsia gradients with NO indigo/blue, mobile-first responsive, `useSyncExternalStore` hydration guard pattern (lint-compliant "is client" pattern used in `exam-countdown.tsx` to avoid `react-hooks/set-state-in-effect`).
- Inspected shared infra: `app-store.ts` (ViewKey union + persist pattern), `countdown-store.ts` (ExamCountdown shape), `study-store.ts` (StudySession.date ISO), `journal-store.ts` (JournalEntry.date ISO), `app-shell.tsx` (NAV array, render switch, mobile nav filter exclusion list), `types/index.ts` (SavedItem.type ∈ {"preparation","multi-exam",...} with `data: unknown` — must cast to access `examDate` / `exams[].date`), shadcn/ui primitives (Card, Button, Badge, Sheet, Dialog, Input, Select, Label).
- Created `src/store/calendar-store.ts` — separate zustand+persist store, localStorage key `"examintel-calendar"`. Exposes `CalendarCustomEvent` (id, title, date YYYY-MM-DD, type exam|milestone|reminder, notes?, createdAt), `addEvent` / `removeEvent` / `clearAll`. SSR-safe storage resolver. IDs prefixed `ce_`. Shared `app-store.ts` shape untouched (only ViewKey union extended per task spec).
- Created `src/components/views/exam-calendar.tsx` — `'use client'` named export `ExamCalendar`. Architecture:
  - **Hydration guard**: `useMounted()` via `useSyncExternalStore` with noop subscribe + true(client)/false(server) snapshots — prevents SSR/CSR mismatch from persisted stores (mirrors `exam-countdown.tsx` pattern). Renders skeleton grid while not mounted.
  - **Event aggregation** (`useMemo` over countdown+saved+sessions+entries+customEvents):
    1. **Exams (rose)**: from `countdown-store.countdown.examDate` + `saved` items of `type:"preparation"` (cast `data.examDate` + `data.targetExam`) + saved `type:"multi-exam"` items (cast `data.exams[].date` + `name`). Each exam auto-generates 4 milestones.
    2. **Milestones (amber)**: 60d before → "Topic completion", 30d → "Practice phase", 14d → "Mock tests", 7d → "Final revision". Computed backwards from each exam date via `setDate(getDate() - daysBefore)`.
    3. **Study sessions (violet dot)**: aggregated by `dayKey(parseISO(s.date))` → `{count, minutes}` per day.
    4. **Journal entries (sky dot)**: aggregated by `dayKey(parseISO(e.date))` → count per day.
    5. **Custom events (badge colored by type)**: from `useCalendarStore().events`.
  - **Calendar grid**: 7 columns Mon–Sun, 5–6 rows via `eachDayOfInterval(startOfWeek(monthStart, {weekStartsOn:1}), endOfWeek(monthEnd, {weekStartsOn:1}))`. Day cells are plain `<button>` (not shadcn Button) for layout flexibility.
    - Day number top-left (`format(d, "d")`, tabular-nums).
    - Up to 2 event badges (exam/milestone/reminder) — `hidden sm:block` so on mobile only dots show (dots become primary indicator).
    - "+N more" indicator when more than 2 badges.
    - Dots row at bottom (always visible): violet for study, sky for journal — `absolute bottom-1`.
    - Today: gradient ring via `bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 border-violet-500/50 ring-2 ring-violet-500/40`.
    - Outside-month days: `bg-muted/20 border-border/40 opacity-60`.
    - Clicking opens Sheet for day detail.
  - **Toolbar**: prev (`subMonths`) / Today / next (`addMonths`) ghost buttons + prominent `format(cursor, "MMMM yyyy")` + active-day count.
  - **Legend**: row of colored dots explaining all 5 event types.
  - **Upcoming panel** (right on `lg:`, below on mobile): next 5 events sorted by date+type-priority, each with `relativeCountdown(days)` ("in 3 days", "in 2 weeks", "Tomorrow", "Today"). Clicking an event navigates (countdown exam → `setView("dashboard")`, saved-item exam → `setView("my-research")`). Disabled (no nav) for study/journal/custom. Empty state with hint to set exam countdown.
  - **Day detail Sheet**: full events list for the selected day, each with type-icon tile, title, description, count (if aggregated), navigate-arrow button (for events with `navigate`), delete button (only for custom events — calls `removeCustomEvent(customId)` + sonner toast).
  - **Add Event Dialog** (`AddEventDialog` child): title Input, date Input (type=date), type Select (Exam/Milestone/Reminder), notes Input. State initialisers fresh each open (Radix Dialog unmounts DialogContent on close, so no useEffect needed). On submit: `addCustomEvent` + sonner toast + cursor jumps to new event's month so user sees it immediately.
  - **Styling**: NO indigo/blue anywhere. Violet/fuchsia gradients on header tile, "Add Event" button, today ring, nav-button hovers. Event colors strictly: exam=rose, milestone=amber, study=violet, journal=sky, reminder=fuchsia. Premium glass-card calendar grid with subtle borders. Mobile-first: `min-h-[60px] sm:min-h-[96px]` cells, `text-xs sm:text-sm` day numbers, badges `hidden sm:block` so dots take over on mobile.
- Wired into shared infra (per task spec — `app-store.ts` ViewKey + `app-shell.tsx` nav/render/exclusion):
  - Added `| "exam-calendar"` to `ViewKey` union in `src/store/app-store.ts` (between `"progress-journal"` and `"api-keys"`).
  - In `src/components/app-shell.tsx`: added `import { ExamCalendar } from "@/components/views/exam-calendar"`; added `Calendar` to the lucide-react imports (alongside existing `CalendarRange`); added nav item `{ key: "exam-calendar", label: "Calendar", icon: Calendar, desc: "Dates & milestones" }` (between Flashcards and API Keys); added `case "exam-calendar": return <ExamCalendar />;` to render switch; added `"exam-calendar"` to the mobile bottom-nav filter exclusion list.
- Ran `cd /home/z/my-project && bun run lint 2>&1 | tail -30`. Initial output flagged 1 error + 1 warning, BOTH in other agents' files (`achievements.tsx` line 355 "Cannot create components during render" / `react-hooks/static-components`; `achievements-store.ts` line 355 "Unused eslint-disable directive"). Filtered the lint output for my files (`exam-calendar`, `calendar-store`, `app-store`, `app-shell`) → **0 errors, 0 warnings** in my files. Did NOT touch the achievements files per shared-infra rules (out of scope).
- Did NOT touch shared infra beyond the explicit task-required edits (ViewKey union + app-shell wiring). `useAppStore` shape, AI provider, mock-provider, types/index.ts, shadcn/ui components, `globals.css` all unchanged.

## Stage Summary

- `src/store/calendar-store.ts` — new SEPARATE zustand store persisted to `localStorage["examintel-calendar"]`, exposing `events: CalendarCustomEvent[]` + `addEvent` / `removeEvent` / `clearAll`. SSR-safe. Shared `app-store.ts` shape untouched (only ViewKey union extended).
- `src/components/views/exam-calendar.tsx` — premium `'use client'` `ExamCalendar` view: monthly 7-col grid with prev/Today/next navigation, aggregates events from countdown (exam dates) + saved items (preparation + multi-exam exam dates) + auto-milestones (-60d/-30d/-14d/-7d) + study sessions + journal entries + custom user events. Day cells show up to 2 badges + "+N more" + violet/sky dots row; today gets gradient ring; outside-month days muted; clicking opens Sheet with full day detail + per-event navigate + per-custom-event delete. Upcoming-events panel (next 5 with countdown labels + click-to-navigate). Add Event dialog (title/date/type=exam|milestone|reminder/notes) writes to calendar-store. NO indigo/blue; violet/fuchsia gradients throughout; rose/amber/violet/sky/fuchsia event palette; mobile-first responsive (badges hidden on mobile, dots primary). Lint-clean. Hydration-safe via `useSyncExternalStore` mounted guard.
- `src/store/app-store.ts` — `ViewKey` union extended with `| "exam-calendar"`. No other changes.
- `src/components/app-shell.tsx` — wired ExamCalendar: import added, `Calendar` lucide icon imported, nav item added (label "Calendar", desc "Dates & milestones"), render-switch case added, "exam-calendar" added to mobile bottom-nav filter exclusion list.
- All shared infrastructure untouched beyond the explicit task-required wiring. The calendar is fully self-contained, reads live from all 4 existing stores + the new calendar-store, and renders immediately on the Calendar nav tab.
