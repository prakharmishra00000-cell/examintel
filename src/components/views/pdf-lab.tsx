"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  FileText,
  Upload,
  FileQuestion,
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  Save,
  RotateCcw,
  Building2,
  Calendar,
  Hash,
  Layers,
  Tag,
  AlertTriangle,
  BookOpen,
  Wand2,
  ChevronRight,
  Paperclip,
  Clipboard,
  ClipboardPaste,
  FileSearch,
  User,
  CheckCircle2,
  CornerDownLeft,
  ScanText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { useAppStore } from "@/store/app-store";
import { LoadingState, EmptyState } from "@/components/shared/states";
import { SourceBadgeList } from "@/components/shared/source-badge";
import type { PdfAnalysisReport, SourceRef } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================
// Local type — the shared PdfAnalysisReport doesn't include a
// "caveats" field, but the analyze endpoint returns one.
// ============================================================
type PdfReportWithCaveats = PdfAnalysisReport & { caveats?: string[] };

// ============================================================
// Category styling map — one accent per extracted category.
// All literal Tailwind classes (no dynamic construction).
// ============================================================
const CATEGORY_STYLES: Record<string, { text: string; bg: string; border: string; chip: string; icon: React.ComponentType<{ className?: string }> }> = {
  Eligibility: { text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30", icon: CheckCircle2 },
  Age: { text: "text-fuchsia-600 dark:text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", chip: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30", icon: User },
  Qualification: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", icon: BookOpen },
  "Important dates": { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: Calendar },
  "Exam pattern": { text: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30", chip: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30", icon: Layers },
  "Selection process": { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", chip: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30", icon: ChevronRight },
  Syllabus: { text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30", icon: Tag },
  "Marking scheme": { text: "text-fuchsia-600 dark:text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", chip: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30", icon: Hash },
  "Application details": { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", icon: Paperclip },
  "Other rules": { text: "text-zinc-600 dark:text-zinc-300", bg: "bg-zinc-500/10", border: "border-zinc-500/30", chip: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30", icon: AlertTriangle },
};

const DEFAULT_CATEGORY_STYLE = CATEGORY_STYLES["Other rules"];

// ============================================================
// Chat history entry (mirrors /api/pdf/qa expected shape)
// ============================================================
interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// ============================================================
// Sample chips for filename/topic quick start
// ============================================================
const QUICK_TOPICS: string[] = [
  "SSC CGL 2024 notification.pdf",
  "UPSC CSE 2024 syllabus.pdf",
  "GATE Mechanical Engineering syllabus.pdf",
  "RRB NTPC previous year paper.pdf",
];

// ============================================================
// PdfLab — main view
// ============================================================
export function PdfLab() {
  const api = useApi();
  const setContext = useAppStore((s) => s.setContext);
  const setView = useAppStore((s) => s.setView);
  const saveItem = useAppStore((s) => s.saveItem);

  // --- inputs ---
  const [content, setContent] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- analysis state ---
  const [report, setReport] = useState<PdfReportWithCaveats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- chat state ---
  const [question, setQuestion] = useState<string>("");
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // ---- file handling ----
  const handleFile = useCallback((file: File) => {
    const name = file.name;
    const isTxt = name.toLowerCase().endsWith(".txt") || file.type === "text/plain";
    if (!isTxt) {
      toast.error("Only .txt files are supported for client-side extraction", {
        description: "For PDFs, paste the text into the textarea below, or type a filename/topic to get a sample analysis.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setContent(text);
      setUploadedFileName(name);
      if (!filename) setFilename(name);
      toast.success("Text extracted from " + name, {
        description: text.length + " characters loaded.",
      });
    };
    reader.onerror = () => {
      toast.error("Could not read the file", { description: "Try pasting the text directly." });
    };
    reader.readAsText(file);
  }, [filename]);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    // reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // ---- analyze ----
  async function handleAnalyze(override?: { content?: string; filename?: string; topic?: string }) {
    const c = (override?.content ?? content).trim();
    const fn = (override?.filename ?? filename).trim();
    const tp = (override?.topic ?? topic).trim();

    if (!c && !fn && !tp) {
      toast.error("Provide some content, a filename, or a topic to analyse", {
        description: "Paste notification text, upload a .txt file, or just type a filename like 'SSC CGL 2024 notification.pdf'.",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    // reset chat from any previous document
    setChat([]);
    setChatError(null);

    const res = await api.call<{ report: PdfReportWithCaveats; error?: string }>(
      "/api/pdf/analyze",
      { content: c, filename: fn, topic: tp }
    );

    if (!res || !res.report || res.error) {
      setError(res?.error ?? "AI did not return an analysis.");
      setLoading(false);
      return;
    }
    setReport(res.report);
    setContext("PDF: " + (fn || tp || res.report.documentOverview.title || "Document"), "pdf");
    setLoading(false);
  }

  // ---- chat ----
  async function handleAsk(overrideQ?: string) {
    const q = (overrideQ ?? question).trim();
    if (!q) {
      toast.error("Type a question first");
      return;
    }
    setChatLoading(true);
    setChatError(null);

    const turn: ChatTurn = { role: "user", content: q };
    const nextChat: ChatTurn[] = [...chat, turn];
    setChat(nextChat);
    setQuestion("");

    const res = await api.call<{ answer: string; error?: string }>("/api/pdf/qa", {
      content,
      filename: filename || topic,
      question: q,
      history: chat.slice(-6), // last 6 turns for context
    });

    if (!res || !res.answer || res.error) {
      setChatError(res?.error ?? "AI did not return an answer.");
      setChatLoading(false);
      return;
    }
    setChat([...nextChat, { role: "assistant", content: res.answer }]);
    setChatLoading(false);
  }

  // ---- reset / save / generate MCQs ----
  function handleReset() {
    setContent("");
    setFilename("");
    setTopic("");
    setUploadedFileName(null);
    setReport(null);
    setError(null);
    setChat([]);
    setChatError(null);
    setQuestion("");
  }

  function handleSave() {
    if (!report) return;
    const title = filename || topic || report.documentOverview.title || "PDF analysis";
    const summary = `${report.extractedInformation.length} categories extracted`;
    saveItem({
      type: "pdf",
      title,
      summary,
      data: report,
    });
    toast.success("Saved to My Research", { description: summary });
  }

  function handleGenerateMCQs() {
    setView("mcq-generator");
    toast("Generate MCQs from this document", {
      description: "Switched to MCQ Generator — paste the same content there to build grounded questions.",
    });
  }

  const categories = useMemo(() => {
    if (!report) return [];
    return report.extractedInformation;
  }, [report]);

  const caveats = report?.caveats ?? [];

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <header className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
            <FileText className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PDF Exam Analyzer</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-3xl">
          Upload official notifications, syllabus PDFs, PYQs. Get grounded analysis and ask questions about the document.
        </p>
      </header>

      {/* ---------- Upload zone + inputs ---------- */}
      <Card className="border-violet-500/20">
        <CardContent className="p-5 space-y-5">
          {/* Dropzone (visual; hidden file input) */}
          <div>
            <Label
              htmlFor="pdf-file-input"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-all",
                dragOver
                  ? "border-violet-500/60 bg-violet-500/10"
                  : "border-border bg-muted/20 hover:border-violet-500/40 hover:bg-violet-500/5"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
                <Upload className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {uploadedFileName ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" /> {uploadedFileName}
                    </span>
                  ) : (
                    "Drop a .txt file here, or click to browse"
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  .txt files are read in your browser. For PDFs, paste the text below.
                </p>
              </div>
              <input
                id="pdf-file-input"
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                onChange={onFileInputChange}
                className="hidden"
              />
            </Label>
          </div>

          {/* Filename / topic */}
          <div className="space-y-1.5">
            <Label htmlFor="pdf-filename" className="text-xs font-medium flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Filename / topic
            </Label>
            <Input
              id="pdf-filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="e.g. SSC CGL 2024 notification.pdf"
            />
          </div>

          {/* Paste content */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="pdf-content" className="text-xs font-medium flex items-center gap-1.5">
                <Clipboard className="h-3.5 w-3.5" /> Pasted document text
              </Label>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const t = await navigator.clipboard.readText();
                    if (t && t.trim().length > 0) {
                      setContent(t);
                      toast.success("Pasted from clipboard", { description: `${t.length} characters` });
                    } else {
                      toast.message("Clipboard is empty");
                    }
                  } catch {
                    toast.error("Could not access clipboard", { description: "Paste manually with Ctrl/Cmd+V." });
                  }
                }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ClipboardPaste className="h-3.5 w-3.5" /> Paste
              </button>
            </div>
            <Textarea
              id="pdf-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the text of the notification / syllabus / PYQ here. The AI will ground its analysis strictly in this text."
              className="min-h-[160px] resize-y text-sm font-mono"
              aria-label="Pasted document text"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{content.length} characters</span>
              <span aria-hidden>·</span>
              <span>{content.trim() ? content.trim().split(/\s+/).length : 0} words</span>
              {content.trim().length === 0 && (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  · <AlertTriangle className="h-3 w-3" /> Empty — AI will produce a sample analysis
                </span>
              )}
            </p>
          </div>

          {/* Quick topic chips */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Or start with a topic (no content — sample analysis):</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_TOPICS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setFilename(q);
                    setTopic(q);
                    handleAnalyze({ content: "", filename: q, topic: q });
                  }}
                  disabled={loading}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-all hover:border-violet-500/40 hover:text-foreground hover:bg-violet-500/5 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  title={q}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              onClick={() => handleAnalyze()}
              disabled={loading || (!content.trim() && !filename.trim() && !topic.trim())}
              className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-lg transition-all"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "Analysing..." : "Analyse Document"}
            </Button>
            {(report || content || filename || topic) && (
              <Button variant="outline" onClick={handleReset} className="gap-2" disabled={loading}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            )}
            <span className="text-xs text-muted-foreground ml-auto hidden sm:flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" /> Tip: drop a .txt file or paste text
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Loading ---------- */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <LoadingState label="AI is reading the document and extracting grounded information..." />
          </CardContent>
        </Card>
      )}

      {/* ---------- Error ---------- */}
      {error && !loading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Analysis failed</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => handleAnalyze()}>
                  Try again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------- Empty state ---------- */}
      {!report && !loading && !error && (
        <EmptyState
          icon={FileSearch}
          title="No analysis yet"
          description="Upload a .txt file, paste document text, or just type a filename/topic. The AI will produce a grounded analysis — and switch to a sample analysis if no text is supplied."
        />
      )}

      {/* ---------- Report ---------- */}
      {report && !loading && (
        <div className="space-y-5">
          {/* 1. Document overview */}
          <DocumentOverviewCard report={report} />

          {/* 2. Extracted information */}
          {categories.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <FileSearch className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Extracted Information</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {categories.length} categories found · grounded strictly in the document text
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.map((info, i) => {
                  const style = CATEGORY_STYLES[info.category] ?? DEFAULT_CATEGORY_STYLE;
                  const Icon = style.icon;
                  return (
                    <div
                      key={i}
                      className={cn("rounded-lg border px-4 py-3", style.bg, style.border)}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <Badge variant="outline" className={cn("gap-1 font-medium", style.chip)}>
                          <Icon className="h-3 w-3" />
                          {info.category}
                        </Badge>
                        {(info.sourcePage || info.sourceSection) && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              style.chip
                            )}
                          >
                            <FileText className="h-3 w-3" />
                            Source:
                            {info.sourcePage && ` Page ${info.sourcePage}`}
                            {info.sourcePage && info.sourceSection ? " · " : ""}
                            {info.sourceSection && `Section ${info.sourceSection}`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{info.content}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  No categories were extracted — the document text may have been empty or unreadable.
                </p>
              </CardContent>
            </Card>
          )}

          {/* 3. Topics discovered */}
          {report.topics.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Topics Discovered</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Short theme chips derived from the document</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {report.topics.map((t, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4. OCR warning */}
          {report.ocrUsed && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
              <ScanText className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  OCR was used to extract this text
                </p>
                <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/90">
                  {report.ocrWarning ?? "Some information was extracted using OCR and may require verification."}
                </p>
              </div>
            </div>
          )}

          {/* 5. Sources */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Sources</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Provenance of the extracted information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SourceBadgeList sources={report.sources} />
            </CardContent>
          </Card>

          {/* 6. Caveats */}
          {caveats.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Caveats
              </p>
              <ul className="space-y-1.5">
                {caveats.map((c, i) => (
                  <li key={i} className="text-xs text-amber-800/90 dark:text-amber-300/90 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span className="leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 7. Action bar — save + generate MCQs */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleGenerateMCQs}
              className="gap-2"
            >
              <Wand2 className="h-4 w-4" />
              Generate MCQs from this PDF
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={handleSave}
              className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600"
            >
              <Save className="h-4 w-4" />
              Save to My Research
            </Button>
          </div>

          {/* 8. Q&A */}
          <Card className="border-violet-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Ask anything about this document</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Grounded Q&amp;A — the AI answers strictly from the document text and cites source page/section.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {chat.length === 0 && !chatLoading && (
                <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
                  <FileQuestion className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">No questions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask about eligibility, exam pattern, syllabus, marking scheme, important dates — anything in the document.
                  </p>
                </div>
              )}

              {/* chat history */}
              {chat.length > 0 && (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 pdf-qa-scroll">
                  {chat.map((turn, i) => (
                    <ChatBubble key={i} turn={turn} />
                  ))}
                  {chatLoading && (
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      </div>
                      <div className="max-w-[80%] rounded-2xl rounded-tl-sm border bg-muted/40 px-3.5 py-2.5">
                        <LoadingState label="Answering grounded from the document..." className="py-0" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {chatError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{chatError}</span>
                </div>
              )}

              {/* question input */}
              <div className="space-y-2">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAsk();
                    }
                  }}
                  placeholder="e.g. What is the age limit for the general category? / Summarise the exam pattern. / List all important dates."
                  className="min-h-[72px] resize-y text-sm"
                  aria-label="Question about the document"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {question.length} chars · Ctrl/Cmd+Enter to send
                  </span>
                  <Button
                    onClick={() => handleAsk()}
                    disabled={chatLoading || !question.trim()}
                    className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:from-violet-600 hover:to-fuchsia-600"
                  >
                    <Send className="h-4 w-4" />
                    {chatLoading ? "Asking..." : "Ask"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------- Footer note ---------- */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        <Sparkles className="inline h-3 w-3 mr-1" />
        Grounded RAG-style analysis · every claim cites its source page or section
      </p>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function DocumentOverviewCard({ report }: { report: PdfReportWithCaveats }) {
  const ov = report.documentOverview;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{ov.title || "Untitled document"}</CardTitle>
            <CardDescription className="text-xs mt-0.5">Document overview</CardDescription>
          </div>
          <Badge
            variant="outline"
            className="gap-1 border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/10 shrink-0"
          >
            <FileText className="h-3 w-3" />
            {ov.documentType || "Document"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* key meta grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetaTile icon={Building2} label="Organisation" value={ov.organisation} />
          <MetaTile icon={Tag} label="Exam" value={ov.exam} />
          <MetaTile icon={Calendar} label="Year" value={ov.year} />
          <MetaTile icon={Hash} label="Pages" value={ov.numberOfPages > 0 ? String(ov.numberOfPages) : "Unknown"} />
        </div>

        {/* important sections */}
        {ov.importantSections.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Important Sections
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ov.importantSections.map((s, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20"
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* word count + meta line */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground border-t pt-3">
          <span className="flex items-center gap-1">
            <ScanText className="h-3 w-3" /> {report.wordCount.toLocaleString()} words
          </span>
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> {report.extractedInformation.length} categories extracted
          </span>
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1">
            {report.ocrUsed ? (
              <>
                <ScanText className="h-3 w-3 text-amber-500" /> OCR-extracted
              </>
            ) : (
              <>
                <FileText className="h-3 w-3" /> Text-extracted
              </>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-1 text-sm font-medium truncate">
        {value && value.trim() ? value : <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}

function ChatBubble({ turn }: { turn: ChatTurn }) {
  if (turn.role === "user") {
    return (
      <div className="flex items-start gap-2.5 justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white px-3.5 py-2.5 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{turn.content}</p>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
          <User className="h-3.5 w-3.5" />
        </div>
      </div>
    );
  }
  // assistant — muted bubble, supports source citations inline
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
        <MessageSquare className="h-3.5 w-3.5" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border bg-muted/40 px-3.5 py-2.5">
        <AssistantAnswer text={turn.content} />
      </div>
    </div>
  );
}

/**
 * Renders the assistant's plain-text answer. Detects inline
 * "Source: Page X" / "Source: Section Y" / "Source: ..." lines and
 * renders them as a small badge underneath the answer body.
 */
function AssistantAnswer({ text }: { text: string }) {
  const { body, sources } = useMemo(() => splitSources(text), [text]);
  return (
    <div className="space-y-2">
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{body}</p>
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
          {sources.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400"
            >
              <FileText className="h-3 w-3" />
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function splitSources(text: string): { body: string; sources: string[] } {
  const lines = text.split(/\r?\n/);
  const body: string[] = [];
  const sources: string[] = [];
  let inSource = false;
  for (const line of lines) {
    const m = line.match(/^\s*Source\s*:\s*(.+?)\s*$/i);
    if (m && m[1]) {
      inSource = true;
      sources.push(m[1]);
      continue;
    }
    if (inSource && line.trim() === "") {
      // keep skipping blank lines after the source list
      continue;
    }
    inSource = false;
    body.push(line);
  }
  return { body: body.join("\n").trim(), sources };
}

export default PdfLab;
