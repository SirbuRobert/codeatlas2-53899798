import { motion } from 'framer-motion';
import type { CodebaseGraph } from '@/types/graph';
import { AlertTriangle, CheckCircle, GitBranch, Zap, FileCode, TrendingUp } from 'lucide-react';

interface StatsHUDProps {
  graph: CodebaseGraph;
}

export default function StatsHUD({ graph }: StatsHUDProps) {
  const { stats } = graph;

  const items = [
    {
      icon: FileCode,
      label: 'FILES',
      value: stats.totalFiles,
      color: '#00ffff',
      sub: `${(stats.totalLines / 1000).toFixed(1)}k lines`,
    },
    {
      icon: TrendingUp,
      label: 'AVG COMPLEXITY',
      value: stats.avgComplexity.toFixed(1),
      color: stats.avgComplexity > 10 ? '#f59e0b' : '#22c55e',
      sub: 'cyclomatic',
    },
    {
      icon: AlertTriangle,
      label: 'HOTSPOTS',
      value: stats.hotspots,
      color: '#ef4444',
      sub: 'critical risk',
    },
    {
      icon: Zap,
      label: 'ORPHANS',
      value: stats.orphans,
      color: '#6b7280',
      sub: 'dead code',
    },
    {
      icon: GitBranch,
      label: 'CIRCULAR DEPS',
      value: stats.circularDeps,
      color: stats.circularDeps > 0 ? '#ef4444' : '#22c55e',
      sub: 'detected',
    },
    {
      icon: CheckCircle,
      label: 'COVERAGE',
      value: `${stats.testCoverage}%`,
      color: stats.testCoverage >= 80 ? '#22c55e' : stats.testCoverage >= 60 ? '#eab308' : '#ef4444',
      sub: 'test coverage',
    },
  ];

  return (
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
      <div className="flex items-center gap-5 flex-shrink-0">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-1.5">
              <Icon className="w-3 h-3" style={{ color: item.color }} />
              <div>
                <span className="font-mono text-[11px] font-bold" style={{ color: item.color }}>
                  {item.value}
                </span>
                <span className="font-mono text-[9px] text-foreground-dim ml-1">{item.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Language breakdown */}
      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        {Object.entries(stats.languages).map(([lang, pct]) => (
          <div key={lang} className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: lang === 'TypeScript' ? '#3b82f6' : lang === 'JavaScript' ? '#f59e0b' : '#6b7280' }}
            />
            <span className="font-mono text-[9px] text-foreground-dim">{lang} {pct}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
