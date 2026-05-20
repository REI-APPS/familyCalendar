import { addDays, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WidgetEntry = {
  memberName: string;
  memberColor: string;
  typeName: string;
  typeColor: string;
};

export type WidgetPayload = {
  familyName: string;
  dayOffset: number;
  entries: WidgetEntry[];
  transparent?: boolean;
};

export function AgendaWidget(props: WidgetPayload) {
  const dayLabel =
    props.dayOffset === 0 ? 'HOJE'
    : props.dayOffset === 1 ? 'AMANHÃ'
    : format(addDays(new Date(), props.dayOffset), 'EEE d', { locale: pt }).toUpperCase();

  const bg = props.transparent ? 'transparent' : '#FDFDF9';
  const cardOpacity = props.transparent ? 0.85 : 1;
  const visible = props.entries.slice(0, 3);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: bg,
        borderRadius: 16,
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <FlexWidget style={{ flexDirection: 'column', marginRight: 8, justifyContent: 'center' }}>
        <TextWidget text={dayLabel} style={{ fontSize: 11, color: '#2D3142', fontWeight: '800', letterSpacing: 0.5 }} />
        <TextWidget text={format(addDays(new Date(), props.dayOffset), 'dd MMM', { locale: pt }).toUpperCase()} style={{ fontSize: 9, color: '#7D8299', fontWeight: '700' }} />
      </FlexWidget>

      {visible.length === 0 ? (
        <TextWidget text="Sem agenda" style={{ fontSize: 11, color: '#7D8299', fontStyle: 'italic', flex: 1, marginLeft: 6 }} />
      ) : (
        visible.map((e, i) => (
          <FlexWidget
            key={i}
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
            <TextWidget text={e.memberName} style={{ fontSize: 10, fontWeight: '800', color: '#2D3142' }} />
            <TextWidget text={e.typeName} style={{ fontSize: 9, color: '#2D3142', fontWeight: '600' }} />
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
