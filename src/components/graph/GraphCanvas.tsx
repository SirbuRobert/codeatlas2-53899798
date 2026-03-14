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
import AxonGraphNode from './AxonGraphNode';

interface GraphCanvasProps {
  graph: CodebaseGraph;
  selectedNodeId: string | null;
  blastRadiusNodeId: string | null;
  onNodeSelect: (node: AxonNode | null) => void;
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

export default function GraphCanvas({ graph, selectedNodeId, blastRadiusNodeId, onNodeSelect }: GraphCanvasProps) {
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
      const isDimmed = hoveredNodeId
        ? hoveredNodeId !== node.id && !hoveredConnected?.has(node.id)
        : blastRadius
        ? node.id !== blastRadiusNodeId && !blastRadius.all.has(node.id)
        : false;

      return {
        id: node.id,
        type: 'axon',
        position: node.position,
        data: {
          ...node,
          isSelected: selectedNodeId === node.id,
          isHighlighted: hoveredNodeId === node.id,
          isDimmed,
          isBlastSource: blastRadiusNodeId === node.id,
          isBlastImpacted: blastRadius ? blastRadius.all.has(node.id) : false,
        },
        draggable: true,
      };
    });
  }, [graph.nodes, selectedNodeId, hoveredNodeId, hoveredConnected, blastRadius, blastRadiusNodeId]);

  // Build React Flow edges
  const rfEdges: Edge[] = useMemo(() => {
    return graph.edges.map(edge => {
      const isConnectedToHover = hoveredNodeId
        ? edge.source === hoveredNodeId || edge.target === hoveredNodeId
        : false;
      const isBlastEdge = blastRadius
        ? (blastRadius.all.has(edge.source) || edge.source === blastRadiusNodeId) &&
          (blastRadius.all.has(edge.target) || edge.target === blastRadiusNodeId)
        : false;

      const baseColor = RELATION_COLORS[edge.relation] ?? 'rgba(100,116,139,0.3)';
      const strokeColor = isBlastEdge
        ? 'rgba(239,68,68,0.7)'
        : isConnectedToHover
        ? 'rgba(0,255,255,0.7)'
        : hoveredNodeId
        ? 'rgba(100,116,139,0.08)'
        : baseColor;

      const strokeWidth = isBlastEdge ? 2.5 : isConnectedToHover ? 2 : 1.5;
      const opacity = hoveredNodeId && !isConnectedToHover ? 0.1 : 1;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: isBlastEdge || isConnectedToHover,
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
  }, [graph.edges, hoveredNodeId, blastRadius, blastRadiusNodeId]);

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
          color="rgba(255,255,255,0.04)"
        />
        <Controls className="!bottom-6 !left-6" />
        <MiniMap
          nodeColor={(node) => {
            const n = node.data as { type: string };
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

        {/* ── Edge Legend ── */}
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

        {/* ── Blast Radius Indicator ── */}
        <AnimatePresence>
          {blastRadiusNodeId && blastRadius && (
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
