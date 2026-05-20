import { addDays, format, startOfWeek, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WeekCell = {
  // For each [day][member] combination
  typeColor: string;
  typeName: string; // short code, e.g. "INF"
};

export type AgendaWeekPayload = {
  memberNames: string[];     // columns
  memberColors: string[];    // columns
  weekStart: string;         // ISO date string
  // matrix[dayIndex][memberIndex] - 7 rows × N cols
  matrix: (WeekCell | null)[][];
  transparent?: boolean;
};

export function AgendaWeekWidget(props: AgendaWeekPayload) {
  const transparent = !!props.transparent;
  const containerBg = transparent ? '#00000000' : '#FDFDF9';
  const headBg = transparent ? '#00000033' : '#F5F3EC';
  const textColor = '#2D3142';
  const subColor = transparent ? '#FFFFFF' : '#7D8299';
  const cellEmptyBg = transparent ? '#00000022' : '#F5F3EC';

  const weekStartDate = new Date(props.weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

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
      {/* Header row: empty cell + member columns */}
      <FlexWidget style={{ flexDirection: 'row', height: 22 }}>
        <FlexWidget style={{ width: 38, justifyContent: 'center', alignItems: 'center', backgroundColor: headBg, borderRadius: 6, marginRight: 2 }}>
          <TextWidget text="·" style={{ fontSize: 10, color: subColor, fontWeight: '700' }} />
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
            }}
          >
            <TextWidget text={name.slice(0, 6)} style={{ fontSize: 9, fontWeight: '800', color: textColor }} />
          </FlexWidget>
        ))}
      </FlexWidget>

      {/* Rows: one per day */}
      {days.map((d, di) => {
        const today = isToday(d);
        return (
          <FlexWidget key={di} style={{ flexDirection: 'row', flex: 1, marginTop: 2 }}>
            <FlexWidget
              style={{
                width: 38,
                backgroundColor: today ? '#FF8FA3' : headBg,
                borderRadius: 6,
                marginRight: 2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TextWidget
                text={format(d, 'EEEEE', { locale: pt }).toUpperCase()}
                style={{ fontSize: 9, fontWeight: '800', color: today ? '#FFFFFF' : subColor }}
              />
              <TextWidget
                text={format(d, 'd')}
                style={{ fontSize: 11, fontWeight: '800', color: today ? '#FFFFFF' : textColor }}
              />
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
                  <TextWidget text={cell?.typeName || ''} style={{ fontSize: 9, fontWeight: '700', color: textColor }} />
                </FlexWidget>
              );
            })}
          </FlexWidget>
        );
      })}
    </FlexWidget>
  );
}
