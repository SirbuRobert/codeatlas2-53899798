import { useState } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { AxonNode, CodebaseGraph } from '@/types/graph';
import { AlertTriangle, CheckCircle, GitBranch, Zap, FileCode, TrendingUp, X } from 'lucide-react';

interface StatsHUDProps {
  graph: CodebaseGraph;
  onStatClick?: (ids: Set<string>, label: string) => void;
  activeStatLabel?: string;
}

export default function StatsHUD({ graph, onStatClick, activeStatLabel }: StatsHUDProps) {
  const { stats, nodes } = graph;
  const [complexityOpen, setComplexityOpen] = useState(false);

  // Node sets for each stat
  const getNodeIds = (label: string): Set<string> => {
    switch (label) {
      case 'FILES':
        return new Set(nodes.map(n => n.id));
      case 'HOTSPOTS': {
        const strict = nodes.filter(n => n.metadata.complexity > 10 && n.metadata.churn > 40);
        if (strict.length > 0) return new Set(strict.map(n => n.id));
        // fallback: orice nod cu complexitate ridicată SAU churn ridicat
        return new Set(nodes.filter(n => n.metadata.complexity > 8 || n.metadata.churn > 50).map(n => n.id));
      }
      case 'ORPHANS': {
        const orphans = nodes.filter(n => n.metadata.isOrphan === true);
        if (orphans.length > 0) return new Set(orphans.map(n => n.id));
        // fallback: noduri fără dependenți
        return new Set(nodes.filter(n => n.metadata.dependents === 0).map(n => n.id));
      }
      case 'CIRCULAR DEPS':
        return new Set(nodes.filter(n => n.metadata.flags?.includes('circular-dep')).map(n => n.id));
      case 'COVERAGE':
        // threshold relaxat la 70 pentru a prinde mai multe fișiere
        return new Set(nodes.filter(n => n.metadata.coverage < 70).map(n => n.id));
      default:
        return new Set();
    }
  };

  const topComplexNodes = [...nodes]
    .sort((a, b) => b.metadata.complexity - a.metadata.complexity)
    .slice(0, 3);

  const maxComplexity = topComplexNodes[0]?.metadata.complexity ?? 1;

  const handleStatClick = (label: string) => {
    if (label === 'AVG COMPLEXITY') {
      setComplexityOpen(o => !o);
      return;
    }
    const ids = getNodeIds(label);
    // CIRCULAR DEPS poate fi 0 în mod legitim — nu blocăm, lăsăm Dashboard să gestioneze
    if (ids.size === 0 && label !== 'CIRCULAR DEPS') return;
    onStatClick?.(ids, label);
  };

  const items = [
    {
      icon: FileCode,
      label: 'FILES',
      value: stats.totalFiles,
      color: 'hsl(var(--cyan))',
      sub: `${(stats.totalLines / 1000).toFixed(1)}k lines`,
      tooltip: 'Click to highlight all files in the graph.',
      clickable: true,
    },
    {
      icon: TrendingUp,
      label: 'AVG COMPLEXITY',
      value: stats.avgComplexity.toFixed(1),
      color: stats.avgComplexity > 10 ? 'hsl(var(--warning))' : 'hsl(var(--success))',
      sub: 'cyclomatic',
      tooltip: 'Click to see how this is calculated and the most complex files.',
      clickable: true,
    },
    {
      icon: AlertTriangle,
      label: 'HOTSPOTS',
      value: stats.hotspots,
      color: 'hsl(var(--destructive))',
      sub: 'critical risk',
      tooltip: 'Click to highlight hotspot files.',
      clickable: true,
    },
    {
      icon: Zap,
      label: 'ORPHANS',
      value: stats.orphans,
      color: 'hsl(var(--muted-foreground))',
      sub: 'dead code',
      tooltip: 'Click to highlight orphaned (dead) files.',
      clickable: true,
    },
    {
      icon: GitBranch,
      label: 'CIRCULAR DEPS',
      value: stats.circularDeps,
      color: stats.circularDeps > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--success))',
      sub: 'detected',
      tooltip: 'Click to highlight files with circular dependencies.',
      clickable: true,
    },
    {
      icon: CheckCircle,
      label: 'COVERAGE',
      value: `${stats.testCoverage}%`,
      color:
        stats.testCoverage >= 80
          ? 'hsl(var(--success))'
          : stats.testCoverage >= 60
          ? 'hsl(var(--warning))'
          : 'hsl(var(--destructive))',
      sub: 'test coverage',
      tooltip: 'Click to highlight files with low test coverage (<60%).',
      clickable: true,
    },
  ];

  return (
    <>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-px bg-surface-1 border-b border-border px-4 overflow-x-auto"
        style={{ height: 48 }}
      >
        {/* Repo info */}
        <div className="flex items-center gap-2 pr-4 border-r border-border mr-3 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="font-mono text-[10px] text-foreground">{graph.repoUrl}</span>
          <span className="font-mono text-[9px] text-foreground-dim px-1.5 py-0.5 bg-surface-3 rounded border border-border">
            {graph.version.slice(0, 7)}
          </span>
          <span className="font-mono text-[9px] text-foreground-dim capitalize">{graph.language}</span>
        </div>

        {/* Stats items */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeStatLabel === item.label || (item.label === 'AVG COMPLEXITY' && complexityOpen);
            return (
              <motion.button
                key={item.label}
                title={item.tooltip}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleStatClick(item.label)}
                className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all duration-150 ${
                  isActive
                    ? 'bg-surface-3 ring-1'
                    : 'hover:bg-surface-2'
                }`}
                style={
                  isActive
                    ? { boxShadow: `0 0 0 1px ${item.color}66, 0 0 8px ${item.color}22` }
                    : {}
                }
              >
                <Icon className="w-3 h-3 transition-transform" style={{ color: item.color }} />
                <div>
                  <span className="font-mono text-[11px] font-bold" style={{ color: item.color }}>
                    {item.value}
                  </span>
                  <span className="font-mono text-[9px] text-foreground-dim ml-1">{item.label}</span>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="stat-active-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                    style={{ background: item.color }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Language breakdown */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {Object.entries(stats.languages).map(([lang, pct]) => (
            <div key={lang} className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background:
                    lang === 'TypeScript'
                      ? 'hsl(var(--primary))'
                      : lang === 'JavaScript'
                      ? 'hsl(var(--warning))'
                      : 'hsl(var(--muted-foreground))',
                }}
              />
              <span className="font-mono text-[9px] text-foreground-dim">
                {lang} {pct}%
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Complexity popover — rendered via portal so it's never clipped */}
      {complexityOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[9990]"
              onClick={() => setComplexityOpen(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[9991] w-72 rounded-xl border border-border shadow-2xl overflow-hidden"
              style={{
                top: 100,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'hsl(var(--surface-1))',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b border-border"
                style={{ background: 'hsl(var(--surface-2))' }}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp
                    className="w-3.5 h-3.5"
                    style={{ color: stats.avgComplexity > 10 ? 'hsl(var(--warning))' : 'hsl(var(--success))' }}
                  />
                  <span className="font-mono text-[11px] font-bold text-foreground">AVG COMPLEXITY</span>
                  <span
                    className="font-mono text-[13px] font-bold"
                    style={{ color: stats.avgComplexity > 10 ? 'hsl(var(--warning))' : 'hsl(var(--success))' }}
                  >
                    {stats.avgComplexity.toFixed(1)}
                  </span>
                </div>
                <button
                  onClick={() => setComplexityOpen(false)}
                  className="text-foreground-dim hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Explanation */}
                <div>
                  <p className="font-mono text-[10px] text-foreground-dim leading-relaxed">
                    Cyclomatic complexity counts decision branches per function:{' '}
                    <span className="text-foreground">if, for, switch, &&, ||</span>. Higher = harder to test and maintain.
                  </p>
                </div>

                {/* Score guide */}
                <div className="space-y-1">
                  <p className="font-mono text-[9px] text-foreground-dim uppercase tracking-widest mb-2">Score guide</p>
                  {[
                    { range: '1–5', label: 'Simple, easy to test', color: 'hsl(var(--success))' },
                    { range: '6–10', label: 'Moderate — acceptable', color: 'hsl(var(--cyan))' },
                    { range: '11+', label: 'High — refactor soon', color: 'hsl(var(--warning))' },
                    { range: '20+', label: 'Critical risk', color: 'hsl(var(--destructive))' },
                  ].map(({ range, label, color }) => (
                    <div key={range} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] w-10 text-right" style={{ color }}>
                        {range}
                      </span>
                      <div className="w-px h-3 bg-border" />
                      <span className="font-mono text-[10px] text-foreground-dim">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Top 3 most complex files */}
                <div>
                  <p className="font-mono text-[9px] text-foreground-dim uppercase tracking-widest mb-2">
                    Top complex files
                  </p>
                  <div className="space-y-1.5">
                    {topComplexNodes.map((node) => {
                      const pct = (node.metadata.complexity / maxComplexity) * 100;
                      const barColor =
                        node.metadata.complexity > 15
                          ? 'hsl(var(--destructive))'
                          : node.metadata.complexity > 10
                          ? 'hsl(var(--warning))'
                          : 'hsl(var(--cyan))';
                      return (
                        <button
                          key={node.id}
                          onClick={() => {
                            onStatClick?.(new Set([node.id]), node.label);
                            setComplexityOpen(false);
                          }}
                          className="w-full text-left group"
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-mono text-[10px] text-foreground group-hover:text-cyan transition-colors truncate max-w-[160px]">
                              {node.label}
                            </span>
                            <span className="font-mono text-[10px] font-bold ml-2" style={{ color: barColor }}>
                              {node.metadata.complexity}
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.4, delay: 0.05 }}
                              className="h-full rounded-full"
                              style={{ background: barColor }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>,
          document.body
        )}
    </>
  );
}
