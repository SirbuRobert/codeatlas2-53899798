// ═══════════════════════════════════════════════
//  AXON Knowledge Graph — Core Type System
// ═══════════════════════════════════════════════

export type NodeType = 'file' | 'class' | 'function' | 'module' | 'service' | 'database' | 'api';
export type EdgeRelation = 'imports' | 'calls' | 'inherits' | 'composes' | 'queries' | 'exposes';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type Language = 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'java' | 'unknown';

export interface FunctionEntry {
  name: string;
  line: number;
  kind: 'function' | 'class' | 'export' | 'const' | 'method';
  isExported: boolean;
}

export interface AxonNode {
  id: string;
  type: NodeType;
  label: string;
  metadata: {
    loc: number;               // Lines of Code (area in treemap)
    complexity: number;        // Cyclomatic complexity 1-20+
    churn: number;             // Git commit frequency 0-100
    dependents: number;        // How many other nodes depend on this
    dependencies: number;      // How many nodes this depends on
    coverage: number;          // Test coverage % 0-100
    semanticSummary?: string;  // LLM-generated purpose
    author: string;            // Primary owner
    path: string;              // Physical disk path
    language: Language;
    lastModified: string;
    riskLevel: RiskLevel;
    flags: string[];           // e.g. ['single-point-of-failure', 'no-tests', 'circular-dep']
    isEntryPoint?: boolean;
    isOrphan?: boolean;
  };
  position: { x: number; y: number };
}

export interface AxonEdge {
  id: string;
  source: string;
  target: string;
  relation: EdgeRelation;
  strength: number;  // 0-1 for edge bundling weight
}

export interface CodebaseGraph {
  nodes: AxonNode[];
  edges: AxonEdge[];
  version: string;          // Git SHA
  repoUrl: string;
  language: Language;
  analyzedAt: string;
  stats: {
    totalFiles: number;
    totalLines: number;
    avgComplexity: number;
    hotspots: number;
    orphans: number;
    circularDeps: number;
    testCoverage: number;
    languages: Record<string, number>;
  };
  summary: string;          // AI-generated repo summary
  entryPoints: string[];    // Node IDs
}

export interface AnalysisPhase {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
  duration?: number;
}

// ═══════════════════════════════════════════════
//  Graph Traversal: Blast Radius Algorithm
// ═══════════════════════════════════════════════

/**
 * Calculates the impact radius of a node change.
 * Traverses upstream (dependents) and downstream (dependencies).
 * Uses Set for O(1) lookup to prevent infinite loops in circular deps.
 */
export function calculateBlastRadius(
  nodeId: string,
  edges: AxonEdge[],
  options: { depth?: number; direction?: 'upstream' | 'downstream' | 'both' } = {}
): { upstream: Set<string>; downstream: Set<string>; all: Set<string> } {
  const { depth = 4, direction = 'both' } = options;
  const upstream = new Set<string>();
  const downstream = new Set<string>();

  if (direction === 'upstream' || direction === 'both') {
    const queue: { id: string; d: number }[] = [{ id: nodeId, d: 0 }];
    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (d >= depth) continue;
      const dependents = edges.filter(e => e.target === id).map(e => e.source);
      for (const dep of dependents) {
        if (!upstream.has(dep)) {
          upstream.add(dep);
          queue.push({ id: dep, d: d + 1 });
        }
      }
    }
  }

  if (direction === 'downstream' || direction === 'both') {
    const queue: { id: string; d: number }[] = [{ id: nodeId, d: 0 }];
    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (d >= depth) continue;
      const deps = edges.filter(e => e.source === id).map(e => e.target);
      for (const dep of deps) {
        if (!downstream.has(dep)) {
          downstream.add(dep);
          queue.push({ id: dep, d: d + 1 });
        }
      }
    }
  }

  return { upstream, downstream, all: new Set([...upstream, ...downstream]) };
}

/**
 * Detects circular dependencies in the graph using DFS.
 */
export function detectCircularDeps(edges: AxonEdge[]): string[][] {
  const adjList = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adjList.has(edge.source)) adjList.set(edge.source, []);
    adjList.get(edge.source)!.push(edge.target);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);
    for (const neighbor of adjList.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      } else if (recursionStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) cycles.push(path.slice(cycleStart));
      }
    }
    recursionStack.delete(node);
  }

  for (const node of adjList.keys()) {
    if (!visited.has(node)) dfs(node, [node]);
  }

  return cycles;
}
