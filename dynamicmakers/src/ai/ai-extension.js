/**
 * Blocks for AI 학습 (extension id "dmai"). The kinds in the menus are the
 * ones the student named in the AI 학습 panel.
 */
export const AI_EXTENSION_ID = 'dmai';

export const createAIExtension = ({ArgumentType, BlockType}, engine, {log, isRunning} = {}) => {
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
                    }
                ],
                menus: {
                    kinds: {acceptReporters: true, items: '_kindMenu'},
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
