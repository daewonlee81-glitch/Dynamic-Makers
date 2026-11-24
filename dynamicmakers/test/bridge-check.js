// CYCLO 브리지: a DYNAMIXEL Protocol 2.0 client over TCP (as CYCLO MCP uses tcp://host:port) talks to the
// 3D virtual MAX-E1 through tools/dxl-bridge.mjs and the 3D tab.
// Usage: node test/bridge-check.js http://localhost:8700/index.html
const net = require('net');
const path = require('path');
const {spawn} = require('child_process');
const {chromium} = require('playwright');
const P2 = require('../../scratch-cm550/src/protocol2');

const URL = process.argv[2] || 'http://localhost:8700/index.html';
const TCP = 19100;
const WS = 19101;
let failed = 0;
const check = (c, m) => { console.log(`${c ? 'ok' : 'FAIL'} - ${m}`); if (!c) failed++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// a tiny bus master: send a packet, collect status packets for a while
class Bus {
    constructor (sock) {
        this.sock = sock;
        this.got = [];
        this.rtt = [];
        this.parser = new P2.PacketParser(p => this.got.push(p));
        sock.on('data', d => this.parser.push(d));
    }

    /** Send, then wait until `expect` replies came (or `waitMs` passed) — like an SDK packet timeout. */
    async tx (pkt, waitMs = 150, chunks = 1, expect = null) {
        await sleep(5);
        this.got = [];
        const t0 = Date.now();
        const b = Buffer.from(pkt);
        const step = Math.ceil(b.length / chunks);
        for (let i = 0; i < b.length; i += step) {
            this.sock.write(b.subarray(i, i + step));
            if (chunks > 1) await sleep(20); // split across TCP writes
        }
        while (Date.now() - t0 < waitMs && !(expect !== null && this.got.length >= expect)) await sleep(2);
        if (this.got.length) this.rtt.push(Date.now() - t0);
        return this.got;
    }
}

(async () => {
    const relay = spawn(process.execPath, [path.join(__dirname, '..', 'tools', 'dxl-bridge.mjs'), '--tcp', String(TCP), '--ws', String(WS)]);
    let relayOut = '';
    relay.stdout.on('data', d => { relayOut += d; });
    relay.stderr.on('data', d => { relayOut += d; });
    await sleep(600);
    check(/브리지 실행 중/.test(relayOut), 'bridge program starts (TCP + WebSocket on 127.0.0.1)');

    const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
    const p = await b.newPage({viewport: {width: 1400, height: 950}});
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL, {waitUntil: 'networkidle'});
    await p.click('#view-sim');
    await p.waitForSelector('.simp .sim-bridge');
    check(await p.$eval('.simp .sim-bridge-dl', a => a.getAttribute('href')) === 'tools/dxl-bridge.mjs', 'the bridge program can be downloaded from the 3D tab');

    // bridge program off → a clear message
    await p.evaluate(() => { window.dynamicmakers.simPanel.bridgeUrl = 'ws://127.0.0.1:19999'; });
    await p.click('.simp button:has-text("CYCLO 연결")');
    await p.waitForFunction(() => /브리지 프로그램이 꺼져/.test(document.querySelector('.simp .sim-bridge-info').textContent), null, {timeout: 60000});
    check(true, 'bridge program not running → "브리지 프로그램이 꺼져 있습니다" shown');

    await p.evaluate(ws => { window.dynamicmakers.simPanel.bridgeUrl = ws; }, `ws://127.0.0.1:${WS}`);
    await p.click('.simp button:has-text("CYCLO 연결")');
    await p.waitForFunction(() => /CYCLO를 기다리는 중/.test(document.querySelector('.simp .sim-bridge-info').textContent), null, {timeout: 60000});
    await sleep(300);
    check(/로봇 연결됨/.test(relayOut), 'the 3D tab connects to the bridge program as the robot');

    // reply time without 3D drawing (on a PC with a graphics card drawing takes a few ms; this test
    // machine draws in software, ~0.5 s a frame): the 3D view is hidden while timing the pings
    await p.click('#view-monitor');
    await sleep(500);
    const sock = net.connect(TCP, '127.0.0.1');
    await new Promise(r => sock.once('connect', r));
    sock.setNoDelay(true);
    const bus = new Bus(sock);
    await sleep(200);

    // scan like CYCLO: unicast ping per ID → model + firmware
    const found = [];
    for (let id = 0; id <= 14; id++) {
        const r = await bus.tx(P2.ping(id), id >= 1 && id <= 12 ? 3000 : 300, 1, 1);
        if (r.length) found.push(`${r[0].id}:${P2.fromLE(r[0].params, 0, 2)}/${r[0].params[2]}`);
    }
    const r200 = await bus.tx(P2.ping(200), 3000, 1, 1);
    const scanRtt = bus.rtt.slice();
    check(found.length === 12 && found.every((f, i) => f === `${i + 1}:1090/46`) && r200.length === 1,
        `ping scan finds the 12 joints as 2XL430-W250 (model 1090, firmware 46) + CM-550 (ID 200): ${found.join(' ')}`);

    // identity registers read as CYCLO's identity check does
    const id1 = await bus.tx(P2.read(3, 0, 14), 3000, 1, 1);
    const reg = id1[0] && id1[0].params;
    check(reg && P2.fromLE(reg, 0, 2) === 1090 && reg[6] === 46 && reg[7] === 3 && reg[8] === 3 && reg[13] === 2,
        `READ 0-13 of ID 3: model ${reg && P2.fromLE(reg, 0, 2)}, firmware ${reg && reg[6]}, ID ${reg && reg[7]}, baud ${reg && reg[8]}, protocol ${reg && reg[13]}`);

    // a packet split across TCP writes and two packets in one write
    const split = await bus.tx(P2.read(5, 132, 4), 3000, 3, 1);
    const two = await bus.tx(Buffer.concat([Buffer.from(P2.ping(1)), Buffer.from(P2.ping(2))]), 3000, 1, 2);
    check(split.length === 1 && split[0].id === 5 && two.length === 2, `stream cut into packets: split → ${split.length} reply, joined → ${two.length} replies`);
    // a corrupted packet is dropped (no reply), the next one works
    const bad = Buffer.from(P2.ping(1));
    bad[bad.length - 1] ^= 0xff;
    const rb = await bus.tx(bad, 600);
    const rok = await bus.tx(P2.ping(1), 3000, 1, 1);
    check(rb.length === 0 && rok.length === 1, 'bad CRC → no reply, then the bus keeps working');

    // SYNC READ present position of all joints, BULK READ two different items
    const sr = await bus.tx(P2.syncRead(132, 4, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), 3000, 1, 12);
    const blk = [1, ...P2.le(132, 2), ...P2.le(4, 2), 2, ...P2.le(146, 2), ...P2.le(1, 2)];
    const br = await bus.tx(P2.buildPacket(0xfe, P2.INST.BULK_READ, blk), 3000, 1, 2);
    check(sr.length === 12 && br.length === 2 && br[1].params.length === 1, `SYNC READ → ${sr.length} replies, BULK READ → ${br.length} replies`);

    // move a joint: torque on (SYNC WRITE), goal for ID 1 (right shoulder) → the 3D arm moves
    const pos0 = P2.fromLE((await bus.tx(P2.read(1, 132, 4), 3000, 1, 1))[0].params, 0, 4);
    await bus.tx(P2.syncWrite(64, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(id => ({id, value: 1}))), 300);
    const wr = await bus.tx(P2.write(1, 116, 2048 + 1024, 4), 3000, 1, 1); // +90°
    await sleep(2500);
    const pos1 = P2.fromLE((await bus.tx(P2.read(1, 132, 4), 3000, 1, 1))[0].params, 0, 4);
    check(wr.length === 1 && wr[0].error === 0 && pos1 - pos0 > 600, `WRITE goal +90° on ID 1 → the 3D joint moves (${pos0} → ${pos1} ticks)`);
    const shown = await p.evaluate(() => document.getElementById('console-lines').textContent);
    check(/\[CYCLO\]/.test(shown), 'what CYCLO does is written in the output window ([CYCLO] …)');

    // EEPROM with torque on → Access Error, like a real motor; changing the ID is refused
    const ee = await bus.tx(P2.write(4, 10, 0, 1), 3000, 1, 1);
    await bus.tx(P2.write(4, 64, 0, 1), 3000, 1, 1);
    await bus.tx(P2.write(3, 64, 0, 1), 3000, 1, 1);
    const idw = await bus.tx(P2.write(4, 7, 20, 1), 3000, 1, 1);
    check(ee[0] && ee[0].error === 7 && idw[0] && idw[0].error === 7, 'EEPROM write with torque on → Access Error; ID change → refused (Access Error)');
    // BULK WRITE: goals for two joints at once
    const bw = [1, ...P2.le(116, 2), ...P2.le(4, 2), ...P2.le(2048, 4), 2, ...P2.le(116, 2), ...P2.le(4, 2), ...P2.le(2048, 4)];
    const bwr = await bus.tx(P2.buildPacket(0xfe, P2.INST.BULK_WRITE, bw), 600);
    const g1 = P2.fromLE((await bus.tx(P2.read(1, 116, 4), 3000, 1, 1))[0].params, 0, 4);
    check(bwr.length === 0 && g1 === 2048, 'BULK WRITE sets goals (no replies, like the real bus)');

    const rt = scanRtt.slice().sort((x, y) => x - y);
    check(rt[rt.length >> 1] < 30, `ping reply time with the 3D view hidden: median ${rt[rt.length >> 1]} ms, slowest ${rt[rt.length - 1]} ms (CYCLO scan waits 30 ms, other commands 100 ms)`);
    await p.click('#view-sim');
    const info = await p.textContent('.simp .sim-bridge-info');
    check(/받은 명령 \d+개/.test(info), `3D tab shows the traffic ("${info}")`);
    sock.destroy();
    await p.click('.simp button:has-text("CYCLO 연결 끊기")');
    await sleep(300);
    check(/로봇 연결이 끊어졌습니다/.test(relayOut), 'disconnect button closes the robot side');
    check(!errs.length, `no page errors ${errs.join(' | ')}`);
    await b.close();
    relay.kill();
    console.log(failed ? `${failed} FAILED` : 'all passed');
    process.exit(failed ? 1 : 0);
})();
