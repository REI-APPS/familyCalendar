import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type Family = { id: string; name: string; created_by: string };
export type Member = { id: string; family_id: string; user_id: string | null; name: string; color: string; role: string };
export type ScheduleType = { id: string; family_id: string; code: string; name: string; description: string | null; color: string };
export type MemberScheduleType = { id: string; member_id: string; schedule_type_id: string };
export type ScheduleEntry = { id: string; family_id: string; member_id: string; schedule_type_id: string; entry_date: string; period: string; notes: string | null };

type FamilyCtx = {
  loading: boolean;
  family: Family | null;
  families: Family[];
  members: Member[];
  scheduleTypes: ScheduleType[];
  memberScheduleTypes: MemberScheduleType[];
  entries: ScheduleEntry[];
  selectFamily: (id: string) => void;
  refresh: () => Promise<void>;
  createFamilyWithDefaults: (name: string) => Promise<string | null>;
};

const Ctx = createContext<FamilyCtx | undefined>(undefined);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<Family[]>([]);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [scheduleTypes, setScheduleTypes] = useState<ScheduleType[]>([]);
  const [memberScheduleTypes, setMemberScheduleTypes] = useState<MemberScheduleType[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);

  const loadFamilies = useCallback(async () => {
    if (!user) {
      setFamilies([]); setFamily(null); setLoading(false); return;
    }
    // Auto-accept any pending invites for this user's email (idempotent)
    try {
      const { data: accepted, error: invErr } = await supabase.rpc('accept_pending_invites');
      if (invErr) console.warn('accept_pending_invites', invErr.message);
      else if (accepted && accepted.length > 0) {
        console.log('[invites] auto-accepted:', accepted);
      }
    } catch (e) {
      console.warn('accept_pending_invites threw', e);
    }
    const { data, error } = await supabase.from('families').select('*').order('created_at');
    if (error) { console.warn('families', error.message); setFamilies([]); setLoading(false); return; }
    setFamilies(data ?? []);
    if (!family && data && data.length > 0) setFamily(data[0]);
    setLoading(false);
  }, [user, family]);

  const loadFamilyData = useCallback(async (fid: string) => {
    const [m, t, mst, e] = await Promise.all([
      supabase.from('members').select('*').eq('family_id', fid).order('created_at'),
      supabase.from('schedule_types').select('*').eq('family_id', fid).order('code'),
      supabase.from('member_schedule_types').select('*'),
      supabase.from('schedule_entries').select('*').eq('family_id', fid),
    ]);
    setMembers(m.data ?? []);
    setScheduleTypes(t.data ?? []);
    setMemberScheduleTypes(mst.data ?? []);
    setEntries(e.data ?? []);
  }, []);

  useEffect(() => { loadFamilies(); }, [loadFamilies]);

  useEffect(() => {
    if (family) loadFamilyData(family.id);
    else { setMembers([]); setScheduleTypes([]); setEntries([]); setMemberScheduleTypes([]); }
  }, [family, loadFamilyData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!family) return;
    const ch = supabase
      .channel(`family-${family.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_entries', filter: `family_id=eq.${family.id}` }, () => loadFamilyData(family.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `family_id=eq.${family.id}` }, () => loadFamilyData(family.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_types', filter: `family_id=eq.${family.id}` }, () => loadFamilyData(family.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [family, loadFamilyData]);

  const selectFamily = (id: string) => {
    const f = families.find((x) => x.id === id);
    if (f) setFamily(f);
  };

  const refresh = async () => {
    await loadFamilies();
    if (family) await loadFamilyData(family.id);
  };

  const createFamilyWithDefaults = async (name: string) => {
    const { data, error } = await supabase.rpc('create_family_with_defaults', { family_name: name });
    if (error) { console.warn('create fam', error.message); return null; }
    await loadFamilies();
    return data as string;
  };

  return (
    <Ctx.Provider
      value={{ loading, family, families, members, scheduleTypes, memberScheduleTypes, entries, selectFamily, refresh, createFamilyWithDefaults }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useFamily() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFamily must be in FamilyProvider');
  return c;
}
