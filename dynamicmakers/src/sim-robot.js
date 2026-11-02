/**
 * 가상 로봇 — a simulated CM-550 + 4 DYNAMIXEL IDs that speaks Protocol 2.0
 * through the same transport interface as USB/BLE. Lets students run
 * programs without hardware (and lets the sandboxed web preview, which
 * cannot reach USB/Bluetooth, show what the robot would do).
 *
 * Every state change is reported to `onAction(text)` in plain Korean.
 */
const P2 = require('../../scratch-cm550/src/protocol2');

const CM_ID = 200;
// test hook: window.__dmSimModels = {1: 1200, ...} replaces the motor set
// ENGINEER-kit style: two XL430-W250 + one 2XL430-W250 (two IDs)
const DEFAULT_MODELS = {1: 1060, 2: 1060, 3: 1090, 4: 1090};
const CURRENT_MODELS = new Set([1190, 1200, 1210, 1220, 1230, 1240, 1000, 1010, 1040, 1050, 1020, 1030]);
const VELOCITY_LIMIT = 265; // 0.229 rpm units

// register start address -> size, so block reads can be assembled byte by byte
const CM_SIZES = {0: 2, 6: 1, 12: 1, 20: 1, 21: 1, 22: 1, 23: 2, 26: 1, 39: 1, 40: 1, 64: 1, 66: 2, 68: 1, 69: 2, 71: 2, 84: 1, 85: 1,
    86: 1, 87: 1, 89: 1, 90: 1, 91: 1, 92: 1, 93: 1, 102: 2, 104: 2, 106: 2, 108: 2, 110: 2, 112: 2, 114: 2, 116: 2,
    118: 2, 124: 4};
const DXL_SIZES = {0: 2, 6: 1, 7: 1, 11: 1, 38: 2, 44: 4, 64: 1, 65: 1, 70: 1, 100: 2, 104: 4, 108: 4, 112: 4, 116: 4,
    102: 2, 122: 1, 124: 2, 126: 2, 128: 4, 132: 4, 144: 2, 146: 1};

// test hook: window.__dmSimFault = 'lowvolt' | 'nopower' | 'relay' simulates field problems
const fault = () => (typeof window !== 'undefined' && window.__dmSimFault) || '';

const tickToDeg = t => Math.round((t / 4096) * 3600) / 10;
const onOff = v => (v ? '켜기' : '끄기');
const signed = (v, size) => (v >= 2 ** ((size * 8) - 1) ? v - (2 ** (size * 8)) : v);

class SimTransport {
    constructor (onAction) {
        this.onAction = onAction || (() => {});
        this._data = null;
        this._close = null;
        this.isOpen = false;
        this.name = '가상 로봇';
        this.regs = new Map();
        this.last = new Map(); // key -> last value logged (only report changes)
        this.moves = new Map(); // dxl id -> {from, to, start, end}
        this.motionUntil = 0;
        this.t0 = Date.now();
        this.models = (typeof window !== 'undefined' && window.__dmSimModels) || DEFAULT_MODELS;
        this.ids = Object.keys(this.models).map(Number);
        const set = (id, addr, v) => this.regs.set(`${id}:${addr}`, v);
        set(CM_ID, 0, 450);
        set(CM_ID, 6, 47);
        set(CM_ID, 12, 3); // DXL baud 1M
        set(CM_ID, 20, 2); // bypass: USB
        set(CM_ID, 21, 2);
        set(CM_ID, 22, fault() === 'nopower' ? 0 : 1);
        set(CM_ID, 71, 12); // stored motion pages
        set(CM_ID, 89, fault() === 'lowvolt' ? 50 : 120); // 12.0 V (5.0 V = USB power only)
        set(CM_ID, 90, 28);
        for (const id of this.ids) {
            set(id, 0, this.models[id]);
            if (CURRENT_MODELS.has(this.models[id])) set(id, 38, 1750);
            set(id, 11, 3);
            set(id, 44, VELOCITY_LIMIT);
            set(id, 132, 2048);
            set(id, 116, 2048);
            set(id, 144, 120);
            set(id, 146, 30 + id);
        }
    }

    onData (cb) { this._data = cb; }
    onClose (cb) { this._close = cb; }

    open () {
        this.isOpen = true;
        return Promise.resolve();
    }

    close () {
        const was = this.isOpen;
        this.isOpen = false;
        if (was && this._close) this._close();
        return Promise.resolve();
    }

    _reply (id, params = [], error = 0) {
        const pkt = P2.buildPacket(id, P2.INST.STATUS, [error, ...params]);
        setTimeout(() => {
            if (this.isOpen && this._data) this._data(pkt);
        }, 2);
    }

    /** Whether DYNAMIXEL packets get through to the motors and back. */
    _busAlive () {
        return this.regs.get(`${CM_ID}:22`) === 1 && fault() !== 'lowvolt';
    }

    _report (key, value, text) {
        if (this.last.get(key) === value) return;
        this.last.set(key, value);
        this.onAction(text);
    }

    /** Live values for sensors and moving joints. */
    _read (id, addr, size) {
        const now = Date.now();
        const t = (now - this.t0) / 1000;
        if (this.ids.includes(id)) {
            const mv = this.moves.get(id);
            if (addr === 122) return mv && now < mv.end ? 1 : 0; // MOVING
            if (addr === 132 && mv) { // PRESENT_POSITION interpolated
                const k = Math.min(1, (now - mv.start) / Math.max(1, mv.end - mv.start));
                return Math.round(mv.from + ((mv.to - mv.from) * k));
            }
            if (addr === 128) { // PRESENT_VELOCITY follows goal velocity in wheel mode
                return this.regs.get(`${id}:104`) || 0;
            }
        }
        if (id === CM_ID) {
            if (addr === 68) return now < this.motionUntil ? 1 : 0; // motion playing
            if (addr === 102) return Math.round(Math.sin(t / 3) * 300); // roll ±3°
            if (addr === 104) return Math.round(Math.cos(t / 4) * 200);
            if (addr === 124) return now - this.t0;
            if (addr >= 415 && addr <= 427) return 300 + Math.round(200 * (1 + Math.sin(t)) / 2); // IR / DMS
            if (addr >= 484 && addr <= 492) return 600 + Math.round(100 * Math.sin(t / 2)); // brightness
            if (addr >= 469 && addr <= 473) return 1 + (Math.floor(t / 2) % 6); // colour 1..6
            if (addr >= 449 && addr <= 453) return 24;
        }
        const v = this.regs.get(`${id}:${addr}`) || 0;
        return size ? v : v;
    }

    /**
     * EEPROM is writable only with torque off; dual-axis modules (2XL430)
     * additionally need the other axis' torque off.
     */
    _eepromLocked (id) {
        if (this.regs.get(`${id}:64`)) return true;
        if (this.models[id] === 1090 || this.models[id] === 1160) {
            const sib = id % 2 ? id + 1 : id - 1;
            if (this.models[sib] === this.models[id] && this.regs.get(`${sib}:64`)) return true;
        }
        return false;
    }

    /** Assemble `len` bytes starting at addr from the register map. */
    _readBlock (id, addr, len) {
        const sizes = id === CM_ID ? CM_SIZES : DXL_SIZES;
        if (!sizes[addr] && len <= 4) return P2.le(this._read(id, addr, len), len); // ports etc.
        const out = new Array(len).fill(0);
        for (let a = addr; a < addr + len; a++) {
            const size = sizes[a];
            if (!size) continue;
            const bytes = P2.le(this._read(id, a, size), size);
            for (let i = 0; i < size && (a - addr + i) < len; i++) out[a - addr + i] = bytes[i];
        }
        return out;
    }

    _write (id, addr, value, size) {
        const prev = this.regs.get(`${id}:${addr}`);
        this.regs.set(`${id}:${addr}`, value);
        if (id === CM_ID) this._describeController(addr, value);
        else this._describeDxl(id, addr, value, size, prev);
    }

    _describeController (addr, v) {
        const leds = {91: '빨강', 92: '초록', 93: '파랑'};
        if (leds[addr]) {
            // report the mixed colour once all three elements have been written
            const rgbNow = () => [91, 92, 93].map(a => (this.regs.get(`${CM_ID}:${a}`) ? 1 : 0)).join('');
            const names = {100: '빨강', '010': '초록', '001': '파랑', 110: '노랑', '011': '하늘',
                101: '보라', 111: '흰색', '000': '꺼짐'};
            clearTimeout(this._ledTimer); // the colour block writes 91-93 back to back
            this._ledTimer = setTimeout(() => {
                const rgb = rgbNow();
                this._report('cmled', rgb, `CM-550 LED: ${names[rgb] || rgb}`);
            }, 40);
            return;
        }
        if (addr === 85) {
            const idx = this.regs.get(`${CM_ID}:84`) || 0;
            this.last.delete('buzzer');
            if (v === 255) return this._report('buzzer', `m${idx}`, `부저: 멜로디 ${idx}번`);
            return this._report('buzzer', `n${idx}`, `부저: ${idx}번 음 ${(v / 10).toFixed(1)}초`);
        }
        if (addr === 66) {
            if (v >= 65533) {
                const wasPlaying = Date.now() < this.motionUntil;
                this.motionUntil = 0;
                this.last.delete('motion');
                return wasPlaying ? this.onAction('모션 정지') : undefined;
            }
            if (v === 0) return undefined;
            this.motionUntil = Date.now() + 1500;
            this.last.delete('motion');
            return this._report('motion', v, `모션 ${v}번 재생 (1.5초)`);
        }
        if (addr === 64) return this._report('mspeed', v, `모션 속도 ${v}%`);
        if (addr === 22) return this._report('dxlpower', v, `다이나믹셀 전원 ${onOff(v)}`);
        if (addr === 41) {
            if (v === 1 || v === 2) {
                for (const id of this.ids) this.regs.set(`${id}:64`, v === 2 ? 1 : 0);
                this.onAction(`모든 다이나믹셀 토크 ${v === 2 ? '켜기' : '끄기'}`);
            }
            return undefined;
        }
        if (addr >= 400 && addr <= 402) {
            const port = ((addr - 400) / 2) + 1;
            const pct = v >= 1024 ? Math.round(((v - 1024) / 1023) * 100) : -Math.round((v / 1023) * 100);
            return this._report(`wheel${port}`, v, `포트 ${port} 기어모터 ${pct}%`);
        }
        if (addr >= 404 && addr <= 406) {
            const port = ((addr - 404) / 2) + 1;
            return this._report(`servo${port}`, v, `포트 ${port} 서보 → ${Math.round((v / 1023) * 300)}°`);
        }
        if (addr >= 434 && addr <= 438) {
            const states = ['모두 끄기', '오른쪽만', '왼쪽만', '모두 켜기'];
            return this._report(`ledmod${addr}`, v, `포트 ${addr - 433} LED 모듈 ${states[v] || v}`);
        }
        if (addr === 86 && v === 0) return this.onAction('소리 감지 횟수 초기화');
        if (addr === 40 && v === 1) { // controller's own DXL scan
            setTimeout(() => {
                this.regs.set(`${CM_ID}:39`, this._busAlive() ? this.ids.length : 0);
                this.regs.set(`${CM_ID}:40`, 0);
            }, 300);
        }
        return undefined; // mode, port category, etc.: internal
    }

    _describeDxl (id, addr, v, size, prev) {
        if (addr === 64) return this._report(`t${id}`, v, `다이나믹셀 ${id} 토크 ${onOff(v)}`);
        if (addr === 65) return this._report(`l${id}`, v, `다이나믹셀 ${id} LED ${onOff(v)}`);
        if (addr === 11) {
            const names = {0: '전류', 1: '바퀴(속도)', 3: '위치(관절)', 4: '확장 위치', 5: '전류 기반 위치(잡기)', 16: 'PWM'};
            if ((v === 0 || v === 5) && !CURRENT_MODELS.has(this.models[id])) return undefined;
            return this._report(`m${id}`, v, `다이나믹셀 ${id} 모드 → ${names[v] || v}`);
        }
        if (addr === 116) {
            const to = signed(v, 4);
            const from = this._read(id, 132);
            const pv = this.regs.get(`${id}:112`) || 0; // profile velocity (0 = max)
            const rpm = (pv || VELOCITY_LIMIT) * 0.229;
            const ms = Math.min(4000, Math.max(150, (Math.abs(to - from) / 4096) * (60000 / rpm)));
            this.moves.set(id, {from, to, start: Date.now(), end: Date.now() + ms});
            this.regs.set(`${id}:132`, to);
            this.last.delete(`p${id}`);
            return this._report(`p${id}`, to, `다이나믹셀 ${id} → ${tickToDeg(to)}°`);
        }
        if (addr === 102) {
            const limit = this.regs.get(`${id}:38`) || 1;
            return this._report(`c${id}`, v, `다이나믹셀 ${id} 잡는 힘 ${Math.round((signed(v, 2) / limit) * 100)}%`);
        }
        if (addr === 104) {
            const vel = signed(v, 4);
            const pct = Math.round((vel / VELOCITY_LIMIT) * 100);
            return this._report(`v${id}`, vel, vel === 0 ? `다이나믹셀 ${id} 바퀴 정지` : `다이나믹셀 ${id} 바퀴 ${pct}%`);
        }
        return prev; // profile velocity etc.: internal
    }

    write (bytes) {
        if (!this.isOpen) return Promise.reject(new Error('가상 로봇이 연결되어 있지 않습니다.'));
        const b = Array.from(bytes);
        if (b[0] !== 0xff || b[1] !== 0xff || b[2] !== 0xfd) return Promise.resolve();
        const id = b[4];
        const len = b[5] | (b[6] << 8);
        const inst = b[7];
        const params = b.slice(8, 8 + len - 3);
        // motors answer only when powered and the controller relays their replies
        const relays = this._busAlive() && fault() !== 'relay';
        const exists = i => i === CM_ID || (this.ids.includes(i) && relays);

        if (inst === P2.INST.PING) {
            const pong = i => this._reply(i, P2.le(this.regs.get(`${i}:0`) || 0, 2).concat([i === CM_ID ? 47 : 46]));
            if (id === P2.BROADCAST_ID) [CM_ID, ...this.ids].filter(exists).forEach(pong);
            else if (exists(id)) pong(id);
        } else if (inst === P2.INST.READ) {
            if (!exists(id)) return Promise.resolve();
            const addr = P2.fromLE(params, 0, 2);
            const size = P2.fromLE(params, 2, 2);
            this._reply(id, this._readBlock(id, addr, size));
        } else if (inst === P2.INST.WRITE) {
            if (!exists(id)) return Promise.resolve();
            const addr = P2.fromLE(params, 0, 2);
            const size = params.length - 2;
            if (id !== CM_ID && addr < 64 && this._eepromLocked(id)) {
                this._reply(id, [], 0x07); // Access Error, like the real motors
                return Promise.resolve();
            }
            this._write(id, addr, P2.fromLE(params, 2, size), size);
            this._reply(id);
        } else if (inst === P2.INST.SYNC_WRITE) {
            const addr = P2.fromLE(params, 0, 2);
            const size = P2.fromLE(params, 2, 2);
            for (let i = 4; i + size < params.length + 1; i += 1 + size) {
                const did = params[i];
                if (this.ids.includes(did)) this._write(did, addr, P2.fromLE(params, i + 1, size), size);
            }
        }
        return Promise.resolve();
    }
}

module.exports = {SimTransport};
