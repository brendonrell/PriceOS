/*
 * pd-status — the "is PD down?" page (status.pricediscussion.com).
 *
 * A deliberately separate, dependency-free Worker: it must stay up when the
 * main app is the thing that's down, so it shares NOTHING with the
 * pricediscussion Worker — no bindings, no build, one file.
 *
 * Each request probes the platform's three legs live (5s timeout each):
 *   • APP — the site itself (the deployed Worker).
 *   • API — a real API route (/api/fx, the cheapest cached one).
 *   • DATA — Supabase's public health endpoint (the off-chain store).
 * and renders a plain Courier status page (auto-refreshes every 30s).
 * `/status.json` serves the same result as JSON.
 */

const APP_URL = 'https://pricediscussion.pricediscussion.workers.dev';
/* The publishable anon key — already public by design (ships in the app's
   client bundle); needed because Supabase's health endpoint wants it. */
const SUPABASE_ANON = 'sb_publishable_UcKB7iZkyM_gv8F0LTdD0w_IpYriFsh';
const PROBES = [
    { key: 'APP', label: 'THE SITE', url: `${APP_URL}/` },
    { key: 'API', label: 'THE API', url: `${APP_URL}/api/fx` },
    {
        key: 'DATA',
        label: 'THE DATABASE',
        url: 'https://zspxpfwlwikdxwavffjn.supabase.co/auth/v1/health',
        headers: { apikey: SUPABASE_ANON },
    },
];
const TIMEOUT_MS = 5000;

async function probe({ key, label, url, headers }) {
    const t0 = Date.now();
    try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
        const res = await fetch(url, { signal: ac.signal, cf: { cacheTtl: 0 }, headers: { 'user-agent': 'pd-status', ...headers } });
        clearTimeout(timer);
        return { key, label, ok: res.ok, ms: Date.now() - t0, code: res.status };
    } catch {
        return { key, label, ok: false, ms: Date.now() - t0, code: 0 };
    }
}

function page(results, allOk) {
    const rows = results
        .map(
            (r) => `<div class="row${r.ok ? '' : ' bad'}">
                <span class="lbl">${r.label}</span>
                <span class="dot">${r.ok ? '●' : '○'}</span>
                <span class="val">${r.ok ? 'OPERATIONAL' : 'DOWN'}</span>
                <span class="ms">${r.ms}ms</span>
            </div>`,
        )
        .join('');
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="30">
<title>${allOk ? 'PD IS UP' : 'PD IS DOWN'} · Price Discussion Status</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Courier New', Courier, monospace;
        background: #101014; color: #f2f2f2;
        min-height: 100vh; display: flex; align-items: center; justify-content: center;
        padding: 24px;
    }
    .card { width: 100%; max-width: 560px; border: 1px solid #f2f2f2; padding: 28px 24px; }
    h1 { font-size: 15px; font-weight: bold; letter-spacing: 2px; margin-bottom: 6px; }
    .verdict { font-size: 30px; font-weight: bold; margin-bottom: 22px; }
    .verdict.bad { color: #ff5c5c; }
    .verdict.good { color: #3BA55D; }
    .row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid #f2f2f2; font-size: 13px; font-weight: bold; }
    .row .lbl { flex: 1; }
    .row .dot, .row .val { color: #3BA55D; }
    .row.bad .dot, .row.bad .val { color: #ff5c5c; }
    .row .ms { min-width: 64px; text-align: right; }
    .foot { margin-top: 22px; font-size: 12px; font-weight: bold; }
    .foot a { color: inherit; }
</style>
</head>
<body>
<div class="card">
    <h1>PRICE DISCUSSION · STATUS</h1>
    <div class="verdict ${allOk ? 'good' : 'bad'}">${allOk ? 'ALL SYSTEMS OPERATIONAL' : 'PD IS HAVING TROUBLE'}</div>
    ${rows}
    <div class="foot">Checked live just now · refreshes every 30s · <a href="/status.json">JSON</a></div>
</div>
</body>
</html>`;
}

export default {
    async fetch(request) {
        const results = await Promise.all(PROBES.map(probe));
        const allOk = results.every((r) => r.ok);
        const url = new URL(request.url);
        if (url.pathname === '/status.json') {
            return new Response(JSON.stringify({ up: allOk, checks: results, at: new Date().toISOString() }, null, 2), {
                headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
            });
        }
        return new Response(page(results, allOk), {
            status: allOk ? 200 : 503,
            headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
        });
    },
};
