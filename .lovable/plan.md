
## Ce construim

Un panel **"Explain This Repo"** — un modal care apare la primul acces al dashboard-ului și poate fi redeschis oricând dintr-un buton din top bar. Conținutul este generat din datele grafului deja analizat (nu necesită AI call adițional), structurat ca un ghid clar și orientat pe acțiune.

---

## UX Decision

**Nu** un tooltip sau popover mic — repo-urile complexe merită spațiu. Facem un **modal centrat** (nu drawer) cu 3 secțiuni scrollabile:

1. **Ce face repo-ul** — `graph.summary` + architecture style detectat
2. **Cum să îl navighezi** — ghid interactiv cu butoanele din dashboard (Topology / Treemap / Solar, Blast Radius, Security Scan etc.)
3. **De unde să începi** — Entry points clickabile + top risk nodes ca prim pas de investigație

Butonul din top bar: **`? Explain Repo`** — între "Business View" și "TOUR", cu iconița `BookOpen` sau `Sparkles`.

---

## Auto-show la prima vizită

- La primul render al Dashboard-ului cu un nou `graph.repoUrl`, verificăm `localStorage` pentru cheia `axon_explained_<repoSlug>`.
- Dacă nu există → modal se deschide automat după 800ms (delay ca graful să se rendereze mai întâi).
- La închidere → setăm cheia în localStorage ca să nu mai apară automat la reload.

---

## Structura modalului

```
┌─────────────────────────────────────────────┐
│  📖 UNDERSTANDING THIS REPO                  [X] │
│  github.com/user/repo                          │
├─────────────────────────────────────────────┤
│                                               │
│  WHAT IS THIS?                                │
│  ┌─────────────────────────────────────────┐ │
│  │ Architecture: Monolith + Service Layer  │ │
│  └─────────────────────────────────────────┘ │
│  [graph.summary text here — 2-3 sentences]    │
│                                               │
│  QUICK STATS                                  │
│  47 files · 12,400 lines · 3 languages        │
│  Avg complexity: 7.4 (moderate)               │
│                                               │
│  WHERE TO START                               │
│  🚀 Entry Points (clickable → focuses node)   │
│     main.ts      index.ts    app.ts           │
│                                               │
│  ⚠ Watch Out For                             │
│     [CRITICAL] BillingService  [HIGH] Auth    │
│                                               │
│  HOW TO EXPLORE                               │
│  ┌──────────────────────────────────────────┐│
│  │ Topology  — see all file connections    ││
│  │ Treemap   — size = lines of code        ││
│  │ Solar     — 3D force-directed graph     ││
│  │ ⌘K        — run commands (blast radius) ││
│  └──────────────────────────────────────────┘│
│                                               │
│  [Got it, start exploring →]                  │
└─────────────────────────────────────────────┘
```

---

## Fișiere de modificat

### `src/components/RepoExplainerModal.tsx` (fișier nou)
- Modal centrat (același pattern `fixed inset-0 flex items-center justify-center` ca ExportModal)
- Props: `graph: CodebaseGraph`, `isOpen: boolean`, `onClose: () => void`, `onFocusNode: (id: string) => void`
- Conținut derivat 100% din `graph` — fără API call
- Buton "Got it" → `onClose()` + marchează `localStorage`

### `src/components/Dashboard.tsx`
- Adăugăm state: `explainerOpen` (`boolean`)
- `useEffect` la mount: dacă `localStorage` nu are cheia repo-ului → `setTimeout(() => setExplainerOpen(true), 800)`
- Adăugăm buton în top bar: `<BookOpen /> Explain Repo` (lângă TOUR)
- Render `<RepoExplainerModal>` în josul JSX-ului (lângă AISummaryPanel și ExportModal)
- `onFocusNode` → setează `selectedNode` + focus în graph

---

## Nu necesită
- Edge functions, DB, AI calls suplimentare — totul vine din `graph` deja disponibil
