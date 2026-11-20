// 영상으로 따라 하기: retargeting rules, a video file → robot motion → 3D, webcam (fake camera) live mode.
// Usage: node test/imitate-check.js http://localhost:8700/index.html
// Test video: a person with both arms out to the sides (tfjs-models test image), made with ffmpeg into
// /tmp/testmedia (IM_DIR) — the video parts are skipped when it is not there. stand.webm: a man standing
// (OpenPose examples/media/COCO_val2014_000000000241.jpg, right 70 %). To make pose.webm / pose.y4m:
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
            // legs ≈ 1.6 torso lengths; the shins swing back by the knee bend (seen from the side)
            set(14, 0.44, 0.75); set(13, 0.56, 0.75);
            set(16, 0.44 + (0.2 * Math.sin(kn)), 0.75 + (0.2 * Math.cos(kn))); set(15, 0.56 + (0.2 * Math.sin(kn)), 0.75 + (0.2 * Math.cos(kn)));
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
            lean: run(body([0, L], [0, L], 0, 0.06)),
            // seen from the front: knees bend toward the camera, the legs only look shorter
            frontSquat: (() => {
                const st = newImitation({legs: 'squat', mirror: false});
                retarget(body([0, L], [0, L]), 1, st); // standing first: the legs' full length
                const k = body([0, L], [0, L]);
                k[14] = {x: 0.44, y: 0.66, score: 0.9}; k[13] = {x: 0.56, y: 0.66, score: 0.9};
                k[16] = {x: 0.44, y: 0.78, score: 0.9}; k[15] = {x: 0.56, y: 0.78, score: 0.9};
                return retarget(k, 1, st).deg;
            })()
        };
    });
    const near = (v, w, tol = 12) => Math.abs(v - w) <= tol;
    check(r.squat[6] <= -60 && r.squat[6] === r.squat[9] && r.squat[8] === r.squat[11], `knees bent 80° → the robot bends its knees as far as it safely can, like motion 107 (ID6/8/9/11 = ${r.squat[6].toFixed(0)})`);
    check(near(r.rightUp[1], 180, 5) && r.rightUpMirror[3] < -170, `person's right arm up → robot right arm (ID1 ${r.rightUp[1].toFixed(0)}), mirrored → robot left arm (ID3 ${r.rightUpMirror[3].toFixed(0)})`);
    check(r.down[6] === -10 && r.down[5] === 0, 'standing → knees slightly bent, no sway');
    check(r.frontSquat[6] < -40, `squat seen from the front (legs look shorter) → the robot squats (ID6 ${r.frontSquat[6].toFixed(0)})`);
    check(Math.abs(r.lean[5]) >= 1.5 && r.lean[5] === r.lean[10], `leaning → hips/ankles sway together (ID5/7/10/12 = ${r.lean[5].toFixed(1)})`);

    await p.click('.simp button:has-text("3D 가상 로봇 연결")');
    await p.waitForFunction(() => document.getElementById('console-lines').textContent.includes('12개 인식'), null, {timeout: 60000});
    // ---- the robot's arm really points where the person's arm points (measured on the 3D model)
    const armErr = await p.evaluate(() => {
        const s = window.dynamicmakers.simPanel;
        const ph = s.physics;
        const {armIK} = s.imitateLib;
        const D = Math.PI / 180;
        const n = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
        const dirs = {'아래': [0, 0, -1], '앞': [1, 0, 0], '옆': [0, 1, 0], '위': [0, 0, 1], '옆 위': [0, 1, 1], '앞 옆': [1, 1, 0], '앞 위': [1, 0, 1], '앞 아래': [1, 0, -1], '옆 아래': [0, 1, -1]};
        let worst = 0;
        let naive = 0;
        for (const c of Object.values(dirs)) {
            const [f, o, up] = n(c);
            for (const side of ['R', 'L']) {
                const u = [f, side === 'R' ? -o : o, up];
                const q = armIK(side, u, 0);
                const d = ph.armDirection(side, q.pitch, q.roll);
                worst = Math.max(worst, Math.acos(Math.min(1, (d[0] * u[0]) + (d[1] * u[1]) + (d[2] * u[2]))) / D);
                // copying the person's angles straight across (ignores the 15° shoulder tilt)
                const pitch = Math.atan2(f, -up);
                const roll = Math.asin(o);
                const g = ph.armDirection(side, side === 'R' ? -pitch : -pitch, side === 'R' ? -roll : roll);
                naive = Math.max(naive, Math.acos(Math.min(1, (g[0] * u[0]) + (g[1] * u[1]) + (g[2] * u[2]))) / D);
            }
        }
        return {worst, naive};
    });
    check(armErr.worst < 2, `arm directions solved from the model's shoulder geometry: worst miss ${armErr.worst.toFixed(1)}° (copying the person's angles straight across: ${armErr.naive.toFixed(0)}°)`);
    const skel = await p.evaluate(() => {
        const s = window.dynamicmakers.simPanel;
        const {retarget, newImitation} = s.imitateLib;
        const ph = s.physics;
        const D = Math.PI / 180;
        const body = (rWr, lWr) => {
            const k = Array.from({length: 17}, () => ({x: 0.5, y: 0.2, score: 0.9}));
            const set = (i, x, y) => { k[i] = {x, y, score: 0.9}; };
            set(6, 0.42, 0.3); set(5, 0.58, 0.3); set(12, 0.44, 0.55); set(11, 0.56, 0.55);
            set(10, 0.42 + rWr[0], 0.3 + rWr[1]); set(9, 0.58 + lWr[0], 0.3 + lWr[1]);
            set(8, 0.42 + (rWr[0] / 2), 0.3 + (rWr[1] / 2)); set(7, 0.58 + (lWr[0] / 2), 0.3 + (lWr[1] / 2));
            set(14, 0.44, 0.75); set(13, 0.56, 0.75); set(16, 0.44, 0.95); set(15, 0.56, 0.95);
            return k;
        };
        const L = 0.27;
        const res = {};
        // person's right arm out to their side (image left), left arm up — not mirrored
        const deg = retarget(body([-L, 0], [0, -L]), 1, newImitation({legs: 'stand', mirror: false})).deg;
        const j = id => s.jointMap.find(x => x.id === id);
        const rad = id => j(id).sign * deg[id] * D;
        const dR = ph.armDirection('R', rad(1), rad(2));
        const dL = ph.armDirection('L', rad(3), rad(4));
        res.R = dR.map(v => v.toFixed(2)).join(',');
        res.L = dL.map(v => v.toFixed(2)).join(',');
        res.ok = dR[1] < -0.95 && dL[2] > 0.95;
        return res;
    });
    check(skel.ok, `skeleton → robot: right arm out to the side (${skel.R}), left arm straight up (${skel.L})`);

    // ---- arms hanging down stay down even when they look a bit short (sleeves, slightly bent
    // elbows, wobbly points) or when the hips are guessed far too low in a close-up
    const hang = await p.evaluate(() => {
        const s = window.dynamicmakers.simPanel;
        const {retarget, newImitation} = s.imitateLib;
        const ph = s.physics;
        const D = Math.PI / 180;
        const body = (armLen, hipY = 0.55) => {
            const k = Array.from({length: 17}, () => ({x: 0.5, y: 0.2, score: 0.9}));
            const set = (i, x, y) => { k[i] = {x, y, score: 0.9}; };
            set(6, 0.42, 0.3); set(5, 0.58, 0.3); set(12, 0.44, hipY); set(11, 0.56, hipY);
            set(10, 0.415, 0.3 + armLen); set(9, 0.585, 0.3 + armLen); set(8, 0.418, 0.3 + (armLen / 2)); set(7, 0.582, 0.3 + (armLen / 2));
            set(14, 0.44, hipY + 0.2); set(13, 0.56, hipY + 0.2); set(16, 0.44, hipY + 0.4); set(15, 0.56, hipY + 0.4);
            return k;
        };
        const tilt = deg => {
            const j = id => s.jointMap.find(x => x.id === id);
            const rad = id => j(id).sign * deg[id] * D;
            const dR = ph.armDirection('R', rad(1), rad(2));
            const dL = ph.armDirection('L', rad(3), rad(4));
            return Math.max(Math.acos(-dR[2]), Math.acos(-dL[2])) / D; // degrees away from straight down
        };
        const st = newImitation({legs: 'stand'});
        retarget(body(0.27), 1, st); // full length once
        const short = tilt(retarget(body(0.23), 1, st).deg); // 15 % shorter
        const st2 = newImitation({legs: 'stand'});
        const closeUp = tilt(retarget(body(0.27, 0.95), 1, st2).deg); // hips guessed at the bottom
        return {short, closeUp};
    });
    check(hang.short < 15 && hang.closeUp < 15, `arms hanging down stay down: looking 15 % short → ${hang.short.toFixed(0)}° off, hips guessed too low → ${hang.closeUp.toFixed(0)}° off`);

    // ---- the sway sign: + on SWAY_LEFT moves the 3D robot to its own left (+y)
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
        check(rec.d[6] - 180 > -20, `the person bends one knee, the other leg straight → the robot does not squat (it bends both knees together) (ID6 ${(rec.d[6] - 180).toFixed(0)}°)`);
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

    const STAND = path.join(DIR, 'stand.webm'); // a real photo: a man standing, one arm hanging, the other holding a remote
    if (fs.existsSync(STAND)) {
        const n1 = ((await out()).match(/로봇 동작으로 바꿨습니다/g) || []).length;
        await p.setInputFiles('.simp .sim-vid-file', STAND);
        await p.waitForFunction(n => (document.getElementById('console-lines').textContent.match(/로봇 동작으로 바꿨습니다|영상으로 따라 하기:/g) || []).length > n, n1, {timeout: 180000});
        const real = await p.evaluate(() => {
            const s = window.dynamicmakers.simPanel;
            const f = s.motionRec.frames[s.motionRec.frames.length - 1].deg;
            const D = Math.PI / 180;
            const j = id => s.jointMap.find(x => x.id === id);
            const rad = id => j(id).sign * (f[id] - 180) * D;
            const dR = s.physics.armDirection('R', rad(1), rad(2)); // mirrored: the person's hanging left arm
            return {off: Math.acos(-dR[2]) / D, ids: [1, 2, 3, 4].map(i => Math.round(f[i] - 180)).join(' ')};
        });
        check(real.off < 20, `real photo: the person's hanging arm → the robot's arm hangs down (${real.off.toFixed(0)}° off; ID1-4 ${real.ids})`);
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
