import { motion, AnimatePresence } from 'framer-motion';
import { X, Code2, User, Clock, GitBranch, AlertTriangle, CheckCircle, Zap, ChevronRight } from 'lucide-react';
import type { AxonNode, NodeType } from '@/types/graph';

interface NodeInspectorProps {
  node: AxonNode | null;
  onClose: () => void;
  onBlastRadius: (nodeId: string) => void;
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

export default function NodeInspector({ node, onClose, onBlastRadius }: NodeInspectorProps) {
  if (!node) return null;

  const typeColor = TYPE_COLORS[node.type] ?? '#00ffff';
  const risk = RISK_CONFIG[node.metadata.riskLevel] ?? RISK_CONFIG.none;

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
              onClick={onClose}
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
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-semibold
                       bg-cyan/10 border border-cyan/25 text-cyan hover:bg-cyan/15
                       transition-all duration-150 active:scale-[0.98]"
          >
            <Code2 className="w-3.5 h-3.5" />
            VIEW SOURCE
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
