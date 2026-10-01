"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  Sparkles,
  Bookmark,
  Building2,
  Layers,
  BookOpen,
  ClipboardList,
  Briefcase,
  Compass,
  AlertTriangle,
  ExternalLink,
  CalendarClock,
  GraduationCap,
  Award,
  Users,
  Clock,
  Target,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import { useApi } from "@/hooks/use-api";
import { useAppStore } from "@/store/app-store";
import type { ExamResearchReport, ExamStage, SyllabusTopic, SyllabusSubtopic } from "@/types";
import { SourceBadgeList } from "@/components/shared/source-badge";
import { LoadingState, EmptyState } from "@/components/shared/states";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const QUICK_EXAMS = ["SSC CGL", "GATE CS", "UPSC CSE", "RRB JE", "CAT"];

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Hard: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  Mixed: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
};

const CURRENCY_STYLE: Record<string, string> = {
  current: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  historical: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  mixed: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
};

function DifficultyBadge({ value }: { value?: string }) {
  if (!value) return null;
  const cls = DIFFICULTY_STYLE[value] ?? DIFFICULTY_STYLE.Medium;
  return <Badge variant="outline" className={`font-normal ${cls}`}>{value}</Badge>;
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
      {label}
    </span>
  );
}

function ChipList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((c, i) => <Chip key={i} label={c} />)}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

// ---------- Subcomponents ----------

function BasicInfoCard({ report }: { report: ExamResearchReport }) {
  const b = report.basicInfo;
  const currency = b.infoCurrency ?? "mixed";
  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{b.name}</CardTitle>
            <CardDescription className="mt-1">{b.examPurpose}</CardDescription>
          </div>
          <Badge variant="outline" className={`font-normal ${CURRENCY_STYLE[currency] ?? CURRENCY_STYLE.mixed}`}>
            {currency} info
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <InfoRow icon={Building2} label="Conducting Organisation" value={b.conductingOrganisation} />
          <InfoRow icon={CalendarClock} label="Frequency" value={b.examFrequency} />
          <InfoRow icon={RefreshCw} label="Cycle" value={b.cycleInfo} />
          <InfoRow icon={GraduationCap} label="Qualification" value={b.qualification} />
          <InfoRow icon={Users} label="Age Limit" value={b.ageLimit} />
          <InfoRow icon={Award} label="Nationality" value={b.nationality} />
        </div>

        {b.officialWebsite && (
          <a
            href={b.officialWebsite}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Official Website
          </a>
        )}

        {b.importantEligibility && b.importantEligibility.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Important Eligibility</p>
            <ul className="space-y-1">
              {b.importantEligibility.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium leading-snug break-words">{value}</p>
      </div>
    </div>
  );
}

function StagesTimeline({ stages }: { stages: ExamStage[] }) {
  const sorted = [...stages].sort((a, b) => a.sequence - b.sequence);
  return (
    <div className="relative">
      {/* vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-500/40 via-fuchsia-500/30 to-transparent" />
      <div className="space-y-4">
        {sorted.map((s, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.04 }}
            className="relative pl-10"
          >
            <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-violet-500/40 bg-background text-xs font-semibold text-violet-600 dark:text-violet-400 shadow-sm">
              {s.sequence}
            </div>
            <div className="rounded-lg border border-border bg-card/60 p-3 hover:border-violet-500/30 transition-colors">
              <p className="font-medium text-sm">{s.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
              {s.details && s.details.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {s.details.map((d, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <ChevronRight className="h-3 w-3 mt-0.5 text-violet-500/70 shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SubtopicCard({ sub }: { sub: SyllabusSubtopic }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{sub.name}</p>
        <DifficultyBadge value={sub.difficulty} />
      </div>
      {sub.concepts && sub.concepts.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Concepts</p>
          <ChipList items={sub.concepts} />
        </div>
      )}
      {sub.prerequisites && sub.prerequisites.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Prerequisites</p>
          <ChipList items={sub.prerequisites} />
        </div>
      )}
      {sub.questionTypes && sub.questionTypes.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Question Types</p>
          <ChipList items={sub.questionTypes} />
        </div>
      )}
      {sub.pyqReference && (
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium">PYQ:</span> {sub.pyqReference}
        </p>
      )}
    </div>
  );
}

function SubjectAccordion({ topics }: { topics: SyllabusTopic[] }) {
  return (
    <Accordion type="multiple" className="w-full">
      {topics.map((t, i) => (
        <AccordionItem key={i} value={`topic-${i}`} className="border-border/60">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2 pr-2 flex-1">
              <span className="font-medium text-sm text-left">{t.name}</span>
              {t.difficulty && <DifficultyBadge value={t.difficulty} />}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {t.description && (
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{t.description}</p>
            )}
            {t.examRelevance && (
              <p className="text-[11px] mb-2">
                <span className="font-medium text-violet-600 dark:text-violet-400">Relevance: </span>
                <span className="text-muted-foreground">{t.examRelevance}</span>
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {t.subtopics.map((s, j) => (
                <SubtopicCard key={j} sub={s} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function SyllabusSection({ syllabus }: { syllabus: ExamResearchReport["syllabus"] }) {
  return (
    <div className="space-y-4">
      {syllabus.map((sub, i) => (
        <Card key={i} className="py-4">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-500" />
              <CardTitle className="text-sm">{sub.subject}</CardTitle>
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {sub.topics.length} topics
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <SubjectAccordion topics={sub.topics} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PatternSection({ pattern }: { pattern: ExamResearchReport["pattern"] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill icon={Target} label="Questions" value={String(pattern.totalQuestions)} />
        <StatPill icon={Award} label="Max Marks" value={String(pattern.maxMarks)} />
        <StatPill icon={Clock} label="Duration" value={pattern.duration} />
        <StatPill icon={ClipboardList} label="Question Type" value={pattern.questionType} />
      </div>

      {pattern.sectionDistribution && pattern.sectionDistribution.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Section</TableHead>
                <TableHead className="text-right">Questions</TableHead>
                <TableHead className="text-right">Marks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pattern.sectionDistribution.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{s.section}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.questions}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.marks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <InfoRow icon={Award} label="Marking Scheme" value={pattern.markingScheme} />
        <InfoRow icon={AlertTriangle} label="Negative Marking" value={pattern.negativeMarking} />
        <InfoRow icon={Clock} label="Sectional Timing" value={pattern.sectionalTiming} />
      </div>

      {pattern.qualifyingRequirements && pattern.qualifyingRequirements.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Qualifying Requirements</p>
          <ul className="space-y-1">
            {pattern.qualifyingRequirements.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pattern.stageSpecificRules && pattern.stageSpecificRules.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Stage-Specific Rules</p>
          <ChipList items={pattern.stageSpecificRules} />
        </div>
      )}
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold break-words">{value}</p>
    </div>
  );
}

function CareerSection({ career }: { career: NonNullable<ExamResearchReport["career"]> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <InfoRow icon={Award} label="Pay Level" value={career.payLevel} />
        {career.basicSalary && <InfoRow icon={Award} label="Basic Salary" value={career.basicSalary} />}
        {career.posting && <InfoRow icon={Briefcase} label="Posting" value={career.posting} />}
      </div>

      {career.posts && career.posts.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Posts</p>
          <ChipList items={career.posts} />
        </div>
      )}
      {career.departments && career.departments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Departments</p>
          <ChipList items={career.departments} />
        </div>
      )}
      {career.jobRoles && career.jobRoles.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Job Roles</p>
          <ChipList items={career.jobRoles} />
        </div>
      )}
      {career.allowances && career.allowances.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Allowances</p>
          <ChipList items={career.allowances} />
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Work Profile</p>
          <p className="mt-0.5">{career.workProfile}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Career Progression</p>
          <p className="mt-0.5">{career.careerProgression}</p>
        </div>
      </div>
    </div>
  );
}

function PreparationSection({ prep }: { prep: ExamResearchReport["preparation"] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Difficulty Characteristics</p>
        <p>{prep.difficultyCharacteristics}</p>
      </div>

      {prep.frequentlyTestedTopics && prep.frequentlyTestedTopics.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Frequently Tested Topics</p>
          <ChipList items={prep.frequentlyTestedTopics} />
        </div>
      )}

      {prep.importantSubjects && prep.importantSubjects.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Important Subjects</p>
          <ChipList items={prep.importantSubjects} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {prep.commonMistakes && prep.commonMistakes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Common Mistakes</p>
            <ul className="space-y-1">
              {prep.commonMistakes.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-rose-500 shrink-0" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {prep.recommendedSequence && prep.recommendedSequence.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Recommended Sequence</p>
            <ol className="space-y-1">
              {prep.recommendedSequence.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">PYQ Importance</p>
          <p className="mt-0.5">{prep.pyqImportance}</p>
        </div>
        {prep.topicDependencies && prep.topicDependencies.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Topic Dependencies</p>
            <ChipList items={prep.topicDependencies} />
          </div>
        )}
      </div>

      {prep.highPriorityPrerequisites && prep.highPriorityPrerequisites.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">High-Priority Prerequisites</p>
          <ChipList items={prep.highPriorityPrerequisites} />
        </div>
      )}
    </div>
  );
}

function Caveats({ caveats }: { caveats: string[] }) {
  if (!caveats || caveats.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Caveats — couldn't be verified</p>
          <ul className="mt-1.5 space-y-1">
            {caveats.map((c, i) => (
              <li key={i} className="text-xs text-amber-700/80 dark:text-amber-300/80 flex items-start gap-1.5">
                <span className="text-amber-500/60">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------- Main View ----------

export function ExamResearcher() {
  const { call } = useApi();
  const setContext = useAppStore((s) => s.setContext);
  const saveItem = useAppStore((s) => s.saveItem);

  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ExamResearchReport | null>(null);

  const onResearch = useCallback(async (q?: string) => {
    const target = (q ?? query).trim();
    if (!target) return;
    setQuery(target);
    setActiveQuery(target);
    setLoading(true);
    setReport(null);
    const res = await call<{ report: ExamResearchReport }>(`/api/exam/research`, { query: target });
    setLoading(false);
    if (res?.report) {
      setReport(res.report);
      setContext(res.report.basicInfo.name, "exam");
    }
  }, [call, query, setContext]);

  const onQuick = (exam: string) => {
    setQuery(exam);
    void onResearch(exam);
  };

  const onSave = useCallback(() => {
    if (!report) return;
    const name = report.basicInfo.name;
    saveItem({
      type: "exam",
      title: name,
      summary: `Researcher report on ${name}`,
      data: report,
    });
    toast.success("Saved to My Research", { description: name });
  }, [report, saveItem]);

  const hasReport = !!report;

  const sections = useMemo(() => {
    if (!report) return [];
    const list = [
      { key: "basic", node: <BasicInfoCard report={report} /> },
      { key: "stages", title: "Exam Stages", icon: Layers, node: <StagesTimeline stages={report.stages} /> },
      { key: "syllabus", title: "Syllabus Intelligence", desc: "Subjects, topics, subtopics, concepts, prerequisites", icon: BookOpen, node: <SyllabusSection syllabus={report.syllabus} /> },
      { key: "pattern", title: "Exam Pattern", desc: "Sections, marking scheme, timing, qualifying rules", icon: ClipboardList, node: <PatternSection pattern={report.pattern} /> },
    ];
    if (report.career) {
      list.push({ key: "career", title: "Career Information", desc: "Posts, departments, pay, progression", icon: Briefcase, node: <CareerSection career={report.career} /> } as any);
    }
    list.push({ key: "prep", title: "Preparation Intelligence", desc: "Difficulty, sequence, mistakes, PYQs", icon: Compass, node: <PreparationSection prep={report.preparation} /> } as any);
    return list;
  }, [report]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-40" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
              <Search className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Exam Researcher</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Give me an exam — get a structured intelligence report: eligibility, stages, syllabus, pattern, career, preparation.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <Card className="mb-6 border-violet-500/15 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5">
        <CardContent className="pt-4">
          <form
            onSubmit={(e) => { e.preventDefault(); void onResearch(); }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. SSC CGL, GATE Mechanical Engineering, RRB JE..."
                className="pl-9 h-10"
                aria-label="Exam name"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || query.trim().length < 2}
              className="h-10 sm:px-6 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Research
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[11px] text-muted-foreground self-center mr-1">Quick:</span>
            {QUICK_EXAMS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => onQuick(ex)}
                disabled={loading}
                className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-violet-600 dark:hover:text-violet-400 transition-colors disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Body */}
      {!hasReport && !loading && (
        <EmptyState
          icon={Search}
          title="Research any competitive exam"
          description="Type an exam name above or pick a quick chip. We'll produce a full intelligence report — eligibility, stages, syllabus, pattern, career and preparation guidance."
        />
      )}

      {loading && (
        <Card className="py-8">
          <CardContent>
            <LoadingState label={`Researching "${activeQuery}" — pulling eligibility, stages, syllabus, pattern, career & preparation...`} />
          </CardContent>
        </Card>
      )}

      {hasReport && report && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Action bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Report generated for <span className="font-medium text-foreground">{report.basicInfo.name}</span>
              {report.generatedAt && (
                <> · {new Date(report.generatedAt).toLocaleString()}</>
              )}
            </p>
            <Button
              onClick={onSave}
              size="sm"
              variant="outline"
              className="gap-1.5 hover:border-violet-500/40 hover:bg-violet-500/5"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Save to My Research
            </Button>
          </div>

          {sections.map((sec) => (
            <motion.div
              key={sec.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {sec.key === "basic" ? (
                sec.node
              ) : (
                <Card className="py-4">
                  <CardHeader className="pb-3">
                    {sec.title && (
                      <SectionHeader icon={sec.icon!} title={sec.title} description={sec.desc} />
                    )}
                  </CardHeader>
                  <CardContent>{sec.node}</CardContent>
                </Card>
              )}
            </motion.div>
          ))}

          {/* Sources */}
          <Card className="py-4">
            <CardHeader className="pb-3">
              <SectionHeader icon={Sparkles} title="Sources & Provenance" description="Every claim is tagged by origin" />
            </CardHeader>
            <CardContent>
              <SourceBadgeList sources={report.sources} />
            </CardContent>
          </Card>

          {/* Caveats */}
          {report.caveats && report.caveats.length > 0 && (
            <Caveats caveats={report.caveats} />
          )}
        </motion.div>
      )}
    </div>
  );
}
