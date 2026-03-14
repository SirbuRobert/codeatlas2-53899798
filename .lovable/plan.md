
## Goal
Add a live stats bar to the bottom of the **LandingPage** showing three animated counters: **repos analyzed**, **nodes mapped**, and **risk flags raised** — with a smooth count-up animation suitable for a demo closing slide.

## Data Strategy
These stats will be **session-cumulative + seeded baseline** — no backend needed:
- Start from a realistic hardcoded baseline (e.g. `247 repos`, `48,392 nodes`, `1,204 risk flags`)
- Increment each time a real analysis completes (passed down from `Index.tsx` via a `sessionStats` prop)
- When a user runs an analysis, the counters tick up by the actual values from the new graph (`nodes.length`, `stats.hotspots`)
- The animated counter uses a `useEffect` + `requestAnimationFrame` ease-out tween — classic number odometer feel

## Component: `LiveStatsBar`
New standalone component, shown **only on the landing page** (not during analysis/error states), placed just **above** the footer line.

```text
┌─────────────────────────────────────────────────────────────┐
│  [ 247 ]  REPOS ANALYZED   [ 48,392 ]  NODES MAPPED   [ 1,204 ]  RISK FLAGS  │
│  ▲▲▲ animated count-up on mount + on new analysis complete  │
└─────────────────────────────────────────────────────────────┘
```

Visual: three stat blocks separated by vertical dividers, each with:
- Large cyan animated number (`font-mono text-3xl font-bold text-cyan`)
- Small muted uppercase label below
- Subtle pulse dot indicating "live"
- Framer Motion `initial={{ opacity:0, y:10 }}` entrance

## Counter Animation
Custom `useCountUp(target, duration)` hook — increments via `requestAnimationFrame` with an ease-out curve. Restarts whenever `target` changes (new analysis completes → new higher number → re-animates from current to new).

## State Wiring in `Index.tsx`
Track `sessionStats`:
```typescript
const [sessionStats, setSessionStats] = useState({
  reposAnalyzed: 247,
  nodesMapped: 48392,
  riskFlags: 1204,
});
```
After a successful analysis (when `graph` arrives), call:
```typescript
setSessionStats(prev => ({
  reposAnalyzed: prev.reposAnalyzed + 1,
  nodesMapped: prev.nodesMapped + graph.nodes.length,
  riskFlags: prev.riskFlags + graph.stats.hotspots,
}));
```
Pass `sessionStats` as a prop to `LandingPage`.

## Files to change
1. **`src/hooks/useCountUp.ts`** — new hook for animated counter
2. **`src/components/LiveStatsBar.tsx`** — new component with 3 animated counters
3. **`src/pages/Index.tsx`** — add `sessionStats` state, update on analysis complete, pass to `LandingPage`
4. **`src/components/LandingPage.tsx`** — accept `sessionStats` prop, render `<LiveStatsBar>` above the footer, show when `!isAnalyzing && !analysisError`
