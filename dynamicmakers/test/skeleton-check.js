// 몸 동작(스켈레톤): fake camera shows a photo of a person (arms straight out).
// Usage: node test/skeleton-check.js http://localhost:8700/index.html <person.jpg>
const fs = require('fs');
const {chromium} = require('playwright');
const URL = process.argv[2] || 'http://localhost:8700/index.html';
const IMG = `data:image/jpeg;base64,${fs.readFileSync(process.argv[3] || '/home/claude/work/posetest/pose.jpg').toString('base64')}`;
let failed = 0;
const check = (c, m) => { console.log(`${c ? 'ok' : 'FAIL'} - ${m}`); if (!c) failed++; };
(async () => {
    const b = await chromium.launch();
    const p = await b.newPage({viewport: {width: 1440, height: 900}});
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('dialog', d => d.accept());
    await p.addInitScript(src => {
        localStorage.clear();
        window.__dmSimModels = {1: 1090, 2: 1090};
        window.__mirror = false; // flip the photo = the other leg bent
        navigator.mediaDevices.getUserMedia = async () => {
            const img = new Image();
            img.src = src;
            await img.decode();
            const cv = document.createElement('canvas');
            cv.width = 640; cv.height = 427;
            const g = cv.getContext('2d');
            setInterval(() => {
                g.save();
                if (window.__mirror) { g.translate(640, 0); g.scale(-1, 1); }
                g.drawImage(img, 0, 0, 640, 427);
                g.restore();
            }, 40);
            return cv.captureStream(25);
        };
    }, IMG);
    await p.goto(URL, {waitUntil: 'networkidle'});
    await p.click('#connect-sim');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('2개 인식'));
    await p.click('#view-ai');
    await p.click('.ai-src[data-kind="body"]');
    check(await p.isVisible('text=따라 하기 예시 블록'), 'body input selected; follow button shown');
    await p.click('.aip .mon-btn'); // 인식 시작
    await p.waitForFunction(() => /사람 보임/.test((document.querySelector('.ai-angle-head') || {}).textContent || ''), null, {timeout: 60000});
    check(true, 'MoveNet (embedded) finds the person');
    const angles = await p.$$eval('.ai-angle', es => Object.fromEntries(es.map(e => [e.firstChild.textContent, parseInt(e.lastChild.textContent, 10)])));
    console.log('   angles:', JSON.stringify(angles));
    check(Math.abs(angles['왼쪽 어깨'] - 90) < 20 && Math.abs(angles['오른쪽 어깨'] - 90) < 20, 'both arms out → shoulders ≈ 90°');
    check(Math.abs(angles['몸 기울기']) < 15, 'body upright → lean ≈ 0°');
    await p.waitForTimeout(500);
    await p.screenshot({path: '/home/claude/work/skeleton.png'});

    // AI 학습 with the pose: original vs mirrored photo (the other leg bent)
    await p.fill('.ai-kind-name >> nth=0', '왼쪽 런지');
    await p.locator('.ai-kind-name').nth(0).evaluate(e => e.blur());
    await p.fill('.ai-kind-name >> nth=1', '오른쪽 런지');
    await p.locator('.ai-kind-name').nth(1).evaluate(e => e.blur());
    const collect = async (i, ms) => {
        const box = await p.locator('.ai-hold').nth(i).boundingBox();
        await p.mouse.move(box.x + 10, box.y + 8); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up();
    };
    await collect(0, 2500);
    await p.evaluate(() => { window.__mirror = true; });
    await p.waitForTimeout(1200);
    await collect(1, 2500);
    const res = () => p.$eval('.ai-result', e => e.textContent);
    await p.waitForFunction(() => document.querySelector('.ai-result').textContent.includes('오른쪽 런지'), null, {timeout: 10000}).catch(() => {});
    check((await res()).includes('오른쪽 런지'), `mirrored pose → 오른쪽 런지 (${await res()})`);
    await p.evaluate(() => { window.__mirror = false; });
    await p.waitForFunction(() => document.querySelector('.ai-result').textContent.includes('왼쪽 런지'), null, {timeout: 10000}).catch(() => {});
    check((await res()).includes('왼쪽 런지'), `original pose → 왼쪽 런지 (${await res()})`);

    // follow: robot motors copy the shoulders
    await p.click('text=따라 하기 예시 블록');
    await p.waitForTimeout(500);
    await p.click('.aip .mon-btn'); // stop the AI engine; the program starts tracking itself
    await p.click('#view-python');
    const py = await p.$eval('#python', e => e.textContent);
    check(py.includes('dxl.follow(1, body.angle("rightShoulder"), center=180, direction=1)'), 'Python: dxl.follow(... body.angle(...))');
    await p.click('#run');
    await p.waitForFunction(() => /다이나믹셀 1 → (2[4-9]\d|30\d)/.test(document.getElementById('console-lines').textContent), null, {timeout: 30000})
        .then(() => check(true, 'motor 1 follows the right shoulder (180 + ~90 → ~270°)'))
        .catch(() => check(false, 'motor 1 follows the right shoulder'));
    const out = await p.$eval('#console-lines', e => e.textContent);
    await p.waitForTimeout(1500);
    const out2 = await p.$eval("#console-lines", e => e.textContent);
    console.log("   log:", out2.split(/(?=\d\d:\d\d:\d\d)/).filter(l => /다이나믹셀 [12] /.test(l)).slice(-6).join(" | "));
    const m2 = /다이나믹셀 2 → (\d+(?:\.\d+)?)/.exec(out2);
    check(m2 && Number(m2[1]) > 60 && Number(m2[1]) < 120, `motor 2 mirrors the left shoulder (180 − ~90 → ${m2 && m2[1]}°)`);
    await p.click('#stop');
    await p.waitForTimeout(500);
    check(errs.length === 0, `no page errors ${errs.join('; ')}`);
    await b.close();
    process.exit(failed ? 1 : 0);
})();
