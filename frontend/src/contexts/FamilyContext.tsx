import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { updateAllWidgets, persistWidgetLocale } from '../lib/widgetUpdate';

export type Family = { id: string; name: string; created_by: string };
export type Member = { id: string; family_id: string; user_id: string | null; name: string; color: string; role: string };
export type ScheduleType = { id: string; family_id: string; code: string; name: string; description: string | null; color: string };
export type MemberScheduleType = { id: string; member_id: string; schedule_type_id: string };
export type ScheduleEntry = { id: string; family_id: string; member_id: string; schedule_type_id: string; entry_date: string; period: string; notes: string | null };
export type Task = { id: string; family_id: string; entry_date: string; title: string; done: boolean; created_by: string | null; created_at: string };

type FamilyCtx = {
  loading: boolean;
  family: Family | null;
  families: Family[];
  members: Member[];
  scheduleTypes: ScheduleType[];
  memberScheduleTypes: MemberScheduleType[];
  entries: ScheduleEntry[];
  tasks: Task[];
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
  const [tasks, setTasks] = useState<Task[]>([]);

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
    const [m, ty, mst, e, tk] = await Promise.all([
      supabase.from('members').select('*').eq('family_id', fid).order('created_at'),
      supabase.from('schedule_types').select('*').eq('family_id', fid).order('code'),
      supabase.from('member_schedule_types').select('*'),
      supabase.from('schedule_entries').select('*').eq('family_id', fid),
      supabase.from('tasks').select('*').eq('family_id', fid).order('entry_date'),
    ]);
    setMembers(m.data ?? []);
    setScheduleTypes(ty.data ?? []);
    setMemberScheduleTypes(mst.data ?? []);
    setEntries(e.data ?? []);
    setTasks(tk.data ?? []);
  }, []);

  useEffect(() => { loadFamilies(); }, [loadFamilies]);

  useEffect(() => {
    if (family) loadFamilyData(family.id);
    else { setMembers([]); setScheduleTypes([]); setEntries([]); setMemberScheduleTypes([]); setTasks([]); }
  }, [family, loadFamilyData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!family) return;
    const ch = supabase
      .channel(`family-${family.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_entries', filter: `family_id=eq.${family.id}` }, () => loadFamilyData(family.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `family_id=eq.${family.id}` }, () => loadFamilyData(family.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_types', filter: `family_id=eq.${family.id}` }, () => loadFamilyData(family.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${family.id}` }, () => loadFamilyData(family.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [family, loadFamilyData]);

  // Whenever the family data changes, refresh the widget cache so the
  // headless task handler always has the latest data + a fresh access_token.
  useEffect(() => {
    if (!family) return;
    updateAllWidgets({
      familyId: family.id,
      familyName: family.name,
      members: members.map((m) => ({ id: m.id, name: m.name, color: m.color })),
      scheduleTypes: scheduleTypes.map((t) => ({ id: t.id, code: t.code, name: t.name, description: t.description, color: t.color })),
      entries: entries.map((e) => ({ member_id: e.member_id, schedule_type_id: e.schedule_type_id, entry_date: e.entry_date })),
      tasks: tasks.map((tk) => ({ entry_date: tk.entry_date, title: tk.title, done: !!tk.done })),
    }).catch(() => {});
    persistWidgetLocale().catch(() => {});
  }, [family, members, scheduleTypes, entries, tasks]);

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
      value={{ loading, family, families, members, scheduleTypes, memberScheduleTypes, entries, tasks, selectFamily, refresh, createFamilyWithDefaults }}
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
