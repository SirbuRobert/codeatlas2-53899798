
## What to build

Add a slow breathing pulse animation to **entry-point** nodes and **critical-risk** nodes in `SolarSystemView.tsx`. Two independent refs drive the animation:

1. **Pulse halo mesh** (new `ref<THREE.Mesh>`) — a sphere slightly larger than the glow halo that scales in/out using a sine wave in `useFrame`, making it visually breathe.
2. **Scale oscillation on the main sphere** — the main sphere `scale` currently is static (1 / 1.3 / 1.15). For entry-point & critical nodes we drive it via `useFrame` instead of a static value.

### Implementation — single file: `SolarSystemView.tsx`

**Add two new refs to `NodeSphere`:**
```ts
const pulseHaloRef = useRef<THREE.Mesh>(null!);
const pulseT = useRef(Math.random() * Math.PI * 2); // random phase offset so nodes don't all pulse in sync
```

**Extend the `useFrame` callback** (currently only rotates `meshRef`):
```ts
useFrame((_, delta) => {
  meshRef.current.rotation.y += delta * 0.25;

  if (pulseHaloRef.current && (isEntryPoint || isCritical) && !isDimmed) {
    pulseT.current += delta * 0.9; // ~0.9 rad/s → ~7s full cycle
    const s = 1.0 + Math.sin(pulseT.current) * 0.18; // oscillates 0.82 – 1.18
    pulseHaloRef.current.scale.setScalar(s);
    // Also pulse opacity via material
    (pulseHaloRef.current.material as THREE.MeshBasicMaterial).opacity =
      0.22 + Math.sin(pulseT.current) * 0.14; // 0.08 – 0.36
  }
});
```

**Add the pulse halo mesh to JSX**, rendered only for entry-point or critical nodes:
```tsx
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
```

**Colors:**
- Entry-point nodes → cyan `#00ffff` pulse
- Critical risk nodes → red `#ef4444` pulse
- If a node is both → red takes priority (already matches `effectiveColor` logic)

**Where to add `isEntryPoint`**: it's available as `node.metadata.isEntryPoint` — no new props needed, already in scope inside `NodeSphere`.

### Changes summary
| What | Where |
|---|---|
| Add `pulseHaloRef` + `pulseT` refs | Top of `NodeSphere`, ~line 252 |
| Extend `useFrame` with sine oscillation | Lines 271-275 |
| Add pulse halo `<mesh>` in JSX | After "Outer aura halo" block, ~line 347 |

Single file, no new props, no new components.
