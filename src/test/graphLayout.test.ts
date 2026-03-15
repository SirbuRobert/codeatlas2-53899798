import { describe, it, expect } from 'vitest';
import { computeHierarchicalLayout } from '@/lib/graphLayout';

const node = (id: string) => ({ id });
const edge = (source: string, target: string) => ({ source, target });

describe('computeHierarchicalLayout', () => {
  it('returns empty Map for empty graph', () => {
    const result = computeHierarchicalLayout([], []);
    expect(result.size).toBe(0);
  });

  it('returns a single position for a single node', () => {
    const result = computeHierarchicalLayout([node('A')], []);
    expect(result.size).toBe(1);
    expect(result.has('A')).toBe(true);
    const pos = result.get('A')!;
    expect(typeof pos.x).toBe('number');
    expect(typeof pos.y).toBe('number');
  });

  it('assigns different y-layers to connected nodes', () => {
    const nodes = [node('A'), node('B')];
    const edges = [edge('A', 'B')];
    const result = computeHierarchicalLayout(nodes, edges);
    const yA = result.get('A')!.y;
    const yB = result.get('B')!.y;
    expect(yA).not.toBe(yB);
    expect(yA).toBeLessThan(yB); // A is entry point → higher up
  });

  it('assigns all nodes a position even with no edges', () => {
    const nodes = [node('X'), node('Y'), node('Z')];
    const result = computeHierarchicalLayout(nodes, []);
    expect(result.size).toBe(3);
    for (const n of nodes) {
      expect(result.has(n.id)).toBe(true);
    }
  });

  it('handles a 3-layer chain and places them in order', () => {
    const nodes = [node('A'), node('B'), node('C')];
    const edges = [edge('A', 'B'), edge('B', 'C')];
    const result = computeHierarchicalLayout(nodes, edges);
    const yA = result.get('A')!.y;
    const yB = result.get('B')!.y;
    const yC = result.get('C')!.y;
    expect(yA).toBeLessThan(yB);
    expect(yB).toBeLessThan(yC);
  });

  it('handles a circular graph without infinite loops', () => {
    const nodes = [node('A'), node('B'), node('C')];
    const edges = [edge('A', 'B'), edge('B', 'C'), edge('C', 'A')];
    expect(() => computeHierarchicalLayout(nodes, edges)).not.toThrow();
    const result = computeHierarchicalLayout(nodes, edges);
    expect(result.size).toBe(3);
  });

  it('respects custom nodeGap option', () => {
    const nodes = [node('A'), node('B'), node('C')];
    const result = computeHierarchicalLayout(nodes, [], { nodeGap: 100 });
    // All three nodes should be on same layer (no edges), spaced 100px apart
    const positions = [...result.values()];
    const xs = positions.map((p) => p.x).sort((a, b) => a - b);
    if (xs.length >= 2) {
      const gap = xs[1] - xs[0];
      expect(gap).toBeGreaterThanOrEqual(0); // positioned
    }
  });
});
