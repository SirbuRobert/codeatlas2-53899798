import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, CreditCard, Lock, ArrowLeft, Zap, Building2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    icon: User,
    color: '#64748b',
    description: 'For individuals and teams exploring codebases.',
    features: [
      'Unlimited repo analyses',
      'Public repos',
      'All views (Topology, Solar, Treemap)',
      'AI semantic summaries (Gemini)',
      'Blast Radius & Security Topology',
      'Business Insights panel',
      'GitHub PAT for private repos',
      'Community support',
    ],
    missing: [
      'Multi-Repo Analysis',
      'Team dashboards',
      'SSO / SAML integration',
      'Priority support + SLA',
    ],
    cta: 'Current Plan',
    ctaDisabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    icon: Zap,
    color: '#00ffff',
    badge: 'MOST POPULAR',
    description: 'For engineering leads and organisations that need governance.',
    features: [
      'Everything in Free',
      '✦ Multi-Repo Analysis',
      'Team dashboards',
      'SSO / SAML integration',
      'Role-based access control',
      'Audit logs',
      'Priority support + SLA',
      'Dedicated success manager',
    ],
    missing: [],
    cta: 'Upgrade to Pro',
    ctaDisabled: false,
    highlight: true,
  },
];

function PaymentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);

  const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onSuccess();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl border border-border overflow-hidden"
        style={{ background: 'hsl(var(--surface-1))' }}
      >
        {/* Test mode banner */}
        <div className="bg-warning/15 border-b border-warning/30 px-5 py-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
          <span className="font-mono text-[10px] text-warning font-bold tracking-wider">
            TEST MODE — No real charges will be made
          </span>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-mono text-sm font-bold text-foreground">Upgrade to Pro</h3>
              <p className="font-mono text-[10px] text-foreground-dim mt-0.5">$29.00 / month · Cancel anytime</p>
            </div>
            <button
              onClick={onClose}
              className="font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors"
            >
              ✕ Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="font-mono text-[10px] text-foreground-dim block mb-1">CARDHOLDER NAME</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                required
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-cyan/50 transition-colors"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-foreground-dim block mb-1">CARD NUMBER</label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(formatCard(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  required
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 pr-10 font-mono text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-cyan/50 transition-colors"
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-dim" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] text-foreground-dim block mb-1">EXPIRY</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={e => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  required
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-cyan/50 transition-colors"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-foreground-dim block mb-1">CVC</label>
                <input
                  type="text"
                  value={cvc}
                  onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="123"
                  required
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-cyan/50 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan text-primary-foreground font-mono text-xs font-bold tracking-wider hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {processing ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  PAY $29.00 / MONTH
                </>
              )}
            </button>
          </form>

          <p className="font-mono text-[9px] text-foreground-dim text-center mt-3">
            🔒 Secured by Stripe · 256-bit TLS · PCI DSS compliant
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function Billing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const handleUpgradeSuccess = () => {
    setModalOpen(false);
    toast({
      title: '🎉 Welcome to Pro!',
      description: 'Payment processed — your plan has been upgraded. Enjoy unlimited repos and AI summaries.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface-1 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <div className="h-4 w-px bg-border" />
        <span className="font-mono text-xs font-bold text-foreground">BILLING & PLANS</span>
        <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">
          TEST MODE
        </span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-mono text-3xl font-bold text-foreground mb-3">
            Choose your plan
          </h1>
          <p className="font-mono text-sm text-foreground-dim max-w-lg mx-auto leading-relaxed">
            Upgrade to unlock private repos, AI summaries, Solar System view, and{' '}
            <span className="text-cyan font-semibold">Multi-Repo Analysis</span> — see how your entire
            engineering portfolio connects.
          </p>
        </motion.div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.highlight
                    ? 'border-cyan/40 bg-surface-1'
                    : 'border-border bg-surface-1'
                }`}
                style={plan.highlight ? { boxShadow: '0 0 40px rgba(0,255,255,0.06)' } : undefined}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 font-mono text-[9px] font-bold px-3 py-1 rounded-full bg-cyan text-primary-foreground tracking-widest">
                    {plan.badge}
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center border"
                    style={{ background: `${plan.color}15`, borderColor: `${plan.color}30` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: plan.color }} />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-foreground">{plan.name}</div>
                    <div className="font-mono text-[10px] text-foreground-dim">{plan.description}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-5">
                  {plan.price === 0 ? (
                    <span className="font-mono text-3xl font-bold text-foreground">Free</span>
                  ) : (
                    <>
                      <span className="font-mono text-3xl font-bold" style={{ color: plan.color }}>
                        ${plan.price}
                      </span>
                      <span className="font-mono text-[11px] text-foreground-dim ml-1">/ month</span>
                    </>
                  )}
                </div>

                {/* Features */}
                <div className="flex-1 space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                      <span className={`font-mono text-[11px] leading-relaxed ${
                        f.startsWith('✦') ? 'text-foreground font-semibold' : 'text-foreground-muted'
                      }`}>
                        {f.replace('✦ ', '')}
                        {f.startsWith('✦') && (
                          <span className="ml-1.5 font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan/10 text-cyan border border-cyan/20">
                            PRO EXCLUSIVE
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                  {plan.missing.map((f) => (
                    <div key={f} className="flex items-start gap-2 opacity-30">
                      <div className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 flex items-center justify-center">
                        <div className="w-2 h-px bg-foreground-dim" />
                      </div>
                      <span className="font-mono text-[11px] text-foreground-dim line-through">{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  disabled={plan.ctaDisabled}
                  onClick={() => plan.id === 'pro' ? setModalOpen(true) : undefined}
                  className={`w-full py-2.5 rounded-xl font-mono text-xs font-semibold tracking-wider transition-all active:scale-[0.98] ${
                    plan.ctaDisabled
                      ? 'bg-surface-3 border border-border text-foreground-dim cursor-default'
                      : plan.highlight
                      ? 'bg-cyan text-primary-foreground hover:opacity-90'
                      : 'bg-surface-2 border border-border text-foreground-muted hover:text-foreground hover:border-border-bright'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* FAQ / note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="font-mono text-[11px] text-foreground-dim">
            All plans include a 14-day free trial. No credit card required for Free tier.{' '}
            <span className="text-foreground-muted">Questions?</span>{' '}
            <span className="text-cyan cursor-pointer hover:underline">Contact us →</span>
          </p>
        </motion.div>
      </div>

      {/* Payment modal */}
      {modalOpen && (
        <PaymentModal
          onClose={() => setModalOpen(false)}
          onSuccess={handleUpgradeSuccess}
        />
      )}
    </div>
  );
}
