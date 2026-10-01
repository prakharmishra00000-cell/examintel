// ============================================================
// ZAI Provider — sandbox only (z-ai-web-dev-sdk)
// ============================================================
import ZAI from "z-ai-web-dev-sdk";
import type { LLMProvider, ChatCompletionMessage } from "./provider";
import { extractJson } from "./provider";

export class ZAIProvider implements LLMProvider {
  name = "z-ai-web-dev-sdk (sandbox)";
  available = true;

  private async getClient() {
    return await ZAI.create();
  }

  async text(system: string, user: string): Promise<string> {
    const zai = await this.getClient();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: system },
        { role: "user", content: user },
      ],
      thinking: { type: "disabled" },
    });
    return completion.choices[0]?.message?.content ?? "";
  }

  async json<T>(system: string, user: string, schemaHint?: string): Promise<T> {
    const sys = system + (schemaHint ? `\n\nRespond with ONLY valid JSON matching this shape:\n${schemaHint}` : "\n\nRespond with ONLY valid JSON. No markdown, no code fences, no commentary.");
    const raw = await this.text(sys, user);
    return extractJson<T>(raw);
  }

  async chat(messages: ChatCompletionMessage[]): Promise<string> {
    const zai = await this.getClient();
    // ZAI expects system prompt as first 'assistant' message
    const mapped = messages.map((m) =>
      m.role === "system" ? { role: "assistant" as const, content: m.content } : { role: m.role, content: m.content }
    );
    const completion = await zai.chat.completions.create({
      messages: mapped as any,
      thinking: { type: "disabled" },
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}
