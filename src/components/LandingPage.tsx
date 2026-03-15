import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Zap, Search, ChevronRight, Lock, Star, Globe, AlertCircle, HelpCircle, Github, Check, Eye, EyeOff, X, ExternalLink, UserCircle, LogIn } from 'lucide-react';
import { exampleRepos } from '@/data/mockGraph';
import type { AnalysisPhase } from '@/types/graph';
import LiveStatsBar from '@/components/LiveStatsBar';
import type { SessionStats } from '@/components/LiveStatsBar';
import PipelineExplainer from '@/components/PipelineExplainer';
import AccountPanel from '@/components/AccountPanel';
import { useAuth } from '@/hooks/useAuth';

const GH_TOKEN_KEY = 'axon_gh_token';

function GitHubTokenModal({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const trimmed = token.trim();
    if (!trimmed) return;
    localStorage.setItem(GH_TOKEN_KEY, trimmed);
    setSaved(true);
    setTimeout(onClose, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-surface-1 border border-border rounded-2xl p-6 shadow-[var(--shadow-panel)]"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-foreground-dim hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
            <Github className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <p className="font-mono text-sm font-bold text-foreground">Connect GitHub</p>
            <p className="font-mono text-[10px] text-foreground-dim">Access private repositories</p>
          </div>
        </div>

        <div className="bg-surface-2 border border-border rounded-xl p-4 mb-4 space-y-1.5">
          <p className="font-mono text-[10px] text-foreground-dim uppercase tracking-wider mb-2">Setup instructions</p>
          <div className="flex items-start gap-2 font-mono text-[11px] text-foreground-muted">
            <span className="text-primary flex-shrink-0">1.</span>
            <span>Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)</span>
          </div>
          <div className="flex items-start gap-2 font-mono text-[11px] text-foreground-muted">
            <span className="text-primary flex-shrink-0">2.</span>
            <span>Click <strong className="text-foreground">Generate new token</strong> and enable the <code className="bg-surface-3 px-1 rounded text-primary">repo</code> scope</span>
          </div>
          <div className="flex items-start gap-2 font-mono text-[11px] text-foreground-muted">
            <span className="text-primary flex-shrink-0">3.</span>
            <span>Paste the token below — it stays only on your device</span>
          </div>
          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=CodeAtlas+AXON"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 font-mono text-[10px] text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Open GitHub token page
          </a>
        </div>

        <div className="relative mb-4">
          <input
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 pr-10 font-mono text-sm text-foreground placeholder:text-foreground-dim outline-none focus:border-primary/50 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-dim hover:text-foreground transition-colors"
          >
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={!token.trim() || saved}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-mono text-xs font-semibold tracking-wider
                     hover:bg-primary-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
        >
          {saved ? (
            <><Check className="w-3.5 h-3.5" />SAVED</>
          ) : (
            'SAVE TOKEN'
          )}
        </button>

        <p className="font-mono text-[10px] text-foreground-dim text-center mt-3">
          Token stored locally in your browser — never sent to our servers
        </p>
      </motion.div>
    </div>
  );
}

interface LandingPageProps {
  onAnalyze: (url: string) => void;
  isAnalyzing: boolean;
  analysisError: string | null;
  onAnimationComplete: () => void;
  sessionStats: SessionStats;
}

const ANALYSIS_PHASES: AnalysisPhase[] = [
  { id: 'clone', label: 'Cloning repository via GitHub API', status: 'pending' },
  { id: 'parse', label: 'Running Tree-sitter AST parser on file tree', status: 'pending' },
  { id: 'dag', label: 'Building Directed Acyclic Graph', status: 'pending' },
  { id: 'semantic', label: 'AI Semantic enrichment (Gemini Flash)', status: 'pending' },
  { id: 'layout', label: 'Computing ELK hierarchical layout', status: 'pending' },
  { id: 'render', label: 'Initializing WebGL viewport', status: 'pending' },
];

// Phase durations in ms — total ~7.5s, enough for the real API call
const PHASE_DURATIONS = [900, 1400, 1000, 2400, 800, 700];
const TOTAL_ANIM_MS = PHASE_DURATIONS.reduce((a, b) => a + b, 0);

export default function LandingPage({
  onAnalyze,
  isAnalyzing,
  analysisError,
  onAnimationComplete,
  sessionStats,
}: LandingPageProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [inputUrl, setInputUrl] = useState('');
  const [phases, setPhases] = useState<AnalysisPhase[]>(ANALYSIS_PHASES);
  const [glitchActive, setGlitchActive] = useState(false);
  const [analysisUrl, setAnalysisUrl] = useState('');
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [ghModalOpen, setGhModalOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [ghConnected, setGhConnected] = useState(() => !!localStorage.getItem(GH_TOKEN_KEY));
  const animFinishedRef = useRef(false);

  // Sync ghConnected whenever modal closes
  const handleModalClose = () => {
    setGhModalOpen(false);
    setGhConnected(!!localStorage.getItem(GH_TOKEN_KEY));
  };

  const handleDisconnect = () => {
    localStorage.removeItem(GH_TOKEN_KEY);
    setGhConnected(false);
  };

  // Glitch title effect
  useEffect(() => {
    const t = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Run cosmetic animation when isAnalyzing flips to true
  useEffect(() => {
    if (!isAnalyzing) return;
    animFinishedRef.current = false;
    setPhases(ANALYSIS_PHASES.map((p) => ({ ...p, status: 'pending' })));

    let cancelled = false;
    (async () => {
      for (let i = 0; i < ANALYSIS_PHASES.length; i++) {
        if (cancelled) return;
        setPhases((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: 'running' } : p)),
        );
        await new Promise((r) => setTimeout(r, PHASE_DURATIONS[i]));
        if (cancelled) return;
        setPhases((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: 'done', duration: PHASE_DURATIONS[i] } : p,
          ),
        );
      }
      // Animation finished — notify parent
      animFinishedRef.current = true;
      onAnimationComplete();
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnalyzing]);

  const isPrivateError = !!analysisError && (
    analysisError.includes('404') ||
    analysisError.toLowerCase().includes('not found') ||
    analysisError.toLowerCase().includes('private')
  );

  const handleSubmit = (url: string = inputUrl) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setAnalysisUrl(trimmed);
    onAnalyze(trimmed);
  };

  const statsData = [
    { value: '40+', label: 'Languages parsed' },
    { value: '50k', label: 'Nodes @ 60fps' },
    { value: '<10s', label: 'Analysis time' },
    { value: '100%', label: 'Deterministic' },
  ];

  const featureItems = [
    { icon: '🔴', title: 'Blast Radius', desc: 'Instantly see what breaks if you change this file' },
    { icon: '🗺️', title: 'Spatial Memory', desc: 'Deterministic layout — nodes stay where you learned them' },
    { icon: '🧠', title: 'AI Summaries', desc: 'Every node explains itself in plain English via Gemini' },
    { icon: '📐', title: 'C4 Model Auto-gen', desc: 'Context → Container → Component — one toggle' },
    { icon: '🔐', title: 'Security Topology', desc: 'Auth chains, permission graphs, vulnerability paths' },
    { icon: '🎯', title: 'Guided Tours', desc: 'Automated onboarding for new team members' },
  ];

  const progressPct = Math.round(
    (phases.filter((p) => p.status === 'done').length / phases.length) * 100,
  );

  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      {/* Subtle top gradient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-[0.08] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(245 70% 65%) 0%, transparent 70%)' }}
      />
      {/* Version chip + Auth button */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
        <span className="font-mono text-[10px] text-foreground-dim tracking-[0.2em] uppercase hidden sm:block">AXON v2.1.0</span>
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse hidden sm:block" />
        {user ? (
          <button
            onClick={() => setAccountOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-1 border border-border hover:border-border-bright font-mono text-[10px] text-foreground-muted hover:text-foreground transition-all"
          >
          <div className="w-5 h-5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-[9px] font-bold text-primary">{user.email?.[0]?.toUpperCase()}</span>
            </div>
            {user.email?.split('@')[0]}
          </button>
        ) : (
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-1 border border-border hover:border-primary/30 font-mono text-[10px] text-foreground-muted hover:text-primary transition-all"
          >
            <LogIn className="w-3 h-3" />
            Sign In
          </button>
        )}
      </div>

      {/* Main */}
      <div className="relative z-10 flex flex-col items-center px-6 py-20">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-xl bg-cyan/10 border border-cyan/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-cyan" />
            </div>
          </div>
          <span className="font-mono text-sm text-foreground-muted tracking-[0.3em] uppercase">CodeAtlas</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan/10 text-cyan border border-cyan/20">
            AXON
          </span>
        </motion.div>

        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-4"
        >
          <h1
            className={`font-mono text-5xl md:text-7xl font-bold tracking-tight leading-none mb-4 transition-all duration-75 ${
              glitchActive ? 'text-alert' : 'text-gradient-cyan'
            }`}
            style={{
              textShadow: glitchActive
                ? '2px 0 hsl(var(--alert)), -2px 0 hsl(var(--cyan))'
                : '0 0 40px hsl(var(--cyan) / 0.3)',
            }}
          >
            GPS FOR CODE
          </h1>
          <p className="font-mono text-foreground-muted text-sm md:text-base tracking-[0.1em]">
            POINT IT AT A REPO · UNDERSTAND IT IN MINUTES
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-foreground-dim text-sm text-center max-w-md mb-10 leading-relaxed"
        >
          GitHub API → Tree-sitter AST → Knowledge Graph → AI Semantic Layer → Interactive 60fps WebGL map.
          No config. No setup. Just drop a URL.{' '}
          <button
            onClick={() => setPipelineOpen(true)}
            className="inline-flex items-center gap-1 text-cyan hover:underline transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            How does this work?
          </button>
        </motion.p>

        {/* Input / Analysis panel */}
        <AnimatePresence mode="wait">
          {!isAnalyzing && !analysisError ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-2xl"
            >
              {/* GitHub connect chip */}
              <div className="flex justify-end mb-2">
                {ghConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-success/10 border border-success/30 font-mono text-[10px] text-success">
                      <Check className="w-3 h-3" />
                      GitHub Connected
                    </span>
                    <button
                      onClick={handleDisconnect}
                      className="font-mono text-[10px] text-foreground-dim hover:text-alert transition-colors underline"
                    >
                      disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setGhModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-muted hover:text-foreground hover:border-border-bright transition-all duration-150"
                  >
                    <Github className="w-3 h-3" />
                    Connect GitHub
                    <Lock className="w-2.5 h-2.5 text-warning ml-0.5" />
                  </button>
                )}
              </div>

              <div className="relative group mb-4">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-cyan/30 via-violet/20 to-cyan/30 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
                <div className="relative flex items-center gap-3 bg-surface-1 border border-border rounded-2xl px-5 py-4 shadow-[var(--shadow-panel)]">
                  <Search className="w-4 h-4 text-foreground-dim flex-shrink-0" />
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="github.com/org/repository  or  https://github.com/org/repo"
                    className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-foreground placeholder:text-foreground-dim"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!inputUrl.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan text-primary-foreground font-mono text-xs font-semibold tracking-wider
                               hover:bg-primary-glow disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    ANALYZE
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="font-mono text-[11px] text-foreground-dim mr-1">TRY:</span>
                {exampleRepos.map((repo) => (
                  <button
                    key={repo.url}
                    onClick={() => handleSubmit(repo.url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-mono text-[11px] text-foreground-muted hover:text-foreground hover:border-border-bright hover:bg-surface-3 transition-all duration-150 group"
                  >
                    {repo.private ? (
                      <Lock className="w-2.5 h-2.5 text-warning" />
                    ) : (
                      <Globe className="w-2.5 h-2.5 text-foreground-dim" />
                    )}
                    {repo.label}
                    {repo.stars && (
                      <span className="flex items-center gap-0.5 text-foreground-dim">
                        <Star className="w-2.5 h-2.5" />
                        {(repo.stars / 1000).toFixed(0)}k
                      </span>
                    )}
                    <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : analysisError ? (
            /* Error state */
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg"
            >
              <div className="bg-surface-1 border border-alert/30 rounded-2xl p-6 shadow-[var(--shadow-panel)]">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-alert flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-mono text-sm font-bold text-alert mb-1">ANALYSIS FAILED</p>
                    <p className="font-mono text-[11px] text-foreground-muted leading-relaxed">{analysisError}</p>
                  </div>
                </div>

                {/* Private repo hint */}
                {isPrivateError && !ghConnected && (
                  <div className="mb-4 flex items-start gap-2.5 px-3 py-2.5 bg-warning/5 border border-warning/20 rounded-xl">
                    <Lock className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-mono text-[11px] text-warning font-semibold mb-0.5">Private repository?</p>
                      <p className="font-mono text-[10px] text-foreground-muted leading-relaxed">
                        Connect your GitHub token to access private repos.
                      </p>
                      <button
                        onClick={() => setGhModalOpen(true)}
                        className="inline-flex items-center gap-1 mt-1.5 font-mono text-[10px] text-cyan hover:underline"
                      >
                        <Github className="w-3 h-3" />
                        Connect GitHub Token
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setInputUrl(analysisUrl);
                    window.location.reload();
                  }}
                  className="w-full py-2 rounded-xl bg-surface-2 border border-border font-mono text-xs text-foreground-muted hover:text-foreground transition-all"
                >
                  TRY AGAIN
                </button>
              </div>
            </motion.div>
          ) : (
            /* Analysis progress */
            <motion.div
              key="analysis"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg"
            >
              <div className="bg-surface-1 border border-border rounded-2xl p-6 shadow-[var(--shadow-panel)]">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="font-mono text-xs text-foreground-dim mb-0.5">ANALYZING</p>
                    <p className="font-mono text-sm text-cyan truncate max-w-[280px]">{analysisUrl}</p>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-px bg-surface-3 rounded-full mb-5 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan to-violet"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>

                <div className="space-y-2.5">
                  {phases.map((phase, idx) => (
                    <motion.div
                      key={phase.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                        {phase.status === 'done' && (
                          <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3.5 h-3.5 text-success" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </motion.svg>
                        )}
                        {phase.status === 'running' && <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />}
                        {phase.status === 'pending' && <div className="w-2 h-2 rounded-full bg-surface-3 border border-border" />}
                      </div>
                      <span className={`font-mono text-xs transition-colors duration-200 ${
                        phase.status === 'done' ? 'text-foreground-dim' : phase.status === 'running' ? 'text-foreground' : 'text-foreground-dim opacity-40'
                      }`}>
                        {phase.label}
                      </span>
                      {phase.status === 'done' && phase.duration && (
                        <span className="ml-auto font-mono text-[10px] text-foreground-dim">{phase.duration}ms</span>
                      )}
                      {phase.status === 'running' && (
                        <span className="ml-auto font-mono text-[10px] text-cyan terminal-cursor" />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Awaiting AI */}
                {progressPct === 100 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 flex items-center gap-2 px-3 py-2 bg-cyan/5 rounded-xl border border-cyan/15"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
                    <span className="font-mono text-[10px] text-cyan">Awaiting AI analysis completion…</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        {!isAnalyzing && !analysisError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-8 mt-16"
          >
            {statsData.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="font-mono text-2xl font-bold text-cyan">{stat.value}</div>
                <div className="font-mono text-[10px] text-foreground-dim tracking-wider uppercase mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Feature grid */}
        {!isAnalyzing && !analysisError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-12 max-w-2xl w-full"
          >
            {featureItems.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-surface-1 border border-border hover:border-border-bright hover:bg-surface-2 transition-all duration-200 cursor-default"
              >
                <span className="text-xl leading-none mt-0.5">{f.icon}</span>
                <div>
                  <div className="font-mono text-xs font-semibold text-foreground mb-1">{f.title}</div>
                  <div className="font-mono text-[10px] text-foreground-dim leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Live stats bar — shown on idle landing, hidden during analysis */}
      {!isAnalyzing && !analysisError && (
        <LiveStatsBar stats={sessionStats} />
      )}

      <div className="relative z-10 text-center pb-6">
        <p className="font-mono text-[10px] text-foreground-dim tracking-[0.2em]">
          CHALLENGE BY QA DNA · VIBEHACK BUCHAREST · MARCH 14–15, 2026
        </p>
      </div>

      {/* Pipeline Explainer Modal */}
      <PipelineExplainer isOpen={pipelineOpen} onClose={() => setPipelineOpen(false)} />

      {/* GitHub Token Modal */}
      <AnimatePresence>
        {ghModalOpen && <GitHubTokenModal onClose={handleModalClose} />}
      </AnimatePresence>

      {/* Account Panel (logged-in users) */}
      <AccountPanel isOpen={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
