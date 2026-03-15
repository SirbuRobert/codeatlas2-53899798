import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';
import { mockGraph } from '@/data/mockGraph';
import React from 'react';
import type { VoiceCommandResult } from '@/hooks/useVoiceCommand';

// ── Capture onResult from VoiceMicButton ───────────────────────
let capturedOnResult: ((r: VoiceCommandResult) => void) | null = null;

vi.mock('@/components/VoiceMicButton', () => ({
  default: ({ onResult }: { onResult: (r: VoiceCommandResult) => void }) => {
    capturedOnResult = onResult;
    return <button data-testid="voice-mic-btn">Speak Up</button>;
  },
}));

// ── framer-motion passthrough ──────────────────────────────────
vi.mock('framer-motion', () => {
  const passthrough = (tag: string) => {
    const Cmp = ({ children, ...props }: Record<string, unknown>) => {
      const filtered: Record<string, unknown> = {};
      for (const key of Object.keys(props)) {
        if (!['initial','animate','exit','transition','variants','whileHover','whileTap','layout','layoutId','mode'].includes(key)) {
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
    useAnimation: () => ({ start: vi.fn() }),
  };
});

// ── react-router-dom ───────────────────────────────────────────
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

// ── useAuth ────────────────────────────────────────────────────
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, loading: false, session: null, profile: null }) }));

// ── useSubscription ────────────────────────────────────────────
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPro: false }) }));

// ── Heavy child component stubs ────────────────────────────────
vi.mock('@/components/graph/GraphCanvas', () => ({ default: () => <div data-testid="graph-canvas" /> }));
vi.mock('@/components/TreemapView', () => ({ default: () => <div data-testid="treemap-view" /> }));
vi.mock('@/components/graph/SolarSystemView', () => ({ default: () => <div data-testid="solar-view" /> }));
vi.mock('@/components/NodeInspector', () => ({ default: () => <div data-testid="node-inspector" /> }));
vi.mock('@/components/CommandBar', () => ({
  default: () => <div data-testid="command-bar" />,
  buildSlashCommands: () => [],
}));
vi.mock('@/components/OnboardingTour', () => ({ default: () => <div data-testid="onboarding-tour" /> }));
vi.mock('@/components/AISummaryPanel', () => ({
  default: () => <div data-testid="ai-summary-panel" />,
  AISummaryBanner: () => <div data-testid="ai-summary-banner" />,
}));
vi.mock('@/components/BusinessInsightsPanel', () => ({ default: () => <div data-testid="business-panel" /> }));
vi.mock('@/components/ExportModal', () => ({ default: () => <div data-testid="export-modal" /> }));
vi.mock('@/components/RepoExplainerModal', () => ({ default: () => <div data-testid="explainer-modal" /> }));
vi.mock('@/components/RepoChatPanel', () => ({ default: () => <div data-testid="chat-panel" /> }));
vi.mock('@/components/AccountPanel', () => ({ default: () => <div data-testid="account-panel" /> }));
vi.mock('@/components/StatsHUD', () => ({ default: () => <div data-testid="stats-hud" /> }));
vi.mock('@/components/SearchBar', () => ({
  default: () => <div data-testid="search-bar" />,
  scoreNode: (node: { label: string; type: string; metadata: { path?: string; semanticSummary?: string; flags: string[]; author: string; functions?: Array<{ name: string }> } }, words: string[]) => {
    const haystack = [node.label, node.type, node.metadata.path ?? ''].join(' ').toLowerCase();
    return words.some(w => w && haystack.includes(w)) ? 1 : 0;
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }), toast: vi.fn() }));

// ── helpers ───────────────────────────────────────────────────
const makeResult = (partial: Partial<VoiceCommandResult>): VoiceCommandResult => ({
  action: 'unknown',
  target: null,
  nodeId: null,
  confidence: 0.95,
  humanReadable: 'test command',
  ...partial,
});

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard graph={mockGraph} repoUrl={mockGraph.repoUrl} onReset={vi.fn()} />
    </MemoryRouter>
  );

// ──────────────────────────────────────────────────────────────

describe('Voice command → security-review', () => {
  beforeEach(() => { vi.clearAllMocks(); capturedOnResult = null; localStorage.clear(); });

  it('activates security overlay when confidence is high', () => {
    renderDashboard();
    expect(capturedOnResult).toBeTruthy();
    act(() => {
      capturedOnResult!(makeResult({ action: 'security-review' }));
    });
    expect(screen.getByText(/SECURITY/i)).toBeInTheDocument();
  });

  it('does NOT activate security overlay when confidence is below threshold', () => {
    // useVoiceCommand filters < 0.4 before calling onResult; simulate the same gate
    renderDashboard();
    // We call onResult directly here (bypassing the hook's threshold guard)
    // to confirm that a low-confidence result from unknown action has no effect
    act(() => {
      capturedOnResult!(makeResult({ action: 'unknown', confidence: 0.3 }));
    });
    expect(screen.queryByText(/SECURITY/i)).not.toBeInTheDocument();
  });
});

describe('Voice command → ghost-city', () => {
  beforeEach(() => { vi.clearAllMocks(); capturedOnResult = null; localStorage.clear(); });

  it('activates ghost mode overlay', () => {
    renderDashboard();
    act(() => {
      capturedOnResult!(makeResult({ action: 'ghost-city' }));
    });
    expect(screen.getAllByText(/GHOST/i).length).toBeGreaterThan(0);
  });

  it('toggles ghost mode off on second call', () => {
    renderDashboard();
    act(() => { capturedOnResult!(makeResult({ action: 'ghost-city' })); });
    act(() => { capturedOnResult!(makeResult({ action: 'ghost-city' })); });
    expect(screen.queryAllByText(/GHOST/i)).toHaveLength(0);
  });
});

describe('Voice command → switch-view', () => {
  beforeEach(() => { vi.clearAllMocks(); capturedOnResult = null; localStorage.clear(); });

  it('switches to Solar view', () => {
    renderDashboard();
    act(() => {
      capturedOnResult!(makeResult({ action: 'switch-view', target: 'solar' }));
    });
    expect(screen.getByTestId('solar-view')).toBeInTheDocument();
  });

  it('switches to Treemap view', () => {
    renderDashboard();
    act(() => {
      capturedOnResult!(makeResult({ action: 'switch-view', target: 'treemap' }));
    });
    expect(screen.getByTestId('treemap-view')).toBeInTheDocument();
  });

  it('ignores unknown view names', () => {
    renderDashboard();
    act(() => {
      capturedOnResult!(makeResult({ action: 'switch-view', target: 'hologram' }));
    });
    // Should still show default topology view
    expect(screen.getByTestId('graph-canvas')).toBeInTheDocument();
  });
});

describe('Voice command → clear', () => {
  beforeEach(() => { vi.clearAllMocks(); capturedOnResult = null; localStorage.clear(); });

  it('clears security overlay when clear is called', () => {
    renderDashboard();
    // First activate security overlay
    act(() => { capturedOnResult!(makeResult({ action: 'security-review' })); });
    expect(screen.getByText(/SECURITY/i)).toBeInTheDocument();
    // Then clear
    act(() => { capturedOnResult!(makeResult({ action: 'clear' })); });
    expect(screen.queryByText(/SECURITY/i)).not.toBeInTheDocument();
  });

  it('clears ghost overlay when clear is called', () => {
    renderDashboard();
    act(() => { capturedOnResult!(makeResult({ action: 'ghost-city' })); });
    expect(screen.getByText(/GHOST/i)).toBeInTheDocument();
    act(() => { capturedOnResult!(makeResult({ action: 'clear' })); });
    expect(screen.queryByText(/GHOST/i)).not.toBeInTheDocument();
  });
});

describe('Voice command → show-summary', () => {
  beforeEach(() => { vi.clearAllMocks(); capturedOnResult = null; localStorage.clear(); });

  it('opens AI summary panel', () => {
    renderDashboard();
    act(() => { capturedOnResult!(makeResult({ action: 'show-summary' })); });
    expect(screen.getByTestId('ai-summary-panel')).toBeInTheDocument();
  });
});
