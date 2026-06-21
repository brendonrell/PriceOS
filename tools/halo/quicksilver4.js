/* QUICKSILVER4 — LIQUID CHROME / FERROFLUID, FINE-DETAIL FIELDS
 * The CEO direction: NO big blobs/orbs/spheres/pools — none. The entire image is
 * built from DENSE, FINE, SMALL structure: thin ferrofluid quills, hair-like
 * filaments, ridged metallic threads, and tiny beads, packed densely so the
 * frame reads as an intricate gleaming field with minimal empty ground.
 * Sheen / iridescence / colourways / KIT usage are inherited in spirit from the
 * approved QUICKSILVER2 (chrome cross-section ramps, thin-film bands, specular
 * hotspots), but every primitive here is SMALL and the picture is made by
 * massing thousands of them — never by drawing one large rounded mass.
 *
 * MODES (all-over, off-centre, asymmetric — never one thing dead-centre):
 *   Storm    — a windswept storm of fine quills, density swelling off-centre.
 *   Curtain  — vertical curtains of ridged ferrofluid threads, side-anchored.
 *   Spray    — radial spray/burst of quills from an off-centre focus.
 *   Weave    — interwoven filament mesh + bead lattice, all-over.
 *   Reef     — a coral-like reef of clustered small spikes & beads, asymmetric. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Colourways — mostly bright/saturated jewel grounds + 2 darks for range.
  const PALS = [
    { name: 'Aurum',    g0: '#f6d479', g1: '#b8731a', metal: '#caa23a', irid: 0.10, spec: '#fff4cf', dark: false },
    { name: 'Mercury',  g0: '#eef2f8', g1: '#5b6884', metal: '#aeb8c8', irid: 0.55, spec: '#ffffff', dark: false },
    { name: 'Plasma',   g0: '#ff7ae0', g1: '#7d18b8', metal: '#d05ad6', irid: 0.78, spec: '#ffe1ff', dark: false },
    { name: 'Lagoon',   g0: '#5ff0d6', g1: '#0c6f8f', metal: '#36c4c0', irid: 0.42, spec: '#e6fffb', dark: false },
    { name: 'Coral',    g0: '#ff9a6b', g1: '#c01f55', metal: '#e8584f', irid: 0.04, spec: '#fff0e6', dark: false },
    { name: 'Acid',     g0: '#dfff4a', g1: '#3a8f1f', metal: '#a6d62a', irid: 0.30, spec: '#f5ffd6', dark: false },
    { name: 'Cobalt',   g0: '#7db8ff', g1: '#1830b8', metal: '#3f7be0', irid: 0.60, spec: '#e6f0ff', dark: false },
    { name: 'Obsidian', g0: '#2b3040', g1: '#070810', metal: '#5b6480', irid: 0.66, spec: '#dfe6ff', dark: true },
    { name: 'Oilslick', g0: '#241038', g1: '#06030c', metal: '#7a4bd0', irid: 0.85, spec: '#ffe6ff', dark: true },
  ];

  const FMTS = [
    { W: 1400, H: 1400, t: 'Square' },
    { W: 1500, H: 1120, t: 'Landscape' },
    { W: 1120, H: 1500, t: 'Portrait' },
  ];

  const MODE_BAG = [
    'Storm', 'Storm', 'Storm',
    'Curtain', 'Curtain',
    'Spray', 'Spray',
    'Weave', 'Weave',
    'Reef', 'Reef',
  ];
  const FINISH = ['High Polish', 'Brushed', 'Wet'];
  const DENS = ['Dense', 'Packed', 'Teeming'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const mode = K.pick(MODE_BAG, r);
    const finish = K.pick(FINISH, r);
    const density = K.pick(DENS, r);
    const iridStrength = 0.55 + r() * 0.45;
    const lightAng = -Math.PI / 2 + (r() - 0.5) * 1.1;
    return { pal, fmt, mode, finish, density, iridStrength, lightAng,
      g0: pal.g0, g1: pal.g1, metal: pal.metal, irid: pal.irid, spec: pal.spec, dark: pal.dark };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Mode: p.mode, Finish: p.finish, Density: p.density };
  }

  const densMul = (d) => (d === 'Teeming' ? 1.5 : d === 'Packed' ? 1.2 : 1.0);

  /* ── QUILL: a thin tapering ferrofluid spike. Bulged base, fine sharp tip,
     chrome cross-section ramp (dark/bright/dark) so it gleams as metal, a thin
     specular streak up one flank and a whisper of thin-film. Kept SMALL — these
     are massed by the hundreds, never drawn large. ── */
  function quill(x, P, bx, by, len, baseW, ang, iridStr, r, seedPhase, bend) {
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const px = -uy, py = ux;
    bend = bend == null ? (r() - 0.5) * len * 0.4 : bend;
    const tx = bx + ux * len + px * bend, ty = by + uy * len + py * bend;
    const mx = bx + ux * len * 0.5 + px * bend * 0.5, my = by + uy * len * 0.5 + py * bend * 0.5;
    x.save();
    // body: bulged base flanks → sharp tip
    x.beginPath();
    x.moveTo(bx + px * baseW, by + py * baseW);
    x.bezierCurveTo(
      bx + ux * len * 0.16 + px * baseW * 0.9, by + uy * len * 0.16 + py * baseW * 0.9,
      mx + px * baseW * 0.2, my + py * baseW * 0.2, tx, ty);
    x.bezierCurveTo(
      mx - px * baseW * 0.2, my - py * baseW * 0.2,
      bx + ux * len * 0.16 - px * baseW * 0.9, by + uy * len * 0.16 - py * baseW * 0.9,
      bx - px * baseW, by - py * baseW);
    x.closePath();
    x.clip();
    // cross-section chrome ramp perpendicular to the axis
    const g = x.createLinearGradient(bx + px * baseW, by + py * baseW, bx - px * baseW, by - py * baseW);
    g.addColorStop(0.0, K.mix(P.metal, '#05060a', 0.62));
    g.addColorStop(0.42, K.mix(P.metal, '#ffffff', 0.96));
    g.addColorStop(0.60, K.mix(P.metal, '#06070c', 0.40));
    g.addColorStop(1.0, K.mix(P.metal, '#ffffff', 0.38));
    const bb = baseW * 2 + len;
    x.fillStyle = g;
    x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
    // along-axis dark→light so tips catch light + ground reflected into base
    x.globalCompositeOperation = 'overlay';
    const ag = x.createLinearGradient(bx, by, tx, ty);
    ag.addColorStop(0, K.rgba(P.g1, 0.42));
    ag.addColorStop(0.7, K.rgba('#000000', 0.0));
    ag.addColorStop(1, K.rgba(P.spec, 0.34));
    x.fillStyle = ag;
    x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
    // thin-film whisper
    x.fillStyle = K.rgba(K.iridescent(seedPhase + P.irid + (bx + by) * 0.0008, 0.92, 0.6), 0.12 * iridStr);
    x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
    x.restore();
    // specular streak up one flank, stops short of the tip (sharp dark point)
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.spec, 0.42); x.lineWidth = Math.max(0.6, baseW * 0.18); x.lineCap = 'round';
    x.beginPath();
    x.moveTo(bx + px * baseW * 0.4, by + py * baseW * 0.4);
    x.quadraticCurveTo(mx + px * baseW * 0.1, my + py * baseW * 0.1,
      bx + ux * len * 0.8 + px * bend * 0.8, by + uy * len * 0.8 + py * bend * 0.8);
    x.stroke();
    x.restore();
  }

  /* ── FILAMENT: a fine hair-like chrome thread that follows the curl field.
     Drawn as a dark shadow stroke + bright chrome stroke + a thin-film hairline,
     so it reads as a gleaming metallic strand, not a pencil line. ── */
  function filament(x, P, sx, sy, noise, len, w, iridStr, r, seedPhase, drift) {
    const steps = 26;
    const pts = [];
    let cx = sx, cy = sy;
    const stepLen = len / steps;
    const baseAng = drift;
    for (let s = 0; s < steps; s++) {
      pts.push([cx, cy]);
      const c = K.curl(noise, cx * 1.3, cy * 1.3, 1.4);
      const ax = Math.cos(baseAng) + c[0] * 1.6;
      const ay = Math.sin(baseAng) + c[1] * 1.6;
      const m = Math.hypot(ax, ay) || 1;
      cx += (ax / m) * stepLen;
      cy += (ay / m) * stepLen;
    }
    if (pts.length < 3) return;
    const stroke = (off, ww, style, comp) => {
      x.save();
      if (comp) x.globalCompositeOperation = comp;
      x.strokeStyle = style; x.lineWidth = ww; x.lineCap = 'round'; x.lineJoin = 'round';
      x.beginPath(); x.moveTo(pts[0][0] + off, pts[0][1] + off);
      for (const p of pts) x.lineTo(p[0] + off, p[1] + off);
      x.stroke(); x.restore();
    };
    stroke(1.2, w * 1.5, 'rgba(0,0,0,0.28)', 'multiply');   // soft shadow
    stroke(0, w, K.mix(P.metal, '#06070c', 0.35), null);     // dark core base
    // bright chrome highlight slightly offset to one side
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.spec, 0.5); x.lineWidth = Math.max(0.5, w * 0.42); x.lineCap = 'round';
    x.beginPath(); x.moveTo(pts[0][0] - w * 0.22, pts[0][1] - w * 0.22);
    for (const p of pts) x.lineTo(p[0] - w * 0.22, p[1] - w * 0.22);
    x.stroke();
    // iridescent hairline on the other flank
    x.strokeStyle = K.rgba(K.iridescent(seedPhase + P.irid + sx * 0.001, 0.95, 0.64), 0.5 * iridStr);
    x.lineWidth = Math.max(0.5, w * 0.4);
    x.beginPath(); x.moveTo(pts[0][0] + w * 0.22, pts[0][1] + w * 0.22);
    for (const p of pts) x.lineTo(p[0] + w * 0.22, p[1] + w * 0.22);
    x.stroke();
    x.restore();
  }

  /* ── BEADLET: a tiny chrome bead. Small radial metal with a mirror band and a
     pin highlight. Used as fine incident texture in gaps — always SMALL. ── */
  function beadlet(x, P, cx, cy, rad, light, iridStr, seedPhase) {
    K.softShadow(x, cx, cy + rad * 0.5, rad * 1.7, 0.3);
    const g = x.createLinearGradient(cx, cy - rad, cx, cy + rad);
    g.addColorStop(0.0, K.mix(P.metal, '#05060a', 0.6));
    g.addColorStop(0.32, K.mix(P.metal, '#ffffff', 0.5));
    g.addColorStop(0.52, K.mix(P.metal, '#ffffff', 0.95));
    g.addColorStop(0.7, K.mix(P.metal, '#06070c', 0.45));
    g.addColorStop(1.0, K.mix(P.metal, '#ffffff', 0.3));
    x.save();
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.clip();
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    x.globalCompositeOperation = 'overlay';
    x.fillStyle = K.rgba(K.iridescent(seedPhase + P.irid + cx * 0.001, 0.9, 0.6), 0.16 * iridStr);
    x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    x.restore();
    const hx = cx + Math.cos(light) * rad * 0.4, hy = cy + Math.sin(light) * rad * 0.4;
    K.sheen(x, hx, hy, rad * 0.55, P.spec, 0.7);
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
    const light = P.lightAng;
    const dm = densMul(P.density);

    // ── GROUND: rich jewel wash + off-centre radial lift + light haze ──
    const gg = x.createLinearGradient(0, 0, W * 0.2, H);
    gg.addColorStop(0, K.mix(P.g0, '#ffffff', P.dark ? 0.04 : 0.12));
    gg.addColorStop(0.55, P.g0);
    gg.addColorStop(1, P.g1);
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    const lcx = W * (0.32 + r() * 0.34), lcy = H * (0.26 + r() * 0.3);
    K.bloom(x, lcx, lcy, minD * 0.9, K.mix(P.g0, '#ffffff', 0.5), P.dark ? 0.18 : 0.30);
    K.hazeSheet(x, W, H, noise, K.mix(P.g1, '#ffffff', 0.3), P.dark ? 0.10 : 0.15, minD * 0.5, 'screen');

    // Off-centre density focus (golden-ratio anchor) — the field thickens here
    // and thins toward an opposite margin, keeping composition asymmetric.
    const ax = r() < 0.5 ? W * K.INVPHI : W * (1 - K.INVPHI);
    const ay = H * (0.34 + r() * 0.34);

    // small helper: clamp inside frame with a little bleed
    const inB = (px, py, m) => px > -m && px < W + m && py > -m && py < H + m;

    // ── MODE FIELDS ─────────────────────────────────────────────────────────
    if (P.mode === 'Storm') {
      // A windswept storm of fine quills. Density swells around the off-centre
      // focus and the whole field leans on a prevailing wind angle; curl adds
      // turbulence so it reads as a metallic squall, all small structure.
      const wind = -Math.PI / 2 + (r() - 0.5) * 1.3;
      const N = Math.floor((900 + r() * 500) * dm);
      const quills = [];
      for (let i = 0; i < N; i++) {
        // sample biased toward the focus (rejection-ish via pow)
        let px, py;
        if (r() < 0.72) {
          const a = r() * Math.PI * 2;
          const rad = Math.pow(r(), 0.55) * minD * 0.78;
          px = ax + Math.cos(a) * rad; py = ay + Math.sin(a) * rad * 0.92;
        } else { px = r() * W; py = r() * H; }
        if (!inB(px, py, 30)) continue;
        const c = K.curl(noise, px, py, 1.5);
        const ang = wind + (c[0] - c[1]) * 0.9 + (r() - 0.5) * 0.4;
        const d2 = Math.hypot(px - ax, py - ay) / minD;
        const sizeF = K.clamp(1.15 - d2 * 0.7, 0.45, 1.15);
        const len = minD * (0.018 + Math.pow(r(), 1.6) * 0.06) * sizeF;
        const bw = len * (0.14 + r() * 0.1);
        quills.push({ px, py, ang, len, bw, depth: py });
      }
      quills.sort((a, b) => a.depth - b.depth);
      for (const q of quills) quill(x, P, q.px, q.py, q.len, q.bw, q.ang, P.iridStrength, r, seedPhase);
      // fine bead drift between quills
      const B = Math.floor((260 + r() * 200) * dm);
      for (let i = 0; i < B; i++) {
        const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.6) * minD * 0.8;
        const px = ax + Math.cos(a) * rad, py = ay + Math.sin(a) * rad;
        if (!inB(px, py, 10)) continue;
        beadlet(x, P, px, py, minD * (0.004 + r() * 0.009), light, P.iridStrength, seedPhase);
      }
    } else if (P.mode === 'Curtain') {
      // Vertical curtains of ridged ferrofluid threads, anchored to one side and
      // raining the full height. Each column is a cluster of fine filaments +
      // short quills so it reads as a dense hanging chrome veil.
      const cols = Math.floor((46 + r() * 26) * dm);
      const side = r() < 0.5 ? 0 : 1;            // anchor side for density bias
      for (let cI = 0; cI < cols; cI++) {
        const t = cI / cols;
        // density biased to the anchor side
        const bias = side ? Math.pow(t, 0.7) : Math.pow(1 - t, 0.7);
        const colX = t * W + (r() - 0.5) * (W / cols) * 1.2;
        const drift = Math.PI / 2 + (r() - 0.5) * 0.5;        // mostly downward
        const startY = -H * 0.05 + r() * H * 0.1;
        const perCol = 2 + Math.floor(bias * 4 * dm + r() * 2);
        for (let k = 0; k < perCol; k++) {
          const sx = colX + (r() - 0.5) * (W / cols) * 0.9;
          const len = H * (0.5 + r() * 0.55);
          const w = minD * (0.0026 + r() * 0.004);
          filament(x, P, sx, startY + r() * H * 0.12, noise, len, w, P.iridStrength, r, seedPhase, drift);
        }
        // short ridged quills budding off the curtain for texture
        const buds = Math.floor(bias * 8 * dm);
        for (let k = 0; k < buds; k++) {
          const sx = colX + (r() - 0.5) * (W / cols) * 1.4;
          const sy = r() * H;
          const ang = (r() < 0.5 ? 1 : -1) * (Math.PI / 2) * (0.2 + r() * 0.5) + Math.PI / 2;
          const len = minD * (0.02 + r() * 0.04);
          quill(x, P, sx, sy, len, len * (0.16 + r() * 0.1), ang, P.iridStrength, r, seedPhase);
        }
      }
      // bead sparkle scattered through the veil
      const B = Math.floor((420 + r() * 240) * dm);
      for (let i = 0; i < B; i++) {
        const px = r() * W, py = r() * H;
        beadlet(x, P, px, py, minD * (0.0035 + r() * 0.008), light, P.iridStrength, seedPhase);
      }
    } else if (P.mode === 'Spray') {
      // Radial spray/burst of fine quills from an off-centre focus, flung outward
      // with curl turbulence — a metallic dandelion storm. Long thin quills, all
      // pointing away from focus, denser near the core, thinning at the rim.
      const fx = ax, fy = ay;
      const N = Math.floor((1000 + r() * 600) * dm);
      const quills = [];
      for (let i = 0; i < N; i++) {
        const a = r() * Math.PI * 2;
        const rad = Math.pow(r(), 0.5) * minD * 0.85;
        const px = fx + Math.cos(a) * rad, py = fy + Math.sin(a) * rad * 0.94;
        if (!inB(px, py, 30)) continue;
        const c = K.curl(noise, px, py, 1.4);
        const outAng = Math.atan2(py - fy, px - fx) + (c[0] + c[1]) * 0.5 + (r() - 0.5) * 0.35;
        const sizeF = K.clamp(1.2 - rad / minD, 0.4, 1.2);
        const len = minD * (0.02 + Math.pow(r(), 1.5) * 0.07) * sizeF;
        const bw = len * (0.12 + r() * 0.1);
        quills.push({ px, py, ang: outAng, len, bw, depth: py });
      }
      quills.sort((a, b) => a.depth - b.depth);
      for (const q of quills) quill(x, P, q.px, q.py, q.len, q.bw, q.ang, P.iridStrength, r, seedPhase);
      // tiny flung beads further out
      const B = Math.floor((300 + r() * 220) * dm);
      for (let i = 0; i < B; i++) {
        const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.4) * minD * 0.95;
        const px = fx + Math.cos(a) * rad, py = fy + Math.sin(a) * rad;
        if (!inB(px, py, 8)) continue;
        beadlet(x, P, px, py, minD * (0.003 + r() * 0.007), light, P.iridStrength, seedPhase);
      }
    } else if (P.mode === 'Weave') {
      // An all-over interwoven mesh: two crossing families of fine chrome
      // filaments following the curl field, plus a bead lattice at intersections.
      // Dense, intricate, edge-to-edge — no focal mass, pure fine texture.
      const fam = (driftBase, count, ww) => {
        for (let i = 0; i < count; i++) {
          const sx = r() * W * 1.1 - W * 0.05;
          const sy = r() * H * 1.1 - H * 0.05;
          const drift = driftBase + (r() - 0.5) * 0.5;
          const len = minD * (0.35 + r() * 0.45);
          filament(x, P, sx, sy, noise, len, ww, P.iridStrength, r, seedPhase, drift);
        }
      };
      const baseA = r() * Math.PI;
      fam(baseA, Math.floor((140 + r() * 80) * dm), minD * (0.0028 + r() * 0.003));
      fam(baseA + Math.PI * 0.5 + (r() - 0.5) * 0.4, Math.floor((130 + r() * 80) * dm), minD * (0.0026 + r() * 0.003));
      // short quill barbs scattered along the weave for relief
      const Q = Math.floor((420 + r() * 280) * dm);
      for (let i = 0; i < Q; i++) {
        const px = r() * W, py = r() * H;
        const c = K.curl(noise, px, py, 1.4);
        const ang = Math.atan2(c[1], c[0]) + (r() - 0.5) * 0.6;
        const len = minD * (0.015 + r() * 0.03);
        quill(x, P, px, py, len, len * (0.16 + r() * 0.1), ang, P.iridStrength, r, seedPhase);
      }
      // bead lattice — denser toward the off-centre anchor
      const B = Math.floor((700 + r() * 400) * dm);
      for (let i = 0; i < B; i++) {
        let px, py;
        if (r() < 0.5) { const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.7) * minD * 0.7; px = ax + Math.cos(a) * rad; py = ay + Math.sin(a) * rad; }
        else { px = r() * W; py = r() * H; }
        if (!inB(px, py, 6)) continue;
        beadlet(x, P, px, py, minD * (0.0028 + r() * 0.006), light, P.iridStrength, seedPhase);
      }
    } else { // Reef
      // A coral-like reef: many small clusters ("polyps") of short spikes + beads
      // growing across the lower/anchor region and thinning upward, like a dense
      // ferrofluid colony. Each polyp is tiny; the picture is the colony.
      const clusters = Math.floor((90 + r() * 60) * dm);
      const polyps = [];
      for (let i = 0; i < clusters; i++) {
        // bias toward anchor, with vertical gravity so the reef "grows" up
        let px, py;
        if (r() < 0.7) { const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.6) * minD * 0.75; px = ax + Math.cos(a) * rad; py = ay + Math.sin(a) * rad * 1.05; }
        else { px = r() * W; py = r() * H; }
        if (!inB(px, py, 20)) continue;
        polyps.push({ px, py });
      }
      polyps.sort((a, b) => a.py - b.py);
      for (const pl of polyps) {
        const grow = -Math.PI / 2 + (r() - 0.5) * 0.6;   // mostly upward growth
        const spikes = 4 + Math.floor(r() * 7);
        const base = minD * (0.02 + r() * 0.03);
        for (let s = 0; s < spikes; s++) {
          const ang = grow + (s / spikes - 0.5) * (0.7 + r() * 0.6);
          const len = base * (0.7 + r() * 0.9);
          quill(x, P, pl.px + (r() - 0.5) * base * 0.5, pl.py, len, len * (0.18 + r() * 0.12), ang, P.iridStrength, r, seedPhase);
        }
        // a few beads nestled at the polyp base
        for (let b = 0; b < 2 + Math.floor(r() * 3); b++) {
          beadlet(x, P, pl.px + (r() - 0.5) * base, pl.py + r() * base * 0.5, minD * (0.004 + r() * 0.008), light, P.iridStrength, seedPhase);
        }
      }
      // fine sand of micro-beads filling the ground between colonies
      const B = Math.floor((600 + r() * 400) * dm);
      for (let i = 0; i < B; i++) {
        const px = r() * W, py = r() * H;
        beadlet(x, P, px, py, minD * (0.0024 + r() * 0.005), light, P.iridStrength, seedPhase);
      }
    }

    // ── ATMOSPHERE / TEXTURE FINISH ──
    K.hazeSheet(x, W, H, noise, K.mix(P.g0, '#ffffff', 0.4), P.dark ? 0.05 : 0.08, minD * 0.4, 'screen');
    K.bloom(x, lcx, lcy, minD * 0.55, P.spec, 0.10);
    K.mottle(x, 0, 0, W, H, P.metal, 2600, r, 'overlay');
    K.chromaSplit(x, W, H, 1);
    K.grain(x, W, H, 26, r);
    K.vignette(x, W, H, P.dark ? 0.42 : 0.26);

    return { aspect: W / H };
  }

  return { name: 'quicksilver4', draw, traits };
})();
