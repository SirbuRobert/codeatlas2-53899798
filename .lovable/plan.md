
## Goal

Show a "Reset Layout" button **only when at least one node has been dragged** from its initial position. Clicking it snaps all nodes back to their computed initial positions.

---

## How React Flow position state works here

Line 238:
```ts
const [nodes, , onNodesChange] = useNodesState(rfNodes);
```

- `rfNodes` = computed from `graph.nodes` positions (deterministic, never changes between renders unless `graph` changes)
- React Flow's internal `nodes` state is what actually moves when the user drags
- The `setNodes` callback is currently discarded — we need to keep it

The initial positions live in `rfNodes` (derived from `graph.nodes[*].position`). After a drag, the React Flow `nodes` array will have different `position` values for the moved node(s).

---

## Implementation

### 1. Keep `setNodes` from `useNodesState`

```ts
const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
```

### 2. Detect if any node has moved

After every `onNodesChange`, compare current node positions against the initial positions from `rfNodes`. Use a `useMemo` or derive it inline:

```ts
const hasDraggedNodes = useMemo(() => {
  return nodes.some(n => {
    const orig = rfNodes.find(r => r.id === n.id);
    if (!orig) return false;
    return Math.abs(n.position.x - orig.position.x) > 2 ||
           Math.abs(Math.abs(n.position.y - orig.position.y) > 2);
  });
}, [nodes, rfNodes]);
```

### 3. Reset handler

```ts
const handleResetLayout = useCallback(() => {
  setNodes(rfNodes);
}, [setNodes, rfNodes]);
```

### 4. Add the button as a `<Panel position="top-right">` inside `<ReactFlow>`

Position: `top-right` — consistent with the minimap being bottom-right and controls bottom-left. Appears only when `hasDraggedNodes === true`. Uses `AnimatePresence` + `motion.div` for smooth appear/disappear.

```tsx
<AnimatePresence>
  {hasDraggedNodes && (
    <Panel position="top-right">
      <motion.button
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        onClick={handleResetLayout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg panel-glass border border-border font-mono text-[10px] text-foreground-dim hover:text-foreground hover:border-border-bright transition-all mr-2 mt-2"
      >
        <RotateCcw className="w-3 h-3" />
        Reset Layout
      </motion.button>
    </Panel>
  )}
</AnimatePresence>
```

---

## Files to modify

| File | Change |
|---|---|
| `src/components/graph/GraphCanvas.tsx` | Keep `setNodes`, add `hasDraggedNodes` memo, `handleResetLayout` callback, add `<Panel>` button with `RotateCcw` icon from lucide-react |

Single file change only.
