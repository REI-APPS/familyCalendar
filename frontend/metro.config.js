// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Hermes does NOT support dynamic import() expressions like the one
// @supabase/* uses for optional @opentelemetry/api tracing.
// Alias these to an empty stub so Hermes can compile the release bundle.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === '@opentelemetry/api' ||
    moduleName === '@opentelemetry/core' ||
    moduleName === '@opentelemetry/resources' ||
    moduleName === '@opentelemetry/semantic-conventions' ||
    moduleName === '@opentelemetry/sdk-trace-base'
  ) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.maxWorkers = 2;

module.exports = config;
