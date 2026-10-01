"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  Plus,
  Search,
  Sparkles,
  Save,
  Trash2,
  Edit,
  FileText,
  Tag,
  Calendar,
  Pin,
  PinOff,
  Eye,
  Pencil,
  X,
  Loader2,
  Hash,
  Layers,
  AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

import { useNotesStore, type StudyNote } from "@/store/notes-store";
import { useAppStore } from "@/store/app-store";
import { useApi } from "@/hooks/use-api";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  LoadingState,
  ErrorState,
} from "@/components/shared/states";
import { PremiumEmptyState } from "@/components/shared/premium-empty-state";

// ---------------- Helpers ----------------

function makeId() {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function snippet(text: string, max = 100): string {
  const clean = (text || "")
    .replace(/[#>*_`~\-\[\]\(\)!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() + "…" : clean;
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
    .filter((t, i, arr) => arr.indexOf(t) === i);
}

function tagsToString(tags: string[]): string {
  return tags.join(", ");
}

// ---------------- Component ----------------

export function StudyNotes() {
  const notes = useNotesStore((s) => s.notes);
  const addNote = useNotesStore((s) => s.addNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const togglePin = useNotesStore((s) => s.togglePin);
  const clearAll = useNotesStore((s) => s.clearAll);
  const saveItem = useAppStore((s) => s.saveItem);
  const setContext = useAppStore((s) => s.setContext);
  const api = useApi();

  // ---- list state ----
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ---- editor form state ----
  const [fTitle, setFTitle] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fTopic, setFTopic] = useState("");
  const [fTags, setFTags] = useState("");
  const [fContent, setFContent] = useState("");
  const [fPinned, setFPinned] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // ---- AI summarize state ----
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string>("");
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // ---- delete confirm ----
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ---- derived list ----
  const subjects = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.subject && n.subject.trim()) set.add(n.subject.trim());
    });
    return Array.from(set).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = notes.filter((n) => {
      if (subjectFilter !== "all" && n.subject !== subjectFilter) return false;
      if (!q) return true;
      const haystack = [
        n.title,
        n.content,
        n.subject,
        n.topic,
        n.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    // pinned first, then updatedAt desc
    out.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return out;
  }, [notes, search, subjectFilter]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [notes, selectedId]
  );

  // ---- load note into editor ----
  const loadIntoEditor = useCallback((n: StudyNote) => {
    setSelectedId(n.id);
    setFTitle(n.title);
    setFSubject(n.subject);
    setFTopic(n.topic);
    setFTags(tagsToString(n.tags));
    setFContent(n.content);
    setFPinned(n.pinned);
    setShowPreview(false);
    setIsDirty(false);
    setContext(`Study Note: ${n.title || "Untitled"}`, "general");
  }, [setContext]);

  // ---- new note ----
  const handleNewNote = useCallback(() => {
    setSelectedId(null);
    setFTitle("");
    setFSubject(subjectFilter === "all" ? "" : subjectFilter);
    setFTopic("");
    setFTags("");
    setFContent(
      "# New Note\n\nStart writing in markdown. Use **bold**, *italics*, `code`, lists, > quotes, and ## headings.\n\n"
    );
    setFPinned(false);
    setShowPreview(false);
    setIsDirty(true);
    setContext("Study Note: New note", "general");
  }, [subjectFilter, setContext]);

  // ---- save (create or update) ----
  const handleSave = useCallback(() => {
    const title = fTitle.trim() || "Untitled Note";
    const subject = fSubject.trim();
    const topic = fTopic.trim();
    const tags = parseTags(fTags);
    const content = fContent;

    if (!content.trim()) {
      toast.error("Note content is empty", {
        description: "Add some markdown before saving.",
      });
      return;
    }

    if (selectedId) {
      updateNote(selectedId, { title, subject, topic, tags, content, pinned: fPinned });
      toast.success("Note updated");
    } else {
      const id = addNote({ title, subject, topic, tags, content, pinned: fPinned });
      setSelectedId(id);
      toast.success("Note created");
    }
    setIsDirty(false);
  }, [fTitle, fSubject, fTopic, fTags, fContent, fPinned, selectedId, updateNote, addNote]);

  // ---- delete ----
  const handleDelete = useCallback(
    (id: string) => {
      deleteNote(id);
      if (selectedId === id) {
        setSelectedId(null);
        setFTitle("");
        setFSubject("");
        setFTopic("");
        setFTags("");
        setFContent("");
        setFPinned(false);
        setIsDirty(false);
      }
      toast.success("Note deleted");
      setDeleteId(null);
    },
    [deleteNote, selectedId]
  );

  // ---- pin toggle (from list) ----
  const handleTogglePin = useCallback(
    (id: string) => {
      togglePin(id);
      if (selectedId === id) setFPinned((p) => !p);
    },
    [togglePin, selectedId]
  );

  // ---- AI summarize ----
  const handleSummarize = useCallback(async () => {
    if (!fContent.trim()) {
      toast.error("Nothing to summarize", {
        description: "Write some note content first.",
      });
      return;
    }
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryError(null);
    setSummaryText("");

    const res = await api.call<{ summary?: string; error?: string }>(
      "/api/notes/summarize",
      { content: fContent }
    );

    setSummaryLoading(false);
    if (!res) {
      setSummaryError("Request failed. Please try again.");
      return;
    }
    if (res.error) {
      setSummaryError(res.error);
      return;
    }
    if (res.summary) {
      setSummaryText(res.summary);
    } else {
      setSummaryError("AI returned an empty summary. Please try again.");
    }
  }, [fContent, api]);

  // ---- insert summary into note ----
  const handleInsertSummary = useCallback(() => {
    if (!summaryText) return;
    const block = `\n\n---\n\n## AI Summary\n\n${summaryText}\n`;
    setFContent((c) => (c.trim().endsWith("---") ? c + "\n" + block : c + block));
    setIsDirty(true);
    setSummaryOpen(false);
    toast.success("Summary inserted into note");
  }, [summaryText]);

  // ---- save current note to My Research ----
  const handleSaveToResearch = useCallback(() => {
    if (!selectedNote) {
      toast.error("Select a note first");
      return;
    }
    saveItem({
      type: "note",
      title: selectedNote.title,
      summary: snippet(selectedNote.content, 160),
      data: {
        subject: selectedNote.subject,
        topic: selectedNote.topic,
        tags: selectedNote.tags,
        content: selectedNote.content,
      },
    });
    toast.success("Saved to My Research");
  }, [selectedNote, saveItem]);

  // ---- clear all ----
  const handleClearAll = useCallback(() => {
    if (notes.length === 0) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Delete all ${notes.length} notes? This cannot be undone.`
      )
    )
      return;
    clearAll();
    setSelectedId(null);
    setFTitle("");
    setFSubject("");
    setFTopic("");
    setFTags("");
    setFContent("");
    setFPinned(false);
    setIsDirty(false);
    toast.success("All notes cleared");
  }, [notes.length, clearAll]);

  // ---- mark dirty on field change ----
  const touch = () => setIsDirty(true);

  // ---------------- Render ----------------
  const showEmptyState = notes.length === 0;
  const editing = selectedId !== null || isDirty;

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Study Notes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Markdown notes with AI summaries. Organize by subject, topic, and tags. Search across all notes.
            </p>
          </div>
          {notes.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Layers className="h-3 w-3" />
                {notes.length} note{notes.length !== 1 ? "s" : ""}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-rose-500"
                title="Delete all notes"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* ===== Body ===== */}
      {showEmptyState ? (
        <PremiumEmptyState
          icon={BookOpen}
          title="No study notes yet"
          description="Create your first markdown note. Capture key concepts, formulas, and summaries — then let AI distill the essentials."
          ctaLabel="Create your first note"
          ctaOnClick={handleNewNote}
          ctaIcon={Plus}
          accent="violet"
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
          {/* ---------- LEFT COLUMN: list ---------- */}
          <div className="space-y-3">
            {/* search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes, tags, content…"
                className="pl-9 pr-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* subject chips */}
            {subjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <SubjectChip
                  active={subjectFilter === "all"}
                  onClick={() => setSubjectFilter("all")}
                  label="All"
                  count={notes.length}
                />
                {subjects.map((s) => {
                  const count = notes.filter((n) => n.subject === s).length;
                  return (
                    <SubjectChip
                      key={s}
                      active={subjectFilter === s}
                      onClick={() => setSubjectFilter(s)}
                      label={s}
                      count={count}
                    />
                  );
                })}
              </div>
            )}

            {/* new note button */}
            <Button
              onClick={handleNewNote}
              className="w-full gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90 shadow-md shadow-violet-500/20"
            >
              <Plus className="h-4 w-4" />
              New Note
            </Button>

            {/* list */}
            <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1 lg:pr-0.5 custom-scroll">
              {filtered.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    No notes match your filters.
                  </CardContent>
                </Card>
              ) : (
                <AnimatePresence initial={false}>
                  {filtered.map((n) => {
                    const active = n.id === selectedId;
                    return (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                      >
                        <NoteListItem
                          note={n}
                          active={active}
                          onClick={() => loadIntoEditor(n)}
                          onTogglePin={() => handleTogglePin(n.id)}
                          onDelete={() => setDeleteId(n.id)}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* ---------- RIGHT COLUMN: editor ---------- */}
          <div>
            {!editing ? (
              <PremiumEmptyState
                icon={FileText}
                title="Select a note or create a new one"
                description="Pick a note from the list to edit it, or hit “New Note” to start fresh. Notes support full markdown with live preview and AI summarization."
                ctaLabel="New Note"
                ctaOnClick={handleNewNote}
                ctaIcon={Plus}
                accent="violet"
              />
            ) : (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/60 bg-gradient-to-br from-violet-500/[0.03] to-fuchsia-500/[0.03]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {selectedId ? (
                        <Edit className="h-4 w-4 text-violet-500 shrink-0" />
                      ) : (
                        <Plus className="h-4 w-4 text-violet-500 shrink-0" />
                      )}
                      <CardTitle className="text-base truncate">
                        {selectedId ? "Edit Note" : "New Note"}
                      </CardTitle>
                      {isDirty && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Unsaved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFPinned((p) => !p)}
                        className={cn(
                          "gap-1.5",
                          fPinned
                            ? "text-amber-500 hover:text-amber-600"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title={fPinned ? "Unpin note" : "Pin note"}
                      >
                        {fPinned ? (
                          <PinOff className="h-3.5 w-3.5" />
                        ) : (
                          <Pin className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline text-xs">
                          {fPinned ? "Pinned" : "Pin"}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview((p) => !p)}
                        className={cn(
                          "gap-1.5",
                          showPreview
                            ? "text-violet-500"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Toggle preview"
                      >
                        {showPreview ? (
                          <Pencil className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline text-xs">
                          {showPreview ? "Edit" : "Preview"}
                        </span>
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    {selectedNote
                      ? `Updated ${formatDistanceToNow(parseISO(selectedNote.updatedAt), {
                          addSuffix: true,
                        })} · Created ${format(parseISO(selectedNote.createdAt), "MMM d, yyyy")}`
                      : "Drafting a new markdown note"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* title */}
                  <div className="space-y-1.5">
                    <Label htmlFor="note-title" className="text-xs font-medium text-muted-foreground">
                      Title
                    </Label>
                    <Input
                      id="note-title"
                      value={fTitle}
                      onChange={(e) => {
                        setFTitle(e.target.value);
                        touch();
                      }}
                      placeholder="e.g. Quadratic Equations — Master Notes"
                      className="text-base font-semibold"
                    />
                  </div>

                  {/* subject / topic / tags */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="note-subject" className="text-xs font-medium text-muted-foreground">
                        Subject
                      </Label>
                      <Input
                        id="note-subject"
                        value={fSubject}
                        onChange={(e) => {
                          setFSubject(e.target.value);
                          touch();
                        }}
                        placeholder="Mathematics"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="note-topic" className="text-xs font-medium text-muted-foreground">
                        Topic
                      </Label>
                      <Input
                        id="note-topic"
                        value={fTopic}
                        onChange={(e) => {
                          setFTopic(e.target.value);
                          touch();
                        }}
                        placeholder="Quadratic Equations"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="note-tags" className="text-xs font-medium text-muted-foreground">
                        Tags <span className="text-muted-foreground/70">(comma-separated)</span>
                      </Label>
                      <Input
                        id="note-tags"
                        value={fTags}
                        onChange={(e) => {
                          setFTags(e.target.value);
                          touch();
                        }}
                        placeholder="algebra, roots, discriminant"
                      />
                    </div>
                  </div>

                  {/* tags preview */}
                  {parseTags(fTags).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {parseTags(fTags).map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="gap-1 border-violet-500/30 bg-violet-500/5 text-violet-600 dark:text-violet-400"
                        >
                          <Hash className="h-2.5 w-2.5" />
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* markdown editor / preview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-muted-foreground">
                        {showPreview ? "Preview" : "Markdown Content"}
                      </Label>
                      {!showPreview && (
                        <span className="text-[10px] text-muted-foreground">
                          {fContent.length.toLocaleString()} chars ·{" "}
                          {fContent.split(/\s+/).filter(Boolean).length} words
                        </span>
                      )}
                    </div>
                    {showPreview ? (
                      <div className="min-h-[280px] rounded-lg border border-border bg-muted/30 p-4">
                        {fContent.trim() ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-li:my-0.5 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:my-2 prose-strong:text-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-l-violet-500 prose-blockquote:not-italic prose-blockquote:text-muted-foreground">
                            <ReactMarkdown>{fContent}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Nothing to preview yet.
                          </p>
                        )}
                      </div>
                    ) : (
                      <Textarea
                        value={fContent}
                        onChange={(e) => {
                          setFContent(e.target.value);
                          touch();
                        }}
                        placeholder={"# Heading\n\nWrite your note in **markdown**.\n\n- bullet point\n- another point\n\n> Quote\n\n`code` and ```code blocks``` supported."}
                        className="min-h-[280px] font-mono text-sm leading-relaxed resize-y"
                      />
                    )}
                  </div>

                  {/* action bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      onClick={handleSave}
                      className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90 shadow-md shadow-violet-500/20"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {selectedId ? "Save Changes" : "Save Note"}
                    </Button>
                    <Button
                      onClick={handleSummarize}
                      variant="outline"
                      className="gap-1.5 border-violet-500/30 bg-violet-500/5 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Summarize
                    </Button>
                    {selectedNote && (
                      <Button
                        onClick={handleSaveToResearch}
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        title="Save a copy to My Research"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">To Research</span>
                      </Button>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      {selectedId && (
                        <Button
                          onClick={() => setDeleteId(selectedId)}
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setSelectedId(null);
                          setFTitle("");
                          setFSubject("");
                          setFTopic("");
                          setFTags("");
                          setFContent("");
                          setFPinned(false);
                          setShowPreview(false);
                          setIsDirty(false);
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ===== AI Summary Dialog ===== */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              AI Note Summary
            </DialogTitle>
            <DialogDescription>
              Concise summary, key terms, and suggested tags distilled from your note.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 custom-scroll">
            {summaryLoading ? (
              <LoadingState label="AI is summarizing your note…" />
            ) : summaryError ? (
              <ErrorState message={summaryError} />
            ) : (
              <div className="rounded-lg border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.04] to-fuchsia-500/[0.04] p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-headings:first:mt-0 prose-li:my-0.5 prose-h2:text-base prose-h3:text-sm prose-p:my-1.5 prose-strong:text-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-l-violet-500">
                  <ReactMarkdown>{summaryText}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setSummaryOpen(false)}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Close
            </Button>
            <Button
              onClick={handleInsertSummary}
              disabled={!summaryText || summaryLoading || !!summaryError}
              className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Insert into Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete confirm Dialog ===== */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" />
              Delete Note?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the note. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteId && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="font-medium truncate">
                {notes.find((n) => n.id === deleteId)?.title || "Untitled Note"}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {snippet(notes.find((n) => n.id === deleteId)?.content || "", 140)}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => deleteId && handleDelete(deleteId)}
              className="gap-1.5 bg-rose-500 text-white hover:bg-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Sub-components ----------------

function SubjectChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
        active
          ? "border-violet-500/40 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 text-violet-600 dark:text-violet-400"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border/80"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px]",
          active
            ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
            : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function NoteListItem({
  note,
  active,
  onClick,
  onTogglePin,
  onDelete,
}: {
  note: StudyNote;
  active: boolean;
  onClick: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all border",
        active
          ? "border-violet-500/40 bg-gradient-to-br from-violet-500/[0.06] to-fuchsia-500/[0.03] shadow-sm"
          : "border-border hover:border-border hover:bg-accent/40",
        note.pinned && !active && "border-amber-500/30 bg-amber-500/[0.03]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {/* title row */}
            <div className="flex items-center gap-1.5">
              {note.pinned && (
                <Pin className="h-3 w-3 text-amber-500 shrink-0 fill-amber-500" />
              )}
              <h4 className="text-sm font-semibold truncate flex-1">
                {note.title || "Untitled Note"}
              </h4>
            </div>

            {/* badges */}
            {(note.subject || note.topic) && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {note.subject && (
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-0.5 px-1.5 py-0 border-violet-500/30 bg-violet-500/5 text-violet-600 dark:text-violet-400"
                  >
                    <BookOpen className="h-2.5 w-2.5" />
                    {note.subject}
                  </Badge>
                )}
                {note.topic && (
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-0.5 px-1.5 py-0 border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-600 dark:text-fuchsia-400"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {note.topic}
                  </Badge>
                )}
              </div>
            )}

            {/* snippet */}
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {snippet(note.content, 100) || "Empty note"}
            </p>

            {/* tags + time */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {note.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"
                >
                  <Hash className="h-2 w-2" />
                  {t}
                </span>
              ))}
              {note.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{note.tags.length - 3}
                </span>
              )}
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-2.5 w-2.5" />
                {formatDistanceToNow(parseISO(note.updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* actions */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              className={cn(
                "rounded p-1 transition",
                note.pinned
                  ? "text-amber-500 hover:bg-amber-500/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              title={note.pinned ? "Unpin" : "Pin"}
            >
              {note.pinned ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded p-1 text-muted-foreground transition hover:text-rose-500 hover:bg-rose-500/10"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
