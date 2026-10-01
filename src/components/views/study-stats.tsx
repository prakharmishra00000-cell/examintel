"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sun,
  Brain,
  Target,
  BarChart3,
  Lightbulb,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Minus,
  Timer,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { useAppStore } from "@/store/app-store";
import { useStudyStore, type StudySession } from "@/store/study-store";
import {
  useJournalStore,
  type JournalEntry,
  type JournalMood,
} from "@/store/journal-store";
import { AnimatedCounter, PremiumEmptyState } from "@/components/shared/premium-empty-state";

// ============================================================
// Study Stats Deep Dive
// Granular per-subject time analysis with trend insights.
// Distinct from Analytics view: focuses on STUDY TIME patterns
// (when you study, how long, what subjects, mood correlations).
// Read-only — no new store, no API route.
// ============================================================

// ---------- Chart palette (NO indigo/blue) ----------
const CHART = {
  violet: "#8b5cf6",
  fuchsia: "#d946ef",
  emerald: "#10b981",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  rose: "#f43f5e",
  zinc: "#71717a",
} as const;

// Subject palette for the distribution chart (cycles through these).
const SUBJECT_PALETTE = [
  CHART.violet,
  CHART.fuchsia,
  CHART.emerald,
  CHART.amber,
  CHART.sky,
  CHART.rose,
];

// ---------- Hydration-safe mounted guard (mirrors analytics.tsx) ----------
// useSyncExternalStore with noop subscribe + true(client)/false(server) —
// the lint-compliant "is client" pattern that avoids react-hooks/set-state-in-effect.
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// ---------- Small defensive helpers (mirrors analytics.tsx) ----------
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function numOr(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

// Normalize subject strings (trim, collapse spaces, fallback "General").
function normSubject(s: unknown): string {
  const t = str(s);
  if (!t) return "General";
  return t.replace(/\s+/g, " ");
}

// ---------- Types ----------
type RangeKey = "7" | "30" | "90" | "all";

const RANGES: { k: RangeKey; label: string }[] = [
  { k: "7", label: "7 days" },
  { k: "30", label: "30 days" },
  { k: "90", label: "90 days" },
  { k: "all", label: "All time" },
];

// ---------- Range helpers ----------
function rangeCutoffMs(range: RangeKey): number | null {
  if (range === "all") return null;
  const days = range === "7" ? 7 : range === "30" ? 30 : 90;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}
function withinRange(iso: string, cutoff: number | null): boolean {
  if (cutoff === null) return true;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return true; // keep if unparseable (better to show than hide)
  return t >= cutoff;
}
function rangeDays(range: RangeKey): number {
  if (range === "all") return 0; // 0 = "compute from earliest session date"
  return range === "7" ? 7 : range === "30" ? 30 : 90;
}
function rangeLabel(range: RangeKey): string {
  return range === "all" ? "all time" : `last ${range} days`;
}

// ---------- Mood helpers ----------
const MOOD_SCORE: Record<JournalMood, number> = {
  great: 4,
  good: 3,
  okay: 2,
  struggle: 1,
};
const MOOD_LABEL: Record<JournalMood, string> = {
  great: "Great",
  good: "Good",
  okay: "Okay",
  struggle: "Struggle",
};

// ---------- Day-of-week helpers ----------
const DOW_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Returns 0-6 where 0 = Monday (ISO weekday).
function isoWeekday(d: Date): number {
  const w = d.getDay(); // 0=Sunday..6=Saturday
  return (w + 6) % 7; // shift to 0=Monday
}

// ---------- Hour helpers ----------
// We display hours 6 AM (6) through 10 PM (22) inclusive.
const HOUR_START = 6;
const HOUR_END = 22;
function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}
function hourTo12(h: number): string {
  // 6 -> "6 AM", 12 -> "12 PM", 13 -> "1 PM"
  return hourLabel(h);
}

// ---------- Hour color classifier ----------
// Bars are colored by productivity tier:
// - peak (top 25% of hours with minutes > 0): violet
// - mid  (middle 50%): fuchsia
// - low  (bottom 25% or zero): muted zinc
function classifyHourTiers(
  hourly: { hour: number; minutes: number }[],
): Map<number, "peak" | "mid" | "low"> {
  const map = new Map<number, "peak" | "mid" | "low">();
  const withMins = hourly.filter((h) => h.minutes > 0);
  const sorted = [...withMins].sort((a, b) => b.minutes - a.minutes);
  const n = sorted.length;
  if (n === 0) {
    for (const h of hourly) map.set(h.hour, "low");
    return map;
  }
  // Top 25% = peak, bottom 25% = low, rest = mid.
  const peakCount = Math.max(1, Math.round(n * 0.25));
  const lowCount = Math.max(1, Math.round(n * 0.25));
  for (let i = 0; i < n; i++) {
    if (i < peakCount) map.set(sorted[i]!.hour, "peak");
    else if (i >= n - lowCount) map.set(sorted[i]!.hour, "low");
    else map.set(sorted[i]!.hour, "mid");
  }
  for (const h of hourly) {
    if (!map.has(h.hour)) map.set(h.hour, "low");
  }
  return map;
}
function hourColor(tier: "peak" | "mid" | "low"): string {
  return tier === "peak" ? CHART.violet : tier === "mid" ? CHART.fuchsia : CHART.zinc;
}

// ---------- Custom tooltip (used by charts) ----------
function ChartTooltip({
  active,
  payload,
  label,
  unit = "min",
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-background/95 backdrop-blur-md px-3 py-2 shadow-lg text-xs">
      {label !== undefined && label !== "" && (
        <div className="font-medium text-foreground mb-1">{String(label)}</div>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            {p.color && <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />}
            <span className="text-muted-foreground">{p.name ?? p.dataKey}</span>
            <span className="ml-auto font-mono font-semibold text-foreground">
              {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
              {unit && !String(p.dataKey ?? "").includes("count") ? ` ${unit}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Mood tooltip (scatter) ----------
function MoodScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { duration: number; mood: number; count: number; bucket: string } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]!.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-border bg-background/95 backdrop-blur-md px-3 py-2 shadow-lg text-xs">
      <div className="font-medium text-foreground mb-1">{p.bucket} min sessions</div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: CHART.fuchsia }} />
          <span className="text-muted-foreground">Avg mood</span>
          <span className="ml-auto font-mono font-semibold text-foreground">
            {p.mood.toFixed(2)} / 4
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: CHART.emerald }} />
          <span className="text-muted-foreground">Sessions</span>
          <span className="ml-auto font-mono font-semibold text-foreground">{p.count}</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Format helpers ----------
function fmtMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ============================================================
// Main component
// ============================================================
export function StudyStats() {
  const mounted = useMounted();
  const setView = useAppStore((s) => s.setView);
  const setContext = useAppStore((s) => s.setContext);

  const sessions = useStudyStore((s) => s.sessions);
  const entries = useJournalStore((s) => s.entries);

  const [range, setRange] = useState<RangeKey>("30");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // Set AI assistant context on mount.
  useMemo(() => {
    setContext("Study Stats Deep Dive", "general");
  }, [setContext]);

  // ---------- Aggregate ----------
  const data = useMemo(() => {
    const cutoff = rangeCutoffMs(range);

    // Filter sessions by date (ISO timestamp).
    const sessFiltered = sessions.filter((s) => {
      const iso = str(s.date) ?? "";
      return iso ? withinRange(iso, cutoff) : true;
    });
    // Journal entries: prefer date (YYYY-MM-DD), fallback createdAt.
    const jourFiltered = entries.filter((e) => {
      const iso = str(e.date) ?? str(e.createdAt) ?? "";
      return iso ? withinRange(iso, cutoff) : true;
    });

    // Total minutes across sessions + journal.
    const sessMinutes = sessFiltered.reduce(
      (sum, s) => sum + numOr(s.durationMinutes, 0),
      0,
    );
    const jourMinutes = jourFiltered.reduce(
      (sum, e) => sum + numOr(e.durationMinutes, 0),
      0,
    );
    const totalMinutes = sessMinutes + jourMinutes;

    // Range days: for "all", derive from earliest activity date.
    let rDays = rangeDays(range);
    if (rDays === 0) {
      // "All time" — span from earliest session/entry date to today.
      const allDates: number[] = [];
      for (const s of sessions) {
        const t = Date.parse(str(s.date) ?? "");
        if (!Number.isNaN(t)) allDates.push(t);
      }
      for (const e of entries) {
        const t = Date.parse(str(e.date) ?? str(e.createdAt) ?? "");
        if (!Number.isNaN(t)) allDates.push(t);
      }
      if (allDates.length > 0) {
        const earliest = Math.min(...allDates);
        const spanDays = Math.max(
          1,
          Math.ceil((Date.now() - earliest) / (24 * 60 * 60 * 1000)),
        );
        rDays = spanDays;
      } else {
        rDays = 1; // avoid div-by-zero; no data anyway
      }
    }

    // Active days: distinct YYYY-MM-DD with any activity.
    const activeDaySet = new Set<string>();
    for (const s of sessFiltered) {
      const d = (str(s.date) ?? "").slice(0, 10);
      if (d) activeDaySet.add(d);
    }
    for (const e of jourFiltered) {
      const d = (str(e.date) ?? str(e.createdAt) ?? "").slice(0, 10);
      if (d) activeDaySet.add(d);
    }
    const activeDays = activeDaySet.size;
    const consistency = rDays > 0 ? Math.min(100, (activeDays / rDays) * 100) : 0;
    const avgDaily = rDays > 0 ? totalMinutes / rDays : 0;

    // ---------- Hourly productivity (sessions only — journal entries have day-level date) ----------
    // Use sessions: parse hour from ISO date. For journal entries, try createdAt (full ISO timestamp)
    // since date is YYYY-MM-DD. Be defensive — only count if the parsed hour looks plausible.
    const hourBuckets: { hour: number; minutes: number; sessions: number }[] = [];
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      hourBuckets.push({ hour: h, minutes: 0, sessions: 0 });
    }
    const hourIdx = (h: number) => h - HOUR_START;

    function addHourMinutes(iso: string, minutes: number) {
      if (!iso || minutes <= 0) return;
      const t = Date.parse(iso);
      if (Number.isNaN(t)) return;
      const d = new Date(t);
      const h = d.getHours();
      if (h < HOUR_START || h > HOUR_END) return; // outside display window → skip
      const idx = hourIdx(h);
      if (idx < 0 || idx >= hourBuckets.length) return;
      hourBuckets[idx]!.minutes += minutes;
      hourBuckets[idx]!.sessions += 1;
    }

    for (const s of sessFiltered) {
      addHourMinutes(str(s.date) ?? "", numOr(s.durationMinutes, 0));
    }
    for (const e of jourFiltered) {
      // Journal date is YYYY-MM-DD (no time) — try createdAt as proxy for "when logged".
      addHourMinutes(str(e.createdAt) ?? "", numOr(e.durationMinutes, 0));
    }

    const hourly = hourBuckets.map((b) => ({
      hour: b.hour,
      label: hourTo12(b.hour),
      minutes: b.minutes,
      sessions: b.sessions,
    }));

    // Peak hour = the hour with max minutes.
    const peakHour = hourly.reduce<{ hour: number; minutes: number } | null>(
      (best, h) => (h.minutes > 0 && (!best || h.minutes > best.minutes) ? { hour: h.hour, minutes: h.minutes } : best),
      null,
    );

    // ---------- Subject distribution (stacked: study vs journal) ----------
    const subjectMap = new Map<string, { study: number; journal: number }>();
    for (const s of sessFiltered) {
      const subj = normSubject(s.subject);
      const cur = subjectMap.get(subj) ?? { study: 0, journal: 0 };
      cur.study += numOr(s.durationMinutes, 0);
      subjectMap.set(subj, cur);
    }
    for (const e of jourFiltered) {
      const subj = normSubject(e.subject);
      const cur = subjectMap.get(subj) ?? { study: 0, journal: 0 };
      cur.journal += numOr(e.durationMinutes, 0);
      subjectMap.set(subj, cur);
    }
    const subjectDist = [...subjectMap.entries()]
      .map(([subject, v]) => ({
        subject,
        study: v.study,
        journal: v.journal,
        total: v.study + v.journal,
      }))
      .sort((a, b) => b.total - a.total);

    // ---------- Day-of-week pattern ----------
    const dowBuckets = DOW_FULL.map((day) => ({ day, minutes: 0, sessions: 0 }));
    function addDowMinutes(iso: string, minutes: number) {
      if (!iso || minutes <= 0) return;
      const t = Date.parse(iso);
      if (Number.isNaN(t)) return;
      const d = new Date(t);
      const idx = isoWeekday(d);
      if (idx < 0 || idx >= dowBuckets.length) return;
      dowBuckets[idx]!.minutes += minutes;
      dowBuckets[idx]!.sessions += 1;
    }
    for (const s of sessFiltered) {
      addDowMinutes(str(s.date) ?? "", numOr(s.durationMinutes, 0));
    }
    for (const e of jourFiltered) {
      addDowMinutes(str(e.date) ?? str(e.createdAt) ?? "", numOr(e.durationMinutes, 0));
    }
    const dow = dowBuckets.map((b, i) => ({
      day: DOW_SHORT[i]!,
      dayFull: DOW_FULL[i]!,
      minutes: b.minutes,
      sessions: b.sessions,
    }));

    // Best / worst day (only days with minutes > 0).
    const dowSorted = [...dow].filter((d) => d.minutes > 0).sort((a, b) => b.minutes - a.minutes);
    const bestDay = dowSorted[0] ?? null;
    const worstDay = dowSorted[dowSorted.length - 1] ?? null;

    // ---------- Mood vs duration scatter ----------
    // Group journal entries into duration buckets of 15-min width (0-15, 15-30, ...).
    // Each bucket: avg mood + count.
    const BUCKET_W = 15;
    const buckets = new Map<
      number,
      { sum: number; count: number }
    >();
    for (const e of jourFiltered) {
      const dur = numOr(e.durationMinutes, 0);
      if (dur <= 0) continue;
      const b = Math.floor(dur / BUCKET_W);
      const cur = buckets.get(b) ?? { sum: 0, count: 0 };
      cur.sum += MOOD_SCORE[e.mood] ?? 2.5;
      cur.count += 1;
      buckets.set(b, cur);
    }
    const scatter = [...buckets.entries()]
      .map(([b, v]) => {
        const start = b * BUCKET_W;
        const end = start + BUCKET_W;
        return {
          duration: start + BUCKET_W / 2, // bucket midpoint for x
          bucket: `${start}-${end}`,
          mood: v.count > 0 ? v.sum / v.count : 0,
          count: v.count,
        };
      })
      .sort((a, b) => a.duration - b.duration);

    // Mood-best duration bucket = bucket with highest avg mood (require ≥ 2 entries for stability).
    const moodBest = [...scatter]
      .filter((s) => s.count >= 2)
      .sort((a, b) => b.mood - a.mood)[0];

    // ---------- Subject deep-dive rows ----------
    // Build per-subject aggregates: total time, sessions, avg duration, top topic, mood trend.
    const subjectAgg = new Map<
      string,
      {
        subject: string;
        total: number;
        sessions: number;
        topicMinutes: Map<string, number>;
        moodEntries: { date: string; mood: number }[];
      }
    >();

    function pushSubjectEntry(subject: string, topic: string | undefined, minutes: number, date: string, mood?: number) {
      const subj = normSubject(subject);
      const cur = subjectAgg.get(subj) ?? {
        subject: subj,
        total: 0,
        sessions: 0,
        topicMinutes: new Map<string, number>(),
        moodEntries: [],
      };
      cur.total += minutes;
      cur.sessions += 1;
      if (topic) {
        const t = topic;
        cur.topicMinutes.set(t, (cur.topicMinutes.get(t) ?? 0) + minutes);
      }
      if (typeof mood === "number") {
        cur.moodEntries.push({ date, mood });
      }
      subjectAgg.set(subj, cur);
    }

    for (const s of sessFiltered) {
      pushSubjectEntry(
        str(s.subject) ?? "General",
        str(s.topic),
        numOr(s.durationMinutes, 0),
        str(s.date) ?? "",
      );
    }
    for (const e of jourFiltered) {
      pushSubjectEntry(
        str(e.subject) ?? "General",
        str(e.topic),
        numOr(e.durationMinutes, 0),
        str(e.date) ?? str(e.createdAt) ?? "",
        MOOD_SCORE[e.mood] ?? undefined,
      );
    }

    const subjectRows = [...subjectAgg.values()].map((a) => {
      // Top topic by minutes
      const topTopicEntry = [...a.topicMinutes.entries()].sort((x, y) => y[1] - x[1])[0] ?? null;
      const topTopic = topTopicEntry ? topTopicEntry[0] : null;

      // Mood trend: split sorted entries into first/second half, compare averages.
      let moodTrend: "up" | "down" | "flat" | null = null;
      let moodTrendDelta = 0;
      const me = [...a.moodEntries].sort((x, y) => x.date.localeCompare(y.date));
      if (me.length >= 4) {
        const mid = Math.floor(me.length / 2);
        const firstAvg = me.slice(0, mid).reduce((s, e) => s + e.mood, 0) / Math.max(1, mid);
        const secondAvg =
          me.slice(mid).reduce((s, e) => s + e.mood, 0) /
          Math.max(1, me.length - mid);
        moodTrendDelta = secondAvg - firstAvg;
        if (moodTrendDelta > 0.2) moodTrend = "up";
        else if (moodTrendDelta < -0.2) moodTrend = "down";
        else moodTrend = "flat";
      } else if (me.length > 0) {
        moodTrend = "flat";
      }

      return {
        subject: a.subject,
        total: a.total,
        sessions: a.sessions,
        avgDuration: a.sessions > 0 ? a.total / a.sessions : 0,
        topTopic,
        moodTrend,
        moodTrendDelta,
      };
    });

    // Sort by total time (default desc). Click toggles.
    subjectRows.sort((a, b) => (sortDir === "desc" ? b.total - a.total : a.total - b.total));

    // ---------- Insight building blocks ----------
    const mostStudied = subjectDist[0] ?? null;
    const leastStudied = subjectDist[subjectDist.length - 1] ?? null;

    // ---------- hasAnyData ----------
    const hasAnyData = sessFiltered.length > 0 || jourFiltered.length > 0;

    return {
      totalMinutes,
      rDays,
      activeDays,
      consistency,
      avgDaily,
      hourly,
      peakHour,
      subjectDist,
      dow,
      bestDay,
      worstDay,
      scatter,
      moodBest,
      subjectRows,
      mostStudied,
      leastStudied,
      hasAnyData,
      filteredSessions: sessFiltered.length,
      filteredEntries: jourFiltered.length,
    };
  }, [sessions, entries, range, sortDir]);

  // ---------- Skeleton (during hydration) ----------
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="h-7 w-72 rounded-md bg-muted/60 animate-pulse" />
          <div className="h-4 w-96 max-w-full rounded-md bg-muted/40 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-border bg-muted/30 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-xl border border-border bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ---------- Empty state ----------
  if (!data.hasAnyData) {
    return (
      <div className="space-y-6">
        <Header />
        <PremiumEmptyState
          icon={Activity}
          accent="violet"
          title="No study sessions yet"
          description="Start a focus session with the Study Timer or write a journal entry to see your study habits analyzed here — peak hours, subject distribution, mood correlations, and more."
          ctaLabel="Open Study Timer"
          ctaIcon={Timer}
          ctaOnClick={() => setView("study-timer")}
        />
      </div>
    );
  }

  // ---------- KPI cards ----------
  const peakHourLabel = data.peakHour ? hourTo12(data.peakHour.hour) : "—";
  const kpis = [
    {
      label: "Total Study Time",
      value: data.totalMinutes,
      suffix: "min",
      display: fmtMinutes(data.totalMinutes),
      icon: Clock,
      grad: "from-violet-500 to-fuchsia-500",
      sub: `${data.filteredSessions + data.filteredEntries} sessions in ${rangeLabel(range)}`,
      raw: data.totalMinutes,
    },
    {
      label: "Avg Daily Time",
      value: data.avgDaily,
      suffix: "min",
      display: fmtMinutes(data.avgDaily),
      icon: Timer,
      grad: "from-fuchsia-500 to-pink-500",
      sub: `across ${data.rDays} days`,
      raw: data.avgDaily,
    },
    {
      label: "Most Productive Day",
      value: 0,
      suffix: "",
      display: data.bestDay ? data.bestDay.dayFull : "—",
      icon: TrendingUp,
      grad: "from-emerald-500 to-teal-500",
      sub: data.bestDay ? `${fmtMinutes(data.bestDay.minutes)} total` : "no sessions yet",
      raw: data.bestDay?.minutes ?? 0,
      hideCounter: true,
    },
    {
      label: "Study Consistency",
      value: data.consistency,
      suffix: "%",
      display: `${Math.round(data.consistency)}%`,
      icon: Target,
      grad: "from-amber-500 to-orange-500",
      sub: `${data.activeDays} of ${data.rDays} days active`,
      raw: data.consistency,
    },
  ];

  // ---------- Hour tier classifier (for coloring bars) ----------
  const hourTiers = classifyHourTiers(data.hourly.map((h) => ({ hour: h.hour, minutes: h.minutes })));

  // ---------- Day-vs-day percentage ----------
  const dayDeltaPct =
    data.bestDay && data.worstDay && data.worstDay.minutes > 0
      ? Math.round(((data.bestDay.minutes - data.worstDay.minutes) / data.worstDay.minutes) * 100)
      : null;

  // ---------- Mood recommendation ----------
  function moodRecommendation(dur: number | undefined): string {
    if (!dur) return "keep tracking mood to spot your sweet-spot duration";
    if (dur < 15) return "slightly longer focus blocks (20-30 min) may boost satisfaction";
    if (dur < 45) return `${dur}-${dur + 15} min sprints suit you — keep them in your routine`;
    if (dur < 75) return "your focus holds well past an hour — schedule deep-work blocks";
    return "very long sessions work for you — guard against burnout with short breaks";
  }

  // ---------- Consistency tip ----------
  function consistencyTip(pct: number): string {
    if (pct >= 80) return "Outstanding consistency — protect this routine.";
    if (pct >= 50) return "Solid base — try a morning anchor to push past 80%.";
    if (pct >= 25) return "Add one fixed daily slot (even 20 min) to climb faster.";
    return "Start tiny — a daily 15-min slot will compound quickly.";
  }

  return (
    <div className="space-y-6 pb-4">
      <Header />

      {/* Time range selector */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">Range:</span>
        {RANGES.map((r) => (
          <button
            key={r.k}
            onClick={() => setRange(r.k)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition border",
              range === r.k
                ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent shadow-md shadow-violet-500/20"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Row 1: KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const KIcon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="relative overflow-hidden border-border/70 h-full">
                <div className={cn("absolute -top-12 -right-12 h-28 w-28 rounded-full blur-2xl opacity-25 bg-gradient-to-br", kpi.grad)} />
                <CardContent className="relative p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow", kpi.grad)}>
                      <KIcon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                  </div>
                  <div className="mt-3">
                    {kpi.hideCounter ? (
                      <div className={cn("text-2xl sm:text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent", kpi.grad)}>
                        {kpi.display}
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <AnimatedCounter
                          value={Math.round(kpi.raw)}
                          className={cn("text-2xl sm:text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent", kpi.grad)}
                        />
                        <span className="text-sm font-medium text-muted-foreground">{kpi.suffix}</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{kpi.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Row 2: Hourly productivity + Subject distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly productivity heatmap */}
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow">
                  <Sun className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Hourly Productivity</CardTitle>
                  <CardDescription className="text-xs">When you study best — colored by output tier</CardDescription>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: CHART.violet }} />Peak</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: CHART.fuchsia }} />Mid</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: CHART.zinc }} />Low</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourly} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={42}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }}
                    content={<ChartTooltip unit="min" />}
                  />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]} name="Minutes studied">
                    {data.hourly.map((h) => {
                      const tier = hourTiers.get(h.hour) ?? "low";
                      return <Cell key={h.hour} fill={hourColor(tier)} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Subject time distribution */}
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Subject Time Distribution</CardTitle>
                  <CardDescription className="text-xs">Stacked by source — sessions vs journal</CardDescription>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: CHART.violet }} />Sessions</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: CHART.fuchsia }} />Journal</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {data.subjectDist.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No subjects yet</div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={data.subjectDist}
                    margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="subject"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      width={92}
                      // Truncate long subject names visually.
                      tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }}
                      content={<ChartTooltip unit="min" />}
                    />
                    <Bar dataKey="study" stackId="t" fill={CHART.violet} name="Sessions" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="journal" stackId="t" fill={CHART.fuchsia} name="Journal" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Day-of-week + Mood vs Duration scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Day-of-week pattern */}
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Weekly Rhythm</CardTitle>
                <CardDescription className="text-xs">Minutes per day — shows your weekly study pattern</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dow} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }}
                    content={<ChartTooltip unit="min" />}
                  />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]} name="Minutes">
                    {data.dow.map((d, i) => {
                      // Highlight best day emerald, others violet, zero activity = zinc.
                      const isBest = data.bestDay && data.bestDay.day === d.day && d.minutes > 0;
                      const color = d.minutes === 0 ? CHART.zinc : isBest ? CHART.emerald : CHART.violet;
                      return <Cell key={i} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Mood vs Duration scatter */}
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Mood vs Duration</CardTitle>
                  <CardDescription className="text-xs">Bubble size = session count · Y = mood (1–4)</CardDescription>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end text-[10px] text-muted-foreground">
                <span><span className="text-emerald-500 font-semibold">4</span> = Great</span>
                <span><span className="text-rose-500 font-semibold">1</span> = Struggle</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {data.scatter.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No journal entries with mood yet
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      type="number"
                      dataKey="duration"
                      name="Duration"
                      unit=" min"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      domain={[0, "dataMax"]}
                      label={{ value: "Duration (min)", position: "insideBottom", offset: -8, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }}
                    />
                    <YAxis
                      type="number"
                      dataKey="mood"
                      name="Mood"
                      domain={[0, 4.5]}
                      ticks={[1, 2, 3, 4]}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => MOOD_LABEL[(["struggle", "okay", "good", "great"] as JournalMood[])[Math.round(v) - 1] ?? "okay"]}
                      width={48}
                    />
                    <ZAxis type="number" dataKey="count" range={[60, 600]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--border))" }}
                      content={<MoodScatterTooltip />}
                    />
                    <Scatter data={data.scatter} fill={CHART.fuchsia} fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Subject deep-dive table */}
      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Subject Deep Dive</CardTitle>
              <CardDescription className="text-xs">Granular per-subject time, sessions, topics, and mood trend</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {data.subjectRows.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No subject-level data in this range
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Subject</th>
                    <th className="px-3 py-2 font-medium">
                      <button
                        onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                        className="inline-flex items-center gap-1 hover:text-foreground transition"
                        title="Sort by total time"
                      >
                        Total Time
                        {sortDir === "desc" ? (
                          <ChevronDown className="h-3 w-3 text-violet-500" />
                        ) : (
                          <ChevronUp className="h-3 w-3 text-violet-500" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-2 font-medium text-right">Sessions</th>
                    <th className="px-3 py-2 font-medium text-right">Avg Duration</th>
                    <th className="px-3 py-2 font-medium">Top Topic</th>
                    <th className="px-3 py-2 font-medium">Mood Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subjectRows.map((row, i) => {
                    const colorIdx = i % SUBJECT_PALETTE.length;
                    const dotColor = SUBJECT_PALETTE[colorIdx];
                    return (
                      <tr
                        key={row.subject}
                        className="border-b border-border/60 last:border-0 hover:bg-accent/40 transition"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: dotColor }} />
                            <span className="font-medium truncate max-w-[140px]" title={row.subject}>{row.subject}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">{fmtMinutes(row.total)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-right">{row.sessions}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-right">{fmtMinutes(row.avgDuration)}</td>
                        <td className="px-3 py-2.5">
                          {row.topTopic ? (
                            <span className="inline-flex max-w-[180px] truncate text-xs text-muted-foreground" title={row.topTopic}>
                              {row.topTopic}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {row.moodTrend === null ? (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          ) : row.moodTrend === "up" ? (
                            <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">
                              <TrendingUp className="h-3 w-3" />
                              <span className="text-[10px]">+{row.moodTrendDelta.toFixed(1)}</span>
                            </Badge>
                          ) : row.moodTrend === "down" ? (
                            <Badge className="gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/15">
                              <TrendingDown className="h-3 w-3" />
                              <span className="text-[10px]">{row.moodTrendDelta.toFixed(1)}</span>
                            </Badge>
                          ) : (
                            <Badge className="gap-1 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/15">
                              <Minus className="h-3 w-3" />
                              <span className="text-[10px]">stable</span>
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 5: Auto-generated insights */}
      <Card className="relative overflow-hidden border-violet-500/30">
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl opacity-30 bg-gradient-to-br from-violet-500 to-fuchsia-500" />
        <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full blur-3xl opacity-20 bg-gradient-to-br from-fuchsia-500 to-pink-500" />
        <CardHeader className="relative pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Insights</CardTitle>
              <CardDescription className="text-xs">Auto-generated from your study habits in {rangeLabel(range)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InsightItem
              icon={Sun}
              accent="violet"
              title="Peak study hour"
              body={
                data.peakHour
                  ? `Your peak study hour is ${hourTo12(data.peakHour.hour)} — schedule hard topics then.`
                  : "No hour-of-day signal yet — log a few sessions to reveal your peak."
              }
            />
            <InsightItem
              icon={BarChart3}
              accent="fuchsia"
              title="Subject spread"
              body={
                data.mostStudied && data.leastStudied && data.mostStudied.subject !== data.leastStudied.subject
                  ? `Most studied subject: ${data.mostStudied.subject} (${fmtMinutes(data.mostStudied.total)}). Least: ${data.leastStudied.subject} (${fmtMinutes(data.leastStudied.total)}).`
                  : data.mostStudied
                    ? `Only one subject in range: ${data.mostStudied.subject} (${fmtMinutes(data.mostStudied.total)}). Branch out to balance your prep.`
                    : "No subject-level activity yet — start a study session or journal entry."
              }
            />
            <InsightItem
              icon={TrendingUp}
              accent="emerald"
              title="Weekly rhythm"
              body={
                data.bestDay && data.worstDay && dayDeltaPct !== null
                  ? `You study ${dayDeltaPct}% more on ${data.bestDay.dayFull} than ${data.worstDay.dayFull}.`
                  : data.bestDay
                    ? `${data.bestDay.dayFull} is your strongest day so far — keep stacking wins there.`
                    : "No weekly pattern yet — log a few sessions across different days."
              }
            />
            <InsightItem
              icon={Brain}
              accent="amber"
              title="Mood sweet spot"
              body={
                data.moodBest
                  ? `Your mood is best after ~${data.moodBest.duration} min sessions — ${moodRecommendation(data.moodBest.duration)}.`
                  : "Log mood on your journal entries (4+ sessions needed) to spot your sweet-spot duration."
              }
            />
            <InsightItem
              icon={Target}
              accent="rose"
              title="Consistency"
              body={`Consistency: ${Math.round(data.consistency)}% of days active. ${consistencyTip(data.consistency)}`}
              className="sm:col-span-2"
            />
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              onClick={() => setView("analytics")}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-500 hover:text-violet-600 transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Open full Analytics
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Header ----------
function Header() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-1"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
          <div className="relative h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg">
            <Activity className="h-5 w-5" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
            Study Stats Deep Dive
          </h1>
          <p className="text-sm text-muted-foreground">
            Understand your study habits. When you&apos;re most productive, what needs more time, and how you&apos;re trending.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ---------- Insight item ----------
function InsightItem({
  icon: Icon,
  accent,
  title,
  body,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: "violet" | "emerald" | "amber" | "rose" | "sky" | "fuchsia";
  title: string;
  body: string;
  className?: string;
}) {
  const accents: Record<string, { grad: string; text: string; bg: string; border: string }> = {
    violet: { grad: "from-violet-500 to-fuchsia-500", text: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20" },
    fuchsia: { grad: "from-fuchsia-500 to-pink-500", text: "text-fuchsia-500", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20" },
    emerald: { grad: "from-emerald-500 to-teal-500", text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    amber: { grad: "from-amber-500 to-orange-500", text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    sky: { grad: "from-sky-500 to-cyan-500", text: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20" },
    rose: { grad: "from-rose-500 to-pink-500", text: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  };
  const a = accents[accent] ?? accents.violet;
  return (
    <div className={cn("relative rounded-xl border p-3 bg-background/60 backdrop-blur-sm", a.border, className)}>
      <div className="flex items-start gap-2.5">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow", a.grad)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("text-[10px] font-semibold uppercase tracking-wider mb-0.5", a.text)}>{title}</div>
          <p className="text-sm leading-snug text-foreground/90">{body}</p>
        </div>
      </div>
    </div>
  );
}
