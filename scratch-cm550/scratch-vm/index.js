/**
 * scratch-vm built-in extension entry.
 * Installed at packages/scratch-vm/src/extensions/scratch3_cm550/index.js
 * (the ./lib folder is copied alongside by scripts/install-into-scratch-editor.sh)
 */
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const cast = require('../../util/cast');
const formatMessage = require('format-message');
const {createExtension} = require('./lib/extension');

module.exports = createExtension({ArgumentType, BlockType, formatMessage, cast});
