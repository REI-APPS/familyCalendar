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

// ---- Supabase + React Native fix --------------------------------------------
// @supabase/realtime-js imports the Node-only 'ws' WebSocket package.
// React Native already provides a global WebSocket, so we stub 'ws' (and its
// Node-only deps) on native builds.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web') {
    if (
      moduleName === 'ws' ||
      moduleName === 'stream' ||
      moduleName === 'http' ||
      moduleName === 'https' ||
      moduleName === 'net' ||
      moduleName === 'tls' ||
      moduleName === 'zlib' ||
      moduleName === 'crypto' ||
      moduleName === 'buffer'
    ) {
      return { type: 'empty' };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};
// -----------------------------------------------------------------------------

config.maxWorkers = 2;

module.exports = config;
