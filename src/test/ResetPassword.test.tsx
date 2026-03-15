import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

// ── Supabase mock using vi.hoisted to avoid init order issues ────
const { mockOnAuthStateChange, mockGetSession, mockUpdateUser } = vi.hoisted(() => ({
  mockOnAuthStateChange: vi.fn(),
  mockGetSession: vi.fn(),
  mockUpdateUser: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
      updateUser: mockUpdateUser,
    },
  },
}));

import ResetPassword from '@/pages/ResetPassword';

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>,
  );

describe('ResetPassword page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('renders loading spinner while session is being detected', () => {
    mockGetSession.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.queryByText('NEW PASSWORD')).not.toBeInTheDocument();
  });

  it('shows "Link expired or invalid" when no session exists', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Link expired or invalid')).toBeInTheDocument();
    });
  });

  it('shows "Request a new link" button when session is invalid', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Request a new link/)).toBeInTheDocument();
    });
  });

  it('clicking "Request a new link" navigates to /auth', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    renderPage();
    await waitFor(() => screen.getByText(/Request a new link/));
    fireEvent.click(screen.getByText(/Request a new link/));
    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });

  it('renders password form when a valid session exists', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: 'uid' } } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('NEW PASSWORD')).toBeInTheDocument();
      expect(screen.getByText('CONFIRM PASSWORD')).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: 'uid' } } } });
    renderPage();
    await waitFor(() => screen.getByText('NEW PASSWORD'));
    const inputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(inputs[0], { target: { value: 'password1' } });
    fireEvent.change(inputs[1], { target: { value: 'password2' } });
    fireEvent.submit(inputs[0].closest('form')!);
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });
  });

  it('shows success message after password update', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: 'uid' } } } });
    mockUpdateUser.mockResolvedValueOnce({ error: null });
    renderPage();
    await waitFor(() => screen.getByText('NEW PASSWORD'));
    const inputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(inputs[0], { target: { value: 'newpass123' } });
    fireEvent.change(inputs[1], { target: { value: 'newpass123' } });
    fireEvent.submit(inputs[0].closest('form')!);
    await waitFor(() => {
      expect(screen.getByText('Password updated!')).toBeInTheDocument();
    });
  });

  it('shows API error if updateUser fails', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: 'uid' } } } });
    mockUpdateUser.mockResolvedValueOnce({ error: { message: 'Token expired' } });
    renderPage();
    await waitFor(() => screen.getByText('NEW PASSWORD'));
    const inputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(inputs[0], { target: { value: 'newpass123' } });
    fireEvent.change(inputs[1], { target: { value: 'newpass123' } });
    fireEvent.submit(inputs[0].closest('form')!);
    await waitFor(() => {
      expect(screen.getByText('Token expired')).toBeInTheDocument();
    });
  });
});
