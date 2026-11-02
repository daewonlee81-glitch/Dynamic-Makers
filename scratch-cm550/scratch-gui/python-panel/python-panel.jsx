/**
 * Read-only Python view of the current sprite's blocks (Pybricks style).
 * Lives to the right of the block workspace in the Code tab.
 *
 * Installed into scratch-gui at src/components/python-panel/ by
 * scripts/install-into-scratch-editor.sh together with the generator and
 * highlighter modules.
 */
import PropTypes from 'prop-types';
import React from 'react';

import {generatePython, fromVM} from './python-generator';
import {highlightPython} from './python-highlight';
import styles from './python-panel.css';

const STORAGE_OPEN = 'cm550.pythonPanel.open';
const STORAGE_WIDTH = 'cm550.pythonPanel.width';
const MIN_WIDTH = 240;
const MAX_WIDTH = 900;

const readStorage = (key, fallback) => {
    try {
        const v = window.localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
    } catch (e) {
        return fallback;
    }
};
const writeStorage = (key, value) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage may be unavailable */ }
};

// ~quarter of the window: leaves room for blocks on 1280px school laptops
const defaultWidth = () => Math.round(Math.max(280, Math.min(380, window.innerWidth * 0.24)));

// Blockly listens for window resize to re-measure the workspace.
const notifyResize = () => window.dispatchEvent(new Event('resize'));

class PythonPanel extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            open: readStorage(STORAGE_OPEN, true),
            width: readStorage(STORAGE_WIDTH, defaultWidth()),
            code: '',
            copied: false
        };
        this.timer = null;
        this.handleChange = this.handleChange.bind(this);
        this.handleToggle = this.handleToggle.bind(this);
        this.handleCopy = this.handleCopy.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragMove = this.handleDragMove.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
    }

    componentDidMount () {
        const {vm} = this.props;
        vm.on('PROJECT_CHANGED', this.handleChange);
        vm.on('workspaceUpdate', this.handleChange);
        vm.on('targetsUpdate', this.handleChange);
        this.regenerate();
    }

    componentDidUpdate (prevProps, prevState) {
        if (prevState.open !== this.state.open) notifyResize();
    }

    componentWillUnmount () {
        const {vm} = this.props;
        vm.removeListener('PROJECT_CHANGED', this.handleChange);
        vm.removeListener('workspaceUpdate', this.handleChange);
        vm.removeListener('targetsUpdate', this.handleChange);
        clearTimeout(this.timer);
        this.handleDragEnd();
    }

    handleChange () {
        // block drags fire many events; regenerate at most every 150 ms
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.regenerate(), 150);
    }

    regenerate () {
        let code;
        try {
            code = generatePython(fromVM(this.props.vm));
        } catch (e) {
            code = `# Python 변환 중 오류가 발생했습니다\n# ${String(e && e.message ? e.message : e)}\n`;
        }
        if (code !== this.state.code) this.setState({code});
    }

    handleToggle () {
        const open = !this.state.open;
        writeStorage(STORAGE_OPEN, open);
        this.setState({open});
    }

    handleCopy () {
        const done = () => {
            this.setState({copied: true});
            setTimeout(() => this.setState({copied: false}), 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(this.state.code).then(done, () => {});
        }
    }

    handleDragStart (e) {
        e.preventDefault();
        this.dragStartX = e.clientX;
        this.dragStartWidth = this.state.width;
        window.addEventListener('mousemove', this.handleDragMove);
        window.addEventListener('mouseup', this.handleDragEnd);
    }

    handleDragMove (e) {
        const width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, this.dragStartWidth + (this.dragStartX - e.clientX)));
        this.setState({width});
        notifyResize();
    }

    handleDragEnd () {
        window.removeEventListener('mousemove', this.handleDragMove);
        window.removeEventListener('mouseup', this.handleDragEnd);
        if (typeof this.dragStartX === 'number') writeStorage(STORAGE_WIDTH, this.state.width);
        this.dragStartX = null;
    }

    render () {
        if (!this.state.open) {
            return (
                <button
                    className={styles.collapsed}
                    title="Python 코드 보기"
                    onClick={this.handleToggle}
                >
                    <span className={styles.collapsedLabel}>{'Python'}</span>
                </button>
            );
        }
        const lines = this.state.code.replace(/\n$/, '').split('\n').length;
        return (
            <section
                className={styles.panel}
                style={{width: `${this.state.width}px`}}
                aria-label="Python 코드"
            >
                <div
                    className={styles.resizer}
                    onMouseDown={this.handleDragStart}
                />
                <header className={styles.header}>
                    <span className={styles.title}>{'Python'}</span>
                    <span className={styles.subtitle}>{'블록에서 자동 생성 · 읽기 전용'}</span>
                    <button
                        className={styles.button}
                        onClick={this.handleCopy}
                    >
                        {this.state.copied ? '복사됨' : '복사'}
                    </button>
                    <button
                        className={styles.button}
                        title="Python 코드 숨기기"
                        onClick={this.handleToggle}
                    >
                        {'닫기'}
                    </button>
                </header>
                <div className={styles.scroller}>
                    <pre className={styles.gutter}>
                        {Array.from({length: lines}, (_, i) => i + 1).join('\n')}
                    </pre>
                    {/* highlightPython HTML-escapes every piece of text before wrapping tokens in spans */}
                    <pre
                        className={styles.code}
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{__html: highlightPython(this.state.code, {
                            comment: styles.tComment,
                            string: styles.tString,
                            decorator: styles.tDecorator,
                            number: styles.tNumber,
                            keyword: styles.tKeyword,
                            api: styles.tApi,
                            builtin: styles.tBuiltin
                        })}}
                    />
                </div>
            </section>
        );
    }
}

PythonPanel.propTypes = {
    vm: PropTypes.shape({
        on: PropTypes.func,
        removeListener: PropTypes.func
    }).isRequired
};

export default PythonPanel;
