import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronDown, Copy, Check, Cpu, Database, Globe,
  AlertTriangle, ShieldAlert, GitBranch, Layers, Zap, Activity,
} from 'lucide-react';
import type { CodebaseGraph, NodeType } from '@/types/graph';

interface AISummaryPanelProps {
  graph: CodebaseGraph;
  isOpen: boolean;
  onClose: () => void;
  onNodeSelect?: (nodeId: string) => void;
}

const TYPE_COLORS: Record<NodeType, string> = {
  file: '#00ffff', class: '#a855f7', function: '#f59e0b',
  module: '#3b82f6', service: '#22c55e', database: '#ef4444', api: '#06b6d4',
};
const TYPE_ICONS: Record<NodeType, React.ComponentType<{ className?: string }>> = {
  file: GitBranch, class: Layers, function: Cpu,
  module: Layers, service: Globe, database: Database, api: Zap,
};

function inferArchitectureStyle(graph: CodebaseGraph): string {
  const typeCount: Record<string, number> = {};
  for (const n of graph.nodes) typeCount[n.type] = (typeCount[n.type] ?? 0) + 1;
  const services = typeCount['service'] ?? 0;
  const apis = typeCount['api'] ?? 0;
  const databases = typeCount['database'] ?? 0;
  const total = graph.nodes.length;
  if (services >= 3 && apis >= 3) return 'Microservices';
  if (databases >= 2 && apis >= 2) return 'REST API + Multi-DB';
  if ((typeCount['class'] ?? 0) / total > 0.4) return 'Object-Oriented (MVC)';
  if ((typeCount['function'] ?? 0) / total > 0.5) return 'Functional / Modular';
  if (services >= 1 && databases >= 1) return 'Monolith + Service Layer';
  return 'Multi-Module Monolith';
}

function getRiskColor(level: string): string {
  return level === 'critical' ? '#ef4444' : level === 'high' ? '#f59e0b' : level === 'medium' ? '#eab308' : '#22c55e';
}

export default function AISummaryPanel({ graph, isOpen, onClose, onNodeSelect }: AISummaryPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleNodeClick = (nodeId: string) => {
    onNodeSelect?.(nodeId);
    onClose();
  };

  const archStyle = useMemo(() => inferArchitectureStyle(graph), [graph]);

  const topRiskNodes = useMemo(
    () =>
      [...graph.nodes]
        .filter(n => n.metadata.riskLevel === 'critical' || n.metadata.riskLevel === 'high')
        .sort((a, b) => {
          const order = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
          return order[a.metadata.riskLevel] - order[b.metadata.riskLevel];
        })
        .slice(0, 5),
    [graph.nodes],
  );

  const orphanNodes = useMemo(
    () => graph.nodes.filter(n => n.metadata.isOrphan).slice(0, 5),
    [graph.nodes],
  );

  const entryPointNodes = useMemo(
    () => graph.nodes.filter(n => n.metadata.isEntryPoint),
    [graph.nodes],
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of graph.nodes) counts[n.type] = (counts[n.type] ?? 0) + 1;
    return counts;
  }, [graph.nodes]);

  const langEntries = useMemo(
    () => Object.entries(graph.stats.languages ?? {}).sort((a, b) => b[1] - a[1]),
    [graph.stats.languages],
  );

  const handleCopy = () => {
    const text = [
      `CodeAtlas AXON — Repository Summary`,
      `Repo: ${graph.repoUrl}`,
      `Analyzed: ${graph.analyzedAt}`,
      `Architecture: ${archStyle}`,
      ``,
      `SUMMARY`,
      graph.summary,
      ``,
      `STATS`,
      `Total files: ${graph.stats.totalFiles}`,
      `Total lines: ${graph.stats.totalLines.toLocaleString()}`,
      `Avg complexity: ${graph.stats.avgComplexity}`,
      `Orphans: ${graph.stats.orphans}`,
      `Hotspots: ${graph.stats.hotspots}`,
      `Test coverage: ${graph.stats.testCoverage}%`,
      ``,
      `TOP RISK NODES`,
      ...topRiskNodes.map(n => `  [${n.metadata.riskLevel.toUpperCase()}] ${n.label} — ${n.metadata.semanticSummary ?? n.metadata.path}`),
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel — right drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[440px] flex flex-col"
            style={{ boxShadow: '-20px 0 60px rgba(0,0,0,0.7)' }}
          >
            <div className="flex flex-col h-full bg-surface-1/95 backdrop-blur-2xl border-l border-border overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
                <div className="w-6 h-6 rounded-md bg-cyan/10 border border-cyan/30 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase">AI SUMMARY</p>
                  <p className="font-mono text-xs font-semibold text-foreground truncate">{graph.repoUrl.replace('https://github.com/', '')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-dim hover:text-foreground transition-all"
                  >
                    {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-2 text-foreground-dim hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                {/* Architecture badge */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ background: 'rgba(0,255,255,0.05)', borderColor: 'rgba(0,255,255,0.2)' }}
                >
                  <GitBranch className="w-4 h-4 text-cyan flex-shrink-0" />
                  <div>
                    <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase">Architecture Style</p>
                    <p className="font-mono text-sm font-bold text-cyan">{archStyle}</p>
                  </div>
                </div>

                {/* Full summary */}
                <div>
                  <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-2">Overview</p>
                  <p className="text-sm text-foreground-muted leading-relaxed">{graph.summary}</p>
                </div>

                {/* Key stats grid */}
                <div>
                  <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-2">Key Metrics</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Files', value: graph.stats.totalFiles },
                      { label: 'Lines', value: graph.stats.totalLines.toLocaleString() },
                      { label: 'Avg CX', value: graph.stats.avgComplexity },
                      { label: 'Hotspots', value: graph.stats.hotspots, color: '#f59e0b' },
                      { label: 'Orphans', value: graph.stats.orphans, color: '#64748b' },
                      { label: 'Coverage', value: `${graph.stats.testCoverage}%`, color: graph.stats.testCoverage < 50 ? '#ef4444' : '#22c55e' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-lg px-3 py-2 bg-surface-2 border border-border">
                        <p className="font-mono text-xs font-bold" style={{ color: color ?? '#e2e8f0' }}>{value}</p>
                        <p className="font-mono text-[9px] text-foreground-dim">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Node type breakdown */}
                <div>
                  <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-2">Node Composition</p>
                  <div className="space-y-1.5">
                    {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                      const color = TYPE_COLORS[type as NodeType] ?? '#64748b';
                      const Icon = TYPE_ICONS[type as NodeType] ?? Cpu;
                      const pct = Math.round((count / graph.nodes.length) * 100);
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
                          <span className="font-mono text-[10px] capitalize w-16 text-foreground-dim">{type}</span>
                          <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span className="font-mono text-[10px] text-foreground-dim w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Language breakdown */}
                {langEntries.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-2">Languages</p>
                    <div className="flex flex-wrap gap-2">
                      {langEntries.map(([lang, count]) => (
                        <span
                          key={lang}
                          className="font-mono text-[10px] px-2 py-1 rounded-lg border border-border bg-surface-2 text-foreground-muted"
                        >
                          {lang} <span className="text-foreground-dim">·{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entry points */}
                {entryPointNodes.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-2">
                      🚀 Entry Points ({entryPointNodes.length})
                    </p>
                    <div className="space-y-1">
                      {entryPointNodes.map(n => (
                        <button
                          key={n.id}
                          onClick={() => handleNodeClick(n.id)}
                          className="group w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border hover:border-border-bright hover:brightness-110 transition-all cursor-pointer text-left"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan flex-shrink-0" />
                          <span className="font-mono text-[10px] text-foreground truncate flex-1">{n.label}</span>
                          <span className="font-mono text-[9px] text-foreground-dim">{n.metadata.loc}L</span>
                          <span className="font-mono text-[10px] text-foreground-dim opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top risk nodes */}
                {topRiskNodes.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-2">
                      <span className="text-alert">⚠</span> High Risk Nodes ({topRiskNodes.length})
                    </p>
                    <div className="space-y-1.5">
                      {topRiskNodes.map(n => (
                        <button
                          key={n.id}
                          onClick={() => handleNodeClick(n.id)}
                          className="group w-full flex items-start gap-2 px-3 py-2 rounded-lg border cursor-pointer text-left hover:brightness-110 transition-all"
                          style={{
                            background: `${getRiskColor(n.metadata.riskLevel)}08`,
                            borderColor: `${getRiskColor(n.metadata.riskLevel)}25`,
                          }}
                        >
                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: getRiskColor(n.metadata.riskLevel) }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-[10px] font-semibold text-foreground truncate">{n.label}</p>
                            <p className="font-mono text-[9px] text-foreground-dim leading-tight mt-0.5 line-clamp-1">
                              {n.metadata.semanticSummary ?? n.metadata.path}
                            </p>
                          </div>
                          <span
                            className="font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: `${getRiskColor(n.metadata.riskLevel)}20`, color: getRiskColor(n.metadata.riskLevel) }}
                          >
                            {n.metadata.riskLevel}
                          </span>
                          <span className="font-mono text-[10px] text-foreground-dim opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dead code / orphans */}
                {orphanNodes.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-2">
                      👻 Ghost City — Dead Code ({graph.stats.orphans})
                    </p>
                    <div className="space-y-1">
                      {orphanNodes.map(n => (
                        <div key={n.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border opacity-70">
                          <div className="w-1.5 h-1.5 rounded-full bg-foreground-dim" />
                          <span className="font-mono text-[10px] text-foreground-muted truncate">{n.label}</span>
                          <span className="font-mono text-[9px] text-foreground-dim ml-auto line-through">{n.metadata.loc}L</span>
                        </div>
                      ))}
                      {graph.stats.orphans > 5 && (
                        <p className="font-mono text-[9px] text-foreground-dim px-1">+{graph.stats.orphans - 5} more unreachable nodes</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Circular deps */}
                {graph.stats.circularDeps > 0 && (
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}
                  >
                    <ShieldAlert className="w-4 h-4 text-alert flex-shrink-0" />
                    <div>
                      <p className="font-mono text-[10px] font-bold text-alert">{graph.stats.circularDeps} Circular Dependencies</p>
                      <p className="font-mono text-[9px] text-foreground-dim">
                        Circular imports create tight coupling and make refactoring risky.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-5 py-3 border-t border-border">
                <p className="font-mono text-[9px] text-foreground-dim">
                  Analyzed · {graph.analyzedAt} · v{graph.version?.slice(0, 7)}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Collapsed banner with expand button ──────────────────────────────────────
interface AISummaryBannerProps {
  summary: string;
  onExpand: () => void;
}
export function AISummaryBanner({ summary, onExpand }: AISummaryBannerProps) {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-surface-1 border-b border-border">
      <span className="font-mono text-[10px] font-bold text-cyan whitespace-nowrap">AI SUMMARY</span>
      <p className="font-mono text-[10px] text-foreground-dim leading-relaxed line-clamp-1 flex-1">
        {summary}
      </p>
      <button
        onClick={onExpand}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-dim hover:text-foreground hover:border-border-bright transition-all flex-shrink-0"
      >
        <ChevronDown className="w-3 h-3" />
        EXPAND
      </button>
    </div>
  );
}
