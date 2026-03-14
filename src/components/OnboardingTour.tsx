import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

export default function OnboardingTour({ graph, onClose, onFocusNode }: OnboardingTourProps) {
  const [step, setStep] = useState(0);

  const tourSteps: TourStep[] = [
    {
      nodeId: 'server',
      title: '1. Entry Point',
      emoji: '🚀',
      description: `Start here. \`server.ts\` bootstraps the entire application — it registers all middleware, mounts route handlers, and starts the HTTP listener. This is where every request begins its life.`,
    },
    {
      nodeId: 'app',
      title: '2. App Configuration',
      emoji: '⚙️',
      description: '`app.ts` configures Express: CORS policy, JSON body parsing, global rate limiting, and error handling. Think of it as the settings panel for the entire server.',
    },
    {
      nodeId: 'auth-middleware',
      title: '3. The Auth Gate 🔑',
      emoji: '🔐',
      description: '`middleware/auth.ts` is the security chokepoint — it validates JWT tokens and is imported by ALL 8 protected route modules. ⚠️ This is a critical single point of failure — a bug here breaks authentication for the entire platform.',
    },
    {
      nodeId: 'permissions',
      title: '4. Access Control',
      emoji: '🛡️',
      description: '`permissions.ts` handles RBAC, feature flags, and plan-based feature gating. It\'s imported by 22 modules. Any refactor here requires regression testing across the entire codebase.',
    },
    {
      nodeId: 'billing-service',
      title: '5. Billing ⚠️',
      emoji: '💳',
      description: 'This is where the money flows. `BillingService` orchestrates Stripe subscriptions, webhook processing, and invoice generation. CRITICAL: 45% test coverage and high churn — highest risk area in the codebase.',
    },
    {
      nodeId: 'db-client',
      title: '6. Database Foundation',
      emoji: '🗄️',
      description: '`lib/database.ts` is the singleton Prisma client. It\'s imported by 10 services and acts as the bridge to PostgreSQL. The schema in `prisma/schema.prisma` defines 12 data models including User, Organization, and Subscription.',
    },
  ];

  const current = tourSteps[step];
  const node = graph.nodes.find(n => n.id === current.nodeId);

  useEffect(() => {
    onFocusNode(current.nodeId);
  }, [step, current.nodeId, onFocusNode]);

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
              onClick={() => setStep(s => Math.max(0, s - 1))}
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
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === step ? 'w-6 bg-success' : 'w-1.5 bg-surface-3 hover:bg-surface-3'
                  }`}
                />
              ))}
            </div>

            {step < tourSteps.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
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
