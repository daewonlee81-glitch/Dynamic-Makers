/**
 * Transports that move raw bytes between the browser and a CM-550.
 *
 *  - WebSerialTransport    : USB cable (CM-550 enumerates as a USB CDC serial port)
 *  - WebBluetoothTransport : CM-550 built-in BLE (BT-410 compatible serial-over-BLE)
 *
 * Both expose: open(), close(), write(Uint8Array), onData(cb), onClose(cb), isOpen.
 */

const CM550_USB_FILTERS = [
    {usbVendorId: 0x0483}, // STMicroelectronics (CM-550 MCU: STM32F4 CDC)
    {usbVendorId: 0x16d0} // ROBOTIS (OpenCM / LN-101 family)
];

class WebSerialTransport {
    constructor (options = {}) {
        this.baudRate = options.baudRate || 1000000; // ignored by USB CDC, used by LN-101
        this.port = null;
        this.reader = null;
        this.writer = null;
        this._dataCb = null;
        this._closeCb = null;
        this._readLoop = null;
    }

    static get available () {
        return typeof navigator !== 'undefined' && Boolean(navigator.serial);
    }

    get isOpen () {
        return Boolean(this.port && this.writer);
    }

    get name () {
        return 'USB';
    }

    onData (cb) {
        this._dataCb = cb;
    }
    onClose (cb) {
        this._closeCb = cb;
    }

    async open () {
        if (!WebSerialTransport.available) {
            throw new Error('이 브라우저는 Web Serial을 지원하지 않습니다. Chrome 또는 Edge를 사용하세요.');
        }
        let port;
        try {
            port = await navigator.serial.requestPort({filters: CM550_USB_FILTERS});
        } catch (e) {
            // user may have a port with a different VID — retry without filters
            if (e && e.name === 'NotFoundError') {
                port = await navigator.serial.requestPort();
            } else {
                throw e;
            }
        }
        await port.open({baudRate: this.baudRate, bufferSize: 4096});
        this.port = port;
        this.writer = port.writable.getWriter();
        this._readLoop = this._startReadLoop();
    }

    async _startReadLoop () {
        while (this.port && this.port.readable) {
            this.reader = this.port.readable.getReader();
            try {
                for (;;) {
                    const {value, done} = await this.reader.read();
                    if (done) break;
                    if (value && this._dataCb) this._dataCb(value);
                }
            } catch (e) {
                // device unplugged or read error -> fall through to close
                break;
            } finally {
                try {
                    this.reader.releaseLock();
                } catch (e) { /* ignore */ }
                this.reader = null;
            }
        }
        await this._teardown();
    }

    async write (bytes) {
        if (!this.writer) throw new Error('USB가 연결되어 있지 않습니다.');
        await this.writer.write(bytes);
    }

    async close () {
        if (this.reader) {
            try {
                await this.reader.cancel();
            } catch (e) { /* ignore */ }
        }
        await this._teardown();
    }

    async _teardown () {
        const wasOpen = this.isOpen;
        if (this.writer) {
            try {
                this.writer.releaseLock();
            } catch (e) { /* ignore */ }
            this.writer = null;
        }
        if (this.port) {
            try {
                await this.port.close();
            } catch (e) { /* ignore */ }
            this.port = null;
        }
        if (wasOpen && this._closeCb) this._closeCb();
    }
}

/**
 * Serial-over-BLE profiles tried in order. Each entry: service UUID; the
 * write/notify characteristics are discovered from their properties so a
 * firmware that swaps the characteristic order still works.
 */
const BLE_PROFILES = [
    {service: '0000fff0-0000-1000-8000-00805f9b34fb'}, // BT-410 / common BLE-UART modules
    {service: '0000ffe0-0000-1000-8000-00805f9b34fb'}, // HM-10 style
    {service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e'} // Nordic UART Service
];

const BLE_CHUNK = 20; // safe ATT payload without MTU negotiation

class WebBluetoothTransport {
    constructor (options = {}) {
        this.namePrefix = options.namePrefix; // e.g. 'ROBOTIS' or undefined for all
        this.device = null;
        this.server = null;
        this.txChar = null; // we write here
        this.rxChar = null; // notifications arrive here
        this._dataCb = null;
        this._closeCb = null;
        this._onDisconnected = this._onDisconnected.bind(this);
        this._onNotify = this._onNotify.bind(this);
        this._writeQueue = Promise.resolve();
    }

    static get available () {
        return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
    }

    get isOpen () {
        return Boolean(this.server && this.server.connected && this.txChar);
    }

    get name () {
        return 'BLE';
    }

    onData (cb) {
        this._dataCb = cb;
    }
    onClose (cb) {
        this._closeCb = cb;
    }

    async open () {
        if (!WebBluetoothTransport.available) {
            throw new Error('이 브라우저는 Web Bluetooth를 지원하지 않습니다. Chrome 또는 Edge를 사용하세요.');
        }
        const optionalServices = BLE_PROFILES.map(p => p.service);
        const request = this.namePrefix ?
            {filters: [{namePrefix: this.namePrefix}], optionalServices} :
            {acceptAllDevices: true, optionalServices};
        const device = await navigator.bluetooth.requestDevice(request);
        device.addEventListener('gattserverdisconnected', this._onDisconnected);
        const server = await device.gatt.connect();

        let found = null;
        for (const profile of BLE_PROFILES) {
            try {
                const service = await server.getPrimaryService(profile.service);
                const chars = await service.getCharacteristics();
                const tx = chars.find(c => c.properties.writeWithoutResponse || c.properties.write);
                const rx = chars.find(c => c.properties.notify || c.properties.indicate);
                if (tx && rx) {
                    found = {tx, rx};
                    break;
                }
            } catch (e) {
                // service not present on this device, try next profile
            }
        }
        if (!found) {
            try {
                server.disconnect();
            } catch (e) { /* ignore */ }
            throw new Error('BLE 시리얼 서비스를 찾을 수 없습니다. CM-550의 MODE 버튼으로 블루투스 모드(초록 LED 점멸)를 켜 주세요.');
        }
        this.device = device;
        this.server = server;
        this.txChar = found.tx;
        this.rxChar = found.rx;
        await this.rxChar.startNotifications();
        this.rxChar.addEventListener('characteristicvaluechanged', this._onNotify);
    }

    _onNotify (event) {
        const dv = event.target.value;
        if (dv && this._dataCb) {
            this._dataCb(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength));
        }
    }

    _onDisconnected () {
        const wasOpen = Boolean(this.txChar);
        this.txChar = null;
        this.rxChar = null;
        this.server = null;
        if (wasOpen && this._closeCb) this._closeCb();
    }

    write (bytes) {
        if (!this.isOpen) return Promise.reject(new Error('블루투스가 연결되어 있지 않습니다.'));
        // serialize writes; BLE characteristics reject concurrent operations
        this._writeQueue = this._writeQueue.then(async () => {
            for (let i = 0; i < bytes.length; i += BLE_CHUNK) {
                const chunk = bytes.subarray(i, Math.min(i + BLE_CHUNK, bytes.length));
                if (this.txChar.properties.writeWithoutResponse) {
                    await this.txChar.writeValueWithoutResponse(chunk);
                } else {
                    await this.txChar.writeValueWithResponse(chunk);
                }
            }
        }).catch(() => { /* swallow to keep queue alive */ });
        return this._writeQueue;
    }

    async close () {
        if (this.rxChar) {
            try {
                this.rxChar.removeEventListener('characteristicvaluechanged', this._onNotify);
            } catch (e) { /* ignore */ }
            try {
                await this.rxChar.stopNotifications();
            } catch (e) { /* ignore */ }
        }
        if (this.device) {
            this.device.removeEventListener('gattserverdisconnected', this._onDisconnected);
            if (this.device.gatt.connected) this.device.gatt.disconnect();
        }
        this._onDisconnected();
        this.device = null;
    }
}

module.exports = {WebSerialTransport, WebBluetoothTransport, BLE_PROFILES, CM550_USB_FILTERS};
