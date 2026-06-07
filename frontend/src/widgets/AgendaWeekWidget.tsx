import { addDays, format, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WeekCell = {
  typeColor: string;
  typeName: string; // short code, e.g. "INF"
};

export type AgendaWeekPayload = {
  memberNames: string[];     // columns
  memberColors: string[];    // columns
  weekStart: string;         // ISO date string
  matrix: (WeekCell | null)[][]; // matrix[dayIndex][memberIndex]
  // tasksByDay[dayIndex] = first task title for that day (string) or null
  tasksByDay?: (string | null)[];
  transparent?: boolean;
};

/**
 * Vista semanal — preenche todo o espaço disponível com flex,
 * mostra primeira tarefa esporádica de cada dia abaixo do número.
 */
export function AgendaWeekWidget(props: AgendaWeekPayload) {
  const transparent = !!props.transparent;
  const containerBg = transparent ? '#00000000' : '#FDFDF9';
  const headBg = transparent ? '#00000033' : '#F5F3EC';
  const textColor = '#2D3142';
  const subColor = transparent ? '#FFFFFF' : '#7D8299';
  const cellEmptyBg = transparent ? '#00000022' : '#F5F3EC';

  const weekStartDate = new Date(props.weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const tasksByDay = props.tasksByDay || [];

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: containerBg,
        borderRadius: 16,
        padding: 6,
        flexDirection: 'column',
      }}
    >
      {/* Header row */}
      <FlexWidget style={{ flexDirection: 'row', height: 28 }}>
        <FlexWidget
          clickAction="REFRESH_AGENDA"
          style={{
            width: 56,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: headBg,
            borderRadius: 6,
            marginRight: 2,
          }}
        >
          <TextWidget text="↻" style={{ fontSize: 14, color: textColor, fontWeight: '800' }} />
        </FlexWidget>
        {props.memberNames.map((name, mi) => (
          <FlexWidget
            key={mi}
            style={{
              flex: 1,
              backgroundColor: props.memberColors[mi] || '#C8B6FF',
              borderRadius: 6,
              marginHorizontal: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 2,
            }}
          >
            <TextWidget
              text={name.length > 8 ? name.slice(0, 7) + '…' : name}
              style={{ fontSize: 14, fontWeight: '800', color: textColor }}
            />
          </FlexWidget>
        ))}
      </FlexWidget>

      {/* Rows: one per day — flex:1 so they spread evenly */}
      {days.map((d, di) => {
        const today = isToday(d);
        const firstTask = tasksByDay[di];
        return (
          <FlexWidget key={di} style={{ flexDirection: 'row', flex: 1, marginTop: 2 }}>
            <FlexWidget
              style={{
                width: 56,
                backgroundColor: today ? '#FF8FA3' : headBg,
                borderRadius: 6,
                marginRight: 2,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 2,
              }}
            >
              <TextWidget
                text={format(d, 'EEE', { locale: pt }).toUpperCase()}
                style={{ fontSize: 13, fontWeight: '800', color: today ? '#FFFFFF' : subColor }}
              />
              <TextWidget
                text={format(d, 'd')}
                style={{ fontSize: 18, fontWeight: '800', color: today ? '#FFFFFF' : textColor }}
              />
              {firstTask ? (
                <TextWidget
                  text={firstTask.length > 9 ? firstTask.slice(0, 8) + '…' : firstTask}
                  style={{ fontSize: 11, fontWeight: '700', color: today ? '#FFFFFF' : subColor, marginTop: 1 }}
                />
              ) : null}
            </FlexWidget>
            {props.memberNames.map((_, mi) => {
              const cell = props.matrix[di]?.[mi];
              return (
                <FlexWidget
                  key={mi}
                  style={{
                    flex: 1,
                    backgroundColor: cell?.typeColor || cellEmptyBg,
                    borderRadius: 6,
                    marginHorizontal: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TextWidget
                    text={cell?.typeName || ''}
                    style={{ fontSize: 14, fontWeight: '800', color: textColor }}
                  />
                </FlexWidget>
              );
            })}
          </FlexWidget>
        );
      })}
    </FlexWidget>
  );
}
