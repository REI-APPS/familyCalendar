// Custom entry point.
//
// IMPORTANT: We register the Android widget task handler BEFORE importing
// expo-router/entry so it's available in the HEADLESS JS context that Android
// spawns to handle widget click actions and periodic updates when the app is
// not open. Previously the handler was only imported inside app/_layout.tsx,
// which meant Android fired the widget intents but no handler was registered
// — so taps on ↻ and periodic updates were silently dropped.
//
// Order matters: require() (CommonJS) guarantees execution order, unlike
// ES imports which are hoisted.
require('./widget-task-handler');
require('expo-router/entry');
