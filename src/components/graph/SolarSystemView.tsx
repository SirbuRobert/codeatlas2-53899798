// ═══════════════════════════════════════════════
//  AXON Solar System View — 3D Knowledge Graph
//  Core modules as planets, utilities as moons,
//  node size reflects dependency count.
// ═══════════════════════════════════════════════

import { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { AxonNode, CodebaseGraph, NodeType } from '@/types/graph';

// ── Color palette mirrors AxonGraphNode NODE_CONFIGS ──────────────────────
const NODE_COLORS: Record<NodeType, string> = {
  file:     '#00ffff',
  class:    '#a855f7',
  function: '#f59e0b',
  module:   '#3b82f6',
  service:  '#22c55e',
  database: '#ef4444',
  api:      '#06b6d4',
};

const RISK_EMISSIVE: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#eab308',
  low:      '#22c55e',
  none:     '#334155',
};

// ── Layout ─────────────────────────────────────────────────────────────────

interface SolarBody {
  node: AxonNode;
  role: 'sun' | 'planet' | 'moon' | 'asteroid';
  orbitRadius: number;
  orbitAngle: number;        // initial angle (radians)
  orbitSpeed: number;        // radians per second
  orbitParentId: string | null;
  size: number;
  color: string;
}

function buildSolarLayout(graph: CodebaseGraph): SolarBody[] {
  const { nodes, edges } = graph;
  if (nodes.length === 0) return [];

  // Find the "sun" — highest gravity score
  const gravityScore = (n: AxonNode) =>
    n.metadata.dependents * 3 + n.metadata.dependencies * 1.5 + n.metadata.loc / 200;

  const sorted = [...nodes].sort((a, b) => {
    const diff = gravityScore(b) - gravityScore(a);
    if (Math.abs(diff) < 1) {
      // Tie-break: prefer service > module > file
      const rank = (n: AxonNode) =>
        n.type === 'service' ? 3 : n.type === 'module' ? 2 : n.metadata.isEntryPoint ? 1 : 0;
      return rank(b) - rank(a);
    }
    return diff;
  });

  const sun = sorted[0];
  const sunId = sun.id;

  // Adjacency set for sun
  const sunNeighbors = new Set<string>(
    edges
      .filter(e => e.source === sunId || e.target === sunId)
      .map(e => (e.source === sunId ? e.target : e.source))
  );

  // Build adjacency map (all)
  const adjMap = new Map<string, Set<string>>();
  for (const n of nodes) adjMap.set(n.id, new Set());
  for (const e of edges) {
    adjMap.get(e.source)?.add(e.target);
    adjMap.get(e.target)?.add(e.source);
  }

  // Classify each node
  const roleMap = new Map<string, 'sun' | 'planet' | 'moon' | 'asteroid'>();
  roleMap.set(sunId, 'sun');

  // Planets: direct sun neighbors (up to 12 — split across 3 orbit rings)
  const planetCandidates = [...sunNeighbors]
    .filter(id => id !== sunId)
    .map(id => nodes.find(n => n.id === id)!)
    .filter(Boolean)
    .sort((a, b) => b.metadata.dependents - a.metadata.dependents);

  const planets = planetCandidates.slice(0, 12);
  const planetIds = new Set(planets.map(p => p.id));
  planets.forEach(p => roleMap.set(p.id, 'planet'));

  // Moon parent map
  const moonParent = new Map<string, string>();

  // Moons: connected to a planet but not the sun
  for (const n of nodes) {
    if (roleMap.has(n.id)) continue;
    const neighbors = adjMap.get(n.id) ?? new Set();
    let parentPlanetId: string | null = null;
    for (const nid of neighbors) {
      if (planetIds.has(nid)) { parentPlanetId = nid; break; }
    }
    if (parentPlanetId) {
      roleMap.set(n.id, 'moon');
      moonParent.set(n.id, parentPlanetId);
    } else {
      roleMap.set(n.id, 'asteroid');
    }
  }

  const maxDependents = Math.max(1, ...nodes.map(n => n.metadata.dependents));

  function planetSize(n: AxonNode) {
    return 0.3 + (n.metadata.dependents / maxDependents) * 0.9;
  }

  const bodies: SolarBody[] = [];

  // ── Sun ──
  bodies.push({
    node: sun,
    role: 'sun',
    orbitRadius: 0,
    orbitAngle: 0,
    orbitSpeed: 0,
    orbitParentId: null,
    size: 1.5,
    color: NODE_COLORS[sun.type] ?? '#22c55e',
  });

  // ── Planets across 3 rings ──
  const RING_RADII = [4, 7, 10];
  const RING_CAPS = [4, 4, 4]; // max planets per ring

  let ringIdx = 0;
  let ringCount = 0;
  for (let i = 0; i < planets.length; i++) {
    if (ringCount >= RING_CAPS[ringIdx] && ringIdx < 2) { ringIdx++; ringCount = 0; }
    const totalInRing = Math.min(RING_CAPS[ringIdx], planets.length - i + ringCount);
    const angle = (ringCount / totalInRing) * Math.PI * 2;
    const p = planets[i];
    bodies.push({
      node: p,
      role: 'planet',
      orbitRadius: RING_RADII[ringIdx],
      orbitAngle: angle,
      orbitSpeed: 0.08 / RING_RADII[ringIdx], // outer orbits slower
      orbitParentId: sunId,
      size: planetSize(p),
      color: NODE_COLORS[p.type] ?? '#3b82f6',
    });
    ringCount++;
  }

  // ── Moons ──
  // Group moons by parent, spread them around parent
  const moonsByParent = new Map<string, AxonNode[]>();
  for (const [id, parentId] of moonParent) {
    const n = nodes.find(nn => nn.id === id)!;
    if (!moonsByParent.has(parentId)) moonsByParent.set(parentId, []);
    moonsByParent.get(parentId)!.push(n);
  }
  for (const [parentId, moons] of moonsByParent) {
    const count = Math.min(moons.length, 5); // cap per planet
    for (let i = 0; i < count; i++) {
      const m = moons[i];
      const angle = (i / count) * Math.PI * 2;
      bodies.push({
        node: m,
        role: 'moon',
        orbitRadius: 1.4 + (i % 2) * 0.3,
        orbitAngle: angle,
        orbitSpeed: 0.4 + i * 0.05,
        orbitParentId: parentId,
        size: 0.18 + (m.metadata.dependencies / 10) * 0.12,
        color: NODE_COLORS[m.type] ?? '#64748b',
      });
    }
  }

  // ── Asteroid belt ──
  const asteroids = nodes.filter(n => roleMap.get(n.id) === 'asteroid');
  asteroids.forEach((a, i) => {
    const angle = (i / Math.max(1, asteroids.length)) * Math.PI * 2;
    const r = 13 + (i % 3) * 0.8;
    bodies.push({
      node: a,
      role: 'asteroid',
      orbitRadius: r,
      orbitAngle: angle,
      orbitSpeed: 0.02,
      orbitParentId: sunId,
      size: 0.12,
      color: '#475569',
    });
  });

  return bodies;
}

// ── Orbit Ring ─────────────────────────────────────────────────────────────

function OrbitRing({ radius, y = 0 }: { radius: number; y?: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push([Math.cos(a) * radius, y, Math.sin(a) * radius]);
    }
    return pts;
  }, [radius, y]);

  return (
    <Line
      points={points}
      color="#334155"
      lineWidth={0.5}
      transparent
      opacity={0.35}
    />
  );
}

// ── Sun Node ───────────────────────────────────────────────────────────────

function SunBody({
  body,
  isSelected,
  onClick,
}: {
  body: SolarBody;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const color = body.color;

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Sun glow corona */}
      <mesh>
        <sphereGeometry args={[body.size * 1.6, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} />
      </mesh>
      <mesh>
        <sphereGeometry args={[body.size * 1.3, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>

      {/* Sun sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        scale={hovered || isSelected ? 1.15 : 1}
      >
        <sphereGeometry args={[body.size, 48, 48]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 2.5 : 1.8}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Inner point light */}
      <pointLight color={color} intensity={6} distance={20} decay={2} />

      {/* Label */}
      <Html
        center
        position={[0, body.size + 0.4, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            fontWeight: 'bold',
            color: color,
            whiteSpace: 'nowrap',
            textShadow: `0 0 8px ${color}`,
            opacity: hovered || isSelected ? 1 : 0.8,
            letterSpacing: '0.08em',
          }}
        >
          ☀ {body.node.label}
        </div>
      </Html>
    </group>
  );
}

// ── Planet / Moon Body ─────────────────────────────────────────────────────

function OrbitingBody({
  body,
  parentPosition,
  isSelected,
  onClick,
  autoRotate,
}: {
  body: SolarBody;
  parentPosition: THREE.Vector3;
  isSelected: boolean;
  onClick: () => void;
  autoRotate: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const angleRef = useRef(body.orbitAngle);

  const isMoon = body.role === 'moon';
  const isCritical = body.node.metadata.riskLevel === 'critical';
  const color = body.color;
  const riskColor = RISK_EMISSIVE[body.node.metadata.riskLevel] ?? '#334155';

  useFrame((_, delta) => {
    if (!autoRotate && !isMoon) return; // moons always orbit
    angleRef.current += delta * body.orbitSpeed * (autoRotate ? 1 : 0.2);
    if (groupRef.current) {
      groupRef.current.position.set(
        parentPosition.x + Math.cos(angleRef.current) * body.orbitRadius,
        parentPosition.y,
        parentPosition.z + Math.sin(angleRef.current) * body.orbitRadius
      );
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  const initPos = useMemo(() => new THREE.Vector3(
    parentPosition.x + Math.cos(body.orbitAngle) * body.orbitRadius,
    parentPosition.y,
    parentPosition.z + Math.sin(body.orbitAngle) * body.orbitRadius
  ), [parentPosition, body.orbitAngle, body.orbitRadius]);

  const scale = hovered || isSelected ? 1.25 : 1;

  return (
    <group ref={groupRef} position={initPos}>
      {/* Critical risk ring */}
      {isCritical && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[body.size * 1.5, 0.04, 8, 64]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Glow */}
      {!isMoon && (
        <mesh>
          <sphereGeometry args={[body.size * 1.4, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.07} />
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
        <sphereGeometry args={[body.size, isMoon ? 16 : 32, isMoon ? 16 : 32]} />
        <meshStandardMaterial
          color={color}
          emissive={isCritical ? riskColor : color}
          emissiveIntensity={hovered || isSelected ? 1.2 : isMoon ? 0.3 : 0.6}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>

      {/* Label — only for planets and on hover for moons */}
      {(!isMoon || hovered) && (
        <Html
          center
          position={[0, body.size + (isMoon ? 0.2 : 0.35), 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: isMoon ? '8px' : '9px',
              color: hovered || isSelected ? color : '#94a3b8',
              whiteSpace: 'nowrap',
              textShadow: hovered ? `0 0 6px ${color}` : 'none',
              opacity: hovered || isSelected ? 1 : 0.7,
              letterSpacing: '0.05em',
            }}
          >
            {body.node.label}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Tooltip overlay ────────────────────────────────────────────────────────

function NodeTooltip({ node, color }: { node: AxonNode; color: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10,12,20,0.92)',
        border: `1px solid ${color}40`,
        borderRadius: 8,
        padding: '8px 14px',
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#e2e8f0',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(8px)',
        boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px ${color}20`,
        zIndex: 100,
      }}
    >
      <span style={{ color, fontWeight: 'bold', marginRight: 6 }}>{node.type.toUpperCase()}</span>
      {node.label}
      <span style={{ color: '#64748b', marginLeft: 8 }}>
        ↑{node.metadata.dependents} deps · {node.metadata.loc}L · {node.metadata.riskLevel}
      </span>
    </div>
  );
}

// ── Scene ──────────────────────────────────────────────────────────────────

function Scene({
  bodies,
  selectedNodeId,
  onNodeSelect,
}: {
  bodies: SolarBody[];
  selectedNodeId: string | null;
  onNodeSelect: (node: AxonNode | null) => void;
}) {
  const [userInteracting, setUserInteracting] = useState(false);
  const { gl } = useThree();

  // Build a lookup: bodyId → world position (updated each frame by OrbitingBody)
  // For parent lookup we use static initial positions
  const planetPositions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    map.set('__sun__', new THREE.Vector3(0, 0, 0));

    for (const b of bodies) {
      if (b.role === 'planet' || b.role === 'asteroid') {
        map.set(b.node.id, new THREE.Vector3(
          Math.cos(b.orbitAngle) * b.orbitRadius,
          0,
          Math.sin(b.orbitAngle) * b.orbitRadius
        ));
      }
    }
    return map;
  }, [bodies]);

  const sunBody = bodies.find(b => b.role === 'sun');
  const sunPos = new THREE.Vector3(0, 0, 0);

  // Unique orbit radii for rings
  const planetRings = useMemo(
    () => [...new Set(bodies.filter(b => b.role === 'planet').map(b => b.orbitRadius))],
    [bodies]
  );
  const asteroidRing = useMemo(
    () => bodies.some(b => b.role === 'asteroid') ? 13 : null,
    [bodies]
  );

  return (
    <>
      {/* Background */}
      <Stars radius={80} depth={60} count={3000} factor={4} saturation={0.3} fade speed={0.5} />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={0.4} color="#e2e8f0" />

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={35}
        autoRotate={!userInteracting}
        autoRotateSpeed={0.4}
        onStart={() => setUserInteracting(true)}
        onEnd={() => setTimeout(() => setUserInteracting(false), 3000)}
        makeDefault
      />

      {/* Orbit rings for planets */}
      {planetRings.map(r => (
        <OrbitRing key={r} radius={r} />
      ))}
      {asteroidRing && <OrbitRing radius={asteroidRing} />}
      {asteroidRing && <OrbitRing radius={asteroidRing + 0.8} />}
      {asteroidRing && <OrbitRing radius={asteroidRing + 1.6} />}

      {/* Sun */}
      {sunBody && (
        <SunBody
          body={sunBody}
          isSelected={selectedNodeId === sunBody.node.id}
          onClick={() => onNodeSelect(sunBody.node)}
        />
      )}

      {/* Planets, moons, asteroids */}
      {bodies
        .filter(b => b.role !== 'sun')
        .map(b => {
          const parentPos =
            b.orbitParentId === sunBody?.node.id || b.orbitParentId === null
              ? sunPos
              : (planetPositions.get(b.orbitParentId!) ?? sunPos);

          return (
            <OrbitingBody
              key={b.node.id}
              body={b}
              parentPosition={parentPos}
              isSelected={selectedNodeId === b.node.id}
              onClick={() => onNodeSelect(b.node)}
              autoRotate={!userInteracting}
            />
          );
        })}
    </>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────

interface SolarSystemViewProps {
  graph: CodebaseGraph;
  selectedNodeId: string | null;
  onNodeSelect: (node: AxonNode | null) => void;
}

export default function SolarSystemView({
  graph,
  selectedNodeId,
  onNodeSelect,
}: SolarSystemViewProps) {
  const bodies = useMemo(() => buildSolarLayout(graph), [graph]);
  const selectedBody = bodies.find(b => b.node.id === selectedNodeId);

  const handleCanvasClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  if (bodies.length === 0) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-foreground-dim text-xs">
        No graph data to render
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#020408]">
      <Canvas
        camera={{ position: [0, 8, 18], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
        onClick={handleCanvasClick}
        style={{ background: '#020408' }}
      >
        <Scene
          bodies={bodies}
          selectedNodeId={selectedNodeId}
          onNodeSelect={onNodeSelect}
        />
      </Canvas>

      {/* HUD overlay */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          fontFamily: 'monospace',
          fontSize: 10,
          color: '#475569',
          pointerEvents: 'none',
          letterSpacing: '0.08em',
        }}
      >
        <div>☀ SUN — gravity center</div>
        <div>◉ PLANET — direct dependency</div>
        <div>· MOON — indirect dependency</div>
        <div style={{ marginTop: 4, color: '#ef4444' }}>⊕ RED RING — critical risk</div>
        <div style={{ marginTop: 6, color: '#334155' }}>DRAG · SCROLL · CLICK</div>
      </div>

      {/* Node count badge */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          fontFamily: 'monospace',
          fontSize: 10,
          color: '#334155',
          pointerEvents: 'none',
        }}
      >
        {bodies.length} bodies · {graph.edges.length} connections
      </div>

      {/* Selected node tooltip */}
      {selectedBody && (
        <NodeTooltip node={selectedBody.node} color={selectedBody.color} />
      )}
    </div>
  );
}
