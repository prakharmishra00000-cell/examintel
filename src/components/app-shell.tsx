"use client";

import { useState } from "react";
import { useAppStore, type ViewKey } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  Home,
  Search,
  Scale,
  Network,
  HelpCircle,
  Repeat2,
  FileText,
  FileStack,
  ListChecks,
  CalendarRange,
  Calendar,
  Layers,
  Sigma,
  Save,
  KeyRound,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Menu,
  Brain,
  Activity,
  Timer,
  BookOpen,
  Trophy,
  Target,
  BarChart3,
  ChevronDown,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Landing } from "@/components/views/landing";
import { ErrorBoundary } from "@/components/error-boundary";
import { ViewTransition } from "@/components/view-transition";
import { Dashboard } from "@/components/views/dashboard";
import { ExamResearcher } from "@/components/views/exam-researcher";
import { ExamComparison } from "@/components/views/exam-comparison";
import { ExamPatternAnalyzer } from "@/components/views/exam-pattern-analyzer";
import { DependencyMapper } from "@/components/views/dependency-mapper";
import { QuestionExplainer } from "@/components/views/question-explainer";
import { QuestionEvolution } from "@/components/views/question-evolution";
import { PaperGenerator } from "@/components/views/paper-generator";
import { PdfLab } from "@/components/views/pdf-lab";
import { McqGenerator } from "@/components/views/mcq-generator";
import { PreparationSimulator } from "@/components/views/preparation-simulator";
import { MultiExamOptimizer } from "@/components/views/multi-exam-optimizer";
import { MyResearch } from "@/components/views/my-research";
import { StudyTimer } from "@/components/views/study-timer";
import { ProgressJournal } from "@/components/views/progress-journal";
import { Flashcards } from "@/components/views/flashcards";
import { ExamCalendar } from "@/components/views/exam-calendar";
import { Achievements } from "@/components/views/achievements";
import { FormulaSheet } from "@/components/views/formula-sheet";
import { FormulaQuiz } from "@/components/views/formula-quiz";
import { TopicMastery } from "@/components/views/topic-mastery";
import { RevisionScheduler } from "@/components/views/revision-scheduler";
import { Analytics } from "@/components/views/analytics";
import { PYQBrowser } from "@/components/views/pyq-browser";
import { ConceptMap } from "@/components/views/concept-map";
import { StudyNotes } from "@/components/views/study-notes";
import { QuickPractice } from "@/components/views/quick-practice";
import { DailyGoals } from "@/components/views/daily-goals";
import { ApiKeysView } from "@/components/views/api-keys";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "Overview",
    icon: Home,
    items: [{ key: "dashboard", label: "Dashboard", icon: Home, desc: "Your AI command center" }],
  },
  {
    id: "core-ai",
    label: "Core AI Tools",
    icon: Brain,
    items: [
      { key: "exam-researcher", label: "Exam Researcher", icon: Search, desc: "Research any exam" },
      { key: "exam-comparison", label: "Compare Exams", icon: Scale, desc: "Find common syllabus" },
      { key: "exam-pattern-analyzer", label: "Pattern Analyzer", icon: BarChart3, desc: "Compare exam patterns" },
      { key: "dependency-mapper", label: "Dependency Map", icon: Network, desc: "Prerequisite graph" },
      { key: "question-explainer", label: "Question AI", icon: HelpCircle, desc: "5-level explanation" },
      { key: "question-evolution", label: "Question Lab", icon: Repeat2, desc: "Evolve a question" },
    ],
  },
  {
    id: "practice",
    label: "Practice & Generation",
    icon: FileStack,
    items: [
      { key: "paper-generator", label: "Paper Generator", icon: FileStack, desc: "Personalized papers" },
      { key: "pdf-lab", label: "PDF Lab", icon: FileText, desc: "Analyse official PDFs" },
      { key: "mcq-generator", label: "MCQ Generator", icon: ListChecks, desc: "Grounded practice" },
      { key: "quick-practice", label: "Quick Practice", icon: Zap, desc: "Rapid-fire mode" },
      { key: "pyq-browser", label: "PYQ Browser", icon: FileText, desc: "Previous-year questions" },
      { key: "flashcards", label: "Flashcards", icon: Layers, desc: "Spaced repetition" },
      { key: "formula-sheet", label: "Formula Sheet", icon: Sigma, desc: "Reference library" },
      { key: "formula-quiz", label: "Formula Quiz", icon: Brain, desc: "Test formula recall" },
    ],
  },
  {
    id: "planning",
    label: "Planning & Strategy",
    icon: CalendarRange,
    items: [
      { key: "preparation-simulator", label: "Preparation", icon: CalendarRange, desc: "Adaptive study plan" },
      { key: "multi-exam-optimizer", label: "Multi-Exam", icon: Layers, desc: "Optimize across exams" },
      { key: "exam-calendar", label: "Calendar", icon: Calendar, desc: "Dates & milestones" },
      { key: "revision-scheduler", label: "Revision", icon: RotateCcw, desc: "Daily spaced repetition" },
    ],
  },
  {
    id: "tracking",
    label: "Tracking & Progress",
    icon: Activity,
    items: [
      { key: "my-research", label: "My Research", icon: Save, desc: "Saved intelligence" },
      { key: "concept-map", label: "Concept Map", icon: Network, desc: "Visual knowledge graph" },
      { key: "topic-mastery", label: "Topic Mastery", icon: Target, desc: "Strength heatmap" },
      { key: "analytics", label: "Analytics", icon: BarChart3, desc: "Performance insights" },
      { key: "study-timer", label: "Study Timer", icon: Timer, desc: "Pomodoro + streaks" },
      { key: "progress-journal", label: "Journal", icon: BookOpen, desc: "Daily study log" },
      { key: "study-notes", label: "Notes", icon: BookOpen, desc: "Markdown study notes" },
      { key: "daily-goals", label: "Daily Goals", icon: Target, desc: "Study targets + streaks" },
      { key: "achievements", label: "Achievements", icon: Trophy, desc: "Badges & XP" },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: KeyRound,
    items: [{ key: "api-keys", label: "API Keys", icon: KeyRound, desc: "Vercel setup guide" }],
  },
];

// Flat list for backward compat (mobile bottom nav, command palette)
const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

function ThemeToggle() {
  const { theme, setTheme } = useAppStore();
  const cycle = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    applyTheme(next);
  };
  const applyTheme = (t: string) => {
    const isDark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  };
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <Button variant="ghost" size="icon" onClick={cycle} title={`Theme: ${theme}`}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function Logo() {
  const setView = useAppStore((s) => s.setView);
  return (
    <button
      onClick={() => setView("dashboard")}
      className="flex items-center gap-2 group"
      title="Go to dashboard"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50 group-hover:opacity-80 transition" />
        <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
          <Brain className="h-4 w-4" />
        </div>
      </div>
      <div className="hidden sm:block text-left leading-none">
        <div className="font-bold text-base tracking-tight">ExamIntel</div>
        <div className="text-[10px] text-muted-foreground">AI Exam Intelligence</div>
      </div>
    </button>
  );
}

function AiStatusPill() {
  const aiStatus = useAppStore((s) => s.aiStatus);
  const setView = useAppStore((s) => s.setView);
  const ok = aiStatus?.available;
  return (
    <button
      onClick={() => setView("api-keys")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      )}
      title={ok ? `AI: ${aiStatus?.provider}` : "No AI key — using mock mode"}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-500" : "bg-amber-500")} />
      {ok ? "AI Live" : "Mock Mode"}
    </button>
  );
}

function SidebarContent({ currentView, setView, onNavigate }: { currentView: ViewKey; setView: (v: ViewKey) => void; onNavigate?: () => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_GROUPS.map((group) => {
        const isCollapsed = collapsed.has(group.id);
        const GIcon = group.icon;
        const hasActive = group.items.some((i) => i.key === currentView);
        // Single-item groups render flat (no header)
        if (group.items.length === 1) {
          const item = group.items[0];
          const active = currentView === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => {
                setView(item.key);
                onNavigate?.();
              }}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all border",
                active
                  ? "bg-gradient-to-r from-violet-500/15 to-fuchsia-500/5 text-foreground border-violet-500/20"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-violet-500")} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-tight truncate">{item.label}</div>
              </div>
              {active && <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
            </button>
          );
        }
        return (
          <div key={group.id} className="mb-1">
            <button
              onClick={() => toggleGroup(group.id)}
              className={cn(
                "group flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors",
                hasActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GIcon className={cn("h-3.5 w-3.5 shrink-0", hasActive && "text-violet-500")} />
              <span className="text-[10px] font-semibold uppercase tracking-wider flex-1">{group.label}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isCollapsed && "-rotate-90")} />
            </button>
            {!isCollapsed && (
              <div className="ml-2 mt-0.5 space-y-0.5 border-l border-border/60 pl-2">
                {group.items.map((item) => {
                  const active = currentView === item.key;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setView(item.key);
                        onNavigate?.();
                      }}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-all w-full",
                        active
                          ? "bg-gradient-to-r from-violet-500/15 to-fuchsia-500/5 text-foreground"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-violet-500" : "text-muted-foreground/70")} />
                      <span className="text-xs font-medium leading-tight truncate flex-1">{item.label}</span>
                      {active && <div className="h-1 w-1 rounded-full bg-violet-500" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  const currentView = useAppStore((s) => s.currentView);
  const setView = useAppStore((s) => s.setView);
  const setAssistantOpen = useAppStore((s) => s.setAssistantOpen);
  const [mobileOpen, setMobileOpen] = useState(false);

  const render = () => {
    switch (currentView) {
      case "landing":
        return <Landing />;
      case "dashboard":
        return <Dashboard />;
      case "exam-researcher":
        return <ExamResearcher />;
      case "exam-comparison":
        return <ExamComparison />;
      case "exam-pattern-analyzer":
        return <ExamPatternAnalyzer />;
      case "dependency-mapper":
        return <DependencyMapper />;
      case "question-explainer":
        return <QuestionExplainer />;
      case "question-evolution":
        return <QuestionEvolution />;
      case "paper-generator":
        return <PaperGenerator />;
      case "pdf-lab":
        return <PdfLab />;
      case "mcq-generator":
        return <McqGenerator />;
      case "preparation-simulator":
        return <PreparationSimulator />;
      case "multi-exam-optimizer":
        return <MultiExamOptimizer />;
      case "my-research":
        return <MyResearch />;
      case "study-timer":
        return <StudyTimer />;
      case "progress-journal":
        return <ProgressJournal />;
      case "flashcards":
        return <Flashcards />;
      case "exam-calendar":
        return <ExamCalendar />;
      case "achievements":
        return <Achievements />;
      case "topic-mastery":
        return <TopicMastery />;
      case "analytics":
        return <Analytics />;
      case "revision-scheduler":
        return <RevisionScheduler />;
      case "formula-sheet":
        return <FormulaSheet />;
      case "formula-quiz":
        return <FormulaQuiz />;
      case "pyq-browser":
        return <PYQBrowser />;
      case "concept-map":
        return <ConceptMap />;
      case "study-notes":
        return <StudyNotes />;
      case "daily-goals":
        return <DailyGoals />;
      case "quick-practice":
        return <QuickPractice />;
      case "api-keys":
        return <ApiKeysView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* subtle grid pattern */}
      <div className="pointer-events-none fixed inset-0 bg-grid bg-grid-fade opacity-[0.25] -z-10" />
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center gap-3 px-4">
          {/* Mobile menu trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-14 items-center px-4 border-b border-border">
                <Logo />
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-3.5rem)]">
                <SidebarContent currentView={currentView} setView={setView} onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <Logo />
          <div className="ml-2 hidden md:block">
            <AiStatusPill />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Trigger the command palette via a custom event the palette listens for
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: navigator.platform.includes("Mac") ? false : true }));
              }}
              className="gap-1.5 hidden sm:flex border-border/60 text-muted-foreground hover:text-foreground"
              title="Open command palette (Cmd+K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search</span>
              <kbd className="ml-1 rounded border border-border bg-muted px-1 py-0.5 text-[9px] font-mono">⌘K</kbd>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssistantOpen(true)}
              className="gap-1.5 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-violet-500/20 hover:from-violet-500/20 hover:to-fuchsia-500/20"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              <span className="hidden sm:inline">Ask AI</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1">
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-muted/20 flex-col">
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-3.5rem)] sticky top-14">
            <SidebarContent currentView={currentView} setView={setView} />
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6">
            <ErrorBoundary key={currentView}>
              <ViewTransition viewKey={currentView}>{render()}</ViewTransition>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav (compact) */}
      <nav className="lg:hidden sticky bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-center overflow-x-auto px-2 py-1.5 gap-1 no-scrollbar">
          {NAV.filter((n) => !["my-research", "api-keys", "study-timer", "progress-journal", "flashcards", "exam-calendar", "achievements", "formula-sheet", "formula-quiz", "topic-mastery", "analytics", "revision-scheduler", "exam-pattern-analyzer", "pyq-browser", "concept-map", "study-notes", "daily-goals", "quick-practice"].includes(n.key)).slice(0, 6).map((item) => {
            const Icon = item.icon;
            const active = currentView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-3 py-1 text-[10px] min-w-[60px]",
                  active ? "text-violet-500" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate max-w-[60px]">{item.label.split(" ")[0]}</span>
              </button>
            );
          })}
          <button
            onClick={() => setView("study-timer")}
            className="flex flex-col items-center gap-0.5 rounded-md px-3 py-1 text-[10px] min-w-[60px] text-muted-foreground"
          >
            <Timer className="h-4 w-4" />
            <span>Timer</span>
          </button>
          <button
            onClick={() => setView("progress-journal")}
            className="flex flex-col items-center gap-0.5 rounded-md px-3 py-1 text-[10px] min-w-[60px] text-muted-foreground"
          >
            <BookOpen className="h-4 w-4" />
            <span>Journal</span>
          </button>
          <button
            onClick={() => setView("my-research")}
            className="flex flex-col items-center gap-0.5 rounded-md px-3 py-1 text-[10px] min-w-[60px] text-muted-foreground"
          >
            <Save className="h-4 w-4" />
            <span>Saved</span>
          </button>
          <button
            onClick={() => setView("api-keys")}
            className="flex flex-col items-center gap-0.5 rounded-md px-3 py-1 text-[10px] min-w-[60px] text-muted-foreground"
          >
            <KeyRound className="h-4 w-4" />
            <span>Keys</span>
          </button>
        </div>
      </nav>

      {/* Footer (sticky to bottom) */}
      <footer className="mt-auto border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="font-medium text-foreground">ExamIntel</span>
            <span>·</span>
            <span>AI Exam Intelligence Platform</span>
            <span>·</span>
            <button onClick={() => setView("api-keys")} className="underline hover:text-foreground">
              API Keys setup for Vercel
            </button>
          </div>
          <div className="mt-1">
            Research → Understand → Map → Compare → Diagnose → Practice → Generate → Prepare → Simulate → Analyse → Adapt
          </div>
        </div>
      </footer>
    </div>
  );
}
