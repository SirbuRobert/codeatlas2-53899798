
## Goal

Add a floating visual banner inside `GraphCanvas` (overlaid on the graph) that shows:
- How many nodes are highlighted (`X / Y nodes`)
- Which category is active (e.g. `HOTSPOTS`, `ORPHANS`, `COVERAGE`)
- A clear `✕` button that calls `onClearStatFilter` to reset

## What needs to change

### 1. Pass new props to `GraphCanvas`

`GraphCanvas` needs to know the active stat label and the highlight count to show the banner. Add two new optional props:

```ts
statsHighlightLabel?: string | null;
onClearStatFilter?: () => void;
```

### 2. Add the banner inside `GraphCanvas`

Use a `<Panel position="bottom-center">` from React Flow (already imported) — this renders inside the canvas without affecting layout. Wrap in `<AnimatePresence>` + `<motion.div>` for smooth appear/disappear.

Banner design (mono font, glass style consistent with existing panels):
- Left: colored dot indicator + category label (HOTSPOTS → amber, ORPHANS → slate, COVERAGE → green, FILES → cyan, CIRCULAR DEPS → red)
- Center: `X / Y nodes highlighted`
- Right: `✕ Clear` button

```tsx
<Panel position="bottom-center">
  <AnimatePresence>
    {statsHighlightLabel && searchHighlightIds.size > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className="panel-glass flex items-center gap-3 px-4 py-2 rounded-xl border mb-4"
        style={{ borderColor: accentColor, boxShadow: `0 0 16px ${accentColor}33` }}
      >
        <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
        <span className="font-mono text-[10px] font-bold" style={{ color: accentColor }}>
          {statsHighlightLabel}
        </span>
        <span className="font-mono text-[10px] text-foreground-dim">
          {searchHighlightIds.size} / {graph.nodes.length} nodes
        </span>
        <button onClick={onClearStatFilter} className="...">✕ Clear</button>
      </motion.div>
    )}
  </AnimatePresence>
</Panel>
```

Color map per category:
| Label | Color |
|---|---|
| HOTSPOTS | `#f59e0b` (amber) |
| ORPHANS | `#94a3b8` (slate) |
| COVERAGE | `#22c55e` (green) |
| FILES | `#00ffff` (cyan) |
| CIRCULAR DEPS | `#ef4444` (red) |
| default | `#00ffff` |

### 3. Wire up in `Dashboard.tsx`

Pass the two new props to `<GraphCanvas>`:

```tsx
<GraphCanvas
  ...existing props...
  statsHighlightLabel={statsHighlightLabel}
  onClearStatFilter={() => {
    setSearchHighlightIds(new Set());
    setSearchQuery('');
    setStatsHighlightLabel(null);
  }}
/>
```

## Files to modify

| File | Change |
|---|---|
| `src/components/graph/GraphCanvas.tsx` | Add `statsHighlightLabel` + `onClearStatFilter` props, add banner `<Panel>` |
| `src/components/Dashboard.tsx` | Pass new props to `<GraphCanvas>` |
