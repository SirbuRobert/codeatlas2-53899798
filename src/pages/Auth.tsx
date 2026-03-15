import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'login' | 'signup';
type View = Tab | 'forgot' | 'forgot-sent';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword } = useAuth();

  const [tab, setTab] = useState<Tab>('login');
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);

  const switchTab = (t: Tab) => {
    setTab(t);
    setView(t);
    setError(null);
    setSignupDone(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (view === 'forgot') {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setView('forgot-sent');
      }
    } else if (tab === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        navigate('/');
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSignupDone(true);
      }
    }
    setLoading(false);
  };

  const isForgotFlow = view === 'forgot' || view === 'forgot-sent';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Grid bg */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--cyan)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--cyan)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] opacity-[0.05] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(var(--cyan)) 0%, transparent 70%)' }}
      />

      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-1.5 font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors z-10"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 rounded-xl bg-cyan/10 border border-cyan/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-cyan" />
            </div>
          </div>
          <span className="font-mono text-sm text-foreground-muted tracking-[0.3em] uppercase">CodeAtlas</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan/10 text-cyan border border-cyan/20">AXON</span>
        </div>

        <div className="bg-surface-1 border border-border rounded-2xl shadow-[var(--shadow-panel)] overflow-hidden">
          {/* Tabs — hidden during forgot flow */}
          {!isForgotFlow && (
            <div className="flex border-b border-border">
              {(['login', 'signup'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={`flex-1 py-3 font-mono text-xs font-semibold tracking-wider transition-colors ${
                    tab === t
                      ? 'text-cyan border-b-2 border-cyan -mb-px bg-cyan/5'
                      : 'text-foreground-dim hover:text-foreground'
                  }`}
                >
                  {t === 'login' ? 'SIGN IN' : 'SIGN UP'}
                </button>
              ))}
            </div>
          )}

          {/* Forgot header */}
          {isForgotFlow && (
            <div className="flex items-center border-b border-border px-4 py-3 gap-2">
              <button
                onClick={() => { setView('login'); setError(null); }}
                className="text-foreground-dim hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-xs font-semibold tracking-wider text-foreground-dim">RESET PASSWORD</span>
            </div>
          )}

          <div className="p-6">
            <AnimatePresence mode="wait">

              {/* ── forgot-sent confirmation ── */}
              {view === 'forgot-sent' && (
                <motion.div
                  key="forgot-sent"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
                  <p className="font-mono text-sm font-bold text-foreground mb-1">Check your email</p>
                  <p className="font-mono text-[11px] text-foreground-dim leading-relaxed">
                    We sent a reset link to <span className="text-cyan">{email}</span>.
                    Click it to set a new password.
                  </p>
                  <button
                    onClick={() => { setView('login'); setError(null); }}
                    className="mt-4 font-mono text-[11px] text-cyan hover:underline"
                  >
                    Back to Sign In →
                  </button>
                </motion.div>
              )}

              {/* ── forgot form ── */}
              {view === 'forgot' && (
                <motion.form
                  key="forgot"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <p className="font-mono text-[11px] text-foreground-dim leading-relaxed">
                    Enter your email and we'll send you a link to reset your password.
                  </p>
                  <div>
                    <label className="font-mono text-[10px] text-foreground-dim block mb-1.5 tracking-wider">EMAIL</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-dim" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full bg-surface-2 border border-border rounded-xl pl-9 pr-4 py-2.5 font-mono text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-cyan/50 transition-colors"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-3 py-2 rounded-xl bg-alert/10 border border-alert/30 font-mono text-[11px] text-alert"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-cyan text-primary-foreground font-mono text-xs font-bold tracking-wider hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'SEND RESET LINK'}
                  </button>
                </motion.form>
              )}

              {/* ── signup confirmation ── */}
              {signupDone && view === 'signup' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
                  <p className="font-mono text-sm font-bold text-foreground mb-1">Check your email</p>
                  <p className="font-mono text-[11px] text-foreground-dim leading-relaxed">
                    We sent a confirmation link to <span className="text-cyan">{email}</span>.
                    Click it to activate your account.
                  </p>
                  <button
                    onClick={() => { switchTab('login'); setPassword(''); }}
                    className="mt-4 font-mono text-[11px] text-cyan hover:underline"
                  >
                    Back to Sign In →
                  </button>
                </motion.div>
              )}

              {/* ── login / signup forms ── */}
              {!signupDone && !isForgotFlow && (
                <motion.form
                  key={tab}
                  initial={{ opacity: 0, x: tab === 'login' ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <div>
                    <label className="font-mono text-[10px] text-foreground-dim block mb-1.5 tracking-wider">EMAIL</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-dim" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full bg-surface-2 border border-border rounded-xl pl-9 pr-4 py-2.5 font-mono text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-cyan/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-mono text-[10px] text-foreground-dim block mb-1.5 tracking-wider">PASSWORD</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-dim" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="w-full bg-surface-2 border border-border rounded-xl pl-9 pr-10 py-2.5 font-mono text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-cyan/50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-dim hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {tab === 'signup' && (
                      <p className="font-mono text-[10px] text-foreground-dim mt-1">Minimum 6 characters</p>
                    )}
                    {tab === 'login' && (
                      <div className="flex justify-end mt-1">
                        <button
                          type="button"
                          onClick={() => { setView('forgot'); setError(null); }}
                          className="font-mono text-[10px] text-foreground-dim hover:text-cyan transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-3 py-2 rounded-xl bg-alert/10 border border-alert/30 font-mono text-[11px] text-alert"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-cyan text-primary-foreground font-mono text-xs font-bold tracking-wider hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : tab === 'login' ? (
                      'SIGN IN'
                    ) : (
                      'CREATE ACCOUNT'
                    )}
                  </button>

                  {tab === 'login' && (
                    <p className="text-center font-mono text-[11px] text-foreground-dim">
                      No account?{' '}
                      <button
                        type="button"
                        onClick={() => switchTab('signup')}
                        className="text-cyan hover:underline"
                      >
                        Sign up free →
                      </button>
                    </p>
                  )}
                </motion.form>
              )}

            </AnimatePresence>
          </div>
        </div>

        <p className="font-mono text-[10px] text-foreground-dim text-center mt-4">
          Your data is stored securely and never shared.
        </p>
      </motion.div>
    </div>
  );
}
