"use client";

import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, KeyRound, Rocket, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ApiKeysView() {
  const aiStatus = useAppStore((s) => s.aiStatus);
  const setView = useAppStore((s) => s.setView);
  const ok = aiStatus?.available;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-violet-500" />
          <h1 className="text-2xl font-bold tracking-tight">API Keys & Vercel Deployment</h1>
        </div>
        <p className="mt-1.5 text-muted-foreground">
          ExamIntel works in <strong>Demo Mode</strong> out of the box (no keys needed). To make every AI feature fully functional on Vercel, set one environment variable below.
        </p>
      </div>

      {/* Status */}
      <Card className={ok ? "border-emerald-500/40" : "border-amber-500/40"}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" /> : <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />}
            <div className="flex-1">
              <p className="font-medium">{ok ? "AI is live" : "Running in Demo Mode (mock AI)"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ok
                  ? `Provider: ${aiStatus?.provider}. All features are using real AI.`
                  : `Provider: ${aiStatus?.provider ?? "—"}. The UI is fully explorable with sample structured data. Configure an AI key to switch to real AI.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Required env vars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4" /> Environment Variables for Vercel
          </CardTitle>
          <CardDescription>Set these in your Vercel project: Settings → Environment Variables. Then redeploy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Required */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">Required (pick one)</Badge>
            </div>
            <div className="space-y-3">
              <EnvRow
                name="OPENAI_API_KEY"
                required
                desc="OpenAI API key. Powers all LLM features (exam research, question AI, evolution, paper generation, PDF analysis, MCQ generation, preparation planning, multi-exam optimization, chat)."
                how="Get it from https://platform.openai.com/api-keys → Create new secret key."
                example="sk-proj-xxxxxxxxxxxxxxxxxxxx"
                onCopy={copy}
              />
            </div>
          </div>

          {/* Optional */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="border-sky-500/30 text-sky-600 dark:text-sky-400">Optional — for OpenAI-compatible providers</Badge>
            </div>
            <div className="space-y-3">
              <EnvRow
                name="OPENAI_BASE_URL"
                desc="Base URL for OpenAI-compatible providers. Use this to plug in OpenRouter, Together, Groq, Azure, etc."
                how="e.g. https://openrouter.ai/api/v1 for OpenRouter, https://api.groq.com/openai/v1 for Groq."
                example="https://openrouter.ai/api/v1"
                onCopy={copy}
              />
              <EnvRow
                name="OPENAI_MODEL"
                desc="Model name to use. Defaults to gpt-4o-mini if unset."
                how="Pick a model supported by your provider. gpt-4o-mini is a good default for cost/quality balance."
                example="gpt-4o-mini"
                onCopy={copy}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-step */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step-by-step: Deploy to Vercel & enable AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Step n={1} title="Push to GitHub">
            Commit your project to a GitHub repository.
          </Step>
          <Step n={2} title="Import to Vercel">
            Go to <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-violet-500 underline inline-flex items-center gap-0.5">vercel.com/new <ExternalLink className="h-3 w-3" /></a> and import the repo. Vercel auto-detects Next.js.
          </Step>
          <Step n={3} title="Add environment variables">
            In Vercel project Settings → Environment Variables, add <code className="bg-muted px-1.5 py-0.5 rounded text-xs">OPENAI_API_KEY</code> with your key. Add <code className="bg-muted px-1.5 py-0.5 rounded text-xs">OPENAI_MODEL</code> (e.g. <code className="bg-muted px-1.5 py-0.5 rounded text-xs">gpt-4o-mini</code>) if needed.
          </Step>
          <Step n={4} title="Deploy">
            Click Deploy. Once built, every AI feature (exam research, question AI, evolution lab, paper generator, PDF lab, MCQ generator, preparation simulator, multi-exam optimizer, contextual chat) becomes fully functional.
          </Step>
          <Step n={5} title="Verify">
            Visit your Vercel URL. The header pill should switch from <span className="text-amber-500">Mock Mode</span> to <span className="text-emerald-500">AI Live</span>.
          </Step>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes & design choices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong className="text-foreground">No database setup required.</strong> User data (saved research, attempts) persists in the browser via localStorage — works on Vercel out of the box.</p>
          <p>• <strong className="text-foreground">All AI calls run server-side</strong> in Next.js API routes (serverless functions). Your API key is never exposed to the browser.</p>
          <p>• <strong className="text-foreground">Provider abstraction</strong> is in <code className="bg-muted px-1 py-0.5 rounded text-xs">src/lib/ai/</code>. Swap providers without touching features.</p>
          <p>• <strong className="text-foreground">Structured JSON only.</strong> Every AI response is validated against a TypeScript type before reaching the UI — no free-form AI in the frontend.</p>
          <p>• <strong className="text-foreground">Demo Mode</strong> produces realistic structured sample data so you can explore the entire UI before adding a key.</p>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={() => setView("exam-researcher")} className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500">
          Try Exam Researcher now <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function EnvRow({ name, required, desc, how, example, onCopy }: { name: string; required?: boolean; desc: string; how: string; example: string; onCopy: (t: string) => void }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <code className="text-sm font-mono font-semibold">{name}</code>
        {required && <Badge variant="secondary" className="text-[10px]">required</Badge>}
        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => onCopy(name)}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      <p className="mt-1.5 text-xs"><span className="text-muted-foreground">How to get it: </span>{how}</p>
      <p className="mt-1 text-xs"><span className="text-muted-foreground">Example: </span><code className="bg-muted px-1 py-0.5 rounded">{example}</code></p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-bold">
        {n}
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{children}</p>
      </div>
    </div>
  );
}
