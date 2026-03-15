import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';
import { mockGraph } from '@/data/mockGraph';
import React from 'react';

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

// ── useNavigate ────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── useAuth ────────────────────────────────────────────────────
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

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
vi.mock('@/components/SearchBar', () => ({ default: () => <div data-testid="search-bar" /> }));

// ── use-toast ──────────────────────────────────────────────────
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const renderDashboard = (user: null | { email: string } = null) => {
  mockUseAuth.mockReturnValue({ user, loading: false, session: null, profile: null });
  return render(
    <MemoryRouter>
      <Dashboard graph={mockGraph} repoUrl={mockGraph.repoUrl} onReset={vi.fn()} />
    </MemoryRouter>
  );
};

describe('Dashboard — brand / structure', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('renders CodeAtlas brand text', () => {
    renderDashboard();
    expect(screen.getByText('CodeAtlas')).toBeInTheDocument();
  });

  it('renders AXON label', () => {
    renderDashboard();
    expect(screen.getByText('AXON')).toBeInTheDocument();
  });

  it('renders StatsHUD', () => {
    renderDashboard();
    expect(screen.getByTestId('stats-hud')).toBeInTheDocument();
  });
});

describe('Dashboard — view mode toggle', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('renders the 3 view mode buttons', () => {
    renderDashboard();
    expect(screen.getByText('Topology')).toBeInTheDocument();
    expect(screen.getByText('Treemap')).toBeInTheDocument();
    expect(screen.getByText('Solar')).toBeInTheDocument();
  });

  it('shows GraphCanvas in default Topology view', () => {
    renderDashboard();
    expect(screen.getByTestId('graph-canvas')).toBeInTheDocument();
  });

  it('switches to Treemap view when Treemap button is clicked', () => {
    renderDashboard();
    fireEvent.click(screen.getByText('Treemap'));
    expect(screen.getByTestId('treemap-view')).toBeInTheDocument();
  });

  it('switches to Solar view when Solar button is clicked', () => {
    renderDashboard();
    fireEvent.click(screen.getByText('Solar'));
    expect(screen.getByTestId('solar-view')).toBeInTheDocument();
  });

  it('switches back to Topology view', () => {
    renderDashboard();
    fireEvent.click(screen.getByText('Treemap'));
    fireEvent.click(screen.getByText('Topology'));
    expect(screen.getByTestId('graph-canvas')).toBeInTheDocument();
  });
});

describe('Dashboard — auth buttons', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('shows Sign In button when user is NOT logged in', () => {
    renderDashboard(null);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('clicking Sign In navigates to /auth', () => {
    renderDashboard(null);
    fireEvent.click(screen.getByText('Sign In'));
    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });

  it('does NOT show Sign In when user is logged in', () => {
    renderDashboard({ email: 'dev@test.com' });
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });

  it('shows user email prefix when logged in', () => {
    renderDashboard({ email: 'dev@test.com' });
    expect(screen.getByText('dev')).toBeInTheDocument();
  });
});

describe('Dashboard — New Repo button', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('calls onReset when New Repo is clicked', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, session: null, profile: null });
    const onReset = vi.fn();
    render(
      <MemoryRouter>
        <Dashboard graph={mockGraph} repoUrl={mockGraph.repoUrl} onReset={onReset} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('New Repo'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe('Dashboard — toolbar actions', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('renders Commands button', () => {
    renderDashboard();
    expect(screen.getByText('Commands')).toBeInTheDocument();
  });

  it('renders Export button', () => {
    renderDashboard();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders Plans button', () => {
    renderDashboard();
    expect(screen.getByText('Plans')).toBeInTheDocument();
  });

  it('clicking Plans navigates to /billing', () => {
    renderDashboard();
    fireEvent.click(screen.getByText('Plans'));
    expect(mockNavigate).toHaveBeenCalledWith('/billing');
  });

  it('renders TOUR button', () => {
    renderDashboard();
    expect(screen.getByText('TOUR')).toBeInTheDocument();
  });

  it('renders Ask AI button', () => {
    renderDashboard();
    expect(screen.getByText('Ask AI')).toBeInTheDocument();
  });

  it('renders Business View button', () => {
    renderDashboard();
    expect(screen.getByText('Business View')).toBeInTheDocument();
  });

  it('renders Explain Repo button', () => {
    renderDashboard();
    expect(screen.getByText('Explain Repo')).toBeInTheDocument();
  });
});
