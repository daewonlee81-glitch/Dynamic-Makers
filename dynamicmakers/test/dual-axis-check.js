/* Field bug regression: moving one axis of a 2XL430 while the other axis has torque on. */
const path = require('path');
const {chromium} = require(require.resolve('playwright', {paths: [__dirname, path.join(__dirname, '../../scratch-cm550')]}));
const URL = process.argv[2];
const check = (c, m) => { if (!c) throw new Error(`FAIL: ${m}`); console.log(`ok - ${m}`); };
const program = body => `<xml><block type="event_whenflagclicked" x="40" y="40"><next>${body}</next></block></xml>`;
const move = (id, deg) => `<block type="cm550_dxlMoveTo"><value name="ID"><shadow type="cm550_menu_dxlId"><field name="dxlId">${id}</field></shadow></value><value name="DEG"><shadow type="math_number"><field name="NUM">${deg}</field></shadow></value><value name="SPEED"><shadow type="math_number"><field name="NUM">50</field></shadow></value></block>`;
const wheel = id => `<block type="cm550_dxlWheel"><value name="ID"><shadow type="cm550_menu_dxlId"><field name="dxlId">${id}</field></shadow></value><value name="SPEED"><shadow type="math_number"><field name="NUM">30</field></shadow></value></block>`;
(async () => {
    const b = await chromium.launch();
    const p = await b.newPage({viewport: {width: 1366, height: 800}});
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(URL);
    await p.waitForFunction(() => document.body.classList.contains('ready'));
    await p.evaluate(() => localStorage.clear());
    await p.click('#connect-sim');
    await p.waitForFunction(() => document.getElementById('status').dataset.state === 'connected');
    const load = async xml => p.evaluate(x => {
        const SB = window.dynamicmakers.ScratchBlocks; const ws = SB.getMainWorkspace();
        ws.getTopBlocks().forEach(bl => bl.dispose());
        SB.Xml.appendDomToWorkspace(SB.utils.xml.textToDom(x), ws);
    }, xml);
    const runAndWait = async text => {
        await p.click('#console-clear');
        await p.waitForTimeout(300);
        await p.click('#run');
        await p.waitForFunction(t => document.getElementById('console-lines').textContent.includes(t), text, {timeout: 10000});
        await p.waitForTimeout(400);
        return p.textContent('#console-lines');
    };
    // other axis (ID 4) torque on, as after a kit motion
    await load(program(`<block type="cm550_dxlTorque"><value name="ID"><shadow type="cm550_menu_dxlId"><field name="dxlId">4</field></shadow></value><value name="ONOFF"><shadow type="cm550_menu_onOff"><field name="onOff">on</field></shadow></value></block>`));
    await runAndWait('다이나믹셀 4 토크 켜기');

    await load(program(move(3, 100)));
    let out = await runAndWait('다이나믹셀 3 → 100°');
    check(!out.includes('⚠'), 'axis 3 moves to 100° while axis 4 holds torque (no error)');

    await load(program(wheel(3)));
    out = await runAndWait('다이나믹셀 3 바퀴');
    check(out.includes('다이나믹셀 3 모드 → 바퀴(속도)') && out.includes('다이나믹셀 4 토크 끄기') &&
        out.includes('다이나믹셀 4 토크 켜기'), 'wheel mode: axis 4 released briefly, then restored');

    await load(program(move(9, 45)));
    await p.click('#console-clear');
    await p.click('#run');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('⚠'), null, {timeout: 10000});
    check(/⚠ ID 9: 응답 시간 초과/.test(await p.textContent('#console-lines')), 'errors from blocks appear in the output window');
    check(!errors.length, 'no page errors');
    await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
