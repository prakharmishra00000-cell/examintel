"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2, Eraser, MessageSquare } from "lucide-react";
import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";

export function AIAssistant() {
  const { assistantOpen, setAssistantOpen, contextTitle, contextType } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const context = `${contextTitle} (${contextType})`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          context,
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.error ?? "No response.";
      setMessages((m) => [...m, { role: "assistant", content: reply, timestamp: new Date().toISOString() }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${e?.message ?? "request failed"}`, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Explain Tier 1 Quantitative Aptitude for SSC CGL",
    "Why do I need Integration before Differential Equations?",
    "Give me 5 more Level 3 variants",
    "Reduce my daily study time to 4 hours",
    "What additional topics are required for Exam B?",
    "Summarise this section",
  ];

  return (
    <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col" side="right">
        <SheetHeader className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
              <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div>
              <SheetTitle className="text-base">AI Assistant</SheetTitle>
              <SheetDescription className="text-[11px]">
                Context: <span className="font-medium text-foreground">{contextTitle}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Contextual AI Assistant</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                The assistant knows your current workflow context. Ask about the exam, syllabus, question, PDF, dependency graph, or plan you're viewing.
              </p>
              <div className="mt-4 w-full space-y-1">
                {quickPrompts.slice(0, 3).map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    className="block w-full rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-accent transition"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    m.role === "user"
                      ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white rounded-br-sm"
                      : "bg-muted border border-border rounded-bl-sm"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted border border-border rounded-bl-sm px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> AI is thinking...
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        {messages.length > 0 && (
          <div className="px-4 py-2 border-t border-border flex flex-wrap gap-1">
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => setInput(p)}
                className="rounded-full border border-border px-2 py-0.5 text-[10px] hover:bg-accent transition"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-3 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your current context..."
            className="min-h-[60px] max-h-32 resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
              className="gap-1 text-xs text-muted-foreground"
              disabled={messages.length === 0}
            >
              <Eraser className="h-3 w-3" /> Clear
            </Button>
            <Button size="sm" onClick={send} disabled={loading || !input.trim()} className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500">
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
