"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BarChart3,
  Plus,
  X,
  Sparkles,
  Save,
  Clock,
  Target,
  FileText,
  TrendingUp,
  Lightbulb,
  Layers,
  Scale,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart as RPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { useApi } from "@/hooks/use-api";
import { useAppStore } from "@/store/app-store";
import type { ExamPattern, ExamResearchReport } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingState } from "@/components/shared/states";
import { PremiumEmptyState } from "@/components/shared/premium-empty-state";
import { cn } from "@/lib/utils";

// ============================================================
// Exam Pattern Analyzer
// Compare exam patterns (questions, marks, duration, negative
// marking, sections) across multiple exams with visual charts.
// Reuses the existing /api/exam/research endpoint — for each
// exam we fetch its ExamResearchReport and extract `.pattern`.
// ============================================================

const MAX_EXAMS = 4;

const QUICK_PRESETS: { label: string; exams: string[] }[] = [
  { label: "SSC CGL vs CHSL vs NTPC", exams: ["SSC CGL", "SSC CHSL", "RRB NTPC"] },
  { label: "GATE CS vs GATE ME", exams: ["GATE CS", "GATE ME"] },
];

// Chart palette (NO indigo/blue)
const CHART = {
  violet: "#8b5cf6",
  fuchsia: "#d946ef",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
} as const;

const PIE_PALETTE = [CHART.violet, CHART.fuchsia, CHART.emerald, CHART.amber, CHART.rose];

// ---------- Parsing helpers ----------
// "1 hour 30 minutes" / "90 min" / "120" / "2 hrs" → number of minutes.
function parseDurationMinutes(duration: string): number | null {
  if (!duration || typeof duration !== "string") return null;
  const s = duration.toLowerCase().trim();
  if (!s) return null;
  if (/\b(no|none|nil|n\/a)\b/.test(s)) return null;
  // "1 hour 30 minutes" / "2 hours" / "1 hr 30"
  let m = s.match(/(\d+)\s*(?:hours?|hrs?|h)\b\s*(\d+)?\s*(?:min(?:utes?|s)?)?/);
  if (m) {
    const hours = parseInt(m[1]!, 10);
    const mins = m[2] ? parseInt(m[2], 10) : 0;
    return hours * 60 + mins;
  }
  // "90 min" / "90 minutes" / "90 mins"
  m = s.match(/(\d+(?:\.\d+)?)\s*(?:min(?:utes?|s)?|m\b)/);
  if (m) return Math.round(parseFloat(m[1]!));
  // bare number (assume minutes)
  m = s.match(/(\d+(?:\.\d+)?)/);
  if (m) return Math.round(parseFloat(m[1]!));
  return null;
}

// "-0.25" / "0.25" / "1/4" / "1/4th" / "no negative" → magnitude (abs number).
function parseNegativeMarking(negStr: string): number | null {
  if (!negStr || typeof negStr !== "string") return null;
  const s = negStr.toLowerCase().trim();
  if (!s) return null;
  if (s.includes("no negative") || /\b(no|none|nil|zero)\b/.test(s) || s === "0") {
    return 0;
  }
  // fraction "1/4" or "1 / 4"
  let m = s.match(/(\d+)\s*\/\s*(\d+)/);
  if (m) {
    const denom = parseInt(m[2]!, 10);
    if (denom === 0) return null;
    const v = parseInt(m[1]!, 10) / denom;
    return Number.isFinite(v) ? v : null;
  }
  // decimal "-0.25" / "0.5"
  m = s.match(/(-?\d+(?:\.\d+)?)/);
  if (m) {
    const v = parseFloat(m[1]!);
    return Number.isFinite(v) ? Math.abs(v) : null;
  }
  return null;
}

// ---------- Color intensity for numeric table cells ----------
// Tailwind needs literal class strings — explicit map (no dynamic class names).
const VIOLET_INTENSITY: { cls: string; min: number }[] = [
  { cls: "bg-violet-500/5 text-foreground/80", min: 0 },
  { cls: "bg-violet-500/10 text-foreground", min: 0.25 },
  { cls: "bg-violet-500/20 text-foreground font-medium", min: 0.5 },
  { cls: "bg-violet-500/30 text-foreground font-semibold", min: 0.75 },
];

function violetCellClass(value: number, min: number, max: number): string {
  if (!Number.isFinite(value)) return "bg-muted/30 text-muted-foreground";
  if (max === min) return VIOLET_INTENSITY[2]!.cls;
  const t = (value - min) / (max - min);
  for (let i = VIOLET_INTENSITY.length - 1; i >= 0; i--) {
    if (t >= VIOLET_INTENSITY[i]!.min) return VIOLET_INTENSITY[i]!.cls;
  }
  return VIOLET_INTENSITY[0]!.cls;
}

// ---------- Custom tooltip ----------
interface TipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}
function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: TipPayloadItem[];
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur px-3 py-2 shadow-lg text-xs">
      {label !== undefined && label !== "" && (
        <div className="font-medium text-foreground mb-1">{String(label)}</div>
      )}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full inline-block"
              style={{ backgroundColor: p.color ?? CHART.violet }}
            />
            <span className="text-muted-foreground">{p.name ?? p.dataKey}</span>
            <span className="ml-auto font-semibold tabular-nums text-foreground">
              {typeof p.value === "number"
                ? Number.isInteger(p.value)
                  ? p.value.toLocaleString()
                  : p.value.toFixed(2)
                : p.value}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Per-exam derived record ----------
interface PerExam {
  name: string;
  p: ExamPattern;
  totalQ: number;
  maxM: number;
  dur: string;
  durMin: number | null;
  negStr: string;
  neg: number | null;
}

interface DerivedData {
  perExam: PerExam[];
  qmData: { name: string; Questions: number; "Marks / 10": number }[];
  durData: { name: string; minutes: number }[];
  negData: { name: string; neg: number }[];
  sectionData: { name: string; sections: { name: string; value: number }[] }[];
  ranges: {
    qMin: number; qMax: number;
    mMin: number; mMax: number;
    dMin: number; dMax: number;
    nMin: number; nMax: number;
  };
  insights: {
    mostQ?: PerExam;
    longestDur?: PerExam;
    harshestNeg?: PerExam;
    highestMarks?: PerExam;
  };
}

// ============================================================
// Main component
// ============================================================
export function ExamPatternAnalyzer() {
  const api = useApi();
  const saveItem = useAppStore((s) => s.saveItem);
  const setContext = useAppStore((s) => s.setContext);

  const [exams, setExams] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [patterns, setPatterns] = useState<Record<string, ExamPattern>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const addExam = useCallback(
    (raw: string) => {
      const name = raw.trim();
      if (!name) return;
      if (exams.some((e) => e.toLowerCase() === name.toLowerCase())) {
        toast.warning(`"${name}" is already in your list`);
        return;
      }
      if (exams.length >= MAX_EXAMS) {
        toast.error(`You can compare at most ${MAX_EXAMS} exams`);
        return;
      }
      setExams((prev) => [...prev, name]);
      setDraft("");
    },
    [exams],
  );

  const removeExam = (idx: number) => {
    const removed = exams[idx];
    setExams((prev) => prev.filter((_, i) => i !== idx));
    if (removed) {
      setPatterns((prev) => {
        if (!(removed in prev)) return prev;
        const next = { ...prev };
        delete next[removed];
        return next;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addExam(draft);
    }
    if (e.key === "Backspace" && draft === "" && exams.length > 0) {
      const last = exams[exams.length - 1];
      setExams((prev) => prev.slice(0, -1));
      if (last) {
        setPatterns((prev) => {
          if (!(last in prev)) return prev;
          const next = { ...prev };
          delete next[last];
          return next;
        });
      }
    }
  };

  const handleAnalyze = async () => {
    if (exams.length < 2) {
      toast.error("Add at least 2 exams to compare patterns");
      return;
    }
    setLoading(true);
    setPatterns({});
    const results: Record<string, ExamPattern> = {};
    // Sequential fetch — each call hits the LLM and takes 10-20s.
    for (const exam of exams) {
      const data = await api.call<{ report: ExamResearchReport }>(
        "/api/exam/research",
        { query: exam },
      );
      if (data?.report?.pattern) {
        results[exam] = data.report.pattern;
      } else {
        toast.error(`Could not load pattern for "${exam}"`);
      }
    }
    setLoading(false);
    if (Object.keys(results).length === 0) {
      toast.error("Pattern analysis failed for all exams");
      return;
    }
    setPatterns(results);
    setContext(`Pattern analysis: ${exams.join(" vs ")}`, "comparison");
    toast.success(
      `Loaded patterns for ${Object.keys(results).length}/${exams.length} exams`,
    );
  };

  const handleSave = () => {
    const keys = Object.keys(patterns);
    if (keys.length === 0) return;
    const title = keys.join(" vs ");
    saveItem({
      type: "comparison",
      title,
      summary: "Pattern analysis",
      data: { patterns },
    });
    toast.success("Comparison saved to My Research");
  };

  const handleReset = () => {
    setExams([]);
    setPatterns({});
    setDraft("");
  };

  // ---------- Derived data (memoized) ----------
  const derived = useMemo<DerivedData | null>(() => {
    const keys = Object.keys(patterns);
    if (keys.length === 0) return null;

    const perExam: PerExam[] = keys.map((name) => {
      const p = patterns[name];
      const totalQ = typeof p.totalQuestions === "number" ? p.totalQuestions : NaN;
      const maxM = typeof p.maxMarks === "number" ? p.maxMarks : NaN;
      const dur = typeof p.duration === "string" ? p.duration : "";
      const durMin = parseDurationMinutes(dur);
      const negStr = typeof p.negativeMarking === "string" ? p.negativeMarking : "";
      const neg = parseNegativeMarking(negStr);
      return { name, p, totalQ, maxM, dur, durMin, negStr, neg };
    });

    // Questions & Marks (marks divided by 10 for scale)
    const qmData = perExam.map((e) => ({
      name: e.name,
      Questions: Number.isFinite(e.totalQ) ? e.totalQ : 0,
      "Marks / 10": Number.isFinite(e.maxM) ? Math.round((e.maxM / 10) * 10) / 10 : 0,
    }));

    // Duration data — only exams with parseable minutes
    const durData = perExam
      .filter((e) => e.durMin !== null)
      .map((e) => ({ name: e.name, minutes: e.durMin as number }));

    // Negative marking data
    const negData = perExam
      .filter((e) => e.neg !== null)
      .map((e) => ({ name: e.name, neg: e.neg as number }));

    // Section distribution — one pie-worth of data per exam
    const sectionData = perExam.map((e) => ({
      name: e.name,
      sections: Array.isArray(e.p.sectionDistribution)
        ? e.p.sectionDistribution
            .filter((s) => s && typeof s.section === "string")
            .map((s) => ({
              name: s.section,
              value: typeof s.questions === "number" ? s.questions : 0,
            }))
        : [],
    }));

    // Ranges for color-coding
    const qVals = perExam.map((e) => e.totalQ).filter(Number.isFinite);
    const mVals = perExam.map((e) => e.maxM).filter(Number.isFinite);
    const dVals = perExam.map((e) => e.durMin).filter((v): v is number => v !== null && Number.isFinite(v));
    const nVals = perExam.map((e) => e.neg).filter((v): v is number => v !== null && Number.isFinite(v));

    const qMin = qVals.length ? Math.min(...qVals) : 0;
    const qMax = qVals.length ? Math.max(...qVals) : 0;
    const mMin = mVals.length ? Math.min(...mVals) : 0;
    const mMax = mVals.length ? Math.max(...mVals) : 0;
    const dMin = dVals.length ? Math.min(...dVals) : 0;
    const dMax = dVals.length ? Math.max(...dVals) : 0;
    const nMin = nVals.length ? Math.min(...nVals) : 0;
    const nMax = nVals.length ? Math.max(...nVals) : 0;

    // Insights
    const mostQ = perExam
      .filter((e) => Number.isFinite(e.totalQ))
      .sort((a, b) => b.totalQ - a.totalQ)[0];
    const longestDur = perExam
      .filter((e) => e.durMin !== null)
      .sort((a, b) => (b.durMin as number) - (a.durMin as number))[0];
    const harshestNeg = perExam
      .filter((e) => e.neg !== null && (e.neg as number) > 0)
      .sort((a, b) => (b.neg as number) - (a.neg as number))[0];
    const highestMarks = perExam
      .filter((e) => Number.isFinite(e.maxM))
      .sort((a, b) => b.maxM - a.maxM)[0];

    return {
      perExam,
      qmData,
      durData,
      negData,
      sectionData,
      ranges: { qMin, qMax, mMin, mMax, dMin, dMax, nMin, nMax },
      insights: { mostQ, longestDur, harshestNeg, highestMarks },
    };
  }, [patterns]);

  const hasResults = derived !== null && Object.keys(patterns).length > 0;
  const showEmpty = !hasResults && !loading;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6"
      >
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Exam Pattern Analyzer
            </h1>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground">
              Compare exam patterns side-by-side. Questions, marks, duration,
              negative marking, sections — all visualized.
            </p>
          </div>
        </div>
      </motion.header>

      {/* Picker Card */}
      <Card className="border-border/80 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-fuchsia-500" />
            Select exams to analyze
          </CardTitle>
          <CardDescription>
            Type an exam name and press Enter or click Add. Add up to {MAX_EXAMS}{" "}
            exams to compare their patterns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input + add */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. SSC CGL, UPSC CSE, GATE CS…"
              className="flex-1"
              aria-label="Exam name"
              maxLength={80}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => addExam(draft)}
              className="gap-1.5 sm:w-auto"
              disabled={loading}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          {/* Selected chips */}
          {exams.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {exams.map((ex, i) => {
                const loaded = !!patterns[ex];
                return (
                  <span
                    key={`${ex}-${i}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                      loaded
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
                    )}
                  >
                    {ex}
                    {loaded && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                        aria-label="pattern loaded"
                      />
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${ex}`}
                      onClick={() => removeExam(i)}
                      className="rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              <span className="ml-auto self-center text-xs text-muted-foreground">
                {exams.length} / {MAX_EXAMS}
              </span>
            </div>
          )}

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Quick presets:
            </span>
            {QUICK_PRESETS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  setExams(q.exams.slice(0, MAX_EXAMS));
                  setPatterns({});
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                disabled={loading}
                className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10 hover:text-fuchsia-700 dark:hover:text-fuchsia-300 transition-colors disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              onClick={handleAnalyze}
              disabled={loading || exams.length < 2}
              className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50"
            >
              <BarChart3 className="h-4 w-4" />
              {loading ? "Analyzing…" : "Analyze Patterns"}
            </Button>
            {hasResults && (
              <Button onClick={handleSave} variant="outline" className="gap-1.5">
                <Save className="h-4 w-4" /> Save Comparison
              </Button>
            )}
            {(exams.length > 0 || hasResults) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 text-muted-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {exams.length < 2
                ? "Add at least 2 exams"
                : loading
                  ? "Fetching patterns…"
                  : `${exams.length} exam${exams.length === 1 ? "" : "s"} ready`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Card className="border-border/70">
          <CardContent className="py-10">
            <LoadingState
              label={`Fetching pattern data for ${exams.length} exam${
                exams.length === 1 ? "" : "s"
              }… This can take 10–20 seconds per exam.`}
            />
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {showEmpty && (
        <PremiumEmptyState
          icon={BarChart3}
          accent="violet"
          title="No patterns analyzed yet"
          description="Add 2–4 exam names above and click 'Analyze Patterns' to compare questions, marks, duration, negative marking and section distribution side-by-side with visual charts."
          ctaLabel="Try a preset"
          ctaIcon={Sparkles}
          ctaOnClick={() => {
            setExams(QUICK_PRESETS[0]!.exams.slice(0, MAX_EXAMS));
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        />
      )}

      {/* Results */}
      {hasResults && derived && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
          {/* Insights card */}
          <Card className="border-border/70 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">Auto-Generated Insights</CardTitle>
                  <CardDescription className="text-xs">
                    Key takeaways across the loaded patterns
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <InsightItem
                  icon={TrendingUp}
                  accent="violet"
                  label="Most questions"
                  exam={derived.insights.mostQ?.name}
                  value={
                    derived.insights.mostQ
                      ? `${derived.insights.mostQ.totalQ.toLocaleString()}`
                      : null
                  }
                  suffix=" q"
                />
                <InsightItem
                  icon={Clock}
                  accent="emerald"
                  label="Longest duration"
                  exam={derived.insights.longestDur?.name}
                  value={
                    derived.insights.longestDur
                      ? `${derived.insights.longestDur.durMin}`
                      : null
                  }
                  suffix=" min"
                />
                <InsightItem
                  icon={AlertTriangle}
                  accent="rose"
                  label="Harshest negative"
                  exam={derived.insights.harshestNeg?.name}
                  value={
                    derived.insights.harshestNeg
                      ? `-${derived.insights.harshestNeg.neg}`
                      : null
                  }
                  suffix=""
                />
                <InsightItem
                  icon={Target}
                  accent="amber"
                  label="Highest marks"
                  exam={derived.insights.highestMarks?.name}
                  value={
                    derived.insights.highestMarks
                      ? `${derived.insights.highestMarks.maxM.toLocaleString()}`
                      : null
                  }
                  suffix=""
                />
              </div>
            </CardContent>
          </Card>

          {/* Comparison table */}
          <ComparisonTable derived={derived} />

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Questions & Marks */}
            <Card className="border-border/70">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Questions &amp; Marks</CardTitle>
                    <CardDescription className="text-xs">
                      Grouped — questions vs marks (÷10 for scale)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={derived.qmData}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="currentColor"
                      className="text-border"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="currentColor"
                      className="text-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      height={56}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="currentColor"
                      className="text-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="Questions"
                      name="Questions"
                      fill={CHART.violet}
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="Marks / 10"
                      name="Marks / 10"
                      fill={CHART.fuchsia}
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Duration */}
            <Card className="border-border/70">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Duration</CardTitle>
                    <CardDescription className="text-xs">
                      Minutes per exam (horizontal bars)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {derived.durData.length === 0 ? (
                  <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground text-center px-6">
                    No parseable duration values found in the loaded patterns.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={derived.durData}
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="currentColor"
                        className="text-border"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        stroke="currentColor"
                        className="text-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        stroke="currentColor"
                        className="text-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        width={84}
                      />
                      <Tooltip
                        content={<ChartTooltip suffix=" min" />}
                        cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                      />
                      <Bar
                        dataKey="minutes"
                        name="Minutes"
                        fill={CHART.emerald}
                        radius={[0, 3, 3, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Negative marking */}
            <Card className="border-border/70">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Negative Marking</CardTitle>
                    <CardDescription className="text-xs">
                      Marks deducted per wrong answer
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {derived.negData.length === 0 ? (
                  <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground text-center px-6">
                    No negative marking data detected in loaded patterns.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={derived.negData}
                      margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="currentColor"
                        className="text-border"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        stroke="currentColor"
                        className="text-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-12}
                        textAnchor="end"
                        height={56}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="currentColor"
                        className="text-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        width={36}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                      />
                      <Bar
                        dataKey="neg"
                        name="Negative Marks"
                        fill={CHART.rose}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Section distribution pies */}
            <Card className="border-border/70">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Section Distribution</CardTitle>
                    <CardDescription className="text-xs">
                      Questions per section, per exam (donut charts)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {derived.sectionData.map((examSec) => (
                    <div
                      key={examSec.name}
                      className="rounded-lg border border-border/60 p-3"
                    >
                      <div
                        className="text-xs font-semibold text-foreground mb-1 truncate"
                        title={examSec.name}
                      >
                        {examSec.name}
                      </div>
                      {examSec.sections.length === 0 ? (
                        <div className="h-[140px] flex items-center justify-center text-[11px] text-muted-foreground text-center px-2">
                          No section distribution data
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={140}>
                          <RPieChart>
                            <Pie
                              data={examSec.sections}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={50}
                              innerRadius={20}
                              paddingAngle={2}
                            >
                              {examSec.sections.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={PIE_PALETTE[i % PIE_PALETTE.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip suffix=" q" />} />
                          </RPieChart>
                        </ResponsiveContainer>
                      )}
                      {examSec.sections.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {examSec.sections.slice(0, 4).map((s, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{
                                  backgroundColor: PIE_PALETTE[i % PIE_PALETTE.length],
                                }}
                              />
                              {s.name}
                            </span>
                          ))}
                          {examSec.sections.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{examSec.sections.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ---------- Insight item ----------
const INSIGHT_ACCENTS: Record<
  "violet" | "emerald" | "amber" | "rose",
  { grad: string; text: string; bg: string }
> = {
  violet: {
    grad: "from-violet-500 to-fuchsia-500",
    text: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  emerald: {
    grad: "from-emerald-500 to-teal-500",
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  amber: {
    grad: "from-amber-500 to-orange-500",
    text: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  rose: {
    grad: "from-rose-500 to-pink-500",
    text: "text-rose-500",
    bg: "bg-rose-500/10",
  },
};

function InsightItem({
  icon: Icon,
  accent,
  label,
  exam,
  value,
  suffix,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: "violet" | "emerald" | "amber" | "rose";
  label: string;
  exam?: string;
  value?: string | null;
  suffix?: string;
}) {
  const a = INSIGHT_ACCENTS[accent] ?? INSIGHT_ACCENTS.violet;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-lg border border-border/70 bg-card p-3"
    >
      <div
        className={cn(
          "absolute -top-10 -right-10 h-24 w-24 rounded-full blur-3xl opacity-20 bg-gradient-to-br",
          a.grad,
        )}
      />
      <div className="relative flex items-start gap-2.5">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            a.bg,
            a.text,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            {label}
          </div>
          {exam ? (
            <>
              <div
                className="text-xs font-semibold truncate text-foreground mt-0.5"
                title={exam}
              >
                {exam}
              </div>
              {value && (
                <div className={cn("text-lg font-bold tabular-nums leading-tight", a.text)}>
                  {value}
                  {suffix}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-muted-foreground italic mt-0.5">N/A</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------- Comparison table ----------
const TABLE_ATTRS: {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  numeric?: "q" | "m";
  raw?: "dur" | "neg";
  patternField?: "questionType" | "markingScheme" | "sectionalTiming";
}[] = [
  { key: "totalQ", label: "Total Questions", icon: FileText, numeric: "q" },
  { key: "maxM", label: "Max Marks", icon: Target, numeric: "m" },
  { key: "dur", label: "Duration", icon: Clock, raw: "dur" },
  { key: "questionType", label: "Question Type", icon: FileText, patternField: "questionType" },
  { key: "markingScheme", label: "Marking Scheme", icon: Scale, patternField: "markingScheme" },
  { key: "neg", label: "Negative Marking", icon: AlertTriangle, raw: "neg" },
  { key: "sectionalTiming", label: "Sectional Timing", icon: Clock, patternField: "sectionalTiming" },
];

function ComparisonTable({ derived }: { derived: DerivedData }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm">Pattern Comparison Table</CardTitle>
            <CardDescription className="text-xs">
              Numeric cells color-coded by relative value (darker = higher)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-x-auto">
          <table className="w-full caption-bottom text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="h-9 px-3 text-left text-xs font-semibold text-muted-foreground border-b border-border sticky left-0 bg-card z-10">
                  Attribute
                </th>
                {derived.perExam.map((e) => (
                  <th
                    key={e.name}
                    className="h-9 px-3 text-left text-xs font-semibold text-foreground border-b border-border"
                  >
                    <div className="truncate max-w-[160px]" title={e.name}>
                      {e.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ATTRS.map((attr) => (
                <tr key={attr.key} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3 text-xs font-medium text-muted-foreground border-b border-border/50 sticky left-0 bg-card z-10">
                    <div className="flex items-center gap-1.5">
                      <attr.icon className="h-3 w-3 shrink-0" />
                      <span>{attr.label}</span>
                    </div>
                  </td>
                  {derived.perExam.map((e) => {
                    let value = "—";
                    let cellCls = "bg-transparent text-muted-foreground";
                    if (attr.numeric === "q") {
                      const v = e.totalQ;
                      if (Number.isFinite(v)) {
                        value = v.toLocaleString();
                        cellCls = violetCellClass(v, derived.ranges.qMin, derived.ranges.qMax);
                      }
                    } else if (attr.numeric === "m") {
                      const v = e.maxM;
                      if (Number.isFinite(v)) {
                        value = v.toLocaleString();
                        cellCls = violetCellClass(v, derived.ranges.mMin, derived.ranges.mMax);
                      }
                    } else if (attr.raw === "dur") {
                      value = e.dur || "—";
                      if (e.durMin !== null) {
                        cellCls = violetCellClass(
                          e.durMin,
                          derived.ranges.dMin,
                          derived.ranges.dMax,
                        );
                      }
                    } else if (attr.raw === "neg") {
                      value = e.negStr || "—";
                      if (e.neg !== null) {
                        cellCls = violetCellClass(
                          e.neg,
                          derived.ranges.nMin,
                          derived.ranges.nMax,
                        );
                      }
                    } else if (attr.patternField) {
                      const v = e.p[attr.patternField];
                      value = (typeof v === "string" && v.trim()) ? v.trim() : "—";
                    }
                    return (
                      <td
                        key={e.name}
                        className={cn(
                          "p-3 text-xs border-b border-border/50 align-top",
                          cellCls,
                        )}
                      >
                        <div
                          className="line-clamp-2 max-w-[220px] whitespace-normal break-words"
                          title={value}
                        >
                          {value}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
