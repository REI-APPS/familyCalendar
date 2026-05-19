import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { AgendaWidget } from '../widgets/AgendaWidget';

// Native widget lifecycle handler.
// Receives widgetAction events from the OS (WIDGET_ADDED, WIDGET_UPDATE, etc.)
// We render an empty/placeholder until the JS side calls updateAgendaWidget(...).
const PLACEHOLDER = {
  familyName: 'Agenda da Família',
  dayOffset: 0,
  entries: [],
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  if (widgetInfo.widgetName !== 'Agenda') return;
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<AgendaWidget {...PLACEHOLDER} />);
      break;
    case 'WIDGET_DELETED':
      break;
    default:
      break;
  }
}
