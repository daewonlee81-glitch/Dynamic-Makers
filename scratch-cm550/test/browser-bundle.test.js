/* Loads dist/cm550-turbowarp.js in headless Chromium with a fake `Scratch`
 * global and a fake navigator.serial CM-550, then drives real blocks.
 * Run with: node --test test/browser-bundle.test.js  (after npm run build) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {chromium} = require('playwright');

const bundle = fs.readFileSync(path.join(__dirname, '..', 'dist', 'cm550-turbowarp.js'), 'utf8');

const PAGE_SETUP = `
window.__ext = null;
window.Scratch = {
    ArgumentType: {NUMBER: 'number', STRING: 'string', BOOLEAN: 'Boolean'},
    BlockType: {COMMAND: 'command', REPORTER: 'reporter', BOOLEAN: 'Boolean', BUTTON: 'button'},
    Cast: {toNumber: v => { const n = Number(v); return Number.isNaN(n) ? 0 : n; }},
    translate: Object.assign(m => m.default, {setup () {}}),
    vm: {runtime: {on () {}, emit () {}}, on () {}},
    extensions: {unsandboxed: true, register (e) { window.__ext = e; }}
};
// ---- fake CM-550 behind navigator.serial ----
const regs = {'1:0': 1060, '2:0': 1060, '200:0': 450, '200:21': 2, '200:89': 118, '200:102': 0xFF38, '1:44': 265, '2:44': 265, '1:132': 1024, '1:122': 0};
const CRC = (() => { const t = new Uint16Array(256); for (let i = 0; i < 256; i++) { let c = i << 8; for (let j = 0; j < 8; j++) { c = (c & 0x8000) ? ((c << 1) ^ 0x8005) : (c << 1); c &= 0xffff; } t[i] = c; } return b => { let c = 0; for (const x of b) c = ((c << 8) ^ t[((c >> 8) ^ x) & 0xff]) & 0xffff; return c; }; })();
const status = (id, params, err = 0) => { const body = [0x55, err, ...params]; const len = body.length + 2; const p = [0xff,0xff,0xfd,0,id,len&0xff,len>>8,...body]; const c = CRC(p); return Uint8Array.from([...p, c&0xff, c>>8]); };
const le = (v, n) => { if (v < 0) v += 2 ** (8*n); const o = []; for (let i = 0; i < n; i++) o.push((v / 2 ** (8*i)) & 0xff); return o; };
window.__written = [];
const handle = bytes => {
    const id = bytes[4], inst = bytes[7], addr = bytes[8] | (bytes[9] << 8);
    window.__written.push(Array.from(bytes));
    if (inst === 1) return id === 200 || id === 1 || id === 2 ? status(id, [0xc2, 0x01, 0x2a]) : null;
    if (inst === 2) { const size = bytes[10]; return status(id, le(regs[id + ':' + addr] || 0, size)); }
    if (inst === 3) { const size = (bytes[5] | (bytes[6] << 8)) - 5; let v = 0; for (let i = 0; i < size; i++) v += bytes[10 + i] * 2 ** (8*i); regs[id + ':' + addr] = v; return status(id, []); }
    return null; // sync write: no status
};
window.__regs = regs;
let pushChunk = null;
navigator.serial = {
    requestPort: async () => ({
        open: async () => {},
        close: async () => {},
        readable: new ReadableStream({start (ctrl) { pushChunk = c => ctrl.enqueue(c); }}),
        writable: new WritableStream({write (chunk) { const r = handle(chunk); if (r) setTimeout(() => pushChunk(r), 1); }})
    })
};
`;

test('bundle registers, connects over (fake) Web Serial and executes blocks', async t => {
    const browser = await chromium.launch();
    t.after(() => browser.close());
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent('<html><head></head><body><div class="injectionDiv"><svg><rect class="blocklyMainBackground"/></svg></div></body></html>');
    await page.evaluate(PAGE_SETUP);
    await page.evaluate(bundle);
    assert.deepEqual(errors, []);
    const panelText = await page.locator('section[aria-label="Python 코드"] pre').nth(1).innerText();
    assert.match(panelText, /from cm550 import \*/);
    assert.equal(await page.locator('.injectionDiv > section[aria-label="Python 코드"]').count(), 1);

    const info = await page.evaluate(() => {
        const i = window.__ext.getInfo();
        return {id: i.id, blocks: i.blocks.filter(b => b.opcode).length, name: i.name};
    });
    assert.equal(info.id, 'cm550');
    assert.equal(info.name, 'CM-550');
    assert.ok(info.blocks >= 40);

    const result = await page.evaluate(async () => {
        const ext = window.__ext;
        await ext.connectUsbButton();
        const out = {};
        out.connected = ext.isConnected();
        out.err = ext.lastError();
        out.modeWritten = window.__regs['200:21'];
        out.voltage = await ext.cmVoltage();
        out.roll = await ext.cmTilt({AXIS: 'roll'});
        await ext.cmLed({COLOR: 'green', ONOFF: 'on'});
        out.greenLed = window.__regs['200:92'];
        await ext.dxlMoveTo({ID: 1, DEG: 90, SPEED: 50});
        out.goal = window.__regs['1:116'];
        out.mode = window.__regs['1:11'];
        out.torque = window.__regs['1:64'];
        out.profileVel = window.__regs['1:112'];
        out.pos = await ext.dxlRead({ID: 1, PROP: 'position'});
        await ext.dxlWheelTwo({ID1: 1, SPEED1: 100, ID2: 2, SPEED2: -50});
        const sync = window.__written.filter(p => p[7] === 0x83).pop();
        out.syncWrite = sync ? sync.slice(8, 20) : null;
        await ext.motionPlay({PAGE: 3});
        out.motionPage = window.__regs['200:66'];
        await ext.portLed({PORT: 2, STATE: 'left'});
        out.portCat = window.__regs['200:392'];
        out.portLed = window.__regs['200:435'];
        await ext.disconnect();
        out.afterDisconnect = ext.isConnected();
        return out;
    });

    assert.equal(result.connected, true, result.err);
    assert.equal(result.err, '');
    assert.equal(result.modeWritten, 2);
    assert.equal(result.voltage, 11.8);
    assert.equal(result.roll, -2);
    assert.equal(result.greenLed, 1);
    assert.equal(result.goal, 1024);
    assert.equal(result.mode, 3);
    assert.equal(result.torque, 1);
    assert.equal(result.profileVel, 133);
    assert.equal(result.pos, 90);
    // sync write: addr 104 (0x68) size 4, id1 = 265, id2 = round(-132.5) = -132 (0xFFFFFF7C)
    assert.deepEqual(result.syncWrite, [0x68, 0x00, 0x04, 0x00, 1, 0x09, 0x01, 0, 0, 2, 0x7c, 0xff]);
    assert.equal(result.motionPage, 3);
    assert.equal(result.portCat, 7);
    assert.equal(result.portLed, 2);
    assert.equal(result.afterDisconnect, false);
});
