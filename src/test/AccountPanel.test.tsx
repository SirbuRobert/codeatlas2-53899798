import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccountPanel from '@/components/AccountPanel';
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

// ── useAuth mock ───────────────────────────────────────────────
const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockSaveGithubToken = vi.fn().mockResolvedValue({ error: null });
const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

// ── use-toast mock ─────────────────────────────────────────────
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const renderPanel = (isOpen: boolean, userEmail: string | null = 'dev@test.com') => {
  mockUseAuth.mockReturnValue({
    user: userEmail ? { email: userEmail } : null,
    profile: null,
    session: null,
    loading: false,
    signOut: mockSignOut,
    saveGithubToken: mockSaveGithubToken,
  });
  const onClose = vi.fn();
  render(<AccountPanel isOpen={isOpen} onClose={onClose} />);
  return { onClose };
};

describe('AccountPanel — closed state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing meaningful when isOpen=false', () => {
    renderPanel(false);
    expect(screen.queryByText('ACCOUNT')).not.toBeInTheDocument();
  });
});

describe('AccountPanel — open state', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('renders ACCOUNT header when isOpen=true', () => {
    renderPanel(true);
    expect(screen.getByText('ACCOUNT')).toBeInTheDocument();
  });

  it('displays the logged-in user email', () => {
    renderPanel(true, 'dev@test.com');
    expect(screen.getByText('dev@test.com')).toBeInTheDocument();
  });

  it('displays the avatar initial letter', () => {
    renderPanel(true, 'dev@test.com');
    // First letter of email = 'D'
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('renders the GitHub token input field', () => {
    renderPanel(true);
    expect(screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxx')).toBeInTheDocument();
  });

  it('renders SAVE TOKEN button', () => {
    renderPanel(true);
    expect(screen.getByText('SAVE TOKEN')).toBeInTheDocument();
  });

  it('SAVE TOKEN button is disabled when token input is empty', () => {
    renderPanel(true);
    const btn = screen.getByText('SAVE TOKEN').closest('button')!;
    expect(btn).toBeDisabled();
  });

  it('SAVE TOKEN button is enabled when token is entered', () => {
    renderPanel(true);
    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxx');
    fireEvent.change(input, { target: { value: 'ghp_testtoken123' } });
    const btn = screen.getByText('SAVE TOKEN').closest('button')!;
    expect(btn).not.toBeDisabled();
  });

  it('renders the SIGN OUT button', () => {
    renderPanel(true);
    expect(screen.getByText('SIGN OUT')).toBeInTheDocument();
  });

  it('calls signOut when SIGN OUT is clicked', async () => {
    const { onClose } = renderPanel(true);
    fireEvent.click(screen.getByText('SIGN OUT'));
    // Wait for async signOut to be called
    await vi.waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('renders View Plans button', () => {
    renderPanel(true);
    expect(screen.getByText('View Plans →')).toBeInTheDocument();
  });

  it('shows FREE plan badge', () => {
    renderPanel(true);
    expect(screen.getByText('FREE')).toBeInTheDocument();
  });

  it('renders the GitHub token section heading', () => {
    renderPanel(true);
    expect(screen.getByText('GitHub Access Token')).toBeInTheDocument();
  });

  it('shows close (X) button in the header', () => {
    renderPanel(true);
    // The panel has a close button; clicking it should call onClose
    // Header area contains "ACCOUNT" and the close button
    const header = screen.getByText('ACCOUNT').closest('div')!.parentElement!;
    const closeBtn = header.querySelector('button');
    expect(closeBtn).not.toBeNull();
  });

  it('calls onClose when header X is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'dev@test.com' },
      profile: null,
      session: null,
      loading: false,
      signOut: mockSignOut,
      saveGithubToken: mockSaveGithubToken,
    });
    const onClose = vi.fn();
    render(<AccountPanel isOpen={true} onClose={onClose} />);
    const header = screen.getByText('ACCOUNT').closest('div')!.parentElement!;
    const closeBtn = header.querySelector('button')!;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('AccountPanel — token input interaction', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('updates token input value on change', () => {
    renderPanel(true);
    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxx') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ghp_abc123' } });
    expect(input.value).toBe('ghp_abc123');
  });

  it('token input is password type by default (hidden)', () => {
    renderPanel(true);
    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxx') as HTMLInputElement;
    expect(input.type).toBe('password');
  });
});
