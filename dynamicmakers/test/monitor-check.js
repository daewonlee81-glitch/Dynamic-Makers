/* Monitor check against the virtual robot. Usage: node test/monitor-check.js <url> */
const path = require('path');
const {chromium} = require(require.resolve('playwright', {paths: [__dirname, path.join(__dirname, '../../scratch-cm550')]}));
const URL = process.argv[2];
const check = (c, m) => { if (!c) throw new Error(`FAIL: ${m}`); console.log(`ok - ${m}`); };
(async () => {
    const b = await chromium.launch();
    const p = await b.newPage({viewport: {width: 1366, height: 800}});
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(URL);
    await p.waitForFunction(() => document.body.classList.contains('ready'));
    await p.evaluate(() => localStorage.clear());
    await p.click('#connect-sim');
    await p.click('#view-monitor');
    await p.waitForFunction(() => document.querySelectorAll('#monitor tbody tr').length === 4, null, {timeout: 10000});
    check(!(await p.isVisible('#python')), 'monitor replaces the Python panel');
    const rows = await p.$$eval('#monitor tbody tr', trs => trs.map(tr => [...tr.children].slice(0, 7).map(td => td.textContent)));
    console.log(rows.map(r => r.join(' | ')).join('\n'));
    check(rows.map(r => r[0]).join(',') === '1,2,3,4', 'broadcast scan lists IDs 1-4');
    check(rows[0][1] === 'XL430-W250' && rows[2][1].startsWith('2XL430-W250') && rows[2][1].includes('모듈1 A축'),
        'model names shown (with 2XL430 module/axis)');
    await p.waitForFunction(() => document.querySelector('#monitor tbody tr td:nth-child(3)').textContent.includes('°'));
    check(true, 'live angle / temperature / voltage values');
    const cm = await p.$$eval('#monitor .mon-v', v => v.map(x => x.textContent));
    console.log('CM-550:', cm.join(' | '));
    check(cm[1].startsWith('CM-550') && cm[2] === '12.0 V', 'controller model, firmware and voltage');
    // port 1 = distance sensor
    await p.selectOption('#monitor .mon-ports select >> nth=0', 'dms');
    await p.waitForFunction(() => /\d/.test(document.querySelector('#monitor .mon-port-val').textContent), null, {timeout: 5000});
    check(true, `port 1 distance value: ${await p.textContent('#monitor .mon-port-val')}`);
    // find ID 2 → LED blinks (virtual robot logs it)
    await p.click('#console-clear');
    await p.click('#monitor tbody tr:nth-child(2) .mon-btn-small');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('다이나믹셀 2 LED 켜기'));
    check(true, '찾기 blinks the LED of ID 2');
    // torque toggle on ID 1
    await p.click('#monitor tbody tr:nth-child(1) .mon-toggle');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('다이나믹셀 1 토크 켜기'));
    check(true, 'torque toggle writes Torque Enable');
    // running a program pauses polling
    await p.evaluate(() => {
        const SB = window.dynamicmakers.ScratchBlocks; const ws = SB.getMainWorkspace();
        ws.getTopBlocks().forEach(bl => bl.dispose());
        SB.Xml.appendDomToWorkspace(SB.utils.xml.textToDom('<xml><block type="event_whenflagclicked" x="40" y="40"><next><block type="control_wait"><value name="DURATION"><shadow type="math_positive_number"><field name="NUM">2</field></shadow></value></block></next></block></xml>'), ws);
    });
    await p.waitForTimeout(400);
    await p.click('#run');
    await p.waitForFunction(() => document.querySelector('#monitor .mon-state').textContent.includes('일시 정지'));
    check(true, 'monitor pauses while a program runs');
    await p.waitForFunction(() => document.querySelector('#monitor .mon-state').textContent === '실시간', null, {timeout: 8000});
    check(true, 'monitor resumes after the program ends');
    await p.screenshot({path: path.join(__dirname, '..', 'screenshots', '5-monitor.png')});
    await p.click('#view-python');
    check(await p.isVisible('#python') && !(await p.isVisible('#monitor')), 'switch back to Python view');
    check(!errors.length, `no page errors ${errors.join(' / ')}`);
    await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
