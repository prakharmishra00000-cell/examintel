"use client";

import { useCallback } from "react";
import { toast } from "sonner";

// Shared API client hook used by all feature views.
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
        throw new Error(txt.slice(0, 500) || `Request failed (${res.status})`);
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
