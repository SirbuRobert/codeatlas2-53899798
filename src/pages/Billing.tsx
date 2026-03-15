import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ArrowLeft, Zap, User, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PRO_PRODUCT_ID = 'prod_U9UXjFYfVVytEE';

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
    highlight: true,
  },
];

export default function Billing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subEnd, setSubEnd] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  const checkSubscription = async () => {
    if (!user) { setSubLoading(false); return; }
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (!error && data) {
        setSubscribed(data.subscribed === true && data.product_id === PRO_PRODUCT_ID);
        setSubEnd(data.subscription_end ?? null);
      }
    } catch (e) {
      console.warn('[Billing] check-subscription error:', e);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
    // Check every 60s
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: '🎉 Welcome to Pro!',
        description: 'Payment processed — your plan has been upgraded. Enjoy unlimited repos and AI summaries.',
      });
      // Refresh subscription status after a small delay
      setTimeout(checkSubscription, 2000);
    }
    if (searchParams.get('canceled') === 'true') {
      toast({
        title: 'Checkout canceled',
        description: 'No charges were made. You can upgrade any time.',
      });
    }
  }, []);

  const handleUpgrade = async () => {
    if (!user) { navigate('/auth'); return; }
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error || !data?.url) throw new Error(error?.message ?? 'Could not start checkout');
      window.open(data.url, '_blank');
    } catch (err) {
      toast({
        title: 'Checkout error',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(false);
    }
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
        {subscribed && (
          <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-success/15 text-success border border-success/30">
            PRO ACTIVE
          </span>
        )}
        <button
          onClick={() => { setSubLoading(true); checkSubscription(); }}
          className="ml-auto flex items-center gap-1 font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors"
          disabled={subLoading}
        >
          <RefreshCw className={`w-3 h-3 ${subLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
            Upgrade to unlock{' '}
            <span className="text-cyan font-semibold">Multi-Repo Analysis</span> — see how your entire
            engineering portfolio connects.
          </p>
          {subscribed && subEnd && (
            <p className="font-mono text-[11px] text-success mt-3">
              ✓ Pro active · renews {new Date(subEnd).toLocaleDateString()}
            </p>
          )}
        </motion.div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isCurrentPlan = plan.id === 'pro' ? subscribed : !subscribed;
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
                {plan.id === 'free' ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-surface-3 border border-border font-mono text-xs font-semibold text-foreground-dim cursor-default"
                  >
                    {!subscribed ? 'Your Current Plan' : 'Free Plan'}
                  </button>
                ) : isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-success/10 border border-success/30 font-mono text-xs font-semibold text-success cursor-default flex items-center justify-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Pro Active
                  </button>
                ) : (
                  <button
                    onClick={handleUpgrade}
                    disabled={checkoutLoading || subLoading}
                    className="w-full py-2.5 rounded-xl bg-cyan text-primary-foreground font-mono text-xs font-bold tracking-wider hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {checkoutLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting checkout…</>
                    ) : (
                      <><ExternalLink className="w-3.5 h-3.5" /> Upgrade to Pro</>
                    )}
                  </button>
                )}
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
            <button onClick={() => navigate('/feedback')} className="text-cyan cursor-pointer hover:underline">Contact us →</button>
          </p>
          {!user && (
            <p className="font-mono text-[11px] text-warning mt-2">
              ⚠ You need to be signed in to upgrade.{' '}
              <button onClick={() => navigate('/auth')} className="underline">Sign in →</button>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
