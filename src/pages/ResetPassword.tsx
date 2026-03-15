import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitBranch, Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Supabase sets the session automatically when it detects the recovery hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true);
      }
    });

    // Also check if we already have a session (e.g., hash already consumed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
      else setValidSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => navigate('/auth'), 2500);
    }
    setLoading(false);
  };

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
        onClick={() => navigate('/auth')}
        className="absolute top-6 left-6 flex items-center gap-1.5 font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors z-10"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Sign In
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
          <div className="flex items-center border-b border-border px-4 py-3">
            <span className="font-mono text-xs font-semibold tracking-wider text-foreground-dim">SET NEW PASSWORD</span>
          </div>

          <div className="p-6">
            {/* Loading state — detecting session */}
            {validSession === null && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-cyan" />
              </div>
            )}

            {/* Invalid / expired link */}
            {validSession === false && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <AlertCircle className="w-10 h-10 text-alert mx-auto mb-3" />
                <p className="font-mono text-sm font-bold text-foreground mb-1">Link expired or invalid</p>
                <p className="font-mono text-[11px] text-foreground-dim leading-relaxed">
                  This reset link may have already been used or has expired.
                </p>
                <button
                  onClick={() => navigate('/auth')}
                  className="mt-4 font-mono text-[11px] text-cyan hover:underline"
                >
                  Request a new link →
                </button>
              </motion.div>
            )}

            {/* Success */}
            {done && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
                <p className="font-mono text-sm font-bold text-foreground mb-1">Password updated!</p>
                <p className="font-mono text-[11px] text-foreground-dim">Redirecting you to sign in…</p>
              </motion.div>
            )}

            {/* Reset form */}
            {validSession === true && !done && (
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="font-mono text-[10px] text-foreground-dim block mb-1.5 tracking-wider">NEW PASSWORD</label>
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
                  <p className="font-mono text-[10px] text-foreground-dim mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="font-mono text-[10px] text-foreground-dim block mb-1.5 tracking-wider">CONFIRM PASSWORD</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-dim" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
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
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'UPDATE PASSWORD'}
                </button>
              </motion.form>
            )}
          </div>
        </div>

        <p className="font-mono text-[10px] text-foreground-dim text-center mt-4">
          Your data is stored securely and never shared.
        </p>
      </motion.div>
    </div>
  );
}
