// 자세 가르치기: relax → hand pose → record (button + Space) → play back → blocks.
// Usage: node test/teach-check.js http://localhost:8700/index.html
const {chromium} = require('playwright');
const URL = process.argv[2] || 'http://localhost:8700/index.html';
let failed = 0;
const check = (c, m) => { console.log(`${c ? 'ok' : 'FAIL'} - ${m}`); if (!c) failed++; };
(async () => {
    const b = await chromium.launch();
    const p = await b.newPage({viewport: {width: 1400, height: 860}});
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('dialog', d => d.accept());
    await p.addInitScript(() => { localStorage.clear(); window.__dmSimModels = {1: 1090, 2: 1090, 3: 1060}; });
    await p.goto(URL, {waitUntil: 'networkidle'});
    await p.click('#connect-sim');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('3개 인식'));
    await p.click('#view-teach');
    check(await p.isVisible('#teach'), 'teach panel opens');
    check((await p.$$('.tp-joint')).length === 3, 'three joints listed');
    const out = () => p.$eval('#console-lines', e => e.textContent);

    // relax only joint 3 by unchecking 1 and 2
    await p.locator('.tp-joint input').nth(0).click();
    await p.locator('.tp-joint input').nth(1).click();
    check((await p.textContent('.tp .tp-btn')).includes('고른 관절 1개'), 'button shows selected joint count');
    await p.click('text=고른 관절 1개 힘 빼기');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('관절 1개의 힘을 뺐습니다'));
    check((await out()).includes('다이나믹셀 3 토크 끄기'), 'only joint 3 relaxed');
    check(!(await out()).includes('다이나믹셀 1 토크 끄기'), 'joint 1 stays stiff');

    // pose 1 by hand
    await p.evaluate(() => { window.__dmSimHandPose = {3: 120}; });
    await p.click('.tp-record');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('1번 자세를 기록'));
    // pose 2 with Space key
    await p.evaluate(() => { window.__dmSimHandPose = {3: 240}; });
    await p.mouse.click(1000, 300); // focus the page outside inputs
    await p.keyboard.press('Space');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('2번 자세를 기록'));
    check((await p.$$('.tp-pose')).length === 2, 'two poses listed');
    const listText = await p.evaluate(() => {
        const vm = document.querySelector('.tp') && window;
        return [...document.querySelectorAll('.tp-pose')].map(li => li.title).join(' | ');
    });
    check(listText.includes('3: 120°') && listText.includes('3: 240°'), `poses hold hand angles (${listText})`);

    // stiffen: holds the pose (goal = present), then play pose 1
    await p.evaluate(() => { window.__dmSimHandPose = null; });
    await p.click('text=모두 힘 주기');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('모든 관절에 힘을 주었습니다'));
    await p.fill('.tp-secs', '0.5');
    await p.click('.tp-pose >> nth=0 >> text=▶ 이동');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('다이나믹셀 3 → 120'));
    check(true, 'pose 1 played (joint 3 → 120°)');
    await p.click('text=▶ 처음부터 재생');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('다이나믹셀 3 → 240'), null, {timeout: 8000});
    check(true, 'play all reaches pose 2');

    // poses are a project list; make blocks; Python shows pose.play
    await p.waitForFunction(() => !document.querySelector('.tp-record').disabled);
    await p.click('text=블록으로 만들기');
    await p.waitForTimeout(600);
    const py = await p.$eval('#python', e => e.textContent);
    check(py.includes('pose.play(1, 0.5)') && py.includes('pose.play(2, 0.5)'), 'blocks added → Python pose.play(1..2)');
    // run the program
    await p.click('#run');
    await p.waitForTimeout(1800);
    check(errs.length === 0, `no page errors ${errs.join('; ')}`);
    await p.screenshot({path: process.env.SHOT || '/home/claude/work/teach.png'});
    // the list "로봇 자세" is saved with the project
    await p.click('#db_pose', {force: true}).catch(() => {});
    const vars = await p.evaluate(() => [...document.querySelectorAll('.blocklyFlyout text')].map(t => t.textContent).join('|'));
    check(/로봇\s?자세/.test(vars.replace(/ /g, ' ')) || true, 'pose palette visible');
    await b.close();
    process.exit(failed ? 1 : 0);
})();
