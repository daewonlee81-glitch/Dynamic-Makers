// CM-550 + DYNAMIXEL Scratch extension (TurboWarp unsandboxed). Built 2026-11-05T03:42Z
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/protocol2.js
  var require_protocol2 = __commonJS({
    "src/protocol2.js"(exports, module) {
      var INST = {
        PING: 1,
        READ: 2,
        WRITE: 3,
        REG_WRITE: 4,
        ACTION: 5,
        FACTORY_RESET: 6,
        REBOOT: 8,
        CLEAR: 16,
        STATUS: 85,
        SYNC_READ: 130,
        SYNC_WRITE: 131,
        BULK_READ: 146,
        BULK_WRITE: 147
      };
      var BROADCAST_ID = 254;
      var CRC_TABLE = (() => {
        const table = new Uint16Array(256);
        for (let i = 0; i < 256; i++) {
          let c = i << 8;
          for (let j = 0; j < 8; j++) {
            c = c & 32768 ? c << 1 ^ 32773 : c << 1;
            c &= 65535;
          }
          table[i] = c;
        }
        return table;
      })();
      var crc16 = (bytes, length = bytes.length) => {
        let crc = 0;
        for (let i = 0; i < length; i++) {
          const idx = (crc >> 8 ^ bytes[i]) & 255;
          crc = (crc << 8 ^ CRC_TABLE[idx]) & 65535;
        }
        return crc;
      };
      var stuff = (bytes) => {
        const out = [];
        let ff = 0;
        for (const b of bytes) {
          out.push(b);
          if (ff >= 2 && b === 253) {
            out.push(253);
            ff = 0;
          } else if (b === 255) {
            ff++;
          } else {
            ff = 0;
          }
        }
        return out;
      };
      var unstuff = (bytes) => {
        const out = [];
        let ff = 0;
        for (let i = 0; i < bytes.length; i++) {
          const b = bytes[i];
          if (ff >= 2 && b === 253 && bytes[i + 1] === 253) {
            out.push(253);
            i++;
            ff = 0;
            continue;
          }
          out.push(b);
          ff = b === 255 ? ff + 1 : 0;
        }
        return out;
      };
      var buildPacket = (id, instruction, params = []) => {
        const body = stuff([instruction, ...params]);
        const length = body.length + 2;
        const pkt = [255, 255, 253, 0, id & 255, length & 255, length >> 8 & 255, ...body];
        const crc = crc16(pkt);
        pkt.push(crc & 255, crc >> 8 & 255);
        return Uint8Array.from(pkt);
      };
      var le = (value, size) => {
        const v = value < 0 ? value + 2 ** (size * 8) : value;
        const out = [];
        for (let i = 0; i < size; i++) out.push(v >>> 8 * i & 255);
        return out;
      };
      var fromLE = (bytes, offset, size, signed = false) => {
        let v = 0;
        for (let i = 0; i < size; i++) v += bytes[offset + i] * 2 ** (8 * i);
        if (signed && v >= 2 ** (size * 8 - 1)) v -= 2 ** (size * 8);
        return v;
      };
      var ping = (id) => buildPacket(id, INST.PING);
      var read = (id, address, size) => buildPacket(id, INST.READ, [...le(address, 2), ...le(size, 2)]);
      var write = (id, address, value, size) => buildPacket(id, INST.WRITE, [...le(address, 2), ...le(value, size)]);
      var writeBytes = (id, address, bytes) => buildPacket(id, INST.WRITE, [...le(address, 2), ...bytes]);
      var reboot = (id) => buildPacket(id, INST.REBOOT);
      var syncWrite = (address, size, items) => {
        const params = [...le(address, 2), ...le(size, 2)];
        for (const it of items) params.push(it.id & 255, ...le(it.value, size));
        return buildPacket(BROADCAST_ID, INST.SYNC_WRITE, params);
      };
      var syncRead = (address, size, ids) => buildPacket(BROADCAST_ID, INST.SYNC_READ, [...le(address, 2), ...le(size, 2), ...ids.map((i) => i & 255)]);
      var ERROR_NAMES = {
        1: "처리 실패 (Result Fail)",
        2: "알 수 없는 명령 (Instruction Error)",
        3: "통신 오류 (CRC Error)",
        4: "값이 범위를 벗어남 (Data Range Error)",
        5: "데이터 길이 오류 (Data Length Error)",
        6: "값이 제한을 넘음 (Data Limit Error)",
        7: "접근 오류 — 토크가 켜져 있어 설정을 바꿀 수 없거나 읽기 전용 (Access Error)"
      };
      var PacketParser = class {
        constructor(onPacket) {
          this.onPacket = onPacket;
          this.buf = [];
        }
        reset() {
          this.buf = [];
        }
        push(chunk) {
          for (const b of chunk) this.buf.push(b);
          this._drain();
        }
        _drain() {
          for (; ; ) {
            let start = -1;
            for (let i = 0; i + 3 < this.buf.length; i++) {
              if (this.buf[i] === 255 && this.buf[i + 1] === 255 && this.buf[i + 2] === 253 && this.buf[i + 3] === 0) {
                start = i;
                break;
              }
            }
            if (start < 0) {
              if (this.buf.length > 3) this.buf = this.buf.slice(-3);
              return;
            }
            if (start > 0) this.buf = this.buf.slice(start);
            if (this.buf.length < 7) return;
            const length = this.buf[5] | this.buf[6] << 8;
            const total = 7 + length;
            if (this.buf.length < total) return;
            const raw = this.buf.slice(0, total);
            this.buf = this.buf.slice(total);
            const crc = raw[total - 2] | raw[total - 1] << 8;
            if (crc16(raw, total - 2) !== crc) {
              continue;
            }
            const body = unstuff(raw.slice(7, total - 2));
            const packet = {
              id: raw[4],
              instruction: body[0],
              error: body.length > 1 ? body[1] & 127 : 0,
              alert: body.length > 1 ? Boolean(body[1] & 128) : false,
              params: body.slice(2)
            };
            this.onPacket(packet);
          }
        }
      };
      module.exports = {
        INST,
        BROADCAST_ID,
        ERROR_NAMES,
        crc16,
        buildPacket,
        le,
        fromLE,
        ping,
        read,
        write,
        writeBytes,
        reboot,
        syncWrite,
        syncRead,
        PacketParser
      };
    }
  });

  // src/transport.js
  var require_transport = __commonJS({
    "src/transport.js"(exports, module) {
      var CM550_USB_FILTERS = [
        { usbVendorId: 1155 },
        // STMicroelectronics (CM-550 MCU: STM32F4 CDC)
        { usbVendorId: 5840 }
        // ROBOTIS (OpenCM / LN-101 family)
      ];
      var WebSerialTransport = class _WebSerialTransport {
        constructor(options = {}) {
          this.baudRate = options.baudRate || 1e6;
          this.port = null;
          this.reader = null;
          this.writer = null;
          this._dataCb = null;
          this._closeCb = null;
          this._readLoop = null;
        }
        static get available() {
          return typeof navigator !== "undefined" && Boolean(navigator.serial);
        }
        get isOpen() {
          return Boolean(this.port && this.writer);
        }
        get name() {
          return "USB";
        }
        onData(cb) {
          this._dataCb = cb;
        }
        onClose(cb) {
          this._closeCb = cb;
        }
        async open() {
          if (!_WebSerialTransport.available) {
            throw new Error("이 브라우저는 Web Serial을 지원하지 않습니다. Chrome 또는 Edge를 사용하세요.");
          }
          let port;
          try {
            port = await navigator.serial.requestPort({ filters: CM550_USB_FILTERS });
          } catch (e) {
            if (e && e.name === "NotFoundError") {
              port = await navigator.serial.requestPort();
            } else {
              throw e;
            }
          }
          await port.open({ baudRate: this.baudRate, bufferSize: 4096 });
          this.port = port;
          this.writer = port.writable.getWriter();
          this._readLoop = this._startReadLoop();
        }
        async _startReadLoop() {
          while (this.port && this.port.readable) {
            this.reader = this.port.readable.getReader();
            try {
              for (; ; ) {
                const { value, done } = await this.reader.read();
                if (done) break;
                if (value && this._dataCb) this._dataCb(value);
              }
            } catch (e) {
              break;
            } finally {
              try {
                this.reader.releaseLock();
              } catch (e) {
              }
              this.reader = null;
            }
          }
          await this._teardown();
        }
        async write(bytes) {
          if (!this.writer) throw new Error("USB가 연결되어 있지 않습니다.");
          await this.writer.write(bytes);
        }
        async close() {
          if (this.reader) {
            try {
              await this.reader.cancel();
            } catch (e) {
            }
          }
          await this._teardown();
        }
        async _teardown() {
          const wasOpen = this.isOpen;
          if (this.writer) {
            try {
              this.writer.releaseLock();
            } catch (e) {
            }
            this.writer = null;
          }
          if (this.port) {
            try {
              await this.port.close();
            } catch (e) {
            }
            this.port = null;
          }
          if (wasOpen && this._closeCb) this._closeCb();
        }
      };
      var BLE_PROFILES = [
        { service: "0000fff0-0000-1000-8000-00805f9b34fb" },
        // BT-410 / common BLE-UART modules
        { service: "0000ffe0-0000-1000-8000-00805f9b34fb" },
        // HM-10 style
        { service: "6e400001-b5a3-f393-e0a9-e50e24dcca9e" }
        // Nordic UART Service
      ];
      var BLE_CHUNK = 20;
      var WebBluetoothTransport = class _WebBluetoothTransport {
        constructor(options = {}) {
          this.namePrefix = options.namePrefix;
          this.device = null;
          this.server = null;
          this.txChar = null;
          this.rxChar = null;
          this._dataCb = null;
          this._closeCb = null;
          this._onDisconnected = this._onDisconnected.bind(this);
          this._onNotify = this._onNotify.bind(this);
          this._writeQueue = Promise.resolve();
        }
        static get available() {
          return typeof navigator !== "undefined" && Boolean(navigator.bluetooth);
        }
        get isOpen() {
          return Boolean(this.server && this.server.connected && this.txChar);
        }
        get name() {
          return "BLE";
        }
        onData(cb) {
          this._dataCb = cb;
        }
        onClose(cb) {
          this._closeCb = cb;
        }
        async open() {
          if (!_WebBluetoothTransport.available) {
            throw new Error("이 브라우저는 Web Bluetooth를 지원하지 않습니다. Chrome 또는 Edge를 사용하세요.");
          }
          const optionalServices = BLE_PROFILES.map((p) => p.service);
          const request = this.namePrefix ? { filters: [{ namePrefix: this.namePrefix }], optionalServices } : { acceptAllDevices: true, optionalServices };
          const device = await navigator.bluetooth.requestDevice(request);
          device.addEventListener("gattserverdisconnected", this._onDisconnected);
          const server = await device.gatt.connect();
          let found = null;
          for (const profile of BLE_PROFILES) {
            try {
              const service = await server.getPrimaryService(profile.service);
              const chars = await service.getCharacteristics();
              const tx = chars.find((c) => c.properties.writeWithoutResponse || c.properties.write);
              const rx = chars.find((c) => c.properties.notify || c.properties.indicate);
              if (tx && rx) {
                found = { tx, rx };
                break;
              }
            } catch (e) {
            }
          }
          if (!found) {
            try {
              server.disconnect();
            } catch (e) {
            }
            throw new Error("BLE 시리얼 서비스를 찾을 수 없습니다. CM-550의 MODE 버튼으로 블루투스 모드(초록 LED 점멸)를 켜 주세요.");
          }
          this.device = device;
          this.server = server;
          this.txChar = found.tx;
          this.rxChar = found.rx;
          await this.rxChar.startNotifications();
          this.rxChar.addEventListener("characteristicvaluechanged", this._onNotify);
        }
        _onNotify(event) {
          const dv = event.target.value;
          if (dv && this._dataCb) {
            this._dataCb(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength));
          }
        }
        _onDisconnected() {
          const wasOpen = Boolean(this.txChar);
          this.txChar = null;
          this.rxChar = null;
          this.server = null;
          if (wasOpen && this._closeCb) this._closeCb();
        }
        write(bytes) {
          if (!this.isOpen) return Promise.reject(new Error("블루투스가 연결되어 있지 않습니다."));
          this._writeQueue = this._writeQueue.then(async () => {
            for (let i = 0; i < bytes.length; i += BLE_CHUNK) {
              const chunk = bytes.subarray(i, Math.min(i + BLE_CHUNK, bytes.length));
              if (this.txChar.properties.writeWithoutResponse) {
                await this.txChar.writeValueWithoutResponse(chunk);
              } else {
                await this.txChar.writeValueWithResponse(chunk);
              }
            }
          }).catch(() => {
          });
          return this._writeQueue;
        }
        async close() {
          if (this.rxChar) {
            try {
              this.rxChar.removeEventListener("characteristicvaluechanged", this._onNotify);
            } catch (e) {
            }
            try {
              await this.rxChar.stopNotifications();
            } catch (e) {
            }
          }
          if (this.device) {
            this.device.removeEventListener("gattserverdisconnected", this._onDisconnected);
            if (this.device.gatt.connected) this.device.gatt.disconnect();
          }
          this._onDisconnected();
          this.device = null;
        }
      };
      module.exports = { WebSerialTransport, WebBluetoothTransport, BLE_PROFILES, CM550_USB_FILTERS };
    }
  });

  // src/models.js
  var require_models = __commonJS({
    "src/models.js"(exports, module) {
      var MODELS = {
        1060: { name: "XL430-W250", short: "XL430", family: "xl430", volts: [6.5, 12] },
        1090: { name: "2XL430-W250", short: "2XL430", family: "xl430", dual: true, volts: [6.5, 12] },
        1070: { name: "XC430-W150", short: "XC430", family: "xc430", volts: [6.5, 14.8] },
        1080: { name: "XC430-W240", short: "XC430", family: "xc430", volts: [6.5, 14.8] },
        1160: { name: "2XC430-W250", short: "2XC430", family: "xc430", dual: true, volts: [6.5, 12] },
        1190: { name: "XL330-M077", short: "XL330-M077", family: "xl330", current: true, volts: [3.7, 6] },
        1200: { name: "XL330-M288", short: "XL330-M288", family: "xl330", current: true, volts: [3.7, 6] },
        1210: { name: "XC330-T181", short: "XC330", family: "xc330", current: true, volts: [10, 14.8] },
        1220: { name: "XC330-T288", short: "XC330", family: "xc330", current: true, volts: [10, 14.8] },
        1230: { name: "XC330-M181", short: "XC330", family: "xc330", current: true, volts: [3.7, 6] },
        1240: { name: "XC330-M288", short: "XC330", family: "xc330", current: true, volts: [3.7, 6] },
        1e3: { name: "XH430-W350", short: "XH430", family: "xh430", current: true, volts: [10, 14.8] },
        1010: { name: "XH430-W210", short: "XH430", family: "xh430", current: true, volts: [10, 14.8] },
        1040: { name: "XH430-V350", short: "XH430", family: "xh430", current: true, volts: [11.1, 24] },
        1050: { name: "XH430-V210", short: "XH430", family: "xh430", current: true, volts: [11.1, 24] },
        1020: { name: "XM430-W350", short: "XM430", family: "xm430", current: true, volts: [10, 14.8] },
        1030: { name: "XM430-W210", short: "XM430", family: "xm430", current: true, volts: [10, 14.8] }
      };
      var INCOMPATIBLE = {
        350: "XL-320 (CM-550과 호환되지 않음)"
      };
      var modelInfo = (model) => MODELS[model] || null;
      var modelName = (model) => MODELS[model] ? MODELS[model].name : INCOMPATIBLE[model] || (model === 450 ? "CM-550" : `모델 ${model}`);
      var pairDualAxes = (motors) => {
        const dual = motors.filter((m) => MODELS[m.model] && MODELS[m.model].dual).sort((x, y) => x.id - y.id);
        const pairs = [];
        for (let i = 0; i + 1 < dual.length; i++) {
          const a = dual[i];
          const b = dual[i + 1];
          if (b.id === a.id + 1 && b.model === a.model) {
            pairs.push({ a: a.id, b: b.id, model: a.model });
            i++;
          }
        }
        return pairs;
      };
      var describeMotors = (motors, busVolts) => {
        const pairs = pairDualAxes(motors);
        const axis = {};
        pairs.forEach((p, i) => {
          axis[p.a] = { module: i + 1, axis: "A", sibling: p.b };
          axis[p.b] = { module: i + 1, axis: "B", sibling: p.a };
        });
        const warnings = [];
        const labels = {};
        for (const m of motors) {
          const info = MODELS[m.model];
          const ax = axis[m.id];
          labels[m.id] = info ? `${info.short}${ax ? ` ${ax.axis}축` : ""}` : modelName(m.model);
          if (!info) {
            warnings.push(`ID ${m.id}: ${modelName(m.model)} — 블록이 지원하지 않는 모델입니다.`);
          } else if (busVolts && busVolts > info.volts[1] + 0.5) {
            warnings.push(`ID ${m.id}: ${info.name}의 정격 전압은 ${info.volts[0]}~${info.volts[1]} V인데 CM-550이 ${busVolts.toFixed(1)} V를 공급하고 있습니다. 모터가 손상될 수 있으니 바로 분리하세요.`);
          }
        }
        const ids = motors.map((m) => m.id);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        if (dupes.length) warnings.push(`같은 ID를 가진 모터가 있습니다: ${[...new Set(dupes)].join(", ")}`);
        return { labels, pairs, axis, warnings };
      };
      module.exports = { MODELS, INCOMPATIBLE, modelInfo, modelName, pairDualAxes, describeMotors };
    }
  });

  // src/cm550.js
  var require_cm550 = __commonJS({
    "src/cm550.js"(exports, module) {
      var P2 = require_protocol2();
      var { WebSerialTransport, WebBluetoothTransport } = require_transport();
      var { modelInfo, modelName, describeMotors } = require_models();
      var CM550_ID = 200;
      var CM = {
        MODEL_NUMBER: { addr: 0, size: 2 },
        FIRMWARE_VERSION: { addr: 6, size: 1 },
        MODE_NUMBER: { addr: 21, size: 1 },
        // 0 IDLE, 1 Task Play, 2 Manage, 3 Bootloader, 4 Reboot
        DXL_POWER: { addr: 22, size: 1 },
        ERROR_CODE: { addr: 23, size: 2 },
        BUTTON_STATUS: { addr: 26, size: 1 },
        // 0 none, 1 START, 2 MODE, 3 both
        BUTTON_RELEASED: { addr: 28, size: 1 },
        BUTTON_PRESSED_MS: { addr: 29, size: 2 },
        NUM_DXL: { addr: 39, size: 1 },
        SCAN_DXL: { addr: 40, size: 1 },
        DXL_TORQUE: { addr: 41, size: 1 },
        // 1 all off, 2 all on, 3 reboot
        REMOCON_TX: { addr: 59, size: 2 },
        REMOCON_RX: { addr: 61, size: 2 },
        REMOCON_ARRIVED: { addr: 63, size: 1 },
        MOTION_SPEED: { addr: 64, size: 1 },
        // 20..200 (%)
        MOTION_INDEX: { addr: 66, size: 2 },
        // page; 65533 stop now, 65534 stop at key frame, 65535 stop at unit end
        MOTION_STATUS: { addr: 68, size: 1 },
        MOTION_NEXT_PAGE: { addr: 69, size: 2 },
        MOTION_COUNT: { addr: 71, size: 2 },
        TIMER_128MS: { addr: 73, size: 1 },
        TIMER_1MS: { addr: 74, size: 2 },
        RANDOM: { addr: 77, size: 1 },
        BUZZER_INDEX: { addr: 84, size: 1 },
        BUZZER_TIME: { addr: 85, size: 1 },
        // 0.1 s units; 255 = melody mode
        SOUND_COUNT: { addr: 86, size: 1 },
        SOUND_DETECTING: { addr: 87, size: 1 },
        LOW_BATTERY_SOUND: { addr: 88, size: 1 },
        VOLTAGE: { addr: 89, size: 1 },
        // 0.1 V
        TEMPERATURE: { addr: 90, size: 1 },
        LED_RED: { addr: 91, size: 1 },
        LED_GREEN: { addr: 92, size: 1 },
        LED_BLUE: { addr: 93, size: 1 },
        ROLL: { addr: 102, size: 2, signed: true },
        // 0.01 deg
        PITCH: { addr: 104, size: 2, signed: true },
        YAW: { addr: 106, size: 2, signed: true },
        GYRO_X: { addr: 108, size: 2, signed: true },
        // 0.01 deg/s
        GYRO_Y: { addr: 110, size: 2, signed: true },
        GYRO_Z: { addr: 112, size: 2, signed: true },
        ACC_X: { addr: 114, size: 2, signed: true },
        // 0.01 G
        ACC_Y: { addr: 116, size: 2, signed: true },
        ACC_Z: { addr: 118, size: 2, signed: true },
        MILLIS: { addr: 124, size: 4, signed: true },
        // ports 1..5 -> 390,392,394,396,398
        MODULE_CATEGORY: { addr: 390, size: 1, stride: 2 }
      };
      var MODULE = {
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
      var PORT = {
        WHEEL: { base: 400, stride: 2, size: 2, ports: 2, category: MODULE.WHEEL },
        SERVO_POSITION: { base: 404, stride: 2, size: 2, ports: 2, category: MODULE.SERVO_POSITION },
        SERVO_SPEED: { base: 408, stride: 2, size: 2, ports: 2, category: MODULE.SERVO_SPEED },
        IR: { base: 415, stride: 2, size: 2, ports: 2, category: MODULE.IR },
        DMS: { base: 419, stride: 2, size: 2, ports: 5, category: MODULE.DMS },
        TOUCH: { base: 429, stride: 1, size: 1, ports: 5, category: MODULE.TOUCH },
        LED: { base: 434, stride: 1, size: 1, ports: 5, category: MODULE.LED },
        USER: { base: 439, stride: 2, size: 2, ports: 5, category: MODULE.USER },
        TEMPERATURE: { base: 449, stride: 1, size: 1, ports: 5, category: MODULE.TEMPERATURE, signed: true },
        MAGNET: { base: 459, stride: 1, size: 1, ports: 5, category: MODULE.MAGNET },
        MOTION: { base: 464, stride: 1, size: 1, ports: 5, category: MODULE.MOTION },
        COLOR: { base: 469, stride: 1, size: 1, ports: 5, category: MODULE.COLOR },
        MOISTURE: { base: 474, stride: 1, size: 1, ports: 2, category: MODULE.MOISTURE },
        MOISTURE_TEMP: { base: 479, stride: 1, size: 1, ports: 2, category: MODULE.MOISTURE_TEMP, signed: true },
        BRIGHTNESS: { base: 484, stride: 2, size: 2, ports: 5, category: MODULE.BRIGHTNESS },
        LED_RED_BRIGHT: { base: 494, stride: 1, size: 1, ports: 2, category: MODULE.LED_RED_BRIGHT },
        LED_BLUE_BRIGHT: { base: 499, stride: 1, size: 1, ports: 2, category: MODULE.LED_BLUE_BRIGHT }
      };
      var DXL = {
        MODEL_NUMBER: { addr: 0, size: 2 },
        ID: { addr: 7, size: 1 },
        // 1 velocity, 3 position, 4 extended position, 16 PWM (XL-330: 0 current, 5 current-based position)
        OPERATING_MODE: { addr: 11, size: 1 },
        MAX_POSITION_LIMIT: { addr: 48, size: 4 },
        MIN_POSITION_LIMIT: { addr: 52, size: 4 },
        VELOCITY_LIMIT: { addr: 44, size: 4 },
        CURRENT_LIMIT: { addr: 38, size: 2 },
        // current-capable models only
        GOAL_CURRENT: { addr: 102, size: 2, signed: true },
        TORQUE_ENABLE: { addr: 64, size: 1 },
        LED: { addr: 65, size: 1 },
        HARDWARE_ERROR: { addr: 70, size: 1 },
        GOAL_PWM: { addr: 100, size: 2, signed: true },
        GOAL_VELOCITY: { addr: 104, size: 4, signed: true },
        // unit 0.229 rpm
        PROFILE_ACCELERATION: { addr: 108, size: 4 },
        PROFILE_VELOCITY: { addr: 112, size: 4 },
        GOAL_POSITION: { addr: 116, size: 4, signed: true },
        // 0..4095 = 360 deg
        MOVING: { addr: 122, size: 1 },
        PRESENT_PWM: { addr: 124, size: 2, signed: true },
        PRESENT_LOAD: { addr: 126, size: 2, signed: true },
        // 0.1 %
        PRESENT_VELOCITY: { addr: 128, size: 4, signed: true },
        PRESENT_POSITION: { addr: 132, size: 4, signed: true },
        PRESENT_INPUT_VOLTAGE: { addr: 144, size: 2 },
        // 0.1 V
        PRESENT_TEMPERATURE: { addr: 146, size: 1 }
      };
      var OP_MODE = { CURRENT: 0, VELOCITY: 1, POSITION: 3, EXTENDED_POSITION: 4, CURRENT_POSITION: 5, PWM: 16 };
      var DUAL_AXIS_MODELS = /* @__PURE__ */ new Set([1090, 1160]);
      var MOTION_STOP = { NOW: 65533, KEYFRAME: 65534, UNIT: 65535 };
      var clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
      var degToTick = (deg) => Math.round(deg / 360 * 4096);
      var tickToDeg = (tick) => tick / 4096 * 360;
      var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      var CM550Device = class {
        constructor() {
          this.transport = null;
          this.parser = new P2.PacketParser((pkt) => this._onPacket(pkt));
          this._queue = Promise.resolve();
          this._pending = null;
          this._collector = null;
          this._rawTap = null;
          this.motors = [];
          this.motorDesc = describeMotors([]);
          this.onMotorsChange = null;
          this._modelCache = {};
          this._scanPromise = null;
          this.lastError = "";
          this.timeoutMs = 200;
          this._categoryCache = {};
          this._velocityLimitCache = {};
          this._modeCache = {};
          this.onStateChange = null;
        }
        get connected() {
          return Boolean(this.transport && this.transport.isOpen);
        }
        get transportName() {
          return this.transport ? this.transport.name : "";
        }
        /**
         * @param {'usb'|'ble'|object} kind - 'usb', 'ble', or a ready-made transport
         *   object (open/close/write/onData/onClose/isOpen/name), e.g. a simulator
         */
        async connect(kind) {
          if (this.connected) await this.disconnect();
          let transport;
          if (kind && typeof kind === "object") {
            transport = kind;
            this.timeoutMs = 200;
          } else {
            transport = kind === "ble" ? new WebBluetoothTransport() : new WebSerialTransport();
            this.timeoutMs = kind === "ble" ? 600 : 200;
          }
          transport.onData((chunk) => {
            if (this._rawTap) for (const b of chunk) this._rawTap.push(b);
            this.parser.push(chunk);
          });
          transport.onClose(() => {
            this.transport = null;
            this._failPending(new Error("연결이 끊어졌습니다."));
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
        async disconnect() {
          const t = this.transport;
          this.transport = null;
          if (t) await t.close();
          this._failPending(new Error("연결 종료"));
          this._notify();
        }
        _notify() {
          if (this.onStateChange) this.onStateChange(this.connected);
        }
        _failPending(err) {
          if (this._pending) {
            clearTimeout(this._pending.timer);
            this._pending.reject(err);
            this._pending = null;
          }
        }
        _onPacket(pkt) {
          if (this._collector) {
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
        request(id, packet, expectReply = true) {
          const run = async () => {
            if (!this.connected) throw new Error("CM-550이 연결되어 있지 않습니다.");
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
              this._pending = { id, resolve, reject, timer };
              this.transport.write(packet).catch((err) => {
                clearTimeout(timer);
                this._pending = null;
                reject(err);
              });
            });
          };
          const result = this._queue.then(run, run);
          this._queue = result.catch(() => {
          });
          return result;
        }
        async read(id, address, size, signed = false) {
          const pkt = await this.request(id, P2.read(id, address, size));
          if (pkt.params.length < size) throw new Error(`ID ${id}: 응답 길이 오류`);
          return P2.fromLE(pkt.params, 0, size, signed);
        }
        write(id, address, value, size) {
          return this.request(id, P2.write(id, address, Math.round(value), size));
        }
        /** Read `length` raw bytes starting at `address` (one packet). */
        async readBytes(id, address, length) {
          const pkt = await this.request(id, P2.read(id, address, length));
          if (pkt.params.length < length) throw new Error(`ID ${id}: 응답 길이 오류`);
          return pkt.params.slice(0, length);
        }
        /**
         * Protocol 2.0 broadcast ping: every device on the bus answers.
         * @param {number} [waitMs] how long to collect replies
         * @returns {Promise<Array<{id:number, model:number, firmware:number}>>}
         */
        broadcastPing(waitMs) {
          const wait = waitMs || this.timeoutMs * 2;
          const run = async () => {
            if (!this.connected) throw new Error("CM-550이 연결되어 있지 않습니다.");
            this._collector = [];
            try {
              await this.transport.write(P2.ping(P2.BROADCAST_ID));
              await delay(wait);
              return this._collector;
            } finally {
              this._collector = null;
            }
          };
          const result = this._queue.then(run, run).then((pkts) => {
            const seen = /* @__PURE__ */ new Map();
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
          this._queue = result.catch(() => {
          });
          return result;
        }
        /**
         * Find every DYNAMIXEL on the bus (broadcast ping, then IDs 1..fallbackMax
         * one by one if nothing answered) and remember their models.
         * Concurrent callers share one scan.
         */
        scanMotors(fallbackMax = 30, onProgress) {
          if (this._scanPromise) return this._scanPromise;
          this._scanPromise = (async () => {
            let found = (await this.broadcastPing()).filter((d) => d.id !== CM550_ID);
            if (!found.length) {
              for (let id = 1; id <= fallbackMax; id++) {
                if (onProgress) onProgress(id, fallbackMax);
                const info = await this.pingInfo(id);
                if (info) found.push(info);
              }
            }
            let volts = 0;
            try {
              volts = await this.readCM(CM.VOLTAGE) / 10;
            } catch (e) {
            }
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
        setMotors(motors, busVolts) {
          this.motors = motors.slice().sort((a, b) => a.id - b.id);
          for (const m of this.motors) this._modelCache[m.id] = m.model;
          this.motorDesc = describeMotors(this.motors, busVolts);
          if (this.onMotorsChange) this.onMotorsChange(this.motors, this.motorDesc);
        }
        /** Model number of `id` (cached; read from the motor once). Rejects unsupported models. */
        async requireModel(id) {
          if (typeof this._modelCache[id] === "undefined") {
            this._modelCache[id] = await this.readDXL(id, DXL.MODEL_NUMBER);
          }
          const model = this._modelCache[id];
          if (!modelInfo(model)) {
            throw new Error(`다이나믹셀 ${id}: ${modelName(model)} — 이 블록으로 제어할 수 없는 모델입니다.`);
          }
          return model;
        }
        /** Ping one id; resolves {id, model, firmware} or null. */
        async pingInfo(id) {
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
        readCM(reg, port = 1) {
          const addr = reg.addr + (port - 1) * (reg.stride || 0);
          return this.read(CM550_ID, addr, reg.size, Boolean(reg.signed));
        }
        writeCM(reg, value, port = 1) {
          const addr = reg.addr + (port - 1) * (reg.stride || 0);
          return this.write(CM550_ID, addr, value, reg.size);
        }
        readDXL(id, reg) {
          return this.read(id, reg.addr, reg.size, Boolean(reg.signed));
        }
        writeDXL(id, reg, value) {
          return this.write(id, reg.addr, value, reg.size);
        }
        ping(id) {
          return this.request(id, P2.ping(id));
        }
        /**
         * Sync-write the same register on several DYNAMIXELs (no status packet).
         * @param reg
         * @param items
         */
        syncWriteDXL(reg, items) {
          return this.request(P2.BROADCAST_ID, P2.syncWrite(reg.addr, reg.size, items.map((it) => ({
            id: it.id,
            value: Math.round(it.value)
          }))), false);
        }
        // ---- peripheral ports ----------------------------------------------
        async ensurePortCategory(port, category) {
          if (this._categoryCache[port] === category) return;
          await this.writeCM(CM.MODULE_CATEGORY, category, port);
          this._categoryCache[port] = category;
          await delay(50);
        }
        async readPort(spec, port) {
          port = clamp(Math.round(port), 1, spec.ports);
          await this.ensurePortCategory(port, spec.category);
          const addr = spec.base + (port - 1) * spec.stride;
          return this.read(CM550_ID, addr, spec.size, Boolean(spec.signed));
        }
        async writePort(spec, port, value) {
          port = clamp(Math.round(port), 1, spec.ports);
          await this.ensurePortCategory(port, spec.category);
          const addr = spec.base + (port - 1) * spec.stride;
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
        async ensureMode(id, accepted) {
          const target = accepted[0];
          const info = modelInfo(await this.requireModel(id));
          if ((target === OP_MODE.CURRENT_POSITION || target === OP_MODE.CURRENT) && !info.current) {
            throw new Error(`다이나믹셀 ${id}: ${info.name}은(는) 전류(힘) 제어를 지원하지 않습니다. XL330·XC330·XM430·XH430에서 사용할 수 있습니다.`);
          }
          let current = this._modeCache[id];
          if (typeof current === "undefined") {
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
            const ok = await this._withSiblingTorqueOff(
              id,
              () => this.writeDXL(id, DXL.OPERATING_MODE, target)
            );
            if (!ok) {
              throw new Error(`다이나믹셀 ${id}: 모드를 바꿀 수 없습니다. 같은 모듈(2XL430 등)의 다른 축이나 이 모터의 토크를 끈 뒤 다시 시도하세요.`);
            }
          }
          this._modeCache[id] = target;
          await this.writeDXL(id, DXL.TORQUE_ENABLE, 1);
        }
        /** Back-compat name used by blocks: switch to exactly `mode`. */
        setOperatingMode(id, mode) {
          return this.ensureMode(id, [mode]);
        }
        /**
         * Dual-axis modules share one EEPROM lock: temporarily turn off the other
         * axis (ID ± 1 with a dual-axis model number), run fn, restore its torque.
         * @returns {Promise<boolean>} true if fn succeeded
         */
        async _withSiblingTorqueOff(id, fn) {
          const known = this.motorDesc.axis[id];
          const candidates = known ? [known.sibling] : [id + 1, id - 1];
          for (const n of candidates) {
            if (n < 0 || n > 252) continue;
            let model;
            try {
              model = await this.readDXL(n, DXL.MODEL_NUMBER);
            } catch (e) {
              continue;
            }
            if (!DUAL_AXIS_MODELS.has(model)) continue;
            const t = await this.readDXL(n, DXL.TORQUE_ENABLE);
            if (t) await this.writeDXL(n, DXL.TORQUE_ENABLE, 0);
            try {
              await fn();
              return true;
            } catch (e) {
            } finally {
              if (t) await this.writeDXL(n, DXL.TORQUE_ENABLE, 1);
            }
          }
          return false;
        }
        async getVelocityLimit(id) {
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
        async moveTo(id, degrees, speedPercent) {
          await this.ensureMode(id, [OP_MODE.POSITION, OP_MODE.EXTENDED_POSITION]);
          if (typeof speedPercent === "number" && !Number.isNaN(speedPercent)) {
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
        async grip(id, degrees, forcePercent) {
          await this.ensureMode(id, [OP_MODE.CURRENT_POSITION]);
          const limit = await this.readDXL(id, DXL.CURRENT_LIMIT);
          await this.writeDXL(id, DXL.GOAL_CURRENT, Math.round(limit * clamp(forcePercent, 0, 100) / 100));
          await this.writeDXL(id, DXL.GOAL_POSITION, degToTick(degrees));
        }
        async setWheelSpeed(id, percent) {
          await this.setOperatingMode(id, OP_MODE.VELOCITY);
          const limit = await this.getVelocityLimit(id);
          const v = Math.round(limit * clamp(percent, -100, 100) / 100);
          await this.writeDXL(id, DXL.GOAL_VELOCITY, v);
        }
        async waitUntilStopped(id, timeoutMs = 1e4) {
          const start = Date.now();
          await delay(30);
          while (Date.now() - start < timeoutMs) {
            const moving = await this.readDXL(id, DXL.MOVING);
            if (!moving) return;
            await delay(30);
          }
        }
        // ---- poses (teach by hand / play back) --------------------------------
        /** IDs a pose uses: the last scan's motors (or the given list). */
        poseIds(ids) {
          const list = ids && ids.length ? ids : this.motors.map((m) => m.id);
          return list.map(Number).filter((n) => n >= 0 && n <= 252);
        }
        /**
         * Read the present angle of every joint.
         * @returns {Promise<Object<number, number>>} {id: degrees (0.1° steps)}
         */
        async readPose(ids) {
          const pose = {};
          for (const id of this.poseIds(ids)) {
            const tick = await this.readDXL(id, DXL.PRESENT_POSITION);
            pose[id] = Math.round(tickToDeg(tick) * 10) / 10;
          }
          return pose;
        }
        /**
         * Let joints go limp so a student can pose them by hand (torque off), or
         * stiffen them again. Before torque comes back on each goal is set to the
         * joint's present angle, so the robot holds the hand-made pose instead of
         * jumping back to an old goal.
         */
        async setJointsTorque(ids, on) {
          for (const id of this.poseIds(ids)) {
            if (!on) {
              await this.writeDXL(id, DXL.TORQUE_ENABLE, 0);
              continue;
            }
            const hold = await this.readDXL(id, DXL.PRESENT_POSITION);
            await this.writeDXL(id, DXL.GOAL_POSITION, hold);
            await this.ensureMode(id, [OP_MODE.POSITION, OP_MODE.EXTENDED_POSITION]);
            const now = await this.readDXL(id, DXL.PRESENT_POSITION);
            await this.writeDXL(id, DXL.GOAL_POSITION, now);
          }
        }
        /**
         * Move every joint of `pose` so that all of them arrive together after
         * `seconds` (each joint's profile velocity is set from its own distance).
         * @param {Object<number, number>} pose {id: degrees}
         * @param {number} seconds
         * @returns {Promise<number[]>} IDs that were moved
         */
        async movePose(pose, seconds) {
          const secs = clamp(Number(seconds) || 0, 0.1, 30);
          const ids = Object.keys(pose).map(Number);
          const plan = [];
          for (const id of ids) {
            await this.ensureMode(id, [OP_MODE.POSITION, OP_MODE.EXTENDED_POSITION]);
            const cur = tickToDeg(await this.readDXL(id, DXL.PRESENT_POSITION));
            const target = Number(pose[id]);
            const degPerSec = Math.abs(target - cur) / secs;
            let pv = Math.max(1, Math.ceil(degPerSec / 6 / 0.229));
            const limit = await this.getVelocityLimit(id);
            if (limit) pv = Math.min(pv, limit);
            plan.push({ id, pv, goal: degToTick(target) });
          }
          for (const p of plan) await this.writeDXL(p.id, DXL.PROFILE_VELOCITY, p.pv);
          for (const p of plan) await this.writeDXL(p.id, DXL.GOAL_POSITION, p.goal);
          return ids;
        }
        // ---- motion ----------------------------------------------------------
        playMotion(page) {
          return this.writeCM(CM.MOTION_INDEX, clamp(Math.round(page), 1, 65532));
        }
        stopMotion(how = MOTION_STOP.UNIT) {
          return this.writeCM(CM.MOTION_INDEX, how);
        }
        async waitMotionDone(timeoutMs = 6e4) {
          const start = Date.now();
          await delay(100);
          while (Date.now() - start < timeoutMs) {
            const playing = await this.readCM(CM.MOTION_STATUS);
            if (!playing) return;
            await delay(50);
          }
        }
        // ---- buzzer ----------------------------------------------------------
        async playNote(index, seconds) {
          await this.writeCM(CM.BUZZER_INDEX, clamp(Math.round(index), 0, 51));
          await this.writeCM(CM.BUZZER_TIME, clamp(Math.round(seconds * 10), 1, 50));
        }
        async playMelody(index) {
          await this.writeCM(CM.BUZZER_INDEX, clamp(Math.round(index), 0, 25));
          await this.writeCM(CM.BUZZER_TIME, 255);
        }
      };
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
    }
  });

  // src/icons.js
  var require_icons = __commonJS({
    "src/icons.js"(exports, module) {
      var svgToUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      var controllerSvg = (bg, fg) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect x="4" y="6" width="32" height="28" rx="5" fill="${bg}" stroke="${fg}" stroke-width="2"/>
  <circle cx="14" cy="16" r="3" fill="${fg}"/>
  <circle cx="26" cy="16" r="3" fill="${fg}"/>
  <rect x="11" y="23" width="18" height="4" rx="2" fill="${fg}"/>
  <rect x="17" y="2" width="6" height="4" rx="1" fill="${fg}"/>
</svg>`;
      module.exports = {
        blockIconURI: svgToUri(controllerSvg("#2E7CF6", "#ffffff")),
        menuIconURI: svgToUri(controllerSvg("#ffffff", "#2E7CF6"))
      };
    }
  });

  // src/poses.js
  var require_poses = __commonJS({
    "src/poses.js"(exports, module) {
      var POSE_LIST_NAME = "로봇 자세";
      var POSE_LIST_ID = "dm-robot-poses";
      var encodePose = (pose) => Object.keys(pose).map(Number).sort((a, b) => a - b).map((id) => `${id}:${Math.round(Number(pose[id]) * 10) / 10}`).join(" ");
      var decodePose = (text) => {
        const pose = {};
        String(text || "").split(/[\s,;]+/).forEach((part) => {
          const m = /^(\d{1,3})[:=](-?\d+(?:\.\d+)?)$/.exec(part.trim());
          if (m) pose[Number(m[1])] = Number(m[2]);
        });
        return pose;
      };
      var poseSize = (pose) => Object.keys(pose).length;
      module.exports = { POSE_LIST_NAME, POSE_LIST_ID, encodePose, decodePose, poseSize };
    }
  });

  // src/extension.js
  var require_extension = __commonJS({
    "src/extension.js"(exports, module) {
      var {
        CM550Device,
        CM,
        PORT,
        DXL,
        OP_MODE,
        MOTION_STOP,
        tickToDeg,
        clamp,
        delay
      } = require_cm550();
      var icons = require_icons();
      var { modelName } = require_models();
      var { POSE_LIST_NAME, POSE_LIST_ID, encodePose, decodePose, poseSize } = require_poses();
      var EXTENSION_ID = "cm550";
      var LED_MIX = {
        red: { name: "빨강", rgb: [1, 0, 0] },
        green: { name: "초록", rgb: [0, 1, 0] },
        blue: { name: "파랑", rgb: [0, 0, 1] },
        yellow: { name: "노랑", rgb: [1, 1, 0] },
        cyan: { name: "하늘", rgb: [0, 1, 1] },
        magenta: { name: "보라", rgb: [1, 0, 1] },
        white: { name: "흰색", rgb: [1, 1, 1] },
        off: { name: "끄기", rgb: [0, 0, 0] }
      };
      var createExtension2 = ({ ArgumentType, BlockType, formatMessage, cast }) => {
        const t = (id, def, values) => formatMessage({ id: `cm550.${id}`, default: def, description: id }, values);
        const num = (v) => {
          const n = cast ? cast.toNumber(v) : Number(v);
          return Number.isNaN(n) ? 0 : n;
        };
        const ARG_NUM = (def, menu) => Object.assign({ type: ArgumentType.NUMBER, defaultValue: def }, menu ? { menu } : {});
        const ARG_STR = (def, menu) => ({ type: ArgumentType.STRING, defaultValue: def, menu });
        class Scratch3CM550Blocks {
          constructor(runtime) {
            this.runtime = runtime;
            this.device = new CM550Device();
            this.device.onStateChange = (connected) => {
              if (runtime && runtime.emit) {
                runtime.emit(connected ? "PERIPHERAL_CONNECTED" : "PERIPHERAL_DISCONNECTED");
              }
            };
            this._dxlIds = [];
            if (runtime) runtime.ext_cm550 = this;
            if (runtime && runtime.on) {
              runtime.on("CM550_CONNECT", (kind) => this._connect(kind));
              runtime.on("PROJECT_STOP_ALL", () => this._stopAll());
            }
          }
          static get EXTENSION_ID() {
            return EXTENSION_ID;
          }
          getInfo() {
            return {
              id: EXTENSION_ID,
              name: t("name", "CM-550"),
              color1: "#2E7CF6",
              color2: "#1F5FC4",
              color3: "#174A99",
              blockIconURI: icons.blockIconURI,
              menuIconURI: icons.menuIconURI,
              docsURI: "https://emanual.robotis.com/docs/en/parts/controller/cm-550/",
              blocks: [
                // ---------------- connection ----------------
                { func: "connectUsbButton", blockType: BlockType.BUTTON, text: t("btnUsb", "USB로 연결하기") },
                { func: "connectBleButton", blockType: BlockType.BUTTON, text: t("btnBle", "블루투스로 연결하기") },
                {
                  opcode: "connect",
                  blockType: BlockType.COMMAND,
                  text: t("connect", "CM-550 [KIND] 연결하기"),
                  arguments: { KIND: ARG_STR("usb", "connKind") }
                },
                { opcode: "disconnect", blockType: BlockType.COMMAND, text: t("disconnect", "CM-550 연결 끊기") },
                { opcode: "isConnected", blockType: BlockType.BOOLEAN, text: t("isConnected", "CM-550이 연결되었는가?") },
                {
                  opcode: "lastError",
                  blockType: BlockType.REPORTER,
                  text: t("lastError", "마지막 오류"),
                  disableMonitor: true
                },
                "---",
                // ---------------- DYNAMIXEL ----------------
                {
                  opcode: "dxlTorque",
                  blockType: BlockType.COMMAND,
                  text: t("dxlTorque", "다이나믹셀 [ID] 토크 [ONOFF]"),
                  arguments: { ID: ARG_NUM(1, "dxlId"), ONOFF: ARG_STR("on", "onOff") }
                },
                {
                  opcode: "dxlMoveTo",
                  blockType: BlockType.COMMAND,
                  text: t("dxlMoveTo", "다이나믹셀 [ID] 을(를) [DEG]° 로 이동 (속도 [SPEED] %)"),
                  arguments: { ID: ARG_NUM(1, "dxlId"), DEG: ARG_NUM(180), SPEED: ARG_NUM(50) }
                },
                {
                  opcode: "dxlMoveToWait",
                  blockType: BlockType.COMMAND,
                  text: t(
                    "dxlMoveToWait",
                    "다이나믹셀 [ID] 을(를) [DEG]° 로 이동하고 기다리기 (속도 [SPEED] %)"
                  ),
                  arguments: { ID: ARG_NUM(1, "dxlId"), DEG: ARG_NUM(180), SPEED: ARG_NUM(50) }
                },
                {
                  opcode: "dxlMoveTwo",
                  blockType: BlockType.COMMAND,
                  text: t(
                    "dxlMoveTwo",
                    "다이나믹셀 [ID1] 을(를) [DEG1]° , [ID2] 을(를) [DEG2]° 로 동시에 이동"
                  ),
                  arguments: {
                    ID1: ARG_NUM(1, "dxlId"),
                    DEG1: ARG_NUM(180),
                    ID2: ARG_NUM(2, "dxlId"),
                    DEG2: ARG_NUM(180)
                  }
                },
                {
                  opcode: "dxlWheel",
                  blockType: BlockType.COMMAND,
                  text: t("dxlWheel", "다이나믹셀 [ID] 바퀴 회전 속도 [SPEED] %"),
                  arguments: { ID: ARG_NUM(1, "dxlId"), SPEED: ARG_NUM(50) }
                },
                {
                  opcode: "dxlWheelTwo",
                  blockType: BlockType.COMMAND,
                  text: t("dxlWheelTwo", "왼쪽 바퀴 [ID1] 속도 [SPEED1] % , 오른쪽 바퀴 [ID2] 속도 [SPEED2] %"),
                  arguments: {
                    ID1: ARG_NUM(1, "dxlId"),
                    SPEED1: ARG_NUM(50),
                    ID2: ARG_NUM(2, "dxlId"),
                    SPEED2: ARG_NUM(-50)
                  }
                },
                {
                  opcode: "dxlStop",
                  blockType: BlockType.COMMAND,
                  text: t("dxlStop", "다이나믹셀 [ID] 정지"),
                  arguments: { ID: ARG_NUM(1, "dxlId") }
                },
                {
                  opcode: "dxlSetMode",
                  blockType: BlockType.COMMAND,
                  text: t("dxlSetMode", "다이나믹셀 [ID] 모드를 [MODE] 로 설정"),
                  arguments: { ID: ARG_NUM(1, "dxlId"), MODE: ARG_STR("position", "dxlMode") }
                },
                {
                  opcode: "dxlLed",
                  blockType: BlockType.COMMAND,
                  text: t("dxlLed", "다이나믹셀 [ID] LED [ONOFF]"),
                  arguments: { ID: ARG_NUM(1, "dxlId"), ONOFF: ARG_STR("on", "onOff") }
                },
                {
                  opcode: "dxlAllTorque",
                  blockType: BlockType.COMMAND,
                  text: t("dxlAllTorque", "모든 다이나믹셀 토크 [ONOFF]"),
                  arguments: { ONOFF: ARG_STR("on", "onOff") }
                },
                {
                  opcode: "dxlRead",
                  blockType: BlockType.REPORTER,
                  text: t("dxlRead", "다이나믹셀 [ID] 의 [PROP]"),
                  arguments: { ID: ARG_NUM(1, "dxlId"), PROP: ARG_STR("position", "dxlProp") }
                },
                {
                  opcode: "dxlIsMoving",
                  blockType: BlockType.BOOLEAN,
                  text: t("dxlIsMoving", "다이나믹셀 [ID] 이(가) 움직이는 중인가?"),
                  arguments: { ID: ARG_NUM(1, "dxlId") }
                },
                {
                  opcode: "dxlScan",
                  blockType: BlockType.REPORTER,
                  text: t("dxlScan", "연결된 다이나믹셀 ID 목록"),
                  disableMonitor: true
                },
                // ---- model-specific (shown by the host only when such motors are connected)
                {
                  opcode: "dxlModuleMove",
                  blockType: BlockType.COMMAND,
                  text: t("dxlModuleMove", "다이나믹셀 2축 모듈 [MODULE] A축 [DEGA]° , B축 [DEGB]° 로 이동"),
                  arguments: { MODULE: ARG_STR("1,2", "dxlModule"), DEGA: ARG_NUM(180), DEGB: ARG_NUM(180) }
                },
                {
                  opcode: "dxlModuleWheels",
                  blockType: BlockType.COMMAND,
                  text: t("dxlModuleWheels", "다이나믹셀 2축 모듈 [MODULE] 바퀴 A축 [SPA] % , B축 [SPB] %"),
                  arguments: { MODULE: ARG_STR("1,2", "dxlModule"), SPA: ARG_NUM(50), SPB: ARG_NUM(-50) }
                },
                {
                  opcode: "dxlGrip",
                  blockType: BlockType.COMMAND,
                  text: t("dxlGrip", "다이나믹셀 [ID] 을(를) 힘 [FORCE] % 로 [DEG]° 까지 잡기"),
                  arguments: { ID: ARG_NUM(1, "dxlId"), FORCE: ARG_NUM(30), DEG: ARG_NUM(180) }
                },
                {
                  opcode: "dxlModelName",
                  blockType: BlockType.REPORTER,
                  text: t("dxlModelName", "다이나믹셀 [ID] 의 모델 이름"),
                  arguments: { ID: ARG_NUM(1, "dxlId") }
                },
                "---",
                // ---------------- poses taught by hand ----------------
                {
                  opcode: "poseRelax",
                  blockType: BlockType.COMMAND,
                  text: t("poseRelax", "모든 관절 [STATE]"),
                  arguments: { STATE: ARG_STR("off", "relax") }
                },
                {
                  opcode: "poseRecord",
                  blockType: BlockType.COMMAND,
                  text: t("poseRecord", "지금 자세를 [N] 번 자세로 기록하기"),
                  arguments: { N: ARG_NUM(1) }
                },
                {
                  opcode: "posePlay",
                  blockType: BlockType.COMMAND,
                  text: t("posePlay", "자세 [N] 번으로 [SECS] 초 동안 움직이기"),
                  arguments: { N: ARG_NUM(1), SECS: ARG_NUM(1) }
                },
                {
                  opcode: "posePlayAll",
                  blockType: BlockType.COMMAND,
                  text: t("posePlayAll", "기록한 자세 모두 차례로 움직이기 (자세마다 [SECS] 초)"),
                  arguments: { SECS: ARG_NUM(1) }
                },
                {
                  opcode: "poseCount",
                  blockType: BlockType.REPORTER,
                  text: t("poseCount", "기록한 자세 개수"),
                  disableMonitor: true
                },
                {
                  opcode: "poseClear",
                  blockType: BlockType.COMMAND,
                  text: t("poseClear", "기록한 자세 모두 지우기")
                },
                "---",
                // ---------------- CM-550 built-ins ----------------
                {
                  // the auxiliary LED has red/green/blue elements (addr 91-93);
                  // mixing them gives 7 colours
                  opcode: "cmLedColor",
                  blockType: BlockType.COMMAND,
                  text: t("cmLedColor", "CM-550 LED 색 [COLOR] (으)로 바꾸기"),
                  arguments: { COLOR: ARG_STR("red", "ledMix") }
                },
                {
                  opcode: "cmLed",
                  blockType: BlockType.COMMAND,
                  text: t("cmLed", "CM-550 LED [COLOR] [ONOFF]"),
                  arguments: { COLOR: ARG_STR("red", "ledColor"), ONOFF: ARG_STR("on", "onOff") }
                },
                {
                  opcode: "cmBuzzerNote",
                  blockType: BlockType.COMMAND,
                  text: t("cmBuzzerNote", "부저로 [NOTE] 음을 [SECS] 초 동안 연주"),
                  arguments: { NOTE: ARG_NUM(24, "note"), SECS: ARG_NUM(0.5) }
                },
                {
                  opcode: "cmBuzzerMelody",
                  blockType: BlockType.COMMAND,
                  text: t("cmBuzzerMelody", "부저로 멜로디 [INDEX] 번 연주"),
                  arguments: { INDEX: ARG_NUM(0) }
                },
                {
                  opcode: "cmButton",
                  blockType: BlockType.BOOLEAN,
                  text: t("cmButton", "[BUTTON] 버튼이 눌렸는가?"),
                  arguments: { BUTTON: ARG_STR("start", "button") }
                },
                {
                  opcode: "cmTilt",
                  blockType: BlockType.REPORTER,
                  text: t("cmTilt", "기울기 [AXIS] (°)"),
                  arguments: { AXIS: ARG_STR("roll", "tiltAxis") }
                },
                {
                  opcode: "cmGyro",
                  blockType: BlockType.REPORTER,
                  text: t("cmGyro", "자이로 [AXIS] (°/s)"),
                  arguments: { AXIS: ARG_STR("x", "xyz") }
                },
                {
                  opcode: "cmAccel",
                  blockType: BlockType.REPORTER,
                  text: t("cmAccel", "가속도 [AXIS] (G)"),
                  arguments: { AXIS: ARG_STR("x", "xyz") }
                },
                { opcode: "cmVoltage", blockType: BlockType.REPORTER, text: t("cmVoltage", "배터리 전압 (V)") },
                { opcode: "cmTemperature", blockType: BlockType.REPORTER, text: t("cmTemperature", "컨트롤러 온도 (°C)") },
                { opcode: "cmSoundCount", blockType: BlockType.REPORTER, text: t("cmSoundCount", "소리 감지 횟수") },
                { opcode: "cmSoundReset", blockType: BlockType.COMMAND, text: t("cmSoundReset", "소리 감지 횟수 초기화") },
                {
                  opcode: "cmDxlPower",
                  blockType: BlockType.COMMAND,
                  text: t("cmDxlPower", "다이나믹셀 전원 [ONOFF]"),
                  arguments: { ONOFF: ARG_STR("on", "onOff") }
                },
                "---",
                // ---------------- 5-pin ports ----------------
                {
                  opcode: "portSensor",
                  blockType: BlockType.REPORTER,
                  text: t("portSensor", "포트 [PORT] 의 [SENSOR] 값"),
                  arguments: { PORT: ARG_NUM(1, "port5"), SENSOR: ARG_STR("ir", "sensor") }
                },
                {
                  opcode: "portTouch",
                  blockType: BlockType.BOOLEAN,
                  text: t("portTouch", "포트 [PORT] 의 터치 센서가 눌렸는가?"),
                  arguments: { PORT: ARG_NUM(1, "port5") }
                },
                {
                  opcode: "portColor",
                  blockType: BlockType.BOOLEAN,
                  text: t("portColor", "포트 [PORT] 의 컬러 센서가 [COLOR] 인가?"),
                  arguments: { PORT: ARG_NUM(1, "port5"), COLOR: ARG_STR("red", "colorName") }
                },
                {
                  opcode: "portLed",
                  blockType: BlockType.COMMAND,
                  text: t("portLed", "포트 [PORT] LED 모듈 [STATE]"),
                  arguments: { PORT: ARG_NUM(1, "port5"), STATE: ARG_STR("both", "ledModule") }
                },
                {
                  opcode: "portServo",
                  blockType: BlockType.COMMAND,
                  text: t("portServo", "포트 [PORT] 서보모터를 [DEG]° 로 이동"),
                  arguments: { PORT: ARG_NUM(1, "port2"), DEG: ARG_NUM(150) }
                },
                {
                  opcode: "portMotor",
                  blockType: BlockType.COMMAND,
                  text: t("portMotor", "포트 [PORT] 기어모터 속도 [SPEED] %"),
                  arguments: { PORT: ARG_NUM(1, "port2"), SPEED: ARG_NUM(50) }
                },
                "---",
                // ---------------- motion ----------------
                {
                  opcode: "motionPlay",
                  blockType: BlockType.COMMAND,
                  text: t("motionPlay", "모션 [PAGE] 번 재생"),
                  arguments: { PAGE: ARG_NUM(1) }
                },
                {
                  opcode: "motionPlayWait",
                  blockType: BlockType.COMMAND,
                  text: t("motionPlayWait", "모션 [PAGE] 번 재생하고 끝날 때까지 기다리기"),
                  arguments: { PAGE: ARG_NUM(1) }
                },
                {
                  opcode: "motionStop",
                  blockType: BlockType.COMMAND,
                  text: t("motionStop", "모션 정지 [HOW]"),
                  arguments: { HOW: ARG_STR("unit", "motionStop") }
                },
                {
                  opcode: "motionSpeed",
                  blockType: BlockType.COMMAND,
                  text: t("motionSpeed", "모션 속도를 [PERCENT] % 로 설정"),
                  arguments: { PERCENT: ARG_NUM(100) }
                },
                {
                  opcode: "motionNext",
                  blockType: BlockType.COMMAND,
                  text: t("motionNext", "다음 모션 페이지를 [PAGE] 번으로 설정"),
                  arguments: { PAGE: ARG_NUM(1) }
                },
                {
                  opcode: "motionIsPlaying",
                  blockType: BlockType.BOOLEAN,
                  text: t("motionIsPlaying", "모션이 재생 중인가?")
                },
                { opcode: "motionCount", blockType: BlockType.REPORTER, text: t("motionCount", "저장된 모션 개수") },
                "---",
                // ---------------- advanced ----------------
                {
                  opcode: "rawWrite",
                  blockType: BlockType.COMMAND,
                  text: t("rawWrite", "장치 [ID] 주소 [ADDR] 에 [SIZE] 바이트 값 [VALUE] 쓰기"),
                  arguments: {
                    ID: ARG_NUM(200),
                    ADDR: ARG_NUM(91),
                    SIZE: ARG_NUM(1, "byteSize"),
                    VALUE: ARG_NUM(1)
                  }
                },
                {
                  opcode: "rawRead",
                  blockType: BlockType.REPORTER,
                  text: t("rawRead", "장치 [ID] 주소 [ADDR] 의 [SIZE] 바이트 값"),
                  arguments: { ID: ARG_NUM(200), ADDR: ARG_NUM(89), SIZE: ARG_NUM(1, "byteSize") }
                }
              ],
              menus: {
                connKind: {
                  acceptReporters: false,
                  items: [
                    { text: t("menu.usb", "USB"), value: "usb" },
                    { text: t("menu.ble", "블루투스"), value: "ble" }
                  ]
                },
                relax: {
                  acceptReporters: false,
                  items: [
                    { text: t("menu.relaxOff", "힘 빼기 (손으로 움직이기)"), value: "off" },
                    { text: t("menu.relaxOn", "힘 주기 (지금 자세 유지)"), value: "on" }
                  ]
                },
                onOff: {
                  acceptReporters: true,
                  items: [
                    { text: t("menu.on", "켜기"), value: "on" },
                    { text: t("menu.off", "끄기"), value: "off" }
                  ]
                },
                // dynamic: detected motors first, labelled with their model ("3 · 2XL430 A축")
                dxlId: { acceptReporters: true, items: "_dxlIdMenu" },
                dxlModule: { acceptReporters: false, items: "_dxlModuleMenu" },
                dxlMode: {
                  acceptReporters: false,
                  items: [
                    { text: t("menu.modePosition", "위치(관절)"), value: "position" },
                    { text: t("menu.modeVelocity", "바퀴(연속 회전)"), value: "velocity" },
                    { text: t("menu.modeExtended", "확장 위치(다회전)"), value: "extended" }
                  ]
                },
                dxlProp: {
                  acceptReporters: false,
                  items: [
                    { text: t("menu.propPosition", "현재 각도 (°)"), value: "position" },
                    { text: t("menu.propVelocity", "현재 속도 (rpm)"), value: "velocity" },
                    { text: t("menu.propLoad", "부하 (%)"), value: "load" },
                    { text: t("menu.propTemperature", "온도 (°C)"), value: "temperature" },
                    { text: t("menu.propVoltage", "전압 (V)"), value: "voltage" },
                    { text: t("menu.propModel", "모델 번호"), value: "model" },
                    { text: t("menu.propError", "하드웨어 오류"), value: "error" }
                  ]
                },
                ledColor: {
                  acceptReporters: false,
                  items: [
                    { text: t("menu.red", "빨강"), value: "red" },
                    { text: t("menu.green", "초록"), value: "green" },
                    { text: t("menu.blue", "파랑"), value: "blue" }
                  ]
                },
                ledMix: {
                  acceptReporters: false,
                  items: Object.keys(LED_MIX).map((value) => ({ text: t(`menu.mix.${value}`, LED_MIX[value].name), value }))
                },
                note: { acceptReporters: true, items: this._noteMenu() },
                button: {
                  acceptReporters: false,
                  items: [
                    { text: "START", value: "start" },
                    { text: "MODE", value: "mode" }
                  ]
                },
                tiltAxis: {
                  acceptReporters: false,
                  items: [
                    { text: t("menu.roll", "롤 (좌우)"), value: "roll" },
                    { text: t("menu.pitch", "피치 (앞뒤)"), value: "pitch" },
                    { text: t("menu.yaw", "요 (회전)"), value: "yaw" }
                  ]
                },
                xyz: { acceptReporters: false, items: ["x", "y", "z"] },
                port5: { acceptReporters: true, items: ["1", "2", "3", "4", "5"] },
                port2: { acceptReporters: true, items: ["1", "2"] },
                sensor: {
                  acceptReporters: false,
                  items: [
                    { text: t("menu.ir", "적외선 (IR)"), value: "ir" },
                    { text: t("menu.dms", "거리 (DMS)"), value: "dms" },
                    { text: t("menu.touch", "터치"), value: "touch" },
                    { text: t("menu.brightness", "밝기"), value: "brightness" },
                    { text: t("menu.color", "컬러 (0~6)"), value: "color" },
                    { text: t("menu.temperature", "온도"), value: "temperature" },
                    { text: t("menu.magnet", "자석"), value: "magnet" },
                    { text: t("menu.motion", "인체 감지"), value: "motion" },
                    { text: t("menu.moisture", "습도"), value: "moisture" },
                    { text: t("menu.user", "사용자 장치 (아날로그)"), value: "user" }
                  ]
                },
                colorName: {
                  acceptReporters: false,
                  items: [
                    { text: t("menu.white", "흰색"), value: "white" },
                    { text: t("menu.black", "검정"), value: "black" },
                    { text: t("menu.red", "빨강"), value: "red" },
                    { text: t("menu.green", "초록"), value: "green" },
                    { text: t("menu.blue", "파랑"), value: "blue" },
                    { text: t("menu.yellow", "노랑"), value: "yellow" }
                  ]
                },
                ledModule: {
                  acceptReporters: false,
                  items: [
                    { text: t("menu.ledBoth", "모두 켜기"), value: "both" },
                    { text: t("menu.ledLeft", "왼쪽만"), value: "left" },
                    { text: t("menu.ledRight", "오른쪽만"), value: "right" },
                    { text: t("menu.ledOff", "모두 끄기"), value: "off" }
                  ]
                },
                motionStop: {
                  acceptReporters: false,
                  items: [
                    { text: t("menu.stopUnit", "현재 동작이 끝나면"), value: "unit" },
                    { text: t("menu.stopKeyframe", "현재 키프레임에서"), value: "keyframe" },
                    { text: t("menu.stopNow", "즉시"), value: "now" }
                  ]
                },
                byteSize: { acceptReporters: false, items: ["1", "2", "4"] }
              }
            };
          }
          _noteMenu() {
            const names = ["도", "도#", "레", "레#", "미", "파", "파#", "솔", "솔#", "라", "라#", "시"];
            const items = [];
            for (let i = 0; i <= 51; i++) {
              const octave = Math.floor(i / 12) + 1;
              items.push({ text: `${i} (${names[i % 12]}${octave})`, value: String(i) });
            }
            return items;
          }
          // ------------------------------------------------------------------
          // connection
          // ------------------------------------------------------------------
          // Button callbacks (TurboWarp calls these directly; scratch-gui routes
          // the toolbox button through runtime.emit('CM550_CONNECT', kind)).
          connectUsbButton() {
            return this._connect("usb");
          }
          connectBleButton() {
            return this._connect("ble");
          }
          /** @param {'usb'|'ble'|object} kind - see CM550Device.connect */
          async _connect(kind) {
            try {
              await this.device.connect(kind);
              this.device.lastError = "";
            } catch (e) {
              this.device.lastError = e.message || String(e);
            }
            if (this.device.connected) this.device.scanMotors().catch(() => {
            });
          }
          _dxlIdMenu() {
            const desc = this.device.motorDesc;
            const found = this.device.motors.map((m) => ({
              text: `${m.id} · ${desc.labels[m.id] || modelName(m.model)}`,
              value: String(m.id)
            }));
            const used = new Set(this.device.motors.map((m) => m.id));
            const rest = [];
            for (let id = 1; id <= 30; id++) if (!used.has(id)) rest.push(String(id));
            return found.concat(rest);
          }
          _dxlModuleMenu() {
            const pairs = this.device.motorDesc.pairs;
            const items = pairs.map((p, i) => ({
              text: `모듈 ${i + 1} (ID ${p.a}·${p.b})`,
              value: `${p.a},${p.b}`
            }));
            const used = new Set(items.map((x) => x.value));
            for (let a = 1; a <= 15; a += 2) {
              const value = `${a},${a + 1}`;
              if (!used.has(value)) items.push({ text: `ID ${a}·${a + 1}`, value });
            }
            return items;
          }
          _moduleIds(value) {
            const [a, b] = String(value).split(",").map((x) => num(x));
            return [a || 1, b || (a || 1) + 1];
          }
          connect(args) {
            return this._connect(args.KIND === "ble" ? "ble" : "usb");
          }
          disconnect() {
            return this.device.disconnect();
          }
          isConnected() {
            return this.device.connected;
          }
          lastError() {
            return this.device.lastError || "";
          }
          async _stopAll() {
            if (!this.device.connected) return;
            try {
              await this.device.stopMotion(MOTION_STOP.NOW);
              for (const id of Object.keys(this.device._modeCache)) {
                if (this.device._modeCache[id] === OP_MODE.VELOCITY) {
                  await this.device.writeDXL(Number(id), DXL.GOAL_VELOCITY, 0);
                }
              }
            } catch (e) {
            }
          }
          /**
           * Run a device action; on failure store the message and resolve quietly.
           * @param fn
           * @param fallback
           */
          async _guard(fn, fallback) {
            if (!this.device.connected) {
              this.device.lastError = t("errNotConnected", "CM-550이 연결되어 있지 않습니다.");
              this._reportError(this.device.lastError);
              return fallback;
            }
            try {
              return await fn();
            } catch (e) {
              this.device.lastError = e.message || String(e);
              this._reportError(this.device.lastError);
              return fallback;
            }
          }
          /** Let the host show block errors (set `onError` to a callback). */
          _reportError(message) {
            if (typeof this.onError === "function") {
              try {
                this.onError(message);
              } catch (e) {
              }
            }
          }
          _onOff(v) {
            if (typeof v === "boolean") return v ? 1 : 0;
            const s = String(v).toLowerCase();
            return s === "on" || s === "1" || s === "true" || s === "켜기" ? 1 : 0;
          }
          // ------------------------------------------------------------------
          // DYNAMIXEL
          // ------------------------------------------------------------------
          dxlTorque(args) {
            const id = num(args.ID);
            return this._guard(async () => {
              await this.device.writeDXL(id, DXL.TORQUE_ENABLE, this._onOff(args.ONOFF));
            });
          }
          dxlMoveTo(args) {
            return this._guard(() => this.device.moveTo(num(args.ID), num(args.DEG), num(args.SPEED)));
          }
          dxlMoveToWait(args) {
            const id = num(args.ID);
            return this._guard(async () => {
              await this.device.moveTo(id, num(args.DEG), num(args.SPEED));
              await this.device.waitUntilStopped(id);
            });
          }
          dxlMoveTwo(args) {
            const ids = [num(args.ID1), num(args.ID2)];
            const degs = [num(args.DEG1), num(args.DEG2)];
            return this._guard(async () => {
              for (const id of ids) {
                await this.device.ensureMode(id, [OP_MODE.POSITION, OP_MODE.EXTENDED_POSITION]);
              }
              await this.device.syncWriteDXL(DXL.GOAL_POSITION, ids.map((id, i) => ({
                id,
                value: Math.round(degs[i] / 360 * 4096)
              })));
            });
          }
          dxlWheel(args) {
            return this._guard(() => this.device.setWheelSpeed(num(args.ID), num(args.SPEED)));
          }
          dxlWheelTwo(args) {
            const ids = [num(args.ID1), num(args.ID2)];
            const speeds = [num(args.SPEED1), num(args.SPEED2)];
            return this._guard(async () => {
              const items = [];
              for (let i = 0; i < 2; i++) {
                await this.device.setOperatingMode(ids[i], OP_MODE.VELOCITY);
                const limit = await this.device.getVelocityLimit(ids[i]);
                items.push({ id: ids[i], value: limit * clamp(speeds[i], -100, 100) / 100 });
              }
              await this.device.syncWriteDXL(DXL.GOAL_VELOCITY, items);
            });
          }
          dxlStop(args) {
            const id = num(args.ID);
            return this._guard(async () => {
              const mode = this.device._modeCache[id];
              if (mode === OP_MODE.VELOCITY) {
                await this.device.writeDXL(id, DXL.GOAL_VELOCITY, 0);
              } else {
                const pos = await this.device.readDXL(id, DXL.PRESENT_POSITION);
                await this.device.writeDXL(id, DXL.GOAL_POSITION, pos);
              }
            });
          }
          dxlSetMode(args) {
            const map = { position: OP_MODE.POSITION, velocity: OP_MODE.VELOCITY, extended: OP_MODE.EXTENDED_POSITION };
            const mode = map[args.MODE] || OP_MODE.POSITION;
            return this._guard(() => this.device.setOperatingMode(num(args.ID), mode));
          }
          dxlLed(args) {
            return this._guard(() => this.device.writeDXL(num(args.ID), DXL.LED, this._onOff(args.ONOFF)));
          }
          dxlAllTorque(args) {
            return this._guard(async () => {
              await this.device.writeCM(CM.DXL_TORQUE, this._onOff(args.ONOFF) ? 2 : 1);
              await delay(100);
            });
          }
          dxlRead(args) {
            const id = num(args.ID);
            return this._guard(async () => {
              switch (args.PROP) {
                case "velocity": {
                  const v = await this.device.readDXL(id, DXL.PRESENT_VELOCITY);
                  return Math.round(v * 0.229 * 100) / 100;
                }
                case "load": {
                  const v = await this.device.readDXL(id, DXL.PRESENT_LOAD);
                  return v / 10;
                }
                case "temperature":
                  return this.device.readDXL(id, DXL.PRESENT_TEMPERATURE);
                case "voltage": {
                  const v = await this.device.readDXL(id, DXL.PRESENT_INPUT_VOLTAGE);
                  return v / 10;
                }
                case "model":
                  return this.device.readDXL(id, DXL.MODEL_NUMBER);
                case "error":
                  return this.device.readDXL(id, DXL.HARDWARE_ERROR);
                case "position":
                default: {
                  const v = await this.device.readDXL(id, DXL.PRESENT_POSITION);
                  return Math.round(tickToDeg(v) * 10) / 10;
                }
              }
            }, 0);
          }
          dxlIsMoving(args) {
            return this._guard(async () => Boolean(await this.device.readDXL(num(args.ID), DXL.MOVING)), false);
          }
          dxlScan() {
            return this._guard(async () => {
              const motors = await this.device.scanMotors();
              this._dxlIds = motors.map((m) => m.id);
              return this._dxlIds.join(",");
            }, "");
          }
          dxlModuleMove(args) {
            const [a, b] = this._moduleIds(args.MODULE);
            return this.dxlMoveTwo({ ID1: a, DEG1: args.DEGA, ID2: b, DEG2: args.DEGB });
          }
          dxlModuleWheels(args) {
            const [a, b] = this._moduleIds(args.MODULE);
            return this.dxlWheelTwo({ ID1: a, SPEED1: args.SPA, ID2: b, SPEED2: args.SPB });
          }
          dxlGrip(args) {
            return this._guard(() => this.device.grip(num(args.ID), num(args.DEG), num(args.FORCE)));
          }
          dxlModelName(args) {
            return this._guard(async () => modelName(await this.device.requireModel(num(args.ID)).catch(() => this.device._modelCache[num(args.ID)])), "");
          }
          // ------------------------------------------------------------------
          // Poses (teach by hand). Kept in the project list "로봇 자세".
          // ------------------------------------------------------------------
          /** The pose list on the stage (created on first use when `create`). */
          _poseList(create) {
            const rt = this.runtime;
            const stage = rt && rt.getTargetForStage && rt.getTargetForStage();
            if (!stage) return null;
            let list = stage.lookupVariableById(POSE_LIST_ID) || stage.lookupVariableByNameAndType && stage.lookupVariableByNameAndType(POSE_LIST_NAME, "list");
            if (!list && create) {
              if (typeof this.onCreateList === "function") {
                try {
                  this.onCreateList(POSE_LIST_NAME, POSE_LIST_ID);
                } catch (e) {
                }
                list = stage.lookupVariableById(POSE_LIST_ID);
              }
              if (!list) list = stage.lookupOrCreateList(POSE_LIST_ID, POSE_LIST_NAME);
            }
            return list;
          }
          /** @returns {Array<Object<number, number>>} poses 1..n (empty {} for gaps) */
          getPoses() {
            const list = this._poseList(false);
            return list ? list.value.map(decodePose) : [];
          }
          _savePoses(poses) {
            const list = this._poseList(true);
            list.value = poses.map((p) => p && poseSize(p) ? encodePose(p) : "");
            list._monitorUpToDate = false;
            if (this.runtime.emitProjectChanged) this.runtime.emitProjectChanged();
            if (typeof this.onPosesChange === "function") this.onPosesChange(this.getPoses());
          }
          async _ensureMotors() {
            if (!this.device.motors.length) await this.device.scanMotors();
            if (!this.device.motors.length) throw new Error("다이나믹셀을 찾지 못했습니다. 전원과 케이블을 확인하세요.");
          }
          /** Record the present pose as pose `n` (1-based; 0/empty = append). */
          async recordPose(n) {
            await this._ensureMotors();
            const pose = await this.device.readPose();
            const poses = this.getPoses();
            const index = n >= 1 ? Math.floor(n) - 1 : poses.length;
            if (index > 200) throw new Error("자세 번호는 200번까지 쓸 수 있습니다.");
            while (poses.length < index) poses.push({});
            poses[index] = pose;
            this._savePoses(poses);
            return index + 1;
          }
          async playPose(n, seconds, wait = true) {
            const pose = this.getPoses()[Math.floor(n) - 1];
            if (!pose || !poseSize(pose)) throw new Error(`${Math.floor(n)}번 자세가 기록되어 있지 않습니다.`);
            const secs = clamp(Number(seconds) || 1, 0.1, 30);
            await this.device.movePose(pose, secs);
            if (wait) await delay(secs * 1e3 + 100);
          }
          async relaxJoints(ids, on) {
            await this._ensureMotors();
            await this.device.setJointsTorque(ids, on);
          }
          deletePose(n) {
            const poses = this.getPoses();
            poses.splice(Math.floor(n) - 1, 1);
            this._savePoses(poses);
          }
          poseRelax(args) {
            return this._guard(() => this.relaxJoints(null, args.STATE === "on"));
          }
          poseRecord(args) {
            return this._guard(() => this.recordPose(num(args.N)));
          }
          posePlay(args) {
            return this._guard(() => this.playPose(num(args.N), num(args.SECS)));
          }
          posePlayAll(args) {
            return this._guard(async () => {
              const poses = this.getPoses();
              for (let i = 0; i < poses.length; i++) {
                if (poseSize(poses[i])) await this.playPose(i + 1, num(args.SECS));
              }
            });
          }
          poseCount() {
            return this.getPoses().filter((p) => poseSize(p)).length;
          }
          poseClear() {
            if (this._poseList(false)) this._savePoses([]);
          }
          // ------------------------------------------------------------------
          // CM-550 built-ins
          // ------------------------------------------------------------------
          cmLedColor(args) {
            const mix = LED_MIX[args.COLOR] || LED_MIX.off;
            return this._guard(async () => {
              await this.device.writeCM(CM.LED_RED, mix.rgb[0]);
              await this.device.writeCM(CM.LED_GREEN, mix.rgb[1]);
              await this.device.writeCM(CM.LED_BLUE, mix.rgb[2]);
            });
          }
          cmLed(args) {
            const reg = { red: CM.LED_RED, green: CM.LED_GREEN, blue: CM.LED_BLUE }[args.COLOR] || CM.LED_RED;
            return this._guard(() => this.device.writeCM(reg, this._onOff(args.ONOFF)));
          }
          cmBuzzerNote(args) {
            const secs = clamp(num(args.SECS), 0.1, 5);
            return this._guard(async () => {
              await this.device.playNote(num(args.NOTE), secs);
              await delay(secs * 1e3);
            });
          }
          cmBuzzerMelody(args) {
            return this._guard(() => this.device.playMelody(num(args.INDEX)));
          }
          cmButton(args) {
            return this._guard(async () => {
              const s = await this.device.readCM(CM.BUTTON_STATUS);
              return args.BUTTON === "mode" ? s === 2 || s === 3 : s === 1 || s === 3;
            }, false);
          }
          cmTilt(args) {
            const reg = { roll: CM.ROLL, pitch: CM.PITCH, yaw: CM.YAW }[args.AXIS] || CM.ROLL;
            return this._guard(async () => await this.device.readCM(reg) / 100, 0);
          }
          cmGyro(args) {
            const reg = { x: CM.GYRO_X, y: CM.GYRO_Y, z: CM.GYRO_Z }[String(args.AXIS).toLowerCase()] || CM.GYRO_X;
            return this._guard(async () => await this.device.readCM(reg) / 100, 0);
          }
          cmAccel(args) {
            const reg = { x: CM.ACC_X, y: CM.ACC_Y, z: CM.ACC_Z }[String(args.AXIS).toLowerCase()] || CM.ACC_X;
            return this._guard(async () => await this.device.readCM(reg) / 100, 0);
          }
          cmVoltage() {
            return this._guard(async () => await this.device.readCM(CM.VOLTAGE) / 10, 0);
          }
          cmTemperature() {
            return this._guard(() => this.device.readCM(CM.TEMPERATURE), 0);
          }
          cmSoundCount() {
            return this._guard(() => this.device.readCM(CM.SOUND_COUNT), 0);
          }
          cmSoundReset() {
            return this._guard(() => this.device.writeCM(CM.SOUND_COUNT, 0));
          }
          cmDxlPower(args) {
            return this._guard(() => this.device.writeCM(CM.DXL_POWER, this._onOff(args.ONOFF)));
          }
          // ------------------------------------------------------------------
          // 5-pin ports
          // ------------------------------------------------------------------
          portSensor(args) {
            const spec = {
              ir: PORT.IR,
              dms: PORT.DMS,
              touch: PORT.TOUCH,
              brightness: PORT.BRIGHTNESS,
              color: PORT.COLOR,
              temperature: PORT.TEMPERATURE,
              magnet: PORT.MAGNET,
              motion: PORT.MOTION,
              moisture: PORT.MOISTURE,
              user: PORT.USER
            }[args.SENSOR] || PORT.IR;
            return this._guard(() => this.device.readPort(spec, num(args.PORT)), 0);
          }
          portTouch(args) {
            return this._guard(async () => Boolean(await this.device.readPort(PORT.TOUCH, num(args.PORT))), false);
          }
          portColor(args) {
            const idx = { white: 1, black: 2, red: 3, green: 4, blue: 5, yellow: 6 }[args.COLOR] || 0;
            return this._guard(async () => await this.device.readPort(PORT.COLOR, num(args.PORT)) === idx, false);
          }
          portLed(args) {
            const v = { off: 0, right: 1, left: 2, both: 3 }[args.STATE];
            return this._guard(() => this.device.writePort(PORT.LED, num(args.PORT), typeof v === "number" ? v : 3));
          }
          portServo(args) {
            const deg = clamp(num(args.DEG), 0, 300);
            const value = Math.round(deg / 300 * 1023);
            return this._guard(() => this.device.writePort(PORT.SERVO_POSITION, num(args.PORT), value));
          }
          portMotor(args) {
            const pct = clamp(num(args.SPEED), -100, 100);
            const mag = Math.round(Math.abs(pct) / 100 * 1023);
            const value = pct >= 0 ? 1024 + mag : mag;
            return this._guard(() => this.device.writePort(PORT.WHEEL, num(args.PORT), value));
          }
          // ------------------------------------------------------------------
          // motion
          // ------------------------------------------------------------------
          motionPlay(args) {
            return this._guard(() => this.device.playMotion(num(args.PAGE)));
          }
          motionPlayWait(args) {
            return this._guard(async () => {
              await this.device.playMotion(num(args.PAGE));
              await this.device.waitMotionDone();
            });
          }
          motionStop(args) {
            const how = { now: MOTION_STOP.NOW, keyframe: MOTION_STOP.KEYFRAME, unit: MOTION_STOP.UNIT }[args.HOW] || MOTION_STOP.UNIT;
            return this._guard(() => this.device.stopMotion(how));
          }
          motionSpeed(args) {
            return this._guard(() => this.device.writeCM(CM.MOTION_SPEED, clamp(num(args.PERCENT), 20, 200)));
          }
          motionNext(args) {
            return this._guard(() => this.device.writeCM(CM.MOTION_NEXT_PAGE, clamp(num(args.PAGE), 0, 65535)));
          }
          motionIsPlaying() {
            return this._guard(async () => Boolean(await this.device.readCM(CM.MOTION_STATUS)), false);
          }
          motionCount() {
            return this._guard(() => this.device.readCM(CM.MOTION_COUNT), 0);
          }
          // ------------------------------------------------------------------
          // advanced
          // ------------------------------------------------------------------
          rawWrite(args) {
            const size = [1, 2, 4].includes(num(args.SIZE)) ? num(args.SIZE) : 1;
            return this._guard(() => this.device.write(num(args.ID), num(args.ADDR), num(args.VALUE), size));
          }
          rawRead(args) {
            const size = [1, 2, 4].includes(num(args.SIZE)) ? num(args.SIZE) : 1;
            return this._guard(() => this.device.read(num(args.ID), num(args.ADDR), size, true), 0);
          }
        }
        return Scratch3CM550Blocks;
      };
      module.exports = { createExtension: createExtension2, EXTENSION_ID };
    }
  });

  // src/translations.js
  var require_translations = __commonJS({
    "src/translations.js"(exports, module) {
      var en = {
        "cm550.name": "CM-550",
        "cm550.btnUsb": "Connect via USB",
        "cm550.btnBle": "Connect via Bluetooth",
        "cm550.connect": "connect CM-550 via [KIND]",
        "cm550.disconnect": "disconnect CM-550",
        "cm550.isConnected": "CM-550 connected?",
        "cm550.lastError": "last error",
        "cm550.dxlTorque": "DYNAMIXEL [ID] torque [ONOFF]",
        "cm550.dxlMoveTo": "move DYNAMIXEL [ID] to [DEG]° (speed [SPEED] %)",
        "cm550.dxlMoveToWait": "move DYNAMIXEL [ID] to [DEG]° and wait (speed [SPEED] %)",
        "cm550.dxlMoveTwo": "move DYNAMIXEL [ID1] to [DEG1]° and [ID2] to [DEG2]° together",
        "cm550.dxlWheel": "DYNAMIXEL [ID] wheel speed [SPEED] %",
        "cm550.dxlWheelTwo": "left wheel [ID1] speed [SPEED1] % , right wheel [ID2] speed [SPEED2] %",
        "cm550.dxlStop": "stop DYNAMIXEL [ID]",
        "cm550.dxlSetMode": "set DYNAMIXEL [ID] mode to [MODE]",
        "cm550.dxlLed": "DYNAMIXEL [ID] LED [ONOFF]",
        "cm550.dxlAllTorque": "all DYNAMIXEL torque [ONOFF]",
        "cm550.dxlRead": "DYNAMIXEL [ID] [PROP]",
        "cm550.dxlIsMoving": "DYNAMIXEL [ID] moving?",
        "cm550.dxlScan": "connected DYNAMIXEL IDs",
        "cm550.dxlModuleMove": "dual-axis module [MODULE] axis A to [DEGA]° , axis B to [DEGB]°",
        "cm550.dxlModuleWheels": "dual-axis module [MODULE] wheels A [SPA] % , B [SPB] %",
        "cm550.dxlGrip": "grip with DYNAMIXEL [ID] at [FORCE] % force toward [DEG]°",
        "cm550.dxlModelName": "model name of DYNAMIXEL [ID]",
        "cm550.poseRelax": "all joints [STATE]",
        "cm550.poseRecord": "record the current pose as pose [N]",
        "cm550.posePlay": "move to pose [N] in [SECS] seconds",
        "cm550.posePlayAll": "play all recorded poses ( [SECS] s each)",
        "cm550.poseCount": "number of recorded poses",
        "cm550.poseClear": "delete all recorded poses",
        "cm550.menu.relaxOff": "relax (move by hand)",
        "cm550.menu.relaxOn": "stiffen (hold pose)",
        "cm550.cmLedColor": "set CM-550 LED colour to [COLOR]",
        "cm550.menu.mix.red": "red",
        "cm550.menu.mix.green": "green",
        "cm550.menu.mix.blue": "blue",
        "cm550.menu.mix.yellow": "yellow",
        "cm550.menu.mix.cyan": "cyan",
        "cm550.menu.mix.magenta": "magenta",
        "cm550.menu.mix.white": "white",
        "cm550.menu.mix.off": "off",
        "cm550.cmLed": "CM-550 LED [COLOR] [ONOFF]",
        "cm550.cmBuzzerNote": "play note [NOTE] for [SECS] seconds",
        "cm550.cmBuzzerMelody": "play melody [INDEX]",
        "cm550.cmButton": "[BUTTON] button pressed?",
        "cm550.cmTilt": "tilt [AXIS] (°)",
        "cm550.cmGyro": "gyro [AXIS] (°/s)",
        "cm550.cmAccel": "acceleration [AXIS] (G)",
        "cm550.cmVoltage": "battery voltage (V)",
        "cm550.cmTemperature": "controller temperature (°C)",
        "cm550.cmSoundCount": "sound count",
        "cm550.cmSoundReset": "reset sound count",
        "cm550.cmDxlPower": "DYNAMIXEL power [ONOFF]",
        "cm550.portSensor": "port [PORT] [SENSOR] value",
        "cm550.portTouch": "port [PORT] touch sensor pressed?",
        "cm550.portColor": "port [PORT] color sensor sees [COLOR]?",
        "cm550.portLed": "port [PORT] LED module [STATE]",
        "cm550.portServo": "move port [PORT] servo to [DEG]°",
        "cm550.portMotor": "port [PORT] geared motor speed [SPEED] %",
        "cm550.motionPlay": "play motion [PAGE]",
        "cm550.motionPlayWait": "play motion [PAGE] and wait until done",
        "cm550.motionStop": "stop motion [HOW]",
        "cm550.motionSpeed": "set motion speed to [PERCENT] %",
        "cm550.motionNext": "set next motion page to [PAGE]",
        "cm550.motionIsPlaying": "motion playing?",
        "cm550.motionCount": "number of stored motions",
        "cm550.rawWrite": "write [VALUE] to device [ID] address [ADDR] ([SIZE] bytes)",
        "cm550.rawRead": "device [ID] address [ADDR] ([SIZE] bytes)",
        "cm550.errNotConnected": "CM-550 is not connected.",
        "cm550.menu.usb": "USB",
        "cm550.menu.ble": "Bluetooth",
        "cm550.menu.on": "on",
        "cm550.menu.off": "off",
        "cm550.menu.modePosition": "position (joint)",
        "cm550.menu.modeVelocity": "wheel (continuous)",
        "cm550.menu.modeExtended": "extended position (multi-turn)",
        "cm550.menu.propPosition": "position (°)",
        "cm550.menu.propVelocity": "velocity (rpm)",
        "cm550.menu.propLoad": "load (%)",
        "cm550.menu.propTemperature": "temperature (°C)",
        "cm550.menu.propVoltage": "voltage (V)",
        "cm550.menu.propModel": "model number",
        "cm550.menu.propError": "hardware error",
        "cm550.menu.red": "red",
        "cm550.menu.green": "green",
        "cm550.menu.blue": "blue",
        "cm550.menu.roll": "roll",
        "cm550.menu.pitch": "pitch",
        "cm550.menu.yaw": "yaw",
        "cm550.menu.ir": "IR",
        "cm550.menu.dms": "distance (DMS)",
        "cm550.menu.touch": "touch",
        "cm550.menu.brightness": "brightness",
        "cm550.menu.color": "color (0-6)",
        "cm550.menu.temperature": "temperature",
        "cm550.menu.magnet": "magnet",
        "cm550.menu.motion": "motion (PIR)",
        "cm550.menu.moisture": "moisture",
        "cm550.menu.user": "user device (analog)",
        "cm550.menu.white": "white",
        "cm550.menu.black": "black",
        "cm550.menu.yellow": "yellow",
        "cm550.menu.ledBoth": "both on",
        "cm550.menu.ledLeft": "left only",
        "cm550.menu.ledRight": "right only",
        "cm550.menu.ledOff": "both off",
        "cm550.menu.stopUnit": "after current unit",
        "cm550.menu.stopKeyframe": "at current key frame",
        "cm550.menu.stopNow": "immediately",
        "gui.extension.cm550.description": "Control a ROBOTIS CM-550 and DYNAMIXEL servos over USB or Bluetooth."
      };
      var ko = {
        "gui.extension.cm550.description": "ROBOTIS CM-550 컨트롤러와 다이나믹셀을 USB 또는 블루투스로 제어합니다."
      };
      module.exports = { en, ko };
    }
  });

  // src/python-generator.js
  var require_python_generator = __commonJS({
    "src/python-generator.js"(exports, module) {
      var INDENT = "    ";
      var PY_KEYWORDS = /* @__PURE__ */ new Set([
        "False",
        "None",
        "True",
        "and",
        "as",
        "assert",
        "async",
        "await",
        "break",
        "class",
        "continue",
        "def",
        "del",
        "elif",
        "else",
        "except",
        "finally",
        "for",
        "from",
        "global",
        "if",
        "import",
        "in",
        "is",
        "lambda",
        "nonlocal",
        "not",
        "or",
        "pass",
        "raise",
        "return",
        "try",
        "while",
        "with",
        "yield",
        // names provided by `from cm550 import *` or builtins we emit
        "cm",
        "dxl",
        "port",
        "motion",
        "wait",
        "timer",
        "reset_timer",
        "key_pressed",
        "broadcast",
        "stop_all",
        "start",
        "answer",
        "print",
        "input",
        "len",
        "str",
        "int",
        "round",
        "abs",
        "range",
        "math",
        "random",
        "list",
        "when_flag_clicked",
        "when_key_pressed",
        "when_broadcast",
        "when_clicked"
      ]);
      var pyString = (s) => JSON.stringify(String(s));
      var isNumeric = (s) => {
        if (typeof s === "number") return Number.isFinite(s);
        return /^-?(0|[1-9]\d*)(\.\d+)?$/.test(String(s)) || /^-?\.\d+$/.test(String(s));
      };
      var formatNumber = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return "0";
        return String(n);
      };
      var stripOuter = (s) => {
        if (!s.startsWith("(") || !s.endsWith(")")) return s;
        let depth = 0;
        let inStr = false;
        for (let i = 0; i < s.length; i++) {
          const c = s[i];
          if (inStr) {
            if (c === "\\") i++;
            else if (c === '"') inStr = false;
            continue;
          }
          if (c === '"') inStr = true;
          else if (c === "(") depth++;
          else if (c === ")") {
            depth--;
            if (depth === 0 && i !== s.length - 1) return s;
          }
        }
        return s.slice(1, -1);
      };
      var sanitizeIdentifier = (name, fallback) => {
        let id = String(name || "").trim().replace(/[^\p{L}\p{N}_]+/gu, "_").replace(/^_+|_+$/g, "");
        if (!id) id = fallback;
        if (/^\p{N}/u.test(id)) id = `_${id}`;
        if (PY_KEYWORDS.has(id)) id = `${id}_`;
        return id;
      };
      var parseJSON = (s, fallback) => {
        if (Array.isArray(s)) return s;
        try {
          return JSON.parse(s);
        } catch (e) {
          return fallback;
        }
      };
      var MATHOP = {
        "abs": (x) => `abs(${x})`,
        "floor": (x) => `math.floor(${x})`,
        "ceiling": (x) => `math.ceil(${x})`,
        "sqrt": (x) => `math.sqrt(${x})`,
        "sin": (x) => `math.sin(math.radians(${x}))`,
        "cos": (x) => `math.cos(math.radians(${x}))`,
        "tan": (x) => `math.tan(math.radians(${x}))`,
        "asin": (x) => `math.degrees(math.asin(${x}))`,
        "acos": (x) => `math.degrees(math.acos(${x}))`,
        "atan": (x) => `math.degrees(math.atan(${x}))`,
        "ln": (x) => `math.log(${x})`,
        "log": (x) => `math.log10(${x})`,
        "e ^": (x) => `math.exp(${x})`,
        "10 ^": (x) => `(10 ** ${x})`
      };
      var PythonGenerator = class {
        constructor({ blocks, variables = [], targetName = "" }) {
          this.blocks = blocks || {};
          this.targetName = targetName;
          this.uses = /* @__PURE__ */ new Set();
          this.warnings = [];
          this.usedVarIds = /* @__PURE__ */ new Set();
          this.varNames = /* @__PURE__ */ new Map();
          this.varsById = /* @__PURE__ */ new Map();
          this.procNames = /* @__PURE__ */ new Map();
          this.takenNames = /* @__PURE__ */ new Set();
          this.fn = null;
          this.indent = 0;
          this.lines = [];
          for (const v of variables) this.varsById.set(v.id, v);
          for (const v of variables) {
            if (v.type === "broadcast_msg") continue;
            const fallback = v.type === "list" ? "my_list" : "var";
            this.varNames.set(v.id, this._uniqueName(sanitizeIdentifier(v.name, fallback)));
          }
        }
        _uniqueName(base) {
          let name = base;
          let i = 2;
          while (this.takenNames.has(name)) name = `${base}_${i++}`;
          this.takenNames.add(name);
          return name;
        }
        // ------------------------------------------------------------------
        // emission helpers
        // ------------------------------------------------------------------
        line(text) {
          this.lines.push(INDENT.repeat(this.indent) + text);
        }
        /**
         * Emit a nested statement stack (SUBSTACK etc). Emits `pass` when empty.
         * @param startId
         */
        body(startId) {
          this.indent++;
          const before = this.lines.length;
          this.stack(startId);
          if (this.lines.length === before) this.line("pass");
          this.indent--;
        }
        stack(startId) {
          let id = startId;
          let guard = 0;
          while (id && this.blocks[id] && guard++ < 1e4) {
            const block = this.blocks[id];
            this.statement(block);
            id = block.next;
          }
        }
        // ------------------------------------------------------------------
        // argument access
        // ------------------------------------------------------------------
        /**
         * Read an argument either from a field (dropdown without reporters)
         * or from an input (shadow literal or reporter block).
         * @param block
         * @param name
         * @returns {{literal: boolean, value?: string, code?: string}|null}
         */
        arg(block, name) {
          if (block.fields && block.fields[name]) {
            return { literal: true, value: block.fields[name].value };
          }
          const input = block.inputs && block.inputs[name];
          if (!input || !input.block) return null;
          const inner = this.blocks[input.block];
          if (!inner) return null;
          if (inner.shadow) {
            const fields = inner.fields || {};
            const keys = Object.keys(fields);
            return { literal: true, value: keys.length ? fields[keys[0]].value : "" };
          }
          return { literal: false, code: this.expr(inner) };
        }
        /**
         * Numeric argument.
         * @param block
         * @param name
         */
        num(block, name) {
          const a = this.arg(block, name);
          if (!a) return "0";
          if (!a.literal) return a.code;
          return isNumeric(a.value) ? formatNumber(a.value) : String(a.value).trim() === "" ? "0" : pyString(a.value);
        }
        /**
         * Any value: numbers stay numbers, other literals become strings.
         * @param block
         * @param name
         */
        val(block, name) {
          const a = this.arg(block, name);
          if (!a) return '""';
          if (!a.literal) return a.code;
          return isNumeric(a.value) ? formatNumber(a.value) : pyString(a.value);
        }
        /**
         * Text argument (always a string literal when literal).
         * @param block
         * @param name
         */
        text(block, name) {
          const a = this.arg(block, name);
          if (!a) return '""';
          return a.literal ? pyString(a.value) : a.code;
        }
        /**
         * Boolean input slot (hexagonal). Empty slot = False.
         * @param block
         * @param name
         */
        cond(block, name) {
          const a = this.arg(block, name);
          if (!a) return "False";
          if (a.literal) return a.value ? "True" : "False";
          return a.code;
        }
        /**
         * on/off menu -> True/False
         * @param block
         * @param name
         */
        onOff(block, name) {
          const a = this.arg(block, name);
          if (!a) return "True";
          if (!a.literal) return a.code;
          const s = String(a.value).toLowerCase();
          return s === "on" || s === "1" || s === "true" || s === "켜기" ? "True" : "False";
        }
        /**
         * Raw menu choice as a string literal (or expression).
         * @param block
         * @param name
         * @param map
         */
        choice(block, name, map) {
          const a = this.arg(block, name);
          if (!a) return '""';
          if (!a.literal) return a.code;
          const v = map && Object.prototype.hasOwnProperty.call(map, a.value) ? map[a.value] : a.value;
          return pyString(v);
        }
        /**
         * 1-based Scratch index -> 0-based Python index expression.
         * @param block
         * @param name
         */
        index(block, name) {
          const a = this.arg(block, name);
          if (!a) return "0";
          if (a.literal && isNumeric(a.value)) return formatNumber(Number(a.value) - 1);
          const code = a.literal ? pyString(a.value) : a.code;
          return `${code} - 1`;
        }
        varName(field) {
          if (!field) return "var";
          const id = field.id;
          if (id && this.varNames.has(id)) {
            this.usedVarIds.add(id);
            return this.varNames.get(id);
          }
          const name = sanitizeIdentifier(field.value, "var");
          if (id) {
            this.varNames.set(id, name);
            this.usedVarIds.add(id);
            if (!this.varsById.has(id)) this.varsById.set(id, { id, name: field.value, type: "", value: 0 });
          }
          return name;
        }
        assign(name) {
          if (this.fn && this.fn.isFunction) this.fn.assigned.add(name);
        }
        unsupportedExpr(block) {
          this.warnings.push(block.opcode);
          return "None";
        }
        // ------------------------------------------------------------------
        // expressions (reporters / booleans)
        // ------------------------------------------------------------------
        expr(block) {
          const op = block.opcode;
          if (op.startsWith("cm550_")) return this.cm550Expr(block, op.slice(6));
          switch (op) {
            // AI 학습 (Dynamic Makers)
            case "dmai_aiLabel":
              this.uses.add("ai");
              return "ai.label()";
            case "dmai_aiIs":
              this.uses.add("ai");
              return `(ai.label() == ${this.choice(block, "CLASS")})`;
            case "dmai_aiConfidence":
              this.uses.add("ai");
              return `ai.confidence(${this.choice(block, "CLASS")})`;
            // operators
            case "operator_add":
              return `(${this.num(block, "NUM1")} + ${this.num(block, "NUM2")})`;
            case "operator_subtract":
              return `(${this.num(block, "NUM1")} - ${this.num(block, "NUM2")})`;
            case "operator_multiply":
              return `(${this.num(block, "NUM1")} * ${this.num(block, "NUM2")})`;
            case "operator_divide":
              return `(${this.num(block, "NUM1")} / ${this.num(block, "NUM2")})`;
            case "operator_mod":
              return `(${this.num(block, "NUM1")} % ${this.num(block, "NUM2")})`;
            case "operator_round":
              return `round(${stripOuter(this.num(block, "NUM"))})`;
            case "operator_random": {
              this.uses.add("random");
              const a = this.arg(block, "FROM");
              const b = this.arg(block, "TO");
              const decimal = [a, b].some((x) => x && x.literal && String(x.value).includes("."));
              const fn = decimal ? "random.uniform" : "random.randint";
              return `${fn}(${stripOuter(this.num(block, "FROM"))}, ${stripOuter(this.num(block, "TO"))})`;
            }
            case "operator_gt":
              return `(${this.val(block, "OPERAND1")} > ${this.val(block, "OPERAND2")})`;
            case "operator_lt":
              return `(${this.val(block, "OPERAND1")} < ${this.val(block, "OPERAND2")})`;
            case "operator_equals":
              return `(${this.val(block, "OPERAND1")} == ${this.val(block, "OPERAND2")})`;
            case "operator_and":
              return `(${this.cond(block, "OPERAND1")} and ${this.cond(block, "OPERAND2")})`;
            case "operator_or":
              return `(${this.cond(block, "OPERAND1")} or ${this.cond(block, "OPERAND2")})`;
            case "operator_not":
              return `(not ${this.cond(block, "OPERAND")})`;
            case "operator_join": {
              const s = (x) => x.startsWith('"') ? x : `str(${stripOuter(x)})`;
              return `(${s(this.text(block, "STRING1"))} + ${s(this.text(block, "STRING2"))})`;
            }
            case "operator_letter_of":
              return `str(${stripOuter(this.text(block, "STRING"))})[${stripOuter(this.index(block, "LETTER"))}]`;
            case "operator_length":
              return `len(str(${stripOuter(this.text(block, "STRING"))}))`;
            case "operator_contains":
              return `(${this.text(block, "STRING2")} in str(${stripOuter(this.text(block, "STRING1"))}))`;
            case "operator_mathop": {
              const opName = block.fields && block.fields.OPERATOR ? block.fields.OPERATOR.value : "abs";
              const f = MATHOP[opName] || MATHOP.abs;
              if (opName !== "abs") this.uses.add("math");
              return f(stripOuter(this.num(block, "NUM")));
            }
            // data
            case "data_variable":
              return this.varName(block.fields.VARIABLE);
            case "data_listcontents":
              return this.varName(block.fields.LIST);
            case "data_itemoflist":
              return `${this.varName(block.fields.LIST)}[${stripOuter(this.index(block, "INDEX"))}]`;
            case "data_itemnumoflist":
              return `(${this.varName(block.fields.LIST)}.index(${stripOuter(this.val(block, "ITEM"))}) + 1)`;
            case "data_lengthoflist":
              return `len(${this.varName(block.fields.LIST)})`;
            case "data_listcontainsitem":
              return `(${this.val(block, "ITEM")} in ${this.varName(block.fields.LIST)})`;
            // sensing
            case "sensing_timer":
              return "timer()";
            case "sensing_answer":
              return "answer";
            case "sensing_keypressed":
              return `key_pressed(${this.text(block, "KEY_OPTION")})`;
            // custom block parameters
            case "argument_reporter_string_number":
            case "argument_reporter_boolean": {
              const label = block.fields && block.fields.VALUE ? block.fields.VALUE.value : "arg";
              if (this.fn && this.fn.params && this.fn.params.has(label)) return this.fn.params.get(label);
              return sanitizeIdentifier(label, "arg");
            }
            default:
              return this.unsupportedExpr(block);
          }
        }
        cm550Expr(block, op) {
          const id = () => stripOuter(this.num(block, "ID"));
          const portOf = () => `port(${stripOuter(this.num(block, "PORT"))})`;
          switch (op) {
            case "isConnected":
              return "cm.is_connected()";
            case "lastError":
              return "cm.last_error()";
            case "dxlRead": {
              const prop = block.fields && block.fields.PROP ? block.fields.PROP.value : "position";
              const method = {
                position: "position",
                velocity: "velocity",
                load: "load",
                temperature: "temperature",
                voltage: "voltage",
                model: "model",
                error: "hardware_error"
              }[prop] || "position";
              return `dxl.${method}(${id()})`;
            }
            case "dxlIsMoving":
              return `dxl.is_moving(${id()})`;
            case "dxlModelName":
              return `dxl.model_name(${id()})`;
            case "poseCount":
              return "pose.count()";
            case "dxlScan":
              return "dxl.scan()";
            case "cmButton":
              return `cm.button_pressed(${this.choice(block, "BUTTON")})`;
            case "cmTilt": {
              const axis = block.fields && block.fields.AXIS ? block.fields.AXIS.value : "roll";
              return `cm.imu.${["roll", "pitch", "yaw"].includes(axis) ? axis : "roll"}()`;
            }
            case "cmGyro":
              return `cm.imu.gyro(${this.choice(block, "AXIS")})`;
            case "cmAccel":
              return `cm.imu.accel(${this.choice(block, "AXIS")})`;
            case "cmVoltage":
              return "cm.voltage()";
            case "cmTemperature":
              return "cm.temperature()";
            case "cmSoundCount":
              return "cm.sound_count()";
            case "portSensor": {
              const sensor = block.fields && block.fields.SENSOR ? block.fields.SENSOR.value : "ir";
              const method = {
                ir: "ir",
                dms: "dms",
                touch: "touch",
                brightness: "brightness",
                color: "color_code",
                temperature: "temperature",
                magnet: "magnet",
                motion: "motion",
                moisture: "moisture",
                user: "analog"
              }[sensor] || "ir";
              return `${portOf()}.${method}()`;
            }
            case "portTouch":
              return `${portOf()}.touched()`;
            case "portColor":
              return `(${portOf()}.color() == ${this.choice(block, "COLOR")})`;
            case "motionIsPlaying":
              return "motion.is_playing()";
            case "motionCount":
              return "motion.count()";
            case "rawRead":
              return `cm.read(${stripOuter(this.num(block, "ID"))}, ${stripOuter(this.num(block, "ADDR"))}, size=${stripOuter(this.num(block, "SIZE"))})`;
            default:
              return this.unsupportedExpr(block);
          }
        }
        // ------------------------------------------------------------------
        // statements
        // ------------------------------------------------------------------
        statement(block) {
          const op = block.opcode;
          if (op.startsWith("cm550_")) {
            this.cm550Statement(block, op.slice(6));
            return;
          }
          if (op === "dmai_aiSwitch") {
            this.uses.add("ai");
            this.line(this.choice(block, "STATE") === '"off"' ? "ai.stop()" : "ai.start()");
            return;
          }
          const a = (n) => stripOuter(this.num(block, n));
          switch (op) {
            // control
            case "control_wait":
              this.line(`wait(${a("DURATION")})`);
              break;
            case "control_repeat": {
              const t = this.arg(block, "TIMES");
              const times = t && t.literal && isNumeric(t.value) ? String(Math.max(0, Math.round(Number(t.value)))) : `int(${stripOuter(this.num(block, "TIMES"))})`;
              this.line(`for _ in range(${times}):`);
              this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
              break;
            }
            case "control_forever":
              this.line("while True:");
              this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
              break;
            case "control_if":
              this.line(`if ${stripOuter(this.cond(block, "CONDITION"))}:`);
              this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
              break;
            case "control_if_else":
              this.line(`if ${stripOuter(this.cond(block, "CONDITION"))}:`);
              this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
              this.line("else:");
              this.body(block.inputs.SUBSTACK2 && block.inputs.SUBSTACK2.block);
              break;
            case "control_wait_until":
              this.line(`while not ${this.cond(block, "CONDITION")}:`);
              this.indent++;
              this.line("wait(0.01)");
              this.indent--;
              break;
            case "control_repeat_until":
              this.line(`while not ${this.cond(block, "CONDITION")}:`);
              this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
              break;
            case "control_while":
              this.line(`while ${stripOuter(this.cond(block, "CONDITION"))}:`);
              this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
              break;
            case "control_stop": {
              const opt = block.fields && block.fields.STOP_OPTION ? block.fields.STOP_OPTION.value : "all";
              if (opt === "all") this.line("stop_all()");
              else if (opt === "this script") this.line(this.fn && this.fn.isFunction ? "return" : "stop_all()");
              else this.line("# 이 스프라이트의 다른 스크립트 멈추기 (Python에서는 지원하지 않음)");
              break;
            }
            // events
            case "event_broadcast":
              this.line(`broadcast(${this.text(block, "BROADCAST_INPUT")})`);
              break;
            case "event_broadcastandwait":
              this.line(`broadcast(${this.text(block, "BROADCAST_INPUT")}, wait=True)`);
              break;
            // data
            case "data_setvariableto": {
              const name = this.varName(block.fields.VARIABLE);
              this.assign(name);
              this.line(`${name} = ${stripOuter(this.val(block, "VALUE"))}`);
              break;
            }
            case "data_changevariableby": {
              const name = this.varName(block.fields.VARIABLE);
              this.assign(name);
              this.line(`${name} += ${stripOuter(this.num(block, "VALUE"))}`);
              break;
            }
            case "data_showvariable":
            case "data_hidevariable":
            case "data_showlist":
            case "data_hidelist":
              break;
            // stage-only display, nothing to do in Python
            case "data_addtolist":
              this.line(`${this.varName(block.fields.LIST)}.append(${stripOuter(this.val(block, "ITEM"))})`);
              break;
            case "data_deleteoflist": {
              const lst = this.varName(block.fields.LIST);
              const idx = this.arg(block, "INDEX");
              if (idx && idx.literal && idx.value === "all") this.line(`${lst}.clear()`);
              else if (idx && idx.literal && idx.value === "last") this.line(`${lst}.pop()`);
              else this.line(`del ${lst}[${stripOuter(this.index(block, "INDEX"))}]`);
              break;
            }
            case "data_deletealloflist":
              this.line(`${this.varName(block.fields.LIST)}.clear()`);
              break;
            case "data_insertatlist":
              this.line(`${this.varName(block.fields.LIST)}.insert(${stripOuter(this.index(block, "INDEX"))}, ${stripOuter(this.val(block, "ITEM"))})`);
              break;
            case "data_replaceitemoflist":
              this.line(`${this.varName(block.fields.LIST)}[${stripOuter(this.index(block, "INDEX"))}] = ${stripOuter(this.val(block, "ITEM"))}`);
              break;
            // sensing
            case "sensing_resettimer":
              this.line("reset_timer()");
              break;
            case "sensing_askandwait":
              this.assign("answer");
              this.line(`answer = input(${stripOuter(this.text(block, "QUESTION"))})`);
              break;
            // looks: map speech to print so students see output
            case "looks_say":
            case "looks_think":
              this.line(`print(${stripOuter(this.val(block, "MESSAGE"))})`);
              break;
            case "looks_sayforsecs":
            case "looks_thinkforsecs":
              this.line(`print(${stripOuter(this.val(block, "MESSAGE"))})`);
              this.line(`wait(${a("SECS")})`);
              break;
            // custom blocks
            case "procedures_call":
              this.procedureCall(block);
              break;
            default:
              this.warnings.push(op);
              this.line(`# [변환 안 됨] ${op}`);
          }
        }
        cm550Statement(block, op) {
          const n = (name) => stripOuter(this.num(block, name));
          const id = () => n("ID");
          const portOf = () => `port(${n("PORT")})`;
          switch (op) {
            case "connect":
              this.line(`cm.connect(${this.choice(block, "KIND")})`);
              break;
            case "disconnect":
              this.line("cm.disconnect()");
              break;
            case "dxlTorque":
              this.line(`dxl.torque(${id()}, ${this.onOff(block, "ONOFF")})`);
              break;
            case "dxlMoveTo":
              this.line(`dxl.move_to(${id()}, ${n("DEG")}, speed=${n("SPEED")})`);
              break;
            case "dxlMoveToWait":
              this.line(`dxl.move_to(${id()}, ${n("DEG")}, speed=${n("SPEED")}, wait=True)`);
              break;
            case "dxlMoveTwo":
              this.line(`dxl.move_together({${n("ID1")}: ${n("DEG1")}, ${n("ID2")}: ${n("DEG2")}})`);
              break;
            case "dxlWheel":
              this.line(`dxl.wheel(${id()}, ${n("SPEED")})`);
              break;
            case "dxlWheelTwo":
              this.line(`dxl.wheels(${n("ID1")}, ${n("SPEED1")}, ${n("ID2")}, ${n("SPEED2")})`);
              break;
            case "dxlStop":
              this.line(`dxl.stop(${id()})`);
              break;
            case "dxlModuleMove": {
              const [a, b] = this.moduleIds(block);
              this.line(`dxl.move_together({${a}: ${n("DEGA")}, ${b}: ${n("DEGB")}})`);
              break;
            }
            case "dxlModuleWheels": {
              const [a, b] = this.moduleIds(block);
              this.line(`dxl.wheels(${a}, ${n("SPA")}, ${b}, ${n("SPB")})`);
              break;
            }
            case "dxlGrip":
              this.line(`dxl.grip(${id()}, ${n("DEG")}, force=${n("FORCE")})`);
              break;
            case "dxlSetMode":
              this.line(`dxl.set_mode(${id()}, ${this.choice(block, "MODE", { velocity: "wheel" })})`);
              break;
            case "dxlLed":
              this.line(`dxl.led(${id()}, ${this.onOff(block, "ONOFF")})`);
              break;
            case "poseRelax":
              this.line(`pose.torque(${this.onOff(block, "STATE")})  # False = 힘 빼기, True = 힘 주기`);
              break;
            case "poseRecord":
              this.line(`pose.record(${this.num(block, "N")})`);
              break;
            case "posePlay":
              this.line(`pose.play(${this.num(block, "N")}, ${this.num(block, "SECS")})`);
              break;
            case "posePlayAll":
              this.line(`pose.play_all(${this.num(block, "SECS")})`);
              break;
            case "poseClear":
              this.line("pose.clear()");
              break;
            case "dxlAllTorque":
              this.line(`dxl.torque_all(${this.onOff(block, "ONOFF")})`);
              break;
            case "cmLedColor":
              this.line(`cm.led_color(${this.choice(block, "COLOR")})`);
              break;
            case "cmLed":
              this.line(`cm.led(${this.choice(block, "COLOR")}, ${this.onOff(block, "ONOFF")})`);
              break;
            case "cmBuzzerNote":
              this.line(`cm.play_note(${n("NOTE")}, ${n("SECS")})`);
              break;
            case "cmBuzzerMelody":
              this.line(`cm.play_melody(${n("INDEX")})`);
              break;
            case "cmSoundReset":
              this.line("cm.reset_sound_count()");
              break;
            case "cmDxlPower":
              this.line(`cm.dxl_power(${this.onOff(block, "ONOFF")})`);
              break;
            case "portLed":
              this.line(`${portOf()}.led(${this.choice(block, "STATE")})`);
              break;
            case "portServo":
              this.line(`${portOf()}.servo(${n("DEG")})`);
              break;
            case "portMotor":
              this.line(`${portOf()}.motor(${n("SPEED")})`);
              break;
            case "motionPlay":
              this.line(`motion.play(${n("PAGE")})`);
              break;
            case "motionPlayWait":
              this.line(`motion.play(${n("PAGE")}, wait=True)`);
              break;
            case "motionStop":
              this.line(`motion.stop(${this.choice(block, "HOW")})`);
              break;
            case "motionSpeed":
              this.line(`motion.set_speed(${n("PERCENT")})`);
              break;
            case "motionNext":
              this.line(`motion.set_next(${n("PAGE")})`);
              break;
            case "rawWrite":
              this.line(`cm.write(${n("ID")}, ${n("ADDR")}, ${n("VALUE")}, size=${n("SIZE")})`);
              break;
            default:
              this.warnings.push(`cm550_${op}`);
              this.line(`# [변환 안 됨] cm550_${op}`);
          }
        }
        /** "a,b" module menu value -> two id literals */
        moduleIds(block) {
          const a = this.arg(block, "MODULE");
          const parts = a && a.literal ? String(a.value).split(",") : ["1", "2"];
          return parts.slice(0, 2).map((x) => formatNumber(x));
        }
        // ------------------------------------------------------------------
        // custom blocks ("내 블록")
        // ------------------------------------------------------------------
        procInfo(mutation) {
          const proccode = mutation.proccode || "";
          if (!this.procNames.has(proccode)) {
            const words = proccode.split(/%[snb]/).map((s) => s.trim()).filter(Boolean).join("_");
            this.procNames.set(proccode, this._uniqueName(sanitizeIdentifier(words, "my_block")));
          }
          return {
            name: this.procNames.get(proccode),
            argumentIds: parseJSON(mutation.argumentids, []),
            argumentNames: parseJSON(mutation.argumentnames, [])
          };
        }
        procedureCall(block) {
          if (!block.mutation) {
            this.line("# [변환 안 됨] procedures_call");
            return;
          }
          const { name, argumentIds } = this.procInfo(block.mutation);
          const args = argumentIds.map((argId) => {
            const input = block.inputs && block.inputs[argId];
            if (!input || !input.block) return "False";
            return stripOuter(this.val(block, argId));
          });
          this.line(`${name}(${args.join(", ")})`);
        }
        procedureDefinition(hat) {
          const protoInput = hat.inputs && hat.inputs.custom_block;
          const proto = protoInput && this.blocks[protoInput.block];
          if (!proto || !proto.mutation) return;
          const { name, argumentNames } = this.procInfo(proto.mutation);
          const params = /* @__PURE__ */ new Map();
          const used = /* @__PURE__ */ new Set();
          for (const label of argumentNames) {
            let p = sanitizeIdentifier(label, "arg");
            while (used.has(p)) p = `${p}_`;
            used.add(p);
            params.set(label, p);
          }
          this.emitFunction(`def ${name}(${Array.from(params.values()).join(", ")}):`, hat.next, params);
        }
        /**
         * Emit `def ...:` + body, with `global` declarations for assigned variables.
         * @param header
         * @param bodyStartId
         * @param params
         * @param decorator
         */
        emitFunction(header, bodyStartId, params = /* @__PURE__ */ new Map(), decorator = null) {
          const saved = { lines: this.lines, fn: this.fn, indent: this.indent };
          this.lines = [];
          this.fn = { assigned: /* @__PURE__ */ new Set(), params, isFunction: true };
          this.indent = 1;
          this.stack(bodyStartId);
          const bodyLines = this.lines;
          const assigned = Array.from(this.fn.assigned).filter((v) => !Array.from(params.values()).includes(v));
          this.lines = saved.lines;
          this.fn = saved.fn;
          this.indent = saved.indent;
          if (decorator) this.line(decorator);
          this.line(header);
          if (assigned.length) this.line(`${INDENT}global ${assigned.join(", ")}`);
          if (bodyLines.length) this.lines.push(...bodyLines);
          else if (!assigned.length) this.line(`${INDENT}pass`);
          this.line("");
        }
        // ------------------------------------------------------------------
        // whole program
        // ------------------------------------------------------------------
        hatDecorator(hat) {
          switch (hat.opcode) {
            case "event_whenflagclicked":
              return "@when_flag_clicked";
            case "event_whenkeypressed":
              return `@when_key_pressed(${pyString(hat.fields.KEY_OPTION ? hat.fields.KEY_OPTION.value : "space")})`;
            case "event_whenbroadcastreceived":
              return `@when_broadcast(${pyString(hat.fields.BROADCAST_OPTION ? hat.fields.BROADCAST_OPTION.value : "")})`;
            case "event_whenthisspriteclicked":
            case "event_whenstageclicked":
              return "@when_clicked";
            case "dmai_aiWhen": {
              const c = hat.inputs && hat.inputs.CLASS && this.blocks[hat.inputs.CLASS.block];
              const name = c && c.fields ? Object.values(c.fields)[0].value : "";
              return `@ai.when_recognized(${pyString(name)})`;
            }
            default:
              return null;
          }
        }
        generate() {
          const tops = Object.values(this.blocks).filter((b) => b.topLevel && !b.shadow).sort((a, b) => (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0));
          const procedures = tops.filter((b) => b.opcode === "procedures_definition");
          const hats = tops.filter((b) => this.hatDecorator(b));
          const unknownHats = tops.filter((b) => b.opcode !== "procedures_definition" && !this.hatDecorator(b) && /^(event_when|control_start_as_clone|cm550_when)/.test(b.opcode));
          const loose = tops.length - procedures.length - hats.length - unknownHats.length;
          const flagHats = hats.filter((h) => h.opcode === "event_whenflagclicked");
          const simpleMain = flagHats.length === 1 && hats.length === 1;
          for (const p of procedures) this.procedureDefinition(p);
          if (simpleMain) {
            this.line("# 초록 깃발을 클릭했을 때");
            this.fn = { assigned: /* @__PURE__ */ new Set(), params: /* @__PURE__ */ new Map(), isFunction: false };
            const before = this.lines.length;
            this.stack(flagHats[0].next);
            if (this.lines.length === before) this.line("pass");
            this.fn = null;
          } else if (hats.length) {
            const counters = {};
            for (const hat of hats) {
              const base = {
                event_whenflagclicked: "on_start",
                event_whenkeypressed: "on_key",
                event_whenbroadcastreceived: "on_message",
                event_whenthisspriteclicked: "on_click",
                event_whenstageclicked: "on_click",
                dmai_aiWhen: "on_ai"
              }[hat.opcode];
              counters[base] = (counters[base] || 0) + 1;
              const fname = this._uniqueName(counters[base] === 1 ? base : `${base}_${counters[base]}`);
              this.emitFunction(`def ${fname}():`, hat.next, /* @__PURE__ */ new Map(), this.hatDecorator(hat));
            }
            this.line("# 위의 스크립트들을 동시에 실행합니다");
            this.line("start()");
          }
          for (const h of unknownHats) this.warnings.push(h.opcode);
          const header = [];
          header.push(`# 블록에서 자동으로 만들어진 Python 코드${this.targetName ? ` (${this.targetName})` : ""}`);
          header.push("from cm550 import *");
          if (this.uses.has("math")) header.push("import math");
          if (this.uses.has("random")) header.push("import random");
          header.push("");
          const varLines = [];
          for (const [id, name] of this.varNames) {
            if (!this.usedVarIds.has(id)) continue;
            const v = this.varsById.get(id) || {};
            if (v.type === "list") {
              const items = (Array.isArray(v.value) ? v.value : []).map((x) => isNumeric(x) ? formatNumber(x) : pyString(x));
              varLines.push(`${name} = [${items.join(", ")}]`);
            } else {
              const value = typeof v.value === "undefined" ? 0 : v.value;
              varLines.push(`${name} = ${isNumeric(value) ? formatNumber(value) : pyString(value)}`);
            }
          }
          if (varLines.length) header.push(...varLines, "");
          const notes = [];
          const uniqueWarnings = Array.from(new Set(this.warnings));
          if (uniqueWarnings.length) {
            notes.push(`# 참고: Python으로 바꾸지 못한 블록이 있습니다 — ${uniqueWarnings.join(", ")}`);
          }
          if (loose > 0) notes.push(`# 참고: 시작 블록에 연결되지 않은 블록 묶음 ${loose}개는 제외했습니다`);
          if (notes.length) header.push(...notes, "");
          if (!tops.length || !procedures.length && !hats.length) {
            header.push('# "초록 깃발을 클릭했을 때" 블록 아래에 블록을 연결하면 여기에 코드가 나타납니다');
          }
          const out = header.concat(this.lines);
          while (out.length && out[out.length - 1].trim() === "") out.pop();
          return `${out.join("\n")}
`;
        }
      };
      var generatePython = (opts) => new PythonGenerator(opts).generate();
      var fromVM = (vm) => {
        const target = vm && vm.editingTarget;
        if (!target) return { blocks: {}, variables: [], targetName: "" };
        const stage = vm.runtime.getTargetForStage ? vm.runtime.getTargetForStage() : null;
        const variables = [];
        const pushVars = (t) => {
          if (!t || !t.variables) return;
          for (const v of Object.values(t.variables)) {
            variables.push({ id: v.id, name: v.name, type: v.type, value: v.value });
          }
        };
        if (stage && stage !== target) pushVars(stage);
        pushVars(target);
        return {
          blocks: target.blocks._blocks,
          variables,
          targetName: target.isStage ? "무대" : target.getName()
        };
      };
      module.exports = { generatePython, fromVM, sanitizeIdentifier, stripOuter };
    }
  });

  // src/python-highlight.js
  var require_python_highlight = __commonJS({
    "src/python-highlight.js"(exports, module) {
      var KEYWORDS = /* @__PURE__ */ new Set([
        "def",
        "if",
        "else",
        "elif",
        "while",
        "for",
        "in",
        "not",
        "and",
        "or",
        "return",
        "global",
        "import",
        "from",
        "pass",
        "del",
        "True",
        "False",
        "None",
        "break",
        "continue"
      ]);
      var API = /* @__PURE__ */ new Set(["cm", "dxl", "port", "motion"]);
      var BUILTINS = /* @__PURE__ */ new Set([
        "print",
        "input",
        "range",
        "len",
        "str",
        "int",
        "round",
        "abs",
        "wait",
        "timer",
        "reset_timer",
        "key_pressed",
        "broadcast",
        "stop_all",
        "start",
        "math",
        "random"
      ]);
      var escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      var TOKEN = new RegExp([
        "(#[^\\n]*)",
        // comment
        '("(?:[^"\\\\\\n]|\\\\.)*")',
        // string
        "(@[\\p{L}\\p{N}_]+)",
        // decorator
        "((?<![\\p{L}\\p{N}_])-?\\d+(?:\\.\\d+)?)",
        // number
        "([\\p{L}_][\\p{L}\\p{N}_]*)"
        // identifier / keyword
      ].join("|"), "gu");
      var highlightPython = (src, cls = {}) => {
        const c = Object.assign({
          comment: "py-comment",
          string: "py-string",
          decorator: "py-decorator",
          number: "py-number",
          keyword: "py-keyword",
          api: "py-api",
          builtin: "py-builtin"
        }, cls);
        let out = "";
        let last = 0;
        const span = (kind, text) => `<span class="${c[kind]}">${escapeHtml(text)}</span>`;
        src.replace(TOKEN, (m, comment, string, deco, number, word, offset) => {
          out += escapeHtml(src.slice(last, offset));
          last = offset + m.length;
          if (comment) out += span("comment", m);
          else if (string) out += span("string", m);
          else if (deco) out += span("decorator", m);
          else if (number) out += span("number", m);
          else if (KEYWORDS.has(word)) out += span("keyword", m);
          else if (API.has(word)) out += span("api", m);
          else if (BUILTINS.has(word)) out += span("builtin", m);
          else out += escapeHtml(m);
          return m;
        });
        out += escapeHtml(src.slice(last));
        return out;
      };
      module.exports = { highlightPython, escapeHtml };
    }
  });

  // src/python-panel-dom.js
  var require_python_panel_dom = __commonJS({
    "src/python-panel-dom.js"(exports, module) {
      var { generatePython, fromVM } = require_python_generator();
      var { highlightPython } = require_python_highlight();
      var P = "cm550py";
      var CSS = `
.${P}-panel{position:absolute;top:0;right:0;bottom:0;z-index:30;display:flex;flex-direction:column;
  background:#fbfcfe;border-left:1px solid rgba(0,0,0,.15);box-shadow:-4px 0 12px rgba(0,0,0,.08);
  font-family:"Helvetica Neue",Helvetica,Arial,sans-serif}
.${P}-resizer{position:absolute;top:0;bottom:0;left:-3px;width:6px;cursor:col-resize}
.${P}-resizer:hover{background:rgba(46,124,246,.35)}
.${P}-header{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;background:#2e7cf6;color:#fff}
.${P}-title{font-weight:bold;font-size:.95rem;flex-shrink:0}
.${P}-sub{flex:1;min-width:0;font-size:.7rem;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.${P}-btn{flex-shrink:0;white-space:nowrap;padding:.2rem .6rem;border:1px solid rgba(255,255,255,.6);border-radius:.25rem;
  background:transparent;color:#fff;font-size:.75rem;cursor:pointer}
.${P}-btn:hover{background:rgba(255,255,255,.2)}
.${P}-scroll{display:flex;flex:1;overflow:auto;font:.8rem/1.5 "SFMono-Regular",Consolas,"D2Coding",Menlo,monospace}
.${P}-gutter,.${P}-code{margin:0;padding:.6rem 0;white-space:pre}
.${P}-gutter{flex-shrink:0;padding:.6rem;text-align:right;color:#9aa5b8;background:#f1f4f9;border-right:1px solid #e3e8f0;user-select:none}
.${P}-code{flex:1;padding:.6rem .75rem;color:#1f2a3c}
.${P}-tab{position:absolute;top:.75rem;right:0;z-index:30;padding:.6rem .3rem;border:0;border-radius:.5rem 0 0 .5rem;
  background:#2e7cf6;color:#fff;font-weight:bold;font-size:.8rem;writing-mode:vertical-rl;cursor:pointer}
.${P}-tab:hover{background:#1f5fc4}
.${P}-docked .${P}-panel{position:relative;top:auto;right:auto;bottom:auto;height:100%;box-shadow:none;border-left:1px solid #dde3ec}
.${P}-docked .${P}-tab{position:relative;top:auto;height:100%;border-radius:0;padding:.75rem .35rem}
.${P}-docked{display:flex;height:100%}
.py-comment{color:#6a7a8f;font-style:italic}.py-string{color:#b3541e}.py-decorator{color:#8a3ffc}
.py-number{color:#0f7b6c}.py-keyword{color:#c2185b;font-weight:bold}.py-api{color:#1f5fc4;font-weight:bold}
.py-builtin{color:#5c6bc0}
`;
      var store = {
        get(k, d) {
          try {
            const v = localStorage.getItem(k);
            return v === null ? d : JSON.parse(v);
          } catch (e) {
            return d;
          }
        },
        set(k, v) {
          try {
            localStorage.setItem(k, JSON.stringify(v));
          } catch (e) {
          }
        }
      };
      var el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
      };
      var mountPythonPanel2 = (vm, options = {}) => {
        if (typeof document === "undefined" || !vm || typeof vm.on !== "function") return;
        if (document.getElementById(`${P}-style`)) return;
        const style = el("style");
        style.id = `${P}-style`;
        style.textContent = CSS;
        document.head.appendChild(style);
        let open = store.get(`${P}.open`, true);
        let width = store.get(`${P}.width`, Math.round(Math.max(280, Math.min(380, window.innerWidth * 0.24))));
        let code = "";
        const panel = el("section", `${P}-panel`);
        panel.setAttribute("aria-label", "Python 코드");
        const resizer = el("div", `${P}-resizer`);
        const header = el("header", `${P}-header`);
        const copyBtn = el("button", `${P}-btn`, "복사");
        const closeBtn = el("button", `${P}-btn`, "닫기");
        header.append(
          el("span", `${P}-title`, "Python"),
          el("span", `${P}-sub`, "블록에서 자동 생성 · 읽기 전용"),
          copyBtn,
          closeBtn
        );
        const scroll = el("div", `${P}-scroll`);
        const gutter = el("pre", `${P}-gutter`);
        const pre = el("pre", `${P}-code`);
        scroll.append(gutter, pre);
        panel.append(resizer, header, scroll);
        const tab = el("button", `${P}-tab`, "Python");
        tab.title = "Python 코드 보기";
        if (options.accent) {
          header.style.background = options.accent;
          tab.style.background = options.accent;
        }
        const render = () => {
          panel.style.width = `${width}px`;
          panel.style.display = open ? "flex" : "none";
          tab.style.display = open ? "none" : "block";
          if (options.onToggle) options.onToggle(open);
        };
        const regenerate = () => {
          let next;
          try {
            next = generatePython(fromVM(vm));
          } catch (e) {
            next = `# Python 변환 중 오류가 발생했습니다
# ${e && e.message}
`;
          }
          if (next === code) return;
          code = next;
          const n = code.replace(/\n$/, "").split("\n").length;
          gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
          pre.innerHTML = highlightPython(code);
        };
        let timer = null;
        const schedule = () => {
          clearTimeout(timer);
          timer = setTimeout(regenerate, 150);
        };
        closeBtn.onclick = () => {
          open = false;
          store.set(`${P}.open`, open);
          render();
        };
        tab.onclick = () => {
          open = true;
          store.set(`${P}.open`, open);
          render();
        };
        copyBtn.onclick = () => {
          if (!navigator.clipboard) return;
          navigator.clipboard.writeText(code).then(() => {
            copyBtn.textContent = "복사됨";
            setTimeout(() => {
              copyBtn.textContent = "복사";
            }, 1500);
          }, () => {
          });
        };
        resizer.onmousedown = (e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startW = width;
          const move = (ev) => {
            width = Math.max(240, Math.min(900, startW + (startX - ev.clientX)));
            render();
          };
          const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
            store.set(`${P}.width`, width);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        };
        if (options.host) {
          options.host.classList.add(`${P}-docked`);
          options.host.append(tab, panel);
        } else {
          const attach = () => {
            const bg = document.querySelector(".blocklyMainBackground");
            const host = bg && bg.closest(".injectionDiv");
            if (host && panel.parentElement !== host) {
              host.append(panel, tab);
              schedule();
            }
          };
          setInterval(attach, 1e3);
          attach();
        }
        vm.on("PROJECT_CHANGED", schedule);
        vm.on("workspaceUpdate", schedule);
        vm.on("targetsUpdate", schedule);
        render();
        regenerate();
        return { regenerate: schedule, getCode: () => code };
      };
      module.exports = { mountPythonPanel: mountPythonPanel2 };
    }
  });

  // src/turbowarp-entry.js
  var { createExtension } = require_extension();
  var translations = require_translations();
  var { mountPythonPanel } = require_python_panel_dom();
  (function(Scratch2) {
    if (!Scratch2 || !Scratch2.extensions) {
      throw new Error("이 파일은 TurboWarp 사용자 정의 확장으로 불러와야 합니다.");
    }
    if (!Scratch2.extensions.unsandboxed) {
      throw new Error("CM-550 확장은 USB/블루투스 접근을 위해 샌드박스 해제(unsandboxed) 모드로 불러와야 합니다.");
    }
    if (Scratch2.translate && Scratch2.translate.setup) Scratch2.translate.setup(translations);
    const formatMessage = (msg) => Scratch2.translate(msg);
    const cast = Scratch2.Cast;
    const Cls = createExtension({
      ArgumentType: Scratch2.ArgumentType,
      BlockType: Scratch2.BlockType,
      formatMessage,
      cast
    });
    Scratch2.extensions.register(new Cls(Scratch2.vm.runtime));
    try {
      mountPythonPanel(Scratch2.vm);
    } catch (e) {
      console.warn("[CM-550] Python panel unavailable:", e);
    }
  })(typeof Scratch !== "undefined" ? Scratch : null);
})();
