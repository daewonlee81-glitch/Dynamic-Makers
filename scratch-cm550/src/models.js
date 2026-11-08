/**
 * DYNAMIXEL model registry: what the app needs to know per motor type so it
 * can adapt automatically (labels, dual-axis pairing, voltage safety, supported
 * operating modes). Model numbers from the ROBOTIS e-Manual control tables.
 */

/** 5-pin TTL X-series models that share the X control table used by the blocks. */
const MODELS = {
    1060: {name: 'XL430-W250', short: 'XL430', family: 'xl430', volts: [6.5, 12.0]},
    1090: {name: '2XL430-W250', short: '2XL430', family: 'xl430', dual: true, volts: [6.5, 12.0]},
    1070: {name: 'XC430-W150', short: 'XC430', family: 'xc430', volts: [6.5, 14.8]},
    1080: {name: 'XC430-W240', short: 'XC430', family: 'xc430', volts: [6.5, 14.8]},
    1160: {name: '2XC430-W250', short: '2XC430', family: 'xc430', dual: true, volts: [6.5, 12.0]},
    1190: {name: 'XL330-M077', short: 'XL330-M077', family: 'xl330', current: true, volts: [3.7, 6.0]},
    1200: {name: 'XL330-M288', short: 'XL330-M288', family: 'xl330', current: true, volts: [3.7, 6.0]},
    1210: {name: 'XC330-T181', short: 'XC330', family: 'xc330', current: true, volts: [10.0, 14.8]},
    1220: {name: 'XC330-T288', short: 'XC330', family: 'xc330', current: true, volts: [10.0, 14.8]},
    1230: {name: 'XC330-M181', short: 'XC330', family: 'xc330', current: true, volts: [3.7, 6.0]},
    1240: {name: 'XC330-M288', short: 'XC330', family: 'xc330', current: true, volts: [3.7, 6.0]},
    1000: {name: 'XH430-W350', short: 'XH430', family: 'xh430', current: true, volts: [10.0, 14.8]},
    1010: {name: 'XH430-W210', short: 'XH430', family: 'xh430', current: true, volts: [10.0, 14.8]},
    1040: {name: 'XH430-V350', short: 'XH430', family: 'xh430', current: true, volts: [11.1, 24.0]},
    1050: {name: 'XH430-V210', short: 'XH430', family: 'xh430', current: true, volts: [11.1, 24.0]},
    1020: {name: 'XM430-W350', short: 'XM430', family: 'xm430', current: true, volts: [10.0, 14.8]},
    1030: {name: 'XM430-W210', short: 'XM430', family: 'xm430', current: true, volts: [10.0, 14.8]}
};

/** Models that answer Protocol 2.0 but do not work with the CM-550 / these blocks. */
const INCOMPATIBLE = {
    350: 'XL-320 (CM-550과 호환되지 않음)'
};

const modelInfo = model => MODELS[model] || null;
const modelName = model => (MODELS[model] ? MODELS[model].name :
    (INCOMPATIBLE[model] || (model === 450 ? 'CM-550' : `모델 ${model}`)));

/**
 * Pair up the axes of dual-axis modules (2XL430 / 2XC430).
 * Each axis has its own ID; ROBOTIS assigns consecutive IDs to the two axes
 * (A = first, B = second), which is what kits ship with. IDs of the same
 * dual model are paired greedily in ascending order (n, n+1).
 * @param {Array<{id:number, model:number}>} motors
 * @returns {Array<{a:number, b:number, model:number}>}
 */
const pairDualAxes = motors => {
    const dual = motors.filter(m => MODELS[m.model] && MODELS[m.model].dual)
        .sort((x, y) => x.id - y.id);
    const pairs = [];
    for (let i = 0; i + 1 < dual.length; i++) {
        const a = dual[i];
        const b = dual[i + 1];
        if (b.id === a.id + 1 && b.model === a.model) {
            pairs.push({a: a.id, b: b.id, model: a.model});
            i++;
        }
    }
    return pairs;
};

/**
 * Describe a scan result for UI: label per ID, module pairs, warnings.
 * @param {Array<{id:number, model:number}>} motors
 * @param {number} [busVolts] controller input voltage (DYNAMIXEL bus is fed from it)
 */
const describeMotors = (motors, busVolts) => {
    const pairs = pairDualAxes(motors);
    const axis = {};
    pairs.forEach((p, i) => {
        axis[p.a] = {module: i + 1, axis: 'A', sibling: p.b};
        axis[p.b] = {module: i + 1, axis: 'B', sibling: p.a};
    });
    const warnings = [];
    const labels = {};
    for (const m of motors) {
        const info = MODELS[m.model];
        const ax = axis[m.id];
        labels[m.id] = info ? `${info.short}${ax ? ` ${ax.axis}축` : ''}` : modelName(m.model);
        if (!info) {
            warnings.push(`ID ${m.id}: ${modelName(m.model)} — 블록이 지원하지 않는 모델입니다.`);
        } else if (busVolts && busVolts > info.volts[1] + 0.5) {
            warnings.push(`ID ${m.id}: ${info.name}의 정격 전압은 ${info.volts[0]}~${info.volts[1]} V인데 ` +
                `CM-550이 ${busVolts.toFixed(1)} V를 공급하고 있습니다. 모터가 손상될 수 있으니 바로 분리하세요.`);
        }
    }
    const ids = motors.map(m => m.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length) warnings.push(`같은 ID를 가진 모터가 있습니다: ${[...new Set(dupes)].join(', ')}`);
    return {labels, pairs, axis, warnings};
};

module.exports = {MODELS, INCOMPATIBLE, modelInfo, modelName, pairDualAxes, describeMotors};
