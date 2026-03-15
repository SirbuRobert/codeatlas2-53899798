import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, TrendingUp, Users, Globe, Zap, Flame, GitBranch, Trash2, CheckCircle } from 'lucide-react';
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

// Grade helpers
function getGrade(value: number, thresholds: [number, string, string][]): { grade: string; color: string } {
  for (const [threshold, grade, color] of thresholds) {
    if (value <= threshold) return { grade, color };
  }
  return { grade: 'F', color: '#ef4444' };
}

function complexityGrade(avg: number) {
  return getGrade(avg, [
    [5, 'A', '#22c55e'],
    [8, 'B', '#84cc16'],
    [12, 'C', '#eab308'],
    [16, 'D', '#f97316'],
  ]);
}

function coverageGrade(pct: number) {
  return getGrade(100 - pct, [
    [20, 'A', '#22c55e'],   // >= 80
    [30, 'B', '#84cc16'],   // >= 70
    [40, 'C', '#eab308'],   // >= 60
    [50, 'D', '#f97316'],   // >= 50
  ]);
}

function churnGrade(avgChurn: number) {
  return getGrade(avgChurn, [
    [20, 'A', '#22c55e'],
    [40, 'B', '#84cc16'],
    [60, 'C', '#eab308'],
    [80, 'D', '#f97316'],
  ]);
}

function docGrade(pct: number) {
  return getGrade(100 - pct, [
    [20, 'A', '#22c55e'],
    [40, 'B', '#84cc16'],
    [60, 'C', '#eab308'],
    [80, 'D', '#f97316'],
  ]);
}

const RISK_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, none: 0.5 };

// Circular gauge SVG
function RiskGauge({ score }: { score: number }) {
  const r = 44;
  const cx = 56;
  const cy = 56;
  const circumference = 2 * Math.PI * r;
  const arcLen = circumference * 0.75;
  const filled = arcLen * (score / 100);

  const color = score < 30 ? '#22c55e' : score < 60 ? '#eab308' : '#ef4444';
  const label = score < 30 ? 'LOW RISK' : score < 60 ? 'MODERATE RISK' : 'HIGH RISK';

  return (
    <div className="flex flex-col items-center">
      <svg width={112} height={112} style={{ overflow: 'visible' }}>
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="hsl(var(--surface-3))"
          strokeWidth={8}
          strokeDasharray={`${arcLen} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
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
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color}
          fontFamily="monospace" fontSize={22} fontWeight="bold">{score}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="hsl(var(--foreground-dim))"
          fontFamily="monospace" fontSize={8}>/100</text>
      </svg>
      <span className="font-mono text-[10px] font-bold mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

function GradeCard({ label, value, grade, color }: { label: string; value: string; grade: string; color: string }) {
  return (
    <div className="bg-surface-3 rounded-lg p-3 flex flex-col gap-1 border border-border">
      <span className="font-mono text-[8px] text-foreground-dim tracking-wider uppercase">{label}</span>
      <div className="flex items-end justify-between">
        <span className="font-mono text-[10px] text-foreground">{value}</span>
        <span className="font-mono text-xl font-black leading-none" style={{ color }}>{grade}</span>
      </div>
    </div>
  );
}

export default function BusinessInsightsPanel({ graph, isOpen, onClose }: BusinessInsightsPanelProps) {
  const insights = useMemo(() => {
    const { nodes, edges, stats } = graph;

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

    // ── Health Scorecard ─────────────────────────────────────────────────────
    const maintainability = complexityGrade(stats.avgComplexity);
    const coverage = coverageGrade(stats.testCoverage);
    const topChurnNodes = [...nodes].sort((a, b) => b.metadata.churn - a.metadata.churn).slice(0, 10);
    const avgTopChurn = topChurnNodes.length > 0
      ? Math.round(topChurnNodes.reduce((s, n) => s + n.metadata.churn, 0) / topChurnNodes.length)
      : 0;
    const churnStability = churnGrade(avgTopChurn);
    const docPct = nodes.length > 0
      ? Math.round(nodes.filter(n => n.metadata.semanticSummary && n.metadata.semanticSummary.length > 0).length / nodes.length * 100)
      : 0;
    const documentation = docGrade(docPct);
    const scorecard = [
      { label: 'Maintainability', value: `avg ${stats.avgComplexity.toFixed(1)} cx`, ...maintainability },
      { label: 'Test Coverage', value: `${stats.testCoverage}%`, ...coverage },
      { label: 'Churn Stability', value: `avg ${avgTopChurn} churn`, ...churnStability },
      { label: 'Documentation', value: `${docPct}% annotated`, ...documentation },
    ];

    // ── Hotspot Files ────────────────────────────────────────────────────────
    const hotspots = nodes
      .map(n => {
        const w = RISK_WEIGHT[n.metadata.riskLevel] ?? 1;
        const score = Math.round(n.metadata.complexity * (n.metadata.churn / 100 + 0.1) * w);
        return { id: n.id, label: n.label, riskLevel: n.metadata.riskLevel, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    const maxHotspotScore = hotspots[0]?.score ?? 1;

    // ── Dependency Health ─────────────────────────────────────────────────────
    const totalEdges = edges.length;
    const fanInMap = new Map<string, number>();
    const fanOutMap = new Map<string, number>();
    for (const e of edges) {
      fanInMap.set(e.target, (fanInMap.get(e.target) ?? 0) + 1);
      fanOutMap.set(e.source, (fanOutMap.get(e.source) ?? 0) + 1);
    }
    const avgFanIn = nodes.length > 0 ? (totalEdges / nodes.length).toFixed(1) : '0';
    const avgFanOut = nodes.length > 0 ? (totalEdges / nodes.length).toFixed(1) : '0';
    const mostCoupledId = [...fanInMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const mostCoupledNode = mostCoupledId ? nodes.find(n => n.id === mostCoupledId[0]) : null;
    const mostCoupledFanIn = mostCoupledId?.[1] ?? 0;

    // ── Dead Code ─────────────────────────────────────────────────────────────
    const deadNodes = nodes.filter(n => n.metadata.isOrphan || (n.metadata.churn === 0 && n.metadata.dependents === 0));
    const deadLoc = deadNodes.reduce((s, n) => s + n.metadata.loc, 0);
    const orphanChips = deadNodes.slice(0, 6).map(n => {
      const parts = n.metadata.path.split('/');
      return parts[parts.length - 1] || n.label;
    });

    // ── Quick Wins ────────────────────────────────────────────────────────────
    type Severity = 'high' | 'medium' | 'low';
    const quickWins: { text: string; severity: Severity }[] = [];

    if (stats.circularDeps > 0)
      quickWins.push({ text: `Break ${stats.circularDeps} circular dependenc${stats.circularDeps === 1 ? 'y' : 'ies'}`, severity: 'high' });

    const untested = nodes.filter(n => n.metadata.coverage < 40 && n.metadata.riskLevel === 'critical');
    if (untested.length > 0) {
      const fname = untested[0].label.length > 18 ? untested[0].label.slice(0, 18) + '…' : untested[0].label;
      quickWins.push({ text: `Add tests to ${fname}`, severity: 'high' });
    }

    const godFile = nodes.filter(n => n.metadata.complexity > 15).sort((a, b) => b.metadata.complexity - a.metadata.complexity)[0];
    if (godFile)
      quickWins.push({ text: `Refactor ${godFile.label.slice(0, 16)} (cx: ${godFile.metadata.complexity})`, severity: 'medium' });

    if (busFactor <= 2 && topAuthor)
      quickWins.push({ text: `Document ${topAuthor[0].slice(0, 12)}'s critical files`, severity: 'medium' });

    if (deadNodes.length > 0)
      quickWins.push({ text: `Remove ${deadNodes.length} dead file${deadNodes.length === 1 ? '' : 's'} (~${deadLoc} LOC)`, severity: 'low' });

    const topWins = quickWins.slice(0, 4);

    return {
      riskScore, criticals, highs, topAuthor, topAuthorPct, uniqueAuthors, busFactor,
      contributorData, techEntries, lifecycleEntries,
      scorecard, hotspots, maxHotspotScore,
      totalEdges, avgFanIn, avgFanOut, mostCoupledNode, mostCoupledFanIn,
      deadNodes, deadLoc, orphanChips,
      quickWins: topWins,
    };
  }, [graph]);

  const RISK_COLORS: Record<string, string> = {
    critical: 'hsl(var(--alert))',
    high: 'hsl(var(--warning))',
    medium: '#eab308',
    low: 'hsl(var(--success))',
    none: 'hsl(var(--foreground-dim))',
  };

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

            {/* ── Health Scorecard ── */}
            <div>
              <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-3">
                HEALTH SCORECARD
              </p>
              <div className="grid grid-cols-2 gap-2">
                {insights.scorecard.map(({ label, value, grade, color }) => (
                  <GradeCard key={label} label={label} value={value} grade={grade} color={color} />
                ))}
              </div>
            </div>

            {/* ── Quick Wins ── */}
            {insights.quickWins.length > 0 && (
              <div>
                <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-3">
                  QUICK WINS
                </p>
                <div className="space-y-1.5">
                  {insights.quickWins.map(({ text, severity }, i) => {
                    const colors = {
                      high: { bg: 'bg-alert/10', border: 'border-alert/25', text: 'text-alert', icon: <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> },
                      medium: { bg: 'bg-warning/10', border: 'border-warning/25', text: 'text-warning', icon: <Zap className="w-3 h-3 flex-shrink-0 mt-0.5" /> },
                      low: { bg: 'bg-success/10', border: 'border-success/25', text: 'text-success', icon: <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> },
                    }[severity];
                    return (
                      <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                        <span className={colors.text}>{colors.icon}</span>
                        <p className={`font-mono text-[10px] leading-relaxed ${colors.text}`}>{text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Hotspot Files ── */}
            {insights.hotspots.length > 0 && (
              <div>
                <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-3">
                  HOTSPOT FILES
                </p>
                <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
                  {insights.hotspots.map(({ id, label, riskLevel, score }, i) => {
                    const barPct = Math.round((score / insights.maxHotspotScore) * 100);
                    const fname = label.length > 20 ? label.slice(0, 20) + '…' : label;
                    return (
                      <div key={id} className={`px-3 py-2 ${i < insights.hotspots.length - 1 ? 'border-b border-border' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Flame className="w-3 h-3 flex-shrink-0" style={{ color: RISK_COLORS[riskLevel] }} />
                            <span className="font-mono text-[10px] text-foreground truncate">{fname}</span>
                          </div>
                          <span
                            className="font-mono text-[8px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ml-2 uppercase"
                            style={{ color: RISK_COLORS[riskLevel], borderColor: RISK_COLORS[riskLevel] + '44', background: RISK_COLORS[riskLevel] + '15' }}
                          >
                            {riskLevel}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: RISK_COLORS[riskLevel] }}
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05, ease: [0.2, 0, 0, 1] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Dependency Health ── */}
            <div>
              <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-3">
                DEPENDENCY HEALTH
              </p>
              <div className="bg-surface-2 rounded-xl p-3 border border-border space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch className="w-3.5 h-3.5 text-foreground-dim" />
                  <span className="font-mono text-[10px] text-foreground-dim">Coupling metrics</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-foreground-dim">Total edges</span>
                  <span className="text-foreground font-bold">{insights.totalEdges}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-foreground-dim">Avg fan-in</span>
                  <span className={`font-bold ${Number(insights.avgFanIn) > 5 ? 'text-warning' : 'text-success'}`}>{insights.avgFanIn}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-foreground-dim">Avg fan-out</span>
                  <span className={`font-bold ${Number(insights.avgFanOut) > 5 ? 'text-warning' : 'text-success'}`}>{insights.avgFanOut}</span>
                </div>
                {insights.mostCoupledNode && (
                  <div className={`flex items-start gap-2 px-2 py-1.5 rounded-lg mt-1 ${insights.mostCoupledFanIn > 10 ? 'bg-warning/10 border border-warning/25' : 'bg-surface-3 border border-border'}`}>
                    {insights.mostCoupledFanIn > 10 && <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0 mt-0.5" />}
                    <p className={`font-mono text-[9px] leading-relaxed ${insights.mostCoupledFanIn > 10 ? 'text-warning' : 'text-foreground-dim'}`}>
                      Most coupled: <span className="font-bold">{insights.mostCoupledNode.label.slice(0, 20)}</span>
                      {' '}({insights.mostCoupledFanIn} dependents)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Dead Code ── */}
            <div>
              <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-3">
                DEAD CODE ESTIMATE
              </p>
              <div className="bg-surface-2 rounded-xl p-3 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 className="w-3.5 h-3.5 text-foreground-dim" />
                  {insights.deadNodes.length > 0 ? (
                    <span className="font-mono text-[10px] text-warning">
                      <span className="font-bold">{insights.deadNodes.length}</span> file{insights.deadNodes.length !== 1 ? 's' : ''} appear unused ·{' '}
                      <span className="font-bold">~{insights.deadLoc}</span> LOC removable
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-success font-bold">No dead code detected ✓</span>
                  )}
                </div>
                {insights.orphanChips.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {insights.orphanChips.map((chip, i) => (
                      <span key={i} className="font-mono text-[8px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20 truncate max-w-[130px]">
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
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
