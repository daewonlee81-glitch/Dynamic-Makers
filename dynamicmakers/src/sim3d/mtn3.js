/**
 * R+ Task 3.0 / R+ Motion 2.0 motion files (.mtn3): pages of key frames
 * (pose = degrees from the centre for every joint, frame = 1/128 s), flows
 * (pages played in turn, with loops and speed) and the call numbers the
 * CM-550 plays them by. Used by 예제 모션 확인 to show the official MAX-E1
 * motions on the 3D robot, as blocks, and to run them on the real robot.
 */
export const FRAME_SECONDS = 1 / 128; // R+ Motion: secondPerFrame = 0.0078125

const attr = (tag, name) => {
    const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
    return m ? m[1] : '';
};

/**
 * @param {string} text file contents
 * @returns {{ids: number[], pages: Object<string, {steps: Array<{frame, pose: number[]}>, seconds}>,
 *     flows: Object<string, Array<{page, loop, speed}>>, calls: Array<{index, flow}>}}
 */
export const parseMtn3 = text => {
    if (!/<PageRoot>/.test(text) || !/<Page\s/.test(text)) throw new Error('R+ 모션 파일(.mtn3)이 아닙니다.');
    const pages = {};
    for (const m of text.matchAll(/<Page name="([^"]+)">([\s\S]*?)<\/Page>/g)) {
        const steps = [...m[2].matchAll(/<step\b[^>]*>/g)].map(s => ({
            frame: Number(attr(s[0], 'frame')),
            pose: attr(s[0], 'pose').trim().split(/\s+/).map(Number)
        })).filter(s => Number.isFinite(s.frame) && s.pose.every(Number.isFinite));
        if (steps.length) pages[m[1]] = {steps, seconds: steps[steps.length - 1].frame * FRAME_SECONDS};
    }
    const flows = {};
    for (const m of text.matchAll(/<Flow name="([^"]+)"[^>]*>([\s\S]*?)<\/Flow>/g)) {
        flows[m[1]] = [...m[2].matchAll(/<unit\b[^>]*>/g)].map(u => ({
            page: attr(u[0], 'main'),
            loop: Math.max(1, Number(attr(u[0], 'loop')) || 1),
            speed: Number(attr(u[0], 'mainSpeed')) || 1
        })).filter(u => pages[u.page]);
    }
    const calls = [...text.matchAll(/<callFlow\b[^>]*>/g)].map(c => ({index: Number(attr(c[0], 'callIndex')),
        flow: attr(c[0], 'flow')})).filter(c => c.index > 0 && flows[c.flow] && flows[c.flow].length);
    const width = Math.max(0, ...Object.values(pages).map(p => p.steps[0].pose.length));
    const ids = [...text.matchAll(/<skeleton>[\s\S]*?<\/skeleton>/g)].flatMap(s =>
        [...s[0].matchAll(/<joint\b[^>]*>/g)].map(j => Number(attr(j[0], 'id')))).slice(0, width);
    return {ids: ids.length === width ? ids : Array.from({length: width}, (_, i) => i + 1), pages, flows, calls};
};

/** Seconds one call number takes at normal speed. */
export const callSeconds = (m, index) => {
    const c = m.calls.find(x => x.index === index);
    if (!c) return 0;
    return m.flows[c.flow].reduce((a, u) => a + (m.pages[u.page].seconds * u.loop / u.speed), 0);
};

/**
 * Walks and other start / repeat / end groups, found by their names
 * (…_시작, …_반복, …_종료 in the official files).
 * @returns {Array<{name, start, loop, end}>}
 */
export const findChains = m => {
    const byName = new Map(m.calls.map(c => [c.flow.replace(/^\d+_?H?_?/, ''), c.index]));
    const out = [];
    for (const [name, start] of byName) {
        const base = /^(.*)_시작$/.exec(name);
        if (!base) continue;
        const loop = byName.get(`${base[1]}_반복`);
        const end = byName.get(`${base[1]}_종료`);
        if (loop && end) out.push({name: base[1], start, loop, end});
    }
    return out;
};

/**
 * Call numbers in order → the same shape as a recording (예제 모션 확인), so it
 * can be shown, replayed in 3D and turned into blocks: frames {t, deg: {id: degrees}}.
 * Each page starts from where the previous one ended (like the CM-550).
 * @param {object} m parsed file
 * @param {number[]} indices call numbers, e.g. [150, 152, 152, 154]
 * @param {string} [label]
 */
export const toRecording = (m, indices, label) => {
    const frames = [];
    let t0 = 0;
    const push = (t, pose) => {
        const deg = {};
        m.ids.forEach((id, i) => { deg[id] = Math.round((180 + (pose[i] || 0)) * 100) / 100; });
        frames.push({t: Math.round(t * 1000) / 1000, deg});
    };
    for (const index of indices) {
        const c = m.calls.find(x => x.index === index);
        if (!c) throw new Error(`모션 ${index}번이 파일에 없습니다.`);
        for (const u of m.flows[c.flow]) {
            const p = m.pages[u.page];
            for (let k = 0; k < u.loop; k++) {
                if (!frames.length) push(0, p.steps[0].pose.map(() => 0)); // start from standing straight
                for (const s of p.steps) push(t0 + (s.frame * FRAME_SECONDS / u.speed), s.pose);
                t0 += p.seconds / u.speed;
            }
        }
    }
    return {page: label || indices.join('→'), ids: m.ids.slice(), frames, seconds: t0, fromFile: true, indices: indices.slice()};
};
