"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { motion } from "framer-motion";
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Layers,
  GitBranch,
  Target,
  X,
  Info,
  ExternalLink,
  Sparkles,
  BookOpen,
  ListTree,
  CircleDot,
  Save,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useFlashcardStore } from "@/store/flashcard-store";
import {
  AnimatedCounter,
  PremiumEmptyState,
} from "@/components/shared/premium-empty-state";
import type {
  SavedItem,
  DependencyMapReport,
  DependencyNode,
  ExamResearchReport,
  SyllabusTopic,
  SyllabusSubtopic,
} from "@/types";
import type { FlashcardSet } from "@/types/flashcard";

// ============================================================
// Concept Map — interactive visual mind map of topics/concepts
// aggregated from saved exam research + dependency maps + flashcards.
// Custom SVG tree/radial visualisation (no library).
//
// Layout: Root → Subjects (violet) → Topics (fuchsia) → Concepts (emerald).
// Each node carries a mastery ring (mastered=emerald / learning=amber /
// weak=rose / not-started=zinc). Node size scales by sourceCount.
// Supports zoom (wheel + buttons), pan (drag), click-to-collapse,
// hover tooltip, expand/collapse all, layout toggle (Tree/Radial),
// detail panel and stats card.
// ============================================================

// ---------- Hydration-safe mounted guard ----------
// (Same pattern as topic-mastery.tsx — avoids react-hooks/set-state-in-effect.)
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// ---------- Types ----------
type NodeType = "subject" | "topic" | "concept";
type MasteryBucket = "mastered" | "learning" | "weak" | "not-started";

interface ConceptNode {
  id: string;
  label: string;
  type: NodeType;
  children: ConceptNode[];
  mastery: MasteryBucket;
  sourceCount: number;
  relatedItems: RelatedRef[];
  prerequisites?: string[];
  dependents?: string[];
  // layout cache
  x?: number;
  y?: number;
  depth: number;
}

interface RelatedRef {
  id: string;
  title: string;
  type: string;
}

// ---------- Mastery mapping ----------
const DEP_MASTERY_MAP: Record<string, MasteryBucket> = {
  Mastered: "mastered",
  Strong: "mastered",
  Improving: "learning",
  Practicing: "learning",
  Learning: "learning",
  Weak: "weak",
  Introduced: "not-started",
  "Not Started": "not-started",
};

const FC_MASTERY_MAP: Record<string, MasteryBucket> = {
  Mastered: "mastered",
  Reviewing: "learning",
  Learning: "learning",
  New: "not-started",
};

const MASTERY_ORDER: Record<MasteryBucket, number> = {
  mastered: 4,
  learning: 3,
  weak: 2,
  "not-started": 1,
};

function bestMastery(...buckets: (MasteryBucket | undefined)[]): MasteryBucket {
  let best: MasteryBucket = "not-started";
  for (const b of buckets) {
    if (b && MASTERY_ORDER[b] > MASTERY_ORDER[best]) best = b;
  }
  return best;
}

// ---------- Node + mastery styling (NO indigo/blue) ----------
const TYPE_STYLES: Record<
  NodeType,
  { fill: string; stroke: string; text: string; label: string }
> = {
  subject: {
    fill: "fill-violet-500",
    stroke: "stroke-violet-400",
    text: "text-violet-500",
    label: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  },
  topic: {
    fill: "fill-fuchsia-500",
    stroke: "stroke-fuchsia-400",
    text: "text-fuchsia-500",
    label:
      "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
  },
  concept: {
    fill: "fill-emerald-500",
    stroke: "stroke-emerald-400",
    text: "text-emerald-500",
    label:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
};

const MASTERY_STYLES: Record<
  MasteryBucket,
  { ring: string; label: string; dot: string; text: string; name: string }
> = {
  mastered: {
    ring: "stroke-emerald-500",
    label: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    name: "Mastered",
  },
  learning: {
    ring: "stroke-amber-500",
    label: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    name: "Learning",
  },
  weak: {
    ring: "stroke-rose-500",
    label: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    dot: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    name: "Weak",
  },
  "not-started": {
    ring: "stroke-zinc-400",
    label: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
    dot: "bg-zinc-400",
    text: "text-zinc-500 dark:text-zinc-400",
    name: "Not Started",
  },
};

const TYPE_LABEL: Record<NodeType, string> = {
  subject: "Subject",
  topic: "Topic",
  concept: "Concept",
};

// ---------- Helpers ----------
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
function slug(...parts: string[]): string {
  return parts.map(norm).filter(Boolean).join("::");
}

// ============================================================
// Aggregation: build a hierarchical tree from saved items + flashcards
// ============================================================
function buildTree(saved: SavedItem[], flashcardSets: FlashcardSet[]): {
  root: ConceptNode;
  stats: { subjects: number; topics: number; concepts: number; mastered: number };
} {
  // Internal accumulation map
  interface TopicAgg {
    id: string;
    label: string;
    mastery: MasteryBucket;
    sources: Set<string>;
    related: Map<string, RelatedRef>;
    prerequisites: Set<string>;
    dependents: Set<string>;
    concepts: Map<string, ConceptAgg>;
  }
  interface ConceptAgg {
    id: string;
    label: string;
    mastery: MasteryBucket;
    sources: Set<string>;
    related: Map<string, RelatedRef>;
  }
  interface SubjectAgg {
    id: string;
    label: string;
    mastery: MasteryBucket;
    sources: Set<string>;
    related: Map<string, RelatedRef>;
    topics: Map<string, TopicAgg>;
  }

  const subjects = new Map<string, SubjectAgg>();

  function getSubject(name: string): SubjectAgg {
    const key = norm(name);
    let s = subjects.get(key);
    if (!s) {
      s = {
        id: slug("subject", key),
        label: name.trim(),
        mastery: "not-started",
        sources: new Set(),
        related: new Map(),
        topics: new Map(),
      };
      subjects.set(key, s);
    }
    return s;
  }
  function getTopic(subject: SubjectAgg, name: string): TopicAgg {
    const key = norm(name);
    let t = subject.topics.get(key);
    if (!t) {
      t = {
        id: slug(subject.id, "topic", key),
        label: name.trim(),
        mastery: "not-started",
        sources: new Set(),
        related: new Map(),
        prerequisites: new Set(),
        dependents: new Set(),
        concepts: new Map(),
      };
      subject.topics.set(key, t);
    }
    return t;
  }
  function getConcept(topic: TopicAgg, name: string): ConceptAgg {
    const key = norm(name);
    let c = topic.concepts.get(key);
    if (!c) {
      c = {
        id: slug(topic.id, "concept", key),
        label: name.trim(),
        mastery: "not-started",
        sources: new Set(),
        related: new Map(),
      };
      topic.concepts.set(key, c);
    }
    return c;
  }
  function addRelated(
    map: Map<string, RelatedRef>,
    id: string,
    title: string,
    type: string,
  ) {
    if (!map.has(id)) map.set(id, { id, title, type });
  }

  // 1) Saved exam reports — extract syllabus (subjects → topics → subtopics/concepts)
  for (const item of saved) {
    if (item.type !== "exam") continue;
    const data = item.data as Partial<ExamResearchReport> | null;
    if (!data) continue;
    const syllabus = data.syllabus;
    if (!Array.isArray(syllabus)) continue;
    for (const subj of syllabus) {
      const subjName = str(subj?.subject);
      if (!subjName) continue;
      const subject = getSubject(subjName);
      subject.sources.add(item.id);
      addRelated(subject.related, item.id, item.title, item.type);
      const topics = (subj?.topics ?? []) as SyllabusTopic[];
      for (const topic of topics) {
        const topicName = str(topic?.name);
        if (!topicName) continue;
        const t = getTopic(subject, topicName);
        t.sources.add(item.id);
        addRelated(t.related, item.id, item.title, item.type);
        const subtopics = (topic?.subtopics ?? []) as SyllabusSubtopic[];
        for (const sub of subtopics) {
          const subName = str(sub?.name);
          if (subName) {
            const c = getConcept(t, subName);
            c.sources.add(item.id);
            addRelated(c.related, item.id, item.title, item.type);
          }
          const concepts = (sub?.concepts ?? []) as unknown[];
          for (const con of concepts) {
            const conName = str(con);
            if (conName) {
              const c = getConcept(t, conName);
              c.sources.add(item.id);
              addRelated(c.related, item.id, item.title, item.type);
            }
          }
        }
      }
    }
  }

  // 2) Saved dependency reports — root = subject, nodes = topics (+concept if present)
  for (const item of saved) {
    if (item.type !== "dependency") continue;
    const data = item.data as Partial<DependencyMapReport> | null;
    if (!data) continue;
    const rootName = str(data.root) ?? item.title;
    const subject = getSubject(rootName);
    subject.sources.add(item.id);
    addRelated(subject.related, item.id, item.title, item.type);
    const nodes = (data.nodes ?? []) as DependencyNode[];
    // topic-name lookup for resolving prerequisite/dependent ids
    const idToTopic = new Map<string, string>();
    for (const n of nodes) {
      if (n?.id && n.topic) idToTopic.set(n.id, n.topic);
    }
    for (const n of nodes) {
      const topicName = str(n?.topic);
      if (!topicName) continue;
      const t = getTopic(subject, topicName);
      t.sources.add(item.id);
      addRelated(t.related, item.id, item.title, item.type);
      const m = str(n?.mastery);
      if (m && DEP_MASTERY_MAP[m]) {
        t.mastery = bestMastery(t.mastery, DEP_MASTERY_MAP[m]);
      }
      const prereqIds = n?.prerequisites ?? [];
      for (const pid of prereqIds) {
        const pn = idToTopic.get(pid);
        if (pn) t.prerequisites.add(pn);
      }
      const dependentIds = n?.dependents ?? [];
      for (const did of dependentIds) {
        const dn = idToTopic.get(did);
        if (dn) t.dependents.add(dn);
      }
      const conName = str(n?.concept);
      if (conName) {
        const c = getConcept(t, conName);
        c.sources.add(item.id);
        addRelated(c.related, item.id, item.title, item.type);
        if (m && DEP_MASTERY_MAP[m]) {
          c.mastery = bestMastery(c.mastery, DEP_MASTERY_MAP[m]);
        }
      }
    }
  }

  // 3) Flashcards — each set's topic becomes a topic under a "Flashcards" subject
  const FC_SUBJECT = "Flashcards";
  for (const set of flashcardSets) {
    const topicName = str(set.topic) ?? "General";
    const subject = getSubject(FC_SUBJECT);
    subject.sources.add(set.id);
    addRelated(
      subject.related,
      set.id,
      set.source || `Flashcards: ${topicName}`,
      "flashcard",
    );
    const t = getTopic(subject, topicName);
    t.sources.add(set.id);
    addRelated(
      t.related,
      set.id,
      set.source || `Flashcards: ${topicName}`,
      "flashcard",
    );
    // Best card mastery in this set → topic mastery
    if (set.cards.length) {
      const best = set.cards.reduce<MasteryBucket>(
        (acc, c) => bestMastery(acc, FC_MASTERY_MAP[c.mastery] ?? "not-started"),
        "not-started",
      );
      t.mastery = bestMastery(t.mastery, best);
    }
    // Cards whose topic differs from the set topic → concept-level nodes
    for (const card of set.cards) {
      const cardTopic = str(card.topic);
      if (cardTopic && norm(cardTopic) !== norm(topicName)) {
        const c = getConcept(t, cardTopic);
        c.sources.add(set.id);
        addRelated(
          c.related,
          set.id,
          set.source || `Flashcards: ${topicName}`,
          "flashcard",
        );
        const cm = FC_MASTERY_MAP[card.mastery];
        if (cm) c.mastery = bestMastery(c.mastery, cm);
      }
    }
  }

  // Build the tree (Root → Subjects → Topics → Concepts)
  const root: ConceptNode = {
    id: "root",
    label: "Knowledge Graph",
    type: "subject",
    children: [],
    mastery: "not-started",
    sourceCount: 0,
    relatedItems: [],
    depth: 0,
  };

  const stats = { subjects: 0, topics: 0, concepts: 0, mastered: 0 };

  for (const subject of subjects.values()) {
    stats.subjects++;
    if (subject.mastery === "mastered") stats.mastered++;
    const subjectNode: ConceptNode = {
      id: subject.id,
      label: subject.label,
      type: "subject",
      children: [],
      mastery: subject.mastery,
      sourceCount: subject.sources.size,
      relatedItems: Array.from(subject.related.values()),
      depth: 1,
    };
    for (const topic of subject.topics.values()) {
      stats.topics++;
      if (topic.mastery === "mastered") stats.mastered++;
      const topicNode: ConceptNode = {
        id: topic.id,
        label: topic.label,
        type: "topic",
        children: [],
        mastery: topic.mastery,
        sourceCount: topic.sources.size,
        relatedItems: Array.from(topic.related.values()),
        prerequisites: Array.from(topic.prerequisites),
        dependents: Array.from(topic.dependents),
        depth: 2,
      };
      for (const concept of topic.concepts.values()) {
        stats.concepts++;
        if (concept.mastery === "mastered") stats.mastered++;
        topicNode.children.push({
          id: concept.id,
          label: concept.label,
          type: "concept",
          children: [],
          mastery: concept.mastery,
          sourceCount: concept.sources.size,
          relatedItems: Array.from(concept.related.values()),
          depth: 3,
        });
      }
      subjectNode.children.push(topicNode);
    }
    root.children.push(subjectNode);
  }
  root.mastery = bestMastery(...root.children.map((c) => c.mastery));

  return { root, stats };
}

// ============================================================
// Layout algorithms
// ============================================================
const X_SPACING = 240;
const Y_SPACING = 60;
const R_SPACING = 160;

interface LayoutResult {
  width: number;
  height: number;
}

function layoutTree(root: ConceptNode, collapsed: Set<string>): LayoutResult {
  let nextY = 0;
  function visit(node: ConceptNode, depth: number) {
    node.depth = depth;
    node.x = depth * X_SPACING;
    const isCollapsed = collapsed.has(node.id);
    if (!node.children.length || isCollapsed) {
      node.y = nextY;
      nextY += Y_SPACING;
    } else {
      for (const c of node.children) visit(c, depth + 1);
      const first = node.children[0];
      const last = node.children[node.children.length - 1];
      node.y = (first.y! + last.y!) / 2;
    }
  }
  visit(root, 0);
  return { width: Math.max(900, 4 * X_SPACING + 120), height: Math.max(400, nextY + 80) };
}

function layoutRadial(root: ConceptNode, collapsed: Set<string>): LayoutResult {
  function countLeaves(node: ConceptNode): number {
    if (!node.children.length || collapsed.has(node.id)) return 1;
    return node.children.reduce((s, c) => s + countLeaves(c), 0);
  }
  function visit(node: ConceptNode, depth: number, startAngle: number, endAngle: number) {
    node.depth = depth;
    const radius = depth * R_SPACING;
    const angle = (startAngle + endAngle) / 2;
    node.x = radius * Math.cos(angle);
    node.y = radius * Math.sin(angle);
    if (!node.children.length || collapsed.has(node.id)) return;
    const totalLeaves = countLeaves(node);
    let cur = startAngle;
    for (const c of node.children) {
      const childLeaves = countLeaves(c);
      const span = (endAngle - startAngle) * (childLeaves / totalLeaves);
      visit(c, depth + 1, cur, cur + span);
      cur += span;
    }
  }
  visit(root, 0, 0, Math.PI * 2);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  function bounds(node: ConceptNode) {
    if (typeof node.x === "number" && typeof node.y === "number") {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    }
    for (const c of node.children) bounds(c);
  }
  bounds(root);
  if (!Number.isFinite(minX)) {
    minX = -200; maxX = 200; minY = -200; maxY = 200;
  }
  return {
    width: maxX - minX + 280,
    height: maxY - minY + 280,
  };
}

// Collect all nodes recursively
function collectNodes(node: ConceptNode, out: ConceptNode[] = []): ConceptNode[] {
  out.push(node);
  for (const c of node.children) collectNodes(c, out);
  return out;
}
// Collect all edges (parent → child)
function collectEdges(node: ConceptNode, out: { parent: ConceptNode; child: ConceptNode }[] = []) {
  for (const c of node.children) {
    out.push({ parent: node, child: c });
    collectEdges(c, out);
  }
  return out;
}

// Cubic bezier path between parent and child
function edgePath(parent: ConceptNode, child: ConceptNode, radial: boolean): string {
  const px = parent.x ?? 0;
  const py = parent.y ?? 0;
  const cx = child.x ?? 0;
  const cy = child.y ?? 0;
  if (radial) {
    // Quadratic-ish curve toward center
    const midX = (px + cx) / 2;
    const midY = (py + cy) / 2;
    return `M ${px} ${py} Q ${midX * 0.5} ${midY * 0.5} ${cx} ${cy}`;
  }
  // Horizontal cubic bezier
  const dx = Math.max(40, Math.abs(cx - px) * 0.5);
  return `M ${px} ${py} C ${px + dx} ${py}, ${cx - dx} ${cy}, ${cx} ${cy}`;
}

// Node radius scales with sourceCount (capped)
function nodeRadius(node: ConceptNode): number {
  const base = node.type === "subject" ? 18 : node.type === "topic" ? 13 : 9;
  const boost = Math.min(6, Math.max(0, node.sourceCount - 1)) * 1.6;
  return base + boost;
}

// ============================================================
// Main component
// ============================================================
export function ConceptMap() {
  const mounted = useMounted();
  const saved = useAppStore((s) => s.saved);
  const setView = useAppStore((s) => s.setView);
  const sets = useFlashcardStore((s) => s.sets);

  const { root, stats } = useMemo(
    () => buildTree(saved, sets),
    [saved, sets],
  );

  const hasData = mounted && root.children.length > 0;

  // Interaction state
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 60, y: 240 });
  const [layoutMode, setLayoutMode] = useState<"tree" | "radial">("tree");
  const [hoverNode, setHoverNode] = useState<ConceptNode | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; w: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  // Layout pass (mutates a fresh clone of the tree)
  const layoutData = useMemo(() => {
    // Deep-clone the root so layout mutation doesn't invalidate the source tree
    const clone = JSON.parse(JSON.stringify(root)) as ConceptNode;
    const res = layoutMode === "tree"
      ? layoutTree(clone, collapsed)
      : layoutRadial(clone, collapsed);
    return { root: clone, ...res };
  }, [root, collapsed, layoutMode]);

  // Center the view initially / when layout mode changes
  useEffect(() => {
    if (!svgWrapRef.current) return;
    const w = svgWrapRef.current.clientWidth;
    const h = svgWrapRef.current.clientHeight;
    if (layoutMode === "tree") {
      setPan({ x: 60, y: Math.max(40, h / 2 - 80) });
    } else {
      setPan({ x: w / 2, y: h / 2 });
    }
    setZoom(1);
  }, [layoutMode]);

  // Wheel zoom (native non-passive listener so we can preventDefault)
  useEffect(() => {
    const el = svgWrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setZoom((z) => {
        const delta = -e.deltaY * 0.0015;
        const newZoom = Math.max(0.3, Math.min(3, z * (1 + delta)));
        // Keep mouse point stable
        setPan((p) => ({
          x: mx - (mx - p.x) * (newZoom / z),
          y: my - (my - p.y) * (newZoom / z),
        }));
        return newZoom;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Pan handlers
  const onBackgroundDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...pan };
    },
    [pan],
  );
  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => {
      if (!dragStartRef.current || !panStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({ x: panStartRef.current.x + dx, y: panStartRef.current.y + dy });
    };
    const up = () => {
      setDragging(false);
      dragStartRef.current = null;
      panStartRef.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging]);

  // Zoom controls
  const zoomBy = (factor: number) =>
    setZoom((z) => Math.max(0.3, Math.min(3, z * factor)));
  const resetView = () => {
    if (!svgWrapRef.current) return;
    const w = svgWrapRef.current.clientWidth;
    const h = svgWrapRef.current.clientHeight;
    setZoom(1);
    if (layoutMode === "tree") {
      setPan({ x: 60, y: Math.max(40, h / 2 - 80) });
    } else {
      setPan({ x: w / 2, y: h / 2 });
    }
  };

  // Expand / collapse all
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const next = new Set<string>();
    function visit(node: ConceptNode) {
      if (node.children.length && node.id !== "root") next.add(node.id);
      for (const c of node.children) visit(c);
    }
    visit(root);
    setCollapsed(next);
  };

  // Click node: toggle collapse + select
  const onNodeClick = (node: ConceptNode) => {
    setSelectedId(node.id);
    if (node.children.length > 0 && node.id !== "root") {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
  };

  const onNodeHover = (node: ConceptNode | null, e: React.MouseEvent | null) => {
    setHoverNode(node);
    if (e && node) {
      const rect = svgWrapRef.current?.getBoundingClientRect();
      if (rect) {
        setHoverPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          w: rect.width,
        });
      }
    } else {
      setHoverPos(null);
    }
  };

  // Flatten for render
  const nodes = useMemo(() => collectNodes(layoutData.root), [layoutData]);
  const edges = useMemo(
    () => collectEdges(layoutData.root),
    [layoutData],
  );
  const selectedNode = useMemo(
    () => (selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null),
    [selectedId, nodes],
  );

  // ---------- Empty state ----------
  if (!hasData) {
    return (
      <div className="space-y-6">
        <Header />
        <PremiumEmptyState
          icon={Network}
          title="No concepts to map yet"
          description="Save an exam research report or build a dependency map, or add some flashcards — your knowledge graph will appear here."
          ctaLabel="Research an Exam"
          ctaIcon={Sparkles}
          ctaOnClick={() => setView("exam-researcher")}
          accent="violet"
        />
        <Card className="border-dashed border-border/60">
          <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <EmptyHint
              icon={BookOpen}
              title="Exam Research"
              desc="Generate a syllabus breakdown"
              onClick={() => setView("exam-researcher")}
            />
            <EmptyHint
              icon={GitBranch}
              title="Dependency Map"
              desc="Map prerequisite chains"
              onClick={() => setView("dependency-mapper")}
            />
            <EmptyHint
              icon={Layers}
              title="Flashcards"
              desc="Build a spaced-repetition set"
              onClick={() => setView("flashcards")}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header />

      {/* Stats card */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={BookOpen} label="Subjects" value={stats.subjects} accent="violet" />
        <StatTile icon={Target} label="Topics" value={stats.topics} accent="fuchsia" />
        <StatTile icon={CircleDot} label="Concepts" value={stats.concepts} accent="emerald" />
        <StatTile icon={CheckCircle2} label="Mastered" value={stats.mastered} accent="emerald" />
      </div>

      {/* Controls bar */}
      <Card className="border-border/60">
        <CardContent className="py-3 px-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => zoomBy(0.85)} title="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="outline" size="icon" onClick={() => zoomBy(1.18)} title="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={resetView} title="Reset view">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button variant="outline" size="sm" onClick={expandAll} className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Expand all
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="gap-1.5">
            <ListTree className="h-3.5 w-3.5" />
            Collapse all
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <div className="flex items-center gap-1 rounded-md border border-border/60 p-0.5">
            <Button
              variant={layoutMode === "tree" ? "default" : "ghost"}
              size="sm"
              onClick={() => setLayoutMode("tree")}
              className={cn(
                "h-7 gap-1",
                layoutMode === "tree" &&
                  "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90",
              )}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Tree
            </Button>
            <Button
              variant={layoutMode === "radial" ? "default" : "ghost"}
              size="sm"
              onClick={() => setLayoutMode("radial")}
              className={cn(
                "h-7 gap-1",
                layoutMode === "radial" &&
                  "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90",
              )}
            >
              <Network className="h-3.5 w-3.5" />
              Radial
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            <span className="hidden sm:inline">Scroll to zoom · drag to pan · click to expand</span>
            <span className="sm:hidden">Tap nodes to expand</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Map viewport */}
        <Card className="border-border/60 overflow-hidden">
          <CardContent className="p-0">
            <div
              ref={svgWrapRef}
              className={cn(
                "relative w-full h-[60vh] min-h-[420px] bg-gradient-to-br from-violet-500/[0.03] to-fuchsia-500/[0.03]",
                dragging ? "cursor-grabbing" : "cursor-grab",
              )}
              onMouseDown={onBackgroundDown}
            >
              <svg
                width="100%"
                height="100%"
                className="block select-none touch-none"
              >
                <defs>
                  <linearGradient id="edge-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(139,92,246,0.55)" />
                    <stop offset="50%" stopColor="rgba(217,70,239,0.5)" />
                    <stop offset="100%" stopColor="rgba(16,185,129,0.45)" />
                  </linearGradient>
                  <radialGradient id="root-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(139,92,246,0.6)" />
                    <stop offset="100%" stopColor="rgba(139,92,246,0)" />
                  </radialGradient>
                  <filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
                  </filter>
                </defs>

                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* edges */}
                  {edges.map((e, i) => (
                    <path
                      key={`e-${i}`}
                      d={edgePath(e.parent, e.child, layoutMode === "radial")}
                      stroke="url(#edge-grad)"
                      strokeWidth={1.5}
                      fill="none"
                      className="opacity-80"
                    />
                  ))}
                  {/* nodes */}
                  {nodes.map((node) => (
                    <NodeShape
                      key={node.id}
                      node={node}
                      selected={selectedId === node.id}
                      isRoot={node.id === "root"}
                      onClick={() => onNodeClick(node)}
                      onHover={(e) => onNodeHover(node, e)}
                      onLeave={() => onNodeHover(null, null)}
                    />
                  ))}
                </g>
              </svg>

              {/* Floating hover tooltip */}
              {hoverNode && hoverPos && (
                <div
                  className="pointer-events-none absolute z-20 max-w-[240px] rounded-lg border border-border bg-popover/95 backdrop-blur-md px-3 py-2 text-xs shadow-xl"
                  style={{
                    left: Math.min(hoverPos.x + 14, hoverPos.w - 250),
                    top: hoverPos.y + 14,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("h-2 w-2 rounded-full", TYPE_STYLES[hoverNode.type].fill.replace("fill-", "bg-"))} />
                    <span className="font-semibold truncate">{hoverNode.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className={cn("rounded border px-1.5 py-0.5", TYPE_STYLES[hoverNode.type].label)}>
                      {TYPE_LABEL[hoverNode.type]}
                    </span>
                    <span className={cn("rounded border px-1.5 py-0.5 flex items-center gap-1", MASTERY_STYLES[hoverNode.mastery].label)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", MASTERY_STYLES[hoverNode.mastery].dot)} />
                      {MASTERY_STYLES[hoverNode.mastery].name}
                    </span>
                  </div>
                  <div className="mt-1.5 text-muted-foreground">
                    {hoverNode.sourceCount} source{hoverNode.sourceCount === 1 ? "" : "s"} · {hoverNode.children.length} child{hoverNode.children.length === 1 ? "" : "ren"}
                  </div>
                </div>
              )}

              {/* Legend overlay */}
              <div className="absolute left-3 bottom-3 rounded-lg border border-border/60 bg-background/80 backdrop-blur-md px-3 py-2 text-[10px] space-y-1.5 pointer-events-none">
                <div className="font-semibold text-foreground mb-1">Types</div>
                <LegendRow color="bg-violet-500" label="Subject" />
                <LegendRow color="bg-fuchsia-500" label="Topic" />
                <LegendRow color="bg-emerald-500" label="Concept" />
                <div className="font-semibold text-foreground mt-2 mb-1">Mastery</div>
                <LegendRow color="bg-emerald-500" label="Mastered" />
                <LegendRow color="bg-amber-500" label="Learning" />
                <LegendRow color="bg-rose-500" label="Weak" />
                <LegendRow color="bg-zinc-400" label="Not Started" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detail panel */}
        <Card className="border-border/60 h-fit lg:sticky lg:top-20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-violet-500" />
              Node Details
            </CardTitle>
            <CardDescription className="text-xs">
              Click any node to inspect it here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <DetailPanel
                node={selectedNode}
                onClose={() => setSelectedId(null)}
                onNavigate={setView}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CircleDot className="h-10 w-10 mb-2 text-muted-foreground/40" />
                <p className="text-sm">No node selected</p>
                <p className="text-xs mt-1 max-w-[220px]">
                  Tap any node in the map to see its details, mastery, sources, and related items.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Header
// ============================================================
function Header() {
  return (
    <div className="flex items-start gap-3">
      <div className="relative">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md opacity-50" />
        <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg">
          <Network className="h-5 w-5" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Concept Map</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Interactive visual mind map of your saved topics &amp; concepts — zoom, pan, expand, and inspect.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Empty-state hint tile
// ============================================================
function EmptyHint({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-4 hover:border-violet-500/40 hover:bg-violet-500/5 transition"
    >
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-violet-500/20 flex items-center justify-center">
        <Icon className="h-5 w-5 text-violet-500" />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
    </button>
  );
}

// ============================================================
// Stat tile
// ============================================================
function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent: "violet" | "fuchsia" | "emerald";
}) {
  const styles = {
    violet: { ring: "ring-violet-500/20", text: "text-violet-500", bg: "bg-violet-500/10", grad: "from-violet-500 to-fuchsia-500" },
    fuchsia: { ring: "ring-fuchsia-500/20", text: "text-fuchsia-500", bg: "bg-fuchsia-500/10", grad: "from-fuchsia-500 to-pink-500" },
    emerald: { ring: "ring-emerald-500/20", text: "text-emerald-500", bg: "bg-emerald-500/10", grad: "from-emerald-500 to-teal-500" },
  }[accent];
  return (
    <Card className="border-border/60 overflow-hidden">
      <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center ring-2", styles.bg, styles.ring)}>
          <Icon className={cn("h-5 w-5", styles.text)} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold leading-tight tabular-nums">
            <AnimatedCounter value={value} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Legend row
// ============================================================
function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

// ============================================================
// SVG node shape
// ============================================================
function NodeShape({
  node,
  selected,
  isRoot,
  onClick,
  onHover,
  onLeave,
}: {
  node: ConceptNode;
  selected: boolean;
  isRoot: boolean;
  onClick: () => void;
  onHover: (e: React.MouseEvent) => void;
  onLeave: () => void;
}) {
  const r = nodeRadius(node);
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const typeStyle = isRoot
    ? { fill: "fill-violet-600", stroke: "stroke-violet-400" }
    : TYPE_STYLES[node.type];
  const masteryStyle = MASTERY_STYLES[node.mastery];

  if (isRoot) {
    return (
      <g
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        <circle r={r + 18} fill="url(#root-glow)" />
        <circle
          r={r}
          className={cn(typeStyle.fill, masteryStyle.ring)}
          strokeWidth={4}
          filter="url(#node-shadow)"
        />
        <circle r={r - 6} className="fill-white dark:fill-zinc-900" opacity={0.15} />
        <text
          y={r + 16}
          textAnchor="middle"
          className="fill-foreground text-[11px] font-semibold pointer-events-none"
        >
          {node.label}
        </text>
      </g>
    );
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* selection halo */}
      {selected && (
        <circle
          r={r + 6}
          className="fill-violet-500/10 stroke-violet-500/40"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      )}
      {/* mastery ring */}
      <circle
        r={r + 3}
        className={cn(masteryStyle.ring)}
        strokeWidth={3}
        fill="none"
        opacity={0.9}
      />
      {/* main fill */}
      <circle
        r={r}
        className={cn(typeStyle.fill)}
        strokeWidth={selected ? 2 : 1}
        stroke="rgba(255,255,255,0.25)"
        filter="url(#node-shadow)"
      />
      {/* label */}
      <text
        y={r + 14}
        textAnchor="middle"
        className="fill-foreground text-[10px] font-medium pointer-events-none"
      >
        {node.label.length > 22 ? node.label.slice(0, 21) + "…" : node.label}
      </text>
      {/* collapse indicator */}
      {node.children.length > 0 && (
        <text
          y={3}
          textAnchor="middle"
          className="fill-white pointer-events-none text-[9px] font-bold"
        >
          {node.children.length}
        </text>
      )}
    </g>
  );
}

// ============================================================
// Detail panel
// ============================================================
function DetailPanel({
  node,
  onClose,
  onNavigate,
}: {
  node: ConceptNode;
  onClose: () => void;
  onNavigate: (v: "my-research" | "exam-researcher" | "dependency-mapper" | "flashcards") => void;
}) {
  const typeStyle = TYPE_STYLES[node.type];
  const masteryStyle = MASTERY_STYLES[node.mastery];
  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium", typeStyle.label)}>
              {TYPE_LABEL[node.type]}
            </span>
            <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium flex items-center gap-1", masteryStyle.label)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", masteryStyle.dot)} />
              {masteryStyle.name}
            </span>
          </div>
          <h3 className="text-base font-semibold leading-tight break-words">{node.label}</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1 -mt-1" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniMetric icon={BookOpen} label="Sources" value={node.sourceCount} />
        <MiniMetric icon={CircleDot} label="Children" value={node.children.length} />
      </div>

      {node.prerequisites && node.prerequisites.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <GitBranch className="h-3 w-3" />
            Prerequisites
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.prerequisites.map((p, i) => (
              <span key={i} className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {node.dependents && node.dependents.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <Network className="h-3 w-3" />
            Dependents
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.dependents.map((d, i) => (
              <span key={i} className="rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-1.5 py-0.5 text-[11px] text-fuchsia-700 dark:text-fuchsia-300">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div>
        <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <Save className="h-3 w-3" />
          Related Saved Items
        </div>
        {node.relatedItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">No saved items reference this node.</p>
        ) : (
          <ScrollArea className="max-h-48 -mx-1">
            <div className="space-y-1 px-1">
              {node.relatedItems.map((ref) => (
                <button
                  key={ref.id}
                  onClick={() => onNavigate("my-research")}
                  className="w-full text-left rounded-md border border-border/60 bg-muted/30 hover:bg-violet-500/5 hover:border-violet-500/30 transition px-2 py-1.5 flex items-center gap-2 group"
                >
                  <div className="h-6 w-6 rounded shrink-0 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-violet-500/20 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate group-hover:text-violet-600 dark:group-hover:text-violet-400">{ref.title}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{ref.type}</div>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <Separator />

      <div className="text-[10px] text-muted-foreground">
        Tip: click a node with children to expand or collapse it.
      </div>
    </motion.div>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums leading-tight">{value}</div>
    </div>
  );
}
