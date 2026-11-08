const {chromium} = require('playwright');
(async () => {
    const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
    const p = await b.newPage({viewport: {width: 1900, height: 1100}});
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
    await p.goto('http://localhost:8700/index.html', {waitUntil: 'networkidle'});
    await p.click('#view-sim');
    await p.click('.simp button:has-text("3D 가상 로봇 연결")');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('12개 인식'), null, {timeout: 60000});
    await p.waitForFunction(() => window.dynamicmakers.simPanel.view.partsReady, null, {timeout: 20000});
    await p.evaluate(() => { const s = window.dynamicmakers.simPanel.physics; for (let i = 1; i <= 12; i++) s.setTorque(i, true); });
    if (process.argv[3]) await p.evaluate(g => { const s = window.dynamicmakers.simPanel.physics; for (const [id, r] of Object.entries(JSON.parse(g))) s.setGoalRad(id, r); }, process.argv[3]);
    await p.waitForTimeout(1500);
    const views = JSON.parse(process.argv[2] || '[[-0.9,0.35,0.9]]');
    let i = 0;
    for (const [yaw, pitch, dist] of views) {
        await p.evaluate(([y, pi, d]) => Object.assign(window.dynamicmakers.simPanel.view.orbit, {yaw: y, pitch: pi, dist: d}), [yaw, pitch, dist]);
        await p.waitForTimeout(800);
        await (await p.$('.sim-canvas')).screenshot({path: `/tmp/v${i++}.png`});
    }
    console.log('parts', await p.evaluate(() => window.dynamicmakers.simPanel.view.partItems.length), 'errors', errs);
    await b.close();
})();
