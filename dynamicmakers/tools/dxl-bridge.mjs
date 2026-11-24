#!/usr/bin/env node
/**
 * 다이나믹 메이커스 ↔ Claude Code(CYCLO AI) 다이나믹셀 브리지
 *
 *   CYCLO MCP ──TCP──▶ 이 프로그램 ──WebSocket──▶ 브라우저의 다이나믹 메이커스 3D 탭(가상 MAX-E1)
 *
 * CYCLO MCP는 tcp://host:port 로 다이나믹셀 패킷(Protocol 2.0)을 그대로 주고받는 "패킷 브리지"를
 * 지원합니다. 브라우저는 TCP 연결을 받을 수 없으므로 이 프로그램이 둘을 이어 줍니다.
 * 패킷 내용은 바꾸지 않고 그대로 전달만 합니다. 이 컴퓨터(127.0.0.1)에서만 연결을 받습니다.
 *
 * 실행:  node dxl-bridge.mjs            (Node.js 18 이상, 따로 설치할 것 없음)
 *        node dxl-bridge.mjs --tcp 9100 --ws 9101
 * CYCLO에서 포트: tcp://127.0.0.1:9100   (통신 속도 값은 무엇이든 상관없음)
 */
import net from 'node:net';
import http from 'node:http';
import crypto from 'node:crypto';

const arg = (name, def) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const HOST = '127.0.0.1';
const TCP_PORT = Number(arg('tcp', 9100));
const WS_PORT = Number(arg('ws', 9101));
// pages that may connect as "the robot": the published app, a local copy, the one-file app (file:// → "null")
const ORIGINS = (arg('origins', '') || 'https://daewonlee81-glitch.github.io').split(',').filter(Boolean);
const originOk = o => !o || o === 'null' || ORIGINS.includes(o) ||
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(o);

const log = (...a) => console.log(new Date().toLocaleTimeString('ko-KR'), ...a);
let robot = null; // the browser (WebSocket)
let agent = null; // CYCLO (TCP)
let toRobot = 0;
let toAgent = 0;

// ---- WebSocket (RFC 6455, binary frames only) ------------------------------------------------
const frame = (payload, opcode = 2) => {
    const n = payload.length;
    const head = n < 126 ? Buffer.from([0x80 | opcode, n]) :
        n < 65536 ? Buffer.from([0x80 | opcode, 126, n >> 8, n & 255]) :
            Buffer.concat([Buffer.from([0x80 | opcode, 127]), (() => {
                const b = Buffer.alloc(8);
                b.writeBigUInt64BE(BigInt(n));
                return b;
            })()]);
    return Buffer.concat([head, payload]);
};

const serveSocket = (sock, onMessage, onClose) => {
    let buf = Buffer.alloc(0);
    sock.on('data', d => {
        buf = Buffer.concat([buf, d]);
        for (;;) {
            if (buf.length < 2) return;
            const op = buf[0] & 0x0f;
            const masked = buf[1] & 0x80;
            let n = buf[1] & 0x7f;
            let p = 2;
            if (n === 126) {
                if (buf.length < 4) return;
                n = buf.readUInt16BE(2);
                p = 4;
            } else if (n === 127) {
                if (buf.length < 10) return;
                n = Number(buf.readBigUInt64BE(2));
                p = 10;
            }
            const mask = masked ? buf.subarray(p, p + 4) : null;
            if (masked) p += 4;
            if (buf.length < p + n) return;
            const data = Buffer.from(buf.subarray(p, p + n));
            buf = buf.subarray(p + n);
            if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
            if (op === 8) {
                sock.end(frame(Buffer.alloc(0), 8));
                return;
            }
            if (op === 9) sock.write(frame(data, 10)); // ping → pong
            else if (op === 2 || op === 0) onMessage(data);
        }
    });
    sock.on('close', onClose);
    sock.on('error', () => {});
};

const wsServer = http.createServer((req, res) => {
    res.writeHead(200, {'content-type': 'text/plain; charset=utf-8'});
    res.end(`다이나믹 메이커스 다이나믹셀 브리지 — CYCLO 포트: tcp://${HOST}:${TCP_PORT}\n` +
        `로봇(브라우저): ${robot ? '연결됨' : '없음'} · CYCLO: ${agent ? '연결됨' : '없음'}\n`);
});
wsServer.on('upgrade', (req, sock) => {
    const origin = req.headers.origin;
    if (!originOk(origin) || req.headers.upgrade.toLowerCase() !== 'websocket') {
        log(`⚠ 연결 거부: ${origin || '(origin 없음)'} — 허용하려면 --origins ${origin}`);
        sock.end('HTTP/1.1 403 Forbidden\r\n\r\n');
        return;
    }
    const accept = crypto.createHash('sha1')
        .update(`${req.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);
    sock.setNoDelay(true);
    if (robot) robot.end(frame(Buffer.alloc(0), 8)); // the newest page is the robot
    robot = sock;
    log(`✓ 로봇 연결됨 (다이나믹 메이커스 3D, ${origin || '로컬'})`);
    serveSocket(sock, data => {
        toAgent += data.length;
        if (agent) agent.write(data);
    }, () => {
        if (robot === sock) {
            robot = null;
            log('로봇 연결이 끊어졌습니다 (3D 탭의 연결 버튼을 다시 누르세요).');
        }
    });
});

// ---- TCP for CYCLO ---------------------------------------------------------------------------
const tcpServer = net.createServer(sock => {
    if (agent) agent.destroy(); // one bus master at a time
    agent = sock;
    sock.setNoDelay(true);
    log(`✓ CYCLO 연결됨 (${sock.remoteAddress}:${sock.remotePort})`);
    if (!robot) log('⚠ 로봇(브라우저)이 아직 연결되지 않았습니다 — 3D 탭에서 [Claude Code·CYCLO 연결]을 누르세요.');
    sock.on('data', d => {
        toRobot += d.length;
        if (robot) robot.write(frame(d));
    });
    sock.on('close', () => {
        if (agent === sock) agent = null;
        log(`CYCLO 연결 끝 (보냄 ${toRobot} B · 받음 ${toAgent} B)`);
    });
    sock.on('error', () => {});
});

tcpServer.listen(TCP_PORT, HOST, () => {
    wsServer.listen(WS_PORT, HOST, () => {
        log('다이나믹 메이커스 다이나믹셀 브리지 실행 중');
        log(`  CYCLO 포트:      tcp://${HOST}:${TCP_PORT}`);
        log(`  다이나믹 메이커스: ws://${HOST}:${WS_PORT}  (3D 탭 → [Claude Code·CYCLO 연결])`);
        log('  끝내려면 Ctrl+C');
    });
});
for (const s of [tcpServer, wsServer]) {
    s.on('error', e => {
        console.error(`✗ ${e.code === 'EADDRINUSE' ? `포트가 이미 사용 중입니다 (${e.port}). --tcp / --ws 로 다른 번호를 주세요.` : e.message}`);
        process.exit(1);
    });
}
