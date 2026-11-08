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

    // stage 2b: learning (small run)
    await sp(() => {
        const s = window.dynamicmakers.simPanel;
        s.search.population = 8; s.search.generations = 3; s.search.seconds = 3;
    });
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

    // stage 3: policy file
    await p.setInputFiles('.simp input[type=file]', POLICY);
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
    check(pyd.includes('with dxl.together(') && /dxl\.goal\(12, -?[\d.]+\)/.test(pyd) && goals === 12 * 19,
        `Python shows every motor: with dxl.together(...) + ${goals} dxl.goal(id, deg) lines`);
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
