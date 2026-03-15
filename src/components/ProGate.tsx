import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, MessageSquare, TrendingUp, X } from 'lucide-react';

interface ProGateProps {
  isOpen: boolean;
  feature: 'chat' | 'business';
  onClose: () => void;
}

const FEATURE_META = {
  chat: {
    icon: MessageSquare,
    title: 'AI Chat is a Pro feature',
    subtitle: 'Ask anything about the codebase — architecture, risks, refactoring ideas.',
  },
  business: {
    icon: TrendingUp,
    title: 'Business Insights is a Pro feature',
    subtitle: 'Tech stack risk, cost estimation, and executive-ready analysis.',
  },
};

export default function ProGate({ isOpen, feature, onClose }: ProGateProps) {
  const navigate = useNavigate();
  const meta = FEATURE_META[feature];
  const FeatureIcon = meta.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm"
          >
            <div className="rounded-2xl border border-border bg-surface-1 p-6 shadow-2xl">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-foreground-dim hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-primary/30 bg-primary/10">
                  <FeatureIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-mono text-sm font-bold text-foreground">{meta.title}</div>
                  <div className="font-mono text-[10px] text-foreground-dim mt-0.5">{meta.subtitle}</div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border my-4" />

              {/* Pro features list */}
              <div className="space-y-2.5 mb-5">
                {[
                  { icon: MessageSquare, label: 'AI Chat', desc: 'Ask anything about the repo' },
                  { icon: TrendingUp, label: 'Business Insights', desc: 'Risk, tech stack, cost analysis' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20 flex-shrink-0">
                      <Icon className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <span className="font-mono text-[11px] font-semibold text-foreground">
                        {label}
                      </span>
                      <span className="font-mono text-[10px] text-foreground-dim ml-1.5">{desc}</span>
                    </div>
                    <span className="ml-auto font-mono text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
                      PRO
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex gap-2">
                <button
                  onClick={() => { onClose(); navigate('/billing'); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground font-mono text-xs font-bold tracking-wide hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Upgrade to Pro
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-surface-2 border border-border font-mono text-xs text-foreground-dim hover:text-foreground hover:border-border-bright transition-all"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
