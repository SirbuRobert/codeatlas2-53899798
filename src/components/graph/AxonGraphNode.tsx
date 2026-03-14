import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { AxonNode, NodeType } from '@/types/graph';
import { FileCode, Box, Cpu, Database, Globe, Layers, Zap } from 'lucide-react';

// ── Node type → visual config ──────────────────────────────────────────────

const NODE_CONFIGS: Record<NodeType, {
  color: string;
  bgColor: string;
  borderColor: string;
  Icon: React.ComponentType<{ className?: string }>;
  shape: 'rect' | 'hexagon' | 'diamond';
}> = {
  file: {
    color: '#00ffff',
    bgColor: 'rgba(0,255,255,0.08)',
    borderColor: 'rgba(0,255,255,0.4)',
    Icon: FileCode,
    shape: 'rect',
  },
  class: {
    color: '#a855f7',
    bgColor: 'rgba(168,85,247,0.08)',
    borderColor: 'rgba(168,85,247,0.4)',
    Icon: Box,
    shape: 'rect',
  },
  function: {
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.35)',
    Icon: Cpu,
    shape: 'rect',
  },
  module: {
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.08)',
    borderColor: 'rgba(59,130,246,0.35)',
    Icon: Layers,
    shape: 'rect',
  },
  service: {
    color: '#22c55e',
    bgColor: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.35)',
    Icon: Globe,
    shape: 'rect',
  },
  database: {
    color: '#ef4444',
    bgColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.4)',
    Icon: Database,
    shape: 'rect',
  },
  api: {
    color: '#06b6d4',
    bgColor: 'rgba(6,182,212,0.08)',
    borderColor: 'rgba(6,182,212,0.35)',
    Icon: Zap,
    shape: 'rect',
  },
};

const RISK_RING: Record<string, string> = {
  critical: 'rgba(239,68,68,0.7)',
  high: 'rgba(245,158,11,0.5)',
  medium: 'rgba(234,179,8,0.3)',
  low: 'transparent',
  none: 'transparent',
};

interface AxonNodeData extends AxonNode {
  isSelected?: boolean;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  isBlastSource?: boolean;
  isBlastImpacted?: boolean;
  // Security overlay
  isSecurityNode?: boolean;
  isAuthChain?: boolean;
  isExposed?: boolean;
}

const AxonGraphNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as AxonNodeData;
  const {
    type, label, metadata,
    isSelected, isHighlighted, isDimmed,
    isBlastSource, isBlastImpacted,
    isSecurityNode, isAuthChain, isExposed,
  } = nodeData;
  const config = NODE_CONFIGS[type] ?? NODE_CONFIGS.file;
  const { Icon } = config;

  const isHotspot = metadata.dependents >= 8 || metadata.complexity >= 15 || metadata.riskLevel === 'critical';
  const riskRingColor = RISK_RING[metadata.riskLevel] ?? 'transparent';

  const opacity = isDimmed ? 0.1 : 1;
  const scale = isBlastSource ? 1.15 : isSelected ? 1.08 : 1;

  // Security overrides take precedence in border color selection
  const borderColor = isExposed
    ? '#ef4444'
    : isSecurityNode
    ? '#a855f7'
    : isAuthChain
    ? 'rgba(168,85,247,0.45)'
    : isBlastSource
    ? '#ff4444'
    : isBlastImpacted
    ? '#f59e0b'
    : isSelected || isHighlighted
    ? config.color
    : config.borderColor;

  const bgColor = isExposed
    ? 'rgba(239,68,68,0.1)'
    : isSecurityNode
    ? 'rgba(168,85,247,0.12)'
    : isAuthChain
    ? 'rgba(168,85,247,0.06)'
    : isBlastSource
    ? 'rgba(239,68,68,0.12)'
    : isBlastImpacted
    ? 'rgba(245,158,11,0.08)'
    : config.bgColor;

  const nodeWidth = Math.max(120, Math.min(200, 80 + label.length * 6));

  return (
    <motion.div
      animate={{ opacity, scale }}
      transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
      style={{ width: nodeWidth }}
    >
      {/* Security node glow halo */}
      {isSecurityNode && !isDimmed && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: '0 0 0 2px rgba(168,85,247,0.6), 0 0 24px rgba(168,85,247,0.35)',
            borderRadius: '12px',
          }}
        />
      )}

      {/* Risk halo for critical nodes (when not in security overlay) */}
      {isHotspot && !isDimmed && !isSecurityNode && !isAuthChain && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: `0 0 0 2px ${riskRingColor}, 0 0 20px ${riskRingColor}`,
            borderRadius: '12px',
          }}
        />
      )}

      {/* Entry point badge */}
      {metadata.isEntryPoint && (
        <div
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0 rounded font-mono text-[8px] font-bold tracking-widest uppercase"
          style={{ backgroundColor: config.color, color: '#0a0c14', whiteSpace: 'nowrap' }}
        >
          ENTRY
        </div>
      )}

      {/* Orphan badge */}
      {metadata.isOrphan && (
        <div
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0 rounded font-mono text-[8px] font-bold tracking-widest uppercase"
          style={{ backgroundColor: '#6b7280', color: '#e5e7eb', whiteSpace: 'nowrap' }}
        >
          ORPHAN
        </div>
      )}

      {/* Main node card */}
      <div
        className="relative rounded-xl overflow-hidden transition-all duration-150"
        style={{
          background: bgColor,
          border: `1px solid ${borderColor}`,
          boxShadow: isSecurityNode
            ? `0 0 0 2px rgba(168,85,247,0.3), 0 8px 24px rgba(168,85,247,0.2)`
            : isSelected || isHighlighted
            ? `0 0 0 2px ${config.color}40, 0 8px 24px rgba(0,0,0,0.4)`
            : '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: isSecurityNode
              ? 'linear-gradient(90deg, transparent, #a855f7, transparent)'
              : `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
          }}
        />

        {/* Content */}
        <div className="px-3 py-2.5">
          {/* Type + label */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className="w-3 h-3 flex-shrink-0"
              style={{ color: isSecurityNode ? '#a855f7' : config.color, display: 'flex' }}
            >
              <Icon className="w-3 h-3" />
            </span>
            <span
              className="font-mono text-[11px] font-semibold leading-none truncate"
              style={{ color: '#e2e8f0' }}
            >
              {label}
            </span>
          </div>

          {/* Metrics row */}
          <div className="flex items-center gap-2">
            {/* LOC */}
            <span className="font-mono text-[9px]" style={{ color: '#64748b' }}>
              {metadata.loc}L
            </span>
            {/* Complexity bar */}
            <div className="flex items-center gap-1">
              <div className="w-12 h-1 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (metadata.complexity / 20) * 100)}%`,
                    background:
                      isSecurityNode
                        ? '#a855f7'
                        : metadata.complexity >= 15
                        ? '#ef4444'
                        : metadata.complexity >= 10
                        ? '#f59e0b'
                        : '#22c55e',
                  }}
                />
              </div>
            </div>
            {/* Dependents */}
            {metadata.dependents > 0 && (
              <span
                className="font-mono text-[9px] font-bold ml-auto"
                style={{ color: metadata.dependents >= 10 ? '#ef4444' : '#64748b' }}
              >
                ↑{metadata.dependents}
              </span>
            )}
          </div>

          {/* Coverage indicator */}
          {metadata.coverage < 60 && (
            <div className="mt-1.5 flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-warning" />
              <span className="font-mono text-[9px] text-warning">{metadata.coverage}% cov</span>
            </div>
          )}

          {/* Security chips */}
          {isSecurityNode && (
            <div className="mt-1.5">
              <span
                className="inline-block px-1.5 py-0 rounded font-mono text-[8px] font-bold"
                style={{ backgroundColor: 'rgba(168,85,247,0.2)', color: '#c084fc' }}
              >
                🔐 AUTH
              </span>
            </div>
          )}

          {isExposed && (
            <div className="mt-1.5">
              <span
                className="inline-block px-1.5 py-0 rounded font-mono text-[8px] font-bold"
                style={{ backgroundColor: 'rgba(239,68,68,0.18)', color: '#ef4444' }}
              >
                ⚠ EXPOSED
              </span>
            </div>
          )}

          {/* Existing flag chips (when no security overlay) */}
          {!isSecurityNode && !isExposed && metadata.flags.includes('single-point-of-failure') && (
            <div className="mt-1.5">
              <span
                className="inline-block px-1.5 py-0 rounded font-mono text-[8px] font-bold"
                style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
              >
                ⚠ SPOF
              </span>
            </div>
          )}
        </div>
      </div>

      {/* React Flow connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: isSecurityNode ? '#a855f7' : config.color, width: 6, height: 6, border: `1px solid ${isSecurityNode ? '#a855f780' : config.color + '80'}` }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: isSecurityNode ? '#a855f7' : config.color, width: 6, height: 6, border: `1px solid ${isSecurityNode ? '#a855f780' : config.color + '80'}` }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: isSecurityNode ? '#a855f7' : config.color, width: 4, height: 4 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: isSecurityNode ? '#a855f7' : config.color, width: 4, height: 4 }}
      />
    </motion.div>
  );
});

AxonGraphNode.displayName = 'AxonGraphNode';

export default AxonGraphNode;
