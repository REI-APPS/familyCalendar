import { addDays, format, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WeekCell = {
  typeColor: string;
  typeName: string; // description (or fallback name) of the schedule type
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
 * Weekly view — flex fills the whole widget.
 * Day column on the left, then a TASK column right after it (when there's a task),
 * and the member columns to the right of that.
 */
export function AgendaWeekWidget(props: AgendaWeekPayload) {
  const transparent = !!props.transparent;
  const containerBg = transparent ? '#00000000' : '#FDFDF9';
  const headBg = transparent ? '#00000033' : '#F5F3EC';
  const textColor = '#2D3142';
  const subColor = transparent ? '#FFFFFF' : '#7D8299';
  const cellEmptyBg = transparent ? '#00000022' : '#F5F3EC';
  const taskBg = transparent ? '#FFFFFF55' : '#FFE6B8'; // amber/cream for tasks so they pop

  const weekStartDate = new Date(props.weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const tasksByDay = props.tasksByDay || [];

  // Helper: trim long text for narrow cells
  const trim = (s: string | null | undefined, max: number) =>
    !s ? '' : (s.length > max ? s.slice(0, max - 1) + '…' : s);

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
      <FlexWidget style={{ flexDirection: 'row', height: 32 }}>
        <FlexWidget
          clickAction="REFRESH_AGENDA"
          style={{
            width: 50,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: headBg,
            borderRadius: 6,
            marginRight: 2,
          }}
        >
          <TextWidget text="↻" style={{ fontSize: 18, color: textColor, fontWeight: '800' }} />
        </FlexWidget>
        {/* Empty header above the task column */}
        <FlexWidget style={{ width: 70, marginRight: 2 }} />
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
              text={trim(name, 9)}
              style={{ fontSize: 16, fontWeight: '800', color: textColor }}
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
            {/* DAY column */}
            <FlexWidget
              style={{
                width: 50,
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
                style={{ fontSize: 14, fontWeight: '800', color: today ? '#FFFFFF' : subColor }}
              />
              <TextWidget
                text={format(d, 'd')}
                style={{ fontSize: 22, fontWeight: '800', color: today ? '#FFFFFF' : textColor }}
              />
            </FlexWidget>
            {/* TASK column — always rendered (empty bg when no task) so columns stay aligned */}
            <FlexWidget
              style={{
                width: 70,
                backgroundColor: firstTask ? taskBg : 'transparent',
                borderRadius: 6,
                marginRight: 2,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 2,
              }}
            >
              {firstTask ? (
                <TextWidget
                  text={trim(firstTask, 10)}
                  style={{ fontSize: 13, fontWeight: '700', color: textColor }}
                />
              ) : null}
            </FlexWidget>
            {/* MEMBER columns */}
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
                    padding: 2,
                  }}
                >
                  <TextWidget
                    text={trim(cell?.typeName, 9)}
                    style={{ fontSize: 16, fontWeight: '800', color: textColor }}
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
