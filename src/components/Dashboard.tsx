import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Map, LayoutGrid, Terminal, Route, RefreshCw, Orbit, ShieldAlert, Ghost, Search, TrendingUp, CreditCard, FileDown, BookOpen, MessageSquare, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AccountPanel from '@/components/AccountPanel';
import GraphCanvas from '@/components/graph/GraphCanvas';
import NodeInspector from '@/components/NodeInspector';
import CommandBar, { buildSlashCommands } from '@/components/CommandBar';
import StatsHUD from '@/components/StatsHUD';
import TreemapView from '@/components/TreemapView';
import SolarSystemView from '@/components/graph/SolarSystemView';
import OnboardingTour from '@/components/OnboardingTour';
import SearchBar from '@/components/SearchBar';
import AISummaryPanel, { AISummaryBanner } from '@/components/AISummaryPanel';
import BusinessInsightsPanel from '@/components/BusinessInsightsPanel';
import ExportModal from '@/components/ExportModal';
import RepoExplainerModal from '@/components/RepoExplainerModal';
import RepoChatPanel from '@/components/RepoChatPanel';
import type { AxonNode, CodebaseGraph } from '@/types/graph';
import { analyzeGraphSecurity } from '@/lib/securityAnalysis';

type ViewMode = 'topology' | 'treemap' | 'solar';

interface DashboardProps {
  graph: CodebaseGraph;
  repoUrl: string;
  onReset: () => void;
}

export default function Dashboard({ graph, repoUrl, onReset }: DashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<AxonNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('topology');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [blastRadiusNodeId, setBlastRadiusNodeId] = useState<string | null>(null);
  const [securityOverlayActive, setSecurityOverlayActive] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourFocusNodeId, setTourFocusNodeId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHighlightIds, setSearchHighlightIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [ghostMode, setGhostMode] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [businessPanelOpen, setBusinessPanelOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [statsHighlightLabel, setStatsHighlightLabel] = useState<string | null>(null);

  // Auto-show explainer on first visit per repo
  useEffect(() => {
    const slug = graph.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\//g, '_');
    const key = `axon_explained_${slug}`;
    if (!localStorage.getItem(key)) {
      const timer = setTimeout(() => setExplainerOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [graph.repoUrl]);

  const securityAnalysis = useMemo(
    () => (securityOverlayActive ? analyzeGraphSecurity(graph) : null),
    [securityOverlayActive, graph],
  );

  const orphanCount = useMemo(() => graph.nodes.filter(n => n.metadata.isOrphan).length, [graph.nodes]);

  const handleNodeSelect = useCallback((node: AxonNode | null) => {
    setSelectedNode(node);
    setBlastRadiusNodeId(null);
  }, []);

  const handleBlastRadius = useCallback((nodeId: string) => {
    setBlastRadiusNodeId(nodeId);
    setSelectedNode(null);
    setSecurityOverlayActive(false);
    setGhostMode(false);
    setSearchHighlightIds(new Set());
    setSearchQuery('');
  }, []);

  const handleSecurityReview = useCallback(() => {
    setSecurityOverlayActive(true);
    setBlastRadiusNodeId(null);
    setSelectedNode(null);
    setViewMode('topology');
    setGhostMode(false);
    setSearchHighlightIds(new Set());
    setSearchQuery('');
  }, []);

  const handleGhostCity = useCallback(() => {
    setGhostMode(g => !g);
    setSecurityOverlayActive(false);
    setBlastRadiusNodeId(null);
    setSearchHighlightIds(new Set());
    setSearchQuery('');
  }, []);

  const handleSearchResults = useCallback((ids: Set<string>, query: string) => {
    setSearchHighlightIds(ids);
    setSearchQuery(query);
    if (ids.size > 0) {
      setSecurityOverlayActive(false);
      setBlastRadiusNodeId(null);
      setGhostMode(false);
    }
  }, []);

  const handleNodeFocusFromChat = useCallback((nodeId: string) => {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setViewMode('topology');
      setTourFocusNodeId(nodeId);
    }
  }, [graph.nodes]);

  const clearAll = useCallback(() => {
    setBlastRadiusNodeId(null);
    setSecurityOverlayActive(false);
    setGhostMode(false);
    setSearchHighlightIds(new Set());
    setSearchQuery('');
    setStatsHighlightLabel(null);
  }, []);

  const handleStatClick = useCallback((ids: Set<string>, label: string) => {
    // Toggle: clicking the same stat again clears
    if (statsHighlightLabel === label) {
      setSearchHighlightIds(new Set());
      setSearchQuery('');
      setStatsHighlightLabel(null);
      return;
    }
    setSearchHighlightIds(ids);
    setSearchQuery(label);
    setStatsHighlightLabel(label);
    setSecurityOverlayActive(false);
    setBlastRadiusNodeId(null);
    setGhostMode(false);
  }, [statsHighlightLabel]);

  // CMD+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const slashCommands = buildSlashCommands({
    onBlastRadius: () => {
      const target = selectedNode ?? graph.nodes.find((n) => n.metadata.isEntryPoint) ?? graph.nodes[0];
      if (target) handleBlastRadius(target.id);
    },
    onSecurityReview: handleSecurityReview,
    onTour: () => setTourActive(true),
    onReviewPR: () => {
      const highRisk =
        graph.nodes.find((n) => n.metadata.flags.includes('low-coverage') && n.metadata.churn > 50) ??
        graph.nodes.find((n) => n.metadata.riskLevel === 'critical') ??
        graph.nodes[0];
      if (highRisk) handleBlastRadius(highRisk.id);
    },
    onSearch: () => setSearchOpen(true),
    onGhostCity: handleGhostCity,
  });

  const activeOverlayCount = [
    !!blastRadiusNodeId, securityOverlayActive, ghostMode, searchHighlightIds.size > 0
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top Bar ── */}
      <div
        className="flex items-center gap-2 px-4 border-b border-border bg-surface-1 flex-shrink-0 flex-wrap"
        style={{ minHeight: 48 }}
      >
        <div className="flex items-center gap-2 pr-4 border-r border-border">
          <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Map className="w-3 h-3 text-primary" />
          </div>
          <span className="font-mono text-xs font-bold text-foreground">CodeAtlas</span>
          <span className="font-mono text-[9px] text-foreground-dim">AXON</span>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1">
          {(
            [
              ['topology', Map, 'Topology'],
              ['treemap', LayoutGrid, 'Treemap'],
              ['solar', Orbit, 'Solar'],
            ] as const
          ).map(([mode, Icon, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[10px] transition-all duration-150 ${
                viewMode === mode
                  ? 'bg-surface-3 text-foreground border border-border-bright'
                  : 'text-foreground-dim hover:text-foreground'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Active mode badges — click to clear */}
        {blastRadiusNodeId && !securityOverlayActive && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => setBlastRadiusNodeId(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-alert/10 border border-alert/30 font-mono text-[10px] text-alert hover:bg-alert/15 transition-all"
          >
            ⚡ BLAST RADIUS ACTIVE — click to clear
          </motion.button>
        )}
        {securityOverlayActive && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => setSecurityOverlayActive(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] transition-all"
            style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc' }}
          >
            <ShieldAlert className="w-3 h-3" />
            🔐 SECURITY SCAN — click to clear
          </motion.button>
        )}
        {ghostMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => setGhostMode(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] transition-all"
            style={{ background: 'rgba(71,85,105,0.15)', border: '1px solid rgba(71,85,105,0.4)', color: '#94a3b8' }}
          >
            <Ghost className="w-3 h-3" />
            👻 GHOST CITY — {orphanCount} orphans — click to clear
          </motion.button>
        )}
        {searchHighlightIds.size > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => { setSearchHighlightIds(new Set()); setSearchQuery(''); setStatsHighlightLabel(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 font-mono text-[10px] text-primary hover:bg-primary/15 transition-all"
          >
            <Search className="w-3 h-3" />
            🔍 {searchHighlightIds.size} {statsHighlightLabel ? `${statsHighlightLabel} files` : `matches for "${searchQuery}"`} — click to clear
          </motion.button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-dim hover:text-foreground transition-all"
          >
            <Search className="w-3 h-3" />
            Search
            <kbd className="font-mono text-[9px] bg-surface-3 px-1 py-0.5 rounded border border-border text-foreground-dim">⌘F</kbd>
          </button>

          {/* Ask AI */}
          <button
            onClick={() => setChatOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-[10px] transition-all ${
              chatOpen
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-surface-2 border-border text-foreground-dim hover:text-foreground hover:border-border-bright'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            Ask AI
          </button>

          {/* Business View */}
          <button
            onClick={() => setBusinessPanelOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-[10px] transition-all ${
              businessPanelOpen
                ? 'bg-surface-3 border-border-bright text-foreground'
                : 'bg-surface-2 border-border text-foreground-dim hover:text-foreground'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            Business View
          </button>

          <button
            onClick={() => setExplainerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-dim hover:text-foreground hover:border-border-bright transition-all"
          >
            <BookOpen className="w-3 h-3" />
            Explain Repo
          </button>

          <button
            onClick={() => setTourActive(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/25 font-mono text-[10px] text-success hover:bg-success/15 transition-all"
          >
            <Route className="w-3 h-3" />
            TOUR
          </button>

          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-muted hover:text-foreground hover:border-border-bright transition-all"
          >
            <Terminal className="w-3 h-3" />
            Commands
            <kbd className="font-mono text-[9px] bg-surface-3 px-1 py-0.5 rounded border border-border text-foreground-dim">⌘K</kbd>
          </button>

          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/25 font-mono text-[10px] text-success hover:bg-success/15 transition-all"
          >
            <FileDown className="w-3 h-3" />
            Export
          </button>

          <button
            onClick={() => navigate('/billing')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/25 font-mono text-[10px] text-primary hover:bg-primary/15 transition-all"
          >
            <CreditCard className="w-3 h-3" />
            Plans
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-dim hover:text-foreground transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            New Repo
          </button>

          {/* Auth button — always visible */}
          <div className="w-px h-4 bg-border mx-1 flex-shrink-0" />
          {user ? (
            <button
              onClick={() => setAccountOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border hover:border-border-bright font-mono text-[10px] text-foreground-muted hover:text-foreground transition-all"
            >
              <div className="w-5 h-5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-primary">{user.email?.[0]?.toUpperCase()}</span>
              </div>
              <span className="hidden md:inline">{user.email?.split('@')[0]}</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/25 font-mono text-[10px] text-primary hover:bg-primary/15 transition-all"
            >
              <LogIn className="w-3 h-3" />
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* ── Stats HUD ── */}
      <StatsHUD graph={{ ...graph, repoUrl }} onStatClick={handleStatClick} activeStatLabel={statsHighlightLabel ?? undefined} />

      {/* ── AI Summary banner ── */}
      <AISummaryBanner summary={graph.summary} onExpand={() => setSummaryOpen(true)} />

      {/* ── Main canvas ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Search bar floating */}
        <SearchBar
          nodes={graph.nodes}
          onResults={handleSearchResults}
          onClose={() => setSearchOpen(false)}
          isOpen={searchOpen}
        />

        <AnimatePresence mode="wait">
          {viewMode === 'topology' ? (
            <motion.div key="topology" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
              <GraphCanvas
                graph={graph}
                selectedNodeId={selectedNode?.id ?? null}
                blastRadiusNodeId={blastRadiusNodeId}
                onNodeSelect={handleNodeSelect}
                securityOverlay={securityAnalysis}
                searchHighlightIds={searchHighlightIds}
                ghostMode={ghostMode}
                tourFocusNodeId={tourFocusNodeId}
                onFindingNodeSelect={(nodeId) => {
                  const n = graph.nodes.find(x => x.id === nodeId);
                  if (n) setSelectedNode(n);
                }}
                statsHighlightLabel={statsHighlightLabel}
                onClearStatFilter={() => {
                  setSearchHighlightIds(new Set());
                  setSearchQuery('');
                  setStatsHighlightLabel(null);
                }}
              />
            </motion.div>
          ) : viewMode === 'treemap' ? (
            <motion.div key="treemap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
              <TreemapView
                graph={graph}
                onNodeSelect={handleNodeSelect}
                searchHighlightIds={searchHighlightIds}
                ghostMode={ghostMode}
              />
            </motion.div>
          ) : (
            <motion.div key="solar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
              <SolarSystemView
                graph={graph}
                selectedNodeId={selectedNode?.id ?? null}
                onNodeSelect={handleNodeSelect}
                blastRadiusNodeId={blastRadiusNodeId}
                securityOverlay={securityAnalysis}
                searchHighlightIds={searchHighlightIds}
                ghostMode={ghostMode}
                tourFocusNodeId={tourFocusNodeId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Overlays rendered OUTSIDE the canvas div so WebGL can't eat their clicks ── */}
      <div className="pointer-events-none fixed inset-0 z-40 flex flex-col">
        {/* Node inspector */}
        <AnimatePresence>
          {selectedNode && (
            <div className="pointer-events-auto">
              <NodeInspector
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
                onBlastRadius={handleBlastRadius}
                graph={graph}
                onNodeNavigate={(nodeId) => {
                  const n = graph.nodes.find(x => x.id === nodeId);
                  if (n) setSelectedNode(n);
                }}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Business Insights Panel */}
        <div className="pointer-events-auto">
          <BusinessInsightsPanel
            graph={graph}
            isOpen={businessPanelOpen}
            onClose={() => setBusinessPanelOpen(false)}
          />
        </div>

        {/* Onboarding tour — bottom-center */}
        <AnimatePresence>
          {tourActive && (
            <div className="pointer-events-auto">
              <OnboardingTour
                graph={graph}
                onClose={() => { setTourActive(false); setTourFocusNodeId(null); }}
                onFocusNode={(id) => {
                  setSelectedNode(graph.nodes.find((n) => n.id === id) ?? null);
                  setTourFocusNodeId(id);
                }}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Command Bar */}
      <CommandBar isOpen={cmdOpen} onClose={() => setCmdOpen(false)} commands={slashCommands} />

      {/* AI Summary Panel */}
      <AISummaryPanel graph={graph} isOpen={summaryOpen} onClose={() => setSummaryOpen(false)} />

      {/* Export Modal */}
      <ExportModal graph={graph} isOpen={exportOpen} onClose={() => setExportOpen(false)} />

      {/* Repo Explainer Modal */}
      <RepoExplainerModal
        graph={graph}
        isOpen={explainerOpen}
        onClose={() => {
          setExplainerOpen(false);
          const slug = graph.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\//g, '_');
          localStorage.setItem(`axon_explained_${slug}`, '1');
        }}
        onFocusNode={(id) => {
          setSelectedNode(graph.nodes.find((n) => n.id === id) ?? null);
          setTourFocusNodeId(id);
          setViewMode('topology');
        }}
      />

      {/* Repo Chat Panel */}
      <RepoChatPanel
        graph={graph}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        onNodeFocus={handleNodeFocusFromChat}
      />

      {/* Account Panel */}
      <AccountPanel isOpen={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
