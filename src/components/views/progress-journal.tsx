"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  Plus,
  Calendar,
  Sparkles,
  TrendingUp,
  Trash2,
  ArrowRight,
  Clock,
  Smile,
  Meh,
  Frown,
  ChevronDown,
  Loader2,
  Award,
  ListChecks,
  Flame,
} from "lucide-react";
import {
  format,
  isToday,
  isYesterday,
  isThisWeek,
  parseISO,
  subDays,
} from "date-fns";

import {
  useJournalStore,
  type JournalEntry,
  type JournalMood,
} from "@/store/journal-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components/shared/states";

// ---------------- Constants ----------------

const COMMON_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "General Studies",
  "Current Affairs",
  "Reasoning",
  "Computer Science",
  "Economics",
  "History",
  "Geography",
  "Polity",
];

const MOODS: {
  key: JournalMood;
  label: string;
  emoji: string;
  ring: string;
  bg: string;
  text: string;
  dot: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "great",
    label: "Great",
    emoji: "😊",
    ring: "ring-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/40",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    Icon: Smile,
  },
  {
    key: "good",
    label: "Good",
    emoji: "🙂",
    ring: "ring-sky-500",
    bg: "bg-sky-500/10 border-sky-500/40",
    text: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
    Icon: Smile,
  },
  {
    key: "okay",
    label: "Okay",
    emoji: "😐",
    ring: "ring-amber-500",
    bg: "bg-amber-500/10 border-amber-500/40",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    Icon: Meh,
  },
  {
    key: "struggle",
    label: "Struggle",
    emoji: "😣",
    ring: "ring-rose-500",
    bg: "bg-rose-500/10 border-rose-500/40",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    Icon: Frown,
  },
];

const MOOD_SCORE: Record<JournalMood, number> = {
  great: 4,
  good: 3,
  okay: 2,
  struggle: 1,
};

function moodMeta(m: JournalMood) {
  return MOODS.find((x) => x.key === m) ?? MOODS[1];
}

function todayISODate() {
  // local date in YYYY-MM-DD (not UTC-shifted)
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDuration(min: number) {
  if (!min || min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// ---------------- Component ----------------

export function ProgressJournal() {
  const entries = useJournalStore((s) => s.entries);
  const addEntry = useJournalStore((s) => s.addEntry);
  const deleteEntry = useJournalStore((s) => s.deleteEntry);

  // ---- form state ----
  const today = todayISODate();
  const [fDate, setFDate] = useState(today);
  const [fSubject, setFSubject] = useState("");
  const [fTopic, setFTopic] = useState("");
  const [fDuration, setFDuration] = useState<string>("");
  const [fMood, setFMood] = useState<JournalMood>("good");
  const [fStudied, setFStudied] = useState("");
  const [fBlockers, setFBlockers] = useState("");
  const [fWins, setFWins] = useState("");

  // ---- summary state ----
  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFDate(todayISODate());
    setFSubject("");
    setFTopic("");
    setFDuration("");
    setFMood("good");
    setFStudied("");
    setFBlockers("");
    setFWins("");
  }, []);

  const handleSave = useCallback(() => {
    // basic validation
    if (!fSubject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!fTopic.trim()) {
      toast.error("Topic is required");
      return;
    }
    const dur = Number(fDuration);
    if (!fDuration || isNaN(dur) || dur <= 0) {
      toast.error("Please enter a valid study duration (minutes)");
      return;
    }
    if (!fStudied.trim()) {
      toast.error("Tell us what you studied");
      return;
    }
    addEntry({
      date: fDate || todayISODate(),
      subject: fSubject.trim(),
      topic: fTopic.trim(),
      durationMinutes: dur,
      mood: fMood,
      whatStudied: fStudied.trim(),
      blockers: fBlockers.trim(),
      wins: fWins.trim(),
    });
    toast.success("Journal entry saved 🎉", {
      description: `${fSubject} · ${fmtDuration(dur)} · ${moodMeta(fMood).emoji} ${moodMeta(fMood).label}`,
    });
    resetForm();
    // invalidate cached summary so a stale one isn't shown after new entry
    setSummary("");
    setSummaryError(null);
  }, [fDate, fSubject, fTopic, fDuration, fMood, fStudied, fBlockers, fWins, addEntry, resetForm]);

  // ---- weekly entries (last 7 days incl. today) ----
  const weekEntries = useMemo(() => {
    const cutoff = subDays(new Date(), 6);
    const startOfCutoff = new Date(cutoff);
    startOfCutoff.setHours(0, 0, 0, 0);
    return entries.filter((e) => {
      try {
        const d = parseISO(e.date);
        return d >= startOfCutoff;
      } catch {
        return false;
      }
    });
  }, [entries]);

  const handleGenerate = useCallback(async () => {
    if (weekEntries.length === 0) {
      toast.error("No entries this week to summarize");
      return;
    }
    setSummaryLoading(true);
    setSummaryError(null);
    setSummary("");
    try {
      const res = await fetch("/api/journal/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: weekEntries }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setSummary(data.summary || "");
      toast.success("Weekly summary generated ✨");
    } catch (e: any) {
      setSummaryError(e?.message ?? "Failed to generate summary");
      toast.error("Could not generate summary", {
        description: e?.message,
      });
    } finally {
      setSummaryLoading(false);
    }
  }, [weekEntries]);

  // ---- stats ----
  const stats = useMemo(() => {
    const total = entries.length;
    const totalMin = entries.reduce(
      (acc, e) => acc + (Number(e.durationMinutes) || 0),
      0
    );
    // most studied subject
    const subjMap: Record<string, number> = {};
    for (const e of entries) {
      const k = e.subject?.trim() || "Unknown";
      subjMap[k] = (subjMap[k] || 0) + (Number(e.durationMinutes) || 0);
    }
    const topSubject = Object.entries(subjMap).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];
    const avgMood =
      total > 0
        ? entries.reduce((a, e) => a + (MOOD_SCORE[e.mood] || 0), 0) / total
        : 0;
    return { total, totalMin, topSubject, avgMood };
  }, [entries]);

  // ---- grouped entries (most recent first) ----
  const groups = useMemo(() => buildGroups(entries), [entries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
            <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Progress Journal
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Daily study logs with AI weekly insights. Track what you studied,
              blockers, and wins.
            </p>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<ListChecks className="h-4 w-4" />}
          label="Total Entries"
          value={String(stats.total)}
          accent="from-violet-500/15 to-fuchsia-500/5 border-violet-500/20"
          iconWrap="bg-violet-500/15 text-violet-600 dark:text-violet-400"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Study Time"
          value={fmtDuration(stats.totalMin)}
          accent="from-fuchsia-500/15 to-pink-500/5 border-fuchsia-500/20"
          iconWrap="bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400"
        />
        <StatCard
          icon={<Award className="h-4 w-4" />}
          label="Top Subject"
          value={stats.topSubject ?? "—"}
          accent="from-emerald-500/15 to-teal-500/5 border-emerald-500/20"
          iconWrap="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Avg Mood"
          value={moodLabelFromScore(stats.avgMood)}
          accent="from-amber-500/15 to-orange-500/5 border-amber-500/20"
          iconWrap="bg-amber-500/15 text-amber-600 dark:text-amber-400"
        />
      </section>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: New entry form */}
        <div className="lg:col-span-1">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4 text-violet-500" />
                New Entry
              </CardTitle>
              <CardDescription className="text-xs">
                Log today's study session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="je-date" className="text-xs font-medium">
                  Date
                </Label>
                <Input
                  id="je-date"
                  type="date"
                  value={fDate}
                  max={today}
                  onChange={(e) => setFDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Subject + Topic */}
              <div className="space-y-1.5">
                <Label htmlFor="je-subject" className="text-xs font-medium">
                  Subject <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="je-subject"
                  list="je-subjects"
                  placeholder="e.g. Mathematics"
                  value={fSubject}
                  onChange={(e) => setFSubject(e.target.value)}
                  className="h-9 text-sm"
                />
                <datalist id="je-subjects">
                  {COMMON_SUBJECTS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="je-topic" className="text-xs font-medium">
                  Topic <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="je-topic"
                  placeholder="e.g. Integration by parts"
                  value={fTopic}
                  onChange={(e) => setFTopic(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <Label htmlFor="je-duration" className="text-xs font-medium">
                  Duration (minutes) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="je-duration"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="45"
                  value={fDuration}
                  onChange={(e) => setFDuration(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Mood */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Mood</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {MOODS.map((m) => {
                    const active = fMood === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setFMood(m.key)}
                        title={m.label}
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-[11px] font-medium transition-all",
                          active
                            ? cn(m.bg, "ring-2", m.ring, "scale-[1.02]")
                            : "border-border bg-background hover:bg-accent text-muted-foreground"
                        )}
                      >
                        <span className="text-lg leading-none">{m.emoji}</span>
                        <span className={active ? m.text : ""}>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* What studied */}
              <div className="space-y-1.5">
                <Label htmlFor="je-studied" className="text-xs font-medium">
                  What I studied <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="je-studied"
                  placeholder="Topics covered, chapters, problems solved..."
                  value={fStudied}
                  onChange={(e) => setFStudied(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              {/* Blockers */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="je-blockers"
                  className="text-xs font-medium flex items-center gap-1"
                >
                  Blockers{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="je-blockers"
                  placeholder="What got in the way? Distractions, tough concepts..."
                  value={fBlockers}
                  onChange={(e) => setFBlockers(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              {/* Wins */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="je-wins"
                  className="text-xs font-medium flex items-center gap-1"
                >
                  Wins{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="je-wins"
                  placeholder="What went well? Breakthroughs, streaks kept..."
                  value={fWins}
                  onChange={(e) => setFWins(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              {/* Save */}
              <Button
                onClick={handleSave}
                className="w-full h-10 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 shadow-md shadow-violet-500/20"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Save Entry
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Summary + timeline */}
        <div className="lg:col-span-2 space-y-5">
          {/* Weekly AI Summary */}
          <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-transparent shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    Weekly AI Summary
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {weekEntries.length > 0
                      ? `${weekEntries.length} entr${weekEntries.length === 1 ? "y" : "ies"} this week · ${fmtDuration(
                          weekEntries.reduce(
                            (a, e) => a + (Number(e.durationMinutes) || 0),
                            0
                          )
                        )} studied`
                      : "Summarize the past 7 days with AI"}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={summaryLoading || weekEntries.length === 0}
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 shadow-sm"
                >
                  {summaryLoading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Generate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <LoadingState label="AI is reading your week..." />
              ) : summaryError ? (
                <ErrorState
                  message={summaryError}
                  onRetry={handleGenerate}
                />
              ) : summary ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-li:my-0.5 prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-p:my-1.5 prose-strong:text-foreground">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              ) : weekEntries.length === 0 ? (
                <EmptyState
                  title="No entries this week yet"
                  description="Log a study session on the left, then come back to generate your AI weekly insights."
                  icon={Calendar}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-violet-500/30 bg-violet-500/5 p-4 text-sm text-muted-foreground flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">
                      Ready to summarize {weekEntries.length}{" "}
                      entr{weekEntries.length === 1 ? "y" : "ies"}
                    </p>
                    <p className="mt-0.5">
                      Click <span className="font-medium">Generate</span> for a
                      weekly recap: total study time, subjects covered, key wins,
                      recurring blockers, mood trend, and 3 recommendations for
                      next week.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entries timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Timeline
                {entries.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {entries.length}
                  </Badge>
                )}
              </h2>
            </div>

            {entries.length === 0 ? (
              <EmptyState
                title="Start journaling — your first entry unlocks weekly AI insights."
                description="Use the form on the left to log what you studied today. Add wins and blockers to get the most out of your weekly AI summary."
                icon={BookOpen}
              />
            ) : (
              <div className="space-y-5">
                {groups.map((group) => (
                  <div key={group.key} className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </h3>
                      <div className="h-px flex-1 bg-border/60" />
                      <span className="text-[10px] text-muted-foreground">
                        {group.items.length}{" "}
                        {group.items.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {group.items.map((e) => (
                        <EntryCard
                          key={e.id}
                          entry={e}
                          onDelete={() => {
                            deleteEntry(e.id);
                            toast("Entry deleted", {
                              description: `${e.subject} · ${e.topic}`,
                            });
                            setSummary("");
                            setSummaryError(null);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Sub-components ----------------

function StatCard({
  icon,
  label,
  value,
  accent,
  iconWrap,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  iconWrap: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br p-3 sm:p-4",
        accent
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            iconWrap
          )}
        >
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <div className="mt-2 text-base sm:text-lg font-bold truncate">
        {value}
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  onDelete,
}: {
  entry: JournalEntry;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = moodMeta(entry.mood);

  let dateLabel = "—";
  try {
    dateLabel = format(parseISO(entry.date), "EEE, MMM d");
  } catch {
    dateLabel = entry.date;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "rounded-xl border bg-card shadow-sm overflow-hidden transition-all hover:shadow-md",
        "border-border/60"
      )}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-3.5 sm:p-4 flex items-start gap-3"
      >
        {/* Mood rail */}
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg",
            meta.bg
          )}
          title={`${meta.label} mood`}
        >
          {meta.emoji}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm truncate">
                  {entry.subject || "Untitled"}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground truncate">
                  {entry.topic || "—"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {dateLabel}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {fmtDuration(entry.durationMinutes)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-medium",
                    meta.text
                  )}
                >
                  <Flame className="h-3 w-3" />
                  {meta.label}
                </span>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform",
                expanded && "rotate-180"
              )}
            />
          </div>

          {/* Preview when collapsed */}
          {!expanded && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
              {entry.whatStudied || "No details"}
            </p>
          )}
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pl-[3.9rem] space-y-2.5 text-sm">
              <DetailRow label="What I studied" value={entry.whatStudied} />
              <DetailRow
                label="Blockers"
                value={entry.blockers}
                emptyText="None — clean session 🎯"
                tone="rose"
              />
              <DetailRow
                label="Wins"
                value={entry.wins}
                emptyText="No wins logged"
                tone="emerald"
              />
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-[10px] text-muted-foreground">
                  Logged{" "}
                  {(() => {
                    try {
                      return format(
                        parseISO(entry.createdAt),
                        "MMM d, h:mm a"
                      );
                    } catch {
                      return "";
                    }
                  })()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailRow({
  label,
  value,
  emptyText,
  tone,
}: {
  label: string;
  value: string;
  emptyText?: string;
  tone?: "rose" | "emerald";
}) {
  const labelColor =
    tone === "rose"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-muted-foreground";
  return (
    <div className="space-y-0.5">
      <div className={cn("text-[10px] uppercase tracking-wider font-medium", labelColor)}>
        {label}
      </div>
      {value?.trim() ? (
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
          {value}
        </p>
      ) : (
        <p className="text-xs italic text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

// ---------------- Helpers ----------------

function moodLabelFromScore(score: number) {
  if (score <= 0) return "—";
  if (score >= 3.5) return "😊 Great";
  if (score >= 2.5) return "🙂 Good";
  if (score >= 1.5) return "😐 Okay";
  return "😣 Struggle";
}

interface EntryGroup {
  key: string;
  label: string;
  items: JournalEntry[];
}

function buildGroups(entries: JournalEntry[]): EntryGroup[] {
  const sorted = [...entries].sort((a, b) => {
    // most recent first by date, then createdAt
    const dd = (b.date || "").localeCompare(a.date || "");
    if (dd !== 0) return dd;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  const today: JournalEntry[] = [];
  const yesterday: JournalEntry[] = [];
  const thisWeek: JournalEntry[] = [];
  const older: JournalEntry[] = [];

  for (const e of sorted) {
    let d: Date;
    try {
      d = parseISO(e.date);
    } catch {
      older.push(e);
      continue;
    }
    if (isToday(d)) today.push(e);
    else if (isYesterday(d)) yesterday.push(e);
    else if (isThisWeek(d, { weekStartsOn: 1 })) thisWeek.push(e);
    else older.push(e);
  }

  // sort older by month buckets? Just keep sorted list under "Older"
  const groups: EntryGroup[] = [];
  if (today.length) groups.push({ key: "today", label: "Today", items: today });
  if (yesterday.length)
    groups.push({ key: "yesterday", label: "Yesterday", items: yesterday });
  if (thisWeek.length)
    groups.push({ key: "thisweek", label: "Earlier this week", items: thisWeek });
  if (older.length) {
    // bucket older by month
    const monthBuckets: Record<string, JournalEntry[]> = {};
    for (const e of older) {
      let d: Date;
      try {
        d = parseISO(e.date);
      } catch {
        continue;
      }
      const k = format(d, "MMMM yyyy");
      (monthBuckets[k] ||= []).push(e);
    }
    // order month buckets by most recent first
    const ordered = Object.entries(monthBuckets).sort((a, b) => {
      const da = new Date(a[0]);
      const db = new Date(b[0]);
      return db.getTime() - da.getTime();
    });
    for (const [label, items] of ordered) {
      groups.push({ key: `older-${label}`, label, items });
    }
  }
  return groups;
}
