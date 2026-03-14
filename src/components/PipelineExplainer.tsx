import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import ReactFlow, {
  Background,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface PipelineExplainerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Custom node data
interface PipelineNodeData {
  icon: string;
  title: string;
  desc: string;
  color: string;
  phase: string;
  [key: string]: unknown;
}

const PHASE_COLORS = {
  input: '#00ffff',
  processing: '#3b82f6',
  ai: '#a855f7',
  output: '#22c55e',
};

const PIPELINE_NODES: Node<PipelineNodeData>[] = [
  {
    id: '1',
    type: 'default',
    position: { x: 0, y: 80 },
    data: {
      icon: '👤',
      title: 'You',
      desc: 'Paste a GitHub URL to begin. No config, no setup.',
      color: PHASE_COLORS.input,
      phase: 'INPUT',
    },
    style: {
      background: `${PHASE_COLORS.input}15`,
      border: `1px solid ${PHASE_COLORS.input}40`,
      borderRadius: 12,
      fontFamily: 'monospace',
      color: '#e2e8f0',
      width: 130,
    },
  },
  {
    id: '2',
    type: 'default',
    position: { x: 175, y: 80 },
    data: {
      icon: '🔗',
      title: 'GitHub API',
      desc: 'Fetches the full file tree and raw source code via the REST API.',
      color: PHASE_COLORS.input,
      phase: 'INPUT',
    },
    style: {
      background: `${PHASE_COLORS.input}15`,
      border: `1px solid ${PHASE_COLORS.input}40`,
      borderRadius: 12,
      fontFamily: 'monospace',
      color: '#e2e8f0',
      width: 130,
    },
  },
  {
    id: '3',
    type: 'default',
    position: { x: 350, y: 80 },
    data: {
      icon: '🌳',
      title: 'AST Parser',
      desc: 'Tree-sitter parses every file into an Abstract Syntax Tree — language-agnostic.',
      color: PHASE_COLORS.processing,
      phase: 'PARSE',
    },
    style: {
      background: `${PHASE_COLORS.processing}15`,
      border: `1px solid ${PHASE_COLORS.processing}40`,
      borderRadius: 12,
      fontFamily: 'monospace',
      color: '#e2e8f0',
      width: 130,
    },
  },
  {
    id: '4',
    type: 'default',
    position: { x: 525, y: 80 },
    data: {
      icon: '🕸',
      title: 'DAG Builder',
      desc: 'Imports, exports, and calls are wired into a directed graph of dependencies.',
      color: PHASE_COLORS.processing,
      phase: 'GRAPH',
    },
    style: {
      background: `${PHASE_COLORS.processing}15`,
      border: `1px solid ${PHASE_COLORS.processing}40`,
      borderRadius: 12,
      fontFamily: 'monospace',
      color: '#e2e8f0',
      width: 130,
    },
  },
  {
    id: '5',
    type: 'default',
    position: { x: 700, y: 80 },
    data: {
      icon: '🤖',
      title: 'AI Enrichment',
      desc: 'Gemini Flash generates plain-English summaries and risk analysis for every node.',
      color: PHASE_COLORS.ai,
      phase: 'AI',
    },
    style: {
      background: `${PHASE_COLORS.ai}15`,
      border: `1px solid ${PHASE_COLORS.ai}40`,
      borderRadius: 12,
      fontFamily: 'monospace',
      color: '#e2e8f0',
      width: 130,
    },
  },
  {
    id: '6',
    type: 'default',
    position: { x: 875, y: 80 },
    data: {
      icon: '📐',
      title: 'Layout Engine',
      desc: 'ELK hierarchical algorithm computes deterministic node positions at any scale.',
      color: PHASE_COLORS.processing,
      phase: 'LAYOUT',
    },
    style: {
      background: `${PHASE_COLORS.processing}15`,
      border: `1px solid ${PHASE_COLORS.processing}40`,
      borderRadius: 12,
      fontFamily: 'monospace',
      color: '#e2e8f0',
      width: 130,
    },
  },
  {
    id: '7',
    type: 'default',
    position: { x: 1050, y: 80 },
    data: {
      icon: '🌐',
      title: 'WebGL Render',
      desc: 'react-three-fiber renders the 3D Solar System; @xyflow renders the 2D topology.',
      color: PHASE_COLORS.output,
      phase: 'RENDER',
    },
    style: {
      background: `${PHASE_COLORS.output}15`,
      border: `1px solid ${PHASE_COLORS.output}40`,
      borderRadius: 12,
      fontFamily: 'monospace',
      color: '#e2e8f0',
      width: 130,
    },
  },
  {
    id: '8',
    type: 'default',
    position: { x: 1225, y: 80 },
    data: {
      icon: '✅',
      title: 'You Are Here',
      desc: 'Click any node to inspect it. Run Blast Radius, Security Scan, or AI Summary.',
      color: PHASE_COLORS.output,
      phase: 'OUTPUT',
    },
    style: {
      background: `${PHASE_COLORS.output}20`,
      border: `2px solid ${PHASE_COLORS.output}60`,
      borderRadius: 12,
      fontFamily: 'monospace',
      color: '#e2e8f0',
      width: 130,
    },
  },
];

const PIPELINE_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: PHASE_COLORS.input, strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: PHASE_COLORS.processing, strokeWidth: 2 } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: PHASE_COLORS.processing, strokeWidth: 2 } },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: PHASE_COLORS.ai, strokeWidth: 2 } },
  { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: PHASE_COLORS.processing, strokeWidth: 2 } },
  { id: 'e6-7', source: '6', target: '7', animated: true, style: { stroke: PHASE_COLORS.output, strokeWidth: 2 } },
  { id: 'e7-8', source: '7', target: '8', animated: true, style: { stroke: PHASE_COLORS.output, strokeWidth: 2 } },
];

export default function PipelineExplainer({ isOpen, onClose }: PipelineExplainerProps) {
  const handleNodeClick = useCallback(() => {}, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
            className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-border overflow-hidden"
            style={{
              background: 'hsl(var(--surface-1))',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
              maxHeight: '55vh',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-mono text-sm font-bold text-foreground">HOW DOES CODEATLAS WORK?</h2>
                <p className="font-mono text-[10px] text-foreground-dim mt-0.5">
                  From a GitHub URL to an interactive knowledge graph — in under 10 seconds.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-3 text-foreground-dim hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Flow diagram */}
            <div style={{ height: 280 }}>
              <ReactFlow
                nodes={PIPELINE_NODES}
                edges={PIPELINE_EDGES}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                onNodeClick={handleNodeClick}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={true}
                zoomOnScroll={false}
                style={{ background: 'hsl(var(--background))' }}
              >
                <Background color="hsl(var(--border))" gap={20} size={0.5} />
              </ReactFlow>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 px-6 py-3 border-t border-border">
              {Object.entries(PHASE_COLORS).map(([phase, color]) => (
                <div key={phase} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="font-mono text-[9px] text-foreground-dim uppercase tracking-wider">{phase}</span>
                </div>
              ))}
              <span className="ml-auto font-mono text-[9px] text-foreground-dim">
                Drag to pan · Hover nodes for details
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
