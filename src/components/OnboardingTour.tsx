import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import type { AxonNode, CodebaseGraph } from '@/types/graph';

interface TourStep {
  nodeId: string;
  title: string;
  description: string;
  emoji: string;
}

interface OnboardingTourProps {
  graph: CodebaseGraph;
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
}

// ─── Security keyword list (mirrors securityAnalysis.ts) ───────────────────
const SECURITY_KEYWORDS = [
  'auth', 'jwt', 'token', 'session', 'permission', 'oauth', 'crypto',
  'password', 'secret', 'middleware', 'guard', 'policy', 'rbac', 'acl',
  'login', 'logout', 'signup', 'verify', 'validate', 'sanitize', 'encrypt',
  'decrypt', 'hash', 'salt', 'csrf', 'cors', 'helmet',
];

function isSecurityNode(node: AxonNode): boolean {
  const l = node.label.toLowerCase();
  const p = (node.metadata.path ?? '').toLowerCase();
  return (
    SECURITY_KEYWORDS.some((kw) => l.includes(kw) || p.includes(kw)) ||
    node.metadata.flags.includes('security-critical')
  );
}

// ─── Description builder ────────────────────────────────────────────────────
function buildDescription(
  node: AxonNode,
  role: 'entry' | 'security' | 'hub' | 'complex' | 'risky' | 'database',
  graph: CodebaseGraph,
): string {
  const { metadata } = node;
  const parts: string[] = [];

  // Lead with semantic summary if available
  if (metadata.semanticSummary) {
    parts.push(metadata.semanticSummary);
  }

  // Role-specific insight
  switch (role) {
    case 'entry':
      parts.push(
        `\`${node.label}\` is the application entry point — every request starts here. ` +
        `It carries ${metadata.dependencies} direct dependencies and has been modified ${metadata.churn} times recently.`,
      );
      break;
    case 'security':
      parts.push(
        `\`${node.label}\` is a security chokepoint — ${metadata.dependents} module${metadata.dependents !== 1 ? 's' : ''} depend on it. ` +
        `A bug here could compromise the entire auth layer.`,
      );
      if (metadata.coverage < 70) {
        parts.push(`⚠️ Only ${metadata.coverage}% test coverage — security regressions may go undetected.`);
      }
      break;
    case 'hub':
      parts.push(
        `\`${node.label}\` is the most-imported module in the codebase — ${metadata.dependents} node${metadata.dependents !== 1 ? 's' : ''} depend on it. ` +
        `Any breaking change here has the widest blast radius.`,
      );
      break;
    case 'complex':
      parts.push(
        `\`${node.label}\` has the highest cyclomatic complexity in the repo (score: ${metadata.complexity}). ` +
        `High complexity means more code paths and more chances for logic bugs.`,
      );
      if (metadata.coverage < 60) {
        parts.push(`It has only ${metadata.coverage}% test coverage, making regressions hard to catch.`);
      }
      break;
    case 'risky':
      parts.push(
        `\`${node.label}\` is rated **${metadata.riskLevel}** risk — ${metadata.coverage}% test coverage ` +
        `with a churn score of ${metadata.churn}. High churn + low coverage = highest regression probability.`,
      );
      if (metadata.flags.length > 0) {
        parts.push(`Active flags: ${metadata.flags.map((f) => `\`${f}\``).join(', ')}.`);
      }
      break;
    case 'database':
      {
        const queryEdges = graph.edges.filter(
          (e) => e.target === node.id && e.relation === 'queries',
        ).length;
        parts.push(
          `\`${node.label}\` is the data layer — ${queryEdges > 0 ? `queried by ${queryEdges} node${queryEdges !== 1 ? 's' : ''}` : `${metadata.dependents} dependent${metadata.dependents !== 1 ? 's' : ''}`}. ` +
          `It represents the persistence boundary of the application.`,
        );
      }
      break;
  }

  // Append key metric callouts not yet mentioned
  const extras: string[] = [];
  if (role !== 'complex' && metadata.complexity >= 12) {
    extras.push(`complexity ${metadata.complexity}`);
  }
  if (role !== 'risky' && metadata.riskLevel === 'critical') {
    extras.push(`critical risk`);
  }
  if (extras.length > 0) {
    parts.push(`Metrics: ${extras.join(', ')}.`);
  }

  return parts.join(' ');
}

// ─── Core tour builder ───────────────────────────────────────────────────────
export function buildTourFromGraph(graph: CodebaseGraph): TourStep[] {
  const used = new Set<string>();
  const steps: TourStep[] = [];

  function pick(node: AxonNode | undefined, role: 'entry' | 'security' | 'hub' | 'complex' | 'risky' | 'database') {
    if (!node || used.has(node.id)) return;
    used.add(node.id);

    const ROLE_META: Record<typeof role, { emoji: string; title: string }> = {
      entry:    { emoji: '🚀', title: 'Entry Point' },
      security: { emoji: '🔐', title: 'Auth Chokepoint' },
      hub:      { emoji: '🔗', title: 'Most-Imported Hub' },
      complex:  { emoji: '⚠️', title: 'Complexity Hotspot' },
      risky:    { emoji: '🔥', title: 'Highest Risk' },
      database: { emoji: '🗄️', title: 'Data Layer' },
    };

    const { emoji, title } = ROLE_META[role];
    const stepNum = steps.length + 1;

    steps.push({
      nodeId: node.id,
      emoji,
      title: `${stepNum}. ${title}`,
      description: buildDescription(node, role, graph),
    });
  }

  const nodes = graph.nodes;

  // 1. Entry point
  const entryNode =
    nodes.find((n) => n.metadata.isEntryPoint) ??
    [...nodes]
      .filter((n) => n.type === 'service' || n.type === 'file')
      .sort((a, b) => (b.metadata.churn + b.metadata.dependencies) - (a.metadata.churn + a.metadata.dependencies))[0];
  pick(entryNode, 'entry');

  // 2. Security / auth chokepoint
  const securityNode = [...nodes]
    .filter(isSecurityNode)
    .sort((a, b) => b.metadata.dependents - a.metadata.dependents)[0];
  pick(securityNode, 'security');

  // 3. Most-imported hub (skip if same as entry/security)
  const hubNode = [...nodes]
    .filter((n) => !used.has(n.id))
    .sort((a, b) => b.metadata.dependents - a.metadata.dependents)[0];
  pick(hubNode, 'hub');

  // 4. Highest complexity
  const complexNode = [...nodes]
    .filter((n) => !used.has(n.id))
    .sort((a, b) => b.metadata.complexity - a.metadata.complexity)[0];
  pick(complexNode, 'complex');

  // 5. Highest risk: critical + lowest coverage, then high churn
  const riskyNode = [...nodes]
    .filter((n) => !used.has(n.id))
    .sort((a, b) => {
      const riskOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      const riskDiff = riskOrder[a.metadata.riskLevel] - riskOrder[b.metadata.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      return a.metadata.coverage - b.metadata.coverage; // lower coverage first
    })[0];
  pick(riskyNode, 'risky');

  // 6. Database / data layer
  const dbNode =
    nodes.find((n) => n.type === 'database' && !used.has(n.id)) ??
    [...nodes]
      .filter((n) => !used.has(n.id) && graph.edges.some((e) => e.target === n.id && e.relation === 'queries'))
      .sort((a, b) => b.metadata.dependents - a.metadata.dependents)[0];
  pick(dbNode, 'database');

  // Re-number titles after dedup
  steps.forEach((s, i) => {
    s.title = s.title.replace(/^\d+\./, `${i + 1}.`);
  });

  return steps;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function OnboardingTour({ graph, onClose, onFocusNode }: OnboardingTourProps) {
  const [step, setStep] = useState(0);

  const tourSteps = useMemo(() => buildTourFromGraph(graph), [graph]);

  // Guard: if somehow zero steps, close immediately
  if (tourSteps.length === 0) {
    onClose();
    return null;
  }

  const current = tourSteps[Math.min(step, tourSteps.length - 1)];
  const node = graph.nodes.find((n) => n.id === current.nodeId);

  // Focus node on step change
  const handleStep = (next: number) => {
    setStep(next);
    onFocusNode(tourSteps[next].nodeId);
  };

  const progress = ((step + 1) / tourSteps.length) * 100;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[500px] z-30"
    >
      <div
        className="panel-glass rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 0 0 1px rgba(34,197,94,0.2), 0 20px 60px rgba(0,0,0,0.5)' }}
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-surface-3">
          <motion.div
            className="h-full bg-gradient-to-r from-success to-cyan"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{current.emoji}</span>
              <div>
                <p className="font-mono text-[9px] text-success tracking-widest uppercase mb-0.5">
                  GUIDED TOUR — STEP {step + 1}/{tourSteps.length}
                </p>
                <h3 className="font-mono text-sm font-bold text-foreground">{current.title}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-3 text-foreground-dim hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-[12px] text-foreground-muted leading-relaxed mb-4 font-ui">
            {current.description}
          </p>

          {/* Node chip */}
          {node && (
            <div className="flex items-center gap-2 mb-4 p-2.5 bg-surface-2 rounded-xl border border-border">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan" />
              <span className="font-mono text-[10px] text-foreground">{node.label}</span>
              <span className="font-mono text-[9px] text-foreground-dim ml-auto">{node.metadata.loc} LOC</span>
              <span
                className="font-mono text-[9px] font-bold capitalize"
                style={{ color: node.metadata.riskLevel === 'critical' ? '#ef4444' : '#22c55e' }}
              >
                {node.metadata.riskLevel}
              </span>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 border border-border
                         font-mono text-[10px] text-foreground-muted disabled:opacity-30
                         hover:bg-surface-3 hover:text-foreground transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              PREV
            </button>

            {/* Step dots */}
            <div className="flex items-center gap-1.5 flex-1 justify-center">
              {tourSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === step ? 'w-6 bg-success' : 'w-1.5 bg-surface-3 hover:bg-surface-3'
                  }`}
                />
              ))}
            </div>

            {step < tourSteps.length - 1 ? (
              <button
                onClick={() => handleStep(step + 1)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-success/10 border border-success/30
                           font-mono text-[10px] text-success hover:bg-success/15 transition-all"
              >
                NEXT
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan/10 border border-cyan/30
                           font-mono text-[10px] text-cyan hover:bg-cyan/15 transition-all"
              >
                DONE ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
