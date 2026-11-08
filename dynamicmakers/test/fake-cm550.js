// Injected before page scripts: fake navigator.serial CM-550 + DYNAMIXEL bus (IDs 1, 2).
(() => {
    const regs = {'1:0': 1060, '2:0': 1060, '200:0': 450, '200:89': 118, '200:102': 0xFF38, '1:44': 265, '2:44': 265, '1:132': 1024, '200:419': 512};
    const CRC = (() => { const t = new Uint16Array(256); for (let i = 0; i < 256; i++) { let c = i << 8; for (let j = 0; j < 8; j++) { c = (c & 0x8000) ? ((c << 1) ^ 0x8005) : (c << 1); c &= 0xffff; } t[i] = c; } return b => { let c = 0; for (const x of b) c = ((c << 8) ^ t[((c >> 8) ^ x) & 0xff]) & 0xffff; return c; }; })();
    const status = (id, params) => { const body = [0x55, 0, ...params]; const len = body.length + 2; const p = [0xff,0xff,0xfd,0,id,len&0xff,len>>8,...body]; const c = CRC(p); return Uint8Array.from([...p, c&0xff, c>>8]); };
    const le = (v, n) => { if (v < 0) v += 2 ** (8*n); const o = []; for (let i = 0; i < n; i++) o.push(Math.floor(v / 2 ** (8*i)) & 0xff); return o; };
    window.__fake = {regs, writes: []};
    const handle = bytes => {
        const id = bytes[4], inst = bytes[7], addr = bytes[8] | (bytes[9] << 8);
        const pong = i => status(i, le(regs[i + ':0'] || 0, 2).concat([46]));
        if (inst === 1 && id === 0xfe) return Uint8Array.from([...pong(200), ...pong(1), ...pong(2)]); // broadcast
        if (inst === 1) return [200, 1, 2].includes(id) ? pong(id) : null;
        if (inst === 2) { const size = bytes[10]; return status(id, le(regs[id + ':' + addr] || 0, size)); }
        if (inst === 3) { const size = (bytes[5] | (bytes[6] << 8)) - 5; let v = 0; for (let i = 0; i < size; i++) v += bytes[10 + i] * 2 ** (8*i); regs[id + ':' + addr] = v; window.__fake.writes.push([id, addr, v]); return status(id, []); }
        if (inst === 0x83) { window.__fake.writes.push(['sync', addr]); }
        return null;
    };
    let push = null;
    Object.defineProperty(navigator, 'serial', {value: {
        requestPort: async () => ({
            open: async () => {}, close: async () => {},
            readable: new ReadableStream({start (c) { push = x => c.enqueue(x); }}),
            writable: new WritableStream({write (chunk) { const r = handle(chunk); if (r) setTimeout(() => push(r), 1); }})
        })
    }});
})();
