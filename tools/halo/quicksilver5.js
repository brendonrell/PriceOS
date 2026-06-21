/* QUICKSILVER5 — LIQUID CHROME / FERROFLUID, DENSE FINE FIELDS + MEDIUM SPIKED CLUSTERS
 *
 * Inherits the approved QUICKSILVER4 direction: NO big smooth blobs/orbs/pools.
 * The frame is built from DENSE, FINE structure — thin ferrofluid quills,
 * hair-like filaments, ridged threads, tiny beads — massed by the hundreds so
 * the picture reads as an intricate gleaming field, off-centre and all-over.
 *
 * EVOLUTION (CEO direction, 2026-06-21):
 *  1. KEEP IT DENSE & FINE — the fine quill/filament/beadlet field is the win.
 *  2. SCALE may go a BIT bigger where it helps — MEDIUM spiked ferrofluid
 *     clusters are allowed (the new `cluster` primitive: a tight radial burst of
 *     ridged spikes around a small spiky core). NEVER huge, NEVER a big smooth
 *     rounded mass — bigger forms are always spiky/ridged/textured ferrofluid
 *     and only medium-sized. Clusters are sparse accents, not the whole field.
 *  3. DISTINCT METAL IDENTITY — Quicksilver does NOT reuse Electrum's saturated
 *     jewel grounds. Grounds read as brushed/anodized TRUE METAL (platinum,
 *     gunmetal, titanium, steel-blue, rose-gold, copper, bronze, champagne),
 *     with thin-film oil-slick iridescent ACCENTS carrying the colour. Strong
 *     specular sheen throughout — it's liquid chrome.
 *
 * MODES (all-over, off-centre, asymmetric — never one thing dead-centre):
 *   Storm    — windswept storm of fine quills + a few medium spiked clusters.
 *   Curtain  — vertical curtains of ridged ferrofluid threads, side-anchored.
 *   Spray    — radial spray of quills from an off-centre focus + cluster cores.
 *   Weave    — interwoven filament mesh + bead lattice, all-over.
 *   Reef     — coral-like reef of clustered spikes & beads, medium polyps. */
window.ENGINE = (function () {
  const K = window.KIT;

  // ── COLOURWAYS — TRUE METAL grounds. Brushed/anodized neutrals + warm/cool
  // metals + 1-2 bolder non-jewel metal tones (steel-blue, gunmetal-teal). NO
  // overlap with Electrum's jewel grounds or its colorway names. Colour enters
  // through the oil-slick thin-film accents (irid); the metal stays believable.
  // g0/g1 = ground root→edge, metal = base chrome hue, spec = specular white,
  // irid = thin-film phase bias, oil = oil-slick accent strength on the field. ──
  const PALS = [
    { name: 'Platinum',   g0: '#dfe3e8', g1: '#8c93a0', metal: '#c3c8d2', irid: 0.30, oil: 0.55, spec: '#ffffff', dark: false },
    { name: 'Gunmetal',   g0: '#6b7078', g1: '#23262c', metal: '#7c828c', irid: 0.50, oil: 0.62, spec: '#eef2f8', dark: false },
    { name: 'Titanium',   g0: '#b9bcc0', g1: '#5c5f66', metal: '#9ea2a8', irid: 0.66, oil: 0.78, spec: '#f4f6fa', dark: false },
    { name: 'Steel Blue',  g0: '#9fb2c6', g1: '#3a4a60', metal: '#8fa4bc', irid: 0.58, oil: 0.66, spec: '#f0f6ff', dark: false },
    { name: 'Rose Gold',   g0: '#e8c3b4', g1: '#a86a5a', metal: '#dca993', irid: 0.22, oil: 0.50, spec: '#fff2ea', dark: false },
    { name: 'Copper',      g0: '#d49063', g1: '#7a3e22', metal: '#c47c4c', irid: 0.14, oil: 0.46, spec: '#ffe6cf', dark: false },
    { name: 'Bronze',      g0: '#b9924f', g1: '#5c4017', metal: '#a8823e', irid: 0.18, oil: 0.44, spec: '#fff0c8', dark: false },
    { name: 'Champagne',   g0: '#e8dcc0', g1: '#a89165', metal: '#d8c89e', irid: 0.26, oil: 0.52, spec: '#fffaea', dark: false },
    { name: 'Graphite',    g0: '#34373d', g1: '#0c0d11', metal: '#5a606c', irid: 0.62, oil: 0.74, spec: '#e6ecf6', dark: true },
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
      g0: pal.g0, g1: pal.g1, metal: pal.metal, irid: pal.irid, oil: pal.oil, spec: pal.spec, dark: pal.dark };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Mode: p.mode, Finish: p.finish, Density: p.density };
  }

  const densMul = (d) => (d === 'Teeming' ? 1.5 : d === 'Packed' ? 1.2 : 1.0);

  /* ── QUILL: a thin tapering ferrofluid spike. Bulged base, fine sharp tip,
     chrome cross-section ramp (dark/bright/dark) so it gleams as metal, a thin
     specular streak up one flank and a whisper of thin-film oil-slick. Kept
     SMALL/MEDIUM — massed by the hundreds, never drawn as one large mass. ── */
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
    g.addColorStop(0.0, K.mix(P.metal, '#04050a', 0.74));
    g.addColorStop(0.42, K.mix(P.metal, '#ffffff', 0.96));
    g.addColorStop(0.60, K.mix(P.metal, '#05060c', 0.55));
    g.addColorStop(1.0, K.mix(P.metal, '#ffffff', 0.34));
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
    // thin-film oil-slick whisper — colour enters here
    x.fillStyle = K.rgba(K.iridescent(seedPhase + P.irid + (bx + by) * 0.0008, 0.95, 0.6), 0.14 * iridStr * (0.7 + P.oil * 0.6));
    x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
    x.restore();
    // specular streak up one flank, stops short of the tip (sharp dark point)
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.spec, 0.5); x.lineWidth = Math.max(0.7, baseW * 0.22); x.lineCap = 'round';
    x.beginPath();
    x.moveTo(bx + px * baseW * 0.4, by + py * baseW * 0.4);
    x.quadraticCurveTo(mx + px * baseW * 0.1, my + py * baseW * 0.1,
      bx + ux * len * 0.82 + px * bend * 0.82, by + uy * len * 0.82 + py * bend * 0.82);
    x.stroke();
    // bright gleam near the tip so quills read as polished metal, not flecks
    const gx = bx + ux * len * 0.7 + px * bend * 0.7, gy = by + uy * len * 0.7 + py * bend * 0.7;
    K.sheen(x, gx, gy, Math.max(2, baseW * 1.3), P.spec, 0.55);
    x.restore();
  }

  /* ── FILAMENT: a fine hair-like chrome thread that follows the curl field.
     Dark shadow + bright chrome stroke + thin-film hairline, so it reads as a
     gleaming metallic strand, not a pencil line. ── */
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
    // iridescent oil-slick hairline on the other flank
    x.strokeStyle = K.rgba(K.iridescent(seedPhase + P.irid + sx * 0.001, 0.96, 0.64), 0.52 * iridStr * (0.7 + P.oil * 0.6));
    x.lineWidth = Math.max(0.5, w * 0.4);
    x.beginPath(); x.moveTo(pts[0][0] + w * 0.22, pts[0][1] + w * 0.22);
    for (const p of pts) x.lineTo(p[0] + w * 0.22, p[1] + w * 0.22);
    x.stroke();
    x.restore();
  }

  /* ── BEADLET: a tiny chrome bead. Small radial metal with a mirror band and a
     pin highlight. Fine incident texture in gaps — always SMALL. ── */
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
    x.fillStyle = K.rgba(K.iridescent(seedPhase + P.irid + cx * 0.001, 0.92, 0.6), 0.18 * iridStr * (0.7 + P.oil * 0.6));
    x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    x.restore();
    const hx = cx + Math.cos(light) * rad * 0.4, hy = cy + Math.sin(light) * rad * 0.4;
    K.sheen(x, hx, hy, rad * 0.55, P.spec, 0.7);
  }

  /* ── CLUSTER: a MEDIUM spiked ferrofluid burst. A tight radial fan of ridged
     quills around a small spiky core — the controlled "bigger but spiky" form
     the CEO allowed. NEVER a smooth rounded mass: the silhouette is all spikes,
     the centre is a knot of short barbs + beads, and the overall footprint is
     capped to MEDIUM (a fraction of the frame, never huge). ── */
  function cluster(x, P, cx, cy, rad, light, iridStr, r, seedPhase) {
    // MEDIUM cap — never let a cluster grow huge.
    const spikes = 14 + Math.floor(r() * 14);
    const baseAng = r() * Math.PI * 2;
    const sag = -Math.PI / 2;                 // light/gravity lean for the long spikes
    // soft contact shadow grounds the cluster
    K.softShadow(x, cx, cy + rad * 0.4, rad * 1.6, 0.34);
    // collect spikes, draw outer→inner-ish by length for layered relief
    const arr = [];
    for (let s = 0; s < spikes; s++) {
      const a = baseAng + (s / spikes) * Math.PI * 2 + (r() - 0.5) * 0.3;
      // spikes longest toward the light lean, giving an asymmetric ferrofluid peak
      const lean = 0.55 + 0.45 * Math.cos(a - sag);
      const len = rad * (0.55 + r() * 0.85) * lean;
      const bw = len * (0.16 + r() * 0.1);
      const ox = Math.cos(a) * rad * 0.18 * r(), oy = Math.sin(a) * rad * 0.18 * r();
      arr.push({ a, len, bw, ox, oy });
    }
    arr.sort((p, q) => p.len - q.len);
    for (const sp of arr) {
      quill(x, P, cx + sp.ox, cy + sp.oy, sp.len, sp.bw, sp.a, iridStr, r, seedPhase,
        (r() - 0.5) * sp.len * 0.3);
    }
    // spiky core knot — short dense barbs so the centre is textured, NOT smooth
    const core = 8 + Math.floor(r() * 8);
    for (let s = 0; s < core; s++) {
      const a = r() * Math.PI * 2;
      const len = rad * (0.18 + r() * 0.22);
      quill(x, P, cx + (r() - 0.5) * rad * 0.3, cy + (r() - 0.5) * rad * 0.3,
        len, len * (0.2 + r() * 0.12), a, iridStr, r, seedPhase);
    }
    // a few beads nestled in the knot
    for (let b = 0; b < 3 + Math.floor(r() * 3); b++) {
      beadlet(x, P, cx + (r() - 0.5) * rad * 0.5, cy + (r() - 0.5) * rad * 0.5,
        rad * (0.05 + r() * 0.07), light, iridStr, seedPhase);
    }
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

    // ── GROUND: brushed/anodized metal wash + off-centre radial lift + haze ──
    const gg = x.createLinearGradient(0, 0, W * 0.2, H);
    gg.addColorStop(0, K.mix(P.g0, '#ffffff', P.dark ? 0.05 : 0.16));
    gg.addColorStop(0.55, P.g0);
    gg.addColorStop(1, P.g1);
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    // anodized brushing: faint one-direction metallic streaks across the ground
    // (subtle — reads as brushed metal grain, not crosshatch fabric)
    x.save();
    x.globalCompositeOperation = 'soft-light';
    const brushAng = (r() < 0.5 ? 1 : -1) * (0.025 + r() * 0.035);
    const NB = 110;
    for (let i = 0; i < NB; i++) {
      const yy = (i / NB) * H + (r() - 0.5) * (H / NB);
      x.strokeStyle = K.rgba(i % 3 === 0 ? P.spec : P.g1, 0.03 + r() * 0.035);
      x.lineWidth = 0.6 + r() * 1.0;
      x.beginPath();
      x.moveTo(-20, yy);
      x.lineTo(W + 20, yy + W * brushAng + (r() - 0.5) * 10);
      x.stroke();
    }
    x.restore();
    const lcx = W * (0.32 + r() * 0.34), lcy = H * (0.26 + r() * 0.3);
    // light palettes wash out under a strong central bloom — keep it gentle so
    // the dark quill cross-sections keep their bite and the field reads dense.
    const groundLum = K.lum ? K.lum(P.g0) : 0.6;
    const bloomA = P.dark ? 0.18 : (groundLum > 0.7 ? 0.14 : 0.26);
    K.bloom(x, lcx, lcy, minD * 0.78, K.mix(P.g0, '#ffffff', 0.4), bloomA);
    K.hazeSheet(x, W, H, noise, K.mix(P.g1, '#ffffff', 0.3), P.dark ? 0.10 : 0.13, minD * 0.5, 'screen');
    // a faint oil-slick film over the whole ground so the chrome identity reads
    x.save();
    x.globalCompositeOperation = 'soft-light';
    x.fillStyle = K.rgba(K.iridescent(seedPhase + P.irid, 0.9, 0.6), 0.06 * P.oil);
    x.fillRect(0, 0, W, H);
    x.restore();

    // Off-centre density focus (golden-ratio anchor) — the field thickens here
    // and thins toward an opposite margin, keeping composition asymmetric.
    const ax = r() < 0.5 ? W * K.INVPHI : W * (1 - K.INVPHI);
    const ay = H * (0.34 + r() * 0.34);

    // small helper: clamp inside frame with a little bleed
    const inB = (px, py, m) => px > -m && px < W + m && py > -m && py < H + m;

    // ── MODE FIELDS ─────────────────────────────────────────────────────────
    if (P.mode === 'Storm') {
      const wind = -Math.PI / 2 + (r() - 0.5) * 1.3;
      const N = Math.floor((900 + r() * 500) * dm);
      const quills = [];
      for (let i = 0; i < N; i++) {
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
      // a FEW medium spiked clusters as off-centre focal accents (never huge)
      const CL = 2 + Math.floor(r() * 3);
      for (let i = 0; i < CL; i++) {
        const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.7) * minD * 0.5;
        const px = ax + Math.cos(a) * rad, py = ay + Math.sin(a) * rad * 0.95;
        if (!inB(px, py, 0)) continue;
        cluster(x, P, px, py, minD * (0.06 + r() * 0.05), light, P.iridStrength, r, seedPhase);
      }
    } else if (P.mode === 'Curtain') {
      const cols = Math.floor((46 + r() * 26) * dm);
      const side = r() < 0.5 ? 0 : 1;
      for (let cI = 0; cI < cols; cI++) {
        const t = cI / cols;
        const bias = side ? Math.pow(t, 0.7) : Math.pow(1 - t, 0.7);
        const colX = t * W + (r() - 0.5) * (W / cols) * 1.2;
        const drift = Math.PI / 2 + (r() - 0.5) * 0.5;
        const startY = -H * 0.05 + r() * H * 0.1;
        const perCol = 2 + Math.floor(bias * 4 * dm + r() * 2);
        for (let k = 0; k < perCol; k++) {
          const sx = colX + (r() - 0.5) * (W / cols) * 0.9;
          const len = H * (0.5 + r() * 0.55);
          const w = minD * (0.0026 + r() * 0.004);
          filament(x, P, sx, startY + r() * H * 0.12, noise, len, w, P.iridStrength, r, seedPhase, drift);
        }
        const buds = Math.floor(bias * 8 * dm);
        for (let k = 0; k < buds; k++) {
          const sx = colX + (r() - 0.5) * (W / cols) * 1.4;
          const sy = r() * H;
          const ang = (r() < 0.5 ? 1 : -1) * (Math.PI / 2) * (0.2 + r() * 0.5) + Math.PI / 2;
          const len = minD * (0.02 + r() * 0.04);
          quill(x, P, sx, sy, len, len * (0.16 + r() * 0.1), ang, P.iridStrength, r, seedPhase);
        }
      }
      const B = Math.floor((420 + r() * 240) * dm);
      for (let i = 0; i < B; i++) {
        const px = r() * W, py = r() * H;
        beadlet(x, P, px, py, minD * (0.0035 + r() * 0.008), light, P.iridStrength, seedPhase);
      }
      // a couple of medium clusters clinging to the anchor side of the veil
      const CL = 2 + Math.floor(r() * 2);
      for (let i = 0; i < CL; i++) {
        const px = (side ? 0.62 + r() * 0.32 : 0.06 + r() * 0.32) * W;
        const py = (0.2 + r() * 0.6) * H;
        cluster(x, P, px, py, minD * (0.05 + r() * 0.045), light, P.iridStrength, r, seedPhase);
      }
    } else if (P.mode === 'Spray') {
      // Wind-blown spray: streaks fan from an OFF-CENTRE focus tucked toward a
      // corner, biased downwind along a prevailing angle so it's directional and
      // asymmetric (not a centred sunburst). Field fills edge-to-edge along the
      // wind so there's no large empty ground.
      const fx = ax + (r() - 0.5) * minD * 0.2;
      const fy = ay + (r() - 0.5) * minD * 0.2;
      const wind = r() * Math.PI * 2;                 // prevailing downwind direction
      const fan = 0.7 + r() * 0.6;                     // spread half-angle
      const N = Math.floor((1100 + r() * 650) * dm);
      const quills = [];
      for (let i = 0; i < N; i++) {
        // bias direction toward the wind cone, distance long downwind
        const a = wind + (r() - 0.5) * 2 * fan;
        const rad = Math.pow(r(), 0.42) * minD * 1.05;
        const px = fx + Math.cos(a) * rad, py = fy + Math.sin(a) * rad * 0.96;
        if (!inB(px, py, 30)) continue;
        const c = K.curl(noise, px, py, 1.4);
        const outAng = a + (c[0] + c[1]) * 0.5 + (r() - 0.5) * 0.3;
        const sizeF = K.clamp(1.2 - rad / minD, 0.4, 1.2);
        const len = minD * (0.02 + Math.pow(r(), 1.5) * 0.07) * sizeF;
        const bw = len * (0.12 + r() * 0.1);
        quills.push({ px, py, ang: outAng, len, bw, depth: py });
      }
      // a dense secondary scatter so the whole frame stays packed (no empty
      // ground in the upwind region) — these are full fine quills, not dust.
      const N2 = Math.floor((900 + r() * 500) * dm);
      for (let i = 0; i < N2; i++) {
        const px = r() * W, py = r() * H;
        const c = K.curl(noise, px, py, 1.5);
        const outAng = wind + (c[0] - c[1]) * 0.9 + (r() - 0.5) * 0.5;
        const len = minD * (0.018 + Math.pow(r(), 1.6) * 0.05);
        quills.push({ px, py, ang: outAng, len, bw: len * (0.14 + r() * 0.1), depth: py });
      }
      quills.sort((a, b) => a.depth - b.depth);
      for (const q of quills) quill(x, P, q.px, q.py, q.len, q.bw, q.ang, P.iridStrength, r, seedPhase);
      const B = Math.floor((360 + r() * 240) * dm);
      for (let i = 0; i < B; i++) {
        const a = wind + (r() - 0.5) * 2 * fan, rad = Math.pow(r(), 0.35) * minD * 1.1;
        const px = fx + Math.cos(a) * rad, py = fy + Math.sin(a) * rad;
        if (!inB(px, py, 8)) continue;
        beadlet(x, P, px, py, minD * (0.003 + r() * 0.007), light, P.iridStrength, seedPhase);
      }
      // a medium spiked core at the focus + 1-2 satellite clusters downwind
      cluster(x, P, fx, fy, minD * (0.06 + r() * 0.05), light, P.iridStrength, r, seedPhase);
      const CL = 1 + Math.floor(r() * 2);
      for (let i = 0; i < CL; i++) {
        const rad = (0.2 + r() * 0.45) * minD;
        const a = wind + (r() - 0.5) * 2 * fan;
        cluster(x, P, fx + Math.cos(a) * rad, fy + Math.sin(a) * rad,
          minD * (0.045 + r() * 0.04), light, P.iridStrength, r, seedPhase);
      }
    } else if (P.mode === 'Weave') {
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
      const Q = Math.floor((420 + r() * 280) * dm);
      for (let i = 0; i < Q; i++) {
        const px = r() * W, py = r() * H;
        const c = K.curl(noise, px, py, 1.4);
        const ang = Math.atan2(c[1], c[0]) + (r() - 0.5) * 0.6;
        const len = minD * (0.015 + r() * 0.03);
        quill(x, P, px, py, len, len * (0.16 + r() * 0.1), ang, P.iridStrength, r, seedPhase);
      }
      const B = Math.floor((700 + r() * 400) * dm);
      for (let i = 0; i < B; i++) {
        let px, py;
        if (r() < 0.5) { const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.7) * minD * 0.7; px = ax + Math.cos(a) * rad; py = ay + Math.sin(a) * rad; }
        else { px = r() * W; py = r() * H; }
        if (!inB(px, py, 6)) continue;
        beadlet(x, P, px, py, minD * (0.0028 + r() * 0.006), light, P.iridStrength, seedPhase);
      }
      // 2-3 medium spiked knots where the weave bunches (off-centre)
      const CL = 2 + Math.floor(r() * 2);
      for (let i = 0; i < CL; i++) {
        const px = (0.15 + r() * 0.7) * W, py = (0.15 + r() * 0.7) * H;
        cluster(x, P, px, py, minD * (0.045 + r() * 0.04), light, P.iridStrength, r, seedPhase);
      }
    } else { // Reef
      const clusters = Math.floor((220 + r() * 120) * dm);
      const polyps = [];
      for (let i = 0; i < clusters; i++) {
        let px, py;
        if (r() < 0.45) { const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.6) * minD * 0.8; px = ax + Math.cos(a) * rad; py = ay + Math.sin(a) * rad * 1.05; }
        else { px = r() * W; py = r() * H; }
        if (!inB(px, py, 20)) continue;
        polyps.push({ px, py });
      }
      polyps.sort((a, b) => a.py - b.py);
      for (const pl of polyps) {
        const grow = -Math.PI / 2 + (r() - 0.5) * 0.8;
        const spikes = 5 + Math.floor(r() * 8);
        const base = minD * (0.022 + r() * 0.032);
        for (let s = 0; s < spikes; s++) {
          const ang = grow + (s / spikes - 0.5) * (0.7 + r() * 0.6);
          const len = base * (0.7 + r() * 0.9);
          quill(x, P, pl.px + (r() - 0.5) * base * 0.5, pl.py, len, len * (0.18 + r() * 0.12), ang, P.iridStrength, r, seedPhase);
        }
        for (let b = 0; b < 2 + Math.floor(r() * 3); b++) {
          beadlet(x, P, pl.px + (r() - 0.5) * base, pl.py + r() * base * 0.5, minD * (0.004 + r() * 0.008), light, P.iridStrength, seedPhase);
        }
      }
      // a handful of larger medium "heads" rising from the reef (still spiky)
      const heads = 3 + Math.floor(r() * 4);
      for (let i = 0; i < heads; i++) {
        let px, py;
        if (r() < 0.6) { const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.6) * minD * 0.6; px = ax + Math.cos(a) * rad; py = ay + Math.sin(a) * rad; }
        else { px = r() * W; py = r() * H; }
        cluster(x, P, px, py, minD * (0.045 + r() * 0.04), light, P.iridStrength, r, seedPhase);
      }
      const B = Math.floor((600 + r() * 400) * dm);
      for (let i = 0; i < B; i++) {
        const px = r() * W, py = r() * H;
        beadlet(x, P, px, py, minD * (0.0024 + r() * 0.005), light, P.iridStrength, seedPhase);
      }
    }

    // ── ATMOSPHERE / TEXTURE FINISH ──
    K.hazeSheet(x, W, H, noise, K.mix(P.g0, '#ffffff', 0.4), P.dark ? 0.05 : 0.07, minD * 0.4, 'screen');
    K.bloom(x, lcx, lcy, minD * 0.5, P.spec, P.dark ? 0.10 : (groundLum > 0.7 ? 0.05 : 0.09));
    K.mottle(x, 0, 0, W, H, P.metal, 2600, r, 'overlay');
    K.chromaSplit(x, W, H, 1);
    K.grain(x, W, H, 26, r);
    K.vignette(x, W, H, P.dark ? 0.42 : 0.26);

    return { aspect: W / H };
  }

  return { name: 'quicksilver5', draw, traits };
})();
