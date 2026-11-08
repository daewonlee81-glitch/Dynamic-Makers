/**
 * 모니터 — live view of the connected CM-550, its DYNAMIXEL IDs and 5-pin ports.
 *
 * The CM-550's six DYNAMIXEL connectors share one bus, so the physical port of a
 * motor cannot be detected; each row has a "찾기" button that blinks the motor's
 * LED (and wiggles nothing) so students can see which one it is.
 */
const {PORT} = require('../../scratch-cm550/src/cm550');
const P2 = require('../../scratch-cm550/src/protocol2');

const CM_ID = 200;

const {modelName: registryName} = require('../../scratch-cm550/src/models');

export const MODEL_NAMES = {
    450: 'CM-550',
    1060: 'XL430-W250', 1090: '2XL430-W250', 1190: 'XL330-M077', 1200: 'XL330-M288',
    1070: 'XC430-W150', 1080: 'XC430-W240', 1160: '2XC430-W250',
    1210: 'XC330-T181', 1220: 'XC330-T288', 1230: 'XC330-M181', 1240: 'XC330-M288',
    1000: 'XH430-W350', 1010: 'XH430-W210', 1040: 'XH430-V350', 1050: 'XH430-V210',
    1020: 'XM430-W350', 1030: 'XM430-W210',
    350: 'XL-320 (CM-550과 호환 안 됨)'
};
export const modelName = n => registryName(n);

const HW_ERRORS = [
    [0x01, '입력 전압'], [0x04, '과열'], [0x08, '엔코더'], [0x10, '전기 충격'], [0x20, '과부하']
];

const PORT_SENSORS = [
    {value: '', label: '사용 안 함'},
    {value: 'ir', label: '적외선(IR)', spec: PORT.IR},
    {value: 'dms', label: '거리(DMS)', spec: PORT.DMS},
    {value: 'touch', label: '터치', spec: PORT.TOUCH, fmt: v => (v ? '눌림' : '안 눌림')},
    {value: 'brightness', label: '밝기', spec: PORT.BRIGHTNESS},
    {value: 'color', label: '컬러', spec: PORT.COLOR,
        fmt: v => ['알 수 없음', '흰색', '검정', '빨강', '초록', '파랑', '노랑'][v] || v},
    {value: 'temperature', label: '온도', spec: PORT.TEMPERATURE, fmt: v => `${v} °C`},
    {value: 'magnet', label: '자석', spec: PORT.MAGNET, fmt: v => (v ? '감지' : '없음')},
    {value: 'motion', label: '인체 감지', spec: PORT.MOTION, fmt: v => (v ? '감지' : '없음')},
    {value: 'moisture', label: '습도 (포트 1·2)', spec: PORT.MOISTURE, fmt: v => `${v} %`},
    {value: 'user', label: '사용자 장치(아날로그)', spec: PORT.USER}
];
const STORAGE_PORTS = 'dynamicmakers.monitor.ports';

const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
};
const signed = (v, size) => (v >= 2 ** ((size * 8) - 1) ? v - (2 ** (size * 8)) : v);
const le = (bytes, off, size, isSigned) => {
    const v = P2.fromLE(bytes, off, size);
    return isSigned ? signed(v, size) : v;
};
const delay = ms => new Promise(r => setTimeout(r, ms));
const BAUDS = ['9,600', '57,600', '115,200', '1M', '2M', '3M', '4M', '4.5M'];
const MODES = ['IDLE', 'Task 실행', 'Manage', 'Bootloader', 'Reboot'];
const BYPASS = ['BLE', 'UART', 'USB'];
const hex = bytes => bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');

export class Monitor {
    /**
     * @param {object} opts
     * @param {HTMLElement} opts.host
     * @param {object} opts.device CM550Device
     * @param {Function} opts.isRunning () => boolean
     * @param {Function} [opts.log] (text, kind) => void
     */
    constructor ({host, device, isRunning, log}) {
        this.host = host;
        this.device = device;
        this.isRunning = isRunning;
        this.log = log || (() => {});
        this.visible = false;
        this.rows = new Map();
        this.scanning = false;
        this.ports = this._loadPorts();
        this.timer = null;
        this._build();
    }

    // ------------------------------------------------------------------ UI

    _build () {
        const h = this.host;
        h.classList.add('mon');
        const header = el('header', 'mon-header');
        header.append(el('span', 'mon-title', '모니터'));
        this.stateEl = el('span', 'mon-state', '');
        header.append(this.stateEl);
        this.diagBtn = el('button', 'mon-btn', '진단');
        this.diagBtn.title = '다이나믹셀이 안 보일 때 원인을 확인합니다';
        this.diagBtn.addEventListener('click', () => this.diagnose());
        header.append(this.diagBtn);
        this.scanBtn = el('button', 'mon-btn', '다이나믹셀 검색');
        this.scanBtn.addEventListener('click', () => this.scan());
        header.append(this.scanBtn);
        h.append(header);

        const body = el('div', 'mon-body');
        h.append(body);

        this.diagCard = el('section', 'mon-card mon-diag');
        this.diagCard.hidden = true;
        body.append(this.diagCard);

        // controller
        const cm = el('section', 'mon-card');
        cm.append(el('h3', '', '컨트롤러 CM-550'));
        this.cmGrid = el('div', 'mon-grid');
        cm.append(this.cmGrid);
        this.cmFields = {};
        for (const [key, label] of [
            ['link', '연결'], ['model', '모델 / 펌웨어'], ['voltage', '배터리 전압'], ['temp', '컨트롤러 온도'],
            ['tilt', '기울기 (롤 / 피치 / 요)'], ['button', '버튼'], ['power', '다이나믹셀 전원'], ['motions', '저장된 모션']
        ]) {
            const k = el('div', 'mon-k', label);
            const v = el('div', 'mon-v', '–');
            this.cmFields[key] = v;
            this.cmGrid.append(k, v);
        }
        body.append(cm);

        // dynamixel
        const dx = el('section', 'mon-card');
        this.dxTitle = el('h3', '', '다이나믹셀');
        dx.append(this.dxTitle);
        dx.append(el('p', 'mon-note',
            'CM-550의 다이나믹셀 포트 6개는 한 줄로 연결된 같은 통로라서, 어느 포트에 꽂혔는지는 알 수 없습니다. ' +
            '[찾기]를 누르면 그 모터의 LED가 깜빡입니다.'));
        const table = el('table', 'mon-table');
        const thead = el('thead');
        const tr = el('tr');
        for (const t of ['ID', '모델', '각도', '온도', '전압', '토크', '상태', '']) tr.append(el('th', '', t));
        thead.append(tr);
        this.tbody = el('tbody');
        table.append(thead, this.tbody);
        dx.append(table);
        this.dxEmpty = el('p', 'mon-empty', '연결 후 [다이나믹셀 검색]을 누르세요.');
        dx.append(this.dxEmpty);
        body.append(dx);

        // 5-pin ports
        const pt = el('section', 'mon-card');
        pt.append(el('h3', '', '센서 포트 (5핀)'));
        pt.append(el('p', 'mon-note', '포트에 꽂은 센서 종류를 고르면 값이 표시됩니다. 센서 종류는 자동으로 알 수 없습니다.'));
        this.portRows = [];
        const grid = el('div', 'mon-ports');
        for (let port = 1; port <= 5; port++) {
            const sel = el('select', 'mon-select');
            for (const s of PORT_SENSORS) {
                if (s.value === 'moisture' && port > 2) continue;
                const o = el('option', '', s.label);
                o.value = s.value;
                sel.append(o);
            }
            sel.value = this.ports[port] || '';
            sel.addEventListener('change', () => {
                this.ports[port] = sel.value;
                this._savePorts();
                val.textContent = sel.value ? '…' : '';
            });
            const val = el('span', 'mon-port-val', '');
            grid.append(el('span', 'mon-port-no', `포트 ${port}`), sel, val);
            this.portRows.push({port, sel, val});
        }
        pt.append(grid);
        body.append(pt);
    }

    _loadPorts () {
        try {
            return JSON.parse(window.localStorage.getItem(STORAGE_PORTS)) || {};
        } catch (e) {
            return {};
        }
    }

    _savePorts () {
        try {
            window.localStorage.setItem(STORAGE_PORTS, JSON.stringify(this.ports));
        } catch (e) { /* ignore */ }
    }

    get motors () {
        return this.device.motors;
    }

    /** Re-render the motor table from the device's last scan. */
    renderMotors () {
        this._renderMotors();
    }

    _renderMotors () {
        this.tbody.textContent = '';
        this.rows.clear();
        const desc = this.device.motorDesc;
        const pairs = desc.pairs.length ? ` · 2축 모듈 ${desc.pairs.length}개` : '';
        this.dxTitle.textContent = this.motors.length ? `다이나믹셀 (${this.motors.length}개${pairs})` : '다이나믹셀';
        this.dxEmpty.hidden = this.motors.length > 0;
        for (const m of this.motors) {
            const tr = el('tr');
            const cells = {};
            tr.append(el('td', 'mon-id', String(m.id)));
            const ax = desc.axis[m.id];
            const modelTd = el('td', '', modelName(m.model));
            if (ax) modelTd.append(el('span', 'mon-axis', ` 모듈${ax.module} ${ax.axis}축`));
            tr.append(modelTd);
            for (const key of ['angle', 'temp', 'volt']) {
                cells[key] = el('td', 'mon-num', '–');
                tr.append(cells[key]);
            }
            const torqueTd = el('td');
            const torque = el('button', 'mon-toggle', '–');
            torque.title = '눌러서 토크 켜기/끄기 (끄면 손으로 돌려 각도를 볼 수 있습니다)';
            torque.addEventListener('click', () => this._toggleTorque(m.id, torque));
            torqueTd.append(torque);
            tr.append(torqueTd);
            cells.torque = torque;
            cells.status = el('td', 'mon-status', '');
            tr.append(cells.status);
            const findTd = el('td');
            const find = el('button', 'mon-btn-small', '찾기');
            find.addEventListener('click', () => this.blink(m.id, tr));
            findTd.append(find);
            tr.append(findTd);
            this.tbody.append(tr);
            this.rows.set(m.id, {tr, cells});
        }
    }

    // ------------------------------------------------------------ actions

    async scan () {
        if (this.scanning || this.diagRunning) return;
        if (!this.device.connected) {
            this.log('먼저 CM-550을 연결하세요.', 'warn');
            return;
        }
        this.scanning = true;
        this.scanBtn.disabled = true;
        this.scanBtn.textContent = '검색 중…';
        try {
            const found = await this.device.scanMotors(30, (id, max) => {
                this.scanBtn.textContent = `검색 중… ${id}/${max}`;
            });
            // the device notifies the app, which logs the result and model warnings
            if (!found.length) {
                this.log('다이나믹셀을 찾지 못했습니다. 모니터의 [진단]을 눌러 원인을 확인하세요.', 'warn');
            }
            if (!found.length && !this._autoDiagnosed) {
                this._autoDiagnosed = true;
                setTimeout(() => this.diagnose(), 0);
            }
        } catch (e) {
            this.log(`검색 실패: ${e.message}`, 'err');
        } finally {
            this.scanning = false;
            this.scanBtn.disabled = false;
            this.scanBtn.textContent = '다이나믹셀 검색';
        }
    }

    async blink (id, tr) {
        if (!this.device.connected || this.isRunning()) return;
        tr.classList.add('mon-blink');
        try {
            for (let i = 0; i < 4; i++) {
                await this.device.write(id, 65, 1, 1);
                await delay(250);
                await this.device.write(id, 65, 0, 1);
                await delay(250);
            }
        } catch (e) {
            this.log(`ID ${id} 찾기 실패: ${e.message}`, 'err');
        } finally {
            tr.classList.remove('mon-blink');
        }
    }

    async _toggleTorque (id, btn) {
        if (!this.device.connected) return;
        const on = btn.dataset.on !== '1';
        try {
            await this.device.write(id, 64, on ? 1 : 0, 1);
            btn.dataset.on = on ? '1' : '0';
            btn.textContent = on ? '켜짐' : '꺼짐';
        } catch (e) {
            this.log(`ID ${id} 토크 변경 실패: ${e.message}`, 'err');
        }
    }

    // --------------------------------------------------------- diagnosis

    /**
     * Step-by-step check of why DYNAMIXELs are not visible:
     * power voltage, DXL power switch, baud/mode/bypass, the CM-550's own scan
     * (addr 40 → 39), then relayed pings with raw byte capture.
     */
    async diagnose () {
        if (this.diagRunning) return;
        const d = this.device;
        const card = this.diagCard;
        card.hidden = false;
        card.textContent = '';
        card.append(el('h3', '', '연결 진단'));
        const list = el('ul', 'mon-diag-list');
        card.append(list);
        const lines = [];
        const add = (mark, text) => {
            const li = el('li', `mon-diag-${mark}`);
            li.append(el('span', 'mon-diag-mark', {ok: '✓', bad: '✗', warn: '!', info: '·'}[mark]), document.createTextNode(text));
            list.append(li);
            lines.push(`${{ok: '[OK]', bad: '[문제]', warn: '[주의]', info: '[정보]'}[mark]} ${text}`);
            return li;
        };
        if (!d.connected) {
            add('bad', 'CM-550이 연결되어 있지 않습니다. 먼저 USB 또는 블루투스로 연결하세요.');
            return;
        }
        this.diagRunning = true;
        this.diagBtn.disabled = true;
        this.diagBtn.textContent = '진단 중…';
        const savedTimeout = d.timeoutMs;
        const verdicts = [];
        try {
            add('info', `연결 방식: ${d.transportName}`);
            // 1. controller identity
            let head;
            try {
                head = await d.readBytes(CM_ID, 0, 13);
                add('ok', `CM-550 응답: ${modelName(le(head, 0, 2))}, 펌웨어 v${head[6]}`);
            } catch (e) {
                add('bad', `CM-550이 응답하지 않습니다 (${e.message}). 케이블을 다시 꽂거나 연결을 끊고 다시 연결하세요.`);
                verdicts.push('controller');
                return;
            }
            const baud = head[12];
            // 2. registers 20..23 and voltage
            const r = await d.readBytes(CM_ID, 20, 4); // 20 bypass, 21 mode, 22 dxl power, 23 error(lo)
            const volt = (await d.readBytes(CM_ID, 89, 1))[0] / 10;
            if (volt < 6.5) {
                add('bad', `입력 전압 ${volt.toFixed(1)} V — 배터리나 전원 어댑터가 연결되지 않았습니다. ` +
                    'USB 전원만으로는 CM-550만 켜지고 다이나믹셀은 동작하지 않습니다 (6.5~15 V 필요).');
                verdicts.push('voltage');
            } else {
                add(volt < 10.5 ? 'warn' : 'ok', `입력 전압 ${volt.toFixed(1)} V${volt < 10.5 ? ' (배터리가 부족합니다)' : ''}`);
            }
            if (!r[2]) {
                const li = add('bad', '다이나믹셀 전원 스위치(주소 22)가 꺼져 있습니다. ');
                const fix = el('button', 'mon-btn-small', '전원 켜기');
                fix.addEventListener('click', async () => {
                    await d.write(CM_ID, 22, 1, 1);
                    await delay(500);
                    this.diagnose();
                });
                li.append(fix);
                verdicts.push('power');
            } else {
                add('ok', '다이나믹셀 전원 스위치 켜짐');
            }
            add(baud === 3 ? 'ok' : 'warn', `다이나믹셀 통신 속도(주소 12): ${BAUDS[baud] || baud} bps` +
                (baud === 3 ? '' : ' — 키트 다이나믹셀은 보통 1M(값 3)입니다. 다이나믹셀과 다르면 서로 통신할 수 없습니다.'));
            add('info', `CM-550 모드: ${MODES[r[1]] || r[1]}, 바이패스 포트: ${BYPASS[r[0]] || r[0]}, 오류 코드: ${r[3]}`);
            if (r[1] !== 2) {
                await d.write(CM_ID, 21, 2, 1);
                add('info', 'Manage 모드로 전환했습니다.');
            }

            // 3. CM-550's own scan
            let count = null;
            try {
                await d.write(CM_ID, 40, 1, 1);
                const t0 = Date.now();
                while (Date.now() - t0 < 10000) {
                    await delay(300);
                    if ((await d.readBytes(CM_ID, 40, 1))[0] === 0) break;
                }
                count = (await d.readBytes(CM_ID, 39, 1))[0];
                add(count > 0 ? 'ok' : 'bad', `CM-550 자체 검색(주소 40→39): 다이나믹셀 ${count}개 인식`);
            } catch (e) {
                add('warn', `CM-550 자체 검색 실패: ${e.message}`);
            }

            // 4. relayed pings (what the app needs), longer timeouts + raw capture
            d.timeoutMs = Math.max(savedTimeout, 400);
            d._rawTap = [];
            const bc = (await d.broadcastPing(800)).filter(x => x.id !== CM_ID);
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
            add(relayed.length ? 'ok' : 'bad', relayed.length ?
                `앱에서 다이나믹셀 응답 받음: ${relayed.map(x => `ID ${x.id} (${modelName(x.model)})`).join(', ')}` :
                '앱이 보낸 다이나믹셀 명령에 응답이 없습니다 (브로드캐스트 핑, ID 1~12 개별 핑).');
            add('info', `받은 원본 바이트 — 브로드캐스트: ${bcRaw.length ? hex(bcRaw) : '없음'} / 개별 핑: ${pingRaw.length ? hex(pingRaw) : '없음'}`);

            // 5. verdict
            if (relayed.length) {
                verdicts.push('ok');
                this.device.setMotors(relayed, volt);
            } else if (verdicts.includes('voltage') || verdicts.includes('power')) {
                // already explained above
            } else if (count > 0) {
                verdicts.push('relay');
            } else if (count === 0) {
                verdicts.push('bus');
            }
        } catch (e) {
            add('bad', `진단 중 오류: ${e.message}`);
        } finally {
            d.timeoutMs = savedTimeout;
            d._rawTap = null;
            this.diagRunning = false;
            this.diagBtn.disabled = false;
            this.diagBtn.textContent = '진단';
        }

        const summary = {
            ok: '다이나믹셀과 통신됩니다. 목록을 갱신했습니다.',
            voltage: '→ 배터리(또는 12V 어댑터)를 CM-550에 연결하고 전원 스위치를 켠 뒤 [다이나믹셀 검색]을 누르세요.',
            power: '→ [전원 켜기]를 누르세요. 다시 꺼지면 과전류·과열 등 오류가 있는지 확인하세요.',
            relay: '→ CM-550은 다이나믹셀을 인식하지만 PC로 응답을 전달하지 않습니다. 아래 [결과 복사]로 내용을 보내 주시면 원인을 분석하겠습니다.',
            bus: '→ CM-550도 다이나믹셀을 찾지 못합니다. 케이블 방향·접촉, 다이나믹셀 통신 속도(1M)와 ID 중복을 확인하세요. ' +
                'R+ Manager 2.0에서도 보이지 않으면 다이나믹셀 펌웨어 복구가 필요할 수 있습니다.',
            controller: '→ CM-550과의 연결을 확인하세요.'
        };
        const key = ['ok', 'voltage', 'power', 'relay', 'bus', 'controller'].find(k => verdicts.includes(k));
        if (key) {
            const p = el('p', `mon-diag-summary${key === 'ok' ? ' good' : ''}`, summary[key]);
            card.append(p);
            lines.push(summary[key]);
        }
        const copy = el('button', 'mon-btn-small', '결과 복사');
        copy.addEventListener('click', () => {
            const text = `[다이나믹 메이커스 연결 진단 ${new Date().toLocaleString('ko-KR')}]\n${lines.join('\n')}`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    copy.textContent = '복사됨';
                }, () => {});
            }
        });
        card.append(copy);
        this.log(`연결 진단: ${key ? summary[key] : '완료'}`, key === 'ok' ? 'ok' : 'warn');
    }

    // ------------------------------------------------------------ polling

    setVisible (visible) {
        this.visible = visible;
        if (visible) {
            this._tick();
            if (this.device.connected && !this.motors.length && !this.scanning) this.scan(); // shares a running scan
        } else {
            clearTimeout(this.timer);
        }
    }

    onConnectionChange (connected, kindName) {
        this.cmFields.link.textContent = connected ? kindName : '연결 안 됨';
        if (!connected) {
            this._renderMotors();
            for (const f of Object.values(this.cmFields)) if (f !== this.cmFields.link) f.textContent = '–';
            for (const r of this.portRows) r.val.textContent = '';
            this._model = null;
        }
        // the extension already starts a scan on connect; the table updates via renderMotors()
    }

    async _tick () {
        clearTimeout(this.timer);
        if (!this.visible) return;
        const d = this.device;
        let interval = d.transportName === 'BLE' ? 1200 : 500;
        if (!d.connected) {
            this.stateEl.textContent = '연결 안 됨';
        } else if (this.isRunning() || this.scanning || this.diagRunning) {
            this.stateEl.textContent = this.scanning ? '검색 중' : (this.diagRunning ? '진단 중' :
                '프로그램 실행 중 — 일시 정지');
            interval = 400;
        } else {
            this.stateEl.textContent = '실시간';
            try {
                await this._poll();
            } catch (e) {
                this.stateEl.textContent = '응답 없음';
            }
        }
        this.timer = setTimeout(() => this._tick(), interval);
    }

    async _poll () {
        const d = this.device;
        const f = this.cmFields;
        if (!this._model) {
            const head = await d.readBytes(CM_ID, 0, 7);
            this._model = `${modelName(le(head, 0, 2))} / v${head[6]}`;
        }
        f.model.textContent = this._model;

        const a = await d.readBytes(CM_ID, 21, 8); // 21..28
        f.power.textContent = a[1] ? '켜짐' : '꺼짐';
        f.power.classList.toggle('mon-warn', !a[1]);
        f.button.textContent = ['–', 'START', 'MODE', 'START + MODE'][a[5]] || '–';

        const b = await d.readBytes(CM_ID, 71, 2);
        f.motions.textContent = `${le(b, 0, 2)}개`;

        const c = await d.readBytes(CM_ID, 89, 22); // 89..110
        const volt = c[0] / 10;
        f.voltage.textContent = `${volt.toFixed(1)} V`;
        f.voltage.classList.toggle('mon-warn', volt > 0 && volt < 10.5);
        f.temp.textContent = `${signed(c[1], 1)} °C`;
        const roll = le(c, 102 - 89, 2, true) / 100;
        const pitch = le(c, 104 - 89, 2, true) / 100;
        const yaw = le(c, 106 - 89, 2, true) / 100;
        f.tilt.textContent = `${roll.toFixed(1)}° / ${pitch.toFixed(1)}° / ${yaw.toFixed(1)}°`;

        for (const m of this.motors) {
            const row = this.rows.get(m.id);
            if (!row) continue;
            try {
                const r = await d.readBytes(m.id, 64, 83); // 64..146
                const at = addr => addr - 64;
                const pos = le(r, at(132), 4, true);
                row.cells.angle.textContent = `${((pos / 4096) * 360).toFixed(1)}°`;
                row.cells.temp.textContent = `${r[at(146)]} °C`;
                row.cells.volt.textContent = `${(le(r, at(144), 2) / 10).toFixed(1)} V`;
                const torque = r[at(64)];
                row.cells.torque.dataset.on = torque ? '1' : '0';
                row.cells.torque.textContent = torque ? '켜짐' : '꺼짐';
                const hw = r[at(70)];
                const errs = HW_ERRORS.filter(([bit]) => hw & bit).map(([, name]) => name);
                row.cells.status.textContent = errs.length ? `오류: ${errs.join(', ')}` :
                    (r[at(122)] ? '움직이는 중' : '정상');
                row.tr.classList.toggle('mon-err', errs.length > 0);
                row.tr.classList.remove('mon-lost');
            } catch (e) {
                row.cells.status.textContent = '응답 없음';
                row.tr.classList.add('mon-lost');
            }
        }

        for (const r of this.portRows) {
            const s = PORT_SENSORS.find(x => x.value === r.sel.value);
            if (!s || !s.spec) continue;
            try {
                const v = await d.readPort(s.spec, r.port);
                r.val.textContent = s.fmt ? s.fmt(v) : String(v);
            } catch (e) {
                r.val.textContent = '응답 없음';
            }
        }
    }
}
