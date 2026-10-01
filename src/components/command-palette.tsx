"use client";

import * as React from "react";
import {
  Search,
  CornerDownLeft,
  Home,
  Scale,
  Network,
  HelpCircle,
  Repeat2,
  FileText,
  FileStack,
  ListChecks,
  CalendarRange,
  Layers,
  Save,
  KeyRound,
  Sparkles,
  ArrowRight,
  Brain,
} from "lucide-react";

import { useAppStore, type ViewKey } from "@/store/app-store";
import type { SavedItem, SavedType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------- Static config ----------

interface NavCommand {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

const NAV_COMMANDS: NavCommand[] = [
  { key: "dashboard", label: "Dashboard", icon: Home, desc: "Your AI command center" },
  { key: "exam-researcher", label: "Exam Researcher", icon: Search, desc: "Research any exam" },
  { key: "exam-comparison", label: "Compare Exams", icon: Scale, desc: "Find common syllabus" },
  { key: "dependency-mapper", label: "Dependency Map", icon: Network, desc: "Prerequisite graph" },
  { key: "question-explainer", label: "Question AI", icon: HelpCircle, desc: "5-level explanation" },
  { key: "question-evolution", label: "Question Lab", icon: Repeat2, desc: "Evolve a question" },
  { key: "paper-generator", label: "Paper Generator", icon: FileStack, desc: "Personalized papers" },
  { key: "pdf-lab", label: "PDF Lab", icon: FileText, desc: "Analyse official PDFs" },
  { key: "mcq-generator", label: "MCQ Generator", icon: ListChecks, desc: "Grounded practice" },
  { key: "preparation-simulator", label: "Preparation", icon: CalendarRange, desc: "Adaptive study plan" },
  { key: "multi-exam-optimizer", label: "Multi-Exam", icon: Layers, desc: "Optimize across exams" },
  { key: "my-research", label: "My Research", icon: Save, desc: "Saved intelligence" },
];

interface QuickAction {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  run: (ctx: {
    setView: (v: ViewKey) => void;
    setAssistantOpen: (b: boolean) => void;
  }) => void;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "ask-ai",
    label: "Ask AI Assistant",
    desc: "Open the contextual AI sidebar",
    icon: Sparkles,
    run: ({ setAssistantOpen }) => setAssistantOpen(true),
  },
  {
    id: "research-exam",
    label: "Research an Exam",
    desc: "Jump to Exam Researcher",
    icon: Search,
    run: ({ setView }) => setView("exam-researcher"),
  },
  {
    id: "generate-paper",
    label: "Generate Paper",
    desc: "Build a personalized question paper",
    icon: FileStack,
    run: ({ setView }) => setView("paper-generator"),
  },
  {
    id: "build-prep",
    label: "Build Prep Plan",
    desc: "Create an adaptive study plan",
    icon: CalendarRange,
    run: ({ setView }) => setView("preparation-simulator"),
  },
];

// ---------- Saved item helpers ----------

const SAVED_TYPE_META: Record<SavedType, { label: string; cls: string }> = {
  exam: { label: "Exam", cls: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  comparison: { label: "Comparison", cls: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300" },
  dependency: { label: "Dependency", cls: "border-pink-500/30 bg-pink-500/10 text-pink-600 dark:text-pink-300" },
  explanation: { label: "Explanation", cls: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300" },
  evolution: { label: "Evolution", cls: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300" },
  paper: { label: "Paper", cls: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  pdf: { label: "PDF", cls: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300" },
  mcq: { label: "MCQ", cls: "border-pink-500/30 bg-pink-500/10 text-pink-600 dark:text-pink-300" },
  preparation: { label: "Prep", cls: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300" },
  "multi-exam": { label: "Multi", cls: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300" },
};

// ---------- Component ----------

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const setView = useAppStore((s) => s.setView);
  const setAssistantOpen = useAppStore((s) => s.setAssistantOpen);
  const saved = useAppStore((s) => s.saved);

  // Global keyboard shortcut: Cmd/Ctrl+K, and "/" when not typing
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      // Cmd/Ctrl+K — works anywhere
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // "/" — only when not focused on an input
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const close = React.useCallback(() => setOpen(false), []);

  const navigate = React.useCallback(
    (key: ViewKey) => {
      setView(key);
      close();
    },
    [setView, close]
  );

  const runAction = React.useCallback(
    (action: QuickAction) => {
      action.run({ setView, setAssistantOpen });
      close();
    },
    [setView, setAssistantOpen, close]
  );

  const openSaved = React.useCallback(() => {
    navigate("my-research");
  }, [navigate]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden rounded-xl border-violet-500/20 bg-background/80 p-0 shadow-2xl shadow-violet-950/20 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sm:max-w-xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>
            Search navigation, quick actions, and saved research.
          </DialogDescription>
        </DialogHeader>

        <Command
          className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4"
          loop
        >
          {/* Search input */}
          <div className="flex items-center border-b border-border/60 px-4">
            <Search className="h-4 w-4 shrink-0 text-violet-500/70" />
            <CommandInput
              placeholder="Search views, actions, saved research…"
              className="h-14 text-sm"
            />
            <kbd className="ml-auto hidden shrink-0 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
              Esc
            </kbd>
          </div>

          <CommandList className="max-h-[min(60vh,420px)] overflow-y-auto">
            <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
              <Search className="mx-auto mb-2 h-5 w-5 opacity-40" />
              No results found.
            </CommandEmpty>

            {/* Quick Actions */}
            <CommandGroup heading="Quick Actions">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <CommandItem
                    key={action.id}
                    value={`${action.label} ${action.desc} quick action`}
                    onSelect={() => runAction(action)}
                    className={cn(
                      "group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                      "data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-violet-500/15 data-[selected=true]:to-fuchsia-500/10",
                      "data-[selected=true]:text-foreground data-[selected=true]:shadow-[inset_0_0_0_1px_rgba(168,85,247,0.25)]",
                      "outline-none transition-colors"
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 text-violet-600 dark:text-violet-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium leading-tight">{action.label}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{action.desc}</div>
                    </div>
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-data-[selected=true]:opacity-60" />
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {/* Navigation */}
            <CommandGroup heading="Navigation">
              {NAV_COMMANDS.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.key}
                    value={`${item.label} ${item.desc} navigate`}
                    onSelect={() => navigate(item.key)}
                    className={cn(
                      "group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                      "data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-violet-500/15 data-[selected=true]:to-fuchsia-500/10",
                      "data-[selected=true]:text-foreground data-[selected=true]:shadow-[inset_0_0_0_1px_rgba(168,85,247,0.25)]",
                      "outline-none transition-colors"
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground group-data-[selected=true]:border-violet-500/30 group-data-[selected=true]:text-violet-600 dark:group-data-[selected=true]:text-violet-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium leading-tight">{item.label}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{item.desc}</div>
                    </div>
                    <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 group-data-[selected=true]:text-violet-500/80">
                      Navigate
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {/* Saved Research */}
            {saved.length > 0 && (
              <CommandGroup heading="Saved Research">
                {saved.map((item: SavedItem) => (
                  <SavedItemRow key={item.id} item={item} onSelect={openSaved} />
                ))}
              </CommandGroup>
            )}
          </CommandList>

          {/* Footer hint */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-violet-500" />
              <span className="font-medium text-foreground/80">ExamIntel</span>
              <span className="hidden sm:inline">Command Palette</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1 sm:inline-flex">
                <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">↑</kbd>
                <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">↓</kbd>
                <span>to navigate</span>
              </span>
              <span className="hidden items-center gap-1 sm:inline-flex">
                <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">↵</kbd>
                <span>to select</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">esc</kbd>
                <span>to close</span>
              </span>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Saved item row (split for clarity) ----------

function SavedItemRow({
  item,
  onSelect,
}: {
  item: SavedItem;
  onSelect: () => void;
}) {
  const meta = SAVED_TYPE_META[item.type] ?? {
    label: item.type,
    cls: "border-border bg-muted text-muted-foreground",
  };

  return (
    <CommandItem
      value={`${item.title} ${item.summary} saved ${meta.label}`}
      onSelect={onSelect}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
        "data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-violet-500/15 data-[selected=true]:to-fuchsia-500/10",
        "data-[selected=true]:text-foreground data-[selected=true]:shadow-[inset_0_0_0_1px_rgba(168,85,247,0.25)]",
        "outline-none transition-colors"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 text-violet-600 dark:text-violet-300">
        <Save className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium leading-tight">{item.title}</div>
        <div className="truncate text-[11px] text-muted-foreground">
          {item.summary || "No description"}
        </div>
      </div>
      <Badge
        variant="outline"
        className={cn("ml-auto shrink-0 border px-1.5 py-0 text-[10px] font-medium", meta.cls)}
      >
        {meta.label}
      </Badge>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-data-[selected=true]:opacity-60" />
    </CommandItem>
  );
}
