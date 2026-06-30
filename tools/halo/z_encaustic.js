/* ENCAUSTIC — pooled, layered molten wax (translucent pigmented beeswax).
 * Pours and pools of warm wax built up in semi-transparent layers: embedded
 * depth, soft fused edges, scrape-marks dragged through the surface, trapped
 * bubbles, a buttery luminous skin lit from inside the layers.
 * SURREAL = real-but-off: wax holding depth & shapes no pour could settle into.
 * ABSTRACT material field — fills the whole frame, no scene/horizon/object.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT preloaded.
 *
 * This is a CONTINUOUS system, not a template picker. Every salient parameter
 * — zoom, density, focal placement, counts, sizes, proportions, rotations,
 * spacings, curvature, asymmetry, format aspect, AND the colour VALUES (hue /
 * sat / value jittered within the warm-wax world) — is sampled continuously
 * from the seed. There are no discrete "mode × palette" buckets that could
 * collide into twins; the structural families are soft tendencies that blend,
 * and within any family the sub-elements (counts, placements, scales, focal
 * position, crop/zoom) are re-randomised so two same-family pieces still differ
 * a lot. The texture/haze/vignette grade and the warm-wax palette-world are
 * preserved verbatim. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* ── Palette world: WARM WAX — honey, milk-white, amber, pale ochre, smoke,
     a faint blush. Translucent & buttery. Two seeds cool toward grey-green wax.
     base = deep wax bed · pools[] = pigment films (mid→light) · skin = milk-
     white top film · glow = inner light · deep = trapped shadow · ink = furrow. */
  const PALS = [
    { name: 'Honeycomb',
      base: '#6b4420', pools: ['#9c6e30', '#c2934a', '#d8b066', '#e8cd92', '#f1e1ba'],
      skin: '#f7eccf', glow: '#ffe2a0', deep: '#33200d', ink: '#4a2f15', rare: false },
    { name: 'Milk & Amber',
      base: '#9c7e50', pools: ['#bd9356', '#d3ad72', '#e3c690', '#eedab2', '#f7ecd8'],
      skin: '#fbf3e4', glow: '#ffe6bc', deep: '#5c3e22', ink: '#6e4c2b', rare: false },
    { name: 'Pale Ochre',
      base: '#7a5f33', pools: ['#a78544', '#c2a164', '#d6bd8c', '#e6d3a8', '#f0e4c8'],
      skin: '#f4ead0', glow: '#ffdf98', deep: '#3e2c11', ink: '#54391b', rare: false },
    { name: 'Smoke & Tallow',
      base: '#534b3e', pools: ['#746955', '#8a7e68', '#a89c84', '#c6bca2', '#e2dac4'],
      skin: '#efe9da', glow: '#efdcb2', deep: '#27231b', ink: '#363026', rare: false },
    { name: 'Blush Wax',  // rare — a faint blush leans the honey warm-pink
      base: '#7c4d3b', pools: ['#a9745a', '#c5957a', '#dab39a', '#ead0bd', '#f4e4d6'],
      skin: '#f8ebdf', glow: '#ffceac', deep: '#3e211a', ink: '#5e3526', rare: true },
    { name: 'Verdant Tallow',  // rare — cool grey-green wax variant
      base: '#4e5346', pools: ['#6e7460', '#8a907a', '#a6ac90', '#c4c8ac', '#dee0c8'],
      skin: '#eceedb', glow: '#e2dfae', deep: '#24281c', ink: '#343826', rare: true },
  ];

  /* ── Structural FAMILIES: tendencies for how pools arrange, NOT hard buckets.
     The actual layout per seed blends a chosen family with continuous controls
     (focal placement, zoom, density, asymmetry) so two same-family pieces look
     very different. Kept as named tendencies for traits / legibility. ── */
  const FAMILIES = ['Pour', 'Strata', 'Cells', 'Scraped', 'Lens', 'Drift'];

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }
  function pickFamily(r) {
    const w = { Pour: 1.0, Strata: 1.0, Cells: 0.9, Scraped: 1.0, Lens: 0.7, Drift: 0.95 };
    let tot = 0; for (const m of FAMILIES) tot += w[m];
    let t = r() * tot;
    for (const m of FAMILIES) { t -= w[m]; if (t <= 0) return m; }
    return FAMILIES[0];
  }

  /* ── per-seed colour jitter: shift a hex by (hueDeg, satMul, valMul) staying
     inside the warm-wax world. This makes two same-palette seeds differ in tone
     so the swatch is a STARTING POINT, not a fixed value. ── */
  function rgb2hsl(c) {
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    const d = mx - mn;
    if (d > 1e-6) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function jit(hex, dHue, mSat, mVal) {
    const hsl = rgb2hsl(K.h2r(hex));
    return K.hsl2hex(hsl[0] + dHue, K.clamp(hsl[1] * mSat, 0, 1), K.clamp(hsl[2] * mVal, 0, 1));
  }
  /* build a jittered working palette from a base palette + per-seed tone offsets */
  function tonePal(pal, dHue, mSat, mVal) {
    return {
      name: pal.name, rare: pal.rare,
      base: jit(pal.base, dHue, mSat, mVal),
      pools: pal.pools.map((p) => jit(p, dHue, mSat, mVal)),
      skin: jit(pal.skin, dHue * 0.6, mSat, K.clamp(mVal, 0.92, 1.06)),
      glow: jit(pal.glow, dHue * 0.5, mSat, mVal),
      deep: jit(pal.deep, dHue, mSat, mVal),
      ink: jit(pal.ink, dHue, mSat, mVal),
    };
  }

  /* ── a POOLED wax patch: an organic blob with a relatively FIRM body and a
     thin feathered meniscus rim (fused but legible edge). Filled flat (not a
     soft radial cloud) so it reads as a settled pool of pigmented wax, with a
     faint darker rim where the wax pulled up at the edge. ── */
  function pool(x, cx, cy, rad, col, a0, squash, ang, noise, ns, wob) {
    const steps = 60;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, a = t * Math.PI * 2;
      const nx = Math.cos(a), ny = Math.sin(a);
      const n = noise.fbm(nx * 1.5 + ns, ny * 1.5 + ns * 0.7, 3);
      const rr = rad * (1 + n * (wob == null ? 0.22 : wob));
      pts.push([nx * rr, ny * rr]);
    }
    x.save();
    x.translate(cx, cy); x.rotate(ang || 0); x.scale(1, squash || 1);
    // body
    x.beginPath();
    for (let i = 0; i < pts.length; i++) { const p = pts[i]; if (i === 0) x.moveTo(p[0], p[1]); else x.lineTo(p[0], p[1]); }
    x.closePath();
    x.fillStyle = K.rgba(col, a0);
    x.fill();
    // edge meniscus: a slightly darker, thin rim (wax climbs & thickens at edge)
    x.lineWidth = rad * 0.05;
    x.strokeStyle = K.rgba(K.mix(col, '#2a1c0c', 0.3), a0 * 0.5);
    x.stroke();
    // inner light pull (the pool is more translucent at its center)
    const ig = x.createRadialGradient(0, 0, 0, 0, 0, rad);
    ig.addColorStop(0, K.rgba(K.mix(col, '#fff', 0.18), a0 * 0.4));
    ig.addColorStop(0.7, K.rgba(col, 0));
    ig.addColorStop(1, K.rgba(col, 0));
    x.fillStyle = ig;
    x.beginPath();
    for (let i = 0; i < pts.length; i++) { const p = pts[i]; if (i === 0) x.moveTo(p[0], p[1]); else x.lineTo(p[0], p[1]); }
    x.closePath(); x.fill();
    // internal pigment translucency: clip to the pool & wash uneven films so a
    // bright pool reads as translucent wax holding depth, not a flat cutout.
    x.save();
    x.beginPath();
    for (let i = 0; i < pts.length; i++) { const p = pts[i]; if (i === 0) x.moveTo(p[0], p[1]); else x.lineTo(p[0], p[1]); }
    x.closePath(); x.clip();
    x.globalCompositeOperation = 'multiply';
    const veins = 5;
    for (let v = 0; v < veins; v++) {
      const vn = noise.fbm(v * 1.7 + ns, v * 0.9 + ns * 0.5, 2);
      const vx = vn * rad * 0.9, vy = noise.fbm(v * 2.3 + ns + 5, v, 2) * rad * 0.9;
      const vr = rad * (0.3 + (vn + 1) * 0.4);
      const vc = x.createRadialGradient(vx, vy, 0, vx, vy, vr);
      vc.addColorStop(0, K.rgba(K.mix(col, '#3a2a14', 0.5), a0 * 0.18));
      vc.addColorStop(1, K.rgba(col, 0));
      x.fillStyle = vc; x.fillRect(-rad, -rad, rad * 2, rad * 2);
    }
    x.restore();
    x.restore();
  }

  /* trapped air bubble — meniscus ring + specular dot + seated shadow. */
  function bubble(x, cx, cy, rad, glow, deep) {
    x.save();
    x.globalCompositeOperation = 'multiply';
    const sg = x.createRadialGradient(cx, cy, 0, cx, cy, rad * 1.6);
    sg.addColorStop(0, K.rgba(deep, 0)); sg.addColorStop(0.55, K.rgba(deep, 0.24)); sg.addColorStop(1, K.rgba(deep, 0));
    x.fillStyle = sg; x.beginPath(); x.arc(cx, cy, rad * 1.6, 0, 7); x.fill();
    x.restore();
    x.save();
    x.globalCompositeOperation = 'screen';
    x.strokeStyle = K.rgba(glow, 0.55); x.lineWidth = Math.max(0.6, rad * 0.18);
    x.beginPath(); x.arc(cx, cy, rad * 0.84, 0, 7); x.stroke();
    const hg = x.createRadialGradient(cx - rad * 0.3, cy - rad * 0.32, 0, cx - rad * 0.3, cy - rad * 0.32, rad * 0.5);
    hg.addColorStop(0, K.rgba('#ffffff', 0.75)); hg.addColorStop(1, K.rgba('#ffffff', 0));
    x.fillStyle = hg; x.beginPath(); x.arc(cx - rad * 0.3, cy - rad * 0.32, rad * 0.5, 0, 7); x.fill();
    x.restore();
  }

  /* SCRAPE striation field: many fine, slightly-wavering tool grooves running
     across the surface — the encaustic scraper drag. Reads as combed texture,
     NOT a light beam. Each groove is a thin lighter ridge + darker furrow that
     follows the drag direction and wobbles with the surface. */
  function scrapeField(x, W, H, ang, density, skin, ink, noise, ns, strength) {
    x.save();
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const px = -dy, py = dx;
    const cx = W / 2, cy = H / 2;
    const L = Math.hypot(W, H) * 1.2;
    const span = Math.hypot(W, H) * 1.05;
    const lines = Math.max(4, Math.floor(density));
    for (let i = 0; i < lines; i++) {
      const off = (i / (lines - 1) - 0.5) * span;
      // uneven spacing: grooves clump & gap like a real dragged scraper
      const jitter = noise.fbm(i * 0.37 + ns, ns, 3);
      const oo = off + jitter * (span / lines) * 3.2;
      const ox = cx + px * oo, oy = cy + py * oo;
      // each groove covers only part of the sweep (broken combing) & wanders
      const t0 = -0.5 + noise.fbm(i * 0.8 + ns, 7.1, 2) * 0.45;
      const t1 = 0.5 + noise.fbm(i * 0.8 + ns + 11, 3.3, 2) * 0.45;
      const wamp = L * (0.012 + (noise.fbm(i * 0.6 + ns, 2.7, 2) + 1) * 0.012);
      const drift = noise.fbm(i * 0.5 + ns, 9.9, 2) * 0.5; // slow lateral drift
      const segs = 30;
      const ridgeA = strength * (0.18 + (noise.fbm(i * 0.3 + ns, 2.2, 2) + 1) * 0.24);
      const furrowA = strength * 0.5 * (0.25 + (noise.fbm(i * 0.6 + ns, 5.1, 2) + 1) * 0.3);
      // skip the occasional groove entirely for irregular density
      if (noise.fbm(i * 1.3 + ns, 13.0, 2) < -0.55) continue;
      // groove: lighter ridge
      x.globalCompositeOperation = 'overlay';
      x.lineWidth = 1.0 + (noise.fbm(i * 0.5 + 3 + ns, 1.3, 2) + 1) * 1.1;
      x.strokeStyle = K.rgba(skin, ridgeA);
      x.beginPath();
      for (let s = 0; s <= segs; s++) {
        const tt = t0 + (t1 - t0) * (s / segs);
        const along = L * tt;
        const wob = noise.fbm(tt * 2.6 + ns, i * 0.13, 3) * wamp + drift * along * 0.04;
        const sx = ox + dx * along + px * wob;
        const sy = oy + dy * along + py * wob;
        if (s === 0) x.moveTo(sx, sy); else x.lineTo(sx, sy);
      }
      x.stroke();
      // furrow: darker line just beside the ridge
      x.globalCompositeOperation = 'multiply';
      x.lineWidth = 0.8 + (noise.fbm(i * 0.4 + 9 + ns, 1.1, 2) + 1) * 0.7;
      x.strokeStyle = K.rgba(ink, furrowA);
      x.beginPath();
      for (let s = 0; s <= segs; s++) {
        const tt = t0 + (t1 - t0) * (s / segs);
        const along = L * tt;
        const wob = noise.fbm(tt * 2.6 + ns, i * 0.13, 3) * wamp + drift * along * 0.04;
        const sx = ox + dx * along + px * (wob + 2.2);
        const sy = oy + dy * along + py * (wob + 2.2);
        if (s === 0) x.moveTo(sx, sy); else x.lineTo(sx, sy);
      }
      x.stroke();
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const basePal = pickPal(r);
    const family = pickFamily(r);

    /* ── CONTINUOUS MACRO CONTROLS — sampled once, up front, so the whole piece
       is governed by sliders rather than discrete buckets. These are what make
       two same-family / same-palette seeds look nothing alike. ── */
    // per-seed tone jitter inside the warm-wax world
    const dHue = (r() - 0.5) * 26;             // +-13 deg hue swing
    const mSat = 0.78 + r() * 0.5;             // 0.78..1.28 saturation
    const mVal = 0.86 + r() * 0.3;             // 0.86..1.16 value
    const pal = tonePal(basePal, dHue, mSat, mVal);

    // FORMAT — continuous aspect, not 3 fixed sizes. Long edge ~1180.
    const aspect = 0.62 + r() * 0.96;          // 0.62 (tall) .. 1.58 (wide)
    let W, H; const LONG = 1180;
    if (aspect >= 1) { W = LONG; H = Math.round(LONG / aspect); }
    else { H = LONG; W = Math.round(LONG * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);
    const DIAG = Math.hypot(W, H);

    // ZOOM / global scale — packed-tiny ↔ huge-cropped pools. Scales pool radii.
    const zoom = 0.5 + Math.pow(r(), 1.15) * 1.5;   // 0.5 .. 2.0
    // DENSITY — near-empty minimal ↔ dense built-up field.
    const density = 0.22 + Math.pow(r(), 0.85) * 1.35; // 0.22 .. 1.57
    // ASYMMETRY — how far the composition leans off-center / how spread it is.
    const asym = r();
    // FOCAL — placed ANYWHERE (incl. near edges / partial crop), not center-third.
    const focX = W * (0.06 + r() * 0.88);
    const focY = H * (0.06 + r() * 0.88);
    // composition spread radius (how far pools fling from focal)
    const spread = (0.55 + r() * 1.25);

    // value register: most seeds buttery; a continuous run toward "deep" (moody,
    // low-key) for structural rarity — the wax barely catching light.
    const keyT = r();                          // 0 darkest .. 1 brightest
    const deepKey = keyT < 0.2;
    const skinAmt = 0.5 + keyT * 0.7;          // 0.5 .. 1.2
    const glowAmt = 0.55 + keyT * 0.6;         // 0.55 .. 1.15

    // FOCAL ANCHOR presence/scale — sometimes a big bright core, sometimes a
    // small one, sometimes none at all (so not every piece has a milky center).
    const anchorT = r();
    const anchorOn = family !== 'Lens' && anchorT > 0.32;
    const anchorScale = 0.05 + Math.pow(anchorT, 1.4) * 0.16; // tiny..moderate
    // anchor sits at focal but can drift a lot for off-center cores
    const anchorOff = 0.05 + r() * 0.4;

    /* ── 1. WAX BED — fill the whole frame with deep wax + a settling gradient.
       Gradient direction & strength vary so the bed itself isn't a constant. ── */
    x.fillStyle = pal.base; x.fillRect(0, 0, W, H);
    const gAng = r() * Math.PI * 2;
    const gx2 = W * 0.5 + Math.cos(gAng) * W * 0.6, gy2 = H * 0.5 + Math.sin(gAng) * H * 0.6;
    const grad = x.createLinearGradient(W * 0.5 - Math.cos(gAng) * W * 0.6, H * 0.5 - Math.sin(gAng) * H * 0.6, gx2, gy2);
    grad.addColorStop(0, K.rgba(K.mix(pal.base, pal.pools[1], 0.4 + r() * 0.3), 0.35 + r() * 0.3));
    grad.addColorStop(0.5, K.rgba(pal.base, 0.1));
    grad.addColorStop(1, K.rgba(pal.deep, 0.4 + r() * 0.3));
    x.fillStyle = grad; x.fillRect(0, 0, W, H);

    /* ── 2. GROUND POOLS — a first pass of broad translucent films, scattered
       across the frame so the surface reads as continuous built-up wax. Count,
       placement, size and flatness all ride density/zoom/asym. At low density
       this is sparse (minimal pieces); at high density it packs the frame. ── */
    x.save();
    x.globalCompositeOperation = 'multiply';
    const groundN = Math.max(3, Math.round((6 + r() * 9) * density));
    const cols = 2 + (r() * 3 | 0);
    const rows = Math.max(2, Math.ceil(groundN / cols));
    for (let i = 0; i < groundN; i++) {
      // scatter on a jittered grid biased by asymmetry toward one quadrant
      const gxBase = (i % cols + 0.5) / cols * W;
      const gyBase = (Math.floor(i / cols) % rows + 0.5) / rows * H;
      const lean = (asym - 0.5);
      const gx = gxBase + (r() - 0.5) * W * (0.4 + asym * 0.4) + lean * W * 0.25;
      const gy = gyBase + (r() - 0.5) * H * (0.35 + asym * 0.4) - lean * H * 0.2;
      const col = pal.pools[1 + (r() * 3 | 0)];
      const rad = S * (0.12 + r() * 0.28) * zoom;
      pool(x, gx, gy, rad, col, 0.14 + r() * 0.14,
        0.55 + r() * 0.7, r() * Math.PI, noise, i * 1.7 + seed * 0.1, 0.2 + r() * 0.24);
    }
    x.restore();

    /* ── 3. LAYERED POOLS — structured depth per family, lighter & smaller as we
       come up toward the surface, multiply-blended so overlaps darken into
       embedded depth. Layer count, per-layer pool count, sizes, squash, and
       rotation all vary continuously with density/zoom. ── */
    const layers = Math.max(3, Math.round((4 + r() * 3) * (0.6 + density * 0.6)));
    function centers(count, lt) {
      const pts = [];
      for (let i = 0; i < count; i++) {
        let px, py;
        if (family === 'Strata') {
          const band = (i + r() * 0.6) / count;
          const tilt = (r() - 0.5) * 0.4;      // bands can tilt per seed
          py = H * (0.08 + band * 0.84) + noise.fbm(i * 1.7, lt * 3, 2) * H * 0.06 + (px || 0) * tilt;
          px = W * (0.5 + noise.fbm(i * 2.3 + 9, lt, 2) * (0.5 + asym * 0.5));
        } else if (family === 'Cells') {
          const a = r() * 7, rad = S * (0.03 + r() * 0.5) * spread;
          px = focX + Math.cos(a) * rad; py = focY + Math.sin(a) * rad * (0.7 + r() * 0.5);
        } else if (family === 'Lens') {
          const rr = (i / count) * S * (0.3 + spread * 0.3) + r() * S * 0.05, a = r() * 7;
          px = focX + Math.cos(a) * rr; py = focY + Math.sin(a) * rr * (0.8 + r() * 0.4);
        } else if (family === 'Drift') {
          const t = i / count;
          const dirA = r() * Math.PI * 2;
          const c = K.curl(noise, focX + t * W * 0.5, focY + t * H * 0.3);
          px = focX + Math.cos(dirA) * t * W * 0.5 * spread + c[0] * W * 0.55;
          py = focY + Math.sin(dirA) * t * H * 0.5 * spread + c[1] * H * 0.55;
        } else if (family === 'Scraped') {
          px = W * (0.1 + r() * 0.8); py = H * (0.1 + r() * 0.8);
        } else { // Pour
          if (i === 0) { px = focX; py = focY; }
          else { const a = r() * 7, rad = S * (0.08 + r() * 0.46) * spread; px = focX + Math.cos(a) * rad; py = focY + Math.sin(a) * rad; }
        }
        pts.push([px, py]);
      }
      return pts;
    }
    x.save();
    x.globalCompositeOperation = 'multiply';
    for (let L = 0; L < layers; L++) {
      const lt = L / Math.max(1, layers - 1);
      const pcol = pal.pools[Math.min(pal.pools.length - 1, 1 + Math.floor(lt * (pal.pools.length - 1)))];
      const baseCount = family === 'Cells' ? 4 + (r() * 5 | 0)
                      : family === 'Strata' ? 3 + (r() * 4 | 0)
                      : 2 + (r() * 4 | 0);
      const count = Math.max(1, Math.round(baseCount * (0.7 + density * 0.5)));
      const cs = centers(count, lt);
      for (const c of cs) {
        const rad = S * (0.07 + (1 - lt) * 0.24) * (0.6 + r() * 0.8) * zoom;
        const squash = family === 'Strata' ? 0.25 + r() * 0.25 : 0.55 + r() * 0.5;
        const ang = family === 'Strata' ? (r() - 0.5) * 0.4 : r() * Math.PI;
        const a0 = 0.2 + lt * 0.18 + r() * 0.1;
        pool(x, c[0], c[1], rad, pcol, a0, squash, ang, noise, L * 3.1 + c[0] * 0.01, 0.18 + r() * 0.2);
      }
    }
    x.restore();

    /* ── 4. INNER GLOW — light rising from within the layers at the focal. Size
       & strength ride zoom and the value register. ── */
    K.bloom(x, focX, focY, S * (0.4 + r() * 0.35) * (0.7 + zoom * 0.4), pal.glow, (0.2 + r() * 0.18) * glowAmt);

    /* ── 4b. FOCAL ANCHOR — sometimes one legible bright fused pool near the
       focal (the lit-from-within core), sometimes a small one, sometimes absent
       entirely so the field reads minimal/quiet. Size, brightness, offset and
       presence all vary, so the "milky center" is no longer in every piece.
       (Lens builds its own concentric core, so skip there.) ── */
    if (anchorOn) {
      x.save();
      x.globalCompositeOperation = 'screen';
      pool(x, focX + (r() - 0.5) * S * anchorOff, focY + (r() - 0.5) * S * anchorOff,
        S * anchorScale * zoom, K.mix(pal.pools[4], pal.skin, 0.25 + r() * 0.3),
        (deepKey ? 0.22 : 0.34) + r() * 0.14, 0.6 + r() * 0.5, r() * Math.PI,
        noise, 17.3 + seed * 0.3, 0.22 + r() * 0.22);
      x.restore();
    }

    /* ── 5. EMBEDDED SHAPES — the uncanny: pooled forms holding a contour no
       pour could settle into, set at varied depths (dark=deep, light=near).
       Count rides density; sizes & placement spread across the frame. ── */
    const embeds = family === 'Lens' ? 3 + (r() * 3 | 0) : Math.max(1, Math.round((2 + r() * 3) * (0.5 + density * 0.6)));
    for (let e = 0; e < embeds; e++) {
      const depthT = r();
      const ec = depthT < 0.5 ? K.mix(pal.deep, pal.pools[2], depthT * 1.5)
                              : K.mix(pal.pools[3], pal.skin, (depthT - 0.5) * 1.2);
      let ex, ey, er;
      if (family === 'Lens') { ex = focX; ey = focY; er = S * (0.3 - e * 0.06) * zoom; }
      else { ex = W * (0.12 + r() * 0.76); ey = H * (0.12 + r() * 0.76); er = S * (0.04 + r() * 0.15) * zoom; }
      x.save();
      x.globalCompositeOperation = depthT < 0.45 ? 'multiply' : 'screen';
      pool(x, ex, ey, er, ec, 0.16 + depthT * 0.22, 0.6 + r() * 0.6, r() * Math.PI, noise, e * 4.3 + seed * 0.2, 0.3 + r() * 0.26);
      x.restore();
    }

    /* ── 6. SCRAPE MARKS — combed tool striations across the surface. Angle,
       density and strength vary continuously; Scraped family runs strong &
       dense. Sometimes nearly absent for clean pours. ── */
    let scrAng;
    if (family === 'Strata') scrAng = (r() - 0.5) * 0.3;
    else if (family === 'Drift') scrAng = Math.PI / 2 + (r() - 0.5) * 0.7;
    else scrAng = r() * Math.PI;                         // any drag direction
    if (family === 'Scraped') scrapeField(x, W, H, scrAng, (50 + r() * 50) * (0.6 + density * 0.5), pal.skin, pal.ink, noise, seed * 1.3, 0.75 + r() * 0.25);
    else if (family !== 'Lens') {
      const combAmt = r();                               // some pieces barely combed
      if (combAmt > 0.18) scrapeField(x, W, H, scrAng, (16 + combAmt * 30) * (0.5 + density * 0.6), pal.skin, pal.ink, noise, seed * 1.3, 0.25 + combAmt * 0.4);
    }

    /* ── 7. SKIN — milk-white luminous top film unifying the layers; brighter
       near focal, thinning to the rim. Reach & strength vary with zoom/value. ── */
    x.save();
    x.globalCompositeOperation = 'screen';
    const skinR = S * (0.6 + r() * 0.5) * (0.7 + zoom * 0.4);
    const skinG = x.createRadialGradient(focX, focY, 0, focX, focY, skinR);
    skinG.addColorStop(0, K.rgba(pal.skin, (0.12 + r() * 0.16) * skinAmt));
    skinG.addColorStop(0.5, K.rgba(pal.skin, 0.07 * skinAmt));
    skinG.addColorStop(1, K.rgba(pal.skin, 0));
    x.fillStyle = skinG; x.fillRect(0, 0, W, H);
    x.restore();
    K.sheen(x, focX - S * 0.05, focY - S * 0.07, S * (0.2 + r() * 0.16) * zoom, pal.skin, 0.14 * skinAmt);

    /* ── 8. TRAPPED BUBBLES — denser near pools, sized by depth. Count rides
       density; spread rides zoom so close-crops carry fewer, bigger bubbles. ── */
    const bubN = Math.round((6 + r() * 16) * (0.4 + density * 0.7));
    const bubSpread = (0.8 + r() * 0.7) / Math.max(0.7, zoom * 0.7);
    for (let b = 0; b < bubN; b++) {
      const bx = focX + (r() - 0.5) * S * 1.2 * bubSpread;
      const by = focY + (r() - 0.5) * S * 1.1 * bubSpread;
      if (bx < 0 || bx > W || by < 0 || by > H) continue;
      const br = S * (0.004 + Math.pow(r(), 2.3) * 0.03) * (0.7 + zoom * 0.5);
      bubble(x, bx, by, br, pal.glow, pal.deep);
    }

    /* ── 9. ATMOSPHERE & TEXTURE — layered haze + waxy mottle + grain + grade.
       Haze scale rides zoom; everything else preserved as the signature grade. */
    const hazeCol = K.mix(pal.skin, pal.glow, 0.5);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.12 + r() * 0.05, S * (0.7 + zoom * 0.3), 'screen');
    K.hazeSheet(x, W, H, noise, pal.deep, 0.12 + r() * 0.04, S * (0.45 + zoom * 0.2), 'multiply');
    K.mottle(x, 0, 0, W, H, pal.skin, 30, r, 'soft-light');
    K.mottle(x, 0, 0, W, H, pal.deep, 55, r, 'multiply');
    K.grain(x, W, H, 4.2, r);
    K.vignette(x, W, H, deepKey ? 0.62 : 0.42 + r() * 0.16);
    K.bloom(x, focX, focY, S * (0.28 + r() * 0.18), pal.glow, 0.08 * glowAmt);

    return { aspect: W / H };
  }

  /* traits() MUST mirror draw()'s rng draw order exactly up to the values it
     reports, so the displayed traits match the rendered piece. */
  function traits(seed) {
    const r = K.rng(seed);
    const basePal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const family = pickFamily(r);
    // mirror the macro-control draws in order:
    r(); r(); r();                         // dHue, mSat, mVal
    const aspect = 0.62 + r() * 0.96;      // FORMAT
    const zoom = 0.5 + Math.pow(r(), 1.15) * 1.5;     // ZOOM
    const density = 0.22 + Math.pow(r(), 0.85) * 1.35; // DENSITY
    r();                                   // asym
    r(); r();                              // focX, focY
    r();                                   // spread
    const keyT = r();                      // value register
    const deepKey = keyT < 0.2;
    const f = aspect > 1.08 ? 'Landscape' : aspect < 0.92 ? 'Portrait' : 'Square';
    const scale = zoom < 0.85 ? 'Wide' : zoom > 1.45 ? 'Close' : 'Mid';
    const fill = density < 0.6 ? 'Minimal' : density > 1.15 ? 'Dense' : 'Built';
    return { Palette: basePal.name, Family: family, Format: f, Scale: scale, Fill: fill, Light: deepKey ? 'Low-key' : 'Buttery' };
  }

  return { name: 'z_encaustic', draw, traits };
})();
