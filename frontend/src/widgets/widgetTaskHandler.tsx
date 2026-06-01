import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { addDays, format, startOfWeek } from 'date-fns';
import { AgendaWidget } from '../widgets/AgendaWidget';
import { AgendaWeekWidget } from '../widgets/AgendaWeekWidget';
import { AgendaPlusWidget } from '../widgets/AgendaPlusWidget';
import { supabase } from '../lib/supabase';
import { storage } from '../utils/storage';

const WIDGET_CACHE_KEY = 'widget_data_cache';
const WIDGET_DAY_KEY = 'widget_day_offset';
const WIDGET_TRANSPARENT_KEY = 'widget_transparent';

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
  return {
    dayOffset: Number(dayStr) || 0,
    transparent: transStr === 'true',
  };
}

async function readCache(): Promise<Cache | null> {
  const raw = await storage.getItem(WIDGET_CACHE_KEY, '');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * In a headless context the supabase client may not have rehydrated the
 * session yet — wait for getSession() to settle before issuing queries.
 * Returns true if there is a valid session.
 */
async function ensureSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[widget] getSession error:', error.message);
      return false;
    }
    return !!data?.session?.access_token;
  } catch (e) {
    console.warn('[widget] getSession threw', e);
    return false;
  }
}

async function fetchFresh(): Promise<Cache | null> {
  try {
    const cache = await readCache();
    const fid = cache?.familyId;
    if (!fid) {
      console.warn('[widget] no familyId in cache — open app first');
      return cache;
    }
    const ok = await ensureSession();
    if (!ok) {
      console.warn('[widget] no auth session — open app first');
      return cache;
    }
    const [m, ty, e, tk] = await Promise.all([
      supabase.from('members').select('id,name,color').eq('family_id', fid),
      supabase.from('schedule_types').select('id,code,name,description,color').eq('family_id', fid),
      supabase.from('schedule_entries').select('member_id,schedule_type_id,entry_date').eq('family_id', fid),
      supabase.from('tasks').select('entry_date,title,done').eq('family_id', fid).order('entry_date'),
    ]);
    if (m.error || ty.error || e.error) {
      console.warn('[widget] fetch failed', m.error || ty.error || e.error);
      return cache;
    }
    const fresh: Cache = {
      familyId: fid,
      familyName: cache?.familyName || '',
      members: m.data ?? [],
      scheduleTypes: ty.data ?? [],
      entries: e.data ?? [],
      tasks: tk.data ?? [],
    };
    await storage.setItem(WIDGET_CACHE_KEY, JSON.stringify(fresh));
    return fresh;
  } catch (err) {
    console.warn('[widget] fetchFresh threw', err);
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
  // First 4 tasks for the same day (not done first, then done)
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

  // For refresh clicks (or periodic updates), try to fetch fresh data from Supabase
  const isRefresh =
    widgetAction === 'WIDGET_CLICK' && (props as any).clickAction === 'REFRESH_AGENDA';
  const isPeriodic = widgetAction === 'WIDGET_UPDATE';
  const cache = isRefresh || isPeriodic ? await fetchFresh() : await readCache();

  if (widgetInfo.widgetName === 'Agenda') {
    renderAgenda(props, cache, dayOffset, transparent);
  } else if (widgetInfo.widgetName === 'AgendaWeek') {
    renderWeek(props, cache, transparent);
  } else if (widgetInfo.widgetName === 'AgendaPlus') {
    renderPlus(props, cache, dayOffset, transparent);
  }
}
