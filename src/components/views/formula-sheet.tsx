"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Sigma,
  Search,
  Star,
  StarOff,
  Copy,
  Check,
  Filter,
  BookMarked,
  FunctionSquare,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useFormulaStore, type Formula } from "@/store/formula-store";
import { useApi } from "@/hooks/use-api";
import { PremiumEmptyState } from "@/components/shared/premium-empty-state";
import { cn } from "@/lib/utils";

// ---------- subject → accent styling ----------
type Accent = {
  chip: string; // chip border/bg/text for subject chips
  badge: string; // badge for subject on card
  dot: string; // small colored dot
  grad: string; // gradient for tiny accents (kebab line etc.)
};

const SUBJECT_META: Record<string, { accent: Accent; label: string }> = {
  "Quantitative Aptitude": {
    label: "Quant",
    accent: {
      chip: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300 hover:bg-violet-500/20",
      badge:
        "border-violet-500/30 bg-violet-500/15 text-violet-600 dark:text-violet-300",
      dot: "bg-violet-500",
      grad: "from-violet-500 to-fuchsia-500",
    },
  },
  Algebra: {
    label: "Algebra",
    accent: {
      chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/20",
      badge:
        "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
      dot: "bg-emerald-500",
      grad: "from-emerald-500 to-teal-500",
    },
  },
  Geometry: {
    label: "Geometry",
    accent: {
      chip: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300 hover:bg-sky-500/20",
      badge:
        "border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-300",
      dot: "bg-sky-500",
      grad: "from-sky-500 to-cyan-500",
    },
  },
  Trigonometry: {
    label: "Trig",
    accent: {
      chip: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20",
      badge:
        "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-300",
      dot: "bg-amber-500",
      grad: "from-amber-500 to-orange-500",
    },
  },
  Mensuration: {
    label: "Mensuration",
    accent: {
      chip: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20",
      badge:
        "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-300",
      dot: "bg-rose-500",
      grad: "from-rose-500 to-pink-500",
    },
  },
};

const SUBJECT_KEYS = Object.keys(SUBJECT_META);

function accentFor(subject: string): Accent {
  return (
    SUBJECT_META[subject]?.accent ?? {
      chip:
        "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-500/20",
      badge: "border-zinc-500/30 bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
      dot: "bg-zinc-500",
      grad: "from-zinc-500 to-zinc-600",
    }
  );
}

// ---------- local helper components ----------

function FormulaCard({
  formula,
  isFavorite,
  onToggleFav,
  defaultOpenDescription,
}: {
  formula: Formula;
  isFavorite: boolean;
  onToggleFav: (id: string) => void;
  defaultOpenDescription?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const a = accentFor(formula.subject);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formula.formula);
      setCopied(true);
      toast.success("Formula copied", {
        description: formula.formula.slice(0, 80),
      });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — clipboard permission denied");
    }
  }, [formula.formula]);

  const diffBadge = formula.difficulty
    ? {
        Basic: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25",
        Intermediate: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25",
        Advanced: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/25",
      }[formula.difficulty]
    : null;

  return (
    <Card className="relative p-0 overflow-hidden flex flex-col gap-0 border-border/70 hover:border-foreground/20 transition-colors">
      {/* Top accent strip */}
      <div className={cn("h-1 w-full bg-gradient-to-r", a.grad)} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header row: subject badge + favorite */}
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className={cn("gap-1", a.badge)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", a.dot)} />
            {formula.subject}
          </Badge>
          <button
            onClick={() => onToggleFav(formula.id)}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorite}
            className={cn(
              "rounded-full p-1.5 transition-colors -mr-1 -mt-1",
              isFavorite
                ? "text-amber-500 hover:bg-amber-500/10"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className={cn("h-4 w-4", isFavorite && "fill-current")}
            />
          </button>
        </div>

        {/* Topic + name */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {formula.topic}
          </div>
          <h3 className="mt-0.5 font-semibold leading-tight">{formula.name}</h3>
        </div>

        {/* Formula display */}
        <div className="relative rounded-lg border border-border/60 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-transparent p-3 overflow-x-auto">
          <div className="absolute top-1.5 left-1.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70">
            f(x)
          </div>
          <pre className="mt-3 font-mono text-sm sm:text-[15px] leading-snug text-foreground whitespace-pre-wrap break-words">
            {formula.formula}
          </pre>
          <button
            onClick={handleCopy}
            aria-label="Copy formula"
            className="absolute top-1.5 right-1.5 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Copy formula"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Description (expandable) */}
        <Accordion
          type="single"
          collapsible
          defaultValue={defaultOpenDescription ? "desc" : undefined}
          className="w-full"
        >
          <AccordionItem value="desc" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
              <span className="flex items-center gap-1.5">
                <BookMarked className="h-3 w-3" />
                Description &amp; example
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-xs space-y-2">
              <p className="text-muted-foreground leading-relaxed">
                {formula.description}
              </p>
              {formula.example && (
                <div className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80 mb-0.5">
                    Example
                  </div>
                  <div className="font-mono text-[11px] leading-snug">
                    {formula.example}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Footer: difficulty + copy button (mobile-friendly) */}
        <div className="mt-auto flex items-center justify-between pt-1">
          {diffBadge ? (
            <Badge variant="outline" className={cn("text-[10px] font-normal", diffBadge)}>
              {formula.difficulty}
            </Badge>
          ) : (
            <span />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------- Add custom formula dialog ----------
function AddFormulaDialog() {
  const { addCustom } = useFormulaStore();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState<string>("Quantitative Aptitude");
  const [topic, setTopic] = useState("");
  const [name, setName] = useState("");
  const [formula, setFormula] = useState("");
  const [description, setDescription] = useState("");
  const [example, setExample] = useState("");
  const [difficulty, setDifficulty] =
    useState<Formula["difficulty"]>("Intermediate");

  const reset = () => {
    setSubject("Quantitative Aptitude");
    setTopic("");
    setName("");
    setFormula("");
    setDescription("");
    setExample("");
    setDifficulty("Intermediate");
  };

  const handleSave = () => {
    if (!name.trim() || !formula.trim() || !description.trim()) {
      toast.error("Name, formula, and description are required");
      return;
    }
    addCustom({
      subject: subject.trim(),
      topic: topic.trim() || "Custom",
      name: name.trim(),
      formula: formula.trim(),
      description: description.trim(),
      example: example.trim() || undefined,
      difficulty,
    });
    toast.success("Formula added to your library", {
      description: `"${name.trim()}" saved to your custom formulas.`,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-border/60 hover:border-foreground/30"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add custom</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FunctionSquare className="h-4 w-4 text-violet-500" />
            Add a custom formula
          </DialogTitle>
          <DialogDescription>
            Save any formula you want to keep handy. It appears in your library
            with a star-able card and lives only in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cf-subject" className="text-xs text-muted-foreground">
                Subject
              </Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger id="cf-subject" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_KEYS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-difficulty" className="text-xs text-muted-foreground">
                Difficulty
              </Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as Formula["difficulty"])}
              >
                <SelectTrigger id="cf-difficulty" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-topic" className="text-xs text-muted-foreground">
              Topic
            </Label>
            <Input
              id="cf-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='e.g. "Probability" or "Logarithms"'
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-name" className="text-xs text-muted-foreground">
              Name *
            </Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Bayes Theorem"'
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-formula" className="text-xs text-muted-foreground">
              Formula *
            </Label>
            <Input
              id="cf-formula"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder='e.g. "P(A|B) = P(B|A)·P(A) / P(B)"'
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-desc" className="text-xs text-muted-foreground">
              Description *
            </Label>
            <Textarea
              id="cf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this formula compute? What do the symbols mean?"
              className="min-h-[60px] resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-example" className="text-xs text-muted-foreground">
              Example (optional)
            </Label>
            <Input
              id="cf-example"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder='e.g. "P(A)=0.1, P(B|A)=0.8 → P(A|B) = ..."'
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-transparent"
          >
            <Plus className="h-4 w-4" />
            Save formula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Custom formulas collapsible section ----------
function CustomFormulasSection() {
  const { customFormulas, favorites, toggleFavorite, removeCustom, clearCustom } =
    useFormulaStore();
  const [open, setOpen] = useState(false);

  if (customFormulas.length === 0) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mt-8 rounded-xl border border-border/70 bg-muted/20"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-sm font-medium">
            <BookMarked className="h-4 w-4 text-violet-500" />
            My custom formulas
            <Badge variant="secondary" className="ml-1">
              {customFormulas.length}
            </Badge>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearCustom();
            toast.success("Custom formulas cleared");
          }}
          className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear all
        </Button>
      </div>
      <CollapsibleContent>
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customFormulas.map((f) => (
            <div key={f.id} className="relative">
              <FormulaCard
                formula={f}
                isFavorite={favorites.includes(f.id)}
                onToggleFav={toggleFavorite}
              />
              <button
                onClick={() => {
                  removeCustom(f.id);
                  toast.success("Formula removed", {
                    description: `"${f.name}" deleted from your library.`,
                  });
                }}
                aria-label={`Delete ${f.name}`}
                title="Delete this formula"
                className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full border border-destructive/30 bg-background shadow-sm text-destructive hover:bg-destructive hover:text-white transition-colors flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------- Main view ----------
export function FormulaSheet() {
  const { formulas, favorites, toggleFavorite } = useFormulaStore();
  const { call } = useApi();

  const [query, setQuery] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // AI lookup state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<Formula[] | null>(null);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    formulas.forEach((f) => set.add(f.subject));
    return Array.from(set);
  }, [formulas]);

  // Quick local filter on the built-in formulas.
  const localFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return formulas.filter((f) => {
      if (favoritesOnly && !favorites.includes(f.id)) return false;
      if (selectedSubjects.length > 0 && !selectedSubjects.includes(f.subject))
        return false;
      if (!q) return true;
      const hay = `${f.subject} ${f.topic} ${f.name} ${f.formula} ${f.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [formulas, query, selectedSubjects, favoritesOnly, favorites]);

  const toggleSubject = (s: string) => {
    setSelectedSubjects((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );
  };

  const handleAiLookup = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      toast.error("Enter a query first", {
        description: 'Try "percentage change" or "compound interest formula".',
      });
      return;
    }
    setAiLoading(true);
    try {
      const res = await call<{ formulas: Formula[] } | { error: string }>(
        "/api/formulas/search",
        { query: q }
      );
      if (res && "formulas" in res) {
        setAiResults(res.formulas);
        if (res.formulas.length === 0) {
          toast.info("No formulas matched", {
            description: "Try different keywords or browse the library below.",
          });
        } else {
          toast.success(`AI found ${res.formulas.length} formula${res.formulas.length === 1 ? "" : "s"}`, {
            description: `Matching "${q}".`,
          });
        }
      } else if (res) {
        toast.error("Lookup failed", {
          description: ("error" in res ? res.error : "Unknown error").slice(0, 200),
        });
      }
    } finally {
      setAiLoading(false);
    }
  }, [query, call]);

  const clearAiResults = () => {
    setAiResults(null);
    setQuery("");
  };

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <span className="relative">
              <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
                <Sigma className="h-5 w-5" />
              </span>
            </span>
            Formula Sheet
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Your searchable reference library. Curated aptitude formulas + AI
            lookup for any topic. Star your favorites.
          </p>
        </div>
        <AddFormulaDialog />
      </div>

      {/* ---------- Search bar (gradient-bordered) ---------- */}
      <div className="relative">
        <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-violet-500/40 via-fuchsia-500/40 to-violet-500/40 opacity-60 blur-[2px] pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row gap-2 rounded-xl bg-background border border-border/60 p-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAiLookup();
                }
              }}
              placeholder='Search formulas or ask the AI — e.g. "percentage change", "quadratic formula"'
              className="pl-9 border-transparent shadow-none focus-visible:ring-0 bg-transparent"
              aria-label="Search formulas"
            />
          </div>
          <Button
            onClick={handleAiLookup}
            disabled={aiLoading}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-transparent shadow-sm"
          >
            {aiLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Looking up…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                AI Lookup
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ---------- AI lookup results ---------- */}
      {aiResults && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              AI lookup results
              <Badge variant="secondary" className="ml-1">
                {aiResults.length}
              </Badge>
            </h2>
            <div className="flex gap-2">
              {aiResults.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAiResults((cur) => (cur ? [...cur].reverse() : cur))
                  }
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <RefreshCw className="h-3 w-3" />
                  Shuffle
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAiResults}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                Clear
              </Button>
            </div>
          </div>
          {aiResults.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No formulas matched. Try different keywords — or browse the
              full library below.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiResults.map((f) => (
                <FormulaCard
                  key={`ai-${f.id}`}
                  formula={f}
                  isFavorite={favorites.includes(f.id)}
                  onToggleFav={toggleFavorite}
                  defaultOpenDescription
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ---------- Filter chips + favorites toggle ---------- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </span>
          {subjects.map((s) => {
            const meta = SUBJECT_META[s];
            const active = selectedSubjects.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleSubject(s)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  meta
                    ? active
                      ? cn(meta.accent.chip, "ring-1 ring-inset ring-foreground/10")
                      : "border-border/60 bg-background text-muted-foreground hover:bg-accent"
                    : active
                      ? "border-foreground/30 bg-foreground/5 text-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:bg-accent"
                )}
              >
                {meta && (
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.accent.dot)} />
                )}
                {meta?.label ?? s}
              </button>
            );
          })}
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none self-start sm:self-auto">
          <Switch
            checked={favoritesOnly}
            onCheckedChange={setFavoritesOnly}
            aria-label="Show favorites only"
          />
          <span className="text-xs inline-flex items-center gap-1">
            <Star
              className={cn(
                "h-3.5 w-3.5",
                favoritesOnly ? "text-amber-500 fill-current" : "text-muted-foreground"
              )}
            />
            Favorites only
          </span>
        </label>
      </div>

      {/* ---------- Result count ---------- */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {localFiltered.length} formula{localFiltered.length === 1 ? "" : "s"}
          {favoritesOnly ? " in favorites" : ""}
          {selectedSubjects.length > 0 ? ` · ${selectedSubjects.length} subject${selectedSubjects.length === 1 ? "" : "s"}` : ""}
        </p>
        {favorites.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <Star className="inline h-3 w-3 text-amber-500 fill-current" />{" "}
            {favorites.length} starred
          </p>
        )}
      </div>

      {/* ---------- Formula grid ---------- */}
      {localFiltered.length === 0 ? (
        <PremiumEmptyState
          icon={FunctionSquare}
          accent="violet"
          title={
            favoritesOnly
              ? "No favorite formulas match"
              : "No formulas match your filters"
          }
          description={
            favoritesOnly
              ? "Star formulas from the library to pin them here for quick access."
              : "Try clearing the search box or selecting more subjects. Or use AI Lookup above to fetch formulas on any topic."
          }
          ctaLabel={
            favoritesOnly ? "Show all formulas" : "Use AI Lookup"
          }
          ctaOnClick={() => {
            if (favoritesOnly) {
              setFavoritesOnly(false);
            } else {
              handleAiLookup();
            }
          }}
          ctaIcon={favoritesOnly ? StarOff : Sparkles}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {localFiltered.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FormulaCard
                formula={f}
                isFavorite={favorites.includes(f.id)}
                onToggleFav={toggleFavorite}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* ---------- Custom formulas section ---------- */}
      <CustomFormulasSection />
    </div>
  );
}
