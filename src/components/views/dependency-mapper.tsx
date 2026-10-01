"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Network,
  GitBranch,
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Sparkles,
  Save,
  Wand2,
  Layers,
  Route as RouteIcon,
  ListTree,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SourceBadgeList } from "@/components/shared/source-badge";
import { LoadingState, EmptyState } from "@/components/shared/states";
import { useAppStore } from "@/store/app-store";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { DependencyMapReport, DependencyNode, PrerequisiteGap } from "@/types";

type InputType = "exam" | "subject" | "topic" | "syllabus" | "custom";

const INPUT_TYPES: { value: InputType; label: string; hint: string }[] = [
  { value: "exam", label: "Exam", hint: "Full exam syllabus graph" },
  { value: "subject", label: "Subject", hint: "A whole subject" },
  { value: "topic", label: "Topic", hint: "A single topic" },
  { value: "syllabus", label: "Syllabus PDF text", hint: "Paste syllabus text" },
  { value: "custom", label: "Custom curriculum", hint: "Your own curriculum" },
];

const QUICK_CHIPS = [
  "Calculus",
  "Engineering Mathematics",
  "SSC CGL Quantitative Aptitude",
  "GATE Mechanical Engineering",
];

const MASTERY_STYLE: Record<
  DependencyNode["mastery"],
  { badge: string; dot: string; label: string }
> = {
  "Not Started": {
    badge: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30",
    dot: "bg-zinc-400",
    label: "Not Started",
  },
  Introduced: {
    badge: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30",
    dot: "bg-zinc-400",
    label: "Introduced",
  },
  Learning: {
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dot: "bg-amber-500",
    label: "Learning",
  },
  Practicing: {
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    dot: "bg-sky-500",
    label: "Practicing",
  },
  Weak: {
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    dot: "bg-rose-500",
    label: "Weak",
  },
  Improving: {
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dot: "bg-amber-500",
    label: "Improving",
  },
  Strong: {
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
    label: "Strong",
  },
  Mastered: {
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
    label: "Mastered",
  },
};

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  hard: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
  mixed: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25",
};

const RELEVANCE_STYLE: Record<string, string> = {
  high: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/25",
  medium: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25",
  low: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/25",
};

export function DependencyMapper() {
  const { call } = useApi();
  const setContext = useAppStore((s) => s.setContext);
  const saveItem = useAppStore((s) => s.saveItem);

  const [inputType, setInputType] = useState<InputType>("topic");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DependencyMapReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function build() {
    const trimmed = input.trim();
    if (!trimmed) {
      toast.error("Enter something to map", {
        description: "Type an exam, subject, topic, or paste a syllabus.",
      });
      return;
    }
    setLoading(true);
    setError(null);
    const res = await call<{ report: DependencyMapReport } | { error: string }>(
      "/api/dependency/map",
      { input: trimmed, inputType }
    );
    setLoading(false);
    if (!res) return;
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setReport(res.report);
    setContext(`Dependency map: ${res.report.root}`, "dependency");
    toast.success("Dependency map ready", {
      description: `${res.report.nodes.length} nodes · ${res.report.gaps.length} gaps detected`,
    });
  }

  function quickFill(value: string) {
    setInput(value);
    if (/ssc|gate|upsc|cat|gre|gate|jee|neet/i.test(value)) setInputType("exam");
    else if (value.length > 40) setInputType("syllabus");
    else setInputType("topic");
  }

  function saveToResearch() {
    if (!report) return;
    saveItem({
      type: "dependency",
      title: report.root,
      summary: `${report.nodes.length} nodes, ${report.gaps.length} gaps`,
      data: report,
    });
    toast.success("Saved to My Research", {
      description: `"${report.root}" — ${report.nodes.length} nodes, ${report.gaps.length} gaps`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15 border border-violet-500/20">
            <Network className="h-5 w-5 text-violet-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              AI Exam Dependency Mapper
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build a prerequisite knowledge graph. Detect missing foundations before they block you.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Input form */}
      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/[0.03] to-transparent">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-violet-500" />
            What should I map?
          </CardTitle>
          <CardDescription>
            Choose an input type and tell us the exam, subject, topic, or paste a syllabus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Input type
            </label>
            <ToggleGroup
              type="single"
              value={inputType}
              onValueChange={(v) => v && setInputType(v as InputType)}
              variant="outline"
              className="flex flex-wrap w-full"
            >
              {INPUT_TYPES.map((t) => (
                <ToggleGroupItem
                  key={t.value}
                  value={t.value}
                  className="flex-1 min-w-fit data-[state=on]:bg-violet-500/15 data-[state=on]:text-violet-600 dark:data-[state=on]:text-violet-300 data-[state=on]:border-violet-500/40"
                  title={t.hint}
                >
                  {t.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Input
            </label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                inputType === "syllabus"
                  ? "Paste the syllabus text here — units, topics, subtopics..."
                  : inputType === "exam"
                  ? "e.g. SSC CGL, GATE CS, UPSC CSE Prelims..."
                  : inputType === "subject"
                  ? "e.g. Engineering Mathematics, General Studies..."
                  : inputType === "custom"
                  ? "Describe the curriculum you want to map..."
                  : "e.g. Calculus, Probability, Operating Systems..."
              }
              className="min-h-24 resize-y"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  build();
                }
              }}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Tip: <kbd className="rounded bg-muted px-1">⌘/Ctrl</kbd> + <kbd className="rounded bg-muted px-1">Enter</kbd> to build.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Quick examples
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => quickFill(c)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-300 transition"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={build}
              disabled={loading || !input.trim()}
              className="gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-md shadow-violet-500/20"
            >
              {loading ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Mapping...
                </>
              ) : (
                <>
                  <Network className="h-3.5 w-3.5" /> Build Dependency Map
                </>
              )}
            </Button>
            {report && (
              <Button
                variant="outline"
                onClick={saveToResearch}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" /> Save to My Research
              </Button>
            )}
            {report && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReport(null);
                  setInput("");
                }}
                className="ml-auto"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Body */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <LoadingState label="Building knowledge graph — mapping prerequisites, detecting gaps, sequencing your learning..." />
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-rose-600 dark:text-rose-400">Could not build the map</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
              <Button size="sm" variant="outline" onClick={build} className="mt-3 h-7 gap-1.5">
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      {!loading && !report && !error && (
        <EmptyState
          icon={ListTree}
          title="No dependency map yet"
          description="Type a topic, subject, or exam above and click Build. ExamIntel will return a prerequisite graph, detect missing foundations, and recommend a learning sequence."
        />
      )}

      {!loading && report && (
        <ReportView report={report} />
      )}
    </div>
  );
}

// ============================================================
// Report View
// ============================================================
function ReportView({ report }: { report: DependencyMapReport }) {
  const byLevel = groupByLevel(report.nodes);

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="gap-1 border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300">
          <Network className="h-3 w-3" /> Root: {report.root}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <GitBranch className="h-3 w-3" /> {report.nodes.length} nodes
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Layers className="h-3 w-3" /> {byLevel.length} levels
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            "gap-1",
            report.gaps.length > 0
              ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          )}
        >
          {report.gaps.length > 0 ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
          {report.gaps.length} gaps
        </Badge>
      </div>

      {/* 1. Graph visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-violet-500" />
            Dependency Graph
          </CardTitle>
          <CardDescription>
            Prerequisite DAG — read top-to-bottom. Each card lists what it depends on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byLevel.length === 0 ? (
            <p className="text-sm text-muted-foreground">No nodes returned.</p>
          ) : (
            <div className="space-y-0">
              {byLevel.map((lvl, idx) => (
                <div key={lvl.level} className="relative">
                  {/* Level label */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-6 items-center rounded-full bg-violet-500/10 px-2 text-[11px] font-medium text-violet-600 dark:text-violet-300 border border-violet-500/20">
                      Level {lvl.level}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {lvl.nodes.length} node{lvl.nodes.length !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Nodes at this level */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 relative">
                    {lvl.nodes.map((n) => (
                      <NodeCard key={n.id} node={n} allNodes={report.nodes} />
                    ))}
                  </div>

                  {/* Connector to next level */}
                  {idx < byLevel.length - 1 && (
                    <div className="flex justify-center py-2.5" aria-hidden>
                      <div className="flex flex-col items-center text-violet-500/70">
                        <ArrowDown className="h-3.5 w-3.5" />
                        <div className="h-4 w-px bg-gradient-to-b from-violet-500/40 to-violet-500/10" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Prerequisite gaps */}
      {report.gaps.length > 0 && (
        <Card className="border-rose-500/30 bg-gradient-to-br from-rose-500/[0.06] via-amber-500/[0.03] to-transparent">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Prerequisite Gap Detection
            </CardTitle>
            <CardDescription>
              Missing foundations that will block you. Address these before moving forward.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.gaps.map((g, i) => (
              <GapCard key={i} gap={g} index={i} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 3. Recommended learning sequence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RouteIcon className="h-4 w-4 text-violet-500" />
            Recommended Learning Sequence
          </CardTitle>
          <CardDescription>
            The optimal topological order to study these topics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.recommendedLearningSequence.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sequence provided.</p>
          ) : (
            <div className="flex flex-wrap items-stretch gap-2">
              {report.recommendedLearningSequence.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                      i === 0
                        ? "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300"
                        : "border-border bg-background"
                    )}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="font-medium">{step}</span>
                  </div>
                  {i < report.recommendedLearningSequence.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Sources
          </CardTitle>
          <CardDescription>Where this dependency analysis came from.</CardDescription>
        </CardHeader>
        <CardContent>
          <SourceBadgeList sources={report.sources} />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Node Card
// ============================================================
function NodeCard({ node, allNodes }: { node: DependencyNode; allNodes: DependencyNode[] }) {
  const mastery = MASTERY_STYLE[node.mastery] ?? MASTERY_STYLE["Not Started"];
  const diffKey = (node.difficulty ?? "").toLowerCase();
  const diff = DIFFICULTY_STYLE[diffKey] ?? null;
  const relKey = (node.examRelevance ?? "").toLowerCase();
  const rel = RELEVANCE_STYLE[relKey] ?? null;

  const prereqNodes = node.prerequisites
    .map((id) => allNodes.find((n) => n.id === id))
    .filter(Boolean) as DependencyNode[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="group relative h-full rounded-lg border border-border bg-card p-3 hover:border-violet-500/40 hover:shadow-md hover:shadow-violet-500/5 transition-all">
        {/* Top row: id + mastery */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {node.id}
            </code>
            {node.level !== undefined && (
              <span className="text-[10px] text-muted-foreground">L{node.level}</span>
            )}
          </div>
          <Badge variant="outline" className={cn("gap-1 text-[10px] px-1.5 py-0", mastery.badge)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", mastery.dot)} />
            {mastery.label}
          </Badge>
        </div>

        {/* Topic / subtopic / concept */}
        <div className="mt-2">
          <p className="font-semibold leading-tight">{node.topic}</p>
          {node.subtopic && (
            <p className="mt-0.5 text-xs text-muted-foreground">{node.subtopic}</p>
          )}
          {node.concept && (
            <p className="mt-1 text-xs italic text-foreground/70">"{node.concept}"</p>
          )}
        </div>

        {/* Badges: difficulty + exam relevance */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {diff && node.difficulty && (
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", diff)}>
              {node.difficulty}
            </Badge>
          )}
          {rel && node.examRelevance && (
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", rel)}>
              Relevance: {node.examRelevance}
            </Badge>
          )}
        </div>

        {/* Prerequisites */}
        <div className="mt-2.5 border-t border-border/60 pt-2">
          {prereqNodes.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Depends on
              </p>
              <div className="flex flex-wrap gap-1">
                {prereqNodes.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded border border-violet-500/20 bg-violet-500/5 px-1.5 py-0.5 text-[10px] text-violet-600 dark:text-violet-300"
                  >
                    <ArrowDown className="h-2.5 w-2.5 rotate-[-45deg]" />
                    {p.topic}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-2.5 w-2.5" /> No prerequisites (foundation)
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Gap Card
// ============================================================
function GapCard({ gap, index }: { gap: PrerequisiteGap; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="rounded-lg border border-rose-500/30 bg-rose-500/[0.04] p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0">
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="font-semibold text-rose-700 dark:text-rose-300">
              {gap.missingPrerequisite}
            </p>
            {gap.estimatedEffort && (
              <Badge
                variant="outline"
                className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              >
                {gap.estimatedEffort}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{gap.whyItMatters}</p>

          {/* Recommended sequence */}
          {gap.recommendedSequence.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                Recommended sequence
              </p>
              <ol className="space-y-1">
                {gap.recommendedSequence.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Practice recommendations */}
          {gap.practiceRecommendations.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                Practice recommendations
              </p>
              <div className="flex flex-wrap gap-1.5">
                {gap.practiceRecommendations.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Helpers
// ============================================================
function groupByLevel(nodes: DependencyNode[]): { level: number; nodes: DependencyNode[] }[] {
  const map = new Map<number, DependencyNode[]>();
  for (const n of nodes) {
    const lv = n.level ?? 0;
    if (!map.has(lv)) map.set(lv, []);
    map.get(lv)!.push(n);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, nodes]) => ({ level, nodes }));
}
