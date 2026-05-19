// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Stable on-disk cache
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// ---- Supabase + Hermes fix --------------------------------------------------
// The Node.js build of @supabase/realtime-js contains a dynamic `import()`
// for optional @opentelemetry/api tracing. Hermes cannot parse that syntax,
// so the AAB build fails at the createBundleReleaseJsAndAssets step.
//
// Telling Metro to prefer the "react-native"/"browser" package-exports
// condition makes it pick the clean build without OpenTelemetry.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['react-native', 'browser', 'require'];

// Extra safety: empty-stub any opentelemetry module that still slips through.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@opentelemetry/')) {
    return { type: 'empty' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};
// -----------------------------------------------------------------------------

config.maxWorkers = 2;

module.exports = config;
