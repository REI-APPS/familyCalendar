import { Platform } from 'react-native';
import { addDays, format } from 'date-fns';

export type Member = { id: string; name: string; color: string };
export type ScheduleType = { id: string; code: string; name: string; color: string };
export type ScheduleEntry = { member_id: string; schedule_type_id: string; entry_date: string };

/**
 * Pushes today's (or offset day's) schedule to the Android home-screen widget.
 * No-op on iOS / web. Safe to call any time the app data changes.
 */
export async function updateAgendaWidget(opts: {
  familyName: string;
  members: Member[];
  scheduleTypes: ScheduleType[];
  entries: ScheduleEntry[];
  dayOffset?: number;
}) {
  if (Platform.OS !== 'android') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requestWidgetUpdate } = require('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AgendaWidget } = require('../widgets/AgendaWidget');

    const { familyName, members, scheduleTypes, entries, dayOffset = 0 } = opts;
    const targetDate = format(addDays(new Date(), dayOffset), 'yyyy-MM-dd');
    const dayEntries = entries.filter((e) => e.entry_date === targetDate);

    const widgetEntries = members.map((m) => {
      const ex = dayEntries.find((e) => e.member_id === m.id);
      const t = ex ? scheduleTypes.find((tt) => tt.id === ex.schedule_type_id) : null;
      return {
        memberName: m.name,
        memberColor: m.color,
        typeCode: t?.code || '-',
        typeName: t?.name || 'Sem horário',
        typeColor: t?.color || '#F5F3EC',
      };
    });

    const payload = { familyName, dayOffset, entries: widgetEntries };

    await requestWidgetUpdate({
      widgetName: 'Agenda',
      renderWidget: () => <AgendaWidget {...payload} />,
      widgetNotFound: () => {},
    });
  } catch (e) {
    // Library not available (Expo Go or dev) — ignore silently
  }
}
