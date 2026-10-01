"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  Search,
  Filter,
  Calendar,
  BookOpen,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  Save,
  Star,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Layers,
  Target,
  Hash,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LoadingState } from "@/components/shared/states";
import { PremiumEmptyState } from "@/components/shared/premium-empty-state";
import { useApi } from "@/hooks/use-api";
import { usePyqStore } from "@/store/pyq-store";
import { cn } from "@/lib/utils";
import type { PYQ } from "@/types/pyq";

// ---------------- configuration ----------------
const EXAMS = [
  { value: "All", label: "All Exams" },
  { value: "SSC CGL", label: "SSC CGL" },
  { value: "GATE CS", label: "GATE CS" },
  { value: "UPSC CSE", label: "UPSC CSE" },
  { value: "RRB JE", label: "RRB JE" },
  { value: "Banking PO", label: "Banking PO" },
];

const YEARS = [
  { value: "All", label: "All Years" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
  { value: "2022", label: "2022" },
  { value: "2021", label: "2021" },
  { value: "2020", label: "2020" },
];

const TOPIC_CHIPS = [
  "Percentage",
  "Profit & Loss",
  "Ratio",
  "Time & Work",
  "Algorithms",
  "DBMS",
  "Operating Systems",
  "Polity",
];

const DIFFICULTY_BADGE: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Hard: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

type AttemptResult = "correct" | "incorrect" | "unattempted";

const ATTEMPT_BADGE: Record<AttemptResult, { className: string; label: string; icon: typeof CheckCircle2 }> = {
  correct: {
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    label: "Correct",
    icon: CheckCircle2,
  },
  incorrect: {
    className: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    label: "Incorrect",
    icon: XCircle,
  },
  unattempted: {
    className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30",
    label: "Skipped",
    icon: CircleDashed,
  },
};

// ---------------- helpers ----------------
function stableId(p: PYQ, index: number): string {
  if (p.id && typeof p.id === "string") return p.id;
  return `pyq_${index}_${(p.question || "").slice(0, 24).replace(/\s+/g, "_")}`;
}

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C, D
}

// ---------------- PYQ card ----------------
function PYQCard({
  pyq,
  index,
  onFindSimilar,
  showSimilarReason,
}: {
  pyq: PYQ;
  index: number;
  onFindSimilar: (q: string) => void;
  showSimilarReason?: boolean;
}) {
  const id = stableId(pyq, index);
  const bookmarked = usePyqStore((s) => s.bookmarked.includes(id));
  const attempt = usePyqStore((s) => s.attempts[id]);
  const toggleBookmark = usePyqStore((s) => s.toggleBookmark);
  const recordAttempt = usePyqStore((s) => s.recordAttempt);

  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<boolean>(!!attempt);
  const [exOpen, setExOpen] = useState<boolean>(false);

  const handleSelect = (option: string) => {
    if (revealed) return; // lock after reveal
    setSelected(option);
    const isCorrect = option === pyq.correctAnswer;
    recordAttempt(id, isCorrect ? "correct" : "incorrect");
    setRevealed(true);
    if (isCorrect) {
      toast.success("Correct!", { description: "Attempt recorded." });
    } else {
      toast.error("Incorrect", { description: `Correct answer: ${pyq.correctAnswer}` });
    }
  };

  const handleSkip = () => {
    if (revealed) return;
    recordAttempt(id, "unattempted");
    setRevealed(true);
    setSelected(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Card className="overflow-hidden border-border/60 hover:border-violet-500/30 hover:shadow-lg transition-all">
        <CardHeader className="pb-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="gap-1 border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <FileText className="h-3 w-3" />
              {pyq.exam}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {pyq.year}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <BookOpen className="h-3 w-3" />
              {pyq.topic}
            </Badge>
            <Badge variant="outline" className={cn("gap-1", DIFFICULTY_BADGE[pyq.difficulty] ?? DIFFICULTY_BADGE.Medium)}>
              <Target className="h-3 w-3" />
              {pyq.difficulty}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Hash className="h-3 w-3" />
              {pyq.marks} mark{pyq.marks > 1 ? "s" : ""}
            </Badge>
          </div>
          {pyq.subject && (
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {pyq.subject}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm sm:text-base font-medium leading-relaxed text-foreground">
            {pyq.question}
          </p>

          {/* Options */}
          <div className="grid grid-cols-1 gap-1.5">
            {pyq.options.slice(0, 4).map((opt, i) => {
              const letter = optionLetter(i);
              const isCorrect = opt === pyq.correctAnswer;
              const isSelected = selected === opt;
              const showCorrect = revealed && isCorrect;
              const showWrong = revealed && isSelected && !isCorrect;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-all",
                    !revealed && "hover:border-violet-500/40 hover:bg-violet-500/5 cursor-pointer",
                    revealed && "cursor-default",
                    showCorrect && "border-emerald-500/50 bg-emerald-500/10",
                    showWrong && "border-rose-500/50 bg-rose-500/10",
                    !showCorrect && !showWrong && "border-border bg-card/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                      showCorrect
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : showWrong
                          ? "border-rose-500 bg-rose-500 text-white"
                          : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {showCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : showWrong ? <XCircle className="h-3.5 w-3.5" /> : letter}
                  </span>
                  <span className={cn("flex-1 pt-0.5", showCorrect && "text-emerald-700 dark:text-emerald-300 font-medium", showWrong && "text-rose-700 dark:text-rose-300")}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Correct answer:</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                {pyq.correctAnswer}
              </Badge>
              {attempt && (
                <Badge variant="outline" className={cn(ATTEMPT_BADGE[attempt].className)}>
                  {(() => {
                    const AttemptIcon = ATTEMPT_BADGE[attempt].icon;
                    return <AttemptIcon className="h-3 w-3" />;
                  })()}
                  {ATTEMPT_BADGE[attempt].label}
                </Badge>
              )}
            </div>
          )}

          {/* Similarity reasoning */}
          {showSimilarReason && pyq.similarityReason && (
            <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-2.5 text-xs text-fuchsia-700 dark:text-fuchsia-300 flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span><span className="font-medium">Why similar:</span> {pyq.similarityReason}</span>
            </div>
          )}

          {/* Collapsible explanation */}
          <Collapsible open={exOpen} onOpenChange={setExOpen}>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!revealed && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSkip}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <CircleDashed className="h-3.5 w-3.5" />
                  Skip
                </Button>
              )}
              <CollapsibleTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                >
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  {exOpen ? "Hide" : "Show"} explanation
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", exOpen && "-rotate-90")} />
                </Button>
              </CollapsibleTrigger>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleBookmark(id)}
                className={cn("h-7 text-xs", bookmarked && "text-amber-500")}
                title={bookmarked ? "Remove bookmark" : "Bookmark this PYQ"}
              >
                {bookmarked ? <Star className="h-3.5 w-3.5 fill-amber-500" /> : <Save className="h-3.5 w-3.5" />}
                {bookmarked ? "Bookmarked" : "Bookmark"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onFindSimilar(pyq.question)}
                className="h-7 text-xs bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 text-violet-600 dark:text-violet-400 hover:from-violet-500/20 hover:to-fuchsia-500/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Find Similar
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            <CollapsibleContent>
              <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-foreground/90 leading-relaxed">
                <div className="flex items-center gap-1.5 mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Explanation
                </div>
                {pyq.explanation || "No explanation available."}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------- Stats card ----------------
function StatsCard({
  pyqs,
  bookmarkCount,
  attempts,
}: {
  pyqs: PYQ[];
  bookmarkCount: number;
  attempts: Record<string, AttemptResult>;
}) {
  const totalBrowsed = pyqs.length;
  const totalAttempts = Object.values(attempts).length;
  const correct = Object.values(attempts).filter((r) => r === "correct").length;
  const incorrect = Object.values(attempts).filter((r) => r === "incorrect").length;
  const accuracy = totalAttempts > 0 ? Math.round((correct / (correct + incorrect || 1)) * 100) : 0;
  // only count attempts where incorrect is non-zero in the denominator
  const denomCorrect = correct + incorrect;
  const accuracyPct = denomCorrect > 0 ? Math.round((correct / denomCorrect) * 100) : 0;

  const stats = [
    {
      label: "Browsed",
      value: totalBrowsed,
      icon: Layers,
      accent: "from-violet-500 to-fuchsia-500",
    },
    {
      label: "Attempts",
      value: totalAttempts,
      icon: Target,
      accent: "from-emerald-500 to-teal-500",
    },
    {
      label: "Accuracy",
      value: `${accuracyPct}%`,
      icon: CheckCircle2,
      accent: "from-amber-500 to-orange-500",
    },
    {
      label: "Bookmarked",
      value: bookmarkCount,
      icon: Star,
      accent: "from-fuchsia-500 to-pink-500",
    },
  ];

  // accuracyPct suppresses unused-var lint
  void accuracy;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2.5">
              <div className={cn("flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white", s.accent)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{s.label}</div>
                <div className="text-lg sm:text-xl font-bold leading-tight">{s.value}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------- Main component ----------------
export function PYQBrowser() {
  const api = useApi();

  // filter form
  const [exam, setExam] = useState<string>("SSC CGL");
  const [year, setYear] = useState<string>("All");
  const [topic, setTopic] = useState<string>("");

  // similar finder
  const [similarQuery, setSimilarQuery] = useState<string>("");

  // results
  const [pyqs, setPyqs] = useState<PYQ[]>([]);
  const [similar, setSimilar] = useState<PYQ[] | null>(null);
  const [browsing, setBrowsing] = useState<boolean>(false);
  const [finding, setFinding] = useState<boolean>(false);
  const [hasBrowsed, setHasBrowsed] = useState<boolean>(false);

  // bookmarks filter
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);

  // store
  const bookmarked = usePyqStore((s) => s.bookmarked);
  const attempts = usePyqStore((s) => s.attempts);
  const clearAll = usePyqStore((s) => s.clearAll);

  const handleBrowse = useCallback(async () => {
    setBrowsing(true);
    setHasBrowsed(true);
    setShowBookmarksOnly(false);
    const res = await api.call<{ pyqs: PYQ[] } | { error: string }>("/api/pyq/browse", {
      exam,
      year: year === "All" ? "" : year,
      topic: topic.trim(),
    });
    setBrowsing(false);
    if (!res) return;
    if ("error" in res) {
      toast.error("Browse failed", { description: res.error });
      return;
    }
    if (!res.pyqs || res.pyqs.length === 0) {
      toast.warning("No PYQs found", { description: "Try different filters." });
    } else {
      toast.success(`Found ${res.pyqs.length} PYQs`, { description: `${exam} · ${year === "All" ? "All years" : year}` });
    }
    setPyqs(res.pyqs ?? []);
  }, [api, exam, year, topic]);

  const handleFindSimilar = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q) {
      toast.error("Enter a question to find similar PYQs");
      return;
    }
    if (similarQuery !== q) setSimilarQuery(q);
    setFinding(true);
    setSimilar(null);
    const res = await api.call<{ pyqs: PYQ[] } | { error: string }>("/api/pyq/similar", {
      question: q,
    });
    setFinding(false);
    if (!res) return;
    if ("error" in res) {
      toast.error("Similar search failed", { description: res.error });
      return;
    }
    setSimilar(res.pyqs ?? []);
    if (res.pyqs?.length > 0) {
      toast.success(`Found ${res.pyqs.length} similar PYQs`);
    }
    // scroll to the similar results section
    setTimeout(() => {
      document.getElementById("similar-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [api, similarQuery]);

  const handleClearAll = () => {
    clearAll();
    setPyqs([]);
    setSimilar(null);
    setHasBrowsed(false);
    setSimilarQuery("");
    toast.success("Cleared PYQ data");
  };

  const handleApplyBookmarkFilter = () => {
    if (!hasBrowsed) {
      // No browse yet — just toggle the panel; the bookmark list will be empty
      toast.info("No PYQs browsed yet", { description: "Browse PYQs first, then filter by bookmarks." });
    }
    setShowBookmarksOnly((v) => !v);
  };

  // The visible list (filtered or all)
  const visiblePyqs = useMemo(() => {
    if (!showBookmarksOnly) return pyqs;
    return pyqs.filter((p, i) => bookmarked.includes(stableId(p, i)));
  }, [pyqs, showBookmarksOnly, bookmarked]);

  const bookmarkedPyqs = useMemo<PYQ[]>(() => {
    // all PYQs from the latest browse that are bookmarked
    return pyqs.filter((p, i) => bookmarked.includes(stableId(p, i)));
  }, [pyqs, bookmarked]);

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">PYQ Browser</h1>
              <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
                Browse previous-year questions by exam, year, and topic. Find similar PYQs for any question.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="gap-1.5"
            title="Clear bookmarks + attempts"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </header>

      {/* ---------- Filter Bar ---------- */}
      <Card className="border-border/60 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-violet-500" />
            Browse Filters
          </CardTitle>
          <CardDescription>
            Pick an exam, year, and optional topic. The AI retrieves matching previous-year questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exam-select" className="text-xs">Exam</Label>
              <Select value={exam} onValueChange={setExam}>
                <SelectTrigger id="exam-select" className="w-full">
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {EXAMS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year-select" className="text-xs">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year-select" className="w-full">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="topic-input" className="text-xs">Topic (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="topic-input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Percentage, Algorithms, Polity"
                  onKeyDown={(e) => { if (e.key === "Enter") handleBrowse(); }}
                />
                <Button
                  onClick={handleBrowse}
                  disabled={browsing}
                  className="shrink-0 gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                >
                  {browsing ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="hidden sm:inline">{browsing ? "Browsing..." : "Browse"}</span>
                  <span className="sm:hidden">{browsing ? "..." : "Go"}</span>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TOPIC_CHIPS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-all",
                  topic === t
                    ? "border-violet-500/50 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    : "border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-violet-500/30",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---------- Similar Question Finder ---------- */}
      <Card className="border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/5 to-violet-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            Similar Question Finder
          </CardTitle>
          <CardDescription>
            Paste any question — get 3–5 previous-year questions that test the same concept, with similarity reasoning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={similarQuery}
            onChange={(e) => setSimilarQuery(e.target.value)}
            placeholder="Paste a question here... e.g. 'A shopkeeper marks his goods 40% above CP and allows a 10% discount. Find his profit percentage.'"
            className="min-h-[88px] resize-y"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => handleFindSimilar(similarQuery)}
              disabled={finding || !similarQuery.trim()}
              className="gap-1.5 bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white hover:opacity-90"
            >
              {finding ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {finding ? "Finding..." : "Find Similar PYQs"}
            </Button>
            {similarQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSimilarQuery(""); setSimilar(null); }}
                className="text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {finding && <LoadingState label="AI is finding similar previous-year questions..." />}

          {similar && similar.length > 0 && (
            <div id="similar-results" className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-fuchsia-500" />
                <span>{similar.length} similar PYQ{similar.length > 1 ? "s" : ""} found</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {similar.map((p, i) => (
                  <PYQCard
                    key={`sim_${i}_${p.id}_${(p.question || "").slice(0, 32)}`}
                    pyq={p}
                    index={i + 1000}
                    onFindSimilar={handleFindSimilar}
                    showSimilarReason
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------- Stats ---------- */}
      {hasBrowsed && (
        <StatsCard pyqs={pyqs} bookmarkCount={bookmarkedPyqs.length} attempts={attempts} />
      )}

      {/* ---------- Bookmarks Panel ---------- */}
      {hasBrowsed && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Bookmarked PYQs
                </CardTitle>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  {bookmarkedPyqs.length}
                </Badge>
              </div>
              <Button
                variant={showBookmarksOnly ? "default" : "outline"}
                size="sm"
                onClick={handleApplyBookmarkFilter}
                className="gap-1.5"
                disabled={bookmarkedPyqs.length === 0 && !showBookmarksOnly}
              >
                <Filter className="h-3.5 w-3.5" />
                {showBookmarksOnly ? "Showing bookmarks" : "Show only bookmarks"}
              </Button>
            </div>
          </CardHeader>
          {showBookmarksOnly && (
            <CardContent>
              {bookmarkedPyqs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No bookmarked PYQs in this browse session yet. Tap the star icon on any card to bookmark it.
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {bookmarkedPyqs.map((p, i) => (
                    <PYQCard
                      key={`bm_${i}_${p.id}_${(p.question || "").slice(0, 32)}`}
                      pyq={p}
                      index={i + 500}
                      onFindSimilar={handleFindSimilar}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* ---------- Browse Results / Empty State ---------- */}
      {!hasBrowsed ? (
        <PremiumEmptyState
          icon={FileText}
          title="Browse Previous-Year Questions"
          description="Pick an exam and year above, then hit Browse to retrieve PYQs. Or paste any question into the Similar Finder to discover conceptually related PYQs."
          ctaLabel="Browse PYQs"
          ctaOnClick={handleBrowse}
          ctaIcon={Search}
          accent="violet"
        />
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Layers className="h-4 w-4 text-violet-500" />
              {showBookmarksOnly ? "Bookmarked PYQs" : "Browse Results"}
              <Badge variant="outline" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30">
                {visiblePyqs.length}
              </Badge>
            </h2>
            {!showBookmarksOnly && (
              <div className="text-xs text-muted-foreground">
                {exam} · {year === "All" ? "All years" : year}
                {topic ? ` · ${topic}` : ""}
              </div>
            )}
          </div>

          {browsing ? (
            <LoadingState label="AI is browsing previous-year questions..." />
          ) : visiblePyqs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {showBookmarksOnly
                  ? "No bookmarked PYQs in this browse session."
                  : "No PYQs found for these filters. Try different exam/year/topic."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {visiblePyqs.map((p, i) => (
                <PYQCard
                  key={`res_${i}_${p.id}_${(p.question || "").slice(0, 32)}`}
                  pyq={p}
                  index={i}
                  onFindSimilar={handleFindSimilar}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
