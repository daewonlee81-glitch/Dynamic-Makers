// Separate bundle for AI 학습: TensorFlow.js + embedded MobileNet (src/ai/tf-entry.js).
const esbuild = require('esbuild');
esbuild.build({
    entryPoints: ['src/ai/tf-entry.js'],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    charset: 'utf8',
    outfile: process.env.OUTFILE || 'dist/dm-ai.js',
    minify: true,
    legalComments: 'eof',
    logLevel: 'warning'
}).catch(() => process.exit(1));
