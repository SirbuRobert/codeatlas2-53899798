// ═══════════════════════════════════════════════
//  Deterministic Hierarchical Layout Engine
//  Uses topological sort (BFS) to assign layers.
//  Entry points at top → foundations at bottom.
// ═══════════════════════════════════════════════

interface LayoutNode {
  id: string;
  type?: string;
}

interface LayoutEdge {
  source: string;
  target: string;
}

interface LayoutOptions {
  nodeGap?: number;    // horizontal spacing
  layerGap?: number;   // vertical spacing
  jitter?: boolean;    // slight horizontal offset to avoid perfect columns
}

export function computeHierarchicalLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options: LayoutOptions = {},
): Map<string, { x: number; y: number }> {
  const { nodeGap = 240, layerGap = 280 } = options;

  if (nodes.length === 0) return new Map();

  // Build adjacency maps
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  for (const node of nodes) {
    outgoing.set(node.id, new Set());
    incoming.set(node.id, new Set());
  }

  for (const edge of edges) {
    if (outgoing.has(edge.source) && incoming.has(edge.target)) {
      outgoing.get(edge.source)!.add(edge.target);
      incoming.get(edge.target)!.add(edge.source);
    }
  }

  // Assign layers via BFS from root nodes (nodes with no incoming edges)
  const layers = new Map<string, number>();
  const sources = nodes.filter(n => (incoming.get(n.id)?.size ?? 0) === 0);

  // If no sources (circular graph), pick the node with fewest incoming
  const startNodes =
    sources.length > 0
      ? sources
      : [nodes.reduce((a, b) =>
          (incoming.get(a.id)?.size ?? 0) < (incoming.get(b.id)?.size ?? 0) ? a : b
        )];

  const queue: Array<{ id: string; layer: number }> = startNodes.map(n => ({
    id: n.id,
    layer: 0,
  }));

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    // Use longest path (max layer) assignment
    if (!layers.has(id) || layers.get(id)! < layer) {
      layers.set(id, layer);
      for (const target of outgoing.get(id) ?? []) {
        queue.push({ id: target, layer: layer + 1 });
      }
    }
  }

  // Assign unplaced nodes to a middle layer
  const maxLayer = Math.max(0, ...Array.from(layers.values()));
  for (const node of nodes) {
    if (!layers.has(node.id)) {
      layers.set(node.id, Math.ceil(maxLayer / 2));
    }
  }

  // Group nodes by layer, sort by number of dependents (most important → center)
  const layerGroups = new Map<number, string[]>();
  for (const [nodeId, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(nodeId);
  }

  // Sort within each layer: nodes with more outgoing edges go to center
  for (const [, ids] of layerGroups) {
    ids.sort((a, b) => (outgoing.get(b)?.size ?? 0) - (outgoing.get(a)?.size ?? 0));
  }

  const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);
  const positions = new Map<string, { x: number; y: number }>();

  for (const layer of sortedLayers) {
    const nodeIds = layerGroups.get(layer)!;
    const totalWidth = (nodeIds.length - 1) * nodeGap;
    const startX = -totalWidth / 2;

    nodeIds.forEach((nodeId, i) => {
      // Slight alternating offset for readability when many nodes per layer
      const offset = nodeIds.length > 4 && i % 2 === 1 ? 40 : 0;
      positions.set(nodeId, {
        x: startX + i * nodeGap,
        y: layer * layerGap + offset,
      });
    });
  }

  return positions;
}
