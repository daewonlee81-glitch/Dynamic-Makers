/**
 * The 3D virtual MAX-E1 as a DYNAMIXEL bus for an outside program (Claude Code + CYCLO MCP):
 *
 *   CYCLO ─TCP─ tools/dxl-bridge.mjs ─WebSocket─ here ─ SimTransport(physics) ─ MuJoCo robot
 *
 * Bytes arrive as a stream (packets can be split or joined): they are cut into Protocol 2.0
 * packets (CRC checked, byte stuffing removed) and handed to a SimTransport of its own on the
 * same 3D robot, so the app's own connection is not disturbed. Replies go back as they are.
 */
const P2 = require('../../../scratch-cm550/src/protocol2');
const {SimTransport} = require('../sim-robot');

export const DEFAULT_BRIDGE_URL = 'ws://127.0.0.1:9101';
const INST_NAME = {0x01: 'PING', 0x02: 'READ', 0x03: 'WRITE', 0x08: 'REBOOT', 0x82: 'SYNC READ', 0x83: 'SYNC WRITE',
    0x92: 'BULK READ', 0x93: 'BULK WRITE'};

/** Cuts a byte stream into instruction packets: {id, inst, params} (unstuffed, CRC checked). */
export class PacketCutter {
    constructor (onPacket) {
        this.onPacket = onPacket;
        this.buf = [];
        this.bad = 0;
    }

    push (chunk) {
        for (const b of chunk) this.buf.push(b);
        for (;;) {
            let s = -1;
            for (let i = 0; i + 3 < this.buf.length; i++) {
                if (this.buf[i] === 0xff && this.buf[i + 1] === 0xff && this.buf[i + 2] === 0xfd && this.buf[i + 3] === 0x00) {
                    s = i;
                    break;
                }
            }
            if (s < 0) {
                if (this.buf.length > 3) this.buf = this.buf.slice(-3);
                return;
            }
            if (s > 0) this.buf = this.buf.slice(s); // (Protocol 1.0 pings from a scan are skipped)
            if (this.buf.length < 7) return;
            const len = this.buf[5] | (this.buf[6] << 8);
            if (len < 3 || len > 4096) { // not a packet: look for the next header
                this.buf = this.buf.slice(1);
                continue;
            }
            const total = 7 + len;
            if (this.buf.length < total) return;
            const raw = this.buf.slice(0, total);
            this.buf = this.buf.slice(total);
            if (P2.crc16(raw, total - 2) !== (raw[total - 2] | (raw[total - 1] << 8))) {
                this.bad++;
                continue;
            }
            const body = unstuff(raw.slice(7, total - 2));
            this.onPacket({id: raw[4], inst: body[0], params: body.slice(1)});
        }
    }
}

const unstuff = bytes => {
    const out = [];
    let ff = 0;
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if (ff >= 2 && b === 0xfd && bytes[i + 1] === 0xfd) {
            out.push(0xfd);
            i++;
            ff = 0;
            continue;
        }
        out.push(b);
        ff = b === 0xff ? ff + 1 : 0;
    }
    return out;
};

/** {id, inst, params} → the unstuffed packet SimTransport.write() reads */
const rawPacket = p => {
    const len = p.params.length + 3;
    return Uint8Array.from([0xff, 0xff, 0xfd, 0x00, p.id, len & 0xff, len >> 8, p.inst, ...p.params, 0, 0]);
};

export class DxlBridge {
    /**
     * @param {object} o
     * @param {object} o.physics PhysicsSim of the 3D robot
     * @param {(text: string, kind?: string) => void} o.log output window
     * @param {(state: string) => void} [o.onState] 'connecting' | 'open' | 'closed' | 'error'
     */
    constructor (o) {
        this.o = o;
        this.ws = null;
        this.state = 'closed';
        this.stats = {packets: 0, replies: 0, last: '', bad: 0, since: 0};
        this.tr = new SimTransport(text => o.log(`[CYCLO] ${text}`), {physics: o.physics});
        this.tr.name = '3D 가상 로봇 (CYCLO 브리지)';
        this.tr.replyNow = true;
        this.cutter = new PacketCutter(p => this._packet(p));
        this.tr.onData(pkt => {
            this.stats.replies++;
            if (this.ws && this.ws.readyState === 1) this.ws.send(pkt);
        });
    }

    _set (state) {
        this.state = state;
        if (this.o.onState) this.o.onState(state);
    }

    connect (url = DEFAULT_BRIDGE_URL) {
        this.close();
        this._set('connecting');
        this.tr.open();
        let ws;
        try {
            ws = new WebSocket(url);
        } catch (e) {
            this._set('error');
            return Promise.reject(e);
        }
        ws.binaryType = 'arraybuffer';
        this.ws = ws;
        return new Promise((resolve, reject) => {
            ws.onopen = () => {
                this.stats.since = Date.now();
                this._set('open');
                resolve();
            };
            ws.onerror = () => {
                if (this.state === 'connecting') {
                    this._set('error');
                    reject(new Error(`브리지 프로그램(${url})에 연결할 수 없습니다. 터미널에서 node dxl-bridge.mjs 를 먼저 실행하세요.`));
                }
            };
            ws.onclose = () => {
                if (this.ws === ws) {
                    this.ws = null;
                    if (this.state === 'open') this.o.log('CYCLO 브리지 연결이 끊어졌습니다.', 'warn');
                    if (this.state !== 'error') this._set('closed');
                }
            };
            ws.onmessage = e => this.cutter.push(new Uint8Array(e.data));
        });
    }

    _packet (p) {
        this.stats.packets++;
        this.stats.last = `${INST_NAME[p.inst] || `0x${p.inst.toString(16)}`} ID ${p.id === 0xfe ? '전체' : p.id}`;
        this.stats.bad = this.cutter.bad;
        this.tr.write(rawPacket(p)).catch(() => {});
    }

    close () {
        const ws = this.ws;
        this.ws = null;
        if (ws) ws.close();
        if (this.state !== 'closed') this._set('closed');
    }
}
