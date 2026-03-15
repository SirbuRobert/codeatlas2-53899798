
## Ce se schimbă

Un singur bloc de eliminat din `src/components/Dashboard.tsx`: butonul "Dead Code" din toolbar (liniile 293-306), inclusiv comentariul `{/* Ghost City */}` de deasupra lui.

Funcționalitatea ghost city rămâne complet funcțională prin:
- StatsHUD — click pe contorul de orphans
- CommandBar — `/ghost-city`
- Badge-ul activ `👻 GHOST CITY` din overlay bar (liniile 234-243) rămâne neschimbat

## Fișier de modificat

| Fișier | Linii | Schimbare |
|---|---|---|
| `src/components/Dashboard.tsx` | 293-306 | Șterge întregul bloc buton "Dead Code" + comentariul `{/* Ghost City */}` |

Import-ul `Ghost` din linia 4 este folosit și în overlay bar (linia 241), deci **nu** îl șterg.
