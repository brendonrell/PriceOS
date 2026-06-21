/* FOIL3 — iridescent crumpled-holographic-foil, taken to its true potential.
 *
 * Lineage: foil_final (one hero crease, a stamp) → foil2 (SIX structural layouts,
 * but Crush/Pool/Pleat/Drape still tiled the whole frame as a texture swatch and
 * every piece read as one pale tint) → foil3 (this).
 *
 * The jury's three notes drove this revision:
 *
 *   1. COMPOSE LIKE SHARDS. In foil2 only Shards fell off toward the edges and
 *      let the ground breathe. foil3 gives EVERY layout the same discipline via
 *      a shared `massW()` anchor mask — a thirds-anchored oblong blob, ~50-60%
 *      coverage, with the colored ground left as active negative space (25-40%)
 *      outside it. A crumpled sheet sitting IN a colored field, not one that IS it.
 *
 *   2. MULTI-HUE CONTRAST, not one tint. Pieces now carry 3+ palette roles:
 *      the deep crease TROUGHS tint toward a coloured trough hue (shiftB+deep),
 *      the specular RIDGES/GLINTS toward shiftA(+glint), over the saturated base
 *      ground — candy-saturated, not pastel. The thin-film band is much stronger
 *      and trough/ridge are pushed to DIFFERENT poles, not a single milky wash.
 *
 *   3. FIX CRUSH + RADIAL. Crush uses fewer/larger broad facets (low-freq ridged
 *      field, big plates) with hot DIRECTIONAL specular on the sharp ridges —
 *      foil, not fingerprint lichen. Radial is anchored hard off-centre (burst
 *      centre forced into a corner/edge band) and the concentric rings are
 *      dropped, so it reads as an off-axis fan, never a symmetric sunburst.
 *
 * KEPT: oil-slick thin-film crease look, the 10 bespoke saturated palettes,
 * window.FORCE_PAL, bright saturated grounds (never dark), abstract, varied
 * aspect, Layout trait, deterministic per seed, rare events, coarse fast grid,
 * canvas ≤1280px. Heroes protected: Shards layout, and single-crease Pool.
 *
 * Contract: window.ENGINE = { name:'foil3', draw(cv,seed), traits(seed) }.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // 10 hand-picked DISTINCT jewel worlds (from foil_final, untouched).
  //   base — dominant saturated body · shiftA/B — thin-film hue-shift poles
  //   glint — specular on sharp ridges · deep — COLOURED shadow trough (never black)
  const PALS = [
    { name: 'Molten Gold',     base: '#f5a623', shiftA: '#18d3c0', shiftB: '#ff8a3d', glint: '#fff3c4', deep: '#7a3a12' },
    { name: 'Liquid Copper',   base: '#c2410c', shiftA: '#14b8a6', shiftB: '#ffb347', glint: '#ffe0c0', deep: '#5a1f08' },
    { name: 'Rose Bronze',     base: '#c97a6d', shiftA: '#7ad6c8', shiftB: '#ffd0b0', glint: '#ffe8de', deep: '#5a2a28' },
    { name: 'Brass Patina',    base: '#b8860b', shiftA: '#2ec4b6', shiftB: '#ffe08a', glint: '#fff4cf', deep: '#4a3408' },
    { name: 'Amber Chrome',    base: '#f59e0b', shiftA: '#6bd6ff', shiftB: '#ff7a3d', glint: '#fff0cf', deep: '#6b3a08' },
    { name: 'Champagne Foil',  base: '#e8c98a', shiftA: '#b58cff', shiftB: '#ffd9a8', glint: '#fffaf0', deep: '#8a6a3a' },
    { name: 'Magenta Bronze',  base: '#d6409f', shiftA: '#ffcf6b', shiftB: '#14b8a6', glint: '#ffe0f0', deep: '#5a1240' },
    { name: 'Sunset Gold',     base: '#ff8a2b', shiftA: '#8b5cf6', shiftB: '#ffd23f', glint: '#fff0d6', deep: '#6b2e0a' },
    { name: 'Oxide Ember',     base: '#b5471a', shiftA: '#2ec4b6', shiftB: '#ffae5c', glint: '#ffd9b0', deep: '#4a160a' },
    { name: 'Pewter Gold',     base: '#b9a37a', shiftA: '#ff9d6b', shiftB: '#d6c08a', glint: '#fff5e0', deep: '#4a4030' },
  ];

  // varied aspect — portrait / landscape / square (square the minority). ≤1280px.
  const FMTS = [
    { W: 1024, H: 1280, t: 'Portrait' },   // 4:5
    { W: 1024, H: 1536, t: 'Tall' },       // 2:3
    { W: 1280, H: 853,  t: 'Vista' },      // 3:2
    { W: 1280, H: 720,  t: 'Wide' },       // 16:9
    { W: 1180, H: 1180, t: 'Square' },     // 1:1 (minority)
  ];
  function pickFmt(r) { const x = r(); return x < 0.26 ? FMTS[0] : x < 0.48 ? FMTS[1] : x < 0.70 ? FMTS[2] : x < 0.88 ? FMTS[3] : FMTS[4]; }

  // PRIMARY trait — each is a structurally distinct fold composition.
  const LAYOUTS = ['Drape', 'Crush', 'Pleat', 'Radial', 'Shards', 'Pool'];
  // secondary structure axes
  const DENSITY = ['Sparse', 'Medium', 'Dense'];   // how much of the frame is worked
  const SHEEN   = ['Satin', 'Mirror'];             // how hot the specular reads
  // rare chase events
  const EVENTS  = ['None','None','None','None','None','None','Spectrum Burst','Mirror Seam'];

  function dmOf(density) { return density === 'Sparse' ? 0.0 : density === 'Dense' ? 1.0 : 0.5; }

  // ── Param draw (FIXED ORDER — Layout FIRST so traits() and draw() agree) ──
  function params(r) {
    const layout = K.pick(LAYOUTS, r);
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = pickFmt(r);
    const density = K.pick(DENSITY, r);
    const sheen = K.pick(SHEEN, r);
    const event = K.pick(EVENTS, r);

    // off-centre focal anchor on a thirds/phi point (asymmetry guaranteed)
    const fx = (r() < 0.5 ? 0.30 + r() * 0.08 : 0.62 + r() * 0.08);
    const fy = (r() < 0.5 ? 0.30 + r() * 0.08 : 0.62 + r() * 0.08);
    // global flow direction
    const ang = (r() - 0.5) * Math.PI;       // any direction
    // density multiplier 0.6 sparse .. 1.5 dense
    const dm = density === 'Sparse' ? 0.62 : density === 'Dense' ? 1.5 : 1.0;
    const shiftRate = 0.7 + r() * 1.3;
    const sharp = 1.0 + r() * 0.9;

    // ── SHARED ANCHOR MASS (jury note #1) ── the foil mass is an oblong blob
    // anchored on the focal thirds point; coverage ~50-60%, falling to bare ground
    // at the edges. Radius grows with density. Asymmetry + rotation + fbm rim
    // wobble keep it from reading as a circle and tie the layout to one mass.
    const massR  = 0.38 + 0.14 * dmOf(density);    // base half-extent in uv
    const massRot = ang * 0.7 + (r() - 0.5) * 0.6;
    const massAsym = 0.66 + r() * 0.55;            // squash one axis → oblong
    const massWob = 0.10 + r() * 0.08;             // rim irregularity

    // per-layout structural rolls (drawn here so order is fixed)
    const A = {
      drapeN: K.rint(r, 2, 4),
      // Crush: BROAD facet frequency — deliberately low so facets are big plates
      crushF: 1.6 + r() * 1.2,
      crushLightAng: r() * Math.PI * 2,     // directional light for hot ridges
      pleatN: K.rint(r, 6, 14),
      pleatAng: ang * 0.5,
      // Radial: burst centre FORCED off-centre into a corner/edge band, never mid.
      radCx: (r() < 0.5 ? 0.06 + r() * 0.16 : 0.78 + r() * 0.16),
      radCy: (r() < 0.5 ? 0.06 + r() * 0.16 : 0.78 + r() * 0.16),
      radN: K.rint(r, 7, 14),
      shardN: K.rint(r, 3, 6),
      shards: [],
      poolCreaseN: K.rint(r, 1, 2),
    };
    // shards cluster near the anchor so the scatter reads as one composed mass
    for (let i = 0; i < 8; i++) {
      A.shards.push({
        cx: K.clamp(fx + (r() - 0.5) * 0.5, 0.12, 0.88),
        cy: K.clamp(fy + (r() - 0.5) * 0.5, 0.12, 0.88),
        rad: 0.11 + r() * 0.17, rot: r() * Math.PI, freq: 2.0 + r() * 2.2,
        squash: 0.55 + r() * 0.7,
      });
    }
    const poolCreases = [];
    for (let i = 0; i < 2; i++) {
      poolCreases.push({ x: 0.25 + r() * 0.5, y: 0.25 + r() * 0.5, ang: (r() - 0.5) * Math.PI, w: 0.10 + r() * 0.06 });
    }
    A.poolCreases = poolCreases;

    return {
      layout, pal, fmt, density, sheen, event, fx, fy, ang, dm, shiftRate, sharp,
      massR, massRot, massAsym, massWob, A,
    };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Layout: p.layout, Palette: p.pal.name, Format: p.fmt.t, Density: p.density, Event: p.event };
  }

  // ── tiny helpers ──
  function smooth(t) { t = K.clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function creaseD(noise, u, v, cx, cy, ca, halfW, wob) {
    const dx = u - cx, dy = v - cy;
    const c = Math.cos(ca), s = Math.sin(ca);
    const along = dx * c + dy * s;
    const perp  = -dx * s + dy * c;
    const wander = noise.fbm(along * 2.4 + 13.7, cx * 5.0 + 4.0, 3) * (halfW * (wob || 1.6));
    return (perp - wander) / halfW;
  }

  /* SHARED ANCHOR MASS (jury note #1).
   * Coverage weight in [0,1]: 1 at the anchor core, falling smoothly to 0 past the
   * mass radius so the colored ground breathes at the edges. Oblong (massAsym) +
   * rotation + fbm rim wobble make it tear like foil, never a circle. */
  function massW(noise, u, v, p) {
    const dx = u - p.fx, dy = v - p.fy;
    const c = Math.cos(p.massRot), s = Math.sin(p.massRot);
    const lu = (dx * c - dy * s) / p.massR;
    const lv = (dx * s + dy * c) / (p.massR * p.massAsym);
    let d = Math.hypot(lu, lv);
    d += noise.fbm(u * 2.4 + 7.0, v * 2.4 + 3.0, 3) * p.massWob * 2.2;  // organic rim
    return smooth((1.05 - d) / 0.42);   // core out to ~rim, then bare ground
  }

  /* ════════════════════════════════════════════════════════════════════════
   * SIX HEIGHT-FIELD SHAPERS — relief at normalised (u,v) + intrinsic worked
   * weight w. foil3: the renderer multiplies w by the SHARED massW (except for
   * the self-composing heroes) so every layout is anchored with negative space.
   * ════════════════════════════════════════════════════════════════════════ */

  // 1. DRAPE — a few large sweeping folds, smooth luxurious cloth flow.
  function hDrape(noise, u, v, p) {
    const c = Math.cos(p.ang), s = Math.sin(p.ang);
    const ru = u * c - v * s, rv = u * s + v * c;
    const warp = noise.fbm(u * 1.0, v * 1.0, 3) * 0.7;
    let h = Math.sin((ru + warp) * Math.PI * (0.9 + 0.25 * p.A.drapeN));
    h = Math.sign(h) * Math.pow(Math.abs(h), 1 / (p.sharp * 0.85));
    h += 0.55 * Math.sin((rv + warp * 0.6) * Math.PI * 0.8);
    h += 1.05 * noise.fbm(u * 1.8, v * 1.8, 4);
    h += 0.10 * noise.fbm(u * 5.5, v * 5.5, 3);
    return { h, w: 1.0 };
  }

  // 2. CRUSH — BROAD-FACET crumple (jury note #3). Big angular plates from a
  // low-frequency ridged field, with crisp valley creases between them — a
  // balled-up sheet of heavy foil, NOT high-frequency fingerprint lichen.
  function hCrush(noise, u, v, p) {
    const f = p.A.crushF;                            // LOW base freq → big plates
    const warp = noise.fbm(u * 1.1, v * 1.1, 3) * 0.55;
    const n1 = noise.fbm((u + warp) * f + 1.1, (v + warp) * f + 4.3, 2);
    const n2 = noise.fbm((u - warp) * f * 1.45 + 8.0, (v + warp) * f * 1.45 + 2.0, 2);
    let h = (1 - Math.abs(n1)) * (1 - Math.abs(n1)) * 1.6
          + (1 - Math.abs(n2)) * (1 - Math.abs(n2)) * 0.55;
    h = Math.pow(h, p.sharp * 0.9);                  // sharpen valley creases
    h += 0.06 * noise.fbm(u * 4.0, v * 4.0, 2);      // faint micro tooth only
    h = (h - 1.0) * 1.9;
    return { h, w: 1.0 };
  }

  // 3. PLEAT — parallel directional ridges/pleats, accordion.
  function hPleat(noise, u, v, p) {
    const ca = p.ang;
    const c = Math.cos(ca), s = Math.sin(ca);
    const ru = u * c - v * s;
    const warp = noise.fbm(u * 1.6 + 2, v * 1.6 + 5, 3) * 0.14;
    const n = p.A.pleatN * (0.7 + 0.6 * p.dm);
    const ph = (ru + warp) * n;
    let tri = ((ph % 1) + 1) % 1;
    tri = tri < 0.5 ? tri * 2 : (1 - tri) * 2;
    let h = Math.pow(tri, 1 / p.sharp) * 2 - 1;
    h += 0.30 * Math.sin((u * s + v * c) * Math.PI * 1.1);
    h += 0.18 * noise.fbm(u * 4, v * 4, 3);
    return { h, w: 1.0 };
  }

  // 4. RADIAL — folds bursting from one HARD off-centre point (jury note #3).
  // Burst centre forced into a corner/edge band by params; concentric rings
  // dropped so it reads as an asymmetric off-axis fan, never a symmetric sunburst.
  function hRadial(noise, u, v, p) {
    const cx = p.A.radCx, cy = p.A.radCy;
    const dx = u - cx, dy = v - cy;
    const ang = Math.atan2(dy, dx);
    const rad = Math.hypot(dx, dy);
    const arms = p.A.radN * (0.7 + 0.5 * p.dm);
    const warp = noise.fbm(u * 1.5, v * 1.5, 3) * 0.6;
    let h = Math.sin(ang * arms + warp * 2.2 + rad * 2.0);
    h = Math.sign(h) * Math.pow(Math.abs(h), 1 / p.sharp);
    h += 0.85 * noise.fbm(u * 2.2 + 3, v * 2.2 + 1, 4);   // crumple body, NO rings
    return { h, w: 1.0 };
  }

  // 5. SHARDS — separated torn foil fragments scattered with negative space.
  // The foil2 hero; keeps its own per-shard masking (self-composing).
  function hShards(noise, u, v, p) {
    const n = Math.min(p.A.shardN, p.A.shards.length);
    let h = noise.fbm(u * 1.2, v * 1.2, 3) * 0.12;
    let w = 0.04;
    for (let i = 0; i < n; i++) {
      const sh = p.A.shards[i];
      const dx = (u - sh.cx), dy = (v - sh.cy);
      const c = Math.cos(sh.rot), s = Math.sin(sh.rot);
      const lx = (dx * c - dy * s);
      const ly = (dx * s + dy * c) * sh.squash;
      const d = Math.hypot(lx, ly) / sh.rad;
      if (d > 1.15) continue;
      const edge = noise.fbm(Math.atan2(ly, lx) * 2.4 + i * 3.0, sh.cx * 4, 2) * 0.26;
      const mask = smooth((1.0 + edge - d) / 0.18);
      if (mask <= 0) continue;
      let sh_h = Math.sin(lx * Math.PI * sh.freq + i) * Math.cos(ly * Math.PI * sh.freq * 0.85);
      sh_h = Math.sign(sh_h) * Math.pow(Math.abs(sh_h), 1 / p.sharp);
      sh_h += 0.45 * Math.sin((lx + ly) * Math.PI * sh.freq * 1.4 + i * 2.1);
      sh_h += 0.55 * noise.fbm(u * 4.5 + i * 5, v * 4.5 + i * 5, 3);
      h += sh_h * mask * 1.25;
      w = Math.max(w, mask);
    }
    return { h, w };
  }

  // 6. POOL — a mostly-smooth iridescent sheet, one or two creases, big calm.
  // The other hero: single-diagonal-crease on saturated grounds. Self-composing.
  function hPool(noise, u, v, p) {
    let h = 0.6 * noise.fbm(u * 1.3, v * 1.3, 4);
    h += 0.15 * Math.sin((u + v) * Math.PI * 1.2);
    let w = 0.14;
    const cN = p.A.poolCreaseN;
    for (let i = 0; i < cN; i++) {
      const cr = p.A.poolCreases[i];
      const cd = creaseD(noise, u, v, cr.x, cr.y, cr.ang, cr.w, 1.4);
      const near = 1 - K.clamp(Math.abs(cd), 0, 1);
      const ridge = smooth(near);
      const crease = (1 - Math.abs(K.clamp(cd, -1, 1))) * 1.9 + 0.3 * Math.cos(cd * Math.PI * 1.5);
      h += crease * ridge;
      w = Math.max(w, ridge);
    }
    return { h, w };
  }

  const SHAPERS = { Drape: hDrape, Crush: hCrush, Pleat: hPleat, Radial: hRadial, Shards: hShards, Pool: hPool };

  // Fold the shared anchor mass into coverage. Shards self-composes (untouched).
  // Pool gets a gentle mass floor so its calm sheet still breathes off the edges
  // without cropping the hero crease. Drape/Crush/Pleat/Radial crop to the mass —
  // that IS their composition now (jury note #1).
  function coverageW(noise, u, v, p, intrinsicW) {
    if (p.layout === 'Shards') return intrinsicW;
    const m = massW(noise, u, v, p);
    if (p.layout === 'Pool') return Math.max(intrinsicW * (0.35 + 0.65 * m), m * 0.9);
    return intrinsicW * m;
  }

  // thin-film shift t in [0,1] along folds — adjacent creases lean to diff poles.
  function shiftT(noise, u, v, p, facing) {
    const c = Math.cos(p.ang), s = Math.sin(p.ang);
    const ru = u * c - v * s;
    const warp = noise.fbm(u * 1.3 + 4.1, v * 1.3 + 2.7, 4) * 0.5;
    const ph = (ru + warp) * (1.4 + p.dm) * p.shiftRate * 0.5
             + noise.fbm(u * 2.6, v * 2.6, 5) * 1.1
             + facing * 0.5;
    const w = ((ph % 1) + 1) % 1;
    return w < 0.5 ? w * 2 : (1 - w) * 2;
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal;
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const hFn = SHAPERS[p.layout];

    // colour anchors
    const baseDark = K.mix(P.base, P.deep, 0.55);
    const baseMid  = K.mix(P.base, P.deep, 0.18);
    const baseLift = K.mix(P.base, P.glint, 0.10);
    const gd = K.clamp(1.05 - K.lum(P.base) * 0.85, 0.45, 1);
    const sheenK = p.sheen === 'Mirror' ? 1.4 : 0.85;
    // MULTI-HUE roles (jury note #2): troughs → coloured trough hue (shiftB+deep),
    // ridges/glints → shiftA family. Two DIFFERENT poles + the base = 3+ hues.
    // Lean the trough hue toward the SATURATED deep so even the pastel palettes
    // (Rose Gold / Aqua Pearl / Opal Flame, whose shiftB is pale) get a candy
    // crease colour instead of cream. Ridge hue rides shiftA, pulled off-base.
    const troughHue = K.mix(P.shiftB, P.deep, 0.50);
    const ridgeHue  = K.mix(P.shiftA, P.shiftB, 0.18);
    const crushLC = Math.cos(p.A.crushLightAng), crushLS = Math.sin(p.A.crushLightAng);

    // ── 1. SATURATED GROUND ──
    const gg = x.createLinearGradient(0, 0, W, H);
    gg.addColorStop(0, baseLift);
    gg.addColorStop(0.5, P.base);
    gg.addColorStop(1, baseMid);
    x.fillStyle = gg; x.fillRect(0, 0, W, H);

    // ── 2. THE FOIL MEMBRANE — coarse grid, layout-specific height field ──
    const step = Math.max(3, Math.floor(Math.min(W, H) / 260));
    const lx = p.fx, ly = p.fy;       // light anchor on the focal
    const du = 0.005, dv = 0.005;
    x.save();
    for (let yy = 0; yy < H; yy += step) {
      const v = yy / H;
      for (let xx = 0; xx < W; xx += step) {
        const u = xx / W;
        const s0 = hFn(noise, u, v, p);
        const h = s0.h;
        const wWeight = K.clamp(coverageW(noise, u, v, p, s0.w), 0, 1);

        // skip bare-ground negative space → the colored field breathes (note #1)
        if (wWeight < 0.05) continue;

        const hu = hFn(noise, u + du, v, p).h - h;
        const hv = hFn(noise, u, v + dv, p).h - h;
        const slope = Math.sqrt(hu * hu + hv * hv) / du;
        const ndx = lx - u, ndy = ly - v;
        const nl = Math.hypot(ndx, ndy) + 1e-4;
        const facing = (hu * ndx + hv * ndy) / (du * nl);

        // body colour: saturated base shaded by facet facing. Bright facets lift
        // toward base+glint but ONLY a little (keep the hue — no white blow-out).
        const lit = K.clamp(0.5 + facing * 0.5, 0, 1);
        let body;
        if (lit < 0.5) body = K.mix(baseDark, P.base, lit * 2);
        else           body = K.mix(P.base, baseLift, (lit - 0.5) * 1.4);

        // ── MULTI-HUE TINT (jury note #2) ── push the WHOLE mass to candy, not
        // just the creases: troughs swing hard to the coloured trough hue, ridges
        // hard to the ridge hue, so base + troughHue + ridgeHue all read at once.
        const troughLean = K.clamp((0.5 - lit) * 2, 0, 1);   // deep in troughs
        const ridgeLean  = K.clamp((lit - 0.5) * 2, 0, 1);   // on bright ridges
        const t = shiftT(noise, u, v, p, facing);
        const pole = K.mix(P.shiftA, P.shiftB, t);
        // strong thin-film band across all worked surface (not gated to creases)
        const filmAmt = (0.22 + K.clamp((slope - 0.6) * 0.09, 0, 0.45)) * (0.55 + 0.45 * wWeight);
        let cellCol = K.mix(body, pole, filmAmt);
        cellCol = K.mix(cellCol, troughHue, troughLean * 0.62);
        cellCol = K.mix(cellCol, ridgeHue,  ridgeLean  * 0.50);

        x.globalCompositeOperation = 'source-over';
        x.fillStyle = K.rgba(cellCol, wWeight < 0.6 ? K.clamp(wWeight * 1.7, 0, 1) : 1);
        x.fillRect(xx, yy, step + 1, step + 1);

        // iridescent burst on the sharpest creases (saturated tint, never white)
        if (slope > 1.6 && wWeight > 0.2) {
          const burst = K.clamp((slope - 1.6) * 0.07, 0, 0.52) * wWeight;
          x.fillStyle = K.rgba(K.mix(pole, troughLean > 0.5 ? troughHue : ridgeHue, 0.45), burst);
          x.fillRect(xx, yy, step + 1, step + 1);
        }

        // crisp specular glints on the very sharpest micro-ridges
        const glGate = (p.sheen === 'Mirror' ? 6.0 : 7.5);
        if (slope > glGate && wWeight > 0.22) {
          let gl = K.clamp((slope - glGate) * 0.045, 0, 0.34) * sheenK * wWeight;
          // CRUSH: hot DIRECTIONAL specular on ridges facing the light (note #3)
          if (p.layout === 'Crush') {
            const dir = K.clamp((hu * crushLC + hv * crushLS) / (du + 1e-4) * 0.6 + 0.5, 0, 1);
            gl *= (0.5 + 1.4 * dir);
          }
          // coloured glint: lean to the ridge hue (keeps glints chromatic, not white)
          x.globalCompositeOperation = 'lighter';
          x.fillStyle = K.rgba(K.mix(K.mix(pole, ridgeHue, 0.4), P.glint, 0.35), gl);
          x.fillRect(xx, yy, step + 1, step + 1);
          // pure-white hotspot only on the very sharpest ridges, tighter than before
          if (slope > glGate + 5.5) {
            x.globalCompositeOperation = 'lighter';
            x.fillStyle = K.rgba(P.glint, K.clamp((slope - glGate - 5.5) * 0.03, 0, 0.16) * gd * sheenK * wWeight);
            x.fillRect(xx, yy, step + 1, step + 1);
          }
        }
      }
    }
    x.restore();

    // ── 3. SHAPED CALM NEGATIVE SPACE — soft saturated iridescent wash OUTSIDE
    // the mass so the ground reads as composed breathing room, not dead emptiness.
    const calmStrength = (p.layout === 'Pool' ? 0.9 : p.layout === 'Shards' ? 0.8 :
                          p.layout === 'Drape' ? 0.55 : p.layout === 'Radial' ? 0.5 : 0.45);
    x.save(); x.globalCompositeOperation = 'source-over';
    const ncx = (1 - lx) * W, ncy = (1 - ly) * H;
    const calmPole = K.mix(P.base, K.mix(P.shiftA, P.shiftB, 0.5), 0.22);
    const cg = x.createRadialGradient(ncx, ncy, 0, ncx, ncy, Math.max(W, H) * 0.6);
    cg.addColorStop(0, K.rgba(K.mix(baseMid, calmPole, 0.4), 0.62 * calmStrength));
    cg.addColorStop(0.4, K.rgba(K.mix(P.base, P.deep, 0.08), 0.30 * calmStrength));
    cg.addColorStop(1, K.rgba(P.base, 0));
    x.fillStyle = cg; x.fillRect(0, 0, W, H);
    x.restore();

    // ── 4. REFRACTION CAUSTICS — rippling oil-slick bands across the focal ──
    x.save(); x.globalCompositeOperation = 'lighter';
    const cN = K.rint(r, 2, 4);
    for (let i = 0; i < cN; i++) {
      const cx0 = (lx + (r() - 0.5) * 0.40) * W;
      const cy0 = (ly + (r() - 0.5) * 0.40) * H;
      const len = (0.35 + r() * 0.45) * Math.max(W, H);
      const ca = p.ang + (r() - 0.5) * 0.6;
      const segs = 80;
      const pole = K.mix(P.shiftA, P.shiftB, r());
      x.lineWidth = 1 + r() * 1.6;
      x.strokeStyle = K.rgba(pole, 0.08 + r() * 0.09);
      x.beginPath();
      for (let sI = 0; sI <= segs; sI++) {
        const t = sI / segs;
        const along = (t - 0.5) * len;
        const wob = Math.sin(t * Math.PI * (4 + r() * 4) + i) * (8 + r() * 22) * Math.sin(t * Math.PI);
        const px = cx0 + Math.cos(ca) * along - Math.sin(ca) * wob;
        const py = cy0 + Math.sin(ca) * along + Math.cos(ca) * wob;
        sI === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();

    // ── 5. FOCAL SHEEN — a soft coloured iridescent lobe on the focal anchor. ──
    const fcx = lx * W, fcy = ly * H;
    const burstPole = K.mix(P.shiftA, P.shiftB, 0.5);
    K.sheen(x, fcx, fcy, Math.max(W, H) * 0.16, K.mix(burstPole, P.glint, 0.25), 0.15 * gd * sheenK);

    // ── 6. LIGHT-LEAK from an edge — coloured, bright but never white ──
    const leakSide = r();
    const lkx = leakSide < 0.5 ? -W * 0.05 : W * 1.05;
    const lky = H * (0.15 + r() * 0.7);
    K.bloom(x, lkx, lky, Math.max(W, H) * 0.42, K.mix(P.shiftA, P.shiftB, 0.5), 0.10);

    // ── 7. RARE CHASE EVENTS ──
    if (p.event === 'Spectrum Burst') {
      x.save(); x.globalCompositeOperation = 'lighter';
      const bx = fcx, by = fcy, rings = 22;
      for (let i = 0; i < rings; i++) {
        const rr = (i / rings) * Math.max(W, H) * 0.5;
        const pole = K.mix(P.shiftA, P.shiftB, (Math.sin(i * 0.6) + 1) / 2);
        x.strokeStyle = K.rgba(pole, 0.08);
        x.lineWidth = 6; x.beginPath(); x.arc(bx, by, rr, 0, Math.PI * 2); x.stroke();
      }
      K.bloom(x, bx, by, Math.max(W, H) * 0.24, K.mix(burstPole, P.glint, 0.2), 0.15 * gd);
      x.restore();
    } else if (p.event === 'Mirror Seam') {
      x.save();
      const mw = Math.max(W, H) * 0.12, mh = Math.max(W, H) * 0.85;
      x.translate(fcx, fcy); x.rotate(p.ang);
      x.globalCompositeOperation = 'lighter';
      const grad = x.createLinearGradient(-mw / 2, 0, mw / 2, 0);
      grad.addColorStop(0, K.rgba(P.shiftA, 0));
      grad.addColorStop(0.4, K.rgba(P.shiftA, 0.28 * gd));
      grad.addColorStop(0.5, K.rgba(K.mix(burstPole, P.glint, 0.35), 0.32 * gd));
      grad.addColorStop(0.6, K.rgba(P.shiftB, 0.28 * gd));
      grad.addColorStop(1, K.rgba(P.shiftB, 0));
      x.fillStyle = grad; x.fillRect(-mw / 2, -mh / 2, mw, mh);
      x.restore();
      K.sheen(x, fcx, fcy, Math.max(W, H) * 0.12, K.mix(burstPole, P.glint, 0.3), 0.15 * gd);
    }

    // ── 8. FILMIC FINISH ──
    K.chromaSplit(x, W, H, 2);
    K.mottle(x, 0, 0, W, H, P.base, 5200, r, 'overlay');
    K.grain(x, W, H, 1100, r);
    x.save(); x.globalCompositeOperation = 'multiply';
    const vg = x.createRadialGradient(fcx, fcy, Math.min(W, H) * 0.12, fcx, fcy, Math.max(W, H) * 0.85);
    vg.addColorStop(0, 'rgba(255,255,255,1)');
    vg.addColorStop(1, K.rgba(K.mix(P.deep, '#ffffff', 0.50), 1));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'foil3', draw, traits };
})();
