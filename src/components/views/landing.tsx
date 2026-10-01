"use client";

import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Search,
  Scale,
  Network,
  HelpCircle,
  Repeat2,
  FileStack,
  FileText,
  ListChecks,
  CalendarRange,
  Layers,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  GitBranch,
  Zap,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import type { ViewKey } from "@/store/app-store";

const features: { icon: typeof Search; title: string; desc: string; view: ViewKey; accent: string }[] = [
  { icon: Search, title: "Exam Researcher", desc: "Understand an exam before preparing for it — eligibility, stages, syllabus, pattern, career.", view: "exam-researcher", accent: "from-violet-500/20 to-violet-500/5" },
  { icon: Scale, title: "Exam Comparison", desc: "Find common syllabus, exam-specific topics, and additional preparation across exams.", view: "exam-comparison", accent: "from-fuchsia-500/20 to-fuchsia-500/5" },
  { icon: Network, title: "Dependency Mapper", desc: "Know what you need to learn first. Detect prerequisite gaps before they block you.", view: "dependency-mapper", accent: "from-emerald-500/20 to-emerald-500/5" },
  { icon: HelpCircle, title: "Question AI", desc: "Understand difficult questions progressively — hint, concept, solution, shortcut, insight.", view: "question-explainer", accent: "from-amber-500/20 to-amber-500/5" },
  { icon: Repeat2, title: "Question Evolution Lab", desc: "Turn one PYQ into an entire practice family across 5 difficulty evolution levels.", view: "question-evolution", accent: "from-purple-500/20 to-purple-500/5" },
  { icon: FileStack, title: "AI Paper Generator", desc: "Create personalized exam-style papers. Attempt, submit, and get performance analysis.", view: "paper-generator", accent: "from-sky-500/20 to-sky-500/5" },
  { icon: FileText, title: "PDF Intelligence", desc: "Turn official notifications, syllabus PDFs, and PYQs into actionable grounded information.", view: "pdf-lab", accent: "from-cyan-500/20 to-cyan-500/5" },
  { icon: ListChecks, title: "AI MCQ Generator", desc: "Generate source-grounded MCQs directly from your uploaded documents.", view: "mcq-generator", accent: "from-rose-500/20 to-rose-500/5" },
  { icon: CalendarRange, title: "Preparation Simulator", desc: "Build and adapt your 6-phase preparation journey with realistic daily plans.", view: "preparation-simulator", accent: "from-teal-500/20 to-teal-500/5" },
  { icon: Layers, title: "Multi-Exam Optimizer", desc: "Prepare for multiple exams without unnecessarily duplicating effort.", view: "multi-exam-optimizer", accent: "from-indigo-500/20 to-indigo-500/5" },
];

const pipeline = ["Research", "Understand", "Map", "Compare", "Diagnose", "Practice", "Generate", "Prepare", "Simulate", "Analyse", "Adapt"];

export function Landing() {
  const setView = useAppStore((s) => s.setView);
  const aiStatus = useAppStore((s) => s.aiStatus);
  const ok = aiStatus?.available;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
              <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg">
                <Brain className="h-4 w-4" />
              </div>
            </div>
            <div className="leading-none">
              <div className="font-bold text-base tracking-tight">ExamIntel</div>
              <div className="text-[10px] text-muted-foreground">AI Exam Intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
              {ok ? "AI Live" : "Demo Mode — Configure API Keys"}
            </span>
            <Button size="sm" onClick={() => setView("dashboard")} className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
              Launch App <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 mesh-gradient opacity-70" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-background" />
        <div className="absolute -top-24 -right-24 -z-10 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl float-slow" />
        <div className="absolute -top-32 -left-24 -z-10 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl float-slow" style={{ animationDelay: "-4s" }} />
        <div className="absolute top-1/3 right-1/4 -z-10 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl float-slow" style={{ animationDelay: "-8s" }} />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 backdrop-blur-sm"
          >
            <Sparkles className="h-3 w-3" />
            AI Exam Intelligence System
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight"
          >
            Your <span className="text-gradient-violet">AI Command Center</span>
            <br />
            for Competitive Exams
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-5 mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground"
          >
            Research exams. Compare syllabi. Map prerequisites. Understand difficult questions. Analyse official PDFs.
            Generate source-grounded MCQs. Evolve PYQs into new practice. Build personalized papers. Optimize preparation across multiple exams.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Button size="lg" onClick={() => setView("dashboard")} className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg shadow-violet-500/30">
              Start Preparing <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setView("exam-researcher")} className="gap-2">
              <Search className="h-4 w-4" /> Explore AI Tools
            </Button>
          </motion.div>

          {/* Pipeline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-1.5 text-[11px] sm:text-xs"
          >
            {pipeline.map((p, i) => (
              <span key={p} className="inline-flex items-center gap-1.5">
                <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 font-medium backdrop-blur-sm">{p}</span>
                {i < pipeline.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
              </span>
            ))}
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto"
          >
            {[
              { value: "13", label: "AI Features" },
              { value: "5", label: "Evolution Levels" },
              { value: "6", label: "Prep Phases" },
              { value: "∞", label: "Practice Variants" },
            ].map((s, i) => (
              <div key={s.label} className="glass-card rounded-xl p-4 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-gradient-violet">{s.value}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Floating preview cards */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto"
          >
            {[
              { title: "Exam Researcher", body: "SSC CGL → structured report: eligibility, 4 stages, syllabus tree, pattern table, career info, preparation sequence.", accent: "from-violet-500/15 to-violet-500/5", icon: Search },
              { title: "Dependency Map", body: "Calculus → Differentiation → Integration → Differential Equations. Gap detected: Integration.", accent: "from-emerald-500/15 to-emerald-500/5", icon: Network },
              { title: "Question Evolution", body: "1 PYQ → 5 variants: easier, reframed, multi-concept, difficult, exam-trap. All validated.", accent: "from-fuchsia-500/15 to-fuchsia-500/5", icon: Repeat2 },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                  whileHover={{ y: -4 }}
                  className={`glass-card rounded-xl bg-gradient-to-br ${c.accent} p-4 text-left cursor-pointer`}
                  onClick={() => setView(i === 0 ? "exam-researcher" : i === 1 ? "dependency-mapper" : "question-evolution")}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background/60">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold">{c.title}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">{c.body}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl w-full px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">One connected system, not ten separate tools</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
            Every feature shares data: researched syllabus feeds dependency maps; dependencies feed preparation plans; performance feeds adaptive recommendations.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.button
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: (i % 3) * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => setView(f.view)}
                className="group text-left"
              >
                <div className={`relative h-full rounded-xl border border-border bg-gradient-to-br ${f.accent} p-5 transition-all hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10`}>
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm border border-border">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="mt-4 font-semibold text-base">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Trust / source system */}
      <section className="mx-auto max-w-6xl w-full px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, title: "Provenance by default", desc: "Every claim is tagged: Official Source, Uploaded Document, AI Analysis, or AI-Generated. Never fabricated." },
            { icon: GitBranch, title: "Lineage preserved", desc: "Evolved questions stay linked to their source PYQ. Never presented as original. Always validated." },
            { icon: TrendingUp, title: "Adaptive intelligence", desc: "Performance, weaknesses, prerequisite gaps, and time constraints continuously reshape your plan." },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="rounded-xl border border-border p-5 card-lift gradient-glow">
                <Icon className="h-5 w-5 text-violet-500" />
                <h3 className="mt-3 font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works — 3-step */}
      <section className="mx-auto max-w-6xl w-full px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-2 text-muted-foreground">Three steps from input to actionable intelligence.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* connector line on desktop */}
          <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-violet-500/0 via-violet-500/40 to-fuchsia-500/0" />
          {[
            { n: "1", title: "Give us an input", desc: "An exam name, a syllabus, a PDF, or a question. Anything exam-related.", icon: Search },
            { n: "2", title: "AI builds intelligence", desc: "Structured reports, dependency graphs, validated question variants, and grounded analysis — all typed JSON.", icon: Brain },
            { n: "3", title: "Act on it", desc: "Attempt papers, track mastery, optimize across exams, and adapt your plan as you progress.", icon: Target },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-violet-500 text-xs font-bold text-violet-500">
                    {s.n}
                  </div>
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Testimonials / feature quotes */}
      <section className="mx-auto max-w-6xl w-full px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">What aspirants get</h2>
          <p className="mt-2 text-muted-foreground">Real value at every stage of preparation.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { quote: "I researched SSC CGL, got a full syllabus tree, and a 6-phase plan in under a minute. The dependency map caught that I needed Integration before Differential Equations.", author: "Aspirant, Tier 2", accent: "from-violet-500/10 to-transparent" },
            { quote: "The Question Evolution Lab turned one PYQ into 5 variants. The exam-trap variant showed me a misconception I didn't know I had. Practice multiplier is real.", author: "GATE aspirant", accent: "from-fuchsia-500/10 to-transparent" },
            { quote: "Uploaded the official notification PDF, asked 'what's the negative marking?' and got a grounded answer with the source page. No more scrolling 12-page PDFs.", author: "UPSC aspirant", accent: "from-emerald-500/10 to-transparent" },
          ].map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className={`rounded-xl border border-border p-5 bg-gradient-to-br ${t.accent} card-lift`}
            >
              <div className="text-3xl text-violet-500/40 leading-none mb-2">"</div>
              <p className="text-sm leading-relaxed">{t.quote}</p>
              <p className="mt-3 text-xs text-muted-foreground font-medium">— {t.author}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl w-full px-4 py-12">
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-transparent p-8 sm:p-12 text-center">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
          <Zap className="mx-auto h-8 w-8 text-violet-500" />
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold">Give me an exam, syllabus, PDF, or question — and turn it into actionable preparation intelligence.</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
            One connected AI Exam Intelligence System for research, syllabus analysis, comparison, prerequisite mapping, question solving, PYQ practice, question generation, mock tests, PDF analysis, study planning, multi-exam planning, and performance analysis.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => setView("dashboard")} className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
              Launch Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="font-medium text-foreground">ExamIntel</span>
            <span>·</span>
            <span>AI Exam Intelligence Platform</span>
            <span>·</span>
            <span>Research → Understand → Map → Compare → Practice → Prepare → Analyse → Adapt</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
