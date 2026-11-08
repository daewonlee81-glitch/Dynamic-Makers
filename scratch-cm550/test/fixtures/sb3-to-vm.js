/**
 * Minimal sb3 -> scratch-vm block-map conversion for tests that should not
 * depend on a scratch-vm checkout. Mirrors what sb3.js deserializeInputs /
 * deserializeFields produce for the shapes used in our fixtures.
 */
const PRIMITIVE = {
    4: ['math_number', 'NUM'], 5: ['math_positive_number', 'NUM'], 6: ['math_whole_number', 'NUM'],
    7: ['math_integer', 'NUM'], 8: ['math_angle', 'NUM'], 9: ['colour_picker', 'COLOUR'], 10: ['text', 'TEXT']
};

const sb3BlocksToVM = sb3Blocks => {
    const out = {};
    let n = 0;
    const primitive = (arr, parent) => {
        const [code, value] = arr;
        const id = `prim${++n}`;
        const [opcode, field] = PRIMITIVE[code];
        out[id] = {id, opcode, next: null, parent, inputs: {}, fields: {[field]: {name: field, value}}, shadow: true, topLevel: false};
        return id;
    };
    for (const [id, b] of Object.entries(sb3Blocks)) {
        const inputs = {};
        for (const [name, v] of Object.entries(b.inputs || {})) {
            const [type, a, c] = v;
            let blockId = null;
            let shadowId = null;
            const resolve = x => (Array.isArray(x) ? primitive(x, id) : x);
            if (type === 1) { blockId = resolve(a); shadowId = blockId; }
            if (type === 2) { blockId = resolve(a); shadowId = null; }
            if (type === 3) { blockId = resolve(a); shadowId = c ? resolve(c) : null; }
            inputs[name] = {name, block: blockId, shadow: shadowId};
        }
        const fields = {};
        for (const [name, v] of Object.entries(b.fields || {})) {
            fields[name] = {name, value: v[0], ...(v[1] ? {id: v[1]} : {})};
        }
        out[id] = {
            id, opcode: b.opcode, next: b.next, parent: b.parent, inputs, fields,
            shadow: b.shadow, topLevel: b.topLevel, x: b.x, y: b.y,
            ...(b.mutation ? {mutation: b.mutation} : {})
        };
    }
    return out;
};

module.exports = {sb3BlocksToVM};
