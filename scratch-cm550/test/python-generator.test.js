/* Run with: node --test test/python-generator.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {generatePython, sanitizeIdentifier, stripOuter} = require('../src/python-generator');
const {makeProject} = require('./fixtures/make-project');
const {sb3BlocksToVM} = require('./fixtures/sb3-to-vm');

const projectToInput = project => {
    const stage = project.targets.find(t => t.isStage);
    const sprite = project.targets.find(t => !t.isStage);
    const variables = [];
    for (const t of [stage, sprite]) {
        for (const [id, [name, value]] of Object.entries(t.variables || {})) variables.push({id, name, type: '', value});
        for (const [id, [name, value]] of Object.entries(t.lists || {})) variables.push({id, name, type: 'list', value});
    }
    return {blocks: sb3BlocksToVM(sprite.blocks), variables, targetName: sprite.name};
};

/** Parse with the real CPython parser (skips if python3 is unavailable). */
const assertValidPython = src => {
    const r = spawnSync('python3', ['-c', 'import ast,sys; ast.parse(sys.stdin.read())'], {input: src, encoding: 'utf8'});
    if (r.error && r.error.code === 'ENOENT') return;
    assert.equal(r.status, 0, `invalid Python:\n${r.stderr}\n---\n${src}`);
};

const EXPECTED_MAIN = `# 블록에서 자동으로 만들어진 Python 코드 (로봇)
from cm550 import *

점수 = 0

# 참고: 시작 블록에 연결되지 않은 블록 묶음 1개는 제외했습니다

def 인사하기(횟수):
    for _ in range(int(횟수)):
        cm.play_note(24, 0.2)

# 초록 깃발을 클릭했을 때
cm.connect("usb")
인사하기(3)
점수 = 0
dxl.torque(1, True)
while True:
    if port(1).dms() > 300:
        dxl.wheels(1, 50, 2, -50)
    else:
        dxl.wheels(1, 0, 2, 0)
        점수 += 1
        cm.led("red", True)
    print("롤: " + str(cm.imu.roll()))
    wait(0.1)
`;

test('main fixture: custom block + flag script translate to readable Python', () => {
    const py = generatePython(projectToInput(makeProject()));
    assert.equal(py, EXPECTED_MAIN);
    assertValidPython(py);
});

// ---------------------------------------------------------------------------
// small sb3 builder for focused cases
// ---------------------------------------------------------------------------
const builder = () => {
    const blocks = {};
    let n = 0;
    const b = (opcode, {inputs = {}, fields = {}, top = false, y = 0, shadow = false, mutation} = {}) => {
        const id = `k${++n}`;
        blocks[id] = {opcode, next: null, parent: null, inputs, fields, shadow, topLevel: top,
            ...(top ? {x: 0, y} : {}), ...(mutation ? {mutation} : {})};
        for (const v of Object.values(inputs)) {
            if (typeof v[1] === 'string' && blocks[v[1]]) blocks[v[1]].parent = id;
        }
        return id;
    };
    const menu = (name, value) => {
        const id = b(`cm550_menu_${name}`, {shadow: true, fields: {[name]: [String(value), null]}});
        return [1, id];
    };
    const chain = (...ids) => {
        for (let i = 0; i < ids.length - 1; i++) {
            blocks[ids[i]].next = ids[i + 1];
            blocks[ids[i + 1]].parent = ids[i];
        }
        return ids[0];
    };
    return {blocks, b, menu, chain, num: v => [1, [4, String(v)]], txt: v => [1, [10, String(v)]]};
};

test('several hat blocks become decorated functions with global declarations', () => {
    const {blocks, b, menu, chain, num, txt} = builder();
    // flag 1: set 점수 to 0, forever { motion.play(1, wait) ; change 점수 by 1 }
    const set = b('data_setvariableto', {fields: {VARIABLE: ['점수', 'v1']}, inputs: {VALUE: txt('0')}});
    const play = b('cm550_motionPlayWait', {inputs: {PAGE: num(1)}});
    const change = b('data_changevariableby', {fields: {VARIABLE: ['점수', 'v1']}, inputs: {VALUE: num(1)}});
    chain(play, change);
    const forever = b('control_forever', {inputs: {SUBSTACK: [2, play]}});
    chain(b('event_whenflagclicked', {top: true, y: 0}), set, forever);

    // flag 2: if <port 2 touched> then stop this script
    const touched = b('cm550_portTouch', {inputs: {PORT: menu('port5', 2)}});
    const stop = b('control_stop', {fields: {STOP_OPTION: ['this script', null]}});
    const iff = b('control_if', {inputs: {CONDITION: [2, touched], SUBSTACK: [2, stop]}});
    chain(b('event_whenflagclicked', {top: true, y: 200}), iff);

    // key space: add (random 1 to 6) to 기록; say (sqrt 16)
    const rnd = b('operator_random', {inputs: {FROM: num(1), TO: num(6)}});
    const add = b('data_addtolist', {fields: {LIST: ['기록', 'l1']}, inputs: {ITEM: [3, rnd, [10, '']]}});
    const sqrt = b('operator_mathop', {fields: {OPERATOR: ['sqrt', null]}, inputs: {NUM: num(16)}});
    const say = b('looks_say', {inputs: {MESSAGE: [3, sqrt, [10, '']]}});
    const move = b('motion_movesteps', {inputs: {STEPS: num(10)}});
    chain(b('event_whenkeypressed', {top: true, y: 400, fields: {KEY_OPTION: ['space', null]}}), add, say, move);

    // broadcast: dxl 3 move to 90 speed 30 and wait; mode wheel
    const mv = b('cm550_dxlMoveToWait', {inputs: {ID: menu('dxlId', 3), DEG: num(90), SPEED: num(30)}});
    const mode = b('cm550_dxlSetMode', {inputs: {ID: menu('dxlId', 3)}, fields: {MODE: ['velocity', null]}});
    chain(b('event_whenbroadcastreceived', {top: true, y: 600, fields: {BROADCAST_OPTION: ['출발', 'bc1']}}), mv, mode);

    const py = generatePython({
        blocks: sb3BlocksToVM(blocks),
        variables: [{id: 'v1', name: '점수', type: '', value: 0}, {id: 'l1', name: '기록', type: 'list', value: []}]
    });
    assertValidPython(py);
    assert.match(py, /^import math$/m);
    assert.match(py, /^import random$/m);
    assert.match(py, /^점수 = 0$/m);
    assert.match(py, /^기록 = \[\]$/m);
    assert.match(py, /@when_flag_clicked\ndef on_start\(\):\n {4}global 점수\n {4}점수 = 0\n {4}while True:\n {8}motion\.play\(1, wait=True\)\n {8}점수 \+= 1/);
    assert.match(py, /@when_flag_clicked\ndef on_start_2\(\):\n {4}if port\(2\)\.touched\(\):\n {8}return/);
    assert.match(py, /@when_key_pressed\("space"\)\ndef on_key\(\):\n {4}기록\.append\(random\.randint\(1, 6\)\)\n {4}print\(math\.sqrt\(16\)\)\n {4}# \[변환 안 됨\] motion_movesteps/);
    assert.match(py, /@when_broadcast\("출발"\)\ndef on_message\(\):\n {4}dxl\.move_to\(3, 90, speed=30, wait=True\)\n {4}dxl\.set_mode\(3, "wheel"\)/);
    assert.match(py, /# 참고: Python으로 바꾸지 못한 블록이 있습니다 — motion_movesteps/);
    assert.match(py, /\nstart\(\)\n$/);
});

test('every CM-550 block translates without warnings', () => {
    const {blocks, b, menu, chain, num} = builder();
    const ID = () => menu('dxlId', 1);
    const P = () => menu('port5', 1);
    const ON = () => menu('onOff', 'off');
    const stmts = [
        b('cm550_connect', {fields: {KIND: ['ble', null]}}),
        b('cm550_dxlTorque', {inputs: {ID: ID(), ONOFF: ON()}}),
        b('cm550_dxlMoveTo', {inputs: {ID: ID(), DEG: num(180), SPEED: num(50)}}),
        b('cm550_dxlMoveTwo', {inputs: {ID1: menu('dxlId', 1), DEG1: num(10), ID2: menu('dxlId', 2), DEG2: num(20)}}),
        b('cm550_dxlWheel', {inputs: {ID: ID(), SPEED: num(-30)}}),
        b('cm550_dxlStop', {inputs: {ID: ID()}}),
        b('cm550_dxlLed', {inputs: {ID: ID(), ONOFF: ON()}}),
        b('cm550_dxlAllTorque', {inputs: {ONOFF: menu('onOff', 'on')}}),
        b('cm550_cmBuzzerMelody', {inputs: {INDEX: num(2)}}),
        b('cm550_cmSoundReset'),
        b('cm550_cmDxlPower', {inputs: {ONOFF: ON()}}),
        b('cm550_portLed', {inputs: {PORT: P()}, fields: {STATE: ['left', null]}}),
        b('cm550_portServo', {inputs: {PORT: menu('port2', 2), DEG: num(150)}}),
        b('cm550_portMotor', {inputs: {PORT: menu('port2', 1), SPEED: num(40)}}),
        b('cm550_motionPlay', {inputs: {PAGE: num(7)}}),
        b('cm550_motionStop', {fields: {HOW: ['now', null]}}),
        b('cm550_motionSpeed', {inputs: {PERCENT: num(120)}}),
        b('cm550_motionNext', {inputs: {PAGE: num(8)}}),
        b('cm550_rawWrite', {inputs: {ID: num(200), ADDR: num(91), VALUE: num(1)}, fields: {SIZE: ['1', null]}}),
        b('cm550_dxlModuleMove', {fields: {MODULE: ['3,4', null]}, inputs: {DEGA: num(90), DEGB: num(270)}}),
        b('cm550_dxlModuleWheels', {fields: {MODULE: ['1,2', null]}, inputs: {SPA: num(40), SPB: num(-40)}}),
        b('cm550_dxlGrip', {inputs: {ID: ID(), DEG: num(200), FORCE: num(25)}}),
        b('cm550_disconnect')
    ];
    const reporters = [
        b('cm550_isConnected'), b('cm550_lastError'),
        b('cm550_dxlRead', {inputs: {ID: ID()}, fields: {PROP: ['temperature', null]}}),
        b('cm550_dxlIsMoving', {inputs: {ID: ID()}}), b('cm550_dxlScan'),
        b('cm550_dxlModelName', {inputs: {ID: ID()}}),
        b('cm550_cmButton', {fields: {BUTTON: ['mode', null]}}),
        b('cm550_cmTilt', {fields: {AXIS: ['pitch', null]}}),
        b('cm550_cmGyro', {fields: {AXIS: ['z', null]}}),
        b('cm550_cmAccel', {fields: {AXIS: ['y', null]}}),
        b('cm550_cmVoltage'), b('cm550_cmTemperature'), b('cm550_cmSoundCount'),
        b('cm550_portSensor', {inputs: {PORT: P()}, fields: {SENSOR: ['color', null]}}),
        b('cm550_portColor', {inputs: {PORT: P()}, fields: {COLOR: ['yellow', null]}}),
        b('cm550_motionIsPlaying'), b('cm550_motionCount'),
        b('cm550_rawRead', {inputs: {ID: num(1), ADDR: num(132)}, fields: {SIZE: ['4', null]}})
    ].map(r => b('looks_say', {inputs: {MESSAGE: [3, r, [10, '']]}}));
    chain(b('event_whenflagclicked', {top: true}), ...stmts, ...reporters);
    const py = generatePython({blocks: sb3BlocksToVM(blocks)});
    assertValidPython(py);
    assert.doesNotMatch(py, /변환 안 됨|바꾸지 못한/);
    for (const expected of [
        'cm.connect("ble")', 'dxl.torque(1, False)', 'dxl.move_to(1, 180, speed=50)',
        'dxl.move_together({1: 10, 2: 20})', 'dxl.wheel(1, -30)', 'dxl.torque_all(True)',
        'port(1).led("left")', 'port(2).servo(150)', 'motion.stop("now")', 'motion.set_speed(120)',
        'cm.write(200, 91, 1, size=1)', 'print(dxl.temperature(1))', 'print(cm.button_pressed("mode"))',
        'print(cm.imu.pitch())', 'print(cm.imu.gyro("z"))', 'print(port(1).color_code())',
        'print(port(1).color() == "yellow")', 'print(cm.read(1, 132, size=4))',
        'dxl.move_together({3: 90, 4: 270})', 'dxl.wheels(1, 40, 2, -40)', 'dxl.grip(1, 200, force=25)',
        'print(dxl.model_name(1))'
    ]) {
        assert.ok(py.includes(expected), `missing: ${expected}\n${py}`);
    }
});

test('empty workspace shows a hint', () => {
    const py = generatePython({blocks: {}});
    assert.match(py, /초록 깃발을 클릭했을 때/);
    assertValidPython(py);
});

test('identifier sanitising and paren stripping', () => {
    assert.equal(sanitizeIdentifier('my variable', 'v'), 'my_variable');
    assert.equal(sanitizeIdentifier('1등 점수', 'v'), '_1등_점수');
    assert.equal(sanitizeIdentifier('for', 'v'), 'for_');
    assert.equal(sanitizeIdentifier('cm', 'v'), 'cm_');
    assert.equal(sanitizeIdentifier('!!!', 'v'), 'v');
    assert.equal(stripOuter('(a + b)'), 'a + b');
    assert.equal(stripOuter('(a) + (b)'), '(a) + (b)');
    assert.equal(stripOuter('("(" + b)'), '"(" + b');
});

// ---------------------------------------------------------------------------
// optional: same result when the project is deserialised by real scratch-vm
// ---------------------------------------------------------------------------
const VM_DIR = process.env.SCRATCH_VM_DIR ||
    path.resolve(__dirname, '../../scratch-editor/packages/scratch-vm');

test('real scratch-vm deserialisation gives identical Python', {skip: !fs.existsSync(path.join(VM_DIR, 'src/virtual-machine.js'))}, async () => {
    const VM = require(path.join(VM_DIR, 'src/virtual-machine'));
    const log = require(path.join(VM_DIR, 'src/util/log'));
    if (log && log.setLevel) log.setLevel('error');
    const vm = new VM();
    await vm.loadProject(makeProject());
    vm.setEditingTarget(vm.runtime.targets.find(t => !t.isStage).id);
    const {fromVM} = require('../src/python-generator');
    assert.equal(generatePython(fromVM(vm)), EXPECTED_MAIN);
});
