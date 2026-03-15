
## Problema

`AISummaryPanel` nu are callback de navigare. Nodurile din "High Risk Nodes", "Entry Points" și "Ghost City" sunt `<div>` statice — click-ul nu face nimic. `Dashboard` trebuie să primească ID-ul nodului selectat, să închidă panelul și să selecteze nodul în graf.

## Ce se construiește

Click pe orice nod din AI Summary Panel → panelul se închide → nodul apare selectat în `NodeInspector` în graf.

Comportament vizual pe hover: cursor pointer, highlight subtil, cu o iconiță mică "→" la dreapta.

## Modificări

### 1. `AISummaryPanel` — adaugă `onNodeSelect` prop

```ts
interface AISummaryPanelProps {
  graph: CodebaseGraph;
  isOpen: boolean;
  onClose: () => void;
  onNodeSelect?: (nodeId: string) => void;  // ← NOU
}
```

Handler intern `handleNodeClick(nodeId)`:
```ts
const handleNodeClick = (nodeId: string) => {
  onNodeSelect?.(nodeId);
  onClose();
};
```

Aplică pe toate 3 liste:
- **High Risk Nodes** (linia ~262) — `<div>` devine `<button>` cu `onClick`
- **Entry Points** (linia ~244) — același tratament  
- **Ghost City / orphans** (linia ~298) — același tratament

Styling hover pe fiecare row:
```
cursor-pointer hover:brightness-110 transition-all
```
Plus o săgeată `→` care apare pe hover la dreapta, lângă label.

### 2. `Dashboard` — pasează callback la `AISummaryPanel`

Linia 601, adaugă prop:
```tsx
<AISummaryPanel
  graph={graph}
  isOpen={summaryOpen}
  onClose={() => setSummaryOpen(false)}
  onNodeSelect={(nodeId) => {
    const n = graph.nodes.find(x => x.id === nodeId);
    if (n) {
      setSelectedNode(n);
      setViewMode('topology');   // asigură că suntem în topology view
    }
    setSummaryOpen(false);
  }}
/>
```

## Fișiere modificate

| Fișier | Schimbare |
|---|---|
| `src/components/AISummaryPanel.tsx` | Prop `onNodeSelect` + `handleNodeClick` + `<button>` pe cele 3 liste |
| `src/components/Dashboard.tsx` | Pasează `onNodeSelect` handler |

## Vizual

```text
AI Summary Panel — High Risk Nodes
┌─────────────────────────────────────────┐
│ ⚠ auth-middleware.ts          CRITICAL  │  ← click → închide panel,
│   Handles JWT validation & session...   │    selectează nod în graf
│                                     →   │  ← săgeată vizibilă pe hover
├─────────────────────────────────────────┤
│ ⚠ payment-service.ts          HIGH      │
│   Processes Stripe webhooks...      →   │
└─────────────────────────────────────────┘
```

Zero schimbări de backend, zero migrații — pur UI.
