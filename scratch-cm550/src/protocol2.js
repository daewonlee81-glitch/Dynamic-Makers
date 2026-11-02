/**
 * DYNAMIXEL Protocol 2.0 packet builder / parser.
 *
 * Packet layout:
 *   FF FF FD 00 | ID | LEN_L LEN_H | INST | PARAM... | CRC_L CRC_H
 *   LEN = number of bytes after the length field (INST + PARAMS + CRC)
 *
 * Status packet: INST = 0x55, first param byte = ERROR.
 *
 * Byte stuffing: inside (ID..PARAMS) any occurrence of FF FF FD is followed by
 * an inserted FD so the receiver can't mistake it for a header.
 */

const INST = {
    PING: 0x01,
    READ: 0x02,
    WRITE: 0x03,
    REG_WRITE: 0x04,
    ACTION: 0x05,
    FACTORY_RESET: 0x06,
    REBOOT: 0x08,
    CLEAR: 0x10,
    STATUS: 0x55,
    SYNC_READ: 0x82,
    SYNC_WRITE: 0x83,
    BULK_READ: 0x92,
    BULK_WRITE: 0x93
};

const BROADCAST_ID = 0xfe;

// CRC-16 (IBM / ANSI, poly 0x8005) lookup table as specified by ROBOTIS.
const CRC_TABLE = (() => {
    const table = new Uint16Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i << 8;
        for (let j = 0; j < 8; j++) {
            c = (c & 0x8000) ? ((c << 1) ^ 0x8005) : (c << 1);
            c &= 0xffff;
        }
        table[i] = c;
    }
    return table;
})();

/**
 * @param {Uint8Array|number[]} bytes
 * @param {number} [length]
 * @returns {number} 16-bit CRC
 */
const crc16 = (bytes, length = bytes.length) => {
    let crc = 0;
    for (let i = 0; i < length; i++) {
        const idx = ((crc >> 8) ^ bytes[i]) & 0xff;
        crc = ((crc << 8) ^ CRC_TABLE[idx]) & 0xffff;
    }
    return crc;
};

const stuff = bytes => {
    const out = [];
    let ff = 0;
    for (const b of bytes) {
        out.push(b);
        if (ff >= 2 && b === 0xfd) {
            out.push(0xfd);
            ff = 0;
        } else if (b === 0xff) {
            ff++;
        } else {
            ff = 0;
        }
    }
    return out;
};

const unstuff = bytes => {
    const out = [];
    let ff = 0;
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if (ff >= 2 && b === 0xfd && bytes[i + 1] === 0xfd) {
            out.push(0xfd);
            i++; // skip the stuffed byte
            ff = 0;
            continue;
        }
        out.push(b);
        ff = (b === 0xff) ? ff + 1 : 0;
    }
    return out;
};

/**
 * Build a complete instruction packet.
 * @param {number} id
 * @param {number} instruction
 * @param {number[]} [params]
 * @returns {Uint8Array}
 */
const buildPacket = (id, instruction, params = []) => {
    const body = stuff([instruction, ...params]); // stuffing applies to INST+PARAMS
    const length = body.length + 2; // + CRC
    const pkt = [0xff, 0xff, 0xfd, 0x00, id & 0xff, length & 0xff, (length >> 8) & 0xff, ...body];
    const crc = crc16(pkt);
    pkt.push(crc & 0xff, (crc >> 8) & 0xff);
    return Uint8Array.from(pkt);
};

const le = (value, size) => {
    const v = value < 0 ? (value + (2 ** (size * 8))) : value; // two's complement
    const out = [];
    for (let i = 0; i < size; i++) out.push((v >>> (8 * i)) & 0xff);
    return out;
};

const fromLE = (bytes, offset, size, signed = false) => {
    let v = 0;
    for (let i = 0; i < size; i++) v += bytes[offset + i] * (2 ** (8 * i));
    if (signed && v >= 2 ** ((size * 8) - 1)) v -= 2 ** (size * 8);
    return v;
};

const ping = id => buildPacket(id, INST.PING);
const read = (id, address, size) => buildPacket(id, INST.READ, [...le(address, 2), ...le(size, 2)]);
const write = (id, address, value, size) => buildPacket(id, INST.WRITE, [...le(address, 2), ...le(value, size)]);
const writeBytes = (id, address, bytes) => buildPacket(id, INST.WRITE, [...le(address, 2), ...bytes]);
const reboot = id => buildPacket(id, INST.REBOOT);

/**
 * @param {number} address
 * @param {number} size
 * @param {Array<{id:number, value:number}>} items
 */
const syncWrite = (address, size, items) => {
    const params = [...le(address, 2), ...le(size, 2)];
    for (const it of items) params.push(it.id & 0xff, ...le(it.value, size));
    return buildPacket(BROADCAST_ID, INST.SYNC_WRITE, params);
};

const syncRead = (address, size, ids) =>
    buildPacket(BROADCAST_ID, INST.SYNC_READ, [...le(address, 2), ...le(size, 2), ...ids.map(i => i & 0xff)]);

const ERROR_NAMES = {
    0x01: '처리 실패 (Result Fail)',
    0x02: '알 수 없는 명령 (Instruction Error)',
    0x03: '통신 오류 (CRC Error)',
    0x04: '값이 범위를 벗어남 (Data Range Error)',
    0x05: '데이터 길이 오류 (Data Length Error)',
    0x06: '값이 제한을 넘음 (Data Limit Error)',
    0x07: '접근 오류 — 토크가 켜져 있어 설정을 바꿀 수 없거나 읽기 전용 (Access Error)'
};

/**
 * Incremental parser. Feed bytes with push(); complete status packets are
 * delivered to the onPacket callback as {id, error, alert, params:number[]}.
 */
class PacketParser {
    constructor (onPacket) {
        this.onPacket = onPacket;
        this.buf = [];
    }

    reset () {
        this.buf = [];
    }

    push (chunk) {
        for (const b of chunk) this.buf.push(b);
        this._drain();
    }

    _drain () {
        for (;;) {
            // find header
            let start = -1;
            for (let i = 0; i + 3 < this.buf.length; i++) {
                if (this.buf[i] === 0xff && this.buf[i + 1] === 0xff &&
                    this.buf[i + 2] === 0xfd && this.buf[i + 3] === 0x00) {
                    start = i;
                    break;
                }
            }
            if (start < 0) {
                // keep possible partial header
                if (this.buf.length > 3) this.buf = this.buf.slice(-3);
                return;
            }
            if (start > 0) this.buf = this.buf.slice(start);
            if (this.buf.length < 7) return;
            const length = this.buf[5] | (this.buf[6] << 8);
            const total = 7 + length;
            if (this.buf.length < total) return;
            const raw = this.buf.slice(0, total);
            this.buf = this.buf.slice(total);
            const crc = raw[total - 2] | (raw[total - 1] << 8);
            if (crc16(raw, total - 2) !== crc) {
                continue; // drop corrupted packet, resync on next header
            }
            const body = unstuff(raw.slice(7, total - 2)); // INST ERR PARAMS
            const packet = {
                id: raw[4],
                instruction: body[0],
                error: body.length > 1 ? (body[1] & 0x7f) : 0,
                alert: body.length > 1 ? Boolean(body[1] & 0x80) : false,
                params: body.slice(2)
            };
            this.onPacket(packet);
        }
    }
}

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
