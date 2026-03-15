
## Ce vrea utilizatorul

Două lucruri distincte:
1. **Search mai inteligent** — să găsească nodul care *conține* o funcție căutată (ex: caută "handleAuth" → găsește fișierul care are acea funcție în lista sa `functions[]`)
2. **Chat în limbaj natural cu proiectul** — să poți întreba "care fișier gestionează autentificarea?" și să primești răspunsuri AI bazate pe datele grafului

---

## Problema cu search-ul actual

`scoreNode()` nu caută în `node.metadata.functions[]` — lista de funcții exportate din fiecare nod. Deci "handleAuth" nu returnează nimic chiar dacă există în `functions[].name`.

**Fix simplu**: adaugăm în haystack toate `functions[].name` din nod.

---

## Chat cu proiectul — arhitectură

Vom crea:

### 1. Edge function nouă: `supabase/functions/chat-repo/index.ts`
Primește `{ messages, graphContext }` — `graphContext` e un rezumat compact al grafului (noduri + funcții + edges). Apelează Lovable AI cu context complet și returnează răspuns streaming.

System prompt specializat:
```
You are an expert code analyst with full knowledge of this codebase graph.
Answer questions about architecture, files, functions, risk, dependencies.
When mentioning a file/node, use its exact label name.
```

### 2. Componentă nouă: `src/components/RepoChatPanel.tsx`
- Drawer lateral (right side, similar cu AISummaryPanel)
- Input de chat + istoric conversație
- Streaming răspuns token-by-token
- Când AI menționează un nod cunoscut, afișează chip clickabil → focusează nodul în graf
- Buton de deschidere în toolbar: **"Ask AI"** cu icon `MessageSquare`

### 3. Integrare în Dashboard
- Stare `chatOpen` + buton "Ask AI" în toolbar
- Prop `onNodeFocus` pentru a focaliza un nod din chat

---

## Îmbunătățiri search

În `SearchBar.tsx`, funcția `scoreNode` primește și caută în `functions[]`:

```ts
// Adăugăm în haystack:
...(node.metadata.functions ?? []).map(f => f.name.toLowerCase()),
```

Și scor suplimentar pentru match exact pe funcție:
```ts
const fnNames = (node.metadata.functions ?? []).map(f => f.name.toLowerCase());
for (const word of words) {
  if (fnNames.some(fn => fn.includes(word))) score += 5; // mai mare decât label
}
```

---

## Context trimis la AI pentru chat

Construim un context compact JSON (max ~6000 chars) din graph:

```ts
const graphContext = {
  repoUrl: graph.repoUrl,
  summary: graph.summary,
  stats: graph.stats,
  nodes: graph.nodes.map(n => ({
    id: n.id,
    label: n.label,
    type: n.type,
    path: n.metadata.path,
    summary: n.metadata.semanticSummary,
    risk: n.metadata.riskLevel,
    flags: n.metadata.flags,
    functions: (n.metadata.functions ?? []).map(f => f.name),
    isEntryPoint: n.metadata.isEntryPoint,
  })),
  edges: graph.edges.map(e => ({ s: e.source, t: e.target, r: e.relation })),
};
```

---

## Fișiere de modificat/creat

| Fișier | Schimbare |
|---|---|
| `src/components/SearchBar.tsx` | Adaugă `functions[].name` în haystack + scor mai mare |
| `supabase/functions/chat-repo/index.ts` | **NOU** — edge function streaming chat cu context graf |
| `supabase/config.toml` | Adaugă entry `[functions.chat-repo]` |
| `src/components/RepoChatPanel.tsx` | **NOU** — drawer chat cu streaming |
| `src/components/Dashboard.tsx` | Adaugă buton "Ask AI" + stare chatOpen + prop onNodeFocus |

---

## UX al chat-ului

```text
┌─────────────────────────────────────┐
│ 🤖 ASK YOUR CODEBASE               │
│ nextjs/next.js                      │
├─────────────────────────────────────┤
│                                     │
│  [user] care fișier gestionează     │
│         autentificarea?             │
│                                     │
│  [AI] Autentificarea este           │
│       gestionată în principal de:   │
│  ┌─ [auth-middleware] ─────────┐    │
│  │ security-critical • high    │    │
│  └─────────────────────────────┘    │
│  Acesta conține handleAuth(),       │
│  verifyJWT() și ...                 │
│                                     │
├─────────────────────────────────────┤
│ [input] Ask anything about...   [→] │
└─────────────────────────────────────┘
```

Nodurile menționate de AI (detectate prin match cu `node.label`) apar ca chip-uri clickabile care focusează nodul în graf.
