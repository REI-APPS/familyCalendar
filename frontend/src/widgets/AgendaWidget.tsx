import { addDays, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WidgetEntry = {
  memberName: string;
  memberColor: string;
  typeCode: string;
  typeName: string;
  typeColor: string;
};

export type WidgetPayload = {
  familyName: string;
  dayOffset: number; // 0 = today, 1 = tomorrow, etc.
  entries: WidgetEntry[];
};

const WIDTH = 'match_parent' as const;

export function AgendaWidget(props: WidgetPayload) {
  const dayLabel =
    props.dayOffset === 0
      ? 'HOJE'
      : props.dayOffset === 1
        ? 'AMANHÃ'
        : format(addDays(new Date(), props.dayOffset), "EEEE", { locale: pt }).toUpperCase();
  const dateLabel = format(addDays(new Date(), props.dayOffset), "d 'de' MMMM", { locale: pt });

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#FDFDF9',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text={props.familyName.toUpperCase()} style={{ fontSize: 9, color: '#7D8299', fontWeight: '800', letterSpacing: 1 }} />
          <TextWidget text={dayLabel} style={{ fontSize: 18, color: '#2D3142', fontWeight: '800' }} />
        </FlexWidget>
        <TextWidget text={dateLabel} style={{ fontSize: 11, color: '#7D8299' }} />
      </FlexWidget>

      {/* Members rows */}
      {props.entries.length === 0 ? (
        <TextWidget
          text="Sem agenda para este dia"
          style={{ fontSize: 13, color: '#7D8299', fontStyle: 'italic', marginTop: 12 }}
        />
      ) : (
        props.entries.slice(0, 4).map((e, i) => (
          <FlexWidget
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: e.typeColor || e.memberColor,
              borderRadius: 12,
              padding: 8,
              marginTop: 6,
            }}
          >
            <FlexWidget
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#FFFFFF',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 8,
              }}
            >
              <TextWidget text={e.memberName.charAt(0).toUpperCase()} style={{ fontSize: 14, fontWeight: '800', color: '#2D3142' }} />
            </FlexWidget>
            <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
              <TextWidget text={e.memberName} style={{ fontSize: 11, fontWeight: '700', color: '#2D3142' }} />
              <TextWidget text={e.typeCode + ' · ' + e.typeName} style={{ fontSize: 13, fontWeight: '800', color: '#2D3142' }} />
            </FlexWidget>
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
