// ============================================================
// Mock Provider — graceful fallback when no AI key is configured
// ============================================================
// Produces structured, realistic-looking sample data so the entire
// UI is explorable. On Vercel, once OPENAI_API_KEY is set, the
// real AI provider takes over automatically.
// ============================================================
import type { LLMProvider, ChatCompletionMessage } from "./provider";
import { extractJson } from "./provider";

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
  return {
    examNames: ["SSC CGL", "SSC CHSL", "RRB NTPC"],
    comparison: [
      { attribute: "Qualification", values: ["Graduation", "12th Pass", "12th Pass"] },
      { attribute: "Age Limit", values: ["18-32", "18-27", "18-36"] },
      { attribute: "Stages", values: ["Tier 1, 2, DV", "Tier 1, 2, Typing", "CBT 1, 2, Typing"] },
      { attribute: "Negative Marking", values: ["0.5", "0.5", "0.25"] },
      { attribute: "Difficulty", values: ["Moderate-High", "Moderate", "Moderate"] },
    ],
    commonSyllabus: {
      commonTopics: ["Quantitative Aptitude", "Reasoning", "English", "General Awareness"],
      examSpecific: [
        { exam: "SSC CGL", topics: ["Statistics (JSO)", "Finance & Economics (AAO)"] },
        { exam: "SSC CHSL", topics: ["Typing Test"] },
        { exam: "RRB NTPC", topics: ["Railway awareness", "Typing (Junior Clerk)"] },
      ],
    },
    overlap: {
      overlapCategories: [
        { category: "Very High", topic: "Quantitative Aptitude (Arithmetic)", reason: "Same topics across all three exams" },
        { category: "High", topic: "Reasoning", reason: "Similar pattern, slight difficulty variation" },
        { category: "Moderate", topic: "General Awareness", reason: "Current affairs overlap; CGL needs deeper static GK" },
        { category: "Limited", topic: "English", reason: "NTPC has lighter English section" },
      ],
      existingPreparation: ["Percentage", "Ratio", "Series", "Comprehension"],
      additionalPreparation: [
        { topic: "Statistics (for SSC CGL JSO)", reason: "CGL-only paper" },
        { topic: "Typing Test", reason: "CHSL and NTPC specific skill" },
      ],
    },
    careerPathways: ["CGL → Group B/C gazetted", "CHSL → Lower division clerk", "NTPC → Railway clerk/typist"],
    prerequisiteDifferences: ["CGL requires graduation; CHSL/NTPC accept 12th"],
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockDependencyMap(_query: string): unknown {
  return {
    root: "Calculus",
    nodes: [
      { id: "calc", topic: "Calculus", prerequisites: [], dependents: ["diff", "int"], mastery: "Learning", level: 0, examRelevance: "High" },
      { id: "diff", topic: "Differentiation", prerequisites: ["calc"], dependents: ["diffapp", "de"], mastery: "Practicing", level: 1 },
      { id: "int", topic: "Integration", prerequisites: ["calc"], dependents: ["de"], mastery: "Weak", level: 1 },
      { id: "de", topic: "Differential Equations", prerequisites: ["diff", "int"], dependents: [], mastery: "Not Started", level: 2 },
    ],
    gaps: [
      { missingPrerequisite: "Integration", whyItMatters: "Required to solve and verify differential equations", recommendedSequence: ["Review Differentiation", "Practice Integration basics", "Indefinite integrals", "Definite integrals", "Start Differential Equations"], practiceRecommendations: ["10 Level-1 integration problems", "5 PYQ integrals"], estimatedEffort: "~15 hours" },
    ],
    recommendedLearningSequence: ["Differentiation", "Integration", "Differential Equations"],
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockQuestionExplanation(query: string): unknown {
  return {
    originalQuestion: query.slice(0, 200) || "A train travels 120 km in 2 hours. What is its speed?",
    subject: "Quantitative Aptitude",
    topic: "Time, Speed & Distance",
    subtopic: "Speed calculation",
    concept: "Speed = Distance / Time",
    difficulty: "Easy",
    questionType: "MCQ",
    relatedConcepts: ["Average speed", "Relative speed"],
    prerequisites: ["Basic arithmetic", "Unit conversion"],
    levels: {
      level1_quickHint: "Think about the relationship between speed, distance, and time. Which two values are given?",
      level2_concept: { conceptName: "Speed = Distance / Time", coreRule: "Speed equals total distance divided by total time taken.", whyItApplies: "Distance and time are both given directly.", shortcut: "Use unitary method: km per hour", commonMistake: "Forgetting to convert units (km/h vs m/s)." },
      level3_detailedSolution: { steps: ["Identify given: Distance = 120 km, Time = 2 hours", "Apply formula: Speed = Distance / Time", "Substitute: 120 / 2", "Result: 60 km/h"], formula: "Speed = Distance / Time", substitution: "Speed = 120 km / 2 h", calculation: "120 ÷ 2 = 60", finalAnswer: "60 km/h", explanation: "Dividing distance by time gives the average speed." },
      level4_examShortcut: { method: "Unitary: in 2 hours → 120 km, so in 1 hour → 60 km", mentalCalculation: "120/2 = 60 directly", eliminationTechnique: "Reject answers not in km/h range", timeSavingApproach: "Avoid unit conversion unless options are in m/s" },
      level5_learningInsight: "Remember the core relation S = D/T. Always check units before final answer. For multiple-segment journeys, compute average speed as total distance / total time (not arithmetic mean of speeds).",
    },
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockQuestionEvolution(query: string): unknown {
  const src = query.slice(0, 150) || "A train 150 m long passes a pole in 15 seconds. Find its speed.";
  return {
    sourceQuestion: src,
    coreConcept: "Speed = Distance / Time",
    subject: "Quantitative Aptitude",
    topic: "Time, Speed & Distance",
    subtopic: "Trains",
    difficulty: "Medium",
    variants: [
      { level: 1, levelName: "Same Concept, Easier", question: "A train 100 m long passes a pole in 10 seconds. Find its speed.", options: ["8 m/s", "10 m/s", "12 m/s", "15 m/s"], correctAnswer: "10 m/s", explanation: "Speed = 100/10 = 10 m/s", validationStatus: "verified", validationNotes: [] },
      { level: 2, levelName: "Same Concept, Different Framing", question: "A train crosses a stationary pole in 20 seconds at a speed of 5 m/s. What is the length of the train?", options: ["50 m", "100 m", "75 m", "125 m"], correctAnswer: "100 m", explanation: "Length = Speed × Time = 5 × 20 = 100 m", validationStatus: "verified" },
      { level: 3, levelName: "Multi-Concept", question: "Two trains of length 100 m each approach each other at 10 m/s and 15 m/s. Time to cross each other?", options: ["4 s", "8 s", "10 s", "12 s"], correctAnswer: "8 s", explanation: "Relative speed = 25 m/s, total distance = 200 m, time = 200/25 = 8 s", validationStatus: "verified" },
      { level: 4, levelName: "Difficult Variant", question: "A train 200 m long passes a platform 300 m long in 25 seconds. Find its speed in km/h.", options: ["54 km/h", "72 km/h", "60 km/h", "90 km/h"], correctAnswer: "72 km/h", explanation: "Total distance = 500 m, time = 25 s, speed = 20 m/s = 72 km/h", validationStatus: "verified" },
      { level: 5, levelName: "Exam-Trap Variant", question: "A train crosses a pole in 8 s and a platform 240 m long in 20 s. Find the length of the train.", options: ["120 m", "160 m", "180 m", "240 m"], correctAnswer: "160 m", explanation: "Let length L, speed S. L/S = 8 → S = L/8. (L+240)/S = 20 → L + 240 = 20S = 20 × L/8 = 2.5L → 1.5L = 240 → L = 160 m", commonTrap: "Assuming train length equals platform length", validationStatus: "verified" },
    ],
    lineage: "Original train-pole problem → 5 variants across difficulty and concept combination.",
    sources: [{ type: "AI_GENERATED", label: "AI-Generated", detail: "Variants derived from source question" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockPaper(_query: string): unknown {
  const q = (n: number, s: string, t: string, d: "Easy" | "Medium" | "Hard") => ({
    id: `q${n}`,
    section: s,
    questionNumber: n,
    questionType: "MCQ" as const,
    question: `Sample question ${n} on ${t}. If a number is doubled and added to itself, the result is 3 times the number. Find the number if it equals ${n}.`,
    options: [`${n}`, `${n + 1}`, `${n - 1}`, `${n * 2}`],
    correctAnswer: `${n}`,
    topic: t,
    difficulty: d,
    marks: 2,
    negativeMarks: 0.5,
    explanation: `The number that satisfies the condition is ${n}.`,
    sourceType: "AI_GENERATED" as const,
  });
  return {
    examName: "SSC CGL",
    mode: "Balanced Practice",
    totalQuestions: 6,
    durationMinutes: 12,
    sections: [{ name: "Quantitative Aptitude", questions: 6, marksPerQuestion: 2, negativeMarking: 0.5 }],
    questions: [q(1, "Quantitative Aptitude", "Percentage", "Easy"), q(2, "Quantitative Aptitude", "Profit & Loss", "Medium"), q(3, "Quantitative Aptitude", "Ratio", "Easy"), q(4, "Quantitative Aptitude", "Time & Work", "Hard"), q(5, "Quantitative Aptitude", "Average", "Medium"), q(6, "Quantitative Aptitude", "Series", "Hard")],
    markingScheme: "+2 / -0.5",
    sources: [{ type: "AI_GENERATED", label: "AI-Generated" }],
    generatedAt: new Date().toISOString(),
    disclaimer: "AI-generated practice paper. Not an official paper or prediction.",
  };
}

function mockMCQ(_query: string): unknown {
  const mk = (n: number, t: string, d: "Easy" | "Medium" | "Hard") => ({
    id: `m${n}`,
    question: `Sample MCQ ${n} on ${t}. Which value correctly represents ${t}?`,
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctAnswer: "Option B",
    explanation: `${t} is best represented by Option B based on the source material.`,
    topic: t,
    difficulty: d,
    sourcePage: Math.ceil(n / 2),
    sourceType: "AI_GENERATED" as const,
    validationStatus: "verified" as const,
  });
  return {
    source: "Uploaded PDF",
    topic: "Quantitative Aptitude",
    difficulty: "Mixed",
    questionCount: 5,
    questionType: "MCQ",
    mode: "Strict PDF Mode",
    mcqs: [mk(1, "Percentage", "Easy"), mk(2, "Profit & Loss", "Medium"), mk(3, "Ratio", "Easy"), mk(4, "Time & Work", "Hard"), mk(5, "Average", "Medium")],
    sources: [{ type: "UPLOADED_DOCUMENT", label: "Uploaded Document" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockPdfAnalysis(_query: string): unknown {
  return {
    documentOverview: { title: "Sample Exam Notification", organisation: "Exam Conducting Body", exam: "Sample Exam", year: "2024", documentType: "Official Notification", numberOfPages: 12, importantSections: ["Eligibility", "Exam Pattern", "Syllabus", "Important Dates"] },
    extractedInformation: [
      { category: "Eligibility", content: "Graduation in any discipline from a recognised university.", sourcePage: 2, sourceSection: "Eligibility" },
      { category: "Age Limit", content: "20-30 years as on cut-off date.", sourcePage: 2, sourceSection: "Eligibility" },
      { category: "Important Dates", content: "Application start: 1 Jan; Last date: 31 Jan; Exam: March.", sourcePage: 1, sourceSection: "Important Dates" },
      { category: "Exam Pattern", content: "Tier 1: 100 questions, 200 marks, 60 minutes.", sourcePage: 5, sourceSection: "Examination Scheme" },
      { category: "Syllabus", content: "Quantitative Aptitude, Reasoning, English, General Awareness.", sourcePage: 6, sourceSection: "Syllabus" },
      { category: "Marking Scheme", content: "+2 correct, -0.5 incorrect.", sourcePage: 5, sourceSection: "Examination Scheme" },
    ],
    topics: ["Eligibility", "Exam Pattern", "Syllabus", "Quantitative Aptitude", "Reasoning", "English"],
    wordCount: 3200,
    ocrUsed: false,
    sources: [{ type: "UPLOADED_DOCUMENT", label: "Uploaded Document" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockPreparation(_query: string): unknown {
  return {
    targetExam: "SSC CGL",
    examDate: "2025-06-15",
    currentLevel: "Intermediate",
    availableHoursPerDay: 4,
    daysPerWeek: 6,
    targetScore: "180/200 (Tier 1)",
    totalDays: 120,
    phases: [
      { phase: 1, name: "Foundation", goal: "Concept building", duration: "Weeks 1-4", tasks: ["Arithmetic basics", "Reasoning patterns", "English grammar"] },
      { phase: 2, name: "Topic Completion", goal: "Complete syllabus", duration: "Weeks 5-8", tasks: ["Advanced arithmetic", "All reasoning types", "Reading comprehension"] },
      { phase: 3, name: "Practice", goal: "Topic-wise + PYQs", duration: "Weeks 9-12", tasks: ["Sectional tests", "PYQ sets", "Speed practice"] },
      { phase: 4, name: "Revision", goal: "Spaced revision", duration: "Weeks 13-14", tasks: ["Weak topics", "Formula revision", "Current affairs"] },
      { phase: 5, name: "Mock Tests", goal: "Full-length simulations", duration: "Weeks 15-16", tasks: ["Daily full mocks", "Analysis", "Targeted repractice"] },
      { phase: 6, name: "Final Revision", goal: "High-priority + weak areas", duration: "Week 17", tasks: ["Top 20 topics", "Last 3 years PYQs", "Exam strategy"] },
    ],
    dailyPlans: [
      { day: 1, date: "Day 1", sessions: [{ subject: "Quant", topic: "Percentage", durationHours: 2, activity: "Concept + practice" }, { subject: "Reasoning", topic: "Series", durationHours: 1, activity: "Practice set" }, { subject: "English", topic: "Vocab", durationHours: 1, activity: "Daily 30 words" }], totalHours: 4 },
      { day: 2, date: "Day 2", sessions: [{ subject: "Quant", topic: "Profit & Loss", durationHours: 2, activity: "Concept + practice" }, { subject: "Reasoning", topic: "Coding-Decoding", durationHours: 1, activity: "Practice set" }, { subject: "GA", topic: "Current Affairs", durationHours: 1, activity: "Last 6 months" }], totalHours: 4 },
      { day: 3, date: "Day 3", sessions: [{ subject: "Quant", topic: "Ratio", durationHours: 2, activity: "Practice" }, { subject: "English", topic: "RC", durationHours: 1, activity: "2 passages" }, { subject: "Reasoning", topic: "Puzzles", durationHours: 1, activity: "Practice" }], totalHours: 4 },
    ],
    weakSubjects: ["General Awareness", "Advanced Maths"],
    strongSubjects: ["Arithmetic", "Reasoning"],
    revisionSchedule: ["Saturday: weekly revision", "Sunday: full mock"],
    mockTestSchedule: ["From week 13: daily full mock", "Last week: 2 mocks/day"],
    adaptiveNotes: ["If a topic is consistently weak, allocate 1 extra hour for 3 days", "After each mock, spend 1.5 hours on analysis"],
    sources: [{ type: "AI_ANALYSIS", label: "AI Analysis" }],
    generatedAt: new Date().toISOString(),
  };
}

function mockMultiExam(_query: string): unknown {
  return {
    exams: [
      { name: "SSC CGL", priority: "Primary", date: "2025-06-15", targetScore: "180/200" },
      { name: "Banking PO", priority: "Secondary", date: "2025-07-20", targetScore: "Cut-off clearing" },
      { name: "Railway NTPC", priority: "Backup", date: "2025-09-01", targetScore: "Qualifying" },
    ],
    availableHours: 5,
    knowledgeMap: {
      common: ["Quantitative Aptitude", "Reasoning", "English", "General Awareness"],
      examSpecific: [
        { exam: "SSC CGL", priority: "Primary", topics: ["Static GK", "Advanced Maths", "Statistics (JSO)"] },
        { exam: "Banking PO", priority: "Secondary", topics: ["Banking Awareness", "Descriptive English", "Computer Awareness"] },
        { exam: "Railway NTPC", priority: "Backup", topics: ["Railway Awareness", "Typing"] },
      ],
    },
    combinedStrategy: {
      commonPreparation: ["Percentage", "Ratio", "Series", "Comprehension", "Current Affairs"],
      examSpecificPreparation: [{ exam: "CGL", topics: ["Statistics", "Static GK"] }, { exam: "Banking", topics: ["Banking Awareness", "Computer"] }, { exam: "Railway", topics: ["Railway GK", "Typing"] }],
      priority: ["Shared foundations first", "Then CGL-specific", "Banking maintenance", "Railway mock-only before exam"],
      dependencies: ["Percentage before Profit & Loss", "Tables before quick arithmetic"],
      scheduling: ["Morning: Quant (common)", "Afternoon: Reasoning (common)", "Evening: Exam-specific"],
      revision: ["Weekend shared revision", "Topic-level spaced repetition"],
      mockTesting: ["CGL mocks closer to June", "Banking mocks in July", "Railway mocks in August"],
    },
    conflicts: [
      { type: "Different patterns", description: "CGL 100q/60min vs Banking 100q/60min vs NTPC variable", reason: "Speed requirements differ" },
      { type: "Different marking", description: "CGL -0.5, Banking -0.25, NTPC -0.33", reason: "Different risk tolerance per exam" },
      { type: "Different awareness", description: "CGL static GK, Banking banking-awareness, Railway rail-awareness", reason: "Requires separate prep" },
    ],
    weeklySchedule: [
      { day: "Monday", sessions: ["Quant (common): 2h", "Reasoning: 1.5h", "English: 1.5h"] },
      { day: "Tuesday", sessions: ["Quant (CGL-adv): 1.5h", "Banking Awareness: 1.5h", "Reasoning: 2h"] },
      { day: "Wednesday", sessions: ["Quant (common): 2h", "English: 1.5h", "Static GK: 1.5h"] },
      { day: "Thursday", sessions: ["Quant (Banking): 1.5h", "Computer Awareness: 1.5h", "Reasoning: 2h"] },
      { day: "Friday", sessions: ["Quant (common): 2h", "Current Affairs: 1.5h", "Railway GK: 1.5h"] },
      { day: "Saturday", sessions: ["Weekly revision: 2.5h", "Sectional test: 2.5h"] },
      { day: "Sunday", sessions: ["Full mock (rotating): 2h", "Analysis: 1.5h", "Weak topic: 1.5h"] },
    ],
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
