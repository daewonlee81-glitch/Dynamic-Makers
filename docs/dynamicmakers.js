var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../scratch-cm550/src/models.js
var require_models = __commonJS({
  "../scratch-cm550/src/models.js"(exports, module) {
    var MODELS2 = {
      1060: { name: "XL430-W250", short: "XL430", family: "xl430", volts: [6.5, 12] },
      1090: { name: "2XL430-W250", short: "2XL430", family: "xl430", dual: true, volts: [6.5, 12] },
      1070: { name: "XC430-W150", short: "XC430", family: "xc430", volts: [6.5, 14.8] },
      1080: { name: "XC430-W240", short: "XC430", family: "xc430", volts: [6.5, 14.8] },
      1160: { name: "2XC430-W250", short: "2XC430", family: "xc430", dual: true, volts: [6.5, 12] },
      1190: { name: "XL330-M077", short: "XL330-M077", family: "xl330", current: true, volts: [3.7, 6] },
      1200: { name: "XL330-M288", short: "XL330-M288", family: "xl330", current: true, volts: [3.7, 6] },
      1210: { name: "XC330-T181", short: "XC330", family: "xc330", current: true, volts: [10, 14.8] },
      1220: { name: "XC330-T288", short: "XC330", family: "xc330", current: true, volts: [10, 14.8] },
      1230: { name: "XC330-M181", short: "XC330", family: "xc330", current: true, volts: [3.7, 6] },
      1240: { name: "XC330-M288", short: "XC330", family: "xc330", current: true, volts: [3.7, 6] },
      1e3: { name: "XH430-W350", short: "XH430", family: "xh430", current: true, volts: [10, 14.8] },
      1010: { name: "XH430-W210", short: "XH430", family: "xh430", current: true, volts: [10, 14.8] },
      1040: { name: "XH430-V350", short: "XH430", family: "xh430", current: true, volts: [11.1, 24] },
      1050: { name: "XH430-V210", short: "XH430", family: "xh430", current: true, volts: [11.1, 24] },
      1020: { name: "XM430-W350", short: "XM430", family: "xm430", current: true, volts: [10, 14.8] },
      1030: { name: "XM430-W210", short: "XM430", family: "xm430", current: true, volts: [10, 14.8] }
    };
    var INCOMPATIBLE = {
      350: "XL-320 (CM-550과 호환되지 않음)"
    };
    var modelInfo2 = (model) => MODELS2[model] || null;
    var modelName3 = (model) => MODELS2[model] ? MODELS2[model].name : INCOMPATIBLE[model] || (model === 450 ? "CM-550" : `모델 ${model}`);
    var pairDualAxes = (motors) => {
      const dual = motors.filter((m) => MODELS2[m.model] && MODELS2[m.model].dual).sort((x, y) => x.id - y.id);
      const pairs = [];
      for (let i = 0; i + 1 < dual.length; i++) {
        const a = dual[i];
        const b = dual[i + 1];
        if (b.id === a.id + 1 && b.model === a.model) {
          pairs.push({ a: a.id, b: b.id, model: a.model });
          i++;
        }
      }
      return pairs;
    };
    var describeMotors = (motors, busVolts) => {
      const pairs = pairDualAxes(motors);
      const axis = {};
      pairs.forEach((p, i) => {
        axis[p.a] = { module: i + 1, axis: "A", sibling: p.b };
        axis[p.b] = { module: i + 1, axis: "B", sibling: p.a };
      });
      const warnings = [];
      const labels = {};
      for (const m of motors) {
        const info = MODELS2[m.model];
        const ax = axis[m.id];
        labels[m.id] = info ? `${info.short}${ax ? ` ${ax.axis}축` : ""}` : modelName3(m.model);
        if (!info) {
          warnings.push(`ID ${m.id}: ${modelName3(m.model)} — 블록이 지원하지 않는 모델입니다.`);
        } else if (busVolts && busVolts > info.volts[1] + 0.5) {
          warnings.push(`ID ${m.id}: ${info.name}의 정격 전압은 ${info.volts[0]}~${info.volts[1]} V인데 CM-550이 ${busVolts.toFixed(1)} V를 공급하고 있습니다. 모터가 손상될 수 있으니 바로 분리하세요.`);
        }
      }
      const ids = motors.map((m) => m.id);
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (dupes.length) warnings.push(`같은 ID를 가진 모터가 있습니다: ${[...new Set(dupes)].join(", ")}`);
      return { labels, pairs, axis, warnings };
    };
    module.exports = { MODELS: MODELS2, INCOMPATIBLE, modelInfo: modelInfo2, modelName: modelName3, pairDualAxes, describeMotors };
  }
});

// ../scratch-cm550/src/python-generator.js
var require_python_generator = __commonJS({
  "../scratch-cm550/src/python-generator.js"(exports, module) {
    var INDENT = "    ";
    var PY_KEYWORDS = /* @__PURE__ */ new Set([
      "False",
      "None",
      "True",
      "and",
      "as",
      "assert",
      "async",
      "await",
      "break",
      "class",
      "continue",
      "def",
      "del",
      "elif",
      "else",
      "except",
      "finally",
      "for",
      "from",
      "global",
      "if",
      "import",
      "in",
      "is",
      "lambda",
      "nonlocal",
      "not",
      "or",
      "pass",
      "raise",
      "return",
      "try",
      "while",
      "with",
      "yield",
      // names provided by `from cm550 import *` or builtins we emit
      "cm",
      "dxl",
      "port",
      "motion",
      "wait",
      "timer",
      "reset_timer",
      "key_pressed",
      "broadcast",
      "stop_all",
      "start",
      "answer",
      "print",
      "input",
      "len",
      "str",
      "int",
      "round",
      "abs",
      "range",
      "math",
      "random",
      "list",
      "when_flag_clicked",
      "when_key_pressed",
      "when_broadcast",
      "when_clicked"
    ]);
    var pyString = (s) => JSON.stringify(String(s));
    var isNumeric = (s) => {
      if (typeof s === "number") return Number.isFinite(s);
      return /^-?(0|[1-9]\d*)(\.\d+)?$/.test(String(s)) || /^-?\.\d+$/.test(String(s));
    };
    var formatNumber = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return "0";
      return String(n);
    };
    var stripOuter = (s) => {
      if (!s.startsWith("(") || !s.endsWith(")")) return s;
      let depth = 0;
      let inStr = false;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (inStr) {
          if (c === "\\") i++;
          else if (c === '"') inStr = false;
          continue;
        }
        if (c === '"') inStr = true;
        else if (c === "(") depth++;
        else if (c === ")") {
          depth--;
          if (depth === 0 && i !== s.length - 1) return s;
        }
      }
      return s.slice(1, -1);
    };
    var sanitizeIdentifier = (name, fallback) => {
      let id = String(name || "").trim().replace(/[^\p{L}\p{N}_]+/gu, "_").replace(/^_+|_+$/g, "");
      if (!id) id = fallback;
      if (/^\p{N}/u.test(id)) id = `_${id}`;
      if (PY_KEYWORDS.has(id)) id = `${id}_`;
      return id;
    };
    var parseJSON = (s, fallback) => {
      if (Array.isArray(s)) return s;
      try {
        return JSON.parse(s);
      } catch (e) {
        return fallback;
      }
    };
    var MATHOP = {
      "abs": (x) => `abs(${x})`,
      "floor": (x) => `math.floor(${x})`,
      "ceiling": (x) => `math.ceil(${x})`,
      "sqrt": (x) => `math.sqrt(${x})`,
      "sin": (x) => `math.sin(math.radians(${x}))`,
      "cos": (x) => `math.cos(math.radians(${x}))`,
      "tan": (x) => `math.tan(math.radians(${x}))`,
      "asin": (x) => `math.degrees(math.asin(${x}))`,
      "acos": (x) => `math.degrees(math.acos(${x}))`,
      "atan": (x) => `math.degrees(math.atan(${x}))`,
      "ln": (x) => `math.log(${x})`,
      "log": (x) => `math.log10(${x})`,
      "e ^": (x) => `math.exp(${x})`,
      "10 ^": (x) => `(10 ** ${x})`
    };
    var PythonGenerator = class {
      constructor({ blocks, variables: variables2 = [], targetName = "" }) {
        this.blocks = blocks || {};
        this.targetName = targetName;
        this.uses = /* @__PURE__ */ new Set();
        this.warnings = [];
        this.usedVarIds = /* @__PURE__ */ new Set();
        this.varNames = /* @__PURE__ */ new Map();
        this.varsById = /* @__PURE__ */ new Map();
        this.procNames = /* @__PURE__ */ new Map();
        this.takenNames = /* @__PURE__ */ new Set();
        this.fn = null;
        this.indent = 0;
        this.lines = [];
        for (const v of variables2) this.varsById.set(v.id, v);
        for (const v of variables2) {
          if (v.type === "broadcast_msg") continue;
          const fallback = v.type === "list" ? "my_list" : "var";
          this.varNames.set(v.id, this._uniqueName(sanitizeIdentifier(v.name, fallback)));
        }
      }
      _uniqueName(base) {
        let name = base;
        let i = 2;
        while (this.takenNames.has(name)) name = `${base}_${i++}`;
        this.takenNames.add(name);
        return name;
      }
      // ------------------------------------------------------------------
      // emission helpers
      // ------------------------------------------------------------------
      line(text2) {
        this.lines.push(INDENT.repeat(this.indent) + text2);
      }
      /**
       * Emit a nested statement stack (SUBSTACK etc). Emits `pass` when empty.
       * @param startId
       */
      body(startId) {
        this.indent++;
        const before = this.lines.length;
        this.stack(startId);
        if (this.lines.length === before) this.line("pass");
        this.indent--;
      }
      stack(startId) {
        let id = startId;
        let guard = 0;
        while (id && this.blocks[id] && guard++ < 1e4) {
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
      arg(block, name) {
        if (block.fields && block.fields[name]) {
          return { literal: true, value: block.fields[name].value };
        }
        const input = block.inputs && block.inputs[name];
        if (!input || !input.block) return null;
        const inner = this.blocks[input.block];
        if (!inner) return null;
        if (inner.shadow) {
          const fields = inner.fields || {};
          const keys = Object.keys(fields);
          return { literal: true, value: keys.length ? fields[keys[0]].value : "" };
        }
        return { literal: false, code: this.expr(inner) };
      }
      /**
       * Numeric argument.
       * @param block
       * @param name
       */
      num(block, name) {
        const a = this.arg(block, name);
        if (!a) return "0";
        if (!a.literal) return a.code;
        return isNumeric(a.value) ? formatNumber(a.value) : String(a.value).trim() === "" ? "0" : pyString(a.value);
      }
      /**
       * Any value: numbers stay numbers, other literals become strings.
       * @param block
       * @param name
       */
      val(block, name) {
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
      text(block, name) {
        const a = this.arg(block, name);
        if (!a) return '""';
        return a.literal ? pyString(a.value) : a.code;
      }
      /**
       * Boolean input slot (hexagonal). Empty slot = False.
       * @param block
       * @param name
       */
      cond(block, name) {
        const a = this.arg(block, name);
        if (!a) return "False";
        if (a.literal) return a.value ? "True" : "False";
        return a.code;
      }
      /**
       * on/off menu -> True/False
       * @param block
       * @param name
       */
      onOff(block, name) {
        const a = this.arg(block, name);
        if (!a) return "True";
        if (!a.literal) return a.code;
        const s = String(a.value).toLowerCase();
        return s === "on" || s === "1" || s === "true" || s === "켜기" ? "True" : "False";
      }
      /**
       * Raw menu choice as a string literal (or expression).
       * @param block
       * @param name
       * @param map
       */
      choice(block, name, map) {
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
      index(block, name) {
        const a = this.arg(block, name);
        if (!a) return "0";
        if (a.literal && isNumeric(a.value)) return formatNumber(Number(a.value) - 1);
        const code = a.literal ? pyString(a.value) : a.code;
        return `${code} - 1`;
      }
      varName(field) {
        if (!field) return "var";
        const id = field.id;
        if (id && this.varNames.has(id)) {
          this.usedVarIds.add(id);
          return this.varNames.get(id);
        }
        const name = sanitizeIdentifier(field.value, "var");
        if (id) {
          this.varNames.set(id, name);
          this.usedVarIds.add(id);
          if (!this.varsById.has(id)) this.varsById.set(id, { id, name: field.value, type: "", value: 0 });
        }
        return name;
      }
      assign(name) {
        if (this.fn && this.fn.isFunction) this.fn.assigned.add(name);
      }
      unsupportedExpr(block) {
        this.warnings.push(block.opcode);
        return "None";
      }
      // ------------------------------------------------------------------
      // expressions (reporters / booleans)
      // ------------------------------------------------------------------
      expr(block) {
        const op = block.opcode;
        if (op.startsWith("cm550_")) return this.cm550Expr(block, op.slice(6));
        switch (op) {
          // AI 학습 (Dynamic Makers)
          case "dmai_aiLabel":
            this.uses.add("ai");
            return "ai.label()";
          case "dmai_aiIs":
            this.uses.add("ai");
            return `(ai.label() == ${this.choice(block, "CLASS")})`;
          case "dmai_aiConfidence":
            this.uses.add("ai");
            return `ai.confidence(${this.choice(block, "CLASS")})`;
          case "dmai_skelVisible":
            return "body.visible()";
          case "dmai_walking":
            return "walk.is_walking()";
          case "dmai_skelAngle":
            return `body.angle(${this.choice(block, "JOINT")})`;
          case "dmai_skelPos":
            return `body.position(${this.choice(block, "PART")}, ${this.choice(block, "AXIS")})`;
          // operators
          case "operator_add":
            return `(${this.num(block, "NUM1")} + ${this.num(block, "NUM2")})`;
          case "operator_subtract":
            return `(${this.num(block, "NUM1")} - ${this.num(block, "NUM2")})`;
          case "operator_multiply":
            return `(${this.num(block, "NUM1")} * ${this.num(block, "NUM2")})`;
          case "operator_divide":
            return `(${this.num(block, "NUM1")} / ${this.num(block, "NUM2")})`;
          case "operator_mod":
            return `(${this.num(block, "NUM1")} % ${this.num(block, "NUM2")})`;
          case "operator_round":
            return `round(${stripOuter(this.num(block, "NUM"))})`;
          case "operator_random": {
            this.uses.add("random");
            const a = this.arg(block, "FROM");
            const b = this.arg(block, "TO");
            const decimal = [a, b].some((x) => x && x.literal && String(x.value).includes("."));
            const fn = decimal ? "random.uniform" : "random.randint";
            return `${fn}(${stripOuter(this.num(block, "FROM"))}, ${stripOuter(this.num(block, "TO"))})`;
          }
          case "operator_gt":
            return `(${this.val(block, "OPERAND1")} > ${this.val(block, "OPERAND2")})`;
          case "operator_lt":
            return `(${this.val(block, "OPERAND1")} < ${this.val(block, "OPERAND2")})`;
          case "operator_equals":
            return `(${this.val(block, "OPERAND1")} == ${this.val(block, "OPERAND2")})`;
          case "operator_and":
            return `(${this.cond(block, "OPERAND1")} and ${this.cond(block, "OPERAND2")})`;
          case "operator_or":
            return `(${this.cond(block, "OPERAND1")} or ${this.cond(block, "OPERAND2")})`;
          case "operator_not":
            return `(not ${this.cond(block, "OPERAND")})`;
          case "operator_join": {
            const s = (x) => x.startsWith('"') ? x : `str(${stripOuter(x)})`;
            return `(${s(this.text(block, "STRING1"))} + ${s(this.text(block, "STRING2"))})`;
          }
          case "operator_letter_of":
            return `str(${stripOuter(this.text(block, "STRING"))})[${stripOuter(this.index(block, "LETTER"))}]`;
          case "operator_length":
            return `len(str(${stripOuter(this.text(block, "STRING"))}))`;
          case "operator_contains":
            return `(${this.text(block, "STRING2")} in str(${stripOuter(this.text(block, "STRING1"))}))`;
          case "operator_mathop": {
            const opName = block.fields && block.fields.OPERATOR ? block.fields.OPERATOR.value : "abs";
            const f2 = MATHOP[opName] || MATHOP.abs;
            if (opName !== "abs") this.uses.add("math");
            return f2(stripOuter(this.num(block, "NUM")));
          }
          // data
          case "data_variable":
            return this.varName(block.fields.VARIABLE);
          case "data_listcontents":
            return this.varName(block.fields.LIST);
          case "data_itemoflist":
            return `${this.varName(block.fields.LIST)}[${stripOuter(this.index(block, "INDEX"))}]`;
          case "data_itemnumoflist":
            return `(${this.varName(block.fields.LIST)}.index(${stripOuter(this.val(block, "ITEM"))}) + 1)`;
          case "data_lengthoflist":
            return `len(${this.varName(block.fields.LIST)})`;
          case "data_listcontainsitem":
            return `(${this.val(block, "ITEM")} in ${this.varName(block.fields.LIST)})`;
          // sensing
          case "sensing_timer":
            return "timer()";
          case "sensing_answer":
            return "answer";
          case "sensing_keypressed":
            return `key_pressed(${this.text(block, "KEY_OPTION")})`;
          // custom block parameters
          case "argument_reporter_string_number":
          case "argument_reporter_boolean": {
            const label2 = block.fields && block.fields.VALUE ? block.fields.VALUE.value : "arg";
            if (this.fn && this.fn.params && this.fn.params.has(label2)) return this.fn.params.get(label2);
            return sanitizeIdentifier(label2, "arg");
          }
          default:
            return this.unsupportedExpr(block);
        }
      }
      cm550Expr(block, op) {
        const id = () => stripOuter(this.num(block, "ID"));
        const portOf = () => `port(${stripOuter(this.num(block, "PORT"))})`;
        switch (op) {
          case "isConnected":
            return "cm.is_connected()";
          case "lastError":
            return "cm.last_error()";
          case "dxlRead": {
            const prop = block.fields && block.fields.PROP ? block.fields.PROP.value : "position";
            const method = {
              position: "position",
              velocity: "velocity",
              load: "load",
              temperature: "temperature",
              voltage: "voltage",
              model: "model",
              error: "hardware_error"
            }[prop] || "position";
            return `dxl.${method}(${id()})`;
          }
          case "dxlIsMoving":
            return `dxl.is_moving(${id()})`;
          case "dxlModelName":
            return `dxl.model_name(${id()})`;
          case "poseCount":
            return "pose.count()";
          case "dxlScan":
            return "dxl.scan()";
          case "cmButton":
            return `cm.button_pressed(${this.choice(block, "BUTTON")})`;
          case "cmTilt": {
            const axis = block.fields && block.fields.AXIS ? block.fields.AXIS.value : "roll";
            return `cm.imu.${["roll", "pitch", "yaw"].includes(axis) ? axis : "roll"}()`;
          }
          case "cmGyro":
            return `cm.imu.gyro(${this.choice(block, "AXIS")})`;
          case "cmAccel":
            return `cm.imu.accel(${this.choice(block, "AXIS")})`;
          case "cmVoltage":
            return "cm.voltage()";
          case "cmTemperature":
            return "cm.temperature()";
          case "cmSoundCount":
            return "cm.sound_count()";
          case "portSensor": {
            const sensor = block.fields && block.fields.SENSOR ? block.fields.SENSOR.value : "ir";
            const method = {
              ir: "ir",
              dms: "dms",
              touch: "touch",
              brightness: "brightness",
              color: "color_code",
              temperature: "temperature",
              magnet: "magnet",
              motion: "motion",
              moisture: "moisture",
              user: "analog"
            }[sensor] || "ir";
            return `${portOf()}.${method}()`;
          }
          case "portTouch":
            return `${portOf()}.touched()`;
          case "portColor":
            return `(${portOf()}.color() == ${this.choice(block, "COLOR")})`;
          case "motionIsPlaying":
            return "motion.is_playing()";
          case "motionCount":
            return "motion.count()";
          case "rawRead":
            return `cm.read(${stripOuter(this.num(block, "ID"))}, ${stripOuter(this.num(block, "ADDR"))}, size=${stripOuter(this.num(block, "SIZE"))})`;
          default:
            return this.unsupportedExpr(block);
        }
      }
      // ------------------------------------------------------------------
      // statements
      // ------------------------------------------------------------------
      statement(block) {
        const op = block.opcode;
        if (op.startsWith("cm550_")) {
          this.cm550Statement(block, op.slice(6));
          return;
        }
        if (op === "dmai_skelFollow") {
          const dir = this.choice(block, "DIR") === '"-1"' ? -1 : 1;
          this.line(`dxl.follow(${this.num(block, "ID")}, body.angle(${this.choice(block, "JOINT")}), center=${this.num(block, "CENTER")}, direction=${dir})`);
          return;
        }
        if (op === "dmai_walkGait") {
          this.line(`walk.gait(${this.num(block, "SECS")}, slow=${this.num(block, "SLOW")})  # 3D 탭에서 학습한 걸음`);
          return;
        }
        if (op === "dmai_walkPolicy") {
          this.line(`walk.policy(${this.num(block, "SECS")})  # Python 키트로 학습한 신경망`);
          return;
        }
        if (op === "dmai_walkStop") {
          this.line("walk.stop()");
          return;
        }
        if (op === "dmai_skelSwitch") {
          this.line(this.choice(block, "STATE") === '"off"' ? "body.stop()" : "body.start()");
          return;
        }
        if (op === "dmai_aiSwitch") {
          this.uses.add("ai");
          this.line(this.choice(block, "STATE") === '"off"' ? "ai.stop()" : "ai.start()");
          return;
        }
        const a = (n) => stripOuter(this.num(block, n));
        switch (op) {
          // control
          case "control_wait":
            this.line(`wait(${a("DURATION")})`);
            break;
          case "control_repeat": {
            const t = this.arg(block, "TIMES");
            const times = t && t.literal && isNumeric(t.value) ? String(Math.max(0, Math.round(Number(t.value)))) : `int(${stripOuter(this.num(block, "TIMES"))})`;
            this.line(`for _ in range(${times}):`);
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            break;
          }
          case "control_forever":
            this.line("while True:");
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            break;
          case "control_if":
            this.line(`if ${stripOuter(this.cond(block, "CONDITION"))}:`);
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            break;
          case "control_if_else":
            this.line(`if ${stripOuter(this.cond(block, "CONDITION"))}:`);
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            this.line("else:");
            this.body(block.inputs.SUBSTACK2 && block.inputs.SUBSTACK2.block);
            break;
          case "control_wait_until":
            this.line(`while not ${this.cond(block, "CONDITION")}:`);
            this.indent++;
            this.line("wait(0.01)");
            this.indent--;
            break;
          case "control_repeat_until":
            this.line(`while not ${this.cond(block, "CONDITION")}:`);
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            break;
          case "control_while":
            this.line(`while ${stripOuter(this.cond(block, "CONDITION"))}:`);
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            break;
          case "control_stop": {
            const opt = block.fields && block.fields.STOP_OPTION ? block.fields.STOP_OPTION.value : "all";
            if (opt === "all") this.line("stop_all()");
            else if (opt === "this script") this.line(this.fn && this.fn.isFunction ? "return" : "stop_all()");
            else this.line("# 이 스프라이트의 다른 스크립트 멈추기 (Python에서는 지원하지 않음)");
            break;
          }
          // events
          case "event_broadcast":
            this.line(`broadcast(${this.text(block, "BROADCAST_INPUT")})`);
            break;
          case "event_broadcastandwait":
            this.line(`broadcast(${this.text(block, "BROADCAST_INPUT")}, wait=True)`);
            break;
          // data
          case "data_setvariableto": {
            const name = this.varName(block.fields.VARIABLE);
            this.assign(name);
            this.line(`${name} = ${stripOuter(this.val(block, "VALUE"))}`);
            break;
          }
          case "data_changevariableby": {
            const name = this.varName(block.fields.VARIABLE);
            this.assign(name);
            this.line(`${name} += ${stripOuter(this.num(block, "VALUE"))}`);
            break;
          }
          case "data_showvariable":
          case "data_hidevariable":
          case "data_showlist":
          case "data_hidelist":
            break;
          // stage-only display, nothing to do in Python
          case "data_addtolist":
            this.line(`${this.varName(block.fields.LIST)}.append(${stripOuter(this.val(block, "ITEM"))})`);
            break;
          case "data_deleteoflist": {
            const lst = this.varName(block.fields.LIST);
            const idx = this.arg(block, "INDEX");
            if (idx && idx.literal && idx.value === "all") this.line(`${lst}.clear()`);
            else if (idx && idx.literal && idx.value === "last") this.line(`${lst}.pop()`);
            else this.line(`del ${lst}[${stripOuter(this.index(block, "INDEX"))}]`);
            break;
          }
          case "data_deletealloflist":
            this.line(`${this.varName(block.fields.LIST)}.clear()`);
            break;
          case "data_insertatlist":
            this.line(`${this.varName(block.fields.LIST)}.insert(${stripOuter(this.index(block, "INDEX"))}, ${stripOuter(this.val(block, "ITEM"))})`);
            break;
          case "data_replaceitemoflist":
            this.line(`${this.varName(block.fields.LIST)}[${stripOuter(this.index(block, "INDEX"))}] = ${stripOuter(this.val(block, "ITEM"))}`);
            break;
          // sensing
          case "sensing_resettimer":
            this.line("reset_timer()");
            break;
          case "sensing_askandwait":
            this.assign("answer");
            this.line(`answer = input(${stripOuter(this.text(block, "QUESTION"))})`);
            break;
          // looks: map speech to print so students see output
          case "looks_say":
          case "looks_think":
            this.line(`print(${stripOuter(this.val(block, "MESSAGE"))})`);
            break;
          case "looks_sayforsecs":
          case "looks_thinkforsecs":
            this.line(`print(${stripOuter(this.val(block, "MESSAGE"))})`);
            this.line(`wait(${a("SECS")})`);
            break;
          // custom blocks
          case "procedures_call":
            this.procedureCall(block);
            break;
          default:
            this.warnings.push(op);
            this.line(`# [변환 안 됨] ${op}`);
        }
      }
      cm550Statement(block, op) {
        const n = (name) => stripOuter(this.num(block, name));
        const id = () => n("ID");
        const portOf = () => `port(${n("PORT")})`;
        switch (op) {
          case "connect":
            this.line(`cm.connect(${this.choice(block, "KIND")})`);
            break;
          case "disconnect":
            this.line("cm.disconnect()");
            break;
          case "dxlTorque":
            this.line(`dxl.torque(${id()}, ${this.onOff(block, "ONOFF")})`);
            break;
          case "dxlMoveTo":
            this.line(`dxl.move_to(${id()}, ${n("DEG")}, speed=${n("SPEED")})`);
            break;
          case "dxlMoveToWait":
            this.line(`dxl.move_to(${id()}, ${n("DEG")}, speed=${n("SPEED")}, wait=True)`);
            break;
          case "dxlMoveTwo":
            this.line(`dxl.move_together({${n("ID1")}: ${n("DEG1")}, ${n("ID2")}: ${n("DEG2")}})`);
            break;
          case "dxlTogether":
            this.line(`with dxl.together(${n("SECS")}):`);
            this.body(block.inputs.SUBSTACK && block.inputs.SUBSTACK.block);
            break;
          case "dxlGoal":
            this.line(`dxl.goal(${id()}, ${n("DEG")})`);
            break;
          case "dxlPrepare":
            this.line(`dxl.prepare(${n("SECS")})`);
            break;
          case "dxlWheel":
            this.line(`dxl.wheel(${id()}, ${n("SPEED")})`);
            break;
          case "dxlWheelTwo":
            this.line(`dxl.wheels(${n("ID1")}, ${n("SPEED1")}, ${n("ID2")}, ${n("SPEED2")})`);
            break;
          case "dxlStop":
            this.line(`dxl.stop(${id()})`);
            break;
          case "dxlModuleMove": {
            const [a, b] = this.moduleIds(block);
            this.line(`dxl.move_together({${a}: ${n("DEGA")}, ${b}: ${n("DEGB")}})`);
            break;
          }
          case "dxlModuleWheels": {
            const [a, b] = this.moduleIds(block);
            this.line(`dxl.wheels(${a}, ${n("SPA")}, ${b}, ${n("SPB")})`);
            break;
          }
          case "dxlGrip":
            this.line(`dxl.grip(${id()}, ${n("DEG")}, force=${n("FORCE")})`);
            break;
          case "dxlSetMode":
            this.line(`dxl.set_mode(${id()}, ${this.choice(block, "MODE", { velocity: "wheel" })})`);
            break;
          case "dxlLed":
            this.line(`dxl.led(${id()}, ${this.onOff(block, "ONOFF")})`);
            break;
          case "poseRelax":
            this.line(`pose.torque(${this.onOff(block, "STATE")})  # False = 힘 빼기, True = 힘 주기`);
            break;
          case "poseRecord":
            this.line(`pose.record(${this.num(block, "N")})`);
            break;
          case "posePlay":
            this.line(`pose.play(${this.num(block, "N")}, ${this.num(block, "SECS")})`);
            break;
          case "posePlayAll":
            this.line(`pose.play_all(${this.num(block, "SECS")})`);
            break;
          case "poseClear":
            this.line("pose.clear()");
            break;
          case "dxlAllTorque":
            this.line(`dxl.torque_all(${this.onOff(block, "ONOFF")})`);
            break;
          case "cmLedColor":
            this.line(`cm.led_color(${this.choice(block, "COLOR")})`);
            break;
          case "cmLed":
            this.line(`cm.led(${this.choice(block, "COLOR")}, ${this.onOff(block, "ONOFF")})`);
            break;
          case "cmBuzzerNote":
            this.line(`cm.play_note(${n("NOTE")}, ${n("SECS")})`);
            break;
          case "cmBuzzerMelody":
            this.line(`cm.play_melody(${n("INDEX")})`);
            break;
          case "cmSoundReset":
            this.line("cm.reset_sound_count()");
            break;
          case "cmDxlPower":
            this.line(`cm.dxl_power(${this.onOff(block, "ONOFF")})`);
            break;
          case "portLed":
            this.line(`${portOf()}.led(${this.choice(block, "STATE")})`);
            break;
          case "portServo":
            this.line(`${portOf()}.servo(${n("DEG")})`);
            break;
          case "portMotor":
            this.line(`${portOf()}.motor(${n("SPEED")})`);
            break;
          case "motionPlay":
            this.line(`motion.play(${n("PAGE")})`);
            break;
          case "motionPlayWait":
            this.line(`motion.play(${n("PAGE")}, wait=True)`);
            break;
          case "motionChain":
            this.line(`motion.chain(${n("START")}, ${n("LOOP")}, ${n("END")}, seconds=${n("SECS")})`);
            break;
          case "motionStop":
            this.line(`motion.stop(${this.choice(block, "HOW")})`);
            break;
          case "motionSpeed":
            this.line(`motion.set_speed(${n("PERCENT")})`);
            break;
          case "motionNext":
            this.line(`motion.set_next(${n("PAGE")})`);
            break;
          case "rawWrite":
            this.line(`cm.write(${n("ID")}, ${n("ADDR")}, ${n("VALUE")}, size=${n("SIZE")})`);
            break;
          default:
            this.warnings.push(`cm550_${op}`);
            this.line(`# [변환 안 됨] cm550_${op}`);
        }
      }
      /** "a,b" module menu value -> two id literals */
      moduleIds(block) {
        const a = this.arg(block, "MODULE");
        const parts = a && a.literal ? String(a.value).split(",") : ["1", "2"];
        return parts.slice(0, 2).map((x) => formatNumber(x));
      }
      // ------------------------------------------------------------------
      // custom blocks ("내 블록")
      // ------------------------------------------------------------------
      procInfo(mutation) {
        const proccode = mutation.proccode || "";
        if (!this.procNames.has(proccode)) {
          const words = proccode.split(/%[snb]/).map((s) => s.trim()).filter(Boolean).join("_");
          this.procNames.set(proccode, this._uniqueName(sanitizeIdentifier(words, "my_block")));
        }
        return {
          name: this.procNames.get(proccode),
          argumentIds: parseJSON(mutation.argumentids, []),
          argumentNames: parseJSON(mutation.argumentnames, [])
        };
      }
      procedureCall(block) {
        if (!block.mutation) {
          this.line("# [변환 안 됨] procedures_call");
          return;
        }
        const { name, argumentIds } = this.procInfo(block.mutation);
        const args = argumentIds.map((argId) => {
          const input = block.inputs && block.inputs[argId];
          if (!input || !input.block) return "False";
          return stripOuter(this.val(block, argId));
        });
        this.line(`${name}(${args.join(", ")})`);
      }
      procedureDefinition(hat) {
        const protoInput = hat.inputs && hat.inputs.custom_block;
        const proto = protoInput && this.blocks[protoInput.block];
        if (!proto || !proto.mutation) return;
        const { name, argumentNames } = this.procInfo(proto.mutation);
        const params = /* @__PURE__ */ new Map();
        const used = /* @__PURE__ */ new Set();
        for (const label2 of argumentNames) {
          let p = sanitizeIdentifier(label2, "arg");
          while (used.has(p)) p = `${p}_`;
          used.add(p);
          params.set(label2, p);
        }
        this.emitFunction(`def ${name}(${Array.from(params.values()).join(", ")}):`, hat.next, params);
      }
      /**
       * Emit `def ...:` + body, with `global` declarations for assigned variables.
       * @param header
       * @param bodyStartId
       * @param params
       * @param decorator
       */
      emitFunction(header, bodyStartId, params = /* @__PURE__ */ new Map(), decorator = null) {
        const saved = { lines: this.lines, fn: this.fn, indent: this.indent };
        this.lines = [];
        this.fn = { assigned: /* @__PURE__ */ new Set(), params, isFunction: true };
        this.indent = 1;
        this.stack(bodyStartId);
        const bodyLines = this.lines;
        const assigned = Array.from(this.fn.assigned).filter((v) => !Array.from(params.values()).includes(v));
        this.lines = saved.lines;
        this.fn = saved.fn;
        this.indent = saved.indent;
        if (decorator) this.line(decorator);
        this.line(header);
        if (assigned.length) this.line(`${INDENT}global ${assigned.join(", ")}`);
        if (bodyLines.length) this.lines.push(...bodyLines);
        else if (!assigned.length) this.line(`${INDENT}pass`);
        this.line("");
      }
      // ------------------------------------------------------------------
      // whole program
      // ------------------------------------------------------------------
      hatDecorator(hat) {
        switch (hat.opcode) {
          case "event_whenflagclicked":
            return "@when_flag_clicked";
          case "event_whenkeypressed":
            return `@when_key_pressed(${pyString(hat.fields.KEY_OPTION ? hat.fields.KEY_OPTION.value : "space")})`;
          case "event_whenbroadcastreceived":
            return `@when_broadcast(${pyString(hat.fields.BROADCAST_OPTION ? hat.fields.BROADCAST_OPTION.value : "")})`;
          case "event_whenthisspriteclicked":
          case "event_whenstageclicked":
            return "@when_clicked";
          case "dmai_aiWhen": {
            const c = hat.inputs && hat.inputs.CLASS && this.blocks[hat.inputs.CLASS.block];
            const name = c && c.fields ? Object.values(c.fields)[0].value : "";
            return `@ai.when_recognized(${pyString(name)})`;
          }
          default:
            return null;
        }
      }
      generate() {
        const tops = Object.values(this.blocks).filter((b) => b.topLevel && !b.shadow).sort((a, b) => (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0));
        const procedures = tops.filter((b) => b.opcode === "procedures_definition");
        const hats = tops.filter((b) => this.hatDecorator(b));
        const unknownHats = tops.filter((b) => b.opcode !== "procedures_definition" && !this.hatDecorator(b) && /^(event_when|control_start_as_clone|cm550_when)/.test(b.opcode));
        const loose = tops.length - procedures.length - hats.length - unknownHats.length;
        const flagHats = hats.filter((h) => h.opcode === "event_whenflagclicked");
        const simpleMain = flagHats.length === 1 && hats.length === 1;
        for (const p of procedures) this.procedureDefinition(p);
        if (simpleMain) {
          this.line("# 초록 깃발을 클릭했을 때");
          this.fn = { assigned: /* @__PURE__ */ new Set(), params: /* @__PURE__ */ new Map(), isFunction: false };
          const before = this.lines.length;
          this.stack(flagHats[0].next);
          if (this.lines.length === before) this.line("pass");
          this.fn = null;
        } else if (hats.length) {
          const counters = {};
          for (const hat of hats) {
            const base = {
              event_whenflagclicked: "on_start",
              event_whenkeypressed: "on_key",
              event_whenbroadcastreceived: "on_message",
              event_whenthisspriteclicked: "on_click",
              event_whenstageclicked: "on_click",
              dmai_aiWhen: "on_ai"
            }[hat.opcode];
            counters[base] = (counters[base] || 0) + 1;
            const fname = this._uniqueName(counters[base] === 1 ? base : `${base}_${counters[base]}`);
            this.emitFunction(`def ${fname}():`, hat.next, /* @__PURE__ */ new Map(), this.hatDecorator(hat));
          }
          this.line("# 위의 스크립트들을 동시에 실행합니다");
          this.line("start()");
        }
        for (const h of unknownHats) this.warnings.push(h.opcode);
        const header = [];
        header.push(`# 블록에서 자동으로 만들어진 Python 코드${this.targetName ? ` (${this.targetName})` : ""}`);
        header.push("from cm550 import *");
        if (this.uses.has("math")) header.push("import math");
        if (this.uses.has("random")) header.push("import random");
        header.push("");
        const varLines = [];
        for (const [id, name] of this.varNames) {
          if (!this.usedVarIds.has(id)) continue;
          const v = this.varsById.get(id) || {};
          if (v.type === "list") {
            const items = (Array.isArray(v.value) ? v.value : []).map((x) => isNumeric(x) ? formatNumber(x) : pyString(x));
            varLines.push(`${name} = [${items.join(", ")}]`);
          } else {
            const value = typeof v.value === "undefined" ? 0 : v.value;
            varLines.push(`${name} = ${isNumeric(value) ? formatNumber(value) : pyString(value)}`);
          }
        }
        if (varLines.length) header.push(...varLines, "");
        const notes = [];
        const uniqueWarnings = Array.from(new Set(this.warnings));
        if (uniqueWarnings.length) {
          notes.push(`# 참고: Python으로 바꾸지 못한 블록이 있습니다 — ${uniqueWarnings.join(", ")}`);
        }
        if (loose > 0) notes.push(`# 참고: 시작 블록에 연결되지 않은 블록 묶음 ${loose}개는 제외했습니다`);
        if (notes.length) header.push(...notes, "");
        if (!tops.length || !procedures.length && !hats.length) {
          header.push('# "초록 깃발을 클릭했을 때" 블록 아래에 블록을 연결하면 여기에 코드가 나타납니다');
        }
        const out = header.concat(this.lines);
        while (out.length && out[out.length - 1].trim() === "") out.pop();
        return `${out.join("\n")}
`;
      }
    };
    var generatePython = (opts) => new PythonGenerator(opts).generate();
    var fromVM = (vm2) => {
      const target = vm2 && vm2.editingTarget;
      if (!target) return { blocks: {}, variables: [], targetName: "" };
      const stage = vm2.runtime.getTargetForStage ? vm2.runtime.getTargetForStage() : null;
      const variables2 = [];
      const pushVars = (t) => {
        if (!t || !t.variables) return;
        for (const v of Object.values(t.variables)) {
          variables2.push({ id: v.id, name: v.name, type: v.type, value: v.value });
        }
      };
      if (stage && stage !== target) pushVars(stage);
      pushVars(target);
      return {
        blocks: target.blocks._blocks,
        variables: variables2,
        targetName: target.isStage ? "무대" : target.getName()
      };
    };
    module.exports = { generatePython, fromVM, sanitizeIdentifier, stripOuter };
  }
});

// ../scratch-cm550/src/python-highlight.js
var require_python_highlight = __commonJS({
  "../scratch-cm550/src/python-highlight.js"(exports, module) {
    var KEYWORDS = /* @__PURE__ */ new Set([
      "def",
      "if",
      "else",
      "elif",
      "while",
      "for",
      "in",
      "not",
      "and",
      "or",
      "return",
      "global",
      "import",
      "from",
      "pass",
      "del",
      "True",
      "False",
      "None",
      "break",
      "continue"
    ]);
    var API = /* @__PURE__ */ new Set(["cm", "dxl", "port", "motion"]);
    var BUILTINS = /* @__PURE__ */ new Set([
      "print",
      "input",
      "range",
      "len",
      "str",
      "int",
      "round",
      "abs",
      "wait",
      "timer",
      "reset_timer",
      "key_pressed",
      "broadcast",
      "stop_all",
      "start",
      "math",
      "random"
    ]);
    var escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var TOKEN = new RegExp([
      "(#[^\\n]*)",
      // comment
      '("(?:[^"\\\\\\n]|\\\\.)*")',
      // string
      "(@[\\p{L}\\p{N}_]+)",
      // decorator
      "((?<![\\p{L}\\p{N}_])-?\\d+(?:\\.\\d+)?)",
      // number
      "([\\p{L}_][\\p{L}\\p{N}_]*)"
      // identifier / keyword
    ].join("|"), "gu");
    var highlightPython = (src, cls = {}) => {
      const c = Object.assign({
        comment: "py-comment",
        string: "py-string",
        decorator: "py-decorator",
        number: "py-number",
        keyword: "py-keyword",
        api: "py-api",
        builtin: "py-builtin"
      }, cls);
      let out = "";
      let last = 0;
      const span = (kind, text2) => `<span class="${c[kind]}">${escapeHtml(text2)}</span>`;
      src.replace(TOKEN, (m, comment2, string, deco, number, word, offset) => {
        out += escapeHtml(src.slice(last, offset));
        last = offset + m.length;
        if (comment2) out += span("comment", m);
        else if (string) out += span("string", m);
        else if (deco) out += span("decorator", m);
        else if (number) out += span("number", m);
        else if (KEYWORDS.has(word)) out += span("keyword", m);
        else if (API.has(word)) out += span("api", m);
        else if (BUILTINS.has(word)) out += span("builtin", m);
        else out += escapeHtml(m);
        return m;
      });
      out += escapeHtml(src.slice(last));
      return out;
    };
    module.exports = { highlightPython, escapeHtml };
  }
});

// ../scratch-cm550/src/python-panel-dom.js
var require_python_panel_dom = __commonJS({
  "../scratch-cm550/src/python-panel-dom.js"(exports, module) {
    var { generatePython, fromVM } = require_python_generator();
    var { highlightPython } = require_python_highlight();
    var P = "cm550py";
    var CSS = `
.${P}-panel{position:absolute;top:0;right:0;bottom:0;z-index:30;display:flex;flex-direction:column;
  background:#fbfcfe;border-left:1px solid rgba(0,0,0,.15);box-shadow:-4px 0 12px rgba(0,0,0,.08);
  font-family:"Helvetica Neue",Helvetica,Arial,sans-serif}
.${P}-resizer{position:absolute;top:0;bottom:0;left:-3px;width:6px;cursor:col-resize}
.${P}-resizer:hover{background:rgba(46,124,246,.35)}
.${P}-header{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;background:#2e7cf6;color:#fff}
.${P}-title{font-weight:bold;font-size:.95rem;flex-shrink:0}
.${P}-sub{flex:1;min-width:0;font-size:.7rem;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.${P}-btn{flex-shrink:0;white-space:nowrap;padding:.2rem .6rem;border:1px solid rgba(255,255,255,.6);border-radius:.25rem;
  background:transparent;color:#fff;font-size:.75rem;cursor:pointer}
.${P}-btn:hover{background:rgba(255,255,255,.2)}
.${P}-scroll{display:flex;flex:1;overflow:auto;font:.8rem/1.5 "SFMono-Regular",Consolas,"D2Coding",Menlo,monospace}
.${P}-gutter,.${P}-code{margin:0;padding:.6rem 0;white-space:pre}
.${P}-gutter{flex-shrink:0;padding:.6rem;text-align:right;color:#9aa5b8;background:#f1f4f9;border-right:1px solid #e3e8f0;user-select:none}
.${P}-code{flex:1;padding:.6rem .75rem;color:#1f2a3c}
.${P}-tab{position:absolute;top:.75rem;right:0;z-index:30;padding:.6rem .3rem;border:0;border-radius:.5rem 0 0 .5rem;
  background:#2e7cf6;color:#fff;font-weight:bold;font-size:.8rem;writing-mode:vertical-rl;cursor:pointer}
.${P}-tab:hover{background:#1f5fc4}
.${P}-docked .${P}-panel{position:relative;top:auto;right:auto;bottom:auto;height:100%;box-shadow:none;border-left:1px solid #dde3ec}
.${P}-docked .${P}-tab{position:relative;top:auto;height:100%;border-radius:0;padding:.75rem .35rem}
.${P}-docked{display:flex;height:100%}
.py-comment{color:#6a7a8f;font-style:italic}.py-string{color:#b3541e}.py-decorator{color:#8a3ffc}
.py-number{color:#0f7b6c}.py-keyword{color:#c2185b;font-weight:bold}.py-api{color:#1f5fc4;font-weight:bold}
.py-builtin{color:#5c6bc0}
`;
    var store = {
      get(k, d) {
        try {
          const v = localStorage.getItem(k);
          return v === null ? d : JSON.parse(v);
        } catch (e) {
          return d;
        }
      },
      set(k, v) {
        try {
          localStorage.setItem(k, JSON.stringify(v));
        } catch (e) {
        }
      }
    };
    var el6 = (tag, cls, text2) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text2) e.textContent = text2;
      return e;
    };
    var mountPythonPanel2 = (vm2, options = {}) => {
      if (typeof document === "undefined" || !vm2 || typeof vm2.on !== "function") return;
      if (document.getElementById(`${P}-style`)) return;
      const style2 = el6("style");
      style2.id = `${P}-style`;
      style2.textContent = CSS;
      document.head.appendChild(style2);
      let open = store.get(`${P}.open`, true);
      let width = store.get(`${P}.width`, Math.round(Math.max(280, Math.min(380, window.innerWidth * 0.24))));
      let code = "";
      const panel = el6("section", `${P}-panel`);
      panel.setAttribute("aria-label", "Python 코드");
      const resizer = el6("div", `${P}-resizer`);
      const header = el6("header", `${P}-header`);
      const copyBtn = el6("button", `${P}-btn`, "복사");
      const closeBtn = el6("button", `${P}-btn`, "닫기");
      header.append(
        el6("span", `${P}-title`, "Python"),
        el6("span", `${P}-sub`, "블록에서 자동 생성 · 읽기 전용"),
        copyBtn,
        closeBtn
      );
      const scroll = el6("div", `${P}-scroll`);
      const gutter = el6("pre", `${P}-gutter`);
      const pre = el6("pre", `${P}-code`);
      scroll.append(gutter, pre);
      panel.append(resizer, header, scroll);
      const tab = el6("button", `${P}-tab`, "Python");
      tab.title = "Python 코드 보기";
      if (options.accent) {
        header.style.background = options.accent;
        tab.style.background = options.accent;
      }
      const render = () => {
        panel.style.width = `${width}px`;
        panel.style.display = open ? "flex" : "none";
        tab.style.display = open ? "none" : "block";
        if (options.onToggle) options.onToggle(open);
      };
      const regenerate = () => {
        let next;
        try {
          next = generatePython(fromVM(vm2));
        } catch (e) {
          next = `# Python 변환 중 오류가 발생했습니다
# ${e && e.message}
`;
        }
        if (next === code) return;
        code = next;
        const n = code.replace(/\n$/, "").split("\n").length;
        gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
        pre.innerHTML = highlightPython(code);
      };
      let timer = null;
      const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(regenerate, 150);
      };
      closeBtn.onclick = () => {
        open = false;
        store.set(`${P}.open`, open);
        render();
      };
      tab.onclick = () => {
        open = true;
        store.set(`${P}.open`, open);
        render();
      };
      copyBtn.onclick = () => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.textContent = "복사됨";
          setTimeout(() => {
            copyBtn.textContent = "복사";
          }, 1500);
        }, () => {
        });
      };
      resizer.onmousedown = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = width;
        const move = (ev) => {
          width = Math.max(240, Math.min(900, startW + (startX - ev.clientX)));
          render();
        };
        const up = () => {
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
          store.set(`${P}.width`, width);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      };
      if (options.host) {
        options.host.classList.add(`${P}-docked`);
        options.host.append(tab, panel);
      } else {
        const attach = () => {
          const bg = document.querySelector(".blocklyMainBackground");
          const host = bg && bg.closest(".injectionDiv");
          if (host && panel.parentElement !== host) {
            host.append(panel, tab);
            schedule();
          }
        };
        setInterval(attach, 1e3);
        attach();
      }
      vm2.on("PROJECT_CHANGED", schedule);
      vm2.on("workspaceUpdate", schedule);
      vm2.on("targetsUpdate", schedule);
      render();
      regenerate();
      return { regenerate: schedule, getCode: () => code };
    };
    module.exports = { mountPythonPanel: mountPythonPanel2 };
  }
});

// ../scratch-cm550/src/protocol2.js
var require_protocol2 = __commonJS({
  "../scratch-cm550/src/protocol2.js"(exports, module) {
    var INST = {
      PING: 1,
      READ: 2,
      WRITE: 3,
      REG_WRITE: 4,
      ACTION: 5,
      FACTORY_RESET: 6,
      REBOOT: 8,
      CLEAR: 16,
      STATUS: 85,
      SYNC_READ: 130,
      SYNC_WRITE: 131,
      BULK_READ: 146,
      BULK_WRITE: 147
    };
    var BROADCAST_ID = 254;
    var CRC_TABLE = (() => {
      const table = new Uint16Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i << 8;
        for (let j = 0; j < 8; j++) {
          c = c & 32768 ? c << 1 ^ 32773 : c << 1;
          c &= 65535;
        }
        table[i] = c;
      }
      return table;
    })();
    var crc16 = (bytes, length = bytes.length) => {
      let crc = 0;
      for (let i = 0; i < length; i++) {
        const idx = (crc >> 8 ^ bytes[i]) & 255;
        crc = (crc << 8 ^ CRC_TABLE[idx]) & 65535;
      }
      return crc;
    };
    var stuff = (bytes) => {
      const out = [];
      let ff = 0;
      for (const b of bytes) {
        out.push(b);
        if (ff >= 2 && b === 253) {
          out.push(253);
          ff = 0;
        } else if (b === 255) {
          ff++;
        } else {
          ff = 0;
        }
      }
      return out;
    };
    var unstuff = (bytes) => {
      const out = [];
      let ff = 0;
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if (ff >= 2 && b === 253 && bytes[i + 1] === 253) {
          out.push(253);
          i++;
          ff = 0;
          continue;
        }
        out.push(b);
        ff = b === 255 ? ff + 1 : 0;
      }
      return out;
    };
    var buildPacket = (id, instruction, params = []) => {
      const body = stuff([instruction, ...params]);
      const length = body.length + 2;
      const pkt = [255, 255, 253, 0, id & 255, length & 255, length >> 8 & 255, ...body];
      const crc = crc16(pkt);
      pkt.push(crc & 255, crc >> 8 & 255);
      return Uint8Array.from(pkt);
    };
    var le2 = (value, size) => {
      const v = value < 0 ? value + 2 ** (size * 8) : value;
      const out = [];
      for (let i = 0; i < size; i++) out.push(v >>> 8 * i & 255);
      return out;
    };
    var fromLE = (bytes, offset, size, signed2 = false) => {
      let v = 0;
      for (let i = 0; i < size; i++) v += bytes[offset + i] * 2 ** (8 * i);
      if (signed2 && v >= 2 ** (size * 8 - 1)) v -= 2 ** (size * 8);
      return v;
    };
    var ping = (id) => buildPacket(id, INST.PING);
    var read = (id, address, size) => buildPacket(id, INST.READ, [...le2(address, 2), ...le2(size, 2)]);
    var write = (id, address, value, size) => buildPacket(id, INST.WRITE, [...le2(address, 2), ...le2(value, size)]);
    var writeBytes = (id, address, bytes) => buildPacket(id, INST.WRITE, [...le2(address, 2), ...bytes]);
    var reboot = (id) => buildPacket(id, INST.REBOOT);
    var syncWrite = (address, size, items) => {
      const params = [...le2(address, 2), ...le2(size, 2)];
      for (const it of items) params.push(it.id & 255, ...le2(it.value, size));
      return buildPacket(BROADCAST_ID, INST.SYNC_WRITE, params);
    };
    var syncRead = (address, size, ids) => buildPacket(BROADCAST_ID, INST.SYNC_READ, [...le2(address, 2), ...le2(size, 2), ...ids.map((i) => i & 255)]);
    var ERROR_NAMES = {
      1: "처리 실패 (Result Fail)",
      2: "알 수 없는 명령 (Instruction Error)",
      3: "통신 오류 (CRC Error)",
      4: "값이 범위를 벗어남 (Data Range Error)",
      5: "데이터 길이 오류 (Data Length Error)",
      6: "값이 제한을 넘음 (Data Limit Error)",
      7: "접근 오류 — 토크가 켜져 있어 설정을 바꿀 수 없거나 읽기 전용 (Access Error)"
    };
    var PacketParser = class {
      constructor(onPacket) {
        this.onPacket = onPacket;
        this.buf = [];
      }
      reset() {
        this.buf = [];
      }
      push(chunk) {
        for (const b of chunk) this.buf.push(b);
        this._drain();
      }
      _drain() {
        for (; ; ) {
          let start = -1;
          for (let i = 0; i + 3 < this.buf.length; i++) {
            if (this.buf[i] === 255 && this.buf[i + 1] === 255 && this.buf[i + 2] === 253 && this.buf[i + 3] === 0) {
              start = i;
              break;
            }
          }
          if (start < 0) {
            if (this.buf.length > 3) this.buf = this.buf.slice(-3);
            return;
          }
          if (start > 0) this.buf = this.buf.slice(start);
          if (this.buf.length < 7) return;
          const length = this.buf[5] | this.buf[6] << 8;
          const total = 7 + length;
          if (this.buf.length < total) return;
          const raw = this.buf.slice(0, total);
          this.buf = this.buf.slice(total);
          const crc = raw[total - 2] | raw[total - 1] << 8;
          if (crc16(raw, total - 2) !== crc) {
            continue;
          }
          const body = unstuff(raw.slice(7, total - 2));
          const packet = {
            id: raw[4],
            instruction: body[0],
            error: body.length > 1 ? body[1] & 127 : 0,
            alert: body.length > 1 ? Boolean(body[1] & 128) : false,
            params: body.slice(2)
          };
          this.onPacket(packet);
        }
      }
    };
    module.exports = {
      INST,
      BROADCAST_ID,
      ERROR_NAMES,
      crc16,
      buildPacket,
      le: le2,
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
  }
});

// ../scratch-cm550/src/transport.js
var require_transport = __commonJS({
  "../scratch-cm550/src/transport.js"(exports, module) {
    var CM550_USB_FILTERS = [
      { usbVendorId: 1155 },
      // STMicroelectronics (CM-550 MCU: STM32F4 CDC)
      { usbVendorId: 5840 }
      // ROBOTIS (OpenCM / LN-101 family)
    ];
    var WebSerialTransport = class _WebSerialTransport {
      constructor(options = {}) {
        this.baudRate = options.baudRate || 1e6;
        this.port = null;
        this.reader = null;
        this.writer = null;
        this._dataCb = null;
        this._closeCb = null;
        this._readLoop = null;
      }
      static get available() {
        return typeof navigator !== "undefined" && Boolean(navigator.serial);
      }
      get isOpen() {
        return Boolean(this.port && this.writer);
      }
      get name() {
        return "USB";
      }
      onData(cb) {
        this._dataCb = cb;
      }
      onClose(cb) {
        this._closeCb = cb;
      }
      async open() {
        if (!_WebSerialTransport.available) {
          throw new Error("이 브라우저는 Web Serial을 지원하지 않습니다. Chrome 또는 Edge를 사용하세요.");
        }
        let port;
        try {
          port = await navigator.serial.requestPort({ filters: CM550_USB_FILTERS });
        } catch (e) {
          if (e && e.name === "NotFoundError") {
            port = await navigator.serial.requestPort();
          } else {
            throw e;
          }
        }
        await port.open({ baudRate: this.baudRate, bufferSize: 4096 });
        this.port = port;
        this.writer = port.writable.getWriter();
        this._readLoop = this._startReadLoop();
      }
      async _startReadLoop() {
        while (this.port && this.port.readable) {
          this.reader = this.port.readable.getReader();
          try {
            for (; ; ) {
              const { value, done } = await this.reader.read();
              if (done) break;
              if (value && this._dataCb) this._dataCb(value);
            }
          } catch (e) {
            break;
          } finally {
            try {
              this.reader.releaseLock();
            } catch (e) {
            }
            this.reader = null;
          }
        }
        await this._teardown();
      }
      async write(bytes) {
        if (!this.writer) throw new Error("USB가 연결되어 있지 않습니다.");
        await this.writer.write(bytes);
      }
      async close() {
        if (this.reader) {
          try {
            await this.reader.cancel();
          } catch (e) {
          }
        }
        await this._teardown();
      }
      async _teardown() {
        const wasOpen = this.isOpen;
        if (this.writer) {
          try {
            this.writer.releaseLock();
          } catch (e) {
          }
          this.writer = null;
        }
        if (this.port) {
          try {
            await this.port.close();
          } catch (e) {
          }
          this.port = null;
        }
        if (wasOpen && this._closeCb) this._closeCb();
      }
    };
    var BLE_PROFILES = [
      { service: "0000fff0-0000-1000-8000-00805f9b34fb" },
      // BT-410 / common BLE-UART modules
      { service: "0000ffe0-0000-1000-8000-00805f9b34fb" },
      // HM-10 style
      { service: "6e400001-b5a3-f393-e0a9-e50e24dcca9e" }
      // Nordic UART Service
    ];
    var BLE_CHUNK = 20;
    var WebBluetoothTransport = class _WebBluetoothTransport {
      constructor(options = {}) {
        this.namePrefix = options.namePrefix;
        this.device = null;
        this.server = null;
        this.txChar = null;
        this.rxChar = null;
        this._dataCb = null;
        this._closeCb = null;
        this._onDisconnected = this._onDisconnected.bind(this);
        this._onNotify = this._onNotify.bind(this);
        this._writeQueue = Promise.resolve();
      }
      static get available() {
        return typeof navigator !== "undefined" && Boolean(navigator.bluetooth);
      }
      get isOpen() {
        return Boolean(this.server && this.server.connected && this.txChar);
      }
      get name() {
        return "BLE";
      }
      onData(cb) {
        this._dataCb = cb;
      }
      onClose(cb) {
        this._closeCb = cb;
      }
      async open() {
        if (!_WebBluetoothTransport.available) {
          throw new Error("이 브라우저는 Web Bluetooth를 지원하지 않습니다. Chrome 또는 Edge를 사용하세요.");
        }
        const optionalServices = BLE_PROFILES.map((p) => p.service);
        const request = this.namePrefix ? { filters: [{ namePrefix: this.namePrefix }], optionalServices } : { acceptAllDevices: true, optionalServices };
        const device = await navigator.bluetooth.requestDevice(request);
        device.addEventListener("gattserverdisconnected", this._onDisconnected);
        const server = await device.gatt.connect();
        let found = null;
        for (const profile of BLE_PROFILES) {
          try {
            const service = await server.getPrimaryService(profile.service);
            const chars = await service.getCharacteristics();
            const tx = chars.find((c) => c.properties.writeWithoutResponse || c.properties.write);
            const rx = chars.find((c) => c.properties.notify || c.properties.indicate);
            if (tx && rx) {
              found = { tx, rx };
              break;
            }
          } catch (e) {
          }
        }
        if (!found) {
          try {
            server.disconnect();
          } catch (e) {
          }
          throw new Error("BLE 시리얼 서비스를 찾을 수 없습니다. CM-550의 MODE 버튼으로 블루투스 모드(초록 LED 점멸)를 켜 주세요.");
        }
        this.device = device;
        this.server = server;
        this.txChar = found.tx;
        this.rxChar = found.rx;
        await this.rxChar.startNotifications();
        this.rxChar.addEventListener("characteristicvaluechanged", this._onNotify);
      }
      _onNotify(event) {
        const dv = event.target.value;
        if (dv && this._dataCb) {
          this._dataCb(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength));
        }
      }
      _onDisconnected() {
        const wasOpen = Boolean(this.txChar);
        this.txChar = null;
        this.rxChar = null;
        this.server = null;
        if (wasOpen && this._closeCb) this._closeCb();
      }
      write(bytes) {
        if (!this.isOpen) return Promise.reject(new Error("블루투스가 연결되어 있지 않습니다."));
        this._writeQueue = this._writeQueue.then(async () => {
          for (let i = 0; i < bytes.length; i += BLE_CHUNK) {
            const chunk = bytes.subarray(i, Math.min(i + BLE_CHUNK, bytes.length));
            if (this.txChar.properties.writeWithoutResponse) {
              await this.txChar.writeValueWithoutResponse(chunk);
            } else {
              await this.txChar.writeValueWithResponse(chunk);
            }
          }
        }).catch(() => {
        });
        return this._writeQueue;
      }
      async close() {
        if (this.rxChar) {
          try {
            this.rxChar.removeEventListener("characteristicvaluechanged", this._onNotify);
          } catch (e) {
          }
          try {
            await this.rxChar.stopNotifications();
          } catch (e) {
          }
        }
        if (this.device) {
          this.device.removeEventListener("gattserverdisconnected", this._onDisconnected);
          if (this.device.gatt.connected) this.device.gatt.disconnect();
        }
        this._onDisconnected();
        this.device = null;
      }
    };
    module.exports = { WebSerialTransport, WebBluetoothTransport, BLE_PROFILES, CM550_USB_FILTERS };
  }
});

// ../scratch-cm550/src/cm550.js
var require_cm550 = __commonJS({
  "../scratch-cm550/src/cm550.js"(exports, module) {
    var P22 = require_protocol2();
    var { WebSerialTransport, WebBluetoothTransport } = require_transport();
    var { modelInfo: modelInfo2, modelName: modelName3, describeMotors } = require_models();
    var CM550_ID = 200;
    var CM2 = {
      MODEL_NUMBER: { addr: 0, size: 2 },
      FIRMWARE_VERSION: { addr: 6, size: 1 },
      MODE_NUMBER: { addr: 21, size: 1 },
      // 0 IDLE, 1 Task Play, 2 Manage, 3 Bootloader, 4 Reboot
      DXL_POWER: { addr: 22, size: 1 },
      ERROR_CODE: { addr: 23, size: 2 },
      BUTTON_STATUS: { addr: 26, size: 1 },
      // 0 none, 1 START, 2 MODE, 3 both
      BUTTON_RELEASED: { addr: 28, size: 1 },
      BUTTON_PRESSED_MS: { addr: 29, size: 2 },
      NUM_DXL: { addr: 39, size: 1 },
      SCAN_DXL: { addr: 40, size: 1 },
      DXL_TORQUE: { addr: 41, size: 1 },
      // 1 all off, 2 all on, 3 reboot
      REMOCON_TX: { addr: 59, size: 2 },
      REMOCON_RX: { addr: 61, size: 2 },
      REMOCON_ARRIVED: { addr: 63, size: 1 },
      MOTION_SPEED: { addr: 64, size: 1 },
      // 20..200 (%)
      MOTION_INDEX: { addr: 66, size: 2 },
      // page; 65533 stop now, 65534 stop at key frame, 65535 stop at unit end
      MOTION_STATUS: { addr: 68, size: 1 },
      MOTION_NEXT_PAGE: { addr: 69, size: 2 },
      MOTION_COUNT: { addr: 71, size: 2 },
      TIMER_128MS: { addr: 73, size: 1 },
      TIMER_1MS: { addr: 74, size: 2 },
      RANDOM: { addr: 77, size: 1 },
      BUZZER_INDEX: { addr: 84, size: 1 },
      BUZZER_TIME: { addr: 85, size: 1 },
      // 0.1 s units; 255 = melody mode
      SOUND_COUNT: { addr: 86, size: 1 },
      SOUND_DETECTING: { addr: 87, size: 1 },
      LOW_BATTERY_SOUND: { addr: 88, size: 1 },
      VOLTAGE: { addr: 89, size: 1 },
      // 0.1 V
      TEMPERATURE: { addr: 90, size: 1 },
      LED_RED: { addr: 91, size: 1 },
      LED_GREEN: { addr: 92, size: 1 },
      LED_BLUE: { addr: 93, size: 1 },
      ROLL: { addr: 102, size: 2, signed: true },
      // 0.01 deg
      PITCH: { addr: 104, size: 2, signed: true },
      YAW: { addr: 106, size: 2, signed: true },
      GYRO_X: { addr: 108, size: 2, signed: true },
      // 0.01 deg/s
      GYRO_Y: { addr: 110, size: 2, signed: true },
      GYRO_Z: { addr: 112, size: 2, signed: true },
      ACC_X: { addr: 114, size: 2, signed: true },
      // 0.01 G
      ACC_Y: { addr: 116, size: 2, signed: true },
      ACC_Z: { addr: 118, size: 2, signed: true },
      MILLIS: { addr: 124, size: 4, signed: true },
      // ports 1..5 -> 390,392,394,396,398
      MODULE_CATEGORY: { addr: 390, size: 1, stride: 2 }
    };
    var MODULE = {
      NONE: 0,
      WHEEL: 1,
      SERVO_POSITION: 2,
      SERVO_SPEED: 3,
      IR: 4,
      DMS: 5,
      TOUCH: 6,
      LED: 7,
      USER: 8,
      TEMPERATURE: 9,
      MAGNET: 11,
      MOTION: 12,
      COLOR: 13,
      MOISTURE: 14,
      MOISTURE_TEMP: 15,
      BRIGHTNESS: 16,
      LED_RED_BRIGHT: 17,
      LED_BLUE_BRIGHT: 18
    };
    var PORT2 = {
      WHEEL: { base: 400, stride: 2, size: 2, ports: 2, category: MODULE.WHEEL },
      SERVO_POSITION: { base: 404, stride: 2, size: 2, ports: 2, category: MODULE.SERVO_POSITION },
      SERVO_SPEED: { base: 408, stride: 2, size: 2, ports: 2, category: MODULE.SERVO_SPEED },
      IR: { base: 415, stride: 2, size: 2, ports: 2, category: MODULE.IR },
      DMS: { base: 419, stride: 2, size: 2, ports: 5, category: MODULE.DMS },
      TOUCH: { base: 429, stride: 1, size: 1, ports: 5, category: MODULE.TOUCH },
      LED: { base: 434, stride: 1, size: 1, ports: 5, category: MODULE.LED },
      USER: { base: 439, stride: 2, size: 2, ports: 5, category: MODULE.USER },
      TEMPERATURE: { base: 449, stride: 1, size: 1, ports: 5, category: MODULE.TEMPERATURE, signed: true },
      MAGNET: { base: 459, stride: 1, size: 1, ports: 5, category: MODULE.MAGNET },
      MOTION: { base: 464, stride: 1, size: 1, ports: 5, category: MODULE.MOTION },
      COLOR: { base: 469, stride: 1, size: 1, ports: 5, category: MODULE.COLOR },
      MOISTURE: { base: 474, stride: 1, size: 1, ports: 2, category: MODULE.MOISTURE },
      MOISTURE_TEMP: { base: 479, stride: 1, size: 1, ports: 2, category: MODULE.MOISTURE_TEMP, signed: true },
      BRIGHTNESS: { base: 484, stride: 2, size: 2, ports: 5, category: MODULE.BRIGHTNESS },
      LED_RED_BRIGHT: { base: 494, stride: 1, size: 1, ports: 2, category: MODULE.LED_RED_BRIGHT },
      LED_BLUE_BRIGHT: { base: 499, stride: 1, size: 1, ports: 2, category: MODULE.LED_BLUE_BRIGHT }
    };
    var DXL3 = {
      MODEL_NUMBER: { addr: 0, size: 2 },
      ID: { addr: 7, size: 1 },
      // 1 velocity, 3 position, 4 extended position, 16 PWM (XL-330: 0 current, 5 current-based position)
      OPERATING_MODE: { addr: 11, size: 1 },
      MAX_POSITION_LIMIT: { addr: 48, size: 4 },
      MIN_POSITION_LIMIT: { addr: 52, size: 4 },
      VELOCITY_LIMIT: { addr: 44, size: 4 },
      CURRENT_LIMIT: { addr: 38, size: 2 },
      // current-capable models only
      GOAL_CURRENT: { addr: 102, size: 2, signed: true },
      TORQUE_ENABLE: { addr: 64, size: 1 },
      LED: { addr: 65, size: 1 },
      HARDWARE_ERROR: { addr: 70, size: 1 },
      GOAL_PWM: { addr: 100, size: 2, signed: true },
      GOAL_VELOCITY: { addr: 104, size: 4, signed: true },
      // unit 0.229 rpm
      PROFILE_ACCELERATION: { addr: 108, size: 4 },
      PROFILE_VELOCITY: { addr: 112, size: 4 },
      GOAL_POSITION: { addr: 116, size: 4, signed: true },
      // 0..4095 = 360 deg
      MOVING: { addr: 122, size: 1 },
      PRESENT_PWM: { addr: 124, size: 2, signed: true },
      PRESENT_LOAD: { addr: 126, size: 2, signed: true },
      // 0.1 %
      PRESENT_VELOCITY: { addr: 128, size: 4, signed: true },
      PRESENT_POSITION: { addr: 132, size: 4, signed: true },
      PRESENT_INPUT_VOLTAGE: { addr: 144, size: 2 },
      // 0.1 V
      PRESENT_TEMPERATURE: { addr: 146, size: 1 }
    };
    var OP_MODE = { CURRENT: 0, VELOCITY: 1, POSITION: 3, EXTENDED_POSITION: 4, CURRENT_POSITION: 5, PWM: 16 };
    var DUAL_AXIS_MODELS = /* @__PURE__ */ new Set([1090, 1160]);
    var MOTION_STOP = { NOW: 65533, KEYFRAME: 65534, UNIT: 65535 };
    var clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    var degToTick = (deg2) => Math.round(deg2 / 360 * 4096);
    var tickToDeg2 = (tick) => tick / 4096 * 360;
    var delay4 = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    var CM550Device = class {
      constructor() {
        this.transport = null;
        this.parser = new P22.PacketParser((pkt) => this._onPacket(pkt));
        this._queue = Promise.resolve();
        this._pending = null;
        this._collector = null;
        this._rawTap = null;
        this.motors = [];
        this.motorDesc = describeMotors([]);
        this.onMotorsChange = null;
        this._modelCache = {};
        this._scanPromise = null;
        this.lastError = "";
        this.timeoutMs = 200;
        this._categoryCache = {};
        this._velocityLimitCache = {};
        this._modeCache = {};
        this._ready = null;
        this.prepared = false;
        this._lastGoal = null;
        this.onStateChange = null;
      }
      get connected() {
        return Boolean(this.transport && this.transport.isOpen);
      }
      get transportName() {
        return this.transport ? this.transport.name : "";
      }
      /**
       * @param {'usb'|'ble'|object} kind - 'usb', 'ble', or a ready-made transport
       *   object (open/close/write/onData/onClose/isOpen/name), e.g. a simulator
       */
      async connect(kind) {
        if (this.connected) await this.disconnect();
        let transport;
        if (kind && typeof kind === "object") {
          transport = kind;
          this.timeoutMs = 200;
        } else {
          transport = kind === "ble" ? new WebBluetoothTransport() : new WebSerialTransport();
          this.timeoutMs = kind === "ble" ? 600 : 200;
        }
        transport.onData((chunk) => {
          if (this._rawTap) for (const b of chunk) this._rawTap.push(b);
          this.parser.push(chunk);
        });
        transport.onClose(() => {
          this.transport = null;
          this._failPending(new Error("연결이 끊어졌습니다."));
          this._notify();
        });
        await transport.open();
        this.transport = transport;
        this.parser.reset();
        this._categoryCache = {};
        this._velocityLimitCache = {};
        this._modeCache = {};
        this._ready = null;
        this.prepared = false;
        this._lastGoal = null;
        this._modelCache = {};
        this.setMotors([]);
        try {
          const model = await this.readCM(CM2.MODEL_NUMBER);
          if (model !== 450) {
            this.lastError = `알 수 없는 컨트롤러 (모델 번호 ${model})`;
          }
          await this.writeCM(CM2.MODE_NUMBER, 2);
        } catch (e) {
          this.lastError = `CM-550 응답 없음: ${e.message}`;
        }
        this._notify();
      }
      async disconnect() {
        const t = this.transport;
        this.transport = null;
        if (t) await t.close();
        this._failPending(new Error("연결 종료"));
        this._notify();
      }
      _notify() {
        if (this.onStateChange) this.onStateChange(this.connected);
      }
      _failPending(err) {
        if (this._pending) {
          clearTimeout(this._pending.timer);
          this._pending.reject(err);
          this._pending = null;
        }
      }
      _onPacket(pkt) {
        if (this._collector) {
          if (!pkt.error) this._collector.push(pkt);
          return;
        }
        const p = this._pending;
        if (!p) return;
        if (pkt.id !== p.id && p.id !== P22.BROADCAST_ID) return;
        clearTimeout(p.timer);
        this._pending = null;
        if (pkt.error) {
          const name = P22.ERROR_NAMES[pkt.error] || `error ${pkt.error}`;
          this.lastError = `ID ${pkt.id}: ${name}`;
          p.reject(new Error(this.lastError));
        } else {
          p.resolve(pkt);
        }
      }
      /**
       * Send one instruction packet and wait for the status packet. Requests
       * are serialized because the bus is half-duplex.
       * @param {number} id destination id
       * @param {Uint8Array} packet
       * @param {boolean} expectReply
       */
      request(id, packet, expectReply = true) {
        const run = async () => {
          if (!this.connected) throw new Error("CM-550이 연결되어 있지 않습니다.");
          if (!expectReply) {
            await this.transport.write(packet);
            return null;
          }
          return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              if (this._pending && this._pending.timer === timer) {
                this._pending = null;
                this.lastError = `ID ${id}: 응답 시간 초과`;
                reject(new Error(this.lastError));
              }
            }, this.timeoutMs);
            this._pending = { id, resolve, reject, timer };
            this.transport.write(packet).catch((err) => {
              clearTimeout(timer);
              this._pending = null;
              reject(err);
            });
          });
        };
        const result = this._queue.then(run, run);
        this._queue = result.catch(() => {
        });
        return result;
      }
      async read(id, address, size, signed2 = false) {
        const pkt = await this.request(id, P22.read(id, address, size));
        if (pkt.params.length < size) throw new Error(`ID ${id}: 응답 길이 오류`);
        return P22.fromLE(pkt.params, 0, size, signed2);
      }
      write(id, address, value, size) {
        return this.request(id, P22.write(id, address, Math.round(value), size));
      }
      /** Read `length` raw bytes starting at `address` (one packet). */
      async readBytes(id, address, length) {
        const pkt = await this.request(id, P22.read(id, address, length));
        if (pkt.params.length < length) throw new Error(`ID ${id}: 응답 길이 오류`);
        return pkt.params.slice(0, length);
      }
      /**
       * Protocol 2.0 broadcast ping: every device on the bus answers.
       * @param {number} [waitMs] how long to collect replies
       * @returns {Promise<Array<{id:number, model:number, firmware:number}>>}
       */
      broadcastPing(waitMs) {
        const wait = waitMs || this.timeoutMs * 2;
        const run = async () => {
          if (!this.connected) throw new Error("CM-550이 연결되어 있지 않습니다.");
          this._collector = [];
          try {
            await this.transport.write(P22.ping(P22.BROADCAST_ID));
            await delay4(wait);
            return this._collector;
          } finally {
            this._collector = null;
          }
        };
        const result = this._queue.then(run, run).then((pkts) => {
          const seen = /* @__PURE__ */ new Map();
          for (const p of pkts) {
            if (!seen.has(p.id)) {
              seen.set(p.id, {
                id: p.id,
                model: p.params.length >= 2 ? P22.fromLE(p.params, 0, 2) : 0,
                firmware: p.params.length >= 3 ? p.params[2] : 0
              });
            }
          }
          return Array.from(seen.values()).sort((a, b) => a.id - b.id);
        });
        this._queue = result.catch(() => {
        });
        return result;
      }
      /**
       * Find every DYNAMIXEL on the bus (broadcast ping, then IDs 1..fallbackMax
       * one by one if nothing answered) and remember their models.
       * Concurrent callers share one scan.
       */
      scanMotors(fallbackMax = 30, onProgress) {
        if (this._scanPromise) return this._scanPromise;
        this._scanPromise = (async () => {
          let found = (await this.broadcastPing()).filter((d) => d.id !== CM550_ID);
          if (!found.length) {
            for (let id = 1; id <= fallbackMax; id++) {
              if (onProgress) onProgress(id, fallbackMax);
              const info = await this.pingInfo(id);
              if (info) found.push(info);
            }
          }
          let volts = 0;
          try {
            volts = await this.readCM(CM2.VOLTAGE) / 10;
          } catch (e) {
          }
          this.setMotors(found, volts);
          return this.motors;
        })();
        const done = () => {
          this._scanPromise = null;
        };
        this._scanPromise.then(done, done);
        return this._scanPromise;
      }
      /**
       * Read one register from many motors with a single SYNC READ (each motor
       * answers in turn). Motors that did not answer in time are read one by one,
       * so the result is complete either way.
       * @param {object} reg {addr, size}
       * @param {number[]} ids
       * @param {number} [waitMs] longest wait for the replies
       * @returns {Promise<Map<number, number>>} id -> value
       */
      async syncReadDXL(reg, ids, waitMs = 120) {
        const run = async () => {
          if (!this.connected) throw new Error("CM-550이 연결되어 있지 않습니다.");
          this._collector = [];
          try {
            await this.transport.write(P22.syncRead(reg.addr, reg.size, ids));
            const t0 = Date.now();
            while (Date.now() - t0 < waitMs) {
              if (new Set(this._collector.map((p) => p.id)).size >= ids.length) break;
              await delay4(4);
            }
            return this._collector;
          } finally {
            this._collector = null;
          }
        };
        const result = this._queue.then(run, run);
        this._queue = result.catch(() => {
        });
        const out = /* @__PURE__ */ new Map();
        for (const p of await result) {
          if (ids.includes(p.id) && p.params.length >= reg.size) out.set(p.id, P22.fromLE(p.params, 0, reg.size));
        }
        this.syncReadWorks = out.size > 0;
        for (const id of ids) if (!out.has(id)) out.set(id, await this.readDXL(id, reg));
        return out;
      }
      /** Replace the known motor list (scan, diagnosis) and notify listeners. */
      setMotors(motors, busVolts) {
        this.motors = motors.slice().sort((a, b) => a.id - b.id);
        for (const m of this.motors) this._modelCache[m.id] = m.model;
        this.motorDesc = describeMotors(this.motors, busVolts);
        if (this.onMotorsChange) this.onMotorsChange(this.motors, this.motorDesc);
      }
      /** Model number of `id` (cached; read from the motor once). Rejects unsupported models. */
      async requireModel(id) {
        if (typeof this._modelCache[id] === "undefined") {
          this._modelCache[id] = await this.readDXL(id, DXL3.MODEL_NUMBER);
        }
        const model = this._modelCache[id];
        if (!modelInfo2(model)) {
          throw new Error(`다이나믹셀 ${id}: ${modelName3(model)} — 이 블록으로 제어할 수 없는 모델입니다.`);
        }
        return model;
      }
      /** Ping one id; resolves {id, model, firmware} or null. */
      async pingInfo(id) {
        try {
          const pkt = await this.ping(id);
          return {
            id,
            model: pkt.params.length >= 2 ? P22.fromLE(pkt.params, 0, 2) : 0,
            firmware: pkt.params.length >= 3 ? pkt.params[2] : 0
          };
        } catch (e) {
          return null;
        }
      }
      readCM(reg, port = 1) {
        const addr = reg.addr + (port - 1) * (reg.stride || 0);
        return this.read(CM550_ID, addr, reg.size, Boolean(reg.signed));
      }
      writeCM(reg, value, port = 1) {
        const addr = reg.addr + (port - 1) * (reg.stride || 0);
        return this.write(CM550_ID, addr, value, reg.size);
      }
      readDXL(id, reg) {
        return this.read(id, reg.addr, reg.size, Boolean(reg.signed));
      }
      writeDXL(id, reg, value) {
        if (reg === DXL3.GOAL_POSITION && this._lastGoal) this._lastGoal.delete(id);
        return this.write(id, reg.addr, value, reg.size);
      }
      ping(id) {
        return this.request(id, P22.ping(id));
      }
      /**
       * Sync-write the same register on several DYNAMIXELs (no status packet).
       * @param reg
       * @param items
       */
      syncWriteDXL(reg, items) {
        return this.request(P22.BROADCAST_ID, P22.syncWrite(reg.addr, reg.size, items.map((it) => ({
          id: it.id,
          value: Math.round(it.value)
        }))), false);
      }
      // ---- peripheral ports ----------------------------------------------
      async ensurePortCategory(port, category2) {
        if (this._categoryCache[port] === category2) return;
        await this.writeCM(CM2.MODULE_CATEGORY, category2, port);
        this._categoryCache[port] = category2;
        await delay4(50);
      }
      async readPort(spec, port) {
        port = clamp(Math.round(port), 1, spec.ports);
        await this.ensurePortCategory(port, spec.category);
        const addr = spec.base + (port - 1) * spec.stride;
        return this.read(CM550_ID, addr, spec.size, Boolean(spec.signed));
      }
      async writePort(spec, port, value) {
        port = clamp(Math.round(port), 1, spec.ports);
        await this.ensurePortCategory(port, spec.category);
        const addr = spec.base + (port - 1) * spec.stride;
        return this.write(CM550_ID, addr, value, spec.size);
      }
      // ---- DYNAMIXEL helpers ----------------------------------------------
      /**
       * Make sure `id` runs in one of `accepted` operating modes (switching to the
       * first one only when needed) and that its torque is on.
       *
       * Operating Mode lives in EEPROM: it can only be written with torque off,
       * and on dual-axis modules (2XL430 / 2XC430) only when BOTH axes have
       * torque off. The current mode is read first so the common case (already
       * in position mode) never touches EEPROM.
       */
      async ensureMode(id, accepted) {
        const target = accepted[0];
        const info = modelInfo2(await this.requireModel(id));
        if ((target === OP_MODE.CURRENT_POSITION || target === OP_MODE.CURRENT) && !info.current) {
          throw new Error(`다이나믹셀 ${id}: ${info.name}은(는) 전류(힘) 제어를 지원하지 않습니다. XL330·XC330·XM430·XH430에서 사용할 수 있습니다.`);
        }
        let current2 = this._modeCache[id];
        if (typeof current2 === "undefined") {
          current2 = await this.readDXL(id, DXL3.OPERATING_MODE);
          this._modeCache[id] = current2;
        }
        if (accepted.includes(current2)) {
          await this.writeDXL(id, DXL3.TORQUE_ENABLE, 1);
          return;
        }
        const torque = await this.readDXL(id, DXL3.TORQUE_ENABLE);
        if (torque) await this.writeDXL(id, DXL3.TORQUE_ENABLE, 0);
        try {
          await this.writeDXL(id, DXL3.OPERATING_MODE, target);
        } catch (e) {
          if (!/접근 오류|Access/.test(e.message)) throw e;
          const ok = await this._withSiblingTorqueOff(
            id,
            () => this.writeDXL(id, DXL3.OPERATING_MODE, target)
          );
          if (!ok) {
            throw new Error(`다이나믹셀 ${id}: 모드를 바꿀 수 없습니다. 같은 모듈(2XL430 등)의 다른 축이나 이 모터의 토크를 끈 뒤 다시 시도하세요.`);
          }
        }
        this._modeCache[id] = target;
        await this.writeDXL(id, DXL3.TORQUE_ENABLE, 1);
      }
      /** Back-compat name used by blocks: switch to exactly `mode`. */
      setOperatingMode(id, mode) {
        return this.ensureMode(id, [mode]);
      }
      /**
       * Dual-axis modules share one EEPROM lock: temporarily turn off the other
       * axis (ID ± 1 with a dual-axis model number), run fn, restore its torque.
       * @returns {Promise<boolean>} true if fn succeeded
       */
      async _withSiblingTorqueOff(id, fn) {
        const known = this.motorDesc.axis[id];
        const candidates = known ? [known.sibling] : [id + 1, id - 1];
        for (const n of candidates) {
          if (n < 0 || n > 252) continue;
          let model;
          try {
            model = await this.readDXL(n, DXL3.MODEL_NUMBER);
          } catch (e) {
            continue;
          }
          if (!DUAL_AXIS_MODELS.has(model)) continue;
          const t = await this.readDXL(n, DXL3.TORQUE_ENABLE);
          if (t) await this.writeDXL(n, DXL3.TORQUE_ENABLE, 0);
          try {
            await fn();
            return true;
          } catch (e) {
          } finally {
            if (t) await this.writeDXL(n, DXL3.TORQUE_ENABLE, 1);
          }
        }
        return false;
      }
      async getVelocityLimit(id) {
        if (!this._velocityLimitCache[id]) {
          this._velocityLimitCache[id] = await this.readDXL(id, DXL3.VELOCITY_LIMIT);
        }
        return this._velocityLimitCache[id];
      }
      /**
       * Move to an absolute angle (0..360 in position mode, any value in
       * extended position mode) with a speed percentage of the velocity limit.
       * @param id
       * @param degrees
       * @param speedPercent
       */
      async moveTo(id, degrees, speedPercent) {
        await this.ensureMode(id, [OP_MODE.POSITION, OP_MODE.EXTENDED_POSITION]);
        if (typeof speedPercent === "number" && !Number.isNaN(speedPercent)) {
          const limit = await this.getVelocityLimit(id);
          const pv = Math.round(limit * clamp(speedPercent, 0, 100) / 100);
          await this.writeDXL(id, DXL3.PROFILE_VELOCITY, pv);
        }
        await this.writeDXL(id, DXL3.GOAL_POSITION, degToTick(degrees));
      }
      /**
       * Current-based position (grippers): move toward `degrees` but push with at
       * most `forcePercent` of the motor's Current Limit. XL330/XC330/XM/XH only.
       */
      async grip(id, degrees, forcePercent) {
        await this.ensureMode(id, [OP_MODE.CURRENT_POSITION]);
        const limit = await this.readDXL(id, DXL3.CURRENT_LIMIT);
        await this.writeDXL(id, DXL3.GOAL_CURRENT, Math.round(limit * clamp(forcePercent, 0, 100) / 100));
        await this.writeDXL(id, DXL3.GOAL_POSITION, degToTick(degrees));
      }
      async setWheelSpeed(id, percent) {
        await this.setOperatingMode(id, OP_MODE.VELOCITY);
        const limit = await this.getVelocityLimit(id);
        const v = Math.round(limit * clamp(percent, -100, 100) / 100);
        await this.writeDXL(id, DXL3.GOAL_VELOCITY, v);
      }
      async waitUntilStopped(id, timeoutMs = 1e4) {
        const start = Date.now();
        await delay4(30);
        while (Date.now() - start < timeoutMs) {
          const moving = await this.readDXL(id, DXL3.MOVING);
          if (!moving) return;
          await delay4(30);
        }
      }
      // ---- poses (teach by hand / play back) --------------------------------
      /** IDs a pose uses: the last scan's motors (or the given list). */
      poseIds(ids) {
        const list = ids && ids.length ? ids : this.motors.map((m) => m.id);
        return list.map(Number).filter((n) => n >= 0 && n <= 252);
      }
      /**
       * Read the present angle of every joint.
       * @returns {Promise<Object<number, number>>} {id: degrees (0.1° steps)}
       */
      async readPose(ids) {
        const pose = {};
        for (const id of this.poseIds(ids)) {
          const tick = await this.readDXL(id, DXL3.PRESENT_POSITION);
          pose[id] = Math.round(tickToDeg2(tick) * 10) / 10;
        }
        return pose;
      }
      /**
       * Let joints go limp so a student can pose them by hand (torque off), or
       * stiffen them again. Before torque comes back on each goal is set to the
       * joint's present angle, so the robot holds the hand-made pose instead of
       * jumping back to an old goal.
       */
      async setJointsTorque(ids, on) {
        for (const id of this.poseIds(ids)) {
          if (!on) {
            await this.writeDXL(id, DXL3.TORQUE_ENABLE, 0);
            continue;
          }
          const hold = await this.readDXL(id, DXL3.PRESENT_POSITION);
          await this.writeDXL(id, DXL3.GOAL_POSITION, hold);
          await this.ensureMode(id, [OP_MODE.POSITION, OP_MODE.EXTENDED_POSITION]);
          const now = await this.readDXL(id, DXL3.PRESENT_POSITION);
          await this.writeDXL(id, DXL3.GOAL_POSITION, now);
        }
      }
      /**
       * Move every joint of `pose` so that all of them arrive together after
       * `seconds` (each joint's profile velocity is set from its own distance).
       * @param {Object<number, number>} pose {id: degrees}
       * @param {number} seconds
       * @returns {Promise<number[]>} IDs that were moved
       */
      async movePose(pose, seconds) {
        const secs = clamp(Number(seconds) || 0, 0.1, 30);
        const ids = Object.keys(pose).map(Number);
        const plan = [];
        for (const id of ids) {
          await this.ensureMode(id, [OP_MODE.POSITION, OP_MODE.EXTENDED_POSITION]);
          const cur = tickToDeg2(await this.readDXL(id, DXL3.PRESENT_POSITION));
          const target = Number(pose[id]);
          const degPerSec = Math.abs(target - cur) / secs;
          let pv = Math.max(1, Math.ceil(degPerSec / 6 / 0.229));
          const limit = await this.getVelocityLimit(id);
          if (limit) pv = Math.min(pv, limit);
          plan.push({ id, pv, goal: degToTick(target) });
        }
        for (const p of plan) await this.writeDXL(p.id, DXL3.PROFILE_VELOCITY, p.pv);
        for (const p of plan) await this.writeDXL(p.id, DXL3.GOAL_POSITION, p.goal);
        return ids;
      }
      /**
       * Move several joints together so they all arrive after `seconds` (block
       * "모두 함께 … 초 동안 움직이기"). Fast enough for walking: after the first call
       * it only sends two SYNC WRITEs (profile velocity, goal), working out each
       * joint's speed from the goal it was last sent.
       * @param {Array<{id: number, deg: number}>} items
       */
      async moveTogether(items, seconds) {
        const secs = clamp(Number(seconds) || 0, 0.02, 30);
        if (!this._ready) this._ready = /* @__PURE__ */ new Set();
        if (!this._lastGoal) this._lastGoal = /* @__PURE__ */ new Map();
        const fresh = items.filter((it) => !this._ready.has(it.id));
        if (fresh.length) {
          const here = [];
          for (const it of fresh) here.push({ id: it.id, value: await this.readDXL(it.id, DXL3.PRESENT_POSITION) });
          await this.syncWriteDXL(DXL3.GOAL_POSITION, here);
          await this.syncWriteDXL(DXL3.TORQUE_ENABLE, fresh.map((it) => ({ id: it.id, value: 1 })));
          for (const it of fresh) {
            await this.ensureMode(it.id, [OP_MODE.POSITION, OP_MODE.EXTENDED_POSITION]);
            this._ready.add(it.id);
          }
          for (const h of here) this._lastGoal.set(h.id, tickToDeg2(h.value));
        }
        for (const it of items) {
          if (!this._lastGoal.has(it.id)) this._lastGoal.set(it.id, tickToDeg2(await this.readDXL(it.id, DXL3.PRESENT_POSITION)));
        }
        await this.syncWriteDXL(DXL3.PROFILE_VELOCITY, items.map((it) => ({
          id: it.id,
          // 0.229 rpm units; 1 rpm = 6 deg/s
          value: clamp(Math.ceil(Math.abs(it.deg - this._lastGoal.get(it.id)) / secs / 6 / 0.229), 1, 32767)
        })));
        await this.syncWriteDXL(DXL3.GOAL_POSITION, items.map((it) => ({ id: it.id, value: degToTick(it.deg) })));
        for (const it of items) this._lastGoal.set(it.id, it.deg);
      }
      /**
       * 시작 준비 (block "모든 모터 준비하기"): put the motors in the same starting
       * condition every time, the way the 3D robot starts each try in 걸음 학습 —
       *   1. a motor reporting a hardware error (과부하, 과열, …) is rebooted, which
       *      clears the error (it stays limp until step 3);
       *   2. every joint is checked for position mode and told to hold where it is;
       *   3. torque goes on for ALL joints in one command (one by one, the robot sags);
       *   4. all joints move slowly together to the start pose (180° = straight).
       * The 3D 가상 로봇 is instead put back on its feet in a fresh world.
       * @param {number[]} [ids] default: every motor found by the last scan
       * @param {Object<number, number>} [pose] {id: degrees}; missing IDs go to 180°
       * @param {number} [seconds] time for the move to the start pose
       * @returns {Promise<{rebooted: number[], ids: number[]}>}
       */
      async prepareJoints(ids, pose = {}, seconds = 2) {
        const list = (ids && ids.length ? ids : this.motors.map((m) => m.id)).map(Number);
        if (!list.length) throw new Error("준비할 다이나믹셀이 없습니다. 먼저 [다이나믹셀 검색]을 하세요.");
        if (this.transport && this.transport.prepareWorld) await this.transport.prepareWorld();
        const rebooted = [];
        for (const id of list) {
          let err = 0;
          try {
            err = await this.readDXL(id, DXL3.HARDWARE_ERROR);
          } catch (e) {
            err = 0;
          }
          if (err) rebooted.push(id);
        }
        for (const id of rebooted) {
          delete this._modeCache[id];
          try {
            await this.request(id, P22.reboot(id));
          } catch (e) {
            await this.writeCM(CM2.DXL_TORQUE, 3);
            break;
          }
        }
        if (rebooted.length) await delay4(800);
        const here = [];
        for (const id of list) {
          const value = await this.readDXL(id, DXL3.PRESENT_POSITION);
          await this.writeDXL(id, DXL3.GOAL_POSITION, value);
          let mode = this._modeCache[id];
          if (typeof mode === "undefined") mode = this._modeCache[id] = await this.readDXL(id, DXL3.OPERATING_MODE);
          if (mode !== OP_MODE.POSITION && mode !== OP_MODE.EXTENDED_POSITION) {
            await this.ensureMode(id, [OP_MODE.POSITION, OP_MODE.EXTENDED_POSITION]);
          }
          here.push({ id, value });
        }
        await this.syncWriteDXL(DXL3.TORQUE_ENABLE, list.map((id) => ({ id, value: 1 })));
        this._ready = new Set(list);
        this._lastGoal = new Map(here.map((h) => [h.id, tickToDeg2(h.value)]));
        const secs = clamp(Number(seconds) || 0, 0.2, 10);
        await this.moveTogether(list.map((id) => ({ id, deg: pose[id] !== void 0 ? Number(pose[id]) : 180 })), secs);
        await delay4(secs * 1e3 + 300);
        this.prepared = true;
        return { rebooted, ids: list };
      }
      // ---- motion ----------------------------------------------------------
      playMotion(page) {
        return this.writeCM(CM2.MOTION_INDEX, clamp(Math.round(page), 1, 65532));
      }
      /**
       * Play motion pages stored in the CM-550 one after another without a stop,
       * the way the official MAX-E1 task walks: start page, the repeat page again
       * and again, then the end page. The next page is set in advance (register
       * 69 "Motion Next Page") so the motion never pauses between pages.
       * @param {number} start e.g. 150 (전진 시작)
       * @param {number} loop e.g. 152 (전진 반복)
       * @param {number} repeat how many times the loop page plays (or seconds, see o.seconds)
       * @param {number} end e.g. 154 (전진 종료)
       * @param {object} [o]
       * @param {number} [o.startSecs] length of the start page at 100 % speed (from the .mtn3 file)
       * @param {number} [o.loopSecs] length of the loop page at 100 % speed
       * @param {boolean} [o.seconds] treat `repeat` as seconds (when page lengths are unknown)
       * @param {function} [o.shouldStop] () => true to finish early (with the end page)
       */
      async playMotionChain(start, loop, repeat, end, { startSecs = 0, loopSecs = 0, seconds = false, shouldStop } = {}) {
        const NONE = 65535;
        let speed = 1;
        try {
          speed = Math.max(0.2, await this.readCM(CM2.MOTION_SPEED) / 100) || 1;
        } catch (e) {
        }
        const known = startSecs > 0 && loopSecs > 0 && !seconds;
        const until = known ? (startSecs + loopSecs * Math.max(1, repeat) - loopSecs * 0.5) / speed : Math.max(0.5, Number(repeat) || 0);
        await this.writeCM(CM2.MOTION_NEXT_PAGE, loop);
        await this.writeCM(CM2.MOTION_INDEX, start);
        const t0 = Date.now();
        while ((Date.now() - t0) / 1e3 < until) {
          if (shouldStop && shouldStop()) break;
          await this.writeCM(CM2.MOTION_NEXT_PAGE, loop);
          await delay4(120);
        }
        await this.writeCM(CM2.MOTION_NEXT_PAGE, end);
        const t1 = Date.now();
        const endBy = known ? (loopSecs * 0.6 + 0.15) / speed : 15;
        while ((Date.now() - t1) / 1e3 < endBy) {
          if (!known) {
            try {
              if (await this.readCM(CM2.MOTION_INDEX) === end || await this.readCM(CM2.MOTION_NEXT_PAGE) !== end || !await this.readCM(CM2.MOTION_STATUS)) break;
            } catch (e) {
            }
          }
          await delay4(50);
        }
        await this.writeCM(CM2.MOTION_NEXT_PAGE, NONE);
        await this.waitMotionDone(15e3);
      }
      stopMotion(how = MOTION_STOP.UNIT) {
        return this.writeCM(CM2.MOTION_INDEX, how);
      }
      async waitMotionDone(timeoutMs = 6e4) {
        const start = Date.now();
        await delay4(100);
        while (Date.now() - start < timeoutMs) {
          const playing = await this.readCM(CM2.MOTION_STATUS);
          if (!playing) return;
          await delay4(50);
        }
      }
      // ---- buzzer ----------------------------------------------------------
      async playNote(index, seconds) {
        await this.writeCM(CM2.BUZZER_INDEX, clamp(Math.round(index), 0, 51));
        await this.writeCM(CM2.BUZZER_TIME, clamp(Math.round(seconds * 10), 1, 50));
      }
      async playMelody(index) {
        await this.writeCM(CM2.BUZZER_INDEX, clamp(Math.round(index), 0, 25));
        await this.writeCM(CM2.BUZZER_TIME, 255);
      }
    };
    module.exports = {
      CM550Device,
      CM550_ID,
      CM: CM2,
      MODULE,
      PORT: PORT2,
      DXL: DXL3,
      OP_MODE,
      MOTION_STOP,
      degToTick,
      tickToDeg: tickToDeg2,
      clamp,
      delay: delay4
    };
  }
});

// ../scratch-cm550/src/icons.js
var require_icons = __commonJS({
  "../scratch-cm550/src/icons.js"(exports, module) {
    var svgToUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    var controllerSvg = (bg, fg) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect x="4" y="6" width="32" height="28" rx="5" fill="${bg}" stroke="${fg}" stroke-width="2"/>
  <circle cx="14" cy="16" r="3" fill="${fg}"/>
  <circle cx="26" cy="16" r="3" fill="${fg}"/>
  <rect x="11" y="23" width="18" height="4" rx="2" fill="${fg}"/>
  <rect x="17" y="2" width="6" height="4" rx="1" fill="${fg}"/>
</svg>`;
    module.exports = {
      blockIconURI: svgToUri(controllerSvg("#2E7CF6", "#ffffff")),
      menuIconURI: svgToUri(controllerSvg("#ffffff", "#2E7CF6"))
    };
  }
});

// ../scratch-cm550/src/poses.js
var require_poses = __commonJS({
  "../scratch-cm550/src/poses.js"(exports, module) {
    var POSE_LIST_NAME = "로봇 자세";
    var POSE_LIST_ID = "dm-robot-poses";
    var encodePose = (pose) => Object.keys(pose).map(Number).sort((a, b) => a - b).map((id) => `${id}:${Math.round(Number(pose[id]) * 10) / 10}`).join(" ");
    var decodePose = (text2) => {
      const pose = {};
      String(text2 || "").split(/[\s,;]+/).forEach((part) => {
        const m = /^(\d{1,3})[:=](-?\d+(?:\.\d+)?)$/.exec(part.trim());
        if (m) pose[Number(m[1])] = Number(m[2]);
      });
      return pose;
    };
    var poseSize2 = (pose) => Object.keys(pose).length;
    module.exports = { POSE_LIST_NAME, POSE_LIST_ID, encodePose, decodePose, poseSize: poseSize2 };
  }
});

// ../scratch-cm550/src/extension.js
var require_extension = __commonJS({
  "../scratch-cm550/src/extension.js"(exports, module) {
    var {
      CM550Device,
      CM: CM2,
      PORT: PORT2,
      DXL: DXL3,
      OP_MODE,
      MOTION_STOP,
      tickToDeg: tickToDeg2,
      clamp,
      delay: delay4
    } = require_cm550();
    var icons = require_icons();
    var { modelName: modelName3 } = require_models();
    var { POSE_LIST_NAME, POSE_LIST_ID, encodePose, decodePose, poseSize: poseSize2 } = require_poses();
    var EXTENSION_ID = "cm550";
    var LED_MIX = {
      red: { name: "빨강", rgb: [1, 0, 0] },
      green: { name: "초록", rgb: [0, 1, 0] },
      blue: { name: "파랑", rgb: [0, 0, 1] },
      yellow: { name: "노랑", rgb: [1, 1, 0] },
      cyan: { name: "하늘", rgb: [0, 1, 1] },
      magenta: { name: "보라", rgb: [1, 0, 1] },
      white: { name: "흰색", rgb: [1, 1, 1] },
      off: { name: "끄기", rgb: [0, 0, 0] }
    };
    var createExtension2 = ({ ArgumentType, BlockType, formatMessage, cast }) => {
      const t = (id, def, values) => formatMessage({ id: `cm550.${id}`, default: def, description: id }, values);
      const num3 = (v) => {
        const n = cast ? cast.toNumber(v) : Number(v);
        return Number.isNaN(n) ? 0 : n;
      };
      const ARG_NUM = (def, menu) => Object.assign({ type: ArgumentType.NUMBER, defaultValue: def }, menu ? { menu } : {});
      const ARG_STR = (def, menu) => ({ type: ArgumentType.STRING, defaultValue: def, menu });
      class Scratch3CM550Blocks {
        constructor(runtime) {
          this.runtime = runtime;
          this.device = new CM550Device();
          this.device.onStateChange = (connected) => {
            if (runtime && runtime.emit) {
              runtime.emit(connected ? "PERIPHERAL_CONNECTED" : "PERIPHERAL_DISCONNECTED");
            }
          };
          this._dxlIds = [];
          if (runtime) runtime.ext_cm550 = this;
          if (runtime && runtime.on) {
            runtime.on("CM550_CONNECT", (kind) => this._connect(kind));
            runtime.on("PROJECT_STOP_ALL", () => this._stopAll());
          }
        }
        static get EXTENSION_ID() {
          return EXTENSION_ID;
        }
        getInfo() {
          return {
            id: EXTENSION_ID,
            name: t("name", "CM-550"),
            color1: "#2E7CF6",
            color2: "#1F5FC4",
            color3: "#174A99",
            blockIconURI: icons.blockIconURI,
            menuIconURI: icons.menuIconURI,
            docsURI: "https://emanual.robotis.com/docs/en/parts/controller/cm-550/",
            blocks: [
              // ---------------- connection ----------------
              { func: "connectUsbButton", blockType: BlockType.BUTTON, text: t("btnUsb", "USB로 연결하기") },
              { func: "connectBleButton", blockType: BlockType.BUTTON, text: t("btnBle", "블루투스로 연결하기") },
              {
                opcode: "connect",
                blockType: BlockType.COMMAND,
                text: t("connect", "CM-550 [KIND] 연결하기"),
                arguments: { KIND: ARG_STR("usb", "connKind") }
              },
              { opcode: "disconnect", blockType: BlockType.COMMAND, text: t("disconnect", "CM-550 연결 끊기") },
              { opcode: "isConnected", blockType: BlockType.BOOLEAN, text: t("isConnected", "CM-550이 연결되었는가?") },
              {
                opcode: "lastError",
                blockType: BlockType.REPORTER,
                text: t("lastError", "마지막 오류"),
                disableMonitor: true
              },
              "---",
              // ---------------- DYNAMIXEL ----------------
              {
                opcode: "dxlTorque",
                blockType: BlockType.COMMAND,
                text: t("dxlTorque", "다이나믹셀 [ID] 토크 [ONOFF]"),
                arguments: { ID: ARG_NUM(1, "dxlId"), ONOFF: ARG_STR("on", "onOff") }
              },
              {
                opcode: "dxlMoveTo",
                blockType: BlockType.COMMAND,
                text: t("dxlMoveTo", "다이나믹셀 [ID] 을(를) [DEG]° 로 이동 (속도 [SPEED] %)"),
                arguments: { ID: ARG_NUM(1, "dxlId"), DEG: ARG_NUM(180), SPEED: ARG_NUM(50) }
              },
              {
                opcode: "dxlMoveToWait",
                blockType: BlockType.COMMAND,
                text: t(
                  "dxlMoveToWait",
                  "다이나믹셀 [ID] 을(를) [DEG]° 로 이동하고 기다리기 (속도 [SPEED] %)"
                ),
                arguments: { ID: ARG_NUM(1, "dxlId"), DEG: ARG_NUM(180), SPEED: ARG_NUM(50) }
              },
              {
                opcode: "dxlMoveTwo",
                blockType: BlockType.COMMAND,
                text: t(
                  "dxlMoveTwo",
                  "다이나믹셀 [ID1] 을(를) [DEG1]° , [ID2] 을(를) [DEG2]° 로 동시에 이동"
                ),
                arguments: {
                  ID1: ARG_NUM(1, "dxlId"),
                  DEG1: ARG_NUM(180),
                  ID2: ARG_NUM(2, "dxlId"),
                  DEG2: ARG_NUM(180)
                }
              },
              {
                opcode: "dxlPrepare",
                blockType: BlockType.COMMAND,
                text: t("dxlPrepare", "모든 다이나믹셀 준비하기 (오류 지우기 · [SECS] 초 동안 180°로)"),
                arguments: { SECS: ARG_NUM(2) }
              },
              {
                opcode: "dxlTogether",
                blockType: BlockType.CONDITIONAL,
                branchCount: 1,
                text: t("dxlTogether", "모두 함께 [SECS] 초 동안 움직이기"),
                arguments: { SECS: ARG_NUM(0.5) }
              },
              {
                opcode: "dxlGoal",
                blockType: BlockType.COMMAND,
                text: t("dxlGoal", "다이나믹셀 [ID] 목표 [DEG]°"),
                arguments: { ID: ARG_NUM(1, "dxlId"), DEG: ARG_NUM(180) }
              },
              {
                opcode: "dxlWheel",
                blockType: BlockType.COMMAND,
                text: t("dxlWheel", "다이나믹셀 [ID] 바퀴 회전 속도 [SPEED] %"),
                arguments: { ID: ARG_NUM(1, "dxlId"), SPEED: ARG_NUM(50) }
              },
              {
                opcode: "dxlWheelTwo",
                blockType: BlockType.COMMAND,
                text: t("dxlWheelTwo", "왼쪽 바퀴 [ID1] 속도 [SPEED1] % , 오른쪽 바퀴 [ID2] 속도 [SPEED2] %"),
                arguments: {
                  ID1: ARG_NUM(1, "dxlId"),
                  SPEED1: ARG_NUM(50),
                  ID2: ARG_NUM(2, "dxlId"),
                  SPEED2: ARG_NUM(-50)
                }
              },
              {
                opcode: "dxlStop",
                blockType: BlockType.COMMAND,
                text: t("dxlStop", "다이나믹셀 [ID] 정지"),
                arguments: { ID: ARG_NUM(1, "dxlId") }
              },
              {
                opcode: "dxlSetMode",
                blockType: BlockType.COMMAND,
                text: t("dxlSetMode", "다이나믹셀 [ID] 모드를 [MODE] 로 설정"),
                arguments: { ID: ARG_NUM(1, "dxlId"), MODE: ARG_STR("position", "dxlMode") }
              },
              {
                opcode: "dxlLed",
                blockType: BlockType.COMMAND,
                text: t("dxlLed", "다이나믹셀 [ID] LED [ONOFF]"),
                arguments: { ID: ARG_NUM(1, "dxlId"), ONOFF: ARG_STR("on", "onOff") }
              },
              {
                opcode: "dxlAllTorque",
                blockType: BlockType.COMMAND,
                text: t("dxlAllTorque", "모든 다이나믹셀 토크 [ONOFF]"),
                arguments: { ONOFF: ARG_STR("on", "onOff") }
              },
              {
                opcode: "dxlRead",
                blockType: BlockType.REPORTER,
                text: t("dxlRead", "다이나믹셀 [ID] 의 [PROP]"),
                arguments: { ID: ARG_NUM(1, "dxlId"), PROP: ARG_STR("position", "dxlProp") }
              },
              {
                opcode: "dxlIsMoving",
                blockType: BlockType.BOOLEAN,
                text: t("dxlIsMoving", "다이나믹셀 [ID] 이(가) 움직이는 중인가?"),
                arguments: { ID: ARG_NUM(1, "dxlId") }
              },
              {
                opcode: "dxlScan",
                blockType: BlockType.REPORTER,
                text: t("dxlScan", "연결된 다이나믹셀 ID 목록"),
                disableMonitor: true
              },
              // ---- model-specific (shown by the host only when such motors are connected)
              {
                opcode: "dxlModuleMove",
                blockType: BlockType.COMMAND,
                text: t("dxlModuleMove", "다이나믹셀 2축 모듈 [MODULE] A축 [DEGA]° , B축 [DEGB]° 로 이동"),
                arguments: { MODULE: ARG_STR("1,2", "dxlModule"), DEGA: ARG_NUM(180), DEGB: ARG_NUM(180) }
              },
              {
                opcode: "dxlModuleWheels",
                blockType: BlockType.COMMAND,
                text: t("dxlModuleWheels", "다이나믹셀 2축 모듈 [MODULE] 바퀴 A축 [SPA] % , B축 [SPB] %"),
                arguments: { MODULE: ARG_STR("1,2", "dxlModule"), SPA: ARG_NUM(50), SPB: ARG_NUM(-50) }
              },
              {
                opcode: "dxlGrip",
                blockType: BlockType.COMMAND,
                text: t("dxlGrip", "다이나믹셀 [ID] 을(를) 힘 [FORCE] % 로 [DEG]° 까지 잡기"),
                arguments: { ID: ARG_NUM(1, "dxlId"), FORCE: ARG_NUM(30), DEG: ARG_NUM(180) }
              },
              {
                opcode: "dxlModelName",
                blockType: BlockType.REPORTER,
                text: t("dxlModelName", "다이나믹셀 [ID] 의 모델 이름"),
                arguments: { ID: ARG_NUM(1, "dxlId") }
              },
              "---",
              // ---------------- poses taught by hand ----------------
              {
                opcode: "poseRelax",
                blockType: BlockType.COMMAND,
                text: t("poseRelax", "모든 관절 [STATE]"),
                arguments: { STATE: ARG_STR("off", "relax") }
              },
              {
                opcode: "poseRecord",
                blockType: BlockType.COMMAND,
                text: t("poseRecord", "지금 자세를 [N] 번 자세로 기록하기"),
                arguments: { N: ARG_NUM(1) }
              },
              {
                opcode: "posePlay",
                blockType: BlockType.COMMAND,
                text: t("posePlay", "자세 [N] 번으로 [SECS] 초 동안 움직이기"),
                arguments: { N: ARG_NUM(1), SECS: ARG_NUM(1) }
              },
              {
                opcode: "posePlayAll",
                blockType: BlockType.COMMAND,
                text: t("posePlayAll", "기록한 자세 모두 차례로 움직이기 (자세마다 [SECS] 초)"),
                arguments: { SECS: ARG_NUM(1) }
              },
              {
                opcode: "poseCount",
                blockType: BlockType.REPORTER,
                text: t("poseCount", "기록한 자세 개수"),
                disableMonitor: true
              },
              {
                opcode: "poseClear",
                blockType: BlockType.COMMAND,
                text: t("poseClear", "기록한 자세 모두 지우기")
              },
              "---",
              // ---------------- CM-550 built-ins ----------------
              {
                // the auxiliary LED has red/green/blue elements (addr 91-93);
                // mixing them gives 7 colours
                opcode: "cmLedColor",
                blockType: BlockType.COMMAND,
                text: t("cmLedColor", "CM-550 LED 색 [COLOR] (으)로 바꾸기"),
                arguments: { COLOR: ARG_STR("red", "ledMix") }
              },
              {
                opcode: "cmLed",
                blockType: BlockType.COMMAND,
                text: t("cmLed", "CM-550 LED [COLOR] [ONOFF]"),
                arguments: { COLOR: ARG_STR("red", "ledColor"), ONOFF: ARG_STR("on", "onOff") }
              },
              {
                opcode: "cmBuzzerNote",
                blockType: BlockType.COMMAND,
                text: t("cmBuzzerNote", "부저로 [NOTE] 음을 [SECS] 초 동안 연주"),
                arguments: { NOTE: ARG_NUM(24, "note"), SECS: ARG_NUM(0.5) }
              },
              {
                opcode: "cmBuzzerMelody",
                blockType: BlockType.COMMAND,
                text: t("cmBuzzerMelody", "부저로 멜로디 [INDEX] 번 연주"),
                arguments: { INDEX: ARG_NUM(0) }
              },
              {
                opcode: "cmButton",
                blockType: BlockType.BOOLEAN,
                text: t("cmButton", "[BUTTON] 버튼이 눌렸는가?"),
                arguments: { BUTTON: ARG_STR("start", "button") }
              },
              {
                opcode: "cmTilt",
                blockType: BlockType.REPORTER,
                text: t("cmTilt", "기울기 [AXIS] (°)"),
                arguments: { AXIS: ARG_STR("roll", "tiltAxis") }
              },
              {
                opcode: "cmGyro",
                blockType: BlockType.REPORTER,
                text: t("cmGyro", "자이로 [AXIS] (°/s)"),
                arguments: { AXIS: ARG_STR("x", "xyz") }
              },
              {
                opcode: "cmAccel",
                blockType: BlockType.REPORTER,
                text: t("cmAccel", "가속도 [AXIS] (G)"),
                arguments: { AXIS: ARG_STR("x", "xyz") }
              },
              { opcode: "cmVoltage", blockType: BlockType.REPORTER, text: t("cmVoltage", "배터리 전압 (V)") },
              { opcode: "cmTemperature", blockType: BlockType.REPORTER, text: t("cmTemperature", "컨트롤러 온도 (°C)") },
              { opcode: "cmSoundCount", blockType: BlockType.REPORTER, text: t("cmSoundCount", "소리 감지 횟수") },
              { opcode: "cmSoundReset", blockType: BlockType.COMMAND, text: t("cmSoundReset", "소리 감지 횟수 초기화") },
              {
                opcode: "cmDxlPower",
                blockType: BlockType.COMMAND,
                text: t("cmDxlPower", "다이나믹셀 전원 [ONOFF]"),
                arguments: { ONOFF: ARG_STR("on", "onOff") }
              },
              "---",
              // ---------------- 5-pin ports ----------------
              {
                opcode: "portSensor",
                blockType: BlockType.REPORTER,
                text: t("portSensor", "포트 [PORT] 의 [SENSOR] 값"),
                arguments: { PORT: ARG_NUM(1, "port5"), SENSOR: ARG_STR("ir", "sensor") }
              },
              {
                opcode: "portTouch",
                blockType: BlockType.BOOLEAN,
                text: t("portTouch", "포트 [PORT] 의 터치 센서가 눌렸는가?"),
                arguments: { PORT: ARG_NUM(1, "port5") }
              },
              {
                opcode: "portColor",
                blockType: BlockType.BOOLEAN,
                text: t("portColor", "포트 [PORT] 의 컬러 센서가 [COLOR] 인가?"),
                arguments: { PORT: ARG_NUM(1, "port5"), COLOR: ARG_STR("red", "colorName") }
              },
              {
                opcode: "portLed",
                blockType: BlockType.COMMAND,
                text: t("portLed", "포트 [PORT] LED 모듈 [STATE]"),
                arguments: { PORT: ARG_NUM(1, "port5"), STATE: ARG_STR("both", "ledModule") }
              },
              {
                opcode: "portServo",
                blockType: BlockType.COMMAND,
                text: t("portServo", "포트 [PORT] 서보모터를 [DEG]° 로 이동"),
                arguments: { PORT: ARG_NUM(1, "port2"), DEG: ARG_NUM(150) }
              },
              {
                opcode: "portMotor",
                blockType: BlockType.COMMAND,
                text: t("portMotor", "포트 [PORT] 기어모터 속도 [SPEED] %"),
                arguments: { PORT: ARG_NUM(1, "port2"), SPEED: ARG_NUM(50) }
              },
              "---",
              // ---------------- motion ----------------
              {
                opcode: "motionPlay",
                blockType: BlockType.COMMAND,
                text: t("motionPlay", "모션 [PAGE] 번 재생"),
                arguments: { PAGE: ARG_NUM(1) }
              },
              {
                opcode: "motionPlayWait",
                blockType: BlockType.COMMAND,
                text: t("motionPlayWait", "모션 [PAGE] 번 재생하고 끝날 때까지 기다리기"),
                arguments: { PAGE: ARG_NUM(1) }
              },
              {
                opcode: "motionChain",
                blockType: BlockType.COMMAND,
                text: t("motionChain", "모션 [START] 번 시작 → [LOOP] 번 [SECS] 초 동안 반복 → [END] 번 끝"),
                arguments: { START: ARG_NUM(150), LOOP: ARG_NUM(152), SECS: ARG_NUM(5), END: ARG_NUM(154) }
              },
              {
                opcode: "motionStop",
                blockType: BlockType.COMMAND,
                text: t("motionStop", "모션 정지 [HOW]"),
                arguments: { HOW: ARG_STR("unit", "motionStop") }
              },
              {
                opcode: "motionSpeed",
                blockType: BlockType.COMMAND,
                text: t("motionSpeed", "모션 속도를 [PERCENT] % 로 설정"),
                arguments: { PERCENT: ARG_NUM(100) }
              },
              {
                opcode: "motionNext",
                blockType: BlockType.COMMAND,
                text: t("motionNext", "다음 모션 페이지를 [PAGE] 번으로 설정"),
                arguments: { PAGE: ARG_NUM(1) }
              },
              {
                opcode: "motionIsPlaying",
                blockType: BlockType.BOOLEAN,
                text: t("motionIsPlaying", "모션이 재생 중인가?")
              },
              { opcode: "motionCount", blockType: BlockType.REPORTER, text: t("motionCount", "저장된 모션 개수") },
              "---",
              // ---------------- advanced ----------------
              {
                opcode: "rawWrite",
                blockType: BlockType.COMMAND,
                text: t("rawWrite", "장치 [ID] 주소 [ADDR] 에 [SIZE] 바이트 값 [VALUE] 쓰기"),
                arguments: {
                  ID: ARG_NUM(200),
                  ADDR: ARG_NUM(91),
                  SIZE: ARG_NUM(1, "byteSize"),
                  VALUE: ARG_NUM(1)
                }
              },
              {
                opcode: "rawRead",
                blockType: BlockType.REPORTER,
                text: t("rawRead", "장치 [ID] 주소 [ADDR] 의 [SIZE] 바이트 값"),
                arguments: { ID: ARG_NUM(200), ADDR: ARG_NUM(89), SIZE: ARG_NUM(1, "byteSize") }
              }
            ],
            menus: {
              connKind: {
                acceptReporters: false,
                items: [
                  { text: t("menu.usb", "USB"), value: "usb" },
                  { text: t("menu.ble", "블루투스"), value: "ble" }
                ]
              },
              relax: {
                acceptReporters: false,
                items: [
                  { text: t("menu.relaxOff", "힘 빼기 (손으로 움직이기)"), value: "off" },
                  { text: t("menu.relaxOn", "힘 주기 (지금 자세 유지)"), value: "on" }
                ]
              },
              onOff: {
                acceptReporters: true,
                items: [
                  { text: t("menu.on", "켜기"), value: "on" },
                  { text: t("menu.off", "끄기"), value: "off" }
                ]
              },
              // dynamic: detected motors first, labelled with their model ("3 · 2XL430 A축")
              dxlId: { acceptReporters: true, items: "_dxlIdMenu" },
              dxlModule: { acceptReporters: false, items: "_dxlModuleMenu" },
              dxlMode: {
                acceptReporters: false,
                items: [
                  { text: t("menu.modePosition", "위치(관절)"), value: "position" },
                  { text: t("menu.modeVelocity", "바퀴(연속 회전)"), value: "velocity" },
                  { text: t("menu.modeExtended", "확장 위치(다회전)"), value: "extended" }
                ]
              },
              dxlProp: {
                acceptReporters: false,
                items: [
                  { text: t("menu.propPosition", "현재 각도 (°)"), value: "position" },
                  { text: t("menu.propVelocity", "현재 속도 (rpm)"), value: "velocity" },
                  { text: t("menu.propLoad", "부하 (%)"), value: "load" },
                  { text: t("menu.propTemperature", "온도 (°C)"), value: "temperature" },
                  { text: t("menu.propVoltage", "전압 (V)"), value: "voltage" },
                  { text: t("menu.propModel", "모델 번호"), value: "model" },
                  { text: t("menu.propError", "하드웨어 오류"), value: "error" }
                ]
              },
              ledColor: {
                acceptReporters: false,
                items: [
                  { text: t("menu.red", "빨강"), value: "red" },
                  { text: t("menu.green", "초록"), value: "green" },
                  { text: t("menu.blue", "파랑"), value: "blue" }
                ]
              },
              ledMix: {
                acceptReporters: false,
                items: Object.keys(LED_MIX).map((value) => ({ text: t(`menu.mix.${value}`, LED_MIX[value].name), value }))
              },
              note: { acceptReporters: true, items: this._noteMenu() },
              button: {
                acceptReporters: false,
                items: [
                  { text: "START", value: "start" },
                  { text: "MODE", value: "mode" }
                ]
              },
              tiltAxis: {
                acceptReporters: false,
                items: [
                  { text: t("menu.roll", "롤 (좌우)"), value: "roll" },
                  { text: t("menu.pitch", "피치 (앞뒤)"), value: "pitch" },
                  { text: t("menu.yaw", "요 (회전)"), value: "yaw" }
                ]
              },
              xyz: { acceptReporters: false, items: ["x", "y", "z"] },
              port5: { acceptReporters: true, items: ["1", "2", "3", "4", "5"] },
              port2: { acceptReporters: true, items: ["1", "2"] },
              sensor: {
                acceptReporters: false,
                items: [
                  { text: t("menu.ir", "적외선 (IR)"), value: "ir" },
                  { text: t("menu.dms", "거리 (DMS)"), value: "dms" },
                  { text: t("menu.touch", "터치"), value: "touch" },
                  { text: t("menu.brightness", "밝기"), value: "brightness" },
                  { text: t("menu.color", "컬러 (0~6)"), value: "color" },
                  { text: t("menu.temperature", "온도"), value: "temperature" },
                  { text: t("menu.magnet", "자석"), value: "magnet" },
                  { text: t("menu.motion", "인체 감지"), value: "motion" },
                  { text: t("menu.moisture", "습도"), value: "moisture" },
                  { text: t("menu.user", "사용자 장치 (아날로그)"), value: "user" }
                ]
              },
              colorName: {
                acceptReporters: false,
                items: [
                  { text: t("menu.white", "흰색"), value: "white" },
                  { text: t("menu.black", "검정"), value: "black" },
                  { text: t("menu.red", "빨강"), value: "red" },
                  { text: t("menu.green", "초록"), value: "green" },
                  { text: t("menu.blue", "파랑"), value: "blue" },
                  { text: t("menu.yellow", "노랑"), value: "yellow" }
                ]
              },
              ledModule: {
                acceptReporters: false,
                items: [
                  { text: t("menu.ledBoth", "모두 켜기"), value: "both" },
                  { text: t("menu.ledLeft", "왼쪽만"), value: "left" },
                  { text: t("menu.ledRight", "오른쪽만"), value: "right" },
                  { text: t("menu.ledOff", "모두 끄기"), value: "off" }
                ]
              },
              motionStop: {
                acceptReporters: false,
                items: [
                  { text: t("menu.stopUnit", "현재 동작이 끝나면"), value: "unit" },
                  { text: t("menu.stopKeyframe", "현재 키프레임에서"), value: "keyframe" },
                  { text: t("menu.stopNow", "즉시"), value: "now" }
                ]
              },
              byteSize: { acceptReporters: false, items: ["1", "2", "4"] }
            }
          };
        }
        _noteMenu() {
          const names = ["도", "도#", "레", "레#", "미", "파", "파#", "솔", "솔#", "라", "라#", "시"];
          const items = [];
          for (let i = 0; i <= 51; i++) {
            const octave = Math.floor(i / 12) + 1;
            items.push({ text: `${i} (${names[i % 12]}${octave})`, value: String(i) });
          }
          return items;
        }
        // ------------------------------------------------------------------
        // connection
        // ------------------------------------------------------------------
        // Button callbacks (TurboWarp calls these directly; scratch-gui routes
        // the toolbox button through runtime.emit('CM550_CONNECT', kind)).
        connectUsbButton() {
          return this._connect("usb");
        }
        connectBleButton() {
          return this._connect("ble");
        }
        /** @param {'usb'|'ble'|object} kind - see CM550Device.connect */
        async _connect(kind) {
          try {
            await this.device.connect(kind);
            this.device.lastError = "";
          } catch (e) {
            this.device.lastError = e.message || String(e);
          }
          if (this.device.connected) this.device.scanMotors().catch(() => {
          });
        }
        _dxlIdMenu() {
          const desc = this.device.motorDesc;
          const found = this.device.motors.map((m) => ({
            text: `${m.id} · ${desc.labels[m.id] || modelName3(m.model)}`,
            value: String(m.id)
          }));
          const used = new Set(this.device.motors.map((m) => m.id));
          const rest = [];
          for (let id = 1; id <= 30; id++) if (!used.has(id)) rest.push(String(id));
          return found.concat(rest);
        }
        _dxlModuleMenu() {
          const pairs = this.device.motorDesc.pairs;
          const items = pairs.map((p, i) => ({
            text: `모듈 ${i + 1} (ID ${p.a}·${p.b})`,
            value: `${p.a},${p.b}`
          }));
          const used = new Set(items.map((x) => x.value));
          for (let a = 1; a <= 15; a += 2) {
            const value = `${a},${a + 1}`;
            if (!used.has(value)) items.push({ text: `ID ${a}·${a + 1}`, value });
          }
          return items;
        }
        _moduleIds(value) {
          const [a, b] = String(value).split(",").map((x) => num3(x));
          return [a || 1, b || (a || 1) + 1];
        }
        connect(args) {
          return this._connect(args.KIND === "ble" ? "ble" : "usb");
        }
        disconnect() {
          return this.device.disconnect();
        }
        isConnected() {
          return this.device.connected;
        }
        lastError() {
          return this.device.lastError || "";
        }
        async _stopAll() {
          if (!this.device.connected) return;
          try {
            await this.device.stopMotion(MOTION_STOP.NOW);
            for (const id of Object.keys(this.device._modeCache)) {
              if (this.device._modeCache[id] === OP_MODE.VELOCITY) {
                await this.device.writeDXL(Number(id), DXL3.GOAL_VELOCITY, 0);
              }
            }
          } catch (e) {
          }
        }
        /**
         * Run a device action; on failure store the message and resolve quietly.
         * @param fn
         * @param fallback
         */
        async _guard(fn, fallback) {
          if (!this.device.connected) {
            this.device.lastError = t("errNotConnected", "CM-550이 연결되어 있지 않습니다.");
            this._reportError(this.device.lastError);
            return fallback;
          }
          try {
            return await fn();
          } catch (e) {
            this.device.lastError = e.message || String(e);
            this._reportError(this.device.lastError);
            return fallback;
          }
        }
        /** Let the host show block errors (set `onError` to a callback). */
        _reportError(message) {
          if (typeof this.onError === "function") {
            try {
              this.onError(message);
            } catch (e) {
            }
          }
        }
        _onOff(v) {
          if (typeof v === "boolean") return v ? 1 : 0;
          const s = String(v).toLowerCase();
          return s === "on" || s === "1" || s === "true" || s === "켜기" ? 1 : 0;
        }
        // ------------------------------------------------------------------
        // DYNAMIXEL
        // ------------------------------------------------------------------
        dxlTorque(args) {
          const id = num3(args.ID);
          return this._guard(async () => {
            await this.device.writeDXL(id, DXL3.TORQUE_ENABLE, this._onOff(args.ONOFF));
          });
        }
        dxlMoveTo(args) {
          return this._guard(() => this.device.moveTo(num3(args.ID), num3(args.DEG), num3(args.SPEED)));
        }
        dxlMoveToWait(args) {
          const id = num3(args.ID);
          return this._guard(async () => {
            await this.device.moveTo(id, num3(args.DEG), num3(args.SPEED));
            await this.device.waitUntilStopped(id);
          });
        }
        dxlMoveTwo(args) {
          const ids = [num3(args.ID1), num3(args.ID2)];
          const degs = [num3(args.DEG1), num3(args.DEG2)];
          return this._guard(async () => {
            for (const id of ids) {
              await this.device.ensureMode(id, [OP_MODE.POSITION, OP_MODE.EXTENDED_POSITION]);
            }
            await this.device.syncWriteDXL(DXL3.GOAL_POSITION, ids.map((id, i) => ({
              id,
              value: Math.round(degs[i] / 360 * 4096)
            })));
          });
        }
        /**
         * Same start every time (like each try in 걸음 학습): motors with an error are
         * rebooted, all torques go on together, all joints move slowly to 180°.
         */
        dxlPrepare(args) {
          return this._guard(async () => {
            const r = await this.device.prepareJoints(null, {}, clamp(num3(args.SECS), 0.2, 10));
            if (r.rebooted.length && typeof this.onInfo === "function") {
              this.onInfo(`다이나믹셀 ${r.rebooted.join(", ")}: 오류가 있어 다시 시작했습니다.`);
            }
          });
        }
        /**
         * C block: the "목표" blocks inside are collected, then all joints move
         * together so they arrive after SECS seconds; the block waits that long.
         */
        dxlTogether(args, util) {
          const f2 = util.stackFrame;
          if (!this._groups) this._groups = /* @__PURE__ */ new Map();
          if (!f2.dmGroup) {
            f2.dmGroup = true;
            this._groups.set(util.thread, []);
            util.startBranch(1, true);
            return;
          }
          f2.dmGroup = false;
          const items = this._groups.get(util.thread) || [];
          this._groups.delete(util.thread);
          const secs = clamp(num3(args.SECS), 0, 30);
          const t0 = Date.now();
          return this._guard(async () => {
            if (items.length) await this.device.moveTogether(items, secs);
            const left = secs * 1e3 - (Date.now() - t0);
            if (left > 0) await delay4(left);
          });
        }
        /** One joint's target; inside "모두 함께" it waits for the others, alone it moves at once. */
        dxlGoal(args, util) {
          const item = { id: num3(args.ID), deg: num3(args.DEG) };
          const g = this._groups && util && this._groups.get(util.thread);
          if (g) {
            g.push(item);
            return;
          }
          return this._guard(() => this.device.moveTo(item.id, item.deg, 50));
        }
        dxlWheel(args) {
          return this._guard(() => this.device.setWheelSpeed(num3(args.ID), num3(args.SPEED)));
        }
        dxlWheelTwo(args) {
          const ids = [num3(args.ID1), num3(args.ID2)];
          const speeds = [num3(args.SPEED1), num3(args.SPEED2)];
          return this._guard(async () => {
            const items = [];
            for (let i = 0; i < 2; i++) {
              await this.device.setOperatingMode(ids[i], OP_MODE.VELOCITY);
              const limit = await this.device.getVelocityLimit(ids[i]);
              items.push({ id: ids[i], value: limit * clamp(speeds[i], -100, 100) / 100 });
            }
            await this.device.syncWriteDXL(DXL3.GOAL_VELOCITY, items);
          });
        }
        dxlStop(args) {
          const id = num3(args.ID);
          return this._guard(async () => {
            const mode = this.device._modeCache[id];
            if (mode === OP_MODE.VELOCITY) {
              await this.device.writeDXL(id, DXL3.GOAL_VELOCITY, 0);
            } else {
              const pos = await this.device.readDXL(id, DXL3.PRESENT_POSITION);
              await this.device.writeDXL(id, DXL3.GOAL_POSITION, pos);
            }
          });
        }
        dxlSetMode(args) {
          const map = { position: OP_MODE.POSITION, velocity: OP_MODE.VELOCITY, extended: OP_MODE.EXTENDED_POSITION };
          const mode = map[args.MODE] || OP_MODE.POSITION;
          return this._guard(() => this.device.setOperatingMode(num3(args.ID), mode));
        }
        dxlLed(args) {
          return this._guard(() => this.device.writeDXL(num3(args.ID), DXL3.LED, this._onOff(args.ONOFF)));
        }
        dxlAllTorque(args) {
          return this._guard(async () => {
            await this.device.writeCM(CM2.DXL_TORQUE, this._onOff(args.ONOFF) ? 2 : 1);
            await delay4(100);
          });
        }
        dxlRead(args) {
          const id = num3(args.ID);
          return this._guard(async () => {
            switch (args.PROP) {
              case "velocity": {
                const v = await this.device.readDXL(id, DXL3.PRESENT_VELOCITY);
                return Math.round(v * 0.229 * 100) / 100;
              }
              case "load": {
                const v = await this.device.readDXL(id, DXL3.PRESENT_LOAD);
                return v / 10;
              }
              case "temperature":
                return this.device.readDXL(id, DXL3.PRESENT_TEMPERATURE);
              case "voltage": {
                const v = await this.device.readDXL(id, DXL3.PRESENT_INPUT_VOLTAGE);
                return v / 10;
              }
              case "model":
                return this.device.readDXL(id, DXL3.MODEL_NUMBER);
              case "error":
                return this.device.readDXL(id, DXL3.HARDWARE_ERROR);
              case "position":
              default: {
                const v = await this.device.readDXL(id, DXL3.PRESENT_POSITION);
                return Math.round(tickToDeg2(v) * 10) / 10;
              }
            }
          }, 0);
        }
        dxlIsMoving(args) {
          return this._guard(async () => Boolean(await this.device.readDXL(num3(args.ID), DXL3.MOVING)), false);
        }
        dxlScan() {
          return this._guard(async () => {
            const motors = await this.device.scanMotors();
            this._dxlIds = motors.map((m) => m.id);
            return this._dxlIds.join(",");
          }, "");
        }
        dxlModuleMove(args) {
          const [a, b] = this._moduleIds(args.MODULE);
          return this.dxlMoveTwo({ ID1: a, DEG1: args.DEGA, ID2: b, DEG2: args.DEGB });
        }
        dxlModuleWheels(args) {
          const [a, b] = this._moduleIds(args.MODULE);
          return this.dxlWheelTwo({ ID1: a, SPEED1: args.SPA, ID2: b, SPEED2: args.SPB });
        }
        dxlGrip(args) {
          return this._guard(() => this.device.grip(num3(args.ID), num3(args.DEG), num3(args.FORCE)));
        }
        dxlModelName(args) {
          return this._guard(async () => modelName3(await this.device.requireModel(num3(args.ID)).catch(() => this.device._modelCache[num3(args.ID)])), "");
        }
        // ------------------------------------------------------------------
        // Poses (teach by hand). Kept in the project list "로봇 자세".
        // ------------------------------------------------------------------
        /** The pose list on the stage (created on first use when `create`). */
        _poseList(create) {
          const rt = this.runtime;
          const stage = rt && rt.getTargetForStage && rt.getTargetForStage();
          if (!stage) return null;
          let list = stage.lookupVariableById(POSE_LIST_ID) || stage.lookupVariableByNameAndType && stage.lookupVariableByNameAndType(POSE_LIST_NAME, "list");
          if (!list && create) {
            if (typeof this.onCreateList === "function") {
              try {
                this.onCreateList(POSE_LIST_NAME, POSE_LIST_ID);
              } catch (e) {
              }
              list = stage.lookupVariableById(POSE_LIST_ID);
            }
            if (!list) list = stage.lookupOrCreateList(POSE_LIST_ID, POSE_LIST_NAME);
          }
          return list;
        }
        /** @returns {Array<Object<number, number>>} poses 1..n (empty {} for gaps) */
        getPoses() {
          const list = this._poseList(false);
          return list ? list.value.map(decodePose) : [];
        }
        _savePoses(poses) {
          const list = this._poseList(true);
          list.value = poses.map((p) => p && poseSize2(p) ? encodePose(p) : "");
          list._monitorUpToDate = false;
          if (this.runtime.emitProjectChanged) this.runtime.emitProjectChanged();
          if (typeof this.onPosesChange === "function") this.onPosesChange(this.getPoses());
        }
        async _ensureMotors() {
          if (!this.device.motors.length) await this.device.scanMotors();
          if (!this.device.motors.length) throw new Error("다이나믹셀을 찾지 못했습니다. 전원과 케이블을 확인하세요.");
        }
        /** Record the present pose as pose `n` (1-based; 0/empty = append). */
        async recordPose(n) {
          await this._ensureMotors();
          const pose = await this.device.readPose();
          const poses = this.getPoses();
          const index = n >= 1 ? Math.floor(n) - 1 : poses.length;
          if (index > 200) throw new Error("자세 번호는 200번까지 쓸 수 있습니다.");
          while (poses.length < index) poses.push({});
          poses[index] = pose;
          this._savePoses(poses);
          return index + 1;
        }
        async playPose(n, seconds, wait = true) {
          const pose = this.getPoses()[Math.floor(n) - 1];
          if (!pose || !poseSize2(pose)) throw new Error(`${Math.floor(n)}번 자세가 기록되어 있지 않습니다.`);
          const secs = clamp(Number(seconds) || 1, 0.1, 30);
          await this.device.movePose(pose, secs);
          if (wait) await delay4(secs * 1e3 + 100);
        }
        async relaxJoints(ids, on) {
          await this._ensureMotors();
          await this.device.setJointsTorque(ids, on);
        }
        deletePose(n) {
          const poses = this.getPoses();
          poses.splice(Math.floor(n) - 1, 1);
          this._savePoses(poses);
        }
        poseRelax(args) {
          return this._guard(() => this.relaxJoints(null, args.STATE === "on"));
        }
        poseRecord(args) {
          return this._guard(() => this.recordPose(num3(args.N)));
        }
        posePlay(args) {
          return this._guard(() => this.playPose(num3(args.N), num3(args.SECS)));
        }
        posePlayAll(args) {
          return this._guard(async () => {
            const poses = this.getPoses();
            for (let i = 0; i < poses.length; i++) {
              if (poseSize2(poses[i])) await this.playPose(i + 1, num3(args.SECS));
            }
          });
        }
        poseCount() {
          return this.getPoses().filter((p) => poseSize2(p)).length;
        }
        poseClear() {
          if (this._poseList(false)) this._savePoses([]);
        }
        // ------------------------------------------------------------------
        // CM-550 built-ins
        // ------------------------------------------------------------------
        cmLedColor(args) {
          const mix = LED_MIX[args.COLOR] || LED_MIX.off;
          return this._guard(async () => {
            await this.device.writeCM(CM2.LED_RED, mix.rgb[0]);
            await this.device.writeCM(CM2.LED_GREEN, mix.rgb[1]);
            await this.device.writeCM(CM2.LED_BLUE, mix.rgb[2]);
          });
        }
        cmLed(args) {
          const reg = { red: CM2.LED_RED, green: CM2.LED_GREEN, blue: CM2.LED_BLUE }[args.COLOR] || CM2.LED_RED;
          return this._guard(() => this.device.writeCM(reg, this._onOff(args.ONOFF)));
        }
        cmBuzzerNote(args) {
          const secs = clamp(num3(args.SECS), 0.1, 5);
          return this._guard(async () => {
            await this.device.playNote(num3(args.NOTE), secs);
            await delay4(secs * 1e3);
          });
        }
        cmBuzzerMelody(args) {
          return this._guard(() => this.device.playMelody(num3(args.INDEX)));
        }
        cmButton(args) {
          return this._guard(async () => {
            const s = await this.device.readCM(CM2.BUTTON_STATUS);
            return args.BUTTON === "mode" ? s === 2 || s === 3 : s === 1 || s === 3;
          }, false);
        }
        cmTilt(args) {
          const reg = { roll: CM2.ROLL, pitch: CM2.PITCH, yaw: CM2.YAW }[args.AXIS] || CM2.ROLL;
          return this._guard(async () => await this.device.readCM(reg) / 100, 0);
        }
        cmGyro(args) {
          const reg = { x: CM2.GYRO_X, y: CM2.GYRO_Y, z: CM2.GYRO_Z }[String(args.AXIS).toLowerCase()] || CM2.GYRO_X;
          return this._guard(async () => await this.device.readCM(reg) / 100, 0);
        }
        cmAccel(args) {
          const reg = { x: CM2.ACC_X, y: CM2.ACC_Y, z: CM2.ACC_Z }[String(args.AXIS).toLowerCase()] || CM2.ACC_X;
          return this._guard(async () => await this.device.readCM(reg) / 100, 0);
        }
        cmVoltage() {
          return this._guard(async () => await this.device.readCM(CM2.VOLTAGE) / 10, 0);
        }
        cmTemperature() {
          return this._guard(() => this.device.readCM(CM2.TEMPERATURE), 0);
        }
        cmSoundCount() {
          return this._guard(() => this.device.readCM(CM2.SOUND_COUNT), 0);
        }
        cmSoundReset() {
          return this._guard(() => this.device.writeCM(CM2.SOUND_COUNT, 0));
        }
        cmDxlPower(args) {
          return this._guard(() => this.device.writeCM(CM2.DXL_POWER, this._onOff(args.ONOFF)));
        }
        // ------------------------------------------------------------------
        // 5-pin ports
        // ------------------------------------------------------------------
        portSensor(args) {
          const spec = {
            ir: PORT2.IR,
            dms: PORT2.DMS,
            touch: PORT2.TOUCH,
            brightness: PORT2.BRIGHTNESS,
            color: PORT2.COLOR,
            temperature: PORT2.TEMPERATURE,
            magnet: PORT2.MAGNET,
            motion: PORT2.MOTION,
            moisture: PORT2.MOISTURE,
            user: PORT2.USER
          }[args.SENSOR] || PORT2.IR;
          return this._guard(() => this.device.readPort(spec, num3(args.PORT)), 0);
        }
        portTouch(args) {
          return this._guard(async () => Boolean(await this.device.readPort(PORT2.TOUCH, num3(args.PORT))), false);
        }
        portColor(args) {
          const idx = { white: 1, black: 2, red: 3, green: 4, blue: 5, yellow: 6 }[args.COLOR] || 0;
          return this._guard(async () => await this.device.readPort(PORT2.COLOR, num3(args.PORT)) === idx, false);
        }
        portLed(args) {
          const v = { off: 0, right: 1, left: 2, both: 3 }[args.STATE];
          return this._guard(() => this.device.writePort(PORT2.LED, num3(args.PORT), typeof v === "number" ? v : 3));
        }
        portServo(args) {
          const deg2 = clamp(num3(args.DEG), 0, 300);
          const value = Math.round(deg2 / 300 * 1023);
          return this._guard(() => this.device.writePort(PORT2.SERVO_POSITION, num3(args.PORT), value));
        }
        portMotor(args) {
          const pct = clamp(num3(args.SPEED), -100, 100);
          const mag = Math.round(Math.abs(pct) / 100 * 1023);
          const value = pct >= 0 ? 1024 + mag : mag;
          return this._guard(() => this.device.writePort(PORT2.WHEEL, num3(args.PORT), value));
        }
        // ------------------------------------------------------------------
        // motion
        // ------------------------------------------------------------------
        motionPlay(args) {
          return this._guard(() => this.device.playMotion(num3(args.PAGE)));
        }
        /** Pages one after another without stopping (MAX-E1: 150 → 152 … → 154 walks forward). */
        motionChain(args) {
          return this._guard(() => this.device.playMotionChain(
            num3(args.START),
            num3(args.LOOP),
            clamp(num3(args.SECS), 0, 600),
            num3(args.END),
            { seconds: true }
          ));
        }
        motionPlayWait(args) {
          return this._guard(async () => {
            await this.device.playMotion(num3(args.PAGE));
            await this.device.waitMotionDone();
          });
        }
        motionStop(args) {
          const how = { now: MOTION_STOP.NOW, keyframe: MOTION_STOP.KEYFRAME, unit: MOTION_STOP.UNIT }[args.HOW] || MOTION_STOP.UNIT;
          return this._guard(() => this.device.stopMotion(how));
        }
        motionSpeed(args) {
          return this._guard(() => this.device.writeCM(CM2.MOTION_SPEED, clamp(num3(args.PERCENT), 20, 200)));
        }
        motionNext(args) {
          return this._guard(() => this.device.writeCM(CM2.MOTION_NEXT_PAGE, clamp(num3(args.PAGE), 0, 65535)));
        }
        motionIsPlaying() {
          return this._guard(async () => Boolean(await this.device.readCM(CM2.MOTION_STATUS)), false);
        }
        motionCount() {
          return this._guard(() => this.device.readCM(CM2.MOTION_COUNT), 0);
        }
        // ------------------------------------------------------------------
        // advanced
        // ------------------------------------------------------------------
        rawWrite(args) {
          const size = [1, 2, 4].includes(num3(args.SIZE)) ? num3(args.SIZE) : 1;
          return this._guard(() => this.device.write(num3(args.ID), num3(args.ADDR), num3(args.VALUE), size));
        }
        rawRead(args) {
          const size = [1, 2, 4].includes(num3(args.SIZE)) ? num3(args.SIZE) : 1;
          return this._guard(() => this.device.read(num3(args.ID), num3(args.ADDR), size, true), 0);
        }
      }
      return Scratch3CM550Blocks;
    };
    module.exports = { createExtension: createExtension2, EXTENSION_ID };
  }
});

// src/sim3d/maxe1-motions.json
var maxe1_motions_default;
var init_maxe1_motions = __esm({
  "src/sim3d/maxe1-motions.json"() {
    maxe1_motions_default = { source: "ROBOTIS ENGINEER Kit 1 MAX-E1 example motion file (03_ENG1_MAX_E1_KR.mtn3), (c) ROBOTIS", frameSeconds: 78125e-7, ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], pages: { "101H_기본동작": [[128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], "102H_숨쉬기1": [[256, 4, -7, -4, -7, 0, -12.4, 0, -12.4, -12.4, 0, -12.4, 0], [512, -2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0]], "103H_숨쉬기2": [[231, -2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0], [359, -24, 7, -14, -11, 0, -38.83, -3.94, -27.13, -27.41, 0, -38.51, -3.94], [434, 14, -11, 24, 7, 3.69, -17.43, 0, -28.2, -27.79, 3.69, -17.81, 0], [524, -9, -3, -4, -11, -7.34, -21.97, -7.34, -26.53, -21.97, -7.34, -16.26, -7.34], [575, -4, -8, 6, -1, -7.34, -21.97, -12.75, -32.42, -21.97, -12.34, -28.68, -17.75], [677, -2, 0, 2, 0, 0, -23.56, 0, -23.56, -23.56, 0, -23.56, 0]], "104H_숨쉬기3": [[128, -2, 0, 2, 0, 0, -23.56, 0, -23.56, -23.56, 0, -23.56, 0], [256, -35, 0, 35, 0, 0, 0, 0, 0, -25, 0, -25, 0], [333, -5, 0, 5, 0, 0, -30.96, 0, -30.96, -15.92, 0, -15.92, 0], [526, 15, -9, -15, -9, 0, -35, 0, -35, 0, 0, 0, 0], [654, 0, 0, 0, 0, 0, -23.56, 0, -23.56, -23.56, 0, -23.56, 0]], "105H_일어서기F": [[64, 15, 80, -15, 80, 50, 0, -50, 0, 0, 50, 0, -50], [88, 90, 80, -90, 80, 80, 0, -80, 0, 0, 80, 0, -80], [114, 90, 80, -90, 80, 80, 0, -80, 0, 0, 80, 0, -80], [129, 65, 0, -65, 0, 80, -30, -80, -30, -40, 90, -40, -90], [167, 45, -20, -45, -20, 80, -74, -80, -74, -74, 90, -74, -90], [180, 40, 90, -40, 90, 40, -64, -40, -64, -64, 30, -64, -30], [193, 40, 90, -40, 90, 40.63, -56.23, -16.97, -73.97, -56.23, 50.63, -73.97, -6.97], [231, 0, 0, 0, 0, 26, -58.91, 6.46, -60.51, -58.91, 26, -60.51, 6.46], [269, 0, 0, 0, 0, 0, -41.41, 0, -41.41, -41.41, 0, -41.41, 0], [307, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], "106H_일어서기B": [[103, 45, 90, -45, 90, 45, 0, -45, 0, 0, 45, 0, -45], [129, -60, 90, 60, 90, 70, -50, -70, -50, -50, 70, -50, -70], [232, -60, -20, 60, -20, 80, -60.47, -80, -60.47, -60.47, 80, -60.47, -80], [283, -30, -20, 30, -20, 80, -64, -80, -64, -64, 90, -64, -90], [359, -60, 90, 60, 90, 40, -64, -40, -64, -64, 30, -64, -30], [411, 0, 0, 0, 0, 10, -64, -10, -60, -64, 10, -60, -10], [448, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], "107H_앉기": [[128, 0, 0, 0, 0, 0, -70, 0, -70, -70, 0, -70, 0]], "108H_인사": [[64, 0, 0, 0, 0, 0, -10, 0, -10, -10, 0, -10, 0], [90, 27.39, 7.41, 0, 0, 0, -10, 0, -10, -10, 0, -10, 0], [116, 55.11, 15.15, 0, 0, 0, -10, 0, -10, -10, 0, -10, 0], [142, 82.5, 22.56, 0, 0, 0, -10, 0, -10, -10, 0, -10, 0], [168, 109.89, 29.97, 0, 0, 0, -10, 0, -10, -10, 0, -10, 0], [232, 109.89, -19.98, -4, -4, 5, -14, 4, -14, -14, 5, -14, 4], [296, 109.89, 29.97, 0, 0, -4, -10, -4, -10, -10, -4, -10, -4], [360, 109.89, -19.98, 4, 4, 4, -14, 4, -14, -14, 4, -14, 4], [424, 109.89, 29.97, 0, 0, 0, -10, 0, -10, -10, 0, -10, 0], [487, 4, -7, -4, -7, 0, -12.4, 0, -12.4, -12.4, 0, -12.4, 0]], "109H_브라보": [[128, 0, 0, 0, 0, 0, -10, 0, -10, -10, 0, -10, 0], [256, 170, 80, -170, 80, 0, -41.41, 0, -41.41, -41.41, 0, -41.41, 0], [384, 170, 30, -170, 30, 0, 0, 0, 0, 0, 0, 0, 0], [512, 170, 80, -170, 80, 0, -41.41, 0, -41.41, -41.41, 0, -41.41, 0], [640, 170, 30, -170, 30, 0, 0, 0, 0, 0, 0, 0, 0], [768, 0, 0, 0, 0, 0, -10, 0, -10, -10, 0, -10, 0]], "110H_팔굽혀펴기_시작": [[64, 20, 0, -20, 0, 9.97, -38.17, 9.18, -33.9, -67.27, 19.97, -59.55, 9.18], [128, 23, 3, 7, 32, 9.97, -63.01, 5.5, -1.66, -44.06, 29.97, -90.85, 25.5], [166, 69, -32, -30, 36, 9.18, -67.29, 8.5, 10.53, -18.07, 29.18, -59.33, 48.5], [230, 80, 0, -80, 0, 13.69, 0, -10.34, 0, 0, 13.69, 0, -10.34], [358, 80, 0, -80, 0, 10, -10.99, -10, -10.99, -31.6, 10, -31.6, -10]], "111H_팔굽혀펴기_반복": [[128, 100, 0, -100, 0, 10, -53.56, -10, -53.56, -43.56, 10, -43.56, -10], [256, 80, 0, -80, 0, 10, 0, -10, 0, 0, 10, 0, -10]], "112H_팔굽혀펴기_끝": [[128, 60, 0, -60, 0, 10, 10, -10, 10, -32.72, 10, -32.72, -10], [192, 60, 0, -60, 0, 49.61, -11.97, -50, 0, 0, 50, 0, -50], [230, 30, -20, -30, -20, 80, -74, -80, -74, -74, 90, -74, -90], [243, 40, 90, -40, 90, 40, -64, -40, -64, -64, 30, -64, -30], [256, 40, 90, -40, 90, 40.63, -56.23, -16.97, -73.97, -56.23, 50.63, -73.97, -6.97], [294, 0, 0, 0, 0, 26, -58.91, 6.46, -60.51, -58.91, 26, -60.51, 6.46], [332, 0, 0, 0, 0, 0, -41.41, 0, -41.41, -41.41, 0, -41.41, 0], [384, 4, -7, -4, -7, 0, -12.4, 0, -12.4, -12.4, 0, -12.4, 0]], "113H_물구나무": [[178, 49.95, 39.96, -49.95, 39.96, 13.54, -37.06, -13.54, -37.06, -48.98, 13.54, -48.98, -13.54], [306, -0.18, 65.1, 0.18, 65.1, 13.54, -72.19, -13.54, -72.19, 10.96, 13.54, 10.96, -13.54], [434, 8.82, 59.96, -8.82, 59.96, 63.49, -72.19, -63.49, -72.19, 10.96, 13.54, 10.96, -13.54], [562, 24.79, 51.96, -24.79, 51.96, 88.62, -72.19, -88.62, -72.19, 10.96, -21.59, 10.96, 21.59], [690, 44.79, 59.96, -44.79, 59.96, 88.62, 9.81, -88.62, 9.81, -74, -6.45, -74, 6.45], [818, 74.77, 49.96, -74.77, 49.96, 18.37, -72.19, -18.37, -72.19, -59.94, -6.45, -59.94, 6.45], [946, 74.77, 39.96, -74.77, 39.96, 10, 10, -10, 10, -10, 10, -10, -10], [1074, 74.77, 39.96, -74.77, 39.96, 0, 10, 0, 10, -30, 0, -30, 0], [1202, 34.77, 39.96, -34.77, 39.96, 40, 10, -40, 10, -70, 30, -70, -30], [1330, -5.23, 39.96, 5.23, 39.96, 40, 10, -40, 10, -70, 40, -70, -40], [1458, 84.77, 89.96, -84.77, 89.96, 40, 10, -40, 10, -30, 0, -30, 0], [1586, 114.77, 29.96, -114.77, 29.96, 40, 10, -40, 10, -50, 0, -50, 0], [1640, 65, 0, -65, 0, 80, -30, -80, -30, -40, 90, -40, -90], [1678, 45, -20, -45, -20, 80, -74, -80, -74, -74, 90, -74, -90], [1691, 40, 90, -40, 90, 40, -64, -40, -64, -64, 30, -64, -30], [1704, 40, 90, -40, 90, 40.63, -56.23, -16.97, -73.97, -56.23, 50.63, -73.97, -6.97], [1742, 0, 0, 0, 0, 26, -58.91, 6.46, -60.51, -58.91, 26, -60.51, 6.46], [1780, 0, 0, 0, 0, 0, -41.41, 0, -41.41, -41.41, 0, -41.41, 0], [1818, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], "120H_축구_왼발킥": [[64, -20.64, -8.26, -20.64, -8.26, -4.89, -29.11, -4.89, -29.11, -36.7, -6.98, -36.7, -4.89], [70, -16.32, -6.58, -16.32, -6.58, -1.89, -28.43, -1.89, -28.43, -37.95, -5.99, -37.95, -1.89], [76, -12.06, -5, -12.06, -5, -2.76, -27.28, -2.76, -27.28, -38.68, -8.76, -38.68, -2.76], [82, -7.9, -3.57, -7.9, -3.57, -3.55, -26.09, -3.55, -26.09, -39.36, -11.26, -39.36, -3.55], [88, -3.87, -2.34, -3.87, -2.34, -4.22, -24.87, -4.22, -24.87, -40, -13.42, -40, -4.22], [94, 0, -1.34, 0, -1.34, -4.77, -23.64, -4.77, -23.64, -40.62, -15.17, -40.62, -4.77], [100, 3.68, -0.6, 3.68, -0.6, -5.18, -22.41, -5.47, -32.19, -41.23, -16.45, -45.46, -5.47], [106, 7.14, -0.15, 7.14, -0.15, -5.42, -21.18, -6.04, -40.97, -41.83, -17.24, -47.64, -6.04], [112, 10.36, 0, 10.36, 0, -5.51, -19.97, -6.44, -49.94, -42.44, -17.51, -46.95, -6.44], [118, 13.3, -0.15, 13.3, -0.15, -5.42, -18.76, -6.45, -62.97, -43.06, -17.24, -23.48, -6.45], [124, 15.96, -0.6, 15.96, -0.6, -5.18, -17.56, -6.46, -76, -43.68, -16.45, 0, -6.46], [205, 15.96, -0.6, 15.96, -0.6, -5.18, -17.56, -6.46, -76, -43.68, -16.45, 0, -6.46], [211, 13.3, -0.15, 13.3, -0.15, -5.42, -18.76, -6.45, -62.97, -43.06, -17.24, -23.48, -6.45], [217, 10.36, 0, 10.36, 0, -5.51, -19.97, -6.44, -49.94, -42.44, -17.51, -46.95, -6.44], [223, 7.14, -0.15, 7.14, -0.15, -5.42, -21.18, -6.04, -40.97, -41.83, -17.24, -47.64, -6.04], [229, 3.68, -0.6, 3.68, -0.6, -5.18, -22.41, -5.47, -32.19, -41.23, -16.45, -45.46, -5.47], [235, 0, -1.34, 0, -1.34, -4.77, -23.64, -4.77, -23.64, -40.62, -15.17, -40.62, -4.77], [241, -3.87, -2.34, -3.87, -2.34, -4.22, -24.87, -4.22, -24.87, -40, -13.42, -40, -4.22], [247, -7.9, -3.57, -7.9, -3.57, -3.55, -26.09, -3.55, -26.09, -39.36, -11.26, -39.36, -3.55], [375, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], "121H_축구_오른발킥": [[64, 20.64, -8.26, 20.64, -8.26, 4.89, -29.11, 4.89, -29.11, -36.7, 4.89, -36.7, 6.98], [70, 16.32, -6.58, 16.32, -6.58, 1.89, -28.43, 1.89, -28.43, -37.95, 1.89, -37.95, 5.99], [76, 12.06, -5, 12.06, -5, 2.76, -27.28, 2.76, -27.28, -38.68, 2.76, -38.68, 8.76], [82, 7.9, -3.57, 7.9, -3.57, 3.55, -26.09, 3.55, -26.09, -39.36, 3.55, -39.36, 11.26], [88, 3.87, -2.34, 3.87, -2.34, 4.22, -24.87, 4.22, -24.87, -40, 4.22, -40, 13.42], [94, 0, -1.34, 0, -1.34, 4.77, -23.64, 4.77, -23.64, -40.62, 4.77, -40.62, 15.17], [100, -3.68, -0.6, -3.68, -0.6, 5.47, -32.19, 5.18, -22.41, -45.46, 5.47, -41.23, 16.45], [106, -7.14, -0.15, -7.14, -0.15, 6.04, -40.97, 5.42, -21.18, -47.64, 6.04, -41.83, 17.24], [112, -10.36, 0, -10.36, 0, 6.44, -49.94, 5.51, -19.97, -46.95, 6.44, -42.44, 17.51], [118, -13.3, -0.15, -13.3, -0.15, 6.45, -62.97, 5.42, -18.76, -23.48, 6.45, -43.06, 17.24], [124, -15.96, -0.6, -15.96, -0.6, 6.46, -76, 5.18, -17.56, 0, 6.46, -43.68, 16.45], [205, -15.96, -0.6, -15.96, -0.6, 6.46, -76, 5.18, -17.56, 0, 6.46, -43.68, 16.45], [211, -13.3, -0.15, -13.3, -0.15, 6.45, -62.97, 5.42, -18.76, -23.48, 6.45, -43.06, 17.24], [217, -10.36, 0, -10.36, 0, 6.44, -49.94, 5.51, -19.97, -46.95, 6.44, -42.44, 17.51], [223, -7.14, -0.15, -7.14, -0.15, 6.04, -40.97, 5.42, -21.18, -47.64, 6.04, -41.83, 17.24], [229, -3.68, -0.6, -3.68, -0.6, 5.47, -32.19, 5.18, -22.41, -45.46, 5.47, -41.23, 16.45], [235, 0, -1.34, 0, -1.34, 4.77, -23.64, 4.77, -23.64, -40.62, 4.77, -40.62, 15.17], [241, 3.87, -2.34, 3.87, -2.34, 4.22, -24.87, 4.22, -24.87, -40, 4.22, -40, 13.42], [247, 7.9, -3.57, 7.9, -3.57, 3.55, -26.09, 3.55, -26.09, -39.36, 3.55, -39.36, 11.26], [375, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], "122H_축구_왼쪽막기": [[64, -17, 18.5, 6, 20, -2.85, -46.06, -8.96, -68.02, -72.7, 7.15, -68.02, 1.04], [102, -34, 37, 12, 40, 7.27, -6.42, -15.92, -57.66, -36.05, 27.27, -57.66, 4.08], [230, -39, 41, 5, 38, 10.94, -4.5, -10.76, -58.96, -33.73, 30.94, -58.96, 9.24], [358, -17, 18.5, 6, 20, -2.85, -46.06, -8.96, -68.02, -72.7, 7.15, -68.02, 1.04], [486, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], "123H_축구_오른쪽막기": [[64, -6, 20, 17, 18.5, 8.96, -68.02, 2.85, -46.06, -68.02, -1.04, -72.7, -7.15], [102, -12, 40, 34, 37, 15.92, -57.66, -7.27, -6.42, -57.66, -4.08, -36.05, -27.27], [230, -5, 38, 39, 41, 10.76, -58.96, -10.94, -4.5, -58.96, -9.24, -33.73, -30.94], [358, -6, 20, 17, 18.5, 8.96, -68.02, 2.85, -46.06, -68.02, -1.04, -72.7, -7.15], [486, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], "130H_좌측공격": [[15, -1.43, -10, -1.43, -10, -0.15, -20.82, 0.15, -20.82, -26.02, -0.15, -26.02, 0.15], [77, -1.92, -7.48, -1.92, -7.48, 8.01, -28.07, -18.52, -15.98, -29.56, -2.07, -17.47, -7.52], [102, -2.12, -6.46, -2.12, -6.46, 11.3, -30.99, -26.05, -14.03, -30.99, -2.84, -14.03, -26.05], [119, 0, 15.76, 0, 70, 25.79, -21.65, -17.84, -32.35, -2.04, 25.79, -32.35, -19.84], [179, 0, 15.76, 0, 70, 25.79, -21.65, -17.84, -32.35, -2.04, 25.79, -32.35, -19.84], [206, -1.92, -7.48, -1.92, -7.48, 8.01, -28.07, -18.52, -15.98, -29.56, -2.07, -17.47, -21.52], [236, -1.43, -10, -1.43, -10, -0.15, -20.82, 0.15, -20.82, -26.02, -0.15, -26.02, 0.15]], "131H_우측공격": [[15, -1.43, -10, -1.43, -10, -0.15, -20.82, 0.15, -20.82, -26.02, -0.15, -26.02, 0.15], [77, 1.13, -7.45, 1.13, -2.79, 18.74, -15.92, -8.11, -28.15, -17.38, 34.74, -29.6, 2.09], [101, 2.12, -6.46, 2.12, 0, 26.05, -14.03, -11.3, -30.99, -14.03, 26.05, -30.99, 2.84], [119, 0, 70, 0, 7.47, 17.84, -32.35, -25.79, -21.65, -32.35, 17.84, -2.04, -25.79], [179, 0, 70, 0, 7.47, 17.84, -32.35, -25.79, -21.65, -32.35, 17.84, -2.04, -25.79], [206, 1.13, -7.45, 1.13, -2.79, 18.74, -15.92, -8.11, -28.15, -17.38, 34.74, -29.6, 2.09], [236, -1.43, -10, -1.43, -10, -0.15, -20.82, 0.15, -20.82, -26.02, -0.15, -26.02, 0.15]], "132H_좌이동": [[16, 5, 0, 5, 5, 0, -20, -8, -20, -20, -8, -20, -8], [38, 7.12, 6.36, 9.24, 9.24, 5, -35, -20, -20, -35, -4, -20, -25], [77, 10, 15, 15, 15, 15, -15, -5, -35, -15, 25, -35, 5], [99, 5, 0, 7.5, 0, 0, -20, 0, -20, -20, 10, -20, 5], [112, 0, 0, 0, 0, 0, -20, 0, -20, -20, 0, -20, 0]], "133H_우이동": [[16, -5, 5, -5, 0, 8, -20, 0, -20, -20, 8, -20, 8], [38, -9.24, 9.24, -7.12, 6.36, 20, -20, -5, -35, -20, 25, -35, 4], [77, -15, 15, -10, 15, 5, -35, -15, -15, -35, -5, -15, -25], [99, -7.5, 0, -5, 0, 0, -20, 0, -20, -20, -5, -20, -10], [112, 0, 0, 0, 0, 0, -20, 0, -20, -20, 0, -20, 0]], "134H_빠른좌이동": [[9, 0, 0, 0, 0, 20, -10, -10, -20, -10, -5, -20, -15], [19, 0, 0, 0, 0, 20, -10, -10, -20, -10, -5, -20, 0], [32, 0, 0, 0, 0, 0, -20, 0, -20, -20, 0, -20, 0], [38, 0, 0, 0, 0, 0, -20, 0, -20, -20, 0, -20, 0]], "135H_빠른우이동": [[9, 0, 0, 0, 0, 10, -20, -20, -10, -20, 15, -10, 5], [19, 0, 0, 0, 0, 10, -20, -20, -10, -20, 0, -10, 5], [32, 0, 0, 0, 0, 0, -20, 0, -20, -20, 0, -20, 0], [38, 0, 0, 0, 0, 0, -20, 0, -20, -20, 0, -20, 0]], "136H_대각전진(좌)": [[64, 0, -10, 0, -10, -0.76, -19.14, -0.76, -19.14, -27.27, -2, -27.27, -0.76], [70, 0, -10, 0, -10, -1.41, -17.36, -1.41, -17.36, -28.4, -3.76, -28.4, -1.41], [76, 0, -10, 0, -10, -1.85, -15.49, -1.85, -15.49, -29.43, -5.09, -29.43, -1.85], [82, 0, -10, 0, -10, -2, -13.55, -2, -13.55, -30.37, -5.8, -30.37, -2], [88, 0, -10, 0, -10, -1.62, -11.58, -4.4, -37.3, -31.27, -5.42, -55.3, -2.98], [94, 0, -10, 0, -10, -1.24, -9.51, -8.07, -55.95, -32.04, -5.04, -51.86, -6.07], [100, 0, -10, 0, -10, -0.86, -7.33, -9.79, -58.23, -32.67, -4.66, -30.88, -8.38], [106, 0, -10, 0, -10, -0.48, -5.02, -8, -30.77, -33.15, -4.29, -1.78, -8], [112, 0, -10, 0, -10, 2.27, -2.42, -5.29, -31.9, -33.25, 1.03, -5.45, -5.29], [118, 0, -10, 0, -10, 3.78, 0.52, -3.78, -31.89, -32.96, 3.78, -8.15, -3.78], [124, 0, -10, 0, -10, 5.29, 3.91, -2.27, -31.53, -32.14, 5.29, -10.57, -1.03], [130, 0, -10, 0, -10, 6.69, 7.92, -0.86, -30.88, -30.62, 6.69, -12.75, 1.49], [136, 0, -10, 0, -10, 7.86, 13.08, 0.34, -29.98, -27.89, 7.86, -14.72, 3.57], [142, 0, -10, 0, -10, 8.75, 21.69, 1.24, -28.91, -21.69, 8.75, -16.55, 5.04], [148, 0, -10, 0, -10, 11.54, -12.79, 1.62, -27.75, -65.15, 10.13, -18.3, 5.42], [154, 0, -10, 0, -10, 10.41, -31.05, 2, -26.49, -70.68, 8.41, -19.97, 5.8], [160, 0, -10, 0, -10, 6.19, -40.99, 2.37, -25.13, -52.09, 4.77, -21.53, 6.18], [166, 0, -10, 0, -10, 2.75, -23.67, 2.75, -23.67, -23.01, 2.75, -23.01, 6.56], [172, 0, -10, 0, -10, 0.76, -22.38, 0.76, -22.38, -24.65, 0.76, -24.65, 2], [178, 0, -10, 0, -10, 0, -20.82, 0, -20.82, -26.02, 0, -26.02, 0]], "137H_대각전진(우)": [[64, 0, -10, 0, -10, 0.76, -19.14, 0.76, -19.14, -27.27, 0.76, -27.27, 2], [70, 0, -10, 0, -10, 1.41, -17.36, 1.41, -17.36, -28.4, 1.41, -28.4, 3.76], [76, 0, -10, 0, -10, 1.85, -15.49, 1.85, -15.49, -29.43, 1.85, -29.43, 5.09], [82, 0, -10, 0, -10, 2, -13.55, 2, -13.55, -30.37, 2, -30.37, 5.8], [88, 0, -10, 0, -10, 4.4, -37.3, 1.62, -11.58, -55.3, 2.98, -31.27, 5.42], [94, 0, -10, 0, -10, 8.07, -55.95, 1.24, -9.51, -51.86, 6.07, -32.04, 5.04], [100, 0, -10, 0, -10, 9.79, -58.23, 0.86, -7.33, -30.88, 8.38, -32.67, 4.66], [106, 0, -10, 0, -10, 8, -30.77, 0.48, -5.02, -1.78, 8, -33.15, 4.29], [112, 0, -10, 0, -10, 5.29, -31.9, -2.27, -2.42, -5.45, 5.29, -33.25, -1.03], [118, 0, -10, 0, -10, 3.78, -31.89, -3.78, 0.52, -8.15, 3.78, -32.96, -3.78], [124, 0, -10, 0, -10, 2.27, -31.53, -5.29, 3.91, -10.57, 1.03, -32.14, -5.29], [130, 0, -10, 0, -10, 0.86, -30.88, -6.69, 7.92, -12.75, -1.49, -30.62, -6.69], [136, 0, -10, 0, -10, -0.34, -29.98, -7.86, 13.08, -14.72, -3.57, -27.89, -7.86], [142, 0, -10, 0, -10, -1.24, -28.91, -8.75, 21.69, -16.55, -5.04, -21.69, -8.75], [148, 0, -10, 0, -10, -1.62, -27.75, -11.54, -12.79, -18.3, -5.42, -65.15, -10.13], [154, 0, -10, 0, -10, -2, -26.49, -10.41, -31.05, -19.97, -5.8, -70.68, -8.41], [160, 0, -10, 0, -10, -2.37, -25.13, -6.19, -40.99, -21.53, -6.18, -52.09, -4.77], [166, 0, -10, 0, -10, -2.75, -23.67, -2.75, -23.67, -23.01, -6.56, -23.01, -2.75], [172, 0, -10, 0, -10, -0.76, -22.38, -0.76, -22.38, -24.65, -2, -24.65, -0.76], [178, 0, -10, 0, -10, 0, -20.82, 0, -20.82, -26.02, 0, -26.02, 0]], "138H_대각후진(좌)": [[64, 0, -10, 0, -10, -0.64, -24.74, -0.64, -24.74, -22.29, -1.93, -22.29, -0.64], [70, 0, -10, 0, -10, -1.21, -25.84, -1.21, -25.84, -20.95, -3.71, -20.95, -1.21], [76, 0, -10, 0, -10, -1.66, -26.87, -1.66, -26.87, -19.54, -5.2, -19.54, -1.66], [82, 0, -10, 0, -10, -1.93, -27.84, -1.93, -27.84, -18.09, -6.26, -18.09, -1.93], [88, 0, -10, 0, -10, -1.99, -28.77, -1.99, -28.77, -16.59, -6.82, -16.59, -1.99], [94, 0, -10, 0, -10, -1.8, -29.66, -1.8, -29.66, -15.07, -6.8, -15.07, -1.8], [100, 0, -10, 0, -10, -1.36, -30.49, -1.36, -30.49, -13.5, -6.19, -13.5, -1.36], [106, 0, -10, 0, -10, -0.67, -31.25, -0.67, -31.25, -11.86, -5, -11.86, -0.67], [112, 0, -10, 0, -10, 0.23, -31.9, -4.72, -40.94, -10.14, -3.31, -43.27, -3.3], [118, 0, -10, 0, -10, 1.31, -32.39, -6.11, -39.73, -8.29, -1.19, -55.27, -4.11], [124, 0, -10, 0, -10, 2.52, -32.67, -5.08, -30.54, -6.26, 1.22, -51.46, -3.66], [130, 0, -10, 0, -10, 3.78, -32.7, -3.78, -4.04, -4.04, 3.78, -32.7, -3.78], [136, 0, -10, 0, -10, 5.05, -32.46, -2.52, -6.26, -1.59, 5.05, -32.67, -1.22], [142, 0, -10, 0, -10, 6.24, -31.9, -1.31, -8.29, 1.13, 6.24, -32.39, 1.19], [148, 0, -10, 0, -10, 7.31, -31.01, -0.23, -10.14, 4.14, 7.31, -31.9, 3.31], [154, 0, -10, 0, -10, 8.19, -29.7, 0.67, -11.86, 7.53, 8.19, -31.25, 5], [160, 0, -10, 0, -10, 8.86, -27.79, 1.36, -13.5, 11.5, 8.86, -30.49, 6.19], [166, 0, -10, 0, -10, 9.29, -24.17, 1.8, -15.07, 17.17, 9.29, -29.66, 6.8], [172, 0, -10, 0, -10, 9.48, -21.7, 1.99, -16.59, 21.7, 9.48, -28.77, 6.82], [178, 0, -10, 0, -10, 9.42, -22.74, 1.93, -18.09, 22.74, 9.42, -27.84, 6.26], [184, 0, -10, 0, -10, 8.51, -55.1, 1.66, -19.54, -22.36, 7.09, -26.87, 5.2], [190, 0, -10, 0, -10, 7.14, -58.76, 1.21, -20.95, -34.6, 5.14, -25.84, 3.71], [196, 0, -10, 0, -10, 4.35, -49.12, 0.64, -22.29, -34.08, 2.93, -24.74, 1.93], [202, 0, -10, 0, -10, 0, -23.56, 0, -23.56, -23.56, 0, -23.56, 0]], "139H_대각후진(우)": [[64, 0, -10, 0, -10, 0.64, -24.74, 0.64, -24.74, -22.29, 0.64, -22.29, 1.93], [70, 0, -10, 0, -10, 1.21, -25.84, 1.21, -25.84, -20.95, 1.21, -20.95, 3.71], [76, 0, -10, 0, -10, 1.66, -26.87, 1.66, -26.87, -19.54, 1.66, -19.54, 5.2], [82, 0, -10, 0, -10, 1.93, -27.84, 1.93, -27.84, -18.09, 1.93, -18.09, 6.26], [88, 0, -10, 0, -10, 1.99, -28.77, 1.99, -28.77, -16.59, 1.99, -16.59, 6.82], [94, 0, -10, 0, -10, 1.8, -29.66, 1.8, -29.66, -15.07, 1.8, -15.07, 6.8], [100, 0, -10, 0, -10, 1.36, -30.49, 1.36, -30.49, -13.5, 1.36, -13.5, 6.19], [106, 0, -10, 0, -10, 0.67, -31.25, 0.67, -31.25, -11.86, 0.67, -11.86, 5], [112, 0, -10, 0, -10, 4.72, -40.94, -0.23, -31.9, -43.27, 3.3, -10.14, 3.31], [118, 0, -10, 0, -10, 6.11, -39.73, -1.31, -32.39, -55.27, 4.11, -8.29, 1.19], [124, 0, -10, 0, -10, 5.08, -30.54, -2.52, -32.67, -51.46, 3.66, -6.26, -1.22], [130, 0, -10, 0, -10, 3.78, -4.04, -3.78, -32.7, -32.7, 3.78, -4.04, -3.78], [136, 0, -10, 0, -10, 2.52, -6.26, -5.05, -32.46, -32.67, 1.22, -1.59, -5.05], [142, 0, -10, 0, -10, 1.31, -8.29, -6.24, -31.9, -32.39, -1.19, 1.13, -6.24], [148, 0, -10, 0, -10, 0.23, -10.14, -7.31, -31.01, -31.9, -3.31, 4.14, -7.31], [154, 0, -10, 0, -10, -0.67, -11.86, -8.19, -29.7, -31.25, -5, 7.53, -8.19], [160, 0, -10, 0, -10, -1.36, -13.5, -8.86, -27.79, -30.49, -6.19, 11.5, -8.86], [166, 0, -10, 0, -10, -1.8, -15.07, -9.29, -24.17, -29.66, -6.8, 17.17, -9.29], [172, 0, -10, 0, -10, -1.99, -16.59, -9.48, -21.7, -28.77, -6.82, 21.7, -9.48], [178, 0, -10, 0, -10, -1.93, -18.09, -9.42, -22.74, -27.84, -6.26, 22.74, -9.42], [184, 0, -10, 0, -10, -1.66, -19.54, -8.51, -55.1, -26.87, -5.2, -22.36, -7.09], [190, 0, -10, 0, -10, -1.21, -20.95, -7.14, -58.76, -25.84, -3.71, -34.6, -5.14], [196, 0, -10, 0, -10, -0.64, -22.29, -4.35, -49.12, -24.74, -1.93, -34.08, -2.93], [202, 0, -10, 0, -10, 0, -23.56, 0, -23.56, -23.56, 0, -23.56, 0]], "140H_제자리좌회전": [[10, 0, 0, 0, 0, 9.99, -29.97, -9.99, 0, 0, 25.14, -29.97, -25.14], [18, 0, 0, 0, 0, 9.99, -29.97, -9.99, 0, 0, 25.14, -29.97, -25.14], [35, 0, 0, 0, 0, 0, -9.99, 0, -9.99, -9.99, 0, -9.99, 0], [52, 0, 0, 0, 0, 0, -9.99, 0, -9.99, -9.99, 0, -9.99, 0]], "141H_제자리우회전": [[9, 0, 0, 0, 0, 9.99, 0, -9.99, -29.97, -29.97, 25.14, 0, -25.14], [17, 0, 0, 0, 0, 9.99, 0, -9.99, -29.97, -29.97, 25.14, 0, -25.14], [34, 0, 0, 0, 0, 0, -9.99, 0, -9.99, -9.99, 0, -9.99, 0], [51, 0, 0, 0, 0, 0, -9.99, 0, -9.99, -9.99, 0, -9.99, 0]], "142H_제자리좌회전_고속": [[9, 0, 0, 0, 0, 9.99, -29.97, -9.99, 0, 0, 13.14, -29.97, -13.14], [17, 0, 0, 0, 0, 9.99, -29.97, -9.99, 0, 0, 13.14, -29.97, -13.14], [34, 0, 0, 0, 0, 0, -9.99, 0, -9.99, -9.99, 0, -9.99, 0], [43, 0, 0, 0, 0, 0, -9.99, 0, -9.99, -9.99, 0, -9.99, 0]], "143H_제자리우회전_고속": [[9, 0, 0, 0, 0, 9.99, 0, -9.99, -29.97, -29.97, 13.14, 0, -13.14], [17, 0, 0, 0, 0, 9.99, 0, -9.99, -29.97, -29.97, 13.14, 0, -13.14], [34, 0, 0, 0, 0, 0, -9.99, 0, -9.99, -9.99, 0, -9.99, 0], [43, 0, 0, 0, 0, 0, -9.99, 0, -9.99, -9.99, 0, -9.99, 0]], "150H_전진_시작": [[64, -1.11, -8.89, -1.11, -8.89, -1.39, -31.31, -1.39, -31.31, -33.74, -2.73, -33.74, -1.39], [70, -1.59, -7.83, -1.59, -7.83, -2.7, -29.01, -2.7, -29.01, -33.8, -5.3, -33.8, -2.7], [76, -1.45, -6.88, -1.45, -6.88, -3.85, -26.7, -3.85, -26.7, -33.81, -7.59, -33.81, -3.85], [82, -0.76, -6.09, -0.76, -6.09, -4.8, -24.47, -4.8, -24.47, -33.86, -9.49, -33.86, -4.8], [88, 0.46, -5.5, 0.46, -5.5, -5.65, -22.36, -6.81, -33.59, -33.99, -11.06, -35.2, -5.58], [94, 2.12, -5.13, 2.12, -5.13, -6.24, -20.46, -8.46, -43.21, -34.32, -12.09, -33.25, -6.11], [100, 4.14, -5, 4.14, -5, -6.53, -18.82, -9.54, -52.37, -34.93, -12.53, -27.95, -6.3], [106, 6.44, -5.13, 6.44, -5.13, -6.54, -17.47, -9.9, -59.71, -35.87, -12.39, -20.13, -6.1], [112, 8.92, -5.5, 8.92, -5.5, -6.26, -16.39, -9.47, -64.03, -37.12, -11.66, -11.34, -5.47], [118, 11.46, -6.09, 11.46, -6.09, -5.71, -15.53, -8.25, -64.98, -38.67, -10.4, -3.19, -4.44], [124, 13.95, -6.88, 13.95, -6.88, -4.92, -14.82, -6.34, -63.02, -40.44, -8.66, 3.08, -3.11], [130, 16.28, -7.83, 16.28, -7.83, -3.94, -14.18, -3.93, -59.03, -42.34, -6.54, 6.69, -1.58], [136, 18.34, -8.89, 18.34, -8.89, -2.8, -13.53, -1.22, -53.82, -44.28, -4.14, 7.31, 0.02], [142, 20, -10, 20, -10, -1.58, -12.8, 1.58, -47.79, -46.18, -1.58, 5.32, 1.58]], "151H_전진_반복_좌회선": [[6, 15.52, -8.89, 15.52, -8.89, -0.35, -8.11, 2.81, -47.97, -47.41, -0.35, -0.27, 4.14], [12, 11.1, -7.83, 11.1, -7.83, 0.82, -3.06, 3.97, -47.4, -48.06, 0.82, -5.35, 6.57], [18, 6.79, -6.88, 6.79, -6.88, 1.87, 2.43, 5.01, -46.26, -48.02, 1.87, -10.07, 8.75], [24, 2.64, -6.09, 2.64, -6.09, 2.74, 8.52, 5.88, -44.66, -47.12, 2.74, -14.51, 10.57], [30, -1.28, -5.5, -1.28, -5.5, 4.86, -10.41, 6.53, -42.67, -57.78, 3.63, -18.7, 11.93], [36, -4.94, -5.13, -4.94, -5.13, 6.68, -29.43, 6.93, -40.37, -59.48, 4.33, -22.69, 12.78], [42, -8.28, -5, -8.28, -5, 7.96, -49.71, 7.07, -37.79, -51.51, 4.73, -26.5, 13.07], [48, -11.27, -5.13, -11.27, -5.13, 8.53, -67.62, 6.93, -34.97, -35.2, 4.73, -30.11, 12.78], [54, -13.87, -5.5, -13.87, -5.5, 8.28, -77.65, 6.53, -31.91, -16.64, 4.28, -33.53, 11.93], [60, -16.04, -6.09, -16.04, -6.09, 7.21, -78.77, 5.88, -28.61, -1.03, 3.41, -36.72, 10.57], [66, -17.76, -6.88, -17.76, -6.88, 5.48, -73.87, 5.01, -25.06, 9.64, 2.24, -39.64, 8.75], [72, -19, -7.83, -19, -7.83, 3.28, -66.16, 3.97, -21.26, 14.33, 0.93, -42.23, 6.57], [78, -19.75, -8.89, -19.75, -8.89, 0.86, -57.62, 2.81, -17.17, 12.4, -0.37, -44.43, 4.14], [84, -20, -10, -20, -10, -1.58, -47.79, 1.58, -12.8, 5.32, -1.58, -46.18, 1.58], [90, -19.75, -8.89, -19.75, -8.89, -2.19, -48.05, 0.96, -8.09, -0.32, -2.86, -47.39, 0.96], [96, -19, -7.83, -19, -7.83, -2.77, -47.62, 0.38, -3.07, -5.5, -4.08, -48.08, 0.38], [102, -17.76, -6.88, -17.76, -6.88, -3.3, -46.62, -0.14, 2.36, -10.32, -5.17, -48.12, -0.14], [108, -16.04, -6.09, -16.04, -6.09, -3.73, -45.15, -0.58, 8.36, -14.87, -6.08, -47.36, -0.58], [114, -13.87, -5.5, -13.87, -5.5, -4.06, -43.27, -0.91, -2.01, -19.16, -6.76, -48.12, -0.91], [120, -11.27, -5.13, -11.27, -5.13, -4.26, -41.02, -1.11, -10.96, -23.23, -7.19, -46.74, -1.11], [126, -8.28, -5, -8.28, -5, -4.33, -38.45, -1.18, -19, -27.07, -7.33, -43.81, -1.18], [132, -4.94, -5.13, -4.94, -5.13, -4.26, -35.57, -1.11, -26.26, -30.68, -7.19, -39.62, -1.11], [138, -1.28, -5.5, -1.28, -5.5, -4.06, -32.42, -0.91, -32.71, -34.05, -6.76, -34.35, -0.91], [144, 2.64, -6.09, 2.64, -6.09, -3.73, -28.99, -0.58, -38.27, -37.14, -6.08, -28.15, -0.58], [150, 6.79, -6.88, 6.79, -6.88, -3.3, -25.32, -3, -67.79, -39.94, -5.17, -20.75, -0.17], [156, 11.1, -7.83, 11.1, -7.83, -2.77, -21.4, -3.52, -78.93, -42.4, -4.08, 12.91, 0.48], [162, 15.52, -8.89, 15.52, -8.89, -2.19, -17.22, -1.7, -61.98, -44.5, -2.86, 32.46, 1.13], [168, 20, -10, 20, -10, -1.58, -12.8, 1.58, -47.79, -46.18, -1.58, 5.32, 1.58]], "152H_전진_반복": [[6, 15.52, -8.89, 15.52, -8.89, -0.35, -7.21, 2.78, -46.51, -46.12, -0.35, 0.72, 4.12], [12, 11.1, -7.83, 11.1, -7.83, 0.81, -1.17, 3.91, -44.73, -45.31, 0.81, -3.49, 6.51], [18, 6.79, -6.88, 6.79, -6.88, 1.83, 5.54, 4.91, -42.6, -43.57, 1.83, -7.43, 8.65], [24, 2.64, -6.09, 2.64, -6.09, 2.67, 13.51, 5.72, -40.25, -40.34, 2.67, -11.17, 10.41], [30, -1.28, -5.5, -1.28, -5.5, 4.75, -7.71, 6.33, -37.79, -53.08, 3.51, -14.81, 11.74], [36, -4.94, -5.13, -4.94, -5.13, 6.52, -26.92, 6.71, -35.28, -55.37, 4.17, -18.4, 12.56], [42, -8.28, -5, -8.28, -5, 7.78, -46.61, 6.83, -32.78, -48.3, 4.54, -22.01, 12.83], [48, -11.27, -5.13, -11.27, -5.13, 8.34, -63.73, 6.71, -30.27, -33.26, 4.54, -25.64, 12.56], [54, -13.87, -5.5, -13.87, -5.5, 8.12, -73.52, 6.33, -27.75, -15.57, 4.12, -29.3, 11.74], [60, -16.04, -6.09, -16.04, -6.09, 7.1, -74.95, 5.72, -25.15, -0.17, 3.3, -32.96, 10.41], [66, -17.76, -6.88, -17.76, -6.88, 5.42, -70.56, 4.91, -22.42, 10.67, 2.18, -36.56, 8.65], [72, -19, -7.83, -19, -7.83, 3.27, -63.55, 3.91, -19.48, 15.48, 0.92, -40.02, 6.51], [78, -19.75, -8.89, -19.75, -8.89, 0.87, -56.13, 2.78, -16.29, 13.23, -0.37, -43.26, 4.12], [84, -20, -10, -20, -10, -1.58, -47.79, 1.58, -12.8, 5.32, -1.58, -46.18, 1.58], [90, -19.75, -8.89, -19.75, -8.89, -2.78, -46.51, 0.35, -7.21, 0.72, -4.12, -46.12, 0.35], [96, -19, -7.83, -19, -7.83, -3.91, -44.73, -0.81, -1.17, -3.49, -6.51, -45.31, -0.81], [102, -17.76, -6.88, -17.76, -6.88, -4.91, -42.6, -1.83, 5.54, -7.43, -8.65, -43.57, -1.83], [108, -16.04, -6.09, -16.04, -6.09, -5.72, -40.25, -2.67, 13.51, -11.17, -10.41, -40.34, -2.67], [114, -13.87, -5.5, -13.87, -5.5, -6.33, -37.79, -4.75, -7.71, -14.81, -11.74, -53.08, -3.51], [120, -11.27, -5.13, -11.27, -5.13, -6.71, -35.28, -6.52, -26.92, -18.4, -12.56, -55.37, -4.17], [126, -8.28, -5, -8.28, -5, -6.83, -32.78, -7.78, -46.61, -22.01, -12.83, -48.3, -4.54], [132, -4.94, -5.13, -4.94, -5.13, -6.71, -30.27, -8.34, -63.73, -25.64, -12.56, -33.26, -4.54], [138, -1.28, -5.5, -1.28, -5.5, -6.33, -27.75, -8.12, -73.52, -29.3, -11.74, -15.57, -4.12], [144, 2.64, -6.09, 2.64, -6.09, -5.72, -25.15, -7.1, -74.95, -32.96, -10.41, -0.17, -3.3], [150, 6.79, -6.88, 6.79, -6.88, -4.91, -22.42, -5.42, -70.56, -36.56, -8.65, 10.67, -2.18], [156, 11.1, -7.83, 11.1, -7.83, -3.91, -19.48, -3.27, -63.55, -40.02, -6.51, 15.48, -0.92], [162, 15.52, -8.89, 15.52, -8.89, -2.78, -16.29, -0.87, -56.13, -43.26, -4.12, 13.23, 0.37], [168, 20, -10, 20, -10, -1.58, -12.8, 1.58, -47.79, -46.18, -1.58, 5.32, 1.58]], "153H_전진_반복_우회선": [[6, 15.52, -8.89, 15.52, -8.89, -0.96, -8.09, 2.19, -48.05, -47.39, -0.96, -0.32, 2.86], [12, 11.1, -7.83, 11.1, -7.83, -0.38, -3.07, 2.77, -47.62, -48.08, -0.38, -5.5, 4.08], [18, 6.79, -6.88, 6.79, -6.88, 0.14, 2.36, 3.3, -46.62, -48.12, 0.14, -10.32, 5.17], [24, 2.64, -6.09, 2.64, -6.09, 0.58, 8.36, 3.73, -45.15, -47.36, 0.58, -14.87, 6.08], [30, -1.28, -5.5, -1.28, -5.5, 0.91, -2.01, 4.06, -43.27, -48.12, 0.91, -19.16, 6.76], [36, -4.94, -5.13, -4.94, -5.13, 1.11, -10.96, 4.26, -41.02, -46.74, 1.11, -23.23, 7.19], [42, -8.28, -5, -8.28, -5, 1.18, -19, 4.33, -38.45, -43.81, 1.18, -27.07, 7.33], [48, -11.27, -5.13, -11.27, -5.13, 1.11, -26.26, 4.26, -35.57, -39.62, 1.11, -30.68, 7.19], [54, -13.87, -5.5, -13.87, -5.5, 0.91, -32.71, 4.06, -32.42, -34.35, 0.91, -34.05, 6.76], [60, -16.04, -6.09, -16.04, -6.09, 0.58, -38.27, 3.73, -28.99, -28.15, 0.58, -37.14, 6.08], [66, -17.76, -6.88, -17.76, -6.88, 3, -67.79, 3.3, -25.32, -20.75, 0.17, -39.94, 5.17], [72, -19, -7.83, -19, -7.83, 3.52, -78.93, 2.77, -21.4, 12.91, -0.48, -42.4, 4.08], [78, -19.75, -8.89, -19.75, -8.89, 1.7, -61.98, 2.19, -17.22, 32.46, -1.13, -44.5, 2.86], [84, -20, -10, -20, -10, -1.58, -47.79, 1.58, -12.8, 5.32, -1.58, -46.18, 1.58], [90, -19.75, -8.89, -19.75, -8.89, -2.81, -47.97, 0.35, -8.11, -0.27, -4.14, -47.41, 0.35], [96, -19, -7.83, -19, -7.83, -3.97, -47.4, -0.82, -3.06, -5.35, -6.57, -48.06, -0.82], [102, -17.76, -6.88, -17.76, -6.88, -5.01, -46.26, -1.87, 2.43, -10.07, -8.75, -48.02, -1.87], [108, -16.04, -6.09, -16.04, -6.09, -5.88, -44.66, -2.74, 8.52, -14.51, -10.57, -47.12, -2.74], [114, -13.87, -5.5, -13.87, -5.5, -6.53, -42.67, -4.86, -10.41, -18.7, -11.93, -57.78, -3.63], [120, -11.27, -5.13, -11.27, -5.13, -6.93, -40.37, -6.68, -29.43, -22.69, -12.78, -59.48, -4.33], [126, -8.28, -5, -8.28, -5, -7.07, -37.79, -7.96, -49.71, -26.5, -13.07, -51.51, -4.73], [132, -4.94, -5.13, -4.94, -5.13, -6.93, -34.97, -8.53, -67.62, -30.11, -12.78, -35.2, -4.73], [138, -1.28, -5.5, -1.28, -5.5, -6.53, -31.91, -8.28, -77.65, -33.53, -11.93, -16.64, -4.28], [144, 2.64, -6.09, 2.64, -6.09, -5.88, -28.61, -7.21, -78.77, -36.72, -10.57, -1.03, -3.41], [150, 6.79, -6.88, 6.79, -6.88, -5.01, -25.06, -5.48, -73.87, -39.64, -8.75, 9.64, -2.24], [156, 11.1, -7.83, 11.1, -7.83, -3.97, -21.26, -3.28, -66.16, -42.23, -6.57, 14.33, -0.93], [162, 15.52, -8.89, 15.52, -8.89, -2.81, -17.17, -0.86, -57.62, -44.43, -4.14, 12.4, 0.37], [168, 20, -10, 20, -10, -1.58, -12.8, 1.58, -47.79, -46.18, -1.58, 5.32, 1.58]], "154H_전진_종료": [[6, 19.75, -8.89, 19.75, -8.89, -0.69, -9.62, 2.44, -46.43, -45.62, -0.69, 3.51, 3.77], [12, 17.64, -7.83, 17.64, -7.83, 0.29, -5.39, 3.08, -45.05, -44.99, 0.29, 0.72, 5.69], [18, 15.22, -6.88, 15.22, -6.88, 1.17, -0.93, 3.64, -43.6, -44.01, 1.17, -1.99, 7.38], [24, 12.6, -6.09, 12.6, -6.09, 1.93, 3.81, 4.07, -42.14, -42.66, 1.93, -4.69, 8.76], [30, 9.91, -5.5, 9.91, -5.5, 3.71, -6.23, 4.51, -40.73, -49.69, 2.48, -7.39, 9.92], [36, 7.25, -5.13, 7.25, -5.13, 5.39, -16.22, 4.63, -39.47, -53.48, 3.04, -10.22, 10.48], [42, 4.73, -5, 4.73, -5, 6.65, -26.24, 4.57, -38.35, -54.03, 3.42, -13.16, 10.57], [48, 2.47, -5.13, 2.47, -5.13, 7.36, -35.6, 4.32, -37.36, -51.54, 3.56, -16.22, 10.17], [54, 0.55, -5.5, 0.55, -5.5, 7.45, -43.11, 3.9, -36.45, -46.98, 3.45, -19.41, 9.31], [60, -0.94, -6.09, -0.94, -6.09, 6.89, -47.63, 3.31, -35.59, -41.92, 3.09, -22.67, 8], [66, -1.94, -6.88, -1.94, -6.88, 5.76, -48.56, 2.56, -34.69, -37.89, 2.53, -25.99, 6.3], [72, -2.38, -7.83, -2.38, -7.83, 4.01, -45.91, 1.84, -33.7, -35.7, 1.66, -29.3, 4.45], [78, -2.22, -8.89, -2.22, -8.89, 1.98, -40, 1.03, -32.56, -35.28, 0.75, -32.56, 2.36], [84, -1.43, -10, -1.43, -10, -0.16, -31.24, 0.16, -31.24, -35.74, -0.16, -35.74, 0.16]], "155H_후진_시작": [[64, 1.11, -8.89, 1.11, -8.89, -1.4, -29.21, -1.4, -29.21, -37.38, -2.74, -37.38, -1.4], [70, 1.59, -7.83, 1.59, -7.83, -2.74, -30.88, -2.74, -30.88, -35.78, -5.34, -35.78, -2.74], [76, 1.45, -6.88, 1.45, -6.88, -3.93, -32.44, -3.93, -32.44, -34.07, -7.67, -34.07, -3.93], [82, 0.76, -6.09, 0.76, -6.09, -4.92, -33.9, -4.92, -33.9, -32.27, -9.61, -32.27, -4.92], [88, -0.46, -5.5, -0.46, -5.5, -5.83, -35.26, -6.37, -35.72, -30.38, -11.23, -40.22, -5.76], [94, -2.12, -5.13, -2.12, -5.13, -6.44, -36.58, -7.5, -36.09, -28.48, -12.29, -47.45, -6.33], [100, -4.14, -5, -4.14, -5, -6.76, -37.88, -8.16, -34.96, -26.58, -12.76, -53.74, -6.54], [106, -6.44, -5.13, -6.44, -5.13, -6.76, -39.2, -8.23, -32.42, -24.69, -12.6, -58.78, -6.33], [112, -8.92, -5.5, -8.92, -5.5, -6.45, -40.51, -7.66, -28.68, -22.81, -11.86, -62.21, -5.66], [118, -11.46, -6.09, -11.46, -6.09, -5.86, -41.81, -6.48, -23.97, -20.93, -10.55, -63.73, -4.58], [124, -13.95, -6.88, -13.95, -6.88, -5.03, -43.07, -4.8, -18.42, -19.01, -8.77, -63.15, -3.18], [130, -16.28, -7.83, -16.28, -7.83, -4, -44.24, -2.78, -12, -17.03, -6.6, -60.43, -1.61], [136, -18.34, -8.89, -18.34, -8.89, -2.82, -45.29, -0.6, -4.38, -14.97, -4.16, -55.49, 0.02], [142, -20, -10, -20, -10, -1.58, -46.18, 1.58, 5.32, -12.8, -1.58, -47.79, 1.58]], "156H_후진_반복_좌회선": [[6, -15.52, -8.89, -15.52, -8.89, 0, -47.42, 3.16, -0.23, -8.11, 0, -47.91, 4.49], [12, -11.1, -7.83, -11.1, -7.83, 1.5, -48.02, 4.65, -5.25, -3.03, 1.5, -47.25, 7.25], [18, -6.79, -6.88, -6.79, -6.88, 2.85, -47.88, 5.99, -9.88, 2.52, 2.85, -45.99, 9.73], [24, -2.64, -6.09, -2.64, -6.09, 3.97, -46.84, 7.1, -14.22, 8.71, 3.97, -44.27, 11.79], [30, 1.28, -5.5, 1.28, -5.5, 5.75, -57.94, 7.93, -18.34, -7.93, 5.14, -42.2, 13.33], [36, 4.94, -5.13, 4.94, -5.13, 7.24, -63.27, 8.44, -22.26, -20.79, 6.06, -39.85, 14.29], [42, 8.28, -5, 8.28, -5, 8.22, -64.46, 8.62, -26.04, -32.39, 6.6, -37.27, 14.62], [48, 11.27, -5.13, 11.27, -5.13, 8.53, -61.62, 8.44, -29.66, -43.2, 6.62, -34.49, 14.29], [54, 13.87, -5.5, 13.87, -5.5, 8.05, -55.08, 7.93, -33.13, -52.77, 6.05, -31.51, 13.33], [60, 16.04, -6.09, 16.04, -6.09, 6.84, -45.84, 7.1, -36.39, -59.89, 4.93, -28.31, 11.79], [66, 17.76, -6.88, 17.76, -6.88, 5.04, -35.11, 5.99, -39.41, -63.4, 3.42, -24.87, 9.73], [72, 19, -7.83, 19, -7.83, 2.89, -23.52, 4.65, -42.1, -62.82, 1.71, -21.15, 7.25], [78, 19.75, -8.89, 19.75, -8.89, 0.62, -10.74, 3.16, -44.38, -58.02, 0, -17.14, 4.49], [84, 20, -10, 20, -10, -1.58, 5.32, 1.58, -46.18, -47.79, -1.58, -12.8, 1.58], [90, 19.75, -8.89, 19.75, -8.89, -2.37, -0.31, 0.79, -47.4, -48.03, -3.03, -8.1, 0.79], [96, 19, -7.83, 19, -7.83, -3.12, -5.46, 0.04, -48.08, -47.56, -4.42, -3.07, 0.04], [102, 17.76, -6.88, 17.76, -6.88, -3.79, -10.26, -0.64, -48.11, -46.53, -5.66, 2.36, -0.64], [108, 16.04, -6.09, 16.04, -6.09, -4.35, -14.78, -1.2, -47.32, -45.03, -6.69, 8.38, -1.2], [114, 13.87, -5.5, 13.87, -5.5, -4.77, -19.05, -1.62, -48.07, -43.13, -7.47, -1.97, -1.62], [120, 11.27, -5.13, 11.27, -5.13, -5.03, -23.1, -1.88, -46.68, -40.87, -7.95, -10.92, -1.88], [126, 8.28, -5, 8.28, -5, -5.12, -26.94, -1.97, -43.75, -38.29, -8.12, -18.96, -1.97], [132, 4.94, -5.13, 4.94, -5.13, -5.03, -30.55, -1.88, -39.57, -35.43, -7.95, -26.22, -1.88], [138, 1.28, -5.5, 1.28, -5.5, -4.77, -33.93, -1.62, -34.32, -32.3, -7.47, -32.68, -1.62], [144, -2.64, -6.09, -2.64, -6.09, -4.35, -37.04, -1.2, -28.13, -28.9, -6.69, -38.25, -1.2], [150, -6.79, -6.88, -6.79, -6.88, -3.79, -39.86, -0.64, -21.11, -25.26, -5.66, -42.78, -0.64], [156, -11.1, -7.83, -11.1, -7.83, -3.12, -42.36, 0.04, -13.3, -21.36, -4.42, -46.09, 0.04], [162, -15.52, -8.89, -15.52, -8.89, -2.37, -44.48, 0.79, -4.61, -17.21, -3.03, -47.92, 0.79], [168, -20, -10, -20, -10, -1.58, -46.18, 1.58, 5.32, -12.8, -1.58, -47.79, 1.58]], "157H_후진_반복": [[6, -15.52, -8.89, -15.52, -8.89, 0, -47.42, 3.16, -0.23, -8.11, 0, -47.91, 4.49], [12, -11.1, -7.83, -11.1, -7.83, 1.5, -48.02, 4.65, -5.25, -3.03, 1.5, -47.25, 7.25], [18, -6.79, -6.88, -6.79, -6.88, 2.85, -47.88, 5.99, -9.88, 2.52, 2.85, -45.99, 9.73], [24, -2.64, -6.09, -2.64, -6.09, 3.97, -46.84, 7.1, -14.22, 8.71, 3.97, -44.27, 11.79], [30, 1.28, -5.5, 1.28, -5.5, 5.75, -57.94, 7.93, -18.34, -7.93, 5.14, -42.2, 13.33], [36, 4.94, -5.13, 4.94, -5.13, 7.24, -63.27, 8.44, -22.26, -20.79, 6.06, -39.85, 14.29], [42, 8.28, -5, 8.28, -5, 8.22, -64.46, 8.62, -26.04, -32.39, 6.6, -37.27, 14.62], [48, 11.27, -5.13, 11.27, -5.13, 8.53, -61.62, 8.44, -29.66, -43.2, 6.62, -34.49, 14.29], [54, 13.87, -5.5, 13.87, -5.5, 8.05, -55.08, 7.93, -33.13, -52.77, 6.05, -31.51, 13.33], [60, 16.04, -6.09, 16.04, -6.09, 6.84, -45.84, 7.1, -36.39, -59.89, 4.93, -28.31, 11.79], [66, 17.76, -6.88, 17.76, -6.88, 5.04, -35.11, 5.99, -39.41, -63.4, 3.42, -24.87, 9.73], [72, 19, -7.83, 19, -7.83, 2.89, -23.52, 4.65, -42.1, -62.82, 1.71, -21.15, 7.25], [78, 19.75, -8.89, 19.75, -8.89, 0.62, -10.74, 3.16, -44.38, -58.02, 0, -17.14, 4.49], [84, 20, -10, 20, -10, -1.58, 5.32, 1.58, -46.18, -47.79, -1.58, -12.8, 1.58], [90, 19.75, -8.89, 19.75, -8.89, -3.16, -0.23, 0, -47.42, -47.91, -4.49, -8.11, 0], [96, 19, -7.83, 19, -7.83, -4.65, -5.25, -1.5, -48.02, -47.25, -7.25, -3.03, -1.5], [102, 17.76, -6.88, 17.76, -6.88, -5.99, -9.88, -2.85, -47.88, -45.99, -9.73, 2.52, -2.85], [108, 16.04, -6.09, 16.04, -6.09, -7.1, -14.22, -3.97, -46.84, -44.27, -11.79, 8.71, -3.97], [114, 13.87, -5.5, 13.87, -5.5, -7.93, -18.34, -5.75, -57.94, -42.2, -13.33, -7.93, -5.14], [120, 11.27, -5.13, 11.27, -5.13, -8.44, -22.26, -7.24, -63.27, -39.85, -14.29, -20.79, -6.06], [126, 8.28, -5, 8.28, -5, -8.62, -26.04, -8.22, -64.46, -37.27, -14.62, -32.39, -6.6], [132, 4.94, -5.13, 4.94, -5.13, -8.44, -29.66, -8.53, -61.62, -34.49, -14.29, -43.2, -6.62], [138, 1.28, -5.5, 1.28, -5.5, -7.93, -33.13, -8.05, -55.08, -31.51, -13.33, -52.77, -6.05], [144, -2.64, -6.09, -2.64, -6.09, -7.1, -36.39, -6.84, -45.84, -28.31, -11.79, -59.89, -4.93], [150, -6.79, -6.88, -6.79, -6.88, -5.99, -39.41, -5.04, -35.11, -24.87, -9.73, -63.4, -3.42], [156, -11.1, -7.83, -11.1, -7.83, -4.65, -42.1, -2.89, -23.52, -21.15, -7.25, -62.82, -1.71], [162, -15.52, -8.89, -15.52, -8.89, -3.16, -44.38, -0.62, -10.74, -17.14, -4.49, -58.02, 0], [168, -20, -10, -20, -10, -1.58, -46.18, 1.58, 5.32, -12.8, -1.58, -47.79, 1.58]], "158H_후진_반복_우회선": [[6, -15.52, -8.89, -15.52, -8.89, -0.79, -47.4, 2.37, -0.31, -8.1, -0.79, -48.03, 3.03], [12, -11.1, -7.83, -11.1, -7.83, -0.04, -48.08, 3.12, -5.46, -3.07, -0.04, -47.56, 4.42], [18, -6.79, -6.88, -6.79, -6.88, 0.64, -48.11, 3.79, -10.26, 2.36, 0.64, -46.53, 5.66], [24, -2.64, -6.09, -2.64, -6.09, 1.2, -47.32, 4.35, -14.78, 8.38, 1.2, -45.03, 6.69], [30, 1.28, -5.5, 1.28, -5.5, 1.62, -48.07, 4.77, -19.05, -1.97, 1.62, -43.13, 7.47], [36, 4.94, -5.13, 4.94, -5.13, 1.88, -46.68, 5.03, -23.1, -10.92, 1.88, -40.87, 7.95], [42, 8.28, -5, 8.28, -5, 1.97, -43.75, 5.12, -26.94, -18.96, 1.97, -38.29, 8.12], [48, 11.27, -5.13, 11.27, -5.13, 1.88, -39.57, 5.03, -30.55, -26.22, 1.88, -35.43, 7.95], [54, 13.87, -5.5, 13.87, -5.5, 1.62, -34.32, 4.77, -33.93, -32.68, 1.62, -32.3, 7.47], [60, 16.04, -6.09, 16.04, -6.09, 1.2, -28.13, 4.35, -37.04, -38.25, 1.2, -28.9, 6.69], [66, 17.76, -6.88, 17.76, -6.88, 0.64, -21.11, 3.79, -39.86, -42.78, 0.64, -25.26, 5.66], [72, 19, -7.83, 19, -7.83, -0.04, -13.3, 3.12, -42.36, -46.09, -0.04, -21.36, 4.42], [78, 19.75, -8.89, 19.75, -8.89, -0.79, -4.61, 2.37, -44.48, -47.92, -0.79, -17.21, 3.03], [84, 20, -10, 20, -10, -1.58, 5.32, 1.58, -46.18, -47.79, -1.58, -12.8, 1.58], [90, 19.75, -8.89, 19.75, -8.89, -3.16, -0.23, 0, -47.42, -47.91, -4.49, -8.11, 0], [96, 19, -7.83, 19, -7.83, -4.65, -5.25, -1.5, -48.02, -47.25, -7.25, -3.03, -1.5], [102, 17.76, -6.88, 17.76, -6.88, -5.99, -9.88, -2.85, -47.88, -45.99, -9.73, 2.52, -2.85], [108, 16.04, -6.09, 16.04, -6.09, -7.1, -14.22, -3.97, -46.84, -44.27, -11.79, 8.71, -3.97], [114, 13.87, -5.5, 13.87, -5.5, -7.93, -18.34, -5.75, -57.94, -42.2, -13.33, -7.93, -5.14], [120, 11.27, -5.13, 11.27, -5.13, -8.44, -22.26, -7.24, -63.27, -39.85, -14.29, -20.79, -6.06], [126, 8.28, -5, 8.28, -5, -8.62, -26.04, -8.22, -64.46, -37.27, -14.62, -32.39, -6.6], [132, 4.94, -5.13, 4.94, -5.13, -8.44, -29.66, -8.53, -61.62, -34.49, -14.29, -43.2, -6.62], [138, 1.28, -5.5, 1.28, -5.5, -7.93, -33.13, -8.05, -55.08, -31.51, -13.33, -52.77, -6.05], [144, -2.64, -6.09, -2.64, -6.09, -7.1, -36.39, -6.84, -45.84, -28.31, -11.79, -59.89, -4.93], [150, -6.79, -6.88, -6.79, -6.88, -5.99, -39.41, -5.04, -35.11, -24.87, -9.73, -63.4, -3.42], [156, -11.1, -7.83, -11.1, -7.83, -4.65, -42.1, -2.89, -23.52, -21.15, -7.25, -62.82, -1.71], [162, -15.52, -8.89, -15.52, -8.89, -3.16, -44.38, -0.62, -10.74, -17.14, -4.49, -58.02, 0], [168, -20, -10, -20, -10, -1.58, -46.18, 1.58, 5.32, -12.8, -1.58, -47.79, 1.58]], "159H_후진_종료": [[6, -19.75, -8.89, -19.75, -8.89, -0.7, -46.87, 2.45, 2.48, -10.5, -0.7, -47.95, 3.79], [12, -17.64, -7.83, -17.64, -7.83, 0.29, -47.41, 3.13, -0.23, -8.11, 0.29, -47.91, 5.73], [18, -15.22, -6.88, -15.22, -6.88, 1.2, -47.78, 3.72, -2.82, -5.61, 1.2, -47.7, 7.46], [24, -12.6, -6.09, -12.6, -6.09, 1.98, -47.97, 4.18, -5.32, -3, 1.98, -47.36, 8.87], [30, -9.91, -5.5, -9.91, -5.5, 3.18, -54.04, 4.65, -7.73, -11.81, 2.56, -46.86, 10.06], [36, -7.25, -5.13, -7.25, -5.13, 4.33, -58.01, 4.78, -10.11, -19.21, 3.15, -46.32, 10.63], [42, -4.73, -5, -4.73, -5, 5.17, -60.02, 4.72, -12.45, -25.65, 3.55, -45.7, 10.72], [48, -2.47, -5.13, -2.47, -5.13, 5.6, -60.05, 4.47, -14.76, -31.26, 3.7, -45, 10.32], [54, -0.55, -5.5, -0.55, -5.5, 5.57, -58.13, 4.02, -17.03, -35.97, 3.57, -44.24, 9.43], [60, 0.94, -6.09, 0.94, -6.09, 5.09, -54.41, 3.4, -19.25, -39.57, 3.18, -43.38, 8.09], [66, 1.94, -6.88, 1.94, -6.88, 4.21, -49.19, 2.62, -21.41, -41.79, 2.59, -42.42, 6.36], [72, 2.38, -7.83, 2.38, -7.83, 2.87, -42.81, 1.87, -23.49, -42.43, 1.69, -41.34, 4.47], [78, 2.22, -8.89, 2.22, -8.89, 1.37, -35.5, 1.04, -25.49, -41.43, 0.75, -40.14, 2.37], [84, 1.43, -10, 1.43, -10, -0.16, -27.41, 0.16, -27.41, -38.83, -0.16, -38.83, 0.16]], "160H_빠른전진_시작": [[64, -1.45, -8.29, -1.45, -8.29, -3.74, -19.21, -3.74, -19.21, -22.62, -3.74, -22.62, -3.74], [69, -1.4, -6.79, -1.4, -6.79, -6.94, -13.95, -7.29, -28.87, -20.63, -6.94, -25.3, -7.29], [74, 0, -5.67, 0, -5.67, -9.25, -8.23, -10.13, -39.48, -18.04, -9.25, -20.56, -10.13], [79, 2.54, -5.08, 2.54, -5.08, -10.45, -2.96, -11.78, -47.89, -15.89, -10.45, -8.98, -11.78], [84, 5.91, -5.08, 5.91, -5.08, -10.45, -0.04, -11.91, -50.15, -16.17, -10.45, 6.96, -11.91], [89, 9.76, -5.67, 9.76, -5.67, -9.25, -0.36, -10.44, -42.13, -19.86, -9.25, 26.43, -10.44], [94, 13.68, -6.79, 13.68, -6.79, -6.94, -1.86, -7.61, -35.67, -24.92, -6.94, 35.67, -7.61], [99, 17.24, -8.29, 17.24, -8.29, -3.74, -2.92, -3.93, -32.41, -29.69, -3.74, 32.41, -3.93], [104, 20, -10, 20, -10, 0, -2.91, 0, -24.44, -33.42, 0, 24.44, 0]], "161H_빠른전진_반복_좌회선": [[5, 6.53, -8.29, 6.53, -8.29, 3.03, 6.33, 3.03, -31.85, -32.54, 3.03, 9.06, 4.05], [10, 3.16, -6.79, 3.16, -6.79, 7.66, -15.1, 5.68, -32.21, -46.35, 6.13, 0.23, 7.6], [15, 0, -5.67, 0, -5.67, 11.65, -39.5, 7.63, -30.32, -42.7, 8.82, -6.66, 10.23], [20, -2.86, -5.08, -2.86, -5.08, 14.2, -61.73, 8.66, -27.42, -20.94, 10.5, -12.7, 11.61], [25, -5.32, -5.08, -5.32, -5.08, 14.69, -67.38, 8.66, -23.98, 9.76, 10.69, -18.29, 11.61], [30, -7.32, -5.67, -7.32, -5.67, 12.96, -47.17, 7.63, -20.06, 47.17, 9.26, -23.49, 10.23], [35, -8.79, -6.79, -8.79, -6.79, 9.4, -47.68, 5.68, -15.48, 47.68, 6.57, -28.07, 7.6], [40, -9.7, -8.29, -9.7, -8.29, 4.8, -40.66, 3.03, -9.9, 40.66, 3.27, -31.59, 4.05], [45, -10, -10, -10, -10, 0, -24.44, 0, -2.91, 24.44, 0, -33.42, 0], [50, -9.7, -8.29, -9.7, -8.29, -1.51, -32.24, -1.51, 6.04, 8.73, -2.03, -32.88, -1.51], [55, -8.79, -6.79, -8.79, -6.79, -2.85, -33.22, -2.85, -4.59, -0.62, -3.81, -32.89, -2.85], [60, -7.32, -5.67, -7.32, -5.67, -3.83, -31.91, -3.83, -12.98, -8.03, -5.13, -30.16, -3.83], [65, -5.32, -5.08, -5.32, -5.08, -4.35, -29.29, -4.35, -19.96, -14.39, -5.83, -25.72, -4.35], [70, -2.86, -5.08, -2.86, -5.08, -4.35, -25.72, -4.35, -25.72, -19.96, -5.83, -19.96, -4.35], [75, 0, -5.67, 0, -5.67, -3.83, -21.35, -3.83, -30.16, -24.81, -5.13, -12.98, -3.83], [80, 3.16, -6.79, 3.16, -6.79, -2.85, -16.17, -2.85, -32.89, -28.83, -3.81, -4.59, -2.85], [85, 6.53, -8.29, 6.53, -8.29, -1.51, -10.1, -5.88, -51, -31.82, -2.03, 51, -1.88], [90, 10, -10, 10, -10, 0, -2.91, 0, -24.44, -33.42, 0, 24.44, 0]], "162H_빠른전진_반복": [[5, 13.05, -8.29, 13.05, -8.29, 2.99, 10.06, 2.99, -26.64, -28.26, 2.99, 13.7, 4.02], [10, 6.32, -6.79, 6.32, -6.79, 7.52, -12.55, 5.56, -25.06, -42.87, 5.99, 6.51, 7.49], [15, 0, -5.67, 0, -5.67, 11.37, -36.36, 7.42, -21.86, -39.42, 8.55, 0.95, 10.02], [20, -5.71, -5.08, -5.71, -5.08, 13.82, -57.3, 8.4, -18.66, -18.55, 10.12, -4.54, 11.35], [25, -10.64, -5.08, -10.64, -5.08, 14.29, -61.73, 8.4, -16.01, 12.23, 10.29, -10.55, 11.35], [30, -14.64, -5.67, -14.64, -5.67, 12.66, -45.75, 7.42, -13.69, 45.75, 8.96, -16.99, 10.02], [35, -17.59, -6.79, -17.59, -6.79, 9.24, -46.68, 5.56, -11.11, 46.68, 6.42, -23.35, 7.49], [40, -19.39, -8.29, -19.39, -8.29, 4.76, -40.17, 2.99, -7.67, 40.17, 3.23, -29.03, 4.02], [45, -20, -10, -20, -10, 0, -24.44, 0, -2.91, 24.44, 0, -33.42, 0], [50, -19.39, -8.29, -19.39, -8.29, -2.99, -26.64, -2.99, 10.06, 13.7, -4.02, -28.26, -2.99], [55, -17.59, -6.79, -17.59, -6.79, -5.56, -25.06, -7.52, -12.55, 6.51, -7.49, -42.87, -5.99], [60, -14.64, -5.67, -14.64, -5.67, -7.42, -21.86, -11.37, -36.36, 0.95, -10.02, -39.42, -8.55], [65, -10.64, -5.08, -10.64, -5.08, -8.4, -18.66, -13.82, -57.3, -4.54, -11.35, -18.55, -10.12], [70, -5.71, -5.08, -5.71, -5.08, -8.4, -16.01, -14.29, -61.73, -10.55, -11.35, 12.23, -10.29], [75, 0, -5.67, 0, -5.67, -7.42, -13.69, -12.66, -45.75, -16.99, -10.02, 45.75, -8.96], [80, 6.32, -6.79, 6.32, -6.79, -5.56, -11.11, -9.24, -46.68, -23.35, -7.49, 46.68, -6.42], [85, 13.05, -8.29, 13.05, -8.29, -2.99, -7.67, -4.76, -40.17, -29.03, -4.02, 40.17, -3.23], [90, 20, -10, 20, -10, 0, -2.91, 0, -24.44, -33.42, 0, 24.44, 0]], "163H_빠른전진_반복_우회선": [[5, 6.53, -8.29, 6.53, -8.29, 1.51, 6.04, 1.51, -32.24, -32.88, 1.51, 8.73, 2.03], [10, 3.16, -6.79, 3.16, -6.79, 2.85, -4.59, 2.85, -33.22, -32.89, 2.85, -0.62, 3.81], [15, 0, -5.67, 0, -5.67, 3.83, -12.98, 3.83, -31.91, -30.16, 3.83, -8.03, 5.13], [20, -2.86, -5.08, -2.86, -5.08, 4.35, -19.96, 4.35, -29.29, -25.72, 4.35, -14.39, 5.83], [25, -5.32, -5.08, -5.32, -5.08, 4.35, -25.72, 4.35, -25.72, -19.96, 4.35, -19.96, 5.83], [30, -7.32, -5.67, -7.32, -5.67, 3.83, -30.16, 3.83, -21.35, -12.98, 3.83, -24.81, 5.13], [35, -8.79, -6.79, -8.79, -6.79, 2.85, -32.89, 2.85, -16.17, -4.59, 2.85, -28.83, 3.81], [40, -9.7, -8.29, -9.7, -8.29, 5.88, -51, 1.51, -10.1, 51, 1.88, -31.82, 2.03], [45, -10, -10, -10, -10, 0, -24.44, 0, -2.91, 24.44, 0, -33.42, 0], [50, -9.7, -8.29, -9.7, -8.29, -3.03, -31.85, -3.03, 6.33, 9.06, -4.05, -32.54, -3.03], [55, -8.79, -6.79, -8.79, -6.79, -5.68, -32.21, -7.66, -15.1, 0.23, -7.6, -46.35, -6.13], [60, -7.32, -5.67, -7.32, -5.67, -7.63, -30.32, -11.65, -39.5, -6.66, -10.23, -42.7, -8.82], [65, -5.32, -5.08, -5.32, -5.08, -8.66, -27.42, -14.2, -61.73, -12.7, -11.61, -20.94, -10.5], [70, -2.86, -5.08, -2.86, -5.08, -8.66, -23.98, -14.69, -67.38, -18.29, -11.61, 9.76, -10.69], [75, 0, -5.67, 0, -5.67, -7.63, -20.06, -12.96, -47.17, -23.49, -10.23, 47.17, -9.26], [80, 3.16, -6.79, 3.16, -6.79, -5.68, -15.48, -9.4, -47.68, -28.07, -7.6, 47.68, -6.57], [85, 6.53, -8.29, 6.53, -8.29, -3.03, -9.9, -4.8, -40.66, -31.59, -4.05, 40.66, -3.27], [90, 10, -10, 10, -10, 0, -2.91, 0, -24.44, -33.42, 0, 24.44, 0]], "164H_빠른전진_종료": [[5, 19.39, -8.29, 19.39, -8.29, 1.25, 4.15, 1.25, -22.18, -30.11, 1.25, 22.18, 2.27], [10, 15.63, -6.79, 15.63, -6.79, 3.91, -4.51, 2.32, -19.94, -34.06, 2.38, 19.94, 4.25], [15, 11.39, -5.67, 11.39, -5.67, 6.08, -16.43, 3.11, -17.75, -33.63, 3.25, 17.75, 5.71], [20, 7.09, -5.08, 7.09, -5.08, 7.43, -28.32, 3.52, -20.02, -27.57, 3.73, 11.23, 6.47], [25, 3.17, -5.08, 3.17, -5.08, 7.75, -36.78, 3.52, -22.54, -17.6, 3.75, 4.57, 6.47], [30, 0, -5.67, 0, -5.67, 6.99, -40.06, 3.11, -24.53, -7.98, 3.3, -1.5, 5.71], [35, -2.11, -6.79, -2.11, -6.79, 5.26, -39.35, 2.32, -26.21, -3.63, 2.43, -7.29, 4.25], [40, -2.9, -8.29, -2.9, -8.29, 2.81, -36.14, 1.25, -27.48, -7.64, 1.28, -12.75, 2.27], [45, -2.22, -10, -2.22, -10, 0, -28.2, 0, -28.2, -17.81, 0, -17.81, 0]], "165H_빠른후진_시작": [[64, 1.59, -7.83, 1.59, -7.83, -3.2, -26.38, -3.2, -26.38, -19.7, -5.8, -19.7, -3.2], [70, 0.76, -6.09, 0.76, -6.09, -5.75, -28.28, -5.75, -28.28, -15.04, -10.44, -15.04, -5.75], [76, -2.12, -5.13, -2.12, -5.13, -6.05, -30.19, -7.33, -38.63, -10.45, -10.74, -39.51, -6.16], [82, -6.44, -5.13, -6.44, -5.13, -6.34, -31.4, -8.23, -36.07, -5.31, -11.03, -55.78, -6.32], [88, -11.46, -6.09, -11.46, -6.09, -6.63, -31.7, -7.87, -24.97, 0.59, -11.32, -62.43, -5.97], [94, -16.28, -7.83, -16.28, -7.83, -6.92, -30.52, -6.34, -7.99, 7.76, -11.61, -56.05, -5.17], [100, -20, -10, -20, -10, -1.48, -30.02, 1.48, 26.55, 14.46, -1.48, -26.55, 1.48]], "166H_빠른후진_반복_좌회선": [[6, -11.1, -7.83, -11.1, -7.83, 1.73, -28.31, 4.67, 9.18, 28.31, 1.73, -31.27, 7.27], [12, -2.64, -6.09, -2.64, -6.09, 4.29, -33.67, 7.21, -4.31, 33.67, 4.29, -31.04, 11.9], [18, 4.94, -5.13, 4.94, -5.13, 6.23, -62.97, 7.21, -14.94, -5.35, 5.05, -27.4, 11.9], [24, 11.27, -5.13, 11.27, -5.13, 7.57, -67.78, 7.21, -23.11, -33.83, 5.67, -20.9, 11.9], [30, 16.04, -6.09, 16.04, -6.09, 7.57, -49.94, 7.21, -28.84, -55.58, 5.67, -12.04, 11.9], [36, 19, -7.83, 19, -7.83, 6.23, -21.49, 7.21, -31.35, -58.7, 5.05, -0.48, 11.9], [42, 20, -10, 20, -10, -1.48, 26.55, 1.48, -30.02, -26.55, -1.48, 14.46, 1.48], [48, 19, -7.83, 19, -7.83, -3.08, 8.56, -0.13, -28.32, -31.98, -4.38, 28.32, -1.43], [54, 16.04, -6.09, 16.04, -6.09, -4.35, -5.39, -1.41, -33.76, -32.3, -6.7, 33.76, -3.75], [60, 11.27, -5.13, 11.27, -5.13, -4.35, -15.91, -1.41, -23.5, -28.46, -7.28, 23.5, -3.75], [66, 4.94, -5.13, 4.94, -5.13, -4.35, -24.1, -1.41, -32.08, -21.88, -7.28, -9.32, -3.75], [72, -2.64, -6.09, -2.64, -6.09, -4.35, -29.94, -1.41, -21.57, -13.02, -6.7, -25.29, -3.75], [78, -11.1, -7.83, -11.1, -7.83, -4.35, -32.73, -3.9, -28.06, -1.65, -5.66, -73.43, -4.24], [84, -20, -10, -20, -10, -1.48, -30.02, 1.48, 26.55, 14.46, -1.48, -26.55, 1.48]], "167H_빠른후진_반복": [[6, -11.1, -7.83, -11.1, -7.83, 1.73, -28.31, 4.67, 9.18, 28.31, 1.73, -31.27, 7.27], [12, -2.64, -6.09, -2.64, -6.09, 4.29, -33.67, 7.21, -4.31, 33.67, 4.29, -31.04, 11.9], [18, 4.94, -5.13, 4.94, -5.13, 6.23, -62.97, 7.21, -14.94, -5.35, 5.05, -27.4, 11.9], [24, 11.27, -5.13, 11.27, -5.13, 7.57, -67.78, 7.21, -23.11, -33.83, 5.67, -20.9, 11.9], [30, 16.04, -6.09, 16.04, -6.09, 7.57, -49.94, 7.21, -28.84, -55.58, 5.67, -12.04, 11.9], [36, 19, -7.83, 19, -7.83, 6.23, -21.49, 7.21, -31.35, -58.7, 5.05, -0.48, 11.9], [42, 20, -10, 20, -10, -1.48, 26.55, 1.48, -30.02, -26.55, -1.48, 14.46, 1.48], [48, 19, -7.83, 19, -7.83, -4.67, 9.18, -1.73, -28.31, -31.27, -7.27, 28.31, -4.33], [54, 16.04, -6.09, 16.04, -6.09, -7.21, -4.31, -4.29, -33.67, -31.04, -11.9, 33.67, -8.98], [60, 11.27, -5.13, 11.27, -5.13, -7.21, -14.94, -6.23, -62.97, -27.4, -13.06, -5.35, -9.74], [66, 4.94, -5.13, 4.94, -5.13, -7.21, -23.11, -7.57, -67.78, -20.9, -13.06, -33.83, -10.36], [72, -2.64, -6.09, -2.64, -6.09, -7.21, -28.84, -7.57, -49.94, -12.04, -11.9, -55.58, -10.36], [78, -11.1, -7.83, -11.1, -7.83, -7.21, -31.35, -6.23, -21.49, -0.48, -9.81, -58.7, -9.74], [84, -20, -10, -20, -10, -1.48, -30.02, 1.48, 26.55, 14.46, -1.48, -26.55, 1.48]], "168H_빠른후진_반복_우회선": [[6, -11.1, -7.83, -11.1, -7.83, 0.13, -28.32, 3.08, 8.56, 28.32, 0.13, -31.98, 3.08], [12, -2.64, -6.09, -2.64, -6.09, 1.41, -33.76, 4.35, -5.39, 33.76, 1.41, -32.3, 4.35], [18, 4.94, -5.13, 4.94, -5.13, 1.41, -23.5, 4.35, -15.91, 23.5, 1.41, -28.46, 4.35], [24, 11.27, -5.13, 11.27, -5.13, 1.41, -32.08, 4.35, -24.1, -9.32, 1.41, -21.88, 4.35], [30, 16.04, -6.09, 16.04, -6.09, 1.41, -21.57, 4.35, -29.94, -25.29, 1.41, -13.02, 4.35], [36, 19, -7.83, 19, -7.83, 1.41, -3.48, 4.35, -32.73, -33.28, 1.41, -1.65, 4.35], [42, 20, -10, 20, -10, -1.48, 26.55, 1.48, -30.02, -26.55, -1.48, 14.46, 1.48], [48, 19, -7.83, 19, -7.83, -4.67, 9.18, -1.73, -28.31, -31.27, -4.67, 28.31, -1.73], [54, 16.04, -6.09, 16.04, -6.09, -7.21, -4.31, -4.29, -33.67, -31.04, -7.21, 33.67, -4.29], [60, 11.27, -5.13, 11.27, -5.13, -7.21, -14.94, -5.81, -49.77, -27.4, -7.21, 1.96, -4.64], [66, 4.94, -5.13, 4.94, -5.13, -7.21, -23.11, -6.79, -51.95, -20.9, -7.21, -24.74, -4.88], [72, -2.64, -6.09, -2.64, -6.09, -7.21, -28.84, -6.79, -38.05, -12.04, -7.21, -42.52, -4.88], [78, -11.1, -7.83, -11.1, -7.83, -7.21, -31.35, -5.81, -14.38, -0.48, -7.21, -47.42, -4.64], [84, -20, -10, -20, -10, -1.48, -30.02, 1.48, 26.55, 14.46, -1.48, -26.55, 1.48]], "169H_빠른후진_종료": [[6, -19, -7.83, -19, -7.83, 0.13, -25.36, 3.08, 23.47, 25.36, 2.73, -23.47, 5.68], [12, -13.75, -6.09, -13.75, -6.09, 1.7, -28.31, 4.06, 8.91, 28.31, 6.4, -31.58, 8.75], [18, -8.05, -5.13, -8.05, -5.13, 3.02, -50.31, 4.06, 0.97, 0.25, 6.54, -32.86, 9.91], [24, -2.82, -5.13, -2.82, -5.13, 4.18, -56.24, 3.77, -5.54, -15.77, 6.97, -32.48, 9.62], [30, 1.13, -6.09, 1.13, -6.09, 4.52, -51.66, 3.47, -11.17, -26.05, 7.31, -31.01, 8.16], [36, 3.17, -7.83, 3.17, -7.83, 3.98, -39.2, 3.18, -16.16, -30.08, 7.49, -28.74, 5.78], [42, 2.86, -10, 2.86, -10, -0.3, -20.82, 0.3, -20.82, -26.02, -0.3, -26.02, 0.3]], "181H_펀치": [[13, 0, 20, 0, 0, 9.08, -31.8, -9.08, -59.34, -59.34, 9.08, -31.8, -9.08], [21, 0, 20, -17.5, 0, 17.72, -29.41, -19.15, -63.24, -55.52, 17.72, -34.02, -19.15], [27, 0, 20, -35, 0, 17.72, -29.41, -19.15, -63.24, -55.52, 17.72, -34.02, -19.15], [35, 0, 20, -52.5, 0, 17.72, -29.41, -19.15, -63.24, -55.52, 17.72, -34.02, -19.15], [48, 0, 20, -100, 0, 16.48, -23.57, -19.15, -71.37, -47.16, 16.48, -16.32, -19.15], [54, 0, 20, -110, 0, 13.4, -30.6, -14.11, -61.29, -57.43, 13.4, -32.91, -14.11], [67, 0, 20, 0, 0, 9.08, -31.8, -9.08, -59.34, -59.34, 9.08, -31.8, -9.08]], "182H_오른팔_훅": [[128, 0, 0, 0, 0, 7.86, -33.41, -7.86, -33.41, -33.41, 7.86, -33.41, -7.86], [141, 40, -13.33, 0, 0, 7.86, -12.71, -7.86, -46.06, -46.06, 7.86, -12.71, -7.86], [154, 80, -26.67, -14, 0, 11.72, -11.35, -11.72, -45.66, -44.17, 11.72, -2.78, -11.72], [162, 120, -40, -5, 0, 11.72, -11.35, -11.72, -45.66, -44.17, 11.72, -2.78, -11.72], [170, 45, -20, 7, 0, 7.86, -12.71, -7.86, -46.06, -46.06, 7.86, -12.71, -7.86], [256, 0, 0, 0, 0, 7.86, -33.41, -7.86, -33.41, -33.41, 7.86, -33.41, -7.86]], "183H_왼팔_훅": [[128, 0, 0, 0, 0, 7.86, -33.41, -7.86, -33.41, -33.41, 7.86, -33.41, -7.86], [141, 0, 0, -40, -13.33, 7.86, -46.06, -7.86, -12.71, -12.71, 7.86, -46.06, -7.86], [154, 14, 0, -80, -26.67, 11.72, -45.66, -11.72, -11.35, -2.78, 11.72, -44.17, -11.72], [162, 24, 0, -120, -40, 11.72, -45.66, -11.72, -11.35, -2.78, 11.72, -44.17, -11.72], [170, -5, 0, -45, -20, 7.86, -46.06, -7.86, -12.71, -12.71, 7.86, -46.06, -7.86], [255, 0, 0, 0, 0, 7.86, -33.41, -7.86, -33.41, -33.41, 7.86, -33.41, -7.86]], "184H_엎드려": [[128, 20, 0, -20, 0, 9.97, -38.17, 9.18, -33.9, -67.27, 19.97, -59.55, 9.18], [256, 23, 3, 7, 32, 9.97, -80.01, 5.5, -52.23, 2.53, 29.97, -68.15, 25.5], [384, 49, -32, 0, 26, 8.5, -58.9, 9.97, 19.32, 9.95, 28.5, -76.78, 49.97], [512, 80, 0, -80, 0, 13.69, 0, -10.34, 0, 0, 13.69, 0, -10.34], [640, 80, 0, -80, 0, 10, -10.99, -10, -10.99, -31.6, 10, -31.6, -10]], "190H_박수": [[26, 121, -5, -121, -5, 0, -6.44, 0, -6.44, -12.24, 0, -12.24, 0], [32, 126, -13, -126, -13, 0, -6.53, 0, -6.53, -11.33, 0, -11.33, 0], [45, 126, -13, -126, -13, 0, -6.53, 0, -6.53, -11.33, 0, -11.33, 0], [64, 126, -5, -126, -5, 0, -2.59, 0, -2.59, -12.19, 0, -12.19, 0]], "191H_박수_준비": [[128, 117, 6, -113, 6, 0, -10.48, 0, -10.48, -10.48, 0, -10.48, 0]], "192H_박수_종료": [[128, 63, -2.5, -60.5, -11.5, 0, -1.29, 0, -1.29, -6.1, 0, -6.1, 0], [254, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], "320H_만세": [[52, -19, 0, 19, 0, 0, -38, 0, -38, -38, 0, -38, 0], [102, 151, 50, -151, 50, 0, -11, 0, -11, -11, 0, -11, 0], [128, 151, 50, -151, 50, 0, -11, 0, -11, -11, 0, -11, 0], [179, -19, 0, 19, 0, 0, -38, 0, -38, -38, 0, -38, 0], [204, -19, 0, 19, 0, 0, -38, 0, -38, -38, 0, -38, 0], [256, 151, 50, -151, 50, 0, -11, 0, -11, -11, 0, -11, 0], [282, 151, 50, -151, 50, 0, -11, 0, -11, -11, 0, -11, 0], [333, 0, 0, 0, 0, 0, -11, 0, -11, -11, 0, -11, 0]], "324H_브라보": [[128, 154, 67, -154, 67, 0, -35.96, 0, -35.96, -35.96, 0, -35.96, 0], [205, 146, 0, -146, 0, 0, -24.96, 0, -24.96, -24.96, 0, -24.96, 0], [282, 154, 67, -154, 67, 0, -35.96, 0, -35.96, -35.96, 0, -35.96, 0], [358, 146, 0, -146, 0, 0, -24.96, 0, -24.96, -24.96, 0, -24.96, 0], [435, 154, 67, -154, 67, 0, -35.96, 0, -35.96, -35.96, 0, -35.96, 0], [539, 0, 0, 0, 0, 0, -10, 0, -10, -10, 0, -10, 0]], "345H_전방 공격": [[26, 0, 78, 0, 78, -0.15, -20.82, 0.15, -20.82, -26.02, -0.15, -26.02, 0.15], [37, 0, 78, 0, 78, -0.15, -20.82, 0.15, -20.82, -26.02, -0.15, -26.02, 0.15], [51, 87, 78, -87, 78, -0.15, -20.82, 0.15, -20.82, -26.02, -0.15, -26.02, 0.15], [73, 59, -1, -123, 0, -0.15, -20.82, 0.15, -20.82, -26.02, -0.15, -26.02, 0.15], [91, 59, -38, -119, -32, 24.85, -31.82, -3.85, -20.82, -37.02, 14.85, -26.02, -11.85], [110, 59, -38, -119, -32, 24.85, -31.82, -3.85, -20.82, -37.02, 14.85, -26.02, -11.85], [154, 68, 59, -94, 73, 24.85, -31.82, -3.85, -20.82, -37.02, 14.85, -26.02, -11.85], [220, 0, -9, 0, -9, -0.15, -42.82, 0.15, -42.82, -48.02, -0.15, -48.02, 0.15], [266, 0, -9, 0, -9, -0.15, -14.82, 0.15, -14.82, -20.02, -0.15, -20.02, 0.15]], "346H_전방공격_2": [[35, 0, -9, 0, -9, -0.15, -46.82, 0.15, -46.82, -52.02, -0.15, -52.02, 0.15], [66, 60.6, -28.58, -60.6, -28.58, -0.15, -22.82, 0.15, -22.82, -28.02, -0.15, -28.02, 0.15], [77, 79.6, -15.58, -75.6, -15.58, -0.15, -11.82, 0.15, -11.82, -17.02, -0.15, -17.02, 0.15], [92, 79.6, -15.58, -75.6, -15.58, -0.15, -27.82, -12.85, -1.82, -33.02, -12.15, -7.02, -17.85]], "700H_wF_L_Start_0": [[64, -1.11, -8.89, -1.11, -8.89, -1.39, -31.31, -1.39, -31.31, -33.74, -2.73, -33.74, -1.39], [70, -1.59, -7.83, -1.59, -7.83, -2.7, -29.01, -2.7, -29.01, -33.8, -5.3, -33.8, -2.7], [76, -1.45, -6.88, -1.45, -6.88, -3.85, -26.7, -3.85, -26.7, -33.81, -7.59, -33.81, -3.85], [82, -0.76, -6.09, -0.76, -6.09, -4.8, -24.47, -4.8, -24.47, -33.86, -9.49, -33.86, -4.8], [88, 0.46, -5.5, 0.46, -5.5, -5.65, -22.36, -6.81, -33.59, -33.99, -11.06, -35.2, -5.58], [94, 2.12, -5.13, 2.12, -5.13, -6.24, -20.46, -8.46, -43.21, -34.32, -12.09, -33.25, -6.11], [100, 4.14, -5, 4.14, -5, -6.53, -18.82, -9.54, -52.37, -34.93, -12.53, -27.95, -6.3], [106, 6.44, -5.13, 6.44, -5.13, -6.54, -17.47, -9.9, -59.71, -35.87, -12.39, -20.13, -6.1], [112, 8.92, -5.5, 8.92, -5.5, -6.26, -16.39, -9.47, -64.03, -37.12, -11.66, -11.34, -5.47], [118, 11.46, -6.09, 11.46, -6.09, -5.71, -15.53, -8.25, -64.98, -38.67, -10.4, -3.19, -4.44], [124, 13.95, -6.88, 13.95, -6.88, -4.92, -14.82, -6.34, -63.02, -40.44, -8.66, 3.08, -3.11], [130, 16.28, -7.83, 16.28, -7.83, -3.94, -14.18, -3.93, -59.03, -42.34, -6.54, 6.69, -1.58], [136, 18.34, -8.89, 18.34, -8.89, -2.8, -13.53, -1.22, -53.82, -44.28, -4.14, 7.31, 0.02], [142, 20, -10, 20, -10, -1.58, -12.8, 1.58, -47.79, -46.18, -1.58, 5.32, 1.58]], "701H_wF_L_Start_1": [[64, 1.11, -8.89, 1.11, -8.89, 1.39, -31.31, 1.39, -31.31, -33.74, 1.39, -33.74, 2.73], [70, 1.59, -7.83, 1.59, -7.83, 2.7, -29.01, 2.7, -29.01, -33.8, 2.7, -33.8, 5.3], [76, 1.45, -6.88, 1.45, -6.88, 3.85, -26.7, 3.85, -26.7, -33.81, 3.85, -33.81, 7.59], [82, 0.76, -6.09, 0.76, -6.09, 4.8, -24.47, 4.8, -24.47, -33.86, 4.8, -33.86, 9.49], [88, -0.46, -5.5, -0.46, -5.5, 6.81, -33.59, 5.65, -22.36, -35.2, 5.58, -33.99, 11.06], [94, -2.12, -5.13, -2.12, -5.13, 8.46, -43.21, 6.24, -20.46, -33.25, 6.11, -34.32, 12.09], [100, -4.14, -5, -4.14, -5, 9.54, -52.37, 6.53, -18.82, -27.95, 6.3, -34.93, 12.53], [106, -6.44, -5.13, -6.44, -5.13, 9.9, -59.71, 6.54, -17.47, -20.13, 6.1, -35.87, 12.39], [112, -8.92, -5.5, -8.92, -5.5, 9.47, -64.03, 6.26, -16.39, -11.34, 5.47, -37.12, 11.66], [118, -11.46, -6.09, -11.46, -6.09, 8.25, -64.98, 5.71, -15.53, -3.19, 4.44, -38.67, 10.4], [124, -13.95, -6.88, -13.95, -6.88, 6.34, -63.02, 4.92, -14.82, 3.08, 3.11, -40.44, 8.66], [130, -16.28, -7.83, -16.28, -7.83, 3.93, -59.03, 3.94, -14.18, 6.69, 1.58, -42.34, 6.54], [136, -18.34, -8.89, -18.34, -8.89, 1.22, -53.82, 2.8, -13.53, 7.31, -0.02, -44.28, 4.14], [142, -20, -10, -20, -10, -1.58, -47.79, 1.58, -12.8, 5.32, -1.58, -46.18, 1.58]], "702H_wF_L_Left_0": [[6, 15.52, -8.89, 15.52, -8.89, -0.35, -8.11, 2.81, -47.97, -47.41, -0.35, -0.27, 4.14], [12, 11.1, -7.83, 11.1, -7.83, 0.82, -3.06, 3.97, -47.4, -48.06, 0.82, -5.35, 6.57], [18, 6.79, -6.88, 6.79, -6.88, 1.87, 2.43, 5.01, -46.26, -48.02, 1.87, -10.07, 8.75], [24, 2.64, -6.09, 2.64, -6.09, 2.74, 8.52, 5.88, -44.66, -47.12, 2.74, -14.51, 10.57], [30, -1.28, -5.5, -1.28, -5.5, 4.86, -10.41, 6.53, -42.67, -57.78, 3.63, -18.7, 11.93], [36, -4.94, -5.13, -4.94, -5.13, 6.68, -29.43, 6.93, -40.37, -59.48, 4.33, -22.69, 12.78], [42, -8.28, -5, -8.28, -5, 7.96, -49.71, 7.07, -37.79, -51.51, 4.73, -26.5, 13.07], [48, -11.27, -5.13, -11.27, -5.13, 8.53, -67.62, 6.93, -34.97, -35.2, 4.73, -30.11, 12.78], [54, -13.87, -5.5, -13.87, -5.5, 8.28, -77.65, 6.53, -31.91, -16.64, 4.28, -33.53, 11.93], [60, -16.04, -6.09, -16.04, -6.09, 7.21, -78.77, 5.88, -28.61, -1.03, 3.41, -36.72, 10.57], [66, -17.76, -6.88, -17.76, -6.88, 5.48, -73.87, 5.01, -25.06, 9.64, 2.24, -39.64, 8.75], [72, -19, -7.83, -19, -7.83, 3.28, -66.16, 3.97, -21.26, 14.33, 0.93, -42.23, 6.57], [78, -19.75, -8.89, -19.75, -8.89, 0.86, -57.62, 2.81, -17.17, 12.4, -0.37, -44.43, 4.14], [84, -20, -10, -20, -10, -1.58, -47.79, 1.58, -12.8, 5.32, -1.58, -46.18, 1.58]], "703H_wF_L_Left_1": [[6, -19.75, -8.89, -19.75, -8.89, -2.19, -48.05, 0.96, -8.09, -0.32, -2.86, -47.39, 0.96], [12, -19, -7.83, -19, -7.83, -2.77, -47.62, 0.38, -3.07, -5.5, -4.08, -48.08, 0.38], [18, -17.76, -6.88, -17.76, -6.88, -3.3, -46.62, -0.14, 2.36, -10.32, -5.17, -48.12, -0.14], [24, -16.04, -6.09, -16.04, -6.09, -3.73, -45.15, -0.58, 8.36, -14.87, -6.08, -47.36, -0.58], [30, -13.87, -5.5, -13.87, -5.5, -4.06, -43.27, -0.91, -2.01, -19.16, -6.76, -48.12, -0.91], [36, -11.27, -5.13, -11.27, -5.13, -4.26, -41.02, -1.11, -10.96, -23.23, -7.19, -46.74, -1.11], [42, -8.28, -5, -8.28, -5, -4.33, -38.45, -1.18, -19, -27.07, -7.33, -43.81, -1.18], [48, -4.94, -5.13, -4.94, -5.13, -4.26, -35.57, -1.11, -26.26, -30.68, -7.19, -39.62, -1.11], [54, -1.28, -5.5, -1.28, -5.5, -4.06, -32.42, -0.91, -32.71, -34.05, -6.76, -34.35, -0.91], [60, 2.64, -6.09, 2.64, -6.09, -3.73, -28.99, -0.58, -38.27, -37.14, -6.08, -28.15, -0.58], [66, 6.79, -6.88, 6.79, -6.88, -3.3, -25.32, -3, -67.79, -39.94, -5.17, -20.75, -0.17], [72, 11.1, -7.83, 11.1, -7.83, -2.77, -21.4, -3.52, -78.93, -42.4, -4.08, 12.91, 0.48], [78, 15.52, -8.89, 15.52, -8.89, -2.19, -17.22, -1.7, -61.98, -44.5, -2.86, 32.46, 1.13], [84, 20, -10, 20, -10, -1.58, -12.8, 1.58, -47.79, -46.18, -1.58, 5.32, 1.58]], "704H_wF_L_0": [[6, 15.52, -8.89, 15.52, -8.89, -0.35, -7.21, 2.78, -46.51, -46.12, -0.35, 0.72, 4.12], [12, 11.1, -7.83, 11.1, -7.83, 0.81, -1.17, 3.91, -44.73, -45.31, 0.81, -3.49, 6.51], [18, 6.79, -6.88, 6.79, -6.88, 1.83, 5.54, 4.91, -42.6, -43.57, 1.83, -7.43, 8.65], [24, 2.64, -6.09, 2.64, -6.09, 2.67, 13.51, 5.72, -40.25, -40.34, 2.67, -11.17, 10.41], [30, -1.28, -5.5, -1.28, -5.5, 4.75, -7.71, 6.33, -37.79, -53.08, 3.51, -14.81, 11.74], [36, -4.94, -5.13, -4.94, -5.13, 6.52, -26.92, 6.71, -35.28, -55.37, 4.17, -18.4, 12.56], [42, -8.28, -5, -8.28, -5, 7.78, -46.61, 6.83, -32.78, -48.3, 4.54, -22.01, 12.83], [48, -11.27, -5.13, -11.27, -5.13, 8.34, -63.73, 6.71, -30.27, -33.26, 4.54, -25.64, 12.56], [54, -13.87, -5.5, -13.87, -5.5, 8.12, -73.52, 6.33, -27.75, -15.57, 4.12, -29.3, 11.74], [60, -16.04, -6.09, -16.04, -6.09, 7.1, -74.95, 5.72, -25.15, -0.17, 3.3, -32.96, 10.41], [66, -17.76, -6.88, -17.76, -6.88, 5.42, -70.56, 4.91, -22.42, 10.67, 2.18, -36.56, 8.65], [72, -19, -7.83, -19, -7.83, 3.27, -63.55, 3.91, -19.48, 15.48, 0.92, -40.02, 6.51], [78, -19.75, -8.89, -19.75, -8.89, 0.87, -56.13, 2.78, -16.29, 13.23, -0.37, -43.26, 4.12], [84, -20, -10, -20, -10, -1.58, -47.79, 1.58, -12.8, 5.32, -1.58, -46.18, 1.58]], "705H_wF_L_1": [[6, -19.75, -8.89, -19.75, -8.89, -2.78, -46.51, 0.35, -7.21, 0.72, -4.12, -46.12, 0.35], [12, -19, -7.83, -19, -7.83, -3.91, -44.73, -0.81, -1.17, -3.49, -6.51, -45.31, -0.81], [18, -17.76, -6.88, -17.76, -6.88, -4.91, -42.6, -1.83, 5.54, -7.43, -8.65, -43.57, -1.83], [24, -16.04, -6.09, -16.04, -6.09, -5.72, -40.25, -2.67, 13.51, -11.17, -10.41, -40.34, -2.67], [30, -13.87, -5.5, -13.87, -5.5, -6.33, -37.79, -4.75, -7.71, -14.81, -11.74, -53.08, -3.51], [36, -11.27, -5.13, -11.27, -5.13, -6.71, -35.28, -6.52, -26.92, -18.4, -12.56, -55.37, -4.17], [42, -8.28, -5, -8.28, -5, -6.83, -32.78, -7.78, -46.61, -22.01, -12.83, -48.3, -4.54], [48, -4.94, -5.13, -4.94, -5.13, -6.71, -30.27, -8.34, -63.73, -25.64, -12.56, -33.26, -4.54], [54, -1.28, -5.5, -1.28, -5.5, -6.33, -27.75, -8.12, -73.52, -29.3, -11.74, -15.57, -4.12], [60, 2.64, -6.09, 2.64, -6.09, -5.72, -25.15, -7.1, -74.95, -32.96, -10.41, -0.17, -3.3], [66, 6.79, -6.88, 6.79, -6.88, -4.91, -22.42, -5.42, -70.56, -36.56, -8.65, 10.67, -2.18], [72, 11.1, -7.83, 11.1, -7.83, -3.91, -19.48, -3.27, -63.55, -40.02, -6.51, 15.48, -0.92], [78, 15.52, -8.89, 15.52, -8.89, -2.78, -16.29, -0.87, -56.13, -43.26, -4.12, 13.23, 0.37], [84, 20, -10, 20, -10, -1.58, -12.8, 1.58, -47.79, -46.18, -1.58, 5.32, 1.58]], "706H_wF_L_Right_0": [[6, 15.52, -8.89, 15.52, -8.89, -0.96, -8.09, 2.19, -48.05, -47.39, -0.96, -0.32, 2.86], [12, 11.1, -7.83, 11.1, -7.83, -0.38, -3.07, 2.77, -47.62, -48.08, -0.38, -5.5, 4.08], [18, 6.79, -6.88, 6.79, -6.88, 0.14, 2.36, 3.3, -46.62, -48.12, 0.14, -10.32, 5.17], [24, 2.64, -6.09, 2.64, -6.09, 0.58, 8.36, 3.73, -45.15, -47.36, 0.58, -14.87, 6.08], [30, -1.28, -5.5, -1.28, -5.5, 0.91, -2.01, 4.06, -43.27, -48.12, 0.91, -19.16, 6.76], [36, -4.94, -5.13, -4.94, -5.13, 1.11, -10.96, 4.26, -41.02, -46.74, 1.11, -23.23, 7.19], [42, -8.28, -5, -8.28, -5, 1.18, -19, 4.33, -38.45, -43.81, 1.18, -27.07, 7.33], [48, -11.27, -5.13, -11.27, -5.13, 1.11, -26.26, 4.26, -35.57, -39.62, 1.11, -30.68, 7.19], [54, -13.87, -5.5, -13.87, -5.5, 0.91, -32.71, 4.06, -32.42, -34.35, 0.91, -34.05, 6.76], [60, -16.04, -6.09, -16.04, -6.09, 0.58, -38.27, 3.73, -28.99, -28.15, 0.58, -37.14, 6.08], [66, -17.76, -6.88, -17.76, -6.88, 3, -67.79, 3.3, -25.32, -20.75, 0.17, -39.94, 5.17], [72, -19, -7.83, -19, -7.83, 3.52, -78.93, 2.77, -21.4, 12.91, -0.48, -42.4, 4.08], [78, -19.75, -8.89, -19.75, -8.89, 1.7, -61.98, 2.19, -17.22, 32.46, -1.13, -44.5, 2.86], [84, -20, -10, -20, -10, -1.58, -47.79, 1.58, -12.8, 5.32, -1.58, -46.18, 1.58]], "707H_wF_L_Right_1": [[6, -19.75, -8.89, -19.75, -8.89, -2.81, -47.97, 0.35, -8.11, -0.27, -4.14, -47.41, 0.35], [12, -19, -7.83, -19, -7.83, -3.97, -47.4, -0.82, -3.06, -5.35, -6.57, -48.06, -0.82], [18, -17.76, -6.88, -17.76, -6.88, -5.01, -46.26, -1.87, 2.43, -10.07, -8.75, -48.02, -1.87], [24, -16.04, -6.09, -16.04, -6.09, -5.88, -44.66, -2.74, 8.52, -14.51, -10.57, -47.12, -2.74], [30, -13.87, -5.5, -13.87, -5.5, -6.53, -42.67, -4.86, -10.41, -18.7, -11.93, -57.78, -3.63], [36, -11.27, -5.13, -11.27, -5.13, -6.93, -40.37, -6.68, -29.43, -22.69, -12.78, -59.48, -4.33], [42, -8.28, -5, -8.28, -5, -7.07, -37.79, -7.96, -49.71, -26.5, -13.07, -51.51, -4.73], [48, -4.94, -5.13, -4.94, -5.13, -6.93, -34.97, -8.53, -67.62, -30.11, -12.78, -35.2, -4.73], [54, -1.28, -5.5, -1.28, -5.5, -6.53, -31.91, -8.28, -77.65, -33.53, -11.93, -16.64, -4.28], [60, 2.64, -6.09, 2.64, -6.09, -5.88, -28.61, -7.21, -78.77, -36.72, -10.57, -1.03, -3.41], [66, 6.79, -6.88, 6.79, -6.88, -5.01, -25.06, -5.48, -73.87, -39.64, -8.75, 9.64, -2.24], [72, 11.1, -7.83, 11.1, -7.83, -3.97, -21.26, -3.28, -66.16, -42.23, -6.57, 14.33, -0.93], [78, 15.52, -8.89, 15.52, -8.89, -2.81, -17.17, -0.86, -57.62, -44.43, -4.14, 12.4, 0.37], [84, 20, -10, 20, -10, -1.58, -12.8, 1.58, -47.79, -46.18, -1.58, 5.32, 1.58]], "708H_wF_L_End_0": [[6, 19.75, -8.89, 19.75, -8.89, -0.69, -9.62, 2.44, -46.43, -45.62, -0.69, 3.51, 3.77], [12, 17.64, -7.83, 17.64, -7.83, 0.29, -5.39, 3.08, -45.05, -44.99, 0.29, 0.72, 5.69], [18, 15.22, -6.88, 15.22, -6.88, 1.17, -0.93, 3.64, -43.6, -44.01, 1.17, -1.99, 7.38], [24, 12.6, -6.09, 12.6, -6.09, 1.93, 3.81, 4.07, -42.14, -42.66, 1.93, -4.69, 8.76], [30, 9.91, -5.5, 9.91, -5.5, 3.71, -6.23, 4.51, -40.73, -49.69, 2.48, -7.39, 9.92], [36, 7.25, -5.13, 7.25, -5.13, 5.39, -16.22, 4.63, -39.47, -53.48, 3.04, -10.22, 10.48], [42, 4.73, -5, 4.73, -5, 6.65, -26.24, 4.57, -38.35, -54.03, 3.42, -13.16, 10.57], [48, 2.47, -5.13, 2.47, -5.13, 7.36, -35.6, 4.32, -37.36, -51.54, 3.56, -16.22, 10.17], [54, 0.55, -5.5, 0.55, -5.5, 7.45, -43.11, 3.9, -36.45, -46.98, 3.45, -19.41, 9.31], [60, -0.94, -6.09, -0.94, -6.09, 6.89, -47.63, 3.31, -35.59, -41.92, 3.09, -22.67, 8], [66, -1.94, -6.88, -1.94, -6.88, 5.76, -48.56, 2.56, -34.69, -37.89, 2.53, -25.99, 6.3], [72, -2.38, -7.83, -2.38, -7.83, 4.01, -45.91, 1.84, -33.7, -35.7, 1.66, -29.3, 4.45], [78, -2.22, -8.89, -2.22, -8.89, 1.98, -40, 1.03, -32.56, -35.28, 0.75, -32.56, 2.36], [84, -1.43, -10, -1.43, -10, -0.16, -31.24, 0.16, -31.24, -35.74, -0.16, -35.74, 0.16]], "709H_wF_L_End_1": [[6, -19.75, -8.89, -19.75, -8.89, -2.44, -46.43, 0.69, -9.62, 3.51, -3.77, -45.62, 0.69], [12, -17.64, -7.83, -17.64, -7.83, -3.08, -45.05, -0.29, -5.39, 0.72, -5.69, -44.99, -0.29], [18, -15.22, -6.88, -15.22, -6.88, -3.64, -43.6, -1.17, -0.93, -1.99, -7.38, -44.01, -1.17], [24, -12.6, -6.09, -12.6, -6.09, -4.07, -42.14, -1.93, 3.81, -4.69, -8.76, -42.66, -1.93], [30, -9.91, -5.5, -9.91, -5.5, -4.51, -40.73, -3.71, -6.23, -7.39, -9.92, -49.69, -2.48], [36, -7.25, -5.13, -7.25, -5.13, -4.63, -39.47, -5.39, -16.22, -10.22, -10.48, -53.48, -3.04], [42, -4.73, -5, -4.73, -5, -4.57, -38.35, -6.65, -26.24, -13.16, -10.57, -54.03, -3.42], [48, -2.47, -5.13, -2.47, -5.13, -4.32, -37.36, -7.36, -35.6, -16.22, -10.17, -51.54, -3.56], [54, -0.55, -5.5, -0.55, -5.5, -3.9, -36.45, -7.45, -43.11, -19.41, -9.31, -46.98, -3.45], [60, 0.94, -6.09, 0.94, -6.09, -3.31, -35.59, -6.89, -47.63, -22.67, -8, -41.92, -3.09], [66, 1.94, -6.88, 1.94, -6.88, -2.56, -34.69, -5.76, -48.56, -25.99, -6.3, -37.89, -2.53], [72, 2.38, -7.83, 2.38, -7.83, -1.84, -33.7, -4.01, -45.91, -29.3, -4.45, -35.7, -1.66], [78, 2.22, -8.89, 2.22, -8.89, -1.03, -32.56, -1.98, -40, -32.56, -2.36, -35.28, -0.75], [84, 1.43, -10, 1.43, -10, -0.16, -31.24, 0.16, -31.24, -35.74, -0.16, -35.74, 0.16]], "710H_wF_H_Start_0": [[64, -0.73, -8.29, -0.73, -8.29, -3.78, -21.36, -3.78, -21.36, -24.82, -3.78, -24.82, -3.78], [69, -0.7, -6.79, -0.7, -6.79, -7.08, -18.4, -7.26, -24.58, -25.26, -7.08, -28.29, -7.26], [74, 0, -5.67, 0, -5.67, -9.5, -15.13, -9.95, -28.22, -25.32, -9.5, -29.31, -9.95], [79, 1.27, -5.08, 1.27, -5.08, -10.78, -12.1, -11.44, -32.51, -25.58, -10.78, -27.71, -11.44], [84, 2.96, -5.08, 2.96, -5.08, -10.78, -9.77, -11.5, -36.98, -26.58, -10.78, -23.45, -11.5], [89, 4.88, -5.67, 4.88, -5.67, -9.5, -8.19, -10.09, -40.56, -28.41, -9.5, -16.69, -10.09], [94, 6.84, -6.79, 6.84, -6.79, -7.08, -6.92, -7.42, -41.81, -30.63, -7.08, -7.71, -7.42], [99, 8.62, -8.29, 8.62, -8.29, -3.78, -5.33, -3.88, -38.97, -32.51, -3.78, 3.72, -3.88], [104, 10, -10, 10, -10, 0, -2.91, 0, -24.44, -33.42, 0, 24.44, 0]], "711H_wF_H_Start_1": [[64, 0.73, -8.29, 0.73, -8.29, 3.78, -21.36, 3.78, -21.36, -24.82, 3.78, -24.82, 3.78], [69, 0.7, -6.79, 0.7, -6.79, 7.26, -24.58, 7.08, -18.4, -28.29, 7.26, -25.26, 7.08], [74, 0, -5.67, 0, -5.67, 9.95, -28.22, 9.5, -15.13, -29.31, 9.95, -25.32, 9.5], [79, -1.27, -5.08, -1.27, -5.08, 11.44, -32.51, 10.78, -12.1, -27.71, 11.44, -25.58, 10.78], [84, -2.96, -5.08, -2.96, -5.08, 11.5, -36.98, 10.78, -9.77, -23.45, 11.5, -26.58, 10.78], [89, -4.88, -5.67, -4.88, -5.67, 10.09, -40.56, 9.5, -8.19, -16.69, 10.09, -28.41, 9.5], [94, -6.84, -6.79, -6.84, -6.79, 7.42, -41.81, 7.08, -6.92, -7.71, 7.42, -30.63, 7.08], [99, -8.62, -8.29, -8.62, -8.29, 3.88, -38.97, 3.78, -5.33, 3.72, 3.88, -32.51, 3.78], [104, -10, -10, -10, -10, 0, -24.44, 0, -2.91, 24.44, 0, -33.42, 0]], "712H_wF_H_Left_0": [[5, 6.53, -8.29, 6.53, -8.29, 3.03, 6.33, 3.03, -31.85, -32.54, 3.03, 9.06, 4.05], [10, 3.16, -6.79, 3.16, -6.79, 7.66, -15.1, 5.68, -32.21, -46.35, 6.13, 0.23, 7.6], [15, 0, -5.67, 0, -5.67, 11.65, -39.5, 7.63, -30.32, -42.7, 8.82, -6.66, 10.23], [20, -2.86, -5.08, -2.86, -5.08, 14.2, -61.73, 8.66, -27.42, -20.94, 10.5, -12.7, 11.61], [25, -5.32, -5.08, -5.32, -5.08, 14.69, -67.38, 8.66, -23.98, 9.76, 10.69, -18.29, 11.61], [30, -7.32, -5.67, -7.32, -5.67, 12.96, -47.17, 7.63, -20.06, 47.17, 9.26, -23.49, 10.23], [35, -8.79, -6.79, -8.79, -6.79, 9.4, -47.68, 5.68, -15.48, 47.68, 6.57, -28.07, 7.6], [40, -9.7, -8.29, -9.7, -8.29, 4.8, -40.66, 3.03, -9.9, 40.66, 3.27, -31.59, 4.05], [45, -10, -10, -10, -10, 0, -24.44, 0, -2.91, 24.44, 0, -33.42, 0]], "713H_wF_H_Left_1": [[5, -9.7, -8.29, -9.7, -8.29, -1.51, -32.24, -1.51, 6.04, 8.73, -2.03, -32.88, -1.51], [10, -8.79, -6.79, -8.79, -6.79, -2.85, -33.22, -2.85, -4.59, -0.62, -3.81, -32.89, -2.85], [15, -7.32, -5.67, -7.32, -5.67, -3.83, -31.91, -3.83, -12.98, -8.03, -5.13, -30.16, -3.83], [20, -5.32, -5.08, -5.32, -5.08, -4.35, -29.29, -4.35, -19.96, -14.39, -5.83, -25.72, -4.35], [25, -2.86, -5.08, -2.86, -5.08, -4.35, -25.72, -4.35, -25.72, -19.96, -5.83, -19.96, -4.35], [30, 0, -5.67, 0, -5.67, -3.83, -21.35, -3.83, -30.16, -24.81, -5.13, -12.98, -3.83], [35, 3.16, -6.79, 3.16, -6.79, -2.85, -16.17, -2.85, -32.89, -28.83, -3.81, -4.59, -2.85], [40, 6.53, -8.29, 6.53, -8.29, -1.51, -10.1, -5.88, -51, -31.82, -2.03, 51, -1.88], [45, 10, -10, 10, -10, 0, -2.91, 0, -24.44, -33.42, 0, 24.44, 0]], "714H_wF_H_0": [[5, 6.53, -8.29, 6.53, -8.29, 2.99, 10.06, 2.99, -26.64, -28.26, 2.99, 13.7, 4.02], [10, 3.16, -6.79, 3.16, -6.79, 7.52, -12.55, 5.56, -25.06, -42.87, 5.99, 6.51, 7.49], [15, 0, -5.67, 0, -5.67, 11.37, -36.36, 7.42, -21.86, -39.42, 8.55, 0.95, 10.02], [20, -2.86, -5.08, -2.86, -5.08, 13.82, -57.3, 8.4, -18.66, -18.55, 10.12, -4.54, 11.35], [25, -5.32, -5.08, -5.32, -5.08, 14.29, -61.73, 8.4, -16.01, 12.23, 10.29, -10.55, 11.35], [30, -7.32, -5.67, -7.32, -5.67, 12.66, -45.75, 7.42, -13.69, 45.75, 8.96, -16.99, 10.02], [35, -8.79, -6.79, -8.79, -6.79, 9.24, -46.68, 5.56, -11.11, 46.68, 6.42, -23.35, 7.49], [40, -9.7, -8.29, -9.7, -8.29, 4.76, -40.17, 2.99, -7.67, 40.17, 3.23, -29.03, 4.02], [45, -10, -10, -10, -10, 0, -24.44, 0, -2.91, 24.44, 0, -33.42, 0]], "715H_wF_H_1": [[5, -9.7, -8.29, -9.7, -8.29, -2.99, -26.64, -2.99, 10.06, 13.7, -4.02, -28.26, -2.99], [10, -8.79, -6.79, -8.79, -6.79, -5.56, -25.06, -7.52, -12.55, 6.51, -7.49, -42.87, -5.99], [15, -7.32, -5.67, -7.32, -5.67, -7.42, -21.86, -11.37, -36.36, 0.95, -10.02, -39.42, -8.55], [20, -5.32, -5.08, -5.32, -5.08, -8.4, -18.66, -13.82, -57.3, -4.54, -11.35, -18.55, -10.12], [25, -2.86, -5.08, -2.86, -5.08, -8.4, -16.01, -14.29, -61.73, -10.55, -11.35, 12.23, -10.29], [30, 0, -5.67, 0, -5.67, -7.42, -13.69, -12.66, -45.75, -16.99, -10.02, 45.75, -8.96], [35, 3.16, -6.79, 3.16, -6.79, -5.56, -11.11, -9.24, -46.68, -23.35, -7.49, 46.68, -6.42], [40, 6.53, -8.29, 6.53, -8.29, -2.99, -7.67, -4.76, -40.17, -29.03, -4.02, 40.17, -3.23], [45, 10, -10, 10, -10, 0, -2.91, 0, -24.44, -33.42, 0, 24.44, 0]], "716H_wF_H_Right_0": [[5, 6.53, -8.29, 6.53, -8.29, 1.5, 9.63, 1.5, -27.28, -28.74, 1.5, 13.12, 2.01], [10, 3.16, -6.79, 3.16, -6.79, 2.79, 0.41, 2.79, -26.62, -27.12, 2.79, 5.1, 3.75], [15, 0, -5.67, 0, -5.67, 3.73, -6.8, 3.73, -24.3, -23.34, 3.73, -1.3, 5.03], [20, -2.86, -5.08, -2.86, -5.08, 4.22, -13, 4.22, -21.48, -18.51, 4.22, -7.2, 5.7], [25, -5.32, -5.08, -5.32, -5.08, 4.22, -18.51, 4.22, -18.51, -13, 4.22, -13, 5.7], [30, -7.32, -5.67, -7.32, -5.67, 3.73, -23.34, 3.73, -15.4, -6.8, 3.73, -18.73, 5.03], [35, -8.79, -6.79, -8.79, -6.79, 2.79, -27.12, 2.79, -11.95, 0.41, 2.79, -24.26, 3.75], [40, -9.7, -8.29, -9.7, -8.29, 5.85, -50.41, 1.5, -7.89, 50.41, 1.85, -29.28, 2.01], [45, -10, -10, -10, -10, 0, -24.44, 0, -2.91, 24.44, 0, -33.42, 0]], "717H_wF_H_Right_1": [[5, -9.7, -8.29, -9.7, -8.29, -2.99, -26.64, -2.99, 10.06, 13.7, -4.02, -28.26, -2.99], [10, -8.79, -6.79, -8.79, -6.79, -5.56, -25.06, -7.52, -12.55, 6.51, -7.49, -42.87, -5.99], [15, -7.32, -5.67, -7.32, -5.67, -7.42, -21.86, -11.37, -36.36, 0.95, -10.02, -39.42, -8.55], [20, -5.32, -5.08, -5.32, -5.08, -8.4, -18.66, -13.82, -57.3, -4.54, -11.35, -18.55, -10.12], [25, -2.86, -5.08, -2.86, -5.08, -8.4, -16.01, -14.29, -61.73, -10.55, -11.35, 12.23, -10.29], [30, 0, -5.67, 0, -5.67, -7.42, -13.69, -12.66, -45.75, -16.99, -10.02, 45.75, -8.96], [35, 3.16, -6.79, 3.16, -6.79, -5.56, -11.11, -9.24, -46.68, -23.35, -7.49, 46.68, -6.42], [40, 6.53, -8.29, 6.53, -8.29, -2.99, -7.67, -4.76, -40.17, -29.03, -4.02, 40.17, -3.23], [45, 10, -10, 10, -10, 0, -2.91, 0, -24.44, -33.42, 0, 24.44, 0]], "718H_wF_H_End_0": [[5, 9.7, -8.29, 9.7, -8.29, 1.25, 4.15, 1.25, -22.18, -30.11, 1.25, 22.18, 2.27], [10, 7.82, -6.79, 7.82, -6.79, 3.91, -4.51, 2.32, -19.94, -34.06, 2.38, 19.94, 4.25], [15, 5.69, -5.67, 5.69, -5.67, 6.08, -16.43, 3.11, -17.75, -33.63, 3.25, 17.75, 5.71], [20, 3.55, -5.08, 3.55, -5.08, 7.43, -28.32, 3.52, -20.02, -27.57, 3.73, 11.23, 6.47], [25, 1.59, -5.08, 1.59, -5.08, 7.75, -36.78, 3.52, -22.54, -17.6, 3.75, 4.57, 6.47], [30, 0, -5.67, 0, -5.67, 6.99, -40.06, 3.11, -24.53, -7.98, 3.3, -1.5, 5.71], [35, -1.05, -6.79, -1.05, -6.79, 5.26, -39.35, 2.32, -26.21, -3.63, 2.43, -7.29, 4.25], [40, -1.45, -8.29, -1.45, -8.29, 2.81, -36.14, 1.25, -27.48, -7.64, 1.28, -12.75, 2.27], [45, -1.11, -10, -1.11, -10, 0, -28.2, 0, -28.2, -17.81, 0, -17.81, 0]], "719H_wF_H_End_1": [[5, -9.7, -8.29, -9.7, -8.29, -1.25, -22.18, -1.25, 4.15, 22.18, -2.27, -30.11, -1.25], [10, -7.82, -6.79, -7.82, -6.79, -2.32, -19.94, -3.91, -4.51, 19.94, -4.25, -34.06, -2.38], [15, -5.69, -5.67, -5.69, -5.67, -3.11, -17.75, -6.08, -16.43, 17.75, -5.71, -33.63, -3.25], [20, -3.55, -5.08, -3.55, -5.08, -3.52, -20.02, -7.43, -28.32, 11.23, -6.47, -27.57, -3.73], [25, -1.59, -5.08, -1.59, -5.08, -3.52, -22.54, -7.75, -36.78, 4.57, -6.47, -17.6, -3.75], [30, 0, -5.67, 0, -5.67, -3.11, -24.53, -6.99, -40.06, -1.5, -5.71, -7.98, -3.3], [35, 1.05, -6.79, 1.05, -6.79, -2.32, -26.21, -5.26, -39.35, -7.29, -4.25, -3.63, -2.43], [40, 1.45, -8.29, 1.45, -8.29, -1.25, -27.48, -2.81, -36.14, -12.75, -2.27, -7.64, -1.28], [45, 1.11, -10, 1.11, -10, 0, -28.2, 0, -28.2, -17.81, 0, -17.81, 0]], "720H_wR_L_Start_0": [[64, 1.11, -8.89, 1.11, -8.89, -1.4, -29.21, -1.4, -29.21, -37.38, -2.74, -37.38, -1.4], [70, 1.59, -7.83, 1.59, -7.83, -2.74, -30.88, -2.74, -30.88, -35.78, -5.34, -35.78, -2.74], [76, 1.45, -6.88, 1.45, -6.88, -3.93, -32.44, -3.93, -32.44, -34.07, -7.67, -34.07, -3.93], [82, 0.76, -6.09, 0.76, -6.09, -4.92, -33.9, -4.92, -33.9, -32.27, -9.61, -32.27, -4.92], [88, -0.46, -5.5, -0.46, -5.5, -5.83, -35.26, -6.37, -35.72, -30.38, -11.23, -40.22, -5.76], [94, -2.12, -5.13, -2.12, -5.13, -6.44, -36.58, -7.5, -36.09, -28.48, -12.29, -47.45, -6.33], [100, -4.14, -5, -4.14, -5, -6.76, -37.88, -8.16, -34.96, -26.58, -12.76, -53.74, -6.54], [106, -6.44, -5.13, -6.44, -5.13, -6.76, -39.2, -8.23, -32.42, -24.69, -12.6, -58.78, -6.33], [112, -8.92, -5.5, -8.92, -5.5, -6.45, -40.51, -7.66, -28.68, -22.81, -11.86, -62.21, -5.66], [118, -11.46, -6.09, -11.46, -6.09, -5.86, -41.81, -6.48, -23.97, -20.93, -10.55, -63.73, -4.58], [124, -13.95, -6.88, -13.95, -6.88, -5.03, -43.07, -4.8, -18.42, -19.01, -8.77, -63.15, -3.18], [130, -16.28, -7.83, -16.28, -7.83, -4, -44.24, -2.78, -12, -17.03, -6.6, -60.43, -1.61], [136, -18.34, -8.89, -18.34, -8.89, -2.82, -45.29, -0.6, -4.38, -14.97, -4.16, -55.49, 0.02], [142, -20, -10, -20, -10, -1.58, -46.18, 1.58, 5.32, -12.8, -1.58, -47.79, 1.58]], "721H_wR_L_Start_1": [[64, -1.11, -8.89, -1.11, -8.89, 1.4, -29.21, 1.4, -29.21, -37.38, 1.4, -37.38, 2.74], [70, -1.59, -7.83, -1.59, -7.83, 2.74, -30.88, 2.74, -30.88, -35.78, 2.74, -35.78, 5.34], [76, -1.45, -6.88, -1.45, -6.88, 3.93, -32.44, 3.93, -32.44, -34.07, 3.93, -34.07, 7.67], [82, -0.76, -6.09, -0.76, -6.09, 4.92, -33.9, 4.92, -33.9, -32.27, 4.92, -32.27, 9.61], [88, 0.46, -5.5, 0.46, -5.5, 6.37, -35.72, 5.83, -35.26, -40.22, 5.76, -30.38, 11.23], [94, 2.12, -5.13, 2.12, -5.13, 7.5, -36.09, 6.44, -36.58, -47.45, 6.33, -28.48, 12.29], [100, 4.14, -5, 4.14, -5, 8.16, -34.96, 6.76, -37.88, -53.74, 6.54, -26.58, 12.76], [106, 6.44, -5.13, 6.44, -5.13, 8.23, -32.42, 6.76, -39.2, -58.78, 6.33, -24.69, 12.6], [112, 8.92, -5.5, 8.92, -5.5, 7.66, -28.68, 6.45, -40.51, -62.21, 5.66, -22.81, 11.86], [118, 11.46, -6.09, 11.46, -6.09, 6.48, -23.97, 5.86, -41.81, -63.73, 4.58, -20.93, 10.55], [124, 13.95, -6.88, 13.95, -6.88, 4.8, -18.42, 5.03, -43.07, -63.15, 3.18, -19.01, 8.77], [130, 16.28, -7.83, 16.28, -7.83, 2.78, -12, 4, -44.24, -60.43, 1.61, -17.03, 6.6], [136, 18.34, -8.89, 18.34, -8.89, 0.6, -4.38, 2.82, -45.29, -55.49, -0.02, -14.97, 4.16], [142, 20, -10, 20, -10, -1.58, 5.32, 1.58, -46.18, -47.79, -1.58, -12.8, 1.58]], "722H_wR_L_Left_0": [[6, -15.52, -8.89, -15.52, -8.89, 0, -47.42, 3.16, -0.23, -8.11, 0, -47.91, 4.49], [12, -11.1, -7.83, -11.1, -7.83, 1.5, -48.02, 4.65, -5.25, -3.03, 1.5, -47.25, 7.25], [18, -6.79, -6.88, -6.79, -6.88, 2.85, -47.88, 5.99, -9.88, 2.52, 2.85, -45.99, 9.73], [24, -2.64, -6.09, -2.64, -6.09, 3.97, -46.84, 7.1, -14.22, 8.71, 3.97, -44.27, 11.79], [30, 1.28, -5.5, 1.28, -5.5, 5.75, -57.94, 7.93, -18.34, -7.93, 5.14, -42.2, 13.33], [36, 4.94, -5.13, 4.94, -5.13, 7.24, -63.27, 8.44, -22.26, -20.79, 6.06, -39.85, 14.29], [42, 8.28, -5, 8.28, -5, 8.22, -64.46, 8.62, -26.04, -32.39, 6.6, -37.27, 14.62], [48, 11.27, -5.13, 11.27, -5.13, 8.53, -61.62, 8.44, -29.66, -43.2, 6.62, -34.49, 14.29], [54, 13.87, -5.5, 13.87, -5.5, 8.05, -55.08, 7.93, -33.13, -52.77, 6.05, -31.51, 13.33], [60, 16.04, -6.09, 16.04, -6.09, 6.84, -45.84, 7.1, -36.39, -59.89, 4.93, -28.31, 11.79], [66, 17.76, -6.88, 17.76, -6.88, 5.04, -35.11, 5.99, -39.41, -63.4, 3.42, -24.87, 9.73], [72, 19, -7.83, 19, -7.83, 2.89, -23.52, 4.65, -42.1, -62.82, 1.71, -21.15, 7.25], [78, 19.75, -8.89, 19.75, -8.89, 0.62, -10.74, 3.16, -44.38, -58.02, 0, -17.14, 4.49], [84, 20, -10, 20, -10, -1.58, 5.32, 1.58, -46.18, -47.79, -1.58, -12.8, 1.58]], "723H_wR_L_Left_1": [[6, 19.75, -8.89, 19.75, -8.89, -2.37, -0.31, 0.79, -47.4, -48.03, -3.03, -8.1, 0.79], [12, 19, -7.83, 19, -7.83, -3.12, -5.46, 0.04, -48.08, -47.56, -4.42, -3.07, 0.04], [18, 17.76, -6.88, 17.76, -6.88, -3.79, -10.26, -0.64, -48.11, -46.53, -5.66, 2.36, -0.64], [24, 16.04, -6.09, 16.04, -6.09, -4.35, -14.78, -1.2, -47.32, -45.03, -6.69, 8.38, -1.2], [30, 13.87, -5.5, 13.87, -5.5, -4.77, -19.05, -1.62, -48.07, -43.13, -7.47, -1.97, -1.62], [36, 11.27, -5.13, 11.27, -5.13, -5.03, -23.1, -1.88, -46.68, -40.87, -7.95, -10.92, -1.88], [42, 8.28, -5, 8.28, -5, -5.12, -26.94, -1.97, -43.75, -38.29, -8.12, -18.96, -1.97], [48, 4.94, -5.13, 4.94, -5.13, -5.03, -30.55, -1.88, -39.57, -35.43, -7.95, -26.22, -1.88], [54, 1.28, -5.5, 1.28, -5.5, -4.77, -33.93, -1.62, -34.32, -32.3, -7.47, -32.68, -1.62], [60, -2.64, -6.09, -2.64, -6.09, -4.35, -37.04, -1.2, -28.13, -28.9, -6.69, -38.25, -1.2], [66, -6.79, -6.88, -6.79, -6.88, -3.79, -39.86, -0.64, -21.11, -25.26, -5.66, -42.78, -0.64], [72, -11.1, -7.83, -11.1, -7.83, -3.12, -42.36, 0.04, -13.3, -21.36, -4.42, -46.09, 0.04], [78, -15.52, -8.89, -15.52, -8.89, -2.37, -44.48, 0.79, -4.61, -17.21, -3.03, -47.92, 0.79], [84, -20, -10, -20, -10, -1.58, -46.18, 1.58, 5.32, -12.8, -1.58, -47.79, 1.58]], "724H_wR_L_0": [[6, -15.52, -8.89, -15.52, -8.89, 0, -47.42, 3.16, -0.23, -8.11, 0, -47.91, 4.49], [12, -11.1, -7.83, -11.1, -7.83, 1.5, -48.02, 4.65, -5.25, -3.03, 1.5, -47.25, 7.25], [18, -6.79, -6.88, -6.79, -6.88, 2.85, -47.88, 5.99, -9.88, 2.52, 2.85, -45.99, 9.73], [24, -2.64, -6.09, -2.64, -6.09, 3.97, -46.84, 7.1, -14.22, 8.71, 3.97, -44.27, 11.79], [30, 1.28, -5.5, 1.28, -5.5, 5.75, -57.94, 7.93, -18.34, -7.93, 5.14, -42.2, 13.33], [36, 4.94, -5.13, 4.94, -5.13, 7.24, -63.27, 8.44, -22.26, -20.79, 6.06, -39.85, 14.29], [42, 8.28, -5, 8.28, -5, 8.22, -64.46, 8.62, -26.04, -32.39, 6.6, -37.27, 14.62], [48, 11.27, -5.13, 11.27, -5.13, 8.53, -61.62, 8.44, -29.66, -43.2, 6.62, -34.49, 14.29], [54, 13.87, -5.5, 13.87, -5.5, 8.05, -55.08, 7.93, -33.13, -52.77, 6.05, -31.51, 13.33], [60, 16.04, -6.09, 16.04, -6.09, 6.84, -45.84, 7.1, -36.39, -59.89, 4.93, -28.31, 11.79], [66, 17.76, -6.88, 17.76, -6.88, 5.04, -35.11, 5.99, -39.41, -63.4, 3.42, -24.87, 9.73], [72, 19, -7.83, 19, -7.83, 2.89, -23.52, 4.65, -42.1, -62.82, 1.71, -21.15, 7.25], [78, 19.75, -8.89, 19.75, -8.89, 0.62, -10.74, 3.16, -44.38, -58.02, 0, -17.14, 4.49], [84, 20, -10, 20, -10, -1.58, 5.32, 1.58, -46.18, -47.79, -1.58, -12.8, 1.58]], "725H_wR_L_1": [[6, 19.75, -8.89, 19.75, -8.89, -3.16, -0.23, 0, -47.42, -47.91, -4.49, -8.11, 0], [12, 19, -7.83, 19, -7.83, -4.65, -5.25, -1.5, -48.02, -47.25, -7.25, -3.03, -1.5], [18, 17.76, -6.88, 17.76, -6.88, -5.99, -9.88, -2.85, -47.88, -45.99, -9.73, 2.52, -2.85], [24, 16.04, -6.09, 16.04, -6.09, -7.1, -14.22, -3.97, -46.84, -44.27, -11.79, 8.71, -3.97], [30, 13.87, -5.5, 13.87, -5.5, -7.93, -18.34, -5.75, -57.94, -42.2, -13.33, -7.93, -5.14], [36, 11.27, -5.13, 11.27, -5.13, -8.44, -22.26, -7.24, -63.27, -39.85, -14.29, -20.79, -6.06], [42, 8.28, -5, 8.28, -5, -8.62, -26.04, -8.22, -64.46, -37.27, -14.62, -32.39, -6.6], [48, 4.94, -5.13, 4.94, -5.13, -8.44, -29.66, -8.53, -61.62, -34.49, -14.29, -43.2, -6.62], [54, 1.28, -5.5, 1.28, -5.5, -7.93, -33.13, -8.05, -55.08, -31.51, -13.33, -52.77, -6.05], [60, -2.64, -6.09, -2.64, -6.09, -7.1, -36.39, -6.84, -45.84, -28.31, -11.79, -59.89, -4.93], [66, -6.79, -6.88, -6.79, -6.88, -5.99, -39.41, -5.04, -35.11, -24.87, -9.73, -63.4, -3.42], [72, -11.1, -7.83, -11.1, -7.83, -4.65, -42.1, -2.89, -23.52, -21.15, -7.25, -62.82, -1.71], [78, -15.52, -8.89, -15.52, -8.89, -3.16, -44.38, -0.62, -10.74, -17.14, -4.49, -58.02, 0], [84, -20, -10, -20, -10, -1.58, -46.18, 1.58, 5.32, -12.8, -1.58, -47.79, 1.58]], "726H_wR_L_Right_0": [[6, -15.52, -8.89, -15.52, -8.89, -0.79, -47.4, 2.37, -0.31, -8.1, -0.79, -48.03, 3.03], [12, -11.1, -7.83, -11.1, -7.83, -0.04, -48.08, 3.12, -5.46, -3.07, -0.04, -47.56, 4.42], [18, -6.79, -6.88, -6.79, -6.88, 0.64, -48.11, 3.79, -10.26, 2.36, 0.64, -46.53, 5.66], [24, -2.64, -6.09, -2.64, -6.09, 1.2, -47.32, 4.35, -14.78, 8.38, 1.2, -45.03, 6.69], [30, 1.28, -5.5, 1.28, -5.5, 1.62, -48.07, 4.77, -19.05, -1.97, 1.62, -43.13, 7.47], [36, 4.94, -5.13, 4.94, -5.13, 1.88, -46.68, 5.03, -23.1, -10.92, 1.88, -40.87, 7.95], [42, 8.28, -5, 8.28, -5, 1.97, -43.75, 5.12, -26.94, -18.96, 1.97, -38.29, 8.12], [48, 11.27, -5.13, 11.27, -5.13, 1.88, -39.57, 5.03, -30.55, -26.22, 1.88, -35.43, 7.95], [54, 13.87, -5.5, 13.87, -5.5, 1.62, -34.32, 4.77, -33.93, -32.68, 1.62, -32.3, 7.47], [60, 16.04, -6.09, 16.04, -6.09, 1.2, -28.13, 4.35, -37.04, -38.25, 1.2, -28.9, 6.69], [66, 17.76, -6.88, 17.76, -6.88, 0.64, -21.11, 3.79, -39.86, -42.78, 0.64, -25.26, 5.66], [72, 19, -7.83, 19, -7.83, -0.04, -13.3, 3.12, -42.36, -46.09, -0.04, -21.36, 4.42], [78, 19.75, -8.89, 19.75, -8.89, -0.79, -4.61, 2.37, -44.48, -47.92, -0.79, -17.21, 3.03], [84, 20, -10, 20, -10, -1.58, 5.32, 1.58, -46.18, -47.79, -1.58, -12.8, 1.58]], "727H_wR_L_Right_1": [[6, 19.75, -8.89, 19.75, -8.89, -3.16, -0.23, 0, -47.42, -47.91, -4.49, -8.11, 0], [12, 19, -7.83, 19, -7.83, -4.65, -5.25, -1.5, -48.02, -47.25, -7.25, -3.03, -1.5], [18, 17.76, -6.88, 17.76, -6.88, -5.99, -9.88, -2.85, -47.88, -45.99, -9.73, 2.52, -2.85], [24, 16.04, -6.09, 16.04, -6.09, -7.1, -14.22, -3.97, -46.84, -44.27, -11.79, 8.71, -3.97], [30, 13.87, -5.5, 13.87, -5.5, -7.93, -18.34, -5.75, -57.94, -42.2, -13.33, -7.93, -5.14], [36, 11.27, -5.13, 11.27, -5.13, -8.44, -22.26, -7.24, -63.27, -39.85, -14.29, -20.79, -6.06], [42, 8.28, -5, 8.28, -5, -8.62, -26.04, -8.22, -64.46, -37.27, -14.62, -32.39, -6.6], [48, 4.94, -5.13, 4.94, -5.13, -8.44, -29.66, -8.53, -61.62, -34.49, -14.29, -43.2, -6.62], [54, 1.28, -5.5, 1.28, -5.5, -7.93, -33.13, -8.05, -55.08, -31.51, -13.33, -52.77, -6.05], [60, -2.64, -6.09, -2.64, -6.09, -7.1, -36.39, -6.84, -45.84, -28.31, -11.79, -59.89, -4.93], [66, -6.79, -6.88, -6.79, -6.88, -5.99, -39.41, -5.04, -35.11, -24.87, -9.73, -63.4, -3.42], [72, -11.1, -7.83, -11.1, -7.83, -4.65, -42.1, -2.89, -23.52, -21.15, -7.25, -62.82, -1.71], [78, -15.52, -8.89, -15.52, -8.89, -3.16, -44.38, -0.62, -10.74, -17.14, -4.49, -58.02, 0], [84, -20, -10, -20, -10, -1.58, -46.18, 1.58, 5.32, -12.8, -1.58, -47.79, 1.58]], "728H_wR_L_End_0": [[6, -19.75, -8.89, -19.75, -8.89, -0.7, -46.87, 2.45, 2.48, -10.5, -0.7, -47.95, 3.79], [12, -17.64, -7.83, -17.64, -7.83, 0.29, -47.41, 3.13, -0.23, -8.11, 0.29, -47.91, 5.73], [18, -15.22, -6.88, -15.22, -6.88, 1.2, -47.78, 3.72, -2.82, -5.61, 1.2, -47.7, 7.46], [24, -12.6, -6.09, -12.6, -6.09, 1.98, -47.97, 4.18, -5.32, -3, 1.98, -47.36, 8.87], [30, -9.91, -5.5, -9.91, -5.5, 3.18, -54.04, 4.65, -7.73, -11.81, 2.56, -46.86, 10.06], [36, -7.25, -5.13, -7.25, -5.13, 4.33, -58.01, 4.78, -10.11, -19.21, 3.15, -46.32, 10.63], [42, -4.73, -5, -4.73, -5, 5.17, -60.02, 4.72, -12.45, -25.65, 3.55, -45.7, 10.72], [48, -2.47, -5.13, -2.47, -5.13, 5.6, -60.05, 4.47, -14.76, -31.26, 3.7, -45, 10.32], [54, -0.55, -5.5, -0.55, -5.5, 5.57, -58.13, 4.02, -17.03, -35.97, 3.57, -44.24, 9.43], [60, 0.94, -6.09, 0.94, -6.09, 5.09, -54.41, 3.4, -19.25, -39.57, 3.18, -43.38, 8.09], [66, 1.94, -6.88, 1.94, -6.88, 4.21, -49.19, 2.62, -21.41, -41.79, 2.59, -42.42, 6.36], [72, 2.38, -7.83, 2.38, -7.83, 2.87, -42.81, 1.87, -23.49, -42.43, 1.69, -41.34, 4.47], [78, 2.22, -8.89, 2.22, -8.89, 1.37, -35.5, 1.04, -25.49, -41.43, 0.75, -40.14, 2.37], [84, 1.43, -10, 1.43, -10, -0.16, -27.41, 0.16, -27.41, -38.83, -0.16, -38.83, 0.16]], "729H_wR_L_End_1": [[6, 19.75, -8.89, 19.75, -8.89, -2.45, 2.48, 0.7, -46.87, -47.95, -3.79, -10.5, 0.7], [12, 17.64, -7.83, 17.64, -7.83, -3.13, -0.23, -0.29, -47.41, -47.91, -5.73, -8.11, -0.29], [18, 15.22, -6.88, 15.22, -6.88, -3.72, -2.82, -1.2, -47.78, -47.7, -7.46, -5.61, -1.2], [24, 12.6, -6.09, 12.6, -6.09, -4.18, -5.32, -1.98, -47.97, -47.36, -8.87, -3, -1.98], [30, 9.91, -5.5, 9.91, -5.5, -4.65, -7.73, -3.18, -54.04, -46.86, -10.06, -11.81, -2.56], [36, 7.25, -5.13, 7.25, -5.13, -4.78, -10.11, -4.33, -58.01, -46.32, -10.63, -19.21, -3.15], [42, 4.73, -5, 4.73, -5, -4.72, -12.45, -5.17, -60.02, -45.7, -10.72, -25.65, -3.55], [48, 2.47, -5.13, 2.47, -5.13, -4.47, -14.76, -5.6, -60.05, -45, -10.32, -31.26, -3.7], [54, 0.55, -5.5, 0.55, -5.5, -4.02, -17.03, -5.57, -58.13, -44.24, -9.43, -35.97, -3.57], [60, -0.94, -6.09, -0.94, -6.09, -3.4, -19.25, -5.09, -54.41, -43.38, -8.09, -39.57, -3.18], [66, -1.94, -6.88, -1.94, -6.88, -2.62, -21.41, -4.21, -49.19, -42.42, -6.36, -41.79, -2.59], [72, -2.38, -7.83, -2.38, -7.83, -1.87, -23.49, -2.87, -42.81, -41.34, -4.47, -42.43, -1.69], [78, -2.22, -8.89, -2.22, -8.89, -1.04, -25.49, -1.37, -35.5, -40.14, -2.37, -41.43, -0.75], [84, -1.43, -10, -1.43, -10, -0.16, -27.41, 0.16, -27.41, -38.83, -0.16, -38.83, 0.16]], "730H_wR_H_Start_0": [[64, 1.59, -7.83, 1.59, -7.83, -3.2, -26.38, -3.2, -26.38, -19.7, -5.8, -19.7, -3.2], [70, 0.76, -6.09, 0.76, -6.09, -5.75, -28.28, -5.75, -28.28, -15.04, -10.44, -15.04, -5.75], [76, -2.12, -5.13, -2.12, -5.13, -6.05, -30.19, -7.33, -38.63, -10.45, -10.74, -39.51, -6.16], [82, -6.44, -5.13, -6.44, -5.13, -6.34, -31.4, -8.23, -36.07, -5.31, -11.03, -55.78, -6.32], [88, -11.46, -6.09, -11.46, -6.09, -6.63, -31.7, -7.87, -24.97, 0.59, -11.32, -62.43, -5.97], [94, -16.28, -7.83, -16.28, -7.83, -6.92, -30.52, -6.34, -7.99, 7.76, -11.61, -56.05, -5.17], [100, -20, -10, -20, -10, -1.48, -30.02, 1.48, 26.55, 14.46, -1.48, -26.55, 1.48]], "731H_wR_H_Start_1": [[64, -1.59, -7.83, -1.59, -7.83, 3.2, -26.38, 3.2, -26.38, -19.7, 3.2, -19.7, 5.8], [70, -0.76, -6.09, -0.76, -6.09, 5.75, -28.28, 5.75, -28.28, -15.04, 5.75, -15.04, 10.44], [76, 2.12, -5.13, 2.12, -5.13, 7.33, -38.63, 6.05, -30.19, -39.51, 6.16, -10.45, 10.74], [82, 6.44, -5.13, 6.44, -5.13, 8.23, -36.07, 6.34, -31.4, -55.78, 6.32, -5.31, 11.03], [88, 11.46, -6.09, 11.46, -6.09, 7.87, -24.97, 6.63, -31.7, -62.43, 5.97, 0.59, 11.32], [94, 16.28, -7.83, 16.28, -7.83, 6.34, -7.99, 6.92, -30.52, -56.05, 5.17, 7.76, 11.61], [100, 20, -10, 20, -10, -1.48, 26.55, 1.48, -30.02, -26.55, -1.48, 14.46, 1.48]], "732H_wR_H_Left_0": [[6, -11.1, -7.83, -11.1, -7.83, 1.73, -28.31, 4.67, 9.18, 28.31, 1.73, -31.27, 7.27], [12, -2.64, -6.09, -2.64, -6.09, 4.29, -33.67, 7.21, -4.31, 33.67, 4.29, -31.04, 11.9], [18, 4.94, -5.13, 4.94, -5.13, 6.23, -62.97, 7.21, -14.94, -5.35, 5.05, -27.4, 11.9], [24, 11.27, -5.13, 11.27, -5.13, 7.57, -67.78, 7.21, -23.11, -33.83, 5.67, -20.9, 11.9], [30, 16.04, -6.09, 16.04, -6.09, 7.57, -49.94, 7.21, -28.84, -55.58, 5.67, -12.04, 11.9], [36, 19, -7.83, 19, -7.83, 6.23, -21.49, 7.21, -31.35, -58.7, 5.05, -0.48, 11.9], [42, 20, -10, 20, -10, -1.48, 26.55, 1.48, -30.02, -26.55, -1.48, 14.46, 1.48]], "733H_wR_H_Left_1": [[6, 19, -7.83, 19, -7.83, -3.08, 8.56, -0.13, -28.32, -31.98, -4.38, 28.32, -1.43], [12, 16.04, -6.09, 16.04, -6.09, -4.35, -5.39, -1.41, -33.76, -32.3, -6.7, 33.76, -3.75], [18, 11.27, -5.13, 11.27, -5.13, -4.35, -15.91, -1.41, -23.5, -28.46, -7.28, 23.5, -3.75], [24, 4.94, -5.13, 4.94, -5.13, -4.35, -24.1, -1.41, -32.08, -21.88, -7.28, -9.32, -3.75], [30, -2.64, -6.09, -2.64, -6.09, -4.35, -29.94, -1.41, -21.57, -13.02, -6.7, -25.29, -3.75], [36, -11.1, -7.83, -11.1, -7.83, -4.35, -32.73, -3.9, -28.06, -1.65, -5.66, -73.43, -4.24], [42, -20, -10, -20, -10, -1.48, -30.02, 1.48, 26.55, 14.46, -1.48, -26.55, 1.48]], "734H_wR_H_0": [[6, -11.1, -7.83, -11.1, -7.83, 1.73, -28.31, 4.67, 9.18, 28.31, 1.73, -31.27, 7.27], [12, -2.64, -6.09, -2.64, -6.09, 4.29, -33.67, 7.21, -4.31, 33.67, 4.29, -31.04, 11.9], [18, 4.94, -5.13, 4.94, -5.13, 6.23, -62.97, 7.21, -14.94, -5.35, 5.05, -27.4, 11.9], [24, 11.27, -5.13, 11.27, -5.13, 7.57, -67.78, 7.21, -23.11, -33.83, 5.67, -20.9, 11.9], [30, 16.04, -6.09, 16.04, -6.09, 7.57, -49.94, 7.21, -28.84, -55.58, 5.67, -12.04, 11.9], [36, 19, -7.83, 19, -7.83, 6.23, -21.49, 7.21, -31.35, -58.7, 5.05, -0.48, 11.9], [42, 20, -10, 20, -10, -1.48, 26.55, 1.48, -30.02, -26.55, -1.48, 14.46, 1.48]], "735H_wR_H_1": [[6, 19, -7.83, 19, -7.83, -4.67, 9.18, -1.73, -28.31, -31.27, -7.27, 28.31, -4.33], [12, 16.04, -6.09, 16.04, -6.09, -7.21, -4.31, -4.29, -33.67, -31.04, -11.9, 33.67, -8.98], [18, 11.27, -5.13, 11.27, -5.13, -7.21, -14.94, -6.23, -62.97, -27.4, -13.06, -5.35, -9.74], [24, 4.94, -5.13, 4.94, -5.13, -7.21, -23.11, -7.57, -67.78, -20.9, -13.06, -33.83, -10.36], [30, -2.64, -6.09, -2.64, -6.09, -7.21, -28.84, -7.57, -49.94, -12.04, -11.9, -55.58, -10.36], [36, -11.1, -7.83, -11.1, -7.83, -7.21, -31.35, -6.23, -21.49, -0.48, -9.81, -58.7, -9.74], [42, -20, -10, -20, -10, -1.48, -30.02, 1.48, 26.55, 14.46, -1.48, -26.55, 1.48]], "736H_wR_H_Right_0": [[6, -11.1, -7.83, -11.1, -7.83, 0.13, -28.32, 3.08, 8.56, 28.32, 0.13, -31.98, 4.38], [12, -2.64, -6.09, -2.64, -6.09, 1.41, -33.76, 4.35, -5.39, 33.76, 1.41, -32.3, 6.7], [18, 4.94, -5.13, 4.94, -5.13, 1.41, -23.5, 4.35, -15.91, 23.5, 1.41, -28.46, 6.7], [24, 11.27, -5.13, 11.27, -5.13, 1.41, -32.08, 4.35, -24.1, -9.32, 1.41, -21.88, 6.7], [30, 16.04, -6.09, 16.04, -6.09, 1.41, -21.57, 4.35, -29.94, -25.29, 1.41, -13.02, 6.7], [36, 19, -7.83, 19, -7.83, 3.9, -28.06, 4.35, -32.73, -73.43, 1.9, -1.65, 6.7], [42, 20, -10, 20, -10, -1.48, 26.55, 1.48, -30.02, -26.55, -1.48, 14.46, 1.48]], "737H_wR_H_Right_1": [[6, 19, -7.83, 19, -7.83, -4.67, 9.18, -1.73, -28.31, -31.27, -7.27, 28.31, -4.33], [12, 16.04, -6.09, 16.04, -6.09, -7.21, -4.31, -4.29, -33.67, -31.04, -11.9, 33.67, -8.98], [18, 11.27, -5.13, 11.27, -5.13, -7.21, -14.94, -6.23, -62.97, -27.4, -13.06, -5.35, -9.74], [24, 4.94, -5.13, 4.94, -5.13, -7.21, -23.11, -7.57, -67.78, -20.9, -13.06, -33.83, -10.36], [30, -2.64, -6.09, -2.64, -6.09, -7.21, -28.84, -7.57, -49.94, -12.04, -11.9, -55.58, -10.36], [36, -11.1, -7.83, -11.1, -7.83, -7.21, -31.35, -6.23, -21.49, -0.48, -9.81, -58.7, -9.74], [42, -20, -10, -20, -10, -1.48, -30.02, 1.48, 26.55, 14.46, -1.48, -26.55, 1.48]], "738H_wR_H_End_0": [[6, -19, -7.83, -19, -7.83, 0.13, -25.36, 3.08, 23.47, 25.36, 2.73, -23.47, 5.68], [12, -13.75, -6.09, -13.75, -6.09, 1.7, -28.31, 4.06, 8.91, 28.31, 6.4, -31.58, 8.75], [18, -8.05, -5.13, -8.05, -5.13, 3.02, -50.31, 4.06, 0.97, 0.25, 6.54, -32.86, 9.91], [24, -2.82, -5.13, -2.82, -5.13, 4.18, -56.24, 3.77, -5.54, -15.77, 6.97, -32.48, 9.62], [30, 1.13, -6.09, 1.13, -6.09, 4.52, -51.66, 3.47, -11.17, -26.05, 7.31, -31.01, 8.16], [36, 3.17, -7.83, 3.17, -7.83, 3.98, -39.2, 3.18, -16.16, -30.08, 7.49, -28.74, 5.78], [42, 2.86, -10, 2.86, -10, -0.3, -20.82, 0.3, -20.82, -26.02, -0.3, -26.02, 0.3]], "739H_wR_H_End_1": [[6, 19, -7.83, 19, -7.83, -3.08, 23.47, -0.13, -25.36, -23.47, -5.68, 25.36, -2.73], [12, 13.75, -6.09, 13.75, -6.09, -4.06, 8.91, -1.7, -28.31, -31.58, -8.75, 28.31, -6.4], [18, 8.05, -5.13, 8.05, -5.13, -4.06, 0.97, -3.02, -50.31, -32.86, -9.91, 0.25, -6.54], [24, 2.82, -5.13, 2.82, -5.13, -3.77, -5.54, -4.18, -56.24, -32.48, -9.62, -15.77, -6.97], [30, -1.13, -6.09, -1.13, -6.09, -3.47, -11.17, -4.52, -51.66, -31.01, -8.16, -26.05, -7.31], [36, -3.17, -7.83, -3.17, -7.83, -3.18, -16.16, -3.98, -39.2, -28.74, -5.78, -30.08, -7.49], [42, -2.86, -10, -2.86, -10, -0.3, -20.82, 0.3, -20.82, -26.02, -0.3, -26.02, 0.3]] }, flows: { "101H_기본동작": [["101H_기본동작", 1, 1]], "102H_숨쉬기1": [["102H_숨쉬기1", 1, 1]], "103H_숨쉬기2": [["103H_숨쉬기2", 1, 1]], "104H_숨쉬기3": [["104H_숨쉬기3", 1, 1]], "105H_일어서기F": [["105H_일어서기F", 1, 1]], "106H_일어서기B": [["106H_일어서기B", 1, 1]], "107H_앉기": [["107H_앉기", 1, 1]], "108H_인사": [["108H_인사", 1, 1]], "109H_브라보": [["109H_브라보", 1, 1]], "110H_팔굽혀펴기_시작": [["110H_팔굽혀펴기_시작", 1, 1]], "111H_팔굽혀펴기_반복": [["111H_팔굽혀펴기_반복", 1, 1]], "112H_팔굽혀펴기_끝": [["112H_팔굽혀펴기_끝", 1, 1]], "113H_물구나무": [["113H_물구나무", 1, 1]], "120H_축구_왼발킥": [["120H_축구_왼발킥", 1, 2]], "121H_축구_오른발킥": [["121H_축구_오른발킥", 1, 2]], "122H_축구_왼쪽막기": [["122H_축구_왼쪽막기", 1, 1]], "123H_축구_오른쪽막기": [["123H_축구_오른쪽막기", 1, 1]], "130H_좌측공격": [["131H_우측공격", 1, 1]], "131H_우측공격": [["130H_좌측공격", 1, 1]], "132H_좌이동": [["132H_좌이동", 1, 1]], "133H_우이동": [["133H_우이동", 1, 1]], "134H_빠른우이동": [["135H_빠른우이동", 1, 1]], "135H_빠른좌이동": [["134H_빠른좌이동", 1, 1]], "136H_대각전진(우)": [["137H_대각전진(우)", 1, 1]], "137H_대각전진(좌)": [["136H_대각전진(좌)", 1, 1]], "138H_대각후진(우)": [["139H_대각후진(우)", 1, 1]], "139H_대각후진(좌)": [["138H_대각후진(좌)", 1, 1]], "140H_제자리우회전": [["141H_제자리우회전", 1, 1]], "141H_제자리좌회전": [["140H_제자리좌회전", 1, 1]], "150H_전진_시작": [["150H_전진_시작", 1, 1]], "151H_전진_반복_좌회선": [["151H_전진_반복_좌회선", 1, 1]], "152H_전진_반복": [["152H_전진_반복", 1, 1]], "153H_전진_반복_우회선": [["153H_전진_반복_우회선", 1, 1]], "154H_전진_종료": [["154H_전진_종료", 1, 1]], "155H_후진_시작": [["155H_후진_시작", 1, 1]], "156H_후진_반복_좌회선": [["156H_후진_반복_좌회선", 1, 1]], "157H_후진_반복": [["157H_후진_반복", 1, 1]], "158H_후진_반복_우회선": [["158H_후진_반복_우회선", 1, 1]], "159H_후진_종료": [["159H_후진_종료", 1, 1]], "160H_빠른전진_시작": [["160H_빠른전진_시작", 1, 1]], "161H_빠른전진_반복_좌회선": [["161H_빠른전진_반복_좌회선", 1, 1]], "162H_빠른전진_반복": [["162H_빠른전진_반복", 1, 1]], "163H_빠른전진_반복_우회선": [["163H_빠른전진_반복_우회선", 1, 1]], "164H_빠른전진_종료": [["164H_빠른전진_종료", 1, 1]], "165H_빠른후진_시작": [["165H_빠른후진_시작", 1, 1]], "166H_빠른후진_반복_좌회선": [["166H_빠른후진_반복_좌회선", 1, 1]], "167H_빠른후진_반복": [["167H_빠른후진_반복", 1, 1]], "168H_빠른후진_반복_우회선": [["168H_빠른후진_반복_우회선", 1, 1]], "169H_빠른후진_종료": [["169H_빠른후진_종료", 1, 1]], "181H_펀치": [["181H_펀치", 1, 1]], "182H_오른팔_훅": [["182H_오른팔_훅", 1, 1]], "183H_왼팔_훅": [["183H_왼팔_훅", 1, 1]], "184H_엎드려": [["184H_엎드려", 1, 1]], "190H_박수": [["190H_박수", 1, 1]], "191H_박수_준비": [["191H_박수_준비", 1, 1]], "192H_박수_종료": [["192H_박수_종료", 1, 1]], "309_H기본_일어나기F": [["105H_일어서기F", 1, 1]], "310_H기본_일어나기B": [["106H_일어서기B", 1, 1]], "314_H기본_팔굽혀펴기": [["110H_팔굽혀펴기_시작", 1, 1], ["111H_팔굽혀펴기_반복", 3, 1], ["112H_팔굽혀펴기_끝", 1, 1]], "315_H기본_물구나무": [["110H_팔굽혀펴기_시작", 1, 1], ["113H_물구나무", 1, 1]], "319_H기본_인사": [["108H_인사", 1, 1]], "320_H기본_만세": [["320H_만세", 1, 1]], "324_H기본_브라보": [["324H_브라보", 1, 1]], "325_H기본_박수": [["191H_박수_준비", 1, 1], ["190H_박수", 2, 1], ["192H_박수_종료", 1, 1]], "334_H격투_좌측공격": [["130H_좌측공격", 1, 1]], "335_H격투_우측공격": [["131H_우측공격", 1, 1]], "339_H격투_왼팔_훅": [["183H_왼팔_훅", 1, 1]], "340_H격투_오른팔_훅": [["182H_오른팔_훅", 1, 1]], "344_H격투_앉기": [["107H_앉기", 1, 1]], "345_H격투_전방공격": [["345H_전방 공격", 1, 1]], "354_H축구_왼발킥": [["120H_축구_왼발킥", 1, 1]], "355_H축구_오른발킥": [["121H_축구_오른발킥", 1, 1]], "359_H축구_왼쪽막기": [["122H_축구_왼쪽막기", 1, 1]], "360_H축구_오른쪽막기": [["123H_축구_오른쪽막기", 1, 1]], "364_H축구_대각전진_좌": [["136H_대각전진(좌)", 1, 1]], "365_H축구_대각전진_우": [["137H_대각전진(우)", 1, 1]], "406_H_좌회전": [["140H_제자리좌회전", 1, 1]], "408_H_우회전": [["141H_제자리우회전", 1, 1]], "416_H_좌이동": [["132H_좌이동", 1, 1]], "418_H_우이동": [["133H_우이동", 1, 1]], "426_H_빠른좌회전": [["142H_제자리좌회전_고속", 1, 1]], "428_H_빠른우회전": [["143H_제자리우회전_고속", 1, 1]], "436_H_빠른좌이동": [["134H_빠른좌이동", 1, 1]], "438_H_빠른우이동": [["135H_빠른우이동", 1, 1]], "700H_wF_L_Start_0": [["700H_wF_L_Start_0", 1, 1]], "701H_wF_L_Start_1": [["701H_wF_L_Start_1", 1, 1]], "702H_wF_L_Left_0": [["702H_wF_L_Left_0", 1, 1]], "703H_wF_L_Left_1": [["703H_wF_L_Left_1", 1, 1]], "704H_wF_L_0": [["704H_wF_L_0", 1, 1]], "705H_wF_L_1": [["705H_wF_L_1", 1, 1]], "706H_wF_L_Right_0": [["706H_wF_L_Right_0", 1, 1]], "707H_wF_L_Right_1": [["707H_wF_L_Right_1", 1, 1]], "708H_wF_L_End_0": [["708H_wF_L_End_0", 1, 1]], "709H_wF_L_End_1": [["709H_wF_L_End_1", 1, 1]], "710H_wF_H_Start_0": [["710H_wF_H_Start_0", 1, 1]], "711H_wF_H_Start_1": [["711H_wF_H_Start_1", 1, 1]], "712H_wF_H_Left_0": [["712H_wF_H_Left_0", 1, 1]], "713H_wF_H_Left_1": [["713H_wF_H_Left_1", 1, 1]], "714H_wF_H_0": [["714H_wF_H_0", 1, 1]], "715H_wF_H_1": [["715H_wF_H_1", 1, 1]], "716H_wF_H_Right_0": [["716H_wF_H_Right_0", 1, 1]], "717H_wF_H_Right_1": [["717H_wF_H_Right_1", 1, 1]], "718H_wF_H_End_0": [["718H_wF_H_End_0", 1, 1]], "719H_wF_H_End_1": [["719H_wF_H_End_1", 1, 1]], "720H_wR_L_Start_0": [["720H_wR_L_Start_0", 1, 1]], "721H_wR_L_Start_1": [["721H_wR_L_Start_1", 1, 1]], "722H_wR_L_Left_0": [["722H_wR_L_Left_0", 1, 1]], "723H_wR_L_Left_1": [["723H_wR_L_Left_1", 1, 1]], "724H_wR_L_0": [["724H_wR_L_0", 1, 1]], "725H_wR_L_1": [["725H_wR_L_1", 1, 1]], "726H_wR_L_Right_0": [["726H_wR_L_Right_0", 1, 1]], "727H_wR_L_Right_1": [["727H_wR_L_Right_1", 1, 1]], "728H_wR_L_End_0": [["728H_wR_L_End_0", 1, 1]], "729H_wR_L_End_1": [["729H_wR_L_End_1", 1, 1]], "730H_wR_H_Start_0": [["730H_wR_H_Start_0", 1, 1]], "731H_wR_H_Start_1": [["731H_wR_H_Start_1", 1, 1]], "732H_wR_H_Left_0": [["732H_wR_H_Left_0", 1, 1]], "733H_wR_H_Left_1": [["733H_wR_H_Left_1", 1, 1]], "734H_wR_H_0": [["734H_wR_H_0", 1, 1]], "735H_wR_H_1": [["735H_wR_H_1", 1, 1]], "736H_wR_H_Right_0": [["736H_wR_H_Right_0", 1, 1]], "737H_wR_H_Right_1": [["737H_wR_H_Right_1", 1, 1]], "738H_wR_H_End_0": [["738H_wR_H_End_0", 1, 1]], "739H_wR_H_End_1": [["739H_wR_H_End_1", 1, 1]] }, calls: [[101, "101H_기본동작"], [102, "102H_숨쉬기1"], [103, "103H_숨쉬기2"], [104, "104H_숨쉬기3"], [105, "105H_일어서기F"], [106, "106H_일어서기B"], [107, "107H_앉기"], [108, "108H_인사"], [109, "109H_브라보"], [110, "110H_팔굽혀펴기_시작"], [111, "111H_팔굽혀펴기_반복"], [112, "112H_팔굽혀펴기_끝"], [113, "113H_물구나무"], [120, "120H_축구_왼발킥"], [121, "121H_축구_오른발킥"], [122, "122H_축구_왼쪽막기"], [123, "123H_축구_오른쪽막기"], [130, "130H_좌측공격"], [131, "131H_우측공격"], [132, "132H_좌이동"], [133, "133H_우이동"], [134, "134H_빠른우이동"], [135, "135H_빠른좌이동"], [136, "136H_대각전진(우)"], [137, "137H_대각전진(좌)"], [138, "138H_대각후진(우)"], [139, "139H_대각후진(좌)"], [140, "140H_제자리우회전"], [141, "141H_제자리좌회전"], [150, "150H_전진_시작"], [151, "151H_전진_반복_좌회선"], [152, "152H_전진_반복"], [153, "153H_전진_반복_우회선"], [154, "154H_전진_종료"], [155, "155H_후진_시작"], [156, "156H_후진_반복_좌회선"], [157, "157H_후진_반복"], [158, "158H_후진_반복_우회선"], [159, "159H_후진_종료"], [160, "160H_빠른전진_시작"], [161, "161H_빠른전진_반복_좌회선"], [162, "162H_빠른전진_반복"], [163, "163H_빠른전진_반복_우회선"], [164, "164H_빠른전진_종료"], [165, "165H_빠른후진_시작"], [166, "166H_빠른후진_반복_좌회선"], [167, "167H_빠른후진_반복"], [168, "168H_빠른후진_반복_우회선"], [169, "169H_빠른후진_종료"], [181, "181H_펀치"], [182, "182H_오른팔_훅"], [183, "183H_왼팔_훅"], [184, "184H_엎드려"], [190, "190H_박수"], [191, "191H_박수_준비"], [192, "192H_박수_종료"], [309, "309_H기본_일어나기F"], [310, "310_H기본_일어나기B"], [314, "314_H기본_팔굽혀펴기"], [315, "315_H기본_물구나무"], [319, "319_H기본_인사"], [320, "320_H기본_만세"], [324, "324_H기본_브라보"], [325, "325_H기본_박수"], [334, "334_H격투_좌측공격"], [335, "335_H격투_우측공격"], [339, "339_H격투_왼팔_훅"], [340, "340_H격투_오른팔_훅"], [344, "344_H격투_앉기"], [345, "345_H격투_전방공격"], [354, "354_H축구_왼발킥"], [355, "355_H축구_오른발킥"], [359, "359_H축구_왼쪽막기"], [360, "360_H축구_오른쪽막기"], [364, "364_H축구_대각전진_좌"], [365, "365_H축구_대각전진_우"], [406, "406_H_좌회전"], [408, "408_H_우회전"], [416, "416_H_좌이동"], [418, "418_H_우이동"], [426, "426_H_빠른좌회전"], [428, "428_H_빠른우회전"], [436, "436_H_빠른좌이동"], [438, "438_H_빠른우이동"], [700, "700H_wF_L_Start_0"], [701, "701H_wF_L_Start_1"], [702, "702H_wF_L_Left_0"], [703, "703H_wF_L_Left_1"], [704, "704H_wF_L_0"], [705, "705H_wF_L_1"], [706, "706H_wF_L_Right_0"], [707, "707H_wF_L_Right_1"], [708, "708H_wF_L_End_0"], [709, "709H_wF_L_End_1"], [710, "710H_wF_H_Start_0"], [711, "711H_wF_H_Start_1"], [712, "712H_wF_H_Left_0"], [713, "713H_wF_H_Left_1"], [714, "714H_wF_H_0"], [715, "715H_wF_H_1"], [716, "716H_wF_H_Right_0"], [717, "717H_wF_H_Right_1"], [718, "718H_wF_H_End_0"], [719, "719H_wF_H_End_1"], [720, "720H_wR_L_Start_0"], [721, "721H_wR_L_Start_1"], [722, "722H_wR_L_Left_0"], [723, "723H_wR_L_Left_1"], [724, "724H_wR_L_0"], [725, "725H_wR_L_1"], [726, "726H_wR_L_Right_0"], [727, "727H_wR_L_Right_1"], [728, "728H_wR_L_End_0"], [729, "729H_wR_L_End_1"], [730, "730H_wR_H_Start_0"], [731, "731H_wR_H_Start_1"], [732, "732H_wR_H_Left_0"], [733, "733H_wR_H_Left_1"], [734, "734H_wR_H_0"], [735, "735H_wR_H_1"], [736, "736H_wR_H_Right_0"], [737, "737H_wR_H_Right_1"], [738, "738H_wR_H_End_0"], [739, "739H_wR_H_End_1"]] };
  }
});

// src/sim3d/mtn3.js
var FRAME_SECONDS, attr, parseMtn3, callSeconds, findChains, toRecording, fromCompact;
var init_mtn3 = __esm({
  "src/sim3d/mtn3.js"() {
    FRAME_SECONDS = 1 / 128;
    attr = (tag, name) => {
      const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
      return m ? m[1] : "";
    };
    parseMtn3 = (text2) => {
      if (!/<PageRoot>/.test(text2) || !/<Page\s/.test(text2)) throw new Error("R+ 모션 파일(.mtn3)이 아닙니다.");
      const pages = {};
      for (const m of text2.matchAll(/<Page name="([^"]+)">([\s\S]*?)<\/Page>/g)) {
        const steps = [...m[2].matchAll(/<step\b[^>]*>/g)].map((s) => ({
          frame: Number(attr(s[0], "frame")),
          pose: attr(s[0], "pose").trim().split(/\s+/).map(Number)
        })).filter((s) => Number.isFinite(s.frame) && s.pose.every(Number.isFinite));
        if (steps.length) pages[m[1]] = { steps, seconds: steps[steps.length - 1].frame * FRAME_SECONDS };
      }
      const flows = {};
      for (const m of text2.matchAll(/<Flow name="([^"]+)"[^>]*>([\s\S]*?)<\/Flow>/g)) {
        flows[m[1]] = [...m[2].matchAll(/<unit\b[^>]*>/g)].map((u) => ({
          page: attr(u[0], "main"),
          loop: Math.max(1, Number(attr(u[0], "loop")) || 1),
          speed: Number(attr(u[0], "mainSpeed")) || 1
        })).filter((u) => pages[u.page]);
      }
      const calls = [...text2.matchAll(/<callFlow\b[^>]*>/g)].map((c) => ({
        index: Number(attr(c[0], "callIndex")),
        flow: attr(c[0], "flow")
      })).filter((c) => c.index > 0 && flows[c.flow] && flows[c.flow].length);
      const width = Math.max(0, ...Object.values(pages).map((p) => p.steps[0].pose.length));
      const ids = [...text2.matchAll(/<skeleton>[\s\S]*?<\/skeleton>/g)].flatMap((s) => [...s[0].matchAll(/<joint\b[^>]*>/g)].map((j) => Number(attr(j[0], "id")))).slice(0, width);
      return { ids: ids.length === width ? ids : Array.from({ length: width }, (_, i) => i + 1), pages, flows, calls };
    };
    callSeconds = (m, index) => {
      const c = m.calls.find((x) => x.index === index);
      if (!c) return 0;
      return m.flows[c.flow].reduce((a, u) => a + m.pages[u.page].seconds * u.loop / u.speed, 0);
    };
    findChains = (m) => {
      const byName = new Map(m.calls.map((c) => [c.flow.replace(/^\d+_?H?_?/, ""), c.index]));
      const out = [];
      for (const [name, start] of byName) {
        const base = /^(.*)_시작$/.exec(name);
        if (!base) continue;
        const loop = byName.get(`${base[1]}_반복`);
        const end = byName.get(`${base[1]}_종료`);
        if (loop && end) out.push({ name: base[1], start, loop, end });
      }
      return out;
    };
    toRecording = (m, indices, label2) => {
      const frames = [];
      let t0 = 0;
      const push = (t, pose) => {
        const deg2 = {};
        m.ids.forEach((id, i) => {
          deg2[id] = Math.round((180 + (pose[i] || 0)) * 100) / 100;
        });
        frames.push({ t: Math.round(t * 1e3) / 1e3, deg: deg2 });
      };
      for (const index of indices) {
        const c = m.calls.find((x) => x.index === index);
        if (!c) throw new Error(`모션 ${index}번이 파일에 없습니다.`);
        for (const u of m.flows[c.flow]) {
          const p = m.pages[u.page];
          for (let k = 0; k < u.loop; k++) {
            if (!frames.length) push(0, p.steps[0].pose.map(() => 0));
            for (const s of p.steps) push(t0 + s.frame * FRAME_SECONDS / u.speed, s.pose);
            t0 += p.seconds / u.speed;
          }
        }
      }
      return { page: label2 || indices.join("→"), ids: m.ids.slice(), frames, seconds: t0, fromFile: true, indices: indices.slice() };
    };
    fromCompact = (j) => {
      const pages = {};
      for (const [name, rows] of Object.entries(j.pages)) {
        const steps = rows.map((r) => ({ frame: r[0], pose: r.slice(1) }));
        pages[name] = { steps, seconds: steps[steps.length - 1].frame * FRAME_SECONDS };
      }
      const flows = {};
      for (const [name, units] of Object.entries(j.flows)) {
        flows[name] = units.map((u) => ({ page: u[0], loop: u[1], speed: u[2] })).filter((u) => pages[u.page]);
      }
      const calls = j.calls.map((c) => ({ index: c[0], flow: c[1] })).filter((c) => flows[c.flow] && flows[c.flow].length);
      return { ids: j.ids.slice(), pages, flows, calls, source: j.source };
    };
  }
});

// src/sim3d/maxe1-motion-notes.js
var N, ALIAS, COMBO, WALK, walkNote, stepNote, motionNote;
var init_maxe1_motion_notes = __esm({
  "src/sim3d/maxe1-motion-notes.js"() {
    N = {
      101: ["기본 자세", "바로 선 자세: 모든 관절이 0°(모터 180°)로 1초 동안 천천히 돌아갑니다. 다른 모션의 시작·끝 자세입니다."],
      102: ["숨쉬기 1 (대기)", "서 있을 때의 대기 동작: 무릎을 살짝(12°) 굽혔다 펴고 두 팔을 조금 벌렸다 모읍니다. 4초."],
      103: ["숨쉬기 2 (대기)", "대기 동작: 무릎을 굽힌 채 몸을 좌우로 흔들고 두 팔을 앞뒤로 번갈아 흔듭니다. 무릎을 24° 굽힌 자세로 끝납니다. 5.3초."],
      104: ["숨쉬기 3 (대기)", "대기 동작: 두 팔을 앞뒤로 크게(35°) 흔들고 깊이(35°) 앉았다가 일어섭니다. 5.1초."],
      105: ["일어서기 (앞으로 넘어졌을 때)", "엎드려 넘어졌을 때: 두 팔을 옆·앞으로 짚고 다리를 벌렸다 모아 쪼그려 앉은 뒤 일어섭니다. 예제 태스크는 기울기(Pitch)가 앞으로 크면 이 모션을 씁니다. 2.4초."],
      106: ["일어서기 (뒤로 넘어졌을 때)", "등을 대고 넘어졌을 때: 두 팔을 뒤로 짚어 상체를 일으키고 쪼그려 앉았다가 일어섭니다. 3.5초."],
      107: ["앉기", "쪼그려 앉기: 엉덩이·발목 앞뒤를 −70°로 굽혀 무릎을 앞으로 깊게 굽힙니다. 팔은 그대로입니다. 1초."],
      108: ["인사 (손 흔들기)", "무릎을 살짝 굽히고 오른팔을 앞으로 110°까지 들어 올려 손을 좌우로 두 번 흔든 뒤 내립니다. 3.8초."],
      109: ["브라보", "두 팔을 머리 위로(170°) 올리고 옆으로 80° 벌린 V 자세로, 무릎을 41° 굽혔다 펴기를 두 번 합니다. 6초."],
      110: ["팔굽혀펴기 시작", "무릎을 꿇고 앞으로 손을 짚어 엎드린 팔굽혀펴기 자세가 됩니다(팔 80°). 2.8초."],
      111: ["팔굽혀펴기 반복", "엎드린 자세에서 팔(80~100°)과 엉덩이·발목(최대 54°)을 움직여 몸을 내렸다 올립니다. 한 번에 2초."],
      112: ["팔굽혀펴기 끝", "엎드린 자세에서 쪼그려 앉았다가 일어섭니다(105 일어서기와 같은 마무리). 3초."],
      113: ["물구나무", "엎드린 자세에서 두 팔로 짚고 다리를 들어 올려 물구나무를 선 뒤, 다시 내려와 일어섭니다. 110(팔굽혀펴기 시작) 다음에 실행합니다. 어려운 동작이라 넘어질 수 있습니다. 14.2초."],
      120: ["축구: 왼발 킥 (빠르게)", "몸을 오른쪽으로 옮겨 오른발로 서고, 왼다리를 뒤로 뺐다가 앞으로 차올립니다(왼쪽 엉덩이 앞뒤 −76°). 두 배 속도로 1.5초."],
      121: ["축구: 오른발 킥 (빠르게)", "120의 반대: 왼발로 서서 오른다리로 앞으로 찹니다. 두 배 속도로 1.5초."],
      122: ["축구: 왼쪽 막기", "골키퍼처럼 몸을 낮추고 다리와 두 팔을 벌려 왼쪽으로 기울며 공을 막고, 바로 선 자세로 돌아옵니다. 3.8초."],
      123: ["축구: 오른쪽 막기", "122의 반대: 오른쪽으로 기울며 막습니다. 3.8초."],
      130: ["격투: 오른팔 옆 공격", '몸을 왼쪽으로 기울였다가 오른팔을 오른쪽 옆으로 70° 휘둘러 칩니다. (파일 속 이름은 "좌측공격"이지만 131H_우측공격 페이지를 실행합니다) 1.8초.'],
      131: ["격투: 왼팔 옆 공격", '130의 반대: 왼팔을 왼쪽 옆으로 휘둘러 칩니다. (이름은 "우측공격", 실행은 130H_좌측공격 페이지) 1.8초.'],
      132: ["왼쪽으로 옆걸음", "무릎을 굽힌 채 왼쪽으로 옆걸음 한 번. 0.9초."],
      133: ["오른쪽으로 옆걸음", "무릎을 굽힌 채 오른쪽으로 옆걸음 한 번. 0.9초."],
      134: ["빠른 오른쪽 옆걸음", "오른쪽으로 짧고 빠른 옆걸음 한 번. 0.3초."],
      135: ["빠른 왼쪽 옆걸음", "왼쪽으로 짧고 빠른 옆걸음 한 번. 0.3초."],
      136: ["오른쪽 앞 대각선 걷기", "오른쪽 앞 대각선으로 두 걸음. 1.4초."],
      137: ["왼쪽 앞 대각선 걷기", "왼쪽 앞 대각선으로 두 걸음. 1.4초."],
      138: ["오른쪽 뒤 대각선 걷기", "오른쪽 뒤 대각선으로 두 걸음. 1.6초."],
      139: ["왼쪽 뒤 대각선 걷기", "왼쪽 뒤 대각선으로 두 걸음. 1.6초."],
      140: ["제자리 오른쪽 돌기", "발을 비틀어 제자리에서 오른쪽으로 조금 돕니다. 여러 번 이어서 실행해 크게 돕니다. 0.4초."],
      141: ["제자리 왼쪽 돌기", "발을 비틀어 제자리에서 왼쪽으로 조금 돕니다. 0.4초."],
      181: ["격투: 펀치", "무릎을 굽힌 낮은 자세에서 왼팔을 앞으로 곧게(110°) 뻗어 찌르고 되돌립니다. 0.5초."],
      182: ["격투: 오른팔 훅", "오른팔을 앞으로 120°까지 올리며 몸 안쪽으로 휘둘러 칩니다. 2초."],
      183: ["격투: 왼팔 훅", "왼팔을 앞으로 120°까지 올리며 몸 안쪽으로 휘둘러 칩니다. 2초."],
      184: ["엎드리기", "서 있다가 무릎을 꿇고 손을 짚어 엎드립니다(110보다 천천히). 5초."],
      190: ["박수 (한 번)", "두 팔을 앞으로 약 125° 든 채 양손을 안쪽으로 모아 손뼉을 한 번 칩니다. 191 다음에 실행합니다. 0.5초."],
      191: ["박수 준비", "두 팔을 앞으로 약 115° 들어 올립니다. 1초."],
      192: ["박수 끝", "두 팔을 내리고 바로 섭니다. 2초."],
      320: ["만세", "무릎을 굽히고 팔을 살짝 뒤로 뺐다가, 무릎을 펴며 두 팔을 위로(151°) 올리고 옆으로 50° 벌리기를 두 번 합니다. 2.6초."],
      324: ["브라보 (기본)", "두 팔을 머리 위로(150° 안팎) 든 채 옆으로 벌렸다 모으며 무릎을 굽혔다 펴기를 세 번 합니다. 4.2초."],
      345: ["격투: 앞으로 공격", "두 팔을 옆으로 벌렸다가 앞으로 내밀고, 몸을 낮추며 앞을 공격한 뒤 돌아옵니다. 2.1초."]
    };
    ALIAS = {
      309: 105,
      310: 106,
      319: 108,
      334: 131,
      335: 130,
      339: 183,
      340: 182,
      344: 107,
      359: 122,
      360: 123,
      364: 137,
      365: 136,
      406: 141,
      408: 140,
      416: 132,
      418: 133,
      436: 135,
      438: 134
    };
    COMBO = {
      354: ["축구: 왼발 킥", "120과 같은 왼발 킥을 보통 속도로 합니다(스마트폰 앱 버튼용 번호). 오른발로 서서 왼다리를 뒤로 뺐다가 앞으로 차올립니다. 2.9초."],
      355: ["축구: 오른발 킥", "121과 같은 오른발 킥을 보통 속도로 합니다(스마트폰 앱 버튼용 번호). 2.9초."],
      314: ["팔굽혀펴기 (전체)", "110 팔굽혀펴기 시작 → 111 반복 ×3 → 112 끝 을 이어서 실행합니다."],
      315: ["물구나무 (전체)", "110 팔굽혀펴기 시작 → 113 물구나무 를 이어서 실행합니다."],
      325: ["박수 (전체)", "191 박수 준비 → 190 박수 ×2 → 192 박수 끝 을 이어서 실행합니다."],
      426: ["빠른 제자리 왼쪽 돌기", "141보다 빠르게(발 비틀기를 줄여) 제자리에서 왼쪽으로 돕니다. 0.3초."],
      428: ["빠른 제자리 오른쪽 돌기", "140보다 빠르게 제자리에서 오른쪽으로 돕니다. 0.3초."]
    };
    WALK = {
      150: ["앞으로", 0],
      155: ["뒤로", 0],
      160: ["빠르게 앞으로", 1],
      165: ["빠르게 뒤로", 1]
    };
    walkNote = (index) => {
      const base = Math.floor((index - 150) / 5) * 5 + 150;
      const w = WALK[base];
      if (!w) return null;
      const k = index - base;
      const dir = w[0];
      const back = base === 155 || base === 165;
      const step = w[1] ? "한 걸음 약 0.35초" : "한 걸음 약 0.65초";
      if (k === 0) return [`${dir} 걷기 시작`, `바로 선 자세에서 무릎을 굽히고 몸을 오른쪽으로 옮긴 뒤 왼발을 ${back ? "뒤로" : "앞으로"} 반 걸음 내딛습니다. 다음에 ${base + 2}(반복)을 이어서 실행합니다.`];
      if (k === 2) return [`${dir} 걷기 반복`, `오른발 → 왼발 두 걸음(${step}). 이 페이지를 여러 번 이어서 걷습니다. 예제 태스크는 "다음 페이지"를 미리 정해 멈추지 않고 이어 붙입니다.`];
      if (k === 1) return [`${dir} 걷기 반복 (왼쪽으로 휘며)`, `${base + 2}와 같지만 발을 조금 비틀어 왼쪽으로 휘어 걷습니다.`];
      if (k === 3) return [`${dir} 걷기 반복 (오른쪽으로 휘며)`, `${base + 2}와 같지만 오른쪽으로 휘어 걷습니다.`];
      return [`${dir} 걷기 끝`, `마지막 발을 끌어와 두 발을 모으고 무릎을 굽힌 자세로 멈춥니다. 다음에 101(기본 자세)로 펴면 됩니다.`];
    };
    stepNote = (index) => {
      if (index < 700 || index > 739) return null;
      const k = index - 700;
      const dir = k < 20 ? "앞으로" : "뒤로";
      const fast = k % 20 >= 10;
      const j = k % 10;
      const foot = j % 2 === 0 ? "오른발" : "왼발";
      const sp = fast ? "빠르게, 한 걸음 약 0.35초" : "보통 속도, 한 걸음 약 0.65초";
      const kind = [
        ["출발", `${j === 0 ? "왼발" : "오른발"} 먼저 반 걸음`],
        null,
        ["왼쪽으로 휘는 한 걸음", foot],
        null,
        ["곧은 한 걸음", foot],
        null,
        ["오른쪽으로 휘는 한 걸음", foot],
        null,
        ["멈춤", `${foot}을 끌어와 두 발 모으기`]
      ][j - j % 2];
      return [
        `한 걸음씩 ${dir} 걷기: ${kind[0]} (${foot === "오른발" ? "_0" : "_1"})`,
        `${dir} 걷기를 한 걸음씩 나눈 페이지 — ${kind[1]} (${sp}). 출발(${700 + (k - j)}/${701 + (k - j)}) → 한 걸음씩 _0, _1 번갈아 → 멈춤(${708 + (k - j)}/${709 + (k - j)}).`
      ];
    };
    motionNote = (index) => {
      let n = N[index] || COMBO[index] || walkNote(index) || stepNote(index);
      if (!n && ALIAS[index]) {
        const a = N[ALIAS[index]];
        n = [a[0], `${ALIAS[index]}번과 같은 동작입니다 (스마트폰 앱 버튼용 번호). ${a[1]}`];
      }
      return n ? { title: n[0], desc: n[1] } : { title: "", desc: "" };
    };
  }
});

// src/sim3d/motion-library.js
var motion_library_exports = {};
__export(motion_library_exports, {
  builtInMotions: () => builtInMotions,
  currentMotions: () => currentMotions,
  hasMotion: () => hasMotion,
  isBuiltIn: () => isBuiltIn,
  motionName: () => motionName,
  motionSeconds: () => motionSeconds,
  motionTimeline: () => motionTimeline,
  poseAtTime: () => poseAtTime,
  setMotions: () => setMotions
});
var builtIn, current, builtInMotions, currentMotions, isBuiltIn, setMotions, motionName, motionSeconds, hasMotion, motionTimeline, poseAtTime;
var init_motion_library = __esm({
  "src/sim3d/motion-library.js"() {
    init_maxe1_motions();
    init_mtn3();
    init_maxe1_motion_notes();
    builtIn = null;
    current = null;
    builtInMotions = () => builtIn || (builtIn = fromCompact(maxe1_motions_default));
    currentMotions = () => current || builtInMotions();
    isBuiltIn = () => currentMotions() === builtInMotions();
    setMotions = (m) => {
      current = m;
    };
    motionName = (index) => {
      const m = currentMotions();
      const c = m.calls.find((x) => x.index === index);
      if (!c) return "";
      return isBuiltIn() && motionNote(index).title || c.flow.replace(/^\d+_?H?_?/, "");
    };
    motionSeconds = (index) => callSeconds(currentMotions(), index);
    hasMotion = (index) => currentMotions().calls.some((x) => x.index === index);
    motionTimeline = (index, startPose, playSpeed = 1) => {
      const m = currentMotions();
      const c = m.calls.find((x) => x.index === index);
      if (!c) return null;
      const frames = [{ t: 0, pose: startPose.slice() }];
      let t0 = 0;
      for (const u of m.flows[c.flow]) {
        const p = m.pages[u.page];
        if (!p) continue;
        const sp = Math.max(0.05, u.speed * playSpeed);
        for (let k = 0; k < u.loop; k++) {
          for (const s of p.steps) frames.push({ t: t0 + s.frame * FRAME_SECONDS / sp, pose: s.pose });
          t0 += p.seconds / sp;
        }
      }
      return { ids: m.ids.slice(), frames, seconds: t0 };
    };
    poseAtTime = (tl, t) => {
      const f2 = tl.frames;
      if (t <= 0) return f2[0].pose;
      for (let i = 1; i < f2.length; i++) {
        if (f2[i].t >= t) {
          const a = f2[i - 1];
          const b = f2[i];
          const k = (t - a.t) / Math.max(1e-6, b.t - a.t);
          return b.pose.map((v, n) => a.pose[n] + (v - a.pose[n]) * k);
        }
      }
      return f2[f2.length - 1].pose;
    };
  }
});

// src/sim-robot.js
var require_sim_robot = __commonJS({
  "src/sim-robot.js"(exports, module) {
    var P22 = require_protocol2();
    var CM_ID2 = 200;
    var DEFAULT_MODELS = { 1: 1060, 2: 1060, 3: 1090, 4: 1090 };
    var CURRENT_MODELS = /* @__PURE__ */ new Set([1190, 1200, 1210, 1220, 1230, 1240, 1e3, 1010, 1040, 1050, 1020, 1030]);
    var VELOCITY_LIMIT = 265;
    var CM_SIZES = {
      0: 2,
      6: 1,
      12: 1,
      20: 1,
      21: 1,
      22: 1,
      23: 2,
      26: 1,
      39: 1,
      40: 1,
      64: 1,
      66: 2,
      68: 1,
      69: 2,
      71: 2,
      84: 1,
      85: 1,
      86: 1,
      87: 1,
      89: 1,
      90: 1,
      91: 1,
      92: 1,
      93: 1,
      102: 2,
      104: 2,
      106: 2,
      108: 2,
      110: 2,
      112: 2,
      114: 2,
      116: 2,
      118: 2,
      124: 4
    };
    var DXL_SIZES = {
      0: 2,
      6: 1,
      7: 1,
      11: 1,
      38: 2,
      44: 4,
      64: 1,
      65: 1,
      70: 1,
      100: 2,
      104: 4,
      108: 4,
      112: 4,
      116: 4,
      102: 2,
      122: 1,
      124: 2,
      126: 2,
      128: 4,
      132: 4,
      144: 2,
      146: 1
    };
    var fault = () => typeof window !== "undefined" && window.__dmSimFault || "";
    var tickToDeg2 = (t) => Math.round(t / 4096 * 3600) / 10;
    var onOff = (v) => v ? "켜기" : "끄기";
    var signed2 = (v, size) => v >= 2 ** (size * 8 - 1) ? v - 2 ** (size * 8) : v;
    var SimTransport2 = class {
      /**
       * @param {Function} onAction
       * @param {object} [opts]
       * @param {object} [opts.physics] PhysicsSim (3D 가상 로봇): joints, torque and IMU come from MuJoCo
       */
      constructor(onAction, opts = {}) {
        this.onAction = onAction || (() => {
        });
        this.physics = opts.physics || null;
        this.quiet = false;
        this._data = null;
        this._close = null;
        this.isOpen = false;
        this.name = "가상 로봇";
        this.regs = /* @__PURE__ */ new Map();
        this.last = /* @__PURE__ */ new Map();
        this.moves = /* @__PURE__ */ new Map();
        this.limp = /* @__PURE__ */ new Map();
        this.motionUntil = 0;
        this.t0 = Date.now();
        this.models = this.physics ? Object.fromEntries(this.physics.ids.map((id) => [id, 1090])) : typeof window !== "undefined" && window.__dmSimModels || DEFAULT_MODELS;
        if (this.physics) this.name = "3D 가상 로봇";
        this.ids = Object.keys(this.models).map(Number);
        const set = (id, addr, v) => this.regs.set(`${id}:${addr}`, v);
        set(CM_ID2, 0, 450);
        set(CM_ID2, 6, 47);
        set(CM_ID2, 12, 3);
        set(CM_ID2, 20, 2);
        set(CM_ID2, 21, 2);
        set(CM_ID2, 22, fault() === "nopower" ? 0 : 1);
        set(CM_ID2, 71, 12);
        set(CM_ID2, 89, fault() === "lowvolt" ? 50 : 120);
        set(CM_ID2, 90, 28);
        for (const id of this.ids) {
          set(id, 0, this.models[id]);
          if (CURRENT_MODELS.has(this.models[id])) set(id, 38, 1750);
          set(id, 11, 3);
          set(id, 44, VELOCITY_LIMIT);
          set(id, 132, 2048);
          set(id, 116, 2048);
          set(id, 144, 120);
          set(id, 146, 30 + id);
        }
      }
      onData(cb) {
        this._data = cb;
      }
      onClose(cb) {
        this._close = cb;
      }
      open() {
        this.isOpen = true;
        return Promise.resolve();
      }
      close() {
        const was = this.isOpen;
        this.isOpen = false;
        if (was && this._close) this._close();
        return Promise.resolve();
      }
      _reply(id, params = [], error = 0) {
        const pkt = P22.buildPacket(id, P22.INST.STATUS, [error, ...params]);
        setTimeout(() => {
          if (this.isOpen && this._data) this._data(pkt);
        }, 2);
      }
      /** Whether DYNAMIXEL packets get through to the motors and back. */
      _busAlive() {
        return this.regs.get(`${CM_ID2}:22`) === 1 && fault() !== "lowvolt";
      }
      _report(key, value, text2) {
        if (this.last.get(key) === value) return;
        this.last.set(key, value);
        this.onAction(text2);
      }
      /**
       * A relaxed joint is "moved by hand": it drifts slowly (±35°) so recorded
       * poses differ, unless a test placed it with window.__dmSimHand(id, deg).
       */
      _handPosition(id, now) {
        const placed = typeof window !== "undefined" && window.__dmSimHandPose && window.__dmSimHandPose[id];
        if (typeof placed === "number") return Math.round(placed / 360 * 4096);
        const l = this.limp.get(id);
        const t = (now - l.since) / 1e3;
        return Math.round(l.base + (Math.sin(t * 0.8 + id) - Math.sin(id)) * 400);
      }
      /** Live values for sensors and moving joints. */
      _read(id, addr, size) {
        const now = Date.now();
        const t = (now - this.t0) / 1e3;
        if (this.physics && this.ids.includes(id)) {
          if (addr === 132) return this.physics.presentTick(id);
          if (addr === 122) return this.physics.moving(id);
          if (addr === 128) return 0;
          if (addr === 64) return this.physics.torqueOn(id) ? 1 : 0;
        }
        if (this.physics && id === CM_ID2 && addr >= 102 && addr <= 118) return this.physics.imu(addr);
        if (this.ids.includes(id)) {
          const mv = this.moves.get(id);
          if (addr === 122) return mv && now < mv.end ? 1 : 0;
          if (addr === 132 && this.limp.has(id)) return this._handPosition(id, now);
          if (addr === 132 && mv) {
            const k = Math.min(1, (now - mv.start) / Math.max(1, mv.end - mv.start));
            return Math.round(mv.from + (mv.to - mv.from) * k);
          }
          if (addr === 128) {
            return this.regs.get(`${id}:104`) || 0;
          }
        }
        if (id === CM_ID2) {
          if (addr === 68) {
            if (!this.physics && this.motionUntil && now >= this.motionUntil) this._nextOnClock(now);
            return now < this.motionUntil || this._mplayAlive(now) ? 1 : 0;
          }
          if (addr === 66 && this._mplay) return this._mplay.index;
          const tilt = typeof window !== "undefined" && window.__dmSimTilt;
          if (tilt && addr >= 102 && addr <= 118) {
            const wob = tilt.shake ? Math.sin(now / 40) * tilt.shake : 0;
            const v2 = {
              102: tilt.roll || 0,
              104: tilt.pitch || 0,
              106: 0,
              108: wob * 50,
              110: wob * 30,
              112: 0,
              114: wob / 20,
              116: 0,
              118: 1
            }[addr];
            return Math.round(v2 * 100);
          }
          if (addr === 102) return Math.round(Math.sin(t / 3) * 300);
          if (addr === 104) return Math.round(Math.cos(t / 4) * 200);
          if (addr === 124) return now - this.t0;
          if (addr >= 415 && addr <= 427) return 300 + Math.round(200 * (1 + Math.sin(t)) / 2);
          if (addr >= 484 && addr <= 492) return 600 + Math.round(100 * Math.sin(t / 2));
          if (addr >= 469 && addr <= 473) return 1 + Math.floor(t / 2) % 6;
          if (addr >= 449 && addr <= 453) return 24;
        }
        const v = this.regs.get(`${id}:${addr}`) || 0;
        return size ? v : v;
      }
      /**
       * EEPROM is writable only with torque off; dual-axis modules (2XL430)
       * additionally need the other axis' torque off.
       */
      _eepromLocked(id) {
        if (this.regs.get(`${id}:64`)) return true;
        if (this.models[id] === 1090 || this.models[id] === 1160) {
          const sib = id % 2 ? id + 1 : id - 1;
          if (this.models[sib] === this.models[id] && this.regs.get(`${sib}:64`)) return true;
        }
        return false;
      }
      /** Assemble `len` bytes starting at addr from the register map. */
      _readBlock(id, addr, len) {
        const sizes = id === CM_ID2 ? CM_SIZES : DXL_SIZES;
        if (!sizes[addr] && len <= 4) return P22.le(this._read(id, addr, len), len);
        const out = new Array(len).fill(0);
        for (let a = addr; a < addr + len; a++) {
          const size = sizes[a];
          if (!size) continue;
          const bytes = P22.le(this._read(id, a, size), size);
          for (let i = 0; i < size && a - addr + i < len; i++) out[a - addr + i] = bytes[i];
        }
        return out;
      }
      _write(id, addr, value, size) {
        const prev = this.regs.get(`${id}:${addr}`);
        this.regs.set(`${id}:${addr}`, value);
        if (this.physics && id !== CM_ID2) {
          if (addr === 64) this.physics.setTorque(id, value);
          if (addr === 116) this.physics.setGoalTick(id, signed2(value, 4));
          if (addr === 112) this.physics.setProfile(id, value);
          if (this.quiet && (addr === 116 || addr === 112)) return;
        }
        if (id === CM_ID2) this._describeController(addr, value);
        else this._describeDxl(id, addr, value, size, prev);
      }
      /** CM-550 register 64: motion play speed in % (default 100). */
      _playSpeed() {
        const v = this.regs.get(`${CM_ID2}:64`);
        return v ? Math.max(0.2, v / 100) : 1;
      }
      _nextOnClock(now) {
        const lib = (init_motion_library(), __toCommonJS(motion_library_exports));
        const next = this.regs.get(`${CM_ID2}:69`);
        if (this._stopAtEnd || !next || next >= 65533 || !lib.hasMotion(next)) {
          this.motionUntil = 0;
          return;
        }
        this.regs.set(`${CM_ID2}:69`, 65535);
        this.regs.set(`${CM_ID2}:66`, next);
        this.motionUntil = now + Math.max(300, lib.motionSeconds(next) * 1e3 / this._playSpeed());
        this.last.delete("motion");
        this._report("motion", next, `모션 ${next}번 이어서: ${lib.motionName(next)}`);
      }
      _mplayAlive(now) {
        const s = this._mplay;
        if (!s) return false;
        if (now > s.wallLimit) {
          this._mplay = null;
          return false;
        }
        return true;
      }
      /**
       * Play call `index` of the motion file on the 3D robot like the CM-550 does:
       * key frames interpolated in simulated time; register 69 (다음 페이지) chains the
       * next call without a pause, 65534/65535 in register 66 stop at the end of the page.
       */
      _playOnPhysics(index) {
        const ph = this.physics;
        const lib = (init_motion_library(), __toCommonJS(motion_library_exports));
        const ids = lib.currentMotions().ids.filter((id) => this.ids.includes(id));
        const cur = () => lib.currentMotions().ids.map((id) => this.ids.includes(id) ? (ph.presentTick(id) - 2048) * 360 / 4096 : 0);
        const begin = (idx, from, time) => {
          const speed = this._playSpeed();
          const tl = lib.motionTimeline(idx, from, speed);
          this.regs.set(`${CM_ID2}:66`, idx);
          this._mplay = {
            index: idx,
            tl,
            t0: time,
            stopAtEnd: false,
            wallLimit: Date.now() + tl.seconds * 4e3 + 5e3
          };
        };
        for (const id of ids) {
          ph.setProfile(id, 0);
          if (!ph.torqueOn(id)) ph.setTorque(id, 1);
          this.regs.set(`${id}:64`, 1);
        }
        begin(index, cur(), ph.data.time);
        ph.setController((time) => {
          const s = this._mplay;
          if (!s) {
            ph.setController(null);
            return;
          }
          s.wallLimit = Math.max(s.wallLimit, Date.now() + 5e3);
          const t = time - s.t0;
          const pose = lib.poseAtTime(s.tl, Math.min(t, s.tl.seconds));
          s.tl.ids.forEach((id, n) => {
            if (this.ids.includes(id)) {
              const tick = Math.round(2048 + pose[n] * 4096 / 360);
              this.regs.set(`${id}:116`, tick);
              ph.setGoalTick(id, tick);
            }
          });
          if (t < s.tl.seconds) return;
          const next = this.regs.get(`${CM_ID2}:69`);
          if (!s.stopAtEnd && next && next < 65533 && lib.hasMotion(next)) {
            this.regs.set(`${CM_ID2}:69`, 65535);
            const last = s.tl.frames[s.tl.frames.length - 1].pose;
            begin(next, last, time);
            this.last.delete("motion");
            this._report("motion", next, `모션 ${next}번 이어서: ${lib.motionName(next)}`);
            return;
          }
          this._mplay = null;
          ph.setController(null);
        });
      }
      _describeController(addr, v) {
        const leds = { 91: "빨강", 92: "초록", 93: "파랑" };
        if (leds[addr]) {
          const rgbNow = () => [91, 92, 93].map((a) => this.regs.get(`${CM_ID2}:${a}`) ? 1 : 0).join("");
          const names = {
            100: "빨강",
            "010": "초록",
            "001": "파랑",
            110: "노랑",
            "011": "하늘",
            101: "보라",
            111: "흰색",
            "000": "꺼짐"
          };
          clearTimeout(this._ledTimer);
          this._ledTimer = setTimeout(() => {
            const rgb = rgbNow();
            this._report("cmled", rgb, `CM-550 LED: ${names[rgb] || rgb}`);
          }, 40);
          return;
        }
        if (addr === 85) {
          const idx = this.regs.get(`${CM_ID2}:84`) || 0;
          this.last.delete("buzzer");
          if (v === 255) return this._report("buzzer", `m${idx}`, `부저: 멜로디 ${idx}번`);
          return this._report("buzzer", `n${idx}`, `부저: ${idx}번 음 ${(v / 10).toFixed(1)}초`);
        }
        if (addr === 66) {
          if (v >= 65533) {
            const wasPlaying = Date.now() < this.motionUntil || Boolean(this._mplay);
            if (v !== 65533 && (this._mplay || Date.now() < this.motionUntil)) {
              if (this._mplay) this._mplay.stopAtEnd = true;
              else this._stopAtEnd = true;
              return void 0;
            }
            this._mplay = null;
            this.motionUntil = 0;
            this.last.delete("motion");
            return wasPlaying ? this.onAction("모션 정지") : void 0;
          }
          if (v === 0) return void 0;
          const lib = (init_motion_library(), __toCommonJS(motion_library_exports));
          if (!lib.hasMotion(v)) {
            this.last.delete("motion");
            if (this.physics) {
              this.motionUntil = 0;
              return this._report("motion", v, `⚠ 모션 ${v}번: 이 번호의 모션이 없습니다 (3D 탭의 모션 목록에서 번호를 확인하세요)`);
            }
            this.motionUntil = Date.now() + 1500;
            return this._report("motion", v, `모션 ${v}번 재생 (1.5초)`);
          }
          this._stopAtEnd = false;
          const secs = lib.motionSeconds(v) / this._playSpeed();
          this.last.delete("motion");
          if (this.physics) {
            this._playOnPhysics(v);
            return this._report("motion", v, `모션 ${v}번 재생: ${lib.motionName(v)} · ${secs.toFixed(1)}초`);
          }
          this.motionUntil = Date.now() + Math.max(300, secs * 1e3);
          return this._report("motion", v, `모션 ${v}번 재생: ${lib.motionName(v)} · ${secs.toFixed(1)}초`);
        }
        if (addr === 64) return this._report("mspeed", v, `모션 속도 ${v}%`);
        if (addr === 22) return this._report("dxlpower", v, `다이나믹셀 전원 ${onOff(v)}`);
        if (addr === 41) {
          if (v === 1 || v === 2) {
            for (const id of this.ids) this.regs.set(`${id}:64`, v === 2 ? 1 : 0);
            this.onAction(`모든 다이나믹셀 토크 ${v === 2 ? "켜기" : "끄기"}`);
          }
          return void 0;
        }
        if (addr >= 400 && addr <= 402) {
          const port = (addr - 400) / 2 + 1;
          const pct = v >= 1024 ? Math.round((v - 1024) / 1023 * 100) : -Math.round(v / 1023 * 100);
          return this._report(`wheel${port}`, v, `포트 ${port} 기어모터 ${pct}%`);
        }
        if (addr >= 404 && addr <= 406) {
          const port = (addr - 404) / 2 + 1;
          return this._report(`servo${port}`, v, `포트 ${port} 서보 → ${Math.round(v / 1023 * 300)}°`);
        }
        if (addr >= 434 && addr <= 438) {
          const states = ["모두 끄기", "오른쪽만", "왼쪽만", "모두 켜기"];
          return this._report(`ledmod${addr}`, v, `포트 ${addr - 433} LED 모듈 ${states[v] || v}`);
        }
        if (addr === 86 && v === 0) return this.onAction("소리 감지 횟수 초기화");
        if (addr === 40 && v === 1) {
          setTimeout(() => {
            this.regs.set(`${CM_ID2}:39`, this._busAlive() ? this.ids.length : 0);
            this.regs.set(`${CM_ID2}:40`, 0);
          }, 300);
        }
        return void 0;
      }
      _describeDxl(id, addr, v, size, prev) {
        if (addr === 64) {
          if (!v && !this.limp.has(id)) {
            this.limp.set(id, { base: this._read(id, 132), since: Date.now() });
            this.moves.delete(id);
          } else if (v && this.limp.has(id)) {
            this.regs.set(`${id}:132`, this._handPosition(id, Date.now()));
            this.limp.delete(id);
          }
          return this._report(`t${id}`, v, `다이나믹셀 ${id} 토크 ${onOff(v)}${v ? "" : " — 손으로 움직일 수 있음"}`);
        }
        if (addr === 65) return this._report(`l${id}`, v, `다이나믹셀 ${id} LED ${onOff(v)}`);
        if (addr === 11) {
          const names = { 0: "전류", 1: "바퀴(속도)", 3: "위치(관절)", 4: "확장 위치", 5: "전류 기반 위치(잡기)", 16: "PWM" };
          if ((v === 0 || v === 5) && !CURRENT_MODELS.has(this.models[id])) return void 0;
          return this._report(`m${id}`, v, `다이나믹셀 ${id} 모드 → ${names[v] || v}`);
        }
        if (addr === 116) {
          const to = signed2(v, 4);
          if (this.limp.has(id)) return void 0;
          const from = this._read(id, 132);
          const pv = this.regs.get(`${id}:112`) || 0;
          const rpm = (pv || VELOCITY_LIMIT) * 0.229;
          const ms = Math.min(4e3, Math.max(150, Math.abs(to - from) / 4096 * (6e4 / rpm)));
          this.moves.set(id, { from, to, start: Date.now(), end: Date.now() + ms });
          this.regs.set(`${id}:132`, to);
          this.last.delete(`p${id}`);
          return this._report(`p${id}`, to, `다이나믹셀 ${id} → ${tickToDeg2(to)}°`);
        }
        if (addr === 102) {
          const limit = this.regs.get(`${id}:38`) || 1;
          return this._report(`c${id}`, v, `다이나믹셀 ${id} 잡는 힘 ${Math.round(signed2(v, 2) / limit * 100)}%`);
        }
        if (addr === 104) {
          const vel = signed2(v, 4);
          const pct = Math.round(vel / VELOCITY_LIMIT * 100);
          return this._report(`v${id}`, vel, vel === 0 ? `다이나믹셀 ${id} 바퀴 정지` : `다이나믹셀 ${id} 바퀴 ${pct}%`);
        }
        return prev;
      }
      /** "모든 다이나믹셀 준비하기" on the 3D robot: back on its feet in a fresh world, like each try in 걸음 학습. */
      prepareWorld() {
        if (this.physics) this.physics.reset();
        return Promise.resolve();
      }
      write(bytes) {
        if (!this.isOpen) return Promise.reject(new Error("가상 로봇이 연결되어 있지 않습니다."));
        const b = Array.from(bytes);
        if (b[0] !== 255 || b[1] !== 255 || b[2] !== 253) return Promise.resolve();
        const id = b[4];
        const len = b[5] | b[6] << 8;
        const inst = b[7];
        const params = b.slice(8, 8 + len - 3);
        const relays = this._busAlive() && fault() !== "relay";
        const exists = (i) => i === CM_ID2 || this.ids.includes(i) && relays;
        if (inst === P22.INST.REBOOT) {
          if (!exists(id)) return Promise.resolve();
          if (this.physics) this.physics.setTorque(id, 0);
          this._reply(id);
          return Promise.resolve();
        }
        if (inst === P22.INST.SYNC_READ) {
          const addr = P22.fromLE(params, 0, 2);
          const size = P22.fromLE(params, 2, 2);
          params.slice(4).filter(exists).forEach((i) => this._reply(i, this._readBlock(i, addr, size)));
          return Promise.resolve();
        }
        if (inst === P22.INST.PING) {
          const pong = (i) => this._reply(i, P22.le(this.regs.get(`${i}:0`) || 0, 2).concat([i === CM_ID2 ? 47 : 46]));
          if (id === P22.BROADCAST_ID) [CM_ID2, ...this.ids].filter(exists).forEach(pong);
          else if (exists(id)) pong(id);
        } else if (inst === P22.INST.READ) {
          if (!exists(id)) return Promise.resolve();
          const addr = P22.fromLE(params, 0, 2);
          const size = P22.fromLE(params, 2, 2);
          this._reply(id, this._readBlock(id, addr, size));
        } else if (inst === P22.INST.WRITE) {
          if (!exists(id)) return Promise.resolve();
          const addr = P22.fromLE(params, 0, 2);
          const size = params.length - 2;
          if (id !== CM_ID2 && addr < 64 && this._eepromLocked(id)) {
            this._reply(id, [], 7);
            return Promise.resolve();
          }
          this._write(id, addr, P22.fromLE(params, 2, size), size);
          this._reply(id);
        } else if (inst === P22.INST.SYNC_WRITE) {
          const addr = P22.fromLE(params, 0, 2);
          const size = P22.fromLE(params, 2, 2);
          for (let i = 4; i + size < params.length + 1; i += 1 + size) {
            const did = params[i];
            if (this.ids.includes(did)) this._write(did, addr, P22.fromLE(params, i + 1, size), size);
          }
        }
        return Promise.resolve();
      }
    };
    module.exports = { SimTransport: SimTransport2 };
  }
});

// src/main.js
import * as ScratchBlocks2 from "https://cdn.jsdelivr.net/npm/scratch-blocks@2.2.1/dist/main.mjs";

// src/theme.js
var BRAND = "#2E6ABF";
var style = (primary, secondary, tertiary) => ({
  colourPrimary: primary,
  colourSecondary: secondary,
  colourTertiary: tertiary,
  colourQuaternary: tertiary
});
var ROBOT_STYLES = {
  db_dxl: style("#2E6ABF", "#2759A3", "#1F4A8A"),
  // 다이나믹셀 — brand blue
  db_controller: style("#0FA3A3", "#0D8F8F", "#0A7A7A"),
  // 컨트롤러
  db_port: style("#E5739B", "#DB5C88", "#C94A76"),
  // 센서·포트
  db_motion: style("#7E57D9", "#6E48C7", "#5E3BB0"),
  // 모션
  db_advanced: style("#5E6E87", "#516078", "#435168"),
  // 고급
  db_mymotors: style("#1C8FB8", "#187CA0", "#136786"),
  // 연결된 모터 (model-specific)
  db_pose: style("#E07B39", "#CC6A2C", "#B25B22"),
  // 자세 가르치기
  db_ai: style("#8E44AD", "#7D3C98", "#6C3483"),
  // AI 학습
  db_body: style("#13A89E", "#10958C", "#0D7F77"),
  // 몸 동작 (skeleton)
  db_walk: style("#5B6BD6", "#4E5DC4", "#4250AD")
  // 걸음 (3D simulator)
};
var blockColors = {
  motion: style("#4C97FF", "#4280D7", "#3373CC"),
  looks: style("#8A94A8", "#7B8599", "#6B7589"),
  // used for 출력(말하기) blocks
  sounds: style("#CF63CF", "#C94FC9", "#BD42BD"),
  control: style("#FFAB19", "#EC9C13", "#CF8B17"),
  event: style("#FFBF00", "#E6AC00", "#CC9900"),
  sensing: style("#5CB1D6", "#47A8D1", "#2E8EB8"),
  pen: style("#0FBD8C", "#0DA57A", "#0B8E69"),
  operators: style("#59C059", "#46B946", "#389438"),
  data: style("#FF8C1A", "#FF8000", "#DB6E00"),
  data_lists: style("#FF661A", "#FF5500", "#E64D00"),
  more: style("#FF6680", "#FF4D6A", "#FF3355"),
  ...ROBOT_STYLES,
  text: "#FFFFFF",
  workspace: "#F7F9FC",
  toolboxHover: BRAND,
  toolboxSelected: "#E8EEF8",
  toolboxText: "#4A5468",
  toolbox: "#FFFFFF",
  flyout: "#F1F4F9",
  scrollbar: "#CED6E2",
  scrollbarHover: "#B8C2D2",
  textField: "#FFFFFF",
  textFieldText: "#4A5468",
  insertionMarker: "#000000",
  insertionMarkerOpacity: 0.2,
  dragShadowOpacity: 0.6,
  stackGlow: "#FFF200",
  stackGlowSize: 4,
  stackGlowOpacity: 1,
  replacementGlow: "#FFFFFF",
  replacementGlowSize: 2,
  replacementGlowOpacity: 1,
  colourPickerStroke: "#FFFFFF",
  fieldShadow: "rgba(255, 255, 255, 0.3)",
  dropDownShadow: "rgba(0, 0, 0, .3)",
  numPadBackground: "#547AB2",
  numPadBorder: "#435F91",
  numPadActiveBackground: "#435F91",
  numPadText: "white",
  valueReportBackground: "#FFFFFF",
  valueReportBorder: "#AAAAAA",
  menuHover: "rgba(0, 0, 0, 0.2)"
};

// src/toolbox.js
var { modelInfo, modelName } = require_models();
var sep = '<sep gap="36"/>';
var num = (name, value, type = "math_number") => `<value name="${name}"><shadow type="${type}"><field name="NUM">${value}</field></shadow></value>`;
var text = (name, value) => `<value name="${name}"><shadow type="text"><field name="TEXT">${value}</field></shadow></value>`;
var category = (name, id, colors, body, extra = "") => `<category name="${name}" toolboxitemid="${id}" colour="${colors.colourPrimary}" secondaryColour="${colors.colourTertiary}" ${extra}>${body}</category>`;
var ROBOT_GROUPS = [
  {
    id: "db_dxl",
    name: "다이나믹셀",
    opcodes: [
      "dxlMoveTo",
      "dxlMoveToWait",
      "dxlMoveTwo",
      "---",
      "dxlPrepare",
      "dxlTogether",
      "dxlGoal",
      "---",
      "dxlWheel",
      "dxlWheelTwo",
      "dxlStop",
      "---",
      "dxlTorque",
      "dxlAllTorque",
      "dxlSetMode",
      "dxlLed",
      "---",
      "dxlRead",
      "dxlIsMoving",
      "dxlScan"
    ]
  },
  {
    id: "db_controller",
    name: "컨트롤러",
    opcodes: [
      "cmLedColor",
      "cmBuzzerNote",
      "cmBuzzerMelody",
      "---",
      "cmButton",
      "cmTilt",
      "cmGyro",
      "cmAccel",
      "---",
      "cmSoundCount",
      "cmSoundReset",
      "cmVoltage",
      "cmTemperature",
      "cmDxlPower",
      "---",
      "isConnected",
      "lastError"
    ]
  },
  {
    id: "db_port",
    name: "센서·포트",
    opcodes: ["portSensor", "portTouch", "portColor", "---", "portLed", "portServo", "portMotor"]
  },
  {
    id: "db_motion",
    name: "모션",
    opcodes: [
      "motionPlay",
      "motionPlayWait",
      "motionChain",
      "motionStop",
      "---",
      "motionSpeed",
      "motionNext",
      "---",
      "motionIsPlaying",
      "motionCount"
    ]
  },
  {
    id: "db_pose",
    name: "자세",
    opcodes: ["poseRelax", "poseRecord", "---", "posePlay", "posePlayAll", "---", "poseCount", "poseClear"]
  },
  {
    id: "db_ai",
    name: "AI 학습",
    opcodes: ["aiWhen", "---", "aiLabel", "aiIs", "aiConfidence", "---", "aiSwitch"]
  },
  {
    id: "db_walk",
    name: "걸음",
    opcodes: ["walkGait", "walkPolicy", "walkStop", "walking"]
  },
  {
    id: "db_body",
    name: "몸 동작",
    opcodes: ["skelVisible", "skelAngle", "skelPos", "---", "skelFollow", "---", "skelSwitch"]
  },
  {
    id: "db_mymotors",
    name: "연결된 모터",
    dynamic: true,
    opcodes: ["dxlModuleMove", "dxlModuleWheels", "dxlGrip", "dxlModelName"]
  },
  {
    id: "db_advanced",
    name: "고급",
    opcodes: ["rawWrite", "rawRead", "---", "connect", "disconnect"]
  }
];
var OPCODE_STYLE = {};
for (const g of ROBOT_GROUPS) {
  for (const op of g.opcodes) if (op !== "---") OPCODE_STYLE[op] = g.id;
}
var events = () => category("이벤트", "events", blockColors.event, `
    <block type="event_whenflagclicked"/>
    <block type="event_whenkeypressed"/>
    ${sep}
    <block type="event_whenbroadcastreceived"/>
    <block type="event_broadcast"><value name="BROADCAST_INPUT"><shadow type="event_broadcast_menu"/></value></block>
    <block type="event_broadcastandwait"><value name="BROADCAST_INPUT"><shadow type="event_broadcast_menu"/></value></block>
`);
var control = () => category("제어", "control", blockColors.control, `
    <block type="control_wait">${num("DURATION", 1, "math_positive_number")}</block>
    ${sep}
    <block type="control_repeat">${num("TIMES", 10, "math_whole_number")}</block>
    <block type="control_forever"/>
    ${sep}
    <block type="control_if"/>
    <block type="control_if_else"/>
    <block type="control_wait_until"/>
    <block type="control_repeat_until"/>
    ${sep}
    <block type="control_stop"/>
`);
var operators = () => category("연산", "operators", blockColors.operators, `
    <block type="operator_add">${num("NUM1", "")}${num("NUM2", "")}</block>
    <block type="operator_subtract">${num("NUM1", "")}${num("NUM2", "")}</block>
    <block type="operator_multiply">${num("NUM1", "")}${num("NUM2", "")}</block>
    <block type="operator_divide">${num("NUM1", "")}${num("NUM2", "")}</block>
    ${sep}
    <block type="operator_random">${num("FROM", 1)}${num("TO", 10)}</block>
    ${sep}
    <block type="operator_gt">${text("OPERAND1", "")}${text("OPERAND2", 50)}</block>
    <block type="operator_lt">${text("OPERAND1", "")}${text("OPERAND2", 50)}</block>
    <block type="operator_equals">${text("OPERAND1", "")}${text("OPERAND2", 50)}</block>
    ${sep}
    <block type="operator_and"/>
    <block type="operator_or"/>
    <block type="operator_not"/>
    ${sep}
    <block type="operator_join">${text("STRING1", "로봇")}${text("STRING2", " 출발")}</block>
    <block type="operator_letter_of">${num("LETTER", 1, "math_whole_number")}${text("STRING", "로봇")}</block>
    <block type="operator_length">${text("STRING", "로봇")}</block>
    <block type="operator_contains">${text("STRING1", "로봇")}${text("STRING2", "봇")}</block>
    ${sep}
    <block type="operator_mod">${num("NUM1", "")}${num("NUM2", "")}</block>
    <block type="operator_round">${num("NUM", "")}</block>
    ${sep}
    <block type="operator_mathop">${num("NUM", "")}</block>
`);
var variables = () => category("변수", "variables", blockColors.data, "", 'custom="VARIABLE"');
var myBlocks = () => category("내 블록", "myBlocks", blockColors.more, "", 'custom="PROCEDURE"');
var output = () => category("출력·타이머", "output", blockColors.looks, `
    <block type="looks_say">${text("MESSAGE", "안녕!")}</block>
    <block type="looks_sayforsecs">${text("MESSAGE", "안녕!")}${num("SECS", 2)}</block>
    ${sep}
    <block type="sensing_timer"/>
    <block type="sensing_resettimer"/>
    <block type="sensing_keypressed"><value name="KEY_OPTION"><shadow type="sensing_keyoptions"/></value></block>
`);
var xmlEscape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var label = (text2) => `<label text="${xmlEscape(text2)}"/>`;
var withId = (xml, id) => id ? xml.replace(/(<field name="dxlId">)[^<]*(<\/field>)/g, `$1${id}$2`) : xml;
var withModule = (xml, pair) => pair ? xml.replace(/(<field name="MODULE">)[^<]*(<\/field>)/, `$1${pair.a},${pair.b}$2`) : xml;
var myMotorsBody = (robotBlockXML, motors, desc) => {
  if (!motors.length) {
    return label("로봇을 연결하면 모터 종류에 맞는 블록이 여기에 나타납니다.");
  }
  const counts = {};
  for (const m of motors) counts[modelName(m.model)] = (counts[modelName(m.model)] || 0) + 1;
  const parts = [label(`검색된 모터: ${Object.entries(counts).map(([k, v]) => `${k} ${v}개`).join(", ")}`)];
  if (desc.pairs.length) {
    parts.push(label(`2축 모듈 ${desc.pairs.length}개 (A축·B축을 한 번에)`));
    parts.push(withModule(robotBlockXML.dxlModuleMove || "", desc.pairs[0]));
    parts.push(withModule(robotBlockXML.dxlModuleWheels || "", desc.pairs[0]));
    parts.push(sep);
  }
  const current2 = motors.filter((m) => modelInfo(m.model) && modelInfo(m.model).current);
  if (current2.length) {
    parts.push(label(`힘 조절(전류 제어) 모터: ID ${current2.map((m) => m.id).join(", ")}`));
    parts.push(withId(robotBlockXML.dxlGrip || "", current2[0].id));
    parts.push(sep);
  }
  parts.push(withId(robotBlockXML.dxlModelName || "", motors[0].id));
  return parts.join("\n");
};
var makeToolbox = (robotBlockXML, scan) => {
  const motors = scan && scan.motors || [];
  const desc = scan && scan.desc || { pairs: [], labels: {}, axis: {} };
  const firstId = motors.length && !motors.some((m) => m.id === 1) ? motors[0].id : 0;
  const robot = {};
  for (const g of ROBOT_GROUPS) {
    const body = g.dynamic ? myMotorsBody(robotBlockXML, motors, desc) : g.opcodes.map((op) => op === "---" ? sep : withId(robotBlockXML[op] || "", firstId)).join("\n");
    robot[g.id] = category(g.name, g.id, ROBOT_STYLES[g.id], body);
  }
  return [
    '<xml style="display: none">',
    events(),
    control(),
    robot.db_dxl,
    robot.db_mymotors,
    robot.db_pose,
    robot.db_ai,
    robot.db_body,
    robot.db_walk,
    robot.db_controller,
    robot.db_port,
    robot.db_motion,
    operators(),
    variables(),
    myBlocks(),
    output(),
    robot.db_advanced,
    "</xml>"
  ].join("\n");
};

// src/dialogs.js
import * as ScratchBlocks from "https://cdn.jsdelivr.net/npm/scratch-blocks@2.2.1/dist/main.mjs";
var el = (tag, attrs = {}, children = []) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) e.append(c);
  return e;
};
var openModal = (title, body, buttons, onClose) => {
  const box = el("div", { class: "db-modal" }, [
    el("div", { class: "db-modal-title", text: title }),
    body,
    el("div", { class: "db-modal-buttons" }, buttons)
  ]);
  const overlay = el("div", { class: "db-overlay" }, box);
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) close();
  });
  const keyHandler = (e) => {
    if (e.key === "Escape") close();
  };
  function close() {
    document.removeEventListener("keydown", keyHandler, true);
    overlay.remove();
    if (onClose) onClose();
  }
  document.addEventListener("keydown", keyHandler, true);
  document.body.append(overlay);
  return { overlay, close };
};
var TITLES = {
  "": "새로운 변수",
  "list": "새로운 리스트",
  "broadcast_msg": "새로운 메시지"
};
var makePromptHandler = (vm2) => (message, defaultValue, callback, optTitle, optVarType) => {
  const varType = typeof optVarType === "string" ? optVarType : "";
  const title = optTitle || TITLES[varType] || "이름 입력";
  const input = el("input", { class: "db-input", type: "text", value: defaultValue || "" });
  let done = false;
  const finish = (value) => {
    if (done) return;
    done = true;
    modal.close();
    callback(value, vm2.runtime.getAllVarNamesOfType(varType), { scope: "global", isCloud: false });
  };
  const ok = el("button", { class: "db-btn db-btn-primary", text: "확인", onclick: () => finish(input.value) });
  const cancel = el("button", { class: "db-btn", text: "취소", onclick: () => finish(null) });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(input.value);
  });
  const modal = openModal(title, el("div", { class: "db-modal-body" }, [
    el("label", { class: "db-label", text: message }),
    input
  ]), [cancel, ok], () => {
    if (!done) {
      done = true;
      callback(null);
    }
  });
  setTimeout(() => {
    input.focus();
    input.select();
  });
};
var makeProcedureEditor = (workspaceOptions2, onDone) => (mutator, callback) => {
  const host = el("div", { class: "db-proc-workspace" });
  let workspace2 = null;
  let root = null;
  let result = null;
  const nextName = (prefix) => {
    const used = new Set(root.displayNames_ || []);
    let i = 1;
    while (used.has(`${prefix}${i}`)) i++;
    return `${prefix}${i}`;
  };
  const addArgument = (kind) => {
    if (kind === "label") {
      root.addLabelExternal();
      root.procCode_ = root.procCode_.replace(/ label text$/, " 설명");
    } else {
      const name = nextName(kind === "boolean" ? "조건" : "값");
      if (kind === "boolean") root.addBooleanExternal();
      else root.addStringNumberExternal();
      root.displayNames_[root.displayNames_.length - 1] = name;
    }
    root.updateDisplay_();
    root.focusLastEditor_();
  };
  const addBtn = (label2, fn) => el("button", { class: "db-btn", text: label2, onclick: () => root && fn() });
  const warp = el("input", { type: "checkbox", id: "db-warp" });
  warp.addEventListener("change", () => root && root.setWarp(warp.checked));
  const ok = el("button", { class: "db-btn db-btn-primary", text: "확인", onclick: () => {
    result = root ? root.mutationToDom(true) : null;
    modal.close();
  } });
  const cancel = el("button", { class: "db-btn", text: "취소", onclick: () => modal.close() });
  const body = el("div", { class: "db-modal-body" }, [
    host,
    el("div", { class: "db-proc-tools" }, [
      addBtn("+ 입력값 (숫자/문자)", () => addArgument("string")),
      addBtn("+ 입력값 (참/거짓)", () => addArgument("boolean")),
      addBtn("+ 라벨 글자", () => addArgument("label"))
    ]),
    el("label", { class: "db-check", for: "db-warp" }, [warp, document.createTextNode(" 화면 새로 고침 없이 실행하기")])
  ]);
  const modal = openModal("블록 만들기", body, [cancel, ok], () => {
    if (workspace2) {
      ScratchBlocks.WidgetDiv.hide();
      const main = ScratchBlocks.getMainWorkspace();
      if (main) ScratchBlocks.getFocusManager().focusTree(main);
      workspace2.dispose();
    }
    if (result) callback(result);
    if (onDone) onDone();
  });
  modal.overlay.querySelector(".db-modal").classList.add("db-modal-wide");
  workspace2 = ScratchBlocks.inject(host, Object.assign({}, workspaceOptions2, {
    zoom: { controls: false, wheel: false, startScale: 0.9 },
    comments: false,
    collapse: false,
    scrollbars: true,
    sounds: false,
    toolbox: null
  }));
  root = workspace2.newBlock("procedures_declaration");
  root.setMovable(false);
  root.setDeletable(false);
  root.contextMenu = false;
  workspace2.addChangeListener(() => {
    root.onChangeFn();
    const m = workspace2.getMetrics();
    const { x, y } = root.getRelativeToSurfaceXY();
    const dy = m.viewHeight / 2 - root.height / 2 - y;
    let dx = m.viewWidth / 2 - root.width / 2 - x;
    if (root.width > m.viewWidth) dx = m.viewWidth - root.width - x;
    root.moveBy(dx, dy);
  });
  root.domToMutation(mutator);
  root.initSvg();
  root.render();
  warp.checked = root.getWarp();
  setTimeout(() => root.focusLastEditor_());
};
var confirmDialog = (title, message, okText = "확인") => new Promise((resolve) => {
  let answer = false;
  const ok = el("button", { class: "db-btn db-btn-primary", text: okText, onclick: () => {
    answer = true;
    modal.close();
  } });
  const cancel = el("button", { class: "db-btn", text: "취소", onclick: () => modal.close() });
  const modal = openModal(
    title,
    el("div", { class: "db-modal-body" }, el("p", { text: message })),
    [cancel, ok],
    () => resolve(answer)
  );
});

// src/project.js
var AUTOSAVE_KEY = "dynamicmakers.autosave.v1";
var COSTUME = {
  name: "robot",
  bitmapResolution: 1,
  dataFormat: "svg",
  assetId: "cd21514d0531fdffb22204e0ec5ed84a",
  md5ext: "cd21514d0531fdffb22204e0ec5ed84a.svg",
  rotationCenterX: 0,
  rotationCenterY: 0
};
var emptyProject = () => ({
  targets: [
    {
      isStage: true,
      name: "Stage",
      variables: {},
      lists: {},
      broadcasts: {},
      blocks: {},
      comments: {},
      currentCostume: 0,
      costumes: [Object.assign({}, COSTUME, { name: "backdrop" })],
      sounds: [],
      volume: 100,
      layerOrder: 0,
      tempo: 60,
      videoTransparency: 50,
      videoState: "off",
      textToSpeechLanguage: null
    },
    {
      isStage: false,
      name: "로봇",
      variables: {},
      lists: {},
      broadcasts: {},
      comments: {},
      blocks: {
        start: {
          opcode: "event_whenflagclicked",
          next: null,
          parent: null,
          inputs: {},
          fields: {},
          shadow: false,
          topLevel: true,
          x: 60,
          y: 60
        }
      },
      currentCostume: 0,
      costumes: [COSTUME],
      sounds: [],
      volume: 100,
      layerOrder: 1,
      visible: false,
      x: 0,
      y: 0,
      size: 100,
      direction: 90,
      draggable: false,
      rotationStyle: "all around"
    }
  ],
  monitors: [],
  extensions: ["cm550"],
  meta: { semver: "3.0.0", vm: "0.2.0", agent: "Dynamic Makers" }
});
var loadAutosave = () => {
  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};
var saveAutosave = (name, projectJSON2) => {
  try {
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ name, project: projectJSON2, savedAt: Date.now() }));
    return true;
  } catch (e) {
    return false;
  }
};
var download = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(a.href);
  }, 1500);
};
var safeFileName = (name) => String(name || "").trim().replace(/[\\/:*?"<>|]+/g, "_") || "다이나믹 메이커스";
var pickFile = () => new Promise((resolve) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".dmk,.dbx,.sb3,.json";
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return resolve(null);
    const reader = new FileReader();
    const isZip = /\.sb3$/i.test(file.name);
    reader.onload = () => resolve({ name: file.name.replace(/\.(dmk|dbx|sb3|json)$/i, ""), data: reader.result });
    if (isZip) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  });
  input.click();
});

// src/main.js
var import_python_panel_dom = __toESM(require_python_panel_dom());
var import_extension = __toESM(require_extension());
var import_sim_robot = __toESM(require_sim_robot());

// src/generated/media.js
var MEDIA = {
  "green-flag.svg": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIxLjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9ImdyZWVuZmxhZyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiCgkgdmlld0JveD0iMCAwIDI0IDI0IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyNCAyNDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiM0NTk5M0Q7fQoJLnN0MXtmaWxsOiM0Q0JGNTY7fQo8L3N0eWxlPgo8dGl0bGU+Z3JlZW5mbGFnPC90aXRsZT4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTIwLjgsMy43Yy0wLjQtMC4yLTAuOS0wLjEtMS4yLDAuMmMtMiwxLjYtNC44LDEuNi02LjgsMGMtMi4zLTEuOS01LjYtMi4zLTguMy0xVjIuNWMwLTAuNi0wLjUtMS0xLTEKCXMtMSwwLjQtMSwxdjE4LjhjMCwwLjUsMC41LDEsMSwxaDAuMWMwLjUsMCwxLTAuNSwxLTF2LTYuNGMxLTAuNywyLjEtMS4yLDMuNC0xLjNjMS4yLDAsMi40LDAuNCwzLjQsMS4yYzIuOSwyLjMsNywyLjMsOS44LDAKCWMwLjMtMC4yLDAuNC0wLjUsMC40LTAuOVY0LjdDMjEuNiw0LjIsMjEuMywzLjgsMjAuOCwzLjd6IE0yMC41LDEzLjlDMjAuNSwxMy45LDIwLjUsMTMuOSwyMC41LDEzLjlDMTgsMTYsMTQuNCwxNiwxMS45LDE0CgljLTEuMS0wLjktMi41LTEuNC00LTEuNGMtMS4yLDAuMS0yLjMsMC41LTMuNCwxLjFWNEM3LDIuNiwxMCwyLjksMTIuMiw0LjZjMi40LDEuOSw1LjcsMS45LDguMSwwYzAuMSwwLDAuMSwwLDAuMiwwCgljMCwwLDAuMSwwLjEsMC4xLDAuMUwyMC41LDEzLjl6Ii8+CjxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0yMC42LDQuOGwtMC4xLDkuMWMwLDAsMCwwLjEsMCwwLjFjLTIuNSwyLTYuMSwyLTguNiwwYy0xLjEtMC45LTIuNS0xLjQtNC0xLjRjLTEuMiwwLjEtMi4zLDAuNS0zLjQsMS4xVjQKCUM3LDIuNiwxMCwyLjksMTIuMiw0LjZjMi40LDEuOSw1LjcsMS45LDguMSwwYzAuMSwwLDAuMSwwLDAuMiwwQzIwLjUsNC43LDIwLjYsNC43LDIwLjYsNC44eiIvPgo8L3N2Zz4K",
  "repeat.svg": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIxLjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9InJlcGVhdCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiCgkgdmlld0JveD0iMCAwIDI0IDI0IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyNCAyNDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiNDRjhCMTc7fQoJLnN0MXtmaWxsOiNGRkZGRkY7fQo8L3N0eWxlPgo8dGl0bGU+cmVwZWF0PC90aXRsZT4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTIzLjMsMTFjLTAuMywwLjYtMC45LDEtMS41LDFoLTEuNmMtMC4xLDEuMy0wLjUsMi41LTEuMSwzLjZjLTAuOSwxLjctMi4zLDMuMi00LjEsNC4xCgljLTEuNywwLjktMy42LDEuMi01LjUsMC45Yy0xLjgtMC4zLTMuNS0xLjEtNC45LTIuM2MtMC43LTAuNy0wLjctMS45LDAtMi42YzAuNi0wLjYsMS42LTAuNywyLjMtMC4ySDdjMC45LDAuNiwxLjksMC45LDIuOSwwLjkKCXMxLjktMC4zLDIuNy0wLjljMS4xLTAuOCwxLjgtMi4xLDEuOC0zLjVoLTEuNWMtMC45LDAtMS43LTAuNy0xLjctMS43YzAtMC40LDAuMi0wLjksMC41LTEuMmw0LjQtNC40YzAuNy0wLjYsMS43LTAuNiwyLjQsMEwyMyw5LjIKCUMyMy41LDkuNywyMy42LDEwLjQsMjMuMywxMXoiLz4KPHBhdGggY2xhc3M9InN0MSIgZD0iTTIxLjgsMTFoLTIuNmMwLDEuNS0wLjMsMi45LTEsNC4yYy0wLjgsMS42LTIuMSwyLjgtMy43LDMuNmMtMS41LDAuOC0zLjMsMS4xLTQuOSwwLjhjLTEuNi0wLjItMy4yLTEtNC40LTIuMQoJYy0wLjQtMC4zLTAuNC0wLjktMC4xLTEuMmMwLjMtMC40LDAuOS0wLjQsMS4yLTAuMWwwLDBjMSwwLjcsMi4yLDEuMSwzLjQsMS4xczIuMy0wLjMsMy4zLTFjMC45LTAuNiwxLjYtMS41LDItMi42CgljMC4zLTAuOSwwLjQtMS44LDAuMi0yLjhoLTIuNGMtMC40LDAtMC43LTAuMy0wLjctMC43YzAtMC4yLDAuMS0wLjMsMC4yLTAuNGw0LjQtNC40YzAuMy0wLjMsMC43LTAuMywwLjksMEwyMiw5LjgKCWMwLjMsMC4zLDAuNCwwLjYsMC4zLDAuOVMyMiwxMSwyMS44LDExeiIvPgo8L3N2Zz4K",
  "rotate-left.svg": "data:image/svg+xml;base64,PHN2ZyBpZD0icm90YXRlLWNsb2Nrd2lzZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxkZWZzPjxzdHlsZT4uY2xzLTF7ZmlsbDojM2Q3OWNjO30uY2xzLTJ7ZmlsbDojZmZmO308L3N0eWxlPjwvZGVmcz48dGl0bGU+cm90YXRlLWNsb2Nrd2lzZTwvdGl0bGU+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMjAuMzQsMTguMjFhMTAuMjQsMTAuMjQsMCwwLDEtOC4xLDQuMjIsMi4yNiwyLjI2LDAsMCwxLS4xNi00LjUyaDBhNS41OCw1LjU4LDAsMCwwLDQuMjUtMi41Myw1LjA2LDUuMDYsMCwwLDAsLjU0LTQuNjJBNC4yNSw0LjI1LDAsMCwwLDE1LjU1LDlhNC4zMSw0LjMxLDAsMCwwLTItLjhBNC44Miw0LjgyLDAsMCwwLDEwLjQsOWwxLjEyLDEuNDFBMS41OSwxLjU5LDAsMCwxLDEwLjM2LDEzSDIuNjdhMS41NiwxLjU2LDAsMCwxLTEuMjYtLjYzQTEuNTQsMS41NCwwLDAsMSwxLjEzLDExTDIuODUsMy41N0ExLjU5LDEuNTksMCwwLDEsNC4zOCwyLjQsMS41NywxLjU3LDAsMCwxLDUuNjIsM0w2LjcsNC4zNWExMC42NiwxMC42NiwwLDAsMSw3LjcyLTEuNjhBOS44OCw5Ljg4LDAsMCwxLDE5LDQuODEsOS42MSw5LjYxLDAsMCwxLDIxLjgzLDksMTAuMDgsMTAuMDgsMCwwLDEsMjAuMzQsMTguMjFaIi8+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJNMTkuNTYsMTcuNjVhOS4yOSw5LjI5LDAsMCwxLTcuMzUsMy44MywxLjMxLDEuMzEsMCwwLDEtLjA4LTIuNjIsNi41Myw2LjUzLDAsMCwwLDUtMi45Miw2LjA1LDYuMDUsMCwwLDAsLjY3LTUuNTEsNS4zMiw1LjMyLDAsMCwwLTEuNjQtMi4xNiw1LjIxLDUuMjEsMCwwLDAtMi40OC0xQTUuODYsNS44NiwwLDAsMCw5LDguODRMMTAuNzQsMTFhLjU5LjU5LDAsMCwxLS40MywxSDIuN2EuNi42LDAsMCwxLS42LS43NUwzLjgxLDMuODNhLjU5LjU5LDAsMCwxLDEtLjIxbDEuNjcsMi4xYTkuNzEsOS43MSwwLDAsMSw3Ljc1LTIuMDcsOC44NCw4Ljg0LDAsMCwxLDQuMTIsMS45Miw4LjY4LDguNjgsMCwwLDEsMi41NCwzLjcyQTkuMTQsOS4xNCwwLDAsMSwxOS41NiwxNy42NVoiLz48L3N2Zz4=",
  "rotate-right.svg": "data:image/svg+xml;base64,PHN2ZyBpZD0icm90YXRlLWNvdW50ZXItY2xvY2t3aXNlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiMzZDc5Y2M7fS5jbHMtMntmaWxsOiNmZmY7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT5yb3RhdGUtY291bnRlci1jbG9ja3dpc2U8L3RpdGxlPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTIyLjY4LDEyLjJhMS42LDEuNiwwLDAsMS0xLjI3LjYzSDEzLjcyYTEuNTksMS41OSwwLDAsMS0xLjE2LTIuNThsMS4xMi0xLjQxYTQuODIsNC44MiwwLDAsMC0zLjE0LS43Nyw0LjMxLDQuMzEsMCwwLDAtMiwuOCw0LjI1LDQuMjUsMCwwLDAtMS4zNCwxLjczLDUuMDYsNS4wNiwwLDAsMCwuNTQsNC42MkE1LjU4LDUuNTgsMCwwLDAsMTIsMTcuNzRoMGEyLjI2LDIuMjYsMCwwLDEtLjE2LDQuNTJBMTAuMjUsMTAuMjUsMCwwLDEsMy43NCwxOCwxMC4xNCwxMC4xNCwwLDAsMSwyLjI1LDguNzgsOS43LDkuNywwLDAsMSw1LjA4LDQuNjQsOS45Miw5LjkyLDAsMCwxLDkuNjYsMi41YTEwLjY2LDEwLjY2LDAsMCwxLDcuNzIsMS42OGwxLjA4LTEuMzVhMS41NywxLjU3LDAsMCwxLDEuMjQtLjYsMS42LDEuNiwwLDAsMSwxLjU0LDEuMjFsMS43LDcuMzdBMS41NywxLjU3LDAsMCwxLDIyLjY4LDEyLjJaIi8+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJNMjEuMzgsMTEuODNIMTMuNzdhLjU5LjU5LDAsMCwxLS40My0xbDEuNzUtMi4xOWE1LjksNS45LDAsMCwwLTQuNy0xLjU4LDUuMDcsNS4wNywwLDAsMC00LjExLDMuMTdBNiw2LDAsMCwwLDcsMTUuNzdhNi41MSw2LjUxLDAsMCwwLDUsMi45MiwxLjMxLDEuMzEsMCwwLDEtLjA4LDIuNjIsOS4zLDkuMywwLDAsMS03LjM1LTMuODJBOS4xNiw5LjE2LDAsMCwxLDMuMTcsOS4xMiw4LjUxLDguNTEsMCwwLDEsNS43MSw1LjQsOC43Niw4Ljc2LDAsMCwxLDkuODIsMy40OGE5LjcxLDkuNzEsMCwwLDEsNy43NSwyLjA3bDEuNjctMi4xYS41OS41OSwwLDAsMSwxLC4yMUwyMiwxMS4wOEEuNTkuNTksMCwwLDEsMjEuMzgsMTEuODNaIi8+PC9zdmc+",
  "zoom-in.svg": "data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNiAzNiI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiMyMzFmMjA7b3BhY2l0eTowLjE1O30uY2xzLTJ7ZmlsbDojZmZmO30uY2xzLTN7b3BhY2l0eTowLjc1O30uY2xzLTR7ZmlsbDpub25lO3N0cm9rZTojNTc1ZTc1O3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2Utd2lkdGg6MS41cHg7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT56b29tLWluPC90aXRsZT48Y2lyY2xlIGNsYXNzPSJjbHMtMSIgY3g9IjE4IiBjeT0iMTgiIHI9IjE4Ii8+PGNpcmNsZSBjbGFzcz0iY2xzLTIiIGN4PSIxOCIgY3k9IjE4IiByPSIxNiIvPjxnIGNsYXNzPSJjbHMtMyI+PGNpcmNsZSBjbGFzcz0iY2xzLTQiIGN4PSIxOCIgY3k9IjE4IiByPSI3Ii8+PGxpbmUgY2xhc3M9ImNscy00IiB4MT0iMjMiIHkxPSIyMyIgeDI9IjI2IiB5Mj0iMjYiLz48bGluZSBjbGFzcz0iY2xzLTQiIHgxPSIxNiIgeTE9IjE4IiB4Mj0iMjAiIHkyPSIxOCIvPjxsaW5lIGNsYXNzPSJjbHMtNCIgeDE9IjE4IiB5MT0iMTYiIHgyPSIxOCIgeTI9IjIwIi8+PC9nPjwvc3ZnPg==",
  "zoom-out.svg": "data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNiAzNiI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiMyMzFmMjA7b3BhY2l0eTowLjE1O30uY2xzLTJ7ZmlsbDojZmZmO30uY2xzLTN7b3BhY2l0eTowLjc1O30uY2xzLTR7ZmlsbDpub25lO3N0cm9rZTojNTc1ZTc1O3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2Utd2lkdGg6MS41cHg7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT56b29tLW91dDwvdGl0bGU+PGNpcmNsZSBjbGFzcz0iY2xzLTEiIGN4PSIxOCIgY3k9IjE4IiByPSIxOCIvPjxjaXJjbGUgY2xhc3M9ImNscy0yIiBjeD0iMTgiIGN5PSIxOCIgcj0iMTYiLz48ZyBjbGFzcz0iY2xzLTMiPjxjaXJjbGUgY2xhc3M9ImNscy00IiBjeD0iMTgiIGN5PSIxOCIgcj0iNyIvPjxsaW5lIGNsYXNzPSJjbHMtNCIgeDE9IjIzIiB5MT0iMjMiIHgyPSIyNiIgeTI9IjI2Ii8+PGxpbmUgY2xhc3M9ImNscy00IiB4MT0iMTYiIHkxPSIxOCIgeDI9IjIwIiB5Mj0iMTgiLz48L2c+PC9zdmc+",
  "zoom-reset.svg": "data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNiAzNiI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiMyMzFmMjA7b3BhY2l0eTowLjE1O30uY2xzLTJ7ZmlsbDojZmZmO30uY2xzLTN7b3BhY2l0eTowLjc1O30uY2xzLTR7ZmlsbDojNTc1ZTc1O308L3N0eWxlPjwvZGVmcz48dGl0bGU+em9vbS1yZXNldDwvdGl0bGU+PGNpcmNsZSBjbGFzcz0iY2xzLTEiIGN4PSIxOCIgY3k9IjE4IiByPSIxOCIvPjxjaXJjbGUgY2xhc3M9ImNscy0yIiBjeD0iMTgiIGN5PSIxOCIgcj0iMTYiLz48ZyBjbGFzcz0iY2xzLTMiPjxyZWN0IGNsYXNzPSJjbHMtNCIgeD0iMTMiIHk9IjE0IiB3aWR0aD0iMTAiIGhlaWdodD0iMiIgcng9IjEiIHJ5PSIxIi8+PHJlY3QgY2xhc3M9ImNscy00IiB4PSIxMyIgeT0iMjAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIyIiByeD0iMSIgcnk9IjEiLz48L2c+PC9zdmc+",
  "delete-icon.svg": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMzJweCIgaGVpZ2h0PSIzMnB4IiB2aWV3Qm94PSItMTQgLTEwIDMyIDMyIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgogICAgPCEtLSBHZW5lcmF0b3I6IFNrZXRjaCA1MC4yICg1NTA0NykgLSBodHRwOi8vd3d3LmJvaGVtaWFuY29kaW5nLmNvbS9za2V0Y2ggLS0+CiAgICA8dGl0bGU+ZGVsZXRlLXg8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZGVmcz48L2RlZnM+CiAgICA8ZyBpZD0iZGVsZXRlLXgiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxwYXRoIGQ9Ik0xMC44NzYxMTIzLDEwLjg3ODI1IEMxMC4yNDIxMTIzLDExLjUyMTI1IDkuMjA1MTEyMzEsMTEuNTIxMjUgOC41NjIxMTIzMSwxMC44NzgyNSBMNS45MjkxMTIzMSw4LjI0NTI1IEwzLjI5NTExMjMxLDEwLjg3ODI1IEMyLjY1NjExMjMxLDExLjUxNzI1IDEuNjIwMTEyMzEsMTEuNTE3MjUgMC45ODExMTIzMDYsMTAuODc4MjUgQzAuNjYyMTEyMzA2LDEwLjU1OTI1IDAuNTAwMTEyMzA2LDEwLjEzNzI1IDAuNTAwMTEyMzA2LDkuNzIxMjUgQzAuNTAwMTEyMzA2LDkuMzA0MjUgMC42NjIxMTIzMDYsOC44ODMyNSAwLjk4MTExMjMwNiw4LjU2NDI1IEwzLjYxNDExMjMxLDUuOTMxMjUgTDAuOTc3MTEyMzA2LDMuMjkzMjUgQzAuNjU3MTEyMzA2LDIuOTczMjUgMC40OTUxMTIzMDYsMi41NTIyNSAwLjUwMDExMjMwNiwyLjEzMTI1IEMwLjUwMDExMjMwNiwxLjcxNDI1IDAuNjU3MTEyMzA2LDEuMjk4MjUgMC45NzcxMTIzMDYsMC45NzkyNSBDMS42MTUxMTIzMSwwLjM0MDI1IDIuNjUxMTEyMzEsMC4zNDAyNSAzLjI5MTExMjMxLDAuOTc5MjUgTDUuOTI5MTEyMzEsMy42MTYyNSBMOC41NjYxMTIzMSwwLjk3OTI1IEM5LjIwNTExMjMxLDAuMzQwMjUgMTAuMjQyMTEyMywwLjM0MDI1IDEwLjg4MTExMjMsMC45NzkyNSBDMTEuNTIwMTEyMywxLjYxNzI1IDExLjUyMDExMjMsMi42NTQyNSAxMC44ODExMTIzLDMuMjkzMjUgTDguMjQyMTEyMzEsNS45MzEyNSBMMTAuODgxMTEyMyw4LjU2ODI1IEMxMS41MjAxMTIzLDkuMjA3MjUgMTEuNTIwMTEyMywxMC4yMzQyNSAxMC44NzYxMTIzLDEwLjg3ODI1IiBpZD0iRmlsbC0xIiBmaWxsPSIjNTc1RTc1Ij48L3BhdGg+CiAgICA8L2c+Cjwvc3ZnPgo=",
  "foldout-icon.svg": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMzJweCIgaGVpZ2h0PSIzMnB4IiB2aWV3Qm94PSItNC41IC02IDI0IDI0IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgogICAgPCEtLSBHZW5lcmF0b3I6IFNrZXRjaCA1MC4yICg1NTA0NykgLSBodHRwOi8vd3d3LmJvaGVtaWFuY29kaW5nLmNvbS9za2V0Y2ggLS0+CiAgICA8dGl0bGU+ZHJvcGRvd24tY2FyZXQtdXA8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZGVmcz48L2RlZnM+CiAgICA8ZyBpZD0iZHJvcGRvd24tY2FyZXQtdXAiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxwYXRoIGQ9Ik02LDkgQzUuNzI1MjA3MDgsOSA1LjQ1MTYzMDA2LDguODk2OTUwNDUgNS4yNDEyNzk3Myw4LjY4OTY1MzExIEwyLjMxNDYxMzU3LDUuODA2NjYyMjcgQzEuODk1MTI4ODEsNS4zOTMyNjU4MyAxLjg5NTEyODgxLDQuNzI0NjQyMDIgMi4zMTQ2MTM1Nyw0LjMxMDA0NzMzIEMyLjczMjg4MjQ0LDMuODk2NjUwODkgOS4yNjcxMTc1NiwzLjg5NjY1MDg5IDkuNjg1Mzg2NDMsNC4zMTAwNDczMyBDMTAuMTA0ODcxMiw0LjcyMzQ0Mzc3IDEwLjEwNDg3MTIsNS4zOTMyNjU4MyA5LjY4NTM4NjQzLDUuODA2NjYyMjcgTDYuNzU5OTM2MTcsOC42ODk2NTMxMSBDNi41NDk1ODU4Myw4Ljg5Njk1MDQ1IDYuMjc2MDA4ODIsOSA2LDkiIGlkPSJkcm9wZG93bi1jYXJldCIgZmlsbD0iIzU3NUU3NSI+PC9wYXRoPgogICAgPC9nPgo8L3N2Zz4K",
  "resize-handle.svg": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgd2lkdGg9IjE2IiBmaWxsPSJ0cmFuc3BhcmVudCIgc3Ryb2tlPSIjODg4Ij4KPGxpbmUgY2xhc3M9ImJsb2NrbHlSZXNpemVMaW5lIiB4MT0iNS4zMzMzMzMzMzMzMzMzMzMiIHkxPSIxNSIgeDI9IjE1IiB5Mj0iNS4zMzMzMzMzMzMzMzMzMzMiPjwvbGluZT48bGluZSBjbGFzcz0iYmxvY2tseVJlc2l6ZUxpbmUiIHgxPSIxMC42NjY2NjY2NjY2NjY2NjYiIHkxPSIxNSIgeDI9IjE1IiB5Mj0iMTAuNjY2NjY2NjY2NjY2NjY2Ij48L2xpbmU+Cjwvc3ZnPgo=",
  "icons/arrow.svg": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+Cjxzdmcgd2lkdGg9IjhweCIgaGVpZ2h0PSIxMHB4IiB2aWV3Qm94PSIwIDAgOCAxMCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj4KICAgIDwhLS0gR2VuZXJhdG9yOiBTa2V0Y2ggNDMuMiAoMzkwNjkpIC0gaHR0cDovL3d3dy5ib2hlbWlhbmNvZGluZy5jb20vc2tldGNoIC0tPgogICAgPHRpdGxlPmFycm93PC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGRlZnM+PC9kZWZzPgogICAgPGcgaWQ9IlBhZ2UtMSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgdHJhbnNmb3JtPSJyb3RhdGUoOTAsIDQsIDUpIj4KICAgICAgICA8ZyBpZD0iYXJyb3ciIHRyYW5zZm9ybT0idHJhbnNsYXRlKC00LjAwMDAwMCwgLTMuMDAwMDAwKSIgZmlsbD0iIzRDOTdGRiI+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik04LjAxODkxMDgzLDYuNjgyMjMwNTUgTDMuNTA5OTE2MDEsNy40MzM3Mjk2OSBDMy4yNDY3OTEzMSw3LjQ3NzU4MzggMy4wMTg5MTA4Myw3LjczOTQyMTUxIDMuMDE4OTEwODMsOC4wMTU1NjM4OCBDMy4wMTg5MTA4Myw4LjI4MzYzMDI5IDMuMjM4NzQxMzQsOC41NTIyMDIzIDMuNTA5OTE2MDEsOC41OTczOTgwOCBMOC4wMTg5MTA4Myw5LjM0ODg5NzIyIEw4LjAxODkxMDgzLDExLjAxODUzMzcgQzguMDE4OTEwODMsMTEuNTYyNTI3NiA4LjM4MzI2Njg2LDExLjc1MjAwMzIgOC44MzI3MjI3OSwxMS40MjY4ODQ3IEwxMi42NDEwMTc2LDguNjcyMTE1ODcgQzEzLjA5ODE2MzgsOC4zNDE0MzQ1NSAxMy4wOTU3MjIzLDcuODE0NzA1MTggMTIuNjUyNzQxMSw3LjQ4MzIwODA2IEw4LjgyMDk5OTM2LDQuNjE1NzkyNTMgQzguMzc1NTc2NjQsNC4yODI0NjgzOCA4LjAxODkxMDgzLDQuNDYxOTQ5NDggOC4wMTg5MTA4Myw1LjAxMjU5NDAyIEw4LjAxODkxMDgzLDYuNjgyMjMwNTUgWiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOC4wMDE2NzMsIDguMDE3MjM3KSByb3RhdGUoLTkwLjAwMDAwMCkgdHJhbnNsYXRlKC04LjAwMTY3MywgLTguMDE3MjM3KSAiPjwvcGF0aD4KICAgICAgICA8L2c+CiAgICA8L2c+Cjwvc3ZnPgo=",
  "icons/arrow_button.svg": "data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMzIgMzIiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDMyIDMyIj48c3R5bGU+LnN0MntmaWxsOiNmZmZ9PC9zdHlsZT48ZyBpZD0iVHV0b3JpYWxzX3gyRl9OYXZpZ2F0aW9uX3gyRl9OZXh0Ij48cGF0aCBkPSJNMjIuNiAxNi4zek0xNi4yIDE5bC01LjYtLjhhMi41IDIuNSAwIDAgMS0yLjEtMi40di0uM2MuMi0xLjEgMS0xLjkgMi0ybDUuNi0uOHYtMS4xYzAtLjcuNC0xLjMgMS0xLjYuNi0uMyAxLjMtLjEgMS44LjRsNC4zIDQuM2MuMy4zLjUuNy41IDEuMiAwIC40LS4yLjktLjUgMS4yTDE5IDIxLjRjLS41LjUtMS4yLjYtMS44LjMtLjYtLjMtMS0uOS0xLTEuNVYxOXoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PGRlZnM+PGZpbHRlciBpZD0iQWRvYmVfT3BhY2l0eU1hc2tGaWx0ZXIiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeD0iNiIgeT0iNiIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIj48ZmVDb2xvck1hdHJpeCB2YWx1ZXM9IjEgMCAwIDAgMCAwIDEgMCAwIDAgMCAwIDEgMCAwIDAgMCAwIDEgMCIvPjwvZmlsdGVyPjwvZGVmcz48bWFzayBtYXNrVW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4PSI2IiB5PSI2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGlkPSJtYXNrLTJfMV8iPjxnIGZpbHRlcj0idXJsKCNBZG9iZV9PcGFjaXR5TWFza0ZpbHRlcikiPjxwYXRoIGlkPSJwYXRoLTFfMV8iIGNsYXNzPSJzdDIiIGQ9Ik0yMyAxNi43TDE4LjcgMjFjLS40LjMtLjkuNC0xLjMuMnMtLjctLjYtLjctMS4xdi0xLjZsLTYtLjhjLTEtLjEtMS43LS45LTEuNy0xLjl2LS4yYy4xLS45LjgtMS41IDEuNi0xLjZsNi0uOXYtMS42YzAtLjUuMy0uOS43LTEuMS40LS4yLjktLjEgMS4zLjNMMjMgMTVjLjIuMi4zLjUuMy44bC0uMy45eiIvPjwvZz48L21hc2s+PGcgaWQ9IkNvbG9yX3gyRl9XaGl0ZSIgbWFzaz0idXJsKCNtYXNrLTJfMV8pIj48cGF0aCBjbGFzcz0ic3QyIiBkPSJNNiA2aDIwdjIwSDZ6IiBpZD0iQ29sb3IiLz48L2c+PC9nPjwvc3ZnPg==",
  "icons/remove.svg": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+Cjxzdmcgd2lkdGg9IjIwcHgiIGhlaWdodD0iMjBweCIgdmlld0JveD0iMCAwIDIwIDIwIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgogICAgPCEtLSBHZW5lcmF0b3I6IFNrZXRjaCA0OC4xICg0NzI1MCkgLSBodHRwOi8vd3d3LmJvaGVtaWFuY29kaW5nLmNvbS9za2V0Y2ggLS0+CiAgICA8dGl0bGU+ZGVsZXRlLWFyZ3VtZW50IHYyPC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGRlZnM+PC9kZWZzPgogICAgPGcgaWQ9IlBhZ2UtMSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgaWQ9ImRlbGV0ZS1hcmd1bWVudC12MiIgc3Ryb2tlPSIjRkY2NjFBIj4KICAgICAgICAgICAgPGcgaWQ9Ikdyb3VwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzLjAwMDAwMCwgMi41MDAwMDApIj4KICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xLDMgTDEzLDMgTDExLjg5MDA0OTYsMTQuMDk5NTAzNyBDMTEuODM4OTI5NCwxNC42MTA3MDU1IDExLjQwODc2MzksMTUgMTAuODk1MDEyNCwxNSBMMy4xMDQ5ODc1NiwxNSBDMi41OTEyMzYxMSwxNSAyLjE2MTA3MDU1LDE0LjYxMDcwNTUgMi4xMDk5NTAzNywxNC4wOTk1MDM3IEwxLDMgWiIgaWQ9IlJlY3RhbmdsZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PC9wYXRoPgogICAgICAgICAgICAgICAgPHBhdGggZD0iTTcsMTEgTDcsNiIgaWQ9IkxpbmUiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD4KICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik05LjUsMTEgTDkuNSw2IiBpZD0iTGluZS1Db3B5IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+CiAgICAgICAgICAgICAgICA8cGF0aCBkPSJNNC41LDExIEw0LjUsNiIgaWQ9IkxpbmUtQ29weS0yIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48L3BhdGg+CiAgICAgICAgICAgICAgICA8cmVjdCBpZD0iUmVjdGFuZ2xlLTIiIGZpbGw9IiNGRjY2MUEiIHg9IjAiIHk9IjIuNSIgd2lkdGg9IjE0IiBoZWlnaHQ9IjEiIHJ4PSIwLjUiPjwvcmVjdD4KICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik02LDAgTDgsMCBDOC41NTIyODQ3NSwtMS4wMTQ1MzA2M2UtMTYgOSwwLjQ0NzcxNTI1IDksMSBMOSwzIEw1LDMgTDUsMSBDNSwwLjQ0NzcxNTI1IDUuNDQ3NzE1MjUsMS4wMTQ1MzA2M2UtMTYgNiwwIFoiIGlkPSJSZWN0YW5nbGUtMyIgc3Ryb2tlLXdpZHRoPSIxLjUiPjwvcGF0aD4KICAgICAgICAgICAgPC9nPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+"
};

// src/media.js
var MEDIA_PREFIX = "dm-media/";
var XLINK = "http://www.w3.org/1999/xlink";
var fix = (el6) => {
  for (const attr2 of ["href", "xlink:href", "src"]) {
    const v = el6.getAttribute && el6.getAttribute(attr2);
    if (v && v.startsWith(MEDIA_PREFIX)) {
      const data = MEDIA[v.slice(MEDIA_PREFIX.length)];
      if (!data) continue;
      if (attr2 === "xlink:href") el6.setAttributeNS(XLINK, "xlink:href", data);
      else el6.setAttribute(attr2, data);
    }
  }
};
var installMediaRewriter = () => {
  const scan = (root) => {
    if (root.nodeType !== 1) return;
    fix(root);
    if (root.querySelectorAll) root.querySelectorAll("image, img").forEach(fix);
  };
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "attributes") fix(r.target);
      else r.addedNodes.forEach(scan);
    }
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["href", "xlink:href", "src"]
  });
  scan(document.documentElement);
};

// src/monitor.js
var { PORT } = require_cm550();
var P2 = require_protocol2();
var CM_ID = 200;
var { modelName: registryName } = require_models();
var modelName2 = (n) => registryName(n);
var HW_ERRORS = [
  [1, "입력 전압"],
  [4, "과열"],
  [8, "엔코더"],
  [16, "전기 충격"],
  [32, "과부하"]
];
var PORT_SENSORS = [
  { value: "", label: "사용 안 함" },
  { value: "ir", label: "적외선(IR)", spec: PORT.IR },
  { value: "dms", label: "거리(DMS)", spec: PORT.DMS },
  { value: "touch", label: "터치", spec: PORT.TOUCH, fmt: (v) => v ? "눌림" : "안 눌림" },
  { value: "brightness", label: "밝기", spec: PORT.BRIGHTNESS },
  {
    value: "color",
    label: "컬러",
    spec: PORT.COLOR,
    fmt: (v) => ["알 수 없음", "흰색", "검정", "빨강", "초록", "파랑", "노랑"][v] || v
  },
  { value: "temperature", label: "온도", spec: PORT.TEMPERATURE, fmt: (v) => `${v} °C` },
  { value: "magnet", label: "자석", spec: PORT.MAGNET, fmt: (v) => v ? "감지" : "없음" },
  { value: "motion", label: "인체 감지", spec: PORT.MOTION, fmt: (v) => v ? "감지" : "없음" },
  { value: "moisture", label: "습도 (포트 1·2)", spec: PORT.MOISTURE, fmt: (v) => `${v} %` },
  { value: "user", label: "사용자 장치(아날로그)", spec: PORT.USER }
];
var STORAGE_PORTS = "dynamicmakers.monitor.ports";
var el2 = (tag, cls, text2) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text2 !== void 0) e.textContent = text2;
  return e;
};
var signed = (v, size) => v >= 2 ** (size * 8 - 1) ? v - 2 ** (size * 8) : v;
var le = (bytes, off, size, isSigned) => {
  const v = P2.fromLE(bytes, off, size);
  return isSigned ? signed(v, size) : v;
};
var delay = (ms) => new Promise((r) => setTimeout(r, ms));
var BAUDS = ["9,600", "57,600", "115,200", "1M", "2M", "3M", "4M", "4.5M"];
var MODES = ["IDLE", "Task 실행", "Manage", "Bootloader", "Reboot"];
var BYPASS = ["BLE", "UART", "USB"];
var hex = (bytes) => bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
var Monitor = class {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.host
   * @param {object} opts.device CM550Device
   * @param {Function} opts.isRunning () => boolean
   * @param {Function} [opts.log] (text, kind) => void
   */
  constructor({ host, device, isRunning, log: log2 }) {
    this.host = host;
    this.device = device;
    this.isRunning = isRunning;
    this.log = log2 || (() => {
    });
    this.visible = false;
    this.rows = /* @__PURE__ */ new Map();
    this.scanning = false;
    this.ports = this._loadPorts();
    this.timer = null;
    this._build();
  }
  // ------------------------------------------------------------------ UI
  _build() {
    const h = this.host;
    h.classList.add("mon");
    const header = el2("header", "mon-header");
    header.append(el2("span", "mon-title", "모니터"));
    this.stateEl = el2("span", "mon-state", "");
    header.append(this.stateEl);
    this.diagBtn = el2("button", "mon-btn", "진단");
    this.diagBtn.title = "다이나믹셀이 안 보일 때 원인을 확인합니다";
    this.diagBtn.addEventListener("click", () => this.diagnose());
    header.append(this.diagBtn);
    this.scanBtn = el2("button", "mon-btn", "다이나믹셀 검색");
    this.scanBtn.addEventListener("click", () => this.scan());
    header.append(this.scanBtn);
    h.append(header);
    const body = el2("div", "mon-body");
    h.append(body);
    this.diagCard = el2("section", "mon-card mon-diag");
    this.diagCard.hidden = true;
    body.append(this.diagCard);
    const cm = el2("section", "mon-card");
    cm.append(el2("h3", "", "컨트롤러 CM-550"));
    this.cmGrid = el2("div", "mon-grid");
    cm.append(this.cmGrid);
    this.cmFields = {};
    for (const [key, label2] of [
      ["link", "연결"],
      ["model", "모델 / 펌웨어"],
      ["voltage", "배터리 전압"],
      ["temp", "컨트롤러 온도"],
      ["tilt", "기울기 (롤 / 피치 / 요)"],
      ["button", "버튼"],
      ["power", "다이나믹셀 전원"],
      ["motions", "저장된 모션"]
    ]) {
      const k = el2("div", "mon-k", label2);
      const v = el2("div", "mon-v", "–");
      this.cmFields[key] = v;
      this.cmGrid.append(k, v);
    }
    body.append(cm);
    const dx = el2("section", "mon-card");
    this.dxTitle = el2("h3", "", "다이나믹셀");
    dx.append(this.dxTitle);
    dx.append(el2(
      "p",
      "mon-note",
      "CM-550의 다이나믹셀 포트 6개는 한 줄로 연결된 같은 통로라서, 어느 포트에 꽂혔는지는 알 수 없습니다. [찾기]를 누르면 그 모터의 LED가 깜빡입니다."
    ));
    const table = el2("table", "mon-table");
    const thead = el2("thead");
    const tr = el2("tr");
    for (const t of ["ID", "모델", "각도", "온도", "전압", "토크", "상태", ""]) tr.append(el2("th", "", t));
    thead.append(tr);
    this.tbody = el2("tbody");
    table.append(thead, this.tbody);
    dx.append(table);
    this.dxEmpty = el2("p", "mon-empty", "연결 후 [다이나믹셀 검색]을 누르세요.");
    dx.append(this.dxEmpty);
    body.append(dx);
    const pt = el2("section", "mon-card");
    pt.append(el2("h3", "", "센서 포트 (5핀)"));
    pt.append(el2("p", "mon-note", "포트에 꽂은 센서 종류를 고르면 값이 표시됩니다. 센서 종류는 자동으로 알 수 없습니다."));
    this.portRows = [];
    const grid = el2("div", "mon-ports");
    for (let port = 1; port <= 5; port++) {
      const sel = el2("select", "mon-select");
      for (const s of PORT_SENSORS) {
        if (s.value === "moisture" && port > 2) continue;
        const o = el2("option", "", s.label);
        o.value = s.value;
        sel.append(o);
      }
      sel.value = this.ports[port] || "";
      sel.addEventListener("change", () => {
        this.ports[port] = sel.value;
        this._savePorts();
        val.textContent = sel.value ? "…" : "";
      });
      const val = el2("span", "mon-port-val", "");
      grid.append(el2("span", "mon-port-no", `포트 ${port}`), sel, val);
      this.portRows.push({ port, sel, val });
    }
    pt.append(grid);
    body.append(pt);
  }
  _loadPorts() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_PORTS)) || {};
    } catch (e) {
      return {};
    }
  }
  _savePorts() {
    try {
      window.localStorage.setItem(STORAGE_PORTS, JSON.stringify(this.ports));
    } catch (e) {
    }
  }
  get motors() {
    return this.device.motors;
  }
  /** Re-render the motor table from the device's last scan. */
  renderMotors() {
    this._renderMotors();
  }
  _renderMotors() {
    this.tbody.textContent = "";
    this.rows.clear();
    const desc = this.device.motorDesc;
    const pairs = desc.pairs.length ? ` · 2축 모듈 ${desc.pairs.length}개` : "";
    this.dxTitle.textContent = this.motors.length ? `다이나믹셀 (${this.motors.length}개${pairs})` : "다이나믹셀";
    this.dxEmpty.hidden = this.motors.length > 0;
    for (const m of this.motors) {
      const tr = el2("tr");
      const cells = {};
      tr.append(el2("td", "mon-id", String(m.id)));
      const ax = desc.axis[m.id];
      const modelTd = el2("td", "", modelName2(m.model));
      if (ax) modelTd.append(el2("span", "mon-axis", ` 모듈${ax.module} ${ax.axis}축`));
      tr.append(modelTd);
      for (const key of ["angle", "temp", "volt"]) {
        cells[key] = el2("td", "mon-num", "–");
        tr.append(cells[key]);
      }
      const torqueTd = el2("td");
      const torque = el2("button", "mon-toggle", "–");
      torque.title = "눌러서 토크 켜기/끄기 (끄면 손으로 돌려 각도를 볼 수 있습니다)";
      torque.addEventListener("click", () => this._toggleTorque(m.id, torque));
      torqueTd.append(torque);
      tr.append(torqueTd);
      cells.torque = torque;
      cells.status = el2("td", "mon-status", "");
      tr.append(cells.status);
      const findTd = el2("td");
      const find = el2("button", "mon-btn-small", "찾기");
      find.addEventListener("click", () => this.blink(m.id, tr));
      findTd.append(find);
      tr.append(findTd);
      this.tbody.append(tr);
      this.rows.set(m.id, { tr, cells });
    }
  }
  // ------------------------------------------------------------ actions
  async scan() {
    if (this.scanning || this.diagRunning) return;
    if (!this.device.connected) {
      this.log("먼저 CM-550을 연결하세요.", "warn");
      return;
    }
    this.scanning = true;
    this.scanBtn.disabled = true;
    this.scanBtn.textContent = "검색 중…";
    try {
      const found = await this.device.scanMotors(30, (id, max) => {
        this.scanBtn.textContent = `검색 중… ${id}/${max}`;
      });
      if (!found.length) {
        this.log("다이나믹셀을 찾지 못했습니다. 모니터의 [진단]을 눌러 원인을 확인하세요.", "warn");
      }
      if (!found.length && !this._autoDiagnosed) {
        this._autoDiagnosed = true;
        setTimeout(() => this.diagnose(), 0);
      }
    } catch (e) {
      this.log(`검색 실패: ${e.message}`, "err");
    } finally {
      this.scanning = false;
      this.scanBtn.disabled = false;
      this.scanBtn.textContent = "다이나믹셀 검색";
    }
  }
  async blink(id, tr) {
    if (!this.device.connected || this.isRunning()) return;
    tr.classList.add("mon-blink");
    try {
      for (let i = 0; i < 4; i++) {
        await this.device.write(id, 65, 1, 1);
        await delay(250);
        await this.device.write(id, 65, 0, 1);
        await delay(250);
      }
    } catch (e) {
      this.log(`ID ${id} 찾기 실패: ${e.message}`, "err");
    } finally {
      tr.classList.remove("mon-blink");
    }
  }
  async _toggleTorque(id, btn) {
    if (!this.device.connected) return;
    const on = btn.dataset.on !== "1";
    try {
      await this.device.write(id, 64, on ? 1 : 0, 1);
      btn.dataset.on = on ? "1" : "0";
      btn.textContent = on ? "켜짐" : "꺼짐";
    } catch (e) {
      this.log(`ID ${id} 토크 변경 실패: ${e.message}`, "err");
    }
  }
  // --------------------------------------------------------- diagnosis
  /**
   * Step-by-step check of why DYNAMIXELs are not visible:
   * power voltage, DXL power switch, baud/mode/bypass, the CM-550's own scan
   * (addr 40 → 39), then relayed pings with raw byte capture.
   */
  async diagnose() {
    if (this.diagRunning) return;
    const d = this.device;
    const card = this.diagCard;
    card.hidden = false;
    card.textContent = "";
    card.append(el2("h3", "", "연결 진단"));
    const list = el2("ul", "mon-diag-list");
    card.append(list);
    const lines = [];
    const add = (mark, text2) => {
      const li = el2("li", `mon-diag-${mark}`);
      li.append(el2("span", "mon-diag-mark", { ok: "✓", bad: "✗", warn: "!", info: "·" }[mark]), document.createTextNode(text2));
      list.append(li);
      lines.push(`${{ ok: "[OK]", bad: "[문제]", warn: "[주의]", info: "[정보]" }[mark]} ${text2}`);
      return li;
    };
    if (!d.connected) {
      add("bad", "CM-550이 연결되어 있지 않습니다. 먼저 USB 또는 블루투스로 연결하세요.");
      return;
    }
    this.diagRunning = true;
    this.diagBtn.disabled = true;
    this.diagBtn.textContent = "진단 중…";
    const savedTimeout = d.timeoutMs;
    const verdicts = [];
    try {
      add("info", `연결 방식: ${d.transportName}`);
      let head;
      try {
        head = await d.readBytes(CM_ID, 0, 13);
        add("ok", `CM-550 응답: ${modelName2(le(head, 0, 2))}, 펌웨어 v${head[6]}`);
      } catch (e) {
        add("bad", `CM-550이 응답하지 않습니다 (${e.message}). 케이블을 다시 꽂거나 연결을 끊고 다시 연결하세요.`);
        verdicts.push("controller");
        return;
      }
      const baud = head[12];
      const r = await d.readBytes(CM_ID, 20, 4);
      const volt = (await d.readBytes(CM_ID, 89, 1))[0] / 10;
      if (volt < 6.5) {
        add("bad", `입력 전압 ${volt.toFixed(1)} V — 배터리나 전원 어댑터가 연결되지 않았습니다. USB 전원만으로는 CM-550만 켜지고 다이나믹셀은 동작하지 않습니다 (6.5~15 V 필요).`);
        verdicts.push("voltage");
      } else {
        add(volt < 10.5 ? "warn" : "ok", `입력 전압 ${volt.toFixed(1)} V${volt < 10.5 ? " (배터리가 부족합니다)" : ""}`);
      }
      if (!r[2]) {
        const li = add("bad", "다이나믹셀 전원 스위치(주소 22)가 꺼져 있습니다. ");
        const fix2 = el2("button", "mon-btn-small", "전원 켜기");
        fix2.addEventListener("click", async () => {
          await d.write(CM_ID, 22, 1, 1);
          await delay(500);
          this.diagnose();
        });
        li.append(fix2);
        verdicts.push("power");
      } else {
        add("ok", "다이나믹셀 전원 스위치 켜짐");
      }
      add(baud === 3 ? "ok" : "warn", `다이나믹셀 통신 속도(주소 12): ${BAUDS[baud] || baud} bps` + (baud === 3 ? "" : " — 키트 다이나믹셀은 보통 1M(값 3)입니다. 다이나믹셀과 다르면 서로 통신할 수 없습니다."));
      add("info", `CM-550 모드: ${MODES[r[1]] || r[1]}, 바이패스 포트: ${BYPASS[r[0]] || r[0]}, 오류 코드: ${r[3]}`);
      if (r[1] !== 2) {
        await d.write(CM_ID, 21, 2, 1);
        add("info", "Manage 모드로 전환했습니다.");
      }
      let count = null;
      try {
        await d.write(CM_ID, 40, 1, 1);
        const t0 = Date.now();
        while (Date.now() - t0 < 1e4) {
          await delay(300);
          if ((await d.readBytes(CM_ID, 40, 1))[0] === 0) break;
        }
        count = (await d.readBytes(CM_ID, 39, 1))[0];
        add(count > 0 ? "ok" : "bad", `CM-550 자체 검색(주소 40→39): 다이나믹셀 ${count}개 인식`);
      } catch (e) {
        add("warn", `CM-550 자체 검색 실패: ${e.message}`);
      }
      d.timeoutMs = Math.max(savedTimeout, 400);
      d._rawTap = [];
      const bc = (await d.broadcastPing(800)).filter((x) => x.id !== CM_ID);
      const bcRaw = d._rawTap.slice(0, 96);
      d._rawTap = [];
      const single = [];
      for (let id = 1; id <= 12; id++) {
        const info = await d.pingInfo(id);
        if (info) single.push(info);
      }
      const pingRaw = d._rawTap.slice(0, 96);
      d._rawTap = null;
      const relayed = bc.length ? bc : single;
      add(relayed.length ? "ok" : "bad", relayed.length ? `앱에서 다이나믹셀 응답 받음: ${relayed.map((x) => `ID ${x.id} (${modelName2(x.model)})`).join(", ")}` : "앱이 보낸 다이나믹셀 명령에 응답이 없습니다 (브로드캐스트 핑, ID 1~12 개별 핑).");
      add("info", `받은 원본 바이트 — 브로드캐스트: ${bcRaw.length ? hex(bcRaw) : "없음"} / 개별 핑: ${pingRaw.length ? hex(pingRaw) : "없음"}`);
      if (relayed.length) {
        verdicts.push("ok");
        this.device.setMotors(relayed, volt);
      } else if (verdicts.includes("voltage") || verdicts.includes("power")) {
      } else if (count > 0) {
        verdicts.push("relay");
      } else if (count === 0) {
        verdicts.push("bus");
      }
    } catch (e) {
      add("bad", `진단 중 오류: ${e.message}`);
    } finally {
      d.timeoutMs = savedTimeout;
      d._rawTap = null;
      this.diagRunning = false;
      this.diagBtn.disabled = false;
      this.diagBtn.textContent = "진단";
    }
    const summary = {
      ok: "다이나믹셀과 통신됩니다. 목록을 갱신했습니다.",
      voltage: "→ 배터리(또는 12V 어댑터)를 CM-550에 연결하고 전원 스위치를 켠 뒤 [다이나믹셀 검색]을 누르세요.",
      power: "→ [전원 켜기]를 누르세요. 다시 꺼지면 과전류·과열 등 오류가 있는지 확인하세요.",
      relay: "→ CM-550은 다이나믹셀을 인식하지만 PC로 응답을 전달하지 않습니다. 아래 [결과 복사]로 내용을 보내 주시면 원인을 분석하겠습니다.",
      bus: "→ CM-550도 다이나믹셀을 찾지 못합니다. 케이블 방향·접촉, 다이나믹셀 통신 속도(1M)와 ID 중복을 확인하세요. R+ Manager 2.0에서도 보이지 않으면 다이나믹셀 펌웨어 복구가 필요할 수 있습니다.",
      controller: "→ CM-550과의 연결을 확인하세요."
    };
    const key = ["ok", "voltage", "power", "relay", "bus", "controller"].find((k) => verdicts.includes(k));
    if (key) {
      const p = el2("p", `mon-diag-summary${key === "ok" ? " good" : ""}`, summary[key]);
      card.append(p);
      lines.push(summary[key]);
    }
    const copy = el2("button", "mon-btn-small", "결과 복사");
    copy.addEventListener("click", () => {
      const text2 = `[다이나믹 메이커스 연결 진단 ${(/* @__PURE__ */ new Date()).toLocaleString("ko-KR")}]
${lines.join("\n")}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text2).then(() => {
          copy.textContent = "복사됨";
        }, () => {
        });
      }
    });
    card.append(copy);
    this.log(`연결 진단: ${key ? summary[key] : "완료"}`, key === "ok" ? "ok" : "warn");
  }
  // ------------------------------------------------------------ polling
  setVisible(visible) {
    this.visible = visible;
    if (visible) {
      this._tick();
      if (this.device.connected && !this.motors.length && !this.scanning) this.scan();
    } else {
      clearTimeout(this.timer);
    }
  }
  onConnectionChange(connected, kindName) {
    this.cmFields.link.textContent = connected ? kindName : "연결 안 됨";
    if (!connected) {
      this._renderMotors();
      for (const f2 of Object.values(this.cmFields)) if (f2 !== this.cmFields.link) f2.textContent = "–";
      for (const r of this.portRows) r.val.textContent = "";
      this._model = null;
    }
  }
  async _tick() {
    clearTimeout(this.timer);
    if (!this.visible) return;
    const d = this.device;
    let interval = d.transportName === "BLE" ? 1200 : 500;
    if (!d.connected) {
      this.stateEl.textContent = "연결 안 됨";
    } else if (this.isRunning() || this.scanning || this.diagRunning) {
      this.stateEl.textContent = this.scanning ? "검색 중" : this.diagRunning ? "진단 중" : "프로그램 실행 중 — 일시 정지";
      interval = 400;
    } else {
      this.stateEl.textContent = "실시간";
      try {
        await this._poll();
      } catch (e) {
        this.stateEl.textContent = "응답 없음";
      }
    }
    this.timer = setTimeout(() => this._tick(), interval);
  }
  async _poll() {
    const d = this.device;
    const f2 = this.cmFields;
    if (!this._model) {
      const head = await d.readBytes(CM_ID, 0, 7);
      this._model = `${modelName2(le(head, 0, 2))} / v${head[6]}`;
    }
    f2.model.textContent = this._model;
    const a = await d.readBytes(CM_ID, 21, 8);
    f2.power.textContent = a[1] ? "켜짐" : "꺼짐";
    f2.power.classList.toggle("mon-warn", !a[1]);
    f2.button.textContent = ["–", "START", "MODE", "START + MODE"][a[5]] || "–";
    const b = await d.readBytes(CM_ID, 71, 2);
    f2.motions.textContent = `${le(b, 0, 2)}개`;
    const c = await d.readBytes(CM_ID, 89, 22);
    const volt = c[0] / 10;
    f2.voltage.textContent = `${volt.toFixed(1)} V`;
    f2.voltage.classList.toggle("mon-warn", volt > 0 && volt < 10.5);
    f2.temp.textContent = `${signed(c[1], 1)} °C`;
    const roll = le(c, 102 - 89, 2, true) / 100;
    const pitch = le(c, 104 - 89, 2, true) / 100;
    const yaw = le(c, 106 - 89, 2, true) / 100;
    f2.tilt.textContent = `${roll.toFixed(1)}° / ${pitch.toFixed(1)}° / ${yaw.toFixed(1)}°`;
    for (const m of this.motors) {
      const row = this.rows.get(m.id);
      if (!row) continue;
      try {
        const r = await d.readBytes(m.id, 64, 83);
        const at = (addr) => addr - 64;
        const pos = le(r, at(132), 4, true);
        row.cells.angle.textContent = `${(pos / 4096 * 360).toFixed(1)}°`;
        row.cells.temp.textContent = `${r[at(146)]} °C`;
        row.cells.volt.textContent = `${(le(r, at(144), 2) / 10).toFixed(1)} V`;
        const torque = r[at(64)];
        row.cells.torque.dataset.on = torque ? "1" : "0";
        row.cells.torque.textContent = torque ? "켜짐" : "꺼짐";
        const hw = r[at(70)];
        const errs = HW_ERRORS.filter(([bit]) => hw & bit).map(([, name]) => name);
        row.cells.status.textContent = errs.length ? `오류: ${errs.join(", ")}` : r[at(122)] ? "움직이는 중" : "정상";
        row.tr.classList.toggle("mon-err", errs.length > 0);
        row.tr.classList.remove("mon-lost");
      } catch (e) {
        row.cells.status.textContent = "응답 없음";
        row.tr.classList.add("mon-lost");
      }
    }
    for (const r of this.portRows) {
      const s = PORT_SENSORS.find((x) => x.value === r.sel.value);
      if (!s || !s.spec) continue;
      try {
        const v = await d.readPort(s.spec, r.port);
        r.val.textContent = s.fmt ? s.fmt(v) : String(v);
      } catch (e) {
        r.val.textContent = "응답 없음";
      }
    }
  }
};

// src/teach.js
var { poseSize } = require_poses();
var el3 = (tag, cls, text2) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text2 !== void 0) e.textContent = text2;
  return e;
};
var button = (cls, text2, onClick, title) => {
  const b = el3("button", cls, text2);
  b.type = "button";
  if (title) b.title = title;
  b.addEventListener("click", onClick);
  return b;
};
var isTyping = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable || t.closest && t.closest(".blocklyWidgetDiv, .blocklyDropDownDiv, .db-overlay"));
var TeachPanel = class {
  /**
   * @param {object} o
   * @param {HTMLElement} o.host
   * @param {object} o.ext       cm550 extension instance
   * @param {Function} o.log     (text, kind) -> void
   * @param {Function} o.isRunning
   * @param {Function} o.addScript (poseNumbers, seconds) -> void, puts blocks in the workspace
   */
  constructor({ host, ext: ext2, log: log2, isRunning, addScript }) {
    this.host = host;
    this.ext = ext2;
    this.device = ext2.device;
    this.log = log2;
    this.isRunning = isRunning;
    this.addScript = addScript;
    this.visible = false;
    this.busy = false;
    this.playing = false;
    this.selected = /* @__PURE__ */ new Set();
    this.relaxed = /* @__PURE__ */ new Set();
    this._build();
    document.addEventListener("keydown", (e) => {
      if (!this.visible || e.key !== " " || e.repeat || isTyping(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      this.record();
    }, true);
    this.render();
  }
  _build() {
    this.host.classList.add("mon", "tp");
    const header = el3("header", "mon-header");
    header.append(el3("span", "mon-title", "자세 가르치기"));
    this.stateEl = el3("span", "mon-state", "");
    header.append(this.stateEl);
    this.host.append(header);
    const body = el3("div", "mon-body");
    this.host.append(body);
    const c1 = el3("section", "mon-card");
    c1.append(el3("h3", "", "1. 관절 힘 빼기"));
    c1.append(el3(
      "p",
      "mon-note",
      "로봇이 넘어지지 않게 한 손으로 받친 다음 힘을 빼세요. 팔만 가르칠 때는 팔 관절만 골라서 풀 수 있습니다."
    ));
    this.jointsEl = el3("div", "tp-joints");
    c1.append(this.jointsEl);
    const row1 = el3("div", "tp-row");
    this.relaxBtn = button("tp-btn", "고른 관절 힘 빼기", () => this.relax(false));
    this.stiffBtn = button("tp-btn tp-primary", "모두 힘 주기 (자세 유지)", () => this.relax(true));
    row1.append(this.relaxBtn, this.stiffBtn);
    c1.append(row1);
    body.append(c1);
    const c2 = el3("section", "mon-card");
    c2.append(el3("h3", "", "2. 자세 기록하기"));
    c2.append(el3(
      "p",
      "mon-note",
      "손으로 자세를 만든 뒤 스페이스 키나 아래 버튼을 누르면 모든 관절의 각도가 저장됩니다."
    ));
    this.recordBtn = button("tp-record", "● 지금 자세 기록  (스페이스)", () => this.record());
    c2.append(this.recordBtn);
    body.append(c2);
    const c3 = el3("section", "mon-card");
    c3.append(el3("h3", "", "3. 기록한 자세"));
    this.posesEl = el3("ol", "tp-poses");
    c3.append(this.posesEl);
    const row3 = el3("div", "tp-row");
    row3.append(el3("span", "tp-label", "자세마다"));
    this.secsInput = el3("input", "tp-secs");
    this.secsInput.type = "number";
    this.secsInput.min = "0.2";
    this.secsInput.max = "10";
    this.secsInput.step = "0.1";
    this.secsInput.value = "1";
    this.secsInput.setAttribute("aria-label", "자세마다 걸리는 시간(초)");
    row3.append(this.secsInput, el3("span", "tp-label", "초"));
    this.playBtn = button("tp-btn tp-primary", "▶ 처음부터 재생", () => this.playAll());
    this.stopBtn = button("tp-btn", "■ 멈춤", () => {
      this.playing = false;
    });
    row3.append(this.playBtn, this.stopBtn);
    c3.append(row3);
    const row4 = el3("div", "tp-row");
    this.scriptBtn = button(
      "tp-btn",
      "블록으로 만들기",
      () => this.makeScript(),
      "기록한 자세를 차례로 움직이는 블록을 작업 영역에 넣습니다"
    );
    this.clearBtn = button("tp-btn tp-danger", "모두 지우기", () => this.clearAll());
    row4.append(this.scriptBtn, this.clearBtn);
    c3.append(row4);
    body.append(c3);
  }
  setVisible(v) {
    this.visible = v;
    if (v) this.render();
  }
  get seconds() {
    const s = Number(this.secsInput.value);
    return Number.isFinite(s) && s > 0 ? Math.min(10, Math.max(0.2, s)) : 1;
  }
  /** Run one device action at a time; report errors in the output window. */
  async _run(label2, fn) {
    if (this.busy) return;
    if (!this.device.connected) {
      this.log("먼저 로봇을 연결하세요 (USB·블루투스·가상 로봇).", "warn");
      return;
    }
    if (this.isRunning()) {
      this.log("프로그램이 실행 중입니다. ■ 정지를 누른 뒤 다시 해 보세요.", "warn");
      return;
    }
    this.busy = true;
    this.render();
    try {
      await fn();
    } catch (e) {
      this.log(`⚠ ${label2}: ${e.message || e}`, "err");
    } finally {
      this.busy = false;
      this.render();
    }
  }
  _jointIds() {
    return this.selected.size ? [...this.selected] : this.device.motors.map((m) => m.id);
  }
  relax(on) {
    return this._run(on ? "힘 주기" : "힘 빼기", async () => {
      await this.ext._ensureMotors();
      const ids = on ? this.device.motors.map((m) => m.id) : this._jointIds();
      await this.ext.relaxJoints(ids, on);
      if (on) this.relaxed.clear();
      else ids.forEach((id) => this.relaxed.add(id));
      this.log(on ? "모든 관절에 힘을 주었습니다. 지금 자세를 유지합니다." : `관절 ${ids.length}개의 힘을 뺐습니다. 손으로 자세를 만들어 보세요.`);
    });
  }
  record() {
    return this._run("자세 기록", async () => {
      const n = await this.ext.recordPose(0);
      this.log(`${n}번 자세를 기록했습니다.`, "ok");
      this._flash = n;
    });
  }
  overwrite(n) {
    return this._run("자세 덮어쓰기", async () => {
      await this.ext.recordPose(n);
      this.log(`${n}번 자세를 지금 자세로 바꿨습니다.`, "ok");
      this._flash = n;
    });
  }
  goTo(n) {
    return this._run("자세로 이동", async () => {
      this.relaxed.clear();
      await this.ext.playPose(n, this.seconds);
    });
  }
  playAll() {
    return this._run("재생", async () => {
      const poses = this.ext.getPoses();
      if (!poses.some(poseSize)) throw new Error("기록한 자세가 없습니다.");
      this.relaxed.clear();
      this.playing = true;
      this.render();
      for (let i = 0; i < poses.length && this.playing; i++) {
        if (!poseSize(poses[i])) continue;
        this._current = i + 1;
        this.render();
        await this.ext.playPose(i + 1, this.seconds);
      }
      this.playing = false;
      this._current = 0;
    });
  }
  remove(n) {
    this.ext.deletePose(n);
    this.log(`${n}번 자세를 지웠습니다. 뒤의 자세 번호가 하나씩 당겨집니다.`);
  }
  clearAll() {
    if (!this.ext.getPoses().length) return;
    if (!window.confirm("기록한 자세를 모두 지울까요?")) return;
    this.ext.poseClear();
    this.log("기록한 자세를 모두 지웠습니다.");
  }
  makeScript() {
    const numbers = this.ext.getPoses().map((p, i) => poseSize(p) ? i + 1 : 0).filter(Boolean);
    if (!numbers.length) {
      this.log("먼저 자세를 기록하세요.", "warn");
      return;
    }
    this.addScript(numbers, this.seconds);
    this.log(`자세 ${numbers.length}개를 차례로 움직이는 블록을 작업 영역에 넣었습니다.`, "ok");
  }
  render() {
    const motors = this.device.motors;
    const connected = this.device.connected;
    this.stateEl.textContent = !connected ? "로봇이 연결되지 않았습니다" : this.playing ? `재생 중 · ${this._current || ""}번 자세` : this.busy ? "로봇과 통신 중…" : this.relaxed.size ? `힘 뺀 관절 ${this.relaxed.size}개` : `관절 ${motors.length}개`;
    this.jointsEl.textContent = "";
    if (!motors.length) {
      this.jointsEl.append(el3("p", "mon-empty", connected ? "다이나믹셀을 찾는 중이거나 찾지 못했습니다. 모니터에서 [검색]을 눌러 보세요." : "로봇을 연결하면 관절 목록이 나타납니다."));
    }
    const labels = this.device.motorDesc.labels || {};
    for (const m of motors) {
      const chip = el3("label", "tp-joint");
      const box = el3("input");
      box.type = "checkbox";
      box.checked = !this.selected.size || this.selected.has(m.id);
      box.addEventListener("change", () => {
        if (!this.selected.size) motors.forEach((x) => this.selected.add(x.id));
        if (box.checked) this.selected.add(m.id);
        else this.selected.delete(m.id);
        if (this.selected.size === motors.length) this.selected.clear();
        this.render();
      });
      chip.append(box, el3("b", "", String(m.id)), el3("span", "", labels[m.id] ? ` ${labels[m.id]}` : ""));
      if (this.relaxed.has(m.id)) chip.classList.add("tp-limp");
      this.jointsEl.append(chip);
    }
    const nSel = this.selected.size || motors.length;
    this.relaxBtn.textContent = nSel === motors.length ? "모든 관절 힘 빼기" : `고른 관절 ${nSel}개 힘 빼기`;
    const poses = this.ext.getPoses();
    this.posesEl.textContent = "";
    if (!poses.length) this.posesEl.append(el3("li", "tp-empty", "아직 기록한 자세가 없습니다."));
    poses.forEach((p, i) => {
      const n = i + 1;
      const li = el3("li", "tp-pose");
      if (this._current === n) li.classList.add("tp-now");
      if (this._flash === n) li.classList.add("tp-flash");
      li.append(el3("span", "tp-no", `${n}`));
      li.append(el3("span", "tp-desc", poseSize(p) ? `관절 ${poseSize(p)}개` : "(비어 있음)"));
      li.title = Object.keys(p).map((id) => `${id}: ${p[id]}°`).join("  ");
      const disabled = this.busy || !connected;
      const go = button("mon-btn-small", "▶ 이동", () => this.goTo(n));
      const ow = button("mon-btn-small", "덮어쓰기", () => this.overwrite(n), "지금 자세로 바꾸기");
      const rm = button("mon-btn-small tp-x", "✕", () => this.remove(n), "이 자세 지우기");
      go.disabled = disabled || !poseSize(p);
      ow.disabled = disabled;
      rm.disabled = this.busy;
      li.append(go, ow, rm);
      this.posesEl.append(li);
    });
    this._flash = 0;
    const any = poses.some(poseSize);
    this.recordBtn.disabled = this.busy || !connected;
    this.relaxBtn.disabled = this.busy || !connected || !motors.length;
    this.stiffBtn.disabled = this.busy || !connected || !motors.length;
    this.playBtn.disabled = this.busy || !connected || !any;
    this.stopBtn.disabled = !this.playing;
    this.scriptBtn.disabled = !any;
    this.clearBtn.disabled = this.busy || !poses.length;
  }
};

// src/asset-url.js
var assetUrl = (name) => {
  const v = window.DM_ASSETS && window.DM_ASSETS[name];
  return v ? `${name}?v=${v}` : name;
};

// src/ai/sources.js
var delay2 = (ms) => new Promise((r) => setTimeout(r, ms));
var tfPromise = null;
var loadTF = () => {
  if (!tfPromise) {
    tfPromise = new Promise((resolve, reject) => {
      if (window.DMAI_TF) return resolve(window.DMAI_TF);
      const s = document.createElement("script");
      s.src = assetUrl("dm-ai.js");
      s.onload = () => window.DMAI_TF ? resolve(window.DMAI_TF) : reject(new Error("AI 모듈을 불러오지 못했습니다."));
      s.onerror = () => reject(new Error("AI 모듈(dm-ai.js)을 불러오지 못했습니다."));
      document.head.append(s);
    }).catch((e) => {
      tfPromise = null;
      throw e;
    });
  }
  return tfPromise;
};
var mediaError = (e, what) => {
  const name = e && e.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return new Error(`${what} 사용이 허용되지 않았습니다. 주소창 옆의 권한 설정에서 ${what}를 허용해 주세요.`);
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return new Error(`${what}를 찾지 못했습니다.`);
  return new Error(`${what}를 켤 수 없습니다: ${e && e.message || e}`);
};
var l2normalize = (v) => {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
};
var CameraSource = class {
  constructor() {
    this.kind = "camera";
    this.metric = "cosine";
    this.interval = 120;
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.className = "ai-video";
  }
  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("이 브라우저에서는 카메라를 쓸 수 없습니다. Chrome이나 Edge를 사용하세요.");
    }
    const [{ tf, loadMobilenet }] = await Promise.all([loadTF()]);
    this.tf = tf;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
        audio: false
      });
    } catch (e) {
      throw mediaError(e, "카메라");
    }
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => {
    });
    if (!this.model) this.model = await loadMobilenet();
  }
  stop() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }
  async features() {
    if (!this.model || this.video.readyState < 2 || !this.video.videoWidth) return null;
    const tf = this.tf;
    const out = tf.tidy(() => {
      let img = tf.browser.fromPixels(this.video);
      const [h, w] = img.shape;
      const side = Math.min(h, w);
      img = tf.slice(img, [Math.floor((h - side) / 2), Math.floor((w - side) / 2), 0], [side, side, 3]);
      img = tf.image.resizeBilinear(img, [224, 224]);
      const x = tf.expandDims(tf.sub(tf.div(tf.cast(img, "float32"), 127.5), 1), 0);
      return this.model.predict(x);
    });
    const data = await out.data();
    out.dispose();
    return l2normalize(Float32Array.from(data));
  }
};
var BANDS = 32;
var SoundSource = class {
  constructor() {
    this.kind = "sound";
    this.metric = "euclid";
    this.interval = 100;
    this.frames = [];
    this.level = new Float32Array(BANDS);
  }
  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("이 브라우저에서는 마이크를 쓸 수 없습니다. Chrome이나 Edge를 사용하세요.");
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false
      });
    } catch (e) {
      throw mediaError(e, "마이크");
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => {
    });
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0;
    this.ctx.createMediaStreamSource(this.stream).connect(this.analyser);
    const bins = new Float32Array(this.analyser.frequencyBinCount);
    const hzPerBin = this.ctx.sampleRate / this.analyser.fftSize;
    const edges = Array.from({ length: BANDS + 1 }, (_, i) => 80 * Math.pow(100, i / BANDS));
    this.timer = setInterval(() => {
      this.analyser.getFloatFrequencyData(bins);
      const frame = new Float32Array(BANDS);
      for (let b = 0; b < BANDS; b++) {
        const lo = Math.max(1, Math.floor(edges[b] / hzPerBin));
        const hi = Math.max(lo + 1, Math.ceil(edges[b + 1] / hzPerBin));
        let sum = 0;
        let n = 0;
        for (let k = lo; k < hi && k < bins.length; k++) {
          sum += Number.isFinite(bins[k]) ? Math.max(-110, bins[k]) : -110;
          n++;
        }
        frame[b] = n ? sum / n : -110;
      }
      this.level = frame;
      this.frames.push(frame);
      if (this.frames.length > 20) this.frames.shift();
    }, 50);
  }
  stop() {
    clearInterval(this.timer);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.ctx) this.ctx.close().catch(() => {
    });
    this.stream = null;
    this.ctx = null;
    this.frames = [];
  }
  async features() {
    if (this.frames.length < 6) return null;
    const f2 = new Float32Array(BANDS * 2);
    for (let b = 0; b < BANDS; b++) {
      let sum = 0;
      let max = -Infinity;
      for (const fr of this.frames) {
        sum += fr[b];
        if (fr[b] > max) max = fr[b];
      }
      f2[b] = sum / this.frames.length;
      f2[BANDS + b] = max;
    }
    return f2;
  }
};
var IMU_ADDR = 102;
var IMU_LEN = 18;
var SENSOR_CHANNELS = ["기울기 좌우", "기울기 앞뒤", "회전 X", "회전 Y", "회전 Z", "가속 X", "가속 Y", "가속 Z"];
var SensorSource = class {
  constructor(device) {
    this.kind = "sensor";
    this.metric = "euclid";
    this.interval = 150;
    this.device = device;
    this.samples = [];
    this.latest = null;
  }
  async start() {
    if (!this.device.connected) throw new Error("로봇 센서를 쓰려면 먼저 로봇을 연결하세요.");
    this.running = true;
    const slow = /블루투스|BLE|Bluetooth/i.test(this.device.transportName || "");
    (async () => {
      while (this.running) {
        try {
          const b = await this.device.readBytes(200, IMU_ADDR, IMU_LEN);
          const v = [];
          for (let i = 0; i < IMU_LEN; i += 2) {
            let x = b[i] | b[i + 1] << 8;
            if (x >= 32768) x -= 65536;
            v.push(x / 100);
          }
          const sample = [v[0], v[1], v[3], v[4], v[5], v[6], v[7], v[8]];
          this.latest = sample;
          this.samples.push(sample);
          if (this.samples.length > (slow ? 5 : 10)) this.samples.shift();
        } catch (e) {
          if (!this.device.connected) this.running = false;
        }
        await delay2(slow ? 200 : 90);
      }
    })();
  }
  stop() {
    this.running = false;
    this.samples = [];
  }
  async features() {
    if (this.samples.length < 3) return null;
    const C = this.samples[0].length;
    const f2 = new Float32Array(C * 4);
    for (let c = 0; c < C; c++) {
      const xs = this.samples.map((s) => s[c]);
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
      f2[c * 4] = mean;
      f2[c * 4 + 1] = sd;
      f2[c * 4 + 2] = Math.min(...xs);
      f2[c * 4 + 3] = Math.max(...xs);
    }
    return f2;
  }
};
var makeSource = (kind, device, tracker, BodySource2) => {
  if (kind === "body") return new BodySource2(tracker);
  if (kind === "sound") return new SoundSource();
  if (kind === "sensor") return new SensorSource(device);
  return new CameraSource();
};

// src/ai/pose.js
var K = {
  nose: 0,
  lEye: 1,
  rEye: 2,
  lSh: 5,
  rSh: 6,
  lEl: 7,
  rEl: 8,
  lWr: 9,
  rWr: 10,
  lHip: 11,
  rHip: 12,
  lKn: 13,
  rKn: 14,
  lAn: 15,
  rAn: 16
};
var BONES = [
  [5, 6],
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [5, 11],
  [6, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4]
];
var JOINTS = {
  leftShoulder: "왼쪽 어깨 (팔 올림)",
  rightShoulder: "오른쪽 어깨 (팔 올림)",
  leftElbow: "왼쪽 팔꿈치 (굽힘)",
  rightElbow: "오른쪽 팔꿈치 (굽힘)",
  leftKnee: "왼쪽 무릎 (굽힘)",
  rightKnee: "오른쪽 무릎 (굽힘)",
  body: "몸 기울기 (좌우)",
  head: "머리 기울기 (좌우)"
};
var PARTS = { nose: 0, leftHand: 9, rightHand: 10, leftFoot: 15, rightFoot: 16, leftShoulder: 5, rightShoulder: 6 };
var PART_NAMES = {
  nose: "코(얼굴)",
  leftHand: "왼손",
  rightHand: "오른손",
  leftFoot: "왼발",
  rightFoot: "오른발",
  leftShoulder: "왼쪽 어깨",
  rightShoulder: "오른쪽 어깨"
};
var MIN_SCORE = 0.3;
var deg = (r) => r * 180 / Math.PI;
var angleAt = (a, b, c) => {
  const v1 = [a.x - b.x, a.y - b.y];
  const v2 = [c.x - b.x, c.y - b.y];
  const n = Math.hypot(...v1) * Math.hypot(...v2);
  if (!n) return 0;
  return deg(Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / n))));
};
var measure = (kps) => {
  const ok = (...ids) => ids.every((i) => kps[i] && kps[i].score >= MIN_SCORE);
  const a = {};
  const shoulder = (sh, el6, hip) => ok(sh, el6, hip) ? angleAt(kps[el6], kps[sh], kps[hip]) : null;
  const bend = (p, m, q) => ok(p, m, q) ? 180 - angleAt(kps[p], kps[m], kps[q]) : null;
  a.leftShoulder = shoulder(K.lSh, K.lEl, K.lHip);
  a.rightShoulder = shoulder(K.rSh, K.rEl, K.rHip);
  a.leftElbow = bend(K.lSh, K.lEl, K.lWr);
  a.rightElbow = bend(K.rSh, K.rEl, K.rWr);
  a.leftKnee = bend(K.lHip, K.lKn, K.lAn);
  a.rightKnee = bend(K.rHip, K.rKn, K.rAn);
  if (ok(K.lSh, K.rSh, K.lHip, K.rHip)) {
    const top = { x: (kps[K.lSh].x + kps[K.rSh].x) / 2, y: (kps[K.lSh].y + kps[K.rSh].y) / 2 };
    const bot = { x: (kps[K.lHip].x + kps[K.rHip].x) / 2, y: (kps[K.lHip].y + kps[K.rHip].y) / 2 };
    a.body = deg(Math.atan2(top.x - bot.x, bot.y - top.y));
  } else a.body = null;
  a.head = ok(K.lEye, K.rEye) ? deg(Math.atan2(kps[K.lEye].y - kps[K.rEye].y, kps[K.lEye].x - kps[K.rEye].x)) : null;
  const visible = ok(K.lSh, K.rSh) && (ok(K.lHip) || ok(K.rHip) || ok(K.nose));
  const pos = {};
  for (const [name, i] of Object.entries(PARTS)) {
    pos[name] = ok(i) ? { x: (0.5 - kps[i].x) * 200, y: (0.5 - kps[i].y) * 200 } : null;
  }
  return { angles: a, pos, visible };
};
var PoseTracker = class {
  constructor() {
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.className = "ai-video";
    this.users = /* @__PURE__ */ new Set();
    this.listeners = /* @__PURE__ */ new Set();
    this.keypoints = null;
    this.data = measure([]);
    this.fps = 0;
  }
  get running() {
    return Boolean(this._loopOn);
  }
  onUpdate(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  /** Start (shared): each user (AI panel, program blocks) holds a token. */
  async acquire(who) {
    this.users.add(who);
    if (this._starting) return this._starting;
    if (this._loopOn) return void 0;
    this._starting = this._start().finally(() => {
      this._starting = null;
    });
    return this._starting;
  }
  release(who) {
    this.users.delete(who);
    if (!this.users.size) this._stop();
  }
  async _start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("이 브라우저에서는 카메라를 쓸 수 없습니다. Chrome이나 Edge를 사용하세요.");
    }
    const { tf, loadMoveNet } = await loadTF();
    this.tf = tf;
    if (!this.model) this.model = await loadMoveNet();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false
      });
    } catch (e) {
      const n = e && e.name;
      throw new Error(n === "NotAllowedError" || n === "SecurityError" ? "카메라 사용이 허용되지 않았습니다. 주소창 옆의 권한 설정에서 카메라를 허용해 주세요." : `카메라를 켤 수 없습니다: ${e && e.message || e}`);
    }
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => {
    });
    if (!this.users.size) {
      this._stop();
      return;
    }
    this._loopOn = true;
    this._emit();
    this._loop();
  }
  _stop() {
    this._loopOn = false;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.keypoints = null;
    this.data = measure([]);
    this._emit();
  }
  _emit() {
    for (const fn of this.listeners) {
      try {
        fn(this);
      } catch (e) {
      }
    }
  }
  async _loop() {
    let frames = 0;
    let since = Date.now();
    while (this._loopOn) {
      const t0 = Date.now();
      try {
        const kps = await this._estimate();
        if (kps) {
          this._smooth(kps);
          this.data = measure(this.keypoints);
          frames++;
          if (Date.now() - since > 1e3) {
            this.fps = frames;
            frames = 0;
            since = Date.now();
          }
          this._emit();
        }
      } catch (e) {
        this.error = e.message || String(e);
      }
      await new Promise((r) => setTimeout(r, Math.max(5, 40 - (Date.now() - t0))));
    }
  }
  /** MoveNet on a letterboxed (square) frame; returns 17 {x, y, score} in image fractions. */
  async _estimate() {
    const v = this.video;
    if (!this.model || v.readyState < 2 || !v.videoWidth) return null;
    const tf = this.tf;
    const W = v.videoWidth;
    const H = v.videoHeight;
    const side = Math.max(W, H);
    const out = tf.tidy(() => {
      const img = tf.browser.fromPixels(v);
      const padded = tf.pad(img, [
        [Math.floor((side - H) / 2), Math.ceil((side - H) / 2)],
        [Math.floor((side - W) / 2), Math.ceil((side - W) / 2)],
        [0, 0]
      ]);
      const x = tf.cast(tf.image.resizeBilinear(padded, [192, 192]), "int32");
      return this.model.execute(tf.expandDims(x, 0));
    });
    const raw = await out.data();
    out.dispose();
    const kps = [];
    for (let i = 0; i < 17; i++) {
      const yy = raw[i * 3] * side - (side - H) / 2;
      const xx = raw[i * 3 + 1] * side - (side - W) / 2;
      kps.push({ x: xx / W, y: yy / H, score: raw[i * 3 + 2] });
    }
    return kps;
  }
  _smooth(kps) {
    if (!this.keypoints) {
      this.keypoints = kps;
      return;
    }
    this.keypoints = kps.map((k, i) => {
      const p = this.keypoints[i];
      const a = k.score >= MIN_SCORE && p.score >= MIN_SCORE ? 0.55 : 1;
      return { x: p.x + (k.x - p.x) * a, y: p.y + (k.y - p.y) * a, score: k.score };
    });
  }
  /** Joint angle in whole degrees, 0 when not visible. */
  angle(joint) {
    const v = this.data.angles[joint];
    return v === null || v === void 0 ? 0 : Math.round(v);
  }
  position(part, axis) {
    const p = this.data.pos[part];
    return p ? Math.round(axis === "y" ? p.y : p.x) : 0;
  }
  /** Draw the mirrored skeleton over a canvas the size of the preview. */
  draw(canvas) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const k = this.keypoints;
    if (!k) return;
    const P = (i) => ({ x: (1 - k[i].x) * W, y: k[i].y * H, ok: k[i].score >= MIN_SCORE });
    ctx.lineWidth = Math.max(3, W / 120);
    ctx.lineCap = "round";
    for (const [a, b] of BONES) {
      const p = P(a);
      const q = P(b);
      if (!p.ok || !q.ok) continue;
      ctx.strokeStyle = a % 2 === 1 || b % 2 === 1 ? "#ffb347" : "#5ec8ff";
      if (a <= 4 && b <= 4) ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    for (let i = 0; i < 17; i++) {
      const p = P(i);
      if (!p.ok) continue;
      ctx.fillStyle = "#8E44AD";
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(4, W / 90), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
};
var BodySource = class {
  constructor(tracker) {
    this.kind = "body";
    this.metric = "euclid";
    this.interval = 120;
    this.tracker = tracker;
  }
  async start() {
    await this.tracker.acquire("ai-engine");
  }
  stop() {
    this.tracker.release("ai-engine");
  }
  get video() {
    return this.tracker.video;
  }
  async features() {
    const k = this.tracker.keypoints;
    const d = this.tracker.data;
    if (!k || !d.visible) return null;
    const cx = (k[5].x + k[6].x) / 2;
    const cy = (k[5].y + k[6].y) / 2;
    const scale = Math.hypot(k[5].x - k[6].x, k[5].y - k[6].y) || 0.1;
    const f2 = [];
    for (let i = 0; i < 17; i++) {
      if (i >= 1 && i <= 4) continue;
      const okp = k[i].score >= MIN_SCORE;
      f2.push(okp ? (k[i].x - cx) / scale : 0, okp ? (k[i].y - cy) / scale : 0);
    }
    for (const j of Object.keys(JOINTS)) {
      const v = d.angles[j];
      f2.push(v === null ? 0 : v / 45);
    }
    return Float32Array.from(f2);
  }
};

// src/ai/engine.js
var MAX_EXAMPLES = 300;
var THRESHOLD = 0.6;
var knnPredict = (examples, vec, metric) => {
  if (!examples.length) return {};
  let mean = null;
  let sd = null;
  if (metric === "euclid") {
    const d = vec.length;
    mean = new Float32Array(d);
    sd = new Float32Array(d);
    for (const e of examples) for (let i = 0; i < d; i++) mean[i] += e.vec[i];
    for (let i = 0; i < d; i++) mean[i] /= examples.length;
    for (const e of examples) for (let i = 0; i < d; i++) sd[i] += (e.vec[i] - mean[i]) ** 2;
    for (let i = 0; i < d; i++) sd[i] = Math.sqrt(sd[i] / examples.length) || 1;
  }
  const dist = (e) => {
    if (metric === "cosine") {
      let dot = 0;
      for (let i = 0; i < vec.length; i++) dot += vec[i] * e.vec[i];
      return 1 - dot;
    }
    let s = 0;
    for (let i = 0; i < vec.length; i++) s += ((vec[i] - mean[i] - (e.vec[i] - mean[i])) / sd[i]) ** 2;
    return Math.sqrt(s / vec.length);
  };
  const scored = examples.map((e) => ({ label: e.label, d: dist(e) })).sort((a, b) => a.d - b.d);
  const k = Math.min(scored.length, Math.max(3, Math.min(9, Math.round(Math.sqrt(scored.length)))));
  const votes = {};
  let total = 0;
  for (const s of scored.slice(0, k)) {
    const w = 1 / (s.d + 1e-3);
    votes[s.label] = (votes[s.label] || 0) + w;
    total += w;
  }
  for (const key of Object.keys(votes)) votes[key] /= total;
  return votes;
};
var f32ToB64 = (vecs) => {
  if (!vecs.length) return "";
  const all = new Float32Array(vecs.length * vecs[0].length);
  vecs.forEach((v, i) => all.set(v, i * v.length));
  const bytes = new Uint8Array(all.buffer);
  let s = "";
  for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
  return btoa(s);
};
var b64ToF32 = (b64, dim) => {
  if (!b64 || !dim) return [];
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const all = new Float32Array(bytes.buffer);
  const out = [];
  for (let i = 0; i + dim <= all.length; i += dim) out.push(all.slice(i, i + dim));
  return out;
};
var SOURCE_NAMES = { camera: "카메라", body: "몸 동작", sound: "소리", sensor: "로봇 센서" };
var AIEngine = class {
  constructor({ device, log: log2, tracker }) {
    this.device = device;
    this.tracker = tracker;
    this.log = log2 || (() => {
    });
    this.listeners = /* @__PURE__ */ new Set();
    this.reset();
  }
  reset(sourceKind = "camera") {
    this.stop();
    this.sourceKind = sourceKind;
    this.classes = [{ name: "종류 1", examples: [] }, { name: "종류 2", examples: [] }];
    this.collecting = -1;
    this._clearResult();
    this._emit();
  }
  _clearResult() {
    this.probs = {};
    this.active = "";
    this.best = "";
    this._history = [];
  }
  // ---- listeners -------------------------------------------------------
  onUpdate(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  _emit() {
    for (const fn of this.listeners) {
      try {
        fn(this);
      } catch (e) {
      }
    }
  }
  // ---- classes ----------------------------------------------------------
  get names() {
    return this.classes.map((c) => c.name);
  }
  get trainedCount() {
    return this.classes.filter((c) => c.examples.length).length;
  }
  get ready() {
    return this.trainedCount >= 2;
  }
  get exampleCount() {
    return this.classes.reduce((n, c) => n + c.examples.length, 0);
  }
  addClass() {
    let n = this.classes.length + 1;
    while (this.names.includes(`종류 ${n}`)) n++;
    this.classes.push({ name: `종류 ${n}`, examples: [] });
    this._emit();
  }
  renameClass(i, name) {
    const clean = String(name).trim().slice(0, 20);
    if (!clean || this.classes.some((c, j) => j !== i && c.name === clean)) return false;
    this.classes[i].name = clean;
    this._clearResult();
    this._emit();
    return true;
  }
  removeClass(i) {
    if (this.classes.length <= 2) return;
    this.classes.splice(i, 1);
    this._clearResult();
    this._emit();
  }
  clearClass(i) {
    this.classes[i].examples = [];
    this._clearResult();
    this._emit();
  }
  async setSource(kind) {
    if (kind === this.sourceKind) return;
    const was = this.running;
    this.stop();
    this.sourceKind = kind;
    for (const c of this.classes) c.examples = [];
    this._clearResult();
    this._emit();
    if (was) await this.start();
  }
  // ---- collecting ---------------------------------------------------------
  startCollecting(i) {
    this.collecting = i;
    this._lastAdd = 0;
    this._emit();
    if (!this.running) this.start().catch((e) => this.log(`⚠ ${e.message}`, "err"));
  }
  stopCollecting() {
    if (this.collecting < 0) return;
    this.collecting = -1;
    this._emit();
  }
  // ---- running ------------------------------------------------------------
  async start() {
    if (this.running || this._starting) return this._starting;
    this._starting = (async () => {
      const src = makeSource(this.sourceKind, this.device, this.tracker, BodySource);
      this.source = src;
      this.error = "";
      this._emit();
      try {
        await src.start();
      } catch (e) {
        this.source = null;
        this.error = e.message || String(e);
        this._emit();
        throw e;
      }
      this.running = true;
      this._emit();
      this._loop(src);
    })();
    try {
      await this._starting;
    } finally {
      this._starting = null;
    }
    return void 0;
  }
  stop() {
    this.running = false;
    this.collecting = -1;
    if (this.source) this.source.stop();
    this.source = null;
    this._clearResult();
  }
  async _loop(src) {
    while (this.running && this.source === src) {
      const t0 = Date.now();
      let vec = null;
      try {
        vec = await src.features();
      } catch (e) {
        this.error = e.message || String(e);
      }
      if (vec && this.running) this._step(vec);
      const wait = src.interval - (Date.now() - t0);
      await new Promise((r) => setTimeout(r, Math.max(10, wait)));
    }
  }
  _step(vec) {
    this.lastVec = vec;
    const c = this.classes[this.collecting];
    if (c && Date.now() - this._lastAdd >= 150) {
      if (c.examples.length < MAX_EXAMPLES) c.examples.push(vec);
      this._lastAdd = Date.now();
    }
    if (this.ready) {
      const examples = [];
      for (const k of this.classes) for (const v of k.examples) examples.push({ label: k.name, vec: v });
      const probs = knnPredict(examples, vec, this.source.metric);
      for (const name of this.names) probs[name] = probs[name] || 0;
      this.probs = probs;
      const best = Object.keys(probs).reduce((a, b) => probs[b] > probs[a] ? b : a, this.names[0]);
      this._history.push(probs[best] >= THRESHOLD ? best : "");
      if (this._history.length > 2) this._history.shift();
      this.best = best;
      this.active = this._history.every((h) => h === this._history[0]) ? this._history[0] : this.active;
    } else {
      this._clearResult();
    }
    this._emit();
  }
  confidence(name) {
    return Math.round((this.probs[name] || 0) * 100);
  }
  // ---- saving with the project ----------------------------------------------
  serialize() {
    if (!this.exampleCount) return null;
    const dim = (this.classes.find((c) => c.examples.length) || { examples: [[]] }).examples[0].length;
    return {
      version: 1,
      source: this.sourceKind,
      dim,
      classes: this.classes.map((c) => ({ name: c.name, examples: f32ToB64(c.examples) }))
    };
  }
  load(data) {
    this.stop();
    if (!data || !Array.isArray(data.classes)) {
      this.reset(this.sourceKind);
      return;
    }
    this.sourceKind = data.source || "camera";
    this.classes = data.classes.map((c) => ({ name: String(c.name), examples: b64ToF32(c.examples, data.dim) }));
    while (this.classes.length < 2) this.classes.push({ name: `종류 ${this.classes.length + 1}`, examples: [] });
    this.collecting = -1;
    this._clearResult();
    this._emit();
  }
};

// src/ai/ai-panel.js
var el4 = (tag, cls, text2) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text2 !== void 0) e.textContent = text2;
  return e;
};
var button2 = (cls, text2, onClick, title) => {
  const b = el4("button", cls, text2);
  b.type = "button";
  if (title) b.title = title;
  if (onClick) b.addEventListener("click", onClick);
  return b;
};
var COLORS = ["#2E6ABF", "#E07B39", "#1FB36B", "#C0392B", "#8E44AD", "#16A2B8", "#B7950B", "#5D6D7E"];
var NOTES = {
  body: "PC 카메라로 사람의 관절 17곳(스켈레톤)을 찾습니다. 만세·팔 벌리기·앉기 같은 자세를 학습시키거나, [몸 동작] 블록으로 사람의 팔 각도를 그대로 로봇 모터에 보내 따라 하게 할 수 있습니다.",
  camera: "노트북 카메라로 손 모양, 표정, 물건, 색 카드 등을 알아봅니다. 사진은 저장되지 않고, 각 장면에서 뽑은 숫자 256개만 저장됩니다.",
  sound: "마이크로 박수, 휘파람, 목소리, 조용함 등을 알아봅니다. 높고 낮은 소리 32칸의 크기를 비교합니다.",
  sensor: "CM-550의 기울기·회전·가속 센서로 로봇이 흔들림, 기울어짐, 밀림, 넘어짐 같은 상태를 알아봅니다."
};
var AIPanel = class {
  /**
   * @param {object} o
   * @param {HTMLElement} o.host
   * @param {import('./engine').AIEngine} o.engine
   * @param {Function} o.log
   * @param {Function} o.onKindsChange  called when kind names change (refresh block menus)
   * @param {Function} o.addScript      (kinds) -> void, example blocks into the workspace
   */
  constructor({ host, engine, log: log2, onKindsChange, addScript, addFollowScript: addFollowScript2, tracker }) {
    this.host = host;
    this.addFollowScript = addFollowScript2;
    this.tracker = tracker;
    this.engine = engine;
    this.log = log2;
    this.onKindsChange = onKindsChange;
    this.addScript = addScript;
    this.visible = false;
    this._build();
    engine.onUpdate(() => this._onEngine());
    if (tracker) tracker.onUpdate(() => this._onPose());
    window.addEventListener("pointerup", () => engine.stopCollecting());
    window.addEventListener("blur", () => engine.stopCollecting());
    this.render();
  }
  _build() {
    this.host.classList.add("mon", "aip");
    const header = el4("header", "mon-header");
    header.append(el4("span", "mon-title", "AI 학습"));
    this.stateEl = el4("span", "mon-state", "");
    header.append(this.stateEl);
    this.runBtn = button2("mon-btn", "인식 시작", () => this.toggleRun());
    header.append(this.runBtn);
    this.host.append(header);
    const body = el4("div", "mon-body");
    this.host.append(body);
    const c1 = el4("section", "mon-card");
    c1.append(el4("h3", "", "1. 무엇으로 알아볼까요?"));
    this.srcRow = el4("div", "ai-sources");
    for (const kind of ["body", "camera", "sound", "sensor"]) {
      const b = button2(
        "ai-src",
        { body: "🧍 몸 동작", camera: "📷 카메라", sound: "🎤 소리", sensor: "🤖 로봇 센서" }[kind],
        () => this.chooseSource(kind)
      );
      b.dataset.kind = kind;
      this.srcRow.append(b);
    }
    c1.append(this.srcRow);
    this.noteEl = el4("p", "mon-note ai-note");
    c1.append(this.noteEl);
    this.preview = el4("div", "ai-preview");
    this.canvas = el4("canvas", "ai-canvas");
    this.canvas.width = 320;
    this.canvas.height = 120;
    this.previewMsg = el4("div", "ai-preview-msg", "");
    this.overlay = el4("canvas", "ai-overlay");
    this.stage = el4("div", "ai-stage");
    this.anglesEl = el4("div", "ai-angles");
    this.followRow = el4("div", "tp-row");
    this.followBtn = button2(
      "tp-btn tp-primary",
      "따라 하기 예시 블록",
      () => this.addFollowScript(),
      "사람의 양팔 어깨 각도를 로봇 모터 두 개가 따라 하는 블록을 넣습니다"
    );
    this.followRow.append(this.followBtn, el4("span", "tp-label", "사람 팔 각도 → 로봇 모터"));
    c1.append(this.preview, this.anglesEl, this.followRow);
    body.append(c1);
    const c2 = el4("section", "mon-card");
    c2.append(el4("h3", "", "2. 종류별로 예시 모으기"));
    c2.append(el4("p", "mon-note", '종류 이름을 정하고 [누르고 있는 동안 모으기]를 꾹 누르세요. 종류마다 20개 이상 모으면 잘 알아봅니다. "아무것도 아님" 종류를 하나 두면 더 정확해집니다.'));
    this.kindsEl = el4("div", "ai-kinds");
    c2.append(this.kindsEl);
    const row = el4("div", "tp-row");
    row.append(button2("tp-btn", "+ 종류 추가", () => {
      this.engine.addClass();
      this._kindsChanged();
    }));
    c2.append(row);
    body.append(c2);
    const c3 = el4("section", "mon-card");
    c3.append(el4("h3", "", "3. AI가 알아본 결과"));
    this.resultEl = el4("div", "ai-result", "–");
    this.barsEl = el4("div", "ai-bars");
    c3.append(this.resultEl, this.barsEl);
    c3.append(el4("p", "mon-note", '블록 분류의 [AI 학습]에서 "AI가 [종류] 을(를) 알아봤을 때" 블록으로 로봇이 반응하게 만들어 보세요.'));
    const row3 = el4("div", "tp-row");
    this.scriptBtn = button2(
      "tp-btn",
      "예시 블록 만들기",
      () => this.addScript(this.engine.names),
      '종류마다 "알아봤을 때 → 말하기" 블록을 작업 영역에 넣습니다'
    );
    row3.append(this.scriptBtn);
    c3.append(row3);
    body.append(c3);
  }
  setVisible(v) {
    this.visible = v;
    if (v) {
      this.render();
      this._draw();
    }
  }
  _kindsChanged() {
    if (this.onKindsChange) this.onKindsChange();
    this.render();
  }
  async chooseSource(kind) {
    const e = this.engine;
    if (kind === e.sourceKind) return;
    if (e.exampleCount && !window.confirm(
      // eslint-disable-line no-alert
      `${SOURCE_NAMES[kind]}(으)로 바꾸면 지금까지 모은 예시가 지워집니다. 바꿀까요?`
    )) return;
    try {
      await e.setSource(kind);
    } catch (err) {
      this.log(`⚠ ${err.message}`, "err");
    }
    this.render();
  }
  async toggleRun() {
    const e = this.engine;
    if (e.running) {
      e.stop();
      e._emit();
      return;
    }
    try {
      this.runBtn.disabled = true;
      this.stateEl.textContent = e.sourceKind === "camera" ? "AI 모델을 준비하는 중…" : "시작하는 중…";
      await e.start();
    } catch (err) {
      this.log(`⚠ ${err.message}`, "err");
    } finally {
      this.runBtn.disabled = false;
      this.render();
    }
  }
  _onEngine() {
    const sig = [
      this.engine.sourceKind,
      this.engine.running,
      this.engine.names.join("|"),
      this.engine.error
    ].join("/");
    if (sig !== this._sig) this.render();
    else this._update();
  }
  render() {
    const e = this.engine;
    this._sig = [e.sourceKind, e.running, e.names.join("|"), e.error].join("/");
    for (const b of this.srcRow.children) b.classList.toggle("active", b.dataset.kind === e.sourceKind);
    this.noteEl.textContent = NOTES[e.sourceKind];
    this.runBtn.textContent = e.running ? "인식 멈추기" : "인식 시작";
    this.preview.textContent = "";
    const body = e.sourceKind === "body";
    if (body && this.tracker) {
      this.stage.textContent = "";
      this.stage.append(this.tracker.video, this.overlay);
      this.preview.append(this.stage);
    } else if (e.sourceKind === "camera" && e.source && e.source.video) this.preview.append(e.source.video);
    else this.preview.append(this.canvas);
    this.preview.append(this.previewMsg);
    this.anglesEl.hidden = !body;
    this.followRow.hidden = !body;
    this.kindsEl.textContent = "";
    e.classes.forEach((c, i) => {
      const row = el4("div", "ai-kind");
      row.style.setProperty("--kind", COLORS[i % COLORS.length]);
      const name = el4("input", "ai-kind-name");
      name.value = c.name;
      name.maxLength = 20;
      name.setAttribute("aria-label", `${i + 1}번 종류 이름`);
      name.addEventListener("change", () => {
        if (!e.renameClass(i, name.value)) {
          name.value = c.name;
          this.log("종류 이름이 비어 있거나 다른 종류와 같습니다.", "warn");
        }
        this._kindsChanged();
      });
      const count = el4("span", "ai-count", `${c.examples.length}개`);
      count.dataset.i = i;
      const hold = button2("ai-hold", "누르고 있는 동안 모으기");
      hold.dataset.i = i;
      hold.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        e.startCollecting(i);
      });
      for (const t of ["pointerup", "pointerleave", "pointercancel"]) {
        hold.addEventListener(t, () => e.stopCollecting());
      }
      const clear = button2("mon-btn-small", "지우기", () => e.clearClass(i), "이 종류의 예시를 지웁니다");
      const rm = button2("mon-btn-small tp-x", "✕", () => {
        e.removeClass(i);
        this._kindsChanged();
      }, "이 종류 지우기");
      rm.disabled = e.classes.length <= 2;
      row.append(name, count, hold, clear, rm);
      this.kindsEl.append(row);
    });
    this._update();
  }
  _update() {
    const e = this.engine;
    this.stateEl.textContent = e.error ? `⚠ ${e.error}` : e._starting ? e.sourceKind === "camera" ? "AI 모델을 준비하는 중…" : "시작하는 중…" : e.running ? e.collecting >= 0 ? `'${e.names[e.collecting]}' 예시 모으는 중` : e.ready ? "인식하는 중" : "예시를 모아 주세요" : `${SOURCE_NAMES[e.sourceKind]} · 예시 ${e.exampleCount}개`;
    for (const h of this.kindsEl.querySelectorAll(".ai-hold")) {
      h.classList.toggle("on", Number(h.dataset.i) === e.collecting);
    }
    for (const c of this.kindsEl.querySelectorAll(".ai-count")) {
      const k = e.classes[Number(c.dataset.i)];
      if (k) c.textContent = `${k.examples.length}개`;
    }
    const poseOn = e.sourceKind === "body" && this.tracker && this.tracker.running;
    this.previewMsg.textContent = e.running || poseOn ? "" : e.sourceKind === "sensor" && !e.device.connected ? "로봇을 연결한 뒤 [인식 시작]을 누르세요" : "[인식 시작]을 누르면 여기에 보입니다";
    if (!e.running) this.resultEl.textContent = "인식이 꺼져 있습니다";
    else if (!e.ready) this.resultEl.textContent = "두 가지 이상의 종류에 예시를 모아 주세요";
    else this.resultEl.textContent = e.active ? `지금: ${e.active}` : "잘 모르겠어요 (확신 60% 미만)";
    this.resultEl.classList.toggle("sure", Boolean(e.active));
    this.barsEl.textContent = "";
    e.classes.forEach((c, i) => {
      const p = e.confidence(c.name);
      const row = el4("div", "ai-bar");
      row.append(el4("span", "ai-bar-name", c.name));
      const track = el4("span", "ai-bar-track");
      const fill = el4("span", "ai-bar-fill");
      fill.style.width = `${p}%`;
      fill.style.background = COLORS[i % COLORS.length];
      track.append(fill);
      row.append(track, el4("span", "ai-bar-pct", `${p}%`));
      this.barsEl.append(row);
    });
    this.scriptBtn.disabled = !e.ready;
    if (this.visible) this._draw();
  }
  /** Skeleton overlay + joint angles (also while only the program uses the camera). */
  _onPose() {
    const t = this.tracker;
    if (!this.visible || this.engine.sourceKind !== "body") return;
    if (this.preview.querySelector(".ai-preview-msg").textContent && t.running) this._update();
    const v = t.video;
    if (v.videoWidth && (this.overlay.width !== v.videoWidth || this.overlay.height !== v.videoHeight)) {
      this.overlay.width = v.videoWidth;
      this.overlay.height = v.videoHeight;
    }
    t.draw(this.overlay);
    const a = t.data.angles;
    this.anglesEl.textContent = "";
    const head = el4("div", "ai-angle-head", t.running ? t.data.visible ? `사람 보임 · ${t.fps} fps` : "사람이 보이지 않아요 — 상반신이 화면에 들어오게 서 주세요" : "몸 동작 추적이 꺼져 있습니다");
    this.anglesEl.append(head);
    for (const [key, label2] of Object.entries(JOINTS)) {
      const cell = el4("div", "ai-angle");
      cell.append(
        el4("span", "", label2.replace(/ \(.*\)$/, "")),
        el4("b", "", a[key] === null || a[key] === void 0 ? "–" : `${Math.round(a[key])}°`)
      );
      this.anglesEl.append(cell);
    }
  }
  /** Sound: 32 band levels. Sensor: 8 channels. */
  _draw() {
    const e = this.engine;
    const src = e.source;
    if (!src || e.sourceKind === "camera") return;
    const ctx = this.canvas.getContext("2d");
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f2f5fa";
    ctx.fillRect(0, 0, W, H);
    if (e.sourceKind === "sound" && src.level) {
      const n = src.level.length;
      const bw = W / n;
      for (let b = 0; b < n; b++) {
        const v = Math.max(0, Math.min(1, (src.level[b] + 100) / 70));
        ctx.fillStyle = "#2E6ABF";
        ctx.fillRect(b * bw + 1, H - v * (H - 14), bw - 2, v * (H - 14));
      }
      ctx.fillStyle = "#6b7689";
      ctx.font = "10px sans-serif";
      ctx.fillText("낮은 소리", 4, 11);
      ctx.fillText("높은 소리", W - 48, 11);
    } else if (e.sourceKind === "sensor" && src.latest) {
      const n = SENSOR_CHANNELS.length;
      const bh = (H - 4) / n;
      const scale = [45, 45, 200, 200, 200, 2, 2, 2];
      ctx.font = "10px sans-serif";
      for (let c = 0; c < n; c++) {
        const v = Math.max(-1, Math.min(1, src.latest[c] / scale[c]));
        const y = 2 + c * bh;
        ctx.fillStyle = "#6b7689";
        ctx.fillText(SENSOR_CHANNELS[c], 4, y + bh - 4);
        const mid = 70 + (W - 80) / 2;
        ctx.fillStyle = "#dde3ec";
        ctx.fillRect(70, y + 2, W - 80, bh - 4);
        ctx.fillStyle = v >= 0 ? "#1FB36B" : "#E07B39";
        ctx.fillRect(v >= 0 ? mid : mid + v * (W - 80) / 2, y + 2, Math.abs(v) * (W - 80) / 2, bh - 4);
      }
    }
  }
};

// src/sim3d/gait.js
var GAIT_PARAMS = [
  { key: "period", name: "한 걸음 주기 (초)", min: 0.35, max: 1.2, step: 0.01, def: 0.35 },
  { key: "height", name: "무릎 굽힘 (낮게 서기)", min: 0.05, max: 0.6, step: 0.01, def: 0.086 },
  { key: "sway", name: "옆으로 흔들기", min: 0.06, max: 0.35, step: 0.01, def: 0.061 },
  { key: "lift", name: "발 들기", min: 0.12, max: 0.5, step: 0.01, def: 0.121 },
  { key: "stride", name: "보폭", min: 0, max: 0.4, step: 0.01, def: 0.224 },
  { key: "liftPhase", name: "발 드는 때 (위상)", min: -3.14, max: 3.14, step: 0.01, def: -2.591 },
  { key: "arm", name: "팔 흔들기", min: 0, max: 0.6, step: 0.01, def: 0.51 }
];
var defaultGait = () => Object.fromEntries(GAIT_PARAMS.map((p) => [p.key, p.def]));
var gaitTargets = (g, t, k = 1) => {
  const ph = 2 * Math.PI * t / g.period;
  const roll = g.sway * Math.sin(ph) * k;
  const out = {};
  for (const [s, sg] of [["R", 1], ["L", -1]]) {
    const lift = g.lift * Math.max(0, Math.sin(ph + g.liftPhase + (s === "L" ? Math.PI : 0))) * k;
    const step = g.stride * Math.cos(ph) * sg * k;
    out[`${s}_hip_roll`] = roll;
    out[`${s}_ankle_roll`] = -roll;
    out[`${s}_hip_pitch`] = -g.height * k - lift + step;
    out[`${s}_knee`] = g.height * k + lift;
    out[`${s}_shoulder_pitch`] = -g.arm * Math.cos(ph) * sg * k;
    out[`${s}_shoulder_roll`] = 0;
  }
  return out;
};

// src/ai/ai-extension.js
var AI_EXTENSION_ID = "dmai";
var SKELETON_OPCODES = ["skelVisible", "skelAngle", "skelPos", "skelFollow", "skelSwitch"];
var createAIExtension = ({ ArgumentType, BlockType }, engine, { log: log2, isRunning, tracker, device, walker: walker2, simStore: simStore2 } = {}) => {
  class DMAIBlocks {
    constructor(runtime) {
      this.runtime = runtime;
      runtime.ext_dmai = this;
    }
    getInfo() {
      const first = engine.names[0] || "종류 1";
      const CLASS = { type: ArgumentType.STRING, menu: "kinds", defaultValue: first };
      return {
        id: AI_EXTENSION_ID,
        name: "AI 학습",
        color1: "#8E44AD",
        color2: "#7D3C98",
        color3: "#6C3483",
        blocks: [
          {
            opcode: "aiWhen",
            blockType: BlockType.HAT,
            isEdgeActivated: true,
            text: "AI가 [CLASS] 을(를) 알아봤을 때",
            arguments: { CLASS }
          },
          {
            opcode: "aiLabel",
            blockType: BlockType.REPORTER,
            text: "AI가 알아본 것",
            disableMonitor: true
          },
          {
            opcode: "aiIs",
            blockType: BlockType.BOOLEAN,
            text: "AI가 알아본 것이 [CLASS] 인가?",
            arguments: { CLASS }
          },
          {
            opcode: "aiConfidence",
            blockType: BlockType.REPORTER,
            text: "AI가 [CLASS] (이)라고 생각하는 정도 (%)",
            arguments: { CLASS },
            disableMonitor: true
          },
          {
            opcode: "aiSwitch",
            blockType: BlockType.COMMAND,
            text: "AI 인식 [STATE]",
            arguments: { STATE: { type: ArgumentType.STRING, menu: "aiState", defaultValue: "on" } }
          },
          // ---- 몸 동작 (skeleton from the PC camera) ----
          {
            opcode: "skelVisible",
            blockType: BlockType.BOOLEAN,
            text: "카메라에 사람이 보이는가?"
          },
          {
            opcode: "skelAngle",
            blockType: BlockType.REPORTER,
            text: "사람의 [JOINT] 각도",
            arguments: { JOINT: { type: ArgumentType.STRING, menu: "joints", defaultValue: "rightShoulder" } },
            disableMonitor: true
          },
          {
            opcode: "skelPos",
            blockType: BlockType.REPORTER,
            text: "사람의 [PART] [AXIS] 위치",
            arguments: {
              PART: { type: ArgumentType.STRING, menu: "parts", defaultValue: "rightHand" },
              AXIS: { type: ArgumentType.STRING, menu: "axis", defaultValue: "y" }
            },
            disableMonitor: true
          },
          {
            opcode: "skelFollow",
            blockType: BlockType.COMMAND,
            text: "다이나믹셀 [ID] 이(가) 사람의 [JOINT] 따라 하기 (가운데 [CENTER]° , [DIR])",
            arguments: {
              ID: { type: ArgumentType.NUMBER, defaultValue: 1 },
              JOINT: { type: ArgumentType.STRING, menu: "joints", defaultValue: "rightShoulder" },
              CENTER: { type: ArgumentType.NUMBER, defaultValue: 180 },
              DIR: { type: ArgumentType.STRING, menu: "dir", defaultValue: "1" }
            }
          },
          // ---- 걸음 (learned in the 3D simulator) ----
          {
            opcode: "walkGait",
            blockType: BlockType.COMMAND,
            text: "학습한 걸음으로 [SECS] 초 걷기 (느리게 [SLOW] 배)",
            arguments: {
              SECS: { type: ArgumentType.NUMBER, defaultValue: 10 },
              SLOW: { type: ArgumentType.NUMBER, defaultValue: 1 }
            }
          },
          {
            opcode: "walkPolicy",
            blockType: BlockType.COMMAND,
            text: "강화학습 정책으로 [SECS] 초 걷기",
            arguments: { SECS: { type: ArgumentType.NUMBER, defaultValue: 10 } }
          },
          {
            opcode: "walkStop",
            blockType: BlockType.COMMAND,
            text: "걷기 멈추기"
          },
          {
            opcode: "walking",
            blockType: BlockType.BOOLEAN,
            text: "걷는 중인가?"
          },
          {
            opcode: "skelSwitch",
            blockType: BlockType.COMMAND,
            text: "몸 동작 추적 [STATE]",
            arguments: { STATE: { type: ArgumentType.STRING, menu: "aiState", defaultValue: "on" } }
          }
        ],
        menus: {
          kinds: { acceptReporters: true, items: "_kindMenu" },
          joints: {
            acceptReporters: false,
            items: Object.entries(JOINTS).map(([value, text2]) => ({ text: text2, value }))
          },
          parts: {
            acceptReporters: false,
            items: Object.entries(PART_NAMES).map(([value, text2]) => ({ text: text2, value }))
          },
          axis: { acceptReporters: false, items: [
            { text: "x (좌우)", value: "x" },
            { text: "y (위아래)", value: "y" }
          ] },
          dir: { acceptReporters: false, items: [
            { text: "같은 방향", value: "1" },
            { text: "반대 방향", value: "-1" }
          ] },
          aiState: { acceptReporters: false, items: [
            { text: "켜기", value: "on" },
            { text: "끄기", value: "off" }
          ] }
        }
      };
    }
    _kindMenu() {
      const names = engine.names;
      return names.length ? names : ["종류 1"];
    }
    /** Blocks that need a result start recognition by themselves. */
    _autoStart() {
      if (engine.running || engine._starting || !engine.ready) return;
      if (isRunning && !isRunning()) return;
      engine.start().catch((e) => log2 && log2(`⚠ AI 인식을 시작할 수 없습니다: ${e.message}`, "err"));
    }
    // ---- 걸음 -----------------------------------------------------------------
    async walkGait(args) {
      if (!walker2) return;
      const gait = simStore2 && simStore2.gait || defaultGait();
      try {
        await walker2.walk(gait, Math.max(0.5, Number(args.SECS) || 0), { slow: Math.max(0.5, Math.min(4, Number(args.SLOW) || 1)) });
      } catch (e) {
        if (log2) log2(`⚠ 걷기: ${e.message || e}`, "err");
      }
    }
    async walkPolicy(args) {
      if (!walker2) return;
      const p = simStore2 && simStore2.policy;
      if (!p) {
        if (log2) log2("⚠ 강화학습 정책이 없습니다. 3D 탭에서 정책 파일을 여세요.", "err");
        return;
      }
      try {
        await walker2.walk(p.gait, Math.max(0.5, Number(args.SECS) || 0), { policy: p });
      } catch (e) {
        if (log2) log2(`⚠ 정책 걷기: ${e.message || e}`, "err");
      }
    }
    walkStop() {
      if (walker2) walker2.stop();
    }
    walking() {
      return Boolean(walker2 && walker2.running);
    }
    // ---- 몸 동작 -----------------------------------------------------------
    /** Skeleton blocks start the camera by themselves while a program runs. */
    _body() {
      if (!tracker) return false;
      if (!tracker.running && !tracker._starting && (!isRunning || isRunning())) {
        tracker.acquire("blocks").catch((e) => log2 && log2(`⚠ 몸 동작을 추적할 수 없습니다: ${e.message}`, "err"));
      }
      return tracker.running;
    }
    skelVisible() {
      return this._body() && tracker.data.visible;
    }
    skelAngle(args) {
      return this._body() ? tracker.angle(String(args.JOINT)) : 0;
    }
    skelPos(args) {
      return this._body() ? tracker.position(String(args.PART), String(args.AXIS)) : 0;
    }
    async skelFollow(args) {
      if (!this._body()) return;
      if (!device || !device.connected) {
        if (log2 && !this._warnedConn) log2("⚠ 로봇이 연결되어 있지 않아 따라 하기를 할 수 없습니다.", "err");
        this._warnedConn = true;
        return;
      }
      const joint = String(args.JOINT);
      const v = tracker.data.angles[joint];
      if (v === null || v === void 0 || !tracker.data.visible) return;
      const id = Math.round(Number(args.ID) || 0);
      const target = Math.max(0, Math.min(360, Number(args.CENTER) + (Number(args.DIR) < 0 ? -v : v)));
      this._last = this._last || {};
      if (this._last[id] !== void 0 && Math.abs(this._last[id] - target) < 2) {
        await new Promise((r) => setTimeout(r, 15));
        return;
      }
      try {
        const first = this._last[id] === void 0;
        await device.moveTo(id, target, first ? 70 : NaN);
        this._last[id] = target;
      } catch (e) {
        if (log2) log2(`⚠ 다이나믹셀 ${id}: ${e.message}`, "err");
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    async skelSwitch(args) {
      if (!tracker) return;
      if (args.STATE === "off") {
        tracker.release("blocks");
        return;
      }
      try {
        await tracker.acquire("blocks");
      } catch (e) {
        if (log2) log2(`⚠ 몸 동작을 추적할 수 없습니다: ${e.message}`, "err");
      }
    }
    aiWhen(args) {
      return engine.running && engine.active === String(args.CLASS);
    }
    aiLabel() {
      this._autoStart();
      return engine.active;
    }
    aiIs(args) {
      this._autoStart();
      return engine.active === String(args.CLASS);
    }
    aiConfidence(args) {
      this._autoStart();
      return engine.confidence(String(args.CLASS));
    }
    async aiSwitch(args) {
      if (args.STATE === "off") {
        engine.stop();
        engine._emit();
        return;
      }
      if (!engine.ready) {
        if (log2) log2("⚠ AI 학습 패널에서 두 가지 이상의 종류에 예시를 모은 뒤 사용하세요.", "err");
        return;
      }
      try {
        await engine.start();
      } catch (e) {
        if (log2) log2(`⚠ AI 인식을 시작할 수 없습니다: ${e.message}`, "err");
      }
    }
  }
  return DMAIBlocks;
};

// src/sim3d/policy.js
var OBS_NAMES = ["roll", "pitch", "gx", "gy", "sin", "cos"];
var policyObs = (policy, { imu, targets, phase }) => {
  const o = [imu.roll, imu.pitch, imu.gx, imu.gy, Math.sin(phase), Math.cos(phase)];
  for (const j of policy.joints) o.push(targets[j] || 0);
  const s = policy.obs_scale || [];
  return o.map((v, i) => v * (s[i] === void 0 ? 1 : s[i]));
};
var policyAct = (policy, obs) => {
  let x = obs;
  policy.layers.forEach((L, li) => {
    const y = L.b.slice();
    for (let r = 0; r < L.W.length; r++) {
      let sum = y[r];
      const row = L.W[r];
      for (let c = 0; c < row.length; c++) sum += row[c] * x[c];
      y[r] = li < policy.layers.length - 1 ? Math.tanh(sum) : sum;
    }
    x = y;
  });
  return x.map((v) => Math.tanh(v) * (policy.scale || 0.25));
};
var checkPolicy = (p) => {
  if (!p || p.format !== "dm-policy-1" || !Array.isArray(p.layers) || !Array.isArray(p.joints)) {
    throw new Error("다이나믹 메이커스 정책 파일(dm-policy-1)이 아닙니다.");
  }
  const inDim = OBS_NAMES.length + p.joints.length;
  if (p.layers[0].W[0].length !== inDim) throw new Error(`정책 입력 크기가 맞지 않습니다 (${p.layers[0].W[0].length} ≠ ${inDim}).`);
  return p;
};

// src/sim3d/walker.js
var { DXL } = require_cm550();
var DEG = 180 / Math.PI;
var delay3 = (ms) => new Promise((r) => setTimeout(r, ms));
var Walker = class {
  /**
   * @param {object} o
   * @param {object} o.device CM550Device
   * @param {Function} o.getJointMap () -> [{id, joint, sign, center}]
   * @param {Function} o.log
   */
  constructor({ device, getJointMap, log: log2 }) {
    this.device = device;
    this.getJointMap = getJointMap;
    this.log = log2 || (() => {
    });
    this.running = false;
    this.listeners = /* @__PURE__ */ new Set();
  }
  onUpdate(fn) {
    this.listeners.add(fn);
  }
  _emit() {
    for (const fn of this.listeners) {
      try {
        fn(this);
      } catch (e) {
      }
    }
  }
  _items(targets, map) {
    return map.filter((j) => targets[j.joint] !== void 0).map((j) => ({
      id: j.id,
      value: Math.max(0, Math.min(4095, Math.round((targets[j.joint] * DEG * j.sign + j.center) / 360 * 4096)))
    }));
  }
  /**
   * @param {object} gait 7 numbers
   * @param {number} seconds 0 = until stop()
   * @param {object} [opts]
   * @param {object} [opts.policy] trained network (JSON from the Python kit)
   * @param {number} [opts.slow] 1 = as learned; 1.5 = 1.5× slower (safer on the real robot)
   * @param {boolean} [opts.prepare] start from the same condition as 걸음 학습 (errors cleared,
   *     torque on, standing straight; the 3D robot in a fresh world). Default: only the first
   *     walk after connecting or after ▶ 실행, so walks inside one program follow each other.
   */
  async walk(gait, seconds, { policy = null, slow = 1, prepare } = {}) {
    if (this.running) this.stop();
    await delay3(0);
    const dev = this.device;
    if (!dev.connected) throw new Error("먼저 로봇을 연결하세요.");
    const map = this.getJointMap();
    const ids = map.map((j) => j.id);
    const g = Object.assign({}, gait, { period: gait.period * slow });
    const tr = dev.transport;
    this.running = true;
    this.mode = policy ? "policy" : "gait";
    this._emit();
    if (prepare === true || prepare !== false && !dev.prepared) {
      try {
        this.log("시작 준비: 오류 확인 → 토크 켜기 → 모든 관절 180°(바로 서기)…");
        const r = await dev.prepareJoints(ids, {}, 2);
        if (r.rebooted.length) this.log(`다이나믹셀 ${r.rebooted.join(", ")}: 오류가 있어 다시 시작했습니다.`, "warn");
      } catch (e) {
        this.running = false;
        this._emit();
        throw e;
      }
    }
    if (tr && tr.physics) {
      try {
        await this._walkSim(tr, g, seconds, policy, map);
      } finally {
        this.running = false;
        this._emit();
      }
      return;
    }
    if (tr && "quiet" in tr) tr.quiet = true;
    try {
      const OP_POSITION = 3;
      const OP_EXTENDED = 4;
      const present = [];
      for (const id of ids) {
        await dev.ensureMode(id, [OP_POSITION, OP_EXTENDED]);
        present.push({ id, value: await dev.readDXL(id, DXL.PRESENT_POSITION) });
      }
      await dev.syncWriteDXL(DXL.GOAL_POSITION, present);
      await dev.syncWriteDXL(DXL.TORQUE_ENABLE, ids.map((id) => ({ id, value: 1 })));
      await dev.syncWriteDXL(DXL.PROFILE_VELOCITY, ids.map((id) => ({ id, value: 0 })));
      const clock = tr && tr.physics ? () => tr.physics.data.time : () => performance.now() / 1e3;
      const t0 = clock();
      const ramp = 0.6;
      let tick = 0;
      let last = this._items(gaitTargets(g, 0, 0), map);
      let prev = null;
      const cmd = {};
      while (this.running) {
        const t = clock() - t0;
        if (seconds > 0 && t > seconds) break;
        let k = Math.min(1, t / ramp);
        if (seconds > 0) k = Math.min(k, Math.max(0, (seconds - t) / ramp));
        const targets = gaitTargets(g, t, k);
        if (policy) {
          const imu = await this._readImu();
          const obs = policyObs(policy, { imu, targets: prev || targets, phase: 2 * Math.PI * t / g.period });
          const res = policyAct(policy, obs);
          policy.joints.forEach((j, i) => {
            targets[j] += res[i] * k;
          });
        }
        prev = Object.assign(cmd, targets);
        last = this._items(targets, map);
        await dev.syncWriteDXL(DXL.GOAL_POSITION, last);
        this.t = t;
        this._emit();
        tick++;
        const next = tick * 0.04;
        while (this.running && clock() - t0 < next) await delay3(4);
        if (clock() - t0 > next + 0.2) tick = Math.floor((clock() - t0) / 0.04);
      }
      await dev.syncWriteDXL(DXL.PROFILE_VELOCITY, ids.map((id) => ({ id, value: 40 })));
      await dev.syncWriteDXL(DXL.GOAL_POSITION, this._items(gaitTargets(g, 0, 0), map));
    } finally {
      if (tr && "quiet" in tr) tr.quiet = false;
      this.running = false;
      this._emit();
    }
  }
  /**
   * 3D 가상 로봇: run the controller inside the physics loop, exactly every
   * 0.04 s of simulated time — the same timing as the Python training kit.
   */
  _walkSim(tr, g, seconds, policy, map) {
    const ph = tr.physics;
    for (const j of map) {
      ph.setTorque(j.id, 1);
      ph.setProfile(j.id, 0);
      tr.regs.set(`${j.id}:64`, 1);
    }
    const t0 = ph.data.time;
    const ramp = 0.6;
    let prev = null;
    return new Promise((resolve) => {
      ph.setController((time) => {
        const t = time - t0;
        if (!this.running || seconds > 0 && t > seconds) {
          ph.setController(null);
          const stand = gaitTargets(g, 0, 0);
          for (const j in stand) ph.setGoalRad(j, stand[j]);
          resolve();
          return;
        }
        let k = Math.min(1, t / ramp);
        if (seconds > 0) k = Math.min(k, Math.max(0, (seconds - t) / ramp));
        const targets = gaitTargets(g, t, k);
        if (policy) {
          const obs = policyObs(policy, { imu: ph.imuRad(), targets: prev || targets, phase: 2 * Math.PI * t / g.period });
          const res = policyAct(policy, obs);
          policy.joints.forEach((j, i) => {
            targets[j] += res[i] * k;
          });
        }
        prev = targets;
        for (const j in targets) ph.setGoalRad(j, targets[j]);
        this.t = t;
        if (Math.round(t / 0.04) % 5 === 0) this._emit();
      });
    });
  }
  async _readImu() {
    try {
      const b = await this.device.readBytes(200, 102, 18);
      const v = [];
      for (let i = 0; i < 18; i += 2) {
        let x = b[i] | b[i + 1] << 8;
        if (x >= 32768) x -= 65536;
        v.push(x / 100);
      }
      return { roll: v[0] / DEG, pitch: v[1] / DEG, gx: v[3] / DEG, gy: v[4] / DEG };
    } catch (e) {
      return { roll: 0, pitch: 0, gx: 0, gy: 0 };
    }
  }
  stop() {
    this.running = false;
  }
};

// src/sim3d/maxe1-cad.json
var maxe1_cad_default = {
  _: "Generated by scripts/gen-maxe1-cad.py from the part assembly (scripts/maxe1_asm.py). Metres, kilograms, zero pose.",
  total_mass: 1.205,
  dims: {
    sole: [
      0.102,
      0.064,
      0.008199999999999999
    ],
    ankleRoll: 0.0337,
    box: [
      0.0504,
      0.1077,
      0.0506
    ],
    armLength: 0.1415,
    shoulderTilt: 15,
    legY: 0.0352
  },
  bodies: {
    torso: {
      pos: [
        0,
        0,
        0.3072
      ],
      mass: 0.3789,
      com: [
        -0.01995,
        1e-5,
        -0.03002
      ],
      fullinertia: [
        9964e-7,
        9644e-7,
        428e-6,
        -7692e-11,
        -1714e-7,
        -6629e-11
      ]
    },
    R_foot: {
      pos: [
        0,
        -0.0352,
        0.0337
      ],
      mass: 0.0283,
      com: [
        -1e-5,
        0,
        -0.02575
      ],
      fullinertia: [
        1016e-8,
        227e-7,
        2851e-8,
        0,
        432e-11,
        0
      ]
    },
    R_ankle_frame: {
      pos: [
        0,
        -0.0352,
        0.0577
      ],
      mass: 0.1051,
      com: [
        104e-5,
        -45e-5,
        -0.01106
      ],
      fullinertia: [
        3418e-8,
        3532e-8,
        3016e-8,
        -2777e-11,
        -8189e-10,
        -433e-10
      ]
    },
    R_shin: {
      pos: [
        0,
        -0.0352,
        0.1177
      ],
      mass: 0.0161,
      com: [
        831e-5,
        0,
        -0.03069
      ],
      fullinertia: [
        8745e-9,
        9583e-9,
        4653e-9,
        -8714e-13,
        5899e-10,
        2485e-13
      ]
    },
    R_knee_frame: {
      pos: [
        0,
        -0.0352,
        0.1332
      ],
      mass: 0.01,
      com: [
        0.01528,
        -4e-5,
        -775e-5
      ],
      fullinertia: [
        1938e-9,
        248e-8,
        2265e-9,
        0,
        0,
        0
      ]
    },
    R_thigh: {
      pos: [
        0,
        -0.0352,
        0.1932
      ],
      mass: 0.0161,
      com: [
        831e-5,
        0,
        -0.02937
      ],
      fullinertia: [
        8737e-9,
        9575e-9,
        4653e-9,
        -8714e-13,
        -5742e-10,
        -2419e-13
      ]
    },
    R_hip: {
      pos: [
        0,
        -0.0352,
        0.2172
      ],
      mass: 0.1051,
      com: [
        108e-5,
        41e-5,
        -0.01294
      ],
      fullinertia: [
        3424e-8,
        3525e-8,
        3015e-8,
        2529e-11,
        8153e-10,
        -3961e-11
      ]
    },
    R_shoulder: {
      pos: [
        0,
        -0.07058,
        0.32594
      ],
      mass: 0.098,
      com: [
        -44e-5,
        -264e-5,
        -0.01172
      ],
      fullinertia: [
        3169e-8,
        3147e-8,
        2781e-8,
        0,
        0,
        -1059e-9
      ]
    },
    R_arm: {
      pos: [
        0,
        -0.0768,
        0.30275
      ],
      mass: 0.0342,
      com: [
        0.01407,
        -0.01889,
        -0.06668
      ],
      fullinertia: [
        5275e-8,
        5966e-8,
        1744e-8,
        3126e-9,
        1176e-8,
        -1236e-8
      ]
    },
    L_foot: {
      pos: [
        0,
        0.0352,
        0.0337
      ],
      mass: 0.0283,
      com: [
        -1e-5,
        0,
        -0.02575
      ],
      fullinertia: [
        1016e-8,
        227e-7,
        2851e-8,
        0,
        432e-11,
        0
      ]
    },
    L_ankle_frame: {
      pos: [
        0,
        0.0352,
        0.0577
      ],
      mass: 0.1051,
      com: [
        104e-5,
        45e-5,
        -0.01106
      ],
      fullinertia: [
        3418e-8,
        3532e-8,
        3016e-8,
        2777e-11,
        -8189e-10,
        433e-10
      ]
    },
    L_shin: {
      pos: [
        0,
        0.0352,
        0.1177
      ],
      mass: 0.0161,
      com: [
        831e-5,
        -0,
        -0.03069
      ],
      fullinertia: [
        8745e-9,
        9583e-9,
        4653e-9,
        8714e-13,
        5899e-10,
        -2485e-13
      ]
    },
    L_knee_frame: {
      pos: [
        0,
        0.0352,
        0.1332
      ],
      mass: 0.01,
      com: [
        0.01528,
        4e-5,
        -775e-5
      ],
      fullinertia: [
        1938e-9,
        248e-8,
        2265e-9,
        0,
        0,
        0
      ]
    },
    L_thigh: {
      pos: [
        0,
        0.0352,
        0.1932
      ],
      mass: 0.0161,
      com: [
        831e-5,
        -0,
        -0.02937
      ],
      fullinertia: [
        8737e-9,
        9575e-9,
        4653e-9,
        8714e-13,
        -5742e-10,
        2419e-13
      ]
    },
    L_hip: {
      pos: [
        0,
        0.0352,
        0.2172
      ],
      mass: 0.1051,
      com: [
        108e-5,
        -41e-5,
        -0.01294
      ],
      fullinertia: [
        3424e-8,
        3525e-8,
        3015e-8,
        -2529e-11,
        8153e-10,
        3961e-11
      ]
    },
    L_shoulder: {
      pos: [
        0,
        0.07058,
        0.32594
      ],
      mass: 0.098,
      com: [
        -44e-5,
        264e-5,
        -0.01172
      ],
      fullinertia: [
        3169e-8,
        3147e-8,
        2781e-8,
        0,
        0,
        1059e-9
      ]
    },
    L_arm: {
      pos: [
        0,
        0.0768,
        0.30275
      ],
      mass: 0.0342,
      com: [
        0.01407,
        0.01889,
        -0.06668
      ],
      fullinertia: [
        5275e-8,
        5966e-8,
        1744e-8,
        -3126e-9,
        1176e-8,
        1236e-8
      ]
    }
  },
  joints: {
    R_shoulder_pitch: {
      pos: [
        0,
        -0.07058,
        0.32594
      ],
      axis: [
        0,
        -0.9659,
        0.2588
      ]
    },
    R_shoulder_roll: {
      pos: [
        0,
        -0.0768,
        0.30275
      ],
      axis: [
        1,
        0,
        0
      ]
    },
    R_hip_roll: {
      pos: [
        0,
        -0.0352,
        0.2172
      ],
      axis: [
        1,
        0,
        0
      ]
    },
    R_hip_pitch: {
      pos: [
        0,
        -0.0352,
        0.1932
      ],
      axis: [
        0,
        1,
        0
      ]
    },
    R_knee_hi: {
      pos: [
        0,
        -0.0352,
        0.1332
      ],
      axis: [
        0,
        1,
        0
      ]
    },
    R_knee_lo: {
      pos: [
        0,
        -0.0352,
        0.1177
      ],
      axis: [
        0,
        1,
        0
      ]
    },
    R_ankle_pitch: {
      pos: [
        0,
        -0.0352,
        0.0577
      ],
      axis: [
        0,
        1,
        0
      ]
    },
    R_ankle_roll: {
      pos: [
        0,
        -0.0352,
        0.0337
      ],
      axis: [
        1,
        0,
        0
      ]
    }
  },
  visual: [
    {
      part: "EF25-F4",
      color: "frame",
      body: "torso",
      m: [
        0,
        0,
        1,
        0,
        1,
        0,
        0,
        2e-5,
        0,
        1,
        0,
        -0.04506,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F3",
      color: "frame",
      body: "torso",
      m: [
        0,
        0,
        1,
        0,
        1,
        0,
        0,
        3e-5,
        0,
        1,
        0,
        -0.04272,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F2",
      color: "frame",
      body: "torso",
      m: [
        -0,
        0,
        -1,
        309e-5,
        -1,
        0,
        -0,
        5e-5,
        -0,
        1,
        -0,
        4e-5,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F2",
      color: "frame",
      body: "torso",
      m: [
        -0,
        -0,
        1,
        -309e-5,
        -1,
        -0,
        0,
        5e-5,
        -0,
        -1,
        0,
        -4e-5,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F28",
      color: "cover",
      body: "torso",
      m: [
        0,
        0,
        1,
        -247e-5,
        1,
        0,
        0,
        1e-5,
        0,
        1,
        0,
        -263e-5,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "XL-320",
      color: "servo",
      body: "torso",
      m: [
        -0,
        -0,
        1,
        -3e-5,
        -1,
        -0,
        0,
        0,
        -0,
        -1,
        0,
        0.0433,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F26",
      color: "frame",
      body: "torso",
      m: [
        0,
        0,
        1,
        -0.02446,
        1,
        0,
        0,
        1e-5,
        0,
        1,
        0,
        -0.08203,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F27",
      color: "servo",
      body: "torso",
      m: [
        -0,
        0,
        -1,
        -0.04331,
        -1,
        0,
        -0,
        0,
        -0,
        1,
        -0,
        -0.082,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "CM-550",
      color: "servo",
      body: "torso",
      m: [
        0,
        -0,
        -1,
        -0.03751,
        1,
        -0,
        -0,
        0,
        0,
        -1,
        -0,
        38e-5,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F1",
      color: "frame",
      body: "torso",
      m: [
        0,
        0,
        1,
        -0.01742,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0.05076,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F15",
      color: "sole",
      body: "R_foot",
      m: [
        0,
        0,
        1,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        -0.02958,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F14",
      color: "frame",
      body: "R_foot",
      m: [
        -0,
        -0,
        1,
        -5e-5,
        -1,
        -0,
        0,
        0,
        -0,
        -1,
        0,
        -0.01076,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "2XL-430",
      color: "servo",
      body: "R_ankle_frame",
      m: [
        1,
        0,
        -0,
        44e-5,
        0,
        0,
        -1,
        -48e-5,
        0,
        1,
        -0,
        -0.012,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F9",
      color: "frame",
      body: "R_ankle_frame",
      m: [
        0,
        -0,
        -1,
        933e-5,
        1,
        -0,
        -0,
        -1e-5,
        0,
        -1,
        -0,
        186e-5,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F12",
      color: "frame",
      body: "R_shin",
      m: [
        0,
        -0,
        -1,
        0,
        1,
        -0,
        -0,
        0,
        0,
        -1,
        -0,
        -0.02832,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F11",
      color: "frame",
      body: "R_shin",
      pivotBody: "R_knee_frame",
      pivot: [
        0.0265,
        0,
        -0.0205
      ],
      m: [
        0,
        0,
        1,
        -276e-5,
        1,
        0,
        0,
        1e-5,
        0,
        1,
        0,
        -0.03009,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F10",
      color: "frame",
      body: "R_knee_frame",
      m: [
        0,
        0,
        1,
        0.01528,
        1,
        0,
        0,
        -4e-5,
        0,
        1,
        0,
        -775e-5,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F12",
      color: "frame",
      body: "R_thigh",
      m: [
        0,
        0,
        1,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        -0.03168,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F11",
      color: "frame",
      body: "R_thigh",
      pivotBody: "R_hip",
      pivot: [
        0.0265,
        0,
        -0.019
      ],
      m: [
        0,
        0,
        1,
        -276e-5,
        1,
        0,
        0,
        1e-5,
        0,
        1,
        0,
        -0.03009,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "2XL-430",
      color: "servo",
      body: "R_hip",
      m: [
        0,
        0,
        1,
        48e-5,
        1,
        0,
        0,
        44e-5,
        0,
        1,
        0,
        -0.012,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F9",
      color: "frame",
      body: "R_hip",
      m: [
        -0,
        0,
        -1,
        933e-5,
        -1,
        0,
        -0,
        1e-5,
        -0,
        1,
        -0,
        -0.02586,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F14",
      color: "frame",
      body: "torso",
      m: [
        0,
        0,
        1,
        -5e-5,
        1,
        0,
        0,
        -0.0352,
        0,
        1,
        0,
        -0.07924,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "2XL-430",
      color: "servo",
      body: "R_shoulder",
      m: [
        -1,
        -0,
        -0,
        -44e-5,
        -0,
        0.258819,
        0.965926,
        -2642e-6,
        -0,
        0.965926,
        -0.258819,
        -0.011715,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F14",
      color: "frame",
      body: "R_arm",
      m: [
        0,
        0,
        1,
        -5e-5,
        -0.965926,
        -0.258819,
        0,
        -2785e-6,
        0.258819,
        -0.965926,
        0,
        -0.010393,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F5",
      color: "frame",
      body: "R_arm",
      m: [
        0,
        -0,
        1,
        989e-5,
        0.965926,
        0.258819,
        0,
        -0.018632,
        -0.258819,
        0.965926,
        0,
        -0.063895,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F7",
      color: "frame",
      body: "R_arm",
      m: [
        0,
        -0,
        1,
        0.03242,
        0.965926,
        0.258819,
        0,
        -0.029894,
        -0.258819,
        0.965926,
        0,
        -0.109287,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F15",
      color: "sole",
      body: "L_foot",
      m: [
        0,
        0,
        1,
        0,
        -1,
        0,
        0,
        0,
        0,
        1,
        0,
        -0.02958,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F14",
      color: "frame",
      body: "L_foot",
      m: [
        0,
        0,
        1,
        -5e-5,
        1,
        0,
        0,
        0,
        0,
        -1,
        0,
        -0.01076,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "2XL-430",
      color: "servo",
      body: "L_ankle_frame",
      m: [
        1,
        0,
        0,
        44e-5,
        0,
        0,
        1,
        48e-5,
        0,
        1,
        0,
        -0.012,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F9",
      color: "frame",
      body: "L_ankle_frame",
      m: [
        0,
        0,
        -1,
        933e-5,
        -1,
        0,
        0,
        1e-5,
        0,
        -1,
        0,
        186e-5,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F12",
      color: "frame",
      body: "L_shin",
      m: [
        0,
        0,
        -1,
        0,
        -1,
        0,
        0,
        0,
        0,
        -1,
        0,
        -0.02832,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F11",
      color: "frame",
      body: "L_shin",
      pivotBody: "L_knee_frame",
      pivot: [
        0.0265,
        0,
        -0.0205
      ],
      m: [
        0,
        0,
        1,
        -276e-5,
        -1,
        0,
        0,
        -1e-5,
        0,
        1,
        0,
        -0.03009,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F10",
      color: "frame",
      body: "L_knee_frame",
      m: [
        0,
        0,
        1,
        0.01528,
        -1,
        0,
        0,
        4e-5,
        0,
        1,
        0,
        -775e-5,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F12",
      color: "frame",
      body: "L_thigh",
      m: [
        0,
        0,
        1,
        0,
        -1,
        0,
        0,
        0,
        0,
        1,
        0,
        -0.03168,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F11",
      color: "frame",
      body: "L_thigh",
      pivotBody: "L_hip",
      pivot: [
        0.0265,
        0,
        -0.019
      ],
      m: [
        0,
        0,
        1,
        -276e-5,
        -1,
        0,
        0,
        -1e-5,
        0,
        1,
        0,
        -0.03009,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "2XL-430",
      color: "servo",
      body: "L_hip",
      m: [
        0,
        0,
        1,
        48e-5,
        -1,
        0,
        0,
        -44e-5,
        0,
        1,
        0,
        -0.012,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F9",
      color: "frame",
      body: "L_hip",
      m: [
        0,
        0,
        -1,
        933e-5,
        1,
        0,
        0,
        -1e-5,
        0,
        1,
        0,
        -0.02586,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F14",
      color: "frame",
      body: "torso",
      m: [
        0,
        0,
        1,
        -5e-5,
        -1,
        0,
        0,
        0.0352,
        0,
        1,
        0,
        -0.07924,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "2XL-430",
      color: "servo",
      body: "L_shoulder",
      m: [
        -1,
        0,
        0,
        -44e-5,
        0,
        -0.258819,
        -0.965926,
        2642e-6,
        0,
        0.965926,
        -0.258819,
        -0.011715,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F14",
      color: "frame",
      body: "L_arm",
      m: [
        0,
        0,
        1,
        -5e-5,
        0.965926,
        0.258819,
        0,
        2785e-6,
        0.258819,
        -0.965926,
        0,
        -0.010393,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F5",
      color: "frame",
      body: "L_arm",
      m: [
        0,
        0,
        1,
        989e-5,
        -0.965926,
        -0.258819,
        0,
        0.018632,
        -0.258819,
        0.965926,
        0,
        -0.063895,
        0,
        0,
        0,
        1
      ]
    },
    {
      part: "EF25-F7",
      color: "frame",
      body: "L_arm",
      m: [
        0,
        0,
        1,
        0.03242,
        -0.965926,
        -0.258819,
        0,
        0.029894,
        -0.258819,
        0.965926,
        0,
        -0.109287,
        0,
        0,
        0,
        1
      ]
    }
  ]
};

// src/sim3d/maxe1-model.js
var MODEL_VERSION = 4;
var MAXE1_DEFAULT = {
  extraMass: 0,
  // kg added to the torso (e.g. a sensor you mounted)
  // 2XL430-W250 as a position servo
  kp: 6,
  maxTorque: 1.4,
  damping: 0.06,
  armature: 6e-3,
  friction: 1
};
var MAXE1_JOINT_MAP = [
  { id: 1, joint: "R_shoulder_pitch", name: "오른팔 앞뒤", sign: -1, center: 180 },
  { id: 2, joint: "R_shoulder_roll", name: "오른팔 옆", sign: -1, center: 180 },
  { id: 3, joint: "L_shoulder_pitch", name: "왼팔 앞뒤", sign: 1, center: 180 },
  { id: 4, joint: "L_shoulder_roll", name: "왼팔 옆", sign: 1, center: 180 },
  { id: 5, joint: "R_hip_roll", name: "오른쪽 엉덩이 옆", sign: -1, center: 180 },
  { id: 6, joint: "R_hip_pitch", name: "오른쪽 엉덩이 앞뒤", sign: 1, center: 180 },
  { id: 7, joint: "L_hip_roll", name: "왼쪽 엉덩이 옆", sign: -1, center: 180 },
  { id: 8, joint: "L_hip_pitch", name: "왼쪽 엉덩이 앞뒤", sign: 1, center: 180 },
  { id: 9, joint: "R_knee", name: "오른쪽 발목 앞뒤 (무릎 굽힘)", sign: -1, center: 180 },
  { id: 10, joint: "R_ankle_roll", name: "오른쪽 발목 옆", sign: 1, center: 180 },
  { id: 11, joint: "L_knee", name: "왼쪽 발목 앞뒤 (무릎 굽힘)", sign: -1, center: 180 },
  { id: 12, joint: "L_ankle_roll", name: "왼쪽 발목 옆", sign: 1, center: 180 }
];
var ACTUATED = MAXE1_JOINT_MAP.map((j) => j.joint);
var f = (v) => Number(v.toFixed(5));
var v3 = (x, y, z) => `${f(x)} ${f(y)} ${f(z)}`;
var B = maxe1_cad_default.bodies;
var rel = (child, parent) => B[child].pos.map((v, i) => v - B[parent].pos[i]);
var inertial = (name, extra = 0) => {
  const b = B[name];
  return `<inertial pos="${v3(...b.com)}" mass="${f(b.mass + extra)}" fullinertia="${b.fullinertia.join(" ")}"/>`;
};
var buildMJCF = (params = {}) => {
  const p = Object.assign({}, MAXE1_DEFAULT, params);
  const D = maxe1_cad_default.dims;
  const ja = `damping="${p.damping}" armature="${p.armature}"`;
  const dark = 'rgba="0.15 0.15 0.17 1"';
  const frame = 'rgba="0.3 0.32 0.36 1"';
  const leg = (s) => `
      <body name="${s}_hip" pos="${v3(...rel(`${s}_hip`, "torso"))}">
        <joint name="${s}_hip_roll" axis="1 0 0" range="-0.6 0.6" ${ja}/>
        ${inertial(`${s}_hip`)}
        <geom type="box" size="0.0205 0.0205 0.0235" pos="0 0 -0.012" ${dark}/>
        <body name="${s}_thigh" pos="${v3(...rel(`${s}_thigh`, `${s}_hip`))}">
          <joint name="${s}_hip_pitch" axis="0 1 0" range="-1.6 1.6" ${ja}/>
          ${inertial(`${s}_thigh`)}
          <geom type="capsule" fromto="0 0 0 0 0 -0.06" size="0.011" ${frame}/>
          <body name="${s}_knee_frame" pos="${v3(...rel(`${s}_knee_frame`, `${s}_thigh`))}">
            <joint name="${s}_knee_comp" axis="0 1 0" range="-1.7 1.7" damping="0.005"/>
            ${inertial(`${s}_knee_frame`)}
            <geom type="box" size="0.016 0.018 0.016" pos="0.012 0 -0.008" ${frame}/>
            <body name="${s}_shin" pos="${v3(...rel(`${s}_shin`, `${s}_knee_frame`))}">
              <joint name="${s}_knee" axis="0 1 0" range="-1.6 1.6" ${ja}/>
              ${inertial(`${s}_shin`)}
              <geom type="capsule" fromto="0 0 0 0 0 -0.06" size="0.011" ${frame}/>
              <body name="${s}_ankle_frame" pos="${v3(...rel(`${s}_ankle_frame`, `${s}_shin`))}">
                <joint name="${s}_ankle_comp" axis="0 1 0" range="-1.7 1.7" damping="0.005"/>
                ${inertial(`${s}_ankle_frame`)}
                <geom type="box" size="0.0205 0.0205 0.0235" pos="0 0 -0.012" ${dark}/>
                <body name="${s}_foot" pos="${v3(...rel(`${s}_foot`, `${s}_ankle_frame`))}">
                  <joint name="${s}_ankle_roll" axis="1 0 0" range="-0.6 0.6" ${ja}/>
                  ${inertial(`${s}_foot`)}
                  <geom name="${s}_sole" type="box" size="${v3(D.sole[0] / 2, D.sole[1] / 2, D.sole[2] / 2)}"
                        pos="${v3(0, 0, -D.ankleRoll + D.sole[2] / 2)}" rgba="0.18 0.42 0.75 1" friction="${p.friction} 0.02 0.002"/>
                  <site name="${s}_foot_site" pos="${v3(0, 0, -D.ankleRoll)}" size="0.004"/>
                </body>
              </body>
            </body>
          </body>
        </body>
      </body>`;
  const arm = (s, out) => {
    const t = D.shoulderTilt * Math.PI / 180;
    const axis = v3(0, Math.cos(t), out * Math.sin(t));
    const dir = [0, out * Math.sin(t), -Math.cos(t)];
    const L = D.armLength;
    return `
      <body name="${s}_shoulder" pos="${v3(...rel(`${s}_shoulder`, "torso"))}">
        <joint name="${s}_shoulder_pitch" axis="${axis}" range="-3.1 3.1" ${ja}/>
        ${inertial(`${s}_shoulder`)}
        <geom type="box" size="0.0205 0.0205 0.0235" ${dark}/>
        <body name="${s}_arm" pos="${v3(...rel(`${s}_arm`, `${s}_shoulder`))}">
          <joint name="${s}_shoulder_roll" axis="1 0 0" range="-1.7 1.7" ${ja}/>
          ${inertial(`${s}_arm`)}
          <geom type="capsule" fromto="0 0 0 ${v3(dir[0] * L, dir[1] * L, dir[2] * L)}" size="0.013" ${frame}/>
        </body>
      </body>`;
  };
  const eq = (s) => `
    <joint joint1="${s}_knee_comp" joint2="${s}_hip_pitch" polycoef="0 -1 0 0 0" solref="0.004 1"/>
    <joint joint1="${s}_ankle_comp" joint2="${s}_knee" polycoef="0 -1 0 0 0" solref="0.004 1"/>`;
  const act = (j) => `
    <position name="${j}" joint="${j}" kp="${p.kp}" forcerange="${-p.maxTorque} ${p.maxTorque}" ctrlrange="-3.14 3.14"/>`;
  const box = D.box;
  const zc = B.torso.pos[2];
  return `<mujoco model="MAX-E1 (ROBOTIS STEP parts)">
  <compiler angle="radian" autolimits="true"/>
  <option timestep="0.002" integrator="implicitfast"/>
  <default>
    <geom contype="1" conaffinity="0" condim="3" friction="${p.friction} 0.02 0.002"/>
  </default>
  <visual><global offwidth="640" offheight="480"/></visual>
  <worldbody>
    <light pos="0 0 2" dir="0 0 -1" directional="true"/>
    <geom name="floor" type="plane" size="3 3 0.05" contype="0" conaffinity="1" rgba="0.9 0.92 0.95 1"/>
    <body name="torso" pos="0 0 ${f(zc)}">
      <freejoint name="root"/>
      ${inertial("torso", p.extraMass)}
      <geom name="torso" type="box" size="${v3(box[0] / 2, box[1] / 2, box[2] / 2)}" rgba="0.18 0.42 0.75 1"/>
      <geom name="pelvis" type="box" size="0.022 0.047 0.022" pos="0 0 ${f(-0.0436)}" ${frame}/>
      <geom name="battery" type="box" size="0.0163 0.045 0.024" pos="${v3(-0.0433, 0, B.R_hip.pos[2] + 8e-3 - zc)}" ${dark}/>
      <geom name="head" type="box" size="0.021 0.017 0.023" pos="0 0 ${f(box[2] / 2 + 0.023)}" rgba="0.95 0.95 0.97 1"/>
      <site name="imu" pos="0 0 0" size="0.005"/>${arm("R", -1)}${arm("L", 1)}${leg("R")}${leg("L")}
    </body>
  </worldbody>
  <equality>${eq("R")}${eq("L")}
  </equality>
  <actuator>${ACTUATED.map(act).join("")}
  </actuator>
  <sensor>
    <framequat name="imu_quat" objtype="site" objname="imu"/>
    <gyro name="imu_gyro" site="imu"/>
    <accelerometer name="imu_acc" site="imu"/>
  </sensor>
</mujoco>
`;
};

// src/sim3d/learn.js
var REWARDS = [
  { key: "forward", name: "앞으로 간 거리 (m당)", def: 100 },
  { key: "side", name: "옆으로 벗어남 (m당 감점)", def: 30 },
  { key: "alive", name: "넘어지지 않고 버틴 시간 (초당)", def: 10 },
  { key: "fall", name: "넘어짐 (감점)", def: 30 },
  { key: "energy", name: "힘을 많이 씀 (감점)", def: 0 }
];
var defaultRewards = () => Object.fromEntries(REWARDS.map((r) => [r.key, r.def]));
var score = (r, w) => w.forward * r.dx * (r.alive / r.secs) - w.side * Math.abs(r.dy) + w.alive * r.alive - (r.fell ? w.fall : 0) - w.energy * r.energy * 0.01;
var rng = (seed) => {
  let s = seed >>> 0;
  const u = () => {
    s = s + 1831565813 >>> 0;
    let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
};
var GaitLearner = class {
  /**
   * @param {object} o
   * @param {object} o.sim PhysicsSim
   * @param {object} o.ranges {key: {min, max, fixed, value}}
   * @param {object} o.weights reward weights
   * @param {number} [o.population]
   * @param {number} [o.generations]
   * @param {number} [o.seconds] length of each try
   * @param {number} [o.seed]
   * @param {function} [o.evalBatch] async (gaits, seconds) → results (or null to stop): 동시 경주 —
   *     a whole generation walks together instead of one try after another
   */
  constructor({ sim, ranges, weights, population = 20, generations = 30, seconds = 5, seed = 1, evalBatch = null }) {
    Object.assign(this, { sim, ranges, weights, population, generations, seconds, evalBatch });
    this.normal = rng(seed);
    this.keys = GAIT_PARAMS.map((p) => p.key);
    this.free = this.keys.filter((k) => !ranges[k].fixed);
    this.mu = {};
    this.sd = {};
    for (const k of this.keys) {
      const r = ranges[k];
      this.mu[k] = r.fixed ? r.value : r.value !== void 0 ? r.value : (r.min + r.max) / 2;
      this.sd[k] = (r.max - r.min) / 3;
    }
    this.history = [];
    this.best = null;
    this.gen = 0;
    this.tries = 0;
    this.running = false;
  }
  _sample() {
    const g = {};
    for (const k of this.keys) {
      const r = this.ranges[k];
      g[k] = r.fixed ? r.value : Math.min(r.max, Math.max(r.min, this.mu[k] + this.sd[k] * this.normal()));
    }
    return g;
  }
  /** Run until done or stop(); `onProgress` after every try. */
  async run(onProgress) {
    this.running = true;
    const elite = Math.max(2, Math.round(this.population / 4));
    while (this.running && this.gen < this.generations) {
      const crowd = [];
      if (this.evalBatch) {
        const gaits = Array.from({ length: this.population }, () => this._sample());
        this.genGaits = gaits;
        const results = await this.evalBatch(gaits, this.seconds, this);
        if (!results) break;
        gaits.forEach((gait, i) => {
          const result = results[i];
          const s = score(result, this.weights);
          crowd.push({ gait, score: s, result, lane: i });
          this.tries++;
          if (!this.best || s > this.best.score) this.best = { gait, score: s, result };
        });
        if (onProgress) onProgress(this);
      }
      for (let i = 0; !this.evalBatch && i < this.population && this.running; i++) {
        const gait = this._sample();
        const result = this.sim.evaluate(gait, this.seconds);
        const s = score(result, this.weights);
        crowd.push({ gait, score: s, result });
        this.tries++;
        if (!this.best || s > this.best.score) this.best = { gait, score: s, result };
        if (onProgress) onProgress(this);
        await new Promise((r) => setTimeout(r, 0));
      }
      if (!this.running || crowd.length < elite) break;
      crowd.sort((a, b) => b.score - a.score);
      const top = crowd.slice(0, elite);
      for (const k of this.free) {
        const r = this.ranges[k];
        const vals = top.map((c) => c.gait[k]);
        const m = vals.reduce((a, b) => a + b, 0) / vals.length;
        const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length);
        this.mu[k] = m;
        this.sd[k] = Math.max(sd, 0.04 * (r.max - r.min));
      }
      this.genBest = top[0];
      this.genCrowd = crowd;
      this.history.push({
        gen: this.gen,
        best: top[0].score,
        mean: crowd.reduce((a, c) => a + c.score, 0) / crowd.length,
        bestEver: this.best.score
      });
      this.gen++;
      if (onProgress) onProgress(this);
    }
    this.running = false;
    if (onProgress) onProgress(this);
    return this.best;
  }
  stop() {
    this.running = false;
  }
};

// src/sim3d/motion-check.js
var { DXL: DXL2, CM } = require_cm550();
var DEG2 = 180 / Math.PI;
var tickToDeg = (t) => t / 4096 * 360;
var MotionRecorder = class {
  constructor({ device, getJointMap }) {
    this.device = device;
    this.getJointMap = getJointMap;
    this.running = false;
  }
  /**
   * @param {number} page motion page stored in the CM-550
   * @param {object} [o]
   * @param {number} [o.maxSeconds] stop recording after this long
   * @param {Function} [o.onFrame] (frame, rec) after each sample
   * @returns {Promise<{page, ids, frames: Array<{t, deg: Object<number, number>}>, seconds, syncRead}>}
   */
  async record(page, { maxSeconds = 20, onFrame } = {}) {
    const dev = this.device;
    if (!dev.connected) throw new Error("먼저 로봇을 연결하세요.");
    const ids = this.getJointMap().map((j) => j.id);
    const rec = { page, ids, frames: [], seconds: 0, syncRead: false };
    const sample = async (t02) => {
      const pos = await dev.syncReadDXL(DXL2.PRESENT_POSITION, ids);
      const deg2 = {};
      for (const id of ids) deg2[id] = Math.round(tickToDeg(pos.get(id)) * 10) / 10;
      const frame = { t: Math.round(performance.now() - t02) / 1e3, deg: deg2 };
      rec.frames.push(frame);
      if (onFrame) onFrame(frame, rec);
    };
    this.running = true;
    const t0 = performance.now();
    await sample(t0);
    await dev.playMotion(page);
    let idle = 0;
    try {
      while (this.running) {
        await sample(t0);
        const playing = await dev.readCM(CM.MOTION_STATUS);
        const t = (performance.now() - t0) / 1e3;
        if (!playing && t > 0.4) idle++;
        if (idle >= 3 || t > maxSeconds) break;
      }
      if (!this.running) await dev.stopMotion();
    } finally {
      this.running = false;
    }
    rec.seconds = rec.frames.length ? rec.frames[rec.frames.length - 1].t : 0;
    rec.syncRead = Boolean(dev.syncReadWorks);
    return rec;
  }
  stop() {
    this.running = false;
  }
};
var summarize = (rec, jointMap) => jointMap.map((j) => {
  const v = rec.frames.map((f2) => f2.deg[j.id]).filter((x) => typeof x === "number");
  const min = Math.min(...v);
  const max = Math.max(...v);
  return { id: j.id, name: j.name, joint: j.joint, start: v[0], min, max, range: max - min };
});
var poseAt = (rec, t) => {
  const f2 = rec.frames;
  if (!f2.length) return {};
  if (t <= f2[0].t) return f2[0].deg;
  for (let i = 1; i < f2.length; i++) {
    if (f2[i].t >= t) {
      const a = f2[i - 1];
      const b = f2[i];
      const k = (t - a.t) / Math.max(1e-6, b.t - a.t);
      const out = {};
      for (const id of Object.keys(b.deg)) out[id] = a.deg[id] + (b.deg[id] - a.deg[id]) * k;
      return out;
    }
  }
  return f2[f2.length - 1].deg;
};
var toJointRad = (deg2, jointMap) => {
  const out = {};
  for (const j of jointMap) {
    if (typeof deg2[j.id] === "number") out[j.joint] = j.sign * (deg2[j.id] - j.center) / DEG2;
  }
  return out;
};
var keyPoses = (rec, step = 0.12) => {
  const end = rec.seconds;
  const out = [];
  let prev = 0;
  for (let t = step; t < end + step / 2; t += step) {
    const tt = Math.min(t, end);
    const deg2 = poseAt(rec, tt);
    out.push({
      secs: Math.round((tt - prev) * 1e3) / 1e3,
      joints: rec.ids.map((id) => ({ id, deg: Math.round(deg2[id] * 10) / 10 }))
    });
    prev = tt;
  }
  return out;
};

// src/sim3d/gait-blocks.js
var FRAMES = 8;
var VAR_ID = "dm-walk-slow";
var VAR_NAME = "느리게";
var esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var r1 = (v) => Math.round(v * 10) / 10;
var toDegrees = (targets, jointMap) => jointMap.map((j) => ({
  id: j.id,
  joint: j.joint,
  name: j.name,
  deg: r1(j.center + j.sign * (targets[j.joint] || 0) * 180 / Math.PI)
})).sort((a, b) => a.id - b.id);
var stanceTargets = (g) => {
  const out = {};
  for (const s of ["R", "L"]) {
    out[`${s}_hip_pitch`] = -g.height;
    out[`${s}_knee`] = g.height;
  }
  return out;
};
var stepFrames = (g, frames = FRAMES, k = 1) => Array.from(
  { length: frames },
  (_, i) => gaitTargets(g, (i + 1) * g.period / frames, k)
);
var num2 = (v) => `<shadow type="math_number"><field name="NUM">${v}</field></shadow>`;
var slowVar = `<block type="data_variable"><field name="VARIABLE" id="${VAR_ID}" variabletype="">${VAR_NAME}</field></block>`;
var timesSlow = (secs) => `<block type="operator_multiply"><value name="NUM1">${num2(secs)}</value><value name="NUM2">${num2(1)}${slowVar}</value></block>`;
var comment = (text2) => `<comment pinned="false" h="70" w="260">${esc(text2)}</comment>`;
var goals = (joints) => joints.reduceRight((next, j) => `<block type="cm550_dxlGoal"><value name="ID"><shadow type="cm550_menu_dxlId"><field name="dxlId">${j.id}</field></shadow></value><value name="DEG">${num2(j.deg)}</value>${next ? `<next>${next}</next>` : ""}</block>`, "");
var group = (joints, secsXML, note, next) => `<block type="cm550_dxlTogether">${note ? comment(note) : ""}<value name="SECS">${num2(1)}${secsXML}</value><statement name="SUBSTACK">${goals(joints)}</statement>${next ? `<next>${next}</next>` : ""}</block>`;
var gaitProgramXML = (g, jointMap, { steps = 20, x = 40, y = 40 } = {}) => {
  const dt = Math.round(g.period / FRAMES * 1e3) / 1e3;
  const stance = toDegrees(stanceTargets(g), jointMap);
  const straight = toDegrees({}, jointMap);
  const frames = stepFrames(g).map((t) => toDegrees(t, jointMap));
  let loop = "";
  for (let i = frames.length - 1; i >= 0; i--) {
    loop = group(frames[i], timesSlow(dt), i === 0 ? `한 걸음(${g.period.toFixed(3)}초)을 자세 ${FRAMES}개로 나눴습니다. 자세마다 모터 ${jointMap.length}개의 목표 각도를 ${dt}초 × 느리게 동안 함께 움직입니다.` : "", loop);
  }
  const small = stepFrames(g, FRAMES, 0.5).map((t) => toDegrees(t, jointMap));
  const chain = (list, note, next) => list.reduceRight((acc, joints, i) => group(joints, timesSlow(dt), i === 0 ? note : "", acc), next);
  const repeat = `<block type="control_repeat">${comment(`걸음 학습으로 찾은 걸음 · ${steps}걸음`)}<value name="TIMES"><shadow type="math_whole_number"><field name="NUM">${steps}</field></shadow></value><statement name="SUBSTACK">${loop}</statement><next>${group(stance, timesSlow(0.5), "", group(straight, "", "똑바로 서기"))}</next></block>`;
  const setSlow = `<block type="data_setvariableto">` + comment("실제 로봇은 1.5~2로 키워 천천히 시작하세요 (모든 시간에 곱해집니다).") + `<field name="VARIABLE" id="${VAR_ID}" variabletype="">${VAR_NAME}</field><value name="VALUE"><shadow type="text"><field name="TEXT">1</field></shadow></value><next><block type="cm550_dxlPrepare">` + comment("걸음 학습과 같은 조건에서 시작: 오류가 난 모터는 다시 시작하고, 토크를 한 번에 켠 뒤 모두 180°(바로 서기)로.") + `<value name="SECS">${num2(2)}</value><next>${group(
    stance,
    timesSlow(1),
    "무릎을 굽힌 출발 자세",
    chain(small, "출발: 절반 크기로 한 걸음 (갑자기 크게 걸으면 넘어지기 쉽습니다)", repeat)
  )}</next></block></next></block>`;
  const xml = `<xml><variables><variable type="" id="${VAR_ID}" islocal="false" iscloud="false">${VAR_NAME}</variable></variables><block type="event_whenflagclicked" x="${Math.round(x)}" y="${Math.round(y)}"><next>${setSlow}</next></block></xml>`;
  return { xml, frames: FRAMES, dt, steps, blocks: (2 * frames.length + 3) * (jointMap.length + 1) };
};
var posesProgramXML = (poses, { x = 40, y = 40, title = "" } = {}) => {
  const chain = poses.reduceRight((acc, p, i) => group(p.joints, timesSlow(p.secs), i === 0 ? title : "", acc), "");
  const setSlow = `<block type="data_setvariableto">` + comment("실제 로봇에서 처음에는 1.5~2로 키워 천천히 확인하세요 (모든 시간에 곱해집니다).") + `<field name="VARIABLE" id="${VAR_ID}" variabletype="">${VAR_NAME}</field><value name="VALUE"><shadow type="text"><field name="TEXT">1</field></shadow></value><next><block type="cm550_dxlPrepare"><value name="SECS">${num2(2)}</value>${chain ? `<next>${chain}</next>` : ""}</block></next></block>`;
  const xml = `<xml><variables><variable type="" id="${VAR_ID}" islocal="false" iscloud="false">${VAR_NAME}</variable></variables><block type="event_whenflagclicked" x="${Math.round(x)}" y="${Math.round(y)}"><next>${setSlow}</next></block></xml>`;
  return { xml, poses: poses.length };
};

// src/sim3d/sim-panel.js
init_mtn3();
init_motion_library();
init_maxe1_motion_notes();
var el5 = (tag, cls, text2) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text2 !== void 0) e.textContent = text2;
  return e;
};
var button3 = (cls, text2, onClick, title) => {
  const b = el5("button", cls, text2);
  b.type = "button";
  if (title) b.title = title;
  b.addEventListener("click", onClick);
  return b;
};
var numInput = (value, step, onChange, w = 62) => {
  const i = el5("input", "tp-secs");
  i.type = "number";
  i.step = String(step);
  i.value = String(value);
  i.style.width = `${w}px`;
  i.addEventListener("change", () => onChange(Number(i.value)));
  return i;
};
var STORE_KEY = "dm.maxe1";
var load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch (e) {
    return {};
  }
};
var save = (v) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(v));
  } catch (e) {
  }
};
var simScript = null;
var loadSimBundle = () => {
  if (!simScript) {
    simScript = new Promise((resolve, reject) => {
      if (window.DMSIM) return resolve(window.DMSIM);
      const s = document.createElement("script");
      s.src = assetUrl("dm-sim.js");
      s.onload = () => window.DMSIM ? resolve(window.DMSIM) : reject(new Error("3D 시뮬레이터를 불러오지 못했습니다."));
      s.onerror = () => reject(new Error("3D 시뮬레이터(dm-sim.js)를 불러오지 못했습니다."));
      document.head.append(s);
    }).catch((e) => {
      simScript = null;
      throw e;
    });
  }
  return simScript;
};
var DIMS = [
  ["kp", "모터 단단함 (kp)", 0.5],
  ["maxTorque", "모터 최대 힘 (N·m)", 0.1],
  ["friction", "발바닥 마찰", 0.1],
  ["extraMass", "몸통에 더한 무게 (kg)", 0.01]
];
var SimPanel = class {
  /**
   * @param {object} o
   * @param {HTMLElement} o.host
   * @param {Function} o.log
   * @param {Function} o.connect (transport) -> Promise, connect the app to the 3D robot
   * @param {Function} o.disconnect
   * @param {Function} o.makeTransport (physics) -> SimTransport
   * @param {object} o.device CM550Device
   * @param {object} o.walker Walker
   * @param {object} o.store {gait, policy} saved with the project; o.onStoreChange()
   */
  constructor(o) {
    Object.assign(this, o);
    const saved = load();
    const sameModel = saved.modelVersion === MODEL_VERSION;
    this.params = Object.assign({}, MAXE1_DEFAULT, sameModel ? saved.params || {} : {});
    this.jointMap = (sameModel && saved.joints && saved.joints.length === MAXE1_JOINT_MAP.length ? saved.joints : MAXE1_JOINT_MAP).map((j) => Object.assign({}, j));
    this.weights = Object.assign(defaultRewards(), saved.weights || {});
    this.ranges = Object.fromEntries(GAIT_PARAMS.map((p) => [
      p.key,
      Object.assign({ min: p.min, max: p.max, fixed: false }, (saved.ranges || {})[p.key] || {})
    ]));
    this.search = Object.assign({ population: 20, generations: 30, seconds: 5 }, saved.search || {});
    if (!["race", "watch", "fast"].includes(this.search.mode)) this.search.mode = this.search.watch === false ? "fast" : "race";
    if (!this.search.speed) this.search.speed = 1;
    this.visible = false;
    this._build();
    this.walker.onUpdate(() => this._status());
  }
  _persist() {
    save({
      modelVersion: MODEL_VERSION,
      params: this.params,
      joints: this.jointMap,
      weights: this.weights,
      ranges: this.ranges,
      search: this.search
    });
  }
  get gait() {
    return this.store.gait || defaultGait();
  }
  _build() {
    this.host.classList.add("mon", "simp");
    const header = el5("header", "mon-header");
    header.append(el5("span", "mon-title", "3D 시뮬레이터"), this.stateEl = el5("span", "mon-state", "MuJoCo"));
    this.host.append(header);
    const body = el5("div", "mon-body");
    this.host.append(body);
    const c1 = el5("section", "mon-card");
    c1.append(el5("h3", "", "1. 3D 가상 로봇 (MAX-E1)"));
    c1.append(el5("p", "mon-note", "진짜 물리(무게·중력·마찰)가 적용되는 가상 로봇입니다. 연결하면 모든 블록·가르치기·AI가 이 로봇으로 동작합니다. 실제 로봇에 보내기 전에 넘어지는지 먼저 확인해 보세요. 끌어서 돌려 보기, 휠로 확대."));
    this.viewHost = el5("div", "sim-view");
    this.viewMsg = el5("div", "ai-preview-msg", "[3D 가상 로봇 연결]을 누르면 여기에 나타납니다");
    this.viewHost.append(this.viewMsg);
    c1.append(this.viewHost);
    this.infoEl = el5("div", "sim-info", "");
    c1.append(this.infoEl);
    const r12 = el5("div", "tp-row");
    this.connBtn = button3("tp-btn tp-primary", "3D 가상 로봇 연결", () => this.toggleConnect());
    this.resetBtn = button3("tp-btn", "처음 자세로", () => this.resetWorld(), "로봇을 다시 세웁니다");
    this.pushBtn = button3("tp-btn", "옆에서 밀기", () => this.physics && this.physics.push(3), "균형을 시험합니다");
    this.pauseBtn = button3("tp-btn", "일시정지", () => this.togglePause());
    this.partsBtn = button3(
      "tp-btn",
      "단순 도형으로 보기",
      () => this.toggleParts(),
      "실제 부품 모양(ROBOTIS STEP 도면)과 물리 계산용 단순 도형을 바꿔 봅니다"
    );
    r12.append(this.connBtn, this.resetBtn, this.pushBtn, this.pauseBtn, this.partsBtn);
    c1.append(r12);
    body.append(c1);
    const cm = el5("section", "mon-card");
    cm.append(el5("h3", "", "예제 모션 확인 (실제 로봇의 공식 모션)"));
    cm.append(el5("p", "mon-note", "CM-550에 들어 있는 모션(R+ Task의 MAX-E1 예제)을 실행하면서 관절 12개의 각도를 기록합니다. 기록을 3D 로봇에 재생해서 앞으로 잘 걸으면 ID·방향 설정이 맞는 것입니다. 블록으로 바꿔 보거나 파일로 저장할 수도 있습니다. 로봇을 바닥에 내려놓고 주위를 비운 뒤 실행하고, 넘어질 것 같으면 [멈추기]를 누르세요."));
    const rm = el5("div", "tp-row");
    this.motionPage = 108;
    rm.append(el5("span", "tp-label", "모션 페이지"), numInput(this.motionPage, 1, (v) => {
      this.motionPage = Math.max(1, Math.round(v));
    }, 56));
    this.recBtn = button3("tp-btn tp-primary", "▶ 실행하며 기록", () => this.recordMotion());
    this.recStopBtn = button3("tp-btn", "■ 멈추기", () => this.recorder && this.recorder.stop());
    this.replayBtn = button3("tp-btn", "3D로 재생", () => this.replayMotion(), "기록한 각도를 지금의 ID·방향 설정으로 3D 로봇에 그대로 줍니다");
    this.recBlockBtn = button3("tp-btn", "블록으로 만들기", () => this.motionBlocks());
    this.recSaveBtn = button3("tp-btn", "기록 저장", () => this.saveMotion());
    const recFile = el5("input", "sim-rec-file");
    recFile.type = "file";
    recFile.accept = ".json,application/json";
    recFile.hidden = true;
    recFile.addEventListener("change", () => {
      this.loadMotion(recFile.files[0]);
      recFile.value = "";
    });
    this.recLoadBtn = button3("tp-btn", "기록 불러오기", () => recFile.click());
    rm.append(this.recBtn, this.recStopBtn, this.replayBtn, this.recBlockBtn, this.recSaveBtn, this.recLoadBtn, recFile);
    cm.append(rm);
    const rf = el5("div", "tp-row");
    const mtnFile = el5("input", "sim-rec-file");
    mtnFile.type = "file";
    mtnFile.accept = ".mtn3";
    mtnFile.hidden = true;
    mtnFile.addEventListener("change", () => {
      this.loadMtn3(mtnFile.files[0]);
      mtnFile.value = "";
    });
    this.mtnBtn = button3(
      "tp-btn",
      "다른 모션 파일(.mtn3) 열기",
      () => mtnFile.click(),
      "MAX-E1 공식 예제 모션은 이미 들어 있습니다. 직접 만든 R+ Motion 파일(.mtn3)을 열면 그 모션으로 바뀝니다"
    );
    this.mtnSel = el5("select", "sim-mtn");
    this.mtnSel.title = "MAX-E1 공식 예제 모션 (ROBOTIS 03_ENG1_MAX_E1.mtn3) — 번호는 CM-550에 저장된 모션 번호와 같습니다";
    this.mtnSel.addEventListener("change", () => this._pickMtn());
    this.mtnRepeat = 4;
    this.mtnRepeatInput = numInput(this.mtnRepeat, 1, (v) => {
      this.mtnRepeat = Math.max(1, Math.min(30, Math.round(v)));
      this._pickMtn();
    }, 46);
    this.mtnRunBtn = button3(
      "tp-btn",
      "실제 로봇에서 실행",
      () => this.runMtnOnRobot(),
      "CM-550에 저장된 같은 번호의 모션을 실행합니다 (걷기는 페이지를 멈춤 없이 이어서)"
    );
    rf.append(this.mtnBtn, this.mtnSel, el5("span", "tp-label", "반복"), this.mtnRepeatInput, this.mtnRunBtn, mtnFile);
    cm.append(rf);
    this.mtnNote = el5("div", "sim-mtn-note", "");
    cm.append(this.mtnNote);
    this.recInfo = el5("div", "sim-info", "아직 기록이 없습니다.");
    this.recTable = el5("table", "sim-table");
    cm.append(this.recInfo, this.recTable);
    body.append(cm);
    const c2 = el5("section", "mon-card");
    c2.append(el5("h3", "", "2. 걸음 학습 (시뮬레이터 속에서 스스로 찾기)"));
    c2.append(el5("p", "mon-note", "걸음은 숫자 7개로 정해집니다. [학습 시작]을 누르면 시뮬레이터가 수백 가지 걸음을 시험하고, 점수가 높은 걸음 근처를 다시 시험하며 점점 좋아집니다. 점수를 어떻게 줄지(보상)는 여러분이 정합니다."));
    const tbl = el5("table", "sim-table");
    tbl.innerHTML = "<thead><tr><th>걸음 숫자</th><th>최소</th><th>최대</th><th>지금</th><th>고정</th></tr></thead>";
    const tb = el5("tbody");
    this.gaitCells = {};
    for (const p of GAIT_PARAMS) {
      const r = this.ranges[p.key];
      const tr = el5("tr");
      tr.append(el5("td", "", p.name));
      const mk = (field, step) => {
        const td = el5("td");
        td.append(numInput(r[field], step, (v) => {
          r[field] = v;
          this._persist();
        }, 58));
        return td;
      };
      tr.append(mk("min", p.step), mk("max", p.step));
      const cur = el5("td", "sim-num", "");
      this.gaitCells[p.key] = cur;
      tr.append(cur);
      const fx = el5("td");
      const box = el5("input");
      box.type = "checkbox";
      box.checked = Boolean(r.fixed);
      box.title = "체크하면 이 숫자는 지금 값 그대로 두고 나머지만 학습합니다";
      box.addEventListener("change", () => {
        r.fixed = box.checked;
        this._persist();
      });
      fx.append(box);
      tr.append(fx);
      tb.append(tr);
    }
    tbl.append(tb);
    c2.append(tbl);
    c2.append(el5("h4", "sim-sub", "점수 주는 방법 (보상)"));
    const rw = el5("div", "sim-rewards");
    for (const r of REWARDS) {
      const row = el5("label", "sim-rw");
      row.append(el5("span", "", r.name), numInput(this.weights[r.key], 1, (v) => {
        this.weights[r.key] = v;
        this._persist();
      }, 56));
      rw.append(row);
    }
    c2.append(rw);
    const sr = el5("div", "tp-row");
    sr.append(
      el5("span", "tp-label", "한 번에"),
      numInput(this.search.population, 1, (v) => {
        this.search.population = Math.max(4, Math.round(v));
        this._persist();
      }, 50),
      el5("span", "tp-label", "가지 ×"),
      numInput(this.search.generations, 1, (v) => {
        this.search.generations = Math.max(1, Math.round(v));
        this._persist();
      }, 50),
      el5("span", "tp-label", "세대, 각"),
      numInput(this.search.seconds, 0.5, (v) => {
        this.search.seconds = Math.max(1, v);
        this._persist();
      }, 50),
      el5("span", "tp-label", "초")
    );
    c2.append(sr);
    const r2 = el5("div", "tp-row");
    this.learnBtn = button3("tp-btn tp-primary", "▶ 학습 시작", () => this.toggleLearn());
    this.previewBtn = button3("tp-btn", "이 걸음으로 걷기 (3D)", () => this.walkHere(false), "지금 걸음을 3D 로봇으로 걸어 봅니다");
    this.blockBtn = button3(
      "tp-btn",
      "블록 만들기 (모터별)",
      () => this.makeBlocks(true),
      "학습한 걸음을 모터마다 목표 각도가 보이는 블록 프로그램으로 넣습니다 (Python 탭에도 같은 코드)"
    );
    this.blockOneBtn = button3("tp-btn", "한 줄 블록", () => this.makeBlocks(false), '"학습한 걸음으로 걷기" 블록 하나를 넣습니다');
    r2.append(this.learnBtn, this.previewBtn, this.blockBtn, this.blockOneBtn);
    c2.append(r2);
    const wr = el5("div", "tp-row sim-watch");
    this.modeSel = el5("select", "sim-mode");
    for (const [v, t] of [
      ["race", "동시 경주 — 한 세대의 로봇이 모두 함께 걷기"],
      ["watch", "세대마다 1등 걸음만 보기"],
      ["fast", "보지 않고 빠르게 학습"]
    ]) {
      const o = el5("option", "", t);
      o.value = v;
      this.modeSel.append(o);
    }
    this.modeSel.value = this.search.mode;
    this.speedSel = el5("select", "sim-speed");
    for (const v of [1, 2, 4]) {
      const o = el5("option", "", `${v}배속`);
      o.value = String(v);
      this.speedSel.append(o);
    }
    this.speedSel.value = String(this.search.speed);
    this.speedSel.title = "동시 경주를 빨리 돌립니다 (로봇이 많으면 컴퓨터 성능만큼만 빨라집니다)";
    const showSpeed = () => {
      this.speedSel.hidden = this.modeSel.value !== "race";
    };
    this.modeSel.addEventListener("change", () => {
      this.search.mode = this.modeSel.value;
      showSpeed();
      this._persist();
    });
    this.speedSel.addEventListener("change", () => {
      this.search.speed = Number(this.speedSel.value);
      if (this.race) this.race.speed = this.search.speed;
      this._persist();
    });
    showSpeed();
    wr.append(el5("span", "tp-label", "학습 보기"), this.modeSel, this.speedSel);
    c2.append(wr);
    c2.append(el5("p", "mon-note sim-mode-note", "동시 경주: 한 세대의 로봇들(한 번에 시험하는 가지 수만큼)이 나란히 서서 각자 다른 걸음으로 동시에 걷고, 그 결과로 점수를 매깁니다. 다음 세대는 잘한 로봇들의 걸음을 섞어 다시 출발합니다."));
    this.learnView = el5("div", "sim-view sim-learn-view");
    this.learnTag = el5("div", "sim-tag", "");
    this.bigBtn = button3("sim-big", "⛶ 크게", () => {
      const v = this.learnView;
      if (document.fullscreenElement) document.exitFullscreen();
      else if (v.requestFullscreen) v.requestFullscreen().catch(() => {
      });
    }, "학습 화면을 전체 화면으로 봅니다 (Esc로 돌아오기)");
    this.learnView.append(this.learnTag, this.bigBtn);
    this.learnView.hidden = true;
    c2.append(this.learnView);
    this.chart = el5("canvas", "sim-chart");
    this.chart.width = 460;
    this.chart.height = 120;
    this.learnInfo = el5("div", "sim-info", "아직 학습하지 않았습니다. 지금 걸음은 기본 걸음입니다.");
    c2.append(this.chart, this.learnInfo);
    body.append(c2);
    const c3 = el5("section", "mon-card");
    c3.append(el5("h3", "", "3. 강화학습 정책 (고급)"));
    c3.append(el5("p", "mon-note", "PC의 Python에서 같은 MAX-E1 모델로 신경망을 학습시킨 뒤(저장소의 sim 폴더, python train_es.py), 만들어진 정책 파일(.json)을 여기서 불러옵니다. 신경망은 CM-550의 기울기 센서를 보고 걸음을 고쳐 가며 넘어지지 않게 합니다."));
    this.policyInfo = el5("div", "sim-info", "");
    c3.append(this.policyInfo);
    const r3 = el5("div", "tp-row");
    const file = el5("input");
    file.type = "file";
    file.accept = ".json,application/json";
    file.hidden = true;
    file.addEventListener("change", () => this.loadPolicy(file.files[0]).finally(() => {
      file.value = "";
    }));
    this.policyOpen = button3("tp-btn", "정책 파일 열기", () => file.click());
    this.policyWalk = button3("tp-btn tp-primary", "정책으로 걷기 (3D)", () => this.walkHere(true));
    this.policyClear = button3("tp-btn", "정책 지우기", () => {
      this.store.policy = null;
      this.onStoreChange();
      this._status();
    });
    this.modelBtn = button3(
      "tp-btn",
      "모델 파일 받기 (maxe1.xml)",
      () => this.downloadModel(),
      "지금 설정(치수·ID)으로 만든 MuJoCo 모델 — Python 키트의 sim/maxe1.xml을 이것으로 바꾸세요"
    );
    r3.append(file, this.policyOpen, this.policyWalk, this.policyClear, this.modelBtn);
    c3.append(r3);
    body.append(c3);
    const c4 = el5("details", "mon-card sim-settings");
    c4.append(el5("summary", "", "로봇 설정 — 관절 ID·방향·치수 (실제 로봇에 맞추기)"));
    c4.append(el5("p", "mon-note", '⚠ 아래 값은 추정값입니다. 조립서의 ID 배치 그림과 실제 로봇을 보고 맞춰 주세요. "방향"은 모터 각도가 커질 때 관절이 움직이는 쪽, "가운데"는 관절이 똑바를 때의 모터 각도입니다.'));
    const jt = el5("table", "sim-table");
    jt.innerHTML = "<thead><tr><th>ID</th><th>관절</th><th>방향</th><th>가운데 (°)</th></tr></thead>";
    const jb = el5("tbody");
    for (const j of this.jointMap) {
      const tr = el5("tr");
      const idTd = el5("td");
      idTd.append(numInput(j.id, 1, (v) => {
        j.id = Math.round(v);
        this._persist();
      }, 46));
      tr.append(idTd, el5("td", "", j.name));
      const sTd = el5("td");
      const sel = el5("select", "tp-secs");
      sel.innerHTML = '<option value="1">+</option><option value="-1">−</option>';
      sel.value = String(j.sign);
      sel.addEventListener("change", () => {
        j.sign = Number(sel.value);
        this._persist();
      });
      sTd.append(sel);
      const cTd = el5("td");
      cTd.append(numInput(j.center, 0.5, (v) => {
        j.center = v;
        this._persist();
      }, 58));
      tr.append(sTd, cTd);
      jb.append(tr);
    }
    jt.append(jb);
    c4.append(jt);
    const dims = el5("div", "sim-rewards");
    for (const [k, name, step] of DIMS) {
      const row = el5("label", "sim-rw");
      row.append(el5("span", "", name), numInput(this.params[k], step, (v) => {
        this.params[k] = v;
        this._persist();
      }, 64));
      dims.append(row);
    }
    c4.append(dims);
    const r4 = el5("div", "tp-row");
    r4.append(
      button3("tp-btn tp-primary", "설정 적용 (로봇 다시 만들기)", () => this.applySettings()),
      button3("tp-btn", "기본값으로", () => {
        save({});
        this.log("로봇 설정을 기본값으로 되돌렸습니다. 탭을 다시 열면 적용됩니다(새로고침).");
      })
    );
    c4.append(r4);
    body.append(c4);
    this.loadBuiltInMotions();
    this._pickMtn();
    this._status();
  }
  toggleParts() {
    if (!this.view) return;
    this.view.setShowParts(!this.view.showParts);
    this._status();
  }
  setVisible(v) {
    this.visible = v;
    if (v) this._status();
  }
  async _ensureSim() {
    if (this.physics) return this.physics;
    this.stateEl.textContent = "물리 엔진(MuJoCo)을 준비하는 중…";
    const { loadMujoco, PhysicsSim, SimView, RaceSim } = await loadSimBundle();
    this._RaceSim = RaceSim;
    this._SimView = SimView;
    const mj = await loadMujoco();
    this.physics = new PhysicsSim(mj, { params: this.params, jointMap: this.jointMap });
    this.viewMsg.remove();
    this.view = new SimView(this.viewHost, this.physics);
    this.physics.onUpdate(() => {
      if (this.visible && !this.raceView) this.view.render();
      this._tickInfo();
    });
    this.physics.start();
    return this.physics;
  }
  get connected() {
    return Boolean(this.device.connected && this.device.transport && this.device.transport.physics === this.physics && this.physics);
  }
  async toggleConnect() {
    try {
      if (this.connected) {
        this.walker.stop();
        await this.disconnect();
      } else {
        const sim = await this._ensureSim();
        if (this.device.connected) await this.disconnect();
        await this.connect(this.makeTransport(sim));
      }
    } catch (e) {
      this.log(`⚠ 3D 시뮬레이터: ${e.message || e}`, "err");
    }
    this._status();
  }
  resetWorld() {
    if (!this.physics) return;
    this.walker.stop();
    this.physics.reset();
    this.log("3D 로봇을 처음 자세로 세웠습니다.");
  }
  togglePause() {
    if (!this.physics) return;
    this.physics.paused = !this.physics.paused;
    this._status();
  }
  async applySettings() {
    this._persist();
    if (!this.physics) {
      this.log("설정을 저장했습니다. 3D 가상 로봇을 연결하면 적용됩니다.");
      return;
    }
    const was = this.connected;
    if (was) await this.disconnect();
    this.physics.params = this.params;
    this.physics.setJointMap(this.jointMap);
    if (was) await this.connect(this.makeTransport(this.physics));
    this.log("새 설정으로 3D 로봇을 다시 만들었습니다.", "ok");
  }
  // ---- 2단계 ------------------------------------------------------------------------
  async toggleLearn() {
    if (this.learner && this.learner.running) {
      this.learner.stop();
      if (this.race) this.race.abort();
      return;
    }
    try {
      const sim = await this._ensureSim();
      for (const p of GAIT_PARAMS) {
        const r = this.ranges[p.key];
        r.value = this.gait[p.key];
        if (r.min > r.max) [r.min, r.max] = [r.max, r.min];
      }
      const mode = this.modeSel.value;
      const racing = mode === "race" && Boolean(this._RaceSim);
      this.learner = new GaitLearner({
        sim,
        ranges: this.ranges,
        weights: this.weights,
        population: this.search.population,
        generations: this.search.generations,
        seconds: this.search.seconds,
        seed: Date.now() % 1e5,
        evalBatch: racing ? (gaits, secs, L) => this._raceGen(gaits, secs, L) : null
      });
      this.log(`걸음 학습을 시작합니다: ${this.search.population}가지 × ${this.search.generations}세대${racing ? ` — 동시 경주 (로봇 ${this.search.population}대가 함께 걷습니다)` : ""}.`);
      this._status();
      const before = score(sim.evaluate(this.gait, this.search.seconds), this.weights);
      const watch = mode === "watch" && !this.walker.running;
      if (watch) this._watchStart(this.gait, `시작 걸음 · 점수 ${before.toFixed(1)}`);
      if (racing) this._raceStart(this.search.population);
      let shown = 0;
      let best;
      try {
        best = await this.learner.run((L) => {
          this._learnProgress();
          if (watch && L.history.length > shown && L.genBest) {
            shown = L.history.length;
            this._watchShow(L.genBest.gait, `${shown}세대에서 가장 잘한 걸음 · 점수 ${L.genBest.score.toFixed(1)}`);
          }
        });
      } finally {
        if (watch) this._watchStop();
        if (racing) this._raceStop();
      }
      if (best) {
        const r = best.result;
        const msg = `걸음 학습 끝: ${this.learner.tries}번 시험, 최고 점수 ${best.score.toFixed(1)} — ${r.secs}초에 ${(r.dx * 100).toFixed(0)} cm ${r.fell ? "(넘어짐)" : "(넘어지지 않음)"}.`;
        if (best.score > before) {
          this.store.gait = best.gait;
          this.onStoreChange();
          this.log(`${msg} 새 걸음으로 바꿨습니다. [이 걸음으로 걷기]로 확인하세요.`, "ok");
        } else {
          this.log(`${msg} 지금 걸음(점수 ${before.toFixed(1)})이 더 좋아서 그대로 둡니다. 세대 수를 늘리거나 범위를 바꿔 다시 해 보세요.`, "warn");
        }
      }
    } catch (e) {
      this.log(`⚠ 걸음 학습: ${e.message || e}`, "err");
    }
    this._status();
  }
  // ---- 학습하는 모습 보기: the visible robot walks each generation's best gait -------------
  _watchStart(gait, label2) {
    this.learnView.hidden = false;
    if (this.view) this.view.attach(this.learnView);
    this._watching = true;
    this._watchShow(gait, label2);
    this._watchLoop();
  }
  /** Queue the next gait to show; it starts when the current walk ends. */
  _watchShow(gait, label2) {
    this._watchNext = { gait, label: label2 };
  }
  _watchLoop() {
    const ph = this.physics;
    if (!this._watching || !ph) return;
    if (this._watchNext) {
      this._watchCur = this._watchNext;
      this._watchNext = null;
    }
    const { gait, label: label2 } = this._watchCur;
    ph.reset();
    this.learnTag.textContent = label2;
    const secs = this.search.seconds;
    const t0 = ph.data.time;
    let end = null;
    ph.setController((time) => {
      const t = time - t0;
      if (!this._watching) {
        ph.setController(null);
        return;
      }
      if (end === null && (t > secs || ph.fallen)) {
        end = t;
        const x = ph.torso.x;
        this.learnTag.textContent = `${label2} → ${(x * 100).toFixed(0)} cm${ph.fallen ? ", 넘어짐" : ""}`;
        const stand = gaitTargets(gait, 0, 0);
        for (const j in stand) ph.setGoalRad(j, stand[j]);
      }
      if (end !== null) {
        if (t > end + 1) {
          ph.setController(null);
          setTimeout(() => this._watchLoop(), 0);
        }
        return;
      }
      const k = Math.min(1, t / 0.6, Math.max(0, (secs - t) / 0.6));
      const tg = gaitTargets(gait, t, k);
      for (const j in tg) ph.setGoalRad(j, tg[j]);
    });
  }
  // ---- 동시 경주: a whole generation walks side by side in one world ---------------------
  _raceStart(n) {
    this.race = new this._RaceSim(this.physics.mj, { params: this.params, n });
    this.race.speed = this.search.speed || 1;
    this.learnView.hidden = false;
    this.learnView.classList.add("sim-race");
    this.raceView = new this._SimView(this.learnView, this.race);
    this.raceView.setShowParts(this.view ? this.view.showParts : true);
    this.learnTag.textContent = `로봇 ${n}대가 출발선에 섰습니다`;
    this.raceView.render();
  }
  async _raceGen(gaits, secs, L) {
    const race = this.race;
    if (!race) return null;
    const gen = L.gen + 1;
    let last = 0;
    const results = await race.run(gaits, secs, { onFrame: (r) => {
      const info = r.info();
      let lead = null;
      for (const x of info) if (!x.fell && (!lead || x.dx > lead.dx)) lead = x;
      r.ranks = info.map((x) => lead && x.lane === lead.lane ? 1 : null);
      this.raceView.render();
      const now = performance.now();
      if (now - last < 150) return;
      last = now;
      const fell2 = info.filter((x) => x.fell).length;
      this.learnTag.textContent = `${gen}/${L.generations}세대 경주 · ${r.t.toFixed(1)}/${secs}초 · 넘어짐 ${fell2}/${info.length}${lead ? ` · 선두 ${lead.lane + 1}번 ${Math.round(lead.dx * 100)} cm` : ""}`;
    } });
    if (!results) return null;
    const scored = results.map((r, i) => ({ i, s: score(r, this.weights) })).sort((a, b) => b.s - a.s);
    race.ranks = results.map((_, i) => i === scored[0].i ? 1 : null);
    this.raceView.render();
    const fell = results.filter((r) => r.fell).length;
    const w = results[scored[0].i];
    this.learnTag.textContent = `${gen}세대 결과 · 1등 ${scored[0].i + 1}번 (점수 ${scored[0].s.toFixed(1)}, ${Math.round(w.dx * 100)} cm) · 넘어짐 ${fell}/${results.length}`;
    await new Promise((r) => setTimeout(r, 900));
    return results;
  }
  _raceStop() {
    if (this.raceView) this.raceView.dispose();
    if (this.race) this.race.delete();
    this.raceView = null;
    this.race = null;
    this.learnView.hidden = true;
    this.learnView.classList.remove("sim-race");
  }
  _watchStop() {
    this._watching = false;
    this._watchNext = null;
    if (this.physics) {
      this.physics.setController(null);
      this.physics.reset();
    }
    if (this.view) this.view.attach(this.viewHost);
    this.learnView.hidden = true;
  }
  _learnProgress() {
    const L = this.learner;
    const now = Date.now();
    if (this._lastDraw && now - this._lastDraw < 120 && L.running) return;
    this._lastDraw = now;
    const b = L.best;
    if (b) {
      this.learnInfo.textContent = `${L.gen + (L.running ? 1 : 0)}/${L.generations}세대 · ${L.tries}번 시험 · 최고 점수 ${b.score.toFixed(1)} (${b.result.secs}초에 ${(b.result.dx * 100).toFixed(0)} cm, ${b.result.fell ? `${b.result.alive.toFixed(1)}초에 넘어짐` : "넘어지지 않음"})`;
      for (const p of GAIT_PARAMS) this.gaitCells[p.key].textContent = b.gait[p.key].toFixed(2);
    }
    this._drawChart();
  }
  _drawChart() {
    const h = this.learner && this.learner.history || [];
    const c = this.chart.getContext("2d");
    const W = this.chart.width;
    const H = this.chart.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = "#f7f9fc";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#6b7689";
    c.font = "11px sans-serif";
    if (!h.length) {
      c.fillText("세대마다 점수가 여기에 그려집니다", 10, H / 2);
      return;
    }
    const vals = h.flatMap((x) => [x.bestEver, x.mean]);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const X = (i) => 30 + (W - 40) * i / Math.max(1, h.length - 1);
    const Y = (v) => H - 16 - (H - 28) * (v - lo) / Math.max(1e-6, hi - lo);
    const line = (key, color) => {
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.beginPath();
      h.forEach((x, i) => i ? c.lineTo(X(i), Y(x[key])) : c.moveTo(X(i), Y(x[key])));
      c.stroke();
    };
    line("mean", "#b9c3d3");
    line("bestEver", "#2E6ABF");
    c.fillStyle = "#2E6ABF";
    c.fillText(`최고 ${hi.toFixed(0)}`, 4, 12);
    c.fillStyle = "#8a94a6";
    c.fillText("— 최고 점수   — 평균", W - 130, 12);
    c.fillText(`${h.length}세대`, W - 40, H - 3);
  }
  async walkHere(withPolicy) {
    try {
      if (withPolicy && !this.store.policy) throw new Error("먼저 정책 파일을 여세요.");
      if (!this.connected) {
        const sim = await this._ensureSim();
        if (this.device.connected) await this.disconnect();
        await this.connect(this.makeTransport(sim));
      }
      this.physics.reset();
      this.log(withPolicy ? "정책으로 8초 동안 걷습니다." : "지금 걸음으로 8초 동안 걷습니다.");
      const start = this.physics.torso;
      await this.walker.walk(
        withPolicy ? this.store.policy.gait : this.gait,
        8,
        { policy: withPolicy ? this.store.policy : null, prepare: true }
      );
      const t = this.physics.torso;
      this.log(
        `3D 로봇: ${((t.x - start.x) * 100).toFixed(0)} cm 앞으로, ${this.physics.fallen ? "넘어졌습니다" : "서 있습니다"}.`,
        this.physics.fallen ? "warn" : "ok"
      );
    } catch (e) {
      this.log(`⚠ ${e.message || e}`, "err");
    }
  }
  // ---- 예제 모션 확인 ------------------------------------------------------------------
  async recordMotion() {
    if (this.recorder && this.recorder.running) return;
    if (!this.device.connected) {
      this.log("먼저 실제 로봇(USB/블루투스)을 연결하세요. 3D 가상 로봇에는 공식 모션이 들어 있지 않습니다.", "warn");
      return;
    }
    this.recorder = new MotionRecorder({ device: this.device, getJointMap: () => this.jointMap });
    this._status();
    const page = this.motionPage;
    this.log(`모션 ${page}번을 실행하며 기록합니다…`);
    try {
      const rec = await this.recorder.record(page, { onFrame: (f2, r) => {
        this.recInfo.textContent = `모션 ${page}번 기록 중 · ${f2.t.toFixed(1)}초 · ${r.frames.length}개`;
      } });
      this.motionRec = rec;
      this._showMotion();
      this.log(`모션 ${page}번 기록 끝: ${rec.seconds.toFixed(1)}초, ${rec.frames.length}개 (초당 ${(rec.frames.length / Math.max(0.1, rec.seconds)).toFixed(0)}번${rec.syncRead ? ", 한꺼번에 읽기" : ", 하나씩 읽기"}).`, "ok");
    } catch (e) {
      this.log(`⚠ 모션 기록: ${e.message || e}`, "err");
    }
    this._status();
  }
  _showMotion() {
    const rec = this.motionRec;
    if (!rec) return;
    const sum = summarize(rec, this.jointMap);
    const moved = sum.filter((r) => r.range > 3);
    this.recInfo.textContent = `${rec.fromFile ? `모션 파일: ${rec.page}` : `모션 ${rec.page}번`} · ${rec.seconds.toFixed(1)}초 · ${rec.fromFile ? "키프레임" : "기록"} ${rec.frames.length}개 · 움직인 관절 ${moved.length}개${moved.length ? ` (${moved.map((r) => r.id).join(", ")})` : " — 모션이 실행되지 않았거나 빈 페이지입니다"}`;
    const f2 = (v) => Number.isFinite(v) ? v.toFixed(1) : "-";
    this.recTable.innerHTML = "<thead><tr><th>ID</th><th>관절</th><th>시작</th><th>최소</th><th>최대</th><th>움직임</th></tr></thead>";
    const tb = el5("tbody");
    for (const r of sum) {
      const tr = el5("tr");
      for (const v of [r.id, r.name, f2(r.start), f2(r.min), f2(r.max), f2(r.range)]) tr.append(el5("td", "sim-num", String(v)));
      tb.append(tr);
    }
    this.recTable.append(tb);
  }
  async replayMotion() {
    const rec = this.motionRec;
    if (!rec) {
      this.log("먼저 모션을 기록하거나 기록 파일을 불러오세요.", "warn");
      return;
    }
    try {
      const ph = await this._ensureSim();
      this.walker.stop();
      ph.reset();
      for (const j of this.jointMap) {
        ph.setTorque(j.id, 1);
        ph.setProfile(j.id, 0);
      }
      const map = this.jointMap;
      const t0 = ph.data.time;
      const lead = 0.6;
      const first = toJointRad(rec.frames[0].deg, map);
      this.log(`3D 로봇에 ${rec.fromFile ? rec.page : `모션 ${rec.page}번 기록`}을 재생합니다 (${rec.seconds.toFixed(1)}초).`);
      await new Promise((resolve) => {
        ph.setController((time) => {
          const t2 = time - t0;
          if (t2 < lead) {
            for (const j in first) ph.setGoalRad(j, first[j] * (t2 / lead));
            return;
          }
          const tt = t2 - lead;
          if (tt > rec.seconds + 1) {
            ph.setController(null);
            resolve();
            return;
          }
          const q = toJointRad(poseAt(rec, Math.min(tt, rec.seconds)), map);
          for (const j in q) ph.setGoalRad(j, q[j]);
        });
      });
      const t = ph.torso;
      this.log(
        `3D 재생 끝: 앞으로 ${(t.x * 100).toFixed(0)} cm, 옆으로 ${(t.y * 100).toFixed(0)} cm, ${ph.fallen ? "넘어졌습니다" : "서 있습니다"}. (공식 걷기 모션이 3D에서도 앞으로 걸으면 ID·방향 설정이 맞습니다)`,
        ph.fallen ? "warn" : "ok"
      );
    } catch (e) {
      this.log(`⚠ 3D 재생: ${e.message || e}`, "err");
    }
  }
  motionBlocks() {
    const rec = this.motionRec;
    if (!rec || !this.insertXML) return;
    const poses = keyPoses(rec, 0.12);
    const n = this.insertXML((x, y) => posesProgramXML(poses, {
      x,
      y,
      title: `${rec.fromFile ? `모션 파일의 ${rec.page}` : `CM-550 모션 ${rec.page}번을 기록한`} 자세 ${poses.length}개 (약 0.12초마다)`
    }).xml);
    if (n !== false) this.log(`${rec.fromFile ? rec.page : `모션 ${rec.page}번`}을 블록으로 넣었습니다: 자세 ${poses.length}개, 자세마다 모터 ${rec.ids.length}개.`, "ok");
  }
  saveMotion() {
    const rec = this.motionRec;
    if (!rec || !this.saveText) return;
    this.saveText(`MAX-E1-motion-${String(rec.page).replace(/[^\w가-힣-]+/g, "_").slice(0, 40)}.json`, JSON.stringify(Object.assign({ format: "dm-motion-1" }, rec)));
  }
  async loadMtn3(file) {
    if (!file) return;
    try {
      const m = parseMtn3(await file.text());
      this._useMtn(m, false);
      this.log(`모션 파일을 열었습니다: ${file.name} — 모션 ${m.calls.length}개, 걷기 묶음 ${this.mtnChains.length}개, 관절 ${m.ids.length}개.`, "ok");
      this._pickMtn();
    } catch (e) {
      this.log(`⚠ 모션 파일: ${e.message || e}`, "err");
    }
    this._status();
  }
  /** The official MAX-E1 example motions, built in (no file needed). */
  loadBuiltInMotions() {
    try {
      this._useMtn(builtInMotions(), true);
    } catch (e) {
      this.log(`⚠ 공식 모션: ${e.message || e}`, "err");
    }
  }
  _useMtn(m, builtIn2) {
    this.mtn = m;
    this.mtnBuiltIn = builtIn2;
    setMotions(builtIn2 ? null : m);
    this.mtnChains = findChains(m);
    const note = (index) => builtIn2 ? motionNote(index) : { title: "", desc: "" };
    const sel = this.mtnSel;
    sel.innerHTML = "";
    const group2 = (label2) => {
      const g = el5("optgroup");
      g.label = label2;
      sel.append(g);
      return g;
    };
    const gc = group2(builtIn2 ? "MAX-E1 공식 모션 — 걷기 묶음 (시작 → 반복 → 끝)" : "걷기 묶음 (시작 → 반복 → 끝)");
    for (const [i, c] of this.mtnChains.entries()) {
      const t = note(c.start).title.replace(/ 시작$/, "");
      const o = el5("option", "", `걷기: ${t || c.name} (${c.start} → ${c.loop} ×반복 → ${c.end})`);
      o.value = `c:${i}`;
      gc.append(o);
    }
    const ranges = builtIn2 ? [
      [100, 199, "서기 · 동작 (100번대)"],
      [300, 499, "스마트폰 앱 버튼용 (300·400번대)"],
      [700, 799, "한 걸음씩 걷기 (700번대)"],
      [0, 1e9, "그 밖의 모션"]
    ] : [[0, 1e9, "모션"]];
    const done = /* @__PURE__ */ new Set();
    for (const [lo, hi, label2] of ranges) {
      const list = m.calls.filter((c) => c.index >= lo && c.index <= hi && !done.has(c.index));
      if (!list.length) continue;
      const g = group2(builtIn2 ? `MAX-E1 공식 모션 — ${label2}` : label2);
      for (const c of list) {
        done.add(c.index);
        const t = note(c.index).title || c.flow.replace(/^\d+_?H?_?/, "");
        const o = el5("option", "", `${c.index} ${t} · ${callSeconds(m, c.index).toFixed(1)}초`);
        o.value = `p:${c.index}`;
        g.append(o);
      }
    }
    sel.disabled = false;
    const fw = this.mtnChains.findIndex((c) => c.start === 150);
    if (fw >= 0) sel.value = `c:${fw}`;
  }
  /** The chosen motion (or walk group) as a recording: shown, replayable in 3D, blocks. */
  _pickMtn() {
    if (!this.mtn || !this.mtnSel.value) return;
    const [kind, v] = this.mtnSel.value.split(":");
    let seq;
    let label2;
    if (kind === "c") {
      const c = this.mtnChains[Number(v)];
      seq = [c.start, ...Array(this.mtnRepeat).fill(c.loop), c.end];
      label2 = `${c.name} (${c.start} → ${c.loop} ×${this.mtnRepeat} → ${c.end})`;
    } else {
      seq = [Number(v)];
      label2 = this.mtnSel.selectedOptions[0].textContent.replace(/ · [\d.]+초$/, "");
    }
    this.motionRec = toRecording(this.mtn, seq, label2);
    this._showMtnNote(kind, Number(v));
    this._showMotion();
    this._status();
  }
  _showMtnNote(kind, v) {
    if (!this.mtnNote) return;
    const src = this.mtnBuiltIn ? "출처: ROBOTIS ENGINEER Kit 1 MAX-E1 예제 모션 (03_ENG1_MAX_E1.mtn3). " : "";
    if (!this.mtnBuiltIn) {
      this.mtnNote.textContent = "";
      return;
    }
    if (kind === "c") {
      const c = this.mtnChains[v];
      const a = motionNote(c.start);
      const b = motionNote(c.loop);
      const e = motionNote(c.end);
      this.mtnNote.textContent = `${c.start} ${a.title}: ${a.desc} → ${c.loop} ${b.title} ×${this.mtnRepeat}: ${b.desc} → ${c.end} ${e.title}: ${e.desc} ${src}`;
    } else {
      const n = motionNote(v);
      this.mtnNote.textContent = n.title ? `${v} ${n.title}: ${n.desc} ${src}` : src;
    }
  }
  async runMtnOnRobot() {
    if (!this.mtn || !this.mtnSel.value) return;
    if (!this.device.connected || this.device.transport && this.device.transport.physics) {
      this.log("실제 로봇(USB/블루투스)을 연결하세요. 3D 로봇에는 [3D로 재생]을 쓰세요.", "warn");
      return;
    }
    const [kind, v] = this.mtnSel.value.split(":");
    try {
      this._mtnRunning = true;
      this._status();
      const r = await this.device.prepareJoints(this.jointMap.map((j) => j.id), {}, 2);
      if (r.rebooted.length) this.log(`다이나믹셀 ${r.rebooted.join(", ")}: 오류가 있어 다시 시작했습니다.`, "warn");
      if (kind === "c") {
        const c = this.mtnChains[Number(v)];
        this.log(`실제 로봇: ${c.name} — 모션 ${c.start} → ${c.loop} ×${this.mtnRepeat} → ${c.end} (CM-550에 저장된 모션)`);
        await this.device.playMotionChain(
          c.start,
          c.loop,
          this.mtnRepeat,
          c.end,
          { startSecs: callSeconds(this.mtn, c.start), loopSecs: callSeconds(this.mtn, c.loop) }
        );
      } else {
        this.log(`실제 로봇: 모션 ${v}번 (CM-550에 저장된 모션)`);
        await this.device.playMotion(Number(v));
        await this.device.waitMotionDone(3e4);
      }
      this.log("실제 로봇: 모션 끝.", "ok");
    } catch (e) {
      this.log(`⚠ 실제 로봇 모션: ${e.message || e}`, "err");
    } finally {
      this._mtnRunning = false;
      this._status();
    }
  }
  async loadMotion(file) {
    if (!file) return;
    try {
      const rec = JSON.parse(await file.text());
      if (!rec || !Array.isArray(rec.frames) || !rec.frames.length || !Array.isArray(rec.ids)) throw new Error("모션 기록 파일이 아닙니다.");
      this.motionRec = rec;
      this._showMotion();
      this.log(`모션 기록을 불러왔습니다: 페이지 ${rec.page}, ${rec.frames.length}개.`, "ok");
    } catch (e) {
      this.log(`⚠ 모션 기록 파일: ${e.message || e}`, "err");
    }
    this._status();
  }
  makeBlocks(detailed) {
    if (this.addWalkScript) this.addWalkScript(detailed);
  }
  // ---- 3단계 ------------------------------------------------------------------------
  async loadPolicy(file) {
    if (!file) return;
    try {
      const p = checkPolicy(JSON.parse(await file.text()));
      this.store.policy = p;
      this.onStoreChange();
      this.log(`정책을 불러왔습니다: ${p.name || file.name} (학습 점수 ${p.score !== void 0 ? Number(p.score).toFixed(1) : "?"}).`, "ok");
    } catch (e) {
      this.log(`⚠ 정책 파일: ${e.message || e}`, "err");
    }
    this._status();
  }
  downloadModel() {
    if (this.saveText) this.saveText("maxe1.xml", buildMJCF(this.params));
  }
  // ---- status ---------------------------------------------------------------------------
  _tickInfo() {
    const now = Date.now();
    if (!this.visible || this._lastInfo && now - this._lastInfo < 250) return;
    this._lastInfo = now;
    const t = this.physics.torso;
    this.infoEl.textContent = `몸통 높이 ${(t.z * 100).toFixed(1)} cm · 위치 x ${(t.x * 100).toFixed(0)} cm, y ${(t.y * 100).toFixed(0)} cm · ${this.physics.fallen ? "⚠ 넘어졌습니다 — [처음 자세로]" : "서 있음"}${this.physics.paused ? " · 일시정지" : ""}`;
  }
  _status() {
    const conn = this.connected;
    this.connBtn.textContent = conn ? "연결 끊기" : "3D 가상 로봇 연결";
    this.stateEl.textContent = conn ? this.walker.running ? "걷는 중" : "3D 가상 로봇 연결됨" : this.physics ? "MuJoCo 준비됨" : "MuJoCo";
    const learning = this.learner && this.learner.running;
    this.learnBtn.textContent = learning ? "■ 학습 멈추기" : "▶ 학습 시작";
    this.pauseBtn.textContent = this.physics && this.physics.paused ? "계속" : "일시정지";
    for (const b of [this.resetBtn, this.pushBtn, this.pauseBtn, this.partsBtn]) b.disabled = !this.physics;
    if (this.view) this.partsBtn.textContent = this.view.showParts ? "단순 도형으로 보기" : "부품 모양으로 보기";
    this.previewBtn.disabled = learning;
    this.modeSel.disabled = learning;
    const recording = Boolean(this.recorder && this.recorder.running);
    this.recBtn.disabled = recording;
    this.recStopBtn.disabled = !recording;
    for (const b of [this.replayBtn, this.recBlockBtn, this.recSaveBtn]) b.disabled = !this.motionRec || recording;
    this.mtnRunBtn.disabled = !this.mtn || Boolean(this._mtnRunning);
    if (!learning) for (const p of GAIT_PARAMS) this.gaitCells[p.key].textContent = this.gait[p.key].toFixed(2);
    const pol = this.store.policy;
    this.policyInfo.textContent = pol ? `불러온 정책: ${pol.name || "정책"} · 신경망 ${pol.layers.map((l) => l.W.length).join("-")} · 학습 점수 ${pol.score !== void 0 ? Number(pol.score).toFixed(1) : "?"}` : "정책이 없습니다.";
    this.policyWalk.disabled = !pol || learning;
    this.policyClear.disabled = !pol;
    this._drawChart();
  }
};

// src/tutor.js
init_motion_library();
init_maxe1_motion_notes();
var STORE = "dm-tutor";
var LANG = "ko";
var MODELS = {
  small: { f16: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC", f32: "Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC" },
  large: { f16: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC", f32: "Qwen2.5-Coder-3B-Instruct-q4f32_1-MLC" }
};
var WEBLLM_VERSION = "0.2.87";
var webllmUrl = () => location.protocol === "file:" ? `https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@${WEBLLM_VERSION}/+esm` : new URL(`vendor/web-llm-${WEBLLM_VERSION}.js`, location.href).href;
var T = {
  title: "AI 튜터",
  close: "닫기",
  check: "🔍 코드 점검",
  error: "❓ 오류 설명",
  hint: "💡 힌트",
  ask: "궁금한 것을 물어보세요 (예: 왜 로봇이 안 움직여요?)",
  send: "묻기",
  privacy: "🔒 블록과 질문은 이 컴퓨터 밖으로 나가지 않습니다. AI 답이 틀릴 수도 있으니 꼭 실행해서 확인하세요.",
  ready: (n) => `준비됨 · ${n}`,
  loading: "AI 불러오는 중…",
  none: "AI 엔진을 아직 설치하지 않았어요. 🔍 코드 점검의 규칙 검사는 AI 없이도 됩니다. 아래에서 엔진을 한 번 설치하면 인터넷 없이 질문할 수 있어요.",
  setup: "⚙ AI 엔진 설치 · 선택",
  webllm: "오픈 AI 모델 (Qwen 코더) — 추천",
  webllmDesc: "모든 언어(한국어 포함). 처음 한 번 받으면 브라우저에 저장되어 인터넷 없이 씁니다. 그래픽(WebGPU)이 되는 Chrome·Edge 필요.",
  small: "가벼운 모델 1.5B (약 1 GB)",
  large: "똑똑한 모델 3B (약 2 GB)",
  installed: "설치됨",
  use: "사용",
  remove: "지우기",
  install: "설치",
  noGpu: "이 브라우저는 WebGPU 를 지원하지 않아 쓸 수 없어요. 최신 Chrome 또는 Edge 를 써 주세요.",
  chrome: "Chrome 내장 AI (Gemini Nano)",
  chromeDesc: "Chrome 이 모델을 관리합니다 (약 4 GB, PC 전용).",
  chromeNo: "이 브라우저에는 내장 AI가 없어요 (최신 Chrome PC 필요).",
  chromeNoLang: "Chrome 내장 AI는 아직 한국어로 답하지 못해요. 오픈 AI 모델을 써 주세요.",
  needNet: "설치할 때만 인터넷이 필요합니다. 학교 와이파이가 느리면 한 대에서 먼저 받아 보세요.",
  installing: (p) => `받는 중 ${p}%`,
  failed: (m) => `AI를 쓸 수 없어요: ${m}`,
  thinking: "생각하는 중…",
  rules: "자동 점검",
  noIssue: "✅ 규칙 검사에서 문제를 찾지 못했어요.",
  noError: "아직 오류가 없어요. 프로그램을 ▶ 실행해서 오류가 나면 다시 눌러 보세요."
};
var esc2 = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
var STATEMENT = 3;
var fieldText = (f2) => {
  if ("altText" in f2 || "flipRtl" in f2) {
    return /flag/i.test(f2.altText || "") ? "깃발" : "";
  }
  try {
    const s = f2.getText();
    return s && String(s).trim() ? String(s).trim() : "";
  } catch (e) {
    return "";
  }
};
var valueText = (b) => {
  const parts = [];
  for (const input of b.inputList) {
    for (const f2 of input.fieldRow) parts.push(fieldText(f2));
    const c = input.connection && input.connection.targetBlock();
    if (c) parts.push(c.isShadow() ? valueText(c) : `(${valueText(c)})`);
  }
  return parts.filter(Boolean).join(" ");
};
var isHat = (b) => !b.previousConnection && Boolean(b.nextConnection) || b.type === "procedures_definition";
var blocksToText = (ws) => {
  const lines = [];
  const emit = (b, depth, tokens) => {
    const text3 = tokens.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    if (text3) lines.push({ n: lines.length + 1, id: b.id, depth, text: text3 });
  };
  const walk = (b, depth) => {
    for (; b; b = b.getNextBlock()) {
      let tokens = [];
      let first = true;
      for (const input of b.inputList) {
        for (const f2 of input.fieldRow) tokens.push(fieldText(f2));
        const c = input.connection && input.connection.targetBlock();
        if (input.type === STATEMENT) {
          emit(b, depth, tokens);
          tokens = [];
          first = false;
          walk(c, depth + 1);
        } else if (c) {
          tokens.push(c.isShadow() ? `[${valueText(c)}]` : `(${valueText(c)})`);
        }
      }
      if (first || tokens.some(Boolean)) emit(b, depth, tokens);
    }
  };
  for (const b of ws.getTopBlocks(true).filter(isHat)) walk(b, 0);
  const text2 = lines.map((l) => `[L${l.n}] ${"  ".repeat(l.depth)}${l.text}`).join("\n");
  return { lines, text: text2 };
};
var WAITS = /^(control_wait|control_wait_until|cm550_(dxlMoveToWait|dxlPrepare|dxlTogether|motionPlayWait|motionChain|posePlay|posePlayAll|cmBuzzerMelody|dxlScan)|dmai_walk(Gait|Policy))$/;
var LOOPS = /^control_(forever|repeat_until|while)$/;
var numIn = (b, name) => {
  const c = b.getInputTargetBlock && b.getInputTargetBlock(name);
  if (!c || !c.isShadow()) return null;
  const f2 = c.inputList.flatMap((i) => i.fieldRow).find((x) => x.name);
  const v = f2 ? Number(f2.getValue()) : NaN;
  return Number.isFinite(v) ? v : null;
};
var ruleCheck = (ws, ctx) => {
  const out = [];
  const all = ws.getAllBlocks().filter((b) => !b.isShadow());
  const tops = ws.getTopBlocks(false).filter((b) => !b.isShadow());
  const hats = tops.filter(isHat);
  const floating = tops.filter((b) => !isHat(b) && b.previousConnection);
  if (!hats.length && tops.length) {
    out.push({ level: "warn", msg: "「깃발을 클릭했을 때」 같은 시작 블록이 없어요. ▶ 실행을 눌러도 아무 블록도 실행되지 않습니다.", ids: tops.map((b) => b.id) });
  }
  if (floating.length) {
    out.push({ level: "warn", msg: `시작 블록에 붙지 않은 블록 묶음이 ${floating.length}개 있어요 — 실행되지 않습니다.`, ids: floating.map((b) => b.id) });
  }
  const emptyHats = hats.filter((h) => h.type === "event_whenflagclicked" && !h.getNextBlock());
  if (emptyHats.length) out.push({ level: "warn", msg: "「깃발을 클릭했을 때」 아래에 아무 블록도 없어요.", ids: emptyHats.map((b) => b.id) });
  for (const b of all) {
    if (!LOOPS.test(b.type)) continue;
    const body = b.getInputTargetBlock("SUBSTACK");
    const inner = body ? body.getDescendants(false).filter((x) => !x.isShadow()) : [];
    const robot = inner.some((x) => /^cm550_(dxl|motion|cm(Led|Buzzer)|port(Led|Servo|Motor))/.test(x.type));
    if (robot && !inner.some((x) => WAITS.test(x.type))) {
      out.push({ level: "info", msg: "반복 안에 로봇 명령이 있는데 기다리기가 없어요. 「0.05초 기다리기」를 넣으면 로봇이 명령을 제때 받습니다.", ids: [b.id] });
    }
  }
  for (const b of all) {
    if (b.type !== "cm550_motionPlay") continue;
    const n = b.getNextBlock();
    if (n && /^cm550_motion(Play|PlayWait|Chain)$/.test(n.type)) {
      out.push({ level: "warn", msg: `「모션 ${numIn(b, "PAGE") ?? "?"}번 재생」은 끝날 때까지 기다리지 않아서, 바로 다음 모션이 앞 모션을 덮어써요. 「재생하고 끝날 때까지 기다리기」 블록으로 바꾸세요.`, ids: [b.id, n.id] });
    }
  }
  const m = currentMotions();
  const known = new Set(m.calls.map((c) => c.index));
  const unknown = [];
  for (const b of all) {
    if (!/^cm550_motion(Play|PlayWait)$/.test(b.type)) continue;
    const v = numIn(b, "PAGE");
    if (v !== null && !known.has(v)) unknown.push([v, b.id]);
  }
  if (unknown.length) {
    out.push({ level: "info", msg: `모션 ${[...new Set(unknown.map((u) => u[0]))].join(", ")}번은 ${isBuiltIn() ? "MAX-E1 공식 예제 모션" : "열어 둔 모션 파일"}에 없어요. 실제 로봇은 CM-550에 그 번호의 모션이 있어야 움직이고, 가상 로봇은 움직이지 않습니다 (3D 탭의 모션 목록 참고).`, ids: unknown.map((u) => u[1]) });
  }
  const dev = ctx.device();
  const ids = dev.connected ? new Set(dev.motors.map((x) => x.id)) : null;
  if (ids && ids.size) {
    const missing = /* @__PURE__ */ new Map();
    for (const b of all) {
      if (!b.type.startsWith("cm550_dxl")) continue;
      for (const name of ["ID", "ID1", "ID2"]) {
        const v = numIn(b, name);
        if (v !== null && v !== 254 && !ids.has(v)) missing.set(v, [...missing.get(v) || [], b.id]);
      }
    }
    if (missing.size) {
      out.push({ level: "warn", msg: `다이나믹셀 ID ${[...missing.keys()].join(", ")}번은 연결된 로봇에 없어요 (찾은 ID: ${[...ids].sort((a, b) => a - b).join(", ")}). 모니터 탭에서 ID를 확인하세요.`, ids: [...missing.values()].flat() });
    }
  }
  const robotBlocks = all.filter((b) => b.type.startsWith("cm550_") || b.type.startsWith("dmai_walk"));
  if (robotBlocks.length && !dev.connected) {
    out.push({ level: "info", msg: "로봇이 연결되어 있지 않아요. 위의 「USB 연결」·「블루투스 연결」 또는 「가상 로봇」을 먼저 누르세요.", ids: [] });
  }
  const err = ctx.lastError();
  if (err) out.push({ level: "error", msg: `마지막 오류 — ${err}`, ids: [] });
  return out;
};
var FACTS = `Facts about this platform (trust these):
- "Dynamic Makers" is a Scratch-style block editor for the ROBOTIS CM-550 controller and DYNAMIXEL motors (XL430, 2XL430). The listing shows each block as one line [Ln]; numbers in [ ] are values typed into the block.
- Motor positions are degrees 0-360; 180 is the centre (MAX-E1 straight standing pose). Which way + turns depends on how the motor is mounted.
- MAX-E1 humanoid: 12 joints, IDs 1-4 arms, 5-12 legs. Motion numbers are motion pages stored in the CM-550 (101 = stand straight, 107 = sit, 108 = wave hello, 150 → 152 → 154 = walk forward start / repeat / end).
- "모션 N번 재생" starts the motion and does NOT wait: the next block runs at once, and another motion block right after replaces it. "재생하고 끝날 때까지 기다리기" waits. A motion starts from the robot's current pose, so playing the pose it is already in shows no movement.
- Walking chains start → repeat → end pages without a pause ("모션 [150] 시작 → [152] 반복 → [154] 끝" block).
- "모든 다이나믹셀 준비하기" clears motor errors (e.g. overload) by rebooting and moves every joint to 180°.
- Loops that send motor commands should contain a short wait (0.05 s), otherwise the bus floods.
- Wheel mode (velocity) and joint mode (position) are different; position blocks do nothing on a motor in wheel mode.
- The 3D tab has a MuJoCo virtual MAX-E1; the "가상 로봇" button tests programs without a robot.`;
var systemPrompt = () => `You are a friendly, patient coding tutor for children (age 9-15) using the "Dynamic Makers" robot block editor.
Always answer in Korean.
Rules:
- Be short: at most 5 short sentences or a short bullet list.
- When you talk about a block, cite its line like [L4] (exactly this format).
- Explain WHY, then say which block to change and how, using the block words from the listing.
- Do not write a whole program. Do not invent blocks or functions. If you are not sure, say so.
${FACTS}`;
var contextText = (ws, rules, ctx) => {
  const { text: text2 } = blocksToText(ws);
  const dev = ctx.device();
  const parts = [
    `Robot: ${dev.connected ? `${ctx.robotLabel()} — DYNAMIXEL IDs ${dev.motors.map((x) => x.id).join(", ") || "(not scanned)"}` : "not connected"}`,
    `Block program:
${text2 || "(empty)"}`
  ];
  const nums = /* @__PURE__ */ new Set();
  for (const b of ws.getAllBlocks()) {
    if (!b.isShadow() && /^cm550_motion(Play|PlayWait|Chain)$/.test(b.type)) {
      for (const name of ["PAGE", "START", "LOOP", "END"]) {
        const v = numIn(b, name);
        if (v !== null) nums.add(v);
      }
    }
  }
  const notes = [...nums].map((n) => [n, motionNote(n)]).filter(([, x]) => x.title);
  if (notes.length && isBuiltIn()) parts.push(`Motions used (MAX-E1 official examples):
${notes.map(([n, x]) => `- ${n} ${x.title}: ${x.desc}`).join("\n")}`);
  const code = ctx.code();
  parts.push(`Generated Python (for reference):
${code.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).slice(0, 45).join("\n")}`);
  if (rules.length) parts.push(`Automatic checks found:
${rules.map((r) => `- ${r.msg}`).join("\n")}`);
  const err = ctx.lastError();
  if (err) parts.push(`Last error: ${err}`);
  return parts.join("\n\n");
};
var Chrome = {
  key: "chrome",
  opts() {
    return { expectedInputs: [{ type: "text", languages: ["en", LANG] }], expectedOutputs: [{ type: "text", languages: [LANG] }] };
  },
  async state() {
    if (!("LanguageModel" in self)) return { ok: false, why: "chromeNo" };
    try {
      const a = await self.LanguageModel.availability(this.opts());
      if (a === "unavailable") return { ok: false, why: "chromeNoLang" };
      return { ok: true, installed: a === "available", a };
    } catch (e) {
      return { ok: false, why: "chromeNoLang" };
    }
  },
  async load(progress) {
    this.base = await self.LanguageModel.create({
      ...this.opts(),
      initialPrompts: [{ role: "system", content: systemPrompt() }],
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => progress(Math.round((e.loaded || 0) * 100)));
      }
    });
  },
  async *ask(user) {
    const s = await this.base.clone();
    let prev = "";
    for await (const chunk of s.promptStreaming(user)) {
      const piece = chunk.startsWith(prev) && prev ? chunk.slice(prev.length) : chunk;
      prev = chunk.startsWith(prev) ? chunk : prev + chunk;
      yield piece;
    }
    if (s.destroy) s.destroy();
  }
};
var Open = {
  key: "webllm",
  async gpu() {
    if (!navigator.gpu) return null;
    try {
      const a = await navigator.gpu.requestAdapter();
      return a ? { f16: a.features.has("shader-f16") } : null;
    } catch (e) {
      return null;
    }
  },
  async lib() {
    this._lib = this._lib || await import(
      /* webpackIgnore: true */
      webllmUrl()
    );
    return this._lib;
  },
  async modelId(size) {
    const g = await this.gpu();
    return g ? MODELS[size][g.f16 ? "f16" : "f32"] : null;
  },
  async installed(size) {
    const id = await this.modelId(size);
    if (!id) return false;
    try {
      return await (await this.lib()).hasModelInCache(id);
    } catch (e) {
      return false;
    }
  },
  async load(size, progress) {
    const id = await this.modelId(size);
    const lib = await this.lib();
    if (this.engine && this.id === id) return;
    if (this.engine && this.engine.unload) this.engine.unload();
    this.engine = await lib.CreateMLCEngine(id, {
      initProgressCallback: (r) => progress(Math.round((r.progress || 0) * 100), r.text)
    });
    this.id = id;
  },
  async remove(size) {
    const id = await this.modelId(size);
    if (id) await (await this.lib()).deleteModelAllInfoInCache(id);
    if (this.id === id) {
      if (this.engine && this.engine.unload) this.engine.unload();
      this.engine = null;
      this.id = null;
    }
  },
  async *ask(user) {
    const stream = await this.engine.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt() }, { role: "user", content: user }],
      stream: true,
      temperature: 0.3,
      max_tokens: 450
    });
    for await (const c of stream) yield c.choices && c.choices[0] && c.choices[0].delta && c.choices[0].delta.content || "";
  }
};
var initTutor = (ctx) => {
  const { workspace: workspace2, drawer, button: btn } = ctx;
  let st = { open: false, engine: "", size: "small" };
  try {
    st = { ...st, ...JSON.parse(localStorage.getItem(STORE) || "{}") };
  } catch (e) {
  }
  const keep = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify(st));
    } catch (e) {
    }
  };
  let active = null;
  let busy = false;
  drawer.innerHTML = `
        <div class="tt-head"><b>🤖 ${T.title}</b><span class="tt-status"></span><button type="button" class="tt-x" aria-label="${T.close}">✕</button></div>
        <div class="tt-setup"></div>
        <div class="tt-actions">
            <button type="button" data-q="check">${T.check}</button>
            <button type="button" data-q="error">${T.error}</button>
            <button type="button" data-q="hint">${T.hint}</button>
        </div>
        <div class="tt-log" aria-live="polite"></div>
        <form class="tt-ask"><input type="text" maxlength="300" placeholder="${esc2(T.ask)}"><button type="submit" class="primary">${T.send}</button></form>
        <p class="tt-note">${T.privacy}</p>`;
  const $2 = (s) => drawer.querySelector(s);
  const log2 = $2(".tt-log");
  const setOpen = (on) => {
    st.open = on;
    keep();
    drawer.hidden = !on;
    document.body.classList.toggle("tutor-open", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) renderSetup();
    if (ctx.onToggle) ctx.onToggle(on);
  };
  btn.addEventListener("click", () => setOpen(drawer.hidden));
  $2(".tt-x").addEventListener("click", () => setOpen(false));
  let glowT = 0;
  let glowing = [];
  const unglow = () => {
    for (const b of glowing) {
      const root = b.getSvgRoot && b.getSvgRoot();
      if (root) root.classList.remove("dm-glow");
    }
    glowing = [];
  };
  const glow = (ids) => {
    clearTimeout(glowT);
    unglow();
    glowing = ids.map((id) => workspace2.getBlockById(id)).filter(Boolean);
    for (const b of glowing) b.getSvgRoot().classList.add("dm-glow");
    if (glowing[0] && workspace2.centerOnBlock) workspace2.centerOnBlock(glowing[0].id);
    glowT = setTimeout(unglow, 8e3);
  };
  let lineMap = [];
  log2.addEventListener("click", (e) => {
    const a = e.target.closest("[data-ids]");
    if (!a) return;
    e.preventDefault();
    glow(a.dataset.ids.split(",").filter(Boolean));
  });
  const linkify = (s) => esc2(s).replace(/\[L(\d+)(?:\s*[-–~]\s*L?(\d+))?\]/g, (m, a, b) => {
    const from = Number(a);
    const to = Number(b || a);
    const ids = lineMap.filter((l) => l.n >= from && l.n <= to).map((l) => l.id);
    return ids.length ? `<a href="#" class="tt-ln" data-ids="${ids.join(",")}">${b ? `${a}–${b}` : a}</a>` : m;
  }).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  const addMsg = (kind, html) => {
    const d = document.createElement("div");
    d.className = `tt-msg ${kind}`;
    d.innerHTML = html;
    log2.appendChild(d);
    log2.scrollTop = log2.scrollHeight;
    return d;
  };
  const renderSetup = async () => {
    const box = $2(".tt-setup");
    const chrome = await Chrome.state();
    const gpu = await Open.gpu();
    const sizes = gpu ? await Promise.all(["small", "large"].map(async (k) => [k, await Open.installed(k)])) : [];
    const name = active ? active === Chrome ? T.chrome : T[st.size] : "";
    $2(".tt-status").textContent = active ? T.ready(name) : "";
    box.innerHTML = `
            ${active ? "" : `<p class="tt-none">${T.none}</p>`}
            <details class="tt-eng" ${active ? "" : "open"}>
                <summary>${T.setup}</summary>
                <div class="tt-opt">
                    <b>${T.webllm}</b><small>${T.webllmDesc}</small>
                    ${gpu ? sizes.map(([k, ok]) => `<div class="tt-row"><span>${T[k]}</span>
                        ${ok ? `<em>${T.installed}</em><button type="button" data-use="webllm:${k}">${T.use}</button><button type="button" data-rm="${k}" title="${T.remove}">🗑</button>` : `<button type="button" class="primary" data-use="webllm:${k}">${T.install}</button>`}</div>`).join("") : `<small class="tt-bad">${T.noGpu}</small>`}
                </div>
                <div class="tt-opt">
                    <b>${T.chrome}</b><small>${T.chromeDesc}</small>
                    ${chrome.ok ? `<div class="tt-row"><span>Gemini Nano</span>${chrome.installed ? `<em>${T.installed}</em>` : ""}
                        <button type="button" class="${chrome.installed ? "" : "primary"}" data-use="chrome">${chrome.installed ? T.use : T.install}</button></div>` : `<small class="tt-bad">${T[chrome.why]}</small>`}
                </div>
                <div class="tt-prog" hidden><i></i><span></span></div>
                <small>${T.needNet}</small>
            </details>`;
  };
  $2(".tt-setup").addEventListener("click", async (e) => {
    const u = e.target.closest("[data-use]");
    const r = e.target.closest("[data-rm]");
    if (r) {
      await Open.remove(r.dataset.rm);
      if (active === Open && st.size === r.dataset.rm) active = null;
      return renderSetup();
    }
    if (!u || busy) return;
    const use = u.dataset.use;
    const prog = $2(".tt-prog");
    const bar = (p, txt) => {
      prog.hidden = false;
      prog.querySelector("i").style.width = `${p}%`;
      prog.querySelector("span").textContent = T.installing(p) + (txt ? ` · ${txt.slice(0, 60)}` : "");
    };
    busy = true;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {
    });
    try {
      if (use === "chrome") {
        await Chrome.load(bar);
        active = Chrome;
        st.engine = "chrome";
      } else {
        st.size = use.split(":")[1];
        await Open.load(st.size, bar);
        active = Open;
        st.engine = "webllm";
      }
      keep();
      ctx.log(`🤖 AI 튜터 ${T.ready(use === "chrome" ? T.chrome : T[st.size])}`, "ok");
    } catch (err) {
      addMsg("err", esc2(T.failed(err.message || err)));
    } finally {
      busy = false;
      renderSetup();
    }
  });
  const restore = async () => {
    try {
      if (st.engine === "webllm" && await Open.installed(st.size)) {
        $2(".tt-status").textContent = T.loading;
        await Open.load(st.size, () => {
        });
        active = Open;
      } else if (st.engine === "chrome" && (await Chrome.state()).installed) {
        await Chrome.load(() => {
        });
        active = Chrome;
      }
    } catch (e) {
      active = null;
    }
    renderSetup();
  };
  const QUESTION = {
    check: "Check my block program for mistakes. Explain the most important problem first and which block to change.",
    error: "My program stopped with the error shown below. Explain in simple words what it means and how to fix it.",
    hint: "Do not solve it for me. Give me one hint about what to try or improve next in my block program."
  };
  const ask = async (kind, free) => {
    if (busy) return;
    const rules = ruleCheck(workspace2, ctx);
    lineMap = blocksToText(workspace2).lines;
    addMsg("me", esc2(kind ? T[kind] : free));
    if (kind === "check" || kind === "error") {
      const shown = kind === "error" ? rules.filter((r) => r.level === "error") : rules;
      if (kind === "error" && !shown.length) {
        addMsg("rule", esc2(T.noError));
        return;
      }
      addMsg("rule", `<b>${T.rules}</b><br>${shown.length ? shown.map((r) => `<a href="#" class="tt-rule lv-${r.level}" data-ids="${r.ids.join(",")}">${r.level === "error" ? "⛔" : r.level === "warn" ? "⚠" : "ℹ️"} ${esc2(r.msg)}</a>`).join("<br>") : esc2(T.noIssue)}`);
    }
    if (!active) {
      if (!kind || kind === "hint") addMsg("sys", esc2(T.none));
      return;
    }
    busy = true;
    const out = addMsg("ai", `<span class="tt-dots">${T.thinking}</span>`);
    let txt = "";
    try {
      const user = `${kind ? QUESTION[kind] : `Question: ${free}`}

${contextText(workspace2, rules, ctx)}`;
      for await (const piece of active.ask(user)) {
        txt += piece;
        out.innerHTML = linkify(txt.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim()) || `<span class="tt-dots">${T.thinking}</span>`;
        log2.scrollTop = log2.scrollHeight;
      }
    } catch (err) {
      out.innerHTML = esc2(T.failed(err.message || err));
      out.classList.add("err");
    } finally {
      busy = false;
    }
  };
  $2(".tt-actions").addEventListener("click", (e) => {
    const q = e.target.closest("[data-q]");
    if (q) ask(q.dataset.q);
  });
  $2(".tt-ask").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $2(".tt-ask input");
    const q = inp.value.trim();
    if (!q) return;
    inp.value = "";
    ask(null, q);
  });
  drawer.hidden = !st.open;
  document.body.classList.toggle("tutor-open", st.open);
  btn.setAttribute("aria-pressed", st.open ? "true" : "false");
  if (st.engine) restore();
  else if (st.open) renderSetup();
  return { open: () => setOpen(true), ask, ruleCheck: () => ruleCheck(workspace2, ctx), blocksToText: () => blocksToText(workspace2) };
};

// src/main.js
var $ = (id) => document.getElementById(id);
var log = (text2, kind = "out") => {
  const box = $("console-lines");
  const line = document.createElement("div");
  line.className = `line ${kind}`;
  const d = /* @__PURE__ */ new Date();
  const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  line.innerHTML = `<span class="t">${time}</span>`;
  line.append(document.createTextNode(String(text2)));
  box.append(line);
  while (box.childElementCount > 500) box.firstChild.remove();
  box.scrollTop = box.scrollHeight;
};
var VMClass = window.VirtualMachine && (window.VirtualMachine.default || window.VirtualMachine);
var vm = new VMClass();
window.dynamicmakers = { vm, ScratchBlocks: ScratchBlocks2 };
var theme = new ScratchBlocks2.Theme("dynamicmakers", blockColors);
installMediaRewriter();
var workspaceOptions = {
  media: MEDIA_PREFIX,
  theme,
  scratchTheme: "classic",
  zoom: { controls: true, wheel: true, pinch: true, startScale: 0.75 },
  move: { wheel: true },
  grid: { spacing: 40, length: 2, colour: "#e1e7f0" },
  comments: true,
  collapse: false,
  sounds: false,
  trashcan: false,
  modalInputs: false
};
ScratchBlocks2.ScratchMsgs.setLocale("ko");
var promptHandler = makePromptHandler(vm);
ScratchBlocks2.dialog.setPrompt(promptHandler);
ScratchBlocks2.ScratchVariables.setPromptHandler(promptHandler);
var robotXML = {};
var restyleMenuToParent = (type) => {
  const def = ScratchBlocks2.Blocks[type];
  if (!def || def.__dbWrapped) return;
  const init = def.init;
  def.init = function() {
    init.call(this);
    const setParent = this.setParent;
    this.setParent = function(parent) {
      setParent.call(this, parent);
      const styleName = parent && parent.getStyleName && parent.getStyleName();
      if (styleName && styleName.startsWith("db_") && this.getStyleName() !== styleName) {
        this.setStyle(styleName);
      }
    };
  };
  def.__dbWrapped = true;
};
var definedExtensions = /* @__PURE__ */ new Set();
var defineRobotBlocks = (categoryInfo) => {
  if (!categoryInfo || categoryInfo.id !== "cm550" && categoryInfo.id !== "dmai") return;
  if (definedExtensions.has(categoryInfo.id)) {
    for (const b of categoryInfo.blocks || []) if (b.info && b.info.opcode) robotXML[b.info.opcode] = b.xml;
    return;
  }
  definedExtensions.add(categoryInfo.id);
  const json = [];
  for (const menu of categoryInfo.menus || []) {
    if (menu.json) json.push(menu.json);
  }
  for (const b of categoryInfo.blocks || []) {
    if (!b.json || !b.info || !b.info.opcode) continue;
    b.json.style = OPCODE_STYLE[b.info.opcode] || "db_advanced";
    json.push(b.json);
    robotXML[b.info.opcode] = b.xml;
  }
  ScratchBlocks2.defineBlocksWithJsonArray(json);
  for (const menu of categoryInfo.menus || []) if (menu.json) restyleMenuToParent(menu.json.type);
  const styles = Object.assign({ cm550: ROBOT_STYLES.db_dxl, dmai: ROBOT_STYLES.db_ai }, ROBOT_STYLES);
  for (const [name, s] of Object.entries(styles)) {
    theme.setBlockStyle(name, s);
    theme.setBlockStyle(`${name}_selected`, {
      colourPrimary: s.colourQuaternary,
      colourSecondary: s.colourQuaternary,
      colourTertiary: s.colourQuaternary,
      colourQuaternary: s.colourQuaternary
    });
  }
};
vm.on("EXTENSION_ADDED", defineRobotBlocks);
vm.on("BLOCKSINFO_UPDATE", defineRobotBlocks);
var CM550Extension = (0, import_extension.createExtension)({
  ArgumentType: window.VirtualMachine.ArgumentType || VMClass.ArgumentType,
  BlockType: window.VirtualMachine.BlockType || VMClass.BlockType,
  formatMessage: (msg) => msg.default
});
var ext = new CM550Extension(vm.runtime);
var lastRobotError = "";
{
  let lastMsg = "";
  let lastAt = 0;
  ext.onError = (message) => {
    const now = Date.now();
    if (message === lastMsg && now - lastAt < 3e3) return;
    lastMsg = message;
    lastAt = now;
    log(`⚠ ${message}`, "err");
    lastRobotError = message;
  };
  ext.onInfo = (message) => log(message, "warn");
}
vm.runtime.on("PROJECT_START", () => {
  ext.device.prepared = false;
  lastRobotError = "";
});
{
  const em = vm.extensionManager;
  const serviceName = em._registerInternalExtension(ext);
  em._loadedExtensions.set("cm550", serviceName);
}
var poseTracker = new PoseTracker();
var simStore = { gait: null, policy: null };
var simPanel = null;
var walker = new Walker({
  device: ext.device,
  getJointMap: () => simPanel ? simPanel.jointMap : MAXE1_JOINT_MAP,
  log: (t, k) => log(t, k)
});
var aiEngine = new AIEngine({ device: ext.device, log: (t, k) => log(t, k), tracker: poseTracker });
{
  const AIExt = createAIExtension({
    ArgumentType: window.VirtualMachine.ArgumentType || VMClass.ArgumentType,
    BlockType: window.VirtualMachine.BlockType || VMClass.BlockType
  }, aiEngine, {
    log: (t, k) => log(t, k),
    isRunning: () => document.body.classList.contains("running"),
    tracker: poseTracker,
    device: ext.device,
    walker,
    simStore
  });
  const em = vm.extensionManager;
  const serviceName = em._registerInternalExtension(new AIExt(vm.runtime));
  em._loadedExtensions.set(AI_EXTENSION_ID, serviceName);
}
var workspace = ScratchBlocks2.inject($("blocks"), Object.assign({ toolbox: makeToolbox(robotXML) }, workspaceOptions));
window.dynamicmakers.workspace = workspace;
var refreshMotorLabels = () => {
  for (const block of workspace.getAllBlocks(false)) {
    for (const input of block.inputList) {
      for (const field of input.fieldRow) {
        if (!(field instanceof ScratchBlocks2.FieldDropdown) || !(block.type === "cm550_menu_dxlId" || field.name === "MODULE")) continue;
        const value = field.getValue();
        const option = field.getOptions(false).find((o) => o[1] === value);
        if (option) {
          field.selectedOption = option;
          field.forceRerender();
        }
      }
    }
  }
};
workspace.registerToolboxCategoryCallback("VARIABLE", ScratchBlocks2.ScratchVariables.getVariablesCategory);
workspace.registerToolboxCategoryCallback("PROCEDURE", ScratchBlocks2.ScratchProcedures.getProceduresCategory);
workspace.getToolbox().forceRerender();
setTimeout(() => fitFlyoutSoon(), 0);
var FLYOUT_MIN = 250;
var flyoutWidth = FLYOUT_MIN;
var fitFlyout = () => {
  const flyout = workspace.getFlyout();
  const fws = flyout && flyout.getWorkspace();
  if (!fws) return;
  let right = 0;
  for (const b of fws.getTopBlocks(false)) right = Math.max(right, b.getBoundingRectangle().right);
  const cap = Math.max(FLYOUT_MIN, Math.round(($("blocks").clientWidth - 60) * 0.55));
  const want = Math.max(FLYOUT_MIN, Math.min(cap, Math.ceil(right * fws.scale + 20)));
  if (want === flyoutWidth && flyout.getWidth() === want) return;
  flyoutWidth = want;
  flyout.getWidth = () => flyoutWidth;
  if (flyout.width_ !== void 0) flyout.width_ = flyoutWidth;
  if (flyout.position) flyout.position();
  resizeBlocks();
};
var fitTimer = null;
var fitFlyoutSoon = () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(() => {
    try {
      fitFlyout();
    } catch (e) {
      console.warn("[flyout] fit failed:", e);
    }
  }, 150);
};
window.addEventListener("resize", fitFlyoutSoon);
var refreshToolbox = () => {
  try {
    workspace.updateToolbox(makeToolbox(robotXML, { motors: ext.device.motors, desc: ext.device.motorDesc }));
    workspace.getToolbox().forceRerender();
    fitFlyoutSoon();
  } catch (e) {
    console.warn("[toolbox] refresh failed:", e);
  }
};
var toolboxTimer = null;
var scheduleToolboxRefresh = () => {
  clearTimeout(toolboxTimer);
  toolboxTimer = setTimeout(() => {
    if (workspace.isDragging && workspace.isDragging()) scheduleToolboxRefresh();
    else refreshToolbox();
  }, workspace.isDragging && workspace.isDragging() ? 300 : 0);
};
ScratchBlocks2.ScratchProcedures.externalProcedureDefCallback = makeProcedureEditor(workspaceOptions, () => {
  scheduleToolboxRefresh();
});
var E = ScratchBlocks2.Events;
workspace.addChangeListener((event) => {
  if (event.type === E.VAR_CREATE || event.type === E.VAR_RENAME || event.type === E.VAR_DELETE || event.type === E.BLOCK_DELETE && event.oldJson && event.oldJson.type === "procedures_definition" || event.type === E.BLOCK_CREATE && event.json && event.json.type === "procedures_definition" && !event.recordUndo) {
    scheduleToolboxRefresh();
  }
});
workspace.addChangeListener(vm.blockListener);
workspace.getFlyout().getWorkspace().addChangeListener(vm.flyoutBlockListener);
vm.on("workspaceUpdate", (data) => {
  try {
    E.disable();
    const dom = ScratchBlocks2.utils.xml.textToDom(data.xml);
    ScratchBlocks2.clearWorkspaceAndLoadFromXml(dom, workspace);
  } catch (e) {
    log(`블록을 불러오는 중 문제가 있었습니다: ${e.message}`, "err");
  } finally {
    E.enable();
  }
  workspace.clearUndo();
  scheduleToolboxRefresh();
  if (typeof teach !== "undefined") setTimeout(() => teach.render());
});
vm.on("SCRIPT_GLOW_ON", (d) => ScratchBlocks2.glowStack(d.id, true));
vm.on("SCRIPT_GLOW_OFF", (d) => ScratchBlocks2.glowStack(d.id, false));
vm.on("VISUAL_REPORT", (d) => ScratchBlocks2.reportValue(d.id, d.value));
var resizeBlocks = () => {
  if (ScratchBlocks2.svgResize) ScratchBlocks2.svgResize(workspace);
  else window.dispatchEvent(new Event("resize"));
};
var python = (0, import_python_panel_dom.mountPythonPanel)(vm, { host: $("python"), accent: BRAND, onToggle: () => setTimeout(resizeBlocks) });
window.dynamicmakers.tutor = initTutor({
  workspace,
  button: $("btn-tutor"),
  drawer: $("tutor-drawer"),
  code: () => python.getCode(),
  device: () => ext.device,
  robotLabel: () => {
    const tr = ext.device.transport;
    if (tr instanceof import_sim_robot.SimTransport) return tr.physics ? "3D 가상 로봇 (MAX-E1, MuJoCo)" : "가상 로봇";
    return "CM-550";
  },
  lastError: () => lastRobotError,
  log
});
ext.device.onMotorsChange = (motors, desc) => {
  refreshMotorLabels();
  scheduleToolboxRefresh();
  if (typeof monitor !== "undefined") monitor.renderMotors();
  if (typeof teach !== "undefined") teach.render();
  if (!motors.length) return;
  const counts = {};
  for (const m of motors) {
    const kind = desc.labels[m.id].replace(/ [AB]축$/, "");
    counts[kind] = (counts[kind] || 0) + 1;
  }
  log(`다이나믹셀 ${motors.length}개 인식: ${Object.entries(counts).map(([k, v]) => `${k} ${v}개`).join(", ")}` + (desc.pairs.length ? ` · 2축 모듈 ${desc.pairs.length}개 (A/B축 자동 짝)` : ""), "ok");
  for (const w of desc.warnings) log(`⚠ ${w}`, "err");
};
var monitor = new Monitor({
  host: $("monitor"),
  device: ext.device,
  isRunning: () => document.body.classList.contains("running"),
  log: (text2, kind) => log(text2, kind)
});
ext.onCreateList = (name, id) => {
  const map = workspace.getVariableMap ? workspace.getVariableMap() : null;
  if (map && map.createVariable) map.createVariable(name, "list", id);
  else workspace.createVariable(name, "list", id);
};
var addPoseScript = (numbers, seconds) => {
  const n = (v) => `<shadow type="math_number"><field name="NUM">${v}</field></shadow>`;
  let inner = "";
  for (let i = numbers.length - 1; i >= 0; i--) {
    inner = `<block type="cm550_posePlay"><value name="N">${n(numbers[i])}</value><value name="SECS">${n(seconds)}</value>${inner ? `<next>${inner}</next>` : ""}</block>`;
  }
  let x = 40;
  let y = 40;
  try {
    const view = workspace.getMetricsManager().getViewMetrics(true);
    x = view.left + 40;
    y = view.top + 40;
    if (workspace.getTopBlocks(false).length) {
      const box = workspace.getBlocksBoundingBox();
      x = box.left;
      y = box.bottom + 48;
    }
  } catch (e) {
  }
  const xml = `<xml><block type="event_whenflagclicked" x="${Math.round(x)}" y="${Math.round(y)}"><next>${inner}</next></block></xml>`;
  const dom = ScratchBlocks2.utils.xml.textToDom(xml);
  const ids = ScratchBlocks2.Xml.domToWorkspace(dom, workspace);
  if (ids && ids[0]) {
    const top = workspace.getBlockById(ids[0]);
    if (top && top.select) top.select();
    if (top && workspace.centerOnBlock) workspace.centerOnBlock(top.id);
  }
};
var teach = new TeachPanel({
  host: $("teach"),
  ext,
  log: (text2, kind) => log(text2, kind),
  isRunning: () => document.body.classList.contains("running"),
  addScript: addPoseScript
});
ext.onPosesChange = () => teach.render();
var addAIScript = (kinds) => {
  const hat = robotXML.aiWhen || "";
  const shadow = /<shadow type="([^"]+)"><field name="([^"]+)">/.exec(hat);
  if (!shadow) return;
  const esc3 = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let x = 40;
  let y = 40;
  try {
    if (workspace.getTopBlocks(false).length) {
      const box = workspace.getBlocksBoundingBox();
      x = box.left;
      y = box.bottom + 48;
    }
  } catch (e) {
  }
  const stacks = kinds.map((k, i) => `<block type="dmai_aiWhen" x="${Math.round(x + i * 330)}" y="${Math.round(y)}"><value name="CLASS"><shadow type="${shadow[1]}"><field name="${shadow[2]}">${esc3(k)}</field></shadow></value><next><block type="looks_say"><value name="MESSAGE"><shadow type="text"><field name="TEXT">${esc3(k)}</field></shadow></value></block></next></block>`).join("");
  ScratchBlocks2.Xml.domToWorkspace(ScratchBlocks2.utils.xml.textToDom(`<xml>${stacks}</xml>`), workspace);
  log('종류마다 "알아봤을 때 → 말하기" 블록을 넣었습니다. ▶ 실행을 누르고 AI에게 보여 주세요.', "ok");
};
var kindsTimer = null;
var refreshAIKinds = () => {
  clearTimeout(kindsTimer);
  kindsTimer = setTimeout(() => {
    try {
      vm.extensionManager.refreshBlocks();
    } catch (e) {
    }
    scheduleToolboxRefresh();
    scheduleAutosave();
  }, 200);
};
var aiPanel = new AIPanel({
  host: $("ai"),
  engine: aiEngine,
  log: (text2, kind) => log(text2, kind),
  onKindsChange: refreshAIKinds,
  addScript: addAIScript,
  addFollowScript: () => addFollowScript(),
  // eslint-disable-line no-use-before-define
  tracker: poseTracker
});
{
  let wasCollecting = -1;
  aiEngine.onUpdate((e) => {
    if (wasCollecting >= 0 && e.collecting < 0) {
      dirty = true;
      scheduleAutosave();
    }
    wasCollecting = e.collecting;
  });
}
var SKELETON = new Set(SKELETON_OPCODES.map((op) => `dmai_${op}`));
vm.on("PROJECT_RUN_START", () => {
  const t = vm.editingTarget;
  const ops = t ? Object.values(t.blocks._blocks).map((b) => b.opcode) : [];
  const usesAI = ops.some((op) => op.startsWith("dmai_ai"));
  if (usesAI && aiEngine.ready && !aiEngine.running) {
    aiEngine.start().catch((e) => log(`⚠ AI 인식을 시작할 수 없습니다: ${e.message}`, "err"));
  }
  if (ops.some((op) => SKELETON.has(op)) && !ops.includes("dmai_skelSwitch")) {
    log("몸 동작 추적을 시작합니다. 카메라 앞에 서 주세요. (처음에는 모델 준비에 몇 초 걸립니다)");
    poseTracker.acquire("blocks").catch((e) => log(`⚠ 몸 동작을 추적할 수 없습니다: ${e.message}`, "err"));
  }
});
vm.on("PROJECT_RUN_STOP", () => {
  poseTracker.release("blocks");
  if (vm.runtime.ext_dmai) vm.runtime.ext_dmai._last = {};
});
var addFollowScript = () => {
  const ids = ext.device.motors.map((m) => m.id);
  const a = ids[0] || 1;
  const b = ids[1] || 2;
  const n = (v) => `<shadow type="math_number"><field name="NUM">${v}</field></shadow>`;
  const follow = (id, joint, dir, next) => `<block type="dmai_skelFollow"><value name="ID">${n(id)}</value><field name="JOINT">${joint}</field><value name="CENTER">${n(180)}</value><field name="DIR">${dir}</field>${next ? `<next>${next}</next>` : ""}</block>`;
  let x = 40;
  let y = 40;
  try {
    if (workspace.getTopBlocks(false).length) {
      const box = workspace.getBlocksBoundingBox();
      x = box.left;
      y = box.bottom + 48;
    }
  } catch (e) {
  }
  const xml = `<xml><block type="event_whenflagclicked" x="${Math.round(x)}" y="${Math.round(y)}"><next><block type="control_forever"><statement name="SUBSTACK">` + follow(a, "rightShoulder", "1", follow(b, "leftShoulder", "-1")) + "</statement></block></next></block></xml>";
  ScratchBlocks2.Xml.domToWorkspace(ScratchBlocks2.utils.xml.textToDom(xml), workspace);
  log(`따라 하기 예시를 넣었습니다: 다이나믹셀 ${a} ← 오른쪽 어깨, ${b} ← 왼쪽 어깨. 로봇 어깨 모터의 ID·가운데 각도·방향을 맞게 바꾼 뒤 ▶ 실행하세요.`, "ok");
};
var VIEWS = ["python", "monitor", "teach", "ai", "sim"];
var showView = (view) => {
  for (const v of VIEWS) {
    const panel = $(v);
    if (panel) panel.hidden = v !== view;
    const btn = $(`view-${v}`);
    if (btn) btn.classList.toggle("active", v === view);
  }
  monitor.setVisible(view === "monitor");
  teach.setVisible(view === "teach");
  if (typeof aiPanel !== "undefined") aiPanel.setVisible(view === "ai");
  if (simPanel) simPanel.setVisible(view === "sim");
  setTimeout(resizeBlocks);
};
for (const v of VIEWS) {
  const btn = $(`view-${v}`);
  if (btn) btn.addEventListener("click", () => showView(v));
}
var runBtn = $("run");
var stopBtn = $("stop");
runBtn.addEventListener("click", () => {
  if (!ext.device.connected) log("CM-550이 연결되지 않았습니다. 로봇 블록은 동작하지 않습니다.", "warn");
  vm.greenFlag();
});
stopBtn.addEventListener("click", () => vm.stopAll());
vm.on("PROJECT_RUN_START", () => document.body.classList.add("running"));
vm.on("PROJECT_RUN_STOP", () => document.body.classList.remove("running"));
vm.runtime.on("SAY", (target, type, text2) => {
  if (text2 !== "" && text2 !== null && typeof text2 !== "undefined") log(text2);
});
var isTyping2 = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.closest && t.closest(".blocklyWidgetDiv, .blocklyDropDownDiv, .db-overlay"));
for (const type of ["keydown", "keyup"]) {
  document.addEventListener(type, (e) => {
    if (isTyping2(e.target)) return;
    vm.postIOData("keyboard", { key: e.key, isDown: type === "keydown" });
    if (e.key === " " && e.target === document.body) e.preventDefault();
  });
}
var status = $("status");
var setStatus = (state, text2) => {
  status.dataset.state = state;
  status.textContent = text2;
  $("disconnect").hidden = state !== "connected";
  $("connect-usb").hidden = state === "connected";
  $("connect-ble").hidden = state === "connected";
  $("connect-sim").hidden = state === "connected";
};
var KIND_NAME = { usb: "USB", ble: "블루투스", sim: "가상 로봇", sim3d: "3D 가상 로봇" };
var connect = async (kind, transport) => {
  setStatus("connecting", "연결 중…");
  await ext._connect(transport || (kind === "sim" ? new import_sim_robot.SimTransport((text2) => log(`🤖 ${text2}`, "sim")) : kind));
  if (ext.device.connected) {
    setStatus("connected", `${KIND_NAME[kind]} 연결됨`);
    log(kind === "sim3d" ? "3D 가상 로봇(MuJoCo)에 연결되었습니다. 블록·가르치기·AI가 모두 이 로봇으로 동작합니다." : kind === "sim" ? "가상 로봇에 연결되었습니다. 로봇이 할 동작이 이 창에 표시됩니다." : `CM-550이 ${KIND_NAME[kind]}로 연결되었습니다.`, "ok");
    if (ext.device.lastError) log(ext.device.lastError, "warn");
    monitor.onConnectionChange(true, KIND_NAME[kind]);
    teach.render();
    if (simPanel) simPanel._status();
  } else {
    setStatus("idle", "연결 안 됨");
    const msg = ext.lastError();
    if (msg && !/No port selected|User cancelled|cancel/i.test(msg)) log(`연결 실패: ${msg}`, "err");
  }
};
$("connect-usb").addEventListener("click", () => connect("usb"));
$("connect-ble").addEventListener("click", () => connect("ble"));
$("connect-sim").addEventListener("click", () => connect("sim"));
$("disconnect").addEventListener("click", () => ext.disconnect());
vm.runtime.on("PERIPHERAL_DISCONNECTED", () => {
  walker.stop();
  if (simPanel) setTimeout(() => simPanel._status());
  setStatus("idle", "연결 안 됨");
  ext.device.setMotors([]);
  monitor.onConnectionChange(false);
  teach.relaxed.clear();
  teach.render();
  log("CM-550 연결이 끊어졌습니다.", "warn");
});
var policyAllows = (feature) => {
  const policy = document.permissionsPolicy || document.featurePolicy;
  try {
    return policy ? policy.allowsFeature(feature) : true;
  } catch (e) {
    return true;
  }
};
var hwBlocked = [];
for (const [id, api, feature] of [["connect-usb", "serial", "serial"], ["connect-ble", "bluetooth", "bluetooth"]]) {
  if (!(api in navigator)) {
    $(id).disabled = true;
    $(id).title = "이 브라우저에서는 지원되지 않습니다. Chrome 또는 Edge를 사용하세요.";
    hwBlocked.push(id);
  } else if (!policyAllows(feature)) {
    $(id).disabled = true;
    $(id).title = "이 미리보기 화면에서는 USB/블루투스가 차단되어 있습니다. 앱 주소로 직접 열어 주세요.";
    hwBlocked.push(id);
  }
}
var nameInput = $("project-name");
var dirty = false;
var projectJSON = () => {
  const json = vm.toJSON();
  const ai = aiEngine.serialize();
  if (!ai && !simStore.gait && !simStore.policy) return json;
  const obj = JSON.parse(json);
  obj.dynamicmakers = {};
  if (ai) obj.dynamicmakers.ai = ai;
  if (simStore.gait) obj.dynamicmakers.gait = simStore.gait;
  if (simStore.policy) obj.dynamicmakers.policy = simStore.policy;
  return JSON.stringify(obj);
};
var takeAIData = (data) => {
  if (data instanceof ArrayBuffer) return { data, ai: null };
  let obj = data;
  if (typeof data === "string") {
    try {
      obj = JSON.parse(data);
    } catch (e) {
      return { data, ai: null };
    }
  }
  if (!obj || typeof obj !== "object") return { data, ai: null };
  const ai = obj.dynamicmakers && obj.dynamicmakers.ai;
  simStore.gait = obj.dynamicmakers && obj.dynamicmakers.gait || null;
  simStore.policy = obj.dynamicmakers && obj.dynamicmakers.policy || null;
  if (simPanel) setTimeout(() => simPanel._status());
  if (obj.dynamicmakers) {
    obj = Object.assign({}, obj);
    delete obj.dynamicmakers;
  }
  return { data: obj, ai: ai || null };
};
var loadIntoVM = async (data) => {
  try {
    await vm.loadProject(data);
  } catch (e) {
    if (data instanceof ArrayBuffer) {
      throw new Error("이 화면에서는 .sb3 파일을 열 수 없습니다. .dmk 또는 .json 파일을 사용하세요.");
    }
    const json = typeof data === "string" ? JSON.parse(data) : data;
    if (!json || !Array.isArray(json.targets)) throw e;
    await vm.deserializeProject(Object.assign({}, json, { projectVersion: 3 }), null);
    vm.runtime.handleProjectLoaded();
  }
};
var loadProject = async (data, name) => {
  vm.stopAll();
  const parts = takeAIData(data);
  await loadIntoVM(parts.data);
  aiEngine.load(parts.ai);
  refreshAIKinds();
  const robot = vm.runtime.targets.find((t) => !t.isStage) || vm.runtime.getTargetForStage();
  vm.setEditingTarget(robot.id);
  if (name !== void 0) nameInput.value = name;
  dirty = false;
  python.regenerate();
};
$("new").addEventListener("click", async () => {
  if (dirty && !await confirmDialog("새로 만들기", "지금 작업을 지우고 새로 시작할까요? 저장하지 않은 내용은 사라집니다.", "새로 만들기")) return;
  await loadProject(emptyProject(), "새 프로그램");
  log("새 프로그램을 시작했습니다.", "ok");
});
$("open").addEventListener("click", async () => {
  const file = await pickFile();
  if (!file) return;
  try {
    await loadProject(file.data, file.name);
    log(`'${file.name}' 을(를) 열었습니다.`, "ok");
  } catch (e) {
    log(`파일을 열 수 없습니다: ${e.message || e}`, "err");
  }
});
var hostDownloads = () => window.claude && typeof window.claude.use === "function" ? window.claude.use("downloads") : Promise.resolve(void 0);
var saveFile = async (base, ext2, sandboxExt, content, type) => {
  const host = await hostDownloads();
  if (host === void 0) {
    download(`${base}.${ext2}`, content, type);
    return `.${ext2}`;
  }
  if (!host) throw new Error("이 화면에서는 파일 저장을 사용할 수 없습니다. Python은 복사 버튼을 이용하세요.");
  try {
    await host.save({ filename: `${base}.${sandboxExt}`, data: content });
  } catch (e) {
    if (e && e.code === "declined") return null;
    throw new Error(e && e.message ? e.message : String(e));
  }
  return `.${sandboxExt}`;
};
var addWalkScript = (detailed = true) => {
  const n = (v) => `<shadow type="math_number"><field name="NUM">${v}</field></shadow>`;
  let x = 40;
  let y = 40;
  try {
    if (workspace.getTopBlocks(false).length) {
      const box = workspace.getBlocksBoundingBox();
      x = box.left;
      y = box.bottom + 48;
    }
  } catch (e) {
  }
  if (detailed) {
    const prog = gaitProgramXML(simPanel.gait, simPanel.jointMap, { x, y });
    ScratchBlocks2.Xml.domToWorkspace(ScratchBlocks2.utils.xml.textToDom(prog.xml), workspace);
    log(`학습한 걸음을 모터별 블록으로 넣었습니다: 한 걸음 = 자세 ${prog.frames}개(각 ${prog.dt}초), 자세마다 모터 ${simPanel.jointMap.length}개의 목표 각도. Python 탭에서 같은 코드를 볼 수 있습니다. 실제 로봇에서는 "느리게" 값을 1.5~2로 키워 시작하세요.`, "ok");
    return;
  }
  const xml = `<xml><block type="event_whenflagclicked" x="${Math.round(x)}" y="${Math.round(y)}"><next><block type="dmai_walkGait"><value name="SECS">${n(10)}</value><value name="SLOW">${n(1)}</value></block></next></block></xml>`;
  ScratchBlocks2.Xml.domToWorkspace(ScratchBlocks2.utils.xml.textToDom(xml), workspace);
  log('"학습한 걸음으로 10 초 걷기" 블록을 넣었습니다. 실제 로봇에서는 "느리게" 값을 1.5~2로 키워 시작하세요.', "ok");
};
simPanel = window.dynamicmakers.simPanel = new SimPanel({
  host: $("sim"),
  log: (t, k) => log(t, k),
  device: ext.device,
  walker,
  store: simStore,
  onStoreChange: () => scheduleAutosave(),
  makeTransport: (physics) => new import_sim_robot.SimTransport((text2) => log(`🤖 ${text2}`, "sim"), { physics }),
  connect: (transport) => connect("sim3d", transport),
  disconnect: () => ext.disconnect(),
  addWalkScript,
  insertXML: (makeXml) => {
    let x = 40;
    let y = 40;
    try {
      if (workspace.getTopBlocks(false).length) {
        const box = workspace.getBlocksBoundingBox();
        x = box.left;
        y = box.bottom + 48;
      }
    } catch (e) {
    }
    ScratchBlocks2.Xml.domToWorkspace(ScratchBlocks2.utils.xml.textToDom(makeXml(x, y)), workspace);
  },
  saveText: async (name, text2) => {
    try {
      const [base, ext2] = name.split(".");
      const done = await saveFile(base, ext2, "txt", text2, "application/xml");
      if (done) log(`${base}${done} 파일을 저장했습니다.`, "ok");
    } catch (e) {
      log(e.message, "err");
    }
  }
});
$("save").addEventListener("click", async () => {
  try {
    const ext2 = await saveFile(safeFileName(nameInput.value), "dmk", "json", projectJSON(), "application/json");
    if (!ext2) return;
    dirty = false;
    log(`프로그램을 저장했습니다 (${ext2}).`, "ok");
  } catch (e) {
    log(e.message, "err");
  }
});
$("save-py").addEventListener("click", async () => {
  try {
    const ext2 = await saveFile(safeFileName(nameInput.value), "py", "txt", python.getCode(), "text/x-python");
    if (ext2) log(`Python 코드를 저장했습니다 (${ext2}).`, "ok");
  } catch (e) {
    log(e.message, "err");
  }
});
var autosaveTimer = null;
var scheduleAutosave = () => {
  dirty = true;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveAutosave(nameInput.value, projectJSON()), 800);
};
vm.on("PROJECT_CHANGED", scheduleAutosave);
nameInput.addEventListener("input", scheduleAutosave);
window.addEventListener("beforeunload", () => saveAutosave(nameInput.value, projectJSON()));
$("console-clear").addEventListener("click", () => {
  $("console-lines").textContent = "";
});
var STORE2 = {
  get: (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : Number(v);
    } catch (e) {
      return d;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, String(v));
    } catch (e) {
    }
  }
};
var dragResize = (handle, { onMove, onEnd }) => {
  handle.addEventListener("pointerdown", (down) => {
    down.preventDefault();
    handle.setPointerCapture(down.pointerId);
    document.body.classList.add("dm-resizing");
    const move = (ev) => {
      onMove(ev, down);
      resizeBlocks();
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      document.body.classList.remove("dm-resizing");
      onEnd();
      resizeBlocks();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  });
};
{
  const MIN_H = 70;
  const maxH = () => Math.round(window.innerHeight * 0.7);
  let consoleH = Math.min(maxH(), Math.max(MIN_H, STORE2.get("dm.consoleH", 150)));
  const applyH = () => document.documentElement.style.setProperty("--console-h", `${consoleH}px`);
  applyH();
  const handle = document.createElement("div");
  handle.className = "dm-hresizer";
  handle.title = "끌어서 출력 창 높이 조절 (두 번 클릭하면 원래대로)";
  $("console").prepend(handle);
  let startH = consoleH;
  handle.addEventListener("pointerdown", () => {
    startH = consoleH;
    document.body.classList.remove("console-collapsed");
  });
  dragResize(handle, {
    onMove: (ev, down) => {
      consoleH = Math.min(maxH(), Math.max(MIN_H, startH + (down.clientY - ev.clientY)));
      applyH();
    },
    onEnd: () => STORE2.set("dm.consoleH", consoleH)
  });
  handle.addEventListener("dblclick", () => {
    consoleH = 150;
    applyH();
    STORE2.set("dm.consoleH", consoleH);
    resizeBlocks();
  });
  window.addEventListener("resize", () => {
    if (consoleH > maxH()) {
      consoleH = maxH();
      applyH();
    }
  });
}
for (const panelId of ["monitor", "teach", "ai"]) {
  const mon = $(panelId);
  let monW = STORE2.get("dm.monitorW", 0);
  const applyW = () => {
    if (monW) mon.style.width = `${monW}px`;
  };
  applyW();
  const handle = document.createElement("div");
  handle.className = "dm-vresizer";
  handle.title = "끌어서 패널 폭 조절";
  mon.prepend(handle);
  let startW = 0;
  handle.addEventListener("pointerdown", () => {
    startW = mon.getBoundingClientRect().width;
  });
  dragResize(handle, {
    onMove: (ev, down) => {
      monW = Math.round(Math.max(300, Math.min(window.innerWidth * 0.7, startW + (down.clientX - ev.clientX))));
      applyW();
    },
    onEnd: () => STORE2.set("dm.monitorW", monW)
  });
}
$("console-toggle").addEventListener("click", () => {
  document.body.classList.toggle("console-collapsed");
  setTimeout(resizeBlocks);
});
(async () => {
  vm.start();
  const saved = loadAutosave();
  try {
    if (saved && saved.project) {
      await loadProject(saved.project, saved.name || "새 프로그램");
      log("이전에 작업하던 프로그램을 불러왔습니다.", "ok");
    } else {
      await loadProject(emptyProject(), "새 프로그램");
    }
  } catch (e) {
    await loadProject(emptyProject(), "새 프로그램");
  }
  setStatus("idle", "연결 안 됨");
  if (hwBlocked.length === 2) {
    log("이 화면에서는 USB·블루투스를 쓸 수 없습니다. [가상 로봇]으로 프로그램을 시험해 보세요.", "warn");
  }
  resizeBlocks();
  document.body.classList.add("ready");
})();
