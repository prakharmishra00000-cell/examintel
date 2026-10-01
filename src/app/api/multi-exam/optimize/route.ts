import { NextRequest, NextResponse } from "next/server";
import { jsonWithFallback } from "@/lib/ai/json-with-fallback";
import type {
  MultiExamPlan,
  MultiExamMap,
  CombinedStrategy,
  MultiExamConflict,
  SourceRef,
} from "@/types";

function isMultiExamPlan(v: unknown): v is MultiExamPlan {
  const r = v as any;
  return (
    !!r &&
    typeof r === "object" &&
    Array.isArray(r.exams) &&
    !!r.knowledgeMap &&
    typeof r.knowledgeMap === "object" &&
    !!r.combinedStrategy &&
    typeof r.combinedStrategy === "object"
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are ExamIntel's AI Multi-Exam Preparation Optimizer — an expert strategist who helps a student prepare for MULTIPLE competitive exams simultaneously (e.g. Primary: SSC CGL, Secondary: Banking PO, Backup: Railway NTPC) while MINIMISING DUPLICATED EFFORT.

Your job: given a list of exams (with user-defined priorities — Primary / Secondary / Backup — and any provided dates or target scores) and the available hours per day, produce ONE combined preparation strategy in STRICT JSON matching the MultiExamPlan schema below.

Core methodology (NON-NEGOTIABLE):

1. Build a Multi-Exam Knowledge Map with TWO layers:
   - COMMON: topics that genuinely support multiple listed exams (e.g. Quantitative Aptitude, Reasoning, English, General Awareness). A topic is "common" ONLY if it appears (under that name or a definitionally equivalent concept) in 2+ exams. Do NOT assume two topics are identical just because their names look similar — INSPECT their definitions, scope, depth, and question style. "Banking Awareness" and "Financial Awareness" are not automatically the same thing; "General Science" in Railway vs "Elementary Science" in SSC may have different depth — call out the difference rather than collapsing them silently.
   - EXAM-SPECIFIC: topics unique to each exam (e.g. CGL: Advanced Mathematics, Static GK; Banking: Banking & Financial Awareness, Computer Knowledge; Railway: Railway-specific GK, General Science deep). Provide one entry per listed exam, even if its unique list is empty.

2. Combined Strategy with these components:
   - commonPreparation: how to prepare the shared topics ONCE in a way that transfers to all exams that need them (depth, sequence, focus areas).
   - examSpecificPreparation: per-exam chips — the unique topics each exam adds on top of common prep, with what to focus on.
   - priority: a numbered (or ordered) list of "which common foundations first" — sequence the shared topics by leverage (e.g. English foundations before Quant tricks because English transfers to every exam). Respect the user's Primary/Secondary/Backup ordering — do not independently re-prioritise the user's exams.
   - dependencies: prerequisite relationships across topics (e.g. "Tables & Squares" before "Simplification"; "Reading speed" before "Banking Awareness current affairs"). Use chips like "Topic A → Topic B".
   - scheduling: when to introduce exam-specific prep relative to common prep and exam dates (e.g. "Common foundations for first 6 weeks; introduce Banking-specific prep by week 7 if Banking PO is within 12 weeks"). Tie scheduling to the user's exam dates when provided; otherwise tie to relative weeks.
   - revision: shared revision where appropriate (shared topic revision is multi-purpose) plus any exam-specific revision focus.
   - mockTesting: exam-specific mocks scheduled closer to the relevant exam's date; full-length mocks for Primary first, then Secondary; sectional/quick mocks for Backup only if time allows.

3. Minimise DUPLICATED EFFORT explicitly: structure prep around shared topics first, then layer exam-specific APPLICATIONS on top rather than re-preparing from scratch for each exam. Quantify savings qualitatively where useful ("…prep Quant once for SSC CGL + Banking instead of twice").

4. Detect CONFLICTS between exams and surface them in "conflicts": e.g. different exam patterns (CGL allows sectional time freedom, Banking has sectional timers and cutoffs), different negative-marking schemes (CGL -2 for 2-mark, Banking -0.25 for 1-mark), different depth (CGL Quant goes to Advanced Mathematics, Banking stops at elementary), different awareness areas (Banking Awareness vs SSC Static GK vs Railway General Science), different technical requirements (typing test in Banking, no typing in CGL/Railway), different time limits, different sectional cutoffs. Each conflict: { type, description, reason }. "type" is a short label (e.g. "Sectional Timing", "Negative Marking", "Depth Mismatch", "Awareness Area", "Technical Requirement", "Pattern Difference").

5. Generate a weeklySchedule with EXACTLY 7 days (day names "Monday" through "Sunday" or "Day 1" through "Day 7" — your choice, be consistent). Each day has a "sessions" array of strings where each string is one concrete study session like "Quant | Simplification (2h, common foundation)". Sessions should reflect the combined strategy — common foundations early, exam-specific applications sprinkled in, revision slots, one mock close to relevant exam day. Sessions must be achievable within availableHours per day (don't overschedule).

6. Use USER-PROVIDED priorities and constraints. NEVER re-rank the user's exams. If the user says SSC CGL is Primary, treat it as Primary throughout — do not silently promote Banking because it has an earlier date.

7. Sources: tag everything you produce as AI_ANALYSIS (this is your synthesis, not official notification data). Include at least one AI_ANALYSIS source labelled "Multi-Exam Strategy Synthesis". Optionally include a USER_INPUT source reflecting the user's exam list / constraints. Do NOT fabricate OFFICIAL sources — if you need to reference an official body, mention it in label but tag type as AI_ANALYSIS unless you can verify.

8. "generatedAt" must be the current ISO timestamp.

OUTPUT RULES:
- Output ONLY valid JSON. No markdown, no commentary, no code fences.
- All arrays must exist (use [] if empty).
- Strings must be plain text, no nested JSON inside strings.
- All exam names in output must match the user's input names (you may expand an acronym in a topic description but keep the exam.name as the user typed it).
- Priority values in output exams must match the user's input (Primary / Secondary / Backup).
- knowledgeMap.examSpecific MUST have one entry per exam (even if topics: []).`;

const SCHEMA = `MultiExamPlan = {
  exams: { name: string, priority: "Primary" | "Secondary" | "Backup", date?: string, targetScore?: string }[],
  availableHours: number,
  knowledgeMap: {
    common: string[],
    examSpecific: { exam: string, priority: "Primary" | "Secondary" | "Backup", topics: string[] }[]
  },
  combinedStrategy: {
    commonPreparation: string[],
    examSpecificPreparation: { exam: string, topics: string[] }[],
    priority: string[],           // ordered, "which common foundations first"
    dependencies: string[],       // chips like "A → B (reason)"
    scheduling: string[],          // bullets
    revision: string[],           // bullets
    mockTesting: string[]          // bullets
  },
  conflicts: { type: string, description: string, reason: string }[],
  weeklySchedule: { day: string, sessions: string[] }[],   // exactly 7 entries
  sources: SourceRef[],
  generatedAt: string              // ISO timestamp
}

SourceRef = {
  type: "OFFICIAL" | "UPLOADED_DOCUMENT" | "SEARCH_SOURCE" | "USER_INPUT" | "AI_ANALYSIS" | "AI_GENERATED",
  label: string,
  detail?: string
}`;

const PRIORITY_VALUES = ["Primary", "Secondary", "Backup"] as const;
type Priority = (typeof PRIORITY_VALUES)[number];

function isPriority(v: unknown): v is Priority {
  return typeof v === "string" && (PRIORITY_VALUES as readonly string[]).includes(v);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const examsRaw: unknown = body?.exams;
    const availableHoursRaw: unknown = body?.availableHours;

    if (!Array.isArray(examsRaw) || examsRaw.length < 2) {
      return NextResponse.json(
        { error: "Provide at least 2 exams to optimize (max 5)." },
        { status: 400 }
      );
    }
    if (examsRaw.length > 5) {
      return NextResponse.json(
        { error: "Optimise at most 5 exams at a time." },
        { status: 400 }
      );
    }

    const exams = examsRaw
      .map((x: any, i: number) => {
        if (!x || typeof x !== "object") return null;
        const name = typeof x.name === "string" ? x.name.trim() : "";
        if (!name) return null;
        const priority: Priority = isPriority(x.priority) ? x.priority : i === 0 ? "Primary" : i === 1 ? "Secondary" : "Backup";
        const date = typeof x.date === "string" && x.date.trim() ? x.date.trim() : undefined;
        const targetScore =
          typeof x.targetScore === "string" && x.targetScore.trim()
            ? x.targetScore.trim()
            : typeof x.targetScore === "number" && Number.isFinite(x.targetScore)
            ? String(x.targetScore)
            : undefined;
        return { name, priority, date, targetScore };
      })
      .filter((x: { name: string } | null): x is { name: string; priority: Priority; date?: string; targetScore?: string } => x !== null);

    if (exams.length < 2) {
      return NextResponse.json(
        { error: "Provide at least 2 valid exam names with priorities." },
        { status: 400 }
      );
    }

    // Validate at most one Primary / one Secondary / one Backup is not enforced — user may have multiple backups.
    const availableHours =
      typeof availableHoursRaw === "number" && Number.isFinite(availableHoursRaw) && availableHoursRaw > 0
        ? availableHoursRaw
        : typeof availableHoursRaw === "string" && Number.isFinite(parseFloat(availableHoursRaw))
        ? parseFloat(availableHoursRaw)
        : 5;

    // Build user prompt
    const examLines = exams
      .map(
        (e, i) =>
          `${i + 1}. ${e.name}  [Priority: ${e.priority}]${e.date ? `  · Target date: ${e.date}` : ""}${e.targetScore ? `  · Target score: ${e.targetScore}` : ""}`
      )
      .join("\n");

    const user = `Produce ONE combined multi-exam preparation strategy for the following exams. Respect the user-assigned priorities verbatim; do NOT re-rank them.

Exams:
${examLines}

Daily availability: ${availableHours} hours/day.

Requirements:
- Build the knowledge map: COMMON topics supporting multiple exams + EXAM-SPECIFIC topics per exam. Inspect topic definitions before declaring them common — similar names are NOT automatically the same topic.
- Minimise duplicated effort: prep common foundations once, then layer exam-specific applications on top.
- Detect conflicts (pattern, time limit, negative marking, depth, awareness area, technical requirement, sectional cutoff differences) and surface them in "conflicts".
- weeklySchedule must have exactly 7 days, each day.sessions must be achievable in ${availableHours} hours.
- All exam names in output must match the input names above (preserve spelling).
- All priorities in output must match the input priorities.
- knowledgeMap.examSpecific must include one entry per exam (even if its topics array is empty).
- Tag sources AI_ANALYSIS for your synthesis; include a USER_INPUT source reflecting the exam list / constraints.
- generatedAt = current ISO timestamp.

Return ONLY the JSON object matching the MultiExamPlan schema.`;

    const plan = await jsonWithFallback<MultiExamPlan>(SYSTEM, user, SCHEMA, isMultiExamPlan);

    // ---------- Defensive normalisation ----------
    let norm: MultiExamPlan;
    try {
      norm = {
        exams: exams.map((e) => ({
          name: e.name,
          priority: e.priority,
          date: e.date,
          targetScore: e.targetScore,
        })),
        availableHours,
        knowledgeMap: normalizeMap(plan?.knowledgeMap, exams),
        combinedStrategy: normalizeStrategy(plan?.combinedStrategy, exams),
        conflicts: normalizeConflicts(plan?.conflicts),
        weeklySchedule: normalizeSchedule(plan?.weeklySchedule),
        sources: normalizeSources(plan?.sources, exams, availableHours),
        generatedAt:
          typeof plan?.generatedAt === "string" && plan.generatedAt.trim()
            ? plan.generatedAt
            : new Date().toISOString(),
      };
    } catch (normErr) {
      console.error("[multi-exam/optimize] normalization error:", normErr);
      norm = plan;
    }

    return NextResponse.json({ plan: norm });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Multi-exam optimisation failed" },
      { status: 500 }
    );
  }
}

// ---------------- normalizers ----------------

function normalizeMap(
  raw: MultiExamPlan["knowledgeMap"] | undefined,
  exams: { name: string; priority: Priority }[]
): MultiExamMap {
  const common = Array.isArray(raw?.common)
    ? (raw as MultiExamMap).common.map((t) => String(t ?? "")).filter((t) => t.length > 0)
    : [];
  const rawSpecific = Array.isArray(raw?.examSpecific) ? (raw as MultiExamMap).examSpecific : [];
  const byExam = new Map<string, string[]>();
  for (const e of rawSpecific) {
    if (!e || typeof e.exam !== "string") continue;
    const arr = Array.isArray(e.topics)
      ? e.topics.map((t) => String(t ?? "")).filter((t) => t.length > 0)
      : [];
    byExam.set(e.exam, arr);
  }
  const examSpecific = exams.map((e) => ({
    exam: e.name,
    priority: e.priority,
    topics: byExam.get(e.name) ?? [],
  }));
  return { common, examSpecific };
}

function normalizeStrategy(
  raw: CombinedStrategy | undefined,
  exams: { name: string }[]
): CombinedStrategy {
  const r = raw ?? ({} as CombinedStrategy);
  const str = (arr: unknown): string[] =>
    Array.isArray(arr) ? arr.map((x) => String(x ?? "")).filter((x) => x.length > 0) : [];

  const examSpecificPreparation = Array.isArray(r.examSpecificPreparation)
    ? (() => {
        const byExam = new Map<string, string[]>();
        for (const e of r.examSpecificPreparation as CombinedStrategy["examSpecificPreparation"]) {
          if (!e || typeof e.exam !== "string") continue;
          byExam.set(
            e.exam,
            Array.isArray(e.topics)
              ? e.topics.map((t) => String(t ?? "")).filter((t) => t.length > 0)
              : []
          );
        }
        return exams.map((e) => ({ exam: e.name, topics: byExam.get(e.name) ?? [] }));
      })()
    : exams.map((e) => ({ exam: e.name, topics: [] as string[] }));

  return {
    commonPreparation: str(r.commonPreparation),
    examSpecificPreparation,
    priority: str(r.priority),
    dependencies: str(r.dependencies),
    scheduling: str(r.scheduling),
    revision: str(r.revision),
    mockTesting: str(r.mockTesting),
  };
}

function normalizeConflicts(raw: MultiExamConflict[] | undefined): MultiExamConflict[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c === "object")
    .map((c) => ({
      type: String(c.type ?? "Conflict").slice(0, 80),
      description: String(c.description ?? "").slice(0, 400),
      reason: String(c.reason ?? "").slice(0, 400),
    }))
    .filter((c) => c.description.length > 0 || c.reason.length > 0);
}

function normalizeSchedule(
  raw: { day: string; sessions: string[] }[] | undefined
): { day: string; sessions: string[] }[] {
  const FALLBACK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const list = Array.isArray(raw) ? raw : [];
  const days: { day: string; sessions: string[] }[] = list
    .filter((d) => d && typeof d === "object")
    .map((d) => ({
      day: String(d.day ?? "").trim() || "Day",
      sessions: Array.isArray(d.sessions)
        ? d.sessions.map((s) => String(s ?? "")).filter((s) => s.length > 0)
        : [],
    }));

  // Pad / trim to exactly 7
  while (days.length < 7) {
    const idx = days.length;
    days.push({ day: FALLBACK_DAYS[idx] ?? `Day ${idx + 1}`, sessions: [] });
  }
  return days.slice(0, 7);
}

function normalizeSources(
  raw: SourceRef[] | undefined,
  exams: { name: string; priority: Priority }[],
  availableHours: number
): SourceRef[] {
  const list: SourceRef[] = Array.isArray(raw)
    ? raw
        .filter((s) => s && typeof s === "object")
        .map((s) => ({
          type: validSourceType(s.type) ? (s.type as SourceRef["type"]) : "AI_ANALYSIS",
          label: String(s.label ?? "").slice(0, 120) || "Source",
          detail: typeof s.detail === "string" ? s.detail.slice(0, 200) : undefined,
        }))
        .filter((s) => s.label.length > 0)
    : [];

  // Guarantee at least the AI_ANALYSIS source and a USER_INPUT source
  const hasAI = list.some((s) => s.type === "AI_ANALYSIS");
  if (!hasAI) {
    list.unshift({
      type: "AI_ANALYSIS",
      label: "Multi-Exam Strategy Synthesis",
      detail: `${exams.length} exams · ${availableHours}h/day`,
    });
  }
  const hasUser = list.some((s) => s.type === "USER_INPUT");
  if (!hasUser) {
    list.push({
      type: "USER_INPUT",
      label: "Exam list & priorities",
      detail: exams.map((e) => `${e.name} (${e.priority})`).join(", "),
    });
  }
  return list;
}

function validSourceType(v: unknown): boolean {
  return (
    typeof v === "string" &&
    [
      "OFFICIAL",
      "UPLOADED_DOCUMENT",
      "SEARCH_SOURCE",
      "USER_INPUT",
      "AI_ANALYSIS",
      "AI_GENERATED",
    ].includes(v)
  );
}
