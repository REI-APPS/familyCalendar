import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { storage } from '../utils/storage';

const TOKEN_CACHE_KEY = 'widget_access_token';
const REFRESH_TOKEN_CACHE_KEY = 'widget_refresh_token';
const TOKEN_EXP_CACHE_KEY = 'widget_access_token_exp';

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

// Persist access + refresh tokens in separate AsyncStorage keys so the headless widget
// task handler can use them without relying on supabase client init order.
async function persistTokenForWidget(s: Session | null) {
  try {
    if (s?.access_token) {
      await storage.setItem(TOKEN_CACHE_KEY, s.access_token);
      if (s.refresh_token) await storage.setItem(REFRESH_TOKEN_CACHE_KEY, s.refresh_token);
      if (s.expires_at) await storage.setItem(TOKEN_EXP_CACHE_KEY, Number(s.expires_at));
    } else {
      await storage.setItem(TOKEN_CACHE_KEY, '');
      await storage.setItem(REFRESH_TOKEN_CACHE_KEY, '');
      await storage.setItem(TOKEN_EXP_CACHE_KEY, 0);
    }
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      persistTokenForWidget(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      persistTokenForWidget(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await storage.setItem(TOKEN_CACHE_KEY, '');
    await storage.setItem(REFRESH_TOKEN_CACHE_KEY, '');
    await storage.setItem(TOKEN_EXP_CACHE_KEY, 0);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
