import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { CodebaseGraph, AxonNode, NodeType } from '@/types/graph';

interface TreemapViewProps {
  graph: CodebaseGraph;
  onNodeSelect: (node: AxonNode) => void;
  searchHighlightIds?: Set<string>;
  ghostMode?: boolean;
}

interface TreemapRect {
  node: AxonNode;
  x: number; y: number; w: number; h: number;
}

type SizeMetric = 'loc' | 'complexity' | 'churn';

const TYPE_COLORS: Record<NodeType, string> = {
  service: '#22c55e', class: '#a855f7', function: '#f59e0b',
  module: '#3b82f6', file: '#00ffff', database: '#ef4444', api: '#06b6d4',
};

const TYPE_ORDER: NodeType[] = ['service', 'module', 'class', 'api', 'database', 'function', 'file'];

function getMetricValue(node: AxonNode, metric: SizeMetric): number {
  return Math.max(1, metric === 'loc' ? node.metadata.loc : metric === 'complexity' ? node.metadata.complexity * 10 : node.metadata.churn * 5);
}

function layoutRow(items: AxonNode[], x: number, y: number, w: number, h: number, metric: SizeMetric): TreemapRect[] {
  const rects: TreemapRect[] = [];
  const rowTotal = items.reduce((s, n) => s + getMetricValue(n, metric), 0);
  let offset = 0;
  for (const item of items) {
    const pct = getMetricValue(item, metric) / rowTotal;
    rects.push({ node: item, x: x + offset, y, w: w * pct, h });
    offset += w * pct;
  }
  return rects;
}

function squarify(items: AxonNode[], x: number, y: number, w: number, h: number, metric: SizeMetric): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ node: items[0], x, y, w, h }];
  const halfArea = items.reduce((s, n) => s + getMetricValue(n, metric), 0) / 2;
  let acc = 0; let splitIdx = 0;
  for (let i = 0; i < items.length; i++) {
    acc += getMetricValue(items[i], metric);
    if (acc >= halfArea) { splitIdx = i + 1; break; }
  }
  const first = items.slice(0, Math.max(1, splitIdx));
  const rest = items.slice(Math.max(1, splitIdx));
  const firstArea = first.reduce((s, n) => s + getMetricValue(n, metric), 0);
  const ratio = firstArea / items.reduce((s, n) => s + getMetricValue(n, metric), 0);
  const rects: TreemapRect[] = [];
  if (w >= h) {
    rects.push(...layoutRow(first, x, y, w * ratio, h, metric));
    rects.push(...squarify(rest, x + w * ratio, y, w * (1 - ratio), h, metric));
  } else {
    rects.push(...layoutRow(first, x, y, w, h * ratio, metric));
    rects.push(...squarify(rest, x, y + h * ratio, w, h * (1 - ratio), metric));
  }
  return rects;
}

const METRIC_LABELS: Record<SizeMetric, string> = { loc: 'Lines of Code', complexity: 'Complexity', churn: 'Churn' };

export default function TreemapView({ graph, onNodeSelect, searchHighlightIds = new Set(), ghostMode = false }: TreemapViewProps) {
  const [sizeMetric, setSizeMetric] = useState<SizeMetric>('loc');
  const W = 1200;
  const HEADER_H = 28;

  // Group nodes by type
  const grouped = useMemo(() => {
    const groups: Partial<Record<NodeType, AxonNode[]>> = {};
    for (const n of graph.nodes) {
      if (!groups[n.type]) groups[n.type] = [];
      groups[n.type]!.push(n);
    }
    return groups;
  }, [graph.nodes]);

  // Total weight per type for vertical space allocation
  const typeWeights = useMemo(() => {
    const weights: Partial<Record<NodeType, number>> = {};
    for (const [type, nodes] of Object.entries(grouped)) {
      weights[type as NodeType] = nodes.reduce((s, n) => s + getMetricValue(n, sizeMetric), 0);
    }
    return weights;
  }, [grouped, sizeMetric]);

  const totalWeight = useMemo(() => Object.values(typeWeights).reduce((s, v) => s + (v ?? 0), 0), [typeWeights]);

  // Compute sections
  interface Section {
    type: NodeType;
    rects: TreemapRect[];
    y: number;
    h: number;
    color: string;
  }

  const sections: Section[] = useMemo(() => {
    const result: Section[] = [];
    const availableH = 700 - HEADER_H;
    let yOffset = HEADER_H;
    for (const type of TYPE_ORDER) {
      const nodes = grouped[type];
      if (!nodes || nodes.length === 0) continue;
      const weight = typeWeights[type] ?? 0;
      const sectionH = Math.max(60, (weight / (totalWeight || 1)) * availableH);
      const sorted = [...nodes].sort((a, b) => getMetricValue(b, sizeMetric) - getMetricValue(a, sizeMetric));
      const rects = squarify(sorted, 0, yOffset + HEADER_H, W, sectionH - HEADER_H, sizeMetric);
      result.push({ type, rects, y: yOffset, h: sectionH, color: TYPE_COLORS[type] });
      yOffset += sectionH;
    }
    return result;
  }, [grouped, typeWeights, totalWeight, sizeMetric]);

  const totalH = useMemo(() => {
    if (sections.length === 0) return 700;
    const last = sections[sections.length - 1];
    return last.y + last.h + 4;
  }, [sections]);

  // Risk color for cell background
  function cellBg(node: AxonNode, typeColor: string): string {
    const isHighlighted = searchHighlightIds.has(node.id);
    const isOrphan = node.metadata.isOrphan;
    if (ghostMode && !isOrphan) return 'rgba(20,20,30,0.4)';
    if (ghostMode && isOrphan) return 'rgba(71,85,105,0.25)';
    if (searchHighlightIds.size > 0 && !isHighlighted) return 'rgba(10,12,20,0.5)';
    const cx = node.metadata.complexity;
    const base = cx >= 15 ? 'rgba(239,68,68,0.18)' : cx >= 10 ? 'rgba(249,115,22,0.14)' : cx >= 6 ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.07)';
    return base;
  }

  return (
    <div className="w-full h-full overflow-auto bg-background">
      {/* Top controls bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2 bg-surface-1/95 backdrop-blur-sm border-b border-border">
        <span className="font-mono text-[10px] text-foreground-dim tracking-widest uppercase">Size by:</span>
        <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1">
          {(['loc', 'complexity', 'churn'] as SizeMetric[]).map(m => (
            <button
              key={m}
              onClick={() => setSizeMetric(m)}
              className={`px-3 py-1 rounded-md font-mono text-[10px] transition-all duration-150 ${
                sizeMetric === m ? 'bg-surface-3 text-foreground border border-border-bright' : 'text-foreground-dim hover:text-foreground'
              }`}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {TYPE_ORDER.filter(t => grouped[t]?.length).map(type => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: TYPE_COLORS[type] }} />
              <span className="font-mono text-[9px] text-foreground-dim capitalize">{type}</span>
              <span className="font-mono text-[9px] text-foreground-dim">({grouped[type]?.length})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Treemap body */}
      <div className="relative mx-auto" style={{ width: W, height: totalH }}>

        {sections.map(section => (
          <div key={section.type}>
            {/* Section header band */}
            <div
              className="absolute flex items-center gap-2 px-3"
              style={{
                left: 0, top: section.y, width: W, height: HEADER_H,
                background: `${section.color}12`,
                borderTop: `2px solid ${section.color}40`,
                borderBottom: `1px solid ${section.color}20`,
              }}
            >
              <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: section.color }} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: section.color }}>
                {section.type}
              </span>
              <span className="font-mono text-[9px] text-foreground-dim">
                {section.rects.length} node{section.rects.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Cells */}
            {section.rects.map(({ node, x, y, w, h }) => {
              const isSmall = w < 80 || h < 45;
              const isTiny = w < 40 || h < 30;
              const isHighlighted = searchHighlightIds.has(node.id);
              const isOrphan = !!node.metadata.isOrphan;
              const isDimmedBySearch = searchHighlightIds.size > 0 && !isHighlighted;
              const isDimmedByGhost = ghostMode && !isOrphan;
              const isDimmed = isDimmedBySearch || isDimmedByGhost;

              // Path breadcrumb
              const pathParts = (node.metadata.path ?? node.label).split('/').filter(Boolean);
              const breadcrumb = pathParts.length > 2
                ? `…/${pathParts.slice(-2).join('/')}`
                : pathParts.join('/');

              return (
                <motion.button
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: isDimmed ? 0.25 : 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: Math.random() * 0.1 }}
                  onClick={() => onNodeSelect(node)}
                  className="absolute group text-left overflow-hidden transition-all duration-150"
                  style={{
                    left: x + 2, top: y + 2,
                    width: Math.max(0, w - 4),
                    height: Math.max(0, h - 4),
                    background: cellBg(node, section.color),
                    border: isHighlighted
                      ? `2px solid ${section.color}`
                      : `1px solid ${section.color}20`,
                    borderRadius: 6,
                    // Orphan: diagonal stripe
                    ...(isOrphan ? {
                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(71,85,105,0.12) 4px, rgba(71,85,105,0.12) 8px)`,
                    } : {}),
                  }}
                  whileHover={{ scale: 1.01, zIndex: 10 }}
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: section.color }} />

                  {/* Ghost label */}
                  {isOrphan && !isTiny && (
                    <div className="absolute top-1 right-1 font-mono text-[8px] text-foreground-dim">👻</div>
                  )}

                  {/* Content */}
                  {!isTiny && (
                    <div className="p-2 h-full flex flex-col justify-between">
                      <div>
                        <p className="font-mono text-[11px] font-semibold text-foreground leading-tight truncate">
                          {node.label}
                        </p>
                        {!isSmall && (
                          <p className="font-mono text-[8px] text-foreground-dim mt-0.5 truncate opacity-60">
                            {breadcrumb}
                          </p>
                        )}
                        {h > 80 && node.metadata.semanticSummary && (
                          <p className="font-mono text-[9px] text-foreground-dim mt-1 line-clamp-2 leading-relaxed">
                            {node.metadata.semanticSummary.slice(0, 80)}…
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[9px] text-foreground-dim">{node.metadata.loc}L</span>
                        {/* Coverage bar */}
                        {!isSmall && (
                          <div className="flex items-center gap-1 flex-1">
                            <div className="w-10 h-1 rounded-full bg-surface-3 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${node.metadata.coverage}%`,
                                  background: node.metadata.coverage < 50 ? '#ef4444' : node.metadata.coverage < 70 ? '#f59e0b' : '#22c55e',
                                }}
                              />
                            </div>
                            <span className="font-mono text-[8px] text-foreground-dim">{node.metadata.coverage}%</span>
                          </div>
                        )}
                        {/* Risk badge */}
                        {(node.metadata.riskLevel === 'critical' || node.metadata.riskLevel === 'high') && (
                          <span
                            className="font-mono text-[8px] font-bold px-1 py-0.5 rounded ml-auto"
                            style={{
                              background: node.metadata.riskLevel === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                              color: node.metadata.riskLevel === 'critical' ? '#ef4444' : '#f59e0b',
                            }}
                          >
                            {node.metadata.riskLevel === 'critical' ? '⚠ CRITICAL' : '▲ HIGH'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hover highlight */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                    style={{ background: `${section.color}15`, border: `2px solid ${section.color}` }}
                  />
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
