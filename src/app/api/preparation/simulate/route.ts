import { NextRequest, NextResponse } from "next/server";
import { directJson } from "@/lib/ai/direct-call";
import type { PreparationPlan } from "@/types";

function isPreparationPlan(v: unknown): v is PreparationPlan {
  const r = v as any;
  return !!r && typeof r === "object" && (Array.isArray(r.phases) || r.targetExam);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// AI Preparation Simulator — adaptive, dependency-aware planner
// Builds a 6-phase journey with realistic day-by-day plans
// that genuinely reflect the user's available daily time budget.
// ============================================================

const SYSTEM_PROMPT = `You are ExamIntel's AI Preparation Simulator — an adaptive, dependency-aware study planner for competitive-exam aspirants.

Your job: given a student's context (target exam, exam date, current level, daily available study time, weekly cadence, subjects, strong/weak subjects, prior preparation, target score, multi-exam commitments), produce a STRICT JSON object matching the PreparationPlan schema below. The plan must help a serious aspirant execute a realistic, time-respecting, dependency-ordered preparation journey.

Core principles (NON-NEGOTIABLE):

1. SIX-PHASE JOURNEY (always all six phases, in order):
   - Phase 1 — Foundation: build core concepts and mental frameworks.
   - Phase 2 — Topic Completion: complete the syllabus systematically subject-by-subject.
   - Phase 3 — Practice: topic-wise practice + Previous Year Questions (PYQs).
   - Phase 4 — Revision: spaced, cumulative revision of prior topics.
   - Phase 5 — Mock Tests: full-length timed simulations under exam conditions.
   - Phase 6 — Final Revision: high-priority topics + personal weak areas, exam-eve consolidation.
   Each phase needs: phase (1-6), name, goal (what mastery looks like), duration (e.g. "Weeks 1-3", "~18 days"), tasks (5-9 concrete actionable tasks).

2. DEPENDENCY ORDER — DO NOT schedule advanced topics before their necessary foundations. Sequence the daily plans so prerequisites appear before dependents. Only override this if the user has explicitly indicated they have already covered the foundation (in previousPreparation or strongSubjects).

3. ADAPTIVE DAILY PLANS — THIS IS THE CRITICAL RULE. The dailyPlans MUST genuinely respect the user's availableHoursPerDay. DO NOT produce a generic 2-hour schedule and multiply it.
   - If the user has 2h/day → produce realistic 2h plans: typically 1 subject, 1-2 focused sessions, tightly scoped topics, no padding.
   - If the user has 4h/day → 2 sessions across subjects with a short break implied, broader topic coverage per day.
   - If the user has 6h/day → 3 sessions, multiple subjects, full topic arcs, practice blocks.
   - If the user has 8h/day → 4 sessions, theory + practice + revision in same day, multi-topic coverage.
   Each session: subject, topic, durationHours (decimal allowed, e.g. 1.5), activity (specific — e.g. "Concept: Profit & Loss basics + 15 practice problems").
   totalHours PER DAY must equal (or come within 0.5h of) availableHoursPerDay. This is non-negotiable.
   Produce AT LEAST 7 sample dailyPlans spanning different phases (e.g. Day 1 of Foundation, a Topic Completion day, a Practice day, a Revision day, a Mock Test day, a Final Revision day, etc.). Each day has a realistic date in YYYY-MM-DD format starting from today's date and progressing forward.

4. RESPECT USER PRIORITIES — do NOT independently decide which subjects matter most, what target score to aim for, or what to skip. The user-provided strongSubjects, weakSubjects, targetScore, subjects, and previousPreparation are authoritative inputs. Honor them. If the user said Quantitative Aptitude is weak, devote more practice time to it. If the user mentioned multiExamStatus, account for shared preparation synergy.

5. SPACING & REVISION — revisionSchedule must use spaced repetition: first revision of a topic within 2 days of learning, second within a week, third within a month. mockTestSchedule must include at least 3-4 full-length mock dates spaced across Phase 5 and Phase 6, with the final mock 5-7 days before examDate.

6. ADAPTIVE NOTES — adaptiveNotes must be 4-7 specific, actionable insights: e.g. "Your 2h/day budget means Theory-only days are risky — pair every new concept with 15-min practice", "Quantitative Aptitude weakness + SSC CGL weightage → front-load Phase 1 with Quant foundations", "Mock Test schedule reserves Sat & Sun for full simulations matching actual SSC CGL timing".

7. EXAM DATE — totalDays must be the calendar days from today to examDate (inclusive). If examDate is unreasonably close (<14 days), still produce a compressed but realistic plan and flag this in adaptiveNotes. If examDate is very far (>365 days), distribute phases proportionally.

8. SOURCES — sources array must include at least:
   - One USER_INPUT source (the user's profile / constraints)
   - One AI_ANALYSIS source (your adaptive planning inferences)
   Tag your dependency reasoning, time-budgeting, and weak-area emphasis as AI_ANALYSIS.

9. generatedAt must be the current ISO timestamp.

10. Return ONLY the JSON object. No markdown, no code fences, no commentary.

REMEMBER: A real student will look at this plan and decide whether to follow it. If your daily plans show 4 hours of work when the user said 2h/day, the tool is broken. Match the time budget exactly.`;

const SCHEMA_HINT = `PreparationPlan = {
  targetExam: string,
  examDate: string (YYYY-MM-DD),
  currentLevel: string,
  availableHoursPerDay: number,
  daysPerWeek: number,
  targetScore?: string,
  totalDays: number,
  phases: {
    phase: number (1-6),
    name: string,
    goal: string,
    duration: string,
    tasks: string[]
  }[],
  dailyPlans: {
    day: number,
    date: string (YYYY-MM-DD),
    sessions: { subject: string, topic: string, durationHours: number, activity: string }[],
    totalHours: number,
    notes?: string
  }[],
  weakSubjects: string[],
  strongSubjects: string[],
  revisionSchedule: string[],
  mockTestSchedule: string[],
  adaptiveNotes: string[],
  sources: { type: "OFFICIAL"|"UPLOADED_DOCUMENT"|"SEARCH_SOURCE"|"USER_INPUT"|"AI_ANALYSIS"|"AI_GENERATED", label: string, detail?: string }[],
  generatedAt: string (ISO timestamp)
}`;

function buildUserPrompt(input: PreparationInput): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`Build a PreparationPlan for the following student profile:`);
  lines.push(``);
  lines.push(`- Target exam: ${input.targetExam}`);
  lines.push(`- Exam date: ${input.examDate} (today is ${today})`);
  lines.push(`- Current level: ${input.currentLevel}`);
  lines.push(`- Available study time: ${input.availableHoursPerDay} hours per day, ${input.daysPerWeek} days per week`);
  if (input.targetScore) lines.push(`- Target score: ${input.targetScore}`);
  lines.push(`- Subjects to cover: ${input.subjects.join(", ")}`);
  if (input.strongSubjects.length > 0) lines.push(`- Strong subjects: ${input.strongSubjects.join(", ")}`);
  if (input.weakSubjects.length > 0) lines.push(`- Weak subjects: ${input.weakSubjects.join(", ")}`);
  if (input.previousPreparation.trim()) lines.push(`- Previous preparation: ${input.previousPreparation.trim()}`);
  if (input.multiExamStatus.trim()) lines.push(`- Multi-exam context: ${input.multiExamStatus.trim()}`);
  if (input.adaptiveNote) lines.push(`- ADAPTIVE REPLAN REQUEST: ${input.adaptiveNote}`);
  lines.push(``);
  lines.push(`Produce the complete PreparationPlan JSON. CRITICAL: every day in dailyPlans must have totalHours approximately equal to ${input.availableHoursPerDay}. Do NOT pad or shrink arbitrarily — design genuine ${input.availableHoursPerDay}-hour days with appropriate session counts and topics.`);
  lines.push(``);
  lines.push(`Set "generatedAt" to "${new Date().toISOString()}".`);
  lines.push(`Return ONLY the JSON.`);
  lines.push(``);
  lines.push(`BE COMPREHENSIVE AND DETAILED — populate every phase, every daily plan, every adaptive note with complete and specific content. The aspirant will follow this plan day-by-day, so do not produce sparse or placeholder content.`);
  return lines.join("\n");
}

interface PreparationInput {
  targetExam: string;
  examDate: string;
  currentLevel: string;
  availableHoursPerDay: number;
  daysPerWeek: number;
  subjects: string[];
  strongSubjects: string[];
  weakSubjects: string[];
  previousPreparation: string;
  targetScore: string;
  multiExamStatus: string;
  adaptiveNote?: string;
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
    const targetExam = typeof body?.targetExam === "string" ? body.targetExam.trim() : "";
    const examDate = typeof body?.examDate === "string" ? body.examDate.trim() : "";
    const currentLevel = typeof body?.currentLevel === "string" ? body.currentLevel.trim() : "Intermediate";
    const availableHoursPerDay = Number(body?.availableHoursPerDay) || 4;
    const daysPerWeek = Number(body?.daysPerWeek) || 6;
    const targetScore = typeof body?.targetScore === "string" ? body.targetScore.trim() : "";
    const previousPreparation = typeof body?.previousPreparation === "string" ? body.previousPreparation.trim() : "";
    const multiExamStatus = typeof body?.multiExamStatus === "string" ? body.multiExamStatus.trim() : "";
    const adaptiveNote = typeof body?.adaptiveNote === "string" ? body.adaptiveNote.trim() : "";

    if (!targetExam || !examDate) {
      return NextResponse.json(
        { error: "Both 'targetExam' and 'examDate' are required." },
        { status: 400 }
      );
    }

    const subjects = Array.isArray(body?.subjects) && body.subjects.every((s) => typeof s === "string")
      ? body.subjects.map((s: string) => s.trim()).filter(Boolean)
      : parseList(typeof body?.subjects === "string" ? body.subjects : "");

    const strongSubjects = Array.isArray(body?.strongSubjects) && body.strongSubjects.every((s) => typeof s === "string")
      ? body.strongSubjects.map((s: string) => s.trim()).filter(Boolean)
      : parseList(typeof body?.strongSubjects === "string" ? body.strongSubjects : "");

    const weakSubjects = Array.isArray(body?.weakSubjects) && body.weakSubjects.every((s) => typeof s === "string")
      ? body.weakSubjects.map((s: string) => s.trim()).filter(Boolean)
      : parseList(typeof body?.weakSubjects === "string" ? body.weakSubjects : "");

    const input: PreparationInput = {
      targetExam,
      examDate,
      currentLevel,
      availableHoursPerDay,
      daysPerWeek,
      subjects,
      strongSubjects,
      weakSubjects,
      previousPreparation,
      targetScore,
      multiExamStatus,
      adaptiveNote: adaptiveNote || undefined,
    };

    const userPrompt = buildUserPrompt(input);
    const plan = await directJson<PreparationPlan>(
      SYSTEM_PROMPT,
      userPrompt,
      SCHEMA_HINT,
      isPreparationPlan
    );

    return NextResponse.json({ plan });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Preparation simulation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
