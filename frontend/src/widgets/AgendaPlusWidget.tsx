import { addDays, format } from 'date-fns';
import { pt } from 'date-fns/locale';
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
};

/**
 * Widget de 2 linhas:
 *   Linha 1 (50%): agenda de hoje (membro + horário)
 *   Linha 2 (50%): 4 tarefas (2 esquerda, 2 direita)
 */
export function AgendaPlusWidget(props: AgendaPlusPayload) {
  const dayLabel =
    props.dayOffset === 0 ? 'HOJE'
    : props.dayOffset === 1 ? 'AMANHÃ'
    : format(addDays(new Date(), props.dayOffset), 'EEE d', { locale: pt }).toUpperCase();

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
          text={format(addDays(new Date(), props.dayOffset), 'dd MMM', { locale: pt }).toUpperCase()}
          style={{ fontSize: 9, color: subTextColor, fontWeight: '700' }}
        />
        <TextWidget text="↻ refresh" style={{ fontSize: 9, color: subTextColor, fontWeight: '700', marginTop: 4 }} />
      </FlexWidget>

      {/* Two rows: schedules + tasks */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        {/* Row 1: schedules */}
        <FlexWidget style={{ flex: 1, flexDirection: 'row', marginBottom: 4 }}>
          {entries.length === 0 ? (
            <TextWidget text="Sem agenda" style={{ fontSize: 11, color: subTextColor, fontStyle: 'italic', flex: 1, marginLeft: 6 }} />
          ) : entries.map(renderTile)}
        </FlexWidget>

        {/* Row 2: tasks (2 left + 2 right columns) */}
        <FlexWidget style={{ flex: 1, flexDirection: 'row' }}>
          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            {tasksLeft.length === 0 ? (
              <TextWidget text="Sem tarefas" style={{ fontSize: 10, color: subTextColor, fontStyle: 'italic', flex: 1, marginLeft: 4 }} />
            ) : tasksLeft.map(renderTask)}
          </FlexWidget>
          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            {tasksRight.map(renderTask)}
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
