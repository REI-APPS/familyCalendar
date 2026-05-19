# Android Home-Screen Widget — Implementation Notes

Expo Go **does not support native Android widgets**. The widget will be available only after building a production APK via the Emergent "Publish" button (or `eas build`).

## What's needed (post-MVP)

1. **Config plugin** (`plugins/withAgendaWidget.js`) that injects into `AndroidManifest.xml`:
   ```xml
   <receiver android:name=".AgendaWidgetProvider" android:exported="true">
     <intent-filter>
       <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>
     </intent-filter>
     <meta-data android:name="android.appwidget.provider"
                android:resource="@xml/agenda_widget_info"/>
   </receiver>
   ```

2. **Kotlin file** `AgendaWidgetProvider.kt` that reads `today_schedule` JSON from
   `SharedPreferences("AgendaWidget", MODE_PRIVATE)` and renders a `RemoteViews`
   layout (`res/layout/agenda_widget.xml`) listing each member and code.

3. **Widget metadata** `res/xml/agenda_widget_info.xml` (size 4x2, update every 1800s).

4. **Bridge from JS** — when the schedule changes, the app writes the daily
   payload to AsyncStorage *and* into Android SharedPreferences via a native
   module (e.g. `expo-modules-core`) so the widget can read it offline.

5. **Add the plugin** to `app.json`:
   ```json
   "plugins": ["./plugins/withAgendaWidget"]
   ```

The Emergent "Publish" flow will pick this up automatically when generating the
release APK. Until then, the widget appears greyed-out in the Android widget
picker on dev builds.
