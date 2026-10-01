# Task 7-a — full-stack-developer (Question Explainer)

## Task
Build the AI Question Explainer feature:
- POST `/api/question/explain` returning strict `QuestionExplanation` JSON via `getLLM().json<T>()`
- `QuestionExplainer` client view with 5-level progressive reveal

## Files Created
1. `src/app/api/question/explain/route.ts` — nodejs + force-dynamic POST endpoint. Validates `{ question }` body, calls `getLLM().json<QuestionExplanation>(SYSTEM, USER, SCHEMA)`. System prompt enforces 5 progressive levels (Quick Hint must NOT reveal answer → Concept → Detailed Solution → optional Exam Shortcut → Learning Insight) + Knowledge-Graph metadata (subject/topic/subtopic/concept/difficulty/questionType/relatedConcepts/prerequisites) + AI_ANALYSIS source tagging. Defensive normalization: backfills generatedAt + originalQuestion + forces all source.type to "AI_ANALYSIS". Returns `{ explanation }` or `{ error }` (500).
2. `src/components/views/question-explainer.tsx` — `'use client'` named export `QuestionExplainer`. Header + Textarea + gradient Explain button + 6 example chips. Calls `useApi().call('/api/question/explain', { question })`. Shows LoadingState. Calls `setContext("Question: " + question.slice(0,60), "explanation")` on result. Progressive reveal: Level 1 always shown; Levels 2-5 gated behind reveal buttons (Level 4 button hidden when AI omits `level4_examShortcut`). Each level is a Card with gradient icon (Lightbulb/Brain/ListOrdered/Zap/GraduationCap). Level 3: numbered steps, formula in mono `<pre>`, substitution + calculation in mono `<code>` 2-col grid, final answer in highlighted accent box. MetadataBar at top with subject/topic/subtopic/concept/difficulty/questionType chips + related concepts + prerequisites chips. SourceBadgeList for sources. Save to My Research button → `saveItem({ type:"explanation", title: question.slice(0,60), summary: \`${topic} · ${difficulty}\`, data: explanation })` + sonner toast. EmptyState before first explain.

## Accent Colors Used (per spec)
- Level 1 (Quick Hint): amber → orange gradient
- Level 2 (Concept): violet → purple gradient
- Level 3 (Detailed Solution): sky → cyan gradient
- Level 4 (Exam Shortcut): emerald → teal gradient
- Level 5 (Learning Insight): fuchsia → pink gradient
- Primary action gradient: violet → fuchsia (NO indigo/blue)

## Lint Status
- My two files: ZERO lint errors, ZERO TypeScript errors.
- Pre-existing shared-infra lint issues (app-shell.tsx SidebarContent, provider.ts unused eslint-disable) were NOT touched per instructions.

## Key Notes for Downstream Agents
- The route uses a very detailed SYSTEM prompt that enforces strict-JSON shape and source-tagging — if a downstream agent wants to extend the explanation (e.g., add to Knowledge Graph), they can read `explanation.subject/topic/subtopic/concept/difficulty/relatedConcepts/prerequisites` directly.
- Save action stores full `QuestionExplanation` object under `data` — searchable in My Research as type `"explanation"`.
- The mock provider should also be updated if a no-key demo of this feature is desired (currently relies on the LLM producing JSON; the structured-mock fallback will still extract JSON from its canned response).
