"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Layers,
  Sparkles,
  Brain,
  Flame,
  TrendingUp,
  RotateCcw,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Play,
  Plus,
  RefreshCw,
  GraduationCap,
  Clock,
  Target,
  Zap,
  PartyPopper,
  Eye,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState, EmptyState } from "@/components/shared/states";
import { SourceBadgeList } from "@/components/shared/source-badge";
import { useFlashcardStore } from "@/store/flashcard-store";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { Flashcard, FlashcardSet } from "@/types/flashcard";

// ----------------- helpers -----------------
const QUICK_CHIPS: { label: string; source: string; topic: string; content: string }[] = [
  { label: "SSC CGL — General Awareness", source: "Saved Exam: SSC CGL", topic: "SSC CGL — General Awareness", content: "" },
  { label: "Quantitative Aptitude — Formulas", source: "Custom topic", topic: "Quantitative Aptitude — Formulas", content: "" },
  { label: "English — Vocabulary", source: "Custom topic", topic: "English — Vocabulary", content: "" },
  { label: "Reasoning — Patterns", source: "Custom topic", topic: "Reasoning — Patterns", content: "" },
];

const DIFFICULTY_BADGE: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Hard: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

const MASTERY_BADGE: Record<string, string> = {
  New: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30",
  Learning: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Reviewing: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  Mastered: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

function isDue(card: Flashcard, now: number): boolean {
  const t = Date.parse(card.nextReview);
  if (Number.isNaN(t)) return true;
  return t <= now;
}

function relativeDay(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.round((t - Date.now()) / dayMs);
  if (diff <= 0) return "due now";
  if (diff === 1) return "in 1 day";
  return `in ${diff} days`;
}

// ----------------- Flashcard face (with 3D flip) -----------------
function FlashcardFace({
  card,
  flipped,
  onFlip,
}: {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <div className="[perspective:1600px] w-full">
      <motion.div
        className="relative w-full min-h-[280px] sm:min-h-[320px]"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        onClick={onFlip}
        role="button"
        tabIndex={0}
        aria-label={flipped ? "Show question" : "Show answer"}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-background p-6 sm:p-8 flex flex-col cursor-pointer"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 gap-1">
                <Sparkles className="h-3 w-3" />
                Question
              </Badge>
              <Badge variant="outline" className={cn("gap-1", DIFFICULTY_BADGE[card.difficulty])}>
                <Target className="h-3 w-3" />
                {card.difficulty}
              </Badge>
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              {card.topic}
            </Badge>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-lg sm:text-2xl font-semibold leading-snug max-w-prose">{card.front}</p>
          </div>
          <div className="mt-4 flex items-center justify-center text-xs text-muted-foreground gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Click to reveal answer
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/15 via-violet-500/5 to-background p-6 sm:p-8 flex flex-col cursor-pointer"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 gap-1">
              <Check className="h-3 w-3" />
              Answer
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              {card.topic}
            </Badge>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center overflow-y-auto">
            <p className="text-base sm:text-xl font-medium leading-relaxed max-w-prose">{card.back}</p>
          </div>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Rate your recall below
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ----------------- Stats card -----------------
function StatsCard({ cards }: { cards: Flashcard[] }) {
  const total = cards.length;
  const due = cards.filter((c) => isDue(c, Date.now())).length;
  const mastered = cards.filter((c) => c.mastery === "Mastered").length;
  const learning = cards.filter((c) => c.mastery === "Learning" || c.mastery === "Reviewing").length;
  const avgEase = total > 0 ? cards.reduce((sum, c) => sum + c.easeFactor, 0) / total : 0;

  const stats = [
    { label: "Total cards", value: total, icon: Layers, color: "text-violet-500" },
    { label: "Due now", value: due, icon: Clock, color: "text-amber-500" },
    { label: "Mastered", value: mastered, icon: GraduationCap, color: "text-emerald-500" },
    { label: "Learning", value: learning, icon: TrendingUp, color: "text-sky-500" },
    { label: "Avg ease", value: avgEase.toFixed(2), icon: Zap, color: "text-fuchsia-500" },
  ];

  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4 text-violet-500" />
          Spaced Repetition Stats
        </CardTitle>
        <CardDescription>Your mastery progress across all saved sets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-lg border border-border/60 bg-background/60 p-3 flex flex-col gap-1"
              >
                <Icon className={cn("h-4 w-4", s.color)} />
                <div className="text-2xl font-bold tracking-tight">{s.value}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            );
          })}
        </div>
        {total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Mastery progress</span>
              <span>{Math.round((mastered / total) * 100)}% mastered</span>
            </div>
            <Progress value={(mastered / total) * 100} className="h-2 bg-violet-500/15" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------- Generate Tab -----------------
function GenerateTab({
  onSwitchToReview,
}: {
  onSwitchToReview: () => void;
}) {
  const { sets, addSet, removeSet } = useFlashcardStore();
  const { call } = useApi();
  const [source, setSource] = useState("Custom topic");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [count, setCount] = useState("10");
  const [loading, setLoading] = useState(false);

  const allCards = useMemo(() => sets.flatMap((s) => s.cards), [sets]);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic", {
        description: "e.g. 'SSC CGL — General Awareness' or 'Calculus — Derivatives'",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await call<{ set: FlashcardSet }>("/api/flashcards/generate", {
        source: source.trim() || "Custom topic",
        topic: topic.trim(),
        content: content.trim(),
        count: Number(count),
      });
      if (res?.set && res.set.cards.length > 0) {
        addSet(res.set);
        toast.success("Flashcards generated!", {
          description: `${res.set.cards.length} cards on "${res.set.topic}" — ready to review.`,
        });
        setTopic("");
        setContent("");
        onSwitchToReview();
      } else if (res) {
        toast.error("No flashcards were generated", {
          description: "Try a different topic or add grounding content.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [source, topic, content, count, call, addSet, onSwitchToReview]);

  const applyChip = (chip: (typeof QUICK_CHIPS)[number]) => {
    setSource(chip.source);
    setTopic(chip.topic);
    setContent(chip.content);
    setCount("10");
  };

  return (
    <div className="space-y-6">
      <Card className="border-violet-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Plus className="h-4 w-4 text-violet-500" />
            Generate a Flashcard Set
          </CardTitle>
          <CardDescription>
            Generate AI flashcards from any exam, syllabus, or topic. Each card uses the SM-2 algorithm to schedule spaced reviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fc-source" className="text-xs text-muted-foreground">Source label</Label>
              <Input
                id="fc-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. 'Saved Exam: SSC CGL' or 'Custom topic'"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-topic" className="text-xs text-muted-foreground">Topic *</Label>
              <Input
                id="fc-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 'Quantitative Aptitude — Formulas'"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fc-content" className="text-xs text-muted-foreground">
              Grounding content (optional — paste syllabus, notes, or study material)
            </Label>
            <Textarea
              id="fc-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste any reference text here — every card claim will be grounded in this material."
              className="min-h-[100px] resize-y"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Number of cards</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 cards</SelectItem>
                  <SelectItem value="10">10 cards</SelectItem>
                  <SelectItem value="15">15 cards</SelectItem>
                  <SelectItem value="20">20 cards</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-transparent sm:ml-auto w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Flashcards
                </>
              )}
            </Button>
          </div>

          {loading && <LoadingState label="AI is composing your flashcards…" />}

          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="text-xs text-muted-foreground">Quick chips</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => applyChip(chip)}
                  className="text-xs rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300 hover:bg-violet-500/20 px-3 py-1.5 transition"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" />
            Saved sets ({sets.length})
          </h3>
          {allCards.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onSwitchToReview} className="gap-1.5">
              <Play className="h-3.5 w-3.5" />
              Start review
            </Button>
          )}
        </div>
        {sets.length === 0 ? (
          <EmptyState
            title="No flashcard sets yet"
            description="Generate your first set above — pick a quick chip or enter your own topic."
            icon={Layers}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sets.map((set) => {
              const total = set.cards.length;
              const mastered = set.cards.filter((c) => c.mastery === "Mastered").length;
              const due = set.cards.filter((c) => isDue(c, Date.now())).length;
              return (
                <Card key={set.id} className="border-border/60 hover:border-violet-500/40 transition group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm truncate">{set.topic}</CardTitle>
                        <CardDescription className="text-xs truncate">{set.source}</CardDescription>
                      </div>
                      <Badge variant="outline" className={cn("shrink-0", MASTERY_BADGE[due > 0 ? "Learning" : "Mastered"])}>
                        {due > 0 ? `${due} due` : "all set"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{total} cards</span>
                      <span>{mastered}/{total} mastered</span>
                    </div>
                    <Progress
                      value={total > 0 ? (mastered / total) * 100 : 0}
                      className="h-1.5 bg-violet-500/10"
                    />
                    <SourceBadgeList sources={set.sources as any} className="pt-1" />
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={onSwitchToReview}
                        disabled={due === 0}
                        className="gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-transparent flex-1"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {due > 0 ? `Review ${due} due` : "Review now"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          removeSet(set.id);
                          toast.success("Set deleted", { description: `"${set.topic}" removed.` });
                        }}
                        className="gap-1.5 hover:text-rose-600 hover:border-rose-500/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------- Review Tab -----------------
type Quality = 0 | 1 | 2 | 3 | 4 | 5;

const RATINGS: { label: string; quality: Quality; color: string; ring: string; icon: typeof RotateCcw }[] = [
  { label: "Again", quality: 0, color: "bg-rose-500 hover:bg-rose-600 text-white border-transparent", ring: "ring-rose-500/30", icon: RotateCcw },
  { label: "Hard", quality: 2, color: "bg-amber-500 hover:bg-amber-600 text-white border-transparent", ring: "ring-amber-500/30", icon: Target },
  { label: "Good", quality: 4, color: "bg-sky-500 hover:bg-sky-600 text-white border-transparent", ring: "ring-sky-500/30", icon: Check },
  { label: "Easy", quality: 5, color: "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent", ring: "ring-emerald-500/30", icon: Zap },
];

interface ReviewSession {
  cards: { setId: string; card: Flashcard }[];
  index: number;
  flipped: boolean;
  reviewed: number;
  masteredGained: number;
  finished: boolean;
}

function ReviewTab({ sets }: { sets: FlashcardSet[] }) {
  const { updateCard } = useFlashcardStore();
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [seed, setSeed] = useState(0); // force refresh of due check

  // Snapshot due cards across all sets
  const dueSnapshot = useMemo(() => {
    const now = Date.now();
    const out: { setId: string; card: Flashcard }[] = [];
    for (const s of sets) {
      for (const c of s.cards) {
        if (isDue(c, now)) out.push({ setId: s.id, card: c });
      }
    }
    return out;
  }, [sets, seed]);

  const startSession = useCallback(() => {
    if (dueSnapshot.length === 0) return;
    setSession({
      cards: dueSnapshot,
      index: 0,
      flipped: false,
      reviewed: 0,
      masteredGained: 0,
      finished: false,
    });
  }, [dueSnapshot]);

  // Auto-start when cards become available (only if no session in progress)
  useEffect(() => {
    if (!session && dueSnapshot.length > 0) {
      // don't auto-start; let the user click "Start review"
    }
  }, [session, dueSnapshot.length]);

  const rate = useCallback(
    (quality: Quality) => {
      if (!session) return;
      const entry = session.cards[session.index];
      if (!entry) return;

      const wasMastered = entry.card.mastery === "Mastered";
      // Apply SM-2 update in the store (this recalculates mastery)
      updateCard(entry.setId, entry.card.id, quality);
      // Optimistically check whether the new state would be mastered:
      // repetitions >= 3 && interval >= 7 — replicate the SM-2 logic loosely
      let willMaster = wasMastered;
      try {
        const reps = quality < 3 ? 0 : entry.card.repetitions + 1;
        const ef = Math.max(
          1.3,
          entry.card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        );
        let interval: number;
        if (quality < 3) interval = 1;
        else if (reps === 1) interval = 1;
        else if (reps === 2) interval = 6;
        else interval = Math.round(entry.card.interval * ef);
        willMaster = reps >= 3 && interval >= 7;
      } catch {
        // ignore
      }

      const nextIndex = session.index + 1;
      const isLast = nextIndex >= session.cards.length;
      setSession({
        ...session,
        index: isLast ? session.index : nextIndex,
        flipped: false,
        reviewed: session.reviewed + 1,
        masteredGained: session.masteredGained + (willMaster && !wasMastered ? 1 : 0),
        finished: isLast,
      });
      setSeed((n) => n + 1);
    },
    [session, updateCard]
  );

  const next = useCallback(() => {
    if (!session) return;
    const ni = session.index + 1;
    if (ni >= session.cards.length) {
      setSession({ ...session, finished: true });
    } else {
      setSession({ ...session, index: ni, flipped: false });
    }
  }, [session]);

  const prev = useCallback(() => {
    if (!session) return;
    setSession({ ...session, index: Math.max(0, session.index - 1), flipped: false });
  }, [session]);

  if (dueSnapshot.length === 0 && (!session || session.finished === false)) {
    return (
      <div className="space-y-6">
        <StatsCard cards={sets.flatMap((s) => s.cards)} />
        <EmptyState
          title="No cards due right now!"
          description="Spaced repetition has nothing scheduled for you. Come back later, or generate more flashcards to expand your deck."
          icon={Flame}
        />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <StatsCard cards={sets.flatMap((s) => s.cards)} />
        <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5">
          <CardContent className="py-8 flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
              <Brain className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{dueSnapshot.length} cards ready for review</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                Each rating updates the SM-2 schedule. Rate honestly — "Again" resets the card, "Easy" spaces it out further.
              </p>
            </div>
            <Button
              onClick={startSession}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-transparent gap-2"
            >
              <Play className="h-4 w-4" />
              Start review session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.finished) {
    return (
      <div className="space-y-6">
        <StatsCard cards={sets.flatMap((s) => s.cards)} />
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-violet-500/5 to-background">
          <CardContent className="py-10 flex flex-col items-center text-center gap-3">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-5xl"
            >
              <PartyPopper className="h-14 w-14 text-emerald-500 mx-auto" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl"
            >
              🎉 🌟 🎓 🎊 ✨
            </motion.div>
            <h3 className="text-xl font-bold mt-2">Session complete!</h3>
            <p className="text-sm text-muted-foreground">
              Reviewed <span className="font-semibold text-foreground">{session.reviewed}</span> cards
              {" · "}
              <span className="font-semibold text-emerald-500">{session.masteredGained}</span> newly mastered
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <Button
                onClick={() => setSession(null)}
                variant="outline"
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                Back to review
              </Button>
              <Button
                onClick={startSession}
                className="gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-transparent"
              >
                <RefreshCw className="h-4 w-4" />
                Review again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const current = session.cards[session.index];
  if (!current) {
    // cards vanished (e.g. set deleted); end session
    return (
      <div className="space-y-6">
        <StatsCard cards={sets.flatMap((s) => s.cards)} />
        <EmptyState title="Session ended" description="No more cards available to review." icon={Check} />
      </div>
    );
  }

  const total = session.cards.length;
  const progressPct = ((session.index + 1) / total) * 100;

  return (
    <div className="space-y-6">
      <StatsCard cards={sets.flatMap((s) => s.cards)} />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-amber-500" />
            <span>Card <span className="font-semibold text-foreground">{session.index + 1}</span> of {total} due</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSession(null)}
            className="gap-1.5 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            End session
          </Button>
        </div>
        <Progress value={progressPct} className="h-1.5 bg-violet-500/15" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.card.id + (session.flipped ? "-back" : "-front")}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <FlashcardFace
            card={current.card}
            flipped={session.flipped}
            onFlip={() => setSession({ ...session, flipped: !session.flipped })}
          />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {session.flipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RATINGS.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.label}
                    onClick={() => rate(r.quality)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm font-medium transition shadow-sm ring-1",
                      r.color,
                      r.ring
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {r.label}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Rate your recall — the SM-2 algorithm reschedules the card automatically.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!session.flipped && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={prev}
            disabled={session.index === 0}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSession({ ...session, flipped: true })}
            className="gap-1.5 border-violet-500/30 text-violet-600 dark:text-violet-300"
          >
            Reveal answer
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={next}
            disabled={session.index >= total - 1}
            className="gap-1.5"
          >
            Skip
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ----------------- main view -----------------
export function Flashcards() {
  const sets = useFlashcardStore((s) => s.sets);
  const [tab, setTab] = useState<"generate" | "review">("generate");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">AI Flashcards</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Spaced repetition mastery. Generate from any exam, syllabus, or topic. SM-2 algorithm schedules reviews.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "generate" | "review")}>
        <TabsList className="bg-muted/60">
          <TabsTrigger value="generate" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Review
          </TabsTrigger>
        </TabsList>
        <TabsContent value="generate" className="mt-4">
          <GenerateTab onSwitchToReview={() => setTab("review")} />
        </TabsContent>
        <TabsContent value="review" className="mt-4">
          <ReviewTab sets={sets} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
