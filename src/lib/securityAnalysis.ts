// ═══════════════════════════════════════════════
//  AXON Security Analysis — Client-side Engine
//  v2: Context-aware 3-tier keyword classification
// ═══════════════════════════════════════════════

import type { CodebaseGraph, AxonNode } from '@/types/graph';

// ── Tier 1: Always security-critical ─────────────────────────────────────────
const DEFINITE_SECURITY = [
  'jwt', 'oauth', 'crypto', 'password', 'bcrypt', 'argon', 'pbkdf',
  'encrypt', 'decrypt', 'csrf', 'certificate', 'x509', 'tls', 'ssl',
  'secret', 'private-key', 'privatekey', 'hmac', 'rsa', 'aes',
];

// ── Tier 2: High-confidence security context ──────────────────────────────────
const CONTEXT_SECURITY = [
  'auth', 'token', 'permission', 'rbac', 'acl',
  'login', 'logout', 'signup', 'signin', 'register',
  'refresh-token', 'access-token', 'bearer',
];

// ── Tier 3: Ambiguous — only flag if ≥2 present or neighbored by T1/T2 ───────
const AMBIGUOUS_SECURITY = [
  'middleware', 'guard', 'policy', 'validate', 'sanitize',
  'hash', 'salt', 'cors', 'helmet', 'firewall', 'verify', 'session',
];

// ── Safe path patterns — known false-positive paths ──────────────────────────
const SAFE_PATH_PATTERNS: RegExp[] = [
  /cors[.\-_]?(header|config|option|origin)/i,
  /validate[.\-_]?(form|schema|input|field|email|url|phone|date)/i,
  /middleware[.\-_]?(log|error|rate|cache|compress|static|body|json)/i,
  /session[.\-_]?(storage|persist|cache|context|provider)/i,
  /hash[.\-_]?(map|table|router|util|set|ring)/i,
  /sanitize[.\-_]?(html|input|string|text|markdown)/i,
  /form[.\-_]?(validate|validation|validator)/i,
  /input[.\-_]?(validate|validation|sanitize)/i,
  /error[.\-_]?(handler|middleware|boundary)/i,
  /logger[.\-_]?middleware/i,
  /rate[.\-_]?limit/i,
  /body[.\-_]?parser/i,
  /compression/i,
  /static[.\-_]?files/i,
];

/** Returns a confidence score [0, 1] for the node being a real security node. */
function getSecurityConfidence(node: AxonNode, graph: CodebaseGraph): number {
  const labelLower = node.label.toLowerCase();
  const pathLower = (node.metadata.path ?? '').toLowerCase();
  const combined = `${labelLower} ${pathLower}`;

  // Explicit flag always wins
  if (node.metadata.flags.includes('security-critical')) return 1.0;

  // Safe path early exit
  const isSafe = SAFE_PATH_PATTERNS.some(
    (re) => re.test(labelLower) || re.test(pathLower),
  );
  if (isSafe) return 0.0;

  // Tier 1 match → definite
  const hasDefinite = DEFINITE_SECURITY.some((kw) => combined.includes(kw));
  if (hasDefinite) return 1.0;

  // Tier 2 match → high-confidence
  const hasContext = CONTEXT_SECURITY.some((kw) => combined.includes(kw));
  if (hasContext) return 0.8;

  // Tier 3: count ambiguous matches
  const ambiguousMatches = AMBIGUOUS_SECURITY.filter((kw) => combined.includes(kw));
  if (ambiguousMatches.length === 0) return 0.0;

  // 1 ambiguous keyword: only flag if a neighbor is a security node (T1/T2)
  if (ambiguousMatches.length === 1) {
    const neighborIds = graph.edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .map((e) => (e.source === node.id ? e.target : e.source));

    const neighborIsSecure = neighborIds.some((nid) => {
      const neighbor = graph.nodes.find((n) => n.id === nid);
      if (!neighbor) return false;
      const nc = `${neighbor.label.toLowerCase()} ${(neighbor.metadata.path ?? '').toLowerCase()}`;
      return (
        DEFINITE_SECURITY.some((kw) => nc.includes(kw)) ||
        CONTEXT_SECURITY.some((kw) => nc.includes(kw))
      );
    });
    return neighborIsSecure ? 0.5 : 0.0;
  }

  // ≥2 ambiguous keywords → moderate confidence
  return 0.35;
}

export function isSecurityNode(node: AxonNode, graph: CodebaseGraph): boolean {
  return getSecurityConfidence(node, graph) > 0.0;
}

export interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium';
  label: string;
  nodeId: string;
  path: string;
  line?: number;
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

/**
 * BFS from a set of seed node IDs across edges.
 * direction 'upstream'  = traverse edges where node is the TARGET
 * direction 'downstream' = traverse edges where node is the SOURCE
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
    const neighbors =
      direction === 'upstream'
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

/** BFS check: is there ANY path from apiNodeId to any security node? */
function hasAuthGuard(
  apiNodeId: string,
  securityNodeIds: Set<string>,
  graph: CodebaseGraph,
): boolean {
  const visited = new Set<string>();
  const queue = [apiNodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (securityNodeIds.has(id)) return true;
    const downstream = graph.edges
      .filter((e) => e.source === id)
      .map((e) => e.target);
    for (const next of downstream) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

/** BFS: can dbNodeId be reached from any api node without passing a security node? */
function isDbUnprotected(
  dbNodeId: string,
  apiNodeIds: string[],
  securityNodeIds: Set<string>,
  graph: CodebaseGraph,
): boolean {
  for (const apiId of apiNodeIds) {
    const visited = new Set<string>();
    const queue = [apiId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (id === dbNodeId) return true;
      if (securityNodeIds.has(id)) continue;
      const downstream = graph.edges
        .filter((e) => e.source === id)
        .map((e) => e.target);
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
  // ── 1. Identify direct security nodes (context-aware) ──────────────────────
  const securityNodeIds = new Set<string>(
    graph.nodes.filter((n) => isSecurityNode(n, graph)).map((n) => n.id),
  );

  // Build confidence map for findings gating
  const confidenceMap = new Map<string, number>();
  for (const n of graph.nodes) {
    if (securityNodeIds.has(n.id)) {
      confidenceMap.set(n.id, getSecurityConfidence(n, graph));
    }
  }

  // ── 2. Auth chain = upstream + downstream of security nodes ────────────────
  const upstream = bfsTraverse(securityNodeIds, graph, 'upstream', 4);
  const downstream = bfsTraverse(securityNodeIds, graph, 'downstream', 4);
  const authChainIds = new Set([...upstream, ...downstream]);

  // ── 3. Exposed APIs ────────────────────────────────────────────────────────
  const apiNodes = graph.nodes.filter((n) => n.type === 'api');
  const exposedApiIds = new Set<string>(
    apiNodes
      .filter(
        (n) =>
          !securityNodeIds.has(n.id) &&
          !hasAuthGuard(n.id, securityNodeIds, graph),
      )
      .map((n) => n.id),
  );

  // ── 4. Unprotected database nodes ──────────────────────────────────────────
  const dbNodes = graph.nodes.filter((n) => n.type === 'database');
  const apiNodeIds = apiNodes.map((n) => n.id);
  const unprotectedDbIds = new Set<string>(
    dbNodes
      .filter(
        (n) =>
          !securityNodeIds.has(n.id) &&
          isDbUnprotected(n.id, apiNodeIds, securityNodeIds, graph),
      )
      .map((n) => n.id),
  );

  // ── 5. Build findings (confidence-gated) ───────────────────────────────────
  const findings: SecurityFinding[] = [];

  // Critical: exposed APIs (topology-based — no confidence gate needed)
  for (const id of exposedApiIds) {
    const node = graph.nodes.find((n) => n.id === id)!;
    const fns = node.metadata.functions ?? [];
    findings.push({
      severity: 'critical',
      label: `Exposed API: ${node.label}`,
      nodeId: id,
      path: node.metadata.path,
      line: fns[0]?.line,
      detail: `API endpoint has no auth guard in its call chain. Potential unauthorized access.`,
    });
  }

  // High: unprotected database (topology-based — no confidence gate needed)
  for (const id of unprotectedDbIds) {
    const node = graph.nodes.find((n) => n.id === id)!;
    const fns = node.metadata.functions ?? [];
    const methodFn = fns.find((f) => f.kind === 'method') ?? fns[0];
    findings.push({
      severity: 'high',
      label: `Unprotected DB: ${node.label}`,
      nodeId: id,
      path: node.metadata.path,
      line: methodFn?.line,
      detail: `Database node is reachable from API layer without passing through an auth check.`,
    });
  }

  // Medium: complex auth logic — only for high-confidence security nodes (≥0.5)
  for (const id of securityNodeIds) {
    const confidence = confidenceMap.get(id) ?? 0;
    if (confidence < 0.5) continue;
    const node = graph.nodes.find((n) => n.id === id)!;
    if (node.metadata.complexity >= 12) {
      const fns = node.metadata.functions ?? [];
      findings.push({
        severity: 'medium',
        label: `Complex Auth Logic: ${node.label}`,
        nodeId: id,
        path: node.metadata.path,
        line: fns.length > 0 ? fns[fns.length - 1].line : undefined,
        detail: `Security-critical node has complexity ${node.metadata.complexity} — prone to logic errors.`,
      });
    }
  }

  // Medium: low coverage — only for definite/high-confidence nodes (≥0.7)
  for (const id of securityNodeIds) {
    const confidence = confidenceMap.get(id) ?? 0;
    if (confidence < 0.7) continue;
    const node = graph.nodes.find((n) => n.id === id)!;
    if (node.metadata.coverage < 60) {
      const fns = node.metadata.functions ?? [];
      findings.push({
        severity: 'medium',
        label: `Low Test Coverage: ${node.label}`,
        nodeId: id,
        path: node.metadata.path,
        line: fns[0]?.line,
        detail: `Auth node has only ${node.metadata.coverage}% test coverage — security regressions likely undetected.`,
      });
    }
  }

  // Sort: critical → high → medium
  const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 };
  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return { securityNodeIds, authChainIds, exposedApiIds, unprotectedDbIds, findings };
}
