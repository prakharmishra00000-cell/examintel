# Task 5-a: Exam Comparison Engine

**Agent:** full-stack-developer (Exam Comparison)

## Task
Build the Exam Comparison Engine feature for ExamIntel:
1. API route `/api/exam/compare/route.ts` — POST endpoint that reads `{ exams: string[] }` (2–5 names), calls `getLLM().json<ExamComparisonReport>()` with a strict system prompt, returns `{ report }` or `{ error }` with 500.
2. View component `/src/components/views/exam-comparison.tsx` — `'use client'` named export `ExamComparison` with exam picker (chips, quick-starts, min 2 validation), gradient Compare button, and a full report renderer (comparison table, common syllabus, overlap categories with color coding, career pathways, prerequisite differences, sources).

## Work Log
- Read shared infra: `types/index.ts`, `lib/ai/provider.ts`, `store/app-store.ts`, `hooks/use-api.ts`, `components/shared/source-badge.tsx` + `states.tsx`, shadcn `table.tsx`, `card.tsx`, `button.tsx`, `input.tsx`, and `landing.tsx` for visual conventions.
- Read `mock-provider.ts` to confirm the user/system prompt keyword ("comparison"/"compare") routes to the canned mock so the UI is explorable without an API key.
- Created API route with `runtime = "nodejs"` + `dynamic = "force-dynamic"`, strict JSON schema hint, defensive normalization (re-aligns `examNames` and `comparison.values` to the user's input order/length).
- Created the view component. Used explicit static Tailwind classes (EXAM_PALETTE, OVERLAP_STYLES) instead of dynamic `bg-${color}-500` strings — Tailwind JIT can't see dynamic class names and would purge them.
- Used violet/fuchsia gradient on actions; no indigo/blue primary; responsive table with `min-w-[640px]` and `overflow-x-auto`.
- Lint: my files have ZERO errors. The 2 lint errors and 1 warning are in shared infra (`app-shell.tsx`, `provider.ts`) which I was instructed not to touch.

## Files Created
- `/home/z/my-project/src/app/api/exam/compare/route.ts`
- `/home/z/my-project/src/components/views/exam-comparison.tsx`

## Key Decisions
- Defensive normalization in the API: if the AI returns `examNames` or `comparison.values` with the wrong order/length, the route re-aligns them to the user's input so the UI table never breaks.
- Used a `Section` wrapper sub-component for premium card-with-icon headers, applied uniformly to all six report sections.
- Empty state uses shared `EmptyState` from `components/shared/states.tsx`. Loading uses `LoadingState`. Errors use `ErrorState` with a retry callback.
- Save uses `saveItem({ type: "comparison", title, summary: "Comparison report", data: report })` + sonner toast.
- Context is set via `setContext("Comparing " + examNames.join(" vs "), "comparison")` on success.
