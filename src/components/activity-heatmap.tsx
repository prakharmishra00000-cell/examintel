"use client";

import { useMemo } from "react";
import { useJournalStore } from "@/store/journal-store";
import { useStudyStore } from "@/store/study-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Flame } from "lucide-react";

// 12-week activity heatmap combining journal entries + study sessions.
// Shows a GitHub-style contribution graph to visualize consistency.
export function ActivityHeatmap() {
  const journal = useJournalStore((s) => s.entries);
  const studySessions = useStudyStore((s) => s.sessions);

  const { weeks, totalActive, maxCount } = useMemo(() => {
    // Build a map of date -> activity count for last 12 weeks (84 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const counts = new Map<string, number>();
    const add = (iso: string) => {
      const d = new Date(iso);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    };
    journal.forEach((e) => add(e.date));
    studySessions.forEach((s) => add(s.date));

    // Build 12 weeks (columns), each 7 days (rows). Start from 83 days ago, aligned to week start (Sunday).
    const weeks: { date: Date; key: string; count: number }[][] = [];
    let totalActive = 0;
    let maxCount = 0;
    const start = new Date(today);
    start.setDate(start.getDate() - 83);
    // Align to Sunday
    start.setDate(start.getDate() - start.getDay());
    for (let w = 0; w < 12; w++) {
      const week: { date: Date; key: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        const key = day.toISOString().slice(0, 10);
        const count = counts.get(key) ?? 0;
        if (count > 0 && day <= today) totalActive++;
        if (count > maxCount) maxCount = count;
        week.push({ date: day, key, count });
      }
      weeks.push(week);
    }
    return { weeks, totalActive, maxCount };
  }, [journal, studySessions]);

  const level = (count: number) => {
    if (count === 0) return "bg-muted/40";
    if (count === 1) return "bg-violet-500/30";
    if (count <= 2) return "bg-violet-500/55";
    if (count <= 4) return "bg-violet-500/80";
    return "bg-violet-500";
  };

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-500" /> Activity Heatmap
          </CardTitle>
          <CardDescription>Last 12 weeks of study + journal activity</CardDescription>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gradient-violet">{totalActive}</div>
          <div className="text-[10px] text-muted-foreground">active days</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto no-scrollbar">
          <div className="inline-flex flex-col gap-1 min-w-max">
            {/* Month labels row */}
            <div className="flex gap-1 pl-0 text-[9px] text-muted-foreground">
              {weeks.map((week, i) => {
                const firstDay = week[0].date;
                const showLabel = i === 0 || (firstDay.getDate() <= 7 && i > 0);
                return (
                  <div key={i} className="w-3 text-center">
                    {showLabel ? monthLabels[firstDay.getMonth()] : ""}
                  </div>
                );
              })}
            </div>
            {/* Heatmap grid */}
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) => {
                    const isFuture = day.date > new Date();
                    const isToday = day.key === new Date().toISOString().slice(0, 10);
                    return (
                      <div
                        key={di}
                        title={`${day.key}: ${day.count} activit${day.count === 1 ? "y" : "ies"}`}
                        className={`h-3 w-3 rounded-sm ${isFuture ? "bg-transparent" : level(day.count)} ${isToday ? "ring-1 ring-violet-500 ring-offset-1 ring-offset-background" : ""} hover:scale-125 transition-transform cursor-default`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-muted-foreground">
              <span>Less</span>
              <div className="h-2.5 w-2.5 rounded-sm bg-muted/40" />
              <div className="h-2.5 w-2.5 rounded-sm bg-violet-500/30" />
              <div className="h-2.5 w-2.5 rounded-sm bg-violet-500/55" />
              <div className="h-2.5 w-2.5 rounded-sm bg-violet-500/80" />
              <div className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
              <span>More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
