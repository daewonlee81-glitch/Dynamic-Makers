/**
 * CM-550 device layer: control-table constants + request/response queue on top
 * of a transport. Packets addressed to ID 200 are answered by the CM-550
 * itself; packets to any other ID are relayed by the controller to the
 * DYNAMIXEL bus (Manage mode), so one link serves both.
 */
const P2 = require('./protocol2');
const {WebSerialTransport, WebBluetoothTransport} = require('./transport');
const {modelInfo, modelName, describeMotors} = require('./models');

const CM550_ID = 200;

/** CM-550 control table (ROBOTIS e-Manual, model number 450). */
const CM = {
    MODEL_NUMBER: {addr: 0, size: 2},
    FIRMWARE_VERSION: {addr: 6, size: 1},
    MODE_NUMBER: {addr: 21, size: 1}, // 0 IDLE, 1 Task Play, 2 Manage, 3 Bootloader, 4 Reboot
    DXL_POWER: {addr: 22, size: 1},
    ERROR_CODE: {addr: 23, size: 2},
    BUTTON_STATUS: {addr: 26, size: 1}, // 0 none, 1 START, 2 MODE, 3 both
    BUTTON_RELEASED: {addr: 28, size: 1},
    BUTTON_PRESSED_MS: {addr: 29, size: 2},
    NUM_DXL: {addr: 39, size: 1},
    SCAN_DXL: {addr: 40, size: 1},
    DXL_TORQUE: {addr: 41, size: 1}, // 1 all off, 2 all on, 3 reboot
    REMOCON_TX: {addr: 59, size: 2},
    REMOCON_RX: {addr: 61, size: 2},
    REMOCON_ARRIVED: {addr: 63, size: 1},
    MOTION_SPEED: {addr: 64, size: 1}, // 20..200 (%)
    MOTION_INDEX: {addr: 66, size: 2}, // page; 65533 stop now, 65534 stop at key frame, 65535 stop at unit end
    MOTION_STATUS: {addr: 68, size: 1},
    MOTION_NEXT_PAGE: {addr: 69, size: 2},
    MOTION_COUNT: {addr: 71, size: 2},
    TIMER_128MS: {addr: 73, size: 1},
    TIMER_1MS: {addr: 74, size: 2},
    RANDOM: {addr: 77, size: 1},
    BUZZER_INDEX: {addr: 84, size: 1},
    BUZZER_TIME: {addr: 85, size: 1}, // 0.1 s units; 255 = melody mode
    SOUND_COUNT: {addr: 86, size: 1},
    SOUND_DETECTING: {addr: 87, size: 1},
    LOW_BATTERY_SOUND: {addr: 88, size: 1},
    VOLTAGE: {addr: 89, size: 1}, // 0.1 V
    TEMPERATURE: {addr: 90, size: 1},
    LED_RED: {addr: 91, size: 1},
    LED_GREEN: {addr: 92, size: 1},
    LED_BLUE: {addr: 93, size: 1},
    ROLL: {addr: 102, size: 2, signed: true}, // 0.01 deg
    PITCH: {addr: 104, size: 2, signed: true},
    YAW: {addr: 106, size: 2, signed: true},
    GYRO_X: {addr: 108, size: 2, signed: true}, // 0.01 deg/s
    GYRO_Y: {addr: 110, size: 2, signed: true},
    GYRO_Z: {addr: 112, size: 2, signed: true},
    ACC_X: {addr: 114, size: 2, signed: true}, // 0.01 G
    ACC_Y: {addr: 116, size: 2, signed: true},
    ACC_Z: {addr: 118, size: 2, signed: true},
    MILLIS: {addr: 124, size: 4, signed: true},
    // ports 1..5 -> 390,392,394,396,398
    MODULE_CATEGORY: {addr: 390, size: 1, stride: 2}
};

/** Peripheral module categories written to MODULE_CATEGORY. */
const MODULE = {
    NONE: 0,
    WHEEL: 1,
    SERVO_POSITION: 2,
    SERVO_SPEED: 3,
    IR: 4,
    DMS: 5,
    TOUCH: 6,
    LED: 7,
    USER: 8,
    TEMPERATURE: 9,
    MAGNET: 11,
    MOTION: 12,
    COLOR: 13,
    MOISTURE: 14,
    MOISTURE_TEMP: 15,
    BRIGHTNESS: 16,
    LED_RED_BRIGHT: 17,
    LED_BLUE_BRIGHT: 18
};

/**
 * Per-port registers: base address for port 1, stride per port, size, allowed ports.
 */
const PORT = {
    WHEEL: {base: 400, stride: 2, size: 2, ports: 2, category: MODULE.WHEEL},
    SERVO_POSITION: {base: 404, stride: 2, size: 2, ports: 2, category: MODULE.SERVO_POSITION},
    SERVO_SPEED: {base: 408, stride: 2, size: 2, ports: 2, category: MODULE.SERVO_SPEED},
    IR: {base: 415, stride: 2, size: 2, ports: 2, category: MODULE.IR},
    DMS: {base: 419, stride: 2, size: 2, ports: 5, category: MODULE.DMS},
    TOUCH: {base: 429, stride: 1, size: 1, ports: 5, category: MODULE.TOUCH},
    LED: {base: 434, stride: 1, size: 1, ports: 5, category: MODULE.LED},
    USER: {base: 439, stride: 2, size: 2, ports: 5, category: MODULE.USER},
    TEMPERATURE: {base: 449, stride: 1, size: 1, ports: 5, category: MODULE.TEMPERATURE, signed: true},
    MAGNET: {base: 459, stride: 1, size: 1, ports: 5, category: MODULE.MAGNET},
    MOTION: {base: 464, stride: 1, size: 1, ports: 5, category: MODULE.MOTION},
    COLOR: {base: 469, stride: 1, size: 1, ports: 5, category: MODULE.COLOR},
    MOISTURE: {base: 474, stride: 1, size: 1, ports: 2, category: MODULE.MOISTURE},
    MOISTURE_TEMP: {base: 479, stride: 1, size: 1, ports: 2, category: MODULE.MOISTURE_TEMP, signed: true},
    BRIGHTNESS: {base: 484, stride: 2, size: 2, ports: 5, category: MODULE.BRIGHTNESS},
    LED_RED_BRIGHT: {base: 494, stride: 1, size: 1, ports: 2, category: MODULE.LED_RED_BRIGHT},
    LED_BLUE_BRIGHT: {base: 499, stride: 1, size: 1, ports: 2, category: MODULE.LED_BLUE_BRIGHT}
};

/** DYNAMIXEL X-series (XL-330, XL-430, 2XL-430, XC-430 ...) control table. */
const DXL = {
    MODEL_NUMBER: {addr: 0, size: 2},
    ID: {addr: 7, size: 1},
    // 1 velocity, 3 position, 4 extended position, 16 PWM (XL-330: 0 current, 5 current-based position)
    OPERATING_MODE: {addr: 11, size: 1},
    MAX_POSITION_LIMIT: {addr: 48, size: 4},
    MIN_POSITION_LIMIT: {addr: 52, size: 4},
    VELOCITY_LIMIT: {addr: 44, size: 4},
    CURRENT_LIMIT: {addr: 38, size: 2}, // current-capable models only
    GOAL_CURRENT: {addr: 102, size: 2, signed: true},
    TORQUE_ENABLE: {addr: 64, size: 1},
    LED: {addr: 65, size: 1},
    HARDWARE_ERROR: {addr: 70, size: 1},
    GOAL_PWM: {addr: 100, size: 2, signed: true},
    GOAL_VELOCITY: {addr: 104, size: 4, signed: true}, // unit 0.229 rpm
    PROFILE_ACCELERATION: {addr: 108, size: 4},
    PROFILE_VELOCITY: {addr: 112, size: 4},
    GOAL_POSITION: {addr: 116, size: 4, signed: true}, // 0..4095 = 360 deg
    MOVING: {addr: 122, size: 1},
    PRESENT_PWM: {addr: 124, size: 2, signed: true},
    PRESENT_LOAD: {addr: 126, size: 2, signed: true}, // 0.1 %
    PRESENT_VELOCITY: {addr: 128, size: 4, signed: true},
    PRESENT_POSITION: {addr: 132, size: 4, signed: true},
    PRESENT_INPUT_VOLTAGE: {addr: 144, size: 2}, // 0.1 V
    PRESENT_TEMPERATURE: {addr: 146, size: 1}
};

const OP_MODE = {CURRENT: 0, VELOCITY: 1, POSITION: 3, EXTENDED_POSITION: 4, CURRENT_POSITION: 5, PWM: 16};
/** 2XL430-W250, 2XC430-W250: two axes, one EEPROM write lock */
const DUAL_AXIS_MODELS = new Set([1090, 1160]);
const MOTION_STOP = {NOW: 65533, KEYFRAME: 65534, UNIT: 65535};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const degToTick = deg => Math.round((deg / 360) * 4096);
const tickToDeg = tick => (tick / 4096) * 360;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class CM550Device {
    constructor () {
        this.transport = null;
        this.parser = new P2.PacketParser(pkt => this._onPacket(pkt));
        this._queue = Promise.resolve();
        this._pending = null; // {id, resolve, reject, timer}
        this._collector = null; // array while a broadcast ping collects replies
        this._rawTap = null; // array capturing raw received bytes (diagnostics)
        this.motors = []; // last scan: [{id, model, firmware}]
        this.motorDesc = describeMotors([]); // labels, dual-axis pairs, warnings
        this.onMotorsChange = null; // callback after a scan
        this._modelCache = {};
        this._scanPromise = null;
        this.lastError = '';
        this.timeoutMs = 200;
        this._categoryCache = {};
        this._velocityLimitCache = {};
        this._modeCache = {};
        this.onStateChange = null;
    }

    get connected () {
        return Boolean(this.transport && this.transport.isOpen);
    }

    get transportName () {
        return this.transport ? this.transport.name : '';
    }

    /**
     * @param {'usb'|'ble'|object} kind - 'usb', 'ble', or a ready-made transport
     *   object (open/close/write/onData/onClose/isOpen/name), e.g. a simulator
     */
    async connect (kind) {
        if (this.connected) await this.disconnect();
        let transport;
        if (kind && typeof kind === 'object') {
            transport = kind;
            this.timeoutMs = 200;
        } else {
            transport = kind === 'ble' ? new WebBluetoothTransport() : new WebSerialTransport();
            this.timeoutMs = kind === 'ble' ? 600 : 200;
        }
        transport.onData(chunk => {
            if (this._rawTap) for (const b of chunk) this._rawTap.push(b); // diagnostics capture
            this.parser.push(chunk);
        });
        transport.onClose(() => {
            this.transport = null;
            this._failPending(new Error('연결이 끊어졌습니다.'));
            this._notify();
        });
        await transport.open();
        this.transport = transport;
        this.parser.reset();
        this._categoryCache = {};
        this._velocityLimitCache = {};
        this._modeCache = {};
        this._modelCache = {};
        this.setMotors([]);
        // Verify we are talking to a CM-550 and put it in Manage mode so that
        // DYNAMIXEL packets are relayed and no task code fights with us.
        try {
            const model = await this.readCM(CM.MODEL_NUMBER);
            if (model !== 450) {
                this.lastError = `알 수 없는 컨트롤러 (모델 번호 ${model})`;
            }
            await this.writeCM(CM.MODE_NUMBER, 2);
        } catch (e) {
            this.lastError = `CM-550 응답 없음: ${e.message}`;
        }
        this._notify();
    }

    async disconnect () {
        const t = this.transport;
        this.transport = null;
        if (t) await t.close();
        this._failPending(new Error('연결 종료'));
        this._notify();
    }

    _notify () {
        if (this.onStateChange) this.onStateChange(this.connected);
    }

    _failPending (err) {
        if (this._pending) {
            clearTimeout(this._pending.timer);
            this._pending.reject(err);
            this._pending = null;
        }
    }

    _onPacket (pkt) {
        if (this._collector) { // broadcast ping in progress: gather every reply
            if (!pkt.error) this._collector.push(pkt);
            return;
        }
        const p = this._pending;
        if (!p) return;
        if (pkt.id !== p.id && p.id !== P2.BROADCAST_ID) return;
        clearTimeout(p.timer);
        this._pending = null;
        if (pkt.error) {
            const name = P2.ERROR_NAMES[pkt.error] || `error ${pkt.error}`;
            this.lastError = `ID ${pkt.id}: ${name}`;
            p.reject(new Error(this.lastError));
        } else {
            p.resolve(pkt);
        }
    }

    /**
     * Send one instruction packet and wait for the status packet. Requests
     * are serialized because the bus is half-duplex.
     * @param {number} id destination id
     * @param {Uint8Array} packet
     * @param {boolean} expectReply
     */
    request (id, packet, expectReply = true) {
        const run = async () => {
            if (!this.connected) throw new Error('CM-550이 연결되어 있지 않습니다.');
            if (!expectReply) {
                await this.transport.write(packet);
                return null;
            }
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    if (this._pending && this._pending.timer === timer) {
                        this._pending = null;
                        this.lastError = `ID ${id}: 응답 시간 초과`;
                        reject(new Error(this.lastError));
                    }
                }, this.timeoutMs);
                this._pending = {id, resolve, reject, timer};
                this.transport.write(packet).catch(err => {
                    clearTimeout(timer);
                    this._pending = null;
                    reject(err);
                });
            });
        };
        const result = this._queue.then(run, run);
        this._queue = result.catch(() => {});
        return result;
    }

    async read (id, address, size, signed = false) {
        const pkt = await this.request(id, P2.read(id, address, size));
        if (pkt.params.length < size) throw new Error(`ID ${id}: 응답 길이 오류`);
        return P2.fromLE(pkt.params, 0, size, signed);
    }

    write (id, address, value, size) {
        return this.request(id, P2.write(id, address, Math.round(value), size));
    }

    /** Read `length` raw bytes starting at `address` (one packet). */
    async readBytes (id, address, length) {
        const pkt = await this.request(id, P2.read(id, address, length));
        if (pkt.params.length < length) throw new Error(`ID ${id}: 응답 길이 오류`);
        return pkt.params.slice(0, length);
    }

    /**
     * Protocol 2.0 broadcast ping: every device on the bus answers.
     * @param {number} [waitMs] how long to collect replies
     * @returns {Promise<Array<{id:number, model:number, firmware:number}>>}
     */
    broadcastPing (waitMs) {
        const wait = waitMs || (this.timeoutMs * 2);
        const run = async () => {
            if (!this.connected) throw new Error('CM-550이 연결되어 있지 않습니다.');
            this._collector = [];
            try {
                await this.transport.write(P2.ping(P2.BROADCAST_ID));
                await delay(wait);
                return this._collector;
            } finally {
                this._collector = null;
            }
        };
        const result = this._queue.then(run, run).then(pkts => {
            const seen = new Map();
            for (const p of pkts) {
                if (!seen.has(p.id)) {
                    seen.set(p.id, {
                        id: p.id,
                        model: p.params.length >= 2 ? P2.fromLE(p.params, 0, 2) : 0,
                        firmware: p.params.length >= 3 ? p.params[2] : 0
                    });
                }
            }
            return Array.from(seen.values()).sort((a, b) => a.id - b.id);
        });
        this._queue = result.catch(() => {});
        return result;
    }

    /**
     * Find every DYNAMIXEL on the bus (broadcast ping, then IDs 1..fallbackMax
     * one by one if nothing answered) and remember their models.
     * Concurrent callers share one scan.
     */
    scanMotors (fallbackMax = 30, onProgress) {
        if (this._scanPromise) return this._scanPromise;
        this._scanPromise = (async () => {
            let found = (await this.broadcastPing()).filter(d => d.id !== CM550_ID);
            if (!found.length) {
                for (let id = 1; id <= fallbackMax; id++) {
                    if (onProgress) onProgress(id, fallbackMax);
                    const info = await this.pingInfo(id);
                    if (info) found.push(info);
                }
            }
            let volts = 0;
            try {
                volts = (await this.readCM(CM.VOLTAGE)) / 10;
            } catch (e) { /* voltage is only used for warnings */ }
            this.setMotors(found, volts);
            return this.motors;
        })();
        const done = () => {
            this._scanPromise = null;
        };
        this._scanPromise.then(done, done);
        return this._scanPromise;
    }

    /** Replace the known motor list (scan, diagnosis) and notify listeners. */
    setMotors (motors, busVolts) {
        this.motors = motors.slice().sort((a, b) => a.id - b.id);
        for (const m of this.motors) this._modelCache[m.id] = m.model;
        this.motorDesc = describeMotors(this.motors, busVolts);
        if (this.onMotorsChange) this.onMotorsChange(this.motors, this.motorDesc);
    }

    /** Model number of `id` (cached; read from the motor once). Rejects unsupported models. */
    async requireModel (id) {
        if (typeof this._modelCache[id] === 'undefined') {
            this._modelCache[id] = await this.readDXL(id, DXL.MODEL_NUMBER);
        }
        const model = this._modelCache[id];
        if (!modelInfo(model)) {
            throw new Error(`다이나믹셀 ${id}: ${modelName(model)} — 이 블록으로 제어할 수 없는 모델입니다.`);
        }
        return model;
    }

    /** Ping one id; resolves {id, model, firmware} or null. */
    async pingInfo (id) {
        try {
            const pkt = await this.ping(id);
            return {
                id,
                model: pkt.params.length >= 2 ? P2.fromLE(pkt.params, 0, 2) : 0,
                firmware: pkt.params.length >= 3 ? pkt.params[2] : 0
            };
        } catch (e) {
            return null;
        }
    }

    readCM (reg, port = 1) {
        const addr = reg.addr + ((port - 1) * (reg.stride || 0));
        return this.read(CM550_ID, addr, reg.size, Boolean(reg.signed));
    }

    writeCM (reg, value, port = 1) {
        const addr = reg.addr + ((port - 1) * (reg.stride || 0));
        return this.write(CM550_ID, addr, value, reg.size);
    }

    readDXL (id, reg) {
        return this.read(id, reg.addr, reg.size, Boolean(reg.signed));
    }

    writeDXL (id, reg, value) {
        return this.write(id, reg.addr, value, reg.size);
    }

    ping (id) {
        return this.request(id, P2.ping(id));
    }

    /**
     * Sync-write the same register on several DYNAMIXELs (no status packet).
     * @param reg
     * @param items
     */
    syncWriteDXL (reg, items) {
        return this.request(P2.BROADCAST_ID, P2.syncWrite(reg.addr, reg.size, items.map(it => ({
            id: it.id, value: Math.round(it.value)
        }))), false);
    }

    // ---- peripheral ports ----------------------------------------------

    async ensurePortCategory (port, category) {
        if (this._categoryCache[port] === category) return;
        await this.writeCM(CM.MODULE_CATEGORY, category, port);
        this._categoryCache[port] = category;
        await delay(50); // let the firmware re-initialise the port
    }

    async readPort (spec, port) {
        port = clamp(Math.round(port), 1, spec.ports);
        await this.ensurePortCategory(port, spec.category);
        const addr = spec.base + ((port - 1) * spec.stride);
        return this.read(CM550_ID, addr, spec.size, Boolean(spec.signed));
    }

    async writePort (spec, port, value) {
        port = clamp(Math.round(port), 1, spec.ports);
        await this.ensurePortCategory(port, spec.category);
        const addr = spec.base + ((port - 1) * spec.stride);
        return this.write(CM550_ID, addr, value, spec.size);
    }

    // ---- DYNAMIXEL helpers ----------------------------------------------

    /**
     * Make sure `id` runs in one of `accepted` operating modes (switching to the
     * first one only when needed) and that its torque is on.
     *
     * Operating Mode lives in EEPROM: it can only be written with torque off,
     * and on dual-axis modules (2XL430 / 2XC430) only when BOTH axes have
     * torque off. The current mode is read first so the common case (already
     * in position mode) never touches EEPROM.
     */
    async ensureMode (id, accepted) {
        const target = accepted[0];
        const info = modelInfo(await this.requireModel(id));
        if ((target === OP_MODE.CURRENT_POSITION || target === OP_MODE.CURRENT) && !info.current) {
            throw new Error(`다이나믹셀 ${id}: ${info.name}은(는) 전류(힘) 제어를 지원하지 않습니다. ` +
                'XL330·XC330·XM430·XH430에서 사용할 수 있습니다.');
        }
        let current = this._modeCache[id];
        if (typeof current === 'undefined') {
            current = await this.readDXL(id, DXL.OPERATING_MODE);
            this._modeCache[id] = current;
        }
        if (accepted.includes(current)) {
            await this.writeDXL(id, DXL.TORQUE_ENABLE, 1);
            return;
        }
        const torque = await this.readDXL(id, DXL.TORQUE_ENABLE);
        if (torque) await this.writeDXL(id, DXL.TORQUE_ENABLE, 0);
        try {
            await this.writeDXL(id, DXL.OPERATING_MODE, target);
        } catch (e) {
            if (!/접근 오류|Access/.test(e.message)) throw e;
            const ok = await this._withSiblingTorqueOff(id,
                () => this.writeDXL(id, DXL.OPERATING_MODE, target));
            if (!ok) {
                throw new Error(`다이나믹셀 ${id}: 모드를 바꿀 수 없습니다. 같은 모듈(2XL430 등)의 다른 축이나 ` +
                    '이 모터의 토크를 끈 뒤 다시 시도하세요.');
            }
        }
        this._modeCache[id] = target;
        await this.writeDXL(id, DXL.TORQUE_ENABLE, 1);
    }

    /** Back-compat name used by blocks: switch to exactly `mode`. */
    setOperatingMode (id, mode) {
        return this.ensureMode(id, [mode]);
    }

    /**
     * Dual-axis modules share one EEPROM lock: temporarily turn off the other
     * axis (ID ± 1 with a dual-axis model number), run fn, restore its torque.
     * @returns {Promise<boolean>} true if fn succeeded
     */
    async _withSiblingTorqueOff (id, fn) {
        const known = this.motorDesc.axis[id];
        const candidates = known ? [known.sibling] : [id + 1, id - 1];
        for (const n of candidates) {
            if (n < 0 || n > 252) continue;
            let model;
            try {
                model = await this.readDXL(n, DXL.MODEL_NUMBER);
            } catch (e) {
                continue; // no device with that id
            }
            if (!DUAL_AXIS_MODELS.has(model)) continue;
            const t = await this.readDXL(n, DXL.TORQUE_ENABLE);
            if (t) await this.writeDXL(n, DXL.TORQUE_ENABLE, 0);
            try {
                await fn();
                return true;
            } catch (e) {
                // not the sibling (or still locked): try the other neighbour
            } finally {
                if (t) await this.writeDXL(n, DXL.TORQUE_ENABLE, 1);
            }
        }
        return false;
    }

    async getVelocityLimit (id) {
        if (!this._velocityLimitCache[id]) {
            this._velocityLimitCache[id] = await this.readDXL(id, DXL.VELOCITY_LIMIT);
        }
        return this._velocityLimitCache[id];
    }

    /**
     * Move to an absolute angle (0..360 in position mode, any value in
     * extended position mode) with a speed percentage of the velocity limit.
     * @param id
     * @param degrees
     * @param speedPercent
     */
    async moveTo (id, degrees, speedPercent) {
        await this.ensureMode(id, [OP_MODE.POSITION, OP_MODE.EXTENDED_POSITION]);
        if (typeof speedPercent === 'number' && !Number.isNaN(speedPercent)) {
            const limit = await this.getVelocityLimit(id);
            const pv = Math.round(limit * clamp(speedPercent, 0, 100) / 100);
            await this.writeDXL(id, DXL.PROFILE_VELOCITY, pv);
        }
        await this.writeDXL(id, DXL.GOAL_POSITION, degToTick(degrees));
    }

    /**
     * Current-based position (grippers): move toward `degrees` but push with at
     * most `forcePercent` of the motor's Current Limit. XL330/XC330/XM/XH only.
     */
    async grip (id, degrees, forcePercent) {
        await this.ensureMode(id, [OP_MODE.CURRENT_POSITION]);
        const limit = await this.readDXL(id, DXL.CURRENT_LIMIT);
        await this.writeDXL(id, DXL.GOAL_CURRENT, Math.round(limit * clamp(forcePercent, 0, 100) / 100));
        await this.writeDXL(id, DXL.GOAL_POSITION, degToTick(degrees));
    }

    async setWheelSpeed (id, percent) {
        await this.setOperatingMode(id, OP_MODE.VELOCITY);
        const limit = await this.getVelocityLimit(id);
        const v = Math.round(limit * clamp(percent, -100, 100) / 100);
        await this.writeDXL(id, DXL.GOAL_VELOCITY, v);
    }

    async waitUntilStopped (id, timeoutMs = 10000) {
        const start = Date.now();
        await delay(30);
        while (Date.now() - start < timeoutMs) {
            const moving = await this.readDXL(id, DXL.MOVING);
            if (!moving) return;
            await delay(30);
        }
    }

    // ---- motion ----------------------------------------------------------

    playMotion (page) {
        return this.writeCM(CM.MOTION_INDEX, clamp(Math.round(page), 1, 65532));
    }

    stopMotion (how = MOTION_STOP.UNIT) {
        return this.writeCM(CM.MOTION_INDEX, how);
    }

    async waitMotionDone (timeoutMs = 60000) {
        const start = Date.now();
        await delay(100);
        while (Date.now() - start < timeoutMs) {
            const playing = await this.readCM(CM.MOTION_STATUS);
            if (!playing) return;
            await delay(50);
        }
    }

    // ---- buzzer ----------------------------------------------------------

    async playNote (index, seconds) {
        await this.writeCM(CM.BUZZER_INDEX, clamp(Math.round(index), 0, 51));
        await this.writeCM(CM.BUZZER_TIME, clamp(Math.round(seconds * 10), 1, 50));
    }

    async playMelody (index) {
        await this.writeCM(CM.BUZZER_INDEX, clamp(Math.round(index), 0, 25));
        await this.writeCM(CM.BUZZER_TIME, 255);
    }
}

module.exports = {
    CM550Device,
    CM550_ID,
    CM,
    MODULE,
    PORT,
    DXL,
    OP_MODE,
    MOTION_STOP,
    degToTick,
    tickToDeg,
    clamp,
    delay
};
