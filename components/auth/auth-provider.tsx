'use client';

import * as React from 'react';
import { createClient, isSupabaseBrowserConfigured } from '@/lib/supabase/client';

export interface AuthUserSummary {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
}

interface AuthContextValue {
  user: AuthUserSummary | null;
  isAdmin: boolean;
  loading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);
const UI_USER_CACHE_KEY = 'kamora_auth_ui_v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUserSummary | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const persistUiHint = React.useCallback(
    (nextUser: AuthUserSummary | null, nextAdmin: boolean) => {
      if (typeof window === 'undefined') return;
      try {
        if (nextUser) {
          window.localStorage.setItem(
            UI_USER_CACHE_KEY,
            JSON.stringify({ user: nextUser, isAdmin: nextAdmin })
          );
        } else {
          window.localStorage.removeItem(UI_USER_CACHE_KEY);
        }
      } catch {
        // ignore storage errors
      }
    },
    []
  );

  const refreshSession = React.useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (res.ok) {
        const data = (await res.json()) as {
          user: AuthUserSummary | null;
          isAdmin: boolean;
        };
        setUser(data.user);
        setIsAdmin(Boolean(data.isAdmin));
        persistUiHint(data.user, Boolean(data.isAdmin));
      }
    } catch {
      // Keep current state on transient network errors — never spuriously sign out
    } finally {
      setLoading(false);
    }
  }, [persistUiHint]);

  React.useEffect(() => {
    // Hydrate zero-flicker UI hint immediately while server verifies the real cookie
    if (typeof window !== 'undefined') {
      try {
        const cached = window.localStorage.getItem(UI_USER_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as {
            user?: AuthUserSummary | null;
            isAdmin?: boolean;
          };
          if (parsed.user) {
            setUser(parsed.user);
            setIsAdmin(Boolean(parsed.isAdmin));
          }
        }
      } catch {
        // ignore
      }
    }

    void refreshSession();

    if (!isSupabaseBrowserConfigured()) return;

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void refreshSession();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        persistUiHint(null, false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession, persistUiHint]);

  const signOut = React.useCallback(async () => {
    setUser(null);
    setIsAdmin(false);
    persistUiHint(null, false);

    try {
      await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' });
    } catch {
      // ignore
    }
    if (isSupabaseBrowserConfigured()) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
  }, [persistUiHint]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        refreshSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
