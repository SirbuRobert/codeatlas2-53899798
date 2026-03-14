import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { CodebaseGraph, AxonNode } from '@/types/graph';

interface TreemapViewProps {
  graph: CodebaseGraph;
  onNodeSelect: (node: AxonNode) => void;
}

interface TreemapRect {
  node: AxonNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Simple squarified treemap algorithm
function buildTreemap(nodes: AxonNode[], width: number, height: number): TreemapRect[] {
  const total = nodes.reduce((s, n) => s + n.metadata.loc, 0);
  const sorted = [...nodes].sort((a, b) => b.metadata.loc - a.metadata.loc);
  const rects: TreemapRect[] = [];

  function layoutRow(items: AxonNode[], x: number, y: number, w: number, h: number) {
    const rowTotal = items.reduce((s, n) => s + n.metadata.loc, 0);
    let offset = 0;
    for (const item of items) {
      const pct = item.metadata.loc / rowTotal;
      rects.push({ node: item, x: x + offset, y, w: w * pct, h });
      offset += w * pct;
    }
  }

  function squarify(items: AxonNode[], x: number, y: number, w: number, h: number) {
    if (items.length === 0) return;
    if (items.length === 1) {
      rects.push({ node: items[0], x, y, w, h });
      return;
    }
    // Split roughly in half by area
    const halfArea = items.reduce((s, n) => s + n.metadata.loc, 0) / 2;
    let acc = 0;
    let splitIdx = 0;
    for (let i = 0; i < items.length; i++) {
      acc += items[i].metadata.loc;
      if (acc >= halfArea) { splitIdx = i + 1; break; }
    }
    const first = items.slice(0, Math.max(1, splitIdx));
    const rest = items.slice(Math.max(1, splitIdx));
    const firstArea = first.reduce((s, n) => s + n.metadata.loc, 0);
    const totalArea = items.reduce((s, n) => s + n.metadata.loc, 0);
    const ratio = firstArea / totalArea;

    if (w >= h) {
      layoutRow(first, x, y, w * ratio, h);
      squarify(rest, x + w * ratio, y, w * (1 - ratio), h);
    } else {
      layoutRow(first, x, y, w, h * ratio);
      squarify(rest, x, y + h * ratio, w, h * (1 - ratio));
    }
  }

  if (total > 0) squarify(sorted, 0, 0, width, height);
  return rects;
}

const COMPLEXITY_COLOR = (c: number) => {
  if (c >= 15) return 'rgba(239,68,68,0.7)';
  if (c >= 10) return 'rgba(249,115,22,0.5)';
  if (c >= 6) return 'rgba(234,179,8,0.4)';
  return 'rgba(34,197,94,0.3)';
};

const TYPE_ACCENT: Record<string, string> = {
  service: '#22c55e',
  class: '#a855f7',
  function: '#f59e0b',
  module: '#3b82f6',
  file: '#00ffff',
  database: '#ef4444',
  api: '#06b6d4',
};

export default function TreemapView({ graph, onNodeSelect }: TreemapViewProps) {
  const W = 1200;
  const H = 700;

  const rects = useMemo(() => buildTreemap(graph.nodes, W, H), [graph.nodes]);

  return (
    <div className="w-full h-full overflow-auto bg-background flex items-center justify-center">
      <div className="relative" style={{ width: W, height: H }}>
        {rects.map(({ node, x, y, w, h }) => {
          const complexityColor = COMPLEXITY_COLOR(node.metadata.complexity);
          const typeAccent = TYPE_ACCENT[node.type] ?? '#00ffff';
          const isSmall = w < 80 || h < 50;

          return (
            <motion.button
              key={node.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: Math.random() * 0.2 }}
              onClick={() => onNodeSelect(node)}
              className="absolute group transition-all duration-150 text-left"
              style={{
                left: x + 2,
                top: y + 2,
                width: Math.max(0, w - 4),
                height: Math.max(0, h - 4),
                background: complexityColor,
                border: `1px solid ${typeAccent}30`,
                borderRadius: 8,
                overflow: 'hidden',
              }}
              whileHover={{ scale: 1.01, zIndex: 10 }}
            >
              {/* Type accent top bar */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: typeAccent }}
              />

              {/* Content (only if large enough) */}
              {!isSmall && (
                <div className="p-2.5 h-full flex flex-col justify-between">
                  <div>
                    <p className="font-mono text-[11px] font-semibold text-foreground leading-tight truncate">
                      {node.label}
                    </p>
                    {h > 80 && (
                      <p className="font-mono text-[9px] text-foreground-dim mt-0.5 line-clamp-2 leading-relaxed">
                        {node.metadata.semanticSummary?.slice(0, 80)}…
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-foreground-dim">{node.metadata.loc}L</span>
                    <span
                      className="font-mono text-[9px] font-bold"
                      style={{ color: typeAccent }}
                    >
                      {node.type.toUpperCase()}
                    </span>
                    {node.metadata.riskLevel === 'critical' && (
                      <span className="font-mono text-[8px] text-alert font-bold ml-auto">⚠</span>
                    )}
                  </div>
                </div>
              )}

              {/* Hover highlight */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                style={{ background: `${typeAccent}20`, border: `2px solid ${typeAccent}` }}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
