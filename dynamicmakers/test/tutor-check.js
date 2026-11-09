// AI 튜터: drawer, numbered block listing, rule checks (no AI engine needed), line links glow blocks.
// Usage: node test/tutor-check.js http://localhost:8700/index.html
const {chromium} = require('playwright');
const URL = process.argv[2] || 'http://localhost:8700/index.html';
let failed = 0;
const check = (c, m) => { console.log(`${c ? 'ok' : 'FAIL'} - ${m}`); if (!c) failed++; };
(async () => {
    const b = await chromium.launch();
    const p = await b.newPage({viewport: {width: 1500, height: 950}});
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => localStorage.clear());
    await p.goto(URL, {waitUntil: 'networkidle'});
    check(await p.isHidden('#tutor-drawer'), 'tutor drawer starts closed');
    await p.click('#btn-tutor');
    check(await p.isVisible('#tutor-drawer .tt-actions'), 'AI 튜터 button opens the drawer');
    await p.waitForSelector('#tutor-drawer .tt-eng');
    const setup = await p.textContent('#tutor-drawer .tt-setup');
    check(/AI 엔진을 아직 설치하지 않았어요/.test(setup) && /오픈 AI 모델/.test(setup) && /Chrome 내장 AI/.test(setup),
        'engine set-up shown (open model + Chrome built-in)');

    // a program with typical mistakes
    await p.evaluate(() => {
        const {workspace} = window.dynamicmakers;
        const num = (name, v) => `<value name="${name}"><shadow type="math_number"><field name="NUM">${v}</field></shadow></value>`;
        const xml = `<xml>
          <block type="event_whenflagclicked" x="40" y="40"><next>
            <block type="cm550_motionPlay">${num('PAGE', 101)}<next>
            <block type="cm550_motionPlay">${num('PAGE', 107)}<next>
            <block type="control_forever"><statement name="SUBSTACK">
              <block type="cm550_dxlMoveTo">${num('ID', 3)}${num('DEG', 200)}${num('SPEED', 50)}</block>
            </statement></block></next></block></next></block></next></block>
          <block type="cm550_motionPlay" x="420" y="60">${num('PAGE', 999)}</block>
        </xml>`;
        window.dynamicmakers.ScratchBlocks.Xml.domToWorkspace(new DOMParser().parseFromString(xml, 'text/xml').documentElement, workspace);
    });
    const listing = await p.evaluate(() => window.dynamicmakers.tutor.blocksToText().text);
    check(/\[L1\] 깃발 클릭했을 때/.test(listing) && /\[L2\] .*모션 \[101\] 번 재생/.test(listing) && /\[L5\]\s+.*다이나믹셀 \[3\]/.test(listing) && !/\[L6\] \*/.test(listing),
        `blocks as numbered lines for the AI:\n${listing}`);
    await p.click('#tutor-drawer button[data-q="check"]');
    const rules = await p.textContent('#tutor-drawer .tt-msg.rule');
    check(/덮어써요/.test(rules), 'rule: motion right after "모션 재생" overwrites it');
    check(/기다리기가 없어요/.test(rules), 'rule: loop with motor commands but no wait');
    check(/붙지 않은 블록 묶음이 1개/.test(rules), 'rule: floating block');
    check(/모션 999번은 MAX-E1 공식 예제 모션에 없어요/.test(rules), 'rule: motion number not in the official motions');
    check(/로봇이 연결되어 있지 않아요/.test(rules), 'rule: robot not connected');
    // clicking a rule highlights its blocks
    await p.click('#tutor-drawer .tt-rule:has-text("덮어써요")');
    const glow = await p.evaluate(() => document.querySelectorAll('.dm-glow').length);
    check(glow === 2, `clicking a rule highlights its blocks (${glow})`);
    // no engine: a free question explains how to install one
    await p.fill('#tutor-drawer .tt-ask input', '왜 앉지 않아요?');
    await p.click('#tutor-drawer .tt-ask button');
    const last = await p.$$eval('#tutor-drawer .tt-msg', ms => ms.map(m => m.className + ':' + m.textContent).slice(-2));
    check(/me:왜 앉지 않아요/.test(last[0]) && /sys:AI 엔진을 아직/.test(last[1]), 'question without an engine says how to set one up');
    // ID check after connecting the virtual robot (2D: IDs 1-4)
    await p.click('#connect-sim');
    await p.waitForFunction(() => window.dynamicmakers.tutor && document.getElementById('console-lines').textContent.includes('인식'), null, {timeout: 20000}).catch(() => {});
    await p.evaluate(() => { window.dynamicmakers.workspace.getAllBlocks().filter(b => b.type === 'cm550_dxlMoveTo')[0].getInputTargetBlock('ID').setFieldValue('9', 'NUM'); });
    const r2 = await p.evaluate(() => window.dynamicmakers.tutor.ruleCheck().map(r => r.msg).join('\n'));
    check(/다이나믹셀 ID 9번은 연결된 로봇에 없어요/.test(r2), `rule: motor ID not on the connected robot (${(r2.match(/다이나믹셀 ID[^\n]*/) || [''])[0]})`);
    await p.click('#tutor-drawer .tt-x');
    check(await p.isHidden('#tutor-drawer'), 'close button hides the drawer');
    check(!errs.length, `no page errors ${errs.join(' | ')}`);
    await b.close();
    console.log(failed ? `${failed} FAILED` : 'all passed');
    process.exit(failed ? 1 : 0);
})();
