
## Problema exactă

Din imagini e clar: AI-ul dă `endLine: 387` pentru `NewDockerClient` care e linia de final a întregului fișier `docker/client.go` (~387 linii total). Nu contează că avem limita de 300 — 387-15=372 < 300, deci trece validarea și se generează `#L15-L387` care highlightează tot fișierul.

**Cauza rădăcină**: AI-ul nu poate număra bracket-uri corect pentru funcții mari (Go struct methods, constructori) — confundă `}` final al funcției cu `}` final al fișierului sau al unui bloc outer.

**Soluția reală**: Afișare doar linia de start (`#L{line}`) — exact cum face GitHub în propriul Symbols panel. GitHub nu highlightează range-uri în Symbols; afișează `func NewDockerClient` → te duce la linia declarației, nimic mai mult.

---

## Fix în 2 locuri

### 1. `src/components/NodeInspector.tsx` — elimină `endLine` din URL și display

**`buildGitHubUrl`**: Nu mai folosi `endLine` deloc — trimite întotdeauna `#L{line}` singur.

**`FunctionsSection` row**: Afișează doar `L{line}` în loc de `L15–387`.

```ts
// Înainte:
const safeEnd = endLine && endLine > line && (endLine - line) <= 300 ? endLine : undefined;
if (safeEnd) return `${base}#L${line}-L${safeEnd}`;
return `${base}#L${line}`;

// După:
// Ignorăm endLine complet — GitHub Symbols face la fel: link doar la linia declarației
return `${base}#L${line}`;
```

**Display label** (linia 235): `L${fn.line}` mereu, fără range.

**Tooltip** (linia 218): `Open ${fn.name} on GitHub (L${fn.line})` fără range.

### 2. `supabase/functions/analyze-repo/index.ts` — instrucțiuni mai stricte

Adaugă în system prompt la secțiunea despre `endLine`:

> "IMPORTANT: If the function/struct body spans more than 80 lines, or if you are not 100% certain of the exact closing brace line, **OMIT endLine entirely**. It is far better to link to only the declaration line than to highlight a 300-line range incorrectly."

Și actualizează tool schema description pentru `endLine`:
```
"endLine": { description: "Line number of the closing '}'. OMIT if uncertain or if endLine - line > 80. Better no range than wrong range." }
```

---

## Fișiere modificate
1. `src/components/NodeInspector.tsx` — `buildGitHubUrl` + display label + tooltip
2. `supabase/functions/analyze-repo/index.ts` — system prompt + tool schema pentru endLine
