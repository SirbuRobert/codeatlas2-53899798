
## Problema reală

`buildGitHubUrl` construiește `#L{line}-L{endLine}` direct din datele AI fără validare. Există 3 surse de eroare:

1. **AI pune `line` pe prima apariție a numelui** (un comentariu, un import, un tip) — nu pe declarația efectivă (`function foo`, `class Bar`, `const x =`)
2. **`endLine` supraestimat** — AI numără greșit adâncimea bracket-urilor și dă un range mult prea mare
3. **System prompt-ul nu e suficient de strict** — zice "look for matching closing `}`" dar nu specifică să ignore comentariile/importurile

### Fix în 2 locuri

**1. `supabase/functions/analyze-repo/index.ts` — system prompt mai strict:**

Instrucțiuni noi explicite:
- `line` = linia cu `function`, `class`, `const`, `export function`, `async function`, `=>` — NU comentarii, NU importuri, NU tipuri
- `endLine` = linia cu `}` de închidere la același nivel de indentare ca `line` — dacă nu ești sigur, omite `endLine` (mai bine fără range decât range greșit)
- Exemplu explicit în prompt: `42: export async function loginUser(` → `line: 42`, nu `38` care e comentariul `// loginUser handles...`

**2. `src/components/NodeInspector.tsx` — `buildGitHubUrl` mai defensivă:**

Adaugă validare:
```ts
// Sanitize: endLine must be strictly greater than line by at least 1
// and not absurdly large (>500 lines for a single function = AI hallucination)
const safeEnd = endLine && endLine > line && (endLine - line) < 500 ? endLine : undefined;
```
- Dacă `endLine - line > 500` → ignorăm endLine (evităm highlight pe toată lumea)
- Dacă `endLine <= line` → ignorăm endLine
- Rezultat: fallback la `#L{line}` singur (cel puțin linia exactă)

### Fișiere modificate
1. `supabase/functions/analyze-repo/index.ts` — linia ~95 și ~163-164 (prompt + tool schema description)
2. `src/components/NodeInspector.tsx` — funcția `buildGitHubUrl` (linia 63-70)
