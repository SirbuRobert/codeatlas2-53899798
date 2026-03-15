// ═══════════════════════════════════════════════
//  AXON 3D Force Graph — Real dependency web
//  All nodes connected via spring physics,
//  edges rendered as glowing lines.
//  Full feature parity: blast radius, security,
//  ghost city (orphans), search, tour focus.
// ═══════════════════════════════════════════════

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls, Html, Line } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { AxonNode, AxonEdge, CodebaseGraph, NodeType } from '@/types/graph';
import { calculateBlastRadius } from '@/types/graph';
import type { SecurityAnalysis } from '@/lib/securityAnalysis';

// ── Color palette ─────────────────────────────────────────────────────────
const NODE_COLORS: Record<NodeType, string> = {
  file:     '#00ffff',
  class:    '#a855f7',
  function: '#f59e0b',
  module:   '#3b82f6',
  service:  '#22c55e',
  database: '#ef4444',
  api:      '#06b6d4',
};

const EDGE_COLORS: Record<string, string> = {
  imports:  '#2d4a6a',
  calls:    '#1e4a7a',
  inherits: '#4a2a6a',
  composes: '#1a4a2a',
  queries:  '#4a1a4a',
  exposes:  '#1a4a4a',
};

const RISK_EMISSIVE: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#eab308',
  low:      '#22c55e',
  none:     '#334155',
};

// ── Force-directed layout ─────────────────────────────────────────────────

interface NodeState {
  id: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  mass: number;
}

function buildInitialLayout(nodes: AxonNode[]): NodeState[] {
  return nodes.map((n, i) => {
    // Fibonacci sphere distribution for nice initial spread
    const phi = Math.acos(1 - 2 * (i + 0.5) / nodes.length);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 12 + Math.random() * 6;
    return {
      id: n.id,
      pos: new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      ),
      vel: new THREE.Vector3(0, 0, 0),
      mass: 1 + n.metadata.dependents * 0.1,
    };
  });
}

// Run N ticks of force simulation on CPU, returns stable positions
function runForceSimulation(
  nodes: AxonNode[],
  edges: AxonEdge[],
  ticks = 120,
): Map<string, THREE.Vector3> {
  const states = buildInitialLayout(nodes);
  const idxById = new Map(states.map((s, i) => [s.id, i]));

  const REPULSION = 80;
  const SPRING_LEN = 4.5;
  const SPRING_K = 0.04;
  const DAMPING = 0.82;
  const DT = 0.5;
  const CENTER_K = 0.008;

  const tmpForce = new THREE.Vector3();

  for (let tick = 0; tick < ticks; tick++) {
    // Reset forces
    for (const s of states) {
      s.vel.multiplyScalar(DAMPING);
    }

    // Repulsion between all pairs (Barnes-Hut approximation: just O(n²) for ≤300 nodes)
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const a = states[i];
        const b = states[j];
        tmpForce.subVectors(a.pos, b.pos);
        const dist = Math.max(tmpForce.length(), 0.5);
        const force = REPULSION / (dist * dist);
        tmpForce.normalize().multiplyScalar(force);
        a.vel.addScaledVector(tmpForce, DT / a.mass);
        b.vel.addScaledVector(tmpForce, -DT / b.mass);
      }
    }

    // Spring attraction along edges
    for (const edge of edges) {
      const ai = idxById.get(edge.source);
      const bi = idxById.get(edge.target);
      if (ai == null || bi == null) continue;
      const a = states[ai];
      const b = states[bi];
      tmpForce.subVectors(b.pos, a.pos);
      const dist = Math.max(tmpForce.length(), 0.1);
      const spring = (dist - SPRING_LEN) * SPRING_K * edge.strength;
      tmpForce.normalize().multiplyScalar(spring);
      a.vel.addScaledVector(tmpForce, DT / a.mass);
      b.vel.addScaledVector(tmpForce, -DT / b.mass);
    }

    // Weak centering gravity
    for (const s of states) {
      s.vel.addScaledVector(s.pos, -CENTER_K * DT);
    }

    // Integrate
    for (const s of states) {
      s.pos.addScaledVector(s.vel, DT);
    }
  }

  return new Map(states.map(s => [s.id, s.pos.clone()]));
}

// ── Live wave particles along edges ───────────────────────────────────────

function WaveParticle({
  fromPos, toPos, color, stagger,
}: {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  color: string;
  stagger: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const tRef = useRef(stagger);

  useFrame((_, delta) => {
    tRef.current = (tRef.current + delta * 0.45) % 1;
    if (meshRef.current) {
      meshRef.current.position.lerpVectors(fromPos, toPos, tRef.current);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.06, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
}

// ── Edge line ──────────────────────────────────────────────────────────────

function EdgeLine({
  from, to, color, opacity, highlighted, animated, selectedNodeId, edge,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  opacity: number;
  highlighted: boolean;
  animated: boolean;
  selectedNodeId: string | null;
  edge: AxonEdge;
}) {
  const points = useMemo<[number, number, number][]>(
    () => [[from.x, from.y, from.z], [to.x, to.y, to.z]],
    [from, to]
  );

  const lineColor = highlighted ? '#00ffff' : color;
  const lineWidth = highlighted ? 1.5 : 0.5;
  const lineOpacity = highlighted ? 0.9 : opacity;

  return (
    <group>
      <Line
        points={points}
        color={lineColor}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />
      {animated && (
        <>
          {[0, 0.4, 0.8].map((s, i) => (
            <WaveParticle
              key={i}
              fromPos={from}
              toPos={to}
              color="#00ffff"
              stagger={s}
            />
          ))}
        </>
      )}
    </group>
  );
}

// ── Node sphere ────────────────────────────────────────────────────────────

function NodeSphere({
  node,
  position,
  size,
  color,
  isSelected,
  isDimmed,
  isOrphan,
  isSecurityNode,
  isExposed,
  isBlastSource,
  isBlastImpacted,
  isTourFocus,
  isSearchMatch,
  onClick,
  positionsRef,
}: {
  node: AxonNode;
  position: THREE.Vector3;
  size: number;
  color: string;
  isSelected: boolean;
  isDimmed: boolean;
  isOrphan: boolean;
  isSecurityNode: boolean;
  isExposed: boolean;
  isBlastSource: boolean;
  isBlastImpacted: boolean;
  isTourFocus: boolean;
  isSearchMatch: boolean;
  onClick: () => void;
  positionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const pulseHaloRef = useRef<THREE.Mesh>(null!);
  const pulseT = useRef(Math.random() * Math.PI * 2);
  const [hovered, setHovered] = useState(false);
  const isCritical = node.metadata.riskLevel === 'critical';
  const isEntryPoint = !!node.metadata.isEntryPoint;

  const effectiveColor = isExposed
    ? '#ef4444'
    : isSecurityNode
    ? '#a855f7'
    : isOrphan
    ? '#475569'
    : color;

  const riskColor = RISK_EMISSIVE[node.metadata.riskLevel] ?? '#334155';

  // Register position once
  useEffect(() => {
    positionsRef.current.set(node.id, position.clone());
  }, [node.id, position, positionsRef]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.25;
    }
    if (pulseHaloRef.current && (isEntryPoint || isCritical) && !isDimmed) {
      pulseT.current += delta * 0.9;
      const s = 1.0 + Math.sin(pulseT.current) * 0.18;
      pulseHaloRef.current.scale.setScalar(s);
      (pulseHaloRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.22 + Math.sin(pulseT.current) * 0.14;
    }
  });

  const scale = hovered || isSelected ? 1.3 : isSearchMatch ? 1.15 : 1;
  const opacity = isDimmed ? 0.12 : 1;

  const showLabel = hovered || isSelected || isTourFocus || isSearchMatch;

  return (
    <group position={position}>
      {/* Tour focus ring */}
      {isTourFocus && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 2.2, 0.07, 8, 64]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.9} />
        </mesh>
      )}
      {/* Search match ring */}
      {isSearchMatch && !isDimmed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 1.9, 0.05, 8, 64]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
        </mesh>
      )}
      {/* Critical risk ring */}
      {isCritical && !isOrphan && !isDimmed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 1.6, 0.04, 8, 64]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
        </mesh>
      )}
      {/* Blast source */}
      {isBlastSource && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 2.0, 0.06, 8, 64]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.85} />
        </mesh>
      )}
      {/* Blast impacted */}
      {isBlastImpacted && !isBlastSource && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 1.7, 0.05, 8, 64]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.65} />
        </mesh>
      )}
      {/* Security */}
      {isSecurityNode && !isDimmed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 1.7, 0.05, 8, 64]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.75} />
        </mesh>
      )}
      {/* Exposed API */}
      {isExposed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 1.8, 0.06, 8, 64]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.75} />
        </mesh>
      )}
      {/* Orphan dashed ring */}
      {isOrphan && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 1.5, 0.03, 6, 12]} />
          <meshBasicMaterial color="#475569" transparent opacity={0.65} />
        </mesh>
      )}

      {/* Outer aura halo */}
      {!isOrphan && !isDimmed && (
        <mesh>
          <sphereGeometry args={[size * 2.8, 10, 10]} />
          <meshBasicMaterial color={effectiveColor} transparent opacity={0.07} />
        </mesh>
      )}

      {/* Glow halo */}
      {!isOrphan && !isDimmed && (
        <mesh>
          <sphereGeometry args={[size * 1.8, 12, 12]} />
          <meshBasicMaterial color={effectiveColor} transparent opacity={0.35} />
        </mesh>
      )}

      {/* Pulse halo — entry-point (cyan) or critical (red) */}
      {(isEntryPoint || isCritical) && !isDimmed && (
        <mesh ref={pulseHaloRef}>
          <sphereGeometry args={[size * 2.2, 12, 12]} />
          <meshBasicMaterial
            color={isCritical ? '#ef4444' : '#00ffff'}
            transparent
            opacity={0.22}
          />
        </mesh>
      )}

      {/* Main sphere */}
      <mesh
        ref={meshRef}
        scale={scale}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 28, 28]} />
        <meshBasicMaterial
          color={effectiveColor}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Label */}
      {showLabel && !isDimmed && (
        <Html center position={[0, size + 0.55, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            fontWeight: 'bold',
            color: effectiveColor,
            whiteSpace: 'nowrap',
            textShadow: `0 0 8px ${effectiveColor}`,
            letterSpacing: '0.06em',
            background: 'rgba(0,0,0,0.55)',
            padding: '2px 6px',
            borderRadius: 4,
            border: `1px solid ${effectiveColor}44`,
          }}>
            {node.metadata.isOrphan ? '👻 ' : ''}{node.label}
            {node.metadata.isEntryPoint && (
              <span style={{ color: '#00ffff', marginLeft: 5 }}>ENTRY</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Scene ──────────────────────────────────────────────────────────────────

function ForceScene({
  graph,
  selectedNodeId,
  blastRadiusNodeId,
  onNodeSelect,
  securityOverlay,
  searchHighlightIds,
  ghostMode,
  tourFocusNodeId,
  stablePositions,
}: {
  graph: CodebaseGraph;
  selectedNodeId: string | null;
  blastRadiusNodeId: string | null;
  onNodeSelect: (node: AxonNode | null) => void;
  securityOverlay: SecurityAnalysis | null;
  searchHighlightIds: Set<string>;
  ghostMode: boolean;
  tourFocusNodeId: string | null;
  stablePositions: Map<string, THREE.Vector3>;
}) {
  const positionsRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const { camera } = useThree();

  // Camera pull toward tour focus
  useEffect(() => {
    if (!tourFocusNodeId) return;
    const pos = stablePositions.get(tourFocusNodeId);
    if (!pos) return;
    const dir = pos.clone().normalize();
    const target = pos.clone().add(dir.multiplyScalar(8));
    camera.position.lerp(target, 0.04);
  });

  // Blast radius sets
  const blastSets = useMemo(() => {
    if (!blastRadiusNodeId) return null;
    return calculateBlastRadius(blastRadiusNodeId, graph.edges, { depth: 3 });
  }, [blastRadiusNodeId, graph.edges]);

  // Node sizing
  const maxDependents = useMemo(
    () => Math.max(1, ...graph.nodes.map(n => n.metadata.dependents)),
    [graph.nodes]
  );

  const nodeSize = useCallback(
    (n: AxonNode) => 0.22 + (n.metadata.dependents / maxDependents) * 0.65,
    [maxDependents]
  );

  // Which edges to show
  const visibleEdges = useMemo(() => {
    if (blastRadiusNodeId && blastSets) {
      const ids = new Set([blastRadiusNodeId, ...blastSets.all]);
      return graph.edges.filter(e => ids.has(e.source) && ids.has(e.target));
    }
    if (searchHighlightIds.size > 0) {
      return graph.edges.filter(
        e => searchHighlightIds.has(e.source) && searchHighlightIds.has(e.target)
      );
    }
    return graph.edges;
  }, [graph.edges, blastRadiusNodeId, blastSets, searchHighlightIds]);

  // Dim logic
  const isDimmed = useCallback((id: string) => {
    if (ghostMode) return !graph.nodes.find(n => n.id === id)?.metadata.isOrphan;
    if (blastRadiusNodeId && blastSets) {
      return id !== blastRadiusNodeId && !blastSets.all.has(id);
    }
    if (searchHighlightIds.size > 0) return !searchHighlightIds.has(id);
    if (securityOverlay) {
      return (
        !securityOverlay.authChainIds.has(id) &&
        !securityOverlay.exposedApiIds.has(id) &&
        !securityOverlay.securityNodeIds.has(id)
      );
    }
    return false;
  }, [ghostMode, blastRadiusNodeId, blastSets, searchHighlightIds, securityOverlay, graph.nodes]);

  return (
    <>
      <Stars radius={80} depth={50} count={4000} factor={3} saturation={0} fade speed={0.4} />
      <ambientLight intensity={3.5} />
      <pointLight position={[0, 0, 0]} intensity={15} color="#ffffff" distance={200} decay={1.0} />
      <pointLight position={[0, 40, 0]} intensity={8} color="#ffffff" distance={150} decay={1.0} />
      <pointLight position={[0, -40, 0]} intensity={8} color="#ffffff" distance={150} decay={1.0} />
      <pointLight position={[40, 0, 40]} intensity={8} color="#ffffff" distance={150} decay={1.0} />
      <pointLight position={[-40, 0, -40]} intensity={8} color="#ffffff" distance={150} decay={1.0} />

      {/* Edges */}
      {visibleEdges.map((edge) => {
        const fromPos = stablePositions.get(edge.source);
        const toPos = stablePositions.get(edge.target);
        if (!fromPos || !toPos) return null;

        const isHighlighted =
          (blastSets && (blastSets.all.has(edge.source) || blastSets.all.has(edge.target))) ||
          (searchHighlightIds.size > 0 && searchHighlightIds.has(edge.source) && searchHighlightIds.has(edge.target)) ||
          (selectedNodeId != null && (edge.source === selectedNodeId || edge.target === selectedNodeId));

        const dimEdge =
          (blastRadiusNodeId && blastSets && !blastSets.all.has(edge.source) && !blastSets.all.has(edge.target)) ||
          (searchHighlightIds.size > 0 && !searchHighlightIds.has(edge.source) && !searchHighlightIds.has(edge.target));

        const baseColor = securityOverlay
          ? '#6b21a8'
          : EDGE_COLORS[edge.relation] ?? '#1e293b';

        return (
          <EdgeLine
            key={edge.id}
            from={fromPos}
            to={toPos}
            color={baseColor}
            opacity={dimEdge ? 0.04 : isHighlighted ? 1 : 0.45}
            highlighted={!!isHighlighted}
            animated={
              selectedNodeId != null &&
              (edge.source === selectedNodeId || edge.target === selectedNodeId)
            }
            selectedNodeId={selectedNodeId}
            edge={edge}
          />
        );
      })}

      {/* Nodes */}
      {graph.nodes.map((node) => {
        const pos = stablePositions.get(node.id);
        if (!pos) return null;

        const dimmed = isDimmed(node.id);
        const isOrphan = !!node.metadata.isOrphan;
        const isBlastSource = node.id === blastRadiusNodeId;
        const isBlastImpacted = !!(blastSets?.all.has(node.id));
        const isSecurityNode = !!(
          securityOverlay &&
          (securityOverlay.authChainIds.has(node.id) || securityOverlay.securityNodeIds.has(node.id))
        );
        const isExposed = !!(securityOverlay?.exposedApiIds.has(node.id));
        const isSearchMatch = searchHighlightIds.size > 0 && searchHighlightIds.has(node.id);

        return (
          <NodeSphere
            key={node.id}
            node={node}
            position={pos}
            size={nodeSize(node)}
            color={NODE_COLORS[node.type] ?? '#00ffff'}
            isSelected={selectedNodeId === node.id}
            isDimmed={dimmed}
            isOrphan={isOrphan}
            isSecurityNode={isSecurityNode}
            isExposed={isExposed}
            isBlastSource={isBlastSource}
            isBlastImpacted={isBlastImpacted}
            isTourFocus={tourFocusNodeId === node.id}
            isSearchMatch={isSearchMatch}
            onClick={() => onNodeSelect(node)}
            positionsRef={positionsRef}
          />
        );
      })}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={100}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </>
  );
}

// ── Loading spinner ────────────────────────────────────────────────────────

function Spinner() {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 1.5;
  });
  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[1.2, 0.08, 12, 60]} />
      <meshBasicMaterial color="#00ffff" transparent opacity={0.7} />
    </mesh>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────

function Legend({ graph }: { graph: CodebaseGraph }) {
  const types = useMemo(() => {
    const seen = new Set<NodeType>();
    graph.nodes.forEach(n => seen.add(n.type));
    return [...seen];
  }, [graph.nodes]);

  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-1 pointer-events-none">
      {types.map(t => (
        <div key={t} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS[t] }} />
          <span className="font-mono text-[9px] capitalize" style={{ color: NODE_COLORS[t] }}>{t}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stats HUD overlay ──────────────────────────────────────────────────────

function InfoBar({ graph }: { graph: CodebaseGraph }) {
  return (
    <div className="absolute bottom-4 right-4 font-mono text-[9px] text-foreground-dim pointer-events-none text-right space-y-0.5">
      <div>{graph.nodes.length} nodes · {graph.edges.length} edges</div>
      <div style={{ color: '#475569' }}>drag to rotate · scroll to zoom · click node to inspect</div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

interface SolarSystemViewProps {
  graph: CodebaseGraph;
  selectedNodeId: string | null;
  onNodeSelect: (node: AxonNode | null) => void;
  blastRadiusNodeId?: string | null;
  securityOverlay?: SecurityAnalysis | null;
  searchHighlightIds?: Set<string>;
  ghostMode?: boolean;
  tourFocusNodeId?: string | null;
}

export default function SolarSystemView({
  graph,
  selectedNodeId,
  onNodeSelect,
  blastRadiusNodeId = null,
  securityOverlay = null,
  searchHighlightIds = new Set(),
  ghostMode = false,
  tourFocusNodeId = null,
}: SolarSystemViewProps) {
  const [ready, setReady] = useState(false);
  const [stablePositions, setStablePositions] = useState<Map<string, THREE.Vector3>>(new Map());

  // Run force simulation once when graph changes
  useEffect(() => {
    setReady(false);
    const id = requestAnimationFrame(() => {
      const positions = runForceSimulation(graph.nodes, graph.edges, 150);
      setStablePositions(positions);
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, [graph.nodes, graph.edges]);

  if (graph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-foreground-dim text-xs">
        No nodes to display
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-background">
      <Canvas
        camera={{ position: [0, 12, 32], fov: 55, near: 0.1, far: 300 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        {!ready ? (
          <>
            <Stars radius={80} depth={50} count={1500} factor={3} saturation={0} fade speed={0.3} />
            <ambientLight intensity={0.3} />
            <Spinner />
            <OrbitControls makeDefault enableDamping />
          </>
        ) : (
          <ForceScene
            graph={graph}
            selectedNodeId={selectedNodeId}
            blastRadiusNodeId={blastRadiusNodeId}
            onNodeSelect={onNodeSelect}
            securityOverlay={securityOverlay}
            searchHighlightIds={searchHighlightIds}
            ghostMode={ghostMode}
            tourFocusNodeId={tourFocusNodeId}
            stablePositions={stablePositions}
          />
        )}
      </Canvas>

      {/* Overlays */}
      <Legend graph={graph} />
      <InfoBar graph={graph} />

      {/* Loading state */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="font-mono text-[11px] text-cyan animate-pulse tracking-widest">
            COMPUTING 3D LAYOUT…
          </div>
        </div>
      )}

      {/* Mode badge */}
      <div className="absolute top-3 right-4 flex items-center gap-1.5 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
        <span className="font-mono text-[9px] text-foreground-dim tracking-widest">3D FORCE GRAPH</span>
      </div>
    </div>
  );
}
