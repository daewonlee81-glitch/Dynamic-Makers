/**
 * Toolbox (block palette) for Dynamic Makers: only robot-relevant categories.
 * Robot categories are assembled from the cm550 extension's block XML, split
 * into groups by opcode.
 */
import {blockColors, ROBOT_STYLES} from './theme';

const {modelInfo, modelName} = require('../../scratch-cm550/src/models');

const sep = '<sep gap="36"/>';
const num = (name, value, type = 'math_number') =>
    `<value name="${name}"><shadow type="${type}"><field name="NUM">${value}</field></shadow></value>`;
const text = (name, value) => `<value name="${name}"><shadow type="text"><field name="TEXT">${value}</field></shadow></value>`;

const category = (name, id, colors, body, extra = '') =>
    `<category name="${name}" toolboxitemid="${id}" colour="${colors.colourPrimary}" ` +
    `secondaryColour="${colors.colourTertiary}" ${extra}>${body}</category>`;

/** Robot groups: category id -> {name, style, opcodes (without cm550_ prefix)} */
export const ROBOT_GROUPS = [
    {
        id: 'db_dxl', name: '다이나믹셀',
        opcodes: ['dxlMoveTo', 'dxlMoveToWait', 'dxlMoveTwo', '---', 'dxlPrepare', 'dxlTogether', 'dxlGoal', '---', 'dxlWheel', 'dxlWheelTwo', 'dxlStop', '---',
            'dxlTorque', 'dxlAllTorque', 'dxlSetMode', 'dxlLed', '---', 'dxlRead', 'dxlIsMoving', 'dxlScan']
    },
    {
        id: 'db_controller', name: '컨트롤러',
        opcodes: ['cmLedColor', 'cmBuzzerNote', 'cmBuzzerMelody', '---', 'cmButton', 'cmTilt', 'cmGyro', 'cmAccel', '---',
            'cmSoundCount', 'cmSoundReset', 'cmVoltage', 'cmTemperature', 'cmDxlPower', '---', 'isConnected', 'lastError']
    },
    {
        id: 'db_port', name: '센서·포트',
        opcodes: ['portSensor', 'portTouch', 'portColor', '---', 'portLed', 'portServo', 'portMotor']
    },
    {
        id: 'db_motion', name: '모션',
        opcodes: ['motionPlay', 'motionPlayWait', 'motionChain', 'motionStop', '---', 'motionSpeed', 'motionNext', '---',
            'motionIsPlaying', 'motionCount']
    },
    {
        id: 'db_pose', name: '자세',
        opcodes: ['poseRelax', 'poseRecord', '---', 'posePlay', 'posePlayAll', '---', 'poseCount', 'poseClear']
    },
    {
        id: 'db_ai', name: 'AI 학습',
        opcodes: ['aiWhen', '---', 'aiLabel', 'aiIs', 'aiConfidence', '---', 'aiSwitch']
    },
    {
        id: 'db_walk', name: '걸음',
        opcodes: ['walkGait', 'walkPolicy', 'walkStop', 'walking']
    },
    {
        id: 'db_body', name: '몸 동작',
        opcodes: ['skelVisible', 'skelAngle', 'skelPos', '---', 'skelFollow', '---', 'skelSwitch']
    },
    {
        id: 'db_mymotors', name: '연결된 모터', dynamic: true,
        opcodes: ['dxlModuleMove', 'dxlModuleWheels', 'dxlGrip', 'dxlModelName']
    },
    {
        id: 'db_advanced', name: '고급',
        opcodes: ['rawWrite', 'rawRead', '---', 'connect', 'disconnect']
    }
];

/** opcode (without prefix) -> group style id */
export const OPCODE_STYLE = {};
for (const g of ROBOT_GROUPS) {
    for (const op of g.opcodes) if (op !== '---') OPCODE_STYLE[op] = g.id;
}

const events = () => category('이벤트', 'events', blockColors.event, `
    <block type="event_whenflagclicked"/>
    <block type="event_whenkeypressed"/>
    ${sep}
    <block type="event_whenbroadcastreceived"/>
    <block type="event_broadcast"><value name="BROADCAST_INPUT"><shadow type="event_broadcast_menu"/></value></block>
    <block type="event_broadcastandwait"><value name="BROADCAST_INPUT"><shadow type="event_broadcast_menu"/></value></block>
`);

const control = () => category('제어', 'control', blockColors.control, `
    <block type="control_wait">${num('DURATION', 1, 'math_positive_number')}</block>
    ${sep}
    <block type="control_repeat">${num('TIMES', 10, 'math_whole_number')}</block>
    <block type="control_forever"/>
    ${sep}
    <block type="control_if"/>
    <block type="control_if_else"/>
    <block type="control_wait_until"/>
    <block type="control_repeat_until"/>
    ${sep}
    <block type="control_stop"/>
`);

const operators = () => category('연산', 'operators', blockColors.operators, `
    <block type="operator_add">${num('NUM1', '')}${num('NUM2', '')}</block>
    <block type="operator_subtract">${num('NUM1', '')}${num('NUM2', '')}</block>
    <block type="operator_multiply">${num('NUM1', '')}${num('NUM2', '')}</block>
    <block type="operator_divide">${num('NUM1', '')}${num('NUM2', '')}</block>
    ${sep}
    <block type="operator_random">${num('FROM', 1)}${num('TO', 10)}</block>
    ${sep}
    <block type="operator_gt">${text('OPERAND1', '')}${text('OPERAND2', 50)}</block>
    <block type="operator_lt">${text('OPERAND1', '')}${text('OPERAND2', 50)}</block>
    <block type="operator_equals">${text('OPERAND1', '')}${text('OPERAND2', 50)}</block>
    ${sep}
    <block type="operator_and"/>
    <block type="operator_or"/>
    <block type="operator_not"/>
    ${sep}
    <block type="operator_join">${text('STRING1', '로봇')}${text('STRING2', ' 출발')}</block>
    <block type="operator_letter_of">${num('LETTER', 1, 'math_whole_number')}${text('STRING', '로봇')}</block>
    <block type="operator_length">${text('STRING', '로봇')}</block>
    <block type="operator_contains">${text('STRING1', '로봇')}${text('STRING2', '봇')}</block>
    ${sep}
    <block type="operator_mod">${num('NUM1', '')}${num('NUM2', '')}</block>
    <block type="operator_round">${num('NUM', '')}</block>
    ${sep}
    <block type="operator_mathop">${num('NUM', '')}</block>
`);

const variables = () => category('변수', 'variables', blockColors.data, '', 'custom="VARIABLE"');
const myBlocks = () => category('내 블록', 'myBlocks', blockColors.more, '', 'custom="PROCEDURE"');

const output = () => category('출력·타이머', 'output', blockColors.looks, `
    <block type="looks_say">${text('MESSAGE', '안녕!')}</block>
    <block type="looks_sayforsecs">${text('MESSAGE', '안녕!')}${num('SECS', 2)}</block>
    ${sep}
    <block type="sensing_timer"/>
    <block type="sensing_resettimer"/>
    <block type="sensing_keypressed"><value name="KEY_OPTION"><shadow type="sensing_keyoptions"/></value></block>
`);

const xmlEscape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const label = text => `<label text="${xmlEscape(text)}"/>`;
const withId = (xml, id) => (id ? xml.replace(/(<field name="dxlId">)[^<]*(<\/field>)/g, `$1${id}$2`) : xml);
const withModule = (xml, pair) => (pair ?
    xml.replace(/(<field name="MODULE">)[^<]*(<\/field>)/, `$1${pair.a},${pair.b}$2`) : xml);

/** 연결된 모터: blocks that only make sense for the motor types actually connected. */
const myMotorsBody = (robotBlockXML, motors, desc) => {
    if (!motors.length) {
        return label('로봇을 연결하면 모터 종류에 맞는 블록이 여기에 나타납니다.');
    }
    const counts = {};
    for (const m of motors) counts[modelName(m.model)] = (counts[modelName(m.model)] || 0) + 1;
    const parts = [label(`검색된 모터: ${Object.entries(counts).map(([k, v]) => `${k} ${v}개`).join(', ')}`)];
    if (desc.pairs.length) {
        parts.push(label(`2축 모듈 ${desc.pairs.length}개 (A축·B축을 한 번에)`));
        parts.push(withModule(robotBlockXML.dxlModuleMove || '', desc.pairs[0]));
        parts.push(withModule(robotBlockXML.dxlModuleWheels || '', desc.pairs[0]));
        parts.push(sep);
    }
    const current = motors.filter(m => modelInfo(m.model) && modelInfo(m.model).current);
    if (current.length) {
        parts.push(label(`힘 조절(전류 제어) 모터: ID ${current.map(m => m.id).join(', ')}`));
        parts.push(withId(robotBlockXML.dxlGrip || '', current[0].id));
        parts.push(sep);
    }
    parts.push(withId(robotBlockXML.dxlModelName || '', motors[0].id));
    return parts.join('\n');
};

/**
 * @param {Object<string,string>} robotBlockXML - opcode (no prefix) -> <block> xml from the VM
 * @param {object} [scan] {motors, desc} from the device's last scan
 * @returns {string} toolbox xml
 */
export const makeToolbox = (robotBlockXML, scan) => {
    const motors = (scan && scan.motors) || [];
    const desc = (scan && scan.desc) || {pairs: [], labels: {}, axis: {}};
    // default ID in robot blocks = first detected motor
    const firstId = motors.length && !motors.some(m => m.id === 1) ? motors[0].id : 0;
    const robot = {};
    for (const g of ROBOT_GROUPS) {
        const body = g.dynamic ? myMotorsBody(robotBlockXML, motors, desc) : g.opcodes
            .map(op => (op === '---' ? sep : withId(robotBlockXML[op] || '', firstId)))
            .join('\n');
        robot[g.id] = category(g.name, g.id, ROBOT_STYLES[g.id], body);
    }
    return [
        '<xml style="display: none">',
        events(), control(),
        robot.db_dxl, robot.db_mymotors, robot.db_pose, robot.db_ai, robot.db_body, robot.db_walk, robot.db_controller, robot.db_port, robot.db_motion,
        operators(), variables(), myBlocks(), output(),
        robot.db_advanced,
        '</xml>'
    ].join('\n');
};
