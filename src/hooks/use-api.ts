"use client";

import { useCallback } from "react";
import { toast } from "sonner";

// Shared API client hook used by all feature views.
// All AI calls go through /api/* serverless routes — the API key is server-side
// only (Vercel env var), never exposed to the client. Any user visiting the live
// URL gets real AI responses without needing to configure anything.
export function useApi() {
  const call = useCallback(async <T>(path: string, body?: unknown): Promise<T | null> => {
    try {
      const res = await fetch(path, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const txt = await res.text();
        // Try to parse the error as JSON for a cleaner message
        let msg = txt.slice(0, 500) || `Request failed (${res.status})`;
        try {
          const parsed = JSON.parse(txt);
          msg = parsed.error || parsed.message || msg;
        } catch {
          // not JSON, use raw text
        }
        throw new Error(msg);
      }
      return (await res.json()) as T;
    } catch (e: any) {
      const msg = e?.message ?? "Unknown error";
      toast.error("AI request failed", { description: msg.slice(0, 300) });
      return null;
    }
  }, []);

  return { call };
}
