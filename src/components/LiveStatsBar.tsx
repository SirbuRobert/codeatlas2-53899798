import { motion } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';

export interface SessionStats {
  reposAnalyzed: number;
  nodesMapped: number;
  riskFlags: number;
}

interface LiveStatsBarProps {
  stats: SessionStats;
}

function StatBlock({
  value,
  label,
  delay,
}: {
  value: number;
  label: string;
  delay: number;
}) {
  const displayed = useCountUp(value, 2000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="flex flex-col items-center gap-1 px-10"
    >
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-4xl font-bold text-cyan tabular-nums">
          {displayed.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        <span className="font-mono text-[10px] text-foreground-dim tracking-[0.18em] uppercase">
          {label}
        </span>
      </div>
    </motion.div>
  );
}

export default function LiveStatsBar({ stats }: LiveStatsBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 1.0 }}
      className="relative z-10 w-full flex justify-center py-6"
    >
      {/* Subtle ambient glow behind the bar */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 80% at 50% 50%, hsl(var(--cyan)), transparent)',
        }}
      />

      <div className="relative flex items-center bg-surface-1 border border-border rounded-2xl shadow-[var(--shadow-panel)] overflow-hidden">
        {/* Left accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan/40 to-transparent" />

        <StatBlock value={stats.reposAnalyzed} label="Repos Analyzed" delay={1.1} />

        {/* Divider */}
        <div className="w-px self-stretch my-4 bg-border" />

        <StatBlock value={stats.nodesMapped} label="Nodes Mapped" delay={1.2} />

        {/* Divider */}
        <div className="w-px self-stretch my-4 bg-border" />

        <StatBlock value={stats.riskFlags} label="Risk Flags Raised" delay={1.3} />

        {/* Right accent line */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan/40 to-transparent" />
      </div>
    </motion.div>
  );
}
