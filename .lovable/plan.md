
## Problema exactă

În `GraphCanvas.tsx` linia 401:
```ts
const githubUrl = finding.path ? buildGitHubUrl(graph, finding.path) : null;
```
→ Nu se trimite nicio linie, deci URL-ul deschide fișierul de la început, fără highlight.

`buildGitHubUrl` suportă deja `#L{line}` dar nu e folosit.

## Soluția

### 1. `src/lib/securityAnalysis.ts` — adaugă `line` în `SecurityFinding`

```ts
export interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium';
  label: string;
  nodeId: string;
  path: string;
  line?: number;   // ← NOU: numărul liniei relevante din fișier
  detail: string;
}
```

La generarea findings, populăm `line` astfel:
- **Exposed API** → prima funcție din `node.metadata.functions[]` (dacă există) — e punctul de entry al endpoint-ului
- **Unprotected DB** → prima funcție cu `kind: 'method'` (query method) sau prima funcție disponibilă
- **Complex Auth Logic** → prima funcție din `functions[]` cu cel mai mare index (sau linia 1 dacă nu există)
- **Low Coverage** → `functions[0].line` dacă există, altfel undefined

Fallback: dacă `functions` e gol/undefined → `line` rămâne undefined → URL fără `#L` (comportamentul actual).

### 2. `src/components/graph/GraphCanvas.tsx` — pasare `line` la `buildGitHubUrl`

Schimbare minimă: linia 401, în loc de:
```ts
const githubUrl = finding.path ? buildGitHubUrl(graph, finding.path) : null;
```
devine:
```ts
const githubUrl = finding.path
  ? buildGitHubUrl(graph, finding.path, finding.line)
  : null;
```

GitHub URL-ul devine: `github.com/...repo.../blob/sha/src/api/payments.ts#L42`

## Fișiere de modificat
| Fișier | Schimbare |
|---|---|
| `src/lib/securityAnalysis.ts` | Adaugă `line?: number` în `SecurityFinding`, populat din `functions[]` |
| `src/components/graph/GraphCanvas.tsx` | Pasare `finding.line` la `buildGitHubUrl` |

Un fix mic dar cu impact direct — URL-ul va deschide GitHub exact pe linia problematică.
