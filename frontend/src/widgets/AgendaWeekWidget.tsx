import { addDays, format, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WeekCell = {
  typeColor: string;
  typeName: string; // description (or fallback name) of the schedule type
};

export type AgendaWeekPayload = {
  memberNames: string[];     // one per member (rows)
  memberColors: string[];    // one per member
  weekStart: string;         // ISO date string
  matrix: (WeekCell | null)[][]; // matrix[dayIndex][memberIndex]
  // tasksByDay[dayIndex] = first task title for that day (string) or null
  tasksByDay?: (string | null)[];
  transparent?: boolean;
};

/**
 * Weekly widget — Excel-like grid.
 * Layout:
 *   ┌──────────┬───┬───┬───┬───┬───┬───┬───┐
 *   │   ↻      │SEG│TER│QUA│QUI│SEX│SAB│DOM│   <- header row
 *   ├──────────┼───┼───┼───┼───┼───┼───┼───┤
 *   │ MEMBER1  │ M │ T │   │ M │   │   │   │   <- member row 1
 *   ├──────────┼───┼───┼───┼───┼───┼───┼───┤
 *   │ MEMBER2  │   │ M │ T │   │   │   │   │   <- member row 2
 *   ├──────────┼───┼───┼───┼───┼───┼───┼───┤
 *   │ TAREFAS  │ … │   │ … │   │   │   │   │   <- tasks row (last)
 *   └──────────┴───┴───┴───┴───┴───┴───┴───┘
 */
export function AgendaWeekWidget(props: AgendaWeekPayload) {
  const transparent = !!props.transparent;
  const containerBg = transparent ? '#00000000' : '#FDFDF9';
  const headBg = transparent ? '#00000033' : '#F5F3EC';
  const textColor = '#2D3142';
  const subColor = transparent ? '#FFFFFF' : '#7D8299';
  const cellEmptyBg = transparent ? '#00000022' : '#F5F3EC';
  const taskBg = transparent ? '#FFFFFF55' : '#FFE6B8'; // amber/cream for tasks
  const todayBg = '#FF8FA3';

  const weekStartDate = new Date(props.weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const tasksByDay = props.tasksByDay || [];

  const trim = (s: string | null | undefined, max: number) =>
    !s ? '' : (s.length > max ? s.slice(0, max - 1) + '…' : s);

  const labelColWidth = 64; // px for the first column (refresh / member name / TAREFAS)

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
      {/* HEADER ROW: refresh button + day labels */}
      <FlexWidget style={{ flexDirection: 'row', height: 38 }}>
        <FlexWidget
          clickAction="REFRESH_AGENDA"
          style={{
            width: labelColWidth,
            backgroundColor: headBg,
            borderRadius: 6,
            marginHorizontal: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget text="↻" style={{ fontSize: 20, color: textColor, fontWeight: '800' }} />
        </FlexWidget>
        {days.map((d, di) => {
          const today = isToday(d);
          return (
            <FlexWidget
              key={di}
              style={{
                flex: 1,
                backgroundColor: today ? todayBg : headBg,
                borderRadius: 6,
                marginHorizontal: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 1,
              }}
            >
              <TextWidget
                text={format(d, 'EEE', { locale: pt }).toUpperCase()}
                style={{ fontSize: 11, fontWeight: '800', color: today ? '#FFFFFF' : subColor }}
              />
              <TextWidget
                text={format(d, 'd')}
                style={{ fontSize: 16, fontWeight: '800', color: today ? '#FFFFFF' : textColor }}
              />
            </FlexWidget>
          );
        })}
      </FlexWidget>

      {/* MEMBER ROWS — one per member, flex:1 so they share height equally */}
      {props.memberNames.map((name, mi) => (
        <FlexWidget key={mi} style={{ flexDirection: 'row', flex: 1, marginTop: 2 }}>
          {/* Member name cell */}
          <FlexWidget
            style={{
              width: labelColWidth,
              backgroundColor: props.memberColors[mi] || '#C8B6FF',
              borderRadius: 6,
              marginHorizontal: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 2,
            }}
          >
            <TextWidget
              text={trim(name, 10)}
              style={{ fontSize: 14, fontWeight: '800', color: textColor }}
            />
          </FlexWidget>
          {/* Day cells for this member */}
          {days.map((_, di) => {
            const cell = props.matrix[di]?.[mi];
            return (
              <FlexWidget
                key={di}
                style={{
                  flex: 1,
                  backgroundColor: cell?.typeColor || cellEmptyBg,
                  borderRadius: 6,
                  marginHorizontal: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 1,
                }}
              >
                <TextWidget
                  text={trim(cell?.typeName, 7)}
                  style={{ fontSize: 14, fontWeight: '800', color: textColor }}
                />
              </FlexWidget>
            );
          })}
        </FlexWidget>
      ))}

      {/* TASKS ROW (last row) — shows first undone task title per day */}
      {tasksByDay.some(Boolean) ? (
        <FlexWidget style={{ flexDirection: 'row', flex: 1, marginTop: 2 }}>
          <FlexWidget
            style={{
              width: labelColWidth,
              backgroundColor: taskBg,
              borderRadius: 6,
              marginHorizontal: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 2,
            }}
          >
            <TextWidget
              text="TAREFAS"
              style={{ fontSize: 11, fontWeight: '800', color: textColor }}
            />
          </FlexWidget>
          {days.map((_, di) => {
            const t = tasksByDay[di];
            return (
              <FlexWidget
                key={di}
                style={{
                  flex: 1,
                  backgroundColor: t ? taskBg : cellEmptyBg,
                  borderRadius: 6,
                  marginHorizontal: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 1,
                }}
              >
                {t ? (
                  <TextWidget
                    text={trim(t, 7)}
                    style={{ fontSize: 12, fontWeight: '700', color: textColor }}
                  />
                ) : null}
              </FlexWidget>
            );
          })}
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}
