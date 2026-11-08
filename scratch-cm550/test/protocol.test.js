/* Run with: node --test test/ */
const test = require('node:test');
const assert = require('node:assert/strict');
const P2 = require('../src/protocol2');
const {CM550Device, CM, DXL, PORT} = require('../src/cm550');

const hex = bytes => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');

test('PING packet matches ROBOTIS e-Manual example (ID 1)', () => {
    // e-Manual Protocol 2.0: FF FF FD 00 01 03 00 01 19 4E
    assert.equal(hex(P2.ping(1)), 'ff ff fd 00 01 03 00 01 19 4e');
});

test('WRITE packet matches e-Manual example (ID1, addr 116, 4 bytes = 512)', () => {
    // FF FF FD 00 01 09 00 03 74 00 00 02 00 00 CA 89
    assert.equal(hex(P2.write(1, 116, 512, 4)), 'ff ff fd 00 01 09 00 03 74 00 00 02 00 00 ca 89');
});

test('READ packet matches e-Manual example (ID1, addr 132, len 4)', () => {
    // FF FF FD 00 01 07 00 02 84 00 04 00 1D 15
    assert.equal(hex(P2.read(1, 132, 4)), 'ff ff fd 00 01 07 00 02 84 00 04 00 1d 15');
});

test('SYNC WRITE packet matches e-Manual example', () => {
    // ID1 -> 150 (0x96), ID2 -> 170 (0xAA) to addr 116 size 4
    // FF FF FD 00 FE 11 00 83 74 00 04 00 01 96 00 00 00 02 AA 00 00 00 82 87
    const pkt = P2.syncWrite(116, 4, [{id: 1, value: 150}, {id: 2, value: 170}]);
    assert.equal(hex(pkt), 'ff ff fd 00 fe 11 00 83 74 00 04 00 01 96 00 00 00 02 aa 00 00 00 82 87');
});

test('byte stuffing inserts FD after FF FF FD in payload', () => {
    const pkt = P2.writeBytes(1, 0, [0xff, 0xff, 0xfd, 0x01]);
    // params: 00 00 FF FF FD FD 01  -> length = 1(inst)+2(addr)+5(stuffed)+2(crc) = 10
    assert.equal(pkt[5], 10);
    assert.equal(hex(pkt.subarray(8, 15)), '00 00 ff ff fd fd 01');
});

test('negative values are two\'s complement little endian', () => {
    assert.deepEqual(P2.le(-1, 4), [0xff, 0xff, 0xff, 0xff]);
    assert.deepEqual(P2.le(-100, 2), [0x9c, 0xff]);
    assert.equal(P2.fromLE([0x9c, 0xff], 0, 2, true), -100);
    assert.equal(P2.fromLE([0x9c, 0xff], 0, 2, false), 65436);
});

test('parser decodes a status packet with params and tolerates garbage/splits', () => {
    const got = [];
    const parser = new P2.PacketParser(p => got.push(p));
    // Status from ID1, error 0, params = present position 166 (0xA6)
    // FF FF FD 00 01 08 00 55 00 A6 00 00 00 8C C0
    const status = [0xff, 0xff, 0xfd, 0x00, 0x01, 0x08, 0x00, 0x55, 0x00, 0xa6, 0x00, 0x00, 0x00, 0x8c, 0xc0];
    parser.push([0x12, 0x34]); // noise
    parser.push(status.slice(0, 6));
    parser.push(status.slice(6));
    assert.equal(got.length, 1);
    assert.equal(got[0].id, 1);
    assert.equal(got[0].error, 0);
    assert.equal(P2.fromLE(got[0].params, 0, 4, true), 166);
});

test('parser drops packets with bad CRC', () => {
    const got = [];
    const parser = new P2.PacketParser(p => got.push(p));
    const bad = [0xff, 0xff, 0xfd, 0x00, 0x01, 0x04, 0x00, 0x55, 0x00, 0x00, 0x00];
    parser.push(bad);
    assert.equal(got.length, 0);
});

test('parser reports error bit and alert bit', () => {
    const got = [];
    const parser = new P2.PacketParser(p => got.push(p));
    const body = [0xff, 0xff, 0xfd, 0x00, 0x01, 0x04, 0x00, 0x55, 0x84];
    const crc = P2.crc16(body);
    parser.push([...body, crc & 0xff, crc >> 8]);
    assert.equal(got[0].error, 4);
    assert.equal(got[0].alert, true);
});

// ---- device layer with a fake transport ------------------------------------

class FakeTransport {
    constructor (responder) {
        this.responder = responder;
        this.isOpen = true;
        this.name = 'fake';
        this.written = [];
    }
    onData (cb) { this._data = cb; }
    onClose (cb) { this._close = cb; }
    async open () {}
    async close () { this.isOpen = false; }
    async write (bytes) {
        this.written.push(Array.from(bytes));
        const reply = this.responder(bytes);
        if (reply) setTimeout(() => this._data(reply), 1);
    }
}

const statusPacket = (id, params = [], error = 0) => {
    const body = [0x55, error, ...params];
    const len = body.length + 2;
    const pkt = [0xff, 0xff, 0xfd, 0x00, id, len & 0xff, len >> 8, ...body];
    const crc = P2.crc16(pkt);
    return Uint8Array.from([...pkt, crc & 0xff, crc >> 8]);
};

const attach = (device, transport) => {
    device.transport = transport;
    transport.onData(chunk => device.parser.push(chunk));
    transport.onClose(() => { device.transport = null; });
};

test('device read/write round trip and per-port category handling', async () => {
    const dev = new CM550Device();
    const regs = {};
    const tr = new FakeTransport(bytes => {
        const id = bytes[4];
        const inst = bytes[7];
        const addr = bytes[8] | (bytes[9] << 8);
        if (inst === P2.INST.READ) {
            const size = bytes[10];
            const v = regs[`${id}:${addr}`] || 0;
            return statusPacket(id, P2.le(v, size));
        }
        if (inst === P2.INST.WRITE) {
            const size = bytes[5] + (bytes[6] << 8) - 5; // len - inst - addr - crc
            regs[`${id}:${addr}`] = P2.fromLE(bytes, 10, size);
            return statusPacket(id);
        }
        return null;
    });
    attach(dev, tr);

    await dev.writeCM(CM.LED_RED, 1);
    assert.equal(regs['200:91'], 1);

    regs['200:89'] = 118;
    assert.equal(await dev.readCM(CM.VOLTAGE), 118);

    regs['200:102'] = 0xff38; // -200 -> -2.00 deg
    assert.equal(await dev.readCM(CM.ROLL), -200);

    // port 3 IR read sets category 4 at address 394 before reading 419+... (DMS) etc.
    regs['200:423'] = 777;
    assert.equal(await dev.readPort(PORT.DMS, 3), 777);
    assert.equal(regs['200:394'], 5);

    // DYNAMIXEL goal position write (4 bytes) on ID 2
    await dev.writeDXL(2, DXL.GOAL_POSITION, 2048);
    assert.equal(regs['2:116'], 2048);

    // moveTo: torque off -> mode 3 -> torque on -> profile velocity -> goal
    regs['1:0'] = 1060; // XL430-W250
    regs['1:44'] = 265; // velocity limit
    await dev.moveTo(1, 90, 50);
    assert.equal(regs['1:11'], 3);
    assert.equal(regs['1:64'], 1);
    assert.equal(regs['1:112'], 133);
    assert.equal(regs['1:116'], 1024);
});

test('device times out when no status packet arrives', async () => {
    const dev = new CM550Device();
    dev.timeoutMs = 20;
    attach(dev, new FakeTransport(() => null));
    await assert.rejects(dev.readCM(CM.VOLTAGE), /시간 초과/);
    assert.match(dev.lastError, /시간 초과/);
});

test('device surfaces status-packet error codes', async () => {
    const dev = new CM550Device();
    attach(dev, new FakeTransport(bytes => statusPacket(bytes[4], [], 0x07)));
    await assert.rejects(dev.writeDXL(1, DXL.TORQUE_ENABLE, 1), /Access Error/);
});

test('broadcast ping collects every reply (model + firmware)', async () => {
    const dev = new CM550Device();
    const tr = new FakeTransport(bytes => {
        if (bytes[4] !== 0xfe || bytes[7] !== P2.INST.PING) return null;
        // three devices answer: CM-550 (450), XL430 (1060), XL330-M288 (1200)
        return Uint8Array.from([
            ...statusPacket(200, [...P2.le(450, 2), 47]),
            ...statusPacket(1, [...P2.le(1060, 2), 46]),
            ...statusPacket(7, [...P2.le(1200, 2), 50])
        ]);
    });
    attach(dev, tr);
    const found = await dev.broadcastPing(30);
    assert.deepEqual(found, [
        {id: 1, model: 1060, firmware: 46},
        {id: 7, model: 1200, firmware: 50},
        {id: 200, model: 450, firmware: 47}
    ]);
    // normal requests still work afterwards
    tr.responder = b => statusPacket(b[4], [0x2a]);
    assert.equal(await dev.read(1, 65, 1), 0x2a);
});

// ---- 2XL430 dual-axis EEPROM lock --------------------------------------------
const dualAxisBus = () => {
    // IDs 1,2 = one 2XL430 module; IDs 3 = XL430. EEPROM (addr < 64) writes are
    // refused with Access Error while torque is on for the motor or its sibling.
    const regs = {'1:0': 1090, '2:0': 1090, '3:0': 1060, '1:11': 3, '2:11': 3, '3:11': 3,
        '1:64': 1, '2:64': 1, '3:64': 1, '1:44': 265, '2:44': 265, '3:44': 265};
    const sibling = {1: 2, 2: 1};
    const writes = [];
    const responder = bytes => {
        const id = bytes[4], inst = bytes[7], addr = bytes[8] | (bytes[9] << 8);
        if (![1, 2, 3].includes(id)) return null;
        if (inst === P2.INST.READ) return statusPacket(id, P2.le(regs[`${id}:${addr}`] || 0, bytes[10]));
        if (inst === P2.INST.WRITE) {
            const size = bytes[5] + (bytes[6] << 8) - 5;
            const value = P2.fromLE(bytes, 10, size);
            const locked = regs[`${id}:64`] || (sibling[id] && regs[`${sibling[id]}:64`]);
            if (addr < 64 && locked) return statusPacket(id, [], 0x07);
            regs[`${id}:${addr}`] = value;
            writes.push([id, addr, value]);
            return statusPacket(id);
        }
        return null;
    };
    return {regs, writes, responder};
};

test('move on a 2XL430 axis already in position mode never writes EEPROM', async () => {
    const dev = new CM550Device();
    const bus = dualAxisBus();
    bus.regs['1:64'] = 0; // the field case: ID 1 torque off, ID 2 torque on
    attach(dev, new FakeTransport(bus.responder));
    await dev.moveTo(1, 100, 50);
    assert.ok(!bus.writes.some(w => w[1] === 11), 'no Operating Mode write');
    assert.equal(bus.regs['1:64'], 1, 'torque turned on');
    assert.equal(bus.regs['1:116'], Math.round(100 / 360 * 4096), 'goal position written');
});

test('mode change on a 2XL430 axis briefly releases the sibling axis torque', async () => {
    const dev = new CM550Device();
    const bus = dualAxisBus();
    attach(dev, new FakeTransport(bus.responder));
    await dev.setWheelSpeed(1, 50); // needs velocity mode (EEPROM)
    assert.equal(bus.regs['1:11'], 1, 'ID 1 now in velocity mode');
    assert.equal(bus.regs['2:64'], 1, 'sibling ID 2 torque restored');
    assert.equal(bus.regs['1:64'], 1, 'ID 1 torque back on');
    assert.ok(bus.writes.some(w => w[0] === 2 && w[1] === 64 && w[2] === 0), 'sibling torque was released');
});

test('block errors are reported through onError', async () => {
    const {createExtension} = require('../src/extension');
    const Cls = createExtension({
        ArgumentType: {NUMBER: 'number', STRING: 'string'},
        BlockType: {COMMAND: 'command', REPORTER: 'reporter', BOOLEAN: 'Boolean', BUTTON: 'button'},
        formatMessage: m => m.default
    });
    const ext = new Cls(null);
    const errors = [];
    ext.onError = m => errors.push(m);
    await ext.dxlMoveTo({ID: 1, DEG: 90, SPEED: 50}); // not connected
    assert.equal(errors.length, 1);
    assert.match(errors[0], /연결되어 있지 않습니다/);
});

// ---- model registry / automatic per-model behaviour ---------------------------
const {describeMotors, pairDualAxes} = require('../src/models');

test('2XL430 axes are paired A/B and labelled; XL330 over-voltage and XL-320 are flagged', () => {
    const motors = [1, 2, 3, 4].map(id => ({id, model: 1090})).concat([{id: 7, model: 1200}, {id: 9, model: 350}]);
    assert.deepEqual(pairDualAxes(motors).map(p => [p.a, p.b]), [[1, 2], [3, 4]]);
    const d = describeMotors(motors, 12.1);
    assert.equal(d.labels[1], '2XL430 A축');
    assert.equal(d.labels[4], '2XL430 B축');
    assert.equal(d.axis[3].sibling, 4);
    assert.ok(d.warnings.some(w => w.includes('ID 7') && w.includes('XL330-M288') && w.includes('12.1 V')));
    assert.ok(d.warnings.some(w => w.includes('ID 9') && w.includes('XL-320')));
});

test('ID menu lists detected motors with models first, keeps other numbers', () => {
    const {createExtension} = require('../src/extension');
    const Cls = createExtension({
        ArgumentType: {NUMBER: 'number', STRING: 'string'},
        BlockType: {COMMAND: 'command', REPORTER: 'reporter', BOOLEAN: 'Boolean', BUTTON: 'button'},
        formatMessage: m => m.default
    });
    const ext = new Cls(null);
    ext.device.setMotors([{id: 1, model: 1090}, {id: 2, model: 1090}, {id: 5, model: 1060}]);
    const menu = ext._dxlIdMenu();
    assert.deepEqual(menu.slice(0, 3), [
        {text: '1 · 2XL430 A축', value: '1'}, {text: '2 · 2XL430 B축', value: '2'}, {text: '5 · XL430', value: '5'}
    ]);
    assert.ok(menu.includes('3') && menu.includes('30') && !menu.includes('5'));
    assert.deepEqual(ext._dxlModuleMenu()[0], {text: '모듈 1 (ID 1·2)', value: '1,2'});
});

test('grip refuses motors without current control (XL430) with a clear message', async () => {
    const dev = new CM550Device();
    const bus = dualAxisBus();
    attach(dev, new FakeTransport(bus.responder));
    await assert.rejects(dev.grip(3, 90, 30), /전류\(힘\) 제어를 지원하지 않습니다/);
});

test('no block text starts with a digit (the engine prefixes "%1 %2", so "2축" would become %22)', () => {
    const {createExtension} = require('../src/extension');
    const Cls = createExtension({
        ArgumentType: {NUMBER: 'number', STRING: 'string'},
        BlockType: {COMMAND: 'command', REPORTER: 'reporter', BOOLEAN: 'Boolean', BUTTON: 'button'},
        formatMessage: m => m.default
    });
    const bad = new Cls(null).getInfo().blocks.filter(b => b.opcode && /^\d/.test(b.text)).map(b => b.opcode);
    assert.deepEqual(bad, []);
});

// ---- poses taught by hand ------------------------------------------------------
test('poses round-trip through the list text and tolerate hand edits', () => {
    const {encodePose, decodePose} = require('../src/poses');
    assert.equal(encodePose({3: 92.34, 1: 180, 2: 175.55}), '1:180 2:175.6 3:92.3');
    assert.deepEqual(decodePose('1:180, 2=175.5  3:-12'), {1: 180, 2: 175.5, 3: -12});
    assert.deepEqual(decodePose(''), {});
});

test('movePose makes joints arrive together; torque-on holds the hand-made pose', async () => {
    const dev = new CM550Device();
    const bus = dualAxisBus();
    const deg = d => Math.round(d / 360 * 4096);
    bus.regs['1:132'] = deg(90); // present positions
    bus.regs['2:132'] = deg(180);
    bus.regs['3:132'] = deg(170);
    bus.regs['1:116'] = deg(10); // stale goals from before the hand posing
    attach(dev, new FakeTransport(bus.responder));
    dev.setMotors([{id: 1, model: 1090}, {id: 2, model: 1090}, {id: 3, model: 1060}]);

    // torque on: goal = present first, so no jump back to 10°
    bus.regs['1:64'] = 0;
    await dev.setJointsTorque([1], true);
    const goalWrites = bus.writes.filter(w => w[0] === 1 && w[1] === 116);
    assert.equal(goalWrites[0][2], deg(90), 'goal set to present before torque on');
    assert.ok(bus.writes.findIndex(w => w[0] === 1 && w[1] === 116) <
        bus.writes.findIndex(w => w[0] === 1 && w[1] === 64 && w[2] === 1), 'goal written before torque');

    // pose: ID1 moves 90°, ID2 moves 10°, ID3 does not move, all in 2 s
    bus.writes.length = 0;
    await dev.movePose({1: 180, 2: 190, 3: 170}, 2);
    const pv = id => bus.writes.filter(w => w[0] === id && w[1] === 112).pop()[2];
    assert.equal(pv(1), Math.ceil(90 / 2 / 6 / 0.229)); // 33
    assert.equal(pv(2), Math.ceil(10 / 2 / 6 / 0.229)); // 4
    assert.ok(pv(3) >= 1, 'never 0 (0 means unlimited speed)');
    const lastPv = bus.writes.map(w => w[1]).lastIndexOf(112);
    const firstGoal = bus.writes.map(w => w[1]).indexOf(116);
    assert.ok(lastPv < firstGoal, 'all speeds set before any joint starts');
    assert.equal(bus.regs['1:116'], deg(180));
});

test('moveTogether ("모두 함께" block): after the first call only two SYNC WRITEs per pose', async () => {
    const dev = new CM550Device();
    const bus = dualAxisBus();
    const deg = d => Math.round(d / 360 * 4096);
    bus.regs['1:132'] = deg(170);
    bus.regs['3:132'] = deg(180);
    const syncs = [];
    let single = 0;
    const responder = b => {
        if (b[4] === 0xFE && b[7] === P2.INST.SYNC_WRITE) {
            syncs.push(b[8] | (b[9] << 8));
            return null;
        }
        single++;
        return bus.responder(b);
    };
    attach(dev, new FakeTransport(responder));
    dev.setMotors([{id: 1, model: 1090}, {id: 2, model: 1090}, {id: 3, model: 1060}]);
    await dev.moveTogether([{id: 1, deg: 180}, {id: 3, deg: 200}], 0.5);
    assert.deepEqual(syncs, [116, 64, 112, 116], 'hold, stiffen all at once, speeds, goals');
    syncs.length = 0;
    single = 0;
    await dev.moveTogether([{id: 1, deg: 190}, {id: 3, deg: 200}], 0.1);
    assert.deepEqual(syncs, [112, 116]);
    assert.equal(single, 0, 'no per-motor reads or writes while walking');
});

test('pose blocks store poses in the project list "로봇 자세"', async () => {
    const {createExtension} = require('../src/extension');
    const Cls = createExtension({
        ArgumentType: {NUMBER: 'number', STRING: 'string'},
        BlockType: {COMMAND: 'command', REPORTER: 'reporter', BOOLEAN: 'Boolean', BUTTON: 'button'},
        formatMessage: m => m.default
    });
    const lists = {};
    const stage = {
        lookupVariableById: id => lists[id],
        lookupVariableByNameAndType: name => Object.values(lists).find(l => l.name === name),
        lookupOrCreateList: (id, name) => (lists[id] = lists[id] || {id, name, value: []})
    };
    const runtime = {getTargetForStage: () => stage, emitProjectChanged () {}};
    const ext = new Cls(runtime);
    const bus = dualAxisBus();
    bus.regs['1:132'] = 1024; bus.regs['2:132'] = 2048; bus.regs['3:132'] = 3072;
    attach(ext.device, new FakeTransport(bus.responder));
    ext.device.setMotors([{id: 1, model: 1090}, {id: 2, model: 1090}, {id: 3, model: 1060}]);
    await ext.poseRecord({N: 2});
    const list = lists['dm-robot-poses'];
    assert.equal(list.name, '로봇 자세');
    assert.deepEqual(list.value, ['', '1:90 2:180 3:270']);
    assert.equal(ext.poseCount(), 1);
    ext.poseClear();
    assert.deepEqual(list.value, []);
});
