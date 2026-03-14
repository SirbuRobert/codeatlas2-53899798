import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, TrendingUp, Users, Globe } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { CodebaseGraph } from '@/types/graph';

interface BusinessInsightsPanelProps {
  graph: CodebaseGraph;
  isOpen: boolean;
  onClose: () => void;
}

// S&P 500 tech stack lookup
const TECH_COMPANIES: Record<string, string[]> = {
  typescript: ['Microsoft', 'Airbnb', 'Notion'],
  javascript: ['Google', 'Meta', 'Netflix'],
  react: ['Meta', 'Airbnb', 'Atlassian'],
  python: ['OpenAI', 'Stripe', 'Dropbox'],
  go: ['Uber', 'Cloudflare', 'Docker'],
  rust: ['Mozilla', 'AWS', 'Figma'],
  java: ['LinkedIn', 'Amazon', 'Twitter'],
  vue: ['GitLab', 'Alibaba', 'Nintendo'],
  angular: ['Google', 'Microsoft', 'Deutsche Bank'],
  node: ['LinkedIn', 'Uber', 'NASA'],
};

const TECH_LIFECYCLE: Record<string, { status: string; color: string }> = {
  typescript: { status: '🟢 Active · Growing', color: '#22c55e' },
  javascript: { status: '🟡 Stable · Mature', color: '#eab308' },
  python: { status: '🟢 Active · Growing', color: '#22c55e' },
  go: { status: '🟢 Active · Growing', color: '#22c55e' },
  rust: { status: '🟢 Emerging · High Momentum', color: '#22c55e' },
  java: { status: '🟡 Stable · Enterprise', color: '#eab308' },
  ruby: { status: '🟠 Declining · Legacy', color: '#f97316' },
  php: { status: '🟠 Stable · Declining', color: '#f97316' },
  unknown: { status: '⚪ Undetected', color: '#64748b' },
};

// Circular gauge SVG
function RiskGauge({ score }: { score: number }) {
  const r = 44;
  const cx = 56;
  const cy = 56;
  const circumference = 2 * Math.PI * r;
  // Use 75% of circle (270deg) for gauge arc
  const arcLen = circumference * 0.75;
  const filled = arcLen * (score / 100);

  const color = score < 30 ? '#22c55e' : score < 60 ? '#eab308' : '#ef4444';
  const label = score < 30 ? 'LOW RISK' : score < 60 ? 'MODERATE RISK' : 'HIGH RISK';

  return (
    <div className="flex flex-col items-center">
      <svg width={112} height={112} style={{ overflow: 'visible' }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="hsl(var(--surface-3))"
          strokeWidth={8}
          strokeDasharray={`${arcLen} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Fill */}
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${filled} ${circumference}` }}
          transition={{ duration: 1, ease: [0.2, 0, 0, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        {/* Score text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color}
          fontFamily="monospace" fontSize={22} fontWeight="bold">{score}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="hsl(var(--foreground-dim))"
          fontFamily="monospace" fontSize={8}>/100</text>
      </svg>
      <span className="font-mono text-[10px] font-bold mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

export default function BusinessInsightsPanel({ graph, isOpen, onClose }: BusinessInsightsPanelProps) {
  const insights = useMemo(() => {
    const { nodes, stats } = graph;

    // ── Risk Score ──────────────────────────────────────────────────────────
    const criticals = nodes.filter(n => n.metadata.riskLevel === 'critical').length;
    const highs = nodes.filter(n => n.metadata.riskLevel === 'high').length;
    const riskScore = Math.round(
      Math.min(100,
        criticals * 12 +
        highs * 4 +
        stats.circularDeps * 6 +
        Math.max(0, 60 - stats.testCoverage) * 0.8
      )
    );

    // ── Bus Factor ──────────────────────────────────────────────────────────
    const authorCounts = new Map<string, number>();
    for (const n of nodes) {
      const a = n.metadata.author;
      authorCounts.set(a, (authorCounts.get(a) ?? 0) + 1);
    }
    const sortedAuthors = [...authorCounts.entries()].sort((a, b) => b[1] - a[1]);
    const topAuthor = sortedAuthors[0];
    const topAuthorPct = topAuthor ? Math.round((topAuthor[1] / nodes.length) * 100) : 0;
    const uniqueAuthors = sortedAuthors.length;
    const busFactor = Math.max(1, Math.floor(uniqueAuthors * 0.3));

    const contributorData = sortedAuthors.slice(0, 5).map(([name, count]) => ({
      name: name.length > 10 ? name.slice(0, 10) + '…' : name,
      nodes: count,
      pct: Math.round((count / nodes.length) * 100),
    }));

    // ── Tech Context ────────────────────────────────────────────────────────
    const detectedLangs = Object.keys(stats.languages).map(l => l.toLowerCase());
    // Also scan node labels for framework keywords
    const labelText = nodes.map(n => n.label.toLowerCase()).join(' ');
    const detectedTech = new Set<string>(detectedLangs);
    ['react', 'vue', 'angular', 'node', 'typescript', 'javascript', 'python', 'go', 'rust', 'java']
      .forEach(t => { if (labelText.includes(t) || detectedLangs.some(l => l.includes(t))) detectedTech.add(t); });

    const techEntries = [...detectedTech]
      .filter(t => TECH_COMPANIES[t])
      .map(t => ({ tech: t, companies: TECH_COMPANIES[t] }));

    const lifecycleEntries = [...detectedTech]
      .filter(t => TECH_LIFECYCLE[t])
      .map(t => ({ tech: t, ...TECH_LIFECYCLE[t] }));

    return { riskScore, criticals, highs, topAuthor, topAuthorPct, uniqueAuthors, busFactor, contributorData, techEntries, lifecycleEntries };
  }, [graph]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="business-panel"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="absolute right-0 top-0 bottom-0 w-[360px] z-30 flex flex-col panel-glass border-l border-border overflow-hidden"
        >
          {/* Header */}
          <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan" />
              <span className="font-mono text-xs font-bold text-foreground">BUSINESS INSIGHTS</span>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-3 text-foreground-dim hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

            {/* ── Risk Score ── */}
            <div>
              <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-3">
                COMPOSITE RISK SCORE
              </p>
              <div className="bg-surface-2 rounded-xl p-4 border border-border flex items-center gap-4">
                <RiskGauge score={insights.riskScore} />
                <div className="space-y-2 flex-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-foreground-dim">Critical nodes</span>
                    <span className="text-alert font-bold">{insights.criticals}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-foreground-dim">High risk</span>
                    <span className="text-warning font-bold">{insights.highs}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-foreground-dim">Circular deps</span>
                    <span className={`font-bold ${graph.stats.circularDeps > 0 ? 'text-alert' : 'text-success'}`}>
                      {graph.stats.circularDeps}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-foreground-dim">Test coverage</span>
                    <span className={`font-bold ${graph.stats.testCoverage >= 60 ? 'text-success' : 'text-alert'}`}>
                      {graph.stats.testCoverage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bus Factor ── */}
            <div>
              <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-3">
                BUS FACTOR ANALYSIS
              </p>

              {insights.topAuthorPct > 40 && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/25 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                  <p className="font-mono text-[10px] text-warning leading-relaxed">
                    Single-contributor risk — <span className="font-bold">{insights.topAuthor?.[0]}</span> owns{' '}
                    {insights.topAuthorPct}% of this codebase.
                    If they left, the team would face a critical knowledge gap.
                  </p>
                </div>
              )}

              <div className="bg-surface-2 rounded-xl p-3 border border-border mb-3">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-3.5 h-3.5 text-foreground-dim" />
                  <span className="font-mono text-[10px] text-foreground-dim">
                    {insights.uniqueAuthors} contributors · Bus factor ≈{' '}
                    <span className={`font-bold ${insights.busFactor <= 2 ? 'text-alert' : 'text-success'}`}>
                      {insights.busFactor}
                    </span>
                  </span>
                </div>
                <p className="font-mono text-[9px] text-foreground-dim">
                  {insights.busFactor <= 2
                    ? '⚠ Only ' + insights.busFactor + ' person(s) would need to leave to jeopardise this project.'
                    : '✓ Knowledge is reasonably distributed across the team.'}
                </p>
              </div>

              {insights.contributorData.length > 0 && (
                <div className="bg-surface-2 rounded-xl p-3 border border-border">
                  <p className="font-mono text-[9px] text-foreground-dim mb-2">TOP CONTRIBUTORS BY NODE OWNERSHIP</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={insights.contributorData} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
                      <XAxis dataKey="name" tick={{ fontFamily: 'monospace', fontSize: 8, fill: 'hsl(var(--foreground-dim))' }} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--surface-2))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontFamily: 'monospace', fontSize: 10 }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(v: number) => [`${v} nodes`, 'Owned']}
                      />
                      <Bar dataKey="nodes" fill="hsl(var(--cyan))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* ── Tech Market Context ── */}
            {insights.techEntries.length > 0 && (
              <div>
                <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-3">
                  MARKET CONTEXT
                </p>
                <div className="space-y-2">
                  {insights.techEntries.map(({ tech, companies }) => (
                    <div key={tech} className="bg-surface-2 rounded-xl p-3 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-3 h-3 text-foreground-dim" />
                        <span className="font-mono text-[10px] font-bold text-foreground capitalize">{tech}</span>
                        <span className="font-mono text-[9px] text-foreground-dim">also used by</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {companies.map(c => (
                          <span key={c} className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-cyan/10 text-cyan border border-cyan/20">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tech Lifecycle ── */}
            {insights.lifecycleEntries.length > 0 && (
              <div>
                <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-3">
                  TECH LIFECYCLE
                </p>
                <div className="space-y-1.5">
                  {insights.lifecycleEntries.map(({ tech, status, color }) => (
                    <div key={tech} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2 border border-border">
                      <span className="font-mono text-[10px] font-semibold text-foreground capitalize">{tech}</span>
                      <span className="font-mono text-[10px]" style={{ color }}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
