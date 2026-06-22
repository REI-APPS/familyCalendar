import { addDays, format } from 'date-fns';
import { pt, enUS, es } from 'date-fns/locale';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type AgendaPlusEntry = {
  memberName: string;
  memberColor: string;
  typeName: string;
  typeColor: string;
};

export type AgendaPlusTask = {
  title: string;
  done: boolean;
};

export type AgendaPlusPayload = {
  familyName: string;
  dayOffset: number;
  entries: AgendaPlusEntry[]; // schedules row
  tasks: AgendaPlusTask[]; // first 4 tasks
  transparent?: boolean;
  locale?: 'pt' | 'en' | 'es';
};

function pickLocale(loc?: string) {
  if (loc === 'en') return enUS;
  if (loc === 'es') return es;
  return pt;
}
function todayLabel(loc?: string) {
  if (loc === 'en') return 'TODAY';
  if (loc === 'es') return 'HOY';
  return 'HOJE';
}
function tomorrowLabel(loc?: string) {
  if (loc === 'en') return 'TOMORROW';
  if (loc === 'es') return 'MAÑANA';
  return 'AMANHÃ';
}
function emptyLabel(loc?: string) {
  if (loc === 'en') return 'No schedule';
  if (loc === 'es') return 'Sin agenda';
  return 'Sem agenda';
}

/**
 * Widget de 1 ou 2 linhas:
 *   Linha 1: agenda de hoje (membro + horário)
 *   Linha 2: até 4 tarefas (renderizada APENAS quando há tarefas)
 *
 * Toda a área é clickAction=REFRESH_AGENDA (não abre a app).
 */
export function AgendaPlusWidget(props: AgendaPlusPayload) {
  const dateLocale = pickLocale(props.locale);
  const dayLabel =
    props.dayOffset === 0 ? todayLabel(props.locale)
    : props.dayOffset === 1 ? tomorrowLabel(props.locale)
    : format(addDays(new Date(), props.dayOffset), 'EEE d', { locale: dateLocale }).toUpperCase();

  const transparent = !!props.transparent;
  const containerBg = transparent ? '#00000000' : '#FDFDF9';
  const cardTextColor = '#2D3142';
  const subTextColor = transparent ? '#FFFFFF' : '#7D8299';
  const headTextColor = transparent ? '#FFFFFF' : '#2D3142';
  const cellEmptyBg = transparent ? '#FFFFFF66' : '#E5DDC4';  // less transparent for tasks (more visible/solid)

  const entries = props.entries.slice(0, 4); // max 4 schedules
  const tasksLeft = props.tasks.slice(0, 2);
  const tasksRight = props.tasks.slice(2, 4);

  const renderTile = (e: AgendaPlusEntry, key: number) => (
    <FlexWidget
      key={key}
      style={{
        flex: 1,
        flexDirection: 'column',
        backgroundColor: e.typeColor || e.memberColor,
        borderRadius: 10,
        padding: 6,
        marginHorizontal: 3,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget text={e.memberName} style={{ fontSize: 15, fontWeight: '800', color: cardTextColor }} />
      <TextWidget text={e.typeName} style={{ fontSize: 13, color: cardTextColor, fontWeight: '700' }} />
    </FlexWidget>
  );

  const renderTask = (tk: AgendaPlusTask, key: number) => (
    <FlexWidget
      key={key}
      style={{
        flex: 1,
        backgroundColor: cellEmptyBg,
        borderRadius: 8,
        padding: 4,
        marginHorizontal: 2,
        marginVertical: 1,
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text={(tk.done ? '✓ ' : '• ') + (tk.title.length > 18 ? tk.title.slice(0, 17) + '…' : tk.title)}
        style={{ fontSize: 14, color: cardTextColor, fontWeight: '700' }}
      />
    </FlexWidget>
  );

  return (
    <FlexWidget
      clickAction="REFRESH_AGENDA"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: containerBg,
        borderRadius: 16,
        padding: 8,
        flexDirection: 'row',
      }}
    >
      {/* Left date / refresh button column */}
      <FlexWidget
        clickAction="REFRESH_AGENDA"
        style={{
          flexDirection: 'column',
          marginRight: 8,
          justifyContent: 'center',
          width: 64,
          padding: 4,
          borderRadius: 8,
        }}
      >
        <TextWidget text={dayLabel} style={{ fontSize: 11, color: headTextColor, fontWeight: '800', letterSpacing: 0.5 }} />
        <TextWidget
          text={format(addDays(new Date(), props.dayOffset), 'dd MMM', { locale: dateLocale }).toUpperCase()}
          style={{ fontSize: 9, color: subTextColor, fontWeight: '700' }}
        />
        <TextWidget text="↻" style={{ fontSize: 12, color: subTextColor, fontWeight: '800', marginTop: 4 }} />
      </FlexWidget>

      {/* If there are tasks → 2 rows (schedules + tasks). Otherwise just schedules (1 row) */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        {/* Row 1: schedules */}
        <FlexWidget style={{ flex: 1, flexDirection: 'row', marginBottom: props.tasks.length > 0 ? 4 : 0 }}>
          {entries.length === 0 ? (
            <TextWidget text={emptyLabel(props.locale)} style={{ fontSize: 11, color: subTextColor, fontStyle: 'italic', flex: 1, marginLeft: 6 }} />
          ) : entries.map(renderTile)}
        </FlexWidget>

        {/* Row 2: tasks (rendered ONLY when there are tasks) */}
        {props.tasks.length > 0 ? (
          <FlexWidget style={{ flex: 1, flexDirection: 'row' }}>
            <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
              {tasksLeft.map(renderTask)}
            </FlexWidget>
            <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
              {tasksRight.map(renderTask)}
            </FlexWidget>
          </FlexWidget>
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
