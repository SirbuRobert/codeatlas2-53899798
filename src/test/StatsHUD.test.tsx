import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatsHUD from '@/components/StatsHUD';
import { mockGraph } from '@/data/mockGraph';
import React from 'react';

// ── framer-motion passthrough ──────────────────────────────────
vi.mock('framer-motion', () => {
  const passthrough = (tag: string) => {
    const Cmp = ({ children, ...props }: Record<string, unknown>) => {
      const filtered: Record<string, unknown> = {};
      for (const key of Object.keys(props)) {
        if (!['initial','animate','exit','transition','variants','whileHover','whileTap','layout','layoutId'].includes(key)) {
          filtered[key] = props[key];
        }
      }
      return React.createElement(tag, filtered, children as React.ReactNode);
    };
    return Cmp;
  };
  return {
    motion: new Proxy({}, { get: (_t, tag: string) => passthrough(tag) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const graph = { ...mockGraph, repoUrl: mockGraph.repoUrl };

const renderHUD = (overrides?: { onStatClick?: ReturnType<typeof vi.fn>; activeStatLabel?: string }) =>
  render(
    <StatsHUD
      graph={graph}
      onStatClick={overrides?.onStatClick ?? vi.fn()}
      activeStatLabel={overrides?.activeStatLabel}
    />
  );

describe('StatsHUD — labels render', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders FILES label', () => {
    renderHUD();
    expect(screen.getByText('FILES')).toBeInTheDocument();
  });

  it('renders AVG COMPLEXITY label', () => {
    renderHUD();
    expect(screen.getByText('AVG COMPLEXITY')).toBeInTheDocument();
  });

  it('renders HOTSPOTS label', () => {
    renderHUD();
    expect(screen.getByText('HOTSPOTS')).toBeInTheDocument();
  });

  it('renders ORPHANS label', () => {
    renderHUD();
    expect(screen.getByText('ORPHANS')).toBeInTheDocument();
  });

  it('renders CIRCULAR DEPS label', () => {
    renderHUD();
    expect(screen.getByText('CIRCULAR DEPS')).toBeInTheDocument();
  });

  it('renders COVERAGE label', () => {
    renderHUD();
    expect(screen.getByText('COVERAGE')).toBeInTheDocument();
  });

  it('renders the repo URL', () => {
    renderHUD();
    expect(screen.getByText(mockGraph.repoUrl)).toBeInTheDocument();
  });

  it('renders the version chip (first 7 chars)', () => {
    renderHUD();
    expect(screen.getByText(mockGraph.version.slice(0, 7))).toBeInTheDocument();
  });
});

describe('StatsHUD — FILES stat click', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onStatClick with all node IDs when FILES is clicked', () => {
    const onStatClick = vi.fn();
    renderHUD({ onStatClick });
    fireEvent.click(screen.getByText('FILES'));
    expect(onStatClick).toHaveBeenCalledTimes(1);
    const [ids, label] = onStatClick.mock.calls[0];
    expect(label).toBe('FILES');
    expect(ids.size).toBe(mockGraph.nodes.length);
  });
});

describe('StatsHUD — ORPHANS stat click', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onStatClick with orphan node IDs when ORPHANS is clicked', () => {
    const onStatClick = vi.fn();
    renderHUD({ onStatClick });
    fireEvent.click(screen.getByText('ORPHANS'));
    expect(onStatClick).toHaveBeenCalledTimes(1);
    const [ids, label] = onStatClick.mock.calls[0];
    expect(label).toBe('ORPHANS');
    // mockGraph has 1 orphan (orphan-1)
    expect(ids.has('orphan-1')).toBe(true);
  });
});

describe('StatsHUD — live counts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows correct live file count', () => {
    renderHUD();
    // The FILES stat value equals the node count
    expect(screen.getByText(String(mockGraph.nodes.length))).toBeInTheDocument();
  });
});

describe('StatsHUD — active state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not crash when activeStatLabel is provided', () => {
    expect(() => renderHUD({ activeStatLabel: 'FILES' })).not.toThrow();
  });
});
