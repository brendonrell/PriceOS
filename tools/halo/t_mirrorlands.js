/* MIRROR LANDS — a folded, mirrored surreal landscape with WRONG reflections.
 *
 * A vast still mirror-water plain meets a strange land + sky. The reflection
 * below the seam DOES NOT MATCH the world above: a second sun, inverted /
 * shifted colour, different massif silhouettes, an offset horizon. The "real
 * but off" lives in the disagreement between world and mirror — clearly
 * intentional, never a bug. Impossible symmetry / an Escher fold along the
 * luminous seam where world meets mirror. Floating forms, distant abstract
 * massifs, calm uncanny stillness.
 *
 * COLOUR: turquoise/teal mirror-water under a lilac/lavender/orchid sky, with
 * coral or warm-gold as the SINGLE counterpoint accent (the reflection may
 * invert that accent toward its opposite). Reads "turquoise water under a lilac
 * sky" from afar.
 *
 * Semi-abstract bold shapes, deep haze, luminous seam. NOT outrun (no neat
 * grid, no regular mirror stripes), NOT cyberpunk, NOT chrome. */
window.ENGINE = (function () {
  const K = window.KIT;

  // sky1 = zenith lilac, sky2 = horizon lavender glow, water = mirror teal,
  // accent = coral/gold counterpoint, alt = the WRONG reflection accent,
  // haze = atmosphere wash, ink = silhouettes / deep murk, lite = high light.
  const PALS = [
    { name: 'Orchid Lagoon',  sky1: '#3a2466', sky2: '#b07ad6', water: '#1fb6b0', accent: '#ff8a5c', alt: '#5cd0ff', haze: '#9b7ad0', ink: '#10142e', lite: '#e8d8ff' },
    { name: 'Lavender Tide',  sky1: '#43306f', sky2: '#c89ae0', water: '#2bc2c8', accent: '#ffb05c', alt: '#7ad4ff', haze: '#ab8ad8', ink: '#121636', lite: '#f0e2ff' },
    { name: 'Teal Vespers',   sky1: '#2c2a63', sky2: '#a17ed0', water: '#14a8a0', accent: '#ff6f7e', alt: '#62e0d0', haze: '#8a7ac8', ink: '#0c1230', lite: '#dcd2ff' },
    { name: 'Aqua Iris',      sky1: '#382a72', sky2: '#bd8ee2', water: '#24cabb', accent: '#ffc15c', alt: '#86c8ff', haze: '#9c84d6', ink: '#0e1434', lite: '#ecdfff' },
    { name: 'Mirage Orchid',  sky1: '#46276b', sky2: '#cf8fd8', water: '#1cbcae', accent: '#ff7a96', alt: '#6cd6e8', haze: '#b07ec6', ink: '#130f30', lite: '#f2dcf2' },
    { name: 'Glass Lavandin', sky1: '#332766', sky2: '#b39ae6', water: '#2ec6c0', accent: '#ffa85a', alt: '#8ad0ff', haze: '#9a86d8', ink: '#0d1232', lite: '#e6dcff' },
    { name: 'Coral Reflect',  sky1: '#3e2a6e', sky2: '#c490d6', water: '#19b2ac', accent: '#ff7050', alt: '#54d8e0', haze: '#a47cc8', ink: '#110f2c', lite: '#efd8f0' },
    { name: 'Pale Anemone',   sky1: '#2e2a60', sky2: '#ad8edc', water: '#26bcc6', accent: '#ffcf72', alt: '#74d2ff', haze: '#8e84cc', ink: '#0b1130', lite: '#e0d8ff' },
  ];

  const FMTS = [ { W: 1500, H: 1000, t: 'Vista' }, { W: 1320, H: 1320, t: 'Window' }, { W: 1040, H: 1440, t: 'Portal' } ];
  const LANDS = ['Massifs', 'Spires', 'Mesa', 'Archipelago', 'Monoliths'];
  const FOLDS = ['Clean Seam', 'Escher Fold', 'Offset Horizon'];
  const WRONGS = ['Second Sun', 'Inverted Colour', 'Phantom Land', 'Shifted Forms'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const land = K.pick(LANDS, r);
    const fold = K.pick(FOLDS, r);
    const wrong = K.pick(WRONGS, r);
    const floaters = K.rint(r, 2, 5);
    const twin = r() < 0.6;            // second sun in the reflection
    const rings = r() < 0.4;
    const event = r() < 0.08 ? K.pick(['Total Inversion', 'Twin Eclipse', 'Folded Sky'], r) : null;
    return { pal, fmt, land, fold, wrong, floaters, twin, rings, event };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    const t = { Palette: p.pal.name, Format: p.fmt.t, Land: p.land, Fold: p.fold, Mirror: p.wrong };
    if (p.event) t.Event = p.event;
    return t;
  }

  /* ── invert a hex toward its hue-opposite (the WRONG reflection tint) ── */
  function invertHue(hex) {
    const c = K.h2r(hex);
    return K.r2h([255 - c[0], 255 - c[1], 255 - c[2]]);
  }

  /* ── SKY: lilac zenith → lavender horizon, soft glow lobe, cool-warm depth ── */
  function sky(x, P, W, hY, noise, r) {
    const g = x.createLinearGradient(0, 0, 0, hY);
    g.addColorStop(0, K.mix(P.sky1, '#000', 0.22));
    g.addColorStop(0.34, P.sky1);
    g.addColorStop(0.74, K.mix(P.sky1, P.sky2, 0.55));
    g.addColorStop(1, K.mix(P.sky2, P.lite, 0.18));
    x.fillStyle = g; x.fillRect(0, 0, W, hY);
    // broad lavender glow seated on the horizon
    x.save(); x.globalCompositeOperation = 'screen';
    const gl = x.createRadialGradient(W * 0.5, hY, 0, W * 0.5, hY, W * 0.7);
    gl.addColorStop(0, K.rgba(P.sky2, 0.3)); gl.addColorStop(0.5, K.rgba(P.sky2, 0.11)); gl.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gl; x.fillRect(0, 0, W, hY); x.restore();
  }

  /* ── soft horizontal cloud strata, feathered & wavy (not flat bars) ── */
  function strata(x, P, W, hY, r, noise) {
    x.save(); x.globalCompositeOperation = 'screen';
    const n = K.rint(r, 6, 10);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const yc = hY * (0.2 + 0.74 * t) - r() * 12;
      const h = 14 + r() * 60 * (0.5 + t);
      const a = (0.04 + t * 0.1) * (0.5 + r());
      const col = K.mix(P.haze, P.sky2, t * 0.5);
      const gg = x.createLinearGradient(0, yc - h, 0, yc + h);
      gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(0.5, K.rgba(col, a)); gg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gg;
      x.beginPath(); x.moveTo(0, yc - h);
      for (let xx = 0; xx <= W; xx += 24) { const yy = yc - h + noise.fbm(xx / 240, i * 3.1, 3) * 20; x.lineTo(xx, yy); }
      for (let xx = W; xx >= 0; xx -= 24) { const yy = yc + h + noise.fbm(xx / 220, i * 3.1 + 9, 3) * 20; x.lineTo(xx, yy); }
      x.closePath(); x.fill();
    }
    x.restore();
  }

  /* ── a celestial sun / body: scatter halo, jewel disc, soft mottling ── */
  function sun(x, P, noise, cx, cy, rad, col, r, opts) {
    opts = opts || {};
    const rings = !!opts.rings, eclipse = !!opts.eclipse;
    K.bloom(x, cx, cy, rad * 3.4, col, 0.32);
    K.bloom(x, cx, cy, rad * 1.7, K.mix(col, '#fff', 0.4), 0.36);
    if (eclipse) {
      // dark disc + bright limb (twin eclipse / wrong sun)
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 120; i++) { const a = r() * Math.PI * 2, len = rad * (1.05 + r() * 1.5); x.strokeStyle = K.rgba(col, 0.04 + r() * 0.07); x.lineWidth = 0.7 + r() * 1.8; x.beginPath(); x.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); x.stroke(); }
      x.restore();
      const g = x.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad * 1.02);
      g.addColorStop(0, K.mix(P.ink, '#000', 0.35)); g.addColorStop(0.9, K.mix(P.ink, '#000', 0.35)); g.addColorStop(0.97, K.rgba(col, 0.7)); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad * 1.02, 0, Math.PI * 2); x.fill();
      return;
    }
    const lx = cx - rad * 0.3, ly = cy - rad * 0.32;
    // flatter, jewel-like disc — NOT a glossy CGI ball. soft off-center lift.
    const g = x.createRadialGradient(lx, ly, rad * 0.12, cx, cy, rad * 1.06);
    g.addColorStop(0, K.mix(col, '#ffffff', 0.34));
    g.addColorStop(0.45, col);
    g.addColorStop(0.82, K.mix(col, P.ink, 0.36));
    g.addColorStop(1, K.mix(col, P.ink, 0.58));
    x.save();
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.clip();
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    // heavier surface mottle — weight & strangeness, broad fbm patches
    x.globalCompositeOperation = 'overlay';
    const step = Math.max(2, Math.floor(rad / 44));
    for (let yy = cy - rad; yy < cy + rad; yy += step) {
      for (let xx = cx - rad; xx < cx + rad; xx += step) {
        const jx = xx + (r() - 0.5) * step, jy = yy + (r() - 0.5) * step;
        const nn = noise.fbm(jx / (rad * 0.42), jy / (rad * 0.42), 5, 0.55, 2.2);
        if (nn > 0.02) { x.fillStyle = K.rgba(K.mix(col, '#fff', 0.5), Math.min(0.5, nn * 0.46)); x.fillRect(jx, jy, step * 1.7, step * 1.7); }
        else if (nn < -0.04) { x.fillStyle = K.rgba(K.mix(col, P.ink, 0.7), Math.min(0.48, -nn * 0.46)); x.fillRect(jx, jy, step * 1.7, step * 1.7); }
      }
    }
    // faint banding so big bodies read as strange planets, not balls
    if (rad > 60 && r() < 0.6) {
      const bn = K.rint(r, 3, 6);
      for (let i = 0; i < bn; i++) {
        const by = cy - rad + (i + r() * 0.6) * (2 * rad / bn);
        x.fillStyle = K.rgba(i % 2 ? K.mix(col, '#fff', 0.4) : K.mix(col, P.ink, 0.5), 0.1 + r() * 0.08);
        x.fillRect(cx - rad, by, rad * 2, (2 * rad / bn) * (0.4 + r() * 0.4));
      }
    }
    // terminator: soft dark crescent (off, strange lighting)
    x.globalCompositeOperation = 'multiply';
    const tg = x.createRadialGradient(lx, ly, rad * 0.2, cx + rad * 0.3, cy + rad * 0.3, rad * 1.5);
    tg.addColorStop(0, 'rgba(255,255,255,1)'); tg.addColorStop(0.55, 'rgba(255,255,255,1)'); tg.addColorStop(1, K.rgba(P.ink, 0.7));
    x.fillStyle = tg; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    x.restore();
    // small specular kiss, gentle (not a glossy hotspot)
    K.sheen(x, lx, ly, rad * 0.45, K.mix(col, '#fff', 0.45), 0.24);
    if (rings) {
      x.save(); x.translate(cx, cy); x.rotate(-0.4 + r() * 0.5); x.scale(1, 0.22 + r() * 0.08);
      x.globalCompositeOperation = 'screen';
      const rr0 = rad * (1.4 + r() * 0.3);
      for (let k = 0; k < 4; k++) { const rr = rr0 + k * rad * (0.08 + r() * 0.04); x.strokeStyle = K.rgba(K.mix(col, '#fff', 0.4 - k * 0.05), 0.16 - k * 0.02); x.lineWidth = rad * (0.05 + r() * 0.03); x.beginPath(); x.arc(0, 0, rr, 0.1 + r() * 0.3, Math.PI * 2 - r() * 0.3); x.stroke(); }
      x.restore();
    }
  }

  /* ── distant abstract massif / land silhouette as a single layer.
       returns the silhouette path-builder so the reflection can re-use a
       DIFFERENT one (the wrongness). Draws into the sky band above hY. ── */
  function landBand(x, P, W, hY, kind, col, r, noise, depth, seedShift) {
    // depth 0 = farthest/faintest, 1 = nearest. shifts colour toward haze.
    const c = K.mix(col, P.haze, (1 - depth) * 0.6);
    const baseY = hY - depth * hY * 0.14; // nearer bands sit lower
    const amp = 36 + depth * 90;          // overall height of the mass
    const pts = [];
    if (kind === 'Spires') {
      // jagged eroded peaks — a sharp ridgeline, NOT rectangular towers
      for (let xx = 0; xx <= W; xx += 6) {
        const ridge = Math.abs(noise.fbm(xx / (90 - depth * 30) + seedShift, depth * 5 + 2, 4));
        const spike = Math.pow(ridge, 0.5);
        const yy = baseY - amp * (0.25 + spike * 1.05) - noise.fbm(xx / 300 + seedShift, 9, 3) * amp * 0.4;
        pts.push([xx, yy]);
      }
    } else if (kind === 'Mesa') {
      // stepped tablelands — broad flat plateaus joined by soft talus, eroded
      let xx = 0, lev = baseY - amp * (0.4 + r() * 0.5);
      while (xx < W) {
        const w = W * (0.08 + r() * 0.2);
        const tilt = (r() - 0.5) * amp * 0.25;
        for (let k = 0; k <= w; k += 8) { const tt = k / w; pts.push([xx + k, lev + tilt * tt + noise.fbm((xx + k) / 80 + seedShift, 4, 2) * amp * 0.12]); }
        xx += w; lev = baseY - amp * (0.3 + r() * 0.6);
      }
    } else if (kind === 'Archipelago') {
      // scattered low domed islands floating in the haze
      let xx = -W * 0.05;
      while (xx < W) {
        const w = W * (0.07 + r() * 0.16), h = amp * (0.4 + r() * 0.7);
        for (let k = 0; k <= w; k += 7) { const tt = k / w; const yy = baseY - Math.sin(tt * Math.PI) * h * (0.55 + 0.45 * noise.fbm(k / 70 + seedShift, depth * 7, 2)); pts.push([xx + k, Math.min(baseY, yy)]); }
        const gap = W * (0.03 + r() * 0.07);
        pts.push([xx + w + gap * 0.5, baseY]);
        xx += w + gap;
      }
    } else if (kind === 'Monoliths') {
      // a few narrow leaning standing-stones with eroded tops — strange, sparse
      const n = K.rint(r, 3, 5);
      let xx = W * (0.05 + r() * 0.1);
      pts.push([0, baseY]);
      for (let i = 0; i < n; i++) {
        const w = W * (0.018 + r() * 0.035), h = amp * (1.3 + r() * 1.7);
        const lean = (r() - 0.5) * h * 0.22;
        pts.push([xx, baseY]);
        pts.push([xx + lean * 0.4, baseY - h * 0.5]);
        pts.push([xx + lean, baseY - h]);
        // eroded chipped top
        for (let k = 0; k <= w; k += 4) { const tt = k / w; pts.push([xx + lean + k, baseY - h + noise.fbm((xx + k) / 22 + seedShift, i * 3, 2) * h * 0.16]); }
        pts.push([xx + w + lean, baseY - h * 0.5]);
        pts.push([xx + w, baseY]);
        xx += w + W * (0.1 + r() * 0.16);
        if (xx < W) pts.push([xx, baseY]);
      }
      pts.push([W, baseY]);
    } else { // Massifs — rolling abstract mountain mass (default, organic)
      for (let xx = 0; xx <= W; xx += 8) {
        const yy = baseY - amp * (0.5 + 0.5 * noise.fbm(xx / (300 - depth * 90) + seedShift, depth * 11, 4))
                 - Math.sin(xx / W * Math.PI * (1 + r() * 0.6) + seedShift) * amp * 0.4;
        pts.push([xx, yy]);
      }
    }
    // fill the silhouette with a soft vertical gradient (top catches sky light)
    const topY = pts.reduce((m, p) => Math.min(m, p[1]), hY);
    const gg = x.createLinearGradient(0, topY, 0, baseY + 4);
    gg.addColorStop(0, K.mix(c, P.lite, 0.12));
    gg.addColorStop(0.5, c);
    gg.addColorStop(1, K.mix(c, P.ink, 0.4));
    x.save(); x.fillStyle = gg;
    x.beginPath(); x.moveTo(0, baseY + 4);
    for (const p of pts) x.lineTo(p[0], p[1]);
    x.lineTo(W, baseY + 4); x.closePath(); x.fill();
    // thin rim-light along the silhouette crest from the lavender sky
    x.globalCompositeOperation = 'screen';
    x.strokeStyle = K.rgba(K.mix(P.sky2, P.lite, 0.4), 0.14 + depth * 0.1); x.lineWidth = 1.2;
    x.beginPath();
    for (let i = 0; i < pts.length; i++) x[i ? 'lineTo' : 'moveTo'](pts[i][0], pts[i][1]);
    x.stroke();
    x.restore();
  }

  /* ── the WRONG land seen across the mirror-water: calm, low, strange forms
       that grow UP from below the seam (as if a far shore on the other side),
       receding DOWN and fading into teal. Deliberately distinct from the world
       above — fewer, simpler, uncanny silhouettes, never chaotic spikes. ── */
  function mirrorLand(x, P, W, H, hY, kind, col, r, noise, depth, seedShift) {
    // forms sit a little below the seam and reach back UP toward it
    const rootY = hY + (H - hY) * (0.06 + depth * 0.14); // base recedes down with depth
    const amp = (24 + depth * 46);
    const c = K.mix(col, P.water, (1 - depth) * 0.4);
    const pts = [[0, rootY]];
    if (kind === 'Archipelago' || kind === 'Massifs') {
      // soft low domes — calm distant shore
      for (let xx = 0; xx <= W; xx += 8) {
        const yy = rootY - amp * (0.5 + 0.5 * noise.fbm(xx / 220 + seedShift, depth * 6, 3))
                 - Math.abs(Math.sin(xx / W * Math.PI * (1 + r() * 0.4) + seedShift)) * amp * 0.5;
        pts.push([xx, yy]);
      }
    } else if (kind === 'Monoliths' || kind === 'Spires') {
      // a few isolated standing forms — strange uprights rising toward the seam
      const n = K.rint(r, 2, 4);
      let xx = W * (0.08 + r() * 0.1);
      for (let i = 0; i < n; i++) {
        const w = W * (0.04 + r() * 0.06), h = amp * (1.2 + r() * 1.6);
        const lean = (r() - 0.5) * w * 0.6;
        pts.push([xx, rootY], [xx + lean, rootY - h], [xx + w + lean, rootY - h], [xx + w, rootY]);
        xx += w + W * (0.1 + r() * 0.16);
      }
    } else { // Mesa — broad soft tables with rounded, eroded shoulders
      let xx = -W * 0.05;
      while (xx < W) {
        const w = W * (0.22 + r() * 0.26), h = amp * (0.7 + r() * 0.8);
        for (let k = 0; k <= w; k += 8) {
          const tt = k / w;
          // flat-ish center, rounded falloff at the two ends
          const shoulder = Math.min(1, Math.sin(tt * Math.PI) * 2.2);
          const yy = rootY - h * Math.min(1, shoulder) - noise.fbm((xx + k) / 90 + seedShift, 4, 2) * h * 0.14;
          pts.push([xx + k, Math.min(rootY, yy)]);
        }
        xx += w + W * (0.03 + r() * 0.06);
      }
    }
    pts.push([W, rootY]);
    const topY = pts.reduce((m, p) => Math.min(m, p[1]), rootY);
    const gg = x.createLinearGradient(0, topY, 0, rootY + 30);
    gg.addColorStop(0, K.mix(c, P.lite, 0.16));
    gg.addColorStop(0.6, c);
    gg.addColorStop(1, K.mix(c, P.water, 0.7)); // dissolve into the water
    x.save(); x.fillStyle = gg;
    x.beginPath(); x.moveTo(0, rootY + 30);
    for (const p of pts) x.lineTo(p[0], p[1]);
    x.lineTo(W, rootY + 30); x.closePath(); x.fill();
    // glassy reflection smear hanging below each crest (it's on water)
    x.globalCompositeOperation = 'screen';
    x.strokeStyle = K.rgba(K.mix(P.lite, P.water, 0.4), 0.1 + depth * 0.08); x.lineWidth = 1;
    x.beginPath(); for (let i = 0; i < pts.length; i++) x[i ? 'lineTo' : 'moveTo'](pts[i][0], pts[i][1]); x.stroke();
    x.restore();
  }

  /* ── floating forms suspended over the seam (calm, uncanny) ── */
  function floaters(x, P, noise, W, hY, n, r) {
    for (let i = 0; i < n; i++) {
      const fx = W * (0.1 + r() * 0.8), fy = hY * (0.18 + r() * 0.5);
      const fr = W * (0.012 + r() * 0.04);
      const shape = K.rint(r, 0, 2);
      const col = r() < 0.5 ? K.mix(P.haze, P.lite, 0.4) : K.mix(P.accent, P.haze, 0.5);
      K.softShadow(x, fx, fy + fr * 1.4, fr * 2.2, 0.12);
      x.save();
      x.fillStyle = K.rgba(col, 0.78);
      if (shape === 0) { // slab
        x.translate(fx, fy); x.rotate((r() - 0.5) * 0.3);
        x.fillRect(-fr, -fr * 0.5, fr * 2, fr);
      } else if (shape === 1) { // disc
        x.beginPath(); x.arc(fx, fy, fr, 0, Math.PI * 2); x.fill();
      } else { // shard
        x.translate(fx, fy); x.rotate(r() * Math.PI);
        x.beginPath(); x.moveTo(0, -fr); x.lineTo(fr * 0.7, fr); x.lineTo(-fr * 0.7, fr * 0.6); x.closePath(); x.fill();
      }
      x.restore();
      K.bloom(x, fx, fy, fr * 2.4, col, 0.1);
    }
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const noise2 = K.makeNoise(seed ^ 0x9e3779b9); // independent field for the WRONG reflection

    // seam (the mirror line) — slightly above mid so sky dominates
    const hY = H * (p.fmt.t === 'Portal' ? 0.5 : 0.46) + (r() - 0.5) * H * 0.04;
    const offset = (p.fold === 'Offset Horizon') ? H * (0.04 + r() * 0.05) : 0; // reflection horizon offset

    // ============ WORLD ABOVE ============
    sky(x, P, W, hY, noise, r);
    strata(x, P, W, hY, r, noise);

    // sky-side volumetric haze (large slow strata only)
    K.hazeSheet(x, W, hY, noise, K.mix(P.haze, P.sky1, 0.2), 0.13, 460 + r() * 200, 'screen');
    K.hazeSheet(x, W, hY, noise, K.mix(P.haze, P.sky2, 0.3), 0.08, 300 + r() * 120, 'screen');

    // primary sun high in the lilac sky (warm/gold counterpoint accent)
    const sunR = W * (0.07 + r() * 0.05);
    const sunX = W * (0.24 + r() * 0.52), sunY = hY * (0.26 + r() * 0.4);
    const sunCol = K.mix(P.accent, P.lite, 0.25);

    // distant massif layers (far→near) ABOVE — last band is the boldest/nearest
    const landKindsAbove = p.land;
    const bands = K.rint(r, 2, 3);
    for (let b = 0; b < bands; b++) {
      const depth = b / Math.max(1, bands - 1);
      const dramatic = (b === bands - 1) ? depth + 0.25 : depth * 0.85; // push the near band taller
      landBand(x, P, W, hY, landKindsAbove, K.mix(P.ink, P.haze, 0.35 + depth * 0.1), r, noise, dramatic, b * 4.3);
    }

    // the sun itself (after far massifs so it can sit behind near ones; simple: draw on top of far, before nearest handled by depth — keep on top of sky)
    sun(x, P, noise, sunX, sunY, sunR, sunCol, r, { rings: p.rings, eclipse: p.event === 'Twin Eclipse' });

    floaters(x, P, noise, W, hY, p.floaters, r);

    // soft haze hugging the seam from above
    x.save(); x.globalCompositeOperation = 'screen';
    const hb = x.createLinearGradient(0, hY - H * 0.1, 0, hY);
    hb.addColorStop(0, 'rgba(0,0,0,0)'); hb.addColorStop(1, K.rgba(P.haze, 0.2));
    x.fillStyle = hb; x.fillRect(0, hY - H * 0.1, W, H * 0.1); x.restore();

    // ============ THE MIRROR BELOW (wrong reflection) ============
    // Decide the reflection's colour identity by the wrongness mode.
    const inverted = (p.wrong === 'Inverted Colour' || p.event === 'Total Inversion');
    const refWater = P.water;
    const refSkyTint = inverted ? invertHue(P.sky2) : P.sky2;
    const refAccent = inverted ? P.alt : (p.wrong === 'Second Sun' ? P.alt : P.accent);

    // base mirror gradient: at the seam it glows with sky/water mix, deepening
    // into teal then dark toward the bottom. This is the turquoise water.
    const wg = x.createLinearGradient(0, hY, 0, H);
    wg.addColorStop(0, K.mix(refSkyTint, refWater, 0.4));
    wg.addColorStop(0.18, K.mix(refWater, P.lite, 0.1));
    wg.addColorStop(0.6, refWater);
    wg.addColorStop(1, K.mix(refWater, P.ink, 0.66));
    x.fillStyle = wg; x.fillRect(0, hY, W, H - hY);

    // wrong sky tint bleeding up from the water at the seam (the OTHER sky)
    x.save(); x.globalCompositeOperation = 'screen';
    const rsg = x.createLinearGradient(0, hY, 0, hY + (H - hY) * 0.5);
    rsg.addColorStop(0, K.rgba(refSkyTint, 0.24)); rsg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rsg; x.fillRect(0, hY, W, (H - hY) * 0.5); x.restore();

    // WRONG land — calm, upright, deliberately different forms drawn below the
    // seam with an independent noise field + tint (the disagreement).
    x.save(); x.beginPath(); x.rect(0, hY + offset, W, H - hY - offset); x.clip();
    const altLand = LANDS[(LANDS.indexOf(p.land) + 1 + K.rint(r, 0, 2)) % LANDS.length];
    const rb = K.rng(seed ^ 0x5bd1e995); // separate stream so layout differs
    const rbands = (p.wrong === 'Phantom Land' || p.wrong === 'Shifted Forms') ? K.rint(rb, 2, 3) : K.rint(rb, 1, 2);
    const seamY = hY + offset;
    for (let b = rbands - 1; b >= 0; b--) { // far (high depth) first, near last
      const depth = b / Math.max(1, rbands - 1);
      const lc = inverted ? K.mix(invertHue(P.ink), refWater, 0.34 + depth * 0.1) : K.mix(P.ink, refWater, 0.4 + depth * 0.14);
      mirrorLand(x, { ...P, water: refWater }, W, H, seamY, altLand, lc, rb, noise2, depth * 0.8, b * 7.1 + 13);
    }
    x.restore();

    // SECOND SUN in the reflection (the headline wrongness) — NOT a mirror of
    // the real sun: different position, different colour, sometimes eclipsed.
    if (p.twin || p.wrong === 'Second Sun') {
      // clearly OFFSET from the primary so the disagreement reads (never a
      // straight vertical mirror under the real sun).
      const flip = sunX > W * 0.5 ? -1 : 1;
      let tsX = sunX + flip * W * (0.22 + r() * 0.28);
      tsX = K.clamp(tsX, W * 0.12, W * 0.88);
      const tsY = hY + (H - hY) * (0.22 + r() * 0.42); // genuinely below seam
      const tsR = sunR * (0.7 + r() * 0.7);
      const tsCol = inverted ? P.accent : refAccent;
      x.save(); x.beginPath(); x.rect(0, hY, W, H - hY); x.clip();
      sun(x, P, noise2, tsX, tsY, tsR, tsCol, r, { rings: r() < 0.3, eclipse: p.event === 'Twin Eclipse' || (p.wrong === 'Second Sun' && r() < 0.3) });
      x.restore();
    }

    // LUMINOUS LIGHT-PATH on the water under the primary sun — a broken,
    // shimmering column of reflected light reaching down the still mirror
    // (the signature "light spilling onto water", fbm-textured, never a stripe
    // ladder). Tinted toward the WRONG accent so it disagrees with the real sun.
    x.save(); x.beginPath(); x.rect(0, hY, W, H - hY); x.clip();
    x.globalCompositeOperation = 'lighter';
    const pathX = K.clamp(sunX + (r() - 0.5) * W * 0.12, W * 0.15, W * 0.85);
    const pCol = K.mix(refAccent, P.lite, 0.4);
    for (let yy = hY; yy < H; yy += 4) {
      const t = (yy - hY) / (H - hY);
      const spread = sunR * (0.55 + t * 3.0);
      for (let s = -1; s <= 1; s += 0.12) {
        const fx = pathX + s * spread;
        if (fx < 0 || fx > W) continue;
        const fall = 1 - Math.abs(s);
        const nn = (noise2.fbm(fx / 70, yy / 26 + 5, 4) + 1) / 2;
        const a = 0.1 * fall * (1 - t * 0.7) * nn * nn;
        if (a < 0.012) continue;
        x.fillStyle = K.rgba(K.mix(pCol, refWater, t * 0.5), a);
        x.fillRect(fx + (r() - 0.5) * 5, yy, spread * 0.13 + 3, 4);
      }
    }
    x.restore();

    // mirror-water surface treatment: faint horizontal ripple sheen so it reads
    // as still glassy water. denser near the seam, sparse toward the bottom.
    x.save(); x.beginPath(); x.rect(0, hY, W, H - hY); x.clip();
    x.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 90; i++) {
      const yy = hY + (H - hY) * Math.pow(r(), 1.4);
      const t = (yy - hY) / (H - hY);
      const a = (0.025 + r() * 0.06) * (1 - t * 0.4);
      const wob = noise2.fbm(yy / 18, 7, 2) * 6;
      x.fillStyle = K.rgba(r() < 0.5 ? P.lite : K.mix(refWater, P.lite, 0.3), a);
      x.fillRect(-10 + wob, yy, W + 20, 1 + r() * 2.2);
    }
    x.restore();

    // teal haze rising off the water
    K.hazeSheet(x, W, H, noise2, K.mix(refWater, P.lite, 0.2), 0.07, 320, 'screen');
    // clip-bounded so it only lives below — redo within clip for control
    x.save(); x.beginPath(); x.rect(0, hY, W, H - hY); x.clip();
    K.hazeSheet(x, W, H, noise2, K.mix(refWater, P.haze, 0.4), 0.05, 220, 'screen');
    x.restore();

    // ============ THE LUMINOUS SEAM ============
    x.save();
    // bright thin glow line right at the mirror seam
    x.globalCompositeOperation = 'lighter';
    const seamCol = K.mix(P.lite, P.accent, 0.18);
    const sg = x.createLinearGradient(0, hY - H * 0.05, 0, hY + H * 0.05);
    sg.addColorStop(0, 'rgba(0,0,0,0)');
    sg.addColorStop(0.46, K.rgba(seamCol, 0.0));
    sg.addColorStop(0.5, K.rgba(seamCol, 0.55));
    sg.addColorStop(0.54, K.rgba(seamCol, 0.0));
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sg; x.fillRect(0, hY - H * 0.05, W, H * 0.1);
    // crisp hairline
    x.strokeStyle = K.rgba(P.lite, 0.5); x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(0, hY); x.lineTo(W, hY); x.stroke();
    x.restore();
    // soft bloom seated on the seam under the sun (light spilling onto water)
    K.bloom(x, sunX, hY, sunR * 2.4, K.mix(P.accent, P.lite, 0.3), 0.16);

    // ============ ESCHER FOLD seam treatment ============
    if (p.fold === 'Escher Fold') {
      // a vertical fold: mirror a slab of the world across a vertical seam too,
      // making land fold back on itself. Drawn as a subtle ghosted overlay.
      x.save();
      const fx = W * (0.3 + r() * 0.4);
      x.globalAlpha = 0.4; x.globalCompositeOperation = 'overlay';
      x.translate(2 * fx, 0); x.scale(-1, 1);
      x.beginPath(); x.rect(fx, 0, W - fx, hY); x.clip();
      // re-draw a faint massif echo folded
      landBand(x, P, W, hY, p.land, K.mix(P.haze, P.lite, 0.2), K.rng(seed ^ 0x12345), noise, 0.5, 21);
      x.restore();
      // vertical seam glow
      x.save(); x.globalCompositeOperation = 'lighter';
      const vg = x.createLinearGradient(fx - 30, 0, fx + 30, 0);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.5, K.rgba(P.lite, 0.18)); vg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = vg; x.fillRect(fx - 30, 0, 60, hY); x.restore();
    }

    // ============ ATMOSPHERE + MOTES + FINISH ============
    // floating motes high in the sky for life/scale
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 110; i++) { const mx = r() * W, my = r() * hY * 0.96; const s = r() * 1.5 + 0.3; x.fillStyle = K.rgba(r() < 0.3 ? P.accent : P.lite, 0.06 + r() * 0.26); x.beginPath(); x.arc(mx, my, s, 0, Math.PI * 2); x.fill(); }
    x.restore();

    // global atmosphere wash
    K.hazeSheet(x, W, H, noise, K.mix(P.sky2, P.haze, 0.5), 0.04, 200, 'screen');
    K.mottle(x, 0, 0, W, H, P.haze, 2600, r, 'overlay');

    K.grain(x, W, H, 540, r);
    K.chromaSplit(x, W, H, 1);
    x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.3); x.restore();
    // gentle top darkening for depth
    const tg = x.createLinearGradient(0, 0, 0, H); tg.addColorStop(0, K.rgba(K.mix(P.sky1, '#000', 0.4), 0.26)); tg.addColorStop(0.38, 'rgba(0,0,0,0)'); x.fillStyle = tg; x.fillRect(0, 0, W, H);

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 't_mirrorlands', draw, traits };
})();
