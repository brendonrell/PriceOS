/* AURUM — LIQUID CHROME / FERROFLUID
 * Molten metal as pure abstraction: merging metaball pools, ferrofluid spike
 * crowns, flowing chrome rivulets and bead chains. Polished mirror-chrome
 * surfaces with heavy thin-film (oil-slick) iridescence, tight specular sheen,
 * and soft ambient-occlusion under every form. Wet, reflective, alive. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Colorways. Mostly bright/saturated grounds; 2 dark for range. `grad` pairs
  // define the ground wash (g0→g1). `metal` is the base hue the chrome ramp
  // pulls from; `irid` biases the thin-film band; `spec` is the highlight tint.
  const PALS = [
    { name: 'Aurum',     g0: '#f6d479', g1: '#b8731a', metal: '#caa23a', irid: 0.10, spec: '#fff4cf', dark: false },
    { name: 'Mercury',   g0: '#e9eef5', g1: '#8c97ab', metal: '#aeb8c8', irid: 0.55, spec: '#ffffff', dark: false },
    { name: 'Plasma',    g0: '#ff7ae0', g1: '#7d18b8', metal: '#d05ad6', irid: 0.78, spec: '#ffe1ff', dark: false },
    { name: 'Lagoon',    g0: '#5ff0d6', g1: '#0c6f8f', metal: '#36c4c0', irid: 0.42, spec: '#e6fffb', dark: false },
    { name: 'Coral',     g0: '#ff9a6b', g1: '#c01f55', metal: '#e8584f', irid: 0.04, spec: '#fff0e6', dark: false },
    { name: 'Acid',      g0: '#dfff4a', g1: '#3a8f1f', metal: '#a6d62a', irid: 0.30, spec: '#f5ffd6', dark: false },
    { name: 'Cobalt',    g0: '#7db8ff', g1: '#1830b8', metal: '#3f7be0', irid: 0.60, spec: '#e6f0ff', dark: false },
    { name: 'Obsidian',  g0: '#2b3040', g1: '#070810', metal: '#5b6480', irid: 0.66, spec: '#dfe6ff', dark: true },
    { name: 'Oilslick',  g0: '#241038', g1: '#06030c', metal: '#7a4bd0', irid: 0.85, spec: '#ffe6ff', dark: true },
  ];

  const FMTS = [
    { W: 1400, H: 1400, t: 'Square' },
    { W: 1500, H: 1120, t: 'Landscape' },
    { W: 1120, H: 1500, t: 'Portrait' },
  ];

  const MODES = ['Crown', 'Coalescence', 'Rivulet', 'Bead Field'];
  const FINISH = ['High Polish', 'Brushed', 'Wet'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const mode = K.pick(MODES, r);
    const finish = K.pick(FINISH, r);
    const iridStrength = 0.55 + r() * 0.45; // how much oil-slick on the metal
    const lightAng = -Math.PI / 2 + (r() - 0.5) * 1.1; // global light from upper area
    // flatten palette fields onto P for convenience (g0,g1,metal,irid,spec,dark)
    return { pal, fmt, mode, finish, iridStrength, lightAng,
      g0: pal.g0, g1: pal.g1, metal: pal.metal, irid: pal.irid, spec: pal.spec, dark: pal.dark };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Mode: p.mode, Finish: p.finish };
  }

  /* ── shaded chrome blob: a radial body with mirror-ramp banding, a thin-film
     iridescent rim, a tight specular hotspot and a soft AO contact shadow. ── */
  function chromeBlob(x, P, cx, cy, rad, light, iridStr, finish, r, seedPhase) {
    // soft contact shadow below
    K.softShadow(x, cx, cy + rad * 0.34, rad * 1.5, 0.42);

    // base metal body — vertical mirror ramp (dark top, bright belly, dark base)
    const g = x.createLinearGradient(cx, cy - rad, cx, cy + rad);
    g.addColorStop(0.00, K.mix(P.metal, '#05060a', 0.62));
    g.addColorStop(0.18, K.mix(P.metal, '#ffffff', 0.30));
    g.addColorStop(0.40, K.mix(P.metal, '#05060a', 0.30));
    g.addColorStop(0.58, K.mix(P.metal, '#ffffff', 0.92));
    g.addColorStop(0.74, K.mix(P.metal, '#06070c', 0.50));
    g.addColorStop(1.00, K.mix(P.metal, '#ffffff', 0.22));
    x.save();
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.clip();
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);

    // thin-film iridescent sweep across the body (oil-slick), additive
    x.globalCompositeOperation = 'overlay';
    const bands = 7;
    for (let i = 0; i < bands; i++) {
      const t = i / bands;
      const phase = seedPhase + t * 1.4 + P.irid;
      const col = K.iridescent(phase, 0.9, 0.6);
      const yy = cy - rad + t * rad * 2;
      x.fillStyle = K.rgba(col, 0.05 + iridStr * 0.10);
      x.fillRect(cx - rad, yy, rad * 2, rad * 2 / bands + 1);
    }

    // brushed finish: faint vertical streaks
    if (finish === 'Brushed') {
      x.globalCompositeOperation = 'soft-light';
      for (let i = 0; i < rad; i += 2) {
        x.fillStyle = K.rgba(i % 4 < 2 ? '#ffffff' : '#000000', 0.05);
        x.fillRect(cx - rad + i, cy - rad, 1, rad * 2);
      }
    }
    x.restore();

    // dark rim (terminator) + iridescent rim-light on the lit side
    x.save();
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2);
    x.lineWidth = Math.max(1.5, rad * 0.06);
    x.strokeStyle = K.rgba(K.mix(P.metal, '#000', 0.7), 0.5);
    x.stroke();
    // iridescent rim arc on lit edge
    const la = light;
    const rg = x.createConicGradient ? null : null;
    x.globalCompositeOperation = 'lighter';
    x.lineWidth = Math.max(1.2, rad * 0.05);
    x.beginPath();
    x.arc(cx, cy, rad * 0.97, la - 1.5, la + 1.5);
    x.strokeStyle = K.rgba(K.iridescent(seedPhase + 0.3 + P.irid, 0.95, 0.65), 0.55 + iridStr * 0.3);
    x.stroke();
    x.restore();

    // tight specular hotspot on the lit upper side
    const hx = cx + Math.cos(light) * rad * 0.42;
    const hy = cy + Math.sin(light) * rad * 0.42;
    K.sheen(x, hx, hy, rad * 0.55, P.spec, 0.55);
    // tiny crisp glint core
    K.sheen(x, hx, hy, rad * 0.16, '#ffffff', 0.85);
  }

  /* ── ferrofluid spike: a tapered chrome cone with mirror shading. ── */
  function spike(x, P, bx, by, len, baseW, ang, light, iridStr, r, seedPhase) {
    const tx = bx + Math.cos(ang) * len, ty = by + Math.sin(ang) * len;
    const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
    x.save();
    x.beginPath();
    x.moveTo(bx + px * baseW, by + py * baseW);
    x.quadraticCurveTo(
      bx + Math.cos(ang) * len * 0.5 + px * baseW * 0.5,
      by + Math.sin(ang) * len * 0.5 + py * baseW * 0.5,
      tx, ty);
    x.quadraticCurveTo(
      bx + Math.cos(ang) * len * 0.5 - px * baseW * 0.5,
      by + Math.sin(ang) * len * 0.5 - py * baseW * 0.5,
      bx - px * baseW, by - py * baseW);
    x.closePath();
    x.clip();
    const g = x.createLinearGradient(bx + px * baseW, by + py * baseW, bx - px * baseW, by - py * baseW);
    g.addColorStop(0.0, K.mix(P.metal, '#05060a', 0.55));
    g.addColorStop(0.45, K.mix(P.metal, '#ffffff', 0.85));
    g.addColorStop(0.7, K.mix(P.metal, '#06070c', 0.35));
    g.addColorStop(1.0, K.mix(P.metal, '#ffffff', 0.25));
    x.fillStyle = g;
    x.fillRect(Math.min(bx, tx) - baseW, Math.min(by, ty) - baseW, len + baseW * 2, len + baseW * 2);
    // iridescent overlay
    x.globalCompositeOperation = 'overlay';
    x.fillStyle = K.rgba(K.iridescent(seedPhase + P.irid + 0.2, 0.9, 0.6), 0.12 * iridStr);
    x.fillRect(Math.min(bx, tx) - baseW, Math.min(by, ty) - baseW, len + baseW * 2, len + baseW * 2);
    x.restore();
    // tip glint
    K.sheen(x, tx, ty, baseW * 1.1, P.spec, 0.5);
  }

  function draw(canvas, seed) {
    const r = K.rng(seed);
    const P = params(r);
    const W = P.fmt.W, H = P.fmt.H;
    canvas.width = W; canvas.height = H;
    const x = canvas.getContext('2d');
    const noise = K.makeNoise(seed ^ 0x9e37);
    const seedPhase = r(); // global thin-film phase for this token
    const minD = Math.min(W, H);

    // ── GROUND: rich vertical wash with a soft radial glow off-center ──
    const gg = x.createLinearGradient(0, 0, W * 0.2, H);
    gg.addColorStop(0, K.mix(P.g0, '#ffffff', P.dark ? 0.04 : 0.12));
    gg.addColorStop(0.55, P.g0);
    gg.addColorStop(1, P.g1);
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    // atmospheric radial lift
    const lcx = W * (0.35 + r() * 0.3), lcy = H * (0.3 + r() * 0.25);
    K.bloom(x, lcx, lcy, minD * 0.9, K.mix(P.g0, '#ffffff', 0.5), P.dark ? 0.18 : 0.32);
    // gentle haze before forms (depth)
    K.hazeSheet(x, W, H, noise, K.mix(P.g1, '#ffffff', 0.3), P.dark ? 0.10 : 0.16, minD * 0.55, 'screen');

    const light = P.lightAng;
    const cx = W * (0.42 + r() * 0.16), cy = H * (0.5 + (r() - 0.5) * 0.12);

    // ── MODE COMPOSITIONS ──
    if (P.mode === 'Crown') {
      // ferrofluid spike crown around a central pool
      const R = minD * (0.16 + r() * 0.05);
      // back spikes first
      const n = K.rint(r, 14, 22);
      const order = [];
      for (let i = 0; i < n; i++) order.push(i);
      for (const i of order) {
        const a = (i / n) * Math.PI * 2 + r() * 0.05;
        const len = R * (0.7 + Math.abs(K.randn(r)) * 0.9);
        const bw = R * (0.13 + r() * 0.08);
        const bx = cx + Math.cos(a) * R * 0.85, by = cy + Math.sin(a) * R * 0.85;
        spike(x, P, bx, by, len, bw, a, light, P.iridStrength, r, seedPhase);
      }
      // central pool on top
      chromeBlob(x, P, cx, cy, R, light, P.iridStrength, P.finish, r, seedPhase);
      // a few satellite beads
      for (let i = 0; i < K.rint(r, 3, 6); i++) {
        const a = r() * Math.PI * 2, dd = R * (1.6 + r() * 1.1);
        chromeBlob(x, P, cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, R * (0.12 + r() * 0.16), light, P.iridStrength, P.finish, r, seedPhase + 0.1);
      }
    } else if (P.mode === 'Coalescence') {
      // several large blobs merging — metaball cluster, big to small
      const count = K.rint(r, 4, 7);
      const sizes = [];
      for (let i = 0; i < count; i++) sizes.push({ s: 0.22 - i * 0.02 + r() * 0.04, i });
      // connective necks (metaball illusion): draw soft chrome links first
      const pts = [];
      for (let i = 0; i < count; i++) {
        const a = r() * Math.PI * 2, dd = minD * (0.05 + r() * 0.22);
        pts.push({ bx: cx + Math.cos(a) * dd, by: cy + Math.sin(a) * dd, R: minD * sizes[i].s });
      }
      // necks
      x.save(); x.globalCompositeOperation = 'source-over';
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].bx - pts[j].bx, pts[i].by - pts[j].by);
          if (d < (pts[i].R + pts[j].R) * 1.05) {
            const mx = (pts[i].bx + pts[j].bx) / 2, my = (pts[i].by + pts[j].by) / 2;
            K.softShadow(x, mx, my + 6, (pts[i].R + pts[j].R) * 0.4, 0.3);
            const ng = x.createLinearGradient(pts[i].bx, pts[i].by, pts[j].bx, pts[j].by);
            ng.addColorStop(0, K.mix(P.metal, '#ffffff', 0.5));
            ng.addColorStop(0.5, K.mix(P.metal, '#06070c', 0.2));
            ng.addColorStop(1, K.mix(P.metal, '#ffffff', 0.4));
            x.strokeStyle = ng; x.lineWidth = Math.min(pts[i].R, pts[j].R) * 0.9; x.lineCap = 'round';
            x.beginPath(); x.moveTo(pts[i].bx, pts[i].by); x.lineTo(pts[j].bx, pts[j].by); x.stroke();
          }
        }
      }
      x.restore();
      // blobs, big behind
      const ordered = pts.slice().sort((a, b) => b.R - a.R);
      for (const p of ordered) chromeBlob(x, P, p.bx, p.by, p.R, light, P.iridStrength, P.finish, r, seedPhase);
    } else if (P.mode === 'Rivulet') {
      // flowing chrome rivulets following the curl field, with beads pooling
      const lanes = K.rint(r, 5, 8);
      for (let l = 0; l < lanes; l++) {
        let px = r() * W, py = -20;
        const segs = [];
        const steps = 120;
        for (let s = 0; s < steps; s++) {
          segs.push([px, py]);
          const c = K.curl(noise, px, py, 1.2);
          px += c[0] * 22 + 1.5; py += c[1] * 22 + (H / steps) * 1.1;
          if (py > H + 20 || px < -20 || px > W + 20) break;
        }
        if (segs.length < 4) continue;
        const wdt = minD * (0.012 + r() * 0.03);
        // shadow
        x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = 'rgba(0,0,0,0.28)';
        x.lineWidth = wdt * 1.6; x.lineCap = 'round'; x.lineJoin = 'round';
        x.beginPath(); x.moveTo(segs[0][0] + 4, segs[0][1] + 6);
        for (const s of segs) x.lineTo(s[0] + 4, s[1] + 6); x.stroke(); x.restore();
        // chrome core
        const cg = x.createLinearGradient(segs[0][0], 0, segs[0][0], H);
        cg.addColorStop(0, K.mix(P.metal, '#05060a', 0.4));
        cg.addColorStop(0.4, K.mix(P.metal, '#ffffff', 0.85));
        cg.addColorStop(0.7, K.mix(P.metal, '#06070c', 0.3));
        cg.addColorStop(1, K.mix(P.metal, '#ffffff', 0.4));
        x.save(); x.strokeStyle = cg; x.lineWidth = wdt; x.lineCap = 'round'; x.lineJoin = 'round';
        x.beginPath(); x.moveTo(segs[0][0], segs[0][1]);
        for (const s of segs) x.lineTo(s[0], s[1]); x.stroke();
        // iridescent highlight thread offset
        x.globalCompositeOperation = 'lighter';
        x.strokeStyle = K.rgba(K.iridescent(seedPhase + l * 0.13 + P.irid, 0.95, 0.65), 0.5 * P.iridStrength);
        x.lineWidth = wdt * 0.35;
        x.beginPath(); x.moveTo(segs[0][0] - wdt * 0.2, segs[0][1]);
        for (const s of segs) x.lineTo(s[0] - wdt * 0.2, s[1]); x.stroke();
        x.restore();
        // bead pooling at the end
        const end = segs[segs.length - 1];
        chromeBlob(x, P, end[0], Math.min(end[1], H - wdt * 2), wdt * (1.4 + r() * 1.6), light, P.iridStrength, P.finish, r, seedPhase);
      }
    } else { // Bead Field
      const n = K.rint(r, 28, 46);
      const beads = [];
      for (let i = 0; i < n; i++) {
        // bias clustering along a curl-flow chain
        const bx = r() * W, by = r() * H;
        const rad = minD * (0.02 + Math.pow(r(), 2.2) * 0.13);
        beads.push({ bx, by, rad });
      }
      beads.sort((a, b) => a.rad - b.rad); // small (far) first
      for (const b of beads) chromeBlob(x, P, b.bx, b.by, b.rad, light, P.iridStrength, P.finish, r, seedPhase + b.rad * 0.01);
    }

    // ── ATMOSPHERE / TEXTURE FINISH ──
    // foreground haze veil for depth & cool air
    K.hazeSheet(x, W, H, noise, K.mix(P.g0, '#ffffff', 0.4), P.dark ? 0.06 : 0.10, minD * 0.4, 'screen');
    // overall sheen lift on the light source
    K.bloom(x, lcx, lcy, minD * 0.6, P.spec, 0.12);
    K.mottle(x, 0, 0, W, H, P.metal, 2600, r, 'overlay');
    // very subtle chroma split for futuristic edge
    K.chromaSplit(x, W, H, 1);
    K.grain(x, W, H, 26, r);
    K.vignette(x, W, H, P.dark ? 0.42 : 0.26);

    return { aspect: W / H };
  }

  return { name: 'aurum', draw, traits };
})();
