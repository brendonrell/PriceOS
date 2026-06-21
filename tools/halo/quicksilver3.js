/* QUICKSILVER2 — LIQUID CHROME / FERROFLUID (composition-forward)
 * Molten metal as pure abstraction. This round goes HARD on composition: every
 * seed is built around a single dominant hero with supporting forms and
 * intentional negative space — no dead gradient at the top, no subjects floating
 * low in a void, no flat "render-test" disc piles, no repeated pendant motif.
 * Sheen/colour are inherited verbatim from the approved AURUM engine; only the
 * picture-making changed. Five distinct compositional pictures: a ferrofluid
 * Spike Crown (hero), a frame-filling Coalescence Pool, a Constellation bead
 * cluster, a sweeping Diagonal Flow, and a tight Macro Merge crop. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Colorways. Mostly bright/saturated grounds; 2 dark for range. `grad` pairs
  // define the ground wash (g0→g1). `metal` is the base hue the chrome ramp
  // pulls from; `irid` biases the thin-film band; `spec` is the highlight tint.
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

  // Mode weighting: Crown is the hero image and gets the heaviest weight so it
  // appears ~1-in-3 seeds. The repeated pendant/rivulet motif is GONE. Each of
  // the other four is a genuinely different composition.
  const MODE_BAG = [
    'Crown', 'Crown', 'Crown',          // hero — most frequent
    'Pool', 'Pool',                     // frame-filling coalescence
    'Constellation', 'Constellation',   // dense anchored bead cluster
    'Flow', 'Flow',                     // sweeping diagonal chrome river
    'Macro', 'Macro',                   // tight crop of merging metal
  ];
  const FINISH = ['High Polish', 'Brushed', 'Wet'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const mode = K.pick(MODE_BAG, r);
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

  // trace an organic (noise-perturbed) blob outline so forms read as liquid
  // metal pools, not glass marbles. `wob` 0 = circle, higher = more deformed.
  function blobPath(x, cx, cy, rad, wob, noise, ph) {
    const steps = 48;
    x.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const nr = rad * (1 + wob * 0.5 * noise.noise2(Math.cos(a) * 1.3 + ph, Math.sin(a) * 1.3 + ph * 0.7));
      const px = cx + Math.cos(a) * nr, py = cy + Math.sin(a) * nr;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath();
  }

  /* ── shaded chrome blob: an organic metal body with mirror-ramp banding, a
     reflected horizon, thin-film iridescence, a tight specular hotspot and a
     soft ambient-occlusion contact shadow. ── */
  function chromeBlob(x, P, cx, cy, rad, light, iridStr, finish, r, seedPhase, noise, wob) {
    wob = wob == null ? 0.18 : wob;
    const ph = (cx * 0.013 + cy * 0.017) % 6.28;
    // soft contact shadow below
    K.softShadow(x, cx, cy + rad * 0.42, rad * 1.6, 0.45);

    x.save();
    blobPath(x, cx, cy, rad, wob, noise, ph); x.clip();

    // base metal body — vertical mirror ramp (dark top, bright belly, dark base)
    const g = x.createLinearGradient(cx, cy - rad, cx, cy + rad);
    g.addColorStop(0.00, K.mix(P.metal, '#05060a', 0.70));
    g.addColorStop(0.16, K.mix(P.metal, '#ffffff', 0.32));
    g.addColorStop(0.38, K.mix(P.metal, '#04050a', 0.42));
    g.addColorStop(0.50, K.mix(P.metal, '#ffffff', 0.96)); // bright reflected horizon
    g.addColorStop(0.56, K.mix(P.metal, '#ffffff', 0.55));
    g.addColorStop(0.74, K.mix(P.metal, '#05060c', 0.55));
    g.addColorStop(1.00, K.mix(P.metal, '#ffffff', 0.30));
    x.fillStyle = g; x.fillRect(cx - rad * 1.6, cy - rad * 1.6, rad * 3.2, rad * 3.2);

    // reflected environment tint: pull the ground color into the lower belly so
    // the metal mirrors its surroundings (key chrome cue)
    x.globalCompositeOperation = 'overlay';
    const eg = x.createLinearGradient(cx, cy - rad, cx, cy + rad);
    eg.addColorStop(0, K.rgba(P.g0, 0.0));
    eg.addColorStop(0.55, K.rgba(P.g0, 0.45));
    eg.addColorStop(1, K.rgba(P.g1, 0.55));
    x.fillStyle = eg; x.fillRect(cx - rad * 1.6, cy - rad * 1.6, rad * 3.2, rad * 3.2);

    // thin-film iridescent sweep across the body (oil-slick)
    const bands = 9;
    for (let i = 0; i < bands; i++) {
      const t = i / bands;
      const phase = seedPhase + t * 1.5 + P.irid + ph * 0.05;
      const col = K.iridescent(phase, 0.92, 0.58);
      const yy = cy - rad + t * rad * 2;
      x.fillStyle = K.rgba(col, 0.06 + iridStr * 0.12);
      x.fillRect(cx - rad * 1.6, yy, rad * 3.2, rad * 2 / bands + 1);
    }

    // brushed finish: faint vertical streaks
    if (finish === 'Brushed') {
      x.globalCompositeOperation = 'soft-light';
      for (let i = -rad; i < rad; i += 2) {
        x.fillStyle = K.rgba(i % 4 < 2 ? '#ffffff' : '#000000', 0.05);
        x.fillRect(cx + i, cy - rad * 1.6, 1, rad * 3.2);
      }
    }
    x.restore();

    // dark rim terminator
    x.save();
    blobPath(x, cx, cy, rad, wob, noise, ph);
    x.lineWidth = Math.max(1.5, rad * 0.05);
    x.strokeStyle = K.rgba(K.mix(P.metal, '#000', 0.72), 0.55);
    x.stroke();
    // iridescent rim-light on the lit edge
    x.globalCompositeOperation = 'lighter';
    blobPath(x, cx, cy, rad * 0.965, wob, noise, ph);
    x.lineWidth = Math.max(1.4, rad * 0.045);
    x.strokeStyle = K.rgba(K.iridescent(seedPhase + 0.3 + P.irid, 0.96, 0.66), 0.55 + iridStr * 0.3);
    x.stroke();
    x.restore();

    // tight specular hotspot on the lit upper side
    const hx = cx + Math.cos(light) * rad * 0.46;
    const hy = cy + Math.sin(light) * rad * 0.46;
    K.sheen(x, hx, hy, rad * 0.5, P.spec, 0.6);
    K.sheen(x, hx, hy, rad * 0.14, '#ffffff', 0.95);
  }

  /* ── ferrofluid spike: a curved chrome horn that bulges at the base and tapers
     to a fine point — the signature Rosensweig-instability cone. ── */
  function spike(x, P, bx, by, len, baseW, ang, light, iridStr, r, seedPhase, noise) {
    // curve the spike sideways a touch for organic life
    const bend = (r() - 0.5) * len * 0.35;
    const ux = Math.cos(ang), uy = Math.sin(ang);            // axis
    const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2); // perp
    const tx = bx + ux * len + px * bend, ty = by + uy * len + py * bend;
    const mx = bx + ux * len * 0.5 + px * bend * 0.5, my = by + uy * len * 0.5 + py * bend * 0.5;
    // contact shadow at the base
    K.softShadow(x, bx, by + baseW * 0.4, baseW * 2.2, 0.32);
    x.save();
    // body: a bulged base (concave flanks) sweeping to a sharp tip
    x.beginPath();
    x.moveTo(bx + px * baseW, by + py * baseW);
    // right flank curves inward then to tip
    x.bezierCurveTo(
      bx + ux * len * 0.18 + px * baseW * 0.9, by + uy * len * 0.18 + py * baseW * 0.9,
      mx + px * baseW * 0.22, my + py * baseW * 0.22,
      tx, ty);
    // left flank back to base
    x.bezierCurveTo(
      mx - px * baseW * 0.22, my - py * baseW * 0.22,
      bx + ux * len * 0.18 - px * baseW * 0.9, by + uy * len * 0.18 - py * baseW * 0.9,
      bx - px * baseW, by - py * baseW);
    x.closePath();
    x.clip();
    // chrome cross-section ramp (perpendicular to axis) — dark/bright/dark/bright
    const g = x.createLinearGradient(bx + px * baseW, by + py * baseW, bx - px * baseW, by - py * baseW);
    g.addColorStop(0.0, K.mix(P.metal, '#05060a', 0.6));
    g.addColorStop(0.4, K.mix(P.metal, '#ffffff', 0.95));
    g.addColorStop(0.6, K.mix(P.metal, '#06070c', 0.42));
    g.addColorStop(1.0, K.mix(P.metal, '#ffffff', 0.35));
    const bb = baseW * 2 + len;
    x.fillStyle = g;
    x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
    // vertical (along-axis) dark-to-light so the tip catches light
    x.globalCompositeOperation = 'overlay';
    const ag = x.createLinearGradient(bx, by, tx, ty);
    ag.addColorStop(0, K.rgba(P.g1, 0.4));
    ag.addColorStop(0.7, K.rgba('#000000', 0.0));
    ag.addColorStop(1, K.rgba(P.spec, 0.35));
    x.fillStyle = ag;
    x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
    // iridescent film
    x.fillStyle = K.rgba(K.iridescent(seedPhase + P.irid + 0.2, 0.92, 0.6), 0.13 * iridStr);
    x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
    x.restore();
    // crisp specular highlight running up one flank (stops short of the tip so
    // the point stays dark/sharp — no LED-pin glints)
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.spec, 0.4); x.lineWidth = Math.max(1, baseW * 0.14); x.lineCap = 'round';
    x.beginPath();
    x.moveTo(bx + px * baseW * 0.45, by + py * baseW * 0.45);
    x.quadraticCurveTo(mx + px * baseW * 0.12, my + py * baseW * 0.12,
      bx + ux * len * 0.82 + px * bend * 0.82, by + uy * len * 0.82 + py * bend * 0.82);
    x.stroke();
    x.restore();
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

    // ── COMPOSITION FRAMEWORK ──────────────────────────────────────────────
    // Golden-ratio thirds anchors. Pick a strong off-centre focal point so the
    // hero never floats in the dead centre or low in a void. Each mode then
    // builds its own picture around `fx,fy` and fills the frame confidently.
    const thirdsX = r() < 0.5 ? W * 0.5 : (r() < 0.5 ? W * (1 - K.INVPHI) : W * K.INVPHI);
    const fx = thirdsX;
    // vertical anchor kept in the upper-mid band so forms own the top of frame
    const fy = H * (0.40 + r() * 0.12);

    // A pooled "horizon" reflection band: a faint mirrored smear under the hero
    // so it sits in space instead of floating. Drawn once, beneath the subject.
    function groundReflection(gx, gy, gw) {
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

    // ── MODE COMPOSITIONS ──
    if (P.mode === 'Crown') {
      // HERO: a single dominant ferrofluid spike crown that commands the frame.
      // Scaled large, planted on a soft contact pool, spikes filling the upper
      // frame so there is NO dead gradient at the top. Off-centre anchored.
      const R = minD * (0.24 + r() * 0.05);
      const ccx = fx, ccy = H * (0.56 + r() * 0.06); // plant slightly low-centre so spikes own the top
      groundReflection(ccx, ccy + R * 0.95, R * 2.1);
      const n = K.rint(r, 14, 20);
      const spikes = [];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI + (i / (n - 1)) * Math.PI * 1.32 - Math.PI * 0.16 + (r() - 0.5) * 0.16;
        const radial = a;
        const dir = Math.atan2(Math.sin(radial) * 0.5 - 0.9, Math.cos(radial) * 0.92);
        const up = (-Math.sin(dir) + 1) / 2;
        // longer spikes than before so the crown reaches into the upper frame
        const len = R * (1.15 + up * 1.55 + Math.abs(K.randn(r)) * 0.45);
        const bw = R * (0.14 + r() * 0.07) * (0.7 + up * 0.5);
        const bx = ccx + Math.cos(a) * R * 0.66, by = ccy + Math.sin(a) * R * 0.58;
        spikes.push({ a, dir, len, bw, bx, by });
      }
      chromeBlob(x, P, ccx, ccy, R, light, P.iridStrength, P.finish, r, seedPhase, noise, 0.26);
      spikes.sort((s1, s2) => s1.by - s2.by);
      for (const s of spikes) spike(x, P, s.bx, s.by, s.len, s.bw, s.dir, light, P.iridStrength, r, seedPhase, noise);
      const hx = ccx + Math.cos(light) * R * 0.42, hy = ccy + Math.sin(light) * R * 0.42;
      K.sheen(x, hx, hy, R * 0.4, P.spec, 0.4);
      // supporting cast: a couple of resting satellite beads at the base + a few
      // flung droplets up high — gives focal hierarchy without clutter.
      const baseN = K.rint(r, 2, 3);
      for (let i = 0; i < baseN; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const bx = ccx + side * R * (1.3 + r() * 0.5), by = ccy + R * (0.7 + r() * 0.3);
        chromeBlob(x, P, bx, by, R * (0.18 + r() * 0.16), light, P.iridStrength, P.finish, r, seedPhase + 0.07, noise, 0.24);
      }
      for (let i = 0; i < K.rint(r, 3, 5); i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 1.8, dd = R * (1.9 + r() * 1.3);
        chromeBlob(x, P, ccx + Math.cos(a) * dd, ccy + Math.sin(a) * dd, R * (0.05 + r() * 0.09), light, P.iridStrength, P.finish, r, seedPhase + 0.1, noise, 0.3);
      }
    } else if (P.mode === 'Pool') {
      // FRAME-FILLING COALESCENCE: a dominant central mass with merging satellite
      // pools, all large and overlapping so the field is FULL — the rebuild of
      // the old flat "render-test" disc pile. One clear hero blob, descending
      // sizes, connective necks, anchored off-centre.
      const pcy = H * (0.46 + (r() - 0.5) * 0.08); // keep the mass centred in frame
      const heroR = minD * (0.31 + r() * 0.06);
      const pts = [{ bx: fx, by: pcy, R: heroR }];
      const sat = K.rint(r, 5, 7);
      // aspect-aware spread so the cluster fills wide on landscape, tall on portrait
      const sprX = W * 0.30, sprY = H * 0.30;
      for (let i = 0; i < sat; i++) {
        // ring around the hero, touching/overlapping, biased to the long axis
        const a = (i / sat) * Math.PI * 2 + r() * 0.8;
        const dd = 0.80 + r() * 0.55;
        const rr = heroR * (0.42 + r() * 0.40);
        let bx = fx + Math.cos(a) * sprX * dd, by = pcy + Math.sin(a) * sprY * dd;
        bx = K.clamp(bx, W * 0.14, W * 0.86);
        by = K.clamp(by, H * 0.14, H * 0.86);
        pts.push({ bx, by, R: rr });
      }
      // a few small merge droplets in the gaps for texture
      for (let i = 0; i < K.rint(r, 4, 6); i++) {
        const a = r() * Math.PI * 2, dd = 1.0 + r() * 0.7;
        pts.push({ bx: K.clamp(fx + Math.cos(a) * sprX * dd, W * 0.08, W * 0.92),
                   by: K.clamp(pcy + Math.sin(a) * sprY * dd, H * 0.08, H * 0.92),
                   R: heroR * (0.12 + r() * 0.14) });
      }
      groundReflection(fx, pcy + heroR * 0.9, heroR * 2.2);
      // connective necks (metaball illusion)
      x.save(); x.globalCompositeOperation = 'source-over';
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].bx - pts[j].bx, pts[i].by - pts[j].by);
          if (d < (pts[i].R + pts[j].R) * 1.0) {
            const ng = x.createLinearGradient(pts[i].bx, pts[i].by, pts[j].bx, pts[j].by);
            ng.addColorStop(0, K.mix(P.metal, '#ffffff', 0.5));
            ng.addColorStop(0.5, K.mix(P.metal, '#06070c', 0.2));
            ng.addColorStop(1, K.mix(P.metal, '#ffffff', 0.4));
            x.strokeStyle = ng; x.lineWidth = Math.min(pts[i].R, pts[j].R) * 0.95; x.lineCap = 'round';
            x.beginPath(); x.moveTo(pts[i].bx, pts[i].by); x.lineTo(pts[j].bx, pts[j].by); x.stroke();
          }
        }
      }
      x.restore();
      // blobs: big behind, hero last so it reads on top and dominant
      const ordered = pts.slice().sort((a, b) => b.R - a.R);
      for (const p of ordered) chromeBlob(x, P, p.bx, p.by, p.R, light, P.iridStrength, P.finish, r, seedPhase, noise, 0.14 + r() * 0.14);
    } else if (P.mode === 'Constellation') {
      // DENSE ANCHORED BEAD CLUSTER: one large keystone bead at the focal anchor,
      // surrounded by a tightly-graded constellation that swells around it and
      // thins toward the edges (intentional negative space at the margins, dense
      // core). Reads as a single cluster-picture, not scattered loners in a void.
      const keyR = minD * (0.18 + r() * 0.05);
      const beads = [{ bx: fx, by: fy, rad: keyR }];
      // a 2-3 bead "core triad" hugging the keystone so the focal mass is clearly
      // dominant, then a graded cloud filling out toward every edge.
      for (let i = 0; i < K.rint(r, 2, 3); i++) {
        const a = r() * Math.PI * 2, dd = keyR * (0.9 + r() * 0.5);
        beads.push({ bx: fx + Math.cos(a) * dd, by: fy + Math.sin(a) * dd, rad: keyR * (0.45 + r() * 0.3) });
      }
      // cluster cloud: spread wide enough to FILL the frame; density & size both
      // fall off with distance from the keystone so the eye stays on the core but
      // the margins are never empty.
      const cloudN = K.rint(r, 44, 62);
      const spread = minD * (0.46 + r() * 0.14);
      for (let i = 0; i < cloudN; i++) {
        const ang = r() * Math.PI * 2;
        const rad = Math.pow(r(), 0.7) * spread * 1.7; // fills out to edges
        const bx = fx + Math.cos(ang) * rad, by = fy + Math.sin(ang) * rad * 0.95;
        if (bx < -40 || bx > W + 40 || by < -40 || by > H + 40) continue;
        const falloff = K.clamp(1 - rad / (spread * 2.4), 0.14, 1);
        const rr = minD * (0.016 + falloff * (0.07 + Math.pow(r(), 1.7) * 0.06));
        beads.push({ bx, by, rad: rr });
      }
      groundReflection(fx, fy + keyR * 1.1, keyR * 2.2);
      beads.sort((a, b) => a.rad - b.rad);
      for (const b of beads) chromeBlob(x, P, b.bx, b.by, b.rad, light, P.iridStrength, P.finish, r, seedPhase + b.rad * 0.01, noise, 0.18 + r() * 0.16);
    } else if (P.mode === 'Flow') {
      // SWEEPING DIAGONAL CHROME FLOW: one bold molten river cutting corner-to-
      // corner across the whole frame, swelling into pools, with secondary
      // tributaries. Fills the field on the diagonal — strong directional
      // composition, no curtain of identical stems.
      const dir = r() < 0.5 ? 1 : -1; // TL->BR or TR->BL
      // march along a fixed diagonal axis; curl only perturbs sideways so the
      // river truly SWEEPS corner-to-corner instead of dribbling vertically.
      function river(sx, sy, axisAng, baseW, span, steps, perturb, phaseOff) {
        const ux = Math.cos(axisAng), uy = Math.sin(axisAng);     // travel axis
        const pxp = -uy, pyp = ux;                                // perpendicular
        let px = sx, py = sy; const segs = [];
        const stepLen = span / steps;
        for (let s = 0; s < steps; s++) {
          segs.push([px, py]);
          const c = K.curl(noise, px * 1.1, py * 1.1, 1.6);
          const lateral = (c[0] + c[1]) * 0.5 * perturb; // sideways wobble only
          px += ux * stepLen + pxp * lateral;
          py += uy * stepLen + pyp * lateral;
          // generous bounds: the path starts well outside and must be allowed to
          // travel IN to the frame before the exit-side cull applies.
          if (px < -W * 0.6 || px > W * 1.6 || py < -H * 0.6 || py > H * 1.6) break;
        }
        if (segs.length < 4) return;
        const mid = segs[Math.floor(segs.length / 2)];
        // shadow (offset roughly toward light's opposite)
        x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = 'rgba(0,0,0,0.32)';
        x.lineWidth = baseW * 1.4; x.lineCap = 'round'; x.lineJoin = 'round';
        x.beginPath(); x.moveTo(segs[0][0] + 8, segs[0][1] + 12);
        for (const s of segs) x.lineTo(s[0] + 8, s[1] + 12); x.stroke(); x.restore();
        // chrome core — cross-section ramp PERPENDICULAR to the diagonal axis so
        // the tube reads as a true diagonal flow, lit on one flank.
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
        x.strokeStyle = K.rgba(K.iridescent(seedPhase + phaseOff + P.irid, 0.95, 0.65), 0.55 * P.iridStrength);
        x.lineWidth = baseW * 0.28;
        x.beginPath(); x.moveTo(segs[0][0] + pxp * baseW * 0.2, segs[0][1] + pyp * baseW * 0.2);
        for (const s of segs) x.lineTo(s[0] + pxp * baseW * 0.2, s[1] + pyp * baseW * 0.2); x.stroke();
        x.restore();
        // pools swelling along the river — placed ONLY on the in-frame stretch so
        // the focal swells always land in view (no empty river off-screen).
        const inFrame = segs.filter((s) => s[0] > -baseW && s[0] < W + baseW && s[1] > -baseW && s[1] < H + baseW);
        const pool = inFrame.length ? inFrame : segs;
        for (let b = 0; b < K.rint(r, 3, 5); b++) {
          const sp = pool[Math.floor(r() * pool.length)];
          chromeBlob(x, P, sp[0], sp[1], baseW * (1.1 + r() * 1.4), light, P.iridStrength, P.finish, r, seedPhase, noise, 0.22);
        }
      }
      const mainW = minD * (0.13 + r() * 0.06);
      // a genuine diagonal: ~24°..46° below horizontal, routed THROUGH the frame
      // centre so the river commands the whole field corner-to-corner.
      const baseAng = (0.13 + r() * 0.12) * Math.PI; // ~24°..46°
      const axisAng = dir > 0 ? baseAng : Math.PI - baseAng;
      const ux = Math.cos(axisAng), uy = Math.sin(axisAng);
      // back the start off from frame centre just far enough to clear the frame
      // along the axis, so the river sweeps THROUGH centre and fully crosses it.
      const back = Math.hypot(W, H) * 0.62;
      const span = back * 2.2; // travel comfortably across and out the far side
      const cxF = W * 0.5, cyF = H * 0.5;
      const sx = cxF - ux * back, sy = cyF - uy * back;
      river(sx, sy, axisAng, mainW, span, 260, mainW * 0.5, 0.0);
      // 1-2 thinner tributaries on a slightly different angle, also through-centre
      for (let t = 0; t < K.rint(r, 1, 2); t++) {
        const ta = axisAng + (r() - 0.5) * 0.45;
        const offp = (r() - 0.5) * minD * 0.45; // perpendicular offset so they cross
        const uxt = Math.cos(ta), uyt = Math.sin(ta);
        const tsx = cxF - uxt * back - (-uyt) * offp;
        const tsy = cyF - uyt * back - (uxt) * offp;
        river(tsx, tsy, ta, mainW * (0.42 + r() * 0.3), span, 260, mainW * 0.5, 0.3 + t * 0.2);
      }
    } else { // Macro — TIGHT CROP of two large merging metal bodies
      // A close-up of two comparable lobes caught mid-merge: a clear waist
      // between them (surface tension), both bodies running off the frame edges
      // so it reads as a macro crop of something larger. Confident, frame-filling,
      // unmistakably TWO forms becoming one — not a single disc.
      const sep = minD * (0.30 + r() * 0.06);        // half-distance between lobes
      const mergeAng = r() * Math.PI;                // axis the pair lies along
      const mx = Math.cos(mergeAng), my = Math.sin(mergeAng);
      const cX = W * (0.5 + (r() - 0.5) * 0.1), cY = H * (0.5 + (r() - 0.5) * 0.1);
      const R1 = minD * (0.40 + r() * 0.08);
      const R2 = R1 * (0.78 + r() * 0.18);            // comparable, slightly smaller
      const a1x = cX - mx * sep, a1y = cY - my * sep;
      const a2x = cX + mx * sep, a2y = cY + my * sep;
      groundReflection(cX, cY + R1 * 0.7, R1 * 2.0);
      // wide merge waist connecting them (the meniscus)
      x.save();
      const ng = x.createLinearGradient(a1x, a1y, a2x, a2y);
      ng.addColorStop(0, K.mix(P.metal, '#ffffff', 0.5));
      ng.addColorStop(0.5, K.mix(P.metal, '#06070c', 0.25));
      ng.addColorStop(1, K.mix(P.metal, '#ffffff', 0.5));
      x.strokeStyle = ng; x.lineWidth = Math.min(R1, R2) * 1.15; x.lineCap = 'round';
      x.beginPath(); x.moveTo(a1x, a1y); x.lineTo(a2x, a2y); x.stroke();
      x.restore();
      // the two lobes — higher wobble so each reads as living liquid metal. Draw
      // smaller behind, hero lobe last & on top for clear dominance.
      chromeBlob(x, P, a2x, a2y, R2, light, P.iridStrength, P.finish, r, seedPhase + 0.04, noise, 0.22 + r() * 0.1);
      chromeBlob(x, P, a1x, a1y, R1, light, P.iridStrength, P.finish, r, seedPhase, noise, 0.2 + r() * 0.1);
      // surface-tension droplets pinching off along the waist for life
      for (let i = 0; i < K.rint(r, 3, 5); i++) {
        const t = 0.32 + r() * 0.36;
        const px = a1x + (a2x - a1x) * t + (r() - 0.5) * R1 * 0.4;
        const py = a1y + (a2y - a1y) * t + (r() - 0.5) * R1 * 0.4;
        chromeBlob(x, P, px, py, minD * (0.03 + r() * 0.05), light, P.iridStrength, P.finish, r, seedPhase, noise, 0.28);
      }
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

  return { name: 'quicksilver3', draw, traits };
})();
