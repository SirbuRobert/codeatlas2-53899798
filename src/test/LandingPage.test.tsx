import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '@/components/LandingPage';
import type { SessionStats } from '@/components/LiveStatsBar';
import React from 'react';

// ── Mock framer-motion ──────────────────────────
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
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// ── Mock useNavigate ─────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Mock child components ────────────────────────
vi.mock('@/components/LiveStatsBar', () => ({
  default: () => <div data-testid="live-stats-bar" />,
}));
vi.mock('@/components/PipelineExplainer', () => ({
  default: () => <div data-testid="pipeline-explainer" />,
}));
vi.mock('@/components/AccountPanel', () => ({
  default: () => <div data-testid="account-panel" />,
}));

// ── Mock useAuth ─────────────────────────────────
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const defaultSessionStats: SessionStats = {
  reposAnalyzed: 0,
  nodesRendered: 0,
  activeUsers: 0,
};

const renderLanding = (user: null | { email: string } = null) => {
  mockUseAuth.mockReturnValue({
    user,
    loading: false,
    session: null,
    profile: null,
  });

  return render(
    <MemoryRouter>
      <LandingPage
        onAnalyze={vi.fn()}
        isAnalyzing={false}
        analysisError={null}
        onAnimationComplete={vi.fn()}
        sessionStats={defaultSessionStats}
      />
    </MemoryRouter>,
  );
};

describe('LandingPage — Sign In button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the Sign In button when user is logged out', () => {
    renderLanding(null);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('clicking Sign In navigates to /auth', () => {
    renderLanding(null);
    fireEvent.click(screen.getByText('Sign In'));
    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });

  it('does NOT render Sign In button when user is logged in', () => {
    renderLanding({ email: 'dev@test.com' });
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });

  it('shows user initials button when logged in', () => {
    renderLanding({ email: 'dev@test.com' });
    expect(screen.getByText('dev')).toBeInTheDocument(); // email split at @
  });
});

describe('LandingPage — main content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the hero heading', () => {
    renderLanding();
    expect(screen.getByText('GPS FOR CODE')).toBeInTheDocument();
  });

  it('renders the ANALYZE button', () => {
    renderLanding();
    expect(screen.getByText('ANALYZE')).toBeInTheDocument();
  });

  it('ANALYZE button is disabled when input is empty', () => {
    renderLanding();
    const analyzeBtn = screen.getByText('ANALYZE').closest('button')!;
    expect(analyzeBtn).toBeDisabled();
  });

  it('ANALYZE button is enabled after typing a URL', () => {
    renderLanding();
    const input = screen.getByPlaceholderText(/github\.com\/org\/repository/);
    fireEvent.change(input, { target: { value: 'github.com/test/repo' } });
    const analyzeBtn = screen.getByText('ANALYZE').closest('button')!;
    expect(analyzeBtn).not.toBeDisabled();
  });

  it('renders example repo chips', () => {
    renderLanding();
    expect(screen.getByText('Next.js')).toBeInTheDocument();
  });

  it('renders the AXON version chip', () => {
    renderLanding();
    expect(screen.getByText('AXON v2.1.0')).toBeInTheDocument();
  });
});
