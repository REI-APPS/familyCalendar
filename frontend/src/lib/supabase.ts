import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseAnonKey.includes('your-anon-key');

function makeStubClient(): SupabaseClient {
  const noop = async () => ({ data: null, error: { message: 'Supabase not configured' } as any });
  const builder: any = {
    select: () => builder, insert: () => builder, update: () => builder, delete: () => builder,
    eq: () => builder, neq: () => builder, gt: () => builder, lt: () => builder, gte: () => builder,
    lte: () => builder, like: () => builder, ilike: () => builder, is: () => builder, in: () => builder,
    order: () => builder, limit: () => builder, single: () => noop(), maybeSingle: () => noop(),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: noop, signUp: noop, signOut: async () => ({ error: null }),
      startAutoRefresh: () => {}, stopAutoRefresh: () => {},
    },
    from: () => builder,
    rpc: noop,
    channel: () => ({ on: function () { return this; }, subscribe: () => ({}) }),
    removeChannel: () => {},
  } as any;
}

// Shared storage key — both supabase-js (in the foreground app) AND the
// headless widget read/write the session from this exact AsyncStorage key.
// We compute it from the supabase project ref to match supabase-js's default.
function deriveProjectRef(url: string): string {
  // https://abc123.supabase.co  →  abc123
  try {
    const u = new URL(url);
    return u.hostname.split('.')[0];
  } catch {
    return 'default';
  }
}
const PROJECT_REF = deriveProjectRef(supabaseUrl);
export const SUPABASE_SESSION_KEY = `sb-${PROJECT_REF}-auth-token`;

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : makeStubClient();

if (isSupabaseConfigured && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
