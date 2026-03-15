import { describe, it, expect } from 'vitest';
import { calculateBlastRadius, detectCircularDeps } from '@/types/graph';
import type { AxonEdge } from '@/types/graph';

// ── Helpers ─────────────────────────────────────
const edge = (source: string, target: string, id?: string): AxonEdge => ({
  id: id ?? `${source}->${target}`,
  source,
  target,
  relation: 'imports',
  strength: 1,
});

// ── calculateBlastRadius ────────────────────────
describe('calculateBlastRadius', () => {
  const edges: AxonEdge[] = [
    edge('A', 'B'),
    edge('B', 'C'),
    edge('C', 'D'),
    edge('X', 'B'), // X also imports B
  ];

  it('returns correct downstream set for B', () => {
    const result = calculateBlastRadius('B', edges, { direction: 'downstream' });
    expect(result.downstream.has('C')).toBe(true);
    expect(result.downstream.has('D')).toBe(true);
    expect(result.downstream.has('A')).toBe(false);
  });

  it('returns correct upstream set for C', () => {
    const result = calculateBlastRadius('C', edges, { direction: 'upstream' });
    expect(result.upstream.has('B')).toBe(true);
    expect(result.upstream.has('A')).toBe(true);
    expect(result.upstream.has('X')).toBe(true);
  });

  it('returns both upstream and downstream when direction is both', () => {
    const result = calculateBlastRadius('B', edges, { direction: 'both' });
    expect(result.upstream.has('A')).toBe(true);
    expect(result.upstream.has('X')).toBe(true);
    expect(result.downstream.has('C')).toBe(true);
    expect(result.all.size).toBe(result.upstream.size + result.downstream.size);
  });

  it('respects depth limit — does not traverse past depth 1', () => {
    const result = calculateBlastRadius('B', edges, { direction: 'downstream', depth: 1 });
    expect(result.downstream.has('C')).toBe(true);
    expect(result.downstream.has('D')).toBe(false); // 2 hops away
  });

  it('returns empty sets for isolated node', () => {
    const result = calculateBlastRadius('Z', edges);
    expect(result.upstream.size).toBe(0);
    expect(result.downstream.size).toBe(0);
  });

  it('all set is union of upstream and downstream', () => {
    const result = calculateBlastRadius('B', edges);
    const expected = new Set([...result.upstream, ...result.downstream]);
    expect(result.all).toEqual(expected);
  });
});

// ── detectCircularDeps ──────────────────────────
describe('detectCircularDeps', () => {
  it('returns empty array for a clean DAG', () => {
    const edges: AxonEdge[] = [edge('A', 'B'), edge('B', 'C'), edge('A', 'C')];
    expect(detectCircularDeps(edges)).toEqual([]);
  });

  it('detects a direct cycle A → B → A', () => {
    const edges: AxonEdge[] = [edge('A', 'B'), edge('B', 'A')];
    const cycles = detectCircularDeps(edges);
    expect(cycles.length).toBeGreaterThan(0);
    const flat = cycles.flat();
    expect(flat).toContain('A');
    expect(flat).toContain('B');
  });

  it('detects a longer cycle A → B → C → A', () => {
    const edges: AxonEdge[] = [edge('A', 'B'), edge('B', 'C'), edge('C', 'A')];
    const cycles = detectCircularDeps(edges);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('returns empty array for an empty edge list', () => {
    expect(detectCircularDeps([])).toEqual([]);
  });
});
