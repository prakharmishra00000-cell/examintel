import { NextRequest, NextResponse } from "next/server";
import { jsonWithFallback } from "@/lib/ai/json-with-fallback";
import type { PdfAnalysisReport, SourceRef } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Local extension — the shared PdfAnalysisReport type does not include a
// "caveats" field, but this feature surfaces caveats to the UI. We keep
// the shared type untouched and extend it locally instead.
type PdfAnalysisReportWithCaveats = PdfAnalysisReport & { caveats?: string[] };

function isPdfAnalysisReport(v: unknown): v is PdfAnalysisReportWithCaveats {
  const r = v as any;
  return !!r && typeof r === "object" && (!!r.documentOverview || Array.isArray(r.extractedInformation));
}

// ============================================================
// PDF Exam Analyzer — grounded analysis of uploaded/pasted
// notification, syllabus, or PYQ text. Falls back to a sample
// analysis (tagged AI_ANALYSIS) when no content is provided.
// ============================================================

const SYSTEM_PROMPT = `You are ExamIntel's PDF Exam Analyzer — an analyst who reads the text of exam-related documents (official notifications, syllabus PDFs, previous-year question papers, information handbooks) and produces a STRICT JSON report grounded strictly in the supplied text.

YOUR GOAL: given a document's extracted text (which may be partial, OCR'd, or empty), produce a PdfAnalysisReport JSON object that helps an exam aspirant understand what the document actually says — without ever inventing facts that are not in the text.

CORE PRINCIPLES (NON-NEGOTIABLE):
1. GROUNDING. If "content" is provided in the user message, every claim in extractedInformation MUST be something you can point to in that content. Quote or paraphrase faithfully. NEVER fabricate eligibility rules, dates, marking schemes, or syllabus items that are not in the text.
2. PROVENANCE. Tag sources honestly:
   - When content is provided → tag sources as type "UPLOADED_DOCUMENT" with label "Uploaded Document" and a detail string naming the file/section.
   - When content is EMPTY (no document text was supplied) → tag every source as type "AI_ANALYSIS" with label "AI Analysis" and add a caveat: "No document text was provided — this is a sample analysis."
3. DISTINGUISH FACT VS INTERPRETATION. extractedInformation entries are facts read from the document. Anything you infer (difficulty estimation, trend observations, suggested next steps) goes into "topics" or "caveats", NOT into extractedInformation.
4. ONLY INCLUDE CATEGORIES ACTUALLY FOUND. extractedInformation must only include categories for which you found concrete text. Allowed categories are exactly: "Eligibility", "Age", "Qualification", "Important dates", "Exam pattern", "Selection process", "Syllabus", "Marking scheme", "Application details", "Other rules". If the document does not mention a category, OMIT it. Do NOT include empty placeholder entries.
5. SOURCE PAGES / SECTIONS. When the text contains cues like page breaks ("--- Page 12 ---"), explicit section headers ("ELIGIBILITY CRITERIA", "EXAM PATTERN"), or numbered sections, use sourcePage and sourceSection on the extractedInformation entries. If you cannot tell, omit both fields. Never invent page numbers.
6. documentOverview. Set numberOfPages ONLY if you can infer it from explicit page markers in the content; otherwise set it to 0 (unknown) and add a caveat. importantSections should list the section headings you actually saw in the text.
7. ocrUsed. Set to true ONLY when the content shows clear OCR artifacts (e.g. mis-recognized characters, missing spaces, garbled headers, "1ife" instead of "life"). Otherwise set to false. When ocrUsed is true, set ocrWarning to a short, specific note (e.g. "Some numbers in the syllabus section appear garbled and may require manual verification.").
8. topics. Short label chips capturing the document's themes — derived from the actual content. e.g. ["Eligibility", "Tier-1 Pattern", "Quantitative Aptitude"].
9. wordCount. Approximate count of whitespace-separated tokens in the supplied content. If content is empty, set to 0.
10. generatedAt. ISO 8601 timestamp.
11. caveats. List anything you couldn't verify, any missing sections, OCR caveats, the "no document text" caveat when applicable, and any assumptions made.

WHEN CONTENT IS EMPTY (sample-analysis mode):
- Use "filename" and/or "topic" from the user message to decide what kind of exam document this likely is.
- Produce a SAMPLE PdfAnalysisReport with realistic-looking entries that match what such a document typically contains — but every entry must be a plausible template, not a fabricated claim about a real exam cycle. Use phrases like "Sample: typical notification structure" inside content where appropriate.
- Tag sources as AI_ANALYSIS, set ocrUsed=false, and ALWAYS include the caveat "No document text was provided — this is a sample analysis."
- numberOfPages should be a small placeholder (e.g. 8) in sample mode.

FORMATTING:
- Output ONLY valid JSON. No markdown, no code fences, no commentary.
- All keys must exactly match the PdfAnalysisReport shape.
- String values must be plain (no nested JSON, no markdown headers).`;

const SCHEMA_HINT = `PdfAnalysisReport = {
  documentOverview: {
    title: string,
    organisation?: string,
    exam?: string,
    year?: string,
    documentType: string,             // e.g. "Official Notification", "Syllabus", "Previous Year Paper", "Information Handbook"
    numberOfPages: number,            // 0 if unknown
    importantSections: string[]      // section headings actually seen
  },
  extractedInformation: {
    category: "Eligibility" | "Age" | "Qualification" | "Important dates" | "Exam pattern" | "Selection process" | "Syllabus" | "Marking scheme" | "Application details" | "Other rules",
    content: string,                  // faithful paraphrase of what the document says
    sourcePage?: number,
    sourceSection?: string
  }[],                                // ONLY categories actually found in the document
  topics: string[],                   // short theme chips derived from content
  wordCount: number,                  // approximate token count of supplied content
  ocrUsed: boolean,
  ocrWarning?: string,
  sources: { type: "UPLOADED_DOCUMENT"|"AI_ANALYSIS", label: string, detail?: string }[],
  generatedAt: string,                // ISO 8601
  caveats: string[]                  // honest caveats: unverifiable items, OCR notes, "no document text" caveat
}`;

function buildUserPrompt(content: string, filename: string, topic: string): string {
  const hasContent = content.trim().length > 0;
  const trimmedContent = content.trim();
  const safeFilename = filename || "(no filename supplied)";
  const safeTopic = topic || "(no topic supplied)";
  const preview = hasContent
    ? trimmedContent.length > 12000
      ? trimmedContent.slice(0, 12000) + "\n\n[... content truncated for analysis; the original was longer ...]"
      : trimmedContent
    : "";

  if (hasContent) {
    return `Analyze the following exam-related document text. Ground every extractedInformation entry strictly in this text. Tag sources as UPLOADED_DOCUMENT. Include only categories actually found. If OCR artifacts are visible, set ocrUsed=true and a specific ocrWarning.

FILENAME: ${safeFilename}
TOPIC HINT: ${safeTopic}

DOCUMENT TEXT (between the triple quotes):
"""
${preview}
"""

Reminders:
- Set "generatedAt" to "${new Date().toISOString()}".
- Tag every source as type "UPLOADED_DOCUMENT", label "Uploaded Document", detail "${safeFilename}".
- Include only categories you actually found in the text.
- Do NOT invent page numbers — use them only if the text shows page markers.
- Set numberOfPages to a real number only if page markers are present; otherwise 0 and add a caveat.
- Return ONLY the JSON.`;
  }

  return `No document text was supplied. Produce a SAMPLE PdfAnalysisReport based on the filename/topic hint below. Tag every source as AI_ANALYSIS. Add a caveat: "No document text was provided — this is a sample analysis."

FILENAME: ${safeFilename}
TOPIC HINT: ${safeTopic}

Reminders:
- Set "generatedAt" to "${new Date().toISOString()}".
- Tag every source as type "AI_ANALYSIS", label "AI Analysis", detail "Sample analysis based on filename/topic".
- Produce realistic-looking sample entries that match what such a document typically contains.
- Include the mandatory caveat "No document text was provided — this is a sample analysis." plus any other relevant caveats.
- wordCount = 0, ocrUsed = false.
- Return ONLY the JSON.`;
}

// ---- defensive normalization ----
function sanitizeReport(
  report: Partial<PdfAnalysisReport> & { caveats?: unknown },
  content: string,
  filename: string
): PdfAnalysisReportWithCaveats {
  const hasContent = content.trim().length > 0;
  const sourceType: SourceRef["type"] = hasContent ? "UPLOADED_DOCUMENT" : "AI_ANALYSIS";
  const sourceLabel = hasContent ? "Uploaded Document" : "AI Analysis";
  const sourceDetail = hasContent
    ? filename || "Uploaded text"
    : "Sample analysis based on filename/topic";

  const documentOverview = report.documentOverview ?? {
    title: filename || "Untitled document",
    documentType: "Document",
    numberOfPages: 0,
    importantSections: [] as string[],
  };

  // ensure numberOfPages is a sane number
  let numberOfPages = Number(documentOverview.numberOfPages);
  if (!Number.isFinite(numberOfPages) || numberOfPages < 0) numberOfPages = 0;
  documentOverview.numberOfPages = numberOfPages;

  // ensure importantSections is an array
  if (!Array.isArray(documentOverview.importantSections)) {
    documentOverview.importantSections = [];
  }

  // filter extractedInformation to allowed categories + sane shape
  const ALLOWED = new Set([
    "Eligibility",
    "Age",
    "Qualification",
    "Important dates",
    "Exam pattern",
    "Selection process",
    "Syllabus",
    "Marking scheme",
    "Application details",
    "Other rules",
  ]);
  const rawInfo = Array.isArray(report.extractedInformation)
    ? report.extractedInformation
    : [];
  const extractedInformation = rawInfo
    .filter(
      (e: any) =>
        e &&
        typeof e === "object" &&
        typeof e.content === "string" &&
        e.content.trim().length > 0
    )
    .map((e: any) => {
      const cat = typeof e.category === "string" ? e.category : "Other rules";
      const mapped = ALLOWED.has(cat) ? cat : "Other rules";
      const out: PdfAnalysisReport["extractedInformation"][number] = {
        category: mapped,
        content: e.content,
      };
      if (typeof e.sourcePage === "number" && e.sourcePage > 0) {
        out.sourcePage = e.sourcePage;
      }
      if (typeof e.sourceSection === "string" && e.sourceSection.trim()) {
        out.sourceSection = e.sourceSection.trim();
      }
      return out;
    });

  const topics = Array.isArray(report.topics)
    ? report.topics.filter((t: unknown) => typeof t === "string" && (t as string).trim()).map((t: string) => t.trim())
    : [];

  const wordCount = (() => {
    const wc = Number(report.wordCount);
    if (Number.isFinite(wc) && wc >= 0) return wc;
    // fallback: count tokens in the supplied content
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  })();

  const ocrUsed = Boolean(report.ocrUsed);
  const ocrWarning =
    typeof report.ocrWarning === "string" && report.ocrWarning.trim()
      ? report.ocrWarning.trim()
      : ocrUsed
        ? "Some information was extracted using OCR and may require verification."
        : undefined;

  // force sources to the right provenance
  const sources: SourceRef[] = Array.isArray(report.sources) && report.sources.length > 0
    ? report.sources.map((s: any) => ({
        type: sourceType,
        label: typeof s.label === "string" && s.label.trim() ? s.label.trim() : sourceLabel,
        detail: typeof s.detail === "string" && s.detail.trim() ? s.detail.trim() : sourceDetail,
      }))
    : [
        {
          type: sourceType,
          label: sourceLabel,
          detail: sourceDetail,
        },
      ];

  const caveatsList = Array.isArray(report.caveats)
    ? report.caveats.filter((c: unknown) => typeof c === "string" && (c as string).trim()).map((c: string) => c.trim())
    : [];
  const caveats: string[] = caveatsList;
  // ensure the no-content caveat is present in sample mode
  if (!hasContent) {
    const sampleNote = "No document text was provided — this is a sample analysis.";
    if (!caveats.some((c) => c.toLowerCase().includes("no document text was provided"))) {
      caveats.unshift(sampleNote);
    }
  }

  const generatedAt =
    typeof report.generatedAt === "string" && report.generatedAt.trim()
      ? report.generatedAt
      : new Date().toISOString();

  return {
    documentOverview,
    extractedInformation,
    topics,
    wordCount,
    ocrUsed,
    ocrWarning,
    sources,
    generatedAt,
    caveats: caveats.length > 0 ? caveats : undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const content: string = typeof body?.content === "string" ? body.content : "";
    const filename: string = typeof body?.filename === "string" ? body.filename.trim() : "";
    const topic: string = typeof body?.topic === "string" ? body.topic.trim() : "";

    if (!content && !filename && !topic) {
      return NextResponse.json(
        { error: "At least one of 'content', 'filename', or 'topic' must be provided." },
        { status: 400 }
      );
    }

    const userPrompt = buildUserPrompt(content, filename, topic);
    const raw = await jsonWithFallback<PdfAnalysisReportWithCaveats>(
      SYSTEM_PROMPT,
      userPrompt,
      SCHEMA_HINT,
      isPdfAnalysisReport
    );

    let report: PdfAnalysisReportWithCaveats;
    try {
      report = sanitizeReport(raw, content, filename);
    } catch (normErr) {
      console.error("[pdf/analyze] sanitizeReport error:", normErr);
      report = raw;
    }
    return NextResponse.json({ report });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "PDF analysis failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
