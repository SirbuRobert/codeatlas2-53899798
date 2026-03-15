import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  github_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data as Profile | null;
  }, []);

  useEffect(() => {
    // Set up auth state listener BEFORE calling getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          localStorage.removeItem('axon_gh_token');
        }
        let profile: Profile | null = null;
        if (session?.user) {
          // Defer Supabase call to avoid deadlock in the listener
          setTimeout(async () => {
            profile = await fetchProfile(session.user.id);
            setState({ user: session.user, session, profile, loading: false });
          }, 0);
        } else {
          setState({ user: null, session: null, profile: null, loading: false });
        }
      }
    );

    // Get existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ user: session.user, session, profile, loading: false });
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem('axon_gh_token');
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  }, []);

  const saveGithubToken = useCallback(async (token: string) => {
    if (!state.user || !state.session) return { error: new Error('Not authenticated') };
    const { error } = await supabase.functions.invoke('save-github-token', {
      body: { token: token || '' },
      headers: { Authorization: `Bearer ${state.session.access_token}` },
    });
    if (!error) {
      // Update local profile indicator: non-null means a token is stored
      const indicator = token ? '[encrypted]' : null;
      setState((prev) => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, github_token: indicator } : null,
      }));
    }
    return { error: error ? new Error(error.message) : null };
  }, [state.user, state.session]);

  // Token is encrypted server-side — never expose the value to the frontend
  const getGithubToken = useCallback((): string | undefined => {
    return undefined;
  }, []);

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    resetPassword,
    saveGithubToken,
    getGithubToken,
  };
}
