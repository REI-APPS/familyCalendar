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

// Today widget — auto layout:
//  • <=4 membros → 1 linha (4×1)
//  • >4 membros → 2 linhas (4×2)
export function AgendaWidget(props: WidgetPayload) {
  const dayLabel =
    props.dayOffset === 0 ? 'HOJE'
    : props.dayOffset === 1 ? 'AMANHÃ'
    : format(addDays(new Date(), props.dayOffset), 'EEE d', { locale: pt }).toUpperCase();

  const transparent = !!props.transparent;
  // 'transparent' must be a real transparent color (#00000000), not the string
  const containerBg = transparent ? '#00000000' : '#FDFDF9';
  const cardTextColor = '#2D3142';
  const subTextColor = transparent ? '#FFFFFF' : '#7D8299';
  const headTextColor = transparent ? '#FFFFFF' : '#2D3142';

  const entries = props.entries;
  const twoRows = entries.length > 4;
  const firstRow = twoRows ? entries.slice(0, Math.ceil(entries.length / 2)) : entries;
  const secondRow = twoRows ? entries.slice(Math.ceil(entries.length / 2)) : [];

  const renderTile = (e: WidgetEntry, key: number) => (
    <FlexWidget
      key={key}
      style={{
        flex: 1,
        flexDirection: 'column',
        backgroundColor: e.typeColor || e.memberColor,
        borderRadius: 10,
        padding: 6,
        marginHorizontal: 3,
        marginVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget text={e.memberName} style={{ fontSize: 10, fontWeight: '800', color: cardTextColor }} />
      <TextWidget text={e.typeName} style={{ fontSize: 9, color: cardTextColor, fontWeight: '600' }} />
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
        alignItems: 'center',
      }}
    >
      <FlexWidget
        clickAction="REFRESH_AGENDA"
        style={{ flexDirection: 'column', marginRight: 8, justifyContent: 'center', width: 60, padding: 4, borderRadius: 8 }}
      >
        <TextWidget text={dayLabel} style={{ fontSize: 11, color: headTextColor, fontWeight: '800', letterSpacing: 0.5 }} />
        <TextWidget
          text={format(addDays(new Date(), props.dayOffset), 'dd MMM', { locale: pt }).toUpperCase()}
          style={{ fontSize: 9, color: subTextColor, fontWeight: '700' }}
        />
        <TextWidget text="↻ refresh" style={{ fontSize: 8, color: subTextColor, fontWeight: '700', marginTop: 2 }} />
      </FlexWidget>

      {entries.length === 0 ? (
        <TextWidget text="Sem agenda" style={{ fontSize: 11, color: subTextColor, fontStyle: 'italic', flex: 1, marginLeft: 6 }} />
      ) : twoRows ? (
        <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
          <FlexWidget style={{ flexDirection: 'row', flex: 1 }}>{firstRow.map(renderTile)}</FlexWidget>
          <FlexWidget style={{ flexDirection: 'row', flex: 1 }}>{secondRow.map(renderTile)}</FlexWidget>
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'row', flex: 1 }}>{firstRow.map(renderTile)}</FlexWidget>
      )}
    </FlexWidget>
  );
}
