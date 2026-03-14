

## Context

- `Dashboard.tsx` has a `ViewMode` union type currently `'topology' | 'treemap'`. View toggle is a mapped button array — trivially extended to 3 modes.
- `AxonNode` has all the data we need: `type` (service/module/class/function/database/api/file), `metadata.dependents + dependencies` (planet sizing), `metadata.riskLevel`, `metadata.complexity`, `metadata.semanticSummary`.
- Color palette already defined in `AxonGraphNode.tsx` as `NODE_CONFIGS` — reuse exactly.
- No Three.js packages installed yet — need `three@^0.160.0`, `@react-three/fiber@^8.18.0`, `@react-three/drei@^9.122.0`.

---

## Solar System Layout Algorithm

The layout logic deterministically maps the graph to a solar system:

1. **Sun (center)** — The node with the highest `dependents + dependencies` total (the "gravity center"). If multiple tied, prefer `type === 'service'` or `isEntryPoint`.
2. **Planets (primary orbit)** — Nodes that have a direct edge to/from the Sun, sorted by `dependents` descending. Placed on concentric orbits at increasing radii (orbit 1: r=4, orbit 2: r=7, orbit 3: r=10).
3. **Moons (secondary orbit)** — Nodes connected to a planet but not the sun. Orbit their parent planet at a small radius (~1.2).
4. **Asteroid belt** — Orphan/unconnected nodes, scattered at a large outer radius.

**Planet sizes**: `0.3 + (dependents / maxDependents) * 0.9` → range [0.3, 1.2].

**Sun size**: `1.5` fixed — always the largest.

---

## Visual Design

| Element | Visual |
|---|---|
| Sun | Large glowing sphere, emissive color = node type color, `pointLight` inside |
| Planets | Sphere with emissive glow, ring for `critical` risk nodes |
| Moons | Small sphere, muted color |
| Orbits | `<Line>` dashed circle from Drei, semi-transparent |
| Edges (connections) | Thin `<Line>` arcs between connected planets, colored by relation |
| Background | Stars via `<Stars>` from Drei |
| Camera | `<OrbitControls>` — free drag-rotate, scroll-zoom, auto slow rotation |
| Labels | `<Html>` from Drei — shows node label below sphere, hides when far |

**Node color** reuses the exact same hex values from `NODE_CONFIGS`.

---

## Component Architecture

```text
src/components/graph/SolarSystemView.tsx   ← new Canvas component
  └─ Three.js scene
       ├─ Stars background
       ├─ Ambient + point lights  
       ├─ SunNode (center)
       ├─ OrbitRing (x N)
       ├─ PlanetNode (x N)  
       │    └─ MoonNode (x M)
       └─ ConnectionLine (x edges between visible bodies)
```

---

## Files to change

1. **`package.json`** — add `three@^0.160.0`, `@react-three/fiber@^8.18.0`, `@react-three/drei@^9.122.0`
2. **`src/components/graph/SolarSystemView.tsx`** — new full 3D scene component
3. **`src/components/Dashboard.tsx`** — add `'solar'` to `ViewMode`, add `Orbit` icon button in toggle, render `<SolarSystemView>` in the AnimatePresence block

---

## Interaction

- **Click a planet/sun** → calls `onNodeSelect(node)` → opens the existing `NodeInspector` panel (reuse the same inspector)
- **Hover** → planet scales up 20%, shows label prominently
- **OrbitControls** → full drag-to-rotate, pinch/scroll zoom, no pan (keeps it centered)
- Auto-rotation: slow `0.001 rad/frame` when nothing is selected, stops when user interacts

