import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, LayoutGrid, Terminal, RotateCcw, Route } from 'lucide-react';
import GraphCanvas from '@/components/graph/GraphCanvas';
import NodeInspector from '@/components/NodeInspector';
import CommandBar, { buildSlashCommands } from '@/components/CommandBar';
import StatsHUD from '@/components/StatsHUD';
import TreemapView from '@/components/TreemapView';
import OnboardingTour from '@/components/OnboardingTour';
import { mockGraph } from '@/data/mockGraph';
import type { AxonNode } from '@/types/graph';

type ViewMode = 'topology' | 'treemap';

interface DashboardProps {
  repoUrl: string;
  onReset: () => void;
}

export default function Dashboard({ repoUrl, onReset }: DashboardProps) {
  const [selectedNode, setSelectedNode] = useState<AxonNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('topology');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [blastRadiusNodeId, setBlastRadiusNodeId] = useState<string | null>(null);
  const [tourActive, setTourActive] = useState(false);
  const [tourFocusId, setTourFocusId] = useState<string | null>(null);

  const graph = { ...mockGraph, repoUrl };

  const handleNodeSelect = useCallback((node: AxonNode | null) => {
    setSelectedNode(node);
    setBlastRadiusNodeId(null);
  }, []);

  const handleBlastRadius = useCallback((nodeId: string) => {
    setBlastRadiusNodeId(nodeId);
    setSelectedNode(null);
  }, []);

  // CMD+K listener
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCmdOpen(true);
    }
  }, []);

  useState(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const slashCommands = buildSlashCommands({
    onBlastRadius: () => {
      if (selectedNode) handleBlastRadius(selectedNode.id);
      else if (graph.nodes[0]) handleBlastRadius(graph.nodes[0].id);
    },
    onSecurityReview: () => handleBlastRadius('auth-middleware'),
    onTour: () => setTourActive(true),
    onReviewPR: () => handleBlastRadius('billing-service'),
  });

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-4 border-b border-border bg-surface-1 flex-shrink-0" style={{ height: 48 }}>
        {/* Brand */}
        <div className="flex items-center gap-2 pr-4 border-r border-border">
          <div className="w-5 h-5 rounded-md bg-cyan/10 border border-cyan/30 flex items-center justify-center">
            <Map className="w-3 h-3 text-cyan" />
          </div>
          <span className="font-mono text-xs font-bold text-foreground">CodeAtlas</span>
          <span className="font-mono text-[9px] text-foreground-dim">AXON</span>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1">
          {([['topology', Map, 'Topology'], ['treemap', LayoutGrid, 'Treemap']] as const).map(([mode, Icon, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[10px] transition-all duration-150
                ${viewMode === mode
                  ? 'bg-surface-3 text-foreground border border-border-bright'
                  : 'text-foreground-dim hover:text-foreground'
                }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Blast radius clear */}
        {blastRadiusNodeId && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setBlastRadiusNodeId(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-alert/10 border border-alert/30 font-mono text-[10px] text-alert hover:bg-alert/15 transition-all"
          >
            ⚡ BLAST RADIUS — CLICK TO CLEAR
          </motion.button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Tour */}
          <button
            onClick={() => setTourActive(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/25 font-mono text-[10px] text-success hover:bg-success/15 transition-all"
          >
            <Route className="w-3 h-3" />
            TOUR
          </button>

          {/* CMD+K */}
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-muted hover:text-foreground hover:border-border-bright transition-all"
          >
            <Terminal className="w-3 h-3" />
            Slash Commands
            <kbd className="font-mono text-[9px] bg-surface-3 px-1 py-0.5 rounded border border-border text-foreground-dim">⌘K</kbd>
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-mono text-[10px] text-foreground-dim hover:text-foreground transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            New Repo
          </button>
        </div>
      </div>

      {/* ── Stats HUD ── */}
      <StatsHUD graph={graph} />

      {/* ── AI Summary banner ── */}
      <div className="flex-shrink-0 px-4 py-2 bg-surface-1 border-b border-border">
        <p className="font-mono text-[10px] text-foreground-dim leading-relaxed line-clamp-1">
          <span className="text-cyan font-bold mr-2">AI SUMMARY</span>
          {graph.summary}
        </p>
      </div>

      {/* ── Main canvas area ── */}
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
                selectedNodeId={selectedNode?.id ?? tourFocusId ?? null}
                blastRadiusNodeId={blastRadiusNodeId}
                onNodeSelect={handleNodeSelect}
              />
            </motion.div>
          ) : (
            <motion.div
              key="treemap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <TreemapView graph={graph} onNodeSelect={handleNodeSelect} />
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
              onClose={() => { setTourActive(false); setTourFocusId(null); }}
              onFocusNode={(id) => { setTourFocusId(id); setSelectedNode(graph.nodes.find(n => n.id === id) ?? null); }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Command Bar ── */}
      <CommandBar
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        commands={slashCommands}
      />
    </div>
  );
}
