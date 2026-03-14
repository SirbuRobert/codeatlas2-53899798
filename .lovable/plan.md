
## What to build

Make each stat chip in the StatsHUD bar clickable with two behaviors:

1. **Stats that map to a node set** (FILES, HOTSPOTS, ORPHANS, CIRCULAR DEPS, COVERAGE) → clicking highlights those matching nodes in the graph, exactly like the search highlight system already works (`searchHighlightIds`).
2. **AVG COMPLEXITY** → no file set to highlight in isolation; instead clicking opens a small popover/drawer explaining *how* the score was computed (formula, what it means, the top 3 most complex files).

---

## How each stat maps to nodes

| Stat | Node filter |
|---|---|
| FILES | all nodes (highlights entire graph) |
| AVG COMPLEXITY | open explanation popover (top 3 complex nodes listed, clickable) |
| HOTSPOTS | `complexity > 10 && churn > 40` |
| ORPHANS | `isOrphan === true` |
| CIRCULAR DEPS | nodes with flag `circular-dep` |
| COVERAGE | `coverage < 60` (low coverage nodes) |

---

## Architecture changes

### 1. `StatsHUD.tsx`
- Add `onStatClick?: (ids: Set<string>, label: string) => void` prop for the highlightable stats.
- Add `onComplexityClick?: (topNodes: AxonNode[]) => void` prop for AVG COMPLEXITY.
- Change `cursor-help` → `cursor-pointer` on each chip.
- Add active state: when `activeStatLabel` matches, show a subtle ring/glow border around that chip.
- Add `activeStatLabel?: string` prop to track which is active.
- For AVG COMPLEXITY chip: render a popover inline (using `Popover` from existing ui) showing the formula + top 3 complex nodes with their scores.

### 2. `Dashboard.tsx`
- Add `statsHighlightLabel` state (string | null) to know which stat chip is active.
- Pass `onStatClick` to `StatsHUD` — callback computes node IDs from `graph.nodes`, calls `setSearchHighlightIds` + `setSearchQuery` (reuse existing highlight pipeline — no new state needed).
- Clicking an already-active stat clears the highlight (toggle behavior).
- Clear `statsHighlightLabel` when `clearAll()` is called.

### 3. Visual feedback in the top bar
The existing "🔍 N matches for X — click to clear" badge already handles showing/clearing stat-driven highlights since we're reusing `searchHighlightIds`. Update the query label to show e.g. `"HOTSPOTS (4 files)"` instead of just a search string.

---

## Complexity Popover content

```
AVG COMPLEXITY: 7.4
─────────────────────────────
Cyclomatic complexity counts
the decision branches (if, for,
switch, &&, ||) per function.

Score guide:
  1–5   Simple, easy to test
  6–10  Moderate — acceptable
  11+   High — refactor soon
  20+   Critical risk

Top 3 most complex files:
  BillingService     18  ████████
  AuthService        14  ██████
  stripe.webhook.ts  15  ██████
```

Each top file entry is a clickable button that highlights that single node.

---

## Files to change
- `src/components/StatsHUD.tsx` — clickable chips, active state, complexity popover
- `src/components/Dashboard.tsx` — wire `onStatClick`, manage `statsHighlightLabel`

No new files, no DB changes, no edge function changes.
