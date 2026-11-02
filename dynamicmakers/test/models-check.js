/* Automatic per-model behaviour: labels, module blocks, grip, warnings. */
const path = require('path');
const {chromium} = require(require.resolve('playwright', {paths: [__dirname, path.join(__dirname, '../../scratch-cm550')]}));
const URL = process.argv[2];
const SHOTS = path.join(__dirname, '..', 'screenshots');
const check = (c, m) => { if (!c) throw new Error(`FAIL: ${m}`); console.log(`ok - ${m}`); };
const open = async (b, models) => {
    const ctx = await b.newContext({viewport: {width: 1366, height: 820}});
    await ctx.addInitScript(m => { if (m) window.__dmSimModels = m; }, models);
    const p = await ctx.newPage();
    p.errors = [];
    p.on('pageerror', e => p.errors.push(e.message));
    await p.goto(URL);
    await p.waitForFunction(() => document.body.classList.contains('ready'));
    await p.evaluate(() => localStorage.clear());
    return {ctx, p};
};
const load = (p, xml) => p.evaluate(x => {
    const SB = window.dynamicmakers.ScratchBlocks; const ws = SB.getMainWorkspace();
    ws.getTopBlocks().forEach(bl => bl.dispose());
    SB.Xml.appendDomToWorkspace(SB.utils.xml.textToDom(x), ws);
}, xml);
const consoleText = p => p.textContent('#console-lines');
// Blockly renders spaces as U+00A0; normalise for comparisons
const flyoutTexts = p => p.$$eval('.blocklyFlyout text', t => t.map(x => x.textContent.replace(/\u00a0/g, ' ')));

(async () => {
    const b = await chromium.launch();

    // ---- A: your robot — six 2XL430 modules, IDs 1..12 ------------------------
    const all2xl = Object.fromEntries(Array.from({length: 12}, (_, i) => [i + 1, 1090]));
    let {ctx, p} = await open(b, all2xl);
    // a program made before connecting: ID 3 shows as plain "3"
    await load(p, `<xml><block type="event_whenflagclicked" x="40" y="40"><next><block type="cm550_dxlMoveTo"><value name="ID"><shadow type="cm550_menu_dxlId"><field name="dxlId">3</field></shadow></value><value name="DEG"><shadow type="math_number"><field name="NUM">100</field></shadow></value><value name="SPEED"><shadow type="math_number"><field name="NUM">50</field></shadow></value></block></next></block></xml>`);
    await p.click('#connect-sim');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('인식'));
    const out = await consoleText(p);
    check(/다이나믹셀 12개 인식: 2XL430 12개 · 2축 모듈 6개/.test(out), 'scan on connect: 12 axes, 6 modules recognised');
    const relabelled = await p.waitForFunction(() => [...document.querySelectorAll('.blocklyBlockCanvas text')]
        .some(t => t.textContent.replace(/\u00a0/g, ' ').includes('3 · 2XL430 A축')), null, {timeout: 5000}).then(() => true, () => false);
    check(relabelled, 'existing block relabelled: "3 · 2XL430 A축"');
    await p.click('.blocklyToolboxCategory#db_mymotors');
    await p.waitForTimeout(600);
    const fly = await flyoutTexts(p);
    if (process.env.DEBUG) console.log(fly);
    check(fly.some(t => t.includes('2축 모듈 6개')) && fly.some(t => t.includes('모듈 1 (ID 1·2)')), '연결된 모터: module blocks with "모듈 1 (ID 1·2)"');
    check(!fly.some(t => t.includes('잡기')), 'no grip block (2XL430 has no current control)');
    await p.screenshot({path: path.join(SHOTS, '7-connected-motors.png')});
    // open the ID dropdown of the workspace block
    await p.click('.blocklyBlockCanvas .blocklyDropdownText >> text=/3.·.2XL430/');
    await p.waitForTimeout(400);
    const items = [...new Set(await p.$$eval('.blocklyDropDownDiv [role=option]', e => e.map(x => x.textContent.replace(/\u00a0/g, ' ').trim())))];
    check(items[0] === '1 · 2XL430 A축' && items[1] === '2 · 2XL430 B축' && items.includes('13'), `ID menu: ${items.slice(0, 3).join(' / ')} … 13 …`);
    await p.keyboard.press('Escape');
    // run the module block
    await load(p, `<xml><block type="event_whenflagclicked" x="40" y="40"><next><block type="cm550_dxlModuleMove"><field name="MODULE">5,6</field><value name="DEGA"><shadow type="math_number"><field name="NUM">90</field></shadow></value><value name="DEGB"><shadow type="math_number"><field name="NUM">270</field></shadow></value></block></next></block></xml>`);
    await p.waitForTimeout(300);
    await p.click('#console-clear');
    await p.click('#run');
    await p.waitForFunction(() => /다이나믹셀 6 → 270/.test(document.getElementById('console-lines').textContent), null, {timeout: 8000});
    check(/다이나믹셀 5 → 90/.test(await consoleText(p)), 'module 3 (ID 5·6) moves A→90°, B→270°');
    check((await p.textContent('#python')).includes('dxl.move_together({5: 90, 6: 270})'), 'Python: dxl.move_together({5: 90, 6: 270})');
    await p.click('#view-monitor');
    await p.waitForFunction(() => document.querySelectorAll('#monitor .mon-axis').length === 12);
    check((await p.textContent('#monitor tbody tr:nth-child(4)')).includes('모듈2 B축'), 'monitor shows "모듈2 B축" for ID 4');
    check(!p.errors.length, 'no page errors');
    await ctx.close();

    // ---- B: XL330 gripper on the CM-550 bus ----------------------------------
    ({ctx, p} = await open(b, {1: 1200, 2: 1060}));
    await p.click('#connect-sim');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('인식'));
    check(/ID 1: XL330-M288의 정격 전압은 3.7~6 V인데 CM-550이 12.0 V/.test(await consoleText(p)), 'XL330 on 12 V bus → damage warning');
    await p.click('.blocklyToolboxCategory#db_mymotors');
    await p.waitForTimeout(600);
    check((await flyoutTexts(p)).some(t => t.includes('힘 조절(전류 제어) 모터: ID 1')), 'grip block offered for XL330 (ID 1)');
    await load(p, `<xml><block type="event_whenflagclicked" x="40" y="40"><next><block type="cm550_dxlGrip"><value name="ID"><shadow type="cm550_menu_dxlId"><field name="dxlId">1</field></shadow></value><value name="FORCE"><shadow type="math_number"><field name="NUM">30</field></shadow></value><value name="DEG"><shadow type="math_number"><field name="NUM">200</field></shadow></value><next><block type="cm550_dxlGrip"><value name="ID"><shadow type="cm550_menu_dxlId"><field name="dxlId">2</field></shadow></value><value name="FORCE"><shadow type="math_number"><field name="NUM">30</field></shadow></value><value name="DEG"><shadow type="math_number"><field name="NUM">200</field></shadow></value></block></next></block></next></block></xml>`);
    await p.waitForTimeout(300);
    await p.click('#console-clear');
    await p.click('#run');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('⚠'), null, {timeout: 8000});
    const g = await consoleText(p);
    check(/다이나믹셀 1 모드 → 전류 기반 위치\(잡기\)/.test(g) && /다이나믹셀 1 잡는 힘 30%/.test(g) && /다이나믹셀 1 → 200°/.test(g),
        'grip on XL330: current-based position mode, 30% force, goal 200°');
    check(/다이나믹셀 2: XL430-W250은\(는\) 전류\(힘\) 제어를 지원하지 않습니다/.test(g), 'grip on XL430 → clear "not supported" message');
    check(!p.errors.length, 'no page errors');
    await ctx.close();
    await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
