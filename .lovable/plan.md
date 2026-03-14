
## Goal
Transform CodeAtlas into a pro-grade codebase intelligence tool with 6 major upgrades:
1. **Better Solar view** — interactive node inspection, blast radius, search highlight, security overlay parity with topology
2. **Dead Code / Ghost City detection** — visual orphan marking across all 3 views
3. **Natural language search bar** — NL query → highlighted matching nodes
4. **Smarter treemap** — grouped by type/folder, meaningful labels, color semantics
5. **Expandable AI Summary panel** — floating drawer accessible from any view
6. **Tour improvements** — visual step indicator on graph canvas highlighting the focused node

---

## Feature Breakdown

### 1. Solar View — Full Feature Parity
Currently the Solar view only rotates and shows a tooltip on click. It needs:
- **Node inspector**: clicking a node opens the same `NodeInspector` slide-in panel (already works in topology via `onNodeSelect` prop — just need to pass it through from `Dashboard.tsx`, which already does `onNodeSelect` → `selectedNode` → `NodeInspector`. The inspector is rendered at `Dashboard` level, outside the view, so this already works! The issue is that the Solar view passes `onNodeSelect` but the `Dashboard` renders `NodeInspector` only when `selectedNode` is set — **this already works**.)
- **Blast radius highlight**: `blastRadiusNodeId` is not passed to `SolarSystemView` — need to add it as a prop and visually dim non-blast nodes with a low opacity overlay
- **Security overlay**: similarly `securityAnalysis` not passed to Solar — add prop, dim non-security bodies, add red ring on exposed nodes
- **Ghost City (orphan) marking**: dead code nodes get a grey dashed ring in solar + a skull/ghost icon in the Html label

### 2. Ghost City Dead Code Detection
`AxonNode.metadata.isOrphan` already exists in the type. The AI analysis backend flags nodes as `isOrphan`. We need to:
- **Topology (GraphCanvas)**: `AxonGraphNode` — add a dashed grey border + "☠ ORPHAN" badge when `isOrphan === true`
- **Solar view**: grey/muted color override + dashed orbit ring for orphan planets, ghost emoji in label
- **Treemap**: grey wash overlay + skull badge on orphan cells
- **Dashboard top bar**: add orphan count badge when `graph.stats.orphans > 0` → click to activate "ghost mode" (dims everything except orphans)

### 3. Natural Language Search Bar
A search input (accessible via `⌘F` shortcut or Search icon in top bar) that:
- Accepts NL queries: "auth logic", "database queries", "entry point"
- Client-side matching: score each node against query words using `label`, `path`, `type`, `semanticSummary`, `flags` fields
- Sets a `searchHighlightIds: Set<string>` state in Dashboard
- Passes to GraphCanvas (adds a `isSearchMatch` / `isSearchDim` state like blast radius does), Solar (dims non-matching bodies), Treemap (dims non-matching cells)
- Shows match count badge: "4 matches for 'auth'"
- A clear button resets the highlight
- No backend needed — pure client-side fuzzy match

**New component**: `SearchBar.tsx` — a floating input that appears/disappears with animation

### 4. Better Treemap
Problems: no grouping, tiny cells have no info, hard to understand structure.
Fixes:
- **Group by `type`**: render type-labeled section headers (SERVICE, MODULE, FILE, etc.) as colored bands. Use a two-level treemap: first partition space by type proportionally, then squarify within each section.
- **Better cell content**: show path breadcrumb (split by `/`, take last 2 parts), risk badge, coverage bar
- **Legend**: fixed legend panel showing type → color mapping
- **Orphan cells**: subtle diagonal stripe pattern background
- **Size metric toggle**: button to switch cell size between LOC / complexity / churn

### 5. Expandable AI Summary Panel
Currently it's a tiny 1-line banner. Replace with:
- The banner stays as a collapsed 1-liner
- Add a `▼ EXPAND` button at the end
- Clicking opens a full overlay panel (`AISummaryPanel`) that shows:
  - Full `graph.summary` text (properly formatted)
  - Key stats: entry points, top risk nodes, orphans, language breakdown
  - "Architecture style" inferred from node types (e.g. "Monolith", "Microservices", "MVC")
  - Exportable (copy to clipboard)
  - Works on all views (topology/treemap/solar)

**New component**: `AISummaryPanel.tsx`

### 6. Tour Highlight on Graph Canvas
When a tour step is active, the focused node should pulse/glow on the canvas:
- Add `tourFocusNodeId: string | null` prop to `GraphCanvas` + `SolarSystemView`
- In topology: the focused node gets `isTourFocus` data flag → `AxonGraphNode` renders a pulsing cyan ring
- In solar: the focused body gets a bright glow corona + orbit ring flashes

---

## Files to Create
- `src/components/SearchBar.tsx` — NL search input with match count
- `src/components/AISummaryPanel.tsx` — expandable full AI summary drawer

## Files to Modify
| File | Change |
|---|---|
| `src/components/Dashboard.tsx` | Add search state, ghost mode, tour focus node, wire new components |
| `src/components/graph/GraphCanvas.tsx` | Add `searchHighlightIds`, `tourFocusNodeId` props |
| `src/components/graph/AxonGraphNode.tsx` | Orphan styling + tour focus pulse ring |
| `src/components/graph/SolarSystemView.tsx` | Add blast radius dimming, security overlay, orphan styling, search highlight, tour focus |
| `src/components/TreemapView.tsx` | Group by type, better cells, orphan pattern, legend |
| `src/components/CommandBar.tsx` | Add `/search` and `/ghost-city` commands |

---

## Implementation Order
1. `AISummaryPanel` + wire into Dashboard (replaces the tiny banner) — quick win, highly visible
2. `SearchBar` + wiring across all 3 views
3. Solar view blast radius + security + orphan + tour parity
4. Treemap redesign (grouped by type)
5. Ghost City mode in Dashboard + all views
6. Tour focus node highlight on canvas
