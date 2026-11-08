// Separate bundle for the 3D simulator: MuJoCo (WASM glue) + three.js (src/sim3d/sim-entry.js).
const esbuild = require('esbuild');
esbuild.build({
    entryPoints: ['src/sim3d/sim-entry.js'],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    charset: 'utf8',
    outfile: process.env.OUTFILE || 'dist/dm-sim.js',
    minify: true,
    legalComments: 'eof',
    external: ['module', 'fs', 'path', 'url', 'worker_threads', 'crypto'],
    define: {'import.meta.url': '"https://localhost/dm-sim.js"'},
    logLevel: 'warning'
}).catch(() => process.exit(1));
