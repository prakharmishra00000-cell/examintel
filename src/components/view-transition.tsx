"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// Wraps view content with a subtle fade+slide-up animation on view change.
// Keyed by the `viewKey` prop so it re-mounts (and re-animates) on navigation.
export function ViewTransition({ viewKey, children }: { viewKey: string; children: ReactNode }) {
  return (
    <motion.div
      key={viewKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
