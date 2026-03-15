
## Ce facem

**Problema**: În secțiunea "Imported By" / "Exports To" din NodeInspector, fiecare chip de nod e vizual dar nu e navigabil — click pe el nu face nimic. Utilizatorul vrea să poată apăsa pe un nod conex și să se ducă direct la el (inspector slide-in pentru acel nod).

**Soluția**: Adăugăm `onNodeSelect: (nodeId: string) => void` ca prop la `NodeInspector`, și facem fiecare chip din `NodeRefRow` clickabil — click pe chip → `onNodeSelect(nodeId)` → Dashboard-ul setează `selectedNode` → inspector-ul se animează la noul nod. Un mic trail de navigare "breadcrumb" (Back button) completeaza UX-ul.

---

## Modificări

### `src/components/NodeInspector.tsx`

1. **Adaugă prop** `onNodeSelect: (nodeId: string) => void` la `NodeInspectorProps`

2. **`NodeRefRow`**: înlocuim div-ul cu un `<button>` clickabil pe întreaga suprafață:
   - Click pe chip → `onNodeSelect(nodeId)` — navighezi la acel nod
   - Butonul ⚡ Blast Radius rămâne (stop propagation)
   - Hover: border se aprinde cu culoarea tipului nodului + subtle glow
   - Cursor pointer + `→` icon apare la hover (ca indiciu de navigare)

3. **Navigation breadcrumb / "Back" button**: Adăugăm un mini-history stack intern (`useState<string[]>`) în `NodeInspector` — când navighezi de la nod A la nod B, se adaugă A în stack. Un buton `← Back` apare în header dacă există istoric, care readuce inspecția la nodul anterior.
   - Stack-ul se resetează la `onClose` sau când `node.id` se schimbă din exterior.

4. **`CollapsibleSection` pentru conexiuni**: titlul secțiunilor "↑ Imported By" și "↓ Exports To" primesc un tooltip/subtitle: `"click any node to inspect it"`

### `src/components/Dashboard.tsx`

Pasăm `onNodeSelect` la `<NodeInspector>`:
```tsx
onNodeSelect={(nodeId) => {
  const n = graph.nodes.find(x => x.id === nodeId);
  if (n) setSelectedNode(n);
}}
```

---

## UX Flow

```
User clicks AuthService node
  → Inspector opens (AuthService)
  → "Imported By" section shows: [ApiGateway] [UserController]
  
User clicks [ApiGateway] chip
  → Inspector animates to ApiGateway
  → Header shows "← Back" button
  
User clicks "← Back"
  → Inspector returns to AuthService
```

---

## Fișiere de modificat
- `src/components/NodeInspector.tsx` — prop `onNodeSelect`, `NodeRefRow` clickabil, back navigation stack
- `src/components/Dashboard.tsx` — pasare `onNodeSelect` callback

Fără DB, fără edge functions, fără tipuri noi.
