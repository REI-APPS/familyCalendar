import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  // Only require/register on Android — react-native-android-widget calls
  // AppRegistry.registerHeadlessTask which is not available on web/iOS.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { widgetTaskHandler } = require('./src/widgets/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
