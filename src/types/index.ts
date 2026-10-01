// ============================================================
// Shared types for the AI Exam Intelligence Platform
// All AI responses are strictly typed (no free-form AI in UI)
// ============================================================

export type SourceType =
  | "OFFICIAL"
  | "UPLOADED_DOCUMENT"
  | "SEARCH_SOURCE"
  | "USER_INPUT"
  | "AI_ANALYSIS"
  | "AI_GENERATED";

export interface SourceRef {
  type: SourceType;
  label: string; // e.g. "Official website", "Page 12", "AI Analysis"
  detail?: string;
}

// ---------- Exam Research ----------
export interface ExamBasicInfo {
  name: string;
  conductingOrganisation: string;
  examPurpose: string;
  officialWebsite?: string;
  examFrequency: string;
  cycleInfo: string;
  qualification: string;
  ageLimit: string;
  nationality: string;
  importantEligibility: string[];
  infoCurrency: string; // "current" | "historical" | "mixed"
}

export interface ExamStage {
  name: string;
  description: string;
  sequence: number;
  details?: string[];
}

export interface SyllabusTopic {
  name: string;
  description?: string;
  subtopics: SyllabusSubtopic[];
  examRelevance?: string;
  difficulty?: "Easy" | "Medium" | "Hard" | "Mixed";
}

export interface SyllabusSubtopic {
  name: string;
  concepts: string[];
  prerequisites?: string[];
  relatedConcepts?: string[];
  questionTypes?: string[];
  difficulty?: "Easy" | "Medium" | "Hard";
  pyqReference?: string;
}

export interface ExamPattern {
  totalQuestions: number;
  maxMarks: number;
  duration: string;
  questionType: string;
  markingScheme: string;
  negativeMarking: string;
  sectionDistribution: { section: string; questions: number; marks: number }[];
  sectionalTiming: string;
  qualifyingRequirements: string[];
  stageSpecificRules?: string[];
}

export interface CareerInfo {
  posts: string[];
  departments: string[];
  jobRoles: string[];
  payLevel: string;
  basicSalary?: string;
  allowances?: string[];
  careerProgression: string;
  workProfile: string;
  posting?: string;
}

export interface PreparationInfo {
  difficultyCharacteristics: string;
  frequentlyTestedTopics: string[];
  importantSubjects: string[];
  commonMistakes: string[];
  recommendedSequence: string[];
  pyqImportance: string;
  topicDependencies: string[];
  highPriorityPrerequisites: string[];
}

export interface ExamResearchReport {
  basicInfo: ExamBasicInfo;
  stages: ExamStage[];
  syllabus: { subject: string; topics: SyllabusTopic[] }[];
  pattern: ExamPattern;
  career?: CareerInfo;
  preparation: PreparationInfo;
  sources: SourceRef[];
  generatedAt: string;
  caveats: string[]; // what couldn't be verified
}

// ---------- Exam Comparison ----------
export interface ExamComparisonRow {
  attribute: string;
  values: string[]; // one per exam, aligned with examNames
}

export interface CommonSyllabus {
  commonTopics: string[];
  examSpecific: { exam: string; topics: string[] }[];
}

export interface OverlapAnalysis {
  overlapCategories: {
    category: "Very High" | "High" | "Moderate" | "Limited";
    topic: string;
    reason: string;
  }[];
  existingPreparation: string[];
  additionalPreparation: { topic: string; reason: string }[];
}

export interface ExamComparisonReport {
  examNames: string[];
  comparison: ExamComparisonRow[];
  commonSyllabus: CommonSyllabus;
  overlap: OverlapAnalysis;
  careerPathways: string[];
  prerequisiteDifferences: string[];
  sources: SourceRef[];
  generatedAt: string;
}

// ---------- Dependency Map ----------
export interface DependencyNode {
  id: string;
  topic: string;
  subtopic?: string;
  concept?: string;
  difficulty?: string;
  prerequisites: string[]; // ids
  dependents: string[]; // ids
  examRelevance?: string;
  mastery: "Not Started" | "Introduced" | "Learning" | "Practicing" | "Weak" | "Improving" | "Strong" | "Mastered";
  level: number; // depth in graph
}

export interface PrerequisiteGap {
  missingPrerequisite: string;
  whyItMatters: string;
  recommendedSequence: string[];
  practiceRecommendations: string[];
  estimatedEffort?: string;
}

export interface DependencyMapReport {
  root: string;
  nodes: DependencyNode[];
  gaps: PrerequisiteGap[];
  recommendedLearningSequence: string[];
  sources: SourceRef[];
  generatedAt: string;
}

// ---------- Question Explainer ----------
export interface QuestionExplanation {
  originalQuestion: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  concept?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  questionType?: string;
  relatedConcepts?: string[];
  prerequisites?: string[];
  levels: {
    level1_quickHint: string;
    level2_concept: {
      conceptName: string;
      coreRule: string;
      whyItApplies: string;
      shortcut?: string;
      commonMistake?: string;
    };
    level3_detailedSolution: {
      steps: string[];
      formula?: string;
      substitution?: string;
      calculation?: string;
      finalAnswer: string;
      explanation: string;
    };
    level4_examShortcut?: {
      method: string;
      mentalCalculation?: string;
      eliminationTechnique?: string;
      timeSavingApproach: string;
    };
    level5_learningInsight: string;
  };
  sources: SourceRef[];
  generatedAt: string;
}

// ---------- Question Evolution ----------
export type EvolutionLevel = 1 | 2 | 3 | 4 | 5;

export interface EvolvedQuestion {
  level: EvolutionLevel;
  levelName: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  shortcut?: string;
  commonTrap?: string;
  validationStatus: "verified" | "needs-review";
  validationNotes?: string[];
}

export interface QuestionEvolutionReport {
  sourceQuestion: string;
  coreConcept: string;
  subject: string;
  topic: string;
  subtopic?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  variants: EvolvedQuestion[];
  lineage: string; // explanation of source -> variants
  sources: SourceRef[];
  generatedAt: string;
}

// ---------- Question Paper ----------
export interface GeneratedQuestion {
  id: string;
  section: string;
  questionNumber: number;
  questionType: "MCQ" | "Multiple Correct" | "Assertion & Reason" | "Match the Following" | "Statement-based" | "True/False";
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  marks: number;
  negativeMarks: number;
  explanation: string;
  sourceType: SourceType;
}

export interface GeneratedPaper {
  examName: string;
  mode: "Exam Simulation" | "Weakness-Focused" | "Balanced Practice" | "Concept Mastery" | "PYQ-Inspired" | "Mixed Difficulty";
  totalQuestions: number;
  durationMinutes: number;
  sections: {
    name: string;
    questions: number;
    marksPerQuestion: number;
    negativeMarking: number;
  }[];
  questions: GeneratedQuestion[];
  markingScheme: string;
  sources: SourceRef[];
  generatedAt: string;
  disclaimer: string;
}

// ---------- PDF Analysis ----------
export interface PdfAnalysisReport {
  documentOverview: {
    title: string;
    organisation?: string;
    exam?: string;
    year?: string;
    documentType: string;
    numberOfPages: number;
    importantSections: string[];
  };
  extractedInformation: {
    category: string;
    content: string;
    sourcePage?: number;
    sourceSection?: string;
  }[];
  topics: string[];
  wordCount: number;
  ocrUsed: boolean;
  ocrWarning?: string;
  sources: SourceRef[];
  generatedAt: string;
}

// ---------- MCQ Generation ----------
export interface GeneratedMCQ {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  sourcePassage?: string;
  sourcePage?: number;
  sourceType: SourceType;
  validationStatus: "verified" | "needs-review";
}

export interface MCQSet {
  source: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  questionCount: number;
  questionType: string;
  mode: "Strict PDF Mode" | "Source + Exam Mode" | "Practice Mode" | "Evolution Mode";
  mcqs: GeneratedMCQ[];
  sources: SourceRef[];
  generatedAt: string;
}

// ---------- Preparation Simulator ----------
export interface PreparationPhase {
  phase: number;
  name: string;
  goal: string;
  duration: string;
  tasks: string[];
}

export interface DailyPlan {
  day: number;
  date: string;
  sessions: { subject: string; topic: string; durationHours: number; activity: string }[];
  totalHours: number;
  notes?: string;
}

export interface PreparationPlan {
  targetExam: string;
  examDate: string;
  currentLevel: string;
  availableHoursPerDay: number;
  daysPerWeek: number;
  targetScore?: string;
  totalDays: number;
  phases: PreparationPhase[];
  dailyPlans: DailyPlan[];
  weakSubjects: string[];
  strongSubjects: string[];
  revisionSchedule: string[];
  mockTestSchedule: string[];
  adaptiveNotes: string[];
  sources: SourceRef[];
  generatedAt: string;
}

// ---------- Multi-Exam Optimizer ----------
export interface MultiExamMap {
  common: string[];
  examSpecific: { exam: string; priority: "Primary" | "Secondary" | "Backup"; topics: string[] }[];
}

export interface CombinedStrategy {
  commonPreparation: string[];
  examSpecificPreparation: { exam: string; topics: string[] }[];
  priority: string[];
  dependencies: string[];
  scheduling: string[];
  revision: string[];
  mockTesting: string[];
}

export interface MultiExamConflict {
  type: string;
  description: string;
  reason: string;
}

export interface MultiExamPlan {
  exams: { name: string; priority: "Primary" | "Secondary" | "Backup"; date?: string; targetScore?: string }[];
  availableHours: number;
  knowledgeMap: MultiExamMap;
  combinedStrategy: CombinedStrategy;
  conflicts: MultiExamConflict[];
  weeklySchedule: { day: string; sessions: string[] }[];
  sources: SourceRef[];
  generatedAt: string;
}

// ---------- Performance Analysis ----------
export interface PerformanceAnalysis {
  score: number;
  maxMarks: number;
  accuracy: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  timeUsed: string;
  avgTimePerQuestion: string;
  topicWise: { topic: string; correct: number; total: number; accuracy: number }[];
  difficultyWise: { difficulty: string; correct: number; total: number; accuracy: number }[];
  questionTypeWise: { type: string; correct: number; total: number; accuracy: number }[];
  negativeMarkImpact: number;
  strengths: string[];
  weakAreas: string[];
  conceptualErrors: string[];
  calculationErrors: string[];
  questionSelectionErrors: string[];
  recommendedPractice: string[];
  generatedAt: string;
}

// ---------- Chat ----------
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// ---------- Saved Research ----------
export type SavedType =
  | "exam"
  | "comparison"
  | "dependency"
  | "explanation"
  | "evolution"
  | "paper"
  | "pdf"
  | "mcq"
  | "preparation"
  | "multi-exam"
  | "note";

export interface SavedItem {
  id: string;
  type: SavedType;
  title: string;
  summary: string;
  data: unknown;
  createdAt: string;
}
