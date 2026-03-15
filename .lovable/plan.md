
## Problema
Security scan-ul afișează findings (ex: "Exposed API: PaymentController") dar fiecare finding este un div static, fără nicio acțiune. Utilizatorul vrea:
1. **Click pe un finding → deschide GitHub la fișierul/linia exactă** cu problema
2. **Click pe un finding → navigare la nodul respectiv** (deschide NodeInspector)

## Date disponibile
`SecurityFinding` are deja `nodeId`. Fiecare `AxonNode` are `metadata.path` + `metadata.functions[]` cu line numbers. `CodebaseGraph` are `repoUrl` + `version`. Funcția `buildGitHubUrl()` există deja în `NodeInspector.tsx` — o putem extrage sau duplica.

## Ce construim

### 1. `src/lib/securityAnalysis.ts` — adaugă `path` în `SecurityFinding`
```ts
export interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium';
  label: string;
  nodeId: string;
  path: string;   // ← NOU: metadata.path al nodului
  detail: string;
}
```
La generarea findings, adăugăm `path: node.metadata.path` pe fiecare obiect.

### 2. `src/components/graph/GraphCanvas.tsx` — findings clickabile în security panel

Panoul "Top Findings" primește două noi props prin `onFindingClick`:
- `onFindingNodeSelect: (nodeId: string) => void` — deschide NodeInspector
- `graph: CodebaseGraph` — pentru a construi URL GitHub

**Fiecare finding row** devine un `<button>` cu două acțiuni:
```
┌─────────────────────────────────────────────────┐
│ 🔴  Exposed API: PaymentController               │
│     API endpoint has no auth guard...            │
│                           [↗ GitHub]  [Inspect →]│
└─────────────────────────────────────────────────┘
```
- **↗ GitHub**: `window.open(buildGitHubUrl(graph, finding.path), '_blank')`
- **Inspect →**: `onFindingNodeSelect(finding.nodeId)` → Dashboard selectează nodul

### 3. `src/components/Dashboard.tsx` — pasare props noi la `GraphCanvas`
```tsx
<GraphCanvas
  ...
  onFindingNodeSelect={(nodeId) => {
    const n = graph.nodes.find(x => x.id === nodeId);
    if (n) setSelectedNode(n);
  }}
  graph={graph}  // deja există
/>
```

GraphCanvas deja primește `graph` ca prop ✓

## UX Flow
```
Security Scan activ → panoul stânga shows findings
  
  [🔴 Exposed API: PaymentController]
       → click "↗ GitHub": deschide github.com/.../payments.ts
       → click "Inspect →": NodeInspector slide-in pe PaymentController
                             + nodul se selectează/evidențiază pe canvas
```

## Fișiere de modificat
| Fișier | Schimbare |
|---|---|
| `src/lib/securityAnalysis.ts` | Adaugă `path` la `SecurityFinding` |
| `src/components/graph/GraphCanvas.tsx` | Prop `onFindingNodeSelect`, findings clickabile cu buton GitHub + Inspect |
| `src/components/Dashboard.tsx` | Pasare `onFindingNodeSelect` callback |

Fără DB, fără edge functions, fără tipuri noi mari.
