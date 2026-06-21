/* QUICKSILVER3 — LIQUID CHROME / FERROFLUID (spiky + dense)
 * CEO direction, this round: PLAIN SMOOTH BLOBS LOOK CHEAP. Every large metal
 * mass now carries surface interest — a full ferrofluid SPIKE-CROWN skirt, plus
 * ridged/beaded skin and crawling micro-spikes — so nothing reads as a clean
 * ball. And it is DENSER: each mode is a packed field/colony of spiked forms
 * overlapping at varied scales, filling the frame with metal incident, minimal
 * empty ground. Sheen, iridescence, jewel grounds, deterministic params(r),
 * FORCE_PAL, traits() and the 3 formats are all preserved from quicksilver2. */
window.ENGINE = (function () {
  const K = window.KIT;

  const PALS = [
    { name: 'Aurum',     g0: '#f6d479', g1: '#b8731a', metal: '#caa23a', irid: 0.10, spec: '#fff4cf', dark: false },
    { name: 'Mercury',   g0: '#eef2f8', g1: '#5b6884', metal: '#aeb8c8', irid: 0.55, spec: '#ffffff', dark: false },
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

  // Every mode is now a dense, spiky field. Crown is still the signature, but all
  // modes are colonies of spiked forms — there is no longer any "smooth disc" mode.
  const MODE_BAG = [
    'Crown', 'Crown', 'Crown',          // single dominant spike-crown + spiked colony
    'Colony', 'Colony', 'Colony',       // dense field of spiked ferro-clusters
    'Reef',  'Reef',                    // encrusted ridged reef wall, frame-filling
    'Flow',  'Flow',                    // diagonal spiked chrome river + spiked pools
    'Macro', 'Macro',                   // tight crop of two spike-encrusted merging masses
  ];
  const FINISH = ['High Polish', 'Brushed', 'Wet'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const mode = K.pick(MODE_BAG, r);
    const finish = K.pick(FINISH, r);
    const iridStrength = 0.55 + r() * 0.45;
    const lightAng = -Math.PI / 2 + (r() - 0.5) * 1.1;
    return { pal, fmt, mode, finish, iridStrength, lightAng,
      g0: pal.g0, g1: pal.g1, metal: pal.metal, irid: pal.irid, spec: pal.spec, dark: pal.dark };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Mode: p.mode, Finish: p.finish };
  }

  // ── organic blob outline (used for the body under the spikes) ──
  function blobPath(x, cx, cy, rad, wob, noise, ph) {
    const steps = 56;
    x.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const nr = rad * (1 + wob * 0.5 * noise.noise2(Math.cos(a) * 1.5 + ph, Math.sin(a) * 1.5 + ph * 0.7));
      const px = cx + Math.cos(a) * nr, py = cy + Math.sin(a) * nr;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath();
  }

  /* ── chrome body: organic metal mass with mirror-ramp banding, reflected
     horizon, thin-film iridescence, ridged/beaded skin and a specular hotspot.
     This is the CORE under the spike crown — it is NEVER drawn plain at large
     scale; ferroBody always adds the spike skirt + ridges over it. ── */
  function chromeBlob(x, P, cx, cy, rad, light, iridStr, finish, r, seedPhase, noise, wob, ridge) {
    wob = wob == null ? 0.20 : wob;
    const ph = (cx * 0.013 + cy * 0.017) % 6.28;
    K.softShadow(x, cx, cy + rad * 0.42, rad * 1.6, 0.45);

    x.save();
    blobPath(x, cx, cy, rad, wob, noise, ph); x.clip();

    // per-body tilt so the bright reflected horizon isn't a flat horizontal
    // stripe on every form (kills the "stamped button" repetition at small scale)
    const tilt = Math.sin(ph * 1.7) * 0.5;
    const gdx = Math.sin(tilt) * rad, gdy = Math.cos(tilt) * rad;
    const g = x.createLinearGradient(cx - gdx, cy - gdy, cx + gdx, cy + gdy);
    g.addColorStop(0.00, K.mix(P.metal, '#05060a', 0.70));
    g.addColorStop(0.16, K.mix(P.metal, '#ffffff', 0.32));
    g.addColorStop(0.38, K.mix(P.metal, '#04050a', 0.42));
    g.addColorStop(0.50, K.mix(P.metal, '#ffffff', 0.96));
    g.addColorStop(0.56, K.mix(P.metal, '#ffffff', 0.55));
    g.addColorStop(0.74, K.mix(P.metal, '#05060c', 0.55));
    g.addColorStop(1.00, K.mix(P.metal, '#ffffff', 0.30));
    x.fillStyle = g; x.fillRect(cx - rad * 1.6, cy - rad * 1.6, rad * 3.2, rad * 3.2);

    x.globalCompositeOperation = 'overlay';
    const eg = x.createLinearGradient(cx, cy - rad, cx, cy + rad);
    eg.addColorStop(0, K.rgba(P.g0, 0.0));
    eg.addColorStop(0.55, K.rgba(P.g0, 0.45));
    eg.addColorStop(1, K.rgba(P.g1, 0.55));
    x.fillStyle = eg; x.fillRect(cx - rad * 1.6, cy - rad * 1.6, rad * 3.2, rad * 3.2);

    const bands = 9;
    for (let i = 0; i < bands; i++) {
      const t = i / bands;
      const phase = seedPhase + t * 1.5 + P.irid + ph * 0.05;
      const col = K.iridescent(phase, 0.92, 0.58);
      const yy = cy - rad + t * rad * 2;
      x.fillStyle = K.rgba(col, 0.06 + iridStr * 0.12);
      x.fillRect(cx - rad * 1.6, yy, rad * 3.2, rad * 2 / bands + 1);
    }

    // ── ENCRUSTED SKIN: deep beveled grooves + raised 3D beads so the body
    //    surface is visibly textured metal, never a clean polished ball. ──
    if (ridge !== false && rad > 16) {
      // crinkled skin folds — broken, noise-warped arc grooves (NOT full
      // concentric rings, which read as a bullseye). Each is a dark groove with a
      // bright lip, scattered at random radii/spans across the body.
      const folds = K.rint(r, 7, 12);
      for (let i = 0; i < folds; i++) {
        const rr = rad * (0.18 + r() * 0.74);
        const a0 = r() * Math.PI * 2;
        const span = (0.5 + r() * 1.4); // partial arc
        const drawFold = (off, col, alpha, lw) => {
          x.globalCompositeOperation = 'soft-light';
          x.strokeStyle = K.rgba(col, alpha); x.lineWidth = Math.max(1, rad * lw); x.lineCap = 'round';
          x.beginPath();
          const steps = 18;
          for (let s = 0; s <= steps; s++) {
            const a = a0 + (s / steps) * span;
            const wr = rr * (1 + 0.16 * noise.noise2(Math.cos(a) * 2.6 + ph + i, Math.sin(a) * 2.6 + i)) + off;
            const px = cx + Math.cos(a) * wr, py = cy + Math.sin(a) * wr;
            if (s === 0) x.moveTo(px, py); else x.lineTo(px, py);
          }
          x.stroke();
        };
        drawFold(rad * 0.022, '#ffffff', 0.28, 0.04); // bright lip
        drawFold(0, '#000000', 0.32, 0.045);          // dark groove
      }
      // sparse raised beads near the rim only (kept subtle so they don't read as
      // water droplets); the spike carpet does the heavy texturing.
      const lx = Math.cos(light), ly = Math.sin(light);
      const beads = Math.floor(rad * 0.3);
      for (let i = 0; i < beads; i++) {
        const a = r() * Math.PI * 2, dd = (0.55 + r() * 0.35) * rad;
        const bx = cx + Math.cos(a) * dd, by = cy + Math.sin(a) * dd;
        const br = rad * (0.02 + r() * 0.03);
        x.globalCompositeOperation = 'multiply';
        x.fillStyle = K.rgba('#000', 0.20);
        x.beginPath(); x.arc(bx - lx * br * 0.4, by - ly * br * 0.4, br, 0, 6.283); x.fill();
        x.globalCompositeOperation = 'lighter';
        x.fillStyle = K.rgba(P.spec, 0.32 + r() * 0.2);
        x.beginPath(); x.arc(bx + lx * br * 0.4, by + ly * br * 0.4, br * 0.5, 0, 6.283); x.fill();
      }
    }

    if (finish === 'Brushed') {
      x.globalCompositeOperation = 'soft-light';
      for (let i = -rad; i < rad; i += 2) {
        x.fillStyle = K.rgba(i % 4 < 2 ? '#ffffff' : '#000000', 0.05);
        x.fillRect(cx + i, cy - rad * 1.6, 1, rad * 3.2);
      }
    }
    x.restore();

    x.save();
    blobPath(x, cx, cy, rad, wob, noise, ph);
    x.lineWidth = Math.max(1.5, rad * 0.05);
    x.strokeStyle = K.rgba(K.mix(P.metal, '#000', 0.72), 0.55);
    x.stroke();
    x.globalCompositeOperation = 'lighter';
    blobPath(x, cx, cy, rad * 0.965, wob, noise, ph);
    x.lineWidth = Math.max(1.4, rad * 0.045);
    x.strokeStyle = K.rgba(K.iridescent(seedPhase + 0.3 + P.irid, 0.96, 0.66), 0.55 + iridStr * 0.3);
    x.stroke();
    x.restore();

    const hx = cx + Math.cos(light) * rad * 0.46;
    const hy = cy + Math.sin(light) * rad * 0.46;
    K.sheen(x, hx, hy, rad * 0.5, P.spec, 0.6);
    K.sheen(x, hx, hy, rad * 0.14, '#ffffff', 0.95);
  }

  /* ── ferrofluid spike (Rosensweig cone): bulged base → sharp tip ── */
  function spike(x, P, bx, by, len, baseW, ang, light, iridStr, r, seedPhase, noise, shadow) {
    const bend = (r() - 0.5) * len * 0.35;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
    const tx = bx + ux * len + px * bend, ty = by + uy * len + py * bend;
    const mx = bx + ux * len * 0.5 + px * bend * 0.5, my = by + uy * len * 0.5 + py * bend * 0.5;
    if (shadow !== false) K.softShadow(x, bx, by + baseW * 0.4, baseW * 2.2, 0.32);
    x.save();
    x.beginPath();
    x.moveTo(bx + px * baseW, by + py * baseW);
    x.bezierCurveTo(
      bx + ux * len * 0.18 + px * baseW * 0.9, by + uy * len * 0.18 + py * baseW * 0.9,
      mx + px * baseW * 0.22, my + py * baseW * 0.22,
      tx, ty);
    x.bezierCurveTo(
      mx - px * baseW * 0.22, my - py * baseW * 0.22,
      bx + ux * len * 0.18 - px * baseW * 0.9, by + uy * len * 0.18 - py * baseW * 0.9,
      bx - px * baseW, by - py * baseW);
    x.closePath();
    x.clip();
    const g = x.createLinearGradient(bx + px * baseW, by + py * baseW, bx - px * baseW, by - py * baseW);
    g.addColorStop(0.0, K.mix(P.metal, '#05060a', 0.6));
    g.addColorStop(0.4, K.mix(P.metal, '#ffffff', 0.95));
    g.addColorStop(0.6, K.mix(P.metal, '#06070c', 0.42));
    g.addColorStop(1.0, K.mix(P.metal, '#ffffff', 0.35));
    const bb = baseW * 2 + len;
    x.fillStyle = g;
    x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
    x.globalCompositeOperation = 'overlay';
    const ag = x.createLinearGradient(bx, by, tx, ty);
    ag.addColorStop(0, K.rgba(P.g1, 0.4));
    ag.addColorStop(0.7, K.rgba('#000000', 0.0));
    ag.addColorStop(1, K.rgba(P.spec, 0.35));
    x.fillStyle = ag;
    x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
    x.fillStyle = K.rgba(K.iridescent(seedPhase + P.irid + 0.2, 0.92, 0.6), 0.13 * iridStr);
    x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
    x.restore();
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.spec, 0.4); x.lineWidth = Math.max(1, baseW * 0.14); x.lineCap = 'round';
    x.beginPath();
    x.moveTo(bx + px * baseW * 0.45, by + py * baseW * 0.45);
    x.quadraticCurveTo(mx + px * baseW * 0.12, my + py * baseW * 0.12,
      bx + ux * len * 0.82 + px * bend * 0.82, by + uy * len * 0.82 + py * bend * 0.82);
    x.stroke();
    x.restore();
  }

  /* ── FERRO BODY: the workhorse. A chrome mass that ALWAYS wears a spike crown
     plus ridged skin — never a clean ball. `spikeAmt` 0..1 scales how dense the
     crown is. Spikes radiate outward all around (biased upward so the form reads
     as ferrofluid pulled by a field above), shorter on the underside. Used for
     every large/medium mass in every mode. ── */
  function ferroBody(x, P, cx, cy, rad, light, iridStr, finish, r, seedPhase, noise, opts) {
    opts = opts || {};
    const spikeAmt = opts.spikeAmt == null ? 1 : opts.spikeAmt;
    const wob = opts.wob == null ? 0.24 : opts.wob;
    const upBias = opts.upBias == null ? 1 : opts.upBias; // how much spikes favour "up"
    // FULL 360° crown: spikes radiate all the way around so the body never shows a
    // smooth bare dome. Each spike points OUTWARD along its own radial; up-facing
    // ones are longest (field pull) but the underside still bristles.
    const nBack = Math.round(K.rint(r, 16, 22) * spikeAmt);
    const backSpikes = [];
    for (let i = 0; i < nBack; i++) {
      const a = (i / nBack) * Math.PI * 2 + (r() - 0.5) * (Math.PI / nBack) * 1.4;
      const up = (-Math.sin(a) + 1) / 2; // 1 at top, 0 at bottom
      // chunky Rosensweig cones, length swelling upward, never zero on the underside
      const len = rad * (0.75 + up * upBias * 1.15 + Math.abs(K.randn(r)) * 0.45);
      const bw = rad * (0.13 + r() * 0.08) * (0.75 + up * 0.4);
      const bx = cx + Math.cos(a) * rad * 0.82, by = cy + Math.sin(a) * rad * 0.78;
      backSpikes.push({ a, len, bw, bx, by, up });
    }
    // draw bottom/back spikes (sin a > ~0, i.e. lower half) BEHIND the body first
    for (const s of backSpikes) if (Math.sin(s.a) > 0.15) spike(x, P, s.bx, s.by, s.len, s.bw, s.a, light, iridStr, r, seedPhase, noise, true);

    // the core body (ridged + beaded)
    chromeBlob(x, P, cx, cy, rad, light, iridStr, finish, r, seedPhase, noise, wob, true);

    // remaining spikes (sides + top) OVER the body, painter-sorted by base-y
    const front = backSpikes.filter((s) => Math.sin(s.a) <= 0.15).sort((s1, s2) => s1.by - s2.by);
    for (const s of front) {
      spike(x, P, s.bx, s.by, s.len, s.bw, s.a, light, iridStr, r, seedPhase, noise, false);
      // ferrofluid clumping: a shorter sibling cone leaning off the main one
      if (r() < 0.4) {
        const da = (r() - 0.5) * 0.6;
        spike(x, P, s.bx + Math.cos(s.a) * s.len * 0.18, s.by + Math.sin(s.a) * s.len * 0.18,
          s.len * (0.4 + r() * 0.35), s.bw * 0.7, s.a + da, light, iridStr, r, seedPhase, noise, false);
      }
    }

    // dense micro-spike fringe all the way around — crawling spiky skin, varied
    const nFr = Math.round((26 + rad * 0.22) * spikeAmt);
    for (let i = 0; i < nFr; i++) {
      const a = (i / nFr) * Math.PI * 2 + (r() - 0.5) * 0.22;
      const up = (-Math.sin(a) + 1) / 2;
      const len = rad * (0.16 + up * 0.26 + Math.abs(K.randn(r)) * 0.18);
      const bw = rad * (0.04 + r() * 0.035);
      const bx = cx + Math.cos(a) * rad * 0.95, by = cy + Math.sin(a) * rad * 0.92;
      spike(x, P, bx, by, len, bw, a, light, iridStr, r, seedPhase, noise, false);
    }
    // STUBBLE CARPET: short stubby cones planted ACROSS the whole body surface so
    // the skin itself reads spiky/encrusted, not a smooth dome. Density scales with
    // surface area so even big lobes are fully carpeted; points follow the body
    // normal (radial), denser on the lit front.
    const nStub = Math.round(rad * rad * 0.012 * spikeAmt);
    for (let i = 0; i < nStub; i++) {
      const a = r() * Math.PI * 2;
      const up = (-Math.sin(a) + 1) / 2;
      // bias coverage toward the front/upper hemisphere but never leave it bare
      if (r() > 0.35 + up * 0.6) continue;
      const dd = (0.25 + Math.sqrt(r()) * 0.65) * rad;
      const bx = cx + Math.cos(a) * dd, by = cy + Math.sin(a) * dd;
      const len = rad * (0.08 + r() * 0.16);
      const bw = rad * (0.025 + r() * 0.03);
      spike(x, P, bx, by, len, bw, a + (r() - 0.5) * 0.45, light, iridStr, r, seedPhase, noise, false);
    }
    // gentle central specular so the crown still reads metal (kept small so the
    // body never flattens into a bright flat disc/button)
    const hx = cx + Math.cos(light) * rad * 0.4, hy = cy + Math.sin(light) * rad * 0.4;
    K.sheen(x, hx, hy, rad * 0.24, P.spec, 0.28);
  }

  // ground reflection smear
  function groundReflection(x, gx, gy, gw) {
    x.save();
    x.globalCompositeOperation = 'multiply';
    const sg = x.createRadialGradient(gx, gy, 0, gx, gy, gw);
    sg.addColorStop(0, 'rgba(0,0,0,0.30)');
    sg.addColorStop(0.6, 'rgba(0,0,0,0.12)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sg;
    x.save(); x.translate(gx, gy); x.scale(1, 0.32); x.translate(-gx, -gy);
    x.fillRect(gx - gw, gy - gw, gw * 2, gw * 2); x.restore();
    x.restore();
  }

  function draw(canvas, seed) {
    const r = K.rng(seed);
    const P = params(r);
    const W = P.fmt.W, H = P.fmt.H;
    canvas.width = W; canvas.height = H;
    const x = canvas.getContext('2d');
    const noise = K.makeNoise(seed ^ 0x9e37);
    const seedPhase = r();
    const minD = Math.min(W, H);
    const IS = P.iridStrength;

    // ── GROUND ──
    const gg = x.createLinearGradient(0, 0, W * 0.2, H);
    gg.addColorStop(0, K.mix(P.g0, '#ffffff', P.dark ? 0.04 : 0.12));
    gg.addColorStop(0.55, P.g0);
    gg.addColorStop(1, P.g1);
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    const lcx = W * (0.35 + r() * 0.3), lcy = H * (0.3 + r() * 0.25);
    K.bloom(x, lcx, lcy, minD * 0.9, K.mix(P.g0, '#ffffff', 0.5), P.dark ? 0.18 : 0.32);
    K.hazeSheet(x, W, H, noise, K.mix(P.g1, '#ffffff', 0.3), P.dark ? 0.10 : 0.16, minD * 0.55, 'screen');

    const light = P.lightAng;
    const thirdsX = r() < 0.5 ? W * (1 - K.INVPHI) : W * K.INVPHI;
    const fx = thirdsX;
    const fy = H * (0.40 + r() * 0.12);

    // ── helper: scatter a dense colony of ferro bodies, big→small, packed ──
    function colony(centers) {
      centers.sort((a, b) => b.rad - a.rad);
      for (const c of centers) {
        if (c.rad < minD * 0.03) {
          // tiny: spiky bead, light crown only
          chromeBlob(x, P, c.bx, c.by, c.rad, light, IS, P.finish, r, seedPhase + c.bx * 0.001, noise, 0.3, c.rad > 18);
        } else {
          ferroBody(x, P, c.bx, c.by, c.rad, light, IS, P.finish, r, seedPhase + c.bx * 0.001, noise,
            { spikeAmt: 1.0 + r() * 0.3, wob: 0.28 + r() * 0.14, upBias: 0.9 + r() * 0.9 });
        }
      }
    }

    if (P.mode === 'Crown') {
      // Signature: one dominant spike crown off-centre, plus a packed colony of
      // smaller spiked bodies filling the rest of the frame.
      const R = minD * (0.20 + r() * 0.05);
      const ccx = fx, ccy = H * (0.50 + r() * 0.08);
      groundReflection(x, ccx, ccy + R * 0.95, R * 2.1);
      // supporting colony FIRST (behind hero), spread across whole frame
      const sup = [];
      const supN = K.rint(r, 10, 14);
      for (let i = 0; i < supN; i++) {
        const bx = W * (0.08 + r() * 0.84), by = H * (0.12 + r() * 0.80);
        if (Math.hypot(bx - ccx, by - ccy) < R * 1.3) continue;
        sup.push({ bx, by, rad: minD * (0.04 + Math.pow(r(), 1.5) * 0.10) });
      }
      colony(sup);
      // hero crown — big, dense spikes
      ferroBody(x, P, ccx, ccy, R, light, IS, P.finish, r, seedPhase, noise,
        { spikeAmt: 1.4, wob: 0.26, upBias: 1.5 });
      // flung micro-droplets up high
      for (let i = 0; i < K.rint(r, 5, 8); i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.0, dd = R * (1.6 + r() * 1.4);
        chromeBlob(x, P, ccx + Math.cos(a) * dd, ccy + Math.sin(a) * dd, R * (0.05 + r() * 0.08), light, IS, P.finish, r, seedPhase + 0.1, noise, 0.3, false);
      }
    } else if (P.mode === 'Colony') {
      // DENSE FIELD of spiked ferro-clusters at varied scale, all-over, packed.
      const centers = [];
      // a couple of dominant anchors off-centre
      centers.push({ bx: fx, by: fy, rad: minD * (0.15 + r() * 0.05) });
      centers.push({ bx: W - fx + (r() - 0.5) * W * 0.1, by: H * (0.62 + r() * 0.12), rad: minD * (0.12 + r() * 0.05) });
      // packed grid-jittered field so the whole frame is full
      const cols = 4, rows = 4;
      for (let gx = 0; gx < cols; gx++) {
        for (let gy = 0; gy < rows; gy++) {
          const bx = W * ((gx + 0.5) / cols) + (r() - 0.5) * W / cols * 0.9;
          const by = H * ((gy + 0.5) / rows) + (r() - 0.5) * H / rows * 0.9;
          centers.push({ bx, by, rad: minD * (0.04 + Math.pow(r(), 1.4) * 0.085) });
        }
      }
      colony(centers);
    } else if (P.mode === 'Reef') {
      // ENCRUSTED REEF WALL: a continuous spiked ridge sweeping across the frame,
      // built from overlapping spiked bodies along an undulating band, so it reads
      // as one frame-filling crust of metal spikes rather than separate balls.
      const baseY = H * (0.45 + (r() - 0.5) * 0.12);
      const amp = H * (0.14 + r() * 0.08);
      const n = K.rint(r, 11, 15);
      const reef = [];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const bx = W * (t * 1.06 - 0.03);
        const by = baseY + Math.sin(t * Math.PI * (1.5 + r() * 1.5) + seedPhase * 6) * amp + (r() - 0.5) * H * 0.06;
        reef.push({ bx, by, rad: minD * (0.085 + Math.pow(r(), 1.2) * 0.075) });
      }
      // fill below the band with smaller spiky bodies so the lower frame is dense
      for (let i = 0; i < K.rint(r, 8, 12); i++) {
        reef.push({ bx: W * (0.04 + r() * 0.92), by: H * (0.7 + r() * 0.26), rad: minD * (0.035 + Math.pow(r(), 1.5) * 0.06) });
      }
      // and a sparse upper scatter so the top isn't dead gradient
      for (let i = 0; i < K.rint(r, 4, 6); i++) {
        reef.push({ bx: W * (0.04 + r() * 0.92), by: H * (0.06 + r() * 0.22), rad: minD * (0.03 + Math.pow(r(), 1.6) * 0.05) });
      }
      colony(reef);
    } else if (P.mode === 'Flow') {
      // SWEEPING DIAGONAL spiked chrome river: a molten band corner-to-corner,
      // swelling into SPIKED pools, with spiked tributaries and a dense scatter.
      const dir = r() < 0.5 ? 1 : -1;
      function river(sx, sy, axisAng, baseW, span, steps, perturb, phaseOff, withPools) {
        const ux = Math.cos(axisAng), uy = Math.sin(axisAng);
        const pxp = -uy, pyp = ux;
        let px = sx, py = sy; const segs = [];
        const stepLen = span / steps;
        for (let s = 0; s < steps; s++) {
          segs.push([px, py]);
          const c = K.curl(noise, px * 1.1, py * 1.1, 1.6);
          const lateral = (c[0] + c[1]) * 0.5 * perturb;
          px += ux * stepLen + pxp * lateral;
          py += uy * stepLen + pyp * lateral;
          if (px < -W * 0.6 || px > W * 1.6 || py < -H * 0.6 || py > H * 1.6) break;
        }
        if (segs.length < 4) return;
        const mid = segs[Math.floor(segs.length / 2)];
        x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = 'rgba(0,0,0,0.32)';
        x.lineWidth = baseW * 1.4; x.lineCap = 'round'; x.lineJoin = 'round';
        x.beginPath(); x.moveTo(segs[0][0] + 8, segs[0][1] + 12);
        for (const s of segs) x.lineTo(s[0] + 8, s[1] + 12); x.stroke(); x.restore();
        const cg = x.createLinearGradient(mid[0] - pxp * baseW, mid[1] - pyp * baseW,
                                          mid[0] + pxp * baseW, mid[1] + pyp * baseW);
        cg.addColorStop(0, K.mix(P.metal, '#05060a', 0.5));
        cg.addColorStop(0.42, K.mix(P.metal, '#ffffff', 0.92));
        cg.addColorStop(0.62, K.mix(P.metal, '#06070c', 0.3));
        cg.addColorStop(1, K.mix(P.metal, '#ffffff', 0.45));
        x.save(); x.strokeStyle = cg; x.lineWidth = baseW; x.lineCap = 'round'; x.lineJoin = 'round';
        x.beginPath(); x.moveTo(segs[0][0], segs[0][1]);
        for (const s of segs) x.lineTo(s[0], s[1]); x.stroke();
        x.globalCompositeOperation = 'lighter';
        x.strokeStyle = K.rgba(P.spec, 0.5); x.lineWidth = baseW * 0.2;
        x.beginPath(); x.moveTo(segs[0][0] - pxp * baseW * 0.18, segs[0][1] - pyp * baseW * 0.18);
        for (const s of segs) x.lineTo(s[0] - pxp * baseW * 0.18, s[1] - pyp * baseW * 0.18); x.stroke();
        x.strokeStyle = K.rgba(K.iridescent(seedPhase + phaseOff + P.irid, 0.95, 0.65), 0.55 * IS);
        x.lineWidth = baseW * 0.28;
        x.beginPath(); x.moveTo(segs[0][0] + pxp * baseW * 0.2, segs[0][1] + pyp * baseW * 0.2);
        for (const s of segs) x.lineTo(s[0] + pxp * baseW * 0.2, s[1] + pyp * baseW * 0.2); x.stroke();
        x.restore();
        // spikes erupting along the river crest (perp to flow, upward)
        for (let i = 4; i < segs.length - 4; i += 3) {
          const s = segs[i];
          if (s[0] < -baseW || s[0] > W + baseW || s[1] < -baseW || s[1] > H + baseW) continue;
          if (r() < 0.45) continue;
          const sa = Math.atan2(-pyp, -pxp); // toward upper flank
          const len = baseW * (0.8 + r() * 1.6);
          spike(x, P, s[0] - pxp * baseW * 0.3, s[1] - pyp * baseW * 0.3, len, baseW * (0.2 + r() * 0.18), sa + (r() - 0.5) * 0.5, light, IS, r, seedPhase, noise, false);
        }
        if (withPools) {
          const inFrame = segs.filter((s) => s[0] > -baseW && s[0] < W + baseW && s[1] > -baseW && s[1] < H + baseW);
          const pool = inFrame.length ? inFrame : segs;
          for (let b = 0; b < K.rint(r, 3, 5); b++) {
            const sp = pool[Math.floor(r() * pool.length)];
            ferroBody(x, P, sp[0], sp[1], baseW * (1.0 + r() * 1.2), light, IS, P.finish, r, seedPhase, noise,
              { spikeAmt: 1.1, wob: 0.24, upBias: 1.2 });
          }
        }
      }
      const mainW = minD * (0.11 + r() * 0.05);
      const baseAng = (0.13 + r() * 0.12) * Math.PI;
      const axisAng = dir > 0 ? baseAng : Math.PI - baseAng;
      const ux = Math.cos(axisAng), uy = Math.sin(axisAng);
      const back = Math.hypot(W, H) * 0.62;
      const span = back * 2.2;
      const cxF = W * 0.5, cyF = H * 0.5;
      const sx = cxF - ux * back, sy = cyF - uy * back;
      river(sx, sy, axisAng, mainW, span, 260, mainW * 0.5, 0.0, true);
      for (let t = 0; t < K.rint(r, 2, 3); t++) {
        const ta = axisAng + (r() - 0.5) * 0.55;
        const offp = (r() - 0.5) * minD * 0.55;
        const uxt = Math.cos(ta), uyt = Math.sin(ta);
        const tsx = cxF - uxt * back - (-uyt) * offp;
        const tsy = cyF - uyt * back - (uxt) * offp;
        river(tsx, tsy, ta, mainW * (0.4 + r() * 0.3), span, 260, mainW * 0.5, 0.3 + t * 0.2, t === 0);
      }
      // dense spiky scatter to fill the off-river ground
      const scat = [];
      for (let i = 0; i < K.rint(r, 8, 12); i++) {
        scat.push({ bx: W * (0.05 + r() * 0.9), by: H * (0.05 + r() * 0.9), rad: minD * (0.035 + Math.pow(r(), 1.6) * 0.06) });
      }
      colony(scat);
    } else { // Macro — tight crop of two spike-encrusted merging masses + dense fringe
      const sep = minD * (0.26 + r() * 0.06);
      const mergeAng = r() * Math.PI;
      const mx = Math.cos(mergeAng), my = Math.sin(mergeAng);
      const cX = W * (0.5 + (r() - 0.5) * 0.12), cY = H * (0.5 + (r() - 0.5) * 0.12);
      const R1 = minD * (0.32 + r() * 0.07);
      const R2 = R1 * (0.78 + r() * 0.18);
      const a1x = cX - mx * sep, a1y = cY - my * sep;
      const a2x = cX + mx * sep, a2y = cY + my * sep;
      groundReflection(x, cX, cY + R1 * 0.7, R1 * 2.0);
      // merge waist
      x.save();
      const ng = x.createLinearGradient(a1x, a1y, a2x, a2y);
      ng.addColorStop(0, K.mix(P.metal, '#ffffff', 0.5));
      ng.addColorStop(0.5, K.mix(P.metal, '#06070c', 0.25));
      ng.addColorStop(1, K.mix(P.metal, '#ffffff', 0.5));
      x.strokeStyle = ng; x.lineWidth = Math.min(R1, R2) * 1.15; x.lineCap = 'round';
      x.beginPath(); x.moveTo(a1x, a1y); x.lineTo(a2x, a2y); x.stroke();
      x.restore();
      // surrounding spiky satellites filling the frame edges FIRST
      const sats = [];
      for (let i = 0; i < K.rint(r, 7, 10); i++) {
        const a = r() * Math.PI * 2, dd = (R1 + R2) * (0.9 + r() * 0.8);
        sats.push({ bx: cX + Math.cos(a) * dd, by: cY + Math.sin(a) * dd, rad: minD * (0.04 + Math.pow(r(), 1.5) * 0.08) });
      }
      colony(sats);
      // the two big encrusted lobes
      ferroBody(x, P, a2x, a2y, R2, light, IS, P.finish, r, seedPhase + 0.04, noise, { spikeAmt: 1.2, wob: 0.26, upBias: 1.1 });
      ferroBody(x, P, a1x, a1y, R1, light, IS, P.finish, r, seedPhase, noise, { spikeAmt: 1.3, wob: 0.26, upBias: 1.2 });
      // tension droplets along the waist
      for (let i = 0; i < K.rint(r, 4, 6); i++) {
        const t = 0.32 + r() * 0.36;
        const px = a1x + (a2x - a1x) * t + (r() - 0.5) * R1 * 0.4;
        const py = a1y + (a2y - a1y) * t + (r() - 0.5) * R1 * 0.4;
        chromeBlob(x, P, px, py, minD * (0.03 + r() * 0.05), light, IS, P.finish, r, seedPhase, noise, 0.28, true);
      }
    }

    // ── ATMOSPHERE / TEXTURE FINISH ──
    K.hazeSheet(x, W, H, noise, K.mix(P.g0, '#ffffff', 0.4), P.dark ? 0.06 : 0.10, minD * 0.4, 'screen');
    K.bloom(x, lcx, lcy, minD * 0.6, P.spec, 0.12);
    K.mottle(x, 0, 0, W, H, P.metal, 2600, r, 'overlay');
    K.chromaSplit(x, W, H, 1);
    K.grain(x, W, H, 26, r);
    K.vignette(x, W, H, P.dark ? 0.42 : 0.26);

    return { aspect: W / H };
  }

  return { name: 'quicksilver3', draw, traits };
})();
