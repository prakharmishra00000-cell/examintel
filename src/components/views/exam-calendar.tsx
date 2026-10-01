"use client";

import { useMemo, useState, useSyncExternalStore, type ComponentType } from "react";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  parseISO,
  isToday,
  differenceInCalendarDays,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flag,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  Target,
  Bell,
  GraduationCap,
  CalendarCheck,
  ArrowRight,
} from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useCountdownStore } from "@/store/countdown-store";
import { useStudyStore } from "@/store/study-store";
import { useJournalStore } from "@/store/journal-store";
import {
  useCalendarStore,
  type CalendarCustomEvent,
  type CalendarEventType,
} from "@/store/calendar-store";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ============================================================
// Exam Calendar — monthly view aggregating exam dates,
// auto-milestones, study sessions, journal entries, and
// user-defined custom events from all stores.
// ============================================================

// ---------- Hydration-safe mounted guard ----------
// useSyncExternalStore with noop subscribe + true (client) / false (server)
// snapshots — the lint-compliant "is client" pattern that avoids
// react-hooks/set-state-in-effect.
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

// ---------- Types ----------

interface CalEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: "exam" | "milestone" | "study" | "journal" | "reminder";
  title: string;
  description?: string;
  /** Where clicking the event should navigate (in upcoming panel / day sheet). */
  navigate?: "dashboard" | "my-research";
  /** For study/journal aggregated events — number of underlying records. */
  count?: number;
  totalMinutes?: number;
  /** For custom user-defined events — supports delete. */
  customId?: string;
}

// ---------- Helpers ----------

/** Local YYYY-MM-DD key for a Date (avoids UTC shift from toISOString). */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Human relative countdown label, e.g. "in 3 days", "Tomorrow", "in 2 weeks". */
function relativeCountdown(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days < 7) return `in ${days} days`;
  if (days < 14) return `in 1 week`;
  if (days < 30) return `in ${Math.round(days / 7)} weeks`;
  if (days < 60) return `in 1 month`;
  return `in ${Math.round(days / 30)} months`;
}

const MILESTONE_DEFS: { daysBefore: number; label: string; description: string }[] = [
  { daysBefore: 60, label: "Topic completion", description: "Finish syllabus topics" },
  { daysBefore: 30, label: "Practice phase", description: "Begin full practice sets" },
  { daysBefore: 14, label: "Mock tests", description: "Daily mock tests begin" },
  { daysBefore: 7, label: "Final revision", description: "Intensive revision week" },
];

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------- Style constants (NO indigo/blue) ----------

const TYPE_BADGE_STYLES: Record<string, string> = {
  exam: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
  milestone: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  reminder: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30",
};

const TYPE_DOT_STYLES: Record<string, string> = {
  study: "bg-violet-500",
  journal: "bg-sky-500",
};

const TYPE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  exam: GraduationCap,
  milestone: Target,
  reminder: Bell,
  study: Clock,
  journal: BookOpen,
};

// ============================================================
// Add Event Dialog
// ============================================================

function AddEventDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (e: Omit<CalendarCustomEvent, "id" | "createdAt">) => void;
}) {
  // Initial state — Radix Dialog unmounts DialogContent on close so this
  // re-initialises fresh on each open (no useEffect needed).
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string>(dayKey(new Date()));
  const [type, setType] = useState<CalendarEventType>("reminder");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!title.trim() || !date) return;
    onAdd({
      title: title.trim(),
      date,
      type,
      notes: notes.trim() || undefined,
    });
    setTitle("");
    setNotes("");
    setDate(dayKey(new Date()));
    setType("reminder");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-violet-500" />
            Add custom event
          </DialogTitle>
          <DialogDescription>
            Add an exam date, milestone, or personal reminder to your calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Title</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full mock test"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">Date</Label>
              <Input
                id="ev-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as CalendarEventType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-notes">Notes (optional)</Label>
            <Input
              id="ev-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra context"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!title.trim() || !date}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600"
          >
            Add event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Main ExamCalendar component
// ============================================================

export function ExamCalendar() {
  const mounted = useMounted();
  const setView = useAppStore((s) => s.setView);

  const countdown = useCountdownStore((s) => s.countdown);
  const saved = useAppStore((s) => s.saved);
  const sessions = useStudyStore((s) => s.sessions);
  const entries = useJournalStore((s) => s.entries);
  const customEvents = useCalendarStore((s) => s.events);
  const addCustomEvent = useCalendarStore((s) => s.addEvent);
  const removeCustomEvent = useCalendarStore((s) => s.removeEvent);

  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // ----- Aggregate all events from every store -----
  const events = useMemo<CalEvent[]>(() => {
    const list: CalEvent[] = [];

    // Helper: append exam + its 4 auto-milestones for a given date/name/source.
    const appendExamWithMilestones = (
      dateStr: string,
      name: string,
      navigate: "dashboard" | "my-research",
      idPrefix: string,
      description = "Exam date"
    ) => {
      try {
        const d = parseISO(dateStr);
        if (Number.isNaN(d.getTime())) return;
        const key = dayKey(d);
        list.push({
          id: `${idPrefix}-exam-${key}`,
          date: key,
          type: "exam",
          title: name,
          description,
          navigate,
        });
        for (const m of MILESTONE_DEFS) {
          const md = new Date(d);
          md.setDate(md.getDate() - m.daysBefore);
          const mkey = dayKey(md);
          list.push({
            id: `${idPrefix}-mil-${m.daysBefore}-${mkey}`,
            date: mkey,
            type: "milestone",
            title: m.label,
            description: `${m.description} · ${name}`,
            navigate,
          });
        }
      } catch {
        /* skip invalid date */
      }
    };

    // 1. Exam from countdown store
    if (countdown?.examDate) {
      appendExamWithMilestones(
        countdown.examDate,
        countdown.examName,
        "dashboard",
        "cd",
        countdown.targetScore ? `Target: ${countdown.targetScore}` : "Exam day"
      );
    }

    // 2. Exams from saved items — preparation plans (single examDate) & multi-exam plans (exams[].date)
    for (const item of saved) {
      if (item.type === "preparation") {
        const data = item.data as
          | { examDate?: string; targetExam?: string }
          | null
          | undefined;
        if (data?.examDate) {
          appendExamWithMilestones(
            data.examDate,
            data.targetExam || item.title,
            "my-research",
            `prep-${item.id}`,
            "Preparation plan exam"
          );
        }
      } else if (item.type === "multi-exam") {
        const data = item.data as
          | { exams?: { name?: string; date?: string }[] }
          | null
          | undefined;
        if (data?.exams) {
          for (let i = 0; i < data.exams.length; i++) {
            const ex = data.exams[i];
            if (!ex?.date) continue;
            appendExamWithMilestones(
              ex.date,
              ex.name || `Exam ${i + 1}`,
              "my-research",
              `multi-${item.id}-${i}`,
              "Multi-exam plan"
            );
          }
        }
      }
    }

    // 3. Study sessions aggregated by day
    const studyByDay = new Map<string, { count: number; minutes: number }>();
    for (const s of sessions) {
      try {
        const d = parseISO(s.date);
        if (Number.isNaN(d.getTime())) continue;
        const key = dayKey(d);
        const cur = studyByDay.get(key) || { count: 0, minutes: 0 };
        cur.count += 1;
        cur.minutes += s.durationMinutes;
        studyByDay.set(key, cur);
      } catch {
        /* skip */
      }
    }
    for (const [key, v] of studyByDay) {
      list.push({
        id: `study-${key}`,
        date: key,
        type: "study",
        title: `${v.count} session${v.count > 1 ? "s" : ""}`,
        description: `${v.minutes} min studied`,
        count: v.count,
        totalMinutes: v.minutes,
      });
    }

    // 4. Journal entries aggregated by day
    const journalByDay = new Map<string, number>();
    for (const e of entries) {
      try {
        const d = parseISO(e.date);
        if (Number.isNaN(d.getTime())) continue;
        const key = dayKey(d);
        journalByDay.set(key, (journalByDay.get(key) || 0) + 1);
      } catch {
        /* skip */
      }
    }
    for (const [key, count] of journalByDay) {
      list.push({
        id: `journal-${key}`,
        date: key,
        type: "journal",
        title: `${count} journal entr${count > 1 ? "ies" : "y"}`,
        description: "Journal entries logged",
        count,
      });
    }

    // 5. Custom user events
    for (const e of customEvents) {
      list.push({
        id: `custom-${e.id}`,
        date: e.date,
        type:
          e.type === "exam"
            ? "exam"
            : e.type === "milestone"
            ? "milestone"
            : "reminder",
        title: e.title,
        description: e.notes,
        customId: e.id,
      });
    }

    return list;
  }, [countdown, saved, sessions, entries, customEvents]);

  // Index events by date for O(1) day-cell lookups
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const arr = map.get(e.date) || [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [events]);

  // Build calendar grid (Mon-Sun, 5-6 weeks)
  const days = useMemo(() => {
    if (!mounted) return [];
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor, mounted]);

  // Upcoming events — next 5 sorted by date
  const upcoming = useMemo<CalEvent[]>(() => {
    if (!mounted) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = dayKey(today);
    const future = events.filter((e) => e.date >= todayKey);
    const sorted = [...future].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const pr = (t: string) =>
        t === "exam" ? 0 : t === "milestone" ? 1 : t === "reminder" ? 2 : t === "study" ? 3 : 4;
      return pr(a.type) - pr(b.type);
    });
    const seen = new Set<string>();
    const out: CalEvent[] = [];
    for (const e of sorted) {
      const key = `${e.date}|${e.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
      if (out.length >= 5) break;
    }
    return out;
  }, [events, mounted]);

  const handleEventClick = (e: CalEvent) => {
    if (e.navigate === "dashboard") setView("dashboard");
    else if (e.navigate === "my-research") setView("my-research");
  };

  const activeDays = useMemo(
    () => new Set(events.map((e) => e.date)).size,
    [events]
  );

  // ----- Render -----
  if (!mounted) {
    // Skeleton placeholder to avoid SSR/CSR mismatch from persisted stores
    return (
      <div className="space-y-4">
        <div className="h-16 rounded-lg bg-muted/30 animate-pulse" />
        <div className="h-12 rounded-lg bg-muted/20 animate-pulse" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-20 sm:h-28 rounded-md bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-40" />
            <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Exam Calendar</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              All your exam dates, milestones, study sessions &amp; journal entries in one view.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600 self-start sm:self-auto"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      {/* Toolbar: prev / today / next + month-year + active-day count */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            title="Previous month"
            className="hover:text-violet-500"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor(new Date())}
            className="hover:text-violet-500 font-medium"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            title="Next month"
            className="hover:text-violet-500"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-base sm:text-lg font-semibold">
          {format(cursor, "MMMM yyyy")}
        </div>
        <div className="text-xs text-muted-foreground hidden sm:block">
          {activeDays} active {activeDays === 1 ? "day" : "days"}
        </div>
      </div>

      {/* Main layout: calendar + upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar (2/3 on desktop, full on mobile) */}
        <div className="lg:col-span-2 space-y-3">
          <Card className="overflow-hidden">
            <CardContent className="p-2 sm:p-3">
              {/* Weekday header */}
              <div className="grid grid-cols-7 gap-1 mb-1.5">
                {WEEKDAY_LABELS.map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((d) => {
                  const key = dayKey(d);
                  const dayEvents = eventsByDate.get(key) || [];
                  const inMonth = isSameMonth(d, cursor);
                  const today = isToday(d);
                  const badgeEvents = dayEvents.filter(
                    (e) => e.type === "exam" || e.type === "milestone" || e.type === "reminder"
                  );
                  const dotEvents = dayEvents.filter(
                    (e) => e.type === "study" || e.type === "journal"
                  );
                  const visibleBadges = badgeEvents.slice(0, 2);
                  const moreCount = badgeEvents.length - visibleBadges.length;
                  const hasEvents = dayEvents.length > 0;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(d)}
                      className={cn(
                        "relative text-left rounded-md border p-1 sm:p-1.5",
                        "min-h-[60px] sm:min-h-[96px]",
                        "transition-colors duration-150",
                        "hover:border-violet-500/40 hover:bg-violet-500/5",
                        "focus:outline-none focus:ring-2 focus:ring-violet-500/40",
                        today
                          ? "bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 border-violet-500/50 ring-2 ring-violet-500/40"
                          : inMonth
                          ? "bg-card border-border"
                          : "bg-muted/20 border-border/40 opacity-60"
                      )}
                      aria-label={`${format(d, "EEEE, d MMMM yyyy")} — ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`}
                    >
                      <div className="flex justify-between items-start">
                        <span
                          className={cn(
                            "text-xs sm:text-sm font-medium tabular-nums",
                            today
                              ? "text-violet-600 dark:text-violet-300"
                              : inMonth
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {format(d, "d")}
                        </span>
                        {today && (
                          <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Badges (hidden on mobile, dots become primary indicator) */}
                      <div className="mt-1 space-y-0.5 hidden sm:block">
                        {visibleBadges.map((e) => (
                          <span
                            key={e.id}
                            className={cn(
                              "block text-[9px] leading-tight px-1 py-0.5 rounded border truncate",
                              TYPE_BADGE_STYLES[e.type]
                            )}
                            title={e.title}
                          >
                            <span className="truncate">{e.title}</span>
                          </span>
                        ))}
                        {moreCount > 0 && (
                          <div className="text-[9px] text-muted-foreground px-1 font-medium">
                            +{moreCount} more
                          </div>
                        )}
                      </div>

                      {/* Dots row (always visible — primary indicator on mobile) */}
                      <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1 flex-wrap">
                        {dotEvents.map((e) => (
                          <span
                            key={e.id}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              TYPE_DOT_STYLES[e.type]
                            )}
                            title={e.title}
                          />
                        ))}
                        {hasEvents && dotEvents.length === 0 && (
                          // Subtle indicator on dot-less days with badge events (mobile hint)
                          <span className="sm:hidden h-1 w-1 rounded-full bg-violet-500/40" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Exam</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Milestone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              <span>Study session</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span>Journal entry</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-fuchsia-500" />
              <span>Reminder</span>
            </div>
          </div>
        </div>

        {/* Upcoming events panel */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 border border-violet-500/20 flex items-center justify-center">
                  <CalendarCheck className="h-3.5 w-3.5 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-base leading-none">Upcoming</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Next 5 events sorted by date
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {upcoming.length === 0 ? (
                <div className="text-center py-10 px-3">
                  <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No upcoming events
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set an exam countdown or add a custom event to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                  {upcoming.map((e) => {
                    const d = parseISO(e.date);
                    const days = differenceInCalendarDays(d, new Date());
                    const Icon = TYPE_ICON[e.type] || Flag;
                    const isDot = e.type === "study" || e.type === "journal";
                    return (
                      <button
                        key={e.id}
                        onClick={() => handleEventClick(e)}
                        disabled={!e.navigate}
                        className={cn(
                          "w-full flex items-start gap-2.5 rounded-lg border border-border/60 p-2.5 transition-colors text-left",
                          e.navigate
                            ? "hover:bg-violet-500/5 hover:border-violet-500/30 cursor-pointer"
                            : "cursor-default opacity-90"
                        )}
                      >
                        <div
                          className={cn(
                            "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                            isDot ? "bg-muted" : TYPE_BADGE_STYLES[e.type]
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              isDot && "text-muted-foreground"
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {e.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {e.description || format(d, "EEE, d MMM yyyy")}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-semibold text-violet-600 dark:text-violet-300">
                            {relativeCountdown(days)}
                          </div>
                          <div className="text-[10px] text-muted-foreground tabular-nums">
                            {format(d, "d MMM")}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Day detail Sheet */}
      <Sheet
        open={!!selectedDay}
        onOpenChange={(o) => !o && setSelectedDay(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-violet-500" />
              {selectedDay ? format(selectedDay, "EEEE, d MMMM yyyy") : ""}
            </SheetTitle>
            <SheetDescription>
              {selectedDay
                ? `${(eventsByDate.get(dayKey(selectedDay)) || []).length} event${
                    (eventsByDate.get(dayKey(selectedDay)) || []).length === 1
                      ? ""
                      : "s"
                  } on this day`
                : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-[calc(100vh-7rem)]">
            {selectedDay &&
              (eventsByDate.get(dayKey(selectedDay)) || []).length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No events on this day.
                </div>
              )}
            {selectedDay &&
              (eventsByDate.get(dayKey(selectedDay)) || []).map((e) => {
                const Icon = TYPE_ICON[e.type] || Flag;
                const isDot = e.type === "study" || e.type === "journal";
                return (
                  <div
                    key={e.id}
                    className="rounded-lg border border-border/60 p-3 space-y-1.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                          isDot ? "bg-muted" : TYPE_BADGE_STYLES[e.type]
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            isDot && "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{e.title}</div>
                        {e.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {e.description}
                          </div>
                        )}
                        {e.count !== undefined && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {e.count} record{e.count === 1 ? "" : "s"}
                            {e.totalMinutes
                              ? ` · ${e.totalMinutes} min total`
                              : ""}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {e.navigate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:text-violet-500"
                            onClick={() => handleEventClick(e)}
                            title="Open related view"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {e.customId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:text-rose-500"
                            onClick={() => {
                              if (e.customId) {
                                removeCustomEvent(e.customId);
                                toast.success("Event removed");
                              }
                            }}
                            title="Delete event"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add event dialog */}
      <AddEventDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(e) => {
          addCustomEvent(e);
          toast.success("Event added to calendar");
          // Jump cursor to the new event's month so user sees it
          try {
            const d = parseISO(e.date);
            if (!Number.isNaN(d.getTime())) setCursor(d);
          } catch {
            /* ignore */
          }
        }}
      />
    </div>
  );
}
