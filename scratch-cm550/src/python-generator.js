/**
 * Scratch blocks -> Python source (read-only view, Pybricks style).
 *
 * Input is the raw scratch-vm block map of one target (target.blocks._blocks)
 * plus the variables visible to it. Output is Python that uses the `cm550`
 * module API documented in docs/python-api.md.
 *
 * The generator is pure (no DOM, no VM dependency) so it runs in scratch-gui,
 * TurboWarp and Node tests alike.
 */

const INDENT = '    ';

const PY_KEYWORDS = new Set([
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
    'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
    'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
    // names provided by `from cm550 import *` or builtins we emit
    'cm', 'dxl', 'port', 'motion', 'wait', 'timer', 'reset_timer', 'key_pressed', 'broadcast',
    'stop_all', 'start', 'answer', 'print', 'input', 'len', 'str', 'int', 'round', 'abs', 'range',
    'math', 'random', 'list', 'when_flag_clicked', 'when_key_pressed', 'when_broadcast', 'when_clicked'
]);

const pyString = s => JSON.stringify(String(s));

const isNumeric = s => {
    if (typeof s === 'number') return Number.isFinite(s);
    // plain decimal numbers only; keep "007", "1e3", " 5" etc. as text
    return /^-?(0|[1-9]\d*)(\.\d+)?$/.test(String(s)) || /^-?\.\d+$/.test(String(s));
};

const formatNumber = v => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '0';
    return String(n);
};

/**
 * Remove one pair of wrapping parentheses if they enclose the whole string.
 * @param s
 */
const stripOuter = s => {
    if (!s.startsWith('(') || !s.endsWith(')')) return s;
    let depth = 0;
    let inStr = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (inStr) {
            if (c === '\\') i++;
            else if (c === '"') inStr = false;
            continue;
        }
        if (c === '"') inStr = true;
        else if (c === '(') depth++;
        else if (c === ')') {
            depth--;
            if (depth === 0 && i !== s.length - 1) return s;
        }
    }
    return s.slice(1, -1);
};

const sanitizeIdentifier = (name, fallback) => {
    let id = String(name || '').trim()
        .replace(/[^\p{L}\p{N}_]+/gu, '_')
        .replace(/^_+|_+$/g, '');
    if (!id) id = fallback;
    if (/^\p{N}/u.test(id)) id = `_${id}`;
    if (PY_KEYWORDS.has(id)) id = `${id}_`;
    return id;
};

const parseJSON = (s, fallback) => {
    if (Array.isArray(s)) return s;
    try {
        return JSON.parse(s);
    } catch (e) {
        return fallback;
    }
};

const MATHOP = {
    'abs': x => `abs(${x})`,
    'floor': x => `math.floor(${x})`,
    'ceiling': x => `math.ceil(${x})`,
    'sqrt': x => `math.sqrt(${x})`,
    'sin': x => `math.sin(math.radians(${x}))`,
    'cos': x => `math.cos(math.radians(${x}))`,
    'tan': x => `math.tan(math.radians(${x}))`,
    'asin': x => `math.degrees(math.asin(${x}))`,
    'acos': x => `math.degrees(math.acos(${x}))`,
    'atan': x => `math.degrees(math.atan(${x}))`,
    'ln': x => `math.log(${x})`,
    'log': x => `math.log10(${x})`,
    'e ^': x => `math.exp(${x})`,
    '10 ^': x => `(10 ** ${x})`
};

class PythonGenerator {
    constructor ({blocks, variables = [], targetName = ''}) {
        this.blocks = blocks || {};
        this.targetName = targetName;
        this.uses = new Set();
        this.warnings = [];
        this.usedVarIds = new Set();
        this.varNames = new Map(); // variable id -> python name
        this.varsById = new Map();
        this.procNames = new Map(); // proccode -> python name
        this.takenNames = new Set();
        this.fn = null; // {assigned:Set, params:Map, isFunction:bool}
        this.indent = 0;
        this.lines = [];

        for (const v of variables) this.varsById.set(v.id, v);
        // stable naming: stage variables first, then sprite variables, in given order
        for (const v of variables) {
            if (v.type === 'broadcast_msg') continue;
            const fallback = v.type === 'list' ? 'my_list' : 'var';
            this.varNames.set(v.id, this._uniqueName(sanitizeIdentifier(v.name, fallback)));
        }
    }

    _uniqueName (base) {
        let name = base;
        let i = 2;
        while (this.takenNames.has(name)) name = `${base}_${i++}`;
        this.takenNames.add(name);
        return name;
    }

    // ------------------------------------------------------------------
    // emission helpers
    // ------------------------------------------------------------------

    line (text) {
        this.lines.push(INDENT.repeat(this.indent) + text);
    }

    /**
     * Emit a nested statement stack (SUBSTACK etc). Emits `pass` when empty.
     * @param startId
     */
    body (startId) {
        this.indent++;
        const before = this.lines.length;
        this.stack(startId);
        if (this.lines.length === before) this.line('pass');
        this.indent--;
    }

    stack (startId) {
        let id = startId;
        let guard = 0;
        while (id && this.blocks[id] && guard++ < 10000) {
            const block = this.blocks[id];
            this.statement(block);
            id = block.next;
        }
    }

    // ------------------------------------------------------------------
    // argument access
    // ------------------------------------------------------------------

    /**
     * Read an argument either from a field (dropdown without reporters)
     * or from an input (shadow literal or reporter block).
     * @param block
     * @param name
     * @returns {{literal: boolean, value?: string, code?: string}|null}
     */
    arg (block, name) {
        if (block.fields && block.fields[name]) {
            return {literal: true, value: block.fields[name].value};
        }
        const input = block.inputs && block.inputs[name];
        if (!input || !input.block) return null;
        const inner = this.blocks[input.block];
        if (!inner) return null;
        if (inner.shadow) {
            const fields = inner.fields || {};
            const keys = Object.keys(fields);
            return {literal: true, value: keys.length ? fields[keys[0]].value : ''};
        }
        return {literal: false, code: this.expr(inner)};
    }

    /**
     * Numeric argument.
     * @param block
     * @param name
     */
    num (block, name) {
        const a = this.arg(block, name);
        if (!a) return '0';
        if (!a.literal) return a.code;
        return isNumeric(a.value) ? formatNumber(a.value) : (String(a.value).trim() === '' ? '0' : pyString(a.value));
    }

    /**
     * Any value: numbers stay numbers, other literals become strings.
     * @param block
     * @param name
     */
    val (block, name) {
        const a = this.arg(block, name);
        if (!a) return '""';
        if (!a.literal) return a.code;
        return isNumeric(a.value) ? formatNumber(a.value) : pyString(a.value);
    }

    /**
     * Text argument (always a string literal when literal).
     * @param block
     * @param name
     */
    text (block, name) {
        const a = this.arg(block, name);
        if (!a) return '""';
        return a.literal ? pyString(a.value) : a.code;
    }

    /**
     * Boolean input slot (hexagonal). Empty slot = False.
     * @param block
     * @param name
     */
    cond (block, name) {
        const a = this.arg(block, name);
        if (!a) return 'False';
        if (a.literal) return a.value ? 'True' : 'False';
        return a.code;
    }

    /**
     * on/off menu -> True/False
     * @param block
     * @param name
     */
    onOff (block, name) {
        const a = this.arg(block, name);
        if (!a) return 'True';
        if (!a.literal) return a.code;
        const s = String(a.value).toLowerCase();
        return (s === 'on' || s === '1' || s === 'true' || s === '켜기') ? 'True' : 'False';
    }

    /**
     * Raw menu choice as a string literal (or expression).
     * @param block
     * @param name
     * @param map
     */
    choice (block, name, map) {
        const a = this.arg(block, name);
        if (!a) return '""';
        if (!a.literal) return a.code;
        const v = map && Object.prototype.hasOwnProperty.call(map, a.value) ? map[a.value] : a.value;
        return pyString(v);
    }

    /**
     * 1-based Scratch index -> 0-based Python index expression.
     * @param block
     * @param name
     */
    index (block, name) {
        const a = this.arg(block, name);
        if (!a) return '0';
        if (a.literal && isNumeric(a.value)) return formatNumber(Number(a.value) - 1);
        const code = a.literal ? pyString(a.value) : a.code;
        return `${code} - 1`;
    }

    varName (field) {
        if (!field) return 'var';
        const id = field.id;
        if (id && this.varNames.has(id)) {
            this.usedVarIds.add(id);
            return this.varNames.get(id);
        }
        // variable not in the provided list (e.g. deleted) -> derive from name
        const name = sanitizeIdentifier(field.value, 'var');
        if (id) {
            this.varNames.set(id, name);
            this.usedVarIds.add(id);
            if (!this.varsById.has(id)) this.varsById.set(id, {id, name: field.value, type: '', value: 0});
        }
        return name;
    }

    assign (name) {
        if (this.fn && this.fn.isFunction) this.fn.assigned.add(name);
    }

    unsupportedExpr (block) {
        this.warnings.push(block.opcode);
        return 'None';
    }

    // ------------------------------------------------------------------
    // expressions (reporters / booleans)
    // ------------------------------------------------------------------

    expr (block) {
        const op = block.opcode;
        if (op.startsWith('cm550_')) return this.cm550Expr(block, op.slice(6));
        switch (op) {
        // AI 학습 (Dynamic Makers)
        case 'dmai_aiLabel': this.uses.add('ai'); return 'ai.label()';
        case 'dmai_aiIs': this.uses.add('ai'); return `(ai.label() == ${this.choice(block, 'CLASS')})`;
        case 'dmai_aiConfidence': this.uses.add('ai'); return `ai.confidence(${this.choice(block, 'CLASS')})`;
        case 'dmai_skelVisible': return 'body.visible()';
        case 'dmai_walking': return 'walk.is_walking()';
        case 'dmai_skelAngle': return `body.angle(${this.choice(block, 'JOINT')})`;
        case 'dmai_skelPos': return `body.position(${this.choice(block, 'PART')}, ${this.choice(block, 'AXIS')})`;
        // operators
        case 'operator_add': return `(${this.num(block, 'NUM1')} + ${this.num(block, 'NUM2')})`;
        case 'operator_subtract': return `(${this.num(block, 'NUM1')} - ${this.num(block, 'NUM2')})`;
        case 'operator_multiply': return `(${this.num(block, 'NUM1')} * ${this.num(block, 'NUM2')})`;
        case 'operator_divide': return `(${this.num(block, 'NUM1')} / ${this.num(block, 'NUM2')})`;
        case 'operator_mod': return `(${this.num(block, 'NUM1')} % ${this.num(block, 'NUM2')})`;
        case 'operator_round': return `round(${stripOuter(this.num(block, 'NUM'))})`;
        case 'operator_random': {
            this.uses.add('random');
            const a = this.arg(block, 'FROM');
            const b = this.arg(block, 'TO');
            const decimal = [a, b].some(x => x && x.literal && String(x.value).includes('.'));
            const fn = decimal ? 'random.uniform' : 'random.randint';
            return `${fn}(${stripOuter(this.num(block, 'FROM'))}, ${stripOuter(this.num(block, 'TO'))})`;
        }
        case 'operator_gt': return `(${this.val(block, 'OPERAND1')} > ${this.val(block, 'OPERAND2')})`;
        case 'operator_lt': return `(${this.val(block, 'OPERAND1')} < ${this.val(block, 'OPERAND2')})`;
        case 'operator_equals': return `(${this.val(block, 'OPERAND1')} == ${this.val(block, 'OPERAND2')})`;
        case 'operator_and': return `(${this.cond(block, 'OPERAND1')} and ${this.cond(block, 'OPERAND2')})`;
        case 'operator_or': return `(${this.cond(block, 'OPERAND1')} or ${this.cond(block, 'OPERAND2')})`;
        case 'operator_not': return `(not ${this.cond(block, 'OPERAND')})`;
        case 'operator_join': {
            const s = x => (x.startsWith('"') ? x : `str(${stripOuter(x)})`);
            return `(${s(this.text(block, 'STRING1'))} + ${s(this.text(block, 'STRING2'))})`;
        }
        case 'operator_letter_of':
            return `str(${stripOuter(this.text(block, 'STRING'))})[${stripOuter(this.index(block, 'LETTER'))}]`;
        case 'operator_length': return `len(str(${stripOuter(this.text(block, 'STRING'))}))`;
        case 'operator_contains':
            return `(${this.text(block, 'STRING2')} in str(${stripOuter(this.text(block, 'STRING1'))}))`;
        case 'operator_mathop': {
            const opName = block.fields && block.fields.OPERATOR ? block.fields.OPERATOR.value : 'abs';
            const f = MATHOP[opName] || MATHOP.abs;
            if (opName !== 'abs') this.uses.add('math');
            return f(stripOuter(this.num(block, 'NUM')));
        }

        // data
        case 'data_variable': return this.varName(block.fields.VARIABLE);
        case 'data_listcontents': return this.varName(block.fields.LIST);
        case 'data_itemoflist':
            return `${this.varName(block.fields.LIST)}[${stripOuter(this.index(block, 'INDEX'))}]`;
        case 'data_itemnumoflist':
            return `(${this.varName(block.fields.LIST)}.index(${stripOuter(this.val(block, 'ITEM'))}) + 1)`;
        case 'data_lengthoflist': return `len(${this.varName(block.fields.LIST)})`;
        case 'data_listcontainsitem': return `(${this.val(block, 'ITEM')} in ${this.varName(block.fields.LIST)})`;

        // sensing
        case 'sensing_timer': return 'timer()';
        case 'sensing_answer': return 'answer';
        case 'sensing_keypressed': return `key_pressed(${this.text(block, 'KEY_OPTION')})`;

        // custom block parameters
        case 'argument_reporter_string_number':
        case 'argument_reporter_boolean': {
            const label = block.fields && block.fields.VALUE ? block.fields.VALUE.value : 'arg';
            if (this.fn && this.fn.params && this.fn.params.has(label)) return this.fn.params.get(label);
            return sanitizeIdentifier(label, 'arg');
        }

        default:
            return this.unsupportedExpr(block);
        }
    }

    cm550Expr (block, op) {
        const id = () => stripOuter(this.num(block, 'ID'));
        const portOf = () => `port(${stripOuter(this.num(block, 'PORT'))})`;
        switch (op) {
        case 'isConnected': return 'cm.is_connected()';
        case 'lastError': return 'cm.last_error()';
        case 'dxlRead': {
            const prop = block.fields && block.fields.PROP ? block.fields.PROP.value : 'position';
            const method = {
                position: 'position',
                velocity: 'velocity',
                load: 'load',
                temperature: 'temperature',
                voltage: 'voltage',
                model: 'model',
                error: 'hardware_error'
            }[prop] || 'position';
            return `dxl.${method}(${id()})`;
        }
        case 'dxlIsMoving': return `dxl.is_moving(${id()})`;
        case 'dxlModelName': return `dxl.model_name(${id()})`;
        case 'poseCount': return 'pose.count()';
        case 'dxlScan': return 'dxl.scan()';
        case 'cmButton': return `cm.button_pressed(${this.choice(block, 'BUTTON')})`;
        case 'cmTilt': {
            const axis = block.fields && block.fields.AXIS ? block.fields.AXIS.value : 'roll';
            return `cm.imu.${['roll', 'pitch', 'yaw'].includes(axis) ? axis : 'roll'}()`;
        }
        case 'cmGyro': return `cm.imu.gyro(${this.choice(block, 'AXIS')})`;
        case 'cmAccel': return `cm.imu.accel(${this.choice(block, 'AXIS')})`;
        case 'cmVoltage': return 'cm.voltage()';
        case 'cmTemperature': return 'cm.temperature()';
        case 'cmSoundCount': return 'cm.sound_count()';
        case 'portSensor': {
            const sensor = block.fields && block.fields.SENSOR ? block.fields.SENSOR.value : 'ir';
            const method = {
                ir: 'ir',
                dms: 'dms',
                touch: 'touch',
                brightness: 'brightness',
                color: 'color_code',
                temperature: 'temperature',
                magnet: 'magnet',
                motion: 'motion',
                moisture: 'moisture',
                user: 'analog'
            }[sensor] || 'ir';
            return `${portOf()}.${method}()`;
        }
        case 'portTouch': return `${portOf()}.touched()`;
        case 'portColor': return `(${portOf()}.color() == ${this.choice(block, 'COLOR')})`;
        case 'motionIsPlaying': return 'motion.is_playing()';
        case 'motionCount': return 'motion.count()';
        case 'rawRead':
            return `cm.read(${stripOuter(this.num(block, 'ID'))}, ${stripOuter(this.num(block, 'ADDR'))}, ` +
                `size=${stripOuter(this.num(block, 'SIZE'))})`;
        default: return this.unsupportedExpr(block);
        }
    }

    // ------------------------------------------------------------------
    // statements
    // ------------------------------------------------------------------

    statement (block) {
        const op = block.opcode;
        if (op.startsWith('cm550_')) {
            this.cm550Statement(block, op.slice(6));
            return;
        }
        if (op === 'dmai_skelFollow') {
            const dir = this.choice(block, 'DIR') === '"-1"' ? -1 : 1;
            this.line(`dxl.follow(${this.num(block, 'ID')}, body.angle(${this.choice(block, 'JOINT')}), ` +
                `center=${this.num(block, 'CENTER')}, direction=${dir})`);
            return;
        }
        if (op === 'dmai_walkGait') {
            this.line(`walk.gait(${this.num(block, 'SECS')}, slow=${this.num(block, 'SLOW')})  # 3D 탭에서 학습한 걸음`);
            return;
        }
        if (op === 'dmai_walkPolicy') {
            this.line(`walk.policy(${this.num(block, 'SECS')})  # Python 키트로 학습한 신경망`);
            return;
        }
        if (op === 'dmai_walkStop') {
            this.line('walk.stop()');
            return;
        }
        if (op === 'dmai_skelSwitch') {
            this.line(this.choice(block, 'STATE') === '"off"' ? 'body.stop()' : 'body.start()');
            return;
        }
        if (op === 'dmai_aiSwitch') {
            this.uses.add('ai');
            this.line(this.choice(block, 'STATE') === '"off"' ? 'ai.stop()' : 'ai.start()');
            return;
        }
        const a = n => stripOuter(this.num(block, n));
        switch (op) {
        // control
        case 'control_wait': this.line(`wait(${a('DURATION')})`); break;
        case 'control_repeat': {
            const t = this.arg(block, 'TIMES');
            const times = t && t.literal && isNumeric(t.value) ?
                String(Math.max(0, Math.round(Number(t.value)))) :
                `int(${stripOuter(this.num(block, 'TIMES'))})`;
            this.line(`for _ in range(${times}):`);
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            break;
        }
        case 'control_forever':
            this.line('while True:');
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            break;
        case 'control_if':
            this.line(`if ${stripOuter(this.cond(block, 'CONDITION'))}:`);
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            break;
        case 'control_if_else':
            this.line(`if ${stripOuter(this.cond(block, 'CONDITION'))}:`);
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            this.line('else:');
            this.body(block.inputs.SUBSTACK2 && block.inputs.SUBSTACK2.block);
            break;
        case 'control_wait_until':
            this.line(`while not ${this.cond(block, 'CONDITION')}:`);
            this.indent++;
            this.line('wait(0.01)');
            this.indent--;
            break;
        case 'control_repeat_until':
            this.line(`while not ${this.cond(block, 'CONDITION')}:`);
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            break;
        case 'control_while':
            this.line(`while ${stripOuter(this.cond(block, 'CONDITION'))}:`);
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            break;
        case 'control_stop': {
            const opt = block.fields && block.fields.STOP_OPTION ? block.fields.STOP_OPTION.value : 'all';
            if (opt === 'all') this.line('stop_all()');
            else if (opt === 'this script') this.line(this.fn && this.fn.isFunction ? 'return' : 'stop_all()');
            else this.line('# 이 스프라이트의 다른 스크립트 멈추기 (Python에서는 지원하지 않음)');
            break;
        }

        // events
        case 'event_broadcast': this.line(`broadcast(${this.text(block, 'BROADCAST_INPUT')})`); break;
        case 'event_broadcastandwait':
            this.line(`broadcast(${this.text(block, 'BROADCAST_INPUT')}, wait=True)`);
            break;

        // data
        case 'data_setvariableto': {
            const name = this.varName(block.fields.VARIABLE);
            this.assign(name);
            this.line(`${name} = ${stripOuter(this.val(block, 'VALUE'))}`);
            break;
        }
        case 'data_changevariableby': {
            const name = this.varName(block.fields.VARIABLE);
            this.assign(name);
            this.line(`${name} += ${stripOuter(this.num(block, 'VALUE'))}`);
            break;
        }
        case 'data_showvariable':
        case 'data_hidevariable':
        case 'data_showlist':
        case 'data_hidelist':
            break; // stage-only display, nothing to do in Python
        case 'data_addtolist':
            this.line(`${this.varName(block.fields.LIST)}.append(${stripOuter(this.val(block, 'ITEM'))})`);
            break;
        case 'data_deleteoflist': {
            const lst = this.varName(block.fields.LIST);
            const idx = this.arg(block, 'INDEX');
            if (idx && idx.literal && idx.value === 'all') this.line(`${lst}.clear()`);
            else if (idx && idx.literal && idx.value === 'last') this.line(`${lst}.pop()`);
            else this.line(`del ${lst}[${stripOuter(this.index(block, 'INDEX'))}]`);
            break;
        }
        case 'data_deletealloflist': this.line(`${this.varName(block.fields.LIST)}.clear()`); break;
        case 'data_insertatlist':
            this.line(`${this.varName(block.fields.LIST)}.insert(${stripOuter(this.index(block, 'INDEX'))}, ` +
                `${stripOuter(this.val(block, 'ITEM'))})`);
            break;
        case 'data_replaceitemoflist':
            this.line(`${this.varName(block.fields.LIST)}[${stripOuter(this.index(block, 'INDEX'))}] = ` +
                `${stripOuter(this.val(block, 'ITEM'))}`);
            break;

        // sensing
        case 'sensing_resettimer': this.line('reset_timer()'); break;
        case 'sensing_askandwait':
            this.assign('answer');
            this.line(`answer = input(${stripOuter(this.text(block, 'QUESTION'))})`);
            break;

        // looks: map speech to print so students see output
        case 'looks_say':
        case 'looks_think':
            this.line(`print(${stripOuter(this.val(block, 'MESSAGE'))})`);
            break;
        case 'looks_sayforsecs':
        case 'looks_thinkforsecs':
            this.line(`print(${stripOuter(this.val(block, 'MESSAGE'))})`);
            this.line(`wait(${a('SECS')})`);
            break;

        // custom blocks
        case 'procedures_call': this.procedureCall(block); break;

        default:
            this.warnings.push(op);
            this.line(`# [변환 안 됨] ${op}`);
        }
    }

    cm550Statement (block, op) {
        const n = name => stripOuter(this.num(block, name));
        const id = () => n('ID');
        const portOf = () => `port(${n('PORT')})`;
        switch (op) {
        case 'connect': this.line(`cm.connect(${this.choice(block, 'KIND')})`); break;
        case 'disconnect': this.line('cm.disconnect()'); break;
        case 'dxlTorque': this.line(`dxl.torque(${id()}, ${this.onOff(block, 'ONOFF')})`); break;
        case 'dxlMoveTo': this.line(`dxl.move_to(${id()}, ${n('DEG')}, speed=${n('SPEED')})`); break;
        case 'dxlMoveToWait': this.line(`dxl.move_to(${id()}, ${n('DEG')}, speed=${n('SPEED')}, wait=True)`); break;
        case 'dxlMoveTwo':
            this.line(`dxl.move_together({${n('ID1')}: ${n('DEG1')}, ${n('ID2')}: ${n('DEG2')}})`);
            break;
        case 'dxlTogether':
            this.line(`with dxl.together(${n('SECS')}):`);
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            break;
        case 'dxlGoal': this.line(`dxl.goal(${id()}, ${n('DEG')})`); break;
        case 'dxlWheel': this.line(`dxl.wheel(${id()}, ${n('SPEED')})`); break;
        case 'dxlWheelTwo':
            this.line(`dxl.wheels(${n('ID1')}, ${n('SPEED1')}, ${n('ID2')}, ${n('SPEED2')})`);
            break;
        case 'dxlStop': this.line(`dxl.stop(${id()})`); break;
        case 'dxlModuleMove': {
            const [a, b] = this.moduleIds(block);
            this.line(`dxl.move_together({${a}: ${n('DEGA')}, ${b}: ${n('DEGB')}})`);
            break;
        }
        case 'dxlModuleWheels': {
            const [a, b] = this.moduleIds(block);
            this.line(`dxl.wheels(${a}, ${n('SPA')}, ${b}, ${n('SPB')})`);
            break;
        }
        case 'dxlGrip': this.line(`dxl.grip(${id()}, ${n('DEG')}, force=${n('FORCE')})`); break;
        case 'dxlSetMode':
            this.line(`dxl.set_mode(${id()}, ${this.choice(block, 'MODE', {velocity: 'wheel'})})`);
            break;
        case 'dxlLed': this.line(`dxl.led(${id()}, ${this.onOff(block, 'ONOFF')})`); break;
        case 'poseRelax': this.line(`pose.torque(${this.onOff(block, 'STATE')})  # False = 힘 빼기, True = 힘 주기`); break;
        case 'poseRecord': this.line(`pose.record(${this.num(block, 'N')})`); break;
        case 'posePlay': this.line(`pose.play(${this.num(block, 'N')}, ${this.num(block, 'SECS')})`); break;
        case 'posePlayAll': this.line(`pose.play_all(${this.num(block, 'SECS')})`); break;
        case 'poseClear': this.line('pose.clear()'); break;
        case 'dxlAllTorque': this.line(`dxl.torque_all(${this.onOff(block, 'ONOFF')})`); break;
        case 'cmLedColor': this.line(`cm.led_color(${this.choice(block, 'COLOR')})`); break;
        case 'cmLed': this.line(`cm.led(${this.choice(block, 'COLOR')}, ${this.onOff(block, 'ONOFF')})`); break;
        case 'cmBuzzerNote': this.line(`cm.play_note(${n('NOTE')}, ${n('SECS')})`); break;
        case 'cmBuzzerMelody': this.line(`cm.play_melody(${n('INDEX')})`); break;
        case 'cmSoundReset': this.line('cm.reset_sound_count()'); break;
        case 'cmDxlPower': this.line(`cm.dxl_power(${this.onOff(block, 'ONOFF')})`); break;
        case 'portLed': this.line(`${portOf()}.led(${this.choice(block, 'STATE')})`); break;
        case 'portServo': this.line(`${portOf()}.servo(${n('DEG')})`); break;
        case 'portMotor': this.line(`${portOf()}.motor(${n('SPEED')})`); break;
        case 'motionPlay': this.line(`motion.play(${n('PAGE')})`); break;
        case 'motionPlayWait': this.line(`motion.play(${n('PAGE')}, wait=True)`); break;
        case 'motionStop': this.line(`motion.stop(${this.choice(block, 'HOW')})`); break;
        case 'motionSpeed': this.line(`motion.set_speed(${n('PERCENT')})`); break;
        case 'motionNext': this.line(`motion.set_next(${n('PAGE')})`); break;
        case 'rawWrite':
            this.line(`cm.write(${n('ID')}, ${n('ADDR')}, ${n('VALUE')}, size=${n('SIZE')})`);
            break;
        default:
            // reporters dropped into a statement position are not possible in Scratch,
            // but keep the output valid if the block set grows.
            this.warnings.push(`cm550_${op}`);
            this.line(`# [변환 안 됨] cm550_${op}`);
        }
    }

    /** "a,b" module menu value -> two id literals */
    moduleIds (block) {
        const a = this.arg(block, 'MODULE');
        const parts = a && a.literal ? String(a.value).split(',') : ['1', '2'];
        return parts.slice(0, 2).map(x => formatNumber(x));
    }

    // ------------------------------------------------------------------
    // custom blocks ("내 블록")
    // ------------------------------------------------------------------

    procInfo (mutation) {
        const proccode = mutation.proccode || '';
        if (!this.procNames.has(proccode)) {
            const words = proccode.split(/%[snb]/).map(s => s.trim())
                .filter(Boolean)
                .join('_');
            this.procNames.set(proccode, this._uniqueName(sanitizeIdentifier(words, 'my_block')));
        }
        return {
            name: this.procNames.get(proccode),
            argumentIds: parseJSON(mutation.argumentids, []),
            argumentNames: parseJSON(mutation.argumentnames, [])
        };
    }

    procedureCall (block) {
        if (!block.mutation) {
            this.line('# [변환 안 됨] procedures_call');
            return;
        }
        const {name, argumentIds} = this.procInfo(block.mutation);
        const args = argumentIds.map(argId => {
            const input = block.inputs && block.inputs[argId];
            if (!input || !input.block) return 'False';
            return stripOuter(this.val(block, argId));
        });
        this.line(`${name}(${args.join(', ')})`);
    }

    procedureDefinition (hat) {
        const protoInput = hat.inputs && hat.inputs.custom_block;
        const proto = protoInput && this.blocks[protoInput.block];
        if (!proto || !proto.mutation) return;
        const {name, argumentNames} = this.procInfo(proto.mutation);
        const params = new Map();
        const used = new Set();
        for (const label of argumentNames) {
            let p = sanitizeIdentifier(label, 'arg');
            while (used.has(p)) p = `${p}_`;
            used.add(p);
            params.set(label, p);
        }
        this.emitFunction(`def ${name}(${Array.from(params.values()).join(', ')}):`, hat.next, params);
    }

    /**
     * Emit `def ...:` + body, with `global` declarations for assigned variables.
     * @param header
     * @param bodyStartId
     * @param params
     * @param decorator
     */
    emitFunction (header, bodyStartId, params = new Map(), decorator = null) {
        const saved = {lines: this.lines, fn: this.fn, indent: this.indent};
        this.lines = [];
        this.fn = {assigned: new Set(), params, isFunction: true};
        this.indent = 1;
        this.stack(bodyStartId);
        const bodyLines = this.lines;
        const assigned = Array.from(this.fn.assigned).filter(v => !Array.from(params.values()).includes(v));
        this.lines = saved.lines;
        this.fn = saved.fn;
        this.indent = saved.indent;

        if (decorator) this.line(decorator);
        this.line(header);
        if (assigned.length) this.line(`${INDENT}global ${assigned.join(', ')}`);
        if (bodyLines.length) this.lines.push(...bodyLines);
        else if (!assigned.length) this.line(`${INDENT}pass`);
        this.line('');
    }

    // ------------------------------------------------------------------
    // whole program
    // ------------------------------------------------------------------

    hatDecorator (hat) {
        switch (hat.opcode) {
        case 'event_whenflagclicked': return '@when_flag_clicked';
        case 'event_whenkeypressed':
            return `@when_key_pressed(${pyString(hat.fields.KEY_OPTION ? hat.fields.KEY_OPTION.value : 'space')})`;
        case 'event_whenbroadcastreceived':
            return `@when_broadcast(${pyString(hat.fields.BROADCAST_OPTION ? hat.fields.BROADCAST_OPTION.value : '')})`;
        case 'event_whenthisspriteclicked':
        case 'event_whenstageclicked':
            return '@when_clicked';
        case 'dmai_aiWhen': {
            const c = hat.inputs && hat.inputs.CLASS && this.blocks[hat.inputs.CLASS.block];
            const name = c && c.fields ? Object.values(c.fields)[0].value : '';
            return `@ai.when_recognized(${pyString(name)})`;
        }
        default: return null;
        }
    }

    generate () {
        const tops = Object.values(this.blocks)
            .filter(b => b.topLevel && !b.shadow)
            .sort((a, b) => ((a.y || 0) - (b.y || 0)) || ((a.x || 0) - (b.x || 0)));

        const procedures = tops.filter(b => b.opcode === 'procedures_definition');
        const hats = tops.filter(b => this.hatDecorator(b));
        const unknownHats = tops.filter(b => b.opcode !== 'procedures_definition' && !this.hatDecorator(b) &&
            /^(event_when|control_start_as_clone|cm550_when)/.test(b.opcode));
        const loose = tops.length - procedures.length - hats.length - unknownHats.length;

        const flagHats = hats.filter(h => h.opcode === 'event_whenflagclicked');
        const simpleMain = flagHats.length === 1 && hats.length === 1;

        // procedures first so that callers below can use them
        for (const p of procedures) this.procedureDefinition(p);

        if (simpleMain) {
            this.line('# 초록 깃발을 클릭했을 때');
            this.fn = {assigned: new Set(), params: new Map(), isFunction: false};
            const before = this.lines.length;
            this.stack(flagHats[0].next);
            if (this.lines.length === before) this.line('pass');
            this.fn = null;
        } else if (hats.length) {
            const counters = {};
            for (const hat of hats) {
                const base = {
                    event_whenflagclicked: 'on_start',
                    event_whenkeypressed: 'on_key',
                    event_whenbroadcastreceived: 'on_message',
                    event_whenthisspriteclicked: 'on_click',
                    event_whenstageclicked: 'on_click',
                    dmai_aiWhen: 'on_ai'
                }[hat.opcode];
                counters[base] = (counters[base] || 0) + 1;
                const fname = this._uniqueName(counters[base] === 1 ? base : `${base}_${counters[base]}`);
                this.emitFunction(`def ${fname}():`, hat.next, new Map(), this.hatDecorator(hat));
            }
            this.line('# 위의 스크립트들을 동시에 실행합니다');
            this.line('start()');
        }

        for (const h of unknownHats) this.warnings.push(h.opcode);

        // ---- assemble header --------------------------------------------
        const header = [];
        header.push(`# 블록에서 자동으로 만들어진 Python 코드${this.targetName ? ` (${this.targetName})` : ''}`);
        header.push('from cm550 import *');
        if (this.uses.has('math')) header.push('import math');
        if (this.uses.has('random')) header.push('import random');
        header.push('');

        const varLines = [];
        for (const [id, name] of this.varNames) {
            if (!this.usedVarIds.has(id)) continue;
            const v = this.varsById.get(id) || {};
            if (v.type === 'list') {
                const items = (Array.isArray(v.value) ? v.value : [])
                    .map(x => (isNumeric(x) ? formatNumber(x) : pyString(x)));
                varLines.push(`${name} = [${items.join(', ')}]`);
            } else {
                const value = (typeof v.value === 'undefined') ? 0 : v.value;
                varLines.push(`${name} = ${isNumeric(value) ? formatNumber(value) : pyString(value)}`);
            }
        }
        if (varLines.length) header.push(...varLines, '');

        const notes = [];
        const uniqueWarnings = Array.from(new Set(this.warnings));
        if (uniqueWarnings.length) {
            notes.push(`# 참고: Python으로 바꾸지 못한 블록이 있습니다 — ${uniqueWarnings.join(', ')}`);
        }
        if (loose > 0) notes.push(`# 참고: 시작 블록에 연결되지 않은 블록 묶음 ${loose}개는 제외했습니다`);
        if (notes.length) header.push(...notes, '');

        if (!tops.length || (!procedures.length && !hats.length)) {
            header.push('# "초록 깃발을 클릭했을 때" 블록 아래에 블록을 연결하면 여기에 코드가 나타납니다');
        }

        // trim trailing blank lines
        const out = header.concat(this.lines);
        while (out.length && out[out.length - 1].trim() === '') out.pop();
        return `${out.join('\n')}\n`;
    }
}

/**
 * @param {object} opts
 * @param {object} opts.blocks - target.blocks._blocks
 * @param {Array<{id:string,name:string,type:string,value:*}>} [opts.variables]
 * @param {string} [opts.targetName]
 * @returns {string} python source
 */
const generatePython = opts => new PythonGenerator(opts).generate();

/**
 * Collect generator input from a live scratch-vm instance (editing target).
 * @param vm
 */
const fromVM = vm => {
    const target = vm && vm.editingTarget;
    if (!target) return {blocks: {}, variables: [], targetName: ''};
    const stage = vm.runtime.getTargetForStage ? vm.runtime.getTargetForStage() : null;
    const variables = [];
    const pushVars = t => {
        if (!t || !t.variables) return;
        for (const v of Object.values(t.variables)) {
            variables.push({id: v.id, name: v.name, type: v.type, value: v.value});
        }
    };
    if (stage && stage !== target) pushVars(stage);
    pushVars(target);
    return {
        blocks: target.blocks._blocks,
        variables,
        targetName: target.isStage ? '무대' : target.getName()
    };
};

module.exports = {generatePython, fromVM, sanitizeIdentifier, stripOuter};
