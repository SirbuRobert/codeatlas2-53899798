import { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import type { AxonNode, AxonEdge, CodebaseGraph } from '@/types/graph';
import { calculateBlastRadius } from '@/types/graph';
import type { SecurityAnalysis } from '@/lib/securityAnalysis';
import AxonGraphNode from './AxonGraphNode';
import { ShieldAlert, ShieldCheck, AlertTriangle, Lock } from 'lucide-react';

interface GraphCanvasProps {
  graph: CodebaseGraph;
  selectedNodeId: string | null;
  blastRadiusNodeId: string | null;
  onNodeSelect: (node: AxonNode | null) => void;
  securityOverlay?: SecurityAnalysis | null;
  searchHighlightIds?: Set<string>;
  ghostMode?: boolean;
  tourFocusNodeId?: string | null;
}

const RELATION_COLORS: Record<string, string> = {
  imports: 'rgba(0,255,255,0.35)',
  calls: 'rgba(168,85,247,0.35)',
  inherits: 'rgba(34,197,94,0.4)',
  composes: 'rgba(59,130,246,0.35)',
  queries: 'rgba(239,68,68,0.4)',
  exposes: 'rgba(245,158,11,0.35)',
};

const RELATION_DASH: Record<string, string | undefined> = {
  imports: undefined,
  calls: '5,3',
  inherits: undefined,
  composes: '3,3',
  queries: '8,3',
  exposes: '4,2',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#a855f7',
};

const SEVERITY_ICON: Record<string, typeof ShieldAlert> = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: Lock,
};

export default function GraphCanvas({
  graph,
  selectedNodeId,
  blastRadiusNodeId,
  onNodeSelect,
  securityOverlay,
}: GraphCanvasProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Compute blast radius
  const blastRadius = useMemo(() => {
    if (!blastRadiusNodeId) return null;
    return calculateBlastRadius(blastRadiusNodeId, graph.edges, { depth: 4 });
  }, [blastRadiusNodeId, graph.edges]);

  // Hover-based connected set
  const hoveredConnected = useMemo(() => {
    if (!hoveredNodeId) return null;
    const connected = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.source === hoveredNodeId) connected.add(edge.target);
      if (edge.target === hoveredNodeId) connected.add(edge.source);
    }
    return connected;
  }, [hoveredNodeId, graph.edges]);

  // Build React Flow nodes
  const rfNodes: Node[] = useMemo(() => {
    return graph.nodes.map(node => {
      // ── Security overlay dimming ──
      let isDimmed = false;
      if (securityOverlay) {
        isDimmed = !securityOverlay.securityNodeIds.has(node.id) &&
                   !securityOverlay.authChainIds.has(node.id) &&
                   !securityOverlay.exposedApiIds.has(node.id) &&
                   !securityOverlay.unprotectedDbIds.has(node.id);
      } else if (hoveredNodeId) {
        isDimmed = hoveredNodeId !== node.id && !hoveredConnected?.has(node.id);
      } else if (blastRadius) {
        isDimmed = node.id !== blastRadiusNodeId && !blastRadius.all.has(node.id);
      }

      return {
        id: node.id,
        type: 'axon',
        position: node.position,
        data: {
          ...node,
          isSelected: selectedNodeId === node.id,
          isHighlighted: hoveredNodeId === node.id,
          isDimmed,
          isBlastSource: !securityOverlay && blastRadiusNodeId === node.id,
          isBlastImpacted: !securityOverlay && (blastRadius ? blastRadius.all.has(node.id) : false),
          // Security states
          isSecurityNode: securityOverlay ? securityOverlay.securityNodeIds.has(node.id) : false,
          isAuthChain: securityOverlay ? securityOverlay.authChainIds.has(node.id) : false,
          isExposed: securityOverlay
            ? securityOverlay.exposedApiIds.has(node.id) || securityOverlay.unprotectedDbIds.has(node.id)
            : false,
        },
        draggable: true,
      };
    });
  }, [graph.nodes, selectedNodeId, hoveredNodeId, hoveredConnected, blastRadius, blastRadiusNodeId, securityOverlay]);

  // Build React Flow edges
  const rfEdges: Edge[] = useMemo(() => {
    return graph.edges.map(edge => {
      const isConnectedToHover = hoveredNodeId
        ? edge.source === hoveredNodeId || edge.target === hoveredNodeId
        : false;
      const isBlastEdge = !securityOverlay && blastRadius
        ? (blastRadius.all.has(edge.source) || edge.source === blastRadiusNodeId) &&
          (blastRadius.all.has(edge.target) || edge.target === blastRadiusNodeId)
        : false;

      // Security edge — connects two security/auth-chain nodes
      const isSecurityEdge = securityOverlay
        ? (securityOverlay.securityNodeIds.has(edge.source) || securityOverlay.authChainIds.has(edge.source)) &&
          (securityOverlay.securityNodeIds.has(edge.target) || securityOverlay.authChainIds.has(edge.target))
        : false;

      // Auth chain entry edge — one side is a security node, other is auth chain
      const isAuthChainEdge = securityOverlay && !isSecurityEdge
        ? (securityOverlay.securityNodeIds.has(edge.source) && securityOverlay.authChainIds.has(edge.target)) ||
          (securityOverlay.authChainIds.has(edge.source) && securityOverlay.securityNodeIds.has(edge.target))
        : false;

      const baseColor = RELATION_COLORS[edge.relation] ?? 'rgba(100,116,139,0.3)';

      let strokeColor: string;
      let strokeWidth: number;
      let opacity: number;
      let animated: boolean;

      if (securityOverlay) {
        if (isSecurityEdge) {
          strokeColor = 'rgba(168,85,247,0.85)';
          strokeWidth = 2.5;
          opacity = 1;
          animated = true;
        } else if (isAuthChainEdge) {
          strokeColor = 'rgba(168,85,247,0.5)';
          strokeWidth = 1.5;
          opacity = 1;
          animated = true;
        } else {
          strokeColor = 'rgba(100,116,139,0.06)';
          strokeWidth = 1;
          opacity = 0.15;
          animated = false;
        }
      } else {
        strokeColor = isBlastEdge
          ? 'rgba(239,68,68,0.7)'
          : isConnectedToHover
          ? 'rgba(0,255,255,0.7)'
          : hoveredNodeId
          ? 'rgba(100,116,139,0.08)'
          : baseColor;
        strokeWidth = isBlastEdge ? 2.5 : isConnectedToHover ? 2 : 1.5;
        opacity = hoveredNodeId && !isConnectedToHover ? 0.1 : 1;
        animated = isBlastEdge || isConnectedToHover;
      }

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated,
        style: {
          stroke: strokeColor,
          strokeWidth,
          opacity,
          strokeDasharray: RELATION_DASH[edge.relation],
          transition: 'all 0.15s cubic-bezier(0.2, 0, 0, 1)',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 8,
          height: 8,
          color: strokeColor,
        },
        data: { relation: edge.relation },
      };
    });
  }, [graph.edges, hoveredNodeId, blastRadius, blastRadiusNodeId, securityOverlay]);

  const [nodes, , onNodesChange] = useNodesState(rfNodes);
  const [edges, , onEdgesChange] = useEdgesState(rfEdges);

  const nodeTypes = useMemo(() => ({ axon: AxonGraphNode }), []);

  const handleNodeClick: NodeMouseHandler = useCallback((_, node) => {
    const axonNode = graph.nodes.find(n => n.id === node.id);
    onNodeSelect(axonNode ?? null);
  }, [graph.nodes, onNodeSelect]);

  const handleNodeMouseEnter: NodeMouseHandler = useCallback((_, node) => {
    setHoveredNodeId(node.id);
  }, []);

  const handleNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Edge legend
  const legendItems = [
    { relation: 'imports', color: RELATION_COLORS.imports, dash: false },
    { relation: 'calls', color: RELATION_COLORS.calls, dash: true },
    { relation: 'queries', color: RELATION_COLORS.queries, dash: true },
    { relation: 'composes', color: RELATION_COLORS.composes, dash: true },
  ];

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={3}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={30}
          size={1}
          color={securityOverlay ? 'rgba(168,85,247,0.05)' : 'rgba(255,255,255,0.04)'}
        />
        <Controls className="!bottom-6 !left-6" />
        <MiniMap
          nodeColor={(node) => {
            const n = node.data as { type: string; isSecurityNode?: boolean; isExposed?: boolean };
            if (securityOverlay) {
              if (n.isSecurityNode) return '#a855f7';
              if (n.isExposed) return '#ef4444';
              return 'rgba(100,116,139,0.3)';
            }
            switch (n.type) {
              case 'service': return '#22c55e';
              case 'class': return '#a855f7';
              case 'function': return '#f59e0b';
              case 'database': return '#ef4444';
              case 'module': return '#3b82f6';
              default: return '#00ffff';
            }
          }}
          maskColor="rgba(10,12,20,0.7)"
          style={{ background: 'rgba(14,17,28,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
          className="!bottom-6 !right-6 !w-[180px] !h-[120px] !rounded-xl"
        />

        {/* ── Edge Legend (hide during security overlay) ── */}
        {!securityOverlay && (
          <Panel position="top-left">
            <div className="flex flex-col gap-1.5 bg-surface-1 border border-border rounded-xl px-3 py-2.5 panel-glass">
              <p className="font-mono text-[9px] text-foreground-dim tracking-widest uppercase mb-1">Edge Types</p>
              {legendItems.map(item => (
                <div key={item.relation} className="flex items-center gap-2">
                  <svg width="24" height="8" viewBox="0 0 24 8">
                    <line
                      x1="0" y1="4" x2="24" y2="4"
                      stroke={item.color}
                      strokeWidth="1.5"
                      strokeDasharray={item.dash ? '4,2' : undefined}
                    />
                    <polygon points="20,2 24,4 20,6" fill={item.color} />
                  </svg>
                  <span className="font-mono text-[10px] text-foreground-dim capitalize">{item.relation}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* ── Security Overlay Panel ── */}
        <AnimatePresence>
          {securityOverlay && (
            <Panel position="top-left">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="panel-glass rounded-xl border flex flex-col gap-2"
                style={{
                  borderColor: 'rgba(168,85,247,0.4)',
                  boxShadow: '0 0 24px rgba(168,85,247,0.15)',
                  padding: '12px 14px',
                  minWidth: 220,
                  maxWidth: 280,
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5" style={{ color: '#a855f7' }} />
                  <p className="font-mono text-[10px] font-bold tracking-widest" style={{ color: '#a855f7' }}>
                    SECURITY SCAN
                  </p>
                </div>

                {/* Counts */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div
                    className="rounded-lg px-2 py-1.5"
                    style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
                  >
                    <p className="font-mono text-[14px] font-bold" style={{ color: '#c084fc' }}>
                      {securityOverlay.securityNodeIds.size}
                    </p>
                    <p className="font-mono text-[8px] text-foreground-dim">Auth Nodes</p>
                  </div>
                  <div
                    className="rounded-lg px-2 py-1.5"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <p className="font-mono text-[14px] font-bold" style={{ color: '#ef4444' }}>
                      {securityOverlay.exposedApiIds.size}
                    </p>
                    <p className="font-mono text-[8px] text-foreground-dim">Exposed APIs</p>
                  </div>
                  <div
                    className="rounded-lg px-2 py-1.5"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
                  >
                    <p className="font-mono text-[14px] font-bold" style={{ color: '#f59e0b' }}>
                      {securityOverlay.unprotectedDbIds.size}
                    </p>
                    <p className="font-mono text-[8px] text-foreground-dim">Unprotected DB</p>
                  </div>
                  <div
                    className="rounded-lg px-2 py-1.5"
                    style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}
                  >
                    <p className="font-mono text-[14px] font-bold" style={{ color: '#94a3b8' }}>
                      {securityOverlay.authChainIds.size}
                    </p>
                    <p className="font-mono text-[8px] text-foreground-dim">Chain Nodes</p>
                  </div>
                </div>

                {/* Top findings */}
                {securityOverlay.findings.length > 0 && (
                  <div className="flex flex-col gap-1 pt-1" style={{ borderTop: '1px solid rgba(168,85,247,0.15)' }}>
                    <p className="font-mono text-[8px] tracking-widest text-foreground-dim uppercase mb-0.5">
                      Top Findings
                    </p>
                    {securityOverlay.findings.slice(0, 3).map((finding, i) => {
                      const SeverityIcon = SEVERITY_ICON[finding.severity];
                      return (
                        <div key={i} className="flex items-start gap-1.5">
                          <SeverityIcon
                            className="w-3 h-3 flex-shrink-0 mt-0.5"
                            style={{ color: SEVERITY_COLOR[finding.severity] }}
                          />
                          <div>
                            <p className="font-mono text-[9px] font-semibold text-foreground leading-tight">
                              {finding.label}
                            </p>
                            <p className="font-mono text-[8px] text-foreground-dim leading-tight mt-0.5 line-clamp-2">
                              {finding.detail}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {securityOverlay.findings.length > 3 && (
                      <p className="font-mono text-[8px] text-foreground-dim mt-0.5">
                        +{securityOverlay.findings.length - 3} more findings
                      </p>
                    )}
                  </div>
                )}

                {/* Legend */}
                <div className="flex flex-col gap-1 pt-1" style={{ borderTop: '1px solid rgba(168,85,247,0.15)' }}>
                  {[
                    { color: '#a855f7', label: 'Auth / JWT node' },
                    { color: 'rgba(168,85,247,0.45)', label: 'Auth chain' },
                    { color: '#ef4444', label: 'Exposed / Unprotected' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="font-mono text-[8px] text-foreground-dim">{label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </Panel>
          )}
        </AnimatePresence>

        {/* ── Blast Radius Indicator ── */}
        <AnimatePresence>
          {blastRadiusNodeId && blastRadius && !securityOverlay && (
            <Panel position="top-right">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="panel-glass rounded-xl px-4 py-3 border border-alert/30"
                style={{ boxShadow: '0 0 20px rgba(239,68,68,0.15)' }}
              >
                <p className="font-mono text-[10px] text-alert font-bold tracking-widest mb-1">⚡ BLAST RADIUS</p>
                <p className="font-mono text-[11px] text-foreground">
                  <span className="text-alert font-bold">{blastRadius.upstream.size}</span>
                  <span className="text-foreground-dim"> upstream dependents</span>
                </p>
                <p className="font-mono text-[11px] text-foreground">
                  <span className="text-warning font-bold">{blastRadius.downstream.size}</span>
                  <span className="text-foreground-dim"> downstream deps</span>
                </p>
              </motion.div>
            </Panel>
          )}
        </AnimatePresence>
      </ReactFlow>
    </div>
  );
}
