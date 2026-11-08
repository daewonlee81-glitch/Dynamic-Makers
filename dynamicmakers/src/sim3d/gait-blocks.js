/**
 * Turns a learned gait into a readable block program: one step is cut into
 * FRAMES poses, and each pose is a "모두 함께 … 초 동안 움직이기" block holding
 * one "다이나믹셀 ID 목표 …°" block per motor. The Python tab shows the same
 * program (with dxl.together(...): dxl.goal(id, deg)).
 */
import {gaitTargets} from './gait';

export const FRAMES = 8;
const VAR_ID = 'dm-walk-slow';
const VAR_NAME = '느리게';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = v => Math.round(v * 10) / 10;

/** model joint radians → DYNAMIXEL degrees with this robot's ID map (sign, centre) */
export const toDegrees = (targets, jointMap) => jointMap
    .map(j => ({id: j.id, joint: j.joint, name: j.name,
        deg: r1(j.center + (j.sign * (targets[j.joint] || 0) * 180 / Math.PI))}))
    .sort((a, b) => a.id - b.id);

/** knees bent, both feet down: where every step starts and ends */
export const stanceTargets = g => {
    const out = {};
    for (const s of ['R', 'L']) {
        out[`${s}_hip_pitch`] = -g.height;
        out[`${s}_knee`] = g.height;
    }
    return out;
};

/** The poses of one step (t = period/FRAMES … period). */
export const stepFrames = (g, frames = FRAMES, k = 1) => Array.from({length: frames},
    (_, i) => gaitTargets(g, ((i + 1) * g.period) / frames, k));

const num = v => `<shadow type="math_number"><field name="NUM">${v}</field></shadow>`;
const slowVar = `<block type="data_variable"><field name="VARIABLE" id="${VAR_ID}" variabletype="">${VAR_NAME}</field></block>`;
const timesSlow = secs => `<block type="operator_multiply"><value name="NUM1">${num(secs)}</value>` +
    `<value name="NUM2">${num(1)}${slowVar}</value></block>`;
const comment = text => `<comment pinned="false" h="70" w="260">${esc(text)}</comment>`;

const goals = joints => joints.reduceRight((next, j) => `<block type="cm550_dxlGoal">` +
    `<value name="ID"><shadow type="cm550_menu_dxlId"><field name="dxlId">${j.id}</field></shadow></value>` +
    `<value name="DEG">${num(j.deg)}</value>${next ? `<next>${next}</next>` : ''}</block>`, '');

const group = (joints, secsXML, note, next) => `<block type="cm550_dxlTogether">${note ? comment(note) : ''}` +
    `<value name="SECS">${num(1)}${secsXML}</value>` +
    `<statement name="SUBSTACK">${goals(joints)}</statement>${next ? `<next>${next}</next>` : ''}</block>`;

/**
 * @param {object} g gait numbers
 * @param {Array} jointMap [{id, joint, sign, center}]
 * @param {object} [o]
 * @param {number} [o.steps] how many steps (repeat count)
 * @param {number} [o.x]
 * @param {number} [o.y]
 * @returns {{xml: string, frames: number, dt: number, steps: number, blocks: number}}
 */
export const gaitProgramXML = (g, jointMap, {steps = 20, x = 40, y = 40} = {}) => {
    const dt = Math.round((g.period / FRAMES) * 1000) / 1000;
    const stance = toDegrees(stanceTargets(g), jointMap);
    const straight = toDegrees({}, jointMap);
    const frames = stepFrames(g).map(t => toDegrees(t, jointMap));
    let loop = '';
    for (let i = frames.length - 1; i >= 0; i--) {
        loop = group(frames[i], timesSlow(dt), i === 0 ?
            `한 걸음(${g.period.toFixed(3)}초)을 자세 ${FRAMES}개로 나눴습니다. 자세마다 모터 ${jointMap.length}개의 목표 각도를 ` +
            `${dt}초 × 느리게 동안 함께 움직입니다.` : '', loop);
    }
    // one small step first (half size), like the walker's gentle start
    const small = stepFrames(g, FRAMES, 0.5).map(t => toDegrees(t, jointMap));
    const chain = (list, note, next) => list.reduceRight((acc, joints, i) =>
        group(joints, timesSlow(dt), i === 0 ? note : '', acc), next);
    const repeat = `<block type="control_repeat">${comment(`걸음 학습으로 찾은 걸음 · ${steps}걸음`)}` +
        `<value name="TIMES"><shadow type="math_whole_number"><field name="NUM">${steps}</field></shadow></value>` +
        `<statement name="SUBSTACK">${loop}</statement>` +
        `<next>${group(stance, timesSlow(0.5), '', group(straight, '', '똑바로 서기'))}</next></block>`;
    const setSlow = `<block type="data_setvariableto">` +
        comment('실제 로봇은 1.5~2로 키워 천천히 시작하세요 (모든 시간에 곱해집니다).') +
        `<field name="VARIABLE" id="${VAR_ID}" variabletype="">${VAR_NAME}</field>` +
        `<value name="VALUE"><shadow type="text"><field name="TEXT">1</field></shadow></value>` +
        `<next>${group(stance, timesSlow(1), '무릎을 굽힌 출발 자세',
            chain(small, '출발: 절반 크기로 한 걸음 (갑자기 크게 걸으면 넘어지기 쉽습니다)', repeat))}</next></block>`;
    const xml = `<xml><variables><variable type="" id="${VAR_ID}" islocal="false" iscloud="false">${VAR_NAME}</variable></variables>` +
        `<block type="event_whenflagclicked" x="${Math.round(x)}" y="${Math.round(y)}"><next>${setSlow}</next></block></xml>`;
    return {xml, frames: FRAMES, dt, steps, blocks: ((2 * frames.length) + 3) * (jointMap.length + 1)};
};
