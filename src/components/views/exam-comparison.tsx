"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Scale,
  Plus,
  X,
  Sparkles,
  Save,
  Layers,
  GitCompare,
  Route,
  ListChecks,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { useApi } from "@/hooks/use-api";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/states";
import { SourceBadgeList } from "@/components/shared/source-badge";
import type { ExamComparisonReport } from "@/types";
import { cn } from "@/lib/utils";

const QUICK_STARTS = [
  { label: "SSC CGL + SSC CHSL + RRB NTPC", exams: ["SSC CGL", "SSC CHSL", "RRB NTPC"] },
  { label: "GATE CS + GATE ME", exams: ["GATE CS", "GATE ME"] },
];

const OVERLAP_STYLES: Record<
  "Very High" | "High" | "Moderate" | "Limited",
  { wrap: string; dot: string; ring: string }
> = {
  "Very High": {
    wrap: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/20",
  },
  High: {
    wrap: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    ring: "ring-sky-500/20",
  },
  Moderate: {
    wrap: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    ring: "ring-amber-500/20",
  },
  Limited: {
    wrap: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    dot: "bg-zinc-500",
    ring: "ring-zinc-500/20",
  },
};

// Explicit class strings (so Tailwind JIT can detect them — no dynamic class names).
const EXAM_PALETTE = [
  {
    bgTint: "bg-violet-500/10",
    dot: "bg-violet-500",
    from: "from-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    bgTint: "bg-fuchsia-500/10",
    dot: "bg-fuchsia-500",
    from: "from-fuchsia-500/10",
    border: "border-fuchsia-500/20",
  },
  {
    bgTint: "bg-emerald-500/10",
    dot: "bg-emerald-500",
    from: "from-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    bgTint: "bg-sky-500/10",
    dot: "bg-sky-500",
    from: "from-sky-500/10",
    border: "border-sky-500/20",
  },
  {
    bgTint: "bg-amber-500/10",
    dot: "bg-amber-500",
    from: "from-amber-500/10",
    border: "border-amber-500/20",
  },
] as const;

export function ExamComparison() {
  const [exams, setExams] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ExamComparisonReport | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const api = useApi();
  const saveItem = useAppStore((s) => s.saveItem);
  const setContext = useAppStore((s) => s.setContext);

  const addExam = useCallback(
    (raw: string) => {
      const name = raw.trim();
      if (!name) return;
      if (exams.some((e) => e.toLowerCase() === name.toLowerCase())) {
        toast.warning(`"${name}" is already in your list`);
        return;
      }
      if (exams.length >= 5) {
        toast.error("You can compare at most 5 exams");
        return;
      }
      setExams((prev) => [...prev, name]);
      setDraft("");
    },
    [exams]
  );

  const removeExam = (idx: number) => {
    setExams((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addExam(draft);
    }
    if (e.key === "Backspace" && draft === "" && exams.length > 0) {
      setExams((prev) => prev.slice(0, -1));
    }
  };

  const handleCompare = async () => {
    if (exams.length < 2) {
      toast.error("Add at least 2 exams to compare");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    const data = await api.call<{ report: ExamComparisonReport }>(
      "/api/exam/compare",
      { exams }
    );
    setLoading(false);
    if (!data || !data.report) {
      setError("AI comparison failed. Try again or check the dev log.");
      return;
    }
    setReport(data.report);
    setContext(`Comparing ${exams.join(" vs ")}`, "comparison");
    toast.success("Comparison report ready");
  };

  const handleSave = () => {
    if (!report) return;
    const title = (report.examNames.length ? report.examNames : exams).join(" vs ");
    saveItem({
      type: "comparison",
      title,
      summary: "Comparison report",
      data: report,
    });
    toast.success("Saved to My Research");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8"
      >
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30">
              <Scale className="h-5 w-5" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Exam Comparison Engine
            </h1>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground">
              Select multiple exams. Find common syllabus, exam-specific topics, and
              additional preparation required.
            </p>
          </div>
        </div>
      </motion.header>

      {/* Picker */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-fuchsia-500" />
            Select exams to compare
          </CardTitle>
          <CardDescription>
            Type an exam name and press Enter or click Add. You need at least 2
            (max 5).
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
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => addExam(draft)}
              className="gap-1.5 sm:w-auto"
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          {/* Selected chips */}
          {exams.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {exams.map((ex, i) => (
                <span
                  key={`${ex}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-700 dark:text-violet-300"
                >
                  {ex}
                  <button
                    type="button"
                    aria-label={`Remove ${ex}`}
                    onClick={() => removeExam(i)}
                    className="rounded-full p-0.5 hover:bg-violet-500/20 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <span className="ml-auto self-center text-xs text-muted-foreground">
                {exams.length} / 5
              </span>
            </div>
          )}

          {/* Quick starts */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Quick start:
            </span>
            {QUICK_STARTS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  setExams([]);
                  setExams(q.exams);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                disabled={loading}
                className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10 hover:text-fuchsia-700 dark:hover:text-fuchsia-300 transition-colors disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Action */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              onClick={handleCompare}
              disabled={loading || exams.length < 2}
              className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50"
            >
              <GitCompare className="h-4 w-4" />
              {loading ? "Comparing…" : "Compare Exams"}
            </Button>
            {report && (
              <Button onClick={handleSave} variant="outline" className="gap-1.5">
                <Save className="h-4 w-4" /> Save to My Research
              </Button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {exams.length < 2
                ? "Add at least 2 exams"
                : `${exams.length} exam${exams.length === 1 ? "" : "s"} ready`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Body */}
      <div className="mt-8 space-y-8">
        {loading && (
          <Card>
            <CardContent>
              <LoadingState label="Comparing syllabi, patterns, and preparation overlap…" />
            </CardContent>
          </Card>
        )}

        {!loading && error && (
          <ErrorState message={error} onRetry={handleCompare} />
        )}

        {!loading && !error && !report && (
          <EmptyState
            icon={Scale}
            title="No comparison yet"
            description="Add 2 or more exams above and hit Compare. The engine will produce a side-by-side table, common syllabus, preparation overlap, career pathways, and prerequisite differences."
          />
        )}

        {!loading && !error && report && <ReportView report={report} onSave={handleSave} />}
      </div>
    </div>
  );
}

// ============================================================
// Report renderer
// ============================================================
function ReportView({
  report,
  onSave,
}: {
  report: ExamComparisonReport;
  onSave: () => void;
}) {
  const examNames = report.examNames.length ? report.examNames : ["Exam 1", "Exam 2"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      {/* Top action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {examNames.map((n, i) => (
            <span key={i} className="text-sm font-semibold">
              {n}
              {i < examNames.length - 1 && (
                <span className="mx-1.5 text-muted-foreground">vs</span>
              )}
            </span>
          ))}
        </div>
        <Button onClick={onSave} variant="outline" size="sm" className="ml-auto gap-1.5">
          <Save className="h-3.5 w-3.5" /> Save to My Research
        </Button>
      </div>

      {/* 1. Comparison Table */}
      <Section
        icon={GitCompare}
        title="Side-by-side Comparison"
        subtitle="Each row is an attribute; each column is an exam."
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-44 sticky left-0 z-10 bg-muted/40 backdrop-blur">
                  Attribute
                </TableHead>
                {examNames.map((name, i) => {
                  const palette = EXAM_PALETTE[i % EXAM_PALETTE.length];
                  return (
                    <TableHead key={i} className="font-semibold">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5",
                          palette.bgTint
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            palette.dot
                          )}
                        />
                        {name}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.comparison.length === 0 && (
                <TableRow>
                  <TableCell colSpan={examNames.length + 1} className="text-center text-muted-foreground py-6">
                    No comparison rows generated.
                  </TableCell>
                </TableRow>
              )}
              {report.comparison.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium align-top bg-muted/20">
                    {row.attribute}
                  </TableCell>
                  {examNames.map((_, j) => (
                    <TableCell key={j} className="align-top whitespace-normal min-w-[140px]">
                      {row.values[j] ?? "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      {/* 2. Common Syllabus */}
      <Section
        icon={Layers}
        title="Common Syllabus & Exam-Specific Topics"
        subtitle="Topics shared by all exams, and what each adds on top."
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Common Topics
            </h4>
            {report.commonSyllabus.commonTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shared topics identified.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {report.commonSyllabus.commonTopics.map((t, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 font-normal"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500" />
              Exam-Specific Topics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {report.commonSyllabus.examSpecific.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">
                  No exam-specific topics identified.
                </p>
              )}
              {report.commonSyllabus.examSpecific.map((entry, i) => {
                const palette = EXAM_PALETTE[i % EXAM_PALETTE.length];
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-xl border p-4 bg-gradient-to-br to-transparent",
                      palette.from,
                      palette.border
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("h-2 w-2 rounded-full", palette.dot)} />
                      <span className="font-semibold text-sm">{entry.exam}</span>
                    </div>
                    {entry.topics.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No unique topics — fully covered by common syllabus.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {entry.topics.map((t, j) => (
                          <li key={j} className="text-sm flex items-start gap-1.5">
                            <span className="text-muted-foreground mt-1">▸</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* 3. Preparation Overlap */}
      <Section
        icon={Zap}
        title="Preparation Overlap"
        subtitle="How much of your prep transfers across exams — and what you still need to add."
      >
        <div className="space-y-6">
          {/* Overlap categories */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              Overlap Categories
            </h4>
            {report.overlap.overlapCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overlap categories produced.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report.overlap.overlapCategories.map((c, i) => {
                  const style = OVERLAP_STYLES[c.category] ?? OVERLAP_STYLES.Limited;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl border p-4 ring-1",
                        style.wrap,
                        style.ring
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold">{c.topic}</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                          {c.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {c.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Existing preparation */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              Existing Preparation (transfers across exams)
            </h4>
            {report.overlap.existingPreparation.length === 0 ? (
              <p className="text-sm text-muted-foreground">None identified.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {report.overlap.existingPreparation.map((t, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-normal"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Additional preparation table */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              Additional Preparation Required
            </h4>
            {report.overlap.additionalPreparation.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing extra — common syllabus covers all exams.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table className="min-w-[480px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-1/3">Topic</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.overlap.additionalPreparation.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium align-top">
                          {row.topic}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-normal">
                          {row.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* 4. Career Pathways */}
      <Section
        icon={Route}
        title="Career Pathways"
        subtitle="Where each exam leads in your career."
      >
        {report.careerPathways.length === 0 ? (
          <p className="text-sm text-muted-foreground">No career pathways produced.</p>
        ) : (
          <ul className="space-y-2">
            {report.careerPathways.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
              >
                <Route className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 5. Prerequisite Differences */}
      <Section
        icon={ListChecks}
        title="Prerequisite Differences"
        subtitle="Eligibility or qualification differences between these exams."
      >
        {report.prerequisiteDifferences.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No prerequisite differences produced.
          </p>
        ) : (
          <ul className="space-y-2">
            {report.prerequisiteDifferences.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="mt-0.5 text-fuchsia-500">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 6. Sources */}
      {report.sources && report.sources.length > 0 && (
        <Section
          icon={ShieldCheck}
          title="Sources & Provenance"
          subtitle="Each claim is tagged by origin — official vs AI analysis."
        >
          <SourceBadgeList sources={report.sources} />
        </Section>
      )}
    </motion.div>
  );
}

// ============================================================
// Section wrapper — premium card with icon header
// ============================================================
function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-violet-500/20">
            <Icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {subtitle && (
              <CardDescription className="mt-0.5">{subtitle}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}
