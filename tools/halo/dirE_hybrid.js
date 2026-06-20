/* DIRECTION E — ARCOLOGY × TERMINAL  (the jury's hybrid winner)
 * An epic hazy cyberpunk megastructure seen THROUGH an operator's terminal:
 * tiered arcology towers, bridges and vertical canyons receding into volumetric
 * fog, window-grids and holo-signage glowing — overlaid with a braindance HUD
 * (corner brackets, a focal reticle, readout panels, glyph rain, alert glyphs)
 * graded onto CRT phosphor. Epic scene + cyberpunk-terminal in one frame. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Custom cyberpunk-terminal colorways (NOT outrun). Curated + tuned from the
  // jury research set. bg=void, fog=atmosphere, glow=reactor, win=window light,
  // sign=holo signage, hud=interface, alert=hot event/chase.
  const PALS = [
    { name: 'Reactor',     bg: '#04080a', fog: '#0a3a2e', glow: '#39ff9e', win: '#7dffc8', sign: '#ffcf3d', hud: '#5bff9e', alert: '#ff4d6d' },
    { name: 'Deep Cyber',  bg: '#04060f', fog: '#0b2545', glow: '#1fb6ff', win: '#7de8ff', sign: '#ff3df0', hud: '#3de0e8', alert: '#ffd23d' },
    { name: 'Sodium',      bg: '#0a0703', fog: '#2b1600', glow: '#ff9a1f', win: '#ffd089', sign: '#34e0d0', hud: '#ffc000', alert: '#ff3d3d' },
    { name: 'Toxic',       bg: '#070d02', fog: '#26400a', glow: '#b6ff1f', win: '#e6ff7d', sign: '#ff2dba', hud: '#c6ff00', alert: '#1fd6ff' },
    { name: 'Ultraviolet', bg: '#070416', fog: '#22115a', glow: '#9b5dff', win: '#c79bff', sign: '#ff3d8a', hud: '#a76bff', alert: '#3df0ff' },
    { name: 'Phosphor',    bg: '#02160b', fog: '#0b3d2e', glow: '#1fbf6b', win: '#c8ffe0', sign: '#ff5d5d', hud: '#5bff9e', alert: '#ffe23d' },
    { name: 'Magenta',     bg: '#0a000c', fog: '#2a0535', glow: '#ff2da0', win: '#ff9be8', sign: '#ff8a3d', hud: '#ff4fd8', alert: '#ffe23d' },
    { name: 'Ice Break',   bg: '#02040c', fog: '#0a2440', glow: '#1f8fff', win: '#eaf4ff', sign: '#ff5db0', hud: '#7ac8ff', alert: '#ffc23d' },
  ];
  const FMTS = [ { W: 1200, H: 1500, t: 'Monolith' }, { W: 1500, H: 1160, t: 'Vista' }, { W: 1320, H: 1320, t: 'Square' } ];
  const ATMOS = ['Reactor Dawn', 'Deep Smog', 'Eclipse', 'Acid Fog'];
  const STRUCT = ['Spire', 'Terraces', 'Canyon', 'Sprawl'];
  const MODE = ['Recon', 'Trace', 'Breach', 'Ghost'];
  // rare chase events
  const EVENTS = ['None', 'None', 'None', 'None', 'Ascension Beam', 'Alert', 'Blackout', 'Comet'];
  const GLY = '0123456789ABCDEF░▒▓│┤╣║╗╝╚╔╩╦╠═╬⌐¬◊◆▮▯ｱｲｳｴｵｶｷｸﾊﾋﾌﾍﾎ';

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const atmo = K.pick(ATMOS, r);
    const struct = K.pick(STRUCT, r);
    const mode = K.pick(MODE, r);
    const event = K.pick(EVENTS, r);
    return { pal, fmt, atmo, struct, mode, event };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Atmosphere: p.atmo, Structure: p.struct, Overlay: p.mode, Event: p.event };
  }

  // density of haze per atmosphere (floors raised so no seed reads flat)
  function fogMul(atmo) { return atmo === 'Deep Smog' ? 1.5 : atmo === 'Acid Fog' ? 1.25 : atmo === 'Eclipse' ? 0.85 : 0.75; }

  // ── a tiered arcology tower: stacked setback blocks, window grids per block ──
  function arcoTower(x, P, bx, baseY, bw, bh, depth, struct, r) {
    let segY = baseY, remaining = bh, w = bw, cx = bx + bw / 2;
    const setbacks = struct === 'Terraces' ? K.rint(r, 3, 6) : struct === 'Spire' ? K.rint(r, 4, 7) : K.rint(r, 1, 3);
    const bodyCol = K.mix(P.bg, P.fog, 0.4 + depth * 0.45);
    for (let s = 0; s < setbacks && remaining > 6; s++) {
      const segH = remaining * (s === setbacks - 1 ? 1 : (0.3 + r() * 0.4));
      const x0 = cx - w / 2;
      // body
      x.fillStyle = bodyCol; x.fillRect(x0, segY - segH, w, segH);
      // edge light
      x.strokeStyle = K.rgba(P.glow, 0.08 + depth * 0.22); x.lineWidth = 1; x.strokeRect(x0 + 0.5, segY - segH + 0.5, w, segH);
      // window grid — finer cells on nearer towers for a hi-def megastructure read
      const cw = Math.max(2.2, w / K.rint(r, 8, 16));
      const ch = Math.max(3, cw * (0.9 + r() * 0.6));
      const onP = (0.16 + depth * 0.4);
      for (let yy = segY - segH + ch; yy < segY - 2; yy += ch + 1) {
        for (let xx = x0 + 2; xx < x0 + w - cw; xx += cw + 1) {
          if (r() > onP) continue;
          const lit = r() < 0.6 ? P.win : (r() < 0.5 ? P.sign : P.glow);
          x.save(); x.globalCompositeOperation = 'lighter';
          x.fillStyle = K.rgba(lit, (0.3 + depth * 0.5) * (0.55 + r() * 0.45));
          x.fillRect(xx, yy, cw * 0.66, ch * 0.5);
          x.restore();
        }
      }
      segY -= segH; remaining -= segH;
      w = Math.max(bw * 0.16, w * (struct === 'Spire' ? 0.62 + r() * 0.12 : 0.8 + r() * 0.12));
    }
    // crown antenna + beacon
    if (depth > 0.4 && r() < 0.8) {
      const ah = bh * (0.05 + r() * 0.16);
      x.strokeStyle = K.rgba(P.win, 0.5); x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(cx, segY); x.lineTo(cx, segY - ah); x.stroke();
      K.bloom(x, cx, segY - ah, 5 + depth * 14, P.alert, 0.6);
    }
    return { topX: cx, topY: segY };
  }

  function bridge(x, P, x0, x1, y, depth, r) {
    x.save();
    x.strokeStyle = K.mix(P.bg, P.fog, 0.5 + depth * 0.3); x.lineWidth = 2 + depth * 4;
    x.beginPath(); x.moveTo(x0, y); x.lineTo(x1, y); x.stroke();
    x.globalCompositeOperation = 'lighter';
    const n = Math.floor(Math.abs(x1 - x0) / (6 + r() * 6));
    for (let i = 0; i < n; i++) { const xx = x0 + (x1 - x0) * (i / n); if (r() < 0.6) { x.fillStyle = K.rgba(P.win, 0.4 + depth * 0.4); x.fillRect(xx, y - 1, 2, 2); } }
    x.restore();
  }

  function glyphCol(x, P, cx, top, bot, fs, alpha, r) {
    x.font = `${fs}px monospace`; x.textBaseline = 'top';
    const head = top + r() * (bot - top), len = (bot - top) * (0.4 + r() * 0.6);
    for (let y = top; y < bot; y += fs * 1.08) {
      const d = ((y - head) % len + len) % len / len;
      const a = (1 - d) * alpha;
      if (a < 0.04) continue;
      x.save(); if (d < 0.1) x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba(d < 0.06 ? P.win : (r() < 0.1 ? P.alert : P.hud), a);
      x.fillText(GLY[Math.floor(r() * GLY.length)], cx, y);
      x.restore();
    }
  }

  function hudPanel(x, P, px, py, pw, ph, r) {
    x.save();
    x.fillStyle = K.rgba(P.bg, 0.5); x.fillRect(px, py, pw, ph);
    x.strokeStyle = K.rgba(P.hud, 0.55); x.lineWidth = 1.2; x.strokeRect(px, py, pw, ph);
    const b = Math.min(pw, ph) * 0.2; x.lineWidth = 1.8; x.strokeStyle = K.rgba(P.win, 0.8);
    [[px, py, 1, 1], [px + pw, py, -1, 1], [px, py + ph, 1, -1], [px + pw, py + ph, -1, -1]].forEach(([ax, ay, sx, sy]) => { x.beginPath(); x.moveTo(ax + sx * b, ay); x.lineTo(ax, ay); x.lineTo(ax, ay + sy * b); x.stroke(); });
    const kind = r();
    x.save(); x.globalCompositeOperation = 'lighter';
    if (kind < 0.45) { x.strokeStyle = K.rgba(P.hud, 0.9); x.lineWidth = 1.3; x.beginPath(); const my = py + ph * 0.55, amp = ph * 0.3; for (let i = 0; i <= 70; i++) { const t = i / 70, xx = px + 5 + t * (pw - 10), yy = my + Math.sin(t * Math.PI * (4 + r() * 7) + r()) * amp * Math.sin(t * Math.PI); i === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy); } x.stroke(); }
    else if (kind < 0.75) { const n = K.rint(r, 5, 10), bw = (pw - 10) / n; for (let i = 0; i < n; i++) { const bh = (ph * 0.72) * (0.12 + r()); x.fillStyle = K.rgba(r() < 0.2 ? P.alert : P.hud, 0.6 + r() * 0.4); x.fillRect(px + 5 + i * bw, py + ph - 5 - bh, bw * 0.66, bh); } }
    else { const rows = K.rint(r, 3, 5); for (let i = 0; i < rows; i++) { const ry = py + ph * 0.18 + i * (ph * 0.7 / rows); let c = px + 5; while (c < px + pw - 6) { const w = 4 + r() * pw * 0.22, red = r() < 0.16; x.fillStyle = K.rgba(red ? P.alert : (r() < 0.5 ? P.hud : P.win), red ? 0.7 : 0.35 + r() * 0.4); x.fillRect(c, ry, w, ph * 0.7 / rows * 0.5); c += w + 4 + r() * 7; } } }
    x.restore(); x.restore();
  }

  function reticle(x, P, cx, cy, rad, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.win, 0.7); x.lineWidth = 1.1;
    for (const rr of [rad, rad * 0.62]) { x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke(); }
    const ticks = 60; for (let i = 0; i < ticks; i++) { const a = i / ticks * Math.PI * 2, l = i % 5 === 0 ? rad * 0.1 : rad * 0.04; x.beginPath(); x.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.lineTo(cx + Math.cos(a) * (rad + l), cy + Math.sin(a) * (rad + l)); x.stroke(); }
    x.strokeStyle = K.rgba(P.hud, 0.55); x.beginPath(); x.moveTo(cx - rad * 1.25, cy); x.lineTo(cx + rad * 1.25, cy); x.moveTo(cx, cy - rad * 1.25); x.lineTo(cx, cy + rad * 1.25); x.stroke();
    // corner target box
    const bs = rad * 0.5; x.strokeStyle = K.rgba(P.win, 0.8); x.lineWidth = 1.4;
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{const ax=cx+sx*rad*0.7, ay=cy+sy*rad*0.7; x.beginPath(); x.moveTo(ax - sx*bs*0.4, ay); x.lineTo(ax, ay); x.lineTo(ax, ay - sy*bs*0.4); x.stroke();});
    x.restore();
  }

  function frameBrackets(x, P, W, H) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const m = Math.min(W, H) * 0.045, b = Math.min(W, H) * 0.06;
    x.strokeStyle = K.rgba(P.hud, 0.6); x.lineWidth = 1.6;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([ax, ay, sx, sy]) => { x.beginPath(); x.moveTo(ax + sx * b, ay); x.lineTo(ax, ay); x.lineTo(ax, ay + sy * b); x.stroke(); });
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const fm = fogMul(p.atmo);

    // ── sky / void gradient ──
    const horizon = H * (0.6 + r() * 0.14);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, K.mix(P.bg, '#000', 0.35));
    g.addColorStop(Math.max(0, horizon / H - 0.14), P.bg);
    g.addColorStop(horizon / H, K.mix(P.fog, P.glow, p.atmo === 'Eclipse' ? 0.05 : 0.2));
    g.addColorStop(1, K.mix(P.bg, P.fog, 0.55));
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // reactor glow / eclipse on horizon
    if (p.atmo === 'Eclipse') { x.save(); x.globalCompositeOperation = 'lighter'; const eg = x.createRadialGradient(W * 0.5, horizon * 0.8, W * 0.04, W * 0.5, horizon * 0.8, W * 0.34); eg.addColorStop(0, K.rgba(P.bg, 0)); eg.addColorStop(0.45, K.rgba(P.alert, 0.12)); eg.addColorStop(0.5, K.rgba(P.alert, 0.3)); eg.addColorStop(0.56, K.rgba(P.alert, 0.05)); eg.addColorStop(1, K.rgba(P.alert, 0)); x.fillStyle = eg; x.fillRect(0, 0, W, H); x.restore(); }
    else K.bloom(x, W * (0.3 + r() * 0.4), horizon, W * (0.4 + r() * 0.25), P.glow, p.atmo === 'Deep Smog' ? 0.16 : 0.3);

    // ── depth tiers of arcology (back→front) ──
    const tiers = 4;
    for (let l = 0; l < tiers; l++) {
      const depth = l / (tiers - 1);
      const baseY = horizon + depth * (H - horizon) * 0.9;
      const maxH = (0.2 + depth * 0.62) * H;
      const wMul = p.struct === 'Spire' ? 0.55 : p.struct === 'Canyon' ? 1.35 : p.struct === 'Sprawl' ? 1.1 : 0.9;
      const tops = [];
      let bx = -W * 0.06;
      while (bx < W * 1.04) {
        const bw = (W * (0.05 + r() * 0.1)) * (0.55 + depth) * wMul;
        const bh = maxH * (0.4 + r() * 0.6) * (p.struct === 'Spire' ? 1.2 : 1);
        const t = arcoTower(x, P, bx, baseY, bw, bh, depth, p.struct, r);
        tops.push({ x: t.topX, y: baseY - bh, bw });
        // holo-signage strapped to nearer facades — vivid colour pops
        if (depth > 0.4 && r() < 0.26) holoSign(x, P, bx + bw * 0.1, baseY - bh * (0.35 + r() * 0.45), bw * (0.7 + r() * 0.8), bh * (0.1 + r() * 0.1), depth, r);
        bx += bw * (1.04 + r() * 0.45);
      }
      // bridges between adjacent nearer towers
      if (depth > 0.4) { for (let i = 1; i < tops.length; i++) { if (r() < 0.3 && Math.abs(tops[i].x - tops[i - 1].x) < W * 0.22) { const by = Math.max(tops[i].y, tops[i - 1].y) + (baseY - Math.max(tops[i].y, tops[i - 1].y)) * (0.2 + r() * 0.5); bridge(x, P, tops[i - 1].x, tops[i].x, by, depth, r); } } }
      // volumetric fog between tiers
      K.hazeSheet(x, W, H, noise, K.mix(P.fog, P.glow, 0.22), ((1 - depth) * 0.5 + 0.14) * fm, 90 + l * 28, 'screen');
    }
    function holoSign(x, P, sx, sy, sw, sh, depth, r) {
      x.save(); x.globalCompositeOperation = 'lighter';
      const col = r() < 0.5 ? P.sign : P.alert;
      K.bloom(x, sx + sw / 2, sy + sh / 2, Math.max(sw, sh) * 0.9, col, 0.18 * (0.5 + depth));
      x.fillStyle = K.rgba(col, 0.1); x.fillRect(sx, sy, sw, sh);
      x.strokeStyle = K.rgba(col, 0.5); x.lineWidth = 1.2; x.strokeRect(sx, sy, sw, sh);
      const rows = K.rint(r, 1, 3);
      for (let i = 0; i < rows; i++) { const ry = sy + (i + 0.5) * (sh / rows); let c = sx + 3; while (c < sx + sw - 4) { const w = 2 + r() * sw * 0.16; if (r() < 0.7) { x.fillStyle = K.rgba(r() < 0.5 ? P.win : col, 0.5 + r() * 0.4); x.fillRect(c, ry - sh * 0.05, w, sh * 0.1); } c += w + 2 + r() * 4; } }
      x.restore();
    }

    // ── foreground cables ──
    x.save(); x.globalCompositeOperation = 'lighter';
    const cables = K.rint(r, 5, 11);
    for (let i = 0; i < cables; i++) { const x0 = r() * W, x1 = x0 + (r() - 0.5) * W * 0.5, sag = 40 + r() * 160; x.strokeStyle = K.rgba(K.mix(P.bg, P.alert, 0.25), 0.6); x.lineWidth = 0.7 + r() * 1.6; x.beginPath(); x.moveTo(x0, 0); x.quadraticCurveTo((x0 + x1) / 2, sag, x1, H * (0.28 + r() * 0.4)); x.stroke(); }
    x.restore();

    // ── rare CHASE events ──
    if (p.event === 'Ascension Beam') { const bxp = W * (0.3 + r() * 0.4); x.save(); x.globalCompositeOperation = 'lighter'; const bg = x.createLinearGradient(bxp, H, bxp, 0); bg.addColorStop(0, K.rgba(P.alert, 0.5)); bg.addColorStop(1, K.rgba(P.alert, 0)); x.fillStyle = bg; x.fillRect(bxp - W * 0.02, 0, W * 0.04, H); K.bloom(x, bxp, H * 0.4, W * 0.2, P.alert, 0.3); x.restore(); }
    else if (p.event === 'Comet') { const c0x = r() * W, c0y = r() * horizon; x.save(); x.globalCompositeOperation = 'lighter'; const cg = x.createLinearGradient(c0x, c0y, c0x + W * 0.3, c0y + H * 0.18); cg.addColorStop(0, K.rgba(P.win, 0.9)); cg.addColorStop(1, K.rgba(P.win, 0)); x.strokeStyle = cg; x.lineWidth = 2.5; x.beginPath(); x.moveTo(c0x, c0y); x.lineTo(c0x + W * 0.3, c0y + H * 0.18); x.stroke(); K.bloom(x, c0x, c0y, 16, P.win, 0.9); x.restore(); }
    else if (p.event === 'Alert') { K.hazeSheet(x, W, H, noise, P.alert, 0.14 * fm, 180, 'screen'); }

    // ════ TERMINAL / HUD OVERLAY (the braindance view) ════
    if (p.mode !== 'Ghost') {
      // glyph rain down the margins (frames the scene without burying it)
      const fs = W * 0.012;
      for (const side of [0.03, 0.965]) { let cxp = W * side; for (let k = 0; k < 2; k++) { glyphCol(x, P, cxp, H * 0.06, H * 0.94, fs, 0.5, r); cxp += fs * 1.1 * (side < 0.5 ? 1 : -1); } }
      // diegetic header readout line (asymmetric, top-left) — replaces the tired
      // symmetric 4-corner frame the jury flagged.
      x.save(); x.globalCompositeOperation = 'lighter'; x.font = `${fs * 0.95}px monospace`; x.textBaseline = 'top';
      let hx = W * 0.05; const hy = H * 0.045;
      for (let i = 0; i < K.rint(r, 8, 16); i++) { const seg = GLY[Math.floor(r() * GLY.length)]; x.fillStyle = K.rgba(r() < 0.15 ? P.alert : P.hud, 0.5 + r() * 0.4); x.fillText(seg, hx, hy); hx += fs * (0.8 + r() * 0.9); }
      x.strokeStyle = K.rgba(P.hud, 0.4); x.lineWidth = 1; x.beginPath(); x.moveTo(W * 0.05, hy + fs * 1.4); x.lineTo(W * 0.05 + (hx - W * 0.05), hy + fs * 1.4); x.stroke(); x.restore();
      // HERO readout panel — the one focal anchor that commands the eye, on a
      // phi point, larger than the rest.
      const hpw = W * (0.26 + r() * 0.08), hph = H * (0.16 + r() * 0.06);
      const heroLeft = r() < 0.5; const hpx = heroLeft ? W * (0.06 + r() * 0.04) : W * (0.62 - r() * 0.04);
      const hpy = r() < 0.5 ? H * (0.1 + r() * 0.08) : H * (0.66 - r() * 0.06);
      hudPanel(x, P, hpx, hpy, hpw, hph, r);
      // a couple of smaller satellite panels
      const panels = p.mode === 'Breach' ? K.rint(r, 2, 4) : K.rint(r, 1, 2);
      for (let i = 0; i < panels; i++) { const pw = W * (0.13 + r() * 0.13), ph = H * (0.08 + r() * 0.1); const px = W * (0.05 + r() * 0.7), py = H * (0.06 + r() * 0.76); hudPanel(x, P, Math.min(px, W - pw - W * 0.05), Math.min(py, H - ph - H * 0.05), pw, ph, r); }
      // focal reticle — rarer + offset (Trace/Breach only), so it stops feeling generic
      if (p.mode === 'Trace' || p.mode === 'Breach') reticle(x, P, W * (heroLeft ? 0.6 : 0.34) + (r() - 0.5) * W * 0.12, H * (0.3 + r() * 0.32), Math.min(W, H) * (0.1 + r() * 0.06), r);
    }

    // breach glitch tear
    if (p.mode === 'Breach') { const slices = K.rint(r, 5, 11); for (let i = 0; i < slices; i++) { const sy = r() * H, sh = 5 + r() * 34, off = (r() - 0.5) * W * 0.1; try { const im = x.getImageData(0, sy, W, sh); x.putImageData(im, off, sy); } catch (e) {} } }

    // ── non-optional atmospheric falloff: near-black void up top, fog pooling
    //    low — guarantees depth + scale on every seed (kills "flat lit-city"). ──
    const vf = x.createLinearGradient(0, 0, 0, H);
    vf.addColorStop(0, K.rgba(K.mix(P.bg, '#000', 0.5), 0.55));
    vf.addColorStop(0.4, K.rgba(P.bg, 0.0));
    vf.addColorStop(1, K.rgba(P.bg, 0.0));
    x.fillStyle = vf; x.fillRect(0, 0, W, H);
    x.save(); x.globalCompositeOperation = 'screen';
    const lowFog = x.createLinearGradient(0, H * 0.55, 0, H);
    lowFog.addColorStop(0, K.rgba(P.fog, 0)); lowFog.addColorStop(1, K.rgba(K.mix(P.fog, P.glow, 0.2), 0.32 * fm));
    x.fillStyle = lowFog; x.fillRect(0, H * 0.55, W, H * 0.45); x.restore();

    // ── CRT / film finish ──
    K.scanlines(x, W, H, 3, p.mode === 'Ghost' ? 0.08 : 0.15);
    K.chromaSplit(x, W, H, p.mode === 'Breach' ? 3 : 1);
    K.hazeSheet(x, W, H, noise, P.glow, 0.09 * fm, 230, 'screen');
    K.grain(x, W, H, 500, r);
    K.vignette(x, W, H, 0.48);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'E_hybrid', draw, traits };
})();
