// ═══════════════════════════════════════════════
//  AXON Security Analysis — Client-side Engine
// ═══════════════════════════════════════════════

import type { CodebaseGraph, AxonNode } from '@/types/graph';

const SECURITY_KEYWORDS = [
  'auth', 'jwt', 'token', 'session', 'permission', 'oauth', 'crypto',
  'password', 'secret', 'middleware', 'guard', 'policy', 'rbac', 'acl',
  'login', 'logout', 'signup', 'verify', 'validate', 'sanitize', 'encrypt',
  'decrypt', 'hash', 'salt', 'csrf', 'cors', 'helmet', 'firewall', 'certificate',
];

export interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium';
  label: string;
  nodeId: string;
  path: string;
  line?: number;  // Line number for GitHub deep-link highlight
  detail: string;
}

export interface SecurityAnalysis {
  /** Direct auth / crypto / JWT nodes */
  securityNodeIds: Set<string>;
  /** Nodes in the call chain of security nodes */
  authChainIds: Set<string>;
  /** api-type nodes with no upstream auth guard */
  exposedApiIds: Set<string>;
  /** database nodes reachable without passing an auth node */
  unprotectedDbIds: Set<string>;
  /** Human-readable findings sorted by severity */
  findings: SecurityFinding[];
}

function isSecurityNode(node: AxonNode): boolean {
  const labelLower = node.label.toLowerCase();
  const pathLower = (node.metadata.path ?? '').toLowerCase();
  const hasKeyword = SECURITY_KEYWORDS.some(
    (kw) => labelLower.includes(kw) || pathLower.includes(kw),
  );
  const hasFlag = node.metadata.flags.includes('security-critical');
  return hasKeyword || hasFlag;
}

/**
 * BFS from a set of seed node IDs across edges.
 * direction 'upstream'  = traverse edges where node is the TARGET (who calls the seeds?)
 * direction 'downstream' = traverse edges where node is the SOURCE (what do seeds call?)
 */
function bfsTraverse(
  seedIds: Set<string>,
  graph: CodebaseGraph,
  direction: 'upstream' | 'downstream',
  maxDepth = 5,
): Set<string> {
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [];
  for (const id of seedIds) queue.push({ id, depth: 0 });

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;
    const neighbors = direction === 'upstream'
      ? graph.edges.filter((e) => e.target === id).map((e) => e.source)
      : graph.edges.filter((e) => e.source === id).map((e) => e.target);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && !seedIds.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, depth: depth + 1 });
      }
    }
  }
  return visited;
}

/**
 * Checks if there is ANY path from an api node to any security node
 * (i.e. the api is guarded by an auth check before it touches data).
 */
function hasAuthGuard(apiNodeId: string, securityNodeIds: Set<string>, graph: CodebaseGraph): boolean {
  const visited = new Set<string>();
  const queue = [apiNodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (securityNodeIds.has(id)) return true;
    const downstream = graph.edges.filter((e) => e.source === id).map((e) => e.target);
    for (const next of downstream) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

/**
 * Checks if a database node can be reached from any api node
 * without going through any security node.
 */
function isDbUnprotected(
  dbNodeId: string,
  apiNodeIds: string[],
  securityNodeIds: Set<string>,
  graph: CodebaseGraph,
): boolean {
  for (const apiId of apiNodeIds) {
    // BFS from apiId; if we can reach dbNodeId without touching a security node → unprotected
    const visited = new Set<string>();
    const queue = [apiId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (id === dbNodeId) return true;
      if (securityNodeIds.has(id)) continue; // blocked by auth
      const downstream = graph.edges.filter((e) => e.source === id).map((e) => e.target);
      for (const next of downstream) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }
  return false;
}

export function analyzeGraphSecurity(graph: CodebaseGraph): SecurityAnalysis {
  // ── 1. Identify direct security nodes ──────────────────────────────────
  const securityNodeIds = new Set<string>(
    graph.nodes.filter(isSecurityNode).map((n) => n.id),
  );

  // ── 2. Auth chain = upstream + downstream of security nodes ─────────────
  const upstream = bfsTraverse(securityNodeIds, graph, 'upstream', 4);
  const downstream = bfsTraverse(securityNodeIds, graph, 'downstream', 4);
  const authChainIds = new Set([...upstream, ...downstream]);

  // ── 3. Exposed APIs (api-type with no auth guard path) ──────────────────
  const apiNodes = graph.nodes.filter((n) => n.type === 'api');
  const exposedApiIds = new Set<string>(
    apiNodes
      .filter((n) => !securityNodeIds.has(n.id) && !hasAuthGuard(n.id, securityNodeIds, graph))
      .map((n) => n.id),
  );

  // ── 4. Unprotected database nodes ───────────────────────────────────────
  const dbNodes = graph.nodes.filter((n) => n.type === 'database');
  const apiNodeIds = apiNodes.map((n) => n.id);
  const unprotectedDbIds = new Set<string>(
    dbNodes
      .filter((n) => !securityNodeIds.has(n.id) && isDbUnprotected(n.id, apiNodeIds, securityNodeIds, graph))
      .map((n) => n.id),
  );

  // ── 5. Build findings ────────────────────────────────────────────────────
  const findings: SecurityFinding[] = [];

  // Critical: exposed APIs
  for (const id of exposedApiIds) {
    const node = graph.nodes.find((n) => n.id === id)!;
    const fns = node.metadata.functions ?? [];
    const line = fns[0]?.line;
    findings.push({
      severity: 'critical',
      label: `Exposed API: ${node.label}`,
      nodeId: id,
      path: node.metadata.path,
      line,
      detail: `API endpoint has no auth guard in its call chain. Potential unauthorized access.`,
    });
  }

  // High: unprotected database routes
  for (const id of unprotectedDbIds) {
    const node = graph.nodes.find((n) => n.id === id)!;
    const fns = node.metadata.functions ?? [];
    const methodFn = fns.find((f) => f.kind === 'method') ?? fns[0];
    const line = methodFn?.line;
    findings.push({
      severity: 'high',
      label: `Unprotected DB: ${node.label}`,
      nodeId: id,
      path: node.metadata.path,
      line,
      detail: `Database node is reachable from API layer without passing through an auth check.`,
    });
  }

  // Medium: security nodes with high complexity (risky auth logic)
  for (const id of securityNodeIds) {
    const node = graph.nodes.find((n) => n.id === id)!;
    if (node.metadata.complexity >= 12) {
      const fns = node.metadata.functions ?? [];
      const line = fns.length > 0 ? fns[fns.length - 1].line : undefined;
      findings.push({
        severity: 'medium',
        label: `Complex Auth Logic: ${node.label}`,
        nodeId: id,
        path: node.metadata.path,
        line,
        detail: `Security-critical node has complexity ${node.metadata.complexity} — prone to logic errors.`,
      });
    }
  }

  // Medium: low coverage on security nodes
  for (const id of securityNodeIds) {
    const node = graph.nodes.find((n) => n.id === id)!;
    if (node.metadata.coverage < 60) {
      const fns = node.metadata.functions ?? [];
      const line = fns[0]?.line;
      findings.push({
        severity: 'medium',
        label: `Low Test Coverage: ${node.label}`,
        nodeId: id,
        path: node.metadata.path,
        line,
        detail: `Auth node has only ${node.metadata.coverage}% test coverage — security regressions likely undetected.`,
      });
    }
  }

  // Sort: critical → high → medium
  const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 };
  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return { securityNodeIds, authChainIds, exposedApiIds, unprotectedDbIds, findings };
}
