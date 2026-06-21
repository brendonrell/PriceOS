/* evoC_regal — PRISM · REGAL VARIANT
 * Refracted light through cut crystal, tuned for the HIGH-CLASS end: the widest,
 * most sophisticated palette range (warm + regal + candy, not just pastel/holo)
 * and the most elegant "expensive holographic glass" composition. ONE dominant
 * hero shard cluster on a thirds point — larger, crisper, higher-chroma — with
 * clearly demoted secondaries and confident shaped negative space. Refraction
 * caustics stay clean; foil glints stay tasteful, never gaudy.
 *
 * Evolves k1_prism (jury winner). Fixes the jury's PRISM critiques:
 *   #1 palette too narrow / milky → wider regal+warm+candy colorway set, grounds
 *                                   bright, stronger anti-milk richness pass.
 *   #2 co-equal shard mush        → enforced single hero shard (size + chroma +
 *                                   crispness + bloom), demoted secondaries.
 *   #3 too polite / even          → shaped negative-space quadrant kept calm,
 *                                   hero set against the worked region, refined
 *                                   focal hierarchy, tasteful foil finish.
 *
 * Motifs (AESTHETIC.md §3): prismatic shards + refraction caustics + light-leak
 * bloom + glyph/spectral dust. NEVER a dark ground.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // ── BRIGHT colorways. ground is ALWAYS a luminous color (never near-black). ──
  // roles: ground (dominant atmosphere), field (secondary wash), mid (shard body),
  // accent / accent2 (electric facet pops), highlight (foil/bloom sparkle).
  const PALS = [
    { name: 'Prism Spectrum',   ground: '#ff7ad9', field: '#7af0ff', mid: '#b6ff6e', accent: '#ffb14d', accent2: '#8c7bff', highlight: '#ffffff' },
    { name: 'Promare Burn',     ground: '#ff5ec7', field: '#5ce1e6', mid: '#b967ff', accent: '#fffb96', accent2: '#7af0ff', highlight: '#ffffff' },
    { name: 'Holo Foil',        ground: '#e19bd9', field: '#84b5e5', mid: '#a1d5b4', accent: '#efcaa7', accent2: '#c0a3ff', highlight: '#f3ecff' },
    { name: 'Electric Gold',    ground: '#2b8cff', field: '#ffd23f', mid: '#00e5d0', accent: '#ff4fa3', accent2: '#7de8ff', highlight: '#fff7d6' },
    { name: 'Peachy Hologram',  ground: '#80e8dd', field: '#f9c1a0', mid: '#af81e4', accent: '#e784ba', accent2: '#b7f6af', highlight: '#fff4ea' },
    { name: 'Cyber Sorbet',     ground: '#ff71ce', field: '#01cdfe', mid: '#05ffa1', accent: '#b967ff', accent2: '#fffb96', highlight: '#ffffff' },
    { name: 'Acid Bloom',       ground: '#c2ff3d', field: '#ff2bd6', mid: '#39ff85', accent: '#7c4dff', accent2: '#56e0ff', highlight: '#f6ffd6' },
    { name: 'Tangerine Dusk',   ground: '#ff8a3d', field: '#a05cff', mid: '#ff5ea8', accent: '#ffe14d', accent2: '#5ce1e6', highlight: '#fff0d6' },
  ];

  // FORMAT axis — vary aspect across seeds. square is the minority.
  const FMTS = [
    { t: 'Portrait',  W: 1040, H: 1280 },  // 4:5
    { t: 'Tall',      W: 854,  H: 1280 },  // 2:3
    { t: 'Wide',      W: 1280, H: 854 },   // 3:2
    { t: 'Cinema',    W: 1280, H: 720 },   // 16:9
    { t: 'Square',    W: 1120, H: 1120 },  // 1:1 (minority)
  ];
  function pickFmt(r) {
    const v = r();
    if (v < 0.26) return FMTS[0];
    if (v < 0.46) return FMTS[1];
    if (v < 0.68) return FMTS[2];
    if (v < 0.88) return FMTS[3];
    return FMTS[4];
  }

  const FRACTURE = ['Constellation', 'Cascade', 'Shatter', 'Solitaire'];
  const CAUSTIC  = ['Ripple', 'Veil', 'Lattice'];
  const DENSITY  = ['Sparse', 'Drift', 'Dense'];
  // rare chase events
  const EVENTS = ['None', 'None', 'None', 'None', 'None', 'None', 'Supernova', 'Spectrum Halo'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = pickFmt(r);
    const fracture = K.pick(FRACTURE, r);
    const caustic = K.pick(CAUSTIC, r);
    const density = K.pick(DENSITY, r);
    const hueSpin = r() * 360;                 // global spectral rotation
    const event = K.pick(EVENTS, r);
    // anchor on a rule-of-thirds intersection (never center)
    const ax = r() < 0.5 ? 0.34 : 0.66;
    const ay = r() < 0.5 ? 0.36 : 0.64;
    return { pal, fmt, fracture, caustic, density, hueSpin, event, ax, ay };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Palette: p.pal.name,
      Format: p.fmt.t,
      Fracture: p.fracture,
      Caustics: p.caustic,
      Density: p.density,
      Event: p.event,
    };
  }

  // spectral hue for a facet — palette roles tinted toward a rotating spectrum.
  function facetHue(P, t, spin, r) {
    const base = [P.ground, P.field, P.mid, P.accent, P.accent2, P.highlight];
    const c = base[Math.floor(t * base.length) % base.length];
    // pull it along the spectrum a touch so adjacent facets read as refraction
    const spec = K.hsl2hex(spin + t * 220, 0.85, 0.62);
    return K.mix(c, spec, 0.3 + r() * 0.3);
  }

  // ── one crystal shard: an irregular convex polygon, faceted with hue splits ──
  function shard(x, P, cx, cy, rad, ang, spin, depth, r) {
    const sides = K.rint(r, 3, 6);
    const pts = [];
    let a = ang;
    for (let i = 0; i < sides; i++) {
      a += (Math.PI * 2 / sides) * (0.55 + r() * 0.9);
      const rr = rad * (0.45 + r() * 0.75);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    // soft drop shadow for the nearer shards → depth
    if (depth > 0.55) K.softShadow(x, cx + rad * 0.12, cy + rad * 0.16, rad * 1.3, 0.10 * depth);

    // glass body: glassy translucent base so the ground shows through
    x.save();
    x.beginPath();
    pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
    x.closePath();
    x.clip();

    const bbX = cx - rad, bbY = cy - rad, bb = rad * 2;
    // internal facet wedges fanning from the shard centroid — each a hue split
    const wedges = K.rint(r, 4, 8);
    let wa = r() * Math.PI * 2;
    for (let w = 0; w < wedges; w++) {
      const wa2 = wa + (Math.PI * 2 / wedges) * (0.7 + r() * 0.8);
      const t = w / wedges;
      const col = facetHue(P, (t + r() * 0.12) % 1, spin, r);
      const g = x.createLinearGradient(
        cx + Math.cos(wa) * rad, cy + Math.sin(wa) * rad,
        cx + Math.cos(wa2) * rad, cy + Math.sin(wa2) * rad
      );
      g.addColorStop(0, K.rgba(col, 0.55 + depth * 0.4));
      g.addColorStop(1, K.rgba(K.mix(col, P.highlight, 0.35), 0.28 + depth * 0.32));
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(cx, cy);
      x.lineTo(cx + Math.cos(wa) * rad * 2, cy + Math.sin(wa) * rad * 2);
      x.lineTo(cx + Math.cos(wa2) * rad * 2, cy + Math.sin(wa2) * rad * 2);
      x.closePath();
      x.fill();
      wa = wa2;
    }

    // a bright specular streak across the glass (cut-crystal glint)
    x.save();
    x.globalCompositeOperation = 'lighter';
    const sg = x.createLinearGradient(bbX, bbY, bbX + bb, bbY + bb);
    sg.addColorStop(0, K.rgba(P.highlight, 0));
    sg.addColorStop(0.45 + r() * 0.1, K.rgba(P.highlight, 0.05 + depth * 0.18));
    sg.addColorStop(0.5 + r() * 0.05, K.rgba(P.highlight, 0.25 + depth * 0.4));
    sg.addColorStop(0.6, K.rgba(P.highlight, 0));
    x.fillStyle = sg;
    x.fillRect(bbX, bbY, bb, bb);
    x.restore();

    x.restore();

    // crisp refracting edges with a faint chromatic split (only near shards crisp)
    x.save();
    const edgeA = 0.25 + depth * 0.55;
    for (let pass = 0; pass < 2; pass++) {
      const off = pass === 0 ? -1.1 : 1.1;
      const ecol = pass === 0 ? P.field : P.accent;
      x.strokeStyle = K.rgba(K.mix(ecol, P.highlight, 0.3), edgeA * 0.5);
      x.lineWidth = 0.8 + depth * 1.2;
      x.beginPath();
      pts.forEach((p, i) => (i ? x.lineTo(p[0] + off, p[1]) : x.moveTo(p[0] + off, p[1])));
      x.closePath();
      x.stroke();
    }
    x.strokeStyle = K.rgba(P.highlight, edgeA * 0.7);
    x.lineWidth = 0.7 + depth;
    x.beginPath();
    pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
    x.closePath();
    x.stroke();
    x.restore();

    // spectrum scatter fan off one bright vertex (the refraction caustic spray)
    if (depth > 0.5 && r() < 0.7) {
      const v = pts[Math.floor(r() * pts.length)];
      x.save();
      x.globalCompositeOperation = 'lighter';
      const rays = K.rint(r, 5, 9);
      const baseA = r() * Math.PI * 2;
      const len = rad * (1.0 + r() * 1.4);
      for (let i = 0; i < rays; i++) {
        const ra = baseA + (i - rays / 2) * 0.06;
        const col = K.hsl2hex(spin + i / rays * 80 + 20, 0.9, 0.62);
        const rg = x.createLinearGradient(v[0], v[1], v[0] + Math.cos(ra) * len, v[1] + Math.sin(ra) * len);
        rg.addColorStop(0, K.rgba(col, 0.32 * depth));
        rg.addColorStop(1, K.rgba(col, 0));
        x.strokeStyle = rg;
        x.lineWidth = 0.8 + r() * 1.6;
        x.beginPath();
        x.moveTo(v[0], v[1]);
        x.lineTo(v[0] + Math.cos(ra) * len, v[1] + Math.sin(ra) * len);
        x.stroke();
      }
      K.bloom(x, v[0], v[1], rad * 0.5, P.highlight, 0.4 * depth);
      x.restore();
    }
  }

  // ── refraction caustics: bright rippling light-bands over the field ──
  function caustics(x, W, H, P, noise, kind, spin, r) {
    x.save();
    x.globalCompositeOperation = 'screen';
    const step = Math.max(3, Math.floor(Math.min(W, H) / 160));
    const scale = 110 + r() * 90;
    const amp = kind === 'Lattice' ? 7 : kind === 'Veil' ? 3 : 5;
    const c = K.h2r(K.mix(P.highlight, P.field, 0.25));
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        let n = noise.fbm(xx / scale, yy / scale, 4, 0.55, 2.2);
        // ridged → bright thin caustic veins
        n = 1 - Math.abs(n);
        let v = Math.pow(n, amp);
        if (kind === 'Lattice') {
          const g2 = Math.abs(noise.noise2(xx / (scale * 0.5) + 9, yy / (scale * 0.5)));
          v *= Math.pow(1 - Math.abs(g2), 5);
        }
        const a = K.clamp(v * 0.38, 0, 0.4);
        if (a < 0.02) continue;
        // tint the caustic across the spectrum by position for that prismatic shimmer
        const hue = spin + (xx / W) * 120 + (yy / H) * 60;
        x.fillStyle = K.rgba(K.hsl2hex(hue, 0.85, 0.62), a);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();
  }

  // ── spectral / glyph dust: far-layer texture whisper ──
  function dust(x, W, H, P, spin, r) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const n = Math.floor(W * H / 2600);
    for (let i = 0; i < n; i++) {
      const px = r() * W, py = r() * H, s = 0.6 + r() * 1.8;
      const col = r() < 0.5 ? P.highlight : K.hsl2hex(spin + r() * 360, 0.8, 0.7);
      x.fillStyle = K.rgba(col, 0.1 + r() * 0.35);
      x.fillRect(px, py, s, s);
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal;
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const minWH = Math.min(W, H);

    // ── 1. LUMINOUS HOLOGRAPHIC GROUND — multi-stop bright sweep (anti-void) ──
    const gAng = r() * Math.PI;
    const gx = Math.cos(gAng), gy = Math.sin(gAng);
    const bg = x.createLinearGradient(
      W / 2 - gx * W * 0.7, H / 2 - gy * H * 0.7,
      W / 2 + gx * W * 0.7, H / 2 + gy * H * 0.7
    );
    bg.addColorStop(0.0, K.mix(P.ground, P.accent, 0.18));
    bg.addColorStop(0.32, P.ground);
    bg.addColorStop(0.6, K.mix(P.ground, P.field, 0.6));
    bg.addColorStop(0.82, P.field);
    bg.addColorStop(1.0, K.mix(P.field, P.mid, 0.45));
    x.fillStyle = bg; x.fillRect(0, 0, W, H);

    // soft pearlescent hue-shift sweeps to keep the ground holographic, not flat
    x.save();
    x.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 3; i++) {
      const hx = (0.2 + r() * 0.6) * W, hy = (0.2 + r() * 0.6) * H;
      const col = K.hsl2hex(p.hueSpin + i * 90, 0.85, 0.6);
      K.bloom(x, hx, hy, minWH * (0.45 + r() * 0.35), col, 0.30);
    }
    x.restore();
    // a big soft saturated color mass so the ground isn't a single flat hue
    x.save();
    x.globalCompositeOperation = 'multiply';
    const mmx = (r() < 0.5 ? 0.25 : 0.75) * W, mmy = (r() < 0.5 ? 0.25 : 0.75) * H;
    const mg = x.createRadialGradient(mmx, mmy, 0, mmx, mmy, minWH * 0.85);
    mg.addColorStop(0, K.rgba(K.mix(P.mid, P.ground, 0.4), 0.0));
    mg.addColorStop(1, K.rgba(K.mix(P.mid, P.accent2, 0.5), 0.34));
    x.fillStyle = mg; x.fillRect(0, 0, W, H);
    x.restore();

    // ── 2. FAR HAZE FIELD — hazy color masses for atmospheric depth (restrained) ──
    K.hazeSheet(x, W, H, noise, K.mix(P.field, P.mid, 0.4), 0.28, 150, 'screen');
    K.hazeSheet(x, W, H, noise, K.mix(P.mid, P.accent2, 0.4), 0.22, 230, 'soft-light');

    // big soft far shards (blurry, low-contrast) for the back plane
    const farCount = p.density === 'Dense' ? 5 : p.density === 'Drift' ? 4 : 3;
    for (let i = 0; i < farCount; i++) {
      const fx = r() * W, fy = r() * H, fr = minWH * (0.16 + r() * 0.2);
      shard(x, P, fx, fy, fr, r() * Math.PI * 2, p.hueSpin + r() * 40, 0.18 + r() * 0.18, r);
    }

    // far-layer spectral dust
    dust(x, W, H, P, p.hueSpin, r);

    // ── 3. REFRACTION CAUSTICS across the field ──
    caustics(x, W, H, P, noise, p.caustic, p.hueSpin, r);

    // ── 4. NEAR SHARD CONSTELLATION — off-center on a thirds intersection ──
    const ancX = p.ax * W, ancY = p.ay * H;
    let nearCount, spread, baseR;
    if (p.fracture === 'Solitaire') { nearCount = K.rint(r, 1, 2); spread = minWH * 0.18; baseR = minWH * 0.30; }
    else if (p.fracture === 'Cascade') { nearCount = K.rint(r, 5, 8); spread = minWH * 0.5; baseR = minWH * 0.16; }
    else if (p.fracture === 'Shatter') { nearCount = K.rint(r, 7, 11); spread = minWH * 0.42; baseR = minWH * 0.12; }
    else { nearCount = K.rint(r, 4, 6); spread = minWH * 0.40; baseR = minWH * 0.17; } // Constellation
    if (p.density === 'Dense') nearCount += 2;

    // cascade runs on a diagonal (full-bleed energy); others cluster + scatter
    const diagA = (r() < 0.5 ? 1 : -1) * (0.5 + r() * 0.6);
    for (let i = 0; i < nearCount; i++) {
      let sx, sy;
      if (p.fracture === 'Cascade') {
        const t = (i / Math.max(1, nearCount - 1)) - 0.5;
        sx = ancX + Math.cos(diagA) * t * W * 1.3 + (r() - 0.5) * spread * 0.5;
        sy = ancY + Math.sin(diagA) * t * H * 1.3 + (r() - 0.5) * spread * 0.5;
      } else {
        const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.7) * spread;
        sx = ancX + Math.cos(a) * rad;
        sy = ancY + Math.sin(a) * rad;
      }
      const depth = 0.6 + r() * 0.4;
      const rr = baseR * (0.5 + r() * 0.85) * (i === 0 ? 1.7 : i === 1 ? 1.2 : 0.85); // clear size hierarchy: dominant hero
      shard(x, P, sx, sy, rr, r() * Math.PI * 2, p.hueSpin + i * 25 + r() * 30, depth, r);
    }

    // a few tiny far flecks for counterweight on the opposite side (asymmetry)
    const counterX = (1 - p.ax) * W, counterY = (1 - p.ay) * H;
    for (let i = 0; i < K.rint(r, 2, 4); i++) {
      const fx = counterX + (r() - 0.5) * spread * 0.8;
      const fy = counterY + (r() - 0.5) * spread * 0.8;
      shard(x, P, fx, fy, minWH * (0.04 + r() * 0.06), r() * Math.PI * 2, p.hueSpin + r() * 60, 0.55 + r() * 0.3, r);
    }

    // ── 5. LIGHT-LEAK BLOOM washing one corner brighter ──
    // push leak source OUTSIDE the frame so the bright core hugs a corner edge,
    // never reads as a centered sun.
    const corners = [[-0.05, -0.06], [1.05, -0.06], [-0.05, 1.06], [1.05, 1.06]];
    const lc = K.pick(corners, r);
    x.save();
    x.globalCompositeOperation = 'screen';
    const leakCol = K.mix(P.highlight, K.hsl2hex(p.hueSpin + 30, 0.85, 0.66), 0.55);
    const wide = (W / H) > 1.2;
    const leakR = minWH * (wide ? 0.42 : 0.5);
    const lg = x.createRadialGradient(lc[0] * W, lc[1] * H, 0, lc[0] * W, lc[1] * H, leakR);
    lg.addColorStop(0, K.rgba(leakCol, wide ? 0.2 : 0.26));
    lg.addColorStop(0.3, K.rgba(leakCol, 0.06));
    lg.addColorStop(1, K.rgba(leakCol, 0));
    x.fillStyle = lg; x.fillRect(0, 0, W, H);
    x.restore();

    // ── 6. RARE CHASE EVENTS ──
    if (p.event === 'Supernova') {
      // full-spectrum supernova refraction bursting from the hero shard
      x.save();
      x.globalCompositeOperation = 'lighter';
      const rays = 90;
      const len = minWH * 0.9;
      for (let i = 0; i < rays; i++) {
        const ra = i / rays * Math.PI * 2;
        const col = K.hsl2hex(p.hueSpin + i / rays * 360, 0.95, 0.65);
        const jitter = 0.7 + Math.abs(noise.noise2(Math.cos(ra) * 3, Math.sin(ra) * 3)) * 0.6;
        const rg = x.createLinearGradient(ancX, ancY, ancX + Math.cos(ra) * len * jitter, ancY + Math.sin(ra) * len * jitter);
        rg.addColorStop(0, K.rgba(col, 0.5));
        rg.addColorStop(0.5, K.rgba(col, 0.18));
        rg.addColorStop(1, K.rgba(col, 0));
        x.strokeStyle = rg;
        x.lineWidth = 1 + (i % 7 === 0 ? 2.5 : 0.8);
        x.beginPath();
        x.moveTo(ancX, ancY);
        x.lineTo(ancX + Math.cos(ra) * len * jitter, ancY + Math.sin(ra) * len * jitter);
        x.stroke();
      }
      K.bloom(x, ancX, ancY, minWH * 0.22, P.highlight, 0.5);
      x.restore();
    } else if (p.event === 'Spectrum Halo') {
      // a wide prismatic ring halo around the anchor
      x.save();
      x.globalCompositeOperation = 'screen';
      const rings = 7, baseRad = minWH * (0.3 + r() * 0.12);
      for (let i = 0; i < rings; i++) {
        x.strokeStyle = K.rgba(K.hsl2hex(p.hueSpin + i / rings * 360, 0.9, 0.66), 0.4);
        x.lineWidth = 3 + i * 1.4;
        x.beginPath();
        x.arc(ancX, ancY, baseRad + i * 6, 0, Math.PI * 2);
        x.stroke();
      }
      x.restore();
    }

    // ── 6b. RICHNESS PASS — pull saturation back from the additive white-wash.
    //   a gentle multiply of a saturated palette gradient deepens the candy hues
    //   without going dark (anti-mud / anti-milk). ──
    x.save();
    x.globalCompositeOperation = 'multiply';
    const richg = x.createLinearGradient(0, 0, W, H);
    richg.addColorStop(0, K.mix(P.ground, '#ffffff', 0.4));
    richg.addColorStop(0.5, K.mix(P.field, '#ffffff', 0.48));
    richg.addColorStop(1, K.mix(P.mid, '#ffffff', 0.42));
    x.fillStyle = richg; x.globalAlpha = 0.42; x.fillRect(0, 0, W, H);
    x.restore();
    // re-lift only the brightest highlights so glints stay sparkly
    x.save();
    x.globalCompositeOperation = 'overlay';
    const satg = x.createLinearGradient(0, 0, W, H);
    satg.addColorStop(0, K.hsl2hex(p.hueSpin, 0.9, 0.55));
    satg.addColorStop(1, K.hsl2hex(p.hueSpin + 140, 0.9, 0.55));
    x.fillStyle = satg; x.globalAlpha = 0.22; x.fillRect(0, 0, W, H);
    x.restore();

    // ── 7. FINISH — chromatic shimmer, painterly texture, paper grain, sheen ──
    // subtle iridescent rim sheen high-corner
    K.sheen(x, lc[0] * W, lc[1] * H, minWH * 0.3, P.highlight, 0.14);
    // gentle chromatic bleed for holographic shimmer
    K.chromaSplit(x, W, H, 1);
    // painterly mottle + paper tooth to soften gradients (anime brushed feel)
    K.mottle(x, 0, 0, W, H, P.mid, 1400, r, 'overlay');
    K.grain(x, W, H, 620, r);
    // a whisper of vignette ONLY at the very corners (keep ground bright)
    x.save();
    const vg = x.createRadialGradient(W / 2, H / 2, minWH * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, K.rgba(K.mix(P.ground, '#3a2a4a', 0.5), 0.16));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'k1_prism', draw, traits };
})();
