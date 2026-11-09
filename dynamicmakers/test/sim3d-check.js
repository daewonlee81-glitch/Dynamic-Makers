// 3D 시뮬레이터 (MuJoCo): connect, blocks move a joint, walk, learn, policy, blocks + Python, save.
// Usage: node test/sim3d-check.js http://localhost:8700/index.html [policy.json]
const {chromium} = require('playwright');
const path = require('path');
const URL = process.argv[2] || 'http://localhost:8700/index.html';
const POLICY = process.argv[3] || path.join(__dirname, '..', 'sim', 'example-policy.json');
let failed = 0;
const check = (c, m) => { console.log(`${c ? 'ok' : 'FAIL'} - ${m}`); if (!c) failed++; };
(async () => {
    const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
    const p = await b.newPage({viewport: {width: 1500, height: 950}});
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('dialog', d => d.accept());
    await p.addInitScript(() => { if (!sessionStorage.getItem('k')) localStorage.clear(); sessionStorage.setItem('k', 1); });
    await p.goto(URL, {waitUntil: 'networkidle'});
    const out = () => p.$eval('#console-lines', e => e.textContent);
    const sp = fn => p.evaluate(fn);
    await p.click('#view-sim');
    check(await p.isVisible('#sim .sim-view'), '3D tab opens');
    await p.click('.simp button:has-text("3D 가상 로봇 연결")');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('12개 인식'), null, {timeout: 60000});
    check(true, 'MuJoCo loads; 12 joints (6 × 2XL430) recognised');
    check(await p.isVisible('.sim-canvas'), '3D view rendered (WebGL)');
    await p.waitForFunction(() => window.dynamicmakers.simPanel.view.partsReady, null, {timeout: 20000});
    const parts = await sp(() => { const v = window.dynamicmakers.simPanel.view; return [v.partItems.length, v.partGroup.visible, v.meshes.filter(m => m && m.visible).length]; });
    check(parts[0] >= 25 && parts[1] && parts[2] === 0, `STEP part shapes shown (${parts[0]} parts, simple shapes hidden)`);
    await p.click('.simp button:has-text("단순 도형으로 보기")');
    const simple = await sp(() => { const v = window.dynamicmakers.simPanel.view; return [v.partGroup.visible, v.meshes.filter(m => m && m.visible).length]; });
    check(!simple[0] && simple[1] > 10, 'toggle shows the simple physics shapes');
    await p.click('.simp button:has-text("부품 모양으로 보기")');
    await p.waitForTimeout(4000); // powers up holding the pose (torque on), so it does not collapse
    const z0 = await sp(() => window.dynamicmakers.simPanel.physics.torso.z);
    check(z0 > 0.24, `robot stands after 4 s idle (torso ${(z0 * 100).toFixed(1)} cm)`);

    // a block moves a simulated joint: present position follows
    await sp(() => window.dynamicmakers.vm.runtime.ext_cm550.dxlMoveToWait({ID: '1', DEG: 230, SPEED: 60}));
    await p.waitForTimeout(1500);
    const deg = await sp(() => window.dynamicmakers.simPanel.physics.presentTick(1) / 4096 * 360);
    check(Math.abs(deg - 230) < 6, `block "다이나믹셀 1 → 230°" moves the 3D arm (${deg.toFixed(1)}°)`);

    // stage 2a: walk with the default gait
    await p.click('text=이 걸음으로 걷기 (3D)');
    await p.waitForFunction(() => /3D 로봇: -?\d+ cm/.test(document.getElementById('console-lines').textContent), null, {timeout: 90000});
    const walk = /3D 로봇: (-?\d+) cm 앞으로, (서 있습니다|넘어졌습니다)/.exec(await out());
    check(walk && Number(walk[1]) > 40 && walk[2] === '서 있습니다', `default gait walks (${walk && walk[0]})`);
    await p.screenshot({path: process.env.SHOT || '/home/claude/work/sim3d.png'});

    // 예제 모션 확인: play a CM-550 motion page while recording every joint, replay in 3D, make blocks
    // (this test machine draws WebGL in software, ~1 frame/s: show another tab while recording so sampling is not starved)
    await p.click('.simp button:has-text("실행하며 기록")');
    await p.click('#view-monitor');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('기록 끝'), null, {timeout: 60000});
    await p.click('#view-sim');
    const rec = await sp(() => { const r = window.dynamicmakers.simPanel.motionRec; return {n: r.frames.length, secs: r.seconds, sync: r.syncRead,
        info: document.querySelector('.simp .mon-card:nth-of-type(2) .sim-info').textContent}; });
    const moved = /움직인 관절 (\d+)개/.exec(rec.info);
    check(rec.n > 20 && rec.sync && moved && Number(moved[1]) >= 8, `motion recorded with SYNC READ (${rec.n} samples in ${rec.secs.toFixed(1)} s; "${rec.info.slice(0, 60)}…")`);
    await p.click('.simp button:has-text("3D로 재생")');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('3D 재생 끝'), null, {timeout: 60000});
    const rp = /3D 재생 끝: 앞으로 (-?\d+) cm, 옆으로 (-?\d+) cm, (서 있습니다|넘어졌습니다)/.exec(await out());
    // (only the direction is checked: here the stand-in walk ran on slow simulated time but was
    // recorded on the wall clock, so the replay is faster than the original and may tip over)
    check(rp && Number(rp[1]) > 15, `recording replayed on the 3D robot walks forward (${rp && rp[0]})`);
    const before = await sp(() => window.dynamicmakers.workspace.getAllBlocks(false).length);
    await p.click('.simp button:has-text("블록으로 만들기")');
    const made = await sp(() => window.dynamicmakers.workspace.getAllBlocks(false).filter(b => b.type === 'cm550_dxlTogether').length);
    check(made > 5, `recorded motion turned into ${made} "모두 함께" blocks`);
    await sp(() => window.dynamicmakers.workspace.clear());

    // R+ motion file (.mtn3): official motions in 3D without the robot (a small made-up file here;
    // MTN3=…/03_ENG1_MAX_E1_KR.mtn3 checks that the official walk walks forward)
    const MTN3 = process.env.MTN3 || path.join(__dirname, 'fixtures', 'mini.mtn3');
    await p.setInputFiles('.simp input[accept=".mtn3"]', MTN3);
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('모션 파일을 열었습니다'));
    const opts = await p.$$eval('.simp .sim-mtn option', os => os.map(o => o.textContent));
    check(opts.some(o => o.startsWith('걷기 묶음: 전진 (150 → 152')), `walk group listed from the motion file ("${opts.find(o => o.startsWith('걷기')) || ''}")`);
    const mrec = await sp(() => { const r = window.dynamicmakers.simPanel.motionRec; return {n: r.frames.length, secs: r.seconds, file: r.fromFile}; });
    check(mrec.file && mrec.n > 3 && mrec.secs > 0.5, `walk group as key frames (${mrec.n}, ${mrec.secs.toFixed(2)} s)`);
    const replays = ((await out()).match(/3D 재생 끝/g) || []).length;
    await p.click('.simp button:has-text("3D로 재생")');
    await p.waitForFunction(n => (document.getElementById('console-lines').textContent.match(/3D 재생 끝/g) || []).length > n, replays, {timeout: 90000});
    const mw = [...(await out()).matchAll(/3D 재생 끝: 앞으로 (-?\d+) cm, 옆으로 (-?\d+) cm, (서 있습니다|넘어졌습니다)/g)].pop();
    check(mw && (!process.env.MTN3 || (Number(mw[1]) > 40 && mw[3] === '서 있습니다')),
        `motion file played on the 3D robot (${mw && mw[0]})`);
    await p.click('.simp button:has-text("블록으로 만들기")');
    const mb = await sp(() => window.dynamicmakers.workspace.getAllBlocks(false).filter(b => b.type === 'cm550_dxlTogether').length);
    check(mb > 3, `motion file turned into ${mb} "모두 함께" blocks`);
    await sp(() => window.dynamicmakers.workspace.clear());

    // stage 2b: learning (small run)
    await sp(() => {
        const s = window.dynamicmakers.simPanel;
        s.search.population = 8; s.search.generations = 3; s.search.seconds = 3;
    });
    await p.selectOption('.sim-mode', 'watch');
    await p.click('text=▶ 학습 시작');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('걸음 학습 끝'), null, {timeout: 120000});
    const learned = /걸음 학습 끝: (\d+)번 시험, 최고 점수 (-?[\d.]+)/.exec(await out());
    check(learned && Number(learned[1]) === 24 && /(새 걸음으로 바꿨습니다|그대로 둡니다)/.test(await out()), `learning ran 8 × 3 = ${learned && learned[1]} tries (best ${learned && learned[2]})`);
    const watched = await sp(() => [document.querySelector('.sim-tag').textContent, document.querySelector('.sim-learn-view').hidden,
        Boolean(document.querySelector('#sim .sim-view:not(.sim-learn-view) .sim-canvas'))]);
    check(watched[0].includes('걸음') && watched[1] && watched[2], `learning shown on the 3D robot ("${watched[0]}"), view back afterwards`);
    const replaced = (await out()).includes('새 걸음으로 바꿨습니다'); // (the console keeps only recent lines)
    const hist = await sp(() => window.dynamicmakers.simPanel.learner.history.length);
    check(hist === 3, 'score chart has 3 generations');

    // stage 2c: 동시 경주 — a whole generation walks together in one world
    await sp(() => {
        const s = window.dynamicmakers.simPanel;
        s._keepGait = s.store.gait;
        s.search.population = 6; s.search.generations = 2; s.search.seconds = 2;
    });
    await p.selectOption('.sim-mode', 'race');
    check(await p.isVisible('.sim-speed'), 'race mode offers a speed choice');
    await p.selectOption('.sim-speed', '4');
    await p.click('text=▶ 학습 시작');
    await p.waitForFunction(() => { const s = window.dynamicmakers.simPanel; return s.raceView && s.raceView.partsReady && s.race.t > 0.5; }, null, {timeout: 60000});
    const race = await sp(() => {
        const s = window.dynamicmakers.simPanel;
        const xs = s.race.info().map(r => r.y);
        return {n: s.race.n, parts: s.raceView.partItems.length, labels: s.raceView.labelSprites.length,
            lanes: Math.max(...xs) - Math.min(...xs), tag: document.querySelector('.sim-tag').textContent,
            shown: !document.querySelector('.sim-learn-view').hidden && Boolean(document.querySelector('.sim-learn-view .sim-canvas'))};
    });
    check(race.n === 6 && race.labels === 6 && race.parts >= 6 * 25 && race.lanes > 1.2 && race.shown,
        `race: 6 robots side by side with part shapes (${race.parts} parts, lanes ${race.lanes.toFixed(2)} m apart overall)`);
    check(/[12]\/2세대 경주 .* 넘어짐 \d\/6|[12]세대 결과 · 1등 \d번/.test(race.tag), `race scoreboard ("${race.tag}")`);
    await p.screenshot({path: process.env.RACESHOT || '/home/claude/work/sim3d-race.png'});
    await p.waitForFunction(() => (document.getElementById('console-lines').textContent.match(/걸음 학습 끝/g) || []).length >= 2, null, {timeout: 120000});
    const raced = /걸음 학습 끝: (\d+)번 시험/.exec([...(await out()).matchAll(/걸음 학습 끝: \d+번 시험/g)].pop()[0]);
    const after = await sp(() => { const s = window.dynamicmakers.simPanel; return [s.race, s.learner.history.length, document.querySelector('.sim-learn-view').hidden]; });
    check(raced && Number(raced[1]) === 12 && after[0] === null && after[1] === 2 && after[2], `race learning: 6 × 2 = ${raced && raced[1]} tries, race world closed`);
    await sp(() => { const s = window.dynamicmakers.simPanel; s.store.gait = s._keepGait; });

    // stage 3: policy file
    await p.setInputFiles('.simp input[type=file]:not(.sim-rec-file)', POLICY);
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('정책을 불러왔습니다'));
    check((await p.textContent('.simp')).includes('신경망 32-12'), 'policy loaded (network 32-12)');
    await p.click('text=정책으로 걷기 (3D)');
    await p.waitForFunction(() => (document.getElementById('console-lines').textContent.match(/3D 로봇: /g) || []).length >= 2, null, {timeout: 90000});
    const pw = [...(await out()).matchAll(/3D 로봇: (-?\d+) cm 앞으로, (서 있습니다|넘어졌습니다)/g)].pop();
    check(pw && Number(pw[1]) > 40 && pw[2] === '서 있습니다', `policy walks on the 3D robot (${pw && pw[0]})`);

    // blocks (detailed): one "모두 함께" block per pose, one target per motor; Python the same
    // (with the default gait: a 3-generation test run may have learned a shakier one)
    await sp(() => { const s = window.dynamicmakers.simPanel; s._keep = s.store.gait; s.store.gait = null; });
    await p.click('.simp button:has-text("블록 만들기 (모터별)")');
    await sp(() => { const s = window.dynamicmakers.simPanel; s.store.gait = s._keep; });
    await p.waitForTimeout(600);
    await p.click('#view-python');
    const pyd = await p.$eval('#python', e => e.textContent);
    const goals = (pyd.match(/dxl\.goal\(/g) || []).length;
    check(pyd.includes('dxl.prepare(2)') && pyd.indexOf('dxl.prepare(2)') < pyd.indexOf('with dxl.together(') && pyd.includes('with dxl.together(') && /dxl\.goal\(12, -?[\d.]+\)/.test(pyd) && goals === 12 * 19,
        `Python starts with dxl.prepare(2), then every motor: with dxl.together(...) + ${goals} dxl.goal(id, deg) lines`);
    // run it on the 3D robot. This test machine may simulate slower than real time
    // (software WebGL): then the program's "느리게" is raised to match.
    const speed = await sp(() => new Promise(res => {
        const ph = window.dynamicmakers.simPanel.physics;
        const t = ph.data.time;
        const w = performance.now();
        setTimeout(() => res((ph.data.time - t) / ((performance.now() - w) / 1000)), 1500);
    }));
    const slow = Math.max(1, Math.ceil(10 / speed) / 10);
    await p.evaluate(f => window.dynamicmakers.workspace.getAllBlocks(false).find(b => b.type === 'data_setvariableto')
        .getInputTargetBlock('VALUE').setFieldValue(String(f), 'TEXT'), slow);
    await sp(() => window.dynamicmakers.simPanel.physics.reset());
    const x0 = await sp(() => window.dynamicmakers.simPanel.physics.torso.x);
    await p.click('#run');
    await p.waitForTimeout(1000);
    await p.waitForFunction(() => window.dynamicmakers.vm.runtime.threads.length === 0, null, {timeout: 90000}).catch(() => {});
    const dw = await p.evaluate(x => { const ph = window.dynamicmakers.simPanel.physics; return [ph.torso.x - x, ph.fallen]; }, x0);
    check(dw[0] > 0.15 && !dw[1], `detailed program walks the 3D robot (${(dw[0] * 100).toFixed(0)} cm, ` +
        `${dw[1] ? '넘어짐' : '서 있음'}; 느리게 ${slow})`);
    await p.click('#stop');
    await sp(() => window.dynamicmakers.workspace.clear());
    await p.waitForTimeout(400);
    await p.click('#view-sim');

    // blocks: one-line walk block + Python, program run
    await p.click('.simp button:has-text("한 줄 블록")');
    await p.waitForTimeout(400);
    await p.click('#view-python');
    const py = await p.$eval('#python', e => e.textContent);
    check(py.includes('walk.gait(10, slow=1)'), 'Python: walk.gait(10, slow=1)');
    await sp(() => window.dynamicmakers.simPanel.physics.reset());
    await p.click('#run');
    await p.waitForTimeout(4000);
    const moving = await sp(() => window.dynamicmakers.simPanel.walker.running);
    check(moving, '"학습한 걸음으로 10 초 걷기" block walks the robot');
    await p.click('#stop');
    await p.waitForTimeout(600);
    await sp(() => window.dynamicmakers.simPanel.walker.stop());

    // gait + policy saved with the project
    await p.waitForTimeout(1500);
    const proj = await sp(() => {
        const k = Object.keys(localStorage).find(x => /autosave/i.test(x));
        const v = JSON.parse(localStorage.getItem(k));
        return JSON.parse(v.project).dynamicmakers || {};
    });
    check(proj.policy && proj.policy.format === 'dm-policy-1' && Boolean(proj.gait) === replaced,
        `policy saved in the project${replaced ? ' + learned gait' : ' (better default gait kept, not overwritten)'}`);
    check(errs.length === 0, `no page errors ${errs.join('; ')}`);
    await b.close();
    process.exit(failed ? 1 : 0);
})();
