import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { addDays, format, startOfWeek } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AgendaWidget } from '../widgets/AgendaWidget';
import { AgendaWeekWidget } from '../widgets/AgendaWeekWidget';
import { AgendaPlusWidget } from '../widgets/AgendaPlusWidget';
import { storage } from '../utils/storage';

const WIDGET_CACHE_KEY = 'widget_data_cache';
const WIDGET_DAY_KEY = 'widget_day_offset';
const WIDGET_TRANSPARENT_KEY = 'widget_transparent';
const WIDGET_LOCALE_KEY = 'widget_locale';
const WIDGET_STATUS_KEY = 'widget_last_refresh_status';
// KEEP IN SYNC with SUPABASE_SESSION_KEY in src/lib/supabase.ts
const SUPABASE_SESSION_KEY = 'sb-family-auth-session';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

type Member = { id: string; name: string; color: string };
type ScheduleType = { id: string; code: string; name: string; description?: string | null; color: string };
type ScheduleEntry = { member_id: string; schedule_type_id: string; entry_date: string };
type TaskRow = { entry_date: string; title: string; done?: boolean };

type Cache = {
  familyId: string;
  familyName: string;
  members: Member[];
  scheduleTypes: ScheduleType[];
  entries: ScheduleEntry[];
  tasks?: TaskRow[];
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  cached_at?: number;
};

async function setStatus(status: string) {
  try { await storage.setItem(WIDGET_STATUS_KEY, status); } catch {}
}

async function readSettings() {
  const dayStr = await storage.getItem(WIDGET_DAY_KEY, '0');
  const transStr = await storage.getItem(WIDGET_TRANSPARENT_KEY, 'false');
  const localeStr = await storage.getItem(WIDGET_LOCALE_KEY, 'pt');
  const locale = (localeStr === 'en' || localeStr === 'es' || localeStr === 'pt') ? localeStr : 'pt';
  return { dayOffset: Number(dayStr) || 0, transparent: transStr === 'true', locale: locale as 'pt' | 'en' | 'es' };
}

async function readCache(): Promise<Cache | null> {
  const raw = await storage.getItem(WIDGET_CACHE_KEY, '');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function writeCache(cache: Cache): Promise<void> {
  try { await storage.setItem(WIDGET_CACHE_KEY, JSON.stringify(cache)); } catch {}
}

/**
 * Read the LATEST tokens available. We look at:
 *   1. The supabase-js session storage (source of truth after each app run)
 *   2. The widget cache (may hold tokens the widget refreshed in background)
 * Whichever has the more recent expires_at wins.
 */
async function readLatestTokens(cache: Cache | null): Promise<{ access_token?: string | null; refresh_token?: string | null; expires_at?: number | null }> {
  let sb: any = null;
  try {
    const raw = await AsyncStorage.getItem(SUPABASE_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // supabase-js may wrap as { currentSession: {...} } or store flat
      sb = parsed?.currentSession || parsed?.session || parsed;
    }
  } catch {}
  const sbExp = Number(sb?.expires_at || 0);
  const cacheExp = Number(cache?.expires_at || 0);
  if (sb?.access_token && sbExp >= cacheExp) {
    return { access_token: sb.access_token, refresh_token: sb.refresh_token, expires_at: sbExp };
  }
  if (cache?.access_token) {
    return { access_token: cache.access_token, refresh_token: cache.refresh_token, expires_at: cacheExp };
  }
  return { access_token: sb?.access_token ?? null, refresh_token: sb?.refresh_token ?? null, expires_at: sbExp || null };
}

/**
 * Write refreshed tokens to BOTH the widget cache AND the supabase-js session
 * storage. This is critical: when the user opens the app after a background
 * widget refresh, supabase-js must find the NEW (non-revoked) refresh_token,
 * otherwise it logs the user out on the next call.
 */
async function writeSessionEverywhere(newSess: { access_token: string; refresh_token?: string; expires_at?: number; expires_in?: number; token_type?: string }, cache: Cache | null): Promise<void> {
  // 1) Update the widget cache
  if (cache) {
    cache.access_token = newSess.access_token;
    cache.refresh_token = newSess.refresh_token ?? cache.refresh_token;
    cache.expires_at = newSess.expires_at ?? cache.expires_at;
    await writeCache(cache);
  }
  // 2) Update the supabase-js session storage (merge with any existing fields, e.g. user)
  try {
    const raw = await AsyncStorage.getItem(SUPABASE_SESSION_KEY);
    let base: any = {};
    if (raw) {
      try { base = JSON.parse(raw) || {}; } catch {}
    }
    // Preserve any wrapper shape the installed supabase-js version uses
    if (base && typeof base === 'object' && base.currentSession) {
      base.currentSession = { ...base.currentSession, ...newSess };
    } else if (base && typeof base === 'object' && base.session) {
      base.session = { ...base.session, ...newSess };
    } else {
      base = { ...base, ...newSess };
    }
    await AsyncStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(base));
  } catch {}
}

/**
 * Refresh JWT using the latest refresh_token available anywhere.
 */
async function refreshAccessToken(cache: Cache | null): Promise<string | null> {
  const latest = await readLatestTokens(cache);
  const rt = latest.refresh_token;
  if (!rt) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) {
      await setStatus(`refresh:${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data?.access_token) {
      await writeSessionEverywhere({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        expires_in: data.expires_in,
        token_type: data.token_type,
      }, cache);
      return data.access_token as string;
    }
    return null;
  } catch {
    await setStatus(`refresh:err`);
    return null;
  }
}

async function rest(token: string, path: string): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const data = res.ok ? await res.json() : null;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

async function restWithRetry(cache: Cache | null, token: string, path: string): Promise<{ data: any[]; token: string }> {
  let r = await rest(token, path);
  if (r.ok) return { data: r.data || [], token };
  if (r.status === 401) {
    const fresh = await refreshAccessToken(cache);
    if (fresh) {
      r = await rest(fresh, path);
      if (r.ok) return { data: r.data || [], token: fresh };
    }
  }
  return { data: [], token };
}

async function fetchFresh(): Promise<Cache | null> {
  const cache = await readCache();
  if (!cache) { await setStatus('no-cache'); return null; }
  if (!cache.familyId) { await setStatus('no-family'); return cache; }
  // Always pull the LATEST tokens (may have been refreshed by the app in the meantime)
  const latest = await readLatestTokens(cache);
  let token = latest.access_token || '';
  if (!token) {
    const fresh = await refreshAccessToken(cache);
    if (!fresh) { await setStatus('no-token'); return cache; }
    token = fresh;
  }
  const fid = cache.familyId;

  const [rm, rt, re, rk] = await Promise.all([
    restWithRetry(cache, token, `members?family_id=eq.${fid}&select=id,name,color,created_at&order=created_at.asc`),
    restWithRetry(cache, token, `schedule_types?family_id=eq.${fid}&select=id,code,name,description,color`),
    restWithRetry(cache, token, `schedule_entries?family_id=eq.${fid}&select=member_id,schedule_type_id,entry_date`),
    restWithRetry(cache, token, `tasks?family_id=eq.${fid}&select=entry_date,title,done&order=entry_date.asc`),
  ]);

  const fresh: Cache = {
    ...cache,
    members: (rm.data && rm.data.length) ? rm.data : cache.members,
    scheduleTypes: (rt.data && rt.data.length) ? rt.data : cache.scheduleTypes,
    entries: (re.data && re.data.length) ? re.data : cache.entries,
    tasks: rk.data || cache.tasks || [],
    cached_at: Date.now(),
  };
  await writeCache(fresh);
  await setStatus(`ok:${new Date().toISOString().slice(11, 19)}`);
  return fresh;
}

function renderAgenda(props: WidgetTaskHandlerProps, cache: Cache | null, dayOffset: number, transparent: boolean, locale: 'pt' | 'en' | 'es') {
  if (!cache) {
    props.renderWidget(<AgendaWidget familyName="" dayOffset={dayOffset} entries={[]} transparent={transparent} locale={locale} />);
    return;
  }
  const ds = format(addDays(new Date(), dayOffset), 'yyyy-MM-dd');
  const dayEntries = cache.entries.filter((x) => x.entry_date === ds);
  const widgetEntries = cache.members.map((m) => {
    const ex = dayEntries.find((x) => x.member_id === m.id);
    const tt = ex ? cache.scheduleTypes.find((t) => t.id === ex.schedule_type_id) : null;
    return {
      memberName: m.name,
      memberColor: m.color,
      typeName: tt ? (tt.description || tt.name) : 'Sem horário',
      typeColor: tt?.color || (transparent ? '#FFFFFF44' : '#F5F3EC'),
    };
  });
  props.renderWidget(
    <AgendaWidget familyName={cache.familyName} dayOffset={dayOffset} entries={widgetEntries} transparent={transparent} locale={locale} />
  );
}

function renderWeek(props: WidgetTaskHandlerProps, cache: Cache | null, transparent: boolean, locale: 'pt' | 'en' | 'es') {
  if (!cache) {
    props.renderWidget(<AgendaWeekWidget memberNames={[]} memberColors={[]} weekStart={new Date().toISOString()} matrix={[]} tasksByDay={[]} transparent={transparent} locale={locale} />);
    return;
  }
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const matrix = days.map((d) => {
    const ds = format(d, 'yyyy-MM-dd');
    return cache.members.map((m) => {
      const ex = cache.entries.find((x) => x.member_id === m.id && x.entry_date === ds);
      if (!ex) return null;
      const t = cache.scheduleTypes.find((tt) => tt.id === ex.schedule_type_id);
      if (!t) return null;
      return { typeColor: t.color, typeName: (t.description || t.name) };
    });
  });
  const tasks = cache.tasks || [];
  const tasksByDay = days.map((d) => {
    const ds = format(d, 'yyyy-MM-dd');
    const dayTasks = tasks.filter((tk) => tk.entry_date === ds);
    if (dayTasks.length === 0) return null;
    const undone = dayTasks.filter((tk) => !tk.done).map((tk) => tk.title);
    const done = dayTasks.filter((tk) => tk.done).map((tk) => tk.title);
    const all = [...undone, ...done];
    return all.length ? all.join(', ') : null;
  });
  props.renderWidget(
    <AgendaWeekWidget
      memberNames={cache.members.map((m) => m.name)}
      memberColors={cache.members.map((m) => m.color)}
      weekStart={weekStart.toISOString()}
      matrix={matrix}
      tasksByDay={tasksByDay}
      transparent={transparent}
      locale={locale}
    />
  );
}

function renderPlus(props: WidgetTaskHandlerProps, cache: Cache | null, dayOffset: number, transparent: boolean, locale: 'pt' | 'en' | 'es') {
  if (!cache) {
    props.renderWidget(<AgendaPlusWidget familyName="" dayOffset={dayOffset} entries={[]} tasks={[]} transparent={transparent} locale={locale} />);
    return;
  }
  const ds = format(addDays(new Date(), dayOffset), 'yyyy-MM-dd');
  const dayEntries = cache.entries.filter((x) => x.entry_date === ds);
  const widgetEntries = cache.members.map((m) => {
    const ex = dayEntries.find((x) => x.member_id === m.id);
    const tt = ex ? cache.scheduleTypes.find((t) => t.id === ex.schedule_type_id) : null;
    return {
      memberName: m.name,
      memberColor: m.color,
      typeName: tt ? (tt.description || tt.name) : 'Sem horário',
      typeColor: tt?.color || (transparent ? '#FFFFFF44' : '#F5F3EC'),
    };
  });
  const dayTasks = (cache.tasks || []).filter((tk) => tk.entry_date === ds);
  const undone = dayTasks.filter((tk) => !tk.done);
  const done = dayTasks.filter((tk) => !!tk.done);
  const topTasks = [...undone, ...done].slice(0, 4).map((tk) => ({ title: tk.title, done: !!tk.done }));

  props.renderWidget(
    <AgendaPlusWidget familyName={cache.familyName} dayOffset={dayOffset} entries={widgetEntries} tasks={topTasks} transparent={transparent} locale={locale} />
  );
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction } = props;
  const { dayOffset, transparent, locale } = await readSettings();

  const isClick = widgetAction === 'WIDGET_CLICK';
  const isPeriodic = widgetAction === 'WIDGET_UPDATE';
  const isAdded = widgetAction === 'WIDGET_ADDED';

  // Any click OR any periodic update tries to fetch fresh data.
  const shouldFetch = isClick || isPeriodic || isAdded;
  const cache = shouldFetch ? await fetchFresh() : await readCache();

  if (widgetInfo.widgetName === 'Agenda') renderAgenda(props, cache, dayOffset, transparent, locale);
  else if (widgetInfo.widgetName === 'AgendaWeek') renderWeek(props, cache, transparent, locale);
  else if (widgetInfo.widgetName === 'AgendaPlus') renderPlus(props, cache, dayOffset, transparent, locale);
}
