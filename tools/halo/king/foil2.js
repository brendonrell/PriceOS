/* FOIL2 — iridescent crumpled-holographic-foil, rebuilt as a TRUE generative SYSTEM.
 *
 * The flaw in foil_final: ONE height field with a mandatory hero crease → every
 * seed was the same diagonal drape recolored. A stamp, not generative art.
 *
 * foil2 makes COMPOSITION the primary trait. A `Layout` axis selects one of SIX
 * structurally distinct fold arrangements — each a different WAY foil crumples,
 * not the same crinkle relocated:
 *
 *   1. Drape  — a few large sweeping folds, sparse, luxurious cloth flow.
 *   2. Crush  — dense all-over crumple, high-frequency creases edge to edge.
 *   3. Pleat  — parallel directional ridges/pleats, accordion-like.
 *   4. Radial — folds bursting from one off-centre point, fan of creases.
 *   5. Shards — separated torn foil fragments scattered with negative space.
 *   6. Pool   — a mostly-smooth iridescent sheet, one or two creases, big calm.
 *
 * KEPT from foil_final: the oil-slick thin-film look, the 10 bespoke saturated
 * palettes, window.FORCE_PAL, bright saturated grounds (never dark), abstract,
 * varied aspect, deterministic per seed, rare events, coarse fast grid.
 *
 * Each layout owns its own height-field shaper hFn(noise,u,v,p) → relief; the
 * shared renderer lights it, applies oil-slick shift, glints, finish. So the
 * STRUCTURE differs per layout while the surface treatment stays the foil look.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // 10 hand-picked DISTINCT jewel worlds (from foil_final, untouched).
  //   base — dominant saturated body · shiftA/B — thin-film hue-shift poles
  //   glint — specular on sharp ridges · deep — COLOURED shadow trough (never black)
  const PALS = [
    { name: 'Molten Gold',     base: '#f5a623', shiftA: '#18d3c0', shiftB: '#ff3da6', glint: '#fff3c4', deep: '#b5471a' },
    { name: 'Emerald Oil',     base: '#12b76a', shiftA: '#ffd23f', shiftB: '#ff3df0', glint: '#d6ffe9', deep: '#07664a' },
    { name: 'Sapphire Flare',  base: '#2b6bff', shiftA: '#ff8a3d', shiftB: '#2af0ff', glint: '#dcebff', deep: '#16267a' },
    { name: 'Amethyst',        base: '#9b4dff', shiftA: '#39ffc2', shiftB: '#ffd23f', glint: '#f0dcff', deep: '#4a1c8a' },
    { name: 'Rose Gold',       base: '#ff8aa8', shiftA: '#7af0e0', shiftB: '#ffe6c4', glint: '#fff0f0', deep: '#b5566a' },
    { name: 'Acid Oil',        base: '#c2ff3d', shiftA: '#ff2bd6', shiftB: '#2af0ff', glint: '#f6ffd6', deep: '#4a8a1c' },
    { name: 'Fuchsia Chrome',  base: '#ff2b8f', shiftA: '#ffd23f', shiftB: '#2af0ff', glint: '#ffd9ec', deep: '#8a1c5a' },
    { name: 'Tangerine Mylar', base: '#ff7a2b', shiftA: '#a05cff', shiftB: '#18d3c0', glint: '#fff0d6', deep: '#b5401a' },
    { name: 'Aqua Pearl',      base: '#18d3c0', shiftA: '#ff3da6', shiftB: '#ffd23f', glint: '#d6fff8', deep: '#0a6e7a' },
    { name: 'Opal Flame',      base: '#ff9be0', shiftA: '#7af0ff', shiftB: '#b6ff6e', glint: '#ffffff', deep: '#a07acf' },
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
    // per-layout structural rolls (drawn here so order is fixed)
    const A = {
      // Drape: number of big sweeping folds
      drapeN: K.rint(r, 2, 4),
      // Crush: crumple frequency
      crushF: 4.0 + r() * 3.0,
      // Pleat: number of pleats + pleat angle
      pleatN: K.rint(r, 6, 14),
      pleatAng: ang * 0.5 + (r() < 0.5 ? 0 : Math.PI / 2) * 0,
      // Radial: burst centre (separate from focal so it varies) + arm count
      radCx: 0.22 + r() * 0.56, radCy: 0.22 + r() * 0.56,
      radN: K.rint(r, 7, 16),
      // Shards: number of torn fragments + their seeds
      shardN: K.rint(r, 3, 6),
      shards: [],
      // Pool: the one or two creases through the calm sheet
      poolCreaseN: K.rint(r, 1, 2),
    };
    for (let i = 0; i < 8; i++) {
      A.shards.push({
        cx: 0.14 + r() * 0.72, cy: 0.14 + r() * 0.72,
        rad: 0.12 + r() * 0.20, rot: r() * Math.PI, freq: 2.0 + r() * 2.5,
        squash: 0.55 + r() * 0.7,
      });
    }
    const poolCreases = [];
    for (let i = 0; i < 2; i++) {
      poolCreases.push({ x: 0.25 + r() * 0.5, y: 0.25 + r() * 0.5, ang: (r() - 0.5) * Math.PI, w: 0.10 + r() * 0.06 });
    }
    A.poolCreases = poolCreases;

    return { layout, pal, fmt, density, sheen, event, fx, fy, ang, dm, shiftRate, sharp, A };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Layout: p.layout, Palette: p.pal.name, Format: p.fmt.t, Density: p.density, Event: p.event };
  }

  // ── tiny helpers ──
  function smooth(t) { t = K.clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  // signed normalised distance to a wandering crease line through (cx,cy) at angle
  function creaseD(noise, u, v, cx, cy, ca, halfW, wob) {
    const dx = u - cx, dy = v - cy;
    const c = Math.cos(ca), s = Math.sin(ca);
    const along = dx * c + dy * s;
    const perp  = -dx * s + dy * c;
    const wander = noise.fbm(along * 2.4 + 13.7, cx * 5.0 + 4.0, 3) * (halfW * (wob || 1.6));
    return (perp - wander) / halfW;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * SIX HEIGHT-FIELD SHAPERS — each returns relief at normalised (u,v).
   * Each ALSO returns the "worked weight" w in [0,1] (1 = active foil, 0 = calm
   * negative space) so the renderer can shape composition / negative space.
   * ════════════════════════════════════════════════════════════════════════ */

  // 1. DRAPE — a few large sweeping folds, smooth luxurious cloth flow.
  function hDrape(noise, u, v, p) {
    const c = Math.cos(p.ang), s = Math.sin(p.ang);
    const ru = u * c - v * s, rv = u * s + v * c;
    const warp = noise.fbm(u * 1.0, v * 1.0, 3) * 0.7;
    // few broad sinusoidal folds
    let h = Math.sin((ru + warp) * Math.PI * (0.9 + 0.25 * p.A.drapeN));
    h = Math.sign(h) * Math.pow(Math.abs(h), 1 / (p.sharp * 0.85));
    h += 0.55 * Math.sin((rv + warp * 0.6) * Math.PI * 0.8);
    h += 1.05 * noise.fbm(u * 1.8, v * 1.8, 4);     // big drape body
    h += 0.10 * noise.fbm(u * 5.5, v * 5.5, 3);     // whisper of micro
    // calm region opposite the focal — active negative space
    const dcx = 1 - p.fx, dcy = 1 - p.fy;
    const d = Math.hypot(u - dcx, v - dcy) + noise.fbm(u * 2 + 9, v * 2 + 5, 3) * 0.12;
    const w = smooth((d - 0.16) / 0.34);
    return { h: h * (0.45 + 0.55 * w), w };
  }

  // 2. CRUSH — dense all-over crumple: blocky FACETED creases, like a balled-up
  // sheet of foil. Built from a couple of low-octave ridged layers (broad facets)
  // rather than many high-octave ones (which read as fibrous static).
  function hCrush(noise, u, v, p) {
    const f = p.A.crushF * (0.45 + 0.35 * p.dm);   // lower base freq → broader facets
    const warp = noise.fbm(u * 1.6, v * 1.6, 3) * 0.7;
    // two broad ridged layers = big crumple facets with sharp valley creases
    const n1 = noise.fbm((u + warp) * f + 1.1, (v + warp) * f + 4.3, 2);
    const n2 = noise.fbm((u - warp) * f * 1.7 + 8.0, (v + warp) * f * 1.7 + 2.0, 2);
    let h = (1 - Math.abs(n1)) * (1 - Math.abs(n1)) * 1.4
          + (1 - Math.abs(n2)) * (1 - Math.abs(n2)) * 0.8;
    // sharpen valleys into creases via the sharp param; faint micro tooth only
    h = Math.pow(h, p.sharp * 0.8);
    h += 0.12 * noise.fbm(u * 6.0, v * 6.0, 2);
    h = (h - 1.0) * 1.7;
    // mostly worked all-over; a slight calm only at one corner for a breath
    const d = Math.hypot(u - (1 - p.fx), v - (1 - p.fy));
    const w = 0.6 + 0.4 * smooth((d - 0.45) / 0.5);
    return { h, w: K.clamp(w, 0.5, 1) };
  }

  // 3. PLEAT — parallel directional ridges/pleats, accordion.
  function hPleat(noise, u, v, p) {
    const ca = p.ang;
    const c = Math.cos(ca), s = Math.sin(ca);
    const ru = u * c - v * s;
    const warp = noise.fbm(u * 1.6 + 2, v * 1.6 + 5, 3) * 0.14;  // gentle wander so pleats aren't dead-straight
    const n = p.A.pleatN * (0.7 + 0.6 * p.dm);
    // triangle-ish accordion ridges
    const ph = (ru + warp) * n;
    let tri = ((ph % 1) + 1) % 1;
    tri = tri < 0.5 ? tri * 2 : (1 - tri) * 2;             // 0..1..0
    let h = Math.pow(tri, 1 / p.sharp) * 2 - 1;
    // slight perpendicular sag so pleats drape, not a flat corrugation
    h += 0.30 * Math.sin((u * s + v * c) * Math.PI * 1.1) ;
    h += 0.18 * noise.fbm(u * 4, v * 4, 3);
    // calm taper at one end of the pleats (negative space along the run)
    const along = u * s + v * c; // perpendicular axis
    const w = 0.5 + 0.5 * smooth((along - (0.2 + 0.2 * (1 - p.dm))) / 0.6);
    return { h, w: K.clamp(0.4 + w * 0.6, 0.4, 1) };
  }

  // 4. RADIAL — folds bursting from one off-centre point.
  function hRadial(noise, u, v, p) {
    const cx = p.A.radCx, cy = p.A.radCy;
    const dx = u - cx, dy = v - cy;
    const ang = Math.atan2(dy, dx);
    const rad = Math.hypot(dx, dy);
    const arms = p.A.radN * (0.7 + 0.5 * p.dm);
    const warp = noise.fbm(u * 1.5, v * 1.5, 3) * 0.5;
    // angular ridges fanning out, getting broader with radius
    let h = Math.sin(ang * arms + warp * 2.0 + rad * 3.0);
    h = Math.sign(h) * Math.pow(Math.abs(h), 1 / p.sharp);
    // concentric drape rings damped, so it reads as a burst not a spiral
    h += 0.35 * Math.sin(rad * Math.PI * (4 + 3 * p.dm) + warp);
    h += 0.7 * noise.fbm(u * 2.2, v * 2.2, 4);
    // energy concentrates near the burst centre, calms far out
    const w = smooth(1 - (rad - 0.10) / 0.7);
    return { h: h * (0.4 + 0.6 * w), w: K.clamp(w, 0.18, 1) };
  }

  // 5. SHARDS — separated torn foil fragments scattered with negative space.
  function hShards(noise, u, v, p) {
    const n = Math.min(p.A.shardN, p.A.shards.length);
    let h = noise.fbm(u * 1.2, v * 1.2, 3) * 0.12;   // faint ground ripple in the gaps
    let w = 0.06;                                     // mostly negative space
    for (let i = 0; i < n; i++) {
      const sh = p.A.shards[i];
      const dx = (u - sh.cx), dy = (v - sh.cy);
      const c = Math.cos(sh.rot), s = Math.sin(sh.rot);
      const lx = (dx * c - dy * s);
      const ly = (dx * s + dy * c) * sh.squash;
      const d = Math.hypot(lx, ly) / sh.rad;
      if (d > 1.15) continue;
      // torn edge: crisper, less lichen-like (sharper jagged radial falloff)
      const edge = noise.fbm(Math.atan2(ly, lx) * 2.4 + i * 3.0, sh.cx * 4, 2) * 0.26;
      const mask = smooth((1.0 + edge - d) / 0.18);   // tighter band → crisp torn rim
      if (mask <= 0) continue;
      // crumpled foil relief inside the shard — stronger, more faceted
      let sh_h = Math.sin(lx * Math.PI * sh.freq + i) * Math.cos(ly * Math.PI * sh.freq * 0.85);
      sh_h = Math.sign(sh_h) * Math.pow(Math.abs(sh_h), 1 / p.sharp);
      sh_h += 0.45 * Math.sin((lx + ly) * Math.PI * sh.freq * 1.4 + i * 2.1);  // cross creases
      sh_h += 0.55 * noise.fbm(u * 4.5 + i * 5, v * 4.5 + i * 5, 3);
      h += sh_h * mask * 1.25;
      w = Math.max(w, mask);
    }
    return { h, w };
  }

  // 6. POOL — a mostly-smooth iridescent sheet, one or two creases, big calm.
  function hPool(noise, u, v, p) {
    // gentle smooth sheet — very low frequency
    let h = 0.6 * noise.fbm(u * 1.3, v * 1.3, 4);
    h += 0.15 * Math.sin((u + v) * Math.PI * 1.2);
    let w = 0.16;   // calm baseline (active negative space dominates)
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
    const baseLift = K.mix(P.base, P.glint, 0.13);
    const gd = K.clamp(1.05 - K.lum(P.base) * 0.85, 0.45, 1);
    // mirror sheen pushes specular hotter than satin
    const sheenK = p.sheen === 'Mirror' ? 1.4 : 0.85;

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
        const h = s0.h, wWeight = s0.w;
        const hu = hFn(noise, u + du, v, p).h - h;
        const hv = hFn(noise, u, v + dv, p).h - h;
        const slope = Math.sqrt(hu * hu + hv * hv) / du;
        const ndx = lx - u, ndy = ly - v;
        const nl = Math.hypot(ndx, ndy) + 1e-4;
        const facing = (hu * ndx + hv * ndy) / (du * nl);

        // body colour: saturated base shaded by facet facing
        const lit = K.clamp(0.5 + facing * 0.5, 0, 1);
        let body;
        if (lit < 0.5) body = K.mix(baseDark, P.base, lit * 2);
        else           body = K.mix(P.base, baseLift, (lit - 0.5) * 2);

        // shards have negative space — let the bare ground show through gaps
        if (p.layout === 'Shards' && wWeight < 0.04) continue;

        // oil-slick thin-film tint on the creases, demoted in calm regions
        const t = shiftT(noise, u, v, p, facing);
        const pole = K.mix(P.shiftA, P.shiftB, t);
        const shiftAmt = K.clamp((slope - 1.2) * 0.07, 0, 0.34)
                       * (0.45 + lit * 0.55)
                       * (0.35 + 0.65 * wWeight);
        let cellCol = K.mix(body, pole, shiftAmt);

        x.globalCompositeOperation = 'source-over';
        x.fillStyle = K.rgba(cellCol, p.layout === 'Shards' ? K.clamp(wWeight * 1.4, 0, 1) : 1);
        x.fillRect(xx, yy, step + 1, step + 1);

        // iridescent burst on the sharpest creases (saturated tint, never white)
        if (slope > 2.4 && wWeight > 0.3) {
          const burst = K.clamp((slope - 2.4) * 0.05, 0, 0.40) * wWeight;
          x.fillStyle = K.rgba(pole, burst);
          x.fillRect(xx, yy, step + 1, step + 1);
        }

        // crisp specular glints on the very sharpest micro-ridges
        const glGate = (p.sheen === 'Mirror' ? 6.5 : 8.0);
        if (slope > glGate && wWeight > 0.25) {
          const gl = K.clamp((slope - glGate) * 0.04, 0, 0.30) * sheenK * wWeight;
          x.globalCompositeOperation = 'lighter';
          x.fillStyle = K.rgba(K.mix(pole, P.glint, 0.45), gl);
          x.fillRect(xx, yy, step + 1, step + 1);
          if (slope > glGate + 5.0) {
            x.globalCompositeOperation = 'lighter';
            x.fillStyle = K.rgba(P.glint, K.clamp((slope - glGate - 5.0) * 0.03, 0, 0.18) * gd * sheenK * wWeight);
            x.fillRect(xx, yy, step + 1, step + 1);
          }
        }
      }
    }
    x.restore();

    // ── 3. SHAPED CALM NEGATIVE SPACE — soft saturated iridescent wash in the
    // calm region so it reads as composed breathing room. Layouts with their own
    // dominant calm (Pool/Shards/Drape) get a stronger wash; dense ones a whisper.
    const calmStrength = (p.layout === 'Pool' ? 0.9 : p.layout === 'Shards' ? 0.8 :
                          p.layout === 'Drape' ? 0.7 : p.layout === 'Radial' ? 0.6 : 0.4);
    x.save(); x.globalCompositeOperation = 'source-over';
    const ncx = (1 - lx) * W, ncy = (1 - ly) * H;
    const calmPole = K.mix(P.base, K.mix(P.shiftA, P.shiftB, 0.5), 0.22);
    const cg = x.createRadialGradient(ncx, ncy, 0, ncx, ncy, Math.max(W, H) * 0.6);
    cg.addColorStop(0, K.rgba(K.mix(baseMid, calmPole, 0.4), 0.72 * calmStrength));
    cg.addColorStop(0.4, K.rgba(K.mix(P.base, P.deep, 0.08), 0.34 * calmStrength));
    cg.addColorStop(1, K.rgba(P.base, 0));
    x.fillStyle = cg; x.fillRect(0, 0, W, H);
    x.restore();

    // ── 4. REFRACTION CAUSTICS — rippling oil-slick bands across the focal ──
    x.save(); x.globalCompositeOperation = 'lighter';
    const cN = K.rint(r, 2, 4);
    for (let i = 0; i < cN; i++) {
      const cx0 = (lx + (r() - 0.5) * 0.45) * W;
      const cy0 = (ly + (r() - 0.5) * 0.45) * H;
      const len = (0.4 + r() * 0.5) * Math.max(W, H);
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

    // ── 5. FOCAL SHEEN — a soft coloured iridescent lobe on the focal anchor.
    // No white bloom blob: saturated, low alpha.
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
    // coloured depth vignette — darken edges toward the deep trough hue
    x.save(); x.globalCompositeOperation = 'multiply';
    const vg = x.createRadialGradient(fcx, fcy, Math.min(W, H) * 0.18, fcx, fcy, Math.max(W, H) * 0.85);
    vg.addColorStop(0, 'rgba(255,255,255,1)');
    vg.addColorStop(1, K.rgba(K.mix(P.deep, '#ffffff', 0.45), 1));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'foil2', draw, traits };
})();
