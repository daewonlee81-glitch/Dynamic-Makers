// 영상으로 따라 하기: retargeting rules, a video file → robot motion → 3D, webcam (fake camera) live mode.
// Usage: node test/imitate-check.js http://localhost:8700/index.html
// Test video: a person with both arms out to the sides (tfjs-models test image), made with ffmpeg into
// /tmp/testmedia (IM_DIR) — the video parts are skipped when it is not there. To make them:
//   curl -o pose.jpg https://raw.githubusercontent.com/tensorflow/tfjs-models/master/pose-detection/test_data/pose.jpg
//   ffmpeg -loop 1 -i pose.jpg -t 3 -r 15 -vf scale=640:-2,format=yuv420p -c:v libvpx-vp9 pose.webm
//   ffmpeg -loop 1 -i pose.jpg -t 4 -r 15 -vf scale=640:-2,pad=640:480:(ow-iw)/2:(oh-ih)/2,format=yuv420p pose.y4m
const fs = require('fs');
const path = require('path');
const {chromium} = require('playwright');
const URL = process.argv[2] || 'http://localhost:8700/index.html';
const DIR = process.env.IM_DIR || '/tmp/testmedia';
const VIDEO = path.join(DIR, 'pose.webm');
const CAM = path.join(DIR, 'pose.y4m');
let failed = 0;
const check = (c, m) => { console.log(`${c ? 'ok' : 'FAIL'} - ${m}`); if (!c) failed++; };
(async () => {
    const args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
    if (fs.existsSync(CAM)) args.push(`--use-file-for-fake-video-capture=${CAM}`);
    const b = await chromium.launch({args});
    const p = await b.newPage({viewport: {width: 1500, height: 950}});
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL, {waitUntil: 'networkidle'});
    const out = () => p.$eval('#console-lines', e => e.textContent);
    await p.click('#view-sim');
    await p.waitForSelector('.simp .sim-imitate');

    // ---- retargeting rules on made-up skeletons (image fractions, 1:1 image)
    const r = await p.evaluate(() => {
        const {retarget, newImitation} = window.dynamicmakers.simPanel.imitateLib;
        // person facing the camera: their right side is on the image's left
        const body = (rWr, lWr, knee = 0, lean = 0) => {
            const k = Array.from({length: 17}, () => ({x: 0.5, y: 0.2, score: 0.9}));
            const set = (i, x, y) => { k[i] = {x, y, score: 0.9}; };
            set(6, 0.42 + lean, 0.3); set(5, 0.58 + lean, 0.3); // shoulders
            set(12, 0.44, 0.55); set(11, 0.56, 0.55); // hips (torso 0.25)
            set(10, 0.42 + rWr[0], 0.3 + rWr[1]); set(9, 0.58 + lWr[0], 0.3 + lWr[1]);
            set(8, 0.42 + (rWr[0] / 2), 0.3 + (rWr[1] / 2)); set(7, 0.58 + (lWr[0] / 2), 0.3 + (lWr[1] / 2));
            const kn = knee * Math.PI / 180;
            set(14, 0.44, 0.67); set(13, 0.56, 0.67);
            set(16, 0.44 + (0.12 * Math.sin(kn)), 0.67 + (0.12 * Math.cos(kn))); set(15, 0.56 + (0.12 * Math.sin(kn)), 0.67 + (0.12 * Math.cos(kn)));
            return k;
        };
        const L = 0.26; // straight arm
        const run = (k, mirror = false) => retarget(k, 1, newImitation({legs: 'squat', mirror})).deg;
        return {
            down: run(body([0, L], [0, L])),
            out: run(body([-L, 0], [L, 0])),
            up: run(body([0, -L], [0, -L])),
            rightUp: run(body([0, -L], [0, L])),
            rightUpMirror: run(body([0, -L], [0, L]), true),
            squat: run(body([0, L], [0, L], 80)),
            lean: run(body([0, L], [0, L], 0, 0.06))
        };
    });
    const near = (v, w, tol = 12) => Math.abs(v - w) <= tol;
    check(near(r.down[1], 0) && near(r.down[3], 0) && near(r.down[2], 0, 6), `arms down → ID1/3 ≈ 0 (${r.down[1].toFixed(0)}, ${r.down[3].toFixed(0)})`);
    check(near(r.out[2], 90, 15) && near(r.out[4], 90, 15), `arms out to the sides → ID2/4 ≈ 90 like motion 109 (${r.out[2].toFixed(0)}, ${r.out[4].toFixed(0)})`);
    check(near(r.up[1], 175) && near(r.up[3], -175), `arms up → ID1 ≈ 170, ID3 ≈ −170 like motion 109 (${r.up[1].toFixed(0)}, ${r.up[3].toFixed(0)})`);
    check(r.rightUp[1] > 150 && near(r.rightUp[3], 0), `person's right arm up → robot right arm (ID1) up (${r.rightUp[1].toFixed(0)}, ${r.rightUp[3].toFixed(0)})`);
    check(r.rightUpMirror[3] < -150 && near(r.rightUpMirror[1], 0), `mirror: person's right arm up → robot left arm (ID3) up (${r.rightUpMirror[3].toFixed(0)})`);
    check(r.squat[6] < -40 && r.squat[6] === r.squat[9] && r.squat[8] === r.squat[11], `knees bent → squat like motion 107 (ID6/8/9/11 = ${r.squat[6].toFixed(0)})`);
    check(r.down[6] === -10 && r.down[5] === 0, 'standing → knees slightly bent, no sway');
    check(Math.abs(r.lean[5]) >= 1.5 && r.lean[5] === r.lean[10], `leaning → hips/ankles sway together (ID5/7/10/12 = ${r.lean[5].toFixed(1)})`);

    // ---- the sway sign: + on SWAY_LEFT moves the 3D robot to its own left (+y)
    await p.click('.simp button:has-text("3D 가상 로봇 연결")');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('12개 인식'), null, {timeout: 60000});
    const sway = await p.evaluate(async () => {
        const s = window.dynamicmakers.simPanel;
        const ph = s.physics;
        const deg = v => ({t: 0, deg: {1: 180, 2: 180, 3: 180, 4: 180, 5: 180 + v, 6: 170, 7: 180 + v, 8: 170, 9: 170, 10: 180 + v, 11: 170, 12: 180 + v}});
        const go = async v => {
            s.motionRec = {page: 'sway', label: 'sway', ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], frames: [deg(v), {...deg(v), t: 1.5}], seconds: 1.5, fromVideo: true};
            await s.replayMotion();
            return ph.torso.y;
        };
        const y0 = await go(0);
        const y1 = await go(8 * s.imitateLib.SWAY_LEFT);
        return {dy: (y1 - y0) * 100, fallen: ph.fallen};
    });
    check(sway.dy > 0.5 && !sway.fallen, `SWAY_LEFT moves the 3D robot to its left (${sway.dy.toFixed(1)} cm)`);

    if (fs.existsSync(VIDEO)) {
        // ---- a video file → robot motion
        const n0 = ((await out()).match(/로봇 동작으로 바꿨습니다/g) || []).length;
        await p.setInputFiles('.simp .sim-vid-file', VIDEO);
        await p.waitForFunction(n => (document.getElementById('console-lines').textContent.match(/로봇 동작으로 바꿨습니다|영상으로 따라 하기:/g) || []).length > n, n0, {timeout: 180000});
        const info = await p.textContent('.simp .sim-imitate .sim-info');
        const rec = await p.evaluate(() => {
            const m = window.dynamicmakers.simPanel.motionRec;
            const f = m.frames[m.frames.length - 1].deg;
            return {n: m.frames.length, secs: m.seconds, seen: m.seen, d: f};
        });
        check(rec.n >= 25 && rec.seen > 0.8, `video analysed: ${rec.n} poses over ${rec.secs.toFixed(1)} s, person found in ${(rec.seen * 100).toFixed(0)}% ("${info}")`);
        check(rec.d[2] - 180 > 60 && rec.d[4] - 180 > 60, `arms out like the person in the video (ID2 ${(rec.d[2] - 180).toFixed(0)}°, ID4 ${(rec.d[4] - 180).toFixed(0)}°)`);
        check(rec.d[6] - 180 < -10, `the person's bent knee → the robot bends its knees (ID6 ${(rec.d[6] - 180).toFixed(0)}°)`);
        const canvasOk = await p.evaluate(() => {
            const c = document.querySelector('.simp .sim-im-canvas');
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            let lit = 0;
            for (let i = 0; i < d.length; i += 40) lit += d[i] + d[i + 1] + d[i + 2] > 30 ? 1 : 0;
            return !c.hidden && lit > 100;
        });
        check(canvasOk, 'preview shows the video frame with the skeleton');
        const r0 = ((await out()).match(/3D 재생 끝/g) || []).length;
        await p.selectOption('.simp .sim-im-speed', '0.5');
        await p.click('.simp .sim-imitate button:has-text("3D로 재생")');
        // the video plays in the preview next to the robot, at half speed
        await p.waitForFunction(() => { const pb = window.dynamicmakers.simPanel._imPlayback; return pb && pb.started && pb.video.currentTime > 0.3; }, null, {timeout: 60000});
        const pv = await p.evaluate(() => { const v = window.dynamicmakers.simPanel._imPlayback.video; return {rate: v.playbackRate, paused: v.paused}; });
        check(!pv.paused && pv.rate > 0.05 && pv.rate <= 0.9, `video plays along with the 3D robot at the chosen speed (rate ${pv.rate.toFixed(2)})`);
        await p.waitForFunction(n => (document.getElementById('console-lines').textContent.match(/3D 재생 끝/g) || []).length > n, r0, {timeout: 120000});
        check(new RegExp(`\\(${(rec.secs / 0.5).toFixed(1)}초, 0\\.5배 속도\\)`).test(await out()), `0.5× speed: the robot takes twice as long (${(rec.secs / 0.5).toFixed(1)} s)`);
        check(await p.evaluate(() => !window.dynamicmakers.simPanel._imPlayback), 'video stops with the robot');
        const rp = [...(await out()).matchAll(/3D 재생 끝: [^\n]*?(서 있습니다|넘어졌습니다)/g)].pop();
        check(rp && rp[1] === '서 있습니다', `video motion replayed on the 3D robot without falling (${rp && rp[0]})`);
        const blocks0 = await p.evaluate(() => window.dynamicmakers.workspace.getAllBlocks().length);
        await p.click('.simp .sim-imitate button:has-text("블록으로 만들기")');
        const blocks1 = await p.evaluate(() => window.dynamicmakers.workspace.getAllBlocks().length);
        check(blocks1 > blocks0 + 5 && blocks1 - blocks0 < 200 && /을 블록으로 넣었습니다/.test(await out()), `video motion → pose blocks (${blocks1 - blocks0} blocks)`);
        const title = await p.evaluate(() => window.dynamicmakers.workspace.getTopComments ? window.dynamicmakers.workspace.getTopComments().map(c => c.getText()).join(' ') : '');
        const xmlText = await p.evaluate(() => new XMLSerializer().serializeToString(window.dynamicmakers.ScratchBlocks.Xml.workspaceToDom(window.dynamicmakers.workspace)));
        check(/0\.5배 속도/.test(xmlText + title), 'blocks are made at the chosen speed (0.5×)');
    } else {
        console.log(`# skipped the video file part (no ${VIDEO})`);
    }

    if (fs.existsSync(CAM)) {
        // ---- webcam live mode (fake camera playing the same picture) → 3D robot follows
        await p.click('.simp .sim-imitate button:has-text("웹캠으로 실시간")');
        await p.waitForFunction(() => /실시간 따라 하기 · 3D 로봇/.test(document.querySelector('.simp .sim-imitate .sim-info').textContent), null, {timeout: 90000});
        await p.waitForTimeout(3000);
        const live = await p.evaluate(() => {
            const s = window.dynamicmakers.simPanel;
            const q = {};
            for (const j of ['R_shoulder_roll', 'L_shoulder_roll']) q[j] = s.physics.jointRad ? s.physics.jointRad(j) : null;
            return {info: document.querySelector('.simp .sim-imitate .sim-info').textContent, n: s.liveIm.frames.length, q};
        });
        check(live.n >= 3 && /오른팔 -?\d+°\/(\d+)°/.test(live.info) && Number(/오른팔 -?\d+°\/(\d+)°/.exec(live.info)[1]) > 60,
            `webcam: the robot follows live (${live.n} poses; "${live.info}")`);
        await p.click('.simp .sim-imitate button:has-text("멈추기")');
        check(/웹캠 따라 하기를 멈췄습니다/.test(await out()), 'webcam: stops and keeps the motion');
        check(await p.evaluate(() => window.dynamicmakers.simPanel.motionRec.label === '웹캠으로 따라 한 동작'), 'webcam motion can be replayed / saved');
    } else {
        console.log(`# skipped the webcam part (no ${CAM})`);
    }
    check(!errs.length, `no page errors ${errs.join(' | ')}`);
    await b.close();
    console.log(failed ? `${failed} FAILED` : 'all passed');
    process.exit(failed ? 1 : 0);
})();
