// esbuild bundle of the app. With EXTERNAL set, `scratch-blocks` is left as an
// import of that URL (ES module from the CDN) instead of being bundled.
const esbuild = require('esbuild');
const external = process.env.EXTERNAL;
const plugins = external ? [{
    name: 'cdn-scratch-blocks',
    setup (build) {
        build.onResolve({filter: /^scratch-blocks$/}, () => ({path: external, external: true}));
    }
}] : [];
esbuild.build({
    entryPoints: ['src/main.js'],
    bundle: true,
    // FORMAT=iife for the single-file build (classic <script>, works from file://)
    format: process.env.FORMAT || 'esm',
    platform: 'browser',
    target: 'es2020',
    charset: 'utf8',
    outfile: process.env.OUTFILE || 'dist/dynamicmakers.js',
    minify: !external, // the web build stays readable: it is this app's own source
    nodePaths: [process.env.NODE_PATH],
    plugins,
    logLevel: 'warning'
}).catch(() => process.exit(1));
