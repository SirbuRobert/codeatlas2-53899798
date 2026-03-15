
## The Problem

GitHub supports range highlighting via `#L10-L25` in blob URLs. Currently `buildGitHubUrl` only produces `#L{line}` (start line only). The `FunctionEntry` type has no `endLine` field, so the end of a block is unknown.

There are two layers to fix:

### Layer 1 — Type + AI schema: add `endLine` to `FunctionEntry`
The AI already receives file contents with explicit line numbers. We need to ask it to also return the closing line of each function/class/block.

- `src/types/graph.ts`: add `endLine?: number` to `FunctionEntry`
- `supabase/functions/analyze-repo/index.ts`: add `endLine` to the tool schema for `functions[]` items and update the system prompt instruction

### Layer 2 — URL builder: use `#L{start}-L{end}` when `endLine` is known
GitHub's range highlight syntax is `#L10-L25`.

- `src/components/NodeInspector.tsx`: update `buildGitHubUrl` signature to accept `endLine?` and produce `#L{line}-L{endLine}` when both are present
- `src/components/graph/GraphCanvas.tsx`: same update to its local `buildGitHubUrl` copy
- In `FunctionsSection`, pass `fn.endLine` to `buildGitHubUrl`

## Files changed

| File | Change |
|---|---|
| `src/types/graph.ts` | Add `endLine?: number` to `FunctionEntry` |
| `supabase/functions/analyze-repo/index.ts` | Add `endLine` to tool schema + system prompt |
| `src/components/NodeInspector.tsx` | Update `buildGitHubUrl` to use `#L{n}-L{end}`, pass `fn.endLine` |
| `src/components/graph/GraphCanvas.tsx` | Same `buildGitHubUrl` update |

No new dependencies. The `endLine` field is optional so all existing cached graphs degrade gracefully to single-line links (no regression). Newly analyzed repos will get full range highlighting.
