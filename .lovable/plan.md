

## Two separate bugs

### Bug 1: Topology view doesn't highlight nodes when a stat is clicked

**Root cause**: React Flow's `useNodesState(rfNodes)` stores an internal copy of nodes initialized once at mount. When `searchHighlightIds` changes, `rfNodes` (a `useMemo`) recomputes with updated `isDimmed` values — but this new `rfNodes` never reaches the React Flow internal state because `useNodesState` ignores it after initialization.

**Fix**: Add a `useEffect` in `GraphCanvas.tsx` that syncs `rfNodes` into the React Flow state whenever it changes:

```ts
useEffect(() => {
  setNodes(rfNodes);
}, [rfNodes]); // rfNodes changes whenever searchHighlightIds / securityOverlay / ghostMode / etc. change
```

This is the same pattern already used for `handleResetLayout` — just needs to be automatic.

---

### Bug 2: Wrong numbers in the stat button AND the banner

Two sub-problems:

**2a — Stat button shows wrong count** (`stats.hotspots = 4`, `stats.orphans = 1`, `stats.totalFiles = 47`) — these come from pre-baked `graph.stats` that represent the full real repo being described, not the actual nodes present in the mock graph (16 nodes). The UI says "47 FILES" but the graph has 16 nodes.

**Fix**: Compute the counts live from `nodes[]` in `StatsHUD`, instead of reading from `stats.*`:

```ts
// Live counts from actual nodes
const liveFilesCount = nodes.length;
const liveHotspotsCount = getNodeIds('HOTSPOTS').size;
const liveOrphansCount = getNodeIds('ORPHANS').size;
const liveCircularCount = getNodeIds('CIRCULAR DEPS').size;
const liveCoverageCount = getNodeIds('COVERAGE').size;
```

Replace `stats.totalFiles`, `stats.hotspots`, `stats.orphans`, `stats.circularDeps` in the `items` array with these live computed values. Keep `stats.avgComplexity` and `stats.testCoverage` as percentages (they're scalar, not counts).

**2b — Fallback logic in `getNodeIds` gives wrong results**: For `HOTSPOTS`, when the strict filter returns 0, it falls back to `complexity > 8 || churn > 50` — can return almost every node. For `COVERAGE`, the fallback uses "below average" — returns half the nodes. These fallbacks are too aggressive and produce confusing counts.

**Fix**: Remove the fallbacks. Use single consistent thresholds that match what the stat description says:
- `HOTSPOTS`: `complexity > 10 && churn > 40` only (no fallback)
- `COVERAGE`: `coverage < 70` only (matches the tooltip "low test coverage < 60%" — adjust to 70 for consistency with the AVG score guide)
- `ORPHANS`: `isOrphan === true` only (no fallback to `dependents === 0`, which catches the database node)

---

## Files to change

| File | Change |
|---|---|
| `src/components/graph/GraphCanvas.tsx` | Add `useEffect(() => setNodes(rfNodes), [rfNodes])` after `useNodesState` |
| `src/components/StatsHUD.tsx` | Replace `stats.*` counts in `items[]` with live counts from `nodes[]`; remove fallback logic from `getNodeIds()` |

