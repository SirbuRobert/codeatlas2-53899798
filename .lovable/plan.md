

## Fix GitHub blob highlight — 2 fișiere

### Problema rădăcină

`endLine` este declarat în `required: ["name", "line", "endLine", ...]` în schema JSON tool-ului. Asta înseamnă că modelul AI **este forțat să furnizeze endLine** chiar și când system prompt-ul îl instruiește să îl omită. Contradicție → AI ghicește bracket-uri → range greșit → GitHub highlight întreaga funcție sau fișier.

`buildGitHubUrl` nu validează `line` — dacă AI trimite `0`, `NaN`, sau `undefined`, URL-ul devine `#L0` / `#LNaN`.

---

### Fix 1 — `supabase/functions/analyze-repo/index.ts`

**Scoate `endLine` din `required`** (linia 173):
```ts
// Înainte
required: ["name", "line", "endLine", "kind", "isExported"]

// După
required: ["name", "line", "kind", "isExported"]
```

**Actualizează descrierea `endLine`** să fie mai strictă și consistentă cu system prompt-ul:
```ts
endLine: {
  type: "number",
  description: "Closing brace line at the SAME indentation as the opening declaration. 
  OMIT unless ALL conditions are true: (1) you counted every bracket manually and are 100% certain, 
  (2) endLine - line <= 60 (short functions only), 
  (3) the file has >= 100 lines total. 
  When in doubt — OMIT. A wrong range is far worse than no range."
}
```

**Actualizează system prompt** (linia 100) să fie consistent: pragul devine 60 linii (în loc de 80) pentru a reduce și mai mult riscul de range greșit.

---

### Fix 2 — `src/components/NodeInspector.tsx`

**Validare defensivă în `buildGitHubUrl`**:
```ts
function buildGitHubUrl(graph: CodebaseGraph, path: string, line?: number): string {
  const base = `https://${graph.repoUrl}/blob/${graph.version}/${path}`;
  // Validate: line must be a finite integer >= 1
  if (!line || !Number.isFinite(line) || line < 1 || Math.floor(line) !== line) return base;
  return `${base}#L${Math.floor(line)}`;
}
```

**Validare defensivă în `FunctionsSection`** — filtrează funcțiile cu `line` invalid înainte de render:
```ts
const validFunctions = functions.filter(
  fn => fn.line && Number.isFinite(fn.line) && fn.line >= 1
);
```

---

### Fișiere modificate

| Fișier | Schimbări |
|---|---|
| `supabase/functions/analyze-repo/index.ts` | Scoate `endLine` din `required`; strictizează descrierea; actualizează prag în system prompt |
| `src/components/NodeInspector.tsx` | Validare `line` în `buildGitHubUrl`; filtrare funcții invalide |

