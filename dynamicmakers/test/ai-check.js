// AI 학습: camera (fake colour canvas), sound (fake tones), robot sensor (sim tilt).
// Usage: node test/ai-check.js http://localhost:8700/index.html
const {chromium} = require('playwright');
const URL = process.argv[2] || 'http://localhost:8700/index.html';
let failed = 0;
const check = (c, m) => { console.log(`${c ? 'ok' : 'FAIL'} - ${m}`); if (!c) failed++; };
const fakeMedia = () => {
    // camera = a canvas painted with window.__camColor; mic = a tone at window.__toneHz
    window.__camColor = '#d22';
    window.__toneHz = 300;
    navigator.mediaDevices.getUserMedia = async c => {
        if (c.video) {
            const cv = document.createElement('canvas');
            cv.width = 320; cv.height = 240;
            const g = cv.getContext('2d');
            setInterval(() => {
                g.fillStyle = window.__camColor; g.fillRect(0, 0, 320, 240);
                g.fillStyle = '#fff'; g.fillRect(140 + (Math.random() * 20), 100, 40, 40); // a little noise
            }, 40);
            return cv.captureStream(25);
        }
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const dest = ctx.createMediaStreamDestination();
        osc.connect(dest); osc.start();
        setInterval(() => { osc.frequency.value = window.__toneHz; }, 30);
        return dest.stream;
    };
};
(async () => {
    const b = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
    const ctx = await b.newContext({viewport: {width: 1400, height: 900}});
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('dialog', d => d.accept());
    await p.addInitScript(fakeMedia);
    await p.addInitScript(() => { if (!sessionStorage.getItem('keep')) localStorage.clear(); sessionStorage.setItem('keep', '1'); });
    await p.goto(URL, {waitUntil: 'networkidle'});
    await p.click('#view-ai');
    check(await p.isVisible('#ai'), 'AI panel opens');

    const out = () => p.$eval('#console-lines', e => e.textContent);
    const count = i => p.$eval(`.ai-kind >> nth=${i}`, e => parseInt(e.querySelector('.ai-count').textContent, 10)).catch(() => 0);
    const collect = async (i, ms) => {
        const h = p.locator('.ai-hold').nth(i);
        const box = await h.boundingBox();
        await p.mouse.move(box.x + 10, box.y + 8);
        await p.mouse.down();
        await p.waitForTimeout(ms);
        await p.mouse.up();
    };
    const waitResult = async (text, ms = 8000) => {
        try {
            await p.waitForFunction(t => document.querySelector('.ai-result').textContent.includes(t), text, {timeout: ms});
            return true;
        } catch (e) { return false; }
    };

    // ---- camera -------------------------------------------------------------
    await p.click('.aip .mon-btn'); // 인식 시작
    await p.waitForFunction(() => /인식하는 중|예시를 모아/.test(document.querySelector('.aip .mon-state').textContent), null, {timeout: 30000});
    check(true, 'camera + embedded MobileNet loaded (offline)');
    await p.fill('.ai-kind-name >> nth=0', '빨강');
    await p.press('.ai-kind-name >> nth=0', 'Enter');
    await p.locator('.ai-kind-name').nth(0).evaluate(e => e.blur());
    await p.fill('.ai-kind-name >> nth=1', '파랑');
    await p.locator('.ai-kind-name').nth(1).evaluate(e => e.blur());
    await p.evaluate(() => { window.__camColor = '#d22'; });
    await collect(0, 2500);
    await p.evaluate(() => { window.__camColor = '#23c'; });
    await p.waitForTimeout(300);
    await collect(1, 2500);
    const n0 = await count(0); const n1 = await count(1);
    check(n0 >= 8 && n1 >= 8, `examples collected while holding (빨강 ${n0}, 파랑 ${n1})`);
    check(await waitResult('지금: 파랑'), 'blue card → 파랑');
    await p.evaluate(() => { window.__camColor = '#d22'; });
    check(await waitResult('지금: 빨강'), 'red card → 빨강');
    await p.screenshot({path: '/home/claude/work/ai-camera.png'});

    // blocks from the kinds; Python; program reacts
    await p.click('text=예시 블록 만들기');
    await p.waitForTimeout(700);
    const py = await p.$eval('#python', e => e.textContent).catch(() => '');
    await p.click('#view-python');
    const py2 = await p.$eval('#python', e => e.textContent);
    check(py2.includes('@ai.when_recognized("빨강")') && py2.includes('@ai.when_recognized("파랑")'), 'Python shows @ai.when_recognized');
    await p.click('#view-ai');
    await p.click('#run');
    await p.evaluate(() => { window.__camColor = '#23c'; });
    await p.waitForFunction(() => [...document.querySelectorAll('#console-lines .line')].some(l => l.textContent.endsWith('파랑')), null, {timeout: 8000})
        .then(() => check(true, 'program: "AI가 파랑 을(를) 알아봤을 때" fires → says 파랑'))
        .catch(() => check(false, 'program reacts to recognition'));
    await p.click('#stop');

    // saved with the project (autosave) and restored after reload
    await p.waitForTimeout(1200);
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /autosave/i.test(k)) || 'x') || '{}'));
    const proj = saved.project ? JSON.parse(saved.project) : {};
    check(proj.dynamicmakers && proj.dynamicmakers.ai && proj.dynamicmakers.ai.classes.length === 2, 'examples saved in the project file');
    await p.reload({waitUntil: 'networkidle'});
    await p.click('#view-ai');
    await p.waitForTimeout(500);
    const names = await p.$$eval('.ai-kind-name', es => es.map(e => e.value));
    const c0 = await count(0);
    check(names.join(',') === '빨강,파랑' && c0 >= 8, `restored after reload (${names.join(',')} · ${c0}개)`);

    // ---- sound ----------------------------------------------------------------
    await p.click('.ai-src[data-kind="sound"]'); // confirm → clears
    check((await count(0)) === 0, 'switching input clears examples');
    await p.click('.aip .mon-btn');
    await p.waitForTimeout(800);
    await p.evaluate(() => { window.__toneHz = 250; });
    await p.waitForTimeout(400);
    await collect(0, 2000);
    await p.evaluate(() => { window.__toneHz = 3000; });
    await p.waitForTimeout(1100); // let the 1-second window fill with the new tone
    await collect(1, 2000);
    check(await waitResult('지금: 파랑'), 'high tone → kind 2');
    await p.evaluate(() => { window.__toneHz = 250; });
    check(await waitResult('지금: 빨강'), 'low tone → kind 1');
    await p.screenshot({path: '/home/claude/work/ai-sound.png'});

    // ---- robot sensor (virtual robot) --------------------------------------------
    await p.click('.aip .mon-btn'); // stop
    await p.click('#connect-sim');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('개 인식'));
    await p.click('.ai-src[data-kind="sensor"]');
    await p.fill('.ai-kind-name >> nth=0', '똑바로');
    await p.locator('.ai-kind-name').nth(0).evaluate(e => e.blur());
    await p.fill('.ai-kind-name >> nth=1', '기울어짐');
    await p.locator('.ai-kind-name').nth(1).evaluate(e => e.blur());
    await p.evaluate(() => { window.__dmSimTilt = {roll: 0}; });
    await p.click('.aip .mon-btn');
    await p.waitForTimeout(1200);
    await collect(0, 2000);
    await p.evaluate(() => { window.__dmSimTilt = {roll: 35}; });
    await p.waitForTimeout(1200);
    await collect(1, 2000);
    check(await waitResult('지금: 기울어짐'), 'tilted robot → 기울어짐');
    await p.evaluate(() => { window.__dmSimTilt = {roll: 0}; });
    check(await waitResult('지금: 똑바로'), 'upright robot → 똑바로');
    await p.screenshot({path: '/home/claude/work/ai-sensor.png'});
    check(errs.length === 0, `no page errors ${errs.join('; ')}`);
    await b.close();
    process.exit(failed ? 1 : 0);
})();
