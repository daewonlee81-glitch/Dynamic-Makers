/**
 * Blocks for AI 학습 (extension id "dmai"). The kinds in the menus are the
 * ones the student named in the AI 학습 panel.
 */
export const AI_EXTENSION_ID = 'dmai';

import {JOINTS, PART_NAMES} from './pose';
import {defaultGait} from '../sim3d/gait';

export const SKELETON_OPCODES = ['skelVisible', 'skelAngle', 'skelPos', 'skelFollow', 'skelSwitch'];
export const WALK_OPCODES = ['walkGait', 'walkPolicy', 'walkStop', 'walking'];

export const createAIExtension = ({ArgumentType, BlockType}, engine,
    {log, isRunning, tracker, device, walker, simStore} = {}) => {
    class DMAIBlocks {
        constructor (runtime) {
            this.runtime = runtime;
            runtime.ext_dmai = this;
        }

        getInfo () {
            const first = engine.names[0] || '종류 1';
            const CLASS = {type: ArgumentType.STRING, menu: 'kinds', defaultValue: first};
            return {
                id: AI_EXTENSION_ID,
                name: 'AI 학습',
                color1: '#8E44AD',
                color2: '#7D3C98',
                color3: '#6C3483',
                blocks: [
                    {
                        opcode: 'aiWhen',
                        blockType: BlockType.HAT,
                        isEdgeActivated: true,
                        text: 'AI가 [CLASS] 을(를) 알아봤을 때',
                        arguments: {CLASS}
                    },
                    {
                        opcode: 'aiLabel',
                        blockType: BlockType.REPORTER,
                        text: 'AI가 알아본 것',
                        disableMonitor: true
                    },
                    {
                        opcode: 'aiIs',
                        blockType: BlockType.BOOLEAN,
                        text: 'AI가 알아본 것이 [CLASS] 인가?',
                        arguments: {CLASS}
                    },
                    {
                        opcode: 'aiConfidence',
                        blockType: BlockType.REPORTER,
                        text: 'AI가 [CLASS] (이)라고 생각하는 정도 (%)',
                        arguments: {CLASS},
                        disableMonitor: true
                    },
                    {
                        opcode: 'aiSwitch',
                        blockType: BlockType.COMMAND,
                        text: 'AI 인식 [STATE]',
                        arguments: {STATE: {type: ArgumentType.STRING, menu: 'aiState', defaultValue: 'on'}}
                    },
                    // ---- 몸 동작 (skeleton from the PC camera) ----
                    {
                        opcode: 'skelVisible',
                        blockType: BlockType.BOOLEAN,
                        text: '카메라에 사람이 보이는가?'
                    },
                    {
                        opcode: 'skelAngle',
                        blockType: BlockType.REPORTER,
                        text: '사람의 [JOINT] 각도',
                        arguments: {JOINT: {type: ArgumentType.STRING, menu: 'joints', defaultValue: 'rightShoulder'}},
                        disableMonitor: true
                    },
                    {
                        opcode: 'skelPos',
                        blockType: BlockType.REPORTER,
                        text: '사람의 [PART] [AXIS] 위치',
                        arguments: {
                            PART: {type: ArgumentType.STRING, menu: 'parts', defaultValue: 'rightHand'},
                            AXIS: {type: ArgumentType.STRING, menu: 'axis', defaultValue: 'y'}
                        },
                        disableMonitor: true
                    },
                    {
                        opcode: 'skelFollow',
                        blockType: BlockType.COMMAND,
                        text: '다이나믹셀 [ID] 이(가) 사람의 [JOINT] 따라 하기 (가운데 [CENTER]° , [DIR])',
                        arguments: {
                            ID: {type: ArgumentType.NUMBER, defaultValue: 1},
                            JOINT: {type: ArgumentType.STRING, menu: 'joints', defaultValue: 'rightShoulder'},
                            CENTER: {type: ArgumentType.NUMBER, defaultValue: 180},
                            DIR: {type: ArgumentType.STRING, menu: 'dir', defaultValue: '1'}
                        }
                    },
                    // ---- 걸음 (learned in the 3D simulator) ----
                    {
                        opcode: 'walkGait',
                        blockType: BlockType.COMMAND,
                        text: '학습한 걸음으로 [SECS] 초 걷기 (느리게 [SLOW] 배)',
                        arguments: {
                            SECS: {type: ArgumentType.NUMBER, defaultValue: 10},
                            SLOW: {type: ArgumentType.NUMBER, defaultValue: 1}
                        }
                    },
                    {
                        opcode: 'walkPolicy',
                        blockType: BlockType.COMMAND,
                        text: '강화학습 정책으로 [SECS] 초 걷기',
                        arguments: {SECS: {type: ArgumentType.NUMBER, defaultValue: 10}}
                    },
                    {
                        opcode: 'walkStop',
                        blockType: BlockType.COMMAND,
                        text: '걷기 멈추기'
                    },
                    {
                        opcode: 'walking',
                        blockType: BlockType.BOOLEAN,
                        text: '걷는 중인가?'
                    },
                    {
                        opcode: 'skelSwitch',
                        blockType: BlockType.COMMAND,
                        text: '몸 동작 추적 [STATE]',
                        arguments: {STATE: {type: ArgumentType.STRING, menu: 'aiState', defaultValue: 'on'}}
                    }
                ],
                menus: {
                    kinds: {acceptReporters: true, items: '_kindMenu'},
                    joints: {acceptReporters: false,
                        items: Object.entries(JOINTS).map(([value, text]) => ({text, value}))},
                    parts: {acceptReporters: false,
                        items: Object.entries(PART_NAMES).map(([value, text]) => ({text, value}))},
                    axis: {acceptReporters: false, items: [
                        {text: 'x (좌우)', value: 'x'},
                        {text: 'y (위아래)', value: 'y'}
                    ]},
                    dir: {acceptReporters: false, items: [
                        {text: '같은 방향', value: '1'},
                        {text: '반대 방향', value: '-1'}
                    ]},
                    aiState: {acceptReporters: false, items: [
                        {text: '켜기', value: 'on'},
                        {text: '끄기', value: 'off'}
                    ]}
                }
            };
        }

        _kindMenu () {
            const names = engine.names;
            return names.length ? names : ['종류 1'];
        }

        /** Blocks that need a result start recognition by themselves. */
        _autoStart () {
            if (engine.running || engine._starting || !engine.ready) return;
            if (isRunning && !isRunning()) return; // only while a program runs
            engine.start().catch(e => log && log(`⚠ AI 인식을 시작할 수 없습니다: ${e.message}`, 'err'));
        }

        // ---- 걸음 -----------------------------------------------------------------
        async walkGait (args) {
            if (!walker) return;
            const gait = (simStore && simStore.gait) || defaultGait();
            try {
                await walker.walk(gait, Math.max(0.5, Number(args.SECS) || 0), {slow: Math.max(0.5, Math.min(4, Number(args.SLOW) || 1))});
            } catch (e) {
                if (log) log(`⚠ 걷기: ${e.message || e}`, 'err');
            }
        }

        async walkPolicy (args) {
            if (!walker) return;
            const p = simStore && simStore.policy;
            if (!p) {
                if (log) log('⚠ 강화학습 정책이 없습니다. 3D 탭에서 정책 파일을 여세요.', 'err');
                return;
            }
            try {
                await walker.walk(p.gait, Math.max(0.5, Number(args.SECS) || 0), {policy: p});
            } catch (e) {
                if (log) log(`⚠ 정책 걷기: ${e.message || e}`, 'err');
            }
        }

        walkStop () {
            if (walker) walker.stop();
        }

        walking () {
            return Boolean(walker && walker.running);
        }

        // ---- 몸 동작 -----------------------------------------------------------
        /** Skeleton blocks start the camera by themselves while a program runs. */
        _body () {
            if (!tracker) return false;
            if (!tracker.running && !tracker._starting && (!isRunning || isRunning())) {
                tracker.acquire('blocks').catch(e => log && log(`⚠ 몸 동작을 추적할 수 없습니다: ${e.message}`, 'err'));
            }
            return tracker.running;
        }

        skelVisible () {
            return this._body() && tracker.data.visible;
        }

        skelAngle (args) {
            return this._body() ? tracker.angle(String(args.JOINT)) : 0;
        }

        skelPos (args) {
            return this._body() ? tracker.position(String(args.PART), String(args.AXIS)) : 0;
        }

        async skelFollow (args) {
            if (!this._body()) return;
            if (!device || !device.connected) {
                if (log && !this._warnedConn) log('⚠ 로봇이 연결되어 있지 않아 따라 하기를 할 수 없습니다.', 'err');
                this._warnedConn = true;
                return;
            }
            const joint = String(args.JOINT);
            const v = tracker.data.angles[joint];
            if (v === null || v === undefined || !tracker.data.visible) return; // keep the last pose
            const id = Math.round(Number(args.ID) || 0);
            const target = Math.max(0, Math.min(360, Number(args.CENTER) + (Number(args.DIR) < 0 ? -v : v)));
            this._last = this._last || {};
            if (this._last[id] !== undefined && Math.abs(this._last[id] - target) < 2) {
                await new Promise(r => setTimeout(r, 15)); // nothing to do: let other scripts run
                return;
            }
            try {
                const first = this._last[id] === undefined;
                await device.moveTo(id, target, first ? 70 : NaN); // speed set once, then only goals
                this._last[id] = target;
            } catch (e) {
                if (log) log(`⚠ 다이나믹셀 ${id}: ${e.message}`, 'err');
                await new Promise(r => setTimeout(r, 300));
            }
        }

        async skelSwitch (args) {
            if (!tracker) return;
            if (args.STATE === 'off') {
                tracker.release('blocks');
                return;
            }
            try {
                await tracker.acquire('blocks');
            } catch (e) {
                if (log) log(`⚠ 몸 동작을 추적할 수 없습니다: ${e.message}`, 'err');
            }
        }

        aiWhen (args) {
            return engine.running && engine.active === String(args.CLASS);
        }

        aiLabel () {
            this._autoStart();
            return engine.active;
        }

        aiIs (args) {
            this._autoStart();
            return engine.active === String(args.CLASS);
        }

        aiConfidence (args) {
            this._autoStart();
            return engine.confidence(String(args.CLASS));
        }

        async aiSwitch (args) {
            if (args.STATE === 'off') {
                engine.stop();
                engine._emit();
                return;
            }
            if (!engine.ready) {
                if (log) log('⚠ AI 학습 패널에서 두 가지 이상의 종류에 예시를 모은 뒤 사용하세요.', 'err');
                return;
            }
            try {
                await engine.start();
            } catch (e) {
                if (log) log(`⚠ AI 인식을 시작할 수 없습니다: ${e.message}`, 'err');
            }
        }
    }
    return DMAIBlocks;
};
