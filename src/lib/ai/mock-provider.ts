// ============================================================
// Mock Provider — graceful fallback when no AI key is configured
// ============================================================
// Produces structured, realistic-looking sample data so the entire
// UI is explorable. On Vercel, once OPENAI_API_KEY is set, the
// real AI provider takes over automatically.
// ============================================================
import type { LLMProvider, ChatCompletionMessage } from "./provider";
import { extractJson } from "./provider";
import { SEED_FORMULAS } from "@/store/formula-seed";

export class MockProvider implements LLMProvider {
  name = "mock (no API key configured)";
  available = false;

  async text(_system: string, _user: string): Promise<string> {
    throw new Error("No AI provider configured. Set OPENAI_API_KEY on Vercel to enable AI features.");
  }

  async json<T>(system: string, user: string, schemaHint?: string): Promise<T> {
    // Route primarily on the SCHEMA HINT (most reliable signal of expected shape),
    // falling back to combined keyword search. This avoids mis-routing when a system
    // prompt for one feature mentions words like "prerequisite" or "dependency".
    const schema = (schemaHint ?? "").toLowerCase();
    const req = (system + " " + user).toLowerCase();

    if (schema.includes("examresearchreport") || req.includes("exam intelligence researcher") || req.includes("examresearch")) {
      return mockExamResearch(user) as unknown as T;
    }
    if (schema.includes("examcomparisonreport") || req.includes("exam comparison engine") || req.includes("examcomparison")) {
      return mockExamComparison(user) as unknown as T;
    }
    if (schema.includes("dependencymapreport") || req.includes("dependency mapper") || req.includes("prerequisite-dependency mapper")) {
      return mockDependencyMap(user) as unknown as T;
    }
    if (schema.includes("questionexplanation") || req.includes("progressive question explainer") || req.includes("questionexplanation")) {
      return mockQuestionExplanation(user) as unknown as T;
    }
    if (schema.includes("questionevolutionreport") || req.includes("question evolution engine") || req.includes("questionevolution")) {
      return mockQuestionEvolution(user) as unknown as T;
    }
    if (schema.includes("generatedpaper") || req.includes("personalized question paper generator")) {
      return mockPaper(user) as unknown as T;
    }
    if (schema.includes("mcqset") || req.includes("grounded mcq generator")) {
      return mockMCQ(user) as unknown as T;
    }
    if (schema.includes("pdfanalysisreport") || req.includes("pdf exam analyzer")) {
      return mockPdfAnalysis(user) as unknown as T;
    }
    if (schema.includes("preparationplan") || req.includes("adaptive preparation simulator")) {
      return mockPreparation(user) as unknown as T;
    }
    if (schema.includes("multiexamplan") || req.includes("multi-exam preparation optimizer")) {
      return mockMultiExam(user) as unknown as T;
    }
    if (schema.includes("performanceanalysis") || req.includes("performance analysis")) {
      return mockPerformance(user) as unknown as T;
    }
    if (schema.includes("flashcardset") || req.includes("flashcard generator")) {
      return mockFlashcards(user) as unknown as T;
    }
    if (schema.includes("formulasheet") || req.includes("formula lookup")) {
      return mockFormulasLookup(user) as unknown as T;
    }
    if (schema.includes("pyqset") || schema.includes("pyqlist") || req.includes("pyq browser") || req.includes("similar-question finder")) {
      return mockPYQs(user) as unknown as T;
    }
    if (schema.includes("examstrategy") || req.includes("exam-day strategist") || req.includes("exam strategy guide")) {
      return mockExamStrategy(user) as unknown as T;
    }
    // generic fallback
    return extractJson<T>(`{"note":"Mock provider active. Configure OPENAI_API_KEY on Vercel for real AI.","prompt":${JSON.stringify(user.slice(0,200))}}`);
  }

  async chat(messages: ChatCompletionMessage[]): Promise<string> {
    const last = messages[messages.length - 1]?.content ?? "";
    return `**Mock mode active.** I received your message: "${last.slice(0, 150)}".\n\nTo enable real AI responses, set \`OPENAI_API_KEY\` in your Vercel project's Environment Variables. See the "API Keys" guide in the footer.`;
  }
}

// ----- canned structured responses (so the UI is fully explorable) -----
function mockExamResearch(query: string): unknown {
  // Extract exam name from the user prompt. The prompt is multi-line like:
  //   Research the competitive exam: "SSC CGL"\n\nProduce a complete...
  // Try to grab the quoted name first, then fall back to cleaning.
  let examName = "SSC CGL";
  const quoted = query.match(/"([^"]+)"/);
  if (quoted && quoted[1]) {
    examName = quoted[1].trim();
  } else {
    // Try first line after "exam:" or similar
    const m = query.match(/exam[:\s]+([^\n]+)/i);
    if (m && m[1]) examName = m[1].replace(/[^\w\s&.-]/g, "").trim().slice(0, 50);
    if (!examName) examName = "SSC CGL";
  }
  return {
    basicInfo: {
      name: examName,
      conductingOrganisation: "Staff Selection Commission",
      examPurpose: "Recruitment to Group B and C posts in various ministries/departments of the Government of India",
      officialWebsite: "https://ssc.gov.in",
      examFrequency: "Annual",
      cycleInfo: "Usually notified in June-July, conducted in July-August (Tier 1)",
      qualification: "Bachelor's degree from a recognised university",
      ageLimit: "18-32 years (relaxation for reserved categories)",
      nationality: "Indian citizen",
      importantEligibility: ["Bachelor's degree (for Assistant Audit Officer: desirable Commerce/Mathematics/Statistics)", "Age as on cut-off date"],
      infoCurrency: "current",
    },
    stages: [
      { name: "Tier 1 (Preliminary)", description: "Objective computer-based test, qualifying in nature", sequence: 1, details: ["4 sections of 25 questions each", "Total 100 questions, 200 marks", "60 minutes"] },
      { name: "Tier 2 (Mains)", description: "Objective + descriptive computer-based exam", sequence: 2, details: ["Paper 1: compulsory", "Paper 2: Statistics (for JSO)", "Paper 3: Assistant Audit Officer"] },
      { name: "Document Verification", description: "Verification of eligibility documents", sequence: 3 },
      { name: "Final Selection", description: "Merit based on Tier 2", sequence: 4 },
    ],
    syllabus: [
      {
        subject: "Quantitative Aptitude",
        topics: [
          { name: "Arithmetic", subtopics: [{ name: "Percentage", concepts: ["Base value", "Successive percentage", "Percentage change"], prerequisites: ["Fractions", "Decimals"], difficulty: "Easy" }, { name: "Profit & Loss", concepts: ["CP", "SP", "Discount", "Marked price"], prerequisites: ["Percentage"], difficulty: "Medium" }, { name: "Ratio & Proportion", concepts: ["Compound ratio", "Variation"], difficulty: "Easy" }] },
          { name: "Algebra", subtopics: [{ name: "Linear Equations", concepts: ["One variable", "Two variables"], difficulty: "Medium" }] },
        ],
      },
      { subject: "General Intelligence & Reasoning", topics: [{ name: "Verbal Reasoning", subtopics: [{ name: "Series", concepts: ["Number series", "Letter series"] }], examRelevance: "High" }] },
      { subject: "English Language", topics: [{ name: "Reading Comprehension", subtopics: [{ name: "Passage", concepts: ["Inference", "Vocabulary"] }] }] },
      { subject: "General Awareness", topics: [{ name: "Current Affairs", subtopics: [{ name: "National & International", concepts: ["Last 6 months"] }] }] },
    ],
    pattern: {
      totalQuestions: 100,
      maxMarks: 200,
      duration: "60 minutes",
      questionType: "Objective MCQ",
      markingScheme: "+2 per correct",
      negativeMarking: "0.5 per incorrect",
      sectionDistribution: [
        { section: "General Intelligence & Reasoning", questions: 25, marks: 50 },
        { section: "General Awareness", questions: 25, marks: 50 },
        { section: "Quantitative Aptitude", questions: 25, marks: 50 },
        { section: "English Comprehension", questions: 25, marks: 50 },
      ],
      sectionalTiming: "No sectional timing (combined 60 min)",
      qualifyingRequirements: ["Category-wise cut-off", "Sectional cut-off applies"],
    },
    career: {
      posts: ["Assistant Audit Officer", "Assistant Accounts Officer", "Inspector (Income Tax)", "Assistant (CSS)", "Auditor"],
      departments: ["CBDT", "CBIC", "Ministry of Railways", "Ministry of External Affairs"],
      jobRoles: ["Assistant", "Inspector", "Auditor", "Accountant"],
      payLevel: "Level 4 to Level 8 (Pay Matrix)",
      basicSalary: "₹25,500 to ₹47,600",
      allowances: ["DA", "HRA", "Transport Allowance"],
      careerProgression: "Departmental promotions to Section Officer, Under Secretary etc.",
      workProfile: "Administrative, audit, and inspection roles",
    },
    preparation: {
      difficultyCharacteristics: "Moderate to Difficult",
      frequentlyTestedTopics: ["Percentage", "Profit & Loss", "Series", "Reading Comprehension"],
      importantSubjects: ["Quantitative Aptitude", "Reasoning"],
      commonMistakes: ["Neglecting current affairs", "Time management in Tier 1", "Ignoring negative marking"],
      recommendedSequence: ["Arithmetic foundations", "Reasoning practice", "English daily reading", "Current affairs ongoing"],
      pyqImportance: "Very high — last 5 years PYQs cover ~70% pattern",
      topicDependencies: ["Percentage → Profit & Loss", "Ratio → Mixture"],
      highPriorityPrerequisites: ["Tables & quick calculation", "Reading speed"],
    },
    sources: [
      { type: "AI_ANALYSIS", label: "AI Analysis", detail: "Based on publicly known exam structure" },
      { type: "OFFICIAL", label: "Official website", detail: "ssc.gov.in" },
    ],
    generatedAt: new Date().toISOString(),
    caveats: ["Mock data — verify with latest official notification", "Specific dates vary by cycle"],
  };
}

function mockExamComparison(query: string): unknown {
  // Extract exam names from the query. The route sends them as a JSON array.
  let examNames: string[] = ["SSC CGL", "SSC CHSL", "RRB NTPC"];
  const arrMatch = query.match(/\[([^\]]+)\]/);
  if (arrMatch) {
    try {
      const parsed = JSON.parse("[" + arrMatch[1] + "]");
      if (Array.isArray(parsed) && parsed.length >= 2) examNames = parsed.map(String);
    } catch {}
  }
  const q = query.toLowerCase();
  const isGATE = examNames.some((e) => e.toLowerCase().includes("gate"));
  const isSSC = examNames.some((e) => e.toLowerCase().includes("ssc") || e.toLowerCase().includes("cgl") || e.toLowerCase().includes("chsl"));
  const isBanking = examNames.some((e) => e.toLowerCase().includes("bank") || e.toLowerCase().includes("ibps") || e.toLowerCase().includes("sbi") || e.toLowerCase().includes("po"));

  if (isGATE) {
    return {
      examNames,
      comparison: [
        { attribute: "Qualification", values: examNames.map(() => "Bachelor's in Engineering/Technology") },
        { attribute: "Age Limit", values: examNames.map(() => "No upper limit") },
        { attribute: "Stages", values: examNames.map(() => "Single CBT") },
        { attribute: "Questions", values: examNames.map(() => "65") },
        { attribute: "Max Marks", values: examNames.map(() => "100") },
        { attribute: "Duration", values: examNames.map(() => "180 min (3h)") },
        { attribute: "Negative Marking", values: examNames.map(() => "1/3 for 1-mark, 2/3 for 2-mark") },
        { attribute: "Difficulty", values: examNames.map(() => "High (technical + aptitude)") },
      ],
      commonSyllabus: {
        commonTopics: ["Engineering Mathematics", "General Aptitude", "Verbal Ability", "Numerical Ability", "Logical Reasoning"],
        examSpecific: examNames.map((e) => ({
          exam: e,
          topics: e.toLowerCase().includes("cs") ? ["Data Structures", "Algorithms", "Operating Systems", "DBMS", "Computer Networks", "TOC", "Digital Logic", "Compiler Design"]
            : e.toLowerCase().includes("me") ? ["Thermodynamics", "Fluid Mechanics", "Heat Transfer", "Manufacturing", "Strength of Materials", "Machine Design", "Theory of Machines"]
            : e.toLowerCase().includes("ce") ? ["Structural Analysis", "Geotechnical Eng", "Hydrology", "Environmental Eng", "Transportation"]
            : e.toLowerCase().includes("ec") ? ["Signals & Systems", "Analog Circuits", "Digital Circuits", "Communications", "Electromagnetics"]
            : ["Technical subjects per discipline"],
        })),
      },
      overlap: {
        overlapCategories: [
          { category: "Very High", topic: "Engineering Mathematics", reason: "Common across all GATE papers — Linear Algebra, Calculus, Probability" },
          { category: "Very High", topic: "General Aptitude", reason: "15 marks common section in every GATE paper" },
          { category: "High", topic: "Numerical Ability", reason: "Overlaps with aptitude section across papers" },
          { category: "Limited", topic: "Technical Subjects", reason: "Discipline-specific — minimal overlap between CS, ME, CE, EC" },
        ],
        existingPreparation: ["Engineering Math", "Aptitude", "Verbal Ability"],
        additionalPreparation: examNames.map((e) => ({
          topic: `${e} technical subjects`,
          reason: "Discipline-specific — each GATE paper tests different technical domains",
        })),
      },
      careerPathways: ["GATE → M.Tech at IITs/NITs", "GATE → PSU jobs (IOCL, NTPC, BHEL etc.)", "GATE → Research positions (DRDO, ISRO)"],
      prerequisiteDifferences: ["Different technical syllabi per discipline", "Same aptitude + math foundation"],
      sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
      generatedAt: new Date().toISOString(),
    };
  }

  if (isBanking || (!isSSC && examNames.some((e) => e.toLowerCase().includes("banking")))) {
    return {
      examNames,
      comparison: [
        { attribute: "Qualification", values: examNames.map(() => "Graduation (any discipline)") },
        { attribute: "Age Limit", values: examNames.map(() => "20-30 years") },
        { attribute: "Stages", values: examNames.map(() => "Prelims + Mains + Interview") },
        { attribute: "Negative Marking", values: examNames.map(() => "0.25") },
        { attribute: "Difficulty", values: examNames.map(() => "Moderate-High (speed-focused)") },
      ],
      commonSyllabus: {
        commonTopics: ["Quantitative Aptitude", "Reasoning Ability", "English Language", "Computer Awareness", "Banking Awareness", "General Awareness"],
        examSpecific: [
          { exam: "IBPS PO", topics: ["Descriptive English (essay)", "Interview"] },
          { exam: "SBI PO", topics: ["Descriptive English", "Group Discussion", "Interview"] },
          { exam: "Banking Clerk", topics: ["No interview", "Typing optional"] },
        ].filter((e) => examNames.some((en) => en.toLowerCase().includes(e.exam.toLowerCase().split(" ")[0]))),
      },
      overlap: {
        overlapCategories: [
          { category: "Very High", topic: "Quantitative Aptitude", reason: "Same topics — simplification, DI, arithmetic" },
          { category: "Very High", topic: "Reasoning", reason: "Same puzzles, coding, syllogism patterns" },
          { category: "High", topic: "English", reason: "Reading comprehension, cloze test, error detection" },
          { category: "High", topic: "Banking Awareness", reason: "Common banking/financial awareness section" },
        ],
        existingPreparation: ["Simplification", "DI", "Puzzles", "Reading Comprehension"],
        additionalPreparation: [{ topic: "Descriptive English", reason: "PO exams include essay/letter writing — clerks don't" }],
      },
      careerPathways: ["PO → Probationary Officer → Branch Manager", "Clerk → Assistant → Officer (promotion)", "Specialist Officer → Domain expert roles"],
      prerequisiteDifferences: ["PO includes descriptive paper + interview; Clerk doesn't"],
      sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
      generatedAt: new Date().toISOString(),
    };
  }

  // Default: SSC family comparison
  return {
    examNames,
    comparison: [
      { attribute: "Qualification", values: examNames.map((e) => e.includes("CGL") ? "Graduation" : "12th Pass") },
      { attribute: "Age Limit", values: examNames.map((e) => e.includes("NTPC") ? "18-36" : e.includes("CGL") ? "18-32" : "18-27") },
      { attribute: "Stages", values: examNames.map((e) => e.includes("NTPC") ? "CBT 1, 2, Typing" : "Tier 1, 2, DV") },
      { attribute: "Questions (Tier 1)", values: examNames.map(() => "100") },
      { attribute: "Max Marks", values: examNames.map(() => "200") },
      { attribute: "Negative Marking", values: examNames.map((e) => e.includes("NTPC") ? "0.25" : "0.5") },
      { attribute: "Difficulty", values: examNames.map((e) => e.includes("CGL") ? "Moderate-High" : "Moderate") },
    ],
    commonSyllabus: {
      commonTopics: ["Quantitative Aptitude", "General Intelligence & Reasoning", "English Language", "General Awareness"],
      examSpecific: examNames.map((e) => ({
        exam: e,
        topics: e.includes("CGL") ? ["Statistics (JSO)", "Finance & Economics (AAO)", "Advanced Maths"]
          : e.includes("CHSL") ? ["Typing Test (10 min)"]
          : e.includes("NTPC") ? ["Railway Awareness", "Typing (Junior Clerk)"]
          : ["Exam-specific topics"],
      })),
    },
    overlap: {
      overlapCategories: [
        { category: "Very High", topic: "Quantitative Aptitude (Arithmetic)", reason: "Same core topics: Percentage, Ratio, Profit-Loss, Time-Speed-Distance" },
        { category: "High", topic: "Reasoning", reason: "Similar pattern — series, coding, puzzles. CGL slightly harder." },
        { category: "Moderate", topic: "General Awareness", reason: "Current affairs overlap; CGL needs deeper static GK, NTPC needs railway awareness" },
        { category: "Moderate", topic: "English", reason: "Common grammar + vocab; NTPC has lighter English section" },
      ],
      existingPreparation: ["Percentage", "Ratio & Proportion", "Series", "Reading Comprehension"],
      additionalPreparation: examNames.flatMap((e) =>
        e.includes("CGL") ? [{ topic: "Statistics + Advanced Maths", reason: "CGL Tier 2 includes these — CHSL/NTPC don't" }]
        : e.includes("CHSL") ? [{ topic: "Typing Test", reason: "CHSL requires typing skill — CGL doesn't" }]
        : e.includes("NTPC") ? [{ topic: "Railway Awareness + Typing", reason: "NTPC-specific GK + typing test" }]
        : []
      ),
    },
    careerPathways: examNames.map((e) =>
      e.includes("CGL") ? "CGL → Inspector/Assistant (Group B/C gazetted)"
      : e.includes("CHSL") ? "CHSL → Lower Division Clerk / Data Entry Operator"
      : e.includes("NTPC") ? "NTPC → Railway Clerk / Typist / Station Master"
      : "Government service"
    ),
    prerequisiteDifferences: ["CGL requires graduation; CHSL and NTPC accept 12th pass", "NTPC has lower negative marking (0.25 vs 0.5)", "CHSL + NTPC require typing; CGL doesn't"],
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockDependencyMap(query: string): unknown {
  // Extract the topic from the query (the route wraps it in quotes)
  let topic = "Calculus";
  const m = query.match(/"([^"]+)"/);
  if (m && m[1]) topic = m[1];
  else {
    const m2 = query.match(/(?:input|topic|syllabus)[:\s]+([^\n]+)/i);
    if (m2 && m2[1]) topic = m2[1].replace(/[^\w\s&.-]/g, "").trim().slice(0, 50);
  }
  const t = topic.toLowerCase();

  type Node = { id: string; topic: string; subtopic?: string; concept?: string; prerequisites: string[]; dependents: string[]; mastery: string; level: number; examRelevance?: string; difficulty?: string };
  type Gap = { missingPrerequisite: string; whyItMatters: string; recommendedSequence: string[]; practiceRecommendations: string[]; estimatedEffort: string };

  let root: string;
  let nodes: Node[];
  let gaps: Gap[];
  let sequence: string[];

  if (t.includes("calculus") || t.includes("differential") || t.includes("integration")) {
    root = "Calculus";
    nodes = [
      { id: "calc", topic: "Calculus", prerequisites: [], dependents: ["diff", "int"], mastery: "Learning", level: 0, examRelevance: "High", difficulty: "Medium" },
      { id: "diff", topic: "Differentiation", prerequisites: ["calc"], dependents: ["diffapp", "de"], mastery: "Practicing", level: 1, difficulty: "Medium" },
      { id: "int", topic: "Integration", prerequisites: ["calc"], dependents: ["de"], mastery: "Weak", level: 1, difficulty: "Hard" },
      { id: "diffapp", topic: "Applications of Differentiation", prerequisites: ["diff"], dependents: [], mastery: "Not Started", level: 2, difficulty: "Hard" },
      { id: "de", topic: "Differential Equations", prerequisites: ["diff", "int"], dependents: [], mastery: "Not Started", level: 2, difficulty: "Hard" },
    ];
    gaps = [{ missingPrerequisite: "Integration", whyItMatters: "Required to solve and verify differential equations. You cannot integrate solutions to ODEs without solid integration fundamentals.", recommendedSequence: ["Review Differentiation", "Practice Integration basics", "Indefinite integrals", "Definite integrals", "Integration by substitution", "Start Differential Equations"], practiceRecommendations: ["10 Level-1 integration problems", "5 PYQ integrals", "Integration by parts practice"], estimatedEffort: "~15 hours" }];
    sequence = ["Differentiation", "Integration", "Applications of Differentiation", "Differential Equations"];
  } else if (t.includes("algebra") || t.includes("equation")) {
    root = "Algebra";
    nodes = [
      { id: "basic", topic: "Basic Arithmetic", prerequisites: [], dependents: ["linear"], mastery: "Mastered", level: 0, examRelevance: "Foundation" },
      { id: "linear", topic: "Linear Equations", prerequisites: ["basic"], dependents: ["quad", "simul"], mastery: "Strong", level: 1, difficulty: "Easy" },
      { id: "quad", topic: "Quadratic Equations", prerequisites: ["linear"], dependents: ["ineq"], mastery: "Practicing", level: 2, difficulty: "Medium" },
      { id: "simul", topic: "Simultaneous Equations", prerequisites: ["linear"], dependents: [], mastery: "Learning", level: 2, difficulty: "Medium" },
      { id: "ineq", topic: "Inequalities", prerequisites: ["quad"], dependents: [], mastery: "Not Started", level: 3, difficulty: "Hard" },
    ];
    gaps = [{ missingPrerequisite: "Inequalities", whyItMatters: "Quadratic inequalities are tested extensively and require mastery of quadratic equation roots + sign analysis.", recommendedSequence: ["Review Quadratic Equations", "Number line + sign analysis", "Linear inequalities", "Quadratic inequalities", "Rational inequalities"], practiceRecommendations: ["15 inequality problems", "5 PYQ inequality questions"], estimatedEffort: "~8 hours" }];
    sequence = ["Linear Equations", "Quadratic Equations", "Simultaneous Equations", "Inequalities"];
  } else if (t.includes("english") || t.includes("grammar") || t.includes("vocab")) {
    root = "English Language";
    nodes = [
      { id: "vocab", topic: "Vocabulary", prerequisites: [], dependents: ["rc"], mastery: "Practicing", level: 0, examRelevance: "High", difficulty: "Medium" },
      { id: "gram", topic: "Grammar Basics", prerequisites: [], dependents: ["tense", "voice"], mastery: "Strong", level: 0, difficulty: "Easy" },
      { id: "tense", topic: "Tenses", prerequisites: ["gram"], dependents: ["voice"], mastery: "Practicing", level: 1, difficulty: "Medium" },
      { id: "voice", topic: "Active/Passive Voice", prerequisites: ["gram", "tense"], dependents: ["speech"], mastery: "Learning", level: 2, difficulty: "Medium" },
      { id: "speech", topic: "Direct/Indirect Speech", prerequisites: ["voice"], dependents: [], mastery: "Not Started", level: 3, difficulty: "Hard" },
      { id: "rc", topic: "Reading Comprehension", prerequisites: ["vocab"], dependents: [], mastery: "Improving", level: 1, difficulty: "Medium" },
    ];
    gaps = [{ missingPrerequisite: "Direct/Indirect Speech", whyItMatters: "Narration rules depend on tense mastery and voice transformation. Without these, speech conversion becomes error-prone.", recommendedSequence: ["Review Tenses", "Practice Active/Passive Voice", "Learn Narration Rules", "Practice Direct→Indirect conversion", "Practice Indirect→Direct conversion"], practiceRecommendations: ["20 narration problems", "10 PYQ speech questions"], estimatedEffort: "~6 hours" }];
    sequence = ["Grammar Basics", "Tenses", "Vocabulary", "Active/Passive Voice", "Direct/Indirect Speech", "Reading Comprehension"];
  } else if (t.includes("reasoning") || t.includes("series") || t.includes("puzzle")) {
    root = "Logical Reasoning";
    nodes = [
      { id: "series", topic: "Series & Patterns", prerequisites: [], dependents: ["analogy"], mastery: "Practicing", level: 0, examRelevance: "High", difficulty: "Medium" },
      { id: "analogy", topic: "Analogy", prerequisites: ["series"], dependents: ["classify"], mastery: "Learning", level: 1, difficulty: "Medium" },
      { id: "classify", topic: "Classification", prerequisites: ["analogy"], dependents: [], mastery: "Not Started", level: 2, difficulty: "Medium" },
      { id: "coding", topic: "Coding-Decoding", prerequisites: [], dependents: ["puzzle"], mastery: "Strong", level: 0, difficulty: "Easy" },
      { id: "puzzle", topic: "Puzzles & Seating", prerequisites: ["coding"], dependents: ["blood"], mastery: "Weak", level: 1, difficulty: "Hard" },
      { id: "blood", topic: "Blood Relations", prerequisites: ["puzzle"], dependents: [], mastery: "Not Started", level: 2, difficulty: "Hard" },
    ];
    gaps = [{ missingPrerequisite: "Puzzles & Seating", whyItMatters: "Seating arrangement puzzles are high-weightage in SSC/Banking. They require systematic tabulation and logical elimination.", recommendedSequence: ["Practice Coding-Decoding", "Learn Puzzle Types", "Linear Seating", "Circular Seating", "Complex Puzzles"], practiceRecommendations: ["15 seating arrangement problems", "5 PYQ puzzles"], estimatedEffort: "~10 hours" }];
    sequence = ["Series & Patterns", "Coding-Decoding", "Analogy", "Classification", "Puzzles & Seating", "Blood Relations"];
  } else if (t.includes("quant") || t.includes("aptitude") || t.includes("arithmetic")) {
    root = "Quantitative Aptitude";
    nodes = [
      { id: "pct", topic: "Percentage", prerequisites: [], dependents: ["pl", "ratio"], mastery: "Strong", level: 0, examRelevance: "Very High", difficulty: "Easy" },
      { id: "ratio", topic: "Ratio & Proportion", prerequisites: ["pct"], dependents: ["mixture"], mastery: "Practicing", level: 1, difficulty: "Easy" },
      { id: "pl", topic: "Profit & Loss", prerequisites: ["pct"], dependents: ["discount"], mastery: "Strong", level: 1, difficulty: "Medium" },
      { id: "discount", topic: "Discount", prerequisites: ["pl"], dependents: ["si"], mastery: "Learning", level: 2, difficulty: "Medium" },
      { id: "mixture", topic: "Mixture & Alligation", prerequisites: ["ratio"], dependents: [], mastery: "Weak", level: 2, difficulty: "Hard" },
      { id: "si", topic: "Simple & Compound Interest", prerequisites: ["discount"], dependents: ["tw"], mastery: "Practicing", level: 3, difficulty: "Medium" },
      { id: "tw", topic: "Time & Work", prerequisites: ["si"], dependents: ["tsd"], mastery: "Learning", level: 4, difficulty: "Hard" },
      { id: "tsd", topic: "Time, Speed & Distance", prerequisites: ["tw"], dependents: [], mastery: "Not Started", level: 5, difficulty: "Hard" },
    ];
    gaps = [
      { missingPrerequisite: "Mixture & Alligation", whyItMatters: "Alligation method is a shortcut used across mixture, profit-loss, and average problems. Missing it forces longer calculations.", recommendedSequence: ["Review Ratio & Proportion", "Learn Alligation Rule", "Practice Mixture problems", "Apply Alligation to P&L"], practiceRecommendations: ["10 alligation problems", "5 mixture PYQs"], estimatedEffort: "~5 hours" },
      { missingPrerequisite: "Time, Speed & Distance", whyItMatters: "TSD is high-weightage and builds on Time & Work concepts (rate problems). Relative speed requires solid foundation.", recommendedSequence: ["Review Time & Work", "Basic TSD formulae", "Relative speed", "Trains & Platforms", "Boats & Streams"], practiceRecommendations: ["15 TSD problems", "5 train PYQs"], estimatedEffort: "~8 hours" },
    ];
    sequence = ["Percentage", "Ratio & Proportion", "Profit & Loss", "Discount", "Mixture & Alligation", "Simple & Compound Interest", "Time & Work", "Time, Speed & Distance"];
  } else {
    // Generic fallback
    root = topic || "Foundational Concepts";
    nodes = [
      { id: "f1", topic: "Foundations", prerequisites: [], dependents: ["c1"], mastery: "Strong", level: 0, examRelevance: "Core", difficulty: "Easy" },
      { id: "c1", topic: "Core Concepts", prerequisites: ["f1"], dependents: ["a1"], mastery: "Practicing", level: 1, difficulty: "Medium" },
      { id: "a1", topic: "Applications", prerequisites: ["c1"], dependents: ["adv"], mastery: "Learning", level: 2, difficulty: "Hard" },
      { id: "adv", topic: "Advanced Topics", prerequisites: ["a1"], dependents: [], mastery: "Not Started", level: 3, difficulty: "Hard" },
    ];
    gaps = [{ missingPrerequisite: "Advanced Topics", whyItMatters: "Advanced topics build on applications. Master applications first to avoid getting stuck.", recommendedSequence: ["Review Foundations", "Practice Core Concepts", "Master Applications", "Start Advanced Topics"], practiceRecommendations: ["10 practice problems", "5 PYQs"], estimatedEffort: "~12 hours" }];
    sequence = ["Foundations", "Core Concepts", "Applications", "Advanced Topics"];
  }

  return {
    root,
    nodes,
    gaps,
    recommendedLearningSequence: sequence,
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockQuestionExplanation(query: string): unknown {
  // Extract the actual question. The route wraps it in triple-quotes:
  //   QUESTION:\n"""\n<actual question>\n"""
  let question = "";
  const triple = query.match(/"""\s*\n([\s\S]*?)\n\s*"""/);
  if (triple && triple[1]) {
    question = triple[1].trim().slice(0, 300);
  } else {
    // fallback: try single-quoted
    const m = query.match(/question[:\s]*["']([^"']+)["']/i);
    if (m && m[1]) question = m[1].trim().slice(0, 300);
  }
  if (!question || question.length < 5) question = "A train travels 120 km in 2 hours. What is its speed?";

  // Detect question type for relevant canned explanation
  const q = question.toLowerCase();
  let profile: {
    subject: string; topic: string; subtopic: string; concept: string; difficulty: "Easy"|"Medium"|"Hard";
    related: string[]; prereq: string[]; hint: string; conceptName: string; coreRule: string; why: string;
    shortcut: string; mistake: string; steps: string[]; formula: string; substitution: string; calc: string;
    answer: string; explanation: string; method: string; mental: string; elim: string; timeSave: string; insight: string;
  };

  if (/(solve|find|value of|equation|=)/.test(q) && /[a-z]\s*[-+]\s*\d/.test(q)) {
    // Linear equation e.g. "If 2x+3=11, find x"
    profile = {
      subject: "Quantitative Aptitude", topic: "Algebra", subtopic: "Linear Equations", concept: "Isolate the variable",
      difficulty: "Easy", related: ["Transposition", "Inverse operations"], prereq: ["Arithmetic", "Order of operations"],
      hint: "Whatever you do to one side of the equation, you must do to the other. How can you isolate x?",
      conceptName: "Inverse Operations", coreRule: "To isolate x, undo each operation in reverse order (addition → subtraction, multiplication → division).",
      why: "The equation balances as long as both sides change equally.", shortcut: "Move constants to one side, then divide by the coefficient.",
      mistake: "Forgetting to apply the operation to BOTH sides.",
      steps: ["Subtract 3 from both sides: 2x = 11 − 3", "Simplify: 2x = 8", "Divide both sides by 2: x = 8/2", "Result: x = 4"],
      formula: "ax + b = c  →  x = (c − b) / a", substitution: "x = (11 − 3) / 2", calc: "8 / 2 = 4", answer: "x = 4",
      explanation: "We isolate x by reversing the operations applied to it: first undo +3 (subtract 3), then undo ×2 (divide by 2).",
      method: "Transpose mentally: 2x = 8 → x = 4", mental: "11−3=8, 8/2=4", elim: "Plug each option back into the equation", timeSave: "Skip writing intermediate steps for simple equations",
      insight: "Always isolate the variable by performing inverse operations on BOTH sides. Verify by substituting your answer back into the original equation.",
    };
  } else if (/(train|speed|distance|time|km\/?h|m\/?s|pole|platform)/.test(q)) {
    // Time speed distance
    profile = {
      subject: "Quantitative Aptitude", topic: "Time, Speed & Distance", subtopic: "Speed calculation", concept: "Speed = Distance / Time",
      difficulty: "Easy", related: ["Average speed", "Relative speed", "Unit conversion"], prereq: ["Basic arithmetic", "Unit conversion"],
      hint: "Think about the relationship between speed, distance, and time. Which two values are given?",
      conceptName: "Speed = Distance / Time", coreRule: "Speed equals total distance divided by total time taken.",
      why: "Distance and time are both given directly.", shortcut: "Use unitary method: km per hour",
      mistake: "Forgetting to convert units (km/h vs m/s).",
      steps: ["Identify given: Distance = 120 km, Time = 2 hours", "Apply formula: Speed = Distance / Time", "Substitute: 120 / 2", "Result: 60 km/h"],
      formula: "Speed = Distance / Time", substitution: "Speed = 120 km / 2 h", calc: "120 ÷ 2 = 60", answer: "60 km/h",
      explanation: "Dividing distance by time gives the average speed.",
      method: "Unitary: in 2 hours → 120 km, so in 1 hour → 60 km", mental: "120/2 = 60 directly", elim: "Reject answers not in km/h range", timeSave: "Avoid unit conversion unless options are in m/s",
      insight: "Remember the core relation S = D/T. Always check units. For multi-segment journeys, average speed = total distance / total time (not arithmetic mean of speeds).",
    };
  } else if (/(percentage|%|profit|loss|discount|marked|cost price|selling)/.test(q)) {
    profile = {
      subject: "Quantitative Aptitude", topic: "Percentage & Profit-Loss", subtopic: "Percentage calculation", concept: "Percentage = (Part / Whole) × 100",
      difficulty: "Easy", related: ["Fractions", "Ratio", "Successive percentage"], prereq: ["Fractions", "Decimals"],
      hint: "Percentage means 'per 100'. What is the whole, and what is the part you're comparing to it?",
      conceptName: "Percentage = (Part / Whole) × 100", coreRule: "A percentage expresses a part out of 100.",
      why: "The question compares a part to a whole.", shortcut: "Convert % to fraction: x% = x/100",
      mistake: "Mixing up which value is the 'whole' (base).",
      steps: ["Identify the whole (base) and the part", "Apply: % = (Part / Whole) × 100", "Substitute values", "Simplify"],
      formula: "Percentage = (Part / Whole) × 100", substitution: "Depends on values given", calc: "Compute and simplify", answer: "Final %",
      explanation: "Percentage standardizes comparisons to a base of 100.",
      method: "Convert to decimal then multiply", mental: "10% = move decimal one place left", elim: "Estimate using 50%, 25%, 10% benchmarks", timeSave: "Memorize common fraction-•% equivalents (1/4=25%, 1/8=12.5%)",
      insight: "Always identify the BASE (whole) first. 'Of' usually precedes the base. A 20% increase followed by 20% decrease does NOT return to the original.",
    };
  } else if (/(reasoning|series|pattern|coding|decode|puzzle|blood relation|direction)/.test(q)) {
    profile = {
      subject: "General Intelligence & Reasoning", topic: "Logical Reasoning", subtopic: "Pattern recognition", concept: "Identify the rule governing the sequence",
      difficulty: "Medium", related: ["Number series", "Letter series", "Analogy"], prereq: ["Basic arithmetic", "Alphabet positions"],
      hint: "Look for a pattern — arithmetic, geometric, alternating, or position-based. What changes between consecutive terms?",
      conceptName: "Pattern Recognition", coreRule: "Find the consistent rule that transforms each term to the next.",
      why: "Series questions test rule identification.", shortcut: "Check differences between consecutive terms first",
      mistake: "Assuming a single rule when the pattern alternates.",
      steps: ["Write down the given terms", "Compute differences (1st order, 2nd order)", "Check for ratios if differences aren't constant", "Identify the rule", "Apply to find the next term"],
      formula: "Depends on pattern", substitution: "Apply rule to last term", calc: "Compute next term", answer: "Next term in series",
      explanation: "Most series follow arithmetic, geometric, or alternating rules. Higher-order differences reveal polynomial patterns.",
      method: "Difference table: compute Δ1, Δ2", mental: "Look for ×2, +1, squares, cubes", elim: "Reject options breaking the pattern's monotonicity", timeSave: "If first differences are constant, it's arithmetic — skip deeper analysis",
      insight: "Always compute first differences. If constant → arithmetic. If ratio constant → geometric. If neither → try alternating or position-based rules.",
    };
  } else if (/(english|grammar|synonym|antonym|comprehension|passage|sentence|vocab)/.test(q)) {
    profile = {
      subject: "English Language", topic: "Reading Comprehension & Vocabulary", subtopic: "Contextual meaning", concept: "Derive meaning from context",
      difficulty: "Medium", related: ["Inference", "Vocabulary", "Tone"], prereq: ["Vocabulary", "Grammar"],
      hint: "Read the surrounding sentence carefully. What context clues suggest the meaning?",
      conceptName: "Context Clues", coreRule: "The meaning of a word is shaped by the sentence and paragraph around it.",
      why: "Comprehension questions test contextual understanding.", shortcut: "Replace the word with each option — which keeps the sentence logical?",
      mistake: "Choosing a familiar synonym that doesn't fit the specific context.",
      steps: ["Read the full sentence containing the word/idea", "Identify context clues (contrast, definition, example)", "Predict a meaning", "Match with the closest option"],
      formula: "N/A", substitution: "N/A", calc: "N/A", answer: "Contextually correct option",
      explanation: "Context determines meaning. A word's dictionary definition may not match its contextual sense.",
      method: "Substitution: plug each option into the sentence", mental: "Listen for which option sounds natural", elim: "Reject options that create logical contradictions", timeSave: "Read only the relevant sentence first, full passage only if needed",
      insight: "Context is king. Never choose an answer based on a word's most common meaning without checking the sentence.",
    };
  } else {
    // Generic fallback
    profile = {
      subject: "General Aptitude", topic: "Problem Solving", subtopic: "Analytical reasoning", concept: "Break the problem into steps",
      difficulty: "Medium", related: ["Logical reasoning", "Quantitative methods"], prereq: ["Reading comprehension", "Basic arithmetic"],
      hint: "What information is given, and what are you asked to find? Break the problem into smaller steps.",
      conceptName: "Structured Problem Solving", coreRule: "Identify givens, identify the goal, choose a method, execute, verify.",
      why: "Applies to all aptitude questions.", shortcut: "Draw a diagram or write givens explicitly",
      mistake: "Rushing to calculate before understanding what's asked.",
      steps: ["Read the question carefully", "List the given information", "Identify what to find", "Choose the appropriate formula/method", "Substitute and solve", "Verify the answer makes sense"],
      formula: "Varies", substitution: "Varies", calc: "Varies", answer: "Computed answer",
      explanation: "Structured problem solving prevents careless errors.",
      method: "Write givens → choose method → solve → verify", mental: "Estimate before calculating", elim: "Use estimation to reject outliers", timeSave: "Skip questions that take >2 minutes; return later",
      insight: "Always understand the question fully before calculating. A correct method on a misunderstood question wastes time.",
    };
  }

  return {
    originalQuestion: question,
    subject: profile.subject,
    topic: profile.topic,
    subtopic: profile.subtopic,
    concept: profile.concept,
    difficulty: profile.difficulty,
    questionType: "MCQ",
    relatedConcepts: profile.related,
    prerequisites: profile.prereq,
    levels: {
      level1_quickHint: profile.hint,
      level2_concept: { conceptName: profile.conceptName, coreRule: profile.coreRule, whyItApplies: profile.why, shortcut: profile.shortcut, commonMistake: profile.mistake },
      level3_detailedSolution: { steps: profile.steps, formula: profile.formula, substitution: profile.substitution, calculation: profile.calc, finalAnswer: profile.answer, explanation: profile.explanation },
      level4_examShortcut: { method: profile.method, mentalCalculation: profile.mental, eliminationTechnique: profile.elim, timeSavingApproach: profile.timeSave },
      level5_learningInsight: profile.insight,
    },
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockQuestionEvolution(query: string): unknown {
  // Extract the actual question from the triple-quoted prompt wrapper
  let src = "";
  const triple = query.match(/"""\s*\n([\s\S]*?)\n\s*"""/);
  if (triple && triple[1]) src = triple[1].trim().slice(0, 300);
  if (!src || src.length < 5) src = query.slice(0, 150) || "A train 150 m long passes a pole in 15 seconds. Find its speed.";

  const s = src.toLowerCase();
  let subject = "Quantitative Aptitude";
  let topic = "Time, Speed & Distance";
  let subtopic = "Trains";
  let coreConcept = "Speed = Distance / Time";
  let difficulty: "Easy" | "Medium" | "Hard" = "Medium";
  let variants: unknown[];

  type Variant = { level: number; levelName: string; question: string; options: string[]; correctAnswer: string; explanation: string; shortcut?: string; commonTrap?: string; validationStatus: "verified" | "needs-review"; validationNotes?: string[] };

  if (s.includes("train") || s.includes("speed") || s.includes("distance") || s.includes("pole")) {
    subject = "Quantitative Aptitude"; topic = "Time, Speed & Distance"; subtopic = "Trains";
    coreConcept = "Speed = Distance / Time"; difficulty = "Medium";
    variants = [
      { level: 1, levelName: "Same Concept, Easier", question: "A train 100 m long passes a pole in 10 seconds. Find its speed.", options: ["8 m/s", "10 m/s", "12 m/s", "15 m/s"], correctAnswer: "10 m/s", explanation: "Speed = 100/10 = 10 m/s", validationStatus: "verified", validationNotes: [] },
      { level: 2, levelName: "Same Concept, Different Framing", question: "A train crosses a stationary pole in 20 seconds at a speed of 5 m/s. What is the length of the train?", options: ["50 m", "100 m", "75 m", "125 m"], correctAnswer: "100 m", explanation: "Length = Speed × Time = 5 × 20 = 100 m", validationStatus: "verified" },
      { level: 3, levelName: "Multi-Concept", question: "Two trains of length 100 m each approach each other at 10 m/s and 15 m/s. Time to cross each other?", options: ["4 s", "8 s", "10 s", "12 s"], correctAnswer: "8 s", explanation: "Relative speed = 25 m/s, total distance = 200 m, time = 200/25 = 8 s", validationStatus: "verified" },
      { level: 4, levelName: "Difficult Variant", question: "A train 200 m long passes a platform 300 m long in 25 seconds. Find its speed in km/h.", options: ["54 km/h", "72 km/h", "60 km/h", "90 km/h"], correctAnswer: "72 km/h", explanation: "Total distance = 500 m, time = 25 s, speed = 20 m/s = 72 km/h", validationStatus: "verified" },
      { level: 5, levelName: "Exam-Trap Variant", question: "A train crosses a pole in 8 s and a platform 240 m long in 20 s. Find the length of the train.", options: ["120 m", "160 m", "180 m", "240 m"], correctAnswer: "160 m", explanation: "Let length L, speed S. L/S = 8 → S = L/8. (L+240)/S = 20 → L + 240 = 20S = 20 × L/8 = 2.5L → 1.5L = 240 → L = 160 m", commonTrap: "Assuming train length equals platform length", validationStatus: "verified" },
    ];
  } else if (s.includes("percentage") || s.includes("%") || s.includes("profit") || s.includes("loss")) {
    subject = "Quantitative Aptitude"; topic = "Percentage & Profit-Loss"; subtopic = "Percentage";
    coreConcept = "Percentage = (Part / Whole) × 100"; difficulty = "Easy";
    variants = [
      { level: 1, levelName: "Same Concept, Easier", question: "What is 10% of 200?", options: ["10", "20", "15", "25"], correctAnswer: "20", explanation: "10% of 200 = 0.10 × 200 = 20", validationStatus: "verified", validationNotes: [] },
      { level: 2, levelName: "Same Concept, Different Framing", question: "If 25% of a number is 50, what is the number?", options: ["100", "150", "200", "250"], correctAnswer: "200", explanation: "0.25x = 50 → x = 50/0.25 = 200", validationStatus: "verified" },
      { level: 3, levelName: "Multi-Concept", question: "A shopkeeper marks goods 40% above cost and gives 10% discount. His profit % is?", options: ["26%", "30%", "36%", "40%"], correctAnswer: "26%", explanation: "If CP=100, MP=140, SP=140×0.9=126. Profit=26%. (MP×Discount≠MP-Discount%)", validationStatus: "verified" },
      { level: 4, levelName: "Difficult Variant", question: "Successive discounts of 20% and 10% are equivalent to a single discount of:", options: ["28%", "30%", "32%", "25%"], correctAnswer: "28%", explanation: "SP = 0.8 × 0.9 = 0.72 of original. Single discount = 1-0.72 = 28%", validationStatus: "verified" },
      { level: 5, levelName: "Exam-Trap Variant", question: "A's salary is 50% more than B's. By what % is B's salary less than A's?", options: ["33.33%", "50%", "40%", "25%"], correctAnswer: "33.33%", explanation: "Let B=100, A=150. B is 50 less than A. 50/150 × 100 = 33.33%", commonTrap: "Answering 50% (the base changes)", validationStatus: "verified" },
    ];
  } else if (s.includes("series") || s.includes("sequence") || s.includes("pattern") || s.includes("next number")) {
    subject = "General Intelligence & Reasoning"; topic = "Series & Patterns"; subtopic = "Number Series";
    coreConcept = "Identify the rule governing the sequence"; difficulty = "Medium";
    variants = [
      { level: 1, levelName: "Same Concept, Easier", question: "Find the next: 2, 4, 6, 8, ?", options: ["9", "10", "11", "12"], correctAnswer: "10", explanation: "Common difference = 2. Next = 8+2 = 10.", validationStatus: "verified", validationNotes: [] },
      { level: 2, levelName: "Same Concept, Different Framing", question: "Which number completes: 3, 6, 12, 24, ?", options: ["30", "36", "48", "42"], correctAnswer: "48", explanation: "Each term doubles: 3×2=6, 6×2=12... 24×2=48", validationStatus: "verified" },
      { level: 3, levelName: "Multi-Concept", question: "Find next: 1, 4, 9, 16, 25, ? (hint: think squares)", options: ["30", "36", "42", "49"], correctAnswer: "36", explanation: "Perfect squares: 1², 2², 3², 4², 5² → 6² = 36", validationStatus: "verified" },
      { level: 4, levelName: "Difficult Variant", question: "Find next: 2, 6, 12, 20, 30, ?", options: ["40", "42", "44", "46"], correctAnswer: "42", explanation: "Differences: 4,6,8,10,12 (even numbers). Next = 30+12 = 42", validationStatus: "verified" },
      { level: 5, levelName: "Exam-Trap Variant", question: "Find next: 1, 2, 6, 24, 120, ?", options: ["240", "360", "600", "720"], correctAnswer: "720", explanation: "Factorials: 1!, 2!, 3!, 4!, 5! → 6! = 720", commonTrap: "Assuming addition pattern (differences look tempting)", validationStatus: "verified" },
    ];
  } else if (s.includes("solve") || s.includes("equation") || /[a-z]\s*[-+]\s*\d/.test(s)) {
    subject = "Quantitative Aptitude"; topic = "Algebra"; subtopic = "Linear Equations";
    coreConcept = "Isolate the variable via inverse operations"; difficulty = "Easy";
    variants = [
      { level: 1, levelName: "Same Concept, Easier", question: "If x + 5 = 10, find x.", options: ["3", "5", "7", "15"], correctAnswer: "5", explanation: "x = 10 - 5 = 5", validationStatus: "verified", validationNotes: [] },
      { level: 2, levelName: "Same Concept, Different Framing", question: "Twice a number equals 14. What is the number?", options: ["6", "7", "8", "12"], correctAnswer: "7", explanation: "2x = 14 → x = 7", validationStatus: "verified" },
      { level: 3, levelName: "Multi-Concept", question: "The sum of two numbers is 20 and their difference is 4. Find the larger number.", options: ["10", "12", "14", "8"], correctAnswer: "12", explanation: "x+y=20, x-y=4. Adding: 2x=24 → x=12, y=8. Larger = 12.", validationStatus: "verified" },
      { level: 4, levelName: "Difficult Variant", question: "If 3(x - 2) + 2x = 15, find x.", options: ["3", "4.2", "5", "6"], correctAnswer: "4.2", explanation: "3x-6+2x=15 → 5x=21 → x=4.2", validationStatus: "verified" },
      { level: 5, levelName: "Exam-Trap Variant", question: "If 2x + 3y = 12 and x - y = 1, find x + y.", options: ["3", "4", "5", "6"], correctAnswer: "5", explanation: "From x-y=1: x=y+1. Substitute: 2(y+1)+3y=12 → 5y=10 → y=2, x=3. x+y=5.", commonTrap: "Solving for x and y separately then forgetting to add them", validationStatus: "verified" },
    ];
  } else {
    // Generic fallback — treat as a quantitative problem
    subject = "Quantitative Aptitude"; topic = "Problem Solving"; subtopic = "Analytical";
    coreConcept = "Break problem into structured steps"; difficulty = "Medium";
    variants = [
      { level: 1, levelName: "Same Concept, Easier", question: "What is 5 × 4?", options: ["15", "20", "25", "9"], correctAnswer: "20", explanation: "5 × 4 = 20", validationStatus: "verified", validationNotes: [] },
      { level: 2, levelName: "Same Concept, Different Framing", question: "If 4 boxes each hold 5 items, how many items total?", options: ["9", "20", "15", "25"], correctAnswer: "20", explanation: "4 × 5 = 20 items", validationStatus: "verified" },
      { level: 3, levelName: "Multi-Concept", question: "5 items cost ₹4 each. With 10% tax, total = ?", options: ["₹20", "₹22", "₹24", "₹18"], correctAnswer: "₹22", explanation: "5×4=20. Tax=10% of 20=2. Total=20+2=₹22", validationStatus: "verified" },
      { level: 4, levelName: "Difficult Variant", question: "5 workers complete a job in 4 hours. How long for 4 workers?", options: ["3.2h", "5h", "4.5h", "6h"], correctAnswer: "5h", explanation: "Work = 5×4 = 20 worker-hours. 4 workers → 20/4 = 5 hours", validationStatus: "verified" },
      { level: 5, levelName: "Exam-Trap Variant", question: "If 5 cats catch 5 mice in 5 minutes, how long for 100 cats to catch 100 mice?", options: ["5 min", "20 min", "100 min", "500 min"], correctAnswer: "5 min", explanation: "Each cat catches 1 mouse in 5 min. 100 cats catch 100 mice in the same 5 min (parallel).", commonTrap: "Assuming 100×5=500 min (confusing rate with scale)", validationStatus: "verified" },
    ];
  }

  return {
    sourceQuestion: src,
    coreConcept,
    subject,
    topic,
    subtopic,
    difficulty,
    variants,
    lineage: `Original ${topic} problem → 5 variants across difficulty and concept combination.`,
    sources: [{ type: "AI_GENERATED", label: "AI-Generated", detail: "Variants derived from source question" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockPaper(query: string): unknown {
  // Detect exam from the query to customize the paper
  const q = query.toLowerCase();
  let examName = "SSC CGL";
  let sections: { name: string; questions: number; marksPerQuestion: number; negativeMarking: number }[] = [];
  let questions: unknown[] = [];

  const mk = (id: string, section: string, num: number, topic: string, difficulty: "Easy" | "Medium" | "Hard", question: string, options: string[], correctAnswer: string, explanation: string) => ({
    id, section, questionNumber: num, questionType: "MCQ" as const, question, options, correctAnswer, topic, difficulty, marks: 2, negativeMarks: 0.5, explanation, sourceType: "AI_GENERATED" as const,
  });

  if (q.includes("gate") || q.includes("cs") || q.includes("mechanical")) {
    examName = q.includes("mechanical") ? "GATE Mechanical Engineering" : "GATE CS";
    sections = [
      { name: "General Aptitude", questions: 5, marksPerQuestion: 1, negativeMarking: 0.33 },
      { name: "Technical", questions: 5, marksPerQuestion: 2, negativeMarking: 0.66 },
    ];
    questions = [
      mk("q1","General Aptitude",1,"Verbal","Easy","Choose the word most OPPOSITE in meaning to 'BENEVOLENT':",["Malevolent","Kind","Generous","Charitable"],"Malevolent","Benevolent means well-meaning and kind. The antonym is malevolent (wishing harm)."),
      mk("q2","General Aptitude",2,"Numerical","Medium","A train 150 m long passes a pole in 15 seconds. The speed of the train is:",["36 km/h","54 km/h","10 km/h","24 km/h"],"36 km/h","Speed = 150/15 = 10 m/s = 10 × 18/5 = 36 km/h."),
      mk("q3","General Aptitude",3,"Reasoning","Medium","Find the next term: 2, 6, 12, 20, 30, ?",["40","42","44","46"],"42","Differences: 4,6,8,10,12 → next term = 30+12 = 42."),
      mk("q4","Technical",4,"Data Structures","Medium","Which data structure uses LIFO (Last-In-First-Out) ordering?",["Queue","Stack","Linked List","Tree"],"Stack","A stack follows LIFO — the last element pushed is the first popped."),
      mk("q5","Technical",5,"Algorithms","Hard","What is the time complexity of binary search on a sorted array of n elements?",["O(n)","O(n log n)","O(log n)","O(1)"],"O(log n)","Binary search halves the search space each step → O(log n)."),
      mk("q6","Technical",6,"Operating Systems","Hard","Which page replacement algorithm suffers from Belady's anomaly?",["LRU","Optimal","FIFO","Clock"],"FIFO","FIFO can increase page faults when frames increase — Belady's anomaly."),
      mk("q7","Technical",7,"DBMS","Medium","Which normal form eliminates partial dependencies?",["1NF","2NF","3NF","BCNF"],"2NF","2NF removes partial dependencies (non-prime attributes dependent on part of a composite key)."),
      mk("q8","Technical",8,"Computer Networks","Medium","The default port for HTTPS is:",["80","443","21","22"],"443","HTTPS uses port 443 (HTTP uses 80, FTP 21, SSH 22)."),
      mk("q9","Technical",9,"Discrete Math","Hard","In a graph with 6 vertices and 7 edges, the sum of all vertex degrees is:",["7","14","12","6"],"14","By Handshaking Lemma: sum of degrees = 2 × edges = 2 × 7 = 14."),
      mk("q10","Technical",10,"TOC","Hard","Which language is accepted by a Pushdown Automaton (PDA)?",["Regular","Context-Free","Context-Sensitive","Recursive"],"Context-Free","PDAs recognize exactly the context-free languages (Type-2 in Chomsky hierarchy)."),
    ];
  } else {
    // SSC CGL default
    examName = "SSC CGL";
    sections = [{ name: "Quantitative Aptitude", questions: 6, marksPerQuestion: 2, negativeMarking: 0.5 }];
    questions = [
      mk("q1","Quantitative Aptitude",1,"Percentage","Easy","If 30% of a number is 90, what is the number?",["200","250","300","270"],"300","Let number = x. 30% of x = 90 → 0.30x = 90 → x = 300."),
      mk("q2","Quantitative Aptitude",2,"Profit & Loss","Medium","A man buys an article for ₹400 and sells it at a profit of 15%. The selling price is:",["₹440","₹460","₹450","₹480"],"₹460","SP = CP × (1 + profit%) = 400 × 1.15 = ₹460."),
      mk("q3","Quantitative Aptitude",3,"Ratio","Easy","If A:B = 2:3 and B:C = 4:5, then A:C is:",["2:5","8:15","3:5","6:15"],"8:15","A:B = 2:3 = 8:12, B:C = 4:5 = 12:15 → A:C = 8:15."),
      mk("q4","Quantitative Aptitude",4,"Time & Work","Hard","A can do a job in 12 days, B in 18 days. Together they finish in:",["7.2 days","6 days","5.4 days","9 days"],"7.2 days","Combined rate = 1/12 + 1/18 = 5/36 per day → time = 36/5 = 7.2 days."),
      mk("q5","Quantitative Aptitude",5,"Average","Medium","The average of 5 numbers is 20. If one number is removed, the average becomes 18. The removed number is:",["24","22","26","28"],"28","Sum of 5 = 100. Sum of 4 = 72. Removed = 100 − 72 = 28."),
      mk("q6","Quantitative Aptitude",6,"Simple Interest","Hard","₹8000 invested at 5% per annum simple interest for 3 years yields interest of:",["₹1200","₹1500","₹1000","₹800"],"₹1200","SI = P × R × T / 100 = 8000 × 5 × 3 / 100 = ₹1200."),
    ];
  }

  return {
    examName,
    mode: "Balanced Practice",
    totalQuestions: questions.length,
    durationMinutes: questions.length * 2,
    sections,
    questions,
    markingScheme: sections[0] ? `+${sections[0].marksPerQuestion} / -${sections[0].negativeMarking}` : "+2 / -0.5",
    sources: [{ type: "AI_GENERATED", label: "AI-Generated" }],
    generatedAt: new Date().toISOString(),
    disclaimer: "AI-generated practice paper. Not an official paper or prediction.",
  };
}

function mockMCQ(query: string): unknown {
  // Detect topic from the query to return topic-relevant MCQs
  const q = query.toLowerCase();
  let topic = "Quantitative Aptitude";
  let mcqs: unknown[] = [];

  const mk = (id: string, question: string, options: string[], correctAnswer: string, explanation: string, difficulty: "Easy" | "Medium" | "Hard", sourcePage?: number) => ({
    id, question, options, correctAnswer, explanation, topic, difficulty, sourcePage, sourceType: "AI_GENERATED" as const, validationStatus: "verified" as const,
  });

  if (q.includes("reasoning") || q.includes("series") || q.includes("pattern")) {
    topic = "Reasoning";
    mcqs = [
      mk("m1","Find the next number: 1, 4, 9, 16, 25, ?",["30","36","49","35"],"36","These are perfect squares: 1², 2², 3², 4², 5² → next is 6² = 36.","Easy",1),
      mk("m2","If FRIEND is coded as GSJFOE, how is HUMAN coded?",["IVNBO","IVMBO","IVNCO","IUNBO"],"IVNBO","Each letter shifts +1: H→I, U→V, M→N, A→B, N→O.","Medium",2),
      mk("m3","Pointing to a photo, a man said 'She is the daughter of my grandfather's only son.' How is she related to him?",["Sister","Daughter","Niece","Cousin"],"Sister","Grandfather's only son = the man's father. Father's daughter = sister.","Hard",2),
      mk("m4","Complete the series: AZ, BY, CX, DW, ?",["EV","EW","FV","DV"],"EV","First letter: A,B,C,D,E (+1). Second letter: Z,Y,X,W,V (−1).","Easy",3),
      mk("m5","In a row of children, Ravi is 7th from the left and 12th from the right. How many children are there?",["17","18","19","16"],"18","Total = 7 + 12 − 1 = 18 (Ravi is counted once).","Medium",3),
    ];
  } else if (q.includes("english") || q.includes("vocab") || q.includes("grammar")) {
    topic = "English";
    mcqs = [
      mk("m1","Choose the synonym of 'EPHEMERAL':",["Eternal","Short-lived","Permanent","Strong"],"Short-lived","Ephemeral means lasting for a very short time.","Easy",1),
      mk("m2","Choose the antonym of 'VERBOSE':",["Talkative","Concise","Wordy","Lengthy"],"Concise","Verbose means using more words than needed. Antonym = concise.","Medium",2),
      mk("m3","Fill in the blank: 'She is allergic ___ peanuts.'",["to","from","with","of"],"to","The correct preposition after 'allergic' is 'to'.","Easy",2),
      mk("m4","Identify the correctly spelled word:",["Accomodate","Acommodate","Accommodate","Acomodate"],"Accommodate","Correct spelling: A-C-C-O-M-M-O-D-A-T-E (double c, double m).","Hard",3),
      mk("m5","Choose the correct passive voice of 'She writes a letter':",["A letter is written by her","A letter was written by her","A letter is being written","A letter has been written"],"A letter is written by her","Present simple passive: is/am/are + past participle.","Medium",3),
    ];
  } else if (q.includes("general awareness") || q.includes("gk") || q.includes("current")) {
    topic = "General Awareness";
    mcqs = [
      mk("m1","Who is known as the 'Father of the Indian Constitution'?",["Jawaharlal Nehru","B.R. Ambedkar","Rajendra Prasad","Sardar Patel"],"B.R. Ambedkar","Dr. B.R. Ambedkar chaired the Drafting Committee of the Constituent Assembly.","Easy",1),
      mk("m2","The battle of Plassey was fought in which year?",["1757","1764","1857","1526"],"1757","The Battle of Plassey (1757) established British rule in India.","Medium",2),
      mk("m3","Which article of the Indian Constitution deals with the Right to Equality?",["Article 14","Article 19","Article 21","Article 32"],"Article 14","Article 14 guarantees equality before law and equal protection of laws.","Hard",2),
      mk("m4","The headquarters of the World Trade Organization (WTO) is located in:",["New York","Geneva","Vienna","Paris"],"Geneva","The WTO is headquartered in Geneva, Switzerland.","Medium",3),
      mk("m5","Who was the first Indian woman to win a Nobel Prize?",["Mother Teresa","Indira Gandhi","Sarojini Naidu","Kiran Bedi"],"Mother Teresa","Mother Teresa won the Nobel Peace Prize in 1979.","Easy",3),
    ];
  } else {
    // Quantitative Aptitude default
    topic = "Quantitative Aptitude";
    mcqs = [
      mk("m1","What is 15% of 200?",["25","30","35","20"],"30","15% of 200 = 0.15 × 200 = 30.","Easy",1),
      mk("m2","If the simple interest on ₹5000 for 2 years at 8% per annum, the interest is:",["₹800","₹1600","₹400","₹1200"],"₹800","SI = P×R×T/100 = 5000×8×2/100 = ₹800.","Medium",2),
      mk("m3","The ratio 2:3 expressed as a percentage is:",["40%","66.67%","60%","33.33%"],"66.67%","2/3 × 100 = 66.67%.","Easy",2),
      mk("m4","A and B can complete a task in 10 and 15 days respectively. Working together they finish in:",["6 days","5 days","8 days","4 days"],"6 days","Combined rate = 1/10 + 1/15 = 1/6 per day → 6 days.","Hard",3),
      mk("m5","The average of the first 10 natural numbers is:",["5","5.5","6","4.5"],"5.5","First 10 natural numbers: 1+2+...+10 = 55. Average = 55/10 = 5.5.","Medium",3),
    ];
  }

  return {
    source: "Uploaded PDF",
    topic,
    difficulty: "Mixed" as const,
    questionCount: mcqs.length,
    questionType: "MCQ",
    mode: "Strict PDF Mode",
    mcqs,
    sources: [{ type: "UPLOADED_DOCUMENT", label: "Uploaded Document" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockPdfAnalysis(query: string): unknown {
  // Try to extract real info from the pasted content. The route sends the content
  // in the user prompt. Look for keywords to build a grounded extraction.
  const q = query.toLowerCase();

  // Extract any numbers/ages/dates mentioned in the content
  const ageMatch = query.match(/(\d{2})\s*[-–]\s*(\d{2})\s*years?/i);
  const dateMatches = [...query.matchAll(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4})/g)].map(m => m[0]).slice(0, 4);
  const questionMatch = query.match(/(\d+)\s*questions?/i);
  const marksMatch = query.match(/(\d+)\s*marks?/i);
  const durationMatch = query.match(/(\d+)\s*(?:minutes|min|hours?|hrs?)/i);
  const negMatch = query.match(/[-−](0?\.\d+|\d+)\s*(?:per|marks?|negative)/i);

  // Detect document type from keywords
  let docType = "Official Notification";
  let title = "Exam Notification";
  let organisation = "Exam Conducting Body";
  let exam = "Sample Exam";
  if (q.includes("ssc")) { exam = "SSC CGL"; organisation = "Staff Selection Commission"; }
  else if (q.includes("gate")) { exam = "GATE"; organisation = "IIT/IISc"; docType = "GATE Notification"; title = "GATE Information Brochure"; }
  else if (q.includes("upsc")) { exam = "UPSC CSE"; organisation = "Union Public Service Commission"; }
  else if (q.includes("railway") || q.includes("rrb")) { exam = "RRB NTPC"; organisation = "Railway Recruitment Board"; }
  else if (q.includes("banking") || q.includes("ibps") || q.includes("sbi")) { exam = "Banking PO"; organisation = "IBPS/SBI"; }

  const extracted: { category: string; content: string; sourcePage: number; sourceSection: string }[] = [];

  // Eligibility
  extracted.push({
    category: "Eligibility",
    content: q.includes("graduation") ? "Graduation in any discipline from a recognised university." : "Bachelor's degree (check specific post requirements).",
    sourcePage: 2, sourceSection: "Eligibility",
  });
  // Age
  if (ageMatch) {
    extracted.push({ category: "Age Limit", content: `${ageMatch[1]}-${ageMatch[2]} years as on cut-off date (relaxation for reserved categories).`, sourcePage: 2, sourceSection: "Eligibility" });
  } else {
    extracted.push({ category: "Age Limit", content: "20-30 years as on cut-off date (relaxation for reserved categories).", sourcePage: 2, sourceSection: "Eligibility" });
  }
  // Dates
  if (dateMatches.length > 0) {
    extracted.push({ category: "Important Dates", content: `Key dates mentioned: ${dateMatches.join(", ")}. Application window and exam schedule per official notification.`, sourcePage: 1, sourceSection: "Important Dates" });
  } else {
    extracted.push({ category: "Important Dates", content: "Application start, last date, and exam date per official notification.", sourcePage: 1, sourceSection: "Important Dates" });
  }
  // Exam Pattern
  const qCount = questionMatch ? questionMatch[1] : "100";
  const mCount = marksMatch ? marksMatch[1] : "200";
  const dur = durationMatch ? durationMatch[1] : "60";
  extracted.push({ category: "Exam Pattern", content: `Tier 1: ${qCount} questions, ${mCount} marks, ${dur} minutes. Computer-based test.`, sourcePage: 5, sourceSection: "Examination Scheme" });
  // Syllabus
  const subjects: string[] = [];
  if (q.includes("quant") || q.includes("aptitude")) subjects.push("Quantitative Aptitude");
  if (q.includes("reasoning")) subjects.push("General Intelligence & Reasoning");
  if (q.includes("english")) subjects.push("English Language");
  if (q.includes("general awareness") || q.includes("ga") || q.includes("gk")) subjects.push("General Awareness");
  if (subjects.length === 0) subjects.push("Quantitative Aptitude", "Reasoning", "English", "General Awareness");
  extracted.push({ category: "Syllabus", content: subjects.join(", ") + ".", sourcePage: 6, sourceSection: "Syllabus" });
  // Marking
  const neg = negMatch ? negMatch[1] : "0.5";
  extracted.push({ category: "Marking Scheme", content: `+2 per correct answer, -${neg} per incorrect answer. Unattempted: 0.`, sourcePage: 5, sourceSection: "Examination Scheme" });
  // Selection process
  extracted.push({ category: "Selection Process", content: "Tier 1 (qualifying) → Tier 2 (merit) → Document Verification → Final Selection.", sourcePage: 3, sourceSection: "Selection Process" });

  // Word count from content length if available
  const words = query.split(/\s+/).filter(w => w.length > 2).length;
  const wordCount = words > 100 ? words : 3200;

  // OCR detection
  const ocrUsed = /ocr|scanned|image|unreadable/i.test(query);

  return {
    documentOverview: { title, organisation, exam, year: new Date().getFullYear().toString(), documentType: docType, numberOfPages: 12, importantSections: ["Eligibility", "Exam Pattern", "Syllabus", "Important Dates", "Selection Process"] },
    extractedInformation: extracted,
    topics: ["Eligibility", "Exam Pattern", "Syllabus", "Selection Process", ...subjects],
    wordCount,
    ocrUsed,
    ocrWarning: ocrUsed ? "Some information was extracted using OCR and may require verification." : undefined,
    sources: [{ type: "UPLOADED_DOCUMENT", label: "Uploaded Document", detail: `${wordCount} words analysed` }],
    generatedAt: new Date().toISOString(),
  };
}

function mockPreparation(query: string): unknown {
  // Detect exam + parameters from the query
  const q = query.toLowerCase();
  let targetExam = "SSC CGL";
  // Match "Target exam:" or "targetExam:" (route uses "Target exam:")
  const examMatch = query.match(/target\s*exam[:\s]+["']?([^"',\n]+)/i) || query.match(/targetExam[:\s]+["']?([^"',\n]+)/i);
  if (examMatch) targetExam = examMatch[1].trim();

  let hoursPerDay = 4;
  const hoursMatch = query.match(/available\s*(?:study\s*)?time[:\s]+(\d+)\s*hours?/i) || query.match(/availableHoursPerDay[:\s]+(\d+)/);
  if (hoursMatch) hoursPerDay = parseInt(hoursMatch[1]);

  let daysPerWeek = 6;
  const daysMatch = query.match(/(\d+)\s*days?\s*per\s*week/i) || query.match(/daysPerWeek[:\s]+(\d+)/);
  if (daysMatch) daysPerWeek = parseInt(daysMatch[1]);

  let examDate = "2025-06-15";
  const dateMatch = query.match(/examDate[:\s]+["']([^"']+)["']/);
  if (dateMatch) examDate = dateMatch[1];

  let currentLevel = "Intermediate";
  const levelMatch = query.match(/currentLevel[:\s]+["']?([^"',\n]+)/i);
  if (levelMatch) currentLevel = levelMatch[1].trim();

  const totalDays = Math.round((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) || 120;
  const isGATE = targetExam.toLowerCase().includes("gate");
  const isUPSC = targetExam.toLowerCase().includes("upsc") || targetExam.toLowerCase().includes("cse");
  const isBanking = targetExam.toLowerCase().includes("bank") || targetExam.toLowerCase().includes("po");

  let phases, dailyPlans, weakSubjects, strongSubjects, revisionSchedule, mockTestSchedule, adaptiveNotes, targetScore;

  if (isGATE) {
    targetScore = targetExam.toLowerCase().includes("me") ? "60/100 (GATE ME)" : targetExam.toLowerCase().includes("cs") ? "65/100 (GATE CS)" : "55/100 (GATE)";
    phases = [
      { phase: 1, name: "Foundation", goal: "Engineering Mathematics + core technical basics", duration: "Weeks 1-4", tasks: ["Linear Algebra + Calculus", "Probability & Statistics", "Core technical fundamentals (DS/Thermo basics)", "General Aptitude daily"] },
      { phase: 2, name: "Topic Completion", goal: "Complete full technical syllabus", duration: "Weeks 5-10", tasks: ["All technical subjects per GATE syllabus", "Numerical problems practice", "Aptitude + verbal ability", "Subject-wise short notes"] },
      { phase: 3, name: "Practice", goal: "PYQs + subject tests", duration: "Weeks 11-14", tasks: ["Last 10 years GATE PYQs", "Subject-wise mock tests", "Formula sheet compilation", "Weak topic drill"] },
      { phase: 4, name: "Revision", goal: "Spaced revision + formula mastery", duration: "Weeks 15-16", tasks: ["Full formula revision", "Short notes daily review", "Aptitude speed practice", "Common mistakes list"] },
      { phase: 5, name: "Mock Tests", goal: "Full-length GATE simulations", duration: "Weeks 17-18", tasks: ["Daily full mock (3h)", "Detailed analysis (1.5h)", "Targeted repractice", "Time management drill"] },
      { phase: 6, name: "Final Revision", goal: "High-yield topics + exam strategy", duration: "Week 19", tasks: ["Top 30 formulas", "Last 5 years PYQs", "Virtual calculator practice", "Exam day strategy"] },
    ];
    dailyPlans = [
      { day: 1, date: "Day 1", sessions: [
        { subject: "Engineering Math", topic: "Linear Algebra", durationHours: Math.round(hoursPerDay*0.4*10)/10, activity: "Concept + problems" },
        { subject: "Technical", topic: targetExam.toLowerCase().includes("cs") ? "Data Structures" : "Thermodynamics", durationHours: Math.round(hoursPerDay*0.4*10)/10, activity: "Theory + numericals" },
        { subject: "Aptitude", topic: "Numerical Ability", durationHours: Math.round(hoursPerDay*0.2*10)/10, activity: "Practice set" },
      ], totalHours: hoursPerDay },
      { day: 2, date: "Day 2", sessions: [
        { subject: "Engineering Math", topic: "Calculus", durationHours: Math.round(hoursPerDay*0.35*10)/10, activity: "Practice problems" },
        { subject: "Technical", topic: targetExam.toLowerCase().includes("cs") ? "Algorithms" : "Fluid Mechanics", durationHours: Math.round(hoursPerDay*0.45*10)/10, activity: "Theory + PYQs" },
        { subject: "Aptitude", topic: "Verbal Ability", durationHours: Math.round(hoursPerDay*0.2*10)/10, activity: "Reading + vocab" },
      ], totalHours: hoursPerDay },
      { day: 3, date: "Day 3", sessions: [
        { subject: "Engineering Math", topic: "Probability", durationHours: Math.round(hoursPerDay*0.35*10)/10, activity: "Concept + problems" },
        { subject: "Technical", topic: targetExam.toLowerCase().includes("cs") ? "Operating Systems" : "Heat Transfer", durationHours: Math.round(hoursPerDay*0.45*10)/10, activity: "Theory + numericals" },
        { subject: "Aptitude", topic: "Logical Reasoning", durationHours: Math.round(hoursPerDay*0.2*10)/10, activity: "Practice set" },
      ], totalHours: hoursPerDay },
    ];
    weakSubjects = targetExam.toLowerCase().includes("cs") ? ["Computer Networks", "TOC", "Compiler Design"] : ["Heat Transfer", "Machine Design"];
    strongSubjects = ["Engineering Mathematics", "General Aptitude"];
    revisionSchedule = ["Saturday: weekly formula revision", "Sunday: subject-wise mock test"];
    mockTestSchedule = ["From week 17: daily full mock (3h)", "Last week: 2 mocks + analysis"];
    adaptiveNotes = ["Allocate extra time to weak technical subjects", "Practice virtual calculator daily", "GATE rewards accuracy — avoid negative marking", "Engineering Math is high-weightage (15 marks) — master it"];
  } else if (isUPSC) {
    targetScore = "Cut-off clearing (Prelims) + 700+ (Mains)";
    phases = [
      { phase: 1, name: "Foundation", goal: "NCERT basics + newspaper habit", duration: "Months 1-3", tasks: ["NCERT 6-12 (History, Geo, Polity, Economy)", "Daily newspaper (The Hindu/Indian Express)", "Optional subject selection", "Current affairs notebook"] },
      { phase: 2, name: "Topic Completion", goal: "Standard books + optional", duration: "Months 4-7", tasks: ["Laxmikanth (Polity)", "Spectrum (Modern History)", "Economic Survey + Budget", "Optional Paper 1 & 2"] },
      { phase: 3, name: "Practice", goal: "Answer writing + PYQs", duration: "Months 8-10", tasks: ["Daily answer writing (2-3 answers)", "Sectional tests", "PYQ analysis (Prelims + Mains)", "Ethics case studies"] },
      { phase: 4, name: "Revision", goal: "Spaced revision + current affairs", duration: "Months 11-12", tasks: ["Monthly current affairs compilation", "Revision notes daily", "Prelims-specific revision", "Map work + diagrams"] },
      { phase: 5, name: "Mock Tests", goal: "Full-length Prelims + Mains simulations", duration: "Month 13", tasks: ["Daily Prelims mock (GS + CSAT)", "Weekly Mains test", "Test analysis + feedback", "Ethics paper practice"] },
      { phase: 6, name: "Final Revision", goal: "High-yield + prelims strategy", duration: "Month 14 (last 30 days)", tasks: ["Top 100 topics", "Last 5 years PYQs", "Prelims strategy (attempt threshold)", "Stress management + sleep"] },
    ];
    dailyPlans = [
      { day: 1, date: "Day 1", sessions: [
        { subject: "GS", topic: "Polity (Laxmikanth)", durationHours: Math.round(hoursPerDay*0.35*10)/10, activity: "Reading + notes" },
        { subject: "Current Affairs", topic: "Newspaper", durationHours: Math.round(hoursPerDay*0.2*10)/10, activity: "The Hindu + notes" },
        { subject: "Optional", topic: "Optional Paper 1", durationHours: Math.round(hoursPerDay*0.35*10)/10, activity: "Reading" },
        { subject: "Answer Writing", topic: "Practice", durationHours: Math.round(hoursPerDay*0.1*10)/10, activity: "2 answers" },
      ], totalHours: hoursPerDay },
      { day: 2, date: "Day 2", sessions: [
        { subject: "GS", topic: "Modern History (Spectrum)", durationHours: Math.round(hoursPerDay*0.35*10)/10, activity: "Reading + notes" },
        { subject: "Current Affairs", topic: "Current Affairs", durationHours: Math.round(hoursPerDay*0.2*10)/10, activity: "Compilation" },
        { subject: "Optional", topic: "Optional Paper 2", durationHours: Math.round(hoursPerDay*0.35*10)/10, activity: "Reading" },
        { subject: "Ethics", topic: "Case Study", durationHours: Math.round(hoursPerDay*0.1*10)/10, activity: "1 case study" },
      ], totalHours: hoursPerDay },
    ];
    weakSubjects = ["Economy", "Environment & Ecology", "Internal Security"];
    strongSubjects = ["Polity", "Modern History"];
    revisionSchedule = ["Saturday: weekly revision + test", "Sunday: essay practice + optional"];
    mockTestSchedule = ["Month 13: daily Prelims mock", "Last month: 2 mocks/day + analysis"];
    adaptiveNotes = ["Answer writing is key — write daily even if brief", "Current affairs: focus on analysis not just facts", "Optional carries 500 marks — invest heavily", "Prelims is qualifying — don't over-invest"];
  } else if (isBanking) {
    targetScore = "Cut-off clearing (Prelims) + Interview ready";
    phases = [
      { phase: 1, name: "Foundation", goal: "Speed math + English basics", duration: "Weeks 1-3", tasks: ["Simplification + approximation (20/day)", "Number series basics", "Reading comprehension daily", "Grammar rules"] },
      { phase: 2, name: "Topic Completion", goal: "Full syllabus + banking awareness", duration: "Weeks 4-7", tasks: ["All arithmetic topics", "Puzzles + seating arrangement", "Banking awareness (6 months)", "Computer awareness"] },
      { phase: 3, name: "Practice", goal: "Sectional + speed building", duration: "Weeks 8-10", tasks: ["Sectional tests (Quant/Reasoning/English)", "Speed math drill (simplification in 5 min)", "Banking awareness revision", "DI practice"] },
      { phase: 4, name: "Revision", goal: "Spaced revision + formula", duration: "Weeks 11-12", tasks: ["All formulas revision", "Banking GK revision", "Common mistakes list", "Speed benchmark"] },
      { phase: 5, name: "Mock Tests", goal: "Full-length + analysis", duration: "Weeks 13-14", tasks: ["Daily full mock (Prelims)", "Mock analysis (1h)", "Weak section drill", "Interview prep (for PO)"] },
      { phase: 6, name: "Final Revision", goal: "Speed + accuracy + strategy", duration: "Week 15", tasks: ["Simplification speed test", "Puzzle set daily", "Last 5 years PYQs", "Exam strategy (attempt order)"] },
    ];
    dailyPlans = [
      { day: 1, date: "Day 1", sessions: [
        { subject: "Quant", topic: "Simplification", durationHours: Math.round(hoursPerDay*0.35*10)/10, activity: "20 questions speed drill" },
        { subject: "Reasoning", topic: "Puzzles", durationHours: Math.round(hoursPerDay*0.3*10)/10, activity: "2 puzzles" },
        { subject: "English", topic: "Reading Comprehension", durationHours: Math.round(hoursPerDay*0.2*10)/10, activity: "2 passages" },
        { subject: "Banking Awareness", topic: "Current Affairs", durationHours: Math.round(hoursPerDay*0.15*10)/10, activity: "6 months revision" },
      ], totalHours: hoursPerDay },
      { day: 2, date: "Day 2", sessions: [
        { subject: "Quant", topic: "Data Interpretation", durationHours: Math.round(hoursPerDay*0.35*10)/10, activity: "5 DI sets" },
        { subject: "Reasoning", topic: "Syllogism + Coding", durationHours: Math.round(hoursPerDay*0.3*10)/10, activity: "Practice set" },
        { subject: "English", topic: "Cloze Test", durationHours: Math.round(hoursPerDay*0.2*10)/10, activity: "Practice" },
        { subject: "Computer", topic: "Computer Awareness", durationHours: Math.round(hoursPerDay*0.15*10)/10, activity: "Notes + MCQs" },
      ], totalHours: hoursPerDay },
    ];
    weakSubjects = ["Banking Awareness", "Descriptive English (PO)", "Computer Awareness"];
    strongSubjects = ["Simplification", "Number Series"];
    revisionSchedule = ["Saturday: weekly revision + sectional test", "Sunday: full mock + analysis"];
    mockTestSchedule = ["From week 13: daily Prelims mock", "Last week: 2 mocks/day"];
    adaptiveNotes = ["Speed is everything — practice simplification daily", "Banking awareness = 6 months current affairs + static banking", "Puzzles carry high weightage — master them", "PO includes descriptive — practice essay + letter weekly"];
  } else {
    // SSC CGL default
    targetScore = "180/200 (Tier 1)";
    phases = [
      { phase: 1, name: "Foundation", goal: "Concept building", duration: "Weeks 1-4", tasks: ["Arithmetic basics", "Reasoning patterns", "English grammar", "Daily vocab (30 words)"] },
      { phase: 2, name: "Topic Completion", goal: "Complete syllabus", duration: "Weeks 5-8", tasks: ["Advanced arithmetic + Geometry", "All reasoning types", "Reading comprehension + cloze test", "Static GK + current affairs"] },
      { phase: 3, name: "Practice", goal: "Topic-wise + PYQs", duration: "Weeks 9-12", tasks: ["Sectional tests", "Last 5 years PYQs", "Speed practice (100Q/60min)", "Error log maintenance"] },
      { phase: 4, name: "Revision", goal: "Spaced revision", duration: "Weeks 13-14", tasks: ["Weak topics revision", "Formula sheet revision", "Current affairs (last 6 months)", "Common mistakes review"] },
      { phase: 5, name: "Mock Tests", goal: "Full-length simulations", duration: "Weeks 15-16", tasks: ["Daily full mock (Tier 1)", "Mock analysis (1.5h)", "Targeted repractice", "Time management drill"] },
      { phase: 6, name: "Final Revision", goal: "High-priority + weak areas", duration: "Week 17", tasks: ["Top 20 topics", "Last 3 years PYQs", "Exam strategy (attempt order)", "Stress management"] },
    ];
    dailyPlans = [
      { day: 1, date: "Day 1", sessions: [
        { subject: "Quant", topic: "Percentage", durationHours: Math.round(hoursPerDay*0.5*10)/10, activity: "Concept + practice" },
        { subject: "Reasoning", topic: "Series", durationHours: Math.round(hoursPerDay*0.25*10)/10, activity: "Practice set" },
        { subject: "English", topic: "Vocab", durationHours: Math.round(hoursPerDay*0.25*10)/10, activity: "Daily 30 words" },
      ], totalHours: hoursPerDay },
      { day: 2, date: "Day 2", sessions: [
        { subject: "Quant", topic: "Profit & Loss", durationHours: Math.round(hoursPerDay*0.5*10)/10, activity: "Concept + practice" },
        { subject: "Reasoning", topic: "Coding-Decoding", durationHours: Math.round(hoursPerDay*0.25*10)/10, activity: "Practice set" },
        { subject: "GA", topic: "Current Affairs", durationHours: Math.round(hoursPerDay*0.25*10)/10, activity: "Last 6 months" },
      ], totalHours: hoursPerDay },
      { day: 3, date: "Day 3", sessions: [
        { subject: "Quant", topic: "Ratio", durationHours: Math.round(hoursPerDay*0.5*10)/10, activity: "Practice" },
        { subject: "English", topic: "RC", durationHours: Math.round(hoursPerDay*0.25*10)/10, activity: "2 passages" },
        { subject: "Reasoning", topic: "Puzzles", durationHours: Math.round(hoursPerDay*0.25*10)/10, activity: "Practice" },
      ], totalHours: hoursPerDay },
    ];
    weakSubjects = ["General Awareness", "Advanced Maths"];
    strongSubjects = ["Arithmetic", "Reasoning"];
    revisionSchedule = ["Saturday: weekly revision", "Sunday: full mock"];
    mockTestSchedule = ["From week 13: daily full mock", "Last week: 2 mocks/day"];
    adaptiveNotes = ["If a topic is consistently weak, allocate 1 extra hour for 3 days", "After each mock, spend 1.5 hours on analysis", "SSC CGL rewards speed — practice 100Q in 60min", "Current affairs: focus on last 6 months before exam"];
  }

  return {
    targetExam,
    examDate,
    currentLevel,
    availableHoursPerDay: hoursPerDay,
    daysPerWeek,
    targetScore,
    totalDays,
    phases,
    dailyPlans,
    weakSubjects,
    strongSubjects,
    revisionSchedule,
    mockTestSchedule,
    adaptiveNotes,
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockMultiExam(query: string): unknown {
  // Extract exam names + priorities from the query
  let exams: { name: string; priority: "Primary" | "Secondary" | "Backup"; date?: string; targetScore?: string }[] = [];
  const examsMatch = query.match(/\[([\s\S]*?)\]/);
  if (examsMatch) {
    try {
      const parsed = JSON.parse("[" + examsMatch[1] + "]");
      if (Array.isArray(parsed)) {
        exams = parsed.map((e: any, i: number) => ({
          name: String(e?.name ?? e ?? `Exam ${i+1}`),
          priority: (["Primary", "Secondary", "Backup"] as const)[Math.min(i, 2)] ?? "Backup",
          date: e?.date,
          targetScore: e?.targetScore,
        }));
      }
    } catch {}
  }
  if (exams.length < 2) {
    exams = [
      { name: "SSC CGL", priority: "Primary", date: "2025-06-15", targetScore: "180/200" },
      { name: "Banking PO", priority: "Secondary", date: "2025-07-20", targetScore: "Cut-off clearing" },
      { name: "Railway NTPC", priority: "Backup", date: "2025-09-01", targetScore: "Qualifying" },
    ];
  }

  let availableHours = 5;
  const hoursMatch = query.match(/availableHours[:\s]+(\d+)/);
  if (hoursMatch) availableHours = parseInt(hoursMatch[1]);

  const examNames = exams.map((e) => e.name.toLowerCase());
  const isGATE = examNames.some((n) => n.includes("gate"));
  const isUPSC = examNames.some((n) => n.includes("upsc") || n.includes("cse"));
  const isSSC = examNames.some((n) => n.includes("ssc") || n.includes("cgl") || n.includes("chsl") || n.includes("ntpc"));
  const isBanking = examNames.some((n) => n.includes("bank") || n.includes("po") || n.includes("ibps"));

  let common, examSpecific, combinedStrategy, conflicts, weeklySchedule;

  if (isGATE && isUPSC) {
    // GATE + UPSC combo
    common = ["General Aptitude", "Verbal Ability", "Logical Reasoning", "Numerical Ability"];
    examSpecific = exams.map((e) => ({
      exam: e.name,
      priority: e.priority,
      topics: e.name.toLowerCase().includes("gate")
        ? ["Engineering Mathematics", "Technical subjects (DS/Algorithms/OS)", "Digital Logic", "Computer Networks"]
        : ["NCERT (History, Geography, Polity)", "Current Affairs", "Optional subject", "Ethics & Case Studies"],
    }));
    combinedStrategy = {
      commonPreparation: ["Aptitude (overlaps GATE GA + UPSC CSAT)", "Verbal ability + reading comprehension", "Numerical ability + basic math"],
      examSpecificPreparation: exams.map((e) => ({
        exam: e.name,
        topics: e.name.toLowerCase().includes("gate") ? ["Engineering Math", "Technical subjects", "Virtual calculator practice"] : ["NCERTs", "Standard books", "Answer writing practice", "Optional"],
      })),
      priority: ["Shared aptitude foundation", "GATE technical focus (primary)", "UPSC NCERT + current affairs (ongoing)", "Answer writing for UPSC"],
      dependencies: ["Basic math before numerical ability", "NCERT before standard books", "Aptitude before technical"],
      scheduling: ["Morning: Aptitude (shared)", "Afternoon: GATE technical", "Evening: UPSC current affairs + reading"],
      revision: ["Weekend: subject revision (GATE technical + UPSC optional)", "Spaced repetition for formulas + facts"],
      mockTesting: ["GATE mocks: 3 months before GATE", "UPSC tests: weekly answer writing + monthly sectional"],
    };
    conflicts = [
      { type: "Different scope", description: "GATE is technical + objective; UPSC is general studies + subjective", reason: "Different preparation approaches" },
      { type: "Different timeline", description: "GATE is 3h single paper; UPSC is 2-stage (Prelims + Mains) spanning months", reason: "Schedule conflicts during overlap" },
      { type: "Different marking", description: "GATE has 1/3 + 2/3 negative; UPSC has 1/3 negative (Prelims only)", reason: "Different risk strategies" },
    ];
  } else if (isSSC && isBanking) {
    // SSC + Banking combo (most common)
    common = ["Quantitative Aptitude", "Reasoning Ability", "English Language", "General Awareness"];
    examSpecific = exams.map((e) => ({
      exam: e.name,
      priority: e.priority,
      topics: e.name.toLowerCase().includes("bank")
        ? ["Banking Awareness", "Computer Awareness", "Descriptive English (PO)"]
        : e.name.toLowerCase().includes("ntpc") || e.name.toLowerCase().includes("railway")
        ? ["Railway Awareness", "Typing Test"]
        : ["Advanced Maths", "Static GK", "Statistics (JSO)"],
    }));
    combinedStrategy = {
      commonPreparation: ["Arithmetic (Percentage, Ratio, P&L, Time-Speed-Distance)", "Reasoning (Series, Coding, Puzzles)", "English (Grammar, Vocab, RC)", "Current Affairs (last 6 months)"],
      examSpecificPreparation: exams.map((e) => ({
        exam: e.name,
        topics: e.name.toLowerCase().includes("bank") ? ["Banking/Financial Awareness", "Computer Awareness", "Descriptive writing"] : e.name.toLowerCase().includes("ntpc") ? ["Railway-specific GK", "Typing practice"] : ["Advanced Math (Geometry, Trigo)", "Static GK (History, Polity, Geography)"],
      })),
      priority: ["Shared arithmetic foundation (6 weeks)", "Reasoning + English (parallel)", "Then exam-specific specialization", "Mock tests closer to each exam"],
      dependencies: ["Percentage before P&L before Discount", "Ratio before Mixture before Alligation", "Series before complex puzzles"],
      scheduling: ["Morning: Quant (common — 2h)", "Afternoon: Reasoning (common — 1.5h)", "Evening: English + exam-specific GA (1.5h)"],
      revision: ["Saturday: weekly revision + sectional test", "Sunday: full mock (rotating exam) + analysis"],
      mockTesting: ["SSC mocks: from week 10", "Banking mocks: from week 11", "Railway mocks: from week 13"],
    };
    conflicts = [
      { type: "Different speed requirements", description: "SSC = 100Q/60min (1.5 min/Q); Banking = 100Q/60min but DI-heavy", reason: "Pace strategies differ" },
      { type: "Different negative marking", description: "SSC -0.5/Q; Banking -0.25/Q; Railway -0.33/Q", reason: "Risk tolerance differs — SSC penalizes more" },
      { type: "Different awareness focus", description: "SSC = static GK; Banking = banking/financial; Railway = rail-specific", reason: "Requires separate GA prep — cannot share" },
      { type: "Typing requirement", description: "CHSL + NTPC require typing; SSC CGL + Banking PO don't", reason: "Typing practice takes time from core prep" },
    ];
  } else if (isGATE) {
    // Multiple GATE papers
    common = ["Engineering Mathematics", "General Aptitude", "Numerical Ability", "Verbal Ability"];
    examSpecific = exams.map((e) => ({
      exam: e.name,
      priority: e.priority,
      topics: e.name.toLowerCase().includes("cs") ? ["Data Structures", "Algorithms", "OS", "DBMS", "Networks"]
        : e.name.toLowerCase().includes("me") ? ["Thermodynamics", "Fluid Mechanics", "Manufacturing", "SOM"]
        : e.name.toLowerCase().includes("ce") ? ["Structural", "Geotechnical", "Hydrology"]
        : e.name.toLowerCase().includes("ec") ? ["Signals & Systems", "Analog Circuits", "Electromagnetics"]
        : ["Technical subjects"],
    }));
    combinedStrategy = {
      commonPreparation: ["Engineering Mathematics (Linear Algebra, Calculus, Probability)", "General Aptitude (15 marks common)", "Numerical + Verbal Ability"],
      examSpecificPreparation: exams.map((e) => ({ exam: e.name, topics: ["Discipline-specific technical subjects", "PYQs for that discipline"] })),
      priority: ["Shared Engineering Math (high weightage)", "Shared Aptitude", "Primary exam technical focus", "Secondary exam technical (maintenance)"],
      dependencies: ["Math before numerical problems", "Aptitude before technical"],
      scheduling: ["Morning: Engineering Math (shared)", "Afternoon: Primary technical", "Evening: Secondary technical or aptitude"],
      revision: ["Weekend: formula revision + subject tests", "Spaced repetition for technical concepts"],
      mockTesting: ["Primary exam mocks: weekly", "Secondary: monthly"],
    };
    conflicts = [
      { type: "Different technical syllabi", description: "Each GATE paper tests different technical domains", reason: "Minimal technical overlap" },
      { type: "Shared Math + Aptitude", description: "15 marks Engineering Math + 15 marks Aptitude common", reason: "Can be shared efficiently" },
    ];
  } else {
    // Generic default (SSC family)
    common = ["Quantitative Aptitude", "Reasoning", "English", "General Awareness"];
    examSpecific = exams.map((e, i) => ({
      exam: e.name,
      priority: e.priority,
      topics: i === 0 ? ["Advanced topics", "Exam-specific GK"] : i === 1 ? ["Specific awareness", "Additional subjects"] : ["Backup exam topics"],
    }));
    combinedStrategy = {
      commonPreparation: ["Arithmetic basics", "Reasoning patterns", "English grammar + vocab", "Current affairs"],
      examSpecificPreparation: exams.map((e) => ({ exam: e.name, topics: ["Exam-specific topics"] })),
      priority: ["Shared foundations", "Primary exam focus", "Secondary maintenance", "Backup mock-only"],
      dependencies: ["Percentage before P&L", "Tables before quick arithmetic"],
      scheduling: ["Morning: Quant", "Afternoon: Reasoning", "Evening: English + GA"],
      revision: ["Weekend revision + mocks"],
      mockTesting: ["Primary mocks weekly", "Secondary monthly"],
    };
    conflicts = [
      { type: "Different patterns", description: "Each exam has different pattern", reason: "Requires separate mock practice" },
      { type: "Different marking", description: "Negative marking varies", reason: "Different risk strategies" },
    ];
  }

  weeklySchedule = [
    { day: "Monday", sessions: ["Quant (common): 2h", "Reasoning: 1.5h", "English: 1.5h"] },
    { day: "Tuesday", sessions: [exams[0] ? `Quant (${exams[0].name}-specific): 1.5h` : "Quant (specific): 1.5h", exams[1] ? `${exams[1].name} prep: 1.5h` : "Exam 2 prep: 1.5h", "Reasoning: 2h"] },
    { day: "Wednesday", sessions: ["Quant (common): 2h", "English: 1.5h", "General prep: 1.5h"] },
    { day: "Thursday", sessions: [exams[1] ? `Quant (${exams[1].name}-specific): 1.5h` : "Quant (specific): 1.5h", "Computer/Specific: 1.5h", "Reasoning: 2h"] },
    { day: "Friday", sessions: ["Quant (common): 2h", "Current Affairs: 1.5h", exams[2] ? `${exams[2].name} GK: 1.5h` : "Backup prep: 1.5h"] },
    { day: "Saturday", sessions: ["Weekly revision: 2.5h", "Sectional test: 2.5h"] },
    { day: "Sunday", sessions: ["Full mock (rotating): 2h", "Analysis: 1.5h", "Weak topic: 1.5h"] },
  ];

  return {
    exams,
    availableHours,
    knowledgeMap: {
      common,
      examSpecific,
    },
    combinedStrategy,
    conflicts,
    weeklySchedule,
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockPerformance(_query: string): unknown {
  return {
    score: 142,
    maxMarks: 200,
    accuracy: 76,
    correct: 78,
    incorrect: 14,
    unattempted: 8,
    timeUsed: "55 min",
    avgTimePerQuestion: "33 sec",
    topicWise: [
      { topic: "Percentage", correct: 8, total: 10, accuracy: 80 },
      { topic: "Profit & Loss", correct: 6, total: 10, accuracy: 60 },
      { topic: "Ratio", correct: 9, total: 10, accuracy: 90 },
      { topic: "Series", correct: 7, total: 10, accuracy: 70 },
      { topic: "RC", correct: 8, total: 10, accuracy: 80 },
    ],
    difficultyWise: [
      { difficulty: "Easy", correct: 28, total: 30, accuracy: 93 },
      { difficulty: "Medium", correct: 35, total: 45, accuracy: 78 },
      { difficulty: "Hard", correct: 15, total: 25, accuracy: 60 },
    ],
    questionTypeWise: [{ type: "MCQ", correct: 78, total: 100, accuracy: 78 }],
    negativeMarkImpact: -7,
    strengths: ["Ratio", "Percentage", "Reading Comprehension"],
    weakAreas: ["Profit & Loss", "Hard difficulty questions"],
    conceptualErrors: ["Misapplied successive percentage formula", "Confused CP and SP in 2 questions"],
    calculationErrors: ["2 arithmetic slips in Profit & Loss"],
    questionSelectionErrors: ["Spent 4 min on 1 hard question — should have skipped"],
    recommendedPractice: ["Revise Profit & Loss → 15 Level-2 variants → 5 PYQs → mixed test"],
    generatedAt: new Date().toISOString(),
  };
}

function mockFlashcards(query: string): unknown {
  // Detect the topic from the user prompt so the canned cards feel relevant.
  // The prompt includes lines like "- Topic: SSC CGL" or "- Topic: Calculus".
  const lower = query.toLowerCase();
  const topicMatch = query.match(/topic:\s*([^\n]+)/i);
  let topic = topicMatch?.[1]?.trim() ?? "";

  type RawCard = {
    front: string;
    back: string;
    topic: string;
    difficulty: "Easy" | "Medium" | "Hard";
  };

  let cards: RawCard[] = [];

  if (lower.includes("ssc cgl") || lower.includes("general awareness")) {
    topic = topic || "SSC CGL — General Awareness";
    cards = [
      { front: "Who appoints the Chief Election Commissioner of India?", back: "The President of India appoints the Chief Election Commissioner on the advice of the Union Council.", topic: "Polity", difficulty: "Easy" },
      { front: "Which Article of the Indian Constitution deals with the Right to Equality?", back: "Articles 14–18 — Article 14 guarantees equality before law and equal protection of laws.", topic: "Polity", difficulty: "Medium" },
      { front: "The Quit India Movement was launched in which year?", back: "1942 — launched by Gandhi on 8 August with the slogan 'Do or Die'.", topic: "Modern History", difficulty: "Easy" },
      { front: "Which river is known as the 'Sorrow of Bihar'?", back: "The Kosi river, due to frequent flooding that causes widespread damage in Bihar.", topic: "Geography", difficulty: "Medium" },
      { front: "Who is known as the 'Missile Man of India'?", back: "Dr. A.P.J. Abdul Kalam — for his work on India's missile and nuclear programmes.", topic: "General Knowledge", difficulty: "Easy" },
      { front: "The Tropic of Cancer passes through how many Indian states?", back: "8 states — Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, WB, Tripura, Mizoram.", topic: "Geography", difficulty: "Hard" },
      { front: "Which vitamin is produced when human skin is exposed to sunlight?", back: "Vitamin D (cholecalciferol) — synthesised in the skin from UV exposure.", topic: "Science", difficulty: "Medium" },
      { front: "Who founded the Mauryan Empire?", back: "Chandragupta Maurya in 322 BCE, with guidance from his mentor Chanakya (Kautilya).", topic: "Ancient History", difficulty: "Medium" },
      { front: "What is the currency of Japan?", back: "The Japanese Yen (¥) — the official currency issued by the Bank of Japan.", topic: "General Knowledge", difficulty: "Easy" },
      { front: "Which gas is most abundant in Earth's atmosphere?", back: "Nitrogen — about 78% of the atmosphere by volume, followed by oxygen at ~21%.", topic: "Science", difficulty: "Easy" },
    ];
  } else if (lower.includes("calculus") || lower.includes("derivative") || lower.includes("integral")) {
    topic = topic || "Calculus";
    cards = [
      { front: "What is the derivative of sin(x) with respect to x?", back: "cos(x) — i.e. d/dx[sin x] = cos x.", topic: "Differentiation", difficulty: "Easy" },
      { front: "State the power rule for differentiation.", back: "d/dx[x^n] = n·x^(n−1) for any real n.", topic: "Differentiation", difficulty: "Easy" },
      { front: "What is ∫ 1/x dx?", back: "ln|x| + C — the natural log of the absolute value, plus the constant of integration.", topic: "Integration", difficulty: "Medium" },
      { front: "State the chain rule for differentiation.", back: "d/dx[f(g(x))] = f'(g(x)) · g'(x) — the outer derivative times the inner derivative.", topic: "Differentiation", difficulty: "Medium" },
      { front: "What is the derivative of e^x?", back: "e^x — the exponential function is its own derivative.", topic: "Differentiation", difficulty: "Easy" },
      { front: "Evaluate ∫ 0 to 1 of x dx.", back: "1/2 — using ∫x dx = x²/2, evaluated as (1²/2) − (0²/2) = 1/2.", topic: "Integration", difficulty: "Medium" },
      { front: "What is L'Hôpital's Rule used for?", back: "To evaluate limits of indeterminate forms 0/0 or ∞/∞ by differentiating numerator and denominator separately.", topic: "Limits", difficulty: "Hard" },
      { front: "What does the Fundamental Theorem of Calculus connect?", back: "It connects differentiation and integration: ∫ₐᵇ f(x) dx = F(b) − F(a) where F' = f.", topic: "Integration", difficulty: "Hard" },
      { front: "What is the derivative of ln(x)?", back: "1/x for x > 0.", topic: "Differentiation", difficulty: "Easy" },
      { front: "Find d/dx[tan(x)].", back: "sec²(x).", topic: "Differentiation", difficulty: "Medium" },
    ];
  } else if (lower.includes("vocab") || lower.includes("english")) {
    topic = topic || "English Vocabulary";
    cards = [
      { front: "What does 'ephemeral' mean?", back: "Lasting for a very short time; transitory. e.g. ephemeral fame.", topic: "Vocabulary", difficulty: "Easy" },
      { front: "Synonym of 'benevolent'?", back: "Kind, generous, charitable — wishing well to others.", topic: "Synonyms", difficulty: "Easy" },
      { front: "Antonym of 'meticulous'?", back: "Careless, sloppy, negligent — the opposite of careful attention to detail.", topic: "Antonyms", difficulty: "Medium" },
      { front: "What does 'ubiquitous' mean?", back: "Present, appearing, or found everywhere. e.g. smartphones are ubiquitous today.", topic: "Vocabulary", difficulty: "Medium" },
      { front: "Idiom meaning of 'bite the bullet'?", back: "To endure a painful or difficult situation with courage, without complaining.", topic: "Idioms", difficulty: "Medium" },
      { front: "What does 'pragmatic' mean?", back: "Dealing with things sensibly and realistically, based on practical rather than theoretical considerations.", topic: "Vocabulary", difficulty: "Hard" },
      { front: "Synonym of 'augment'?", back: "Increase, enlarge, supplement — to make something greater in size or amount.", topic: "Synonyms", difficulty: "Easy" },
      { front: "What does 'candid' mean?", back: "Truthful and straightforward; frank and unreserved in speech.", topic: "Vocabulary", difficulty: "Easy" },
    ];
  } else if (lower.includes("reasoning") || lower.includes("pattern")) {
    topic = topic || "Reasoning — Patterns";
    cards = [
      { front: "Find the next number: 2, 6, 12, 20, 30, ?", back: "42 — differences are 4, 6, 8, 10, 12; second difference is constant 2.", topic: "Number Series", difficulty: "Medium" },
      { front: "If CAT = 24, DOG = 26, what is FOX?", back: "44 — sum of letter positions: F(6)+O(15)+X(24) = 45; or by reverse pattern, 44.", topic: "Coding-Decoding", difficulty: "Hard" },
      { front: "Odd one out: 3, 5, 7, 9, 11, 13", back: "9 — it is the only composite number; the rest are primes.", topic: "Odd One Out", difficulty: "Easy" },
      { front: "Complete the analogy: Book : Author :: Painting : ?", back: "Painter — the creator-to-creation relationship.", topic: "Analogy", difficulty: "Easy" },
      { front: "Next in series: A, C, F, J, O, ?", back: "U — gaps are +2, +3, +4, +5, +6 → O(15) + 6 = U(21).", topic: "Letter Series", difficulty: "Medium" },
      { front: "If 'TABLE' is coded as 'UCAMF', what is 'CHAIR'?", back: "DIBJS — each letter shifted +1 forward in the alphabet.", topic: "Coding-Decoding", difficulty: "Medium" },
      { front: "Which number does not belong: 4, 9, 16, 23, 25, 36?", back: "23 — it is the only prime; the rest are perfect squares.", topic: "Odd One Out", difficulty: "Medium" },
      { front: "Direction: A walks 3 km North, turns East, walks 4 km. Distance from start?", back: "5 km — forms a 3-4-5 right triangle (Pythagoras).", topic: "Direction Sense", difficulty: "Hard" },
    ];
  } else if (lower.includes("quant") || lower.includes("formula") || lower.includes("aptitude")) {
    topic = topic || "Quantitative Aptitude — Formulas";
    cards = [
      { front: "Formula for compound interest (amount) when compounded annually?", back: "A = P(1 + r/100)^n, where P = principal, r = rate %, n = years.", topic: "Interest", difficulty: "Medium" },
      { front: "Formula for speed when distance and time are known?", back: "Speed = Distance / Time. SI unit: m/s; commonly km/h.", topic: "Time-Speed-Distance", difficulty: "Easy" },
      { front: "Profit % formula?", back: "Profit % = (Profit / Cost Price) × 100, where Profit = SP − CP.", topic: "Profit & Loss", difficulty: "Easy" },
      { front: "Formula for average of n numbers?", back: "Average = (Sum of all values) / (Number of values).", topic: "Average", difficulty: "Easy" },
      { front: "Time taken by two pipes together to fill a tank?", back: "If pipes fill in a and b hours alone: T = (a·b)/(a+b) hours.", topic: "Pipes & Cisterns", difficulty: "Medium" },
      { front: "Quadratic formula to solve ax² + bx + c = 0?", back: "x = [−b ± √(b² − 4ac)] / 2a, where the discriminant Δ = b² − 4ac.", topic: "Algebra", difficulty: "Medium" },
      { front: "Formula for area of a trapezium?", back: "A = ½ × (sum of parallel sides) × height = ½(a + b)·h.", topic: "Mensuration", difficulty: "Medium" },
      { front: "If x men finish a job in d days, how many days for (x+k) men?", back: "Days = (x·d)/(x+k) — inverse proportion (assuming equal efficiency).", topic: "Time & Work", difficulty: "Hard" },
    ];
  } else {
    topic = topic || "General Aptitude";
    cards = [
      { front: "What is 15% of 240?", back: "36 — calculate 10% = 24, then 5% = 12; 24 + 12 = 36.", topic: "Percentage", difficulty: "Easy" },
      { front: "If the ratio of A:B is 3:4 and A is 27, what is B?", back: "36 — common multiplier is 9 (27/3); B = 4 × 9 = 36.", topic: "Ratio", difficulty: "Easy" },
      { front: "Average of 5, 10, 15, 20, 25?", back: "15 — sum = 75, divided by 5 = 15.", topic: "Average", difficulty: "Easy" },
      { front: "A train travels 60 km in 45 minutes. What is its speed in km/h?", back: "80 km/h — 45 min = 0.75 h; speed = 60 / 0.75 = 80.", topic: "Speed", difficulty: "Medium" },
      { front: "What is the SI unit of force?", back: "The newton (N) — 1 N = 1 kg·m/s².", topic: "Physics", difficulty: "Easy" },
      { front: "What is HCF of 12, 18, 24?", back: "6 — the largest number that divides all three without remainder.", topic: "Number System", difficulty: "Medium" },
      { front: "Find the missing term: 1, 4, 9, 16, ?, 36", back: "25 — perfect squares of 1, 2, 3, 4, 5, 6.", topic: "Series", difficulty: "Easy" },
      { front: "If a:b = 2:3 and b:c = 4:5, find a:c.", back: "8:15 — combine by making b common (12): a:b:c = 8:12:15.", topic: "Ratio", difficulty: "Hard" },
    ];
  }

  const today = new Date().toISOString();
  const out = cards.slice(0, 10).map((c, i) => ({
    id: `fc${i + 1}`,
    front: c.front,
    back: c.back,
    topic: c.topic,
    difficulty: c.difficulty,
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: today,
    mastery: "New" as const,
  }));

  const sourceMatch = query.match(/source label:\s*([^\n]+)/i);
  const source = sourceMatch?.[1]?.trim() || "Custom topic";

  return {
    id: `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    source,
    topic,
    cards: out,
    sources: [{ type: "AI_GENERATED", label: "ExamIntel Flashcard Generator" }],
    generatedAt: today,
  };
}

// ============================================================
// Formula Sheet lookup — searches the built-in SEED_FORMULAS by
// keyword (name / topic / subject match). Returns 3–5 matches, or
// all formulas when no keyword in the query matches anything.
// ============================================================
function mockFormulasLookup(query: string): unknown {
  const lower = query.toLowerCase();

  // Tokenize the query into candidate keywords (drop short / stop words).
  const stop = new Set([
    "the", "a", "an", "of", "for", "and", "or", "to", "in", "is", "are",
    "what", "whats", "formula", "formulas", "formulae", "lookup", "search",
    "find", "me", "please", "give", "show", "list", "all", "with",
  ]);
  const tokens = lower
    .split(/[^a-z0-9&+-]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !stop.has(t));

  const matched = SEED_FORMULAS.filter((f) => {
    const hay = `${f.subject} ${f.topic} ${f.name} ${f.description}`.toLowerCase();
    return tokens.some((tok) => hay.includes(tok));
  });

  // De-dup by id (in case the same formula matches multiple tokens).
  const seen = new Set<string>();
  const unique = matched.filter((f) =>
    seen.has(f.id) ? false : (seen.add(f.id), true)
  );

  // 3–5 matches when possible; if fewer keywords match, fall back to all.
  let result = unique;
  if (unique.length < 3) {
    result = SEED_FORMULAS.slice();
  }
  const capped = result.slice(0, 5);

  return {
    formulas: capped.map((f) => ({
      id: f.id,
      subject: f.subject,
      topic: f.topic,
      name: f.name,
      formula: f.formula,
      description: f.description,
      example: f.example,
      difficulty: f.difficulty,
    })),
  };
}

// ============================================================
// PYQ Browser mock — routes on schema hint "PYQSet"/"PYQList"
// or system/user text containing "PYQ Browser" / "Similar-Question
// Finder". Detects the exam from the query text and returns 8–10
// realistic previous-year questions for SSC CGL, GATE CS, or a
// default mixed-quant set. Years vary across 2020–2024.
// ============================================================
type MockPYQ = {
  id: string;
  exam: string;
  year: string;
  topic: string;
  subject: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: "Easy" | "Medium" | "Hard";
  marks: number;
  sourceType: string;
  similarityReason?: string;
};

function mockPYQs(query: string): unknown {
  const q = query.toLowerCase();
  const isSimilar = q.includes("similar-question finder") || q.includes("find similar");
  const reqExamMatch = query.match(/exam:\s*([^\n]+)/i);
  const reqYearMatch = query.match(/year:\s*([^\n]+)/i);
  const reqTopicMatch = query.match(/topic filter:\s*([^\n]+)/i);

  let exam = "SSC CGL";
  if (reqExamMatch && reqExamMatch[1]) {
    const v = reqExamMatch[1].trim();
    if (v.toLowerCase() !== "all") exam = v;
  } else if (q.includes("ssc cgl")) {
    exam = "SSC CGL";
  } else if (q.includes("gate")) {
    exam = "GATE CS";
  } else if (q.includes("upsc")) {
    exam = "UPSC CSE";
  } else if (q.includes("rrb") || q.includes("railway")) {
    exam = "RRB JE";
  } else if (q.includes("banking") || q.includes("ibps") || q.includes("sbi")) {
    exam = "Banking PO";
  }

  const year = reqYearMatch && /^\d{4}$/.test(reqYearMatch[1]?.trim() ?? "") ? reqYearMatch[1].trim() : "";
  const topic = reqTopicMatch && reqTopicMatch[1] ? reqTopicMatch[1].trim() : "";

  const years = year ? Array(10).fill(year) : ["2024", "2023", "2024", "2022", "2023", "2021", "2024", "2020", "2023", "2022"];
  const baseId = isSimilar ? "sim" : "pyq";

  let pyqs: MockPYQ[] = [];

  if (exam === "SSC CGL") {
    pyqs = [
      {
        id: `${baseId}1`,
        exam: "SSC CGL",
        year: years[0],
        topic: "Percentage",
        subject: "Quantitative Aptitude",
        question: "A shopkeeper marks his goods 40% above the cost price and allows a discount of 10%. What is his profit percentage?",
        options: ["26%", "30%", "32%", "36%"],
        correctAnswer: "26%",
        explanation: "If CP = 100, MP = 140. After 10% discount, SP = 126. Profit = 26, so profit % = 26%.",
        difficulty: "Medium",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}2`,
        exam: "SSC CGL",
        year: years[1],
        topic: "Profit & Loss",
        subject: "Quantitative Aptitude",
        question: "If the cost price of 12 articles equals the selling price of 10 articles, the profit percentage is:",
        options: ["15%", "20%", "25%", "18%"],
        correctAnswer: "20%",
        explanation: "Let CP per article = 10. Then SP of 10 = 120, so SP per article = 12. Profit = 2 on CP 10 = 20%.",
        difficulty: "Easy",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}3`,
        exam: "SSC CGL",
        year: years[2],
        topic: "Ratio & Proportion",
        subject: "Quantitative Aptitude",
        question: "If A : B = 2 : 3 and B : C = 4 : 5, then A : C is:",
        options: ["2 : 5", "8 : 15", "8 : 5", "3 : 5"],
        correctAnswer: "8 : 15",
        explanation: "Make B common: A : B = 8 : 12 and B : C = 12 : 15, so A : C = 8 : 15.",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}4`,
        exam: "SSC CGL",
        year: years[3],
        topic: "Time & Work",
        subject: "Quantitative Aptitude",
        question: "A can do a piece of work in 20 days and B in 30 days. Working together, in how many days will they finish it?",
        options: ["10 days", "12 days", "15 days", "18 days"],
        correctAnswer: "12 days",
        explanation: "Combined rate = 1/20 + 1/30 = 5/60 = 1/12. So they finish in 12 days.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}5`,
        exam: "SSC CGL",
        year: years[4],
        topic: "Series",
        subject: "General Intelligence & Reasoning",
        question: "Find the next number in the series: 2, 6, 12, 20, 30, ?",
        options: ["40", "42", "44", "46"],
        correctAnswer: "42",
        explanation: "Differences are 4, 6, 8, 10, 12 — increasing by 2 each step. Next term = 30 + 12 = 42.",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}6`,
        exam: "SSC CGL",
        year: years[5],
        topic: "Coding-Decoding",
        subject: "General Intelligence & Reasoning",
        question: "If 'TABLE' is coded as 'UCAMF', then 'CHAIR' is coded as:",
        options: ["DIBJS", "DIKJR", "DJBKT", "DJCLT"],
        correctAnswer: "DIBJS",
        explanation: "Each letter is shifted +1: T→U, A→B, B→C, L→M, E→F. Same rule: C→D, H→I, A→B, I→J, R→S.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}7`,
        exam: "SSC CGL",
        year: years[6],
        topic: "Reading Comprehension",
        subject: "English Language",
        question: "Choose the word most nearly OPPOSITE in meaning to 'BENEVOLENT':",
        options: ["Malevolent", "Generous", "Charitable", "Amiable"],
        correctAnswer: "Malevolent",
        explanation: "'Benevolent' means kind and well-meaning; the antonym is 'Malevolent' (wishing harm).",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}8`,
        exam: "SSC CGL",
        year: years[7],
        topic: "Polity",
        subject: "General Awareness",
        question: "Which Article of the Indian Constitution deals with the Right to Equality?",
        options: ["Article 14", "Article 19", "Article 21", "Article 32"],
        correctAnswer: "Article 14",
        explanation: "Article 14 guarantees equality before law and equal protection of laws to all persons within Indian territory.",
        difficulty: "Medium",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}9`,
        exam: "SSC CGL",
        year: years[8],
        topic: "Mensuration",
        subject: "Quantitative Aptitude",
        question: "The area of a trapezium whose parallel sides are 12 cm and 18 cm and the distance between them is 10 cm is:",
        options: ["150 cm²", "140 cm²", "120 cm²", "180 cm²"],
        correctAnswer: "150 cm²",
        explanation: "Area = ½ × (sum of parallel sides) × height = ½ × (12 + 18) × 10 = ½ × 30 × 10 = 150 cm².",
        difficulty: "Hard",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}10`,
        exam: "SSC CGL",
        year: years[9],
        topic: "Modern History",
        subject: "General Awareness",
        question: "The Quit India Movement was launched by Mahatma Gandhi in which year?",
        options: ["1940", "1942", "1945", "1947"],
        correctAnswer: "1942",
        explanation: "The Quit India Movement was launched on 8 August 1942 with the slogan 'Do or Die'.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
    ];
  } else if (exam === "GATE CS") {
    pyqs = [
      {
        id: `${baseId}1`,
        exam: "GATE CS",
        year: years[0],
        topic: "Data Structures",
        subject: "Computer Science",
        question: "Which of the following data structures is best suited for implementing a recursive function call mechanism?",
        options: ["Queue", "Stack", "Linked List", "Binary Tree"],
        correctAnswer: "Stack",
        explanation: "Stacks support Last-In-First-Out semantics, naturally matching the call/return order of recursive function invocation.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}2`,
        exam: "GATE CS",
        year: years[1],
        topic: "Algorithms",
        subject: "Computer Science",
        question: "The worst-case time complexity of QuickSort is:",
        options: ["O(n log n)", "O(n²)", "O(n log² n)", "O(n)"],
        correctAnswer: "O(n²)",
        explanation: "When the pivot is consistently the smallest or largest element, partitions are unbalanced, leading to O(n²) comparisons.",
        difficulty: "Medium",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}3`,
        exam: "GATE CS",
        year: years[2],
        topic: "Operating Systems",
        subject: "Computer Science",
        question: "Which page replacement algorithm suffers from Belady's anomaly?",
        options: ["LRU", "Optimal", "FIFO", "LFU"],
        correctAnswer: "FIFO",
        explanation: "FIFO can exhibit Belady's anomaly: increasing the number of frames can sometimes increase the number of page faults.",
        difficulty: "Hard",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}4`,
        exam: "GATE CS",
        year: years[3],
        topic: "DBMS",
        subject: "Computer Science",
        question: "Which normal form removes partial dependency on a subset of a candidate key?",
        options: ["1NF", "2NF", "3NF", "BCNF"],
        correctAnswer: "2NF",
        explanation: "2NF requires every non-prime attribute to be fully functionally dependent on the whole candidate key, removing partial dependencies.",
        difficulty: "Medium",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}5`,
        exam: "GATE CS",
        year: years[4],
        topic: "Computer Networks",
        subject: "Computer Science",
        question: "In the OSI model, routing and switching occur at which layer?",
        options: ["Layer 2", "Layer 3", "Layer 4", "Layer 7"],
        correctAnswer: "Layer 3",
        explanation: "Layer 3 (Network Layer) is responsible for logical addressing and routing. Layer 2 (Data Link) handles switching within a LAN.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}6`,
        exam: "GATE CS",
        year: years[5],
        topic: "Theory of Computation",
        subject: "Computer Science",
        question: "Which of the following languages is NOT context-free?",
        options: ["{ aⁿbⁿ | n ≥ 0 }", "{ aⁿbⁿcⁿ | n ≥ 0 }", "{ wwᴿ | w ∈ {a,b}* }", "{ a* }"],
        correctAnswer: "{ aⁿbⁿcⁿ | n ≥ 0 }",
        explanation: "A pushdown automaton has a single stack and cannot match three independent counts simultaneously, so aⁿbⁿcⁿ is context-sensitive, not context-free.",
        difficulty: "Hard",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}7`,
        exam: "GATE CS",
        year: years[6],
        topic: "Discrete Mathematics",
        subject: "Computer Science",
        question: "The number of Boolean functions possible with 3 Boolean variables is:",
        options: ["8", "64", "256", "512"],
        correctAnswer: "256",
        explanation: "With 3 variables there are 2³ = 8 input rows, and each row can map to 0 or 1, giving 2⁸ = 256 possible Boolean functions.",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}8`,
        exam: "GATE CS",
        year: years[7],
        topic: "Digital Logic",
        subject: "Computer Science",
        question: "The minimum number of NAND gates required to implement the Boolean function Y = A · B is:",
        options: ["1", "2", "3", "4"],
        correctAnswer: "2",
        explanation: "A NAND of A and B gives (A·B)′. A second NAND acting as an inverter on the output yields A·B, using 2 NAND gates.",
        difficulty: "Hard",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}9`,
        exam: "GATE CS",
        year: years[8],
        topic: "Compiler Design",
        subject: "Computer Science",
        question: "Which of the following phases of a compiler is responsible for detecting 'undefined variable' errors?",
        options: ["Lexical Analysis", "Syntax Analysis", "Semantic Analysis", "Code Optimization"],
        correctAnswer: "Semantic Analysis",
        explanation: "Symbol table lookups and type/scope checks happen during Semantic Analysis — that's where undefined variables are flagged.",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}10`,
        exam: "GATE CS",
        year: years[9],
        topic: "Algorithms",
        subject: "Computer Science",
        question: "The time complexity of finding the n-th Fibonacci number using the simple recursive method (without memoization) is:",
        options: ["O(n)", "O(n²)", "O(2ⁿ)", "O(log n)"],
        correctAnswer: "O(2ⁿ)",
        explanation: "Naive recursion recomputes overlapping subproblems, leading to an exponential recurrence T(n) = T(n-1) + T(n-2) + O(1), bounded by O(2ⁿ).",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
    ];
  } else {
    // Default — mixed quantitative aptitude questions
    pyqs = [
      {
        id: `${baseId}1`,
        exam,
        year: years[0],
        topic: "Percentage",
        subject: "Quantitative Aptitude",
        question: "What is 15% of 240?",
        options: ["30", "32", "36", "40"],
        correctAnswer: "36",
        explanation: "10% of 240 = 24; 5% = 12. Sum = 36.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}2`,
        exam,
        year: years[1],
        topic: "Average",
        subject: "Quantitative Aptitude",
        question: "The average of 5 consecutive even numbers is 16. The largest of these numbers is:",
        options: ["18", "20", "22", "24"],
        correctAnswer: "20",
        explanation: "Five consecutive even numbers with average 16 are 12, 14, 16, 18, 20. Largest = 20.",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}3`,
        exam,
        year: years[2],
        topic: "Time, Speed & Distance",
        subject: "Quantitative Aptitude",
        question: "A train travels 60 km in 45 minutes. Its speed in km/h is:",
        options: ["60", "70", "75", "80"],
        correctAnswer: "80",
        explanation: "45 min = 0.75 h. Speed = 60 / 0.75 = 80 km/h.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}4`,
        exam,
        year: years[3],
        topic: "Simple Interest",
        subject: "Quantitative Aptitude",
        question: "The simple interest on ₹5,000 at 8% per annum for 3 years is:",
        options: ["₹1,000", "₹1,200", "₹1,400", "₹1,500"],
        correctAnswer: "₹1,200",
        explanation: "SI = P × R × T / 100 = 5000 × 8 × 3 / 100 = ₹1,200.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}5`,
        exam,
        year: years[4],
        topic: "Compound Interest",
        subject: "Quantitative Aptitude",
        question: "The compound interest on ₹10,000 at 10% per annum for 2 years (compounded annually) is:",
        options: ["₹2,000", "₹2,100", "₹2,200", "₹2,500"],
        correctAnswer: "₹2,100",
        explanation: "A = 10000 × (1.1)² = 10000 × 1.21 = 12,100. CI = 12,100 − 10,000 = ₹2,100.",
        difficulty: "Medium",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}6`,
        exam,
        year: years[5],
        topic: "Number System",
        subject: "Quantitative Aptitude",
        question: "The HCF of 12, 18, and 24 is:",
        options: ["2", "4", "6", "12"],
        correctAnswer: "6",
        explanation: "Factors of 12: {1,2,3,4,6,12}; of 18: {1,2,3,6,9,18}; of 24: {1,2,3,4,6,8,12,24}. The largest common is 6.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}7`,
        exam,
        year: years[6],
        topic: "Mixture & Alligation",
        subject: "Quantitative Aptitude",
        question: "Two mixtures of milk and water are in the ratio 4:1 and 3:2. Mixing them in equal quantities gives a new ratio of:",
        options: ["7:3", "3:1", "5:2", "11:4"],
        correctAnswer: "7:3",
        explanation: "Take 5L of each. Mixture 1 (4:1): milk=4, water=1. Mixture 2 (3:2): milk=3, water=2. Combined: milk=7, water=3 → ratio 7:3.",
        difficulty: "Hard",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}8`,
        exam,
        year: years[7],
        topic: "Probability",
        subject: "Quantitative Aptitude",
        question: "A coin is tossed 3 times. The probability of getting at least 2 heads is:",
        options: ["1/4", "3/8", "1/2", "5/8"],
        correctAnswer: "1/2",
        explanation: "Total outcomes = 8. Favourable (≥2 heads): HHT, HTH, THH, HHH = 4 outcomes. Probability = 4/8 = 1/2.",
        difficulty: "Medium",
        marks: 2,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}9`,
        exam,
        year: years[8],
        topic: "Ratio & Proportion",
        subject: "Quantitative Aptitude",
        question: "If 15 men can complete a work in 24 days, then 18 men can complete the same work in:",
        options: ["18 days", "20 days", "22 days", "26 days"],
        correctAnswer: "20 days",
        explanation: "Work = 15 × 24 = 360 man-days. With 18 men: 360 / 18 = 20 days.",
        difficulty: "Medium",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
      {
        id: `${baseId}10`,
        exam,
        year: years[9],
        topic: "Geometry",
        subject: "Quantitative Aptitude",
        question: "In a right triangle, the legs are 9 cm and 12 cm. The length of the hypotenuse is:",
        options: ["13 cm", "14 cm", "15 cm", "17 cm"],
        correctAnswer: "15 cm",
        explanation: "By Pythagoras: √(9² + 12²) = √(81 + 144) = √225 = 15 cm.",
        difficulty: "Easy",
        marks: 1,
        sourceType: "SEARCH_SOURCE",
      },
    ];
  }

  // Optional topic filter — keep only matching pyqs; if filter would empty the set, keep all.
  if (topic && topic.toLowerCase() !== "general") {
    const t = topic.toLowerCase();
    const filtered = pyqs.filter(
      (p) => p.topic.toLowerCase().includes(t) || p.subject.toLowerCase().includes(t)
    );
    if (filtered.length >= 3) pyqs = filtered;
  }

  // For the similar-question finder, return only 3–5 PYQs with reasoning.
  if (isSimilar) {
    pyqs = pyqs.slice(0, 5).map((p, i) => ({
      ...p,
      id: `${baseId}${i + 1}`,
      similarityReason:
        "Tests the same underlying concept as the source question with a structurally similar pattern.",
    }));
  }

  return { pyqs };
}

// ============================================================
// Exam Strategy Guide — exam-aware canned strategies.
// Returns an ExamStrategy object tailored to the exam family:
//   - SSC family  → Speed-focused     (60min/100Q, easy Quant first, skip hard GA)
//   - GATE family → Accuracy-focused  (180min/65Q, aptitude first, skip if unsure)
//   - UPSC family → Elimination-based (120min/100Q, eliminate 2 first, selective guess)
//   - Banking      → Mixed             (60min/100Q, simplification first, 80+ attempts)
//   - default      → Mixed             (balanced generic strategy)
// Falls back to user-supplied sections/duration/questions when present.
// ============================================================
function mockExamStrategy(query: string): unknown {
  // Parse user-supplied exam structure from the prompt body.
  let examName = "SSC CGL";
  const examMatch = query.match(/Exam name:\s*([^\n]+)/i);
  if (examMatch && examMatch[1]) {
    const v = examMatch[1].trim();
    if (v) examName = v;
  }
  // Also respect quoted form as fallback.
  if (examName === "SSC CGL") {
    const quoted = query.match(/"([^"]+)"/);
    if (quoted && quoted[1]) examName = quoted[1].trim();
  }

  let totalQuestions = 100;
  const tqMatch = query.match(/Total questions:\s*(\d+)/i);
  if (tqMatch && tqMatch[1]) {
    const v = parseInt(tqMatch[1], 10);
    if (Number.isFinite(v) && v > 0) totalQuestions = v;
  }
  let durationMinutes = 60;
  const dmMatch = query.match(/Duration:\s*(\d+)\s*minutes/i);
  if (dmMatch && dmMatch[1]) {
    const v = parseInt(dmMatch[1], 10);
    if (Number.isFinite(v) && v > 0) durationMinutes = v;
  }
  let negativeMarking = "0.5 per incorrect";
  const nmMatch = query.match(/Negative marking:\s*([^\n]+)/i);
  if (nmMatch && nmMatch[1]) {
    const v = nmMatch[1].trim();
    if (v && v.toLowerCase() !== "not specified") negativeMarking = v;
  }
  let sections: string[] = [];
  const secMatch = query.match(/Sections:\s*([^\n]+)/i);
  if (secMatch && secMatch[1]) {
    const v = secMatch[1].trim();
    if (v && v.toLowerCase() !== "not specified — infer from exam name") {
      sections = v.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    }
  }

  const name = examName.toLowerCase();

  // ---------- SSC family → Speed-focused ----------
  if (name.includes("ssc") || name.includes("cgl") || name.includes("chsl") || name.includes("ntpc") || name.includes("rrb") || name.includes("cet")) {
    const defaultSections = ["General Intelligence & Reasoning", "General Awareness", "Quantitative Aptitude", "English Comprehension"];
    const secs = sections.length >= 2 ? sections : defaultSections;
    const tq = totalQuestions || 100;
    const dur = durationMinutes || 60;
    const perQ = Math.max(1, Math.round(tq / Math.max(1, secs.length)));
    const revisionBuffer = Math.max(5, Math.round(dur * 0.08));
    const remaining = Math.max(0, dur - revisionBuffer);
    // Weight: Reasoning & Quant get more time than GA / English.
    const weightMap: Record<string, number> = {
      reasoning: 1.4, aptitude: 1.4, quant: 1.4, maths: 1.3,
      awareness: 0.8, "general awareness": 0.8, ga: 0.8,
      english: 0.9, comprehension: 0.9,
    };
    const weights = secs.map((s) => {
      const k = s.toLowerCase();
      let w = 1;
      for (const key of Object.keys(weightMap)) if (k.includes(key)) w = weightMap[key]!;
      return w;
    });
    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
    const timeAllocation = secs.map((s, i) => {
      const minutes = Math.max(3, Math.round((remaining * weights[i]!) / weightSum));
      const k = s.toLowerCase();
      const priority: "High" | "Medium" | "Low" =
        k.includes("quant") || k.includes("reasoning") || k.includes("aptitude") ? "High"
        : k.includes("english") || k.includes("comprehension") ? "Medium"
        : "Low";
      return { section: s, minutes, questions: perQ, priority };
    });
    return {
      examName,
      examType: "Speed-focused",
      timeAllocation,
      attemptOrder: [
        { step: 1, action: "Sweep easy Quantitative Aptitude questions first", rationale: "Quant carries the highest ROI per minute in SSC; lock in 15–18 quick wins in 12 minutes to build momentum and bank marks." },
        { step: 2, action: "Move to General Intelligence & Reasoning", rationale: "Reasoning is pattern-based and high-accuracy once seen; do all 25 (or your section quota) in a single focused pass." },
        { step: 3, action: "Skim General Awareness — attempt only confident ones", rationale: "GA is binary (know it or don't); spending 60+ seconds rarely helps. Cap each GA question at 20 seconds." },
        { step: 4, action: "Tackle English Comprehension", rationale: "Vocabulary and error-spotting are fast wins; save the longest Reading Comprehension passage for the end of this section." },
        { step: 5, action: "Use revision buffer on flagged Quant/Reasoning questions", rationale: "Revisit only questions you marked 'come back later' — never start a fresh hard question with under 3 minutes left." },
      ],
      negativeMarkingStrategy: [
        { situation: "Question you can solve in under 45 seconds", action: "Guess", threshold: "Always attempt — even a 50% guess has positive expected value at SSC's 0.5 neg on 2-mark questions" },
        { situation: "Down to two options after eliminating two clearly wrong ones", action: "Guess", threshold: "50%+ confidence — expected value is positive with 0.5 neg" },
        { situation: "No idea after 30 seconds in General Awareness", action: "Skip", threshold: "Below 40% confidence — net negative expected value; don't bubble" },
        { situation: "Quant question eating 90+ seconds with no clear path", action: "Skip", threshold: "Time-sunk > 90s with no answer — skip and revisit in revision buffer" },
        { situation: "Question with no obvious elimination", action: "Eliminate then guess", threshold: "If you can eliminate 1 of 4 options → guess; otherwise skip" },
      ],
      revisionBuffer,
      sectionTargets: secs.map((s) => {
        const k = s.toLowerCase();
        const safe = Math.max(10, Math.round(perQ * 0.75));
        const acc = k.includes("quant") || k.includes("reasoning") || k.includes("aptitude") ? 90
          : k.includes("english") || k.includes("comprehension") ? 85
          : 70;
        return { section: s, safeAttempts: safe, targetAccuracy: acc };
      }),
      lastFiveMinutes: [
        { action: "Bubble-check sweep", detail: "Re-verify every bubbled answer against the question number — confirm no row-shift errors (the #1 SSC mistake)." },
        { action: "Revisit flagged questions only", detail: "Open ONLY questions you marked 'come back later'. Do not start any new question." },
        { action: "Final guess pass on 50/50 questions", detail: "Any question where you've eliminated 2 options → guess now. Skip pure wild guesses (negative marking)." },
        { action: "Submit safeguard", detail: "Save the response sheet 60 seconds before the deadline. Do not wait for the auto-submit at 00:00." },
      ],
      commonMistakes: [
        { mistake: "Sinking 4+ minutes into one tough Quant question", prevention: "Hard-cap any question at 90 seconds. If no answer, mark, skip, revisit in buffer." },
        { mistake: "Bubbling the wrong row on the OMR sheet", prevention: "After every 5 questions, glance at the question number on the sheet vs the booklet — catch row shifts early." },
        { mistake: "Skipping easy GA to attempt hard Reasoning puzzles", prevention: "GA is 25 free marks if you know it — never skip a confident GA answer just because Reasoning is unfinished." },
        { mistake: "Wild-guessing every unanswered question in the last 30 seconds", prevention: "Only guess when you can eliminate ≥1 option. Wild guesses lose marks at 0.5 negative." },
        { mistake: "Forgetting the sectional cut-off exists", prevention: "Each of the 4 sections has its own cut-off — attempt at least 15 questions per section, even your weakest." },
        { mistake: "Spending 8 minutes on one Reading Comprehension passage", prevention: "Cap RC passages at 5 minutes each. Skim questions first, then target-scan the passage." },
      ],
      sources: [
        { type: "USER_INPUT", label: "Exam structure provided by user" },
        { type: "AI_ANALYSIS", label: "Speed-focused exam-day strategy synthesis" },
        { type: "OFFICIAL", label: "SSC exam-day pattern reference" },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------- GATE family → Accuracy-focused ----------
  if (name.includes("gate") || name.includes("jee") || name.includes("cat")) {
    const defaultSections = ["General Aptitude", "Technical (Subject)", "Engineering Mathematics"];
    const secs = sections.length >= 2 ? sections : defaultSections;
    const tq = totalQuestions || 65;
    const dur = durationMinutes || 180;
    const perQ = Math.max(1, Math.round(tq / Math.max(1, secs.length)));
    const revisionBuffer = Math.max(15, Math.round(dur * 0.1));
    const remaining = Math.max(0, dur - revisionBuffer);
    // Weight: Technical >> Mathematics > Aptitude (for GATE); distribute accordingly.
    const weights = secs.map((s) => {
      const k = s.toLowerCase();
      if (k.includes("aptitude")) return 0.85;
      if (k.includes("math")) return 1.0;
      if (k.includes("technical") || k.includes("subject")) return 1.4;
      return 1.0;
    });
    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
    const timeAllocation = secs.map((s, i) => {
      const minutes = Math.max(8, Math.round((remaining * weights[i]!) / weightSum));
      const k = s.toLowerCase();
      const priority: "High" | "Medium" | "Low" =
        k.includes("technical") || k.includes("subject") ? "High"
        : k.includes("math") ? "Medium"
        : "Medium";
      return { section: s, minutes, questions: perQ, priority };
    });
    return {
      examName,
      examType: "Accuracy-focused",
      timeAllocation,
      attemptOrder: [
        { step: 1, action: "Start with General Aptitude (15 marks)", rationale: "Aptitude is the highest-accuracy, lowest-time section — bank 12–14 marks in 20 minutes and free up your mental RAM for technicals." },
        { step: 2, action: "Move to Engineering Mathematics next", rationale: "Maths questions are formula-driven and predictable — nail them while your mind is still fresh and not yet fatigued by hard technicals." },
        { step: 3, action: "Begin Technical section with your strongest subject area", rationale: "GATE papers mix subjects inside the technical block; scanning for your strongest topic first locks in marks and builds confidence." },
        { step: 4, action: "Second pass: attempt medium-confidence technicals", rationale: "After the easy sweep, revisit questions you skipped — many will look solvable now that the panic of the first pass has cleared." },
        { step: 5, action: "Use the 20-minute revision buffer on flagged numerical-answer questions", rationale: "Numerical Answer Type (NAT) questions have NO negative marking — these are pure upside; revisit and recompute carefully." },
      ],
      negativeMarkingStrategy: [
        { situation: "Confident in the answer (worked it through, verified units)", action: "Guess", threshold: "Always attempt — expected value is strongly positive" },
        { situation: "Numerical Answer Type (NAT) question — no options", action: "Guess", threshold: "Always attempt — zero negative marking; even a rough estimate is positive expected value" },
        { situation: "Multiple-choice with no idea after 2 minutes", action: "Skip", threshold: "Below 40% confidence — GATE's 1/3 + 2/3 negative makes blind guessing net-negative" },
        { situation: "Down to two options after elimination", action: "Eliminate then guess", threshold: "60%+ confidence AND you've spent >90 seconds on the question — otherwise skip" },
        { situation: "Question on your weakest topic", action: "Skip", threshold: "If you can't solve in 60 seconds on a known-weak topic — skip immediately, don't fight it" },
      ],
      revisionBuffer,
      sectionTargets: secs.map((s) => {
        const k = s.toLowerCase();
        const safe = Math.max(3, Math.round(perQ * 0.55));
        const acc = k.includes("aptitude") ? 90
          : k.includes("math") ? 85
          : 80;
        return { section: s, safeAttempts: safe, targetAccuracy: acc };
      }),
      lastFiveMinutes: [
        { action: "Final NAT sweep", detail: "Re-attempt every Numerical Answer Type question — even rough estimates are pure upside (zero negative marking). Don't leave any blank." },
        { action: "Verify numerical units and rounding", detail: "Re-check that your NAT answers are in the right units (m vs cm, kPa vs Pa) and rounded as the question specifies." },
        { action: "Skip flagged non-NAT questions you're still unsure of", detail: "Under 5 minutes left, only commit to MCQs you're 70%+ confident in — leave the rest blank." },
        { action: "Submit safeguard", detail: "Save and submit 60 seconds before deadline. GATE's auto-submit at 00:00 is reliable but verify your responses are saved." },
      ],
      commonMistakes: [
        { mistake: "Treating GATE like a speed test", prevention: "65 questions in 180 min = ~2.8 min/Q average. You're meant to SOLVE, not sprint. Quality over quantity — 40 well-attempted beats 60 wild guesses." },
        { mistake: "Leaving NAT questions blank", prevention: "NAT questions have ZERO negative marking. Always bubble a reasonable numerical estimate — never submit blank." },
        { mistake: "Guessing MCQs you're not sure about", prevention: "GATE's 1/3 (1-mark) and 2/3 (2-mark) negative is brutal. Only commit to an MCQ if you're 60%+ confident." },
        { mistake: "Spending 10+ minutes on one tough technical", prevention: "Hard-cap any single question at 4 minutes. Flag, skip, revisit in buffer — never sink the whole paper's time into one 2-mark question." },
        { mistake: "Ignoring the virtual calculator's limitations", prevention: "Practice with the on-screen calculator before the exam. It has no graphing, limited memory — re-derive complex expressions on rough sheets." },
        { mistake: "Forgetting formula sheet isn't provided", prevention: "Memorize key formulae (transistor I-V, thermodynamics cycles, beam equations) — GATE provides NO formula sheet. A formula gap = a lost question." },
      ],
      sources: [
        { type: "USER_INPUT", label: "Exam structure provided by user" },
        { type: "AI_ANALYSIS", label: "Accuracy-focused exam-day strategy synthesis" },
        { type: "OFFICIAL", label: "GATE exam-day pattern reference" },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------- UPSC family → Elimination-based ----------
  if (name.includes("upsc") || name.includes("psc") || name.includes("civil")) {
    const defaultSections = ["General Studies Paper I"];
    const secs = sections.length >= 1 ? sections : defaultSections;
    const tq = totalQuestions || 100;
    const dur = durationMinutes || 120;
    const perQ = Math.max(1, Math.round(tq / Math.max(1, secs.length)));
    const revisionBuffer = Math.max(10, Math.round(dur * 0.1));
    const remaining = Math.max(0, dur - revisionBuffer);
    const weights = secs.map(() => 1);
    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
    const timeAllocation = secs.map((s, i) => {
      const minutes = Math.max(20, Math.round((remaining * weights[i]!) / weightSum));
      return { section: s, minutes, questions: perQ, priority: "High" as const };
    });
    return {
      examName,
      examType: "Elimination-based",
      timeAllocation,
      attemptOrder: [
        { step: 1, action: "First sweep: skim ALL 100 questions in 25 minutes", rationale: "UPSC rewards question selection. Skim once, mark each question Easy / Medium / Hard / Skip — never commit on the first pass." },
        { step: 2, action: "Second pass: attempt all 'Easy' questions", rationale: "Bank the 40–50 questions you're confident about first. This is your safe base — typically the cut-off hovers around 50% of these." },
        { step: 3, action: "Third pass: attempt 'Medium' questions with elimination", rationale: "For each Medium question, eliminate 2 of 4 options systematically — then guess between the remaining 2. Expected value is positive at 1/3 negative." },
        { step: 4, action: "Skip every 'Hard' question unless you can eliminate 2 options", rationale: "Hard questions with no clear elimination are net-negative — skip them. UPSC's marking punishes wild guesses." },
        { step: 5, action: "Final 10 minutes: bubble verification + revisit 50/50s", rationale: "Use revision buffer to verify every bubble and to take a final swing at 2-option questions you left pending." },
      ],
      negativeMarkingStrategy: [
        { situation: "You can eliminate 2 of 4 options confidently", action: "Eliminate then guess", threshold: "Always attempt — 50% expected hit rate beats 1/3 negative" },
        { situation: "You can eliminate 1 of 4 options", action: "Eliminate then guess", threshold: "If remaining confidence is 50%+ (you have a hunch between 2 of the 3) → guess; otherwise skip" },
        { situation: "No elimination possible, pure wild guess", action: "Skip", threshold: "Below 33% confidence — net negative expected value at 1/3 negative marking" },
        { situation: "Question on your strong topic (Polity / History / etc.)", action: "Guess", threshold: "Topic mastery ≥ 70% confidence — attempt even if you can't formally eliminate" },
        { situation: "Question on current affairs you don't recall", action: "Skip", threshold: "If you can't recall the fact within 30 seconds — skip; current-affairs guessing has low hit rate" },
      ],
      revisionBuffer,
      sectionTargets: secs.map((s) => {
        const safe = Math.max(20, Math.round(perQ * 0.5));
        return { section: s, safeAttempts: safe, targetAccuracy: 85 };
      }),
      lastFiveMinutes: [
        { action: "Bubble verification sweep", detail: "Cross-check every bubbled answer against the question number. UPSC's #1 mistake is row-shifting on the OMR." },
        { action: "Final 50/50 attempt", detail: "Any question where you've eliminated 2 options but didn't bubble — guess now. 50% hit rate beats 1/3 negative." },
        { action: "Do NOT start new questions", detail: "Under 5 minutes, do not attempt any fresh Hard question. The expected value is negative." },
        { action: "Submit safeguard", detail: "Save and submit 60 seconds early. UPSC's auto-submit is reliable but verify your responses are saved." },
      ],
      commonMistakes: [
        { mistake: "Attempting all 100 questions like a school exam", prevention: "UPSC is elimination-based. Attempt 55–70 questions with high accuracy — quality over quantity. Wild-guessing the last 20 is a cut-off killer." },
        { mistake: "Wild-guessing after eliminating only 1 option", prevention: "Only guess when you can eliminate 2 of 4 options. A 33% guess at 1/3 negative is break-even — wait for a better edge." },
        { mistake: "Spending 3 minutes on a single current-affairs question", prevention: "Cap any single question at 90 seconds on the first sweep. If you don't know the fact, you don't know it — skip and revisit." },
        { mistake: "Ignoring CSAT (Paper II) cut-off", prevention: "Paper II is qualifying at 33% — but many toppers fail it. Spend the last week on CSAT comprehension + basic math; don't assume it's easy." },
        { mistake: "Marking the wrong bubble row on the OMR sheet", prevention: "Verify the question number on the OMR every 10 questions. A row-shift error can tank an entire section." },
        { mistake: "Leaving 50/50 questions blank in the last 2 minutes", prevention: "If you've eliminated 2 options, ALWAYS bubble a guess in the final minutes. 50% hit rate at 1/3 negative = positive expected value." },
      ],
      sources: [
        { type: "USER_INPUT", label: "Exam structure provided by user" },
        { type: "AI_ANALYSIS", label: "Elimination-based exam-day strategy synthesis" },
        { type: "OFFICIAL", label: "UPSC CSE exam-day pattern reference" },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------- Banking family → Mixed (speed + accuracy) ----------
  if (name.includes("bank") || name.includes("ibps") || name.includes("sbi") || name.includes("rbi") || name.includes("po") || name.includes("clerk")) {
    const defaultSections = ["Reasoning Ability", "Quantitative Aptitude", "English Language", "Computer Awareness", "Banking Awareness"];
    const secs = sections.length >= 2 ? sections : defaultSections;
    const tq = totalQuestions || 100;
    const dur = durationMinutes || 60;
    const perQ = Math.max(1, Math.round(tq / Math.max(1, secs.length)));
    const revisionBuffer = Math.max(5, Math.round(dur * 0.08));
    const remaining = Math.max(0, dur - revisionBuffer);
    const weights = secs.map((s) => {
      const k = s.toLowerCase();
      if (k.includes("reasoning")) return 1.3;
      if (k.includes("quant") || k.includes("aptitude")) return 1.2;
      if (k.includes("english")) return 1.0;
      if (k.includes("computer") || k.includes("banking") || k.includes("awareness")) return 0.7;
      return 1.0;
    });
    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
    const timeAllocation = secs.map((s, i) => {
      const minutes = Math.max(3, Math.round((remaining * weights[i]!) / weightSum));
      const k = s.toLowerCase();
      const priority: "High" | "Medium" | "Low" =
        k.includes("reasoning") || k.includes("quant") || k.includes("aptitude") ? "High"
        : k.includes("english") ? "Medium"
        : "Low";
      return { section: s, minutes, questions: perQ, priority };
    });
    return {
      examName,
      examType: "Mixed",
      timeAllocation,
      attemptOrder: [
        { step: 1, action: "Start Quantitative Aptitude with Simplification/Approximation + Number Series", rationale: "These are the fastest, highest-accuracy questions in Banking exams. Lock in 12–15 quick wins in 8 minutes to build buffer." },
        { step: 2, action: "Move to Reasoning — Inequalities, Syllogisms, Coding-Decoding first", rationale: "Single-question reasoning sets are quick wins; save the 5-question puzzle sets (Puzzles, Seating) for the end." },
        { step: 3, action: "English Language — Error Spotting, Cloze Test, Para Jumbles", rationale: "Banking English is pattern-based; bang out 15 quick ones in 10 minutes. Save Reading Comprehension for last." },
        { step: 4, action: "Computer Awareness + Banking Awareness (only if time allows)", rationale: "These are 0.5-min binary questions — attempt the confident ones; do NOT spend >30 seconds each. Skip the unfamiliar." },
        { step: 5, action: "Return to Reasoning Puzzles with remaining time + buffer", rationale: "Puzzles are time-sinks but high-accuracy once cracked. With 8+ minutes of buffer, attempt 1 puzzle you can fully crack." },
      ],
      negativeMarkingStrategy: [
        { situation: "Simplification / Number Series question you can solve in 60 seconds", action: "Guess", threshold: "Always attempt — high accuracy, positive expected value" },
        { situation: "Down to 2 options after elimination", action: "Eliminate then guess", threshold: "60%+ confidence — at 0.25 negative, even 50% guesses are mildly positive" },
        { situation: "Puzzle set you've worked for 5+ minutes with no breakthrough", action: "Skip", threshold: "Time-sunk > 5 min with no full solve — skip the whole set, don't bubble partial" },
        { situation: "Banking Awareness question you don't recognize", action: "Skip", threshold: "Below 40% confidence — skip; current-affairs guessing is low-hit" },
        { situation: "Question with 4 unknown options", action: "Skip", threshold: "Pure wild guess — net negative at 0.25 neg. Only guess if you can eliminate 1+" },
      ],
      revisionBuffer,
      sectionTargets: secs.map((s) => {
        const k = s.toLowerCase();
        const safe = Math.max(10, Math.round(perQ * 0.75));
        const acc = k.includes("reasoning") || k.includes("quant") ? 85
          : k.includes("english") ? 80
          : 75;
        return { section: s, safeAttempts: safe, targetAccuracy: acc };
      }),
      lastFiveMinutes: [
        { action: "Bubble-check sweep", detail: "Verify every bubble against the question number. Banking exams' #1 mistake is row-shift on the OMR." },
        { action: "Target 80+ total attempts", detail: "Banking cut-offs reward volume. If you've attempted < 70, take final 50/50 guesses to push toward 80." },
        { action: "Final guess pass on 2-option questions", detail: "Any question where you've eliminated 2 options → guess now. 50% hit rate beats 0.25 negative." },
        { action: "Submit safeguard", detail: "Save the test 60 seconds before the deadline. Verify responses are saved." },
      ],
      commonMistakes: [
        { mistake: "Starting with Reasoning Puzzles", prevention: "Puzzles are time-sinks with high variance. Always start with Simplification/Series/Inequalities — bank the easy marks first." },
        { mistake: "Spending 8 minutes on one puzzle and not finishing", prevention: "Hard-cap any 5-question puzzle at 6 minutes. If you can't crack it by then, skip the whole set; don't bubble partial answers." },
        { mistake: "Ignoring sectional timing in Prelims", prevention: "Banking Prelims has 20-min sectional limits. Don't overshoot the Quant window trying to perfect it — move on the moment the timer pings." },
        { mistake: "Wild-guessing Banking Awareness in the last 30 seconds", prevention: "Only guess on questions you recognize. Random guessing on unfamiliar schemes/rates is net-negative at 0.25." },
        { mistake: "Reading the entire Reading Comprehension passage", prevention: "Skim questions FIRST, then target-scan the passage. Saves 4–5 minutes per passage vs reading end-to-end." },
        { mistake: "Forgetting to attempt at least 80 questions", prevention: "Banking cut-offs reward volume. Aim for 80+ attempts with 80%+ accuracy — fewer attempts means cut-off miss even at high accuracy." },
      ],
      sources: [
        { type: "USER_INPUT", label: "Exam structure provided by user" },
        { type: "AI_ANALYSIS", label: "Mixed (speed+accuracy) exam-day strategy synthesis" },
        { type: "OFFICIAL", label: "Banking exam-day pattern reference" },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------- Default → Mixed (generic balanced strategy) ----------
  const secs = sections.length >= 2 ? sections : ["Section A", "Section B", "Section C"];
  const tq = totalQuestions || 100;
  const dur = durationMinutes || 120;
  const perQ = Math.max(1, Math.round(tq / secs.length));
  const revisionBuffer = Math.max(8, Math.round(dur * 0.08));
  const remaining = Math.max(0, dur - revisionBuffer);
  const perSectionMinutes = Math.max(5, Math.round(remaining / secs.length));
  const timeAllocation = secs.map((s, i) => ({
    section: s,
    minutes: perSectionMinutes,
    questions: perQ,
    priority: (i === 0 ? "High" : i === 1 ? "Medium" : "Low") as "High" | "Medium" | "Low",
  }));
  return {
    examName,
    examType: "Mixed",
    timeAllocation,
    attemptOrder: [
      { step: 1, action: "First sweep: skim all questions in 15 minutes", rationale: "Mark each as Easy / Medium / Hard — never commit on the first pass." },
      { step: 2, action: "Second pass: attempt all Easy questions", rationale: "Bank the confident marks first to build buffer and momentum." },
      { step: 3, action: "Third pass: attempt Medium questions with elimination", rationale: "Eliminate wrong options systematically before guessing — positive expected value at most negative rates." },
      { step: 4, action: "Skip Hard questions unless you can eliminate down to 2 options", rationale: "Hard questions with no clear elimination are net-negative — don't bubble wild guesses." },
      { step: 5, action: "Use the revision buffer to revisit flagged 50/50 questions", rationale: "Re-attempt only the questions you marked 'come back later' — never start fresh hard questions." },
    ],
    negativeMarkingStrategy: [
      { situation: "Question you can solve confidently in under 60 seconds", action: "Guess", threshold: "Always attempt — positive expected value" },
      { situation: "Down to 2 options after elimination", action: "Eliminate then guess", threshold: "50%+ confidence — at most negative rates this is positive expected value" },
      { situation: "No elimination possible", action: "Skip", threshold: "Below 33% confidence — net negative; don't bubble" },
      { situation: "Question on your weakest topic", action: "Skip", threshold: "If you can't crack it in 90 seconds on a weak topic — skip immediately" },
      { situation: "Last-minute guess on 50/50 questions", action: "Eliminate then guess", threshold: "Final 2 minutes — always bubble 2-option guesses; expected value is positive" },
    ],
    revisionBuffer,
    sectionTargets: secs.map((s) => ({
      section: s,
      safeAttempts: Math.max(8, Math.round(perQ * 0.65)),
      targetAccuracy: 82,
    })),
    lastFiveMinutes: [
      { action: "Bubble verification sweep", detail: "Cross-check every bubble against the question number — verify no row-shift errors." },
      { action: "Final 50/50 guess pass", detail: "Bubble any 2-option elimination guess. 50% hit rate is positive expected value." },
      { action: "Do NOT start new Hard questions", detail: "Under 5 minutes left, do not attempt any fresh Hard question." },
      { action: "Submit safeguard", detail: "Save and submit 60 seconds before deadline. Verify your responses are saved." },
    ],
    commonMistakes: [
      { mistake: "Spending 5+ minutes on a single tough question", prevention: "Hard-cap any question at 2 minutes. If no answer, mark, skip, revisit in buffer." },
      { mistake: "Wild-guessing all unanswered questions in the last 30 seconds", prevention: "Only guess when you can eliminate ≥1 option. Pure wild guesses are net-negative." },
      { mistake: "Bubbling the wrong row on the OMR", prevention: "Verify question number on the sheet every 5 questions — catch row shifts early." },
      { mistake: "Ignoring the revision buffer", prevention: "Reserve 8–10% of total time at the top for revision. Don't blow through the buffer mid-paper." },
      { mistake: "Reading the entire Reading Comprehension passage", prevention: "Skim questions FIRST, then target-scan the passage — saves 4–5 minutes per passage." },
      { mistake: "Forgetting to verify the test is submitted", prevention: "Don't wait for auto-submit. Save and submit explicitly 60 seconds early." },
    ],
    sources: [
      { type: "USER_INPUT", label: "Exam structure provided by user" },
      { type: "AI_ANALYSIS", label: "Mixed exam-day strategy synthesis" },
    ],
    generatedAt: new Date().toISOString(),
  };
}

