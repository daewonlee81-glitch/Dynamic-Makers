/**
 * Scratch 3.0 extension: ROBOTIS CM-550 + DYNAMIXEL (XL-330 / XL-430 / 2XL-430).
 *
 * This module is environment-neutral. `createExtension` receives the Scratch
 * primitives (ArgumentType, BlockType, formatMessage, cast) from whichever
 * host is loading it (scratch-vm built-in or TurboWarp unsandboxed).
 */
const {
    CM550Device, CM, PORT, DXL, OP_MODE, MOTION_STOP, tickToDeg, clamp, delay
} = require('./cm550');
const icons = require('./icons');
const {modelName} = require('./models');

const EXTENSION_ID = 'cm550';

// CM-550 auxiliary LED: red (91), green (92), blue (93) are on/off each,
// so together they make 7 colours.
const LED_MIX = {
    red: {name: '빨강', rgb: [1, 0, 0]},
    green: {name: '초록', rgb: [0, 1, 0]},
    blue: {name: '파랑', rgb: [0, 0, 1]},
    yellow: {name: '노랑', rgb: [1, 1, 0]},
    cyan: {name: '하늘', rgb: [0, 1, 1]},
    magenta: {name: '보라', rgb: [1, 0, 1]},
    white: {name: '흰색', rgb: [1, 1, 1]},
    off: {name: '끄기', rgb: [0, 0, 0]}
};

const createExtension = ({ArgumentType, BlockType, formatMessage, cast}) => {
    const t = (id, def, values) => formatMessage({id: `cm550.${id}`, default: def, description: id}, values);
    const num = v => {
        const n = cast ? cast.toNumber(v) : Number(v);
        return Number.isNaN(n) ? 0 : n;
    };
    const ARG_NUM = (def, menu) => Object.assign({type: ArgumentType.NUMBER, defaultValue: def}, menu ? {menu} : {});
    const ARG_STR = (def, menu) => ({type: ArgumentType.STRING, defaultValue: def, menu});

    class Scratch3CM550Blocks {
        constructor (runtime) {
            this.runtime = runtime;
            this.device = new CM550Device();
            this.device.onStateChange = connected => {
                if (runtime && runtime.emit) {
                    runtime.emit(connected ? 'PERIPHERAL_CONNECTED' : 'PERIPHERAL_DISCONNECTED');
                }
            };
            this._dxlIds = []; // ids found by the last scan
            // let host apps (DynamicBricks top bar) reach the instance directly
            if (runtime) runtime.ext_cm550 = this;
            if (runtime && runtime.on) {
                runtime.on('CM550_CONNECT', kind => this._connect(kind));
                runtime.on('PROJECT_STOP_ALL', () => this._stopAll());
            }
        }

        static get EXTENSION_ID () {
            return EXTENSION_ID;
        }

        getInfo () {
            return {
                id: EXTENSION_ID,
                name: t('name', 'CM-550'),
                color1: '#2E7CF6',
                color2: '#1F5FC4',
                color3: '#174A99',
                blockIconURI: icons.blockIconURI,
                menuIconURI: icons.menuIconURI,
                docsURI: 'https://emanual.robotis.com/docs/en/parts/controller/cm-550/',
                blocks: [
                    // ---------------- connection ----------------
                    {func: 'connectUsbButton', blockType: BlockType.BUTTON, text: t('btnUsb', 'USB로 연결하기')},
                    {func: 'connectBleButton', blockType: BlockType.BUTTON, text: t('btnBle', '블루투스로 연결하기')},
                    {
                        opcode: 'connect',
                        blockType: BlockType.COMMAND,
                        text: t('connect', 'CM-550 [KIND] 연결하기'),
                        arguments: {KIND: ARG_STR('usb', 'connKind')}
                    },
                    {opcode: 'disconnect', blockType: BlockType.COMMAND, text: t('disconnect', 'CM-550 연결 끊기')},
                    {opcode: 'isConnected', blockType: BlockType.BOOLEAN, text: t('isConnected', 'CM-550이 연결되었는가?')},
                    {
                        opcode: 'lastError',
                        blockType: BlockType.REPORTER,
                        text: t('lastError', '마지막 오류'),
                        disableMonitor: true
                    },
                    '---',
                    // ---------------- DYNAMIXEL ----------------
                    {
                        opcode: 'dxlTorque',
                        blockType: BlockType.COMMAND,
                        text: t('dxlTorque', '다이나믹셀 [ID] 토크 [ONOFF]'),
                        arguments: {ID: ARG_NUM(1, 'dxlId'), ONOFF: ARG_STR('on', 'onOff')}
                    },
                    {
                        opcode: 'dxlMoveTo',
                        blockType: BlockType.COMMAND,
                        text: t('dxlMoveTo', '다이나믹셀 [ID] 을(를) [DEG]° 로 이동 (속도 [SPEED] %)'),
                        arguments: {ID: ARG_NUM(1, 'dxlId'), DEG: ARG_NUM(180), SPEED: ARG_NUM(50)}
                    },
                    {
                        opcode: 'dxlMoveToWait',
                        blockType: BlockType.COMMAND,
                        text: t('dxlMoveToWait',
                            '다이나믹셀 [ID] 을(를) [DEG]° 로 이동하고 기다리기 (속도 [SPEED] %)'),
                        arguments: {ID: ARG_NUM(1, 'dxlId'), DEG: ARG_NUM(180), SPEED: ARG_NUM(50)}
                    },
                    {
                        opcode: 'dxlMoveTwo',
                        blockType: BlockType.COMMAND,
                        text: t('dxlMoveTwo',
                            '다이나믹셀 [ID1] 을(를) [DEG1]° , [ID2] 을(를) [DEG2]° 로 동시에 이동'),
                        arguments: {
                            ID1: ARG_NUM(1, 'dxlId'),
                            DEG1: ARG_NUM(180),
                            ID2: ARG_NUM(2, 'dxlId'),
                            DEG2: ARG_NUM(180)
                        }
                    },
                    {
                        opcode: 'dxlWheel',
                        blockType: BlockType.COMMAND,
                        text: t('dxlWheel', '다이나믹셀 [ID] 바퀴 회전 속도 [SPEED] %'),
                        arguments: {ID: ARG_NUM(1, 'dxlId'), SPEED: ARG_NUM(50)}
                    },
                    {
                        opcode: 'dxlWheelTwo',
                        blockType: BlockType.COMMAND,
                        text: t('dxlWheelTwo', '왼쪽 바퀴 [ID1] 속도 [SPEED1] % , 오른쪽 바퀴 [ID2] 속도 [SPEED2] %'),
                        arguments: {
                            ID1: ARG_NUM(1, 'dxlId'),
                            SPEED1: ARG_NUM(50),
                            ID2: ARG_NUM(2, 'dxlId'),
                            SPEED2: ARG_NUM(-50)
                        }
                    },
                    {
                        opcode: 'dxlStop',
                        blockType: BlockType.COMMAND,
                        text: t('dxlStop', '다이나믹셀 [ID] 정지'),
                        arguments: {ID: ARG_NUM(1, 'dxlId')}
                    },
                    {
                        opcode: 'dxlSetMode',
                        blockType: BlockType.COMMAND,
                        text: t('dxlSetMode', '다이나믹셀 [ID] 모드를 [MODE] 로 설정'),
                        arguments: {ID: ARG_NUM(1, 'dxlId'), MODE: ARG_STR('position', 'dxlMode')}
                    },
                    {
                        opcode: 'dxlLed',
                        blockType: BlockType.COMMAND,
                        text: t('dxlLed', '다이나믹셀 [ID] LED [ONOFF]'),
                        arguments: {ID: ARG_NUM(1, 'dxlId'), ONOFF: ARG_STR('on', 'onOff')}
                    },
                    {
                        opcode: 'dxlAllTorque',
                        blockType: BlockType.COMMAND,
                        text: t('dxlAllTorque', '모든 다이나믹셀 토크 [ONOFF]'),
                        arguments: {ONOFF: ARG_STR('on', 'onOff')}
                    },
                    {
                        opcode: 'dxlRead',
                        blockType: BlockType.REPORTER,
                        text: t('dxlRead', '다이나믹셀 [ID] 의 [PROP]'),
                        arguments: {ID: ARG_NUM(1, 'dxlId'), PROP: ARG_STR('position', 'dxlProp')}
                    },
                    {
                        opcode: 'dxlIsMoving',
                        blockType: BlockType.BOOLEAN,
                        text: t('dxlIsMoving', '다이나믹셀 [ID] 이(가) 움직이는 중인가?'),
                        arguments: {ID: ARG_NUM(1, 'dxlId')}
                    },
                    {
                        opcode: 'dxlScan',
                        blockType: BlockType.REPORTER,
                        text: t('dxlScan', '연결된 다이나믹셀 ID 목록'),
                        disableMonitor: true
                    },
                    // ---- model-specific (shown by the host only when such motors are connected)
                    {
                        opcode: 'dxlModuleMove',
                        blockType: BlockType.COMMAND,
                        text: t('dxlModuleMove', '다이나믹셀 2축 모듈 [MODULE] A축 [DEGA]° , B축 [DEGB]° 로 이동'),
                        arguments: {MODULE: ARG_STR('1,2', 'dxlModule'), DEGA: ARG_NUM(180), DEGB: ARG_NUM(180)}
                    },
                    {
                        opcode: 'dxlModuleWheels',
                        blockType: BlockType.COMMAND,
                        text: t('dxlModuleWheels', '다이나믹셀 2축 모듈 [MODULE] 바퀴 A축 [SPA] % , B축 [SPB] %'),
                        arguments: {MODULE: ARG_STR('1,2', 'dxlModule'), SPA: ARG_NUM(50), SPB: ARG_NUM(-50)}
                    },
                    {
                        opcode: 'dxlGrip',
                        blockType: BlockType.COMMAND,
                        text: t('dxlGrip', '다이나믹셀 [ID] 을(를) 힘 [FORCE] % 로 [DEG]° 까지 잡기'),
                        arguments: {ID: ARG_NUM(1, 'dxlId'), FORCE: ARG_NUM(30), DEG: ARG_NUM(180)}
                    },
                    {
                        opcode: 'dxlModelName',
                        blockType: BlockType.REPORTER,
                        text: t('dxlModelName', '다이나믹셀 [ID] 의 모델 이름'),
                        arguments: {ID: ARG_NUM(1, 'dxlId')}
                    },
                    '---',
                    // ---------------- CM-550 built-ins ----------------
                    {
                        // the auxiliary LED has red/green/blue elements (addr 91-93);
                        // mixing them gives 7 colours
                        opcode: 'cmLedColor',
                        blockType: BlockType.COMMAND,
                        text: t('cmLedColor', 'CM-550 LED 색 [COLOR] (으)로 바꾸기'),
                        arguments: {COLOR: ARG_STR('red', 'ledMix')}
                    },
                    {
                        opcode: 'cmLed',
                        blockType: BlockType.COMMAND,
                        text: t('cmLed', 'CM-550 LED [COLOR] [ONOFF]'),
                        arguments: {COLOR: ARG_STR('red', 'ledColor'), ONOFF: ARG_STR('on', 'onOff')}
                    },
                    {
                        opcode: 'cmBuzzerNote',
                        blockType: BlockType.COMMAND,
                        text: t('cmBuzzerNote', '부저로 [NOTE] 음을 [SECS] 초 동안 연주'),
                        arguments: {NOTE: ARG_NUM(24, 'note'), SECS: ARG_NUM(0.5)}
                    },
                    {
                        opcode: 'cmBuzzerMelody',
                        blockType: BlockType.COMMAND,
                        text: t('cmBuzzerMelody', '부저로 멜로디 [INDEX] 번 연주'),
                        arguments: {INDEX: ARG_NUM(0)}
                    },
                    {
                        opcode: 'cmButton',
                        blockType: BlockType.BOOLEAN,
                        text: t('cmButton', '[BUTTON] 버튼이 눌렸는가?'),
                        arguments: {BUTTON: ARG_STR('start', 'button')}
                    },
                    {
                        opcode: 'cmTilt',
                        blockType: BlockType.REPORTER,
                        text: t('cmTilt', '기울기 [AXIS] (°)'),
                        arguments: {AXIS: ARG_STR('roll', 'tiltAxis')}
                    },
                    {
                        opcode: 'cmGyro',
                        blockType: BlockType.REPORTER,
                        text: t('cmGyro', '자이로 [AXIS] (°/s)'),
                        arguments: {AXIS: ARG_STR('x', 'xyz')}
                    },
                    {
                        opcode: 'cmAccel',
                        blockType: BlockType.REPORTER,
                        text: t('cmAccel', '가속도 [AXIS] (G)'),
                        arguments: {AXIS: ARG_STR('x', 'xyz')}
                    },
                    {opcode: 'cmVoltage', blockType: BlockType.REPORTER, text: t('cmVoltage', '배터리 전압 (V)')},
                    {opcode: 'cmTemperature', blockType: BlockType.REPORTER, text: t('cmTemperature', '컨트롤러 온도 (°C)')},
                    {opcode: 'cmSoundCount', blockType: BlockType.REPORTER, text: t('cmSoundCount', '소리 감지 횟수')},
                    {opcode: 'cmSoundReset', blockType: BlockType.COMMAND, text: t('cmSoundReset', '소리 감지 횟수 초기화')},
                    {
                        opcode: 'cmDxlPower',
                        blockType: BlockType.COMMAND,
                        text: t('cmDxlPower', '다이나믹셀 전원 [ONOFF]'),
                        arguments: {ONOFF: ARG_STR('on', 'onOff')}
                    },
                    '---',
                    // ---------------- 5-pin ports ----------------
                    {
                        opcode: 'portSensor',
                        blockType: BlockType.REPORTER,
                        text: t('portSensor', '포트 [PORT] 의 [SENSOR] 값'),
                        arguments: {PORT: ARG_NUM(1, 'port5'), SENSOR: ARG_STR('ir', 'sensor')}
                    },
                    {
                        opcode: 'portTouch',
                        blockType: BlockType.BOOLEAN,
                        text: t('portTouch', '포트 [PORT] 의 터치 센서가 눌렸는가?'),
                        arguments: {PORT: ARG_NUM(1, 'port5')}
                    },
                    {
                        opcode: 'portColor',
                        blockType: BlockType.BOOLEAN,
                        text: t('portColor', '포트 [PORT] 의 컬러 센서가 [COLOR] 인가?'),
                        arguments: {PORT: ARG_NUM(1, 'port5'), COLOR: ARG_STR('red', 'colorName')}
                    },
                    {
                        opcode: 'portLed',
                        blockType: BlockType.COMMAND,
                        text: t('portLed', '포트 [PORT] LED 모듈 [STATE]'),
                        arguments: {PORT: ARG_NUM(1, 'port5'), STATE: ARG_STR('both', 'ledModule')}
                    },
                    {
                        opcode: 'portServo',
                        blockType: BlockType.COMMAND,
                        text: t('portServo', '포트 [PORT] 서보모터를 [DEG]° 로 이동'),
                        arguments: {PORT: ARG_NUM(1, 'port2'), DEG: ARG_NUM(150)}
                    },
                    {
                        opcode: 'portMotor',
                        blockType: BlockType.COMMAND,
                        text: t('portMotor', '포트 [PORT] 기어모터 속도 [SPEED] %'),
                        arguments: {PORT: ARG_NUM(1, 'port2'), SPEED: ARG_NUM(50)}
                    },
                    '---',
                    // ---------------- motion ----------------
                    {
                        opcode: 'motionPlay',
                        blockType: BlockType.COMMAND,
                        text: t('motionPlay', '모션 [PAGE] 번 재생'),
                        arguments: {PAGE: ARG_NUM(1)}
                    },
                    {
                        opcode: 'motionPlayWait',
                        blockType: BlockType.COMMAND,
                        text: t('motionPlayWait', '모션 [PAGE] 번 재생하고 끝날 때까지 기다리기'),
                        arguments: {PAGE: ARG_NUM(1)}
                    },
                    {
                        opcode: 'motionStop',
                        blockType: BlockType.COMMAND,
                        text: t('motionStop', '모션 정지 [HOW]'),
                        arguments: {HOW: ARG_STR('unit', 'motionStop')}
                    },
                    {
                        opcode: 'motionSpeed',
                        blockType: BlockType.COMMAND,
                        text: t('motionSpeed', '모션 속도를 [PERCENT] % 로 설정'),
                        arguments: {PERCENT: ARG_NUM(100)}
                    },
                    {
                        opcode: 'motionNext',
                        blockType: BlockType.COMMAND,
                        text: t('motionNext', '다음 모션 페이지를 [PAGE] 번으로 설정'),
                        arguments: {PAGE: ARG_NUM(1)}
                    },
                    {
                        opcode: 'motionIsPlaying',
                        blockType: BlockType.BOOLEAN,
                        text: t('motionIsPlaying', '모션이 재생 중인가?')
                    },
                    {opcode: 'motionCount', blockType: BlockType.REPORTER, text: t('motionCount', '저장된 모션 개수')},
                    '---',
                    // ---------------- advanced ----------------
                    {
                        opcode: 'rawWrite',
                        blockType: BlockType.COMMAND,
                        text: t('rawWrite', '장치 [ID] 주소 [ADDR] 에 [SIZE] 바이트 값 [VALUE] 쓰기'),
                        arguments: {
                            ID: ARG_NUM(200), ADDR: ARG_NUM(91), SIZE: ARG_NUM(1, 'byteSize'), VALUE: ARG_NUM(1)
                        }
                    },
                    {
                        opcode: 'rawRead',
                        blockType: BlockType.REPORTER,
                        text: t('rawRead', '장치 [ID] 주소 [ADDR] 의 [SIZE] 바이트 값'),
                        arguments: {ID: ARG_NUM(200), ADDR: ARG_NUM(89), SIZE: ARG_NUM(1, 'byteSize')}
                    }
                ],
                menus: {
                    connKind: {acceptReporters: false,
                        items: [
                            {text: t('menu.usb', 'USB'), value: 'usb'},
                            {text: t('menu.ble', '블루투스'), value: 'ble'}
                        ]},
                    onOff: {acceptReporters: true,
                        items: [
                            {text: t('menu.on', '켜기'), value: 'on'},
                            {text: t('menu.off', '끄기'), value: 'off'}
                        ]},
                    // dynamic: detected motors first, labelled with their model ("3 · 2XL430 A축")
                    dxlId: {acceptReporters: true, items: '_dxlIdMenu'},
                    dxlModule: {acceptReporters: false, items: '_dxlModuleMenu'},
                    dxlMode: {acceptReporters: false,
                        items: [
                            {text: t('menu.modePosition', '위치(관절)'), value: 'position'},
                            {text: t('menu.modeVelocity', '바퀴(연속 회전)'), value: 'velocity'},
                            {text: t('menu.modeExtended', '확장 위치(다회전)'), value: 'extended'}
                        ]},
                    dxlProp: {acceptReporters: false,
                        items: [
                            {text: t('menu.propPosition', '현재 각도 (°)'), value: 'position'},
                            {text: t('menu.propVelocity', '현재 속도 (rpm)'), value: 'velocity'},
                            {text: t('menu.propLoad', '부하 (%)'), value: 'load'},
                            {text: t('menu.propTemperature', '온도 (°C)'), value: 'temperature'},
                            {text: t('menu.propVoltage', '전압 (V)'), value: 'voltage'},
                            {text: t('menu.propModel', '모델 번호'), value: 'model'},
                            {text: t('menu.propError', '하드웨어 오류'), value: 'error'}
                        ]},
                    ledColor: {acceptReporters: false,
                        items: [
                            {text: t('menu.red', '빨강'), value: 'red'},
                            {text: t('menu.green', '초록'), value: 'green'},
                            {text: t('menu.blue', '파랑'), value: 'blue'}
                        ]},
                    ledMix: {acceptReporters: false,
                        items: Object.keys(LED_MIX).map(value => ({text: t(`menu.mix.${value}`, LED_MIX[value].name), value}))},
                    note: {acceptReporters: true, items: this._noteMenu()},
                    button: {acceptReporters: false,
                        items: [
                            {text: 'START', value: 'start'},
                            {text: 'MODE', value: 'mode'}
                        ]},
                    tiltAxis: {acceptReporters: false,
                        items: [
                            {text: t('menu.roll', '롤 (좌우)'), value: 'roll'},
                            {text: t('menu.pitch', '피치 (앞뒤)'), value: 'pitch'},
                            {text: t('menu.yaw', '요 (회전)'), value: 'yaw'}
                        ]},
                    xyz: {acceptReporters: false, items: ['x', 'y', 'z']},
                    port5: {acceptReporters: true, items: ['1', '2', '3', '4', '5']},
                    port2: {acceptReporters: true, items: ['1', '2']},
                    sensor: {acceptReporters: false,
                        items: [
                            {text: t('menu.ir', '적외선 (IR)'), value: 'ir'},
                            {text: t('menu.dms', '거리 (DMS)'), value: 'dms'},
                            {text: t('menu.touch', '터치'), value: 'touch'},
                            {text: t('menu.brightness', '밝기'), value: 'brightness'},
                            {text: t('menu.color', '컬러 (0~6)'), value: 'color'},
                            {text: t('menu.temperature', '온도'), value: 'temperature'},
                            {text: t('menu.magnet', '자석'), value: 'magnet'},
                            {text: t('menu.motion', '인체 감지'), value: 'motion'},
                            {text: t('menu.moisture', '습도'), value: 'moisture'},
                            {text: t('menu.user', '사용자 장치 (아날로그)'), value: 'user'}
                        ]},
                    colorName: {acceptReporters: false,
                        items: [
                            {text: t('menu.white', '흰색'), value: 'white'},
                            {text: t('menu.black', '검정'), value: 'black'},
                            {text: t('menu.red', '빨강'), value: 'red'},
                            {text: t('menu.green', '초록'), value: 'green'},
                            {text: t('menu.blue', '파랑'), value: 'blue'},
                            {text: t('menu.yellow', '노랑'), value: 'yellow'}
                        ]},
                    ledModule: {acceptReporters: false,
                        items: [
                            {text: t('menu.ledBoth', '모두 켜기'), value: 'both'},
                            {text: t('menu.ledLeft', '왼쪽만'), value: 'left'},
                            {text: t('menu.ledRight', '오른쪽만'), value: 'right'},
                            {text: t('menu.ledOff', '모두 끄기'), value: 'off'}
                        ]},
                    motionStop: {acceptReporters: false,
                        items: [
                            {text: t('menu.stopUnit', '현재 동작이 끝나면'), value: 'unit'},
                            {text: t('menu.stopKeyframe', '현재 키프레임에서'), value: 'keyframe'},
                            {text: t('menu.stopNow', '즉시'), value: 'now'}
                        ]},
                    byteSize: {acceptReporters: false, items: ['1', '2', '4']}
                }
            };
        }

        _noteMenu () {
            // CM-550 buzzer scale index 0..51 (chromatic from A3?). Expose a
            // musician-friendly list; indices map 1:1 to the control table.
            const names = ['도', '도#', '레', '레#', '미', '파', '파#', '솔', '솔#', '라', '라#', '시'];
            const items = [];
            for (let i = 0; i <= 51; i++) {
                const octave = Math.floor(i / 12) + 1;
                items.push({text: `${i} (${names[i % 12]}${octave})`, value: String(i)});
            }
            return items;
        }

        // ------------------------------------------------------------------
        // connection
        // ------------------------------------------------------------------

        // Button callbacks (TurboWarp calls these directly; scratch-gui routes
        // the toolbox button through runtime.emit('CM550_CONNECT', kind)).
        connectUsbButton () {
            return this._connect('usb');
        }
        connectBleButton () {
            return this._connect('ble');
        }

        /** @param {'usb'|'ble'|object} kind - see CM550Device.connect */
        async _connect (kind) {
            try {
                await this.device.connect(kind);
                this.device.lastError = '';
            } catch (e) {
                this.device.lastError = e.message || String(e);
            }
            // find the motors right away so menus show their models (not awaited)
            if (this.device.connected) this.device.scanMotors().catch(() => {});
        }

        _dxlIdMenu () {
            const desc = this.device.motorDesc;
            const found = this.device.motors.map(m => ({
                text: `${m.id} · ${desc.labels[m.id] || modelName(m.model)}`,
                value: String(m.id)
            }));
            const used = new Set(this.device.motors.map(m => m.id));
            // keep plain numbers too, so saved programs and other IDs stay selectable
            const rest = [];
            for (let id = 1; id <= 30; id++) if (!used.has(id)) rest.push(String(id));
            return found.concat(rest);
        }

        _dxlModuleMenu () {
            const pairs = this.device.motorDesc.pairs;
            const items = pairs.map((p, i) => ({
                text: `모듈 ${i + 1} (ID ${p.a}·${p.b})`,
                value: `${p.a},${p.b}`
            }));
            const used = new Set(items.map(x => x.value));
            for (let a = 1; a <= 15; a += 2) {
                const value = `${a},${a + 1}`;
                if (!used.has(value)) items.push({text: `ID ${a}·${a + 1}`, value});
            }
            return items;
        }

        _moduleIds (value) {
            const [a, b] = String(value).split(',').map(x => num(x));
            return [a || 1, b || ((a || 1) + 1)];
        }

        connect (args) {
            return this._connect(args.KIND === 'ble' ? 'ble' : 'usb');
        }

        disconnect () {
            return this.device.disconnect();
        }

        isConnected () {
            return this.device.connected;
        }

        lastError () {
            return this.device.lastError || '';
        }

        async _stopAll () {
            if (!this.device.connected) return;
            try {
                await this.device.stopMotion(MOTION_STOP.NOW);
                for (const id of Object.keys(this.device._modeCache)) {
                    if (this.device._modeCache[id] === OP_MODE.VELOCITY) {
                        await this.device.writeDXL(Number(id), DXL.GOAL_VELOCITY, 0);
                    }
                }
            } catch (e) { /* ignore */ }
        }

        /**
         * Run a device action; on failure store the message and resolve quietly.
         * @param fn
         * @param fallback
         */
        async _guard (fn, fallback) {
            if (!this.device.connected) {
                this.device.lastError = t('errNotConnected', 'CM-550이 연결되어 있지 않습니다.');
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
        _reportError (message) {
            if (typeof this.onError === 'function') {
                try {
                    this.onError(message);
                } catch (e) { /* host callback problems must not break blocks */ }
            }
        }

        _onOff (v) {
            if (typeof v === 'boolean') return v ? 1 : 0;
            const s = String(v).toLowerCase();
            return (s === 'on' || s === '1' || s === 'true' || s === '켜기') ? 1 : 0;
        }

        // ------------------------------------------------------------------
        // DYNAMIXEL
        // ------------------------------------------------------------------

        dxlTorque (args) {
            const id = num(args.ID);
            return this._guard(async () => {
                await this.device.writeDXL(id, DXL.TORQUE_ENABLE, this._onOff(args.ONOFF));
            });
        }

        dxlMoveTo (args) {
            return this._guard(() => this.device.moveTo(num(args.ID), num(args.DEG), num(args.SPEED)));
        }

        dxlMoveToWait (args) {
            const id = num(args.ID);
            return this._guard(async () => {
                await this.device.moveTo(id, num(args.DEG), num(args.SPEED));
                await this.device.waitUntilStopped(id);
            });
        }

        dxlMoveTwo (args) {
            const ids = [num(args.ID1), num(args.ID2)];
            const degs = [num(args.DEG1), num(args.DEG2)];
            return this._guard(async () => {
                for (const id of ids) {
                    // position mode (only switched if needed) + torque on, per motor model rules
                    await this.device.ensureMode(id, [OP_MODE.POSITION, OP_MODE.EXTENDED_POSITION]);
                }
                await this.device.syncWriteDXL(DXL.GOAL_POSITION, ids.map((id, i) => ({
                    id, value: Math.round(degs[i] / 360 * 4096)
                })));
            });
        }

        dxlWheel (args) {
            return this._guard(() => this.device.setWheelSpeed(num(args.ID), num(args.SPEED)));
        }

        dxlWheelTwo (args) {
            const ids = [num(args.ID1), num(args.ID2)];
            const speeds = [num(args.SPEED1), num(args.SPEED2)];
            return this._guard(async () => {
                const items = [];
                for (let i = 0; i < 2; i++) {
                    await this.device.setOperatingMode(ids[i], OP_MODE.VELOCITY);
                    const limit = await this.device.getVelocityLimit(ids[i]);
                    items.push({id: ids[i], value: limit * clamp(speeds[i], -100, 100) / 100});
                }
                await this.device.syncWriteDXL(DXL.GOAL_VELOCITY, items);
            });
        }

        dxlStop (args) {
            const id = num(args.ID);
            return this._guard(async () => {
                const mode = this.device._modeCache[id];
                if (mode === OP_MODE.VELOCITY) {
                    await this.device.writeDXL(id, DXL.GOAL_VELOCITY, 0);
                } else {
                    const pos = await this.device.readDXL(id, DXL.PRESENT_POSITION);
                    await this.device.writeDXL(id, DXL.GOAL_POSITION, pos);
                }
            });
        }

        dxlSetMode (args) {
            const map = {position: OP_MODE.POSITION, velocity: OP_MODE.VELOCITY, extended: OP_MODE.EXTENDED_POSITION};
            const mode = map[args.MODE] || OP_MODE.POSITION;
            return this._guard(() => this.device.setOperatingMode(num(args.ID), mode));
        }

        dxlLed (args) {
            return this._guard(() => this.device.writeDXL(num(args.ID), DXL.LED, this._onOff(args.ONOFF)));
        }

        dxlAllTorque (args) {
            return this._guard(async () => {
                await this.device.writeCM(CM.DXL_TORQUE, this._onOff(args.ONOFF) ? 2 : 1);
                await delay(100);
            });
        }

        dxlRead (args) {
            const id = num(args.ID);
            return this._guard(async () => {
                switch (args.PROP) {
                case 'velocity': {
                    const v = await this.device.readDXL(id, DXL.PRESENT_VELOCITY);
                    return Math.round(v * 0.229 * 100) / 100;
                }
                case 'load': {
                    const v = await this.device.readDXL(id, DXL.PRESENT_LOAD);
                    return v / 10;
                }
                case 'temperature':
                    return this.device.readDXL(id, DXL.PRESENT_TEMPERATURE);
                case 'voltage': {
                    const v = await this.device.readDXL(id, DXL.PRESENT_INPUT_VOLTAGE);
                    return v / 10;
                }
                case 'model':
                    return this.device.readDXL(id, DXL.MODEL_NUMBER);
                case 'error':
                    return this.device.readDXL(id, DXL.HARDWARE_ERROR);
                case 'position':
                default: {
                    const v = await this.device.readDXL(id, DXL.PRESENT_POSITION);
                    return Math.round(tickToDeg(v) * 10) / 10;
                }
                }
            }, 0);
        }

        dxlIsMoving (args) {
            return this._guard(async () => Boolean(await this.device.readDXL(num(args.ID), DXL.MOVING)), false);
        }

        dxlScan () {
            return this._guard(async () => {
                const motors = await this.device.scanMotors();
                this._dxlIds = motors.map(m => m.id);
                return this._dxlIds.join(',');
            }, '');
        }

        dxlModuleMove (args) {
            const [a, b] = this._moduleIds(args.MODULE);
            return this.dxlMoveTwo({ID1: a, DEG1: args.DEGA, ID2: b, DEG2: args.DEGB});
        }

        dxlModuleWheels (args) {
            const [a, b] = this._moduleIds(args.MODULE);
            return this.dxlWheelTwo({ID1: a, SPEED1: args.SPA, ID2: b, SPEED2: args.SPB});
        }

        dxlGrip (args) {
            return this._guard(() => this.device.grip(num(args.ID), num(args.DEG), num(args.FORCE)));
        }

        dxlModelName (args) {
            return this._guard(async () => modelName(await this.device.requireModel(num(args.ID))
                .catch(() => this.device._modelCache[num(args.ID)])), '');
        }

        // ------------------------------------------------------------------
        // CM-550 built-ins
        // ------------------------------------------------------------------

        cmLedColor (args) {
            const mix = LED_MIX[args.COLOR] || LED_MIX.off;
            return this._guard(async () => {
                await this.device.writeCM(CM.LED_RED, mix.rgb[0]);
                await this.device.writeCM(CM.LED_GREEN, mix.rgb[1]);
                await this.device.writeCM(CM.LED_BLUE, mix.rgb[2]);
            });
        }

        cmLed (args) {
            const reg = {red: CM.LED_RED, green: CM.LED_GREEN, blue: CM.LED_BLUE}[args.COLOR] || CM.LED_RED;
            return this._guard(() => this.device.writeCM(reg, this._onOff(args.ONOFF)));
        }

        cmBuzzerNote (args) {
            const secs = clamp(num(args.SECS), 0.1, 5);
            return this._guard(async () => {
                await this.device.playNote(num(args.NOTE), secs);
                await delay(secs * 1000);
            });
        }

        cmBuzzerMelody (args) {
            return this._guard(() => this.device.playMelody(num(args.INDEX)));
        }

        cmButton (args) {
            return this._guard(async () => {
                const s = await this.device.readCM(CM.BUTTON_STATUS);
                return args.BUTTON === 'mode' ? (s === 2 || s === 3) : (s === 1 || s === 3);
            }, false);
        }

        cmTilt (args) {
            const reg = {roll: CM.ROLL, pitch: CM.PITCH, yaw: CM.YAW}[args.AXIS] || CM.ROLL;
            return this._guard(async () => (await this.device.readCM(reg)) / 100, 0);
        }

        cmGyro (args) {
            const reg = {x: CM.GYRO_X, y: CM.GYRO_Y, z: CM.GYRO_Z}[String(args.AXIS).toLowerCase()] || CM.GYRO_X;
            return this._guard(async () => (await this.device.readCM(reg)) / 100, 0);
        }

        cmAccel (args) {
            const reg = {x: CM.ACC_X, y: CM.ACC_Y, z: CM.ACC_Z}[String(args.AXIS).toLowerCase()] || CM.ACC_X;
            return this._guard(async () => (await this.device.readCM(reg)) / 100, 0);
        }

        cmVoltage () {
            return this._guard(async () => (await this.device.readCM(CM.VOLTAGE)) / 10, 0);
        }

        cmTemperature () {
            return this._guard(() => this.device.readCM(CM.TEMPERATURE), 0);
        }

        cmSoundCount () {
            return this._guard(() => this.device.readCM(CM.SOUND_COUNT), 0);
        }

        cmSoundReset () {
            return this._guard(() => this.device.writeCM(CM.SOUND_COUNT, 0));
        }

        cmDxlPower (args) {
            return this._guard(() => this.device.writeCM(CM.DXL_POWER, this._onOff(args.ONOFF)));
        }

        // ------------------------------------------------------------------
        // 5-pin ports
        // ------------------------------------------------------------------

        portSensor (args) {
            const spec = {
                ir: PORT.IR,
                dms: PORT.DMS,
                touch: PORT.TOUCH,
                brightness: PORT.BRIGHTNESS,
                color: PORT.COLOR,
                temperature: PORT.TEMPERATURE,
                magnet: PORT.MAGNET,
                motion: PORT.MOTION,
                moisture: PORT.MOISTURE,
                user: PORT.USER
            }[args.SENSOR] || PORT.IR;
            return this._guard(() => this.device.readPort(spec, num(args.PORT)), 0);
        }

        portTouch (args) {
            return this._guard(async () => Boolean(await this.device.readPort(PORT.TOUCH, num(args.PORT))), false);
        }

        portColor (args) {
            const idx = {white: 1, black: 2, red: 3, green: 4, blue: 5, yellow: 6}[args.COLOR] || 0;
            return this._guard(async () => (await this.device.readPort(PORT.COLOR, num(args.PORT))) === idx, false);
        }

        portLed (args) {
            const v = {off: 0, right: 1, left: 2, both: 3}[args.STATE];
            return this._guard(() => this.device.writePort(PORT.LED, num(args.PORT), typeof v === 'number' ? v : 3));
        }

        portServo (args) {
            const deg = clamp(num(args.DEG), 0, 300);
            const value = Math.round(deg / 300 * 1023);
            return this._guard(() => this.device.writePort(PORT.SERVO_POSITION, num(args.PORT), value));
        }

        portMotor (args) {
            const pct = clamp(num(args.SPEED), -100, 100);
            const mag = Math.round(Math.abs(pct) / 100 * 1023);
            const value = pct >= 0 ? 1024 + mag : mag; // CW 1024..2047, CCW 0..1023
            return this._guard(() => this.device.writePort(PORT.WHEEL, num(args.PORT), value));
        }

        // ------------------------------------------------------------------
        // motion
        // ------------------------------------------------------------------

        motionPlay (args) {
            return this._guard(() => this.device.playMotion(num(args.PAGE)));
        }

        motionPlayWait (args) {
            return this._guard(async () => {
                await this.device.playMotion(num(args.PAGE));
                await this.device.waitMotionDone();
            });
        }

        motionStop (args) {
            const how = {now: MOTION_STOP.NOW, keyframe: MOTION_STOP.KEYFRAME, unit: MOTION_STOP.UNIT}[args.HOW] ||
                MOTION_STOP.UNIT;
            return this._guard(() => this.device.stopMotion(how));
        }

        motionSpeed (args) {
            return this._guard(() => this.device.writeCM(CM.MOTION_SPEED, clamp(num(args.PERCENT), 20, 200)));
        }

        motionNext (args) {
            return this._guard(() => this.device.writeCM(CM.MOTION_NEXT_PAGE, clamp(num(args.PAGE), 0, 65535)));
        }

        motionIsPlaying () {
            return this._guard(async () => Boolean(await this.device.readCM(CM.MOTION_STATUS)), false);
        }

        motionCount () {
            return this._guard(() => this.device.readCM(CM.MOTION_COUNT), 0);
        }

        // ------------------------------------------------------------------
        // advanced
        // ------------------------------------------------------------------

        rawWrite (args) {
            const size = [1, 2, 4].includes(num(args.SIZE)) ? num(args.SIZE) : 1;
            return this._guard(() => this.device.write(num(args.ID), num(args.ADDR), num(args.VALUE), size));
        }

        rawRead (args) {
            const size = [1, 2, 4].includes(num(args.SIZE)) ? num(args.SIZE) : 1;
            return this._guard(() => this.device.read(num(args.ID), num(args.ADDR), size, true), 0);
        }
    }

    return Scratch3CM550Blocks;
};

module.exports = {createExtension, EXTENSION_ID};
