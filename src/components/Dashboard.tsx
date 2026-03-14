import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, LayoutGrid, Terminal, Route, RefreshCw, Orbit, ShieldAlert } from 'lucide-react';
import GraphCanvas from '@/components/graph/GraphCanvas';
import NodeInspector from '@/components/NodeInspector';
import CommandBar, { buildSlashCommands } from '@/components/CommandBar';
import StatsHUD from '@/components/StatsHUD';
import TreemapView from '@/components/TreemapView';
import SolarSystemView from '@/components/graph/SolarSystemView';
import OnboardingTour from '@/components/OnboardingTour';
import type { AxonNode, CodebaseGraph } from '@/types/graph';
import { analyzeGraphSecurity } from '@/lib/securityAnalysis';

type ViewMode = 'topology' | 'treemap' | 'solar';

interface DashboardProps {
  graph: CodebaseGraph;
  repoUrl: string;
  onReset: () => void;
}

export default function Dashboard({ graph, repoUrl, onReset }: DashboardProps) {
  const [selectedNode, setSelectedNode] = useState<AxonNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('topology');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [blastRadiusNodeId, setBlastRadiusNodeId] = useState<string | null>(null);
  const [securityOverlayActive, setSecurityOverlayActive] = useState(false);
  const [tourActive, setTourActive] = useState(false);

  // Compute security analysis lazily when overlay is on
  const securityAnalysis = useMemo(
    () => (securityOverlayActive ? analyzeGraphSecurity(graph) : null),
    [securityOverlayActive, graph],
  );

  const handleNodeSelect = useCallback((node: AxonNode | null) => {
    setSelectedNode(node);
    setBlastRadiusNodeId(null);
  }, []);

  const handleBlastRadius = useCallback((nodeId: string) => {
    setBlastRadiusNodeId(nodeId);
    setSelectedNode(null);
    setSecurityOverlayActive(false);
  }, []);

  const handleSecurityReview = useCallback(() => {
    setSecurityOverlayActive(true);
    setBlastRadiusNodeId(null);
    setSelectedNode(null);
    setViewMode('topology');
  }, []);

  // CMD+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
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
  });

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top Bar ── */}
      <div
        className="flex items-center gap-3 px-4 border-b border-border bg-surface-1 flex-shrink-0"
        style={{ height: 48 }}
      >
        <div className="flex items-center gap-2 pr-4 border-r border-border">
          <div className="w-5 h-5 rounded-md bg-cyan/10 border border-cyan/30 flex items-center justify-center">
            <Map className="w-3 h-3 text-cyan" />
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

        {/* Blast radius active indicator */}
        {blastRadiusNodeId && !securityOverlayActive && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setBlastRadiusNodeId(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-alert/10 border border-alert/30 font-mono text-[10px] text-alert hover:bg-alert/15 transition-all"
          >
            ⚡ BLAST RADIUS ACTIVE — click to clear
          </motion.button>
        )}

        {/* Security overlay active badge */}
        {securityOverlayActive && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setSecurityOverlayActive(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] transition-all"
            style={{
              background: 'rgba(168,85,247,0.12)',
              border: '1px solid rgba(168,85,247,0.4)',
              color: '#c084fc',
            }}
          >
            <ShieldAlert className="w-3 h-3" />
            🔐 SECURITY SCAN ACTIVE — click to clear
          </motion.button>
        )}

        <div className="ml-auto flex items-center gap-2">
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
            Slash Commands
            <kbd className="font-mono text-[9px] bg-surface-3 px-1 py-0.5 rounded border border-border text-foreground-dim">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-dim hover:text-foreground transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            New Repo
          </button>
        </div>
      </div>

      {/* ── Stats HUD ── */}
      <StatsHUD graph={{ ...graph, repoUrl }} />

      {/* ── AI Summary banner ── */}
      <div className="flex-shrink-0 px-4 py-2 bg-surface-1 border-b border-border">
        <p className="font-mono text-[10px] text-foreground-dim leading-relaxed line-clamp-1">
          <span className="text-cyan font-bold mr-2">AI SUMMARY</span>
          {graph.summary}
        </p>
      </div>

      {/* ── Main canvas ── */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'topology' ? (
            <motion.div
              key="topology"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <GraphCanvas
                graph={graph}
                selectedNodeId={selectedNode?.id ?? null}
                blastRadiusNodeId={blastRadiusNodeId}
                onNodeSelect={handleNodeSelect}
                securityOverlay={securityAnalysis}
              />
            </motion.div>
          ) : viewMode === 'treemap' ? (
            <motion.div
              key="treemap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <TreemapView graph={graph} onNodeSelect={handleNodeSelect} />
            </motion.div>
          ) : (
            <motion.div
              key="solar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <SolarSystemView
                graph={graph}
                selectedNodeId={selectedNode?.id ?? null}
                onNodeSelect={handleNodeSelect}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Node inspector */}
        <AnimatePresence>
          {selectedNode && (
            <NodeInspector
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onBlastRadius={handleBlastRadius}
            />
          )}
        </AnimatePresence>

        {/* Onboarding tour */}
        <AnimatePresence>
          {tourActive && (
            <OnboardingTour
              graph={graph}
              onClose={() => setTourActive(false)}
              onFocusNode={(id) => setSelectedNode(graph.nodes.find((n) => n.id === id) ?? null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Command Bar */}
      <CommandBar isOpen={cmdOpen} onClose={() => setCmdOpen(false)} commands={slashCommands} />
    </div>
  );
}
