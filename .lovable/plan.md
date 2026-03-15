
## Context

The panel currently shows 4 sections: Risk Score (gauge + 4 stats), Bus Factor (warning + bar chart), Market Context (company chips), Tech Lifecycle (colored list). When the graph has few nodes or a clean codebase (e.g. low risk, few authors), several sections are sparse or show almost nothing.

## What to add — 5 new sections

All computed from existing `graph` data, no new props needed.

### 1. Codebase Health Scorecard
A 2×2 grid of cards, each with a letter grade (A–F) and value:
- **Maintainability** — derived from `avgComplexity` (A = <5, B = <8, C = <12, D = <16, F = 16+)
- **Test Coverage** — from `testCoverage` (A = 80%+, B = 70%, C = 60%, D = 50%, F = <50%)
- **Churn Stability** — average churn of top-10 highest-churn nodes (low = stable)
- **Documentation** — % of nodes that have a `semanticSummary`

### 2. Hotspot Files
Top 3–5 nodes ranked by a composite "hotspot score" = `complexity * churn * (riskLevel weight)`. Each row shows: filename, a mini risk pill, and the score bar. Clicking a row could navigate to the node (optional — just visual for now).

### 3. Dependency Health
Derived from edges:
- **Total edges** (coupling metric)
- **Avg fan-in** (dependents per node) — high = fragile hubs
- **Avg fan-out** (dependencies per node) — high = god files
- **Most coupled file** — node with highest `dependents` count, shown with a warning if > 10

### 4. Dead Code Estimate
Count orphan nodes (`isOrphan: true`) + nodes with `churn === 0` and `dependents === 0`. Display as: "X files appear unused · ~Y LOC removable". Also show the orphan list as file chips.

### 5. Quick Wins (Actionable)
3 prioritized, specific recommendations derived from the data:
- If `circularDeps > 0` → "Break X circular dependencies"
- If any node has `coverage < 40 && riskLevel === 'critical'` → "Add tests to [filename]"
- If `busFactor <= 2` → "Document [top author]'s critical files"
- If orphans exist → "Remove X dead files (~Y LOC)"
- If any node has `complexity > 15` → "Refactor [filename] (complexity: N)"

Each Quick Win has a severity color (red/yellow/green) and a short action phrase.

## Files changed

| File | Change |
|---|---|
| `src/components/BusinessInsightsPanel.tsx` | Add 5 new sections to the scroll area: Health Scorecard, Hotspot Files, Dependency Health, Dead Code Estimate, Quick Wins. All computed in the existing `useMemo`. No new imports needed beyond Lucide icons already available. |

## Layout

The panel is `w-[360px]` with `overflow-y-auto`. The new sections slot into the existing `space-y-6` scroll container after the current 4. Each uses the same `bg-surface-2 rounded-xl p-3 border border-border` card pattern already established.

## Visual consistency

- Same `font-mono text-[9px] text-foreground-dim tracking-widest uppercase` section headers
- Same row pattern `flex justify-between text-[10px] font-mono`
- Grade badges use colored `font-bold` text like existing risk values
- Quick Wins use the same warning/alert/success color tokens already in the file
