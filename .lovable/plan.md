
## What needs to be built

The `/security-review` command currently just triggers blast-radius on the most critical node — a placeholder. We need a real, distinct security topology overlay that:

1. **Identifies security-relevant nodes** deterministically from flags (`security-critical`), type (`api`, `database`), and label keywords (`auth`, `jwt`, `token`, `permission`, `middleware`, `session`, `oauth`, `crypto`, `password`, `secret`).
2. **Traces security paths** — for each security node, traverses edges to build an "auth chain" subgraph (the set of nodes that either call into or are called by security nodes).
3. **Renders a purple overlay** on the Topology view — security nodes glow purple/violet, security-path edges pulse in purple, all other nodes/edges are heavily dimmed.
4. **Shows a Security Panel** (parallel to the Blast Radius panel) with a breakdown: auth nodes, exposed API surfaces, unprotected database nodes, JWT/token handlers.
5. **Wires up the command** so `/security-review` activates this mode instead of blast-radius.

## Architecture

### New state in Dashboard
```
securityOverlayActive: boolean
```
Separate from `blastRadiusNodeId`. When active, passes a `securityOverlay` prop to `GraphCanvas`.

### New utility: `src/lib/securityAnalysis.ts`
Pure function — takes `CodebaseGraph`, returns `SecurityAnalysis`:
```typescript
interface SecurityAnalysis {
  securityNodeIds: Set<string>;     // direct auth/crypto/jwt nodes
  authChainIds: Set<string>;        // nodes in the call chain of security nodes
  exposedApiIds: Set<string>;       // api-type nodes with no upstream auth guard
  unprotectedDbIds: Set<string>;    // database nodes reachable without passing an auth node
  findings: SecurityFinding[];      // list of human-readable findings
}

interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium';
  label: string;
  nodeId: string;
  detail: string;
}
```

Detection heuristics (all client-side, no AI call needed):
- **Security keywords** in label/path: `auth`, `jwt`, `token`, `session`, `permission`, `oauth`, `crypto`, `password`, `secret`, `middleware`, `guard`, `policy`, `rbac`, `acl`
- **Flag-based**: `security-critical` flag
- **Type-based**: `database` type nodes get scrutinised; `api` type nodes checked for auth guard presence
- **Exposed APIs**: api-type nodes with no path from any security node to them (no auth guard in call chain)
- **Unprotected DB**: database nodes reachable from api nodes without traversing a security node

### Changes to `GraphCanvas.tsx`
Add `securityOverlay: SecurityAnalysis | null` prop.

When active:
- **Security nodes** (`securityNodeIds`): purple glow, `isSecurityNode=true` flag in node data
- **Auth chain nodes** (`authChainIds`): dim purple tint, `isAuthChain=true`
- **Exposed API nodes**: red border override, `isExposed=true`
- **All other nodes**: heavily dimmed (opacity 0.08)
- **Security edges** (edges between security/auth-chain nodes): `rgba(168,85,247,0.8)` stroke, animated, width 2.5
- **Non-security edges**: opacity 0.04

Add a **Security Panel** in `<Panel position="top-right">` (parallel to blast radius panel):
- Purple border/glow
- Lists finding counts: `N auth nodes · M exposed APIs · K unprotected DB routes`
- Shows top 3 findings from `findings[]`

### Changes to `AxonGraphNode.tsx`
Add `isSecurityNode`, `isAuthChain`, `isExposed` to `AxonNodeData`.
- `isSecurityNode`: replaces border with purple `#a855f7`, adds `🔐 AUTH` chip
- `isAuthChain`: adds subtle purple tint to background
- `isExposed`: adds `⚠ EXPOSED` chip in red (no auth guard on api node)

### Changes to `Dashboard.tsx`
- Add `securityOverlayActive: boolean` state
- `onSecurityReview` callback: sets `securityOverlayActive = true`, clears blast radius and selected node
- Add purple indicator badge in topbar when active ("🔐 SECURITY SCAN ACTIVE")
- Compute `securityAnalysis` from graph when overlay is active
- Pass to `GraphCanvas`
- Add `onSecurityReview` to `buildSlashCommands` callback

### Files to create/modify
1. **`src/lib/securityAnalysis.ts`** — new pure analysis utility
2. **`src/components/graph/GraphCanvas.tsx`** — add overlay rendering + Security Panel
3. **`src/components/graph/AxonGraphNode.tsx`** — add security visual states
4. **`src/components/Dashboard.tsx`** — wire up state + command handler + topbar badge

No backend changes needed — everything is derived client-side from the existing graph data.
