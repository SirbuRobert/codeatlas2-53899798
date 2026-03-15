

## What to build

Two interconnected features in the **NodeInspector** panel:

1. **Functions list** — each node shows a collapsible list of functions/classes/exports found in that file, each with a line number badge
2. **"Open in GitHub" deep link** — clicking any function opens `github.com/owner/repo/blob/branch/path#Lnn` directly in a new tab; clicking the "VIEW SOURCE" button opens the file root

---

## Where the data comes from

The AI edge function already generates nodes with `path`. The functions/exports list needs to be added as an optional field `functions?: FunctionEntry[]` on `AxonNode.metadata`.

```ts
interface FunctionEntry {
  name: string;         // e.g. "handleLogin"
  line: number;         // e.g. 42
  kind: 'function' | 'class' | 'export' | 'const' | 'method';
  isExported: boolean;
}
```

The AI prompt already asks for complexity etc — we extend it to also emit this array per node. This is a **prompt-only change** to the edge function, no new API calls.

---

## Architecture

### 1. `src/types/graph.ts`
Add `FunctionEntry` interface and `functions?: FunctionEntry[]` to `AxonNode.metadata`.

### 2. `supabase/functions/analyze-repo/index.ts` (AI prompt + tool schema)
- Add `functions` array to the `generate_codebase_graph` tool schema per node:
  ```json
  "functions": {
    "type": "array",
    "items": {
      "name": "string",
      "line": "number",
      "kind": "function|class|export|const|method",
      "isExported": "boolean"
    }
  }
  ```
- Add one line to the system prompt: *"For each node, list the top 8 exported functions/classes/methods with their approximate line numbers from the file content."*

### 3. `src/hooks/useAnalyzeRepo.ts`
- Map `raw.functions` through `toAxonNode()` so it lands in `metadata.functions`.

### 4. `src/components/NodeInspector.tsx`

**GitHub URL builder utility (inside the file):**
```ts
function buildGitHubUrl(graph: CodebaseGraph, path: string, line?: number): string {
  // graph.repoUrl = "github.com/owner/repo"
  // graph.version = "main"
  const base = `https://${graph.repoUrl}/blob/${graph.version}/${path}`;
  return line ? `${base}#L${line}` : base;
}
```

**New `FunctionsSection` component (inside NodeInspector.tsx):**
- Collapsible section "FUNCTIONS & EXPORTS" (same `CollapsibleSection` pattern)
- Each row: `[kind badge] functionName  [line#]  [↗ icon]`
- Row click → `window.open(githubUrl, '_blank')`
- Color-coded kind badges: `function`=amber, `class`=purple, `export`=cyan, `const`=slate

**"VIEW SOURCE" button fix:**
- Currently a dead button — wire it to `window.open(buildGitHubUrl(graph, node.metadata.path), '_blank')`

**NodeInspector props update:**
- Add `graph` (already optional) — already present ✓
- The `graph` prop carries `repoUrl` and `version` needed for URL building

---

## Visual design of the functions list

```
FUNCTIONS & EXPORTS                    [8]  ▼
┌──────────────────────────────────────────┐
│ fn  handleLogin          L42    ↗        │
│ fn  handleLogout         L89    ↗        │
│ cls AuthService          L12    ↗        │
│ exp validateToken        L156   ↗        │
└──────────────────────────────────────────┘
```

Kind badges are tiny colored pills (2-3 chars). Line number is muted. Arrow icon appears on hover.

---

## Mock data update

`src/data/mockGraph.ts` — add `functions: []` arrays to a few representative nodes so the feature is visible immediately without re-analyzing.

---

## Files to change

| File | Change |
|---|---|
| `src/types/graph.ts` | Add `FunctionEntry` type + `functions?` field |
| `supabase/functions/analyze-repo/index.ts` | Extend tool schema + system prompt for functions |
| `src/hooks/useAnalyzeRepo.ts` | Map `raw.functions` in `toAxonNode` |
| `src/components/NodeInspector.tsx` | `FunctionsSection` component + GitHub URL builder + wire VIEW SOURCE |
| `src/data/mockGraph.ts` | Add sample functions to a few nodes |

No new files. No DB changes. No new secrets.

