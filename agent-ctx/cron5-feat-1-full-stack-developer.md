# cron5-feat-1 — full-stack-developer (Analytics Dashboard)

## Task
Build unified analytics view with performance trends, time distribution, subject-wise charts. Aggregates from `useAppStore.saved`, `useStudyStore.sessions`, `useJournalStore.entries`, `useFlashcardStore.sets`, `useAchievementsStore.{totalXp,level}`.

## Files touched
- **NEW**: `src/components/views/analytics.tsx` (~1340 lines, `'use client'`, named export `Analytics`)
- **EDITED**: `src/store/app-store.ts` — added `| "analytics"` to `ViewKey` union
- **EDITED**: `src/components/app-shell.tsx` — imported `BarChart3` from lucide-react, imported `Analytics` view, added nav item to "tracking" group (`{ key: "analytics", label: "Analytics", icon: BarChart3, desc: "Performance insights" }`), added `case "analytics": return <Analytics />;` to render switch, added `"analytics"` to mobile bottom-nav exclusion filter

## Architecture decisions
- **Read-only aggregation**: NO new store, NO API route. Component reads live from 5 existing stores via Zustand selectors.
- **Hydration-safe**: `useMounted()` via `useSyncExternalStore` (noop subscribe, true/false snapshots) — mirrors `topic-mastery.tsx` + `exam-calendar.tsx` pattern. Renders skeleton during SSR/before hydration.
- **Defensive casts on `data: unknown`**: `(item.data ?? null) as Record<string, unknown> | null` then narrow with typed accessor casts (mirrors `my-research.tsx` `extractPaperPerf`/`extractMcqPerf`).
- **Attempt extractor**: handles both paper items (shape `{paper, analysis?, answers?}`) and mcq items (shape `{set:{mcqs}, answers?}`). Uses per-question answers Record when present (compute correct/incorrect/unattempted per question); falls back to `analysis` aggregates otherwise. Parses `analysis.avgTimePerQuestion` ("1m 30s"/"45s"/"90"/"1.5 min") into seconds.
- **Live achievements**: `useRecomputeAchievements()` mounted at top of component so XP/level stays live as user activity changes.

## Layout (8 sections)
1. **Header**: gradient BarChart3 icon tile + "Analytics Dashboard" + subtitle
2. **Time-range chips**: 7 days / 30 days (default) / All time — filters all charts via `rangeCutoffMs()` + `withinRange()`
3. **KPI row** (4 cards, AnimatedCounter): Total Study Time (sessions+journal min), Avg Accuracy (weighted by total questions across analysed attempts), Questions Attempted, Current Level (achievements store)
4. **Row 2**: Performance Trend (AreaChart, violet gradient area, accuracy% over recent analysed attempts) + Time Distribution (PieChart, by subject, 6-color palette donut with side legend)
5. **Row 3**: Daily Study Activity (stacked BarChart, sessions=violet + journal=fuchsia, last 7/30/90 days) + Mastery by Subject (RadarChart, top 8 subjects, 0-100 mastery = 0.5×flashcard + 0.5×attempt-accuracy)
6. **Row 4**: Difficulty-wise Performance (grouped BarChart, Easy/Medium/Hard × Correct=emerald/Incorrect=rose/Unattempted=amber)
7. **Row 5**: Topic Performance table (only if attempts have topicMap data) — topic | attempts | accuracy (with mini progress bar colored by tier) | avg time. Sortable by accuracy (click header toggles desc/asc).
8. **Row 6**: Insights card (violet/fuchsia gradient glass with blur orbs) — auto-generated lines: strongest subject, total minutes in range, most studied topic, recommendation (focus on weakest subject)
9. **Empty state**: PremiumEmptyState (BarChart3, violet accent, CTA "Generate a paper" → setView("paper-generator")) when no data at all

## Styling
- **NO indigo/blue primary**. Chart palette: violet=#8b5cf6, fuchsia=#d946ef, emerald=#10b981, amber=#f59e0b, sky=#0ea5e9, rose=#f43f5e.
- KPI cards: violet→fuchsia, emerald→teal, fuchsia→pink, amber→orange gradient icon tiles.
- Insights card: violet→fuchsia gradient border + blur orbs.
- Mobile-first: KPI 2-col→4-col on sm; chart rows stack→2-col on lg; table horizontally scrollable.
- AnimateMotion staggered entrances on KPI cards (delay i*0.05).
- All recharts via ResponsiveContainer for responsiveness.
- Custom ChartTooltip component (presentational, inline-styled color dots).

## Verification
- `cd /home/z/my-project && bun run lint 2>&1 | tail -20` → 0 errors, 0 warnings.
- `bunx tsc --noEmit` filtered to my files → 0 errors. (Pre-existing tsc errors in examples/, skills/, multi-exam/optimize/route.ts, lib/ai/provider.ts owned by other agents, untouched.)
- Shared infrastructure touched only as explicitly required: ViewKey union + AppShell nav/render/mobile-exclusion.

## Inventory delta
- 1 new view (Analytics) → now 23 views total (was 22)
- 0 new stores (read-only aggregation)
- 0 new API routes
