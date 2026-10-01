import { NextRequest, NextResponse } from "next/server";
import { jsonWithFallback } from "@/lib/ai/json-with-fallback";
import type { ExamStrategy } from "@/types";

// ============================================================
// AI Exam Strategy Guide — exam-day strategist
// Produces a tailored ExamStrategy JSON: time allocation per
// section, attempt order, negative-marking rules, revision
// buffer, section-wise cut targets, last-5-minute tactics, and
// common exam-day mistakes — calibrated to the exam type.
// GATE = accuracy-focused, SSC = speed-focused, UPSC = elimination-based,
// Banking = speed + accuracy (mixed).
// ============================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are ExamIntel's AI Exam-Day Strategist — an elite exam-strategy advisor for competitive-exam aspirants.

Your job: given an exam's structural context (exam name, total questions, duration in minutes, negative-marking rules, and section list), produce a STRICT JSON object matching the ExamStrategy schema below. The strategy must help a serious aspirant maximize their score on exam day through disciplined time allocation, question selection, and risk management.

CORE PRINCIPLES (NON-NEGOTIABLE):

1. EXAM TYPE DETECTION — classify the exam into one of four buckets and tailor the entire strategy to that bucket's signature style:
   - "Speed-focused"     → SSC CGL, SSC CHSL, RRB NTPC, CET — high question count, tight time, speed >> accuracy.
   - "Accuracy-focused"  → GATE (any paper), JEE Advanced, CAT — fewer questions, heavy negative marking, accuracy >> speed.
   - "Elimination-based" → UPSC CSE Prelims, State PSC — high stakes, big option count, elimination + selective guessing.
   - "Mixed"             → Banking PO/Clerk (IBPS/SBI), RBI — speed + accuracy both matter, balanced approach.
   Inspect the examName keyword: if it contains "GATE", "JEE", "CAT" → Accuracy-focused; "SSC", "RRB", "CET", "CHSL" → Speed-focused; "UPSC", "PSC" → Elimination-based; "Banking", "IBPS", "SBI", "RBI", "PO", "Clerk" → Mixed. Default to "Mixed" when ambiguous.

2. TIME ALLOCATION PER SECTION — distribute the available durationMinutes across the user-provided sections so that the sum of minutes ≤ durationMinutes minus the revisionBuffer (which you reserve from the top, typically 5–10% of total time). Each section entry: section name (matches user input), minutes allocated, questions in that section, priority ("High" | "Medium" | "Low" — based on the section's scoring weight and the candidate's expected ROI). High-priority sections get proportionally more time. The minutes sum + revisionBuffer MUST equal durationMinutes (give or take 1–2 minutes).

3. ATTEMPT ORDER — produce 4–6 ordered steps that describe HOW to traverse the paper. Each step: step number, action (concrete — e.g. "Sweep easy Quant questions first", "Save Reading Comprehension for after Reasoning"), rationale (why this order makes sense for this exam type). Speed exams: easiest section first to build momentum; Accuracy exams: strongest subject first to lock in marks; Elimination exams: skim all questions then tackle in two passes; Mixed exams: high-yield quick wins first, time-consuming sets last.

4. NEGATIVE MARKING STRATEGY — produce 4–6 decision rules mapping situation → action ("Guess" | "Skip" | "Eliminate then guess") → threshold. Each rule: situation (e.g. "Question you've worked for 90+ seconds and are between 2 options"), action, threshold (the explicit confidence or attempt-number cutoff that triggers the action). Tailor to exam type — heavy negative marking (GATE, UPSC) → favor "Skip" + "Eliminate then guess"; light negative marking (SSC) → favor "Guess" when 50%+ confident; mixed (Banking) → "Eliminate then guess" above 60% confidence.

5. REVISION BUFFER — revisionBuffer (minutes) — reserve enough to revisit skipped, flagged, and doubtful questions. Typically: 5 min for a 60-min exam, 10 min for a 120-min exam, 15–20 min for a 180-min exam.

6. SECTION TARGETS — for every section, give safeAttempts (the minimum number of solid attempts needed to clear the expected cut-off, typically 60–75% of the section's question count for speed exams, 50–65% for accuracy exams) and targetAccuracy (% the candidate should aim for on attempted questions — 85–95% for accuracy-focused, 75–85% for speed-focused, 80–90% for elimination-based, 80–88% for mixed).

7. LAST 5 MINUTES — produce 4–5 actions for the final 5 minutes (after revision buffer is exhausted): bubble-check, flagged-questions revisit, no-new-question rule, save/submit safeguard, etc. Each: action + detail (concrete instruction).

8. COMMON MISTAKES — produce 5–6 high-frequency exam-day mistakes with concrete prevention. Examples: "Bubbling the wrong row" → "Verify question number every 5 questions"; "Sinking 8 minutes into one tough Quant question" → "Hard-cap any question at 2 minutes; mark and move on". Calibrate to the exam type (speed exams = "spending too long on hard questions"; accuracy exams = "guessing when not 60%+ sure"; elimination exams = "wild-guessing after eliminating only one option"; mixed exams = "ignoring sectional cut-offs").

9. SOURCES — array of { type, label }. Always include at least:
   - { type: "USER_INPUT", label: "Exam structure provided by user" }
   - { type: "AI_ANALYSIS", label: "Exam-day strategy synthesis" }

10. generatedAt must be the current ISO timestamp.

11. Return ONLY the JSON object. No markdown, no code fences, no commentary.

REMEMBER: A real candidate will read this the night before their exam. Be specific, actionable, and calibrated to the exam's character. Generic advice like "manage your time wisely" is useless. Give them numbers, cutoffs, and concrete rules.`;

const SCHEMA_HINT = `ExamStrategy = {
  examName: string,
  examType: "Speed-focused" | "Accuracy-focused" | "Elimination-based" | "Mixed",
  timeAllocation: { section: string, minutes: number, questions: number, priority: "High" | "Medium" | "Low" }[],
  attemptOrder: { step: number, action: string, rationale: string }[],
  negativeMarkingStrategy: { situation: string, action: "Guess" | "Skip" | "Eliminate then guess", threshold: string }[],
  revisionBuffer: number,
  sectionTargets: { section: string, safeAttempts: number, targetAccuracy: number }[],
  lastFiveMinutes: { action: string, detail: string }[],
  commonMistakes: { mistake: string, prevention: string }[],
  sources: { type: string, label: string }[],
  generatedAt: string (ISO timestamp)
}`;

function isExamStrategy(v: unknown): v is ExamStrategy {
  const r = v as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return false;
  if (typeof r.examName !== "string") return false;
  const validTypes = ["Speed-focused", "Accuracy-focused", "Elimination-based", "Mixed"];
  if (typeof r.examType !== "string" || !validTypes.includes(r.examType)) return false;
  if (!Array.isArray(r.timeAllocation) || r.timeAllocation.length === 0) return false;
  if (!Array.isArray(r.attemptOrder) || r.attemptOrder.length === 0) return false;
  if (!Array.isArray(r.negativeMarkingStrategy) || r.negativeMarkingStrategy.length === 0) return false;
  if (typeof r.revisionBuffer !== "number") return false;
  if (!Array.isArray(r.sectionTargets)) return false;
  if (!Array.isArray(r.lastFiveMinutes)) return false;
  if (!Array.isArray(r.commonMistakes)) return false;
  if (!Array.isArray(r.sources)) return false;
  if (typeof r.generatedAt !== "string") return false;
  return true;
}

interface ExamStrategyInput {
  examName: string;
  totalQuestions: number;
  durationMinutes: number;
  negativeMarking: string;
  sections: string[];
}

function buildUserPrompt(input: ExamStrategyInput): string {
  const lines: string[] = [];
  lines.push(`Build an ExamStrategy for the following exam:`);
  lines.push(``);
  lines.push(`- Exam name: ${input.examName}`);
  lines.push(`- Total questions: ${input.totalQuestions}`);
  lines.push(`- Duration: ${input.durationMinutes} minutes`);
  lines.push(`- Negative marking: ${input.negativeMarking || "Not specified"}`);
  lines.push(`- Sections: ${input.sections.length > 0 ? input.sections.join(", ") : "Not specified — infer from exam name"}`);
  lines.push(``);
  lines.push(`Detect the examType from the exam name keyword (GATE/JEE/CAT → Accuracy-focused; SSC/RRB/CET → Speed-focused; UPSC/PSC → Elimination-based; Banking/IBPS/SBI/RBI/PO/Clerk → Mixed; default Mixed).`);
  lines.push(`Distribute ${input.durationMinutes} minutes across the sections — reserve a sensible revisionBuffer first, then allocate the rest proportional to each section's question count and priority.`);
  lines.push(`Produce 4-6 attempt-order steps, 4-6 negative-marking rules, 4-5 last-5-minute actions, 5-6 common-mistake cards, and at least 2 sources.`);
  lines.push(``);
  lines.push(`Set "generatedAt" to "${new Date().toISOString()}".`);
  lines.push(`Return ONLY the JSON.`);
  return lines.join("\n");
}

function parseList(s: string): string[] {
  if (!s) return [];
  return s
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const examName = typeof body?.examName === "string" ? body.examName.trim() : "";
    const totalQuestions = Number(body?.totalQuestions) || 0;
    const durationMinutes = Number(body?.durationMinutes) || 0;
    const negativeMarking = typeof body?.negativeMarking === "string" ? body.negativeMarking.trim() : "";

    if (!examName) {
      return NextResponse.json(
        { error: "An 'examName' is required to generate a tailored strategy." },
        { status: 400 }
      );
    }

    const sections = Array.isArray(body?.sections) && body.sections.every((s) => typeof s === "string")
      ? body.sections.map((s: string) => s.trim()).filter(Boolean)
      : parseList(typeof body?.sections === "string" ? body.sections : "");

    const input: ExamStrategyInput = {
      examName,
      totalQuestions,
      durationMinutes,
      negativeMarking,
      sections,
    };

    const userPrompt = buildUserPrompt(input);
    const strategy = await jsonWithFallback<ExamStrategy>(
      SYSTEM_PROMPT,
      userPrompt,
      SCHEMA_HINT,
      isExamStrategy
    );

    // Ensure examName reflects user input (AI may have renamed it).
    strategy.examName = examName;

    return NextResponse.json({ strategy });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Exam strategy generation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
