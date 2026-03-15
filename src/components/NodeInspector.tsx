import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Code2, User, Clock, GitBranch, AlertTriangle, CheckCircle, Zap, ChevronRight, ChevronDown, ExternalLink, ArrowLeft } from 'lucide-react';
import type { AxonNode, NodeType, CodebaseGraph, FunctionEntry } from '@/types/graph';

interface NodeInspectorProps {
  node: AxonNode | null;
  onClose: () => void;
  onBlastRadius: (nodeId: string) => void;
  graph?: CodebaseGraph;
  onNodeNavigate?: (nodeId: string) => void;
}

const TYPE_LABELS: Record<NodeType, string> = {
  file: 'File',
  class: 'Class',
  function: 'Function',
  module: 'Module',
  service: 'Service',
  database: 'Database',
  api: 'API',
};

const TYPE_COLORS: Record<NodeType, string> = {
  file: '#00ffff',
  class: '#a855f7',
  function: '#f59e0b',
  module: '#3b82f6',
  service: '#22c55e',
  database: '#ef4444',
  api: '#06b6d4',
};

const RISK_CONFIG = {
  critical: { color: '#ef4444', label: 'CRITICAL', bg: 'rgba(239,68,68,0.12)' },
  high: { color: '#f97316', label: 'HIGH', bg: 'rgba(249,115,22,0.12)' },
  medium: { color: '#eab308', label: 'MEDIUM', bg: 'rgba(234,179,8,0.1)' },
  low: { color: '#22c55e', label: 'LOW', bg: 'rgba(34,197,94,0.08)' },
  none: { color: '#64748b', label: 'NONE', bg: 'transparent' },
};

const FLAG_LABELS: Record<string, { text: string; color: string }> = {
  'single-point-of-failure': { text: 'Single Point of Failure', color: '#ef4444' },
  'low-coverage': { text: 'Low Test Coverage', color: '#f59e0b' },
  'high-complexity': { text: 'High Complexity', color: '#f97316' },
  'high-churn': { text: 'High Churn', color: '#eab308' },
  'security-critical': { text: 'Security Critical', color: '#a855f7' },
  'circular-dep': { text: 'Circular Dependency', color: '#ef4444' },
  'orphan': { text: 'Dead Code / Orphan', color: '#6b7280' },
  'no-tests': { text: 'No Tests', color: '#f59e0b' },
  'no-integration-tests': { text: 'No Integration Tests', color: '#f59e0b' },
};

const KIND_CONFIG: Record<FunctionEntry['kind'], { label: string; color: string }> = {
  function: { label: 'fn', color: '#f59e0b' },
  class:    { label: 'cls', color: '#a855f7' },
  export:   { label: 'exp', color: '#06b6d4' },
  const:    { label: 'cst', color: '#64748b' },
  method:   { label: 'mth', color: '#22c55e' },
};

// ── Utility: build a deep-link GitHub URL ─────────────────────────────────────
function buildGitHubUrl(graph: CodebaseGraph, path: string, line?: number): string {
  // graph.repoUrl is e.g. "github.com/owner/repo"
  const base = `https://${graph.repoUrl}/blob/${graph.version}/${path}`;
  return line ? `${base}#L${line}` : base;
}

function MetricBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-mono text-[10px] text-foreground-dim">{label}</span>
        <span className="font-mono text-[10px]" style={{ color }}>{value}{max === 100 ? '%' : ''}</span>
      </div>
      <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.2, 0, 0, 1] }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function NodeRefRow({
  nodeId, graph, onBlastRadius, onNavigate,
}: {
  nodeId: string;
  graph: CodebaseGraph;
  onBlastRadius: (id: string) => void;
  onNavigate?: (id: string) => void;
}) {
  const n = graph.nodes.find(nd => nd.id === nodeId);
  if (!n) return null;
  const color = TYPE_COLORS[n.type] ?? '#64748b';
  return (
    <button
      onClick={() => onNavigate?.(nodeId)}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border
                 group transition-all duration-150 text-left cursor-pointer
                 hover:bg-surface-3"
      style={{ '--node-color': color } as React.CSSProperties}
      title={`Inspect ${n.label}`}
    >
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="font-mono text-[10px] text-foreground-muted flex-1 truncate">{n.label}</span>
      <span
        className="font-mono text-[9px] px-1 py-0.5 rounded border"
        style={{ color, borderColor: `${color}30`, background: `${color}10` }}
      >
        {TYPE_LABELS[n.type]}
      </span>
      {/* Navigate arrow — always visible on hover */}
      <ChevronRight
        className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color }}
      />
      {/* Blast radius — stop propagation so it doesn't trigger navigation */}
      <button
        onClick={e => { e.stopPropagation(); onBlastRadius(nodeId); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        title="Blast radius"
      >
        <Zap className="w-3 h-3 text-alert" />
      </button>
    </button>
  );
}

function CollapsibleSection({ title, count, color, children }: {
  title: string; count: number; color: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  if (count === 0) return null;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 mb-2"
      >
        <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase">{title}</p>
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full border"
          style={{ color, borderColor: `${color}30`, background: `${color}10` }}>
          {count}
        </span>
        <ChevronDown className={`w-3 h-3 text-foreground-dim ml-auto transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Functions & Exports section ────────────────────────────────────────────────
function FunctionsSection({ functions, graph, path }: {
  functions: FunctionEntry[];
  graph: CodebaseGraph;
  path: string;
}) {
  const [open, setOpen] = useState(true);
  if (!functions || functions.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 mb-2"
      >
        <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase">Functions &amp; Exports</p>
        <span
          className="font-mono text-[9px] px-1.5 py-0.5 rounded-full border"
          style={{ color: '#f59e0b', borderColor: '#f59e0b30', background: '#f59e0b10' }}
        >
          {functions.length}
        </span>
        <ChevronDown className={`w-3 h-3 text-foreground-dim ml-auto transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-0.5"
          >
            {functions.map((fn, i) => {
              const cfg = KIND_CONFIG[fn.kind] ?? KIND_CONFIG.function;
              const url = buildGitHubUrl(graph, path, fn.line);
              return (
                <button
                  key={i}
                  onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border
                             hover:border-border hover:bg-surface-3 group transition-colors text-left"
                  title={`Open ${fn.name} at line ${fn.line} on GitHub`}
                >
                  {/* Kind badge */}
                  <span
                    className="font-mono text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0 w-7 text-center"
                    style={{ color: cfg.color, borderColor: `${cfg.color}30`, background: `${cfg.color}10` }}
                  >
                    {cfg.label}
                  </span>

                  {/* Name */}
                  <span className="font-mono text-[11px] text-foreground flex-1 truncate">
                    {fn.name}
                  </span>

                  {/* Line number */}
                  <span className="font-mono text-[9px] text-foreground-dim flex-shrink-0">
                    L{fn.line}
                  </span>

                  {/* External link icon — visible on hover */}
                  <ExternalLink className="w-3 h-3 text-foreground-dim opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NodeInspector({ node, onClose, onBlastRadius, graph, onNodeNavigate }: NodeInspectorProps) {
  // Internal navigation history stack for back-button UX
  const [historyStack, setHistoryStack] = useState<string[]>([]);

  // Reset history when the node changes from an external source (not internal navigation)
  const prevNodeId = useState(node?.id)[0];

  const handleNavigate = useCallback((targetNodeId: string) => {
    if (!node || !onNodeNavigate) return;
    // Push current node onto the back-stack
    setHistoryStack(prev => [...prev, node.id]);
    onNodeNavigate(targetNodeId);
  }, [node, onNodeNavigate]);

  const handleBack = useCallback(() => {
    if (historyStack.length === 0 || !onNodeNavigate) return;
    const prev = historyStack[historyStack.length - 1];
    setHistoryStack(s => s.slice(0, -1));
    onNodeNavigate(prev);
  }, [historyStack, onNodeNavigate]);

  const handleClose = useCallback(() => {
    setHistoryStack([]);
    onClose();
  }, [onClose]);

  if (!node) return null;

  const typeColor = TYPE_COLORS[node.type] ?? '#00ffff';
  const risk = RISK_CONFIG[node.metadata.riskLevel] ?? RISK_CONFIG.none;

  // Compute connectivity if graph is provided
  const importedBy = graph
    ? graph.edges.filter(e => e.target === node.id).map(e => e.source).slice(0, 8)
    : [];
  const exportsTo = graph
    ? graph.edges.filter(e => e.source === node.id).map(e => e.target).slice(0, 8)
    : [];

  const functions = node.metadata.functions ?? [];

  return (
    <AnimatePresence>
      <motion.div
        key={node.id}
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
        className="absolute right-0 top-0 bottom-0 w-[340px] z-20 flex flex-col panel-glass border-l border-border overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              {/* Back button — only visible when there's history */}
              {historyStack.length > 0 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-3 border border-border
                             font-mono text-[9px] text-foreground-dim hover:text-foreground transition-colors mr-1"
                  title="Back to previous node"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back
                </button>
              )}
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: typeColor, boxShadow: `0 0 8px ${typeColor}` }}
              />
              <span
                className="font-mono text-[10px] font-bold tracking-widest uppercase"
                style={{ color: typeColor }}
              >
                {TYPE_LABELS[node.type]}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-3 text-foreground-dim
                         hover:text-foreground hover:bg-surface-3 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h2 className="font-mono text-sm font-bold text-foreground mb-1 break-all">
            {node.label}
          </h2>
          <p className="font-mono text-[10px] text-foreground-dim">{node.metadata.path}</p>

          {/* Risk badge */}
          <div className="flex items-center gap-2 mt-3">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: risk.bg, border: `1px solid ${risk.color}40` }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: risk.color }} />
              <span className="font-mono text-[10px] font-bold" style={{ color: risk.color }}>
                {risk.label} RISK
              </span>
            </div>
            {node.metadata.isEntryPoint && (
              <span className="px-2 py-1 rounded-lg bg-cyan/10 border border-cyan/25 font-mono text-[10px] text-cyan font-bold">
                ENTRY POINT
              </span>
            )}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* AI Summary */}
          {node.metadata.semanticSummary && (
            <div>
              <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-2">
                AI ANALYSIS
              </p>
              <div className="bg-surface-2 rounded-xl p-3 border border-border">
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                  {node.metadata.semanticSummary}
                </p>
              </div>
            </div>
          )}

          {/* Functions & Exports */}
          {graph && functions.length > 0 && (
            <FunctionsSection
              functions={functions}
              graph={graph}
              path={node.metadata.path}
            />
          )}

          {/* Flags */}
          {node.metadata.flags.length > 0 && (
            <div>
              <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-2">
                RISK FLAGS
              </p>
              <div className="space-y-1.5">
                {node.metadata.flags.map(flag => {
                  const f = FLAG_LABELS[flag];
                  if (!f) return null;
                  return (
                    <div
                      key={flag}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: `${f.color}10`, border: `1px solid ${f.color}25` }}
                    >
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: f.color }} />
                      <span className="font-mono text-[10px]" style={{ color: f.color }}>{f.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metrics */}
          <div>
            <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-3">
              QUALITY METRICS
            </p>
            <div className="space-y-3">
              <MetricBar
                label="Cyclomatic Complexity"
                value={node.metadata.complexity}
                max={20}
                color={node.metadata.complexity >= 15 ? '#ef4444' : node.metadata.complexity >= 10 ? '#f59e0b' : '#22c55e'}
              />
              <MetricBar
                label="Git Churn"
                value={node.metadata.churn}
                max={100}
                color={node.metadata.churn >= 70 ? '#f97316' : '#3b82f6'}
              />
              <MetricBar
                label="Test Coverage"
                value={node.metadata.coverage}
                max={100}
                color={node.metadata.coverage >= 80 ? '#22c55e' : node.metadata.coverage >= 50 ? '#eab308' : '#ef4444'}
              />
            </div>
          </div>

          {/* Dependency stats */}
          <div>
            <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-3">
              DEPENDENCY MAP
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Lines of Code', value: node.metadata.loc, icon: Code2, color: '#00ffff' },
                { label: 'Dependents', value: node.metadata.dependents, icon: ChevronRight, color: node.metadata.dependents >= 10 ? '#ef4444' : '#64748b' },
                { label: 'Dependencies', value: node.metadata.dependencies, icon: GitBranch, color: '#3b82f6' },
                { label: 'Last Modified', value: node.metadata.lastModified, icon: Clock, color: '#64748b' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-surface-2 rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3 h-3" style={{ color }} />
                    <span className="font-mono text-[9px] text-foreground-dim">{label}</span>
                  </div>
                  <span className="font-mono text-sm font-bold" style={{ color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Author */}
          <div className="flex items-center gap-3 bg-surface-2 rounded-xl p-3 border border-border">
            <div className="w-8 h-8 rounded-full bg-surface-3 border border-border flex items-center justify-center">
              <User className="w-4 h-4 text-foreground-dim" />
            </div>
            <div>
              <p className="font-mono text-[9px] text-foreground-dim">PRIMARY AUTHOR</p>
              <p className="font-mono text-xs text-foreground font-semibold">{node.metadata.author}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-foreground-dim">
              {node.metadata.coverage >= 80 ? (
                <CheckCircle className="w-3.5 h-3.5 text-success" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              )}
            </div>
          </div>

          {/* ── Connectivity (requires graph prop) ── */}
          {graph && (importedBy.length > 0 || exportsTo.length > 0) && (
            <div className="space-y-3">
              <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase">
                DEPENDENCY GRAPH
              </p>

              <CollapsibleSection title="↑ Imported By" count={importedBy.length} color="#f97316">
                {importedBy.map(id => (
                  <NodeRefRow key={id} nodeId={id} graph={graph} onBlastRadius={onBlastRadius} />
                ))}
              </CollapsibleSection>

              <CollapsibleSection title="↓ Exports To" count={exportsTo.length} color="#3b82f6">
                {exportsTo.map(id => (
                  <NodeRefRow key={id} nodeId={id} graph={graph} onBlastRadius={onBlastRadius} />
                ))}
              </CollapsibleSection>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-border space-y-2">
          <button
            onClick={() => onBlastRadius(node.id)}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-semibold
                       bg-alert/10 border border-alert/30 text-alert hover:bg-alert/15
                       transition-all duration-150 active:scale-[0.98]"
          >
            <Zap className="w-3.5 h-3.5" />
            RUN BLAST RADIUS
            <span className="ml-auto text-[9px] text-alert/60 font-normal">
              {node.metadata.dependents} upstream nodes
            </span>
          </button>
          <button
            onClick={() => {
              if (graph) {
                window.open(buildGitHubUrl(graph, node.metadata.path), '_blank', 'noopener,noreferrer');
              }
            }}
            disabled={!graph}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-semibold
                       bg-cyan/10 border border-cyan/25 text-cyan hover:bg-cyan/15
                       transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            <Code2 className="w-3.5 h-3.5" />
            VIEW SOURCE
            <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
