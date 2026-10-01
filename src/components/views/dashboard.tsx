"use client";

import { useAppStore, type ViewKey } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Scale,
  Network,
  FileText,
  HelpCircle,
  Repeat2,
  FileStack,
  CalendarRange,
  Layers,
  ListChecks,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Save,
  Lightbulb,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/shared/states";

const quickActions: { icon: typeof Search; label: string; view: ViewKey; emoji: string; desc: string }[] = [
  { icon: Search, label: "Research an Exam", view: "exam-researcher", emoji: "🔍", desc: "Exam intelligence report" },
  { icon: Scale, label: "Compare Exams", view: "exam-comparison", emoji: "⚖️", desc: "Common syllabus + overlap" },
  { icon: Network, label: "Map Syllabus Dependencies", view: "dependency-mapper", emoji: "🧩", desc: "Prerequisite graph" },
  { icon: FileText, label: "Analyse PDF", view: "pdf-lab", emoji: "📄", desc: "Grounded Q&A" },
  { icon: HelpCircle, label: "Explain Question", view: "question-explainer", emoji: "🧠", desc: "5-level explanation" },
  { icon: Repeat2, label: "Evolve Question", view: "question-evolution", emoji: "🔄", desc: "Practice family" },
  { icon: FileStack, label: "Generate Question Paper", view: "paper-generator", emoji: "📝", desc: "Personalized paper" },
  { icon: CalendarRange, label: "Build Preparation Plan", view: "preparation-simulator", emoji: "🎯", desc: "Adaptive journey" },
  { icon: Layers, label: "Optimize Multiple Exams", view: "multi-exam-optimizer", emoji: "🧠", desc: "Combined strategy" },
  { icon: ListChecks, label: "Generate MCQs", view: "mcq-generator", emoji: "🧪", desc: "From PDF or syllabus" },
  { icon: TrendingUp, label: "Analyse Performance", view: "my-research", emoji: "📊", desc: "From saved attempts" },
  { icon: Sparkles, label: "Ask AI Assistant", view: "dashboard", emoji: "✨", desc: "Contextual chat" },
];

const typeLabels: Record<string, string> = {
  exam: "Exam Research",
  comparison: "Comparison",
  dependency: "Dependency Map",
  explanation: "Question Explanation",
  evolution: "Question Evolution",
  paper: "Generated Paper",
  pdf: "PDF Analysis",
  mcq: "MCQ Set",
  preparation: "Preparation Plan",
  "multi-exam": "Multi-Exam Plan",
};

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function Dashboard() {
  const { saved, setView, setAssistantOpen } = useAppStore();
  const recentSaved = saved.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome to ExamIntel</h1>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> AI Exam Intelligence
          </Badge>
        </div>
        <p className="mt-1.5 text-muted-foreground">
          Your AI Command Center. Every feature shares data — researched syllabus feeds dependency maps, dependencies feed preparation plans, performance feeds adaptive recommendations.
        </p>
      </motion.div>

      {/* Priority recommendation */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
        <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">Your next priority</CardTitle>
            </div>
            <CardDescription>Intelligent recommendation based on your activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {saved.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm">
                <p className="font-medium">Start by researching an exam</p>
                <p className="mt-1 text-muted-foreground">
                  ExamIntel will identify the syllabus, build a dependency map, detect prerequisite gaps, and recommend a learning sequence.
                </p>
                <Button size="sm" className="mt-3 gap-1.5" onClick={() => setView("exam-researcher")}>
                  Research your first exam <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-violet-500/20 bg-background/40 p-4 text-sm">
                <p className="font-medium">Example recommendation flow</p>
                <p className="mt-1 text-muted-foreground">
                  You are weak in <span className="font-semibold text-foreground">Integration</span>, and Integration is a prerequisite for <span className="font-semibold text-foreground">Differential Equations</span>.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  <Badge variant="outline" className="gap-1"><TrendingUp className="h-3 w-3" /> Review Differentiation</Badge>
                  <Badge variant="outline">Practice 10 questions</Badge>
                  <Badge variant="outline">Continue Differential Equations</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setView("dependency-mapper")} className="gap-1.5">
                    <Network className="h-3.5 w-3.5" /> Open Dependency Map
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setView("question-evolution")} className="gap-1.5">
                    <Repeat2 className="h-3.5 w-3.5" /> Evolve a question
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Quick AI Actions</h2>
          <Button variant="ghost" size="sm" onClick={() => setAssistantOpen(true)} className="gap-1.5 text-violet-500">
            <Sparkles className="h-3.5 w-3.5" /> Ask AI
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickActions.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.button
                key={a.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: (i % 4) * 0.04 }}
                whileHover={{ y: -3 }}
                onClick={() => (a.view === "dashboard" ? setAssistantOpen(true) : setView(a.view))}
                className="group text-left"
              >
                <Card className="h-full hover:border-violet-500/40 hover:shadow-md hover:shadow-violet-500/10 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <span className="text-xl">{a.emoji}</span>
                      <Icon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <p className="mt-2 text-sm font-medium leading-tight">{a.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{a.desc}</p>
                  </CardContent>
                </Card>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Two-column: recent activity + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent Intelligence</CardTitle>
              <CardDescription>Your most recent saved research & practice</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView("my-research")} className="gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentSaved.length === 0 ? (
              <EmptyState
                title="No saved research yet"
                description="Once you research exams, analyse PDFs, or generate papers, your saved intelligence will appear here."
                icon={Save}
              />
            ) : (
              <ScrollArea className="h-72 pr-4">
                <div className="space-y-2">
                  {recentSaved.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setView("my-research")}
                      className="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50 transition"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 text-xs">
                        {typeLabels[s.type]?.[0] ?? "S"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{s.title}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(s.createdAt)}</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{s.summary}</p>
                        <Badge variant="outline" className="mt-1 text-[10px]">{typeLabels[s.type] ?? s.type}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Progress / weak topics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Weak Topic Alerts
            </CardTitle>
            <CardDescription>Auto-detected from your performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {saved.length === 0 ? (
              <p className="text-xs text-muted-foreground">Take a generated paper or MCQ set to surface weak topics.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs">
                    <span>Integration</span>
                    <span className="text-muted-foreground">45%</span>
                  </div>
                  <Progress value={45} className="mt-1 h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span>Profit & Loss</span>
                    <span className="text-muted-foreground">60%</span>
                  </div>
                  <Progress value={60} className="mt-1 h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span>Reading Comprehension</span>
                    <span className="text-muted-foreground">80%</span>
                  </div>
                  <Progress value={80} className="mt-1 h-1.5" />
                </div>
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px]">
                  <span className="font-medium text-amber-600 dark:text-amber-400">Recommendation:</span> Review Differentiation → Practice 5 Level-1 variants → Continue Integration.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workflow banner */}
      <Card className="border-dashed">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Zap className="h-5 w-5 text-violet-500" />
            <div className="flex-1">
              <p className="font-medium text-sm">Intelligent practice loop</p>
              <p className="text-xs text-muted-foreground">Learn → Practice → Attempt → Analyse → Detect Weakness → Detect Prerequisite Gap → Generate Targeted Questions → Evolve → Retest → Update Mastery.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setView("paper-generator")} className="gap-1.5">
              Start the loop <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
