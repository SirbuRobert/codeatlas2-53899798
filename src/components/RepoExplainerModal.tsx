import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, Rocket, AlertTriangle, Map, LayoutGrid, Orbit,
  Terminal, ShieldAlert, Ghost, Zap, ArrowRight, GitBranch,
  FileCode2, Layers, TrendingUp,
} from 'lucide-react';
import type { CodebaseGraph, AxonNode } from '@/types/graph';

interface RepoExplainerModalProps {
  graph: CodebaseGraph;
  isOpen: boolean;
  onClose: () => void;
  onFocusNode: (id: string) => void;
}

const RISK_COLORS: Record<string, string> = {
  critical: 'text-alert bg-alert/10 border-alert/30',
  high: 'text-warning bg-warning/10 border-warning/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  low: 'text-success bg-success/10 border-success/30',
};

function detectArchitecture(graph: CodebaseGraph): string {
  const { nodes } = graph;
  const hasServices = nodes.some(n => n.type === 'service');
  const hasAPIs = nodes.some(n => n.type === 'api');
  const hasDB = nodes.some(n => n.type === 'database');
  const hasClasses = nodes.filter(n => n.type === 'class').length;
  const totalFiles = nodes.filter(n => n.type === 'file').length;

  if (hasServices && hasAPIs && hasDB) return 'Microservices + API Layer + Database';
  if (hasServices && hasAPIs) return 'Service-Oriented + REST API';
  if (hasAPIs && hasDB) return 'MVC + Database Layer';
  if (hasClasses > totalFiles * 0.4) return 'Object-Oriented Architecture';
  if (hasDB) return 'Monolith + Data Layer';
  return 'Modular Application';
}

function formatLoc(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const EXPLORE_GUIDE = [
  { icon: Map, label: 'Topology', desc: 'See all file connections as a force graph' },
  { icon: LayoutGrid, label: 'Treemap', desc: 'File size = lines of code at a glance' },
  { icon: Orbit, label: 'Solar', desc: '3D orbital view of module dependencies' },
  { icon: Zap, label: 'Blast Radius', desc: 'Click a node → see what breaks if it changes' },
  { icon: ShieldAlert, label: 'Security Scan', desc: 'Highlight auth chains and risky paths' },
  { icon: Ghost, label: 'Dead Code', desc: 'Surface orphan files with no dependents' },
  { icon: Terminal, label: '⌘K Commands', desc: 'Run blast radius, tours, and more' },
];

export default function RepoExplainerModal({
  graph,
  isOpen,
  onClose,
  onFocusNode,
}: RepoExplainerModalProps) {
  const repoSlug = graph.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '');

  const entryNodes = useMemo<AxonNode[]>(() => {
    const ids = new Set(graph.entryPoints);
    return graph.nodes.filter(n => ids.has(n.id) || n.metadata.isEntryPoint).slice(0, 6);
  }, [graph]);

  const riskNodes = useMemo<AxonNode[]>(() => {
    return graph.nodes
      .filter(n => n.metadata.riskLevel === 'critical' || n.metadata.riskLevel === 'high')
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
        return order[a.metadata.riskLevel] - order[b.metadata.riskLevel];
      })
      .slice(0, 5);
  }, [graph]);

  const architecture = useMemo(() => detectArchitecture(graph), [graph]);

  const totalLoc = useMemo(
    () => graph.nodes.reduce((sum, n) => sum + n.metadata.loc, 0),
    [graph],
  );

  const avgComplexity = graph.stats.avgComplexity.toFixed(1);
  const complexityLabel =
    graph.stats.avgComplexity < 5 ? 'low' :
    graph.stats.avgComplexity < 10 ? 'moderate' : 'high';

  const langList = Object.entries(graph.stats.languages ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([lang]) => lang);

  const handleFocus = (id: string) => {
    onFocusNode(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-surface-1 border border-border rounded-2xl shadow-[var(--shadow-panel)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-cyan" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-bold text-foreground">UNDERSTANDING THIS REPO</p>
                <p className="font-mono text-[10px] text-foreground-dim truncate">{repoSlug}</p>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 text-foreground-dim hover:text-foreground transition-colors p-1 rounded-lg hover:bg-surface-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* ── Section 1: What is this? ── */}
              <section>
                <SectionLabel icon={GitBranch} label="WHAT IS THIS?" />

                {/* Architecture badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan/8 border border-cyan/20 mb-3">
                  <Layers className="w-3 h-3 text-cyan" />
                  <span className="font-mono text-[10px] text-cyan tracking-wider">
                    Architecture: {architecture}
                  </span>
                </div>

                {/* Summary */}
                {graph.summary && (
                  <p className="font-mono text-xs text-foreground-muted leading-relaxed mb-4">
                    {graph.summary}
                  </p>
                )}

                {/* Quick stats row */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Files', value: String(graph.stats.totalFiles) },
                    { label: 'Lines', value: formatLoc(totalLoc) },
                    { label: 'Complexity', value: `${avgComplexity} (${complexityLabel})` },
                    { label: 'Languages', value: langList.length ? langList.join(', ') : graph.language },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface-2 border border-border rounded-xl p-3 text-center">
                      <p className="font-mono text-[10px] text-foreground-dim mb-1 uppercase tracking-wider">{label}</p>
                      <p className="font-mono text-xs font-bold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Section 2: Where to start ── */}
              <section>
                <SectionLabel icon={Rocket} label="WHERE TO START" />

                <div className="space-y-3">
                  {entryNodes.length > 0 && (
                    <div>
                      <p className="font-mono text-[10px] text-foreground-dim mb-2 flex items-center gap-1.5">
                        <FileCode2 className="w-3 h-3 text-success" />
                        Entry points — click to focus on graph
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {entryNodes.map(node => (
                          <button
                            key={node.id}
                            onClick={() => handleFocus(node.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/8 border border-success/25 font-mono text-[11px] text-success hover:bg-success/15 transition-all group"
                          >
                            <span>{node.label}</span>
                            <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {riskNodes.length > 0 && (
                    <div>
                      <p className="font-mono text-[10px] text-foreground-dim mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-warning" />
                        Watch out for — high-risk files
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {riskNodes.map(node => (
                          <button
                            key={node.id}
                            onClick={() => handleFocus(node.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-[11px] transition-all group ${RISK_COLORS[node.metadata.riskLevel] ?? ''}`}
                          >
                            <span className="uppercase text-[9px] font-bold tracking-wider opacity-70">
                              {node.metadata.riskLevel}
                            </span>
                            <span>{node.label}</span>
                            <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* ── Section 3: How to explore ── */}
              <section>
                <SectionLabel icon={TrendingUp} label="HOW TO EXPLORE" />

                <div className="grid grid-cols-1 gap-1.5">
                  {EXPLORE_GUIDE.map(({ icon: Icon, label, desc }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-2 border border-border"
                    >
                      <div className="w-6 h-6 rounded-md bg-surface-3 border border-border flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3 h-3 text-foreground-muted" />
                      </div>
                      <span className="font-mono text-[11px] font-bold text-foreground w-28 flex-shrink-0">{label}</span>
                      <span className="font-mono text-[10px] text-foreground-dim">{desc}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer CTA */}
            <div className="px-6 py-4 border-t border-border flex-shrink-0 flex items-center justify-between gap-4">
              <p className="font-mono text-[10px] text-foreground-dim">
                Press <kbd className="font-mono text-[9px] bg-surface-3 px-1.5 py-0.5 rounded border border-border text-foreground-dim">⌘K</kbd> anytime to run commands
              </p>
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan text-primary-foreground font-mono text-xs font-semibold tracking-wider hover:bg-primary-glow transition-all duration-150 active:scale-95"
              >
                Got it, start exploring
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.FC<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3 h-3 text-foreground-dim" />
      <span className="font-mono text-[10px] font-bold text-foreground-dim tracking-[0.15em] uppercase">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
