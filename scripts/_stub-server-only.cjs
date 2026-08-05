// "server-only" unconditionally throws when required outside Next's
// bundler (which normally strips it via webpack/Turbopack aliasing).
// Pre-populate require.cache so this standalone script can still exercise
// server-only-guarded modules like lib/crypto/*.
const path = require.resolve("server-only")
require.cache[path] = { id: path, filename: path, loaded: true, exports: {} }
