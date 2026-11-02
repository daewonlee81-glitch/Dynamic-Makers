/* Diagnosis check: each simulated field fault must produce the right advice.
 * Usage: node test/diagnose-check.js <url> */
const path = require('path');
const {chromium} = require(require.resolve('playwright', {paths: [__dirname, path.join(__dirname, '../../scratch-cm550')]}));
const URL = process.argv[2];
const check = (c, m) => { if (!c) throw new Error(`FAIL: ${m}`); console.log(`ok - ${m}`); };
const run = async (b, faultName) => {
    const ctx = await b.newContext({viewport: {width: 1366, height: 860}});
    await ctx.addInitScript(f => { window.__dmSimFault = f; }, faultName);
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(URL);
    await p.waitForFunction(() => document.body.classList.contains('ready'));
    await p.click('#connect-sim');
    await p.click('#view-monitor');
    if (faultName) { // no motors → scan fails → diagnosis starts by itself
        await p.waitForFunction(() => document.querySelector('.mon-diag-summary'), null, {timeout: 20000});
    }
    const summary = faultName ? await p.textContent('.mon-diag-summary') : '';
    const items = faultName ? await p.$$eval('.mon-diag-list li', li => li.map(x => x.textContent)) : [];
    return {ctx, p, summary, items, errors};
};
(async () => {
    const b = await chromium.launch();

    let r = await run(b, 'lowvolt');
    console.log(r.items.join('\n'));
    check(/배터리\(또는 12V 어댑터\)/.test(r.summary) && r.items.some(t => t.includes('5.0 V')), 'USB-only power → battery advice');
    await r.ctx.close();

    r = await run(b, 'nopower');
    check(/전원 켜기/.test(r.summary), 'power switch off → "전원 켜기" advice');
    await r.p.click('.mon-diag-list .mon-btn-small');
    await r.p.waitForFunction(() => /통신됩니다/.test((document.querySelector('.mon-diag-summary') || {}).textContent || ''), null, {timeout: 20000});
    check(await r.p.$$eval('#monitor tbody tr', t => t.length) === 4, '[전원 켜기] fixes it and lists the 4 motors');
    await r.ctx.close();

    r = await run(b, 'relay');
    console.log(r.items.join('\n'));
    check(r.items.some(t => t.includes('자체 검색') && t.includes('4개')) && /전달하지 않습니다/.test(r.summary),
        'controller sees 4 motors but no relay → relay verdict with raw bytes for analysis');
    await r.p.click('.mon-diag .mon-btn-small:has-text("결과 복사")').catch(() => {});
    await r.p.screenshot({path: path.join(__dirname, '..', 'screenshots', '6-diagnose-relay.png')});
    await r.ctx.close();

    r = await run(b, '');
    await r.p.waitForFunction(() => document.querySelectorAll('#monitor tbody tr').length === 4);
    await r.p.click('#monitor .mon-btn:has-text("진단")');
    await r.p.waitForFunction(() => document.querySelector('.mon-diag-summary'), null, {timeout: 20000});
    check(/통신됩니다/.test(await r.p.textContent('.mon-diag-summary')), 'healthy robot → "통신됩니다"');
    check(!r.errors.length, 'no page errors');
    await r.ctx.close();
    await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
