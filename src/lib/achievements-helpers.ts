import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Search,
  CalendarRange,
  FileStack,
  HelpCircle,
  Repeat2,
  ListChecks,
  Layers,
  Flame,
  TrendingUp,
  BookOpen,
  Award,
  Crown,
  FileText,
  Sparkles,
  Trophy,
  Lock,
} from "lucide-react";
import type { AchievementCategory } from "@/store/achievements-store";

// Icon name (stored as string in Achievement) -> lucide component.
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  Calendar,
  Search,
  CalendarRange,
  FileStack,
  HelpCircle,
  Repeat2,
  ListChecks,
  Layers,
  Flame,
  TrendingUp,
  BookOpen,
  Award,
  Crown,
  FileText,
  Sparkles,
  Trophy,
};

export const LOCK_ICON: LucideIcon = Lock;

export interface CategoryColor {
  grad: string; // tailwind gradient stops, e.g. "from-violet-500 to-fuchsia-500"
  text: string; // e.g. "text-violet-500"
  bg: string; // e.g. "bg-violet-500/10"
  border: string; // e.g. "border-violet-500/30"
  glow: string; // e.g. "shadow-violet-500/20"
  ring: string; // e.g. "ring-violet-500/20"
}

// MANDATORY palette: NO indigo/blue. Category tints:
//   starter=sky, practice=violet, consistency=emerald,
//   mastery=amber, explorer=rose. Locked = grayscale.
export const CATEGORY_COLORS: Record<AchievementCategory, CategoryColor> = {
  starter: {
    grad: "from-sky-500 to-cyan-500",
    text: "text-sky-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    glow: "shadow-sky-500/20",
    ring: "ring-sky-500/20",
  },
  practice: {
    grad: "from-violet-500 to-fuchsia-500",
    text: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    glow: "shadow-violet-500/20",
    ring: "ring-violet-500/20",
  },
  consistency: {
    grad: "from-emerald-500 to-teal-500",
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/20",
    ring: "ring-emerald-500/20",
  },
  mastery: {
    grad: "from-amber-500 to-orange-500",
    text: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/20",
    ring: "ring-amber-500/20",
  },
  explorer: {
    grad: "from-rose-500 to-pink-500",
    text: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    glow: "shadow-rose-500/20",
    ring: "ring-rose-500/20",
  },
};

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  starter: "Starter",
  practice: "Practice",
  consistency: "Consistency",
  mastery: "Mastery",
  explorer: "Explorer",
};

export const CATEGORY_ORDER: AchievementCategory[] = [
  "starter",
  "practice",
  "consistency",
  "mastery",
  "explorer",
];

// Resolve an achievement's icon — falls back to a generic sparkles icon.
export function resolveAchievementIcon(name: string): LucideIcon {
  return ACHIEVEMENT_ICONS[name] ?? Sparkles;
}
