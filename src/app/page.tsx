"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { AppShell } from "@/components/app-shell";
import { AIAssistant } from "@/components/ai-assistant";
import { CommandPalette } from "@/components/command-palette";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { Landing } from "@/components/views/landing";

export default function Home() {
  const currentView = useAppStore((s) => s.currentView);
  const setAiStatus = useAppStore((s) => s.setAiStatus);

  useEffect(() => {
    // Fetch AI provider status on mount
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => setAiStatus(data))
      .catch(() => setAiStatus({ provider: "unknown", available: false }));
  }, [setAiStatus]);

  if (currentView === "landing") {
    return (
      <div className="min-h-screen flex flex-col">
        <Landing />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppShell />
      <AIAssistant />
      <CommandPalette />
      <OnboardingWizard />
    </div>
  );
}
