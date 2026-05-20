import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { AgendaWidget } from '../widgets/AgendaWidget';
import { AgendaWeekWidget } from '../widgets/AgendaWeekWidget';

// Placeholders rendered when widget is first added — JS side updates content after.
const TODAY_PLACEHOLDER = {
  familyName: 'Agenda da Família',
  dayOffset: 0,
  entries: [],
  transparent: false,
};

const WEEK_PLACEHOLDER = {
  memberNames: [],
  memberColors: [],
  weekStart: new Date().toISOString(),
  matrix: [],
  transparent: false,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      if (widgetInfo.widgetName === 'Agenda') {
        props.renderWidget(<AgendaWidget {...TODAY_PLACEHOLDER} />);
      } else if (widgetInfo.widgetName === 'AgendaWeek') {
        props.renderWidget(<AgendaWeekWidget {...WEEK_PLACEHOLDER} />);
      }
      break;
    case 'WIDGET_DELETED':
      break;
    default:
      break;
  }
}
