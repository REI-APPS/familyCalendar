import { Platform } from 'react-native';
import { addDays, format, startOfWeek } from 'date-fns';
import { storage } from '../utils/storage';
import i18n from '../i18n';

export type Member = { id: string; name: string; color: string };
export type ScheduleType = { id: string; code: string; name: string; description?: string | null; color: string };
export type ScheduleEntry = { member_id: string; schedule_type_id: string; entry_date: string };
export type Task = { entry_date: string; title: string; done?: boolean };

type Opts = {
  familyId?: string;
  familyName: string;
  members: Member[];
  scheduleTypes: ScheduleType[];
  entries: ScheduleEntry[];
  tasks?: Task[];
  dayOffset?: number;
  transparent?: boolean;
};

const WIDGET_CACHE_KEY = 'widget_data_cache';
const WIDGET_LOCALE_KEY = 'widget_locale';

function currentWidgetLocale(): 'pt' | 'en' | 'es' {
  const l = (i18n.language || 'pt').slice(0, 2).toLowerCase();
  if (l === 'en' || l === 'es') return l;
  return 'pt';
}

// Persist current app locale so the headless widget task handler can read it
export async function persistWidgetLocale() {
  try { await storage.setItem(WIDGET_LOCALE_KEY, currentWidgetLocale()); } catch {}
}

async function persistCache(opts: Opts) {
  if (!opts.familyId) return;
  try {
    await storage.setItem(
      WIDGET_CACHE_KEY,
      JSON.stringify({
        familyId: opts.familyId,
        familyName: opts.familyName,
        members: opts.members.map((m) => ({ id: m.id, name: m.name, color: m.color })),
        scheduleTypes: opts.scheduleTypes.map((t) => ({ id: t.id, code: t.code, name: t.name, description: t.description, color: t.color })),
        entries: opts.entries.map((e) => ({ member_id: e.member_id, schedule_type_id: e.schedule_type_id, entry_date: e.entry_date })),
        tasks: (opts.tasks || []).map((tk) => ({ entry_date: tk.entry_date, title: tk.title, done: !!tk.done })),
      })
    );
  } catch {}
}

// Update the Today (Agenda) widget
export async function updateAgendaWidget(opts: Opts) {
  if (Platform.OS !== 'android') return;
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { AgendaWidget } = require('../widgets/AgendaWidget');

    const { familyName, members, scheduleTypes, entries, dayOffset = 0, transparent = false } = opts;
    const targetDate = format(addDays(new Date(), dayOffset), 'yyyy-MM-dd');
    const dayEntries = entries.filter((e) => e.entry_date === targetDate);

    const widgetEntries = members.map((m) => {
      const ex = dayEntries.find((e) => e.member_id === m.id);
      const t = ex ? scheduleTypes.find((tt) => tt.id === ex.schedule_type_id) : null;
      return {
        memberName: m.name,
        memberColor: m.color,
        typeName: t ? (t.description || t.name) : 'Sem horário',
        typeColor: t?.color || (transparent ? '#FFFFFF44' : '#F5F3EC'),
      };
    });

    const payload = { familyName, dayOffset, entries: widgetEntries, transparent, locale: currentWidgetLocale() };

    await requestWidgetUpdate({
      widgetName: 'Agenda',
      renderWidget: () => <AgendaWidget {...payload} />,
      widgetNotFound: () => {},
    });
  } catch (e) {
    // Library not available — ignore
  }
}

// Update the Week (AgendaWeek) widget
export async function updateAgendaWeekWidget(opts: Opts) {
  if (Platform.OS !== 'android') return;
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { AgendaWeekWidget } = require('../widgets/AgendaWeekWidget');

    const { members, scheduleTypes, entries, tasks = [], transparent = false } = opts;
    const weekStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

    const matrix = days.map((d) => {
      const ds = format(d, 'yyyy-MM-dd');
      return members.map((m) => {
        const ex = entries.find((e) => e.member_id === m.id && e.entry_date === ds);
        if (!ex) return null;
        const t = scheduleTypes.find((tt) => tt.id === ex.schedule_type_id);
        if (!t) return null;
        return { typeColor: t.color, typeName: t.description || t.name };
      });
    });

    // Concatenate ALL tasks per day (undone first, then done), comma-separated.
    const tasksByDay = days.map((d) => {
      const ds = format(d, 'yyyy-MM-dd');
      const dayTasks = tasks.filter((tk) => tk.entry_date === ds);
      if (dayTasks.length === 0) return null;
      const undone = dayTasks.filter((tk) => !tk.done).map((tk) => tk.title);
      const done = dayTasks.filter((tk) => tk.done).map((tk) => tk.title);
      const all = [...undone, ...done];
      return all.length ? all.join(', ') : null;
    });

    const payload = {
      memberNames: members.map((m) => m.name),
      memberColors: members.map((m) => m.color),
      weekStart: weekStartDate.toISOString(),
      matrix,
      tasksByDay,
      transparent,
      locale: currentWidgetLocale(),
    };

    await requestWidgetUpdate({
      widgetName: 'AgendaWeek',
      renderWidget: () => <AgendaWeekWidget {...payload} />,
      widgetNotFound: () => {},
    });
  } catch (e) {
    // Library not available — ignore
  }
}

// Update the AgendaPlus (today + 4 tasks) widget
export async function updateAgendaPlusWidget(opts: Opts) {
  if (Platform.OS !== 'android') return;
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { AgendaPlusWidget } = require('../widgets/AgendaPlusWidget');

    const { familyName, members, scheduleTypes, entries, tasks = [], dayOffset = 0, transparent = false } = opts;
    const ds = format(addDays(new Date(), dayOffset), 'yyyy-MM-dd');
    const dayEntries = entries.filter((e) => e.entry_date === ds);

    const widgetEntries = members.map((m) => {
      const ex = dayEntries.find((e) => e.member_id === m.id);
      const t = ex ? scheduleTypes.find((tt) => tt.id === ex.schedule_type_id) : null;
      return {
        memberName: m.name,
        memberColor: m.color,
        typeName: t ? (t.description || t.name) : 'Sem horário',
        typeColor: t?.color || (transparent ? '#FFFFFF44' : '#F5F3EC'),
      };
    });

    const dayTasks = tasks.filter((tk) => tk.entry_date === ds);
    const undone = dayTasks.filter((tk) => !tk.done);
    const done = dayTasks.filter((tk) => !!tk.done);
    const topTasks = [...undone, ...done].slice(0, 4).map((tk) => ({ title: tk.title, done: !!tk.done }));

    const payload = { familyName, dayOffset, entries: widgetEntries, tasks: topTasks, transparent, locale: currentWidgetLocale() };

    await requestWidgetUpdate({
      widgetName: 'AgendaPlus',
      renderWidget: () => <AgendaPlusWidget {...payload} />,
      widgetNotFound: () => {},
    });
  } catch (e) {
    // Library not available — ignore
  }
}

// Convenience: update all three widgets at once
export async function updateAllWidgets(opts: Opts) {
  await persistCache(opts);
  await persistWidgetLocale();
  await updateAgendaWidget(opts);
  await updateAgendaWeekWidget(opts);
  await updateAgendaPlusWidget(opts);
}
