/**
 * Builds a small sb3 project.json used by the Python generator tests and by
 * the in-browser panel check. Written in the real sb3 serialization format so
 * it exercises scratch-vm's deserializer (inputs/fields/mutations/menus).
 */
const makeProject = () => {
    const blocks = {};
    let n = 0;
    const id = p => `${p}${++n}`;

    const block = (opcode, opts = {}) => {
        const bid = opts.id || id('b');
        blocks[bid] = {
            opcode,
            next: null,
            parent: null,
            inputs: opts.inputs || {},
            fields: opts.fields || {},
            shadow: Boolean(opts.shadow),
            topLevel: Boolean(opts.topLevel),
            ...(opts.topLevel ? {x: opts.x || 0, y: opts.y || 0} : {}),
            ...(opts.mutation ? {mutation: opts.mutation} : {})
        };
        return bid;
    };
    const menu = (parent, menuName, value) => {
        const mid = block(`cm550_menu_${menuName}`, {shadow: true, fields: {[menuName]: [String(value), null]}});
        blocks[mid].parent = parent;
        return [1, mid];
    };
    const num = v => [1, [4, String(v)]];
    const txt = v => [1, [10, String(v)]];
    const rep = (parent, rid, shadow = [4, '0']) => {
        blocks[rid].parent = parent;
        return [3, rid, shadow];
    };
    const bool = (parent, rid) => {
        blocks[rid].parent = parent;
        return [2, rid];
    };
    const chain = (...ids) => {
        for (let i = 0; i < ids.length - 1; i++) {
            blocks[ids[i]].next = ids[i + 1];
            blocks[ids[i + 1]].parent = ids[i];
        }
        return ids[0];
    };
    const sub = (parent, first) => {
        blocks[first].parent = parent;
        return [2, first];
    };

    // ---- custom block: 인사하기 (횟수) -------------------------------------
    const protoArg = block('argument_reporter_string_number', {shadow: true, fields: {VALUE: ['횟수', null]}});
    const proto = block('procedures_prototype', {
        shadow: true,
        inputs: {argA: [1, protoArg]},
        mutation: {
            tagName: 'mutation', children: [], proccode: '인사하기 %s',
            argumentids: '["argA"]', argumentnames: '["횟수"]', argumentdefaults: '[""]', warp: 'false'
        }
    });
    blocks[protoArg].parent = proto;
    const def = block('procedures_definition', {topLevel: true, x: 0, y: -300, inputs: {custom_block: [1, proto]}});
    blocks[proto].parent = def;
    const argUse = block('argument_reporter_string_number', {fields: {VALUE: ['횟수', null]}});
    const repeat = block('control_repeat', {});
    blocks[repeat].inputs.TIMES = rep(repeat, argUse, [6, '10']);
    const beep = block('cm550_cmBuzzerNote', {});
    blocks[beep].inputs.NOTE = menu(beep, 'note', 24);
    blocks[beep].inputs.SECS = num(0.2);
    blocks[repeat].inputs.SUBSTACK = sub(repeat, beep);
    chain(def, repeat);

    // ---- main script ---------------------------------------------------
    const flag = block('event_whenflagclicked', {topLevel: true, x: 0, y: 0});

    const connect = block('cm550_connect', {fields: {KIND: ['usb', null]}});
    const callHello = block('procedures_call', {
        inputs: {argA: num(3)},
        mutation: {tagName: 'mutation', children: [], proccode: '인사하기 %s', argumentids: '["argA"]', warp: 'false'}
    });

    const setVar = block('data_setvariableto', {fields: {VARIABLE: ['점수', 'varScore']}, inputs: {VALUE: txt(0)}});

    const torque = block('cm550_dxlTorque', {});
    blocks[torque].inputs.ID = menu(torque, 'dxlId', 1);
    blocks[torque].inputs.ONOFF = menu(torque, 'onOff', 'on');

    const forever = block('control_forever', {});

    // if <(포트 1 의 거리 값) > 300> then ... else ...
    const sensor = block('cm550_portSensor', {fields: {SENSOR: ['dms', null]}});
    blocks[sensor].inputs.PORT = menu(sensor, 'port5', 1);
    const gt = block('operator_gt', {});
    blocks[gt].inputs.OPERAND1 = rep(gt, sensor, [10, '']);
    blocks[gt].inputs.OPERAND2 = txt(300);
    const ifElse = block('control_if_else', {});
    blocks[ifElse].inputs.CONDITION = bool(ifElse, gt);

    const wheels = block('cm550_dxlWheelTwo', {});
    blocks[wheels].inputs.ID1 = menu(wheels, 'dxlId', 1);
    blocks[wheels].inputs.SPEED1 = num(50);
    blocks[wheels].inputs.ID2 = menu(wheels, 'dxlId', 2);
    blocks[wheels].inputs.SPEED2 = num(-50);

    const stop1 = block('cm550_dxlWheelTwo', {});
    blocks[stop1].inputs.ID1 = menu(stop1, 'dxlId', 1);
    blocks[stop1].inputs.SPEED1 = num(0);
    blocks[stop1].inputs.ID2 = menu(stop1, 'dxlId', 2);
    blocks[stop1].inputs.SPEED2 = num(0);
    const change = block('data_changevariableby', {fields: {VARIABLE: ['점수', 'varScore']}, inputs: {VALUE: num(1)}});
    const led = block('cm550_cmLed', {fields: {COLOR: ['red', null]}});
    blocks[led].inputs.ONOFF = menu(led, 'onOff', 'on');
    chain(stop1, change, led);

    blocks[ifElse].inputs.SUBSTACK = sub(ifElse, wheels);
    blocks[ifElse].inputs.SUBSTACK2 = sub(ifElse, stop1);

    // say (join "롤: " (기울기 roll))
    const tilt = block('cm550_cmTilt', {fields: {AXIS: ['roll', null]}});
    const join = block('operator_join', {});
    blocks[join].inputs.STRING1 = txt('롤: ');
    blocks[join].inputs.STRING2 = rep(join, tilt, [10, '']);
    const say = block('looks_say', {});
    blocks[say].inputs.MESSAGE = rep(say, join, [10, '']);

    const wait = block('control_wait', {inputs: {DURATION: num(0.1)}});
    chain(ifElse, say, wait);
    blocks[forever].inputs.SUBSTACK = sub(forever, ifElse);

    chain(flag, connect, callHello, setVar, torque, forever);

    // loose block (not attached to a hat)
    block('cm550_motionPlay', {topLevel: true, x: 400, y: 0, inputs: {PAGE: num(5)}});

    return {
        targets: [
            {
                isStage: true, name: 'Stage', variables: {varScore: ['점수', 0]}, lists: {}, broadcasts: {},
                blocks: {}, comments: {}, currentCostume: 0,
                costumes: [{name: 'backdrop1', dataFormat: 'svg', assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                    md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg', rotationCenterX: 240, rotationCenterY: 180}],
                sounds: [], volume: 100, layerOrder: 0, tempo: 60, videoTransparency: 50, videoState: 'on',
                textToSpeechLanguage: null
            },
            {
                isStage: false, name: '로봇', variables: {}, lists: {}, broadcasts: {}, blocks, comments: {},
                currentCostume: 0,
                costumes: [{name: 'costume1', bitmapResolution: 1, dataFormat: 'svg',
                    assetId: 'cd21514d0531fdffb22204e0ec5ed84a', md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
                    rotationCenterX: 0, rotationCenterY: 0}],
                sounds: [], volume: 100, layerOrder: 1, visible: true, x: 0, y: 0, size: 100, direction: 90,
                draggable: false, rotationStyle: 'all around'
            }
        ],
        monitors: [],
        extensions: ['cm550'],
        meta: {semver: '3.0.0', vm: '0.2.0', agent: 'cm550-test'}
    };
};

module.exports = {makeProject};
