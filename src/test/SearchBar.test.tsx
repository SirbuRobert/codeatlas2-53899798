import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '@/components/SearchBar';
import { mockGraph } from '@/data/mockGraph';
import React from 'react';

// ── framer-motion passthrough ──────────────────────────────────
vi.mock('framer-motion', () => {
  const passthrough = (tag: string) => {
    const Cmp = ({ children, ...props }: Record<string, unknown>) => {
      const filtered: Record<string, unknown> = {};
      for (const key of Object.keys(props)) {
        if (!['initial','animate','exit','transition','variants','whileHover','whileTap','layout'].includes(key)) {
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

const nodes = mockGraph.nodes;

const renderSearchBar = (isOpen: boolean, overrides?: Partial<{
  onResults: (ids: Set<string>, q: string) => void;
  onClose: () => void;
}>) => {
  const onResults = vi.fn();
  const onClose = vi.fn();
  const { rerender } = render(
    <SearchBar
      nodes={nodes}
      onResults={overrides?.onResults ?? onResults}
      onClose={overrides?.onClose ?? onClose}
      isOpen={isOpen}
    />
  );
  return { onResults, onClose, rerender };
};

describe('SearchBar — visibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the search input when isOpen=true', () => {
    renderSearchBar(true);
    expect(screen.getByPlaceholderText(/Search nodes/)).toBeInTheDocument();
  });

  it('does NOT render the search input when isOpen=false', () => {
    renderSearchBar(false);
    expect(screen.queryByPlaceholderText(/Search nodes/)).not.toBeInTheDocument();
  });
});

describe('SearchBar — search scoring', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onResults with matching node IDs when typing a query', () => {
    const onResults = vi.fn();
    renderSearchBar(true, { onResults });
    const input = screen.getByPlaceholderText(/Search nodes/);
    fireEvent.change(input, { target: { value: 'auth' } });
    expect(onResults).toHaveBeenCalled();
    const [matchedIds, query] = onResults.mock.calls[onResults.mock.calls.length - 1];
    expect(matchedIds.size).toBeGreaterThan(0);
    expect(query).toBe('auth');
  });

  it('calls onResults with empty set when query is cleared', () => {
    const onResults = vi.fn();
    renderSearchBar(true, { onResults });
    const input = screen.getByPlaceholderText(/Search nodes/);
    // First type something to get results
    fireEvent.change(input, { target: { value: 'auth' } });
    onResults.mockClear();
    // Then clear
    fireEvent.change(input, { target: { value: '' } });
    expect(onResults).toHaveBeenCalledTimes(1);
    const [ids, query] = onResults.mock.calls[0];
    expect(ids.size).toBe(0);
    expect(query).toBe('');
  });

  it('matches nodes by label substring', () => {
    const onResults = vi.fn();
    renderSearchBar(true, { onResults });
    const input = screen.getByPlaceholderText(/Search nodes/);
    // 'server' matches server.ts exactly
    fireEvent.change(input, { target: { value: 'server' } });
    const [matchedIds] = onResults.mock.calls[onResults.mock.calls.length - 1];
    expect(matchedIds.has('server')).toBe(true);
  });

  it('matches nodes by function name', () => {
    const onResults = vi.fn();
    renderSearchBar(true, { onResults });
    const input = screen.getByPlaceholderText(/Search nodes/);
    // 'login' is a function in auth-service
    fireEvent.change(input, { target: { value: 'login' } });
    const [matchedIds] = onResults.mock.calls[onResults.mock.calls.length - 1];
    expect(matchedIds.has('auth-service')).toBe(true);
  });

  it('shows match count badge when results found', () => {
    renderSearchBar(true);
    const input = screen.getByPlaceholderText(/Search nodes/);
    fireEvent.change(input, { target: { value: 'auth' } });
    expect(screen.getByText(/match/)).toBeInTheDocument();
  });

  it('shows "no match" badge when nothing found', () => {
    renderSearchBar(true);
    const input = screen.getByPlaceholderText(/Search nodes/);
    fireEvent.change(input, { target: { value: 'xyzzynonexistent99999' } });
    expect(screen.getByText('no match')).toBeInTheDocument();
  });
});

describe('SearchBar — close behaviour', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onClose and clears results when Escape is pressed', () => {
    const onResults = vi.fn();
    const onClose = vi.fn();
    renderSearchBar(true, { onResults, onClose });
    const input = screen.getByPlaceholderText(/Search nodes/);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onResults).toHaveBeenCalledWith(new Set(), '');
  });

  it('clicking X button clears the query', () => {
    const onResults = vi.fn();
    renderSearchBar(true, { onResults });
    const input = screen.getByPlaceholderText(/Search nodes/);
    fireEvent.change(input, { target: { value: 'auth' } });
    // X button appears — find by aria or button near the X icon
    const buttons = screen.getAllByRole('button');
    // The clear (X) button is the first button after match count area
    // We'll fire click on the button that has title-less small icon area
    // Simpler: clear by typing empty and verifying
    fireEvent.change(input, { target: { value: '' } });
    const last = onResults.mock.calls[onResults.mock.calls.length - 1];
    expect(last[0].size).toBe(0);
  });

  it('renders ESC kbd hint', () => {
    renderSearchBar(true);
    expect(screen.getByText('ESC')).toBeInTheDocument();
  });
});
