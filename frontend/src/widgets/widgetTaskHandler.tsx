import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { addDays, format, startOfWeek } from 'date-fns';
import { AgendaWidget } from '../widgets/AgendaWidget';
import { AgendaWeekWidget } from '../widgets/AgendaWeekWidget';
import { AgendaPlusWidget } from '../widgets/AgendaPlusWidget';
import { storage } from '../utils/storage';

const WIDGET_CACHE_KEY = 'widget_data_cache';
const WIDGET_DAY_KEY = 'widget_day_offset';
const WIDGET_TRANSPARENT_KEY = 'widget_transparent';
const TOKEN_CACHE_KEY = 'widget_access_token';
const REFRESH_TOKEN_CACHE_KEY = 'widget_refresh_token';
const TOKEN_EXP_CACHE_KEY = 'widget_access_token_exp';

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
};

async function readSettings() {
  const dayStr = await storage.getItem(WIDGET_DAY_KEY, '0');
  const transStr = await storage.getItem(WIDGET_TRANSPARENT_KEY, 'false');
  return { dayOffset: Number(dayStr) || 0, transparent: transStr === 'true' };
}

async function readCache(): Promise<Cache | null> {
  const raw = await storage.getItem(WIDGET_CACHE_KEY, '');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Try to refresh the JWT using the stored refresh_token. */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const rt = await storage.getItem(REFRESH_TOKEN_CACHE_KEY, '');
    if (!rt) return null;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.access_token) {
      await storage.setItem(TOKEN_CACHE_KEY, data.access_token as string);
      if (data.refresh_token) await storage.setItem(REFRESH_TOKEN_CACHE_KEY, data.refresh_token as string);
      if (data.expires_at) await storage.setItem(TOKEN_EXP_CACHE_KEY, Number(data.expires_at));
      return data.access_token as string;
    }
    return null;
  } catch {
    return null;
  }
}

/** Fetch directly via PostgREST + stored token — bypasses supabase-js init issues */
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

async function restWithRetry(token: string, path: string): Promise<any[]> {
  let r = await rest(token, path);
  if (r.ok) return r.data || [];
  if (r.status === 401) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      r = await rest(fresh, path);
      if (r.ok) return r.data || [];
    }
  }
  return [];
}

async function fetchFresh(): Promise<Cache | null> {
  try {
    const cache = await readCache();
    const fid = cache?.familyId;
    if (!fid) return cache;
    let token = await storage.getItem(TOKEN_CACHE_KEY, '');
    if (!token) {
      const fresh = await refreshAccessToken();
      if (!fresh) return cache;
      token = fresh;
    }

    // Run requests independently so a single failure (e.g. tasks RLS) doesn't drop the whole refresh.
    const [m, ty, e, tk] = await Promise.all([
      restWithRetry(token, `members?family_id=eq.${fid}&select=id,name,color,created_at&order=created_at.asc.nullslast,name.asc`),
      restWithRetry(token, `schedule_types?family_id=eq.${fid}&select=id,code,name,description,color`),
      restWithRetry(token, `schedule_entries?family_id=eq.${fid}&select=member_id,schedule_type_id,entry_date`),
      restWithRetry(token, `tasks?family_id=eq.${fid}&select=entry_date,title,done&order=entry_date.asc`),
    ]);
    const fresh: Cache = {
      familyId: fid,
      familyName: cache?.familyName || '',
      members: (m && m.length) ? m : (cache?.members || []),
      scheduleTypes: (ty && ty.length) ? ty : (cache?.scheduleTypes || []),
      entries: (e && e.length) ? e : (cache?.entries || []),
      tasks: tk || cache?.tasks || [],
    };
    await storage.setItem(WIDGET_CACHE_KEY, JSON.stringify(fresh));
    return fresh;
  } catch {
    return await readCache();
  }
}

function renderAgenda(props: WidgetTaskHandlerProps, cache: Cache | null, dayOffset: number, transparent: boolean) {
  if (!cache) {
    props.renderWidget(<AgendaWidget familyName="" dayOffset={dayOffset} entries={[]} transparent={transparent} />);
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
    <AgendaWidget familyName={cache.familyName} dayOffset={dayOffset} entries={widgetEntries} transparent={transparent} />
  );
}

function renderWeek(props: WidgetTaskHandlerProps, cache: Cache | null, transparent: boolean) {
  if (!cache) {
    props.renderWidget(<AgendaWeekWidget memberNames={[]} memberColors={[]} weekStart={new Date().toISOString()} matrix={[]} tasksByDay={[]} transparent={transparent} />);
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
      return { typeColor: t.color, typeName: t.code };
    });
  });
  const tasks = cache.tasks || [];
  const tasksByDay = days.map((d) => {
    const ds = format(d, 'yyyy-MM-dd');
    const dayTasks = tasks.filter((tk) => tk.entry_date === ds);
    const undone = dayTasks.find((tk) => !tk.done);
    return (undone || dayTasks[0])?.title ?? null;
  });
  props.renderWidget(
    <AgendaWeekWidget
      memberNames={cache.members.map((m) => m.name)}
      memberColors={cache.members.map((m) => m.color)}
      weekStart={weekStart.toISOString()}
      matrix={matrix}
      tasksByDay={tasksByDay}
      transparent={transparent}
    />
  );
}

function renderPlus(props: WidgetTaskHandlerProps, cache: Cache | null, dayOffset: number, transparent: boolean) {
  if (!cache) {
    props.renderWidget(<AgendaPlusWidget familyName="" dayOffset={dayOffset} entries={[]} tasks={[]} transparent={transparent} />);
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
    <AgendaPlusWidget familyName={cache.familyName} dayOffset={dayOffset} entries={widgetEntries} tasks={topTasks} transparent={transparent} />
  );
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction } = props;
  const { dayOffset, transparent } = await readSettings();

  const isRefresh = widgetAction === 'WIDGET_CLICK' && (props as any).clickAction === 'REFRESH_AGENDA';
  const isPeriodic = widgetAction === 'WIDGET_UPDATE';
  const isResized = widgetAction === 'WIDGET_RESIZED';
  const cache = isRefresh || isPeriodic ? await fetchFresh() : await readCache();

  // Always render with whatever data we have so the widget never blanks out.
  if (widgetInfo.widgetName === 'Agenda') renderAgenda(props, cache, dayOffset, transparent);
  else if (widgetInfo.widgetName === 'AgendaWeek') renderWeek(props, cache, transparent);
  else if (widgetInfo.widgetName === 'AgendaPlus') renderPlus(props, cache, dayOffset, transparent);

  // Mark isResized as referenced to avoid lint warnings; this is intentional.
  void isResized;
}
