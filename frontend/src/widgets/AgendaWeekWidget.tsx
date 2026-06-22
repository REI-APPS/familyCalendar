import { addDays, format, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WeekCell = {
  typeColor: string;
  typeName: string; // description (or fallback name) of the schedule type
};

export type AgendaWeekPayload = {
  memberNames: string[];     // one per member (columns)
  memberColors: string[];    // one per member
  weekStart: string;         // ISO date string
  matrix: (WeekCell | null)[][]; // matrix[dayIndex][memberIndex]
  // tasksByDay[dayIndex] = comma-joined task titles for that day, or null
  tasksByDay?: (string | null)[];
  transparent?: boolean;
};

/**
 * Weekly widget — transposed Excel-style table.
 *
 * Layout:
 *   ┌─────┬──────┬──────┬──────┐
 *   │  ↻  │User1 │User2 │User3 │   <- header row
 *   ├─────┼──────┼──────┼──────┤
 *   │ SEG │Turn1 │Free  │Turn2 │   <- schedule sub-row
 *   │     │ tarefaSeg1, tarefaSeg2  <- task sub-row (spans columns 2..n)
 *   ├─────┼──────┼──────┼──────┤
 *   │ TER │Turn1 │Free  │Turn2 │
 *   │     │ tarefaTER1, tarefaTER2
 *   ...
 *
 * Each day occupies 2 sub-rows (schedule + task). Task sub-row is rendered
 * empty when there are no tasks for that day.
 */
export function AgendaWeekWidget(props: AgendaWeekPayload) {
  const transparent = !!props.transparent;
  const containerBg = transparent ? '#00000000' : '#FDFDF9';
  const headBg = transparent ? '#00000033' : '#F5F3EC';
  const textColor = '#2D3142';
  const subColor = transparent ? '#FFFFFF' : '#7D8299';
  const cellEmptyBg = transparent ? '#00000022' : '#F5F3EC';
  const taskBg = transparent ? '#FFFFFF55' : '#FFE6B8';
  const todayBg = '#FF8FA3';

  const weekStartDate = new Date(props.weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const tasksByDay = props.tasksByDay || [];

  const trim = (s: string | null | undefined, max: number) =>
    !s ? '' : (s.length > max ? s.slice(0, max - 1) + '…' : s);

  const dayColWidth = 48; // px for the leftmost column (day labels / refresh)

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: containerBg,
        borderRadius: 16,
        padding: 4,
        flexDirection: 'column',
      }}
    >
      {/* HEADER ROW: refresh button + member names */}
      <FlexWidget style={{ flexDirection: 'row', height: 32 }}>
        <FlexWidget
          clickAction="REFRESH_AGENDA"
          style={{
            width: dayColWidth,
            backgroundColor: headBg,
            borderRadius: 6,
            marginHorizontal: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget text="↻" style={{ fontSize: 18, color: textColor, fontWeight: '800' }} />
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
              text={trim(name, 9)}
              style={{ fontSize: 13, fontWeight: '800', color: textColor }}
            />
          </FlexWidget>
        ))}
      </FlexWidget>

      {/* DAY BLOCKS — one block per day, each containing schedule + task sub-rows */}
      {days.map((d, di) => {
        const today = isToday(d);
        const taskText = tasksByDay[di];
        return (
          <FlexWidget key={di} style={{ flexDirection: 'column', flex: 1, marginTop: 2 }}>
            {/* Sub-row 1: schedules */}
            <FlexWidget style={{ flexDirection: 'row', flex: 1 }}>
              {/* Day label cell */}
              <FlexWidget
                style={{
                  width: dayColWidth,
                  backgroundColor: today ? todayBg : headBg,
                  borderRadius: 6,
                  marginHorizontal: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 2,
                }}
              >
                <TextWidget
                  text={format(d, 'EEE', { locale: pt }).toUpperCase()}
                  style={{ fontSize: 13, fontWeight: '800', color: today ? '#FFFFFF' : textColor }}
                />
                <TextWidget
                  text={format(d, 'd')}
                  style={{ fontSize: 11, fontWeight: '700', color: today ? '#FFFFFF' : subColor }}
                />
              </FlexWidget>
              {/* Member schedule cells */}
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
                      text={trim(cell?.typeName, 8)}
                      style={{ fontSize: 13, fontWeight: '800', color: textColor }}
                    />
                  </FlexWidget>
                );
              })}
            </FlexWidget>

            {/* Sub-row 2: tasks (full-width across the member columns) */}
            <FlexWidget style={{ flexDirection: 'row', flex: 1, marginTop: 1 }}>
              {/* Empty cell under the day label */}
              <FlexWidget
                style={{
                  width: dayColWidth,
                  marginHorizontal: 1,
                }}
              />
              {/* Merged tasks cell — spans all member columns */}
              <FlexWidget
                style={{
                  flex: 1,
                  backgroundColor: taskText ? taskBg : cellEmptyBg,
                  borderRadius: 6,
                  marginHorizontal: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 2,
                }}
              >
                {taskText ? (
                  <TextWidget
                    text={trim(taskText, 38)}
                    style={{ fontSize: 12, fontWeight: '700', color: textColor }}
                  />
                ) : null}
              </FlexWidget>
            </FlexWidget>
          </FlexWidget>
        );
      })}
    </FlexWidget>
  );
}
