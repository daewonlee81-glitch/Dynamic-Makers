/* End-to-end check of the built app in headless Chromium.
 * Usage: node test/e2e.js [baseURL]   (serve ./dist first)
 * Requires playwright (resolved from ../scratch-cm550/node_modules). */
const path = require('path');
const fs = require('fs');
const {chromium} = require(require.resolve('playwright', {paths: [__dirname, path.join(__dirname, '../../scratch-cm550')]}));

const BASE = process.argv[2] || 'http://localhost:8700/index.html';
const SHOTS = process.env.SHOTS || path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(SHOTS, {recursive: true});

const check = (cond, msg) => {
    if (!cond) throw new Error(`FAIL: ${msg}`);
    console.log(`ok - ${msg}`);
};

(async () => {
    // UTF-8 locale so Korean download names survive (containers often have none)
    const browser = await chromium.launch({env: Object.assign({}, process.env, {LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8'})});
    const context = await browser.newContext({viewport: {width: 1366, height: 800}, acceptDownloads: true});
    await context.addInitScript({path: path.join(__dirname, 'fake-cm550.js')});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(BASE, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.body.classList.contains('ready'));
    await page.evaluate(() => localStorage.clear());

    const python = () => page.locator('#python pre').nth(1).innerText();
    const consoleText = () => page.locator('#console-lines').innerText();

    // ---- connect over (fake) USB ------------------------------------------
    await page.click('#connect-usb');
    await page.waitForFunction(() => document.getElementById('status').dataset.state === 'connected');
    check(true, 'USB connect via top bar');
    check((await consoleText()).includes('USB로 연결되었습니다'), 'connection logged in output console');

    // ---- build a program through the Blockly API (fires the same events as dragging)
    await page.evaluate(() => {
        const {ScratchBlocks} = window.dynamicmakers;
        const ws = ScratchBlocks.getMainWorkspace();
        ws.createVariable('점수', '', 'var-score');
        const xml = `<xml>
          <block type="event_whenflagclicked" x="60" y="200">
            <next><block type="looks_say"><value name="MESSAGE"><shadow type="text"><field name="TEXT">출발!</field></shadow></value>
            <next><block type="data_setvariableto"><field name="VARIABLE" id="var-score">점수</field>
              <value name="VALUE"><shadow type="text"><field name="TEXT">0</field></shadow></value>
            <next><block type="cm550_dxlMoveTo">
              <value name="ID"><shadow type="cm550_menu_dxlId"><field name="dxlId">1</field></shadow></value>
              <value name="DEG"><shadow type="math_number"><field name="NUM">90</field></shadow></value>
              <value name="SPEED"><shadow type="math_number"><field name="NUM">50</field></shadow></value>
            <next><block type="control_repeat">
              <value name="TIMES"><shadow type="math_whole_number"><field name="NUM">3</field></shadow></value>
              <statement name="SUBSTACK"><block type="data_changevariableby"><field name="VARIABLE" id="var-score">점수</field>
                <value name="VALUE"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
                <next><block type="cm550_cmLed"><field name="COLOR">green</field>
                  <value name="ONOFF"><shadow type="cm550_menu_onOff"><field name="onOff">on</field></shadow></value></block></next>
              </block></statement>
            <next><block type="looks_say"><value name="MESSAGE"><shadow type="text"><field name="TEXT"></field></shadow>
              <block type="operator_join"><value name="STRING1"><shadow type="text"><field name="TEXT">거리: </field></shadow></value>
                <value name="STRING2"><shadow type="text"><field name="TEXT"></field></shadow>
                  <block type="cm550_portSensor"><field name="SENSOR">dms</field>
                    <value name="PORT"><shadow type="cm550_menu_port5"><field name="port5">1</field></shadow></value></block></value></block></value>
            <next><block type="cm550_dxlWheelTwo">
              <value name="ID1"><shadow type="cm550_menu_dxlId"><field name="dxlId">1</field></shadow></value>
              <value name="SPEED1"><shadow type="math_number"><field name="NUM">50</field></shadow></value>
              <value name="ID2"><shadow type="cm550_menu_dxlId"><field name="dxlId">2</field></shadow></value>
              <value name="SPEED2"><shadow type="math_number"><field name="NUM">-50</field></shadow></value>
            </block></next></block></next></block></next></block></next></block></next></block></next>
          </block></xml>`;
        // remove the starter hat so there is one flag script
        ws.getTopBlocks().forEach(b => b.dispose());
        ScratchBlocks.Xml.appendDomToWorkspace(ScratchBlocks.utils.xml.textToDom(xml), ws);
    });
    await page.waitForTimeout(600);
    const code = await python();
    check(code.includes('dxl.move_to(1, 90, speed=50)') && code.includes('점수 += 1') &&
        code.includes('print("거리: " + str(port(1).dms()))'), 'Python panel follows the program');

    // ---- also a real mouse drag from the 다이나믹셀 category --------------------
    await page.click('.blocklyToolboxCategory#db_dxl');
    await page.waitForTimeout(800);
    await page.screenshot({path: path.join(SHOTS, '1-dynamixel-category.png')});
    // pick the flyout block by type (DOM order of the palette is not guaranteed)
    const box = await page.evaluate(() => {
        const ws = window.dynamicmakers.ScratchBlocks.getMainWorkspace();
        const blk = ws.getFlyout().getWorkspace()
            .getTopBlocks(false)
            .find(bl => bl.type === 'cm550_dxlStop');
        const r = blk.getSvgRoot().getBoundingClientRect();
        return {x: r.x, y: r.y, width: r.width, height: r.height};
    });
    const ws = await page.locator('#blocks .blocklyMainBackground').boundingBox();
    await page.mouse.move(box.x + 12, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + 30, {steps: 6});
    await page.mouse.move(ws.x + ws.width - 220, ws.y + 120, {steps: 14});
    await page.mouse.up();
    await page.waitForTimeout(600);
    check((await python()).includes('묶음 1개'), 'mouse drag from flyout reaches the VM (loose stack noted)');

    // ---- run ------------------------------------------------------------------
    await page.evaluate(() => {
        window.__fake.writes.length = 0;
    });
    await page.click('#run');
    await page.waitForFunction(() => window.__fake.writes.some(w => w[0] === 'sync'), null, {timeout: 15000});
    await page.waitForFunction(() => !document.body.classList.contains('running'), null, {timeout: 15000});
    const writes = await page.evaluate(() => window.__fake.writes);
    if (process.env.DEBUG) console.log(JSON.stringify(writes), await consoleText());
    check(writes.some(w => w[0] === 1 && w[1] === 116 && w[2] === 1024), 'run: DYNAMIXEL 1 goal position 1024 (90°)');
    check(writes.filter(w => w[0] === 200 && w[1] === 92 && w[2] === 1).length === 3, 'run: green LED written 3 times in loop');
    check(writes.some(w => w[0] === 'sync' && w[1] === 104), 'run: wheels sent with SYNC WRITE goal velocity');
    const out = await consoleText();
    check(out.includes('출발!') && out.includes('거리: 512'), 'say blocks print to the output console (DMS value 512)');
    const score = await page.evaluate(() => {
        const {vm} = window.dynamicmakers;
        const v = Object.values(vm.runtime.getTargetForStage().variables).find(x => x.name === '점수');
        return v && v.value;
    });
    check(Number(score) === 3, 'variable 점수 counted to 3');

    // ---- variable via toolbox button + prompt dialog --------------------------
    await page.click('.blocklyToolboxCategory#variables');
    await page.waitForTimeout(500);
    await page.locator('.blocklyFlyoutButton', {hasText: '변수 만들기'}).click();
    await page.waitForSelector('.db-overlay .db-input');
    await page.fill('.db-overlay .db-input', '속도');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    const hasVar = await page.evaluate(() => {
        const {vm} = window.dynamicmakers;
        return Object.values(vm.runtime.getAllVarNamesOfType ? vm.runtime.getTargetForStage().variables : {})
            .some(v => v.name === '속도');
    });
    check(hasVar, 'new variable "속도" created through the prompt dialog');

    // ---- custom block editor --------------------------------------------------
    await page.click('.blocklyToolboxCategory#myBlocks');
    await page.waitForTimeout(500);
    await page.locator('.blocklyFlyoutButton', {hasText: '블록 만들기'}).click();
    await page.waitForSelector('.db-proc-workspace .blocklySvg');
    await page.click('text=+ 입력값 (숫자/문자)');
    await page.waitForTimeout(300);
    await page.screenshot({path: path.join(SHOTS, '2-make-block.png')});
    await page.click('.db-overlay .db-btn-primary');
    await page.waitForTimeout(700);
    check(/def \S+\(\S+\):/.test(await python()), 'custom block definition appears as def in Python');

    // ---- save / new / open ------------------------------------------------------
    await page.fill('#project-name', '데모 로봇');
    const before = await python();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
    const saved = path.join(SHOTS, `${dl.suggestedFilename()}`);
    await dl.saveAs(saved);
    check(dl.suggestedFilename() === '데모 로봇.dmk', `save downloads "<name>.dmk" (got ${dl.suggestedFilename()})`);
    await page.click('#new');
    await page.waitForTimeout(300);
    // just saved → no "discard changes?" confirmation expected
    check(await page.locator('.db-overlay').count() === 0, 'no discard warning right after saving');
    await page.waitForTimeout(800);
    check(!(await python()).includes('dxl.move_to'), 'new program clears the workspace');
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#open')]);
    await fc.setFiles(saved);
    await page.waitForTimeout(1500);
    check((await python()) === before, 'opening the saved .dmk restores the exact program');
    const [pyDl] = await Promise.all([page.waitForEvent('download'), page.click('#save-py')]);
    check(pyDl.suggestedFilename() === '데모 로봇.py', '.py export');

    // ---- autosave survives reload ------------------------------------------------
    await page.waitForTimeout(1200);
    await page.reload({waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.body.classList.contains('ready'));
    await page.waitForTimeout(800);
    check((await python()) === before && (await page.inputValue('#project-name')) === '데모 로봇',
        'auto-save restores program and name after reload');

    await page.evaluate(() => {
        const {ScratchBlocks} = window.dynamicmakers;
        const ws = ScratchBlocks.getMainWorkspace();
        const blk = ws.newBlock('control_wait');
        blk.initSvg();
        blk.render();
        blk.moveBy(500, 420);
    });
    await page.waitForTimeout(1000);
    await page.click('#new');
    await page.waitForSelector('.db-overlay');
    await page.screenshot({path: path.join(SHOTS, '3-confirm-new.png')});
    await page.click('.db-overlay .db-btn:not(.db-btn-primary)');
    check((await python()).includes('dxl.move_to'), 'unsaved change → confirmation; cancel keeps the program');
    await page.evaluate(() => {
        const ws = window.dynamicmakers.ScratchBlocks.getMainWorkspace();
        ws.getTopBlocks().filter(b => b.type === 'control_wait')
            .forEach(b => b.dispose());
        ws.getTopBlocks().filter(b => b.type === 'cm550_dxlStop')
            .forEach(b => b.dispose());
        ws.cleanUp();
    });
    await page.waitForTimeout(600);
    await page.click('.blocklyToolboxCategory#db_dxl');
    await page.waitForTimeout(500);
    // ---- virtual robot -------------------------------------------------------
    // (the reload above already dropped the USB link)
    if (await page.locator('#disconnect').isVisible()) await page.click('#disconnect');
    await page.waitForFunction(() => document.getElementById('status').dataset.state === 'idle');
    await page.click('#connect-sim');
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('가상 로봇'));
    await page.click('#console-clear');
    await page.click('#run');
    await page.waitForFunction(() => document.getElementById('console-lines').textContent.includes('바퀴'), null, {timeout: 15000});
    await page.waitForTimeout(500);
    const simOut = await consoleText();
    check(simOut.includes('🤖 다이나믹셀 1 → 90°') && simOut.includes('🤖 CM-550 LED: 초록') &&
        simOut.includes('🤖 다이나믹셀 2 바퀴 -50%') && /거리: \d+/.test(simOut),
    'virtual robot reports moves, LED, wheels and a sensor value');
    await page.screenshot({path: path.join(SHOTS, '0-main.png')});
    fs.unlinkSync(saved);
    check(errors.length === 0, `no page errors ${errors.length ? JSON.stringify(errors) : ''}`);
    await browser.close();
})().catch(async e => {
    console.error(e.message);
    process.exit(1);
});
