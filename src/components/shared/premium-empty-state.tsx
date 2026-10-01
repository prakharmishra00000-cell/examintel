"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ViewKey } from "@/store/app-store";

// Premium empty state with gradient illustration + actionable CTA.
// Replaces the bare EmptyState for hero/empty moments across views.
export function PremiumEmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaOnClick,
  ctaIcon: CtaIcon,
  accent = "violet",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaOnClick?: () => void;
  ctaIcon?: LucideIcon;
  accent?: "violet" | "emerald" | "amber" | "rose" | "sky";
  className?: string;
}) {
  const accents: Record<string, { grad: string; ring: string; text: string; bg: string }> = {
    violet: { grad: "from-violet-500 to-fuchsia-500", ring: "ring-violet-500/20", text: "text-violet-500", bg: "bg-violet-500/10" },
    emerald: { grad: "from-emerald-500 to-teal-500", ring: "ring-emerald-500/20", text: "text-emerald-500", bg: "bg-emerald-500/10" },
    amber: { grad: "from-amber-500 to-orange-500", ring: "ring-amber-500/20", text: "text-amber-500", bg: "bg-amber-500/10" },
    rose: { grad: "from-rose-500 to-pink-500", ring: "ring-rose-500/20", text: "text-rose-500", bg: "bg-rose-500/10" },
    sky: { grad: "from-sky-500 to-cyan-500", ring: "ring-sky-500/20", text: "text-sky-500", bg: "bg-sky-500/10" },
  };
  const a = accents[accent] ?? accents.violet;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center overflow-hidden", className)}
    >
      <div className={cn("absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl opacity-30 bg-gradient-to-br", a.grad)} />
      <div className={cn("absolute -bottom-20 -left-20 h-48 w-48 rounded-full blur-3xl opacity-20 bg-gradient-to-br", a.grad)} />

      <div className="relative">
        <div className={cn("absolute inset-0 rounded-2xl blur-xl opacity-40 bg-gradient-to-br", a.grad)} />
        <div className={cn("relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ring-4", a.grad, a.ring)}>
          <Icon className="h-8 w-8 text-white" />
        </div>
      </div>

      <h3 className="relative mt-5 text-lg font-semibold">{title}</h3>
      {description && <p className="relative mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>}

      {ctaLabel && ctaOnClick && (
        <Button
          onClick={ctaOnClick}
          className={cn("relative mt-5 gap-1.5 bg-gradient-to-r text-white hover:opacity-90", a.grad)}
        >
          {CtaIcon && <CtaIcon className="h-4 w-4" />}
          {ctaLabel}
        </Button>
      )}
    </motion.div>
  );
}

// Animated number counter — counts up from 0 to value on mount.
export function AnimatedCounter({ value, duration = 1.2, className }: { value: number; duration?: number; className?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <CountUp value={value} duration={duration} />
    </motion.span>
  );
}

import { useEffect, useState } from "react";
function CountUp({ value, duration }: { value: number; duration: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
}
