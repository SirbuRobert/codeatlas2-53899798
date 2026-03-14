// ═══════════════════════════════════════════════
//  AXON Solar System View — 3D Knowledge Graph
//  Full feature parity: blast radius, security,
//  ghost city (orphans), NL search, tour focus.
// ═══════════════════════════════════════════════

import { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { AxonNode, CodebaseGraph, NodeType } from '@/types/graph';
import { calculateBlastRadius } from '@/types/graph';
import type { SecurityAnalysis } from '@/lib/securityAnalysis';

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
  orbitAngle: number;
  orbitSpeed: number;
  orbitParentId: string | null;
  size: number;
  color: string;
}

function buildSolarLayout(graph: CodebaseGraph): SolarBody[] {
  const { nodes, edges } = graph;
  if (nodes.length === 0) return [];

  const gravityScore = (n: AxonNode) =>
    n.metadata.dependents * 3 + n.metadata.dependencies * 1.5 + n.metadata.loc / 200;

  const sorted = [...nodes].sort((a, b) => {
    const diff = gravityScore(b) - gravityScore(a);
    if (Math.abs(diff) < 1) {
      const rank = (n: AxonNode) =>
        n.type === 'service' ? 3 : n.type === 'module' ? 2 : n.metadata.isEntryPoint ? 1 : 0;
      return rank(b) - rank(a);
    }
    return diff;
  });

  const sun = sorted[0];
  const sunId = sun.id;

  const sunNeighbors = new Set<string>(
    edges
      .filter(e => e.source === sunId || e.target === sunId)
      .map(e => (e.source === sunId ? e.target : e.source))
  );

  const adjMap = new Map<string, Set<string>>();
  for (const n of nodes) adjMap.set(n.id, new Set());
  for (const e of edges) {
    adjMap.get(e.source)?.add(e.target);
    adjMap.get(e.target)?.add(e.source);
  }

  const roleMap = new Map<string, 'sun' | 'planet' | 'moon' | 'asteroid'>();
  roleMap.set(sunId, 'sun');

  const planetCandidates = [...sunNeighbors]
    .filter(id => id !== sunId)
    .map(id => nodes.find(n => n.id === id)!)
    .filter(Boolean)
    .sort((a, b) => b.metadata.dependents - a.metadata.dependents);

  const planets = planetCandidates.slice(0, 12);
  const planetIds = new Set(planets.map(p => p.id));
  planets.forEach(p => roleMap.set(p.id, 'planet'));

  const moonParent = new Map<string, string>();
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

  bodies.push({
    node: sun, role: 'sun', orbitRadius: 0, orbitAngle: 0,
    orbitSpeed: 0, orbitParentId: null, size: 1.5,
    color: NODE_COLORS[sun.type] ?? '#22c55e',
  });

  const RING_RADII = [4, 7, 10];
  const RING_CAPS = [4, 4, 4];
  let ringIdx = 0, ringCount = 0;
  for (let i = 0; i < planets.length; i++) {
    if (ringCount >= RING_CAPS[ringIdx] && ringIdx < 2) { ringIdx++; ringCount = 0; }
    const totalInRing = Math.min(RING_CAPS[ringIdx], planets.length - i + ringCount);
    const angle = (ringCount / totalInRing) * Math.PI * 2;
    const p = planets[i];
    bodies.push({
      node: p, role: 'planet',
      orbitRadius: RING_RADII[ringIdx],
      orbitAngle: angle,
      orbitSpeed: 0.08 / RING_RADII[ringIdx],
      orbitParentId: sunId,
      size: planetSize(p),
      color: NODE_COLORS[p.type] ?? '#3b82f6',
    });
    ringCount++;
  }

  const moonsByParent = new Map<string, AxonNode[]>();
  for (const [id, parentId] of moonParent) {
    const n = nodes.find(nn => nn.id === id)!;
    if (!moonsByParent.has(parentId)) moonsByParent.set(parentId, []);
    moonsByParent.get(parentId)!.push(n);
  }
  for (const [parentId, moons] of moonsByParent) {
    const count = Math.min(moons.length, 5);
    for (let i = 0; i < count; i++) {
      const m = moons[i];
      const angle = (i / count) * Math.PI * 2;
      bodies.push({
        node: m, role: 'moon',
        orbitRadius: 1.4 + (i % 2) * 0.3,
        orbitAngle: angle,
        orbitSpeed: 0.4 + i * 0.05,
        orbitParentId: parentId,
        size: 0.18 + (m.metadata.dependencies / 10) * 0.12,
        color: NODE_COLORS[m.type] ?? '#64748b',
      });
    }
  }

  const asteroids = nodes.filter(n => roleMap.get(n.id) === 'asteroid');
  asteroids.forEach((a, i) => {
    const angle = (i / Math.max(1, asteroids.length)) * Math.PI * 2;
    const r = 13 + (i % 3) * 0.8;
    bodies.push({
      node: a, role: 'asteroid',
      orbitRadius: r, orbitAngle: angle, orbitSpeed: 0.02,
      orbitParentId: sunId, size: 0.12, color: '#475569',
    });
  });

  return bodies;
}

// ── Dependency Wave Particles ──────────────────────────────────────────────

const WAVE_COLOR: Record<string, string> = {
  imports: '#f97316',
  calls: '#f97316',
  inherits: '#f97316',
  composes: '#f97316',
  queries: '#a855f7',
  exposes: '#00ffff',
};

function WaveParticle({
  from, to, color, stagger,
}: {
  from: React.MutableRefObject<THREE.Vector3>;
  to: React.MutableRefObject<THREE.Vector3>;
  color: string;
  stagger: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const tRef = useRef(stagger);

  useFrame((_, delta) => {
    tRef.current = (tRef.current + delta * 0.5) % 1;
    if (meshRef.current) {
      meshRef.current.position.lerpVectors(from.current, to.current, tRef.current);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}

function DependencyWaves({
  selectedNodeId,
  edges,
  positionsRef,
}: {
  selectedNodeId: string | null;
  edges: import('@/types/graph').AxonEdge[];
  positionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
}) {
  if (!selectedNodeId) return null;

  const connected = edges
    .filter(e => e.source === selectedNodeId || e.target === selectedNodeId)
    .slice(0, 20);

  return (
    <>
      {connected.map((edge, idx) => {
        const fromId = edge.source;
        const toId = edge.target;
        const color = WAVE_COLOR[edge.relation] ?? '#00ffff';

        // Create stable per-edge ref accessors
        const fromRef = { current: positionsRef.current.get(fromId) ?? new THREE.Vector3() };
        const toRef = { current: positionsRef.current.get(toId) ?? new THREE.Vector3() };

        return (
          <group key={edge.id + '-waves'}>
            {[0, 0.33, 0.66].map((stagger, si) => (
              <WaveParticle
                key={`${edge.id}-${si}`}
                from={fromRef as React.MutableRefObject<THREE.Vector3>}
                to={toRef as React.MutableRefObject<THREE.Vector3>}
                color={color}
                stagger={(stagger + idx * 0.1) % 1}
              />
            ))}
          </group>
        );
      })}
    </>
  );
}

// ── Orbit Ring ─────────────────────────────────────────────────────────────

function OrbitRing({ radius, y = 0, color = '#334155', opacity = 0.35 }: {
  radius: number; y?: number; color?: string; opacity?: number;
}) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push([Math.cos(a) * radius, y, Math.sin(a) * radius]);
    }
    return pts;
  }, [radius, y]);

  return <Line points={points} color={color} lineWidth={0.5} transparent opacity={opacity} />;
}

// ── Sun Node ───────────────────────────────────────────────────────────────

function SunBody({
  body, isSelected, isDimmed, isTourFocus, isSearchMatch, onClick, positionsRef,
}: {
  body: SolarBody; isSelected: boolean; isDimmed: boolean;
  isTourFocus: boolean; isSearchMatch: boolean; onClick: () => void;
  positionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const color = body.color;

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.3;
    // Write sun position (always 0,0,0)
    positionsRef.current.set(body.node.id, new THREE.Vector3(0, 0, 0));
  });

  const opacity = isDimmed ? 0.12 : 1;

  return (
    <group position={[0, 0, 0]}>
      {/* Tour focus flash ring */}
      {isTourFocus && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[body.size * 2.2, 0.06, 8, 64]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
        </mesh>
      )}
      {/* Search match ring */}
      {isSearchMatch && !isDimmed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[body.size * 1.8, 0.04, 8, 64]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.5} />
        </mesh>
      )}
      <mesh>
        <sphereGeometry args={[body.size * 1.6, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.06 * opacity} />
      </mesh>
      <mesh>
        <sphereGeometry args={[body.size * 1.3, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.1 * opacity} />
      </mesh>
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
          emissiveIntensity={isDimmed ? 0.1 : (hovered || isSelected ? 2.5 : 1.8)}
          roughness={0.2} metalness={0.1}
          transparent opacity={isDimmed ? 0.15 : 1}
        />
      </mesh>
      <pointLight color={color} intensity={isDimmed ? 0.5 : 6} distance={20} decay={2} />
      {!isDimmed && (
        <Html center position={[0, body.size + 0.4, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            fontFamily: 'monospace', fontSize: '10px', fontWeight: 'bold',
            color, whiteSpace: 'nowrap', textShadow: `0 0 8px ${color}`,
            opacity: hovered || isSelected ? 1 : 0.8, letterSpacing: '0.08em',
          }}>
            {body.node.metadata.isOrphan ? '👻' : '☀'} {body.node.label}
            {body.node.metadata.isEntryPoint && <span style={{ color: '#00ffff', marginLeft: 4 }}>ENTRY</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Planet / Moon Body ─────────────────────────────────────────────────────

function OrbitingBody({
  body, parentPosition, isSelected, isDimmed, isOrphan, isSecurityNode, isExposed, isBlastSource, isBlastImpacted,
  isTourFocus, isSearchMatch, onClick, autoRotate, positionsRef,
}: {
  body: SolarBody; parentPosition: THREE.Vector3; isSelected: boolean;
  isDimmed: boolean; isOrphan: boolean; isSecurityNode: boolean; isExposed: boolean;
  isBlastSource: boolean; isBlastImpacted: boolean; isTourFocus: boolean; isSearchMatch: boolean;
  onClick: () => void; autoRotate: boolean;
  positionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const angleRef = useRef(body.orbitAngle);
  const isMoon = body.role === 'moon';
  const isCritical = body.node.metadata.riskLevel === 'critical';

  // Color overrides
  const effectiveColor = isExposed ? '#ef4444' : isSecurityNode ? '#a855f7' : isOrphan ? '#475569' : body.color;
  const riskColor = RISK_EMISSIVE[body.node.metadata.riskLevel] ?? '#334155';

  useFrame((_, delta) => {
    if (!autoRotate && !isMoon) return;
    angleRef.current += delta * body.orbitSpeed * (autoRotate ? 1 : 0.2);
    if (groupRef.current) {
      const px = parentPosition.x + Math.cos(angleRef.current) * body.orbitRadius;
      const pz = parentPosition.z + Math.sin(angleRef.current) * body.orbitRadius;
      groupRef.current.position.set(px, parentPosition.y, pz);
      // Track live position for dependency waves
      positionsRef.current.set(body.node.id, new THREE.Vector3(px, parentPosition.y, pz));
    }
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.5;
  });

  const initPos = useMemo(() => new THREE.Vector3(
    parentPosition.x + Math.cos(body.orbitAngle) * body.orbitRadius,
    parentPosition.y,
    parentPosition.z + Math.sin(body.orbitAngle) * body.orbitRadius
  ), [parentPosition, body.orbitAngle, body.orbitRadius]);

  const scale = hovered || isSelected ? 1.25 : 1;

  return (
    <group ref={groupRef} position={initPos}>
      {/* Tour focus ring */}
      {isTourFocus && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[body.size * 2.0, 0.06, 8, 64]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.9} />
        </mesh>
      )}
      {/* Search match ring */}
      {isSearchMatch && !isDimmed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[body.size * 1.7, 0.04, 8, 64]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.55} />
        </mesh>
      )}
      {/* Critical risk ring */}
      {isCritical && !isOrphan && !isDimmed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[body.size * 1.5, 0.04, 8, 64]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
        </mesh>
      )}
      {/* Blast source ring */}
      {isBlastSource && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[body.size * 1.8, 0.05, 8, 64]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.8} />
        </mesh>
      )}
      {/* Blast impacted ring */}
      {isBlastImpacted && !isBlastSource && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[body.size * 1.6, 0.04, 8, 64]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.6} />
        </mesh>
      )}
      {/* Security node ring */}
      {isSecurityNode && !isDimmed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[body.size * 1.6, 0.04, 8, 64]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.7} />
        </mesh>
      )}
      {/* Exposed API ring */}
      {isExposed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[body.size * 1.7, 0.05, 8, 64]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.7} />
        </mesh>
      )}
      {/* Orphan dashed ring (static approximation with thin torus) */}
      {isOrphan && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[body.size * 1.5, 0.03, 6, 12]} />
          <meshBasicMaterial color="#475569" transparent opacity={0.7} />
        </mesh>
      )}

      {/* Glow */}
      {!isMoon && !isOrphan && (
        <mesh>
          <sphereGeometry args={[body.size * 1.4, 16, 16]} />
          <meshBasicMaterial color={effectiveColor} transparent opacity={isDimmed ? 0.01 : 0.07} />
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
          color={effectiveColor}
          emissive={isCritical ? riskColor : effectiveColor}
          emissiveIntensity={isDimmed ? 0.05 : (hovered || isSelected ? 1.2 : isMoon ? 0.3 : 0.6)}
          roughness={isOrphan ? 0.9 : 0.5}
          metalness={0.2}
          transparent
          opacity={isDimmed ? 0.12 : 1}
        />
      </mesh>

      {/* Label */}
      {(!isMoon || hovered || isSearchMatch) && !isDimmed && (
        <Html center position={[0, body.size + (isMoon ? 0.2 : 0.35), 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: isMoon ? '8px' : '9px',
            color: hovered || isSelected ? effectiveColor : isOrphan ? '#475569' : '#94a3b8',
            whiteSpace: 'nowrap',
            textShadow: hovered ? `0 0 6px ${effectiveColor}` : 'none',
            opacity: hovered || isSelected || isSearchMatch ? 1 : 0.7,
            letterSpacing: '0.05em',
          }}>
            {isOrphan ? '👻 ' : isSecurityNode ? '🔐 ' : isExposed ? '⚠ ' : ''}{body.node.label}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Tooltip overlay ────────────────────────────────────────────────────────

function NodeTooltip({ node, color }: { node: AxonNode; color: string }) {
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(10,12,20,0.92)', border: `1px solid ${color}40`,
      borderRadius: 8, padding: '8px 14px', fontFamily: 'monospace', fontSize: 11,
      color: '#e2e8f0', pointerEvents: 'none', whiteSpace: 'nowrap',
      backdropFilter: 'blur(8px)',
      boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px ${color}20`, zIndex: 100,
    }}>
      <span style={{ color, fontWeight: 'bold', marginRight: 6 }}>{node.type.toUpperCase()}</span>
      {node.metadata.isOrphan ? '👻 ' : ''}{node.label}
      <span style={{ color: '#64748b', marginLeft: 8 }}>
        ↑{node.metadata.dependents} deps · {node.metadata.loc}L · {node.metadata.riskLevel}
      </span>
      {node.metadata.semanticSummary && (
        <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 10, maxWidth: 320, whiteSpace: 'normal' }}>
          {node.metadata.semanticSummary.slice(0, 120)}{node.metadata.semanticSummary.length > 120 ? '…' : ''}
        </div>
      )}
    </div>
  );
}

// ── Scene ──────────────────────────────────────────────────────────────────

function Scene({
  bodies, selectedNodeId, onNodeSelect,
  blastRadiusNodeId, securityOverlay, searchHighlightIds, ghostMode, tourFocusNodeId,
}: {
  bodies: SolarBody[];
  selectedNodeId: string | null;
  onNodeSelect: (node: AxonNode | null) => void;
  blastRadiusNodeId: string | null;
  securityOverlay: SecurityAnalysis | null;
  searchHighlightIds: Set<string>;
  ghostMode: boolean;
  tourFocusNodeId: string | null;
}) {
  const [userInteracting, setUserInteracting] = useState(false);
  const { gl } = useThree();
  void gl;

  const blastRadius = useMemo(() => {
    if (!blastRadiusNodeId) return null;
    // We don't have edges here, so we rely on passed prop
    return null;
  }, [blastRadiusNodeId]);
  void blastRadius;

  const planetPositions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    map.set('__sun__', new THREE.Vector3(0, 0, 0));
    for (const b of bodies) {
      if (b.role === 'planet' || b.role === 'asteroid') {
        map.set(b.node.id, new THREE.Vector3(
          Math.cos(b.orbitAngle) * b.orbitRadius, 0, Math.sin(b.orbitAngle) * b.orbitRadius
        ));
      }
    }
    return map;
  }, [bodies]);

  const sunBody = bodies.find(b => b.role === 'sun');
  const sunPos = new THREE.Vector3(0, 0, 0);

  const planetRings = useMemo(
    () => [...new Set(bodies.filter(b => b.role === 'planet').map(b => b.orbitRadius))],
    [bodies]
  );
  const asteroidRing = useMemo(
    () => bodies.some(b => b.role === 'asteroid') ? 13 : null, [bodies]
  );

  // Compute dimming per body
  function isDimmed(b: SolarBody): boolean {
    const id = b.node.id;
    if (ghostMode) return !b.node.metadata.isOrphan;
    if (securityOverlay) {
      return !securityOverlay.securityNodeIds.has(id) &&
             !securityOverlay.authChainIds.has(id) &&
             !securityOverlay.exposedApiIds.has(id) &&
             !securityOverlay.unprotectedDbIds.has(id);
    }
    if (searchHighlightIds.size > 0) return !searchHighlightIds.has(id);
    return false;
  }

  return (
    <>
      <Stars radius={80} depth={60} count={3000} factor={4} saturation={0.3} fade speed={0.5} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={0.4} color="#e2e8f0" />
      <OrbitControls
        enablePan={false} minDistance={3} maxDistance={35}
        autoRotate={!userInteracting} autoRotateSpeed={0.4}
        onStart={() => setUserInteracting(true)}
        onEnd={() => setTimeout(() => setUserInteracting(false), 3000)}
        makeDefault
      />

      {/* Orbit rings */}
      {planetRings.map(r => (
        <OrbitRing key={r} radius={r}
          color={securityOverlay ? 'rgba(168,85,247,0.2)' : '#334155'}
        />
      ))}
      {asteroidRing && <OrbitRing radius={asteroidRing} />}
      {asteroidRing && <OrbitRing radius={asteroidRing + 0.8} />}
      {asteroidRing && <OrbitRing radius={asteroidRing + 1.6} />}

      {/* Sun */}
      {sunBody && (
        <SunBody
          body={sunBody}
          isSelected={selectedNodeId === sunBody.node.id}
          isDimmed={isDimmed(sunBody)}
          isTourFocus={tourFocusNodeId === sunBody.node.id}
          isSearchMatch={searchHighlightIds.has(sunBody.node.id)}
          onClick={() => onNodeSelect(sunBody.node)}
          positionsRef={positionsRef}
        />
      )}

      {/* Planets, moons, asteroids */}
      {bodies.filter(b => b.role !== 'sun').map(b => {
        const parentPos = b.orbitParentId === sunBody?.node.id || b.orbitParentId === null
          ? sunPos
          : (planetPositions.get(b.orbitParentId!) ?? sunPos);

        const id = b.node.id;
        const dimmed = isDimmed(b);

        // Blast radius states
        const isBlastImpacted = blastRadiusNodeId
          ? id !== blastRadiusNodeId // simplified — full BFS passed from parent
          : false;

        return (
          <OrbitingBody
            key={id}
            body={b}
            parentPosition={parentPos}
            isSelected={selectedNodeId === id}
            isDimmed={dimmed}
            isOrphan={!!b.node.metadata.isOrphan}
            isSecurityNode={securityOverlay ? securityOverlay.securityNodeIds.has(id) : false}
            isExposed={securityOverlay ? (securityOverlay.exposedApiIds.has(id) || securityOverlay.unprotectedDbIds.has(id)) : false}
            isBlastSource={blastRadiusNodeId === id}
            isBlastImpacted={!securityOverlay && !!blastRadiusNodeId && isBlastImpacted}
            isTourFocus={tourFocusNodeId === id}
            isSearchMatch={searchHighlightIds.has(id)}
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
  blastRadiusNodeId?: string | null;
  securityOverlay?: SecurityAnalysis | null;
  searchHighlightIds?: Set<string>;
  ghostMode?: boolean;
  tourFocusNodeId?: string | null;
}

export default function SolarSystemView({
  graph, selectedNodeId, onNodeSelect,
  blastRadiusNodeId = null,
  securityOverlay = null,
  searchHighlightIds = new Set(),
  ghostMode = false,
  tourFocusNodeId = null,
}: SolarSystemViewProps) {
  const bodies = useMemo(() => buildSolarLayout(graph), [graph]);
  const selectedBody = bodies.find(b => b.node.id === selectedNodeId);

  const handleCanvasClick = useCallback(() => { onNodeSelect(null); }, [onNodeSelect]);

  if (bodies.length === 0) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-foreground-dim text-xs">
        No graph data to render
      </div>
    );
  }

  const blastResult = blastRadiusNodeId
    ? calculateBlastRadius(blastRadiusNodeId, graph.edges, { depth: 4 })
    : null;

  // Build a search-aware set for Scene (pass full blast set)
  const blastAll = blastResult?.all ?? new Set<string>();

  // For Scene we pass blastAll via a custom prop mechanism — we'll use the scene directly
  return (
    <div className="relative w-full h-full bg-[#020408]">
      <Canvas
        camera={{ position: [0, 8, 18], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
        onClick={handleCanvasClick}
        style={{ background: '#020408' }}
      >
        <SceneWithBlast
          bodies={bodies}
          selectedNodeId={selectedNodeId}
          onNodeSelect={onNodeSelect}
          blastRadiusNodeId={blastRadiusNodeId}
          blastAll={blastAll}
          securityOverlay={securityOverlay}
          searchHighlightIds={searchHighlightIds}
          ghostMode={ghostMode}
          tourFocusNodeId={tourFocusNodeId}
        />
      </Canvas>

      {/* HUD overlay */}
      <div style={{
        position: 'absolute', top: 12, left: 12, fontFamily: 'monospace',
        fontSize: 10, color: '#475569', pointerEvents: 'none', letterSpacing: '0.08em',
      }}>
        {securityOverlay ? (
          <>
            <div style={{ color: '#a855f7' }}>🔐 SECURITY OVERLAY ACTIVE</div>
            <div>Purple = auth nodes · Red ring = exposed</div>
          </>
        ) : blastRadiusNodeId ? (
          <>
            <div style={{ color: '#ef4444' }}>⚡ BLAST RADIUS ACTIVE</div>
            <div>Red ring = source · Orange = impacted</div>
          </>
        ) : ghostMode ? (
          <>
            <div style={{ color: '#64748b' }}>👻 GHOST CITY — Dead Code Only</div>
            <div>Grey bodies = unreachable nodes</div>
          </>
        ) : searchHighlightIds.size > 0 ? (
          <>
            <div style={{ color: '#00ffff' }}>🔍 {searchHighlightIds.size} search matches</div>
            <div>Cyan ring = matched node</div>
          </>
        ) : (
          <>
            <div>☀ SUN — gravity center</div>
            <div>◉ PLANET — direct dependency</div>
            <div>· MOON — indirect dependency</div>
            <div style={{ marginTop: 4, color: '#ef4444' }}>⊕ RED RING — critical risk</div>
            <div style={{ color: '#475569' }}>👻 GHOST — orphan / dead code</div>
            <div style={{ marginTop: 6, color: '#334155' }}>DRAG · SCROLL · CLICK node to inspect</div>
          </>
        )}
      </div>

      {/* Node count badge */}
      <div style={{
        position: 'absolute', top: 12, right: 12, fontFamily: 'monospace',
        fontSize: 10, color: '#334155', pointerEvents: 'none',
      }}>
        {bodies.length} bodies · {graph.edges.length} connections
        {graph.stats.orphans > 0 && (
          <span style={{ color: '#475569', marginLeft: 6 }}>· 👻 {graph.stats.orphans} orphans</span>
        )}
      </div>

      {/* Selected node tooltip */}
      {selectedBody && (
        <NodeTooltip node={selectedBody.node} color={
          securityOverlay && securityOverlay.securityNodeIds.has(selectedBody.node.id) ? '#a855f7' : selectedBody.color
        } />
      )}
    </div>
  );
}

// ── Scene with blast radius wired ──────────────────────────────────────────

function SceneWithBlast({
  bodies, selectedNodeId, onNodeSelect,
  blastRadiusNodeId, blastAll, securityOverlay, searchHighlightIds, ghostMode, tourFocusNodeId,
  edges,
}: {
  bodies: SolarBody[];
  selectedNodeId: string | null;
  onNodeSelect: (node: AxonNode | null) => void;
  blastRadiusNodeId: string | null;
  blastAll: Set<string>;
  securityOverlay: SecurityAnalysis | null;
  searchHighlightIds: Set<string>;
  ghostMode: boolean;
  tourFocusNodeId: string | null;
  edges: import('@/types/graph').AxonEdge[];
}) {
  const [userInteracting, setUserInteracting] = useState(false);
  const positionsRef = useRef<Map<string, THREE.Vector3>>(new Map());

  const planetPositions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    for (const b of bodies) {
      if (b.role === 'planet' || b.role === 'asteroid') {
        map.set(b.node.id, new THREE.Vector3(
          Math.cos(b.orbitAngle) * b.orbitRadius, 0, Math.sin(b.orbitAngle) * b.orbitRadius
        ));
      }
    }
    return map;
  }, [bodies]);

  const sunBody = bodies.find(b => b.role === 'sun');
  const sunPos = new THREE.Vector3(0, 0, 0);

  const planetRings = useMemo(
    () => [...new Set(bodies.filter(b => b.role === 'planet').map(b => b.orbitRadius))],
    [bodies]
  );
  const asteroidRing = useMemo(
    () => bodies.some(b => b.role === 'asteroid') ? 13 : null, [bodies]
  );

  function getIsDimmed(b: SolarBody): boolean {
    const id = b.node.id;
    if (ghostMode) return !b.node.metadata.isOrphan;
    if (securityOverlay) {
      return !securityOverlay.securityNodeIds.has(id) &&
             !securityOverlay.authChainIds.has(id) &&
             !securityOverlay.exposedApiIds.has(id) &&
             !securityOverlay.unprotectedDbIds.has(id);
    }
    if (blastRadiusNodeId) {
      return id !== blastRadiusNodeId && !blastAll.has(id);
    }
    if (searchHighlightIds.size > 0) return !searchHighlightIds.has(id);
    return false;
  }

  return (
    <>
      <Stars radius={80} depth={60} count={3000} factor={4} saturation={0.3} fade speed={0.5} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={0.4} color="#e2e8f0" />
      <OrbitControls
        enablePan={false} minDistance={3} maxDistance={35}
        autoRotate={!userInteracting} autoRotateSpeed={0.4}
        onStart={() => setUserInteracting(true)}
        onEnd={() => setTimeout(() => setUserInteracting(false), 3000)}
        makeDefault
      />

      {planetRings.map(r => (
        <OrbitRing key={r} radius={r}
          color={securityOverlay ? '#a855f7' : blastRadiusNodeId ? '#ef4444' : '#334155'}
          opacity={securityOverlay || blastRadiusNodeId ? 0.2 : 0.35}
        />
      ))}
      {asteroidRing && <OrbitRing radius={asteroidRing} />}
      {asteroidRing && <OrbitRing radius={asteroidRing + 0.8} />}
      {asteroidRing && <OrbitRing radius={asteroidRing + 1.6} />}

      {sunBody && (
        <SunBody
          body={sunBody}
          isSelected={selectedNodeId === sunBody.node.id}
          isDimmed={getIsDimmed(sunBody)}
          isTourFocus={tourFocusNodeId === sunBody.node.id}
          isSearchMatch={searchHighlightIds.has(sunBody.node.id)}
          onClick={() => onNodeSelect(sunBody.node)}
        />
      )}

      {bodies.filter(b => b.role !== 'sun').map(b => {
        const parentPos = b.orbitParentId === sunBody?.node.id || b.orbitParentId === null
          ? sunPos
          : (planetPositions.get(b.orbitParentId!) ?? sunPos);

        const id = b.node.id;
        return (
          <OrbitingBody
            key={id}
            body={b}
            parentPosition={parentPos}
            isSelected={selectedNodeId === id}
            isDimmed={getIsDimmed(b)}
            isOrphan={!!b.node.metadata.isOrphan}
            isSecurityNode={securityOverlay ? securityOverlay.securityNodeIds.has(id) : false}
            isExposed={securityOverlay ? (securityOverlay.exposedApiIds.has(id) || securityOverlay.unprotectedDbIds.has(id)) : false}
            isBlastSource={blastRadiusNodeId === id}
            isBlastImpacted={!securityOverlay && blastRadiusNodeId !== null && blastAll.has(id) && blastRadiusNodeId !== id}
            isTourFocus={tourFocusNodeId === id}
            isSearchMatch={searchHighlightIds.has(id)}
            onClick={() => onNodeSelect(b.node)}
            autoRotate={!userInteracting}
          />
        );
      })}
    </>
  );
}
