import { addDays, format, isToday } from 'date-fns';
import { pt, enUS, es } from 'date-fns/locale';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WeekCell = {
  typeColor: string;
  typeName: string;
};

export type AgendaWeekPayload = {
  memberNames: string[];
  memberColors: string[];
  weekStart: string;
  matrix: (WeekCell | null)[][]; // matrix[dayIndex][memberIndex]
  tasksByDay?: (string | null)[];
  transparent?: boolean;
  locale?: 'pt' | 'en' | 'es';
};

function pickLocale(loc?: string) {
  if (loc === 'en') return enUS;
  if (loc === 'es') return es;
  return pt;
}

/**
 * Weekly widget — transposed Excel-style.
 *
 *   ┌─────┬──────┬──────┬──────┐
 *   │  ↻  │User1 │User2 │User3 │  <- header row
 *   ├─────┼──────┼──────┼──────┤
 *   │     │Turn1 │Free  │Turn2 │  <- schedules sub-row
 *   │ SEG ├──────┴──────┴──────┤
 *   │  1  │ task1, task2          <- tasks sub-row (merged across members)
 *   ├─────┼──────┬──────┬──────┤
 *   │     │Turn1 │Free  │Turn2 │
 *   │ TER ├──────┴──────┴──────┤
 *   │  2  │ task3, task4
 *   ...
 *
 * KEY: the day-label cell occupies the FULL height of the day block (both
 * sub-rows), so it's visually clear that the schedule row + task row both
 * belong to that day. Vertical columns are precisely aligned because the
 * schedule sub-row and member columns in the header use the SAME flex layout.
 */
export function AgendaWeekWidget(props: AgendaWeekPayload) {
  const transparent = !!props.transparent;
  const dateLocale = pickLocale(props.locale);

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

  const labelColWidth = 48;

  return (
    <FlexWidget
      clickAction="REFRESH_AGENDA"
      clickActionData={{}}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: containerBg,
        borderRadius: 16,
        padding: 4,
        flexDirection: 'column',
      }}
    >
      {/* HEADER ROW: refresh + member names (defines the column widths used below) */}
      <FlexWidget style={{ flexDirection: 'row', height: 30 }}>
        <FlexWidget
          clickAction="REFRESH_AGENDA"
      clickActionData={{}}
          style={{
            width: labelColWidth,
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

      {/* DAY BLOCKS — one per weekday. Layout: [day label | right column with 2 sub-rows] */}
      {days.map((d, di) => {
        const today = isToday(d);
        const taskText = tasksByDay[di];
        return (
          <FlexWidget key={di} style={{ flexDirection: 'row', flex: 1, marginTop: 2 }}>
            {/* Day label cell — spans full height of this block (both sub-rows) */}
            <FlexWidget
              style={{
                width: labelColWidth,
                backgroundColor: today ? todayBg : headBg,
                borderRadius: 6,
                marginHorizontal: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 2,
              }}
            >
              <TextWidget
                text={format(d, 'EEE', { locale: dateLocale }).toUpperCase()}
                style={{ fontSize: 13, fontWeight: '800', color: today ? '#FFFFFF' : textColor }}
              />
              <TextWidget
                text={format(d, 'd')}
                style={{ fontSize: 14, fontWeight: '700', color: today ? '#FFFFFF' : subColor }}
              />
            </FlexWidget>
            {/* Right side: schedules on top + tasks on bottom */}
            <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
              {/* Schedules sub-row */}
              <FlexWidget style={{ flex: 1, flexDirection: 'row' }}>
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
              {/* Tasks sub-row — single merged cell (no per-member sub-cells) */}
              <FlexWidget
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  backgroundColor: taskText ? taskBg : cellEmptyBg,
                  borderRadius: 6,
                  marginHorizontal: 1,
                  marginTop: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 2,
                }}
              >
                {taskText ? (
                  <TextWidget
                    text={trim(taskText, 42)}
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
