import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, Eye, EyeOff, Check, LogOut, User, ExternalLink, Loader2, Trash2, Webhook, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountPanel({ isOpen, onClose }: AccountPanelProps) {
  const { user, profile, signOut, saveGithubToken } = useAuth();
  const { isPro, loading: subLoading } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookRepoUrl, setWebhookRepoUrl] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);

  // Populate token from profile when panel opens
  useEffect(() => {
    if (isOpen && profile?.github_token) {
      setToken(profile.github_token);
    } else if (isOpen) {
      // Fall back to localStorage for migration
      setToken(localStorage.getItem('axon_gh_token') ?? '');
    }
    setSaved(false);
  }, [isOpen, profile]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveGithubToken(token.trim());
    setSaving(false);
    if (error) {
      toast({ title: 'Error saving token', description: error.message, variant: 'destructive' });
    } else {
      // Also sync to localStorage as fallback
      if (token.trim()) {
        localStorage.setItem('axon_gh_token', token.trim());
      } else {
        localStorage.removeItem('axon_gh_token');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({ title: '✓ GitHub token saved', description: 'Private repos are now accessible.' });
    }
  };

  const handleRemove = async () => {
    setToken('');
    setSaving(true);
    const { error } = await saveGithubToken('');
    setSaving(false);
    localStorage.removeItem('axon_gh_token');
    if (!error) {
      toast({ title: 'Token removed', description: 'Disconnected from GitHub.' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    toast({ title: 'Signed out', description: 'See you next time!' });
  };

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-80 bg-surface-1 border-l border-border z-50 flex flex-col shadow-[var(--shadow-panel)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <span className="font-mono text-xs font-bold text-foreground tracking-wider">ACCOUNT</span>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-dim hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-border">
                <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-sm font-bold text-cyan">{avatarLetter}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-foreground truncate">{user?.email}</p>
                   <p className="font-mono text-[10px] text-foreground-dim mt-0.5 flex items-center gap-1">
                    <User className="w-2.5 h-2.5" />
                    {subLoading ? '...' : isPro ? 'Pro Plan' : 'Free Plan'}
                  </p>
                </div>
              </div>

              {/* GitHub Token section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Github className="w-3.5 h-3.5 text-foreground-muted" />
                  <span className="font-mono text-[10px] font-bold text-foreground-muted tracking-wider uppercase">
                    GitHub Access Token
                  </span>
                </div>

                <p className="font-mono text-[10px] text-foreground-dim leading-relaxed mb-3">
                  Add your Personal Access Token to analyze private repositories. The token is encrypted and stored securely.
                </p>

                <div className="bg-surface-2 border border-border rounded-xl p-3 mb-3 space-y-1.5">
                  <p className="font-mono text-[10px] text-foreground-dim uppercase tracking-wider mb-1.5">Setup</p>
                  {[
                    'Go to GitHub → Settings → Developer settings → Personal access tokens',
                    'Generate new token (classic) with the repo scope',
                    'Paste below — stored encrypted in your account',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-mono text-[10px] text-cyan flex-shrink-0">{i + 1}.</span>
                      <span className="font-mono text-[10px] text-foreground-dim leading-relaxed">{step}</span>
                    </div>
                  ))}
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=CodeAtlas+AXON"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 font-mono text-[10px] text-cyan hover:underline"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    Open GitHub token page
                  </a>
                </div>

                <div className="relative mb-3">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 pr-9 font-mono text-xs text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-cyan/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-dim hover:text-foreground transition-colors"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !token.trim()}
                    className="flex-1 py-2 rounded-xl bg-cyan text-primary-foreground font-mono text-[10px] font-bold tracking-wider hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                  >
                    {saving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : saved ? (
                      <><Check className="w-3 h-3" />SAVED</>
                    ) : (
                      'SAVE TOKEN'
                    )}
                  </button>
                  {(token || profile?.github_token) && (
                    <button
                      onClick={handleRemove}
                      disabled={saving}
                      className="w-9 h-[34px] rounded-xl bg-surface-2 border border-border text-foreground-dim hover:text-alert hover:border-alert/30 transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {profile?.github_token && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                    <span className="font-mono text-[10px] text-success">Token active — private repos accessible</span>
                  </div>
                )}
              </div>

              {/* Plan */}
              <div className="p-3 rounded-xl bg-surface-2 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Current Plan</span>
                  <span
                    className="font-mono text-[10px] px-2 py-0.5 rounded border"
                    style={isPro
                      ? { background: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.3)', color: '#a855f7' }
                      : { background: 'var(--surface-3)', borderColor: 'var(--border)', color: 'var(--foreground-dim)' }
                    }
                  >
                    {subLoading ? '...' : isPro ? 'PRO' : 'FREE'}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-foreground-dim leading-relaxed mb-2">
                  {isPro
                    ? 'AI Chat, Business Insights, and all Pro features unlocked.'
                    : 'Unlimited analyses, all views, AI summaries included.'}
                </p>
                <button
                  onClick={() => { onClose(); navigate('/billing'); }}
                  className="w-full py-1.5 rounded-lg bg-surface-3 border border-border font-mono text-[10px] text-foreground-muted hover:text-foreground hover:border-border-bright transition-colors"
                >
                  {isPro ? 'Manage Plan →' : 'View Plans →'}
                </button>
              </div>

              {/* Webhook Settings */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Webhook className="w-3.5 h-3.5 text-foreground-muted" />
                  <span className="font-mono text-[10px] font-bold text-foreground-muted tracking-wider uppercase">
                    Webhook Notifications
                  </span>
                </div>
                <p className="font-mono text-[10px] text-foreground-dim leading-relaxed mb-3">
                  Get notified when a repo analysis completes. We'll POST to your URL with the graph data.
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={webhookRepoUrl}
                    onChange={e => setWebhookRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <div className="relative">
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      placeholder="https://your-server.com/webhook"
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 pr-9 font-mono text-[11px] text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <button
                      onClick={async () => {
                        if (!webhookUrl || !webhookRepoUrl || !user) return;
                        setSavingWebhook(true);
                        const { error } = await supabase.from('webhook_configs').insert({
                          user_id: user.id,
                          repo_url: webhookRepoUrl.trim(),
                          url: webhookUrl.trim(),
                          events: ['analysis.complete'],
                        });
                        setSavingWebhook(false);
                        if (error) {
                          toast({ title: 'Error', description: error.message, variant: 'destructive' });
                        } else {
                          toast({ title: '✓ Webhook saved', description: 'You\'ll be notified on analysis completion.' });
                          setWebhookUrl('');
                          setWebhookRepoUrl('');
                        }
                      }}
                      disabled={savingWebhook || !webhookUrl.trim() || !webhookRepoUrl.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/20 disabled:opacity-40 transition-all"
                    >
                      {savingWebhook ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <a
                  href="https://webhook.site"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Test with webhook.site
                </a>
              </div>

              {/* Links */}
              <div className="flex gap-2">
                <button
                  onClick={() => { onClose(); navigate('/api-docs'); }}
                  className="flex-1 py-1.5 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors"
                >
                  API Docs →
                </button>
                <button
                  onClick={() => { onClose(); navigate('/feedback'); }}
                  className="flex-1 py-1.5 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors"
                >
                  Feedback →
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border flex-shrink-0">
              <button
                onClick={handleSignOut}
                className="w-full py-2.5 rounded-xl bg-surface-2 border border-border font-mono text-xs text-foreground-dim hover:text-alert hover:border-alert/30 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                SIGN OUT
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
