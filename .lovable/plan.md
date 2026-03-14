
## Problem
`OnboardingTour` has 6 hardcoded steps with hardcoded `nodeId`s (`'server'`, `'app'`, `'auth-middleware'`, etc.) and hardcoded descriptions about a specific SaaS codebase. When a different repo is analyzed, the tour still shows the same text and tries to find the same node IDs that don't exist.

## Solution: Derive tour steps from the actual graph

Replace the static `tourSteps` array with a `buildTourFromGraph(graph)` pure function that selects up to 6 meaningful nodes deterministically from the real graph and generates appropriate titles + descriptions from their metadata.

### Tour step selection algorithm (in priority order)

1. **Entry point** — `isEntryPoint === true`, or fallback: highest `churn + dependencies` service node
2. **Security/auth chokepoint** — security keyword match (reuse logic from `securityAnalysis.ts`) with most dependents
3. **Most-imported hub** — highest `dependents` count overall (single point of failure)
4. **Highest complexity node** — highest `complexity` score 
5. **Highest risk** — `riskLevel === 'critical'` with lowest `coverage`, or node with `low-coverage` + high `churn`
6. **Database/data layer** — `type === 'database'`, fallback to any node with `queries` edges

Dedup: each selected node must be unique. If fewer than 3 candidates exist, cap the tour at what's available.

### Description generation

Each step description is synthesized from the node's real metadata:
- Uses `node.metadata.semanticSummary` if present (it's an optional field)
- Appends metric callouts: `dependents`, `coverage`, `complexity`, `riskLevel`, `churn`, `flags`
- Role-specific insight (entry point → "requests start here", security → "chokepoint", hub → "N modules depend on this", etc.)

### Emoji + title mapping per role
```
entry     → 🚀 "Entry Point"
security  → 🔐 "Auth Chokepoint"  
hub       → 🔗 "Most-Imported Hub"
complex   → ⚠️ "Complexity Hotspot"
risky     → 🔥 "Highest Risk"
database  → 🗄️ "Data Layer"
```

### Files to change

**Only `src/components/OnboardingTour.tsx`**:
- Delete the hardcoded `tourSteps` array
- Add a `buildTourFromGraph(graph: CodebaseGraph): TourStep[]` pure function in the same file
- Call it via `useMemo` so it only recomputes when the graph changes
- Keep all existing UI code unchanged — the rendered JSX stays exactly the same

No other files need to change — `Dashboard.tsx` already passes the live `graph` prop.

### Edge cases
- If a node is selected but has no `semanticSummary`, build the description purely from metrics
- If the graph has fewer than 6 meaningful nodes, the tour has fewer steps — the progress bar and navigation dots scale automatically since they're computed from `tourSteps.length`
- Dedup by nodeId so the same node can't appear twice even if it wins multiple categories
