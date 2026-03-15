
## Root cause

`useEffect(() => { setNodes(rfNodes); }, [rfNodes])` — adăugat ca fix pentru sincronizarea highlight-urilor — **suprascrie pozițiile dragged** ori de câte ori `rfNodes` se recompute. `rfNodes` depinde de `hoveredNodeId`, `searchHighlightIds`, `blastRadius`, etc., deci orice hover sau schimbare de filtru resetează layout-ul.

## Soluție

Separăm **pozițiile nodurilor** (draggable, persistent) de **datele vizuale** (highlight, dim, etc.).

În loc să facem `setNodes(rfNodes)` complet, folosim `setNodes(prev => ...)` care **păstrează poziția curentă** din state și actualizează doar câmpurile `data.*`:

```ts
useEffect(() => {
  setNodes(prev =>
    prev.map(prevNode => {
      const updated = rfNodes.find(r => r.id === prevNode.id);
      if (!updated) return prevNode;
      // Keep dragged position, update only visual data
      return {
        ...updated,
        position: prevNode.position,
      };
    })
  );
}, [rfNodes]);
```

Astfel:
- `position` vine întotdeauna din `prev` (starea React Flow — include dragul utilizatorului)
- `data.*` (isDimmed, isHighlighted, isSearchMatch etc.) vin din `rfNodes` (proaspăt calculat)
- Reset butonul explicit `handleResetLayout` face `setNodes(rfNodes)` complet (fără merge) → resetează și pozițiile ✓

## Fișier de modificat

| Fișier | Linie | Schimbare |
|---|---|---|
| `src/components/graph/GraphCanvas.tsx` | 242 | Înlocuiește `setNodes(rfNodes)` cu merge care păstrează `position` din state |
