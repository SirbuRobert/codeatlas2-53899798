import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Auth from '@/pages/Auth';
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

// ── Mock useAuth ────────────────────────────────
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    profile: null,
    loading: false,
    signIn: mockSignIn,
    signUp: mockSignUp,
    resetPassword: mockResetPassword,
    signOut: vi.fn(),
    saveGithubToken: vi.fn(),
    getGithubToken: vi.fn(),
  }),
}));

// ── Mock useNavigate ────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderAuth = () =>
  render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>,
  );

describe('Auth page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SIGN IN and SIGN UP tabs', () => {
    renderAuth();
    expect(screen.getAllByText('SIGN IN').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('SIGN UP')).toBeInTheDocument();
  });

  it('shows email and password fields on login tab', () => {
    renderAuth();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('"Forgot password?" link is visible on login tab', () => {
    renderAuth();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });

  it('clicking "Forgot password?" shows the RESET PASSWORD header', () => {
    renderAuth();
    fireEvent.click(screen.getByText('Forgot password?'));
    expect(screen.getByText('RESET PASSWORD')).toBeInTheDocument();
  });

  it('switching to SIGN UP hides "Forgot password?"', () => {
    renderAuth();
    fireEvent.click(screen.getByText('SIGN UP'));
    expect(screen.queryByText('Forgot password?')).not.toBeInTheDocument();
  });

  it('SIGN UP tab shows "Minimum 6 characters" hint', () => {
    renderAuth();
    fireEvent.click(screen.getByText('SIGN UP'));
    expect(screen.getByText('Minimum 6 characters')).toBeInTheDocument();
  });

  it('shows an error message when signIn returns an error', async () => {
    mockSignIn.mockResolvedValueOnce({ error: { message: 'Invalid credentials' }, data: null });
    renderAuth();

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpass' },
    });
    // The submit button in the login form has text "SIGN IN" 
    const submitButtons = screen.getAllByText('SIGN IN');
    // Click the button element (not the tab)
    const submitBtn = submitButtons.find((el) => el.closest('button')?.type === 'submit') ?? submitButtons[0];
    fireEvent.click(submitBtn.closest('button') ?? submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('calls navigate("/") after successful sign in', async () => {
    mockSignIn.mockResolvedValueOnce({ error: null, data: {} });
    renderAuth();

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });
    const submitButtons = screen.getAllByText('SIGN IN');
    const submitBtn = submitButtons.find((el) => el.closest('button')?.type === 'submit') ?? submitButtons[0];
    fireEvent.click(submitBtn.closest('button') ?? submitBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows "Check your email" after successful sign up', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null, data: {} });
    renderAuth();

    fireEvent.click(screen.getByText('SIGN UP'));
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'new@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'securepass' },
    });
    fireEvent.click(screen.getByText('CREATE ACCOUNT'));

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  it('forgot password form submits and shows confirmation', async () => {
    mockResetPassword.mockResolvedValueOnce({ error: null, data: {} });
    renderAuth();

    fireEvent.click(screen.getByText('Forgot password?'));
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@test.com' },
    });
    fireEvent.click(screen.getByText('SEND RESET LINK'));

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });
});
