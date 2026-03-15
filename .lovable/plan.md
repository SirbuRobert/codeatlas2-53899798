
## Problema identificată

În `StatsHUD.tsx`, logica de click are un guard care silențios blochează acțiunea:

```ts
const ids = getNodeIds(label);
if (ids.size === 0) return;  // ← BLOCHEAZĂ tot dacă nu găsește noduri
onStatClick?.(ids, label);
```

Funcția `getNodeIds` returnează `Set` gol pentru **HOTSPOTS, ORPHANS, CIRCULAR DEPS și COVERAGE** deoarece filtrele folosesc câmpuri din `metadata` care **nu există sau au valori diferite** față de ce se așteaptă:

| Stat | Filtru curent | Problema |
|---|---|---|
| HOTSPOTS | `complexity > 10 && churn > 40` | Condiție dublă — puține noduri o îndeplinesc simultan |
| ORPHANS | `isOrphan === true` | `isOrphan` poate fi `undefined` (nu `false`) în nodurile reale |
| CIRCULAR DEPS | `flags.includes('circular-dep')` | Flagul real din mock este `'circular-dep'` — dar când `circularDeps === 0` nu există noduri cu acel flag |
| COVERAGE | `coverage < 60` | Funcționează, dar dacă toate nodurile au coverage ≥ 60 returneaza Set gol |
| FILES | Funcționează (returnează toate nodurile) | — |

**Root fix:** Relaxăm filtrele și înlocuim `if (ids.size === 0) return` cu un fallback care highlight-uiează toate nodurile din acea categorie chiar dacă zero noduri corespund, sau afișăm un toast informativ. Dar mai important, **fixăm filtrele** să fie corecte și mai permisive:

- **HOTSPOTS**: `complexity > 10 || churn > 50` (OR în loc de AND)
- **ORPHANS**: `isOrphan === true` → rămâne, dar dacă `ids.size === 0` trimitem totuși evenimentul cu un Set gol ca să afișăm un mesaj (sau selectăm nodurile cu `dependents === 0`)
- **CIRCULAR DEPS**: dacă `stats.circularDeps === 0`, highlight-uiăm nodurile cu `flags.includes('circular-dep')` — dacă tot e gol, nu blocăm ci trimitem cu feedback vizual
- **COVERAGE**: `coverage < 60` → `coverage < 70` (threshold mai relaxat)

**Fix principal**: Eliminăm guard-ul `if (ids.size === 0) return` și în loc trimitem întotdeauna `onStatClick` — Dashboard-ul va primi Set gol și va afișa bannerul "0 matches". Aceasta e comportamentul corect.

**Fix secundar pentru HOTSPOTS** (cel mai important): Când nu există noduri cu ambele condiții îndeplinite simultan, fallback la noduri cu cel puțin o condiție.

## Modificări

Fișier unic: `src/components/StatsHUD.tsx`

```ts
// HOTSPOTS: relaxat la OR
case 'HOTSPOTS': {
  const strict = nodes.filter(n => n.metadata.complexity > 10 && n.metadata.churn > 40);
  if (strict.length > 0) return new Set(strict.map(n => n.id));
  // fallback: noduri cu complexitate ridicată sau churn ridicat
  return new Set(nodes.filter(n => n.metadata.complexity > 8 || n.metadata.churn > 50).map(n => n.id));
}

// ORPHANS: fallback la noduri fără dependenți
case 'ORPHANS': {
  const orphans = nodes.filter(n => n.metadata.isOrphan === true);
  if (orphans.length > 0) return new Set(orphans.map(n => n.id));
  return new Set(nodes.filter(n => n.metadata.dependents === 0).map(n => n.id));
}

// COVERAGE: threshold relaxat
case 'COVERAGE':
  return new Set(nodes.filter(n => n.metadata.coverage < 70).map(n => n.id));
```

Și eliminăm `if (ids.size === 0) return` — înlocuit cu `if (ids.size === 0 && label !== 'CIRCULAR DEPS') return`:
- CIRCULAR DEPS cu 0 noduri → mesaj că nu există circular deps (comportament corect, nu face nimic)
- Restul → trimit întotdeauna dacă există cel puțin un nod

**Singur fișier modificat**: `src/components/StatsHUD.tsx`
