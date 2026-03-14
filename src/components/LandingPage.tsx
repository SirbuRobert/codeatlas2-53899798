import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Zap, Search, ChevronRight, Lock, Star, Globe } from 'lucide-react';
import { exampleRepos } from '@/data/mockGraph';
import type { AnalysisPhase } from '@/types/graph';

interface LandingPageProps {
  onAnalyze: (url: string) => void;
}

const ANALYSIS_PHASES: AnalysisPhase[] = [
  { id: 'clone', label: 'Cloning repository', status: 'pending' },
  { id: 'parse', label: 'Running Tree-sitter AST parser', status: 'pending' },
  { id: 'dag', label: 'Building Directed Acyclic Graph', status: 'pending' },
  { id: 'semantic', label: 'Semantic enrichment via AI', status: 'pending' },
  { id: 'layout', label: 'Computing ELK hierarchical layout', status: 'pending' },
  { id: 'render', label: 'Initializing WebGL viewport', status: 'pending' },
];

const PHASE_DURATIONS = [800, 1200, 900, 1800, 600, 500];

const NODE_TYPE_COLORS: Record<string, string> = {
  file: 'text-cyan',
  class: 'text-violet',
  function: 'text-warning',
  module: 'text-node-module',
  service: 'text-success',
  database: 'text-alert',
};

export default function LandingPage({ onAnalyze }: LandingPageProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [phases, setPhases] = useState<AnalysisPhase[]>(ANALYSIS_PHASES);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);

  // Glitch effect on title
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (url: string = inputUrl) => {
    if (!url.trim()) return;
    setIsAnalyzing(true);
    setCurrentPhaseIdx(0);
    setPhases(ANALYSIS_PHASES.map(p => ({ ...p, status: 'pending' })));

    for (let i = 0; i < ANALYSIS_PHASES.length; i++) {
      setCurrentPhaseIdx(i);
      setPhases(prev => prev.map((p, idx) =>
        idx === i ? { ...p, status: 'running' } : p
      ));
      await new Promise(r => setTimeout(r, PHASE_DURATIONS[i]));
      setPhases(prev => prev.map((p, idx) =>
        idx === i ? { ...p, status: 'done', duration: PHASE_DURATIONS[i] } : p
      ));
    }

    await new Promise(r => setTimeout(r, 400));
    onAnalyze(url.trim());
  };

  const statsData = [
    { value: '40+', label: 'Languages parsed' },
    { value: '50k', label: 'Nodes @ 60fps' },
    { value: '<3s', label: 'Analysis time' },
    { value: '100%', label: 'Deterministic' },
  ];

  const featureItems = [
    { icon: '🔴', title: 'Blast Radius', desc: 'Instantly see what breaks if you change this file' },
    { icon: '🗺️', title: 'Spatial Memory', desc: 'Deterministic layout — nodes stay where you learned them' },
    { icon: '🧠', title: 'AI Summaries', desc: 'Every node explains itself in plain English' },
    { icon: '📐', title: 'C4 Model Auto-gen', desc: 'Context → Container → Component — one toggle' },
    { icon: '🔐', title: 'Security Topology', desc: 'Auth chains, permission graphs, vulnerability paths' },
    { icon: '🎯', title: 'Guided Tours', desc: 'Automated onboarding for new team members' },
  ];

  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col">
      {/* ── Ambient Background Grid ── */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--cyan)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--cyan)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Radial glow from top ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-[0.06] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(var(--cyan)) 0%, transparent 70%)' }}
      />

      {/* ── Floating corner dots ── */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <span className="font-mono text-[10px] text-foreground-dim tracking-[0.2em] uppercase">AXON v2.1.0</span>
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" />
      </div>

      {/* ── Main Content ── */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-20">

        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
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
          transition={{ duration: 0.6, delay: 0.1 }}
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

        {/* Subline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-foreground-dim text-sm text-center max-w-md mb-10 leading-relaxed"
        >
          AST parsing → Knowledge Graph → AI Semantic Layer → Interactive 60fps WebGL map.
          No config. No setup. Just drop a URL.
        </motion.p>

        {/* ── Repo Input ── */}
        <AnimatePresence mode="wait">
          {!isAnalyzing ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-2xl"
            >
              {/* Input bar */}
              <div className="relative group mb-4">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-cyan/30 via-violet/20 to-cyan/30 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
                <div className="relative flex items-center gap-3 bg-surface-1 border border-border rounded-2xl px-5 py-4 shadow-[var(--shadow-panel)]">
                  <Search className="w-4 h-4 text-foreground-dim flex-shrink-0" />
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={e => setInputUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="github.com/org/repository"
                    className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-foreground placeholder:text-foreground-dim"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!inputUrl.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan text-primary-foreground font-mono text-xs font-semibold tracking-wider
                               hover:bg-primary-glow disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-150 active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    ANALYZE
                  </button>
                </div>
              </div>

              {/* Example repos */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="font-mono text-[11px] text-foreground-dim mr-1">TRY:</span>
                {exampleRepos.map(repo => (
                  <button
                    key={repo.url}
                    onClick={() => handleSubmit(repo.url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border
                               font-mono text-[11px] text-foreground-muted hover:text-foreground hover:border-border-bright
                               hover:bg-surface-3 transition-all duration-150 group"
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
          ) : (
            /* ── Analysis Pipeline Progress ── */
            <motion.div
              key="analysis"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg"
            >
              <div className="bg-surface-1 border border-border rounded-2xl p-6 shadow-[var(--shadow-panel)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="font-mono text-xs text-foreground-dim mb-0.5">ANALYZING</p>
                    <p className="font-mono text-sm text-cyan truncate max-w-[280px]">
                      {inputUrl}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
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
                    animate={{
                      width: `${Math.round((phases.filter(p => p.status === 'done').length / phases.length) * 100)}%`,
                    }}
                    transition={{ duration: 0.4 }}
                  />
                </div>

                {/* Phase list */}
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
                          <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3.5 h-3.5 text-success"
                            viewBox="0 0 12 12" fill="none"
                          >
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </motion.svg>
                        )}
                        {phase.status === 'running' && (
                          <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
                        )}
                        {phase.status === 'pending' && (
                          <div className="w-2 h-2 rounded-full bg-surface-3 border border-border" />
                        )}
                      </div>
                      <span
                        className={`font-mono text-xs transition-colors duration-200 ${
                          phase.status === 'done'
                            ? 'text-foreground-dim'
                            : phase.status === 'running'
                            ? 'text-foreground'
                            : 'text-foreground-dim opacity-40'
                        }`}
                      >
                        {phase.label}
                      </span>
                      {phase.status === 'done' && phase.duration && (
                        <span className="ml-auto font-mono text-[10px] text-foreground-dim">
                          {phase.duration}ms
                        </span>
                      )}
                      {phase.status === 'running' && (
                        <span className="ml-auto font-mono text-[10px] text-cyan terminal-cursor" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats Bar ── */}
        {!isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-8 mt-16"
          >
            {statsData.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="font-mono text-2xl font-bold text-cyan">{stat.value}</div>
                <div className="font-mono text-[10px] text-foreground-dim tracking-wider uppercase mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Feature Grid ── */}
        {!isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-12 max-w-2xl w-full"
          >
            {featureItems.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-surface-1 border border-border
                           hover:border-border-bright hover:bg-surface-2 transition-all duration-200 group cursor-default"
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

      {/* ── Footer ── */}
      <div className="relative z-10 text-center pb-6">
        <p className="font-mono text-[10px] text-foreground-dim tracking-[0.2em]">
          CHALLENGE BY QA DNA · VIBEHACK BUCHAREST · MARCH 14–15, 2026
        </p>
      </div>
    </div>
  );
}
