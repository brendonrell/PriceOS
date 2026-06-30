/* KINTSUGI — black cracked ceramic glaze mended in gold.
 * A dark crazed enamel FIELD shattered into plates and veined with molten GOLD
 * seams tracing every break; the gold rivers branch across the frame, the breaks
 * subtly forming an impossible/figural arrangement that should not be there.
 * Pure abstract surface — no scene. SURREAL = a break mended in gold whose cracks
 * form a figure that isn't there. Rich, dark, precious. Gold-on-dark palette world.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded.
 *
 * ── ANTI-TWIN DESIGN (the whole point of this engine) ──────────────────────────
 * This is a CONTINUOUS system, NOT a template/mode picker. There is NO discrete
 * "mode" list any more — the focal FORM of the gold (where the precious metal
 * concentrates) is itself a continuously sampled field built from a per-seed mix
 * of independent attractors (points, a tilted band, a ring arc, scattered islands,
 * an uncanny figure), each weighted by its own real-valued knob. So two seeds can
 * never land "the same arrangement". Every salient parameter — plate count, plate
 * scale, gold coverage fraction, seam width regime, glaze rendering, branch mass,
 * field rotation/anisotropy/crop, format aspect, and glaze/gold hue+value+sat — is
 * a real-valued sample from an INDEPENDENT rng sub-stream, so no two axes are
 * correlated. The palette is a *world*, not a swatch. The texture/haze/vignette
 * grade and the gold-on-dark world are preserved unchanged. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* ── PALETTE WORLDS — gold-on-dark anchors. CENTRES of a region, not fixed
     swatches: draw() jitters hue/value/sat off each per seed so the run never
     repeats an exact colour. Spread across tone/temperature/value.            */
  const PALS = [
    { name: 'Raku Night',   w: 1.0, glaze: ['#0c0c0e', '#15161a', '#0a0d10', '#1a1518'], deep: '#020203', gold: '#c79a3e', goldHi: '#f6e6a8', bronze: '#9c7a44', ash: '#3a4046', warm: 0.0 },
    { name: 'Oxblood Kiln', w: 1.0, glaze: ['#120608', '#1d0a0d', '#0c0506', '#240f10'], deep: '#060102', gold: '#cc9a3c', goldHi: '#f7e4a0', bronze: '#a37640', ash: '#4a3334', warm: 0.18 },
    { name: 'Celadon Dusk', w: 1.0, glaze: ['#08110f', '#0c1a17', '#06100e', '#12211d'], deep: '#020605', gold: '#c8a04a', goldHi: '#f4e6ad', bronze: '#94814c', ash: '#33474a', warm: -0.1 },
    { name: 'Aubergine',    w: 0.9, glaze: ['#0e0810', '#170d1a', '#0a060c', '#1f1024'], deep: '#040106', gold: '#c99845', goldHi: '#f6e2a4', bronze: '#9a7848', ash: '#3d3548', warm: 0.06 },
    { name: 'Tetsu Iron',   w: 0.9, glaze: ['#0a0b0c', '#121417', '#080a0c', '#171a1d'], deep: '#020304', gold: '#b89a5a', goldHi: '#eee0b0', bronze: '#86744c', ash: '#3b4348', warm: -0.04 },
    { name: 'Shino Clay',   w: 0.9, glaze: ['#2a2118', '#332720', '#241c14', '#3b2d22'], deep: '#0f0a06', gold: '#d4a544', goldHi: '#f8e7ab', bronze: '#a9824a', ash: '#5a4a38', warm: 0.22 },
    { name: 'Ash Celadon',  w: 0.8, glaze: ['#1d2622', '#26322c', '#1a2420', '#2e3a33'], deep: '#0a100d', gold: '#cba850', goldHi: '#f2e6b4', bronze: '#94885a', ash: '#56655c', warm: -0.06 },
    { name: 'Gilt Ember',   w: 0.5, glaze: ['#0c0807', '#16100b', '#0a0705', '#1e140c'], deep: '#040201', gold: '#e0ad48', goldHi: '#ffeeb2', bronze: '#b07c38', ash: '#4a3a2c', warm: 0.34 },
  ];

  /* helpers ────────────────────────────────────────────────────────────────── */
  // hex → HSL, jitter in HSL space, back to hex. keeps colour inside the world
  // while moving it continuously per seed (no two pieces share an exact colour).
  function shiftHSL(hex, dh, ds, dl) {
    const c = K.h2r(hex); let R = c[0] / 255, G = c[1] / 255, B = c[2] / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
    let h = 0, s = 0, l = (mx + mn) / 2;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === R) h = (G - B) / d + (G < B ? 6 : 0);
      else if (mx === G) h = (B - R) / d + 2; else h = (R - G) / d + 4;
      h *= 60;
    }
    h = (h + dh) % 360; if (h < 0) h += 360;
    s = K.clamp(s + ds, 0, 1); l = K.clamp(l + dl, 0, 1);
    return K.hsl2hex(h, s, l);
  }
  // make a jittered, fully-resolved palette instance for this seed
  function jitterPal(base, jr) {
    const goldHue = (jr() - 0.5) * 18;
    const goldSat = (jr() - 0.5) * 0.18;
    const goldLit = (jr() - 0.5) * 0.12;
    const glazeHue = (jr() - 0.5) * 20;
    const glazeSat = (jr() - 0.5) * 0.12;
    const glazeLit = (jr() - 0.5) * 0.05 + (jr() - 0.5) * 0.06;
    return {
      name: base.name, warm: base.warm,
      glaze: base.glaze.map((g) => shiftHSL(g, glazeHue + (jr() - 0.5) * 7, glazeSat, glazeLit)),
      deep: shiftHSL(base.deep, glazeHue, glazeSat * 0.5, glazeLit * 0.4),
      gold: shiftHSL(base.gold, goldHue, goldSat, goldLit),
      goldHi: shiftHSL(base.goldHi, goldHue, goldSat * 0.5, goldLit * 0.6),
      bronze: shiftHSL(base.bronze, goldHue, goldSat * 0.7, goldLit),
      ash: shiftHSL(base.ash, glazeHue, glazeSat, glazeLit),
    };
  }

  function pickPalW(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    let tot = 0; for (const p of PALS) tot += p.w;
    let t = r() * tot;
    for (const p of PALS) { t -= p.w; if (t <= 0) return p; }
    return PALS[0];
  }

  function draw(cv, seed) {
    // ── INDEPENDENT SUB-STREAMS — one per axis, so a collision in any single
    //    axis cannot drag the others along. Core anti-twin move. ──────────────
    const r  = K.rng(seed);                         // main paint/geometry stream
    const rP = K.rng((seed ^ 0x85ebca6b) >>> 0);    // palette choice
    const rJ = K.rng((seed ^ 0xc2b2ae35) >>> 0);    // palette colour jitter
    const rF = K.rng((seed ^ 0x27d4eb2f) >>> 0);    // format
    const rZ = K.rng((seed ^ 0x165667b1) >>> 0);    // zoom / plate scale
    const rD = K.rng((seed ^ 0xd3a2646c) >>> 0);    // gold coverage / amount
    const rG = K.rng((seed ^ 0xfd7046c5) >>> 0);    // global geometry (rot/crop/aniso)
    const rC = K.rng((seed ^ 0x9e3779b1) >>> 0);    // composition (attractor mix)
    const rS = K.rng((seed ^ 0xa54ff53a) >>> 0);    // seam character / width regime
    const noise = K.makeNoise(seed * 7 + 1);

    const palBase = pickPalW(rP);
    const pal = jitterPal(palBase, rJ);

    // ── FORMAT — continuous aspect (long edge fixed). ──
    const LONG = 1180;
    const aspV = rF();
    const ar = 0.60 + Math.pow(aspV, 0.92) * 1.02;
    let W, H;
    if (ar < 1) { H = LONG; W = Math.round(LONG * (0.62 + ar * 0.38)); }
    else        { W = LONG; H = Math.round(LONG / (1.0 + (ar - 1) * 1.0)); }
    W = Math.max(760, Math.min(1360, W)); H = Math.max(760, Math.min(1360, H));
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const MN = Math.min(W, H);
    function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

    // ── ZOOM / PLATE SCALE — wide & continuous, decoupled from coverage. ──
    const zoom = 0.10 + Math.pow(rZ(), 0.80) * 0.90;        // 0.10..1.0
    const NP = Math.round(8 + zoom * zoom * 210);           // ~8 .. ~218 plates
    const minGap = MN * (0.155 - zoom * 0.118);
    const ZS = (1.35 - zoom * 0.7);                         // feature scale

    // ── GOLD COVERAGE — how much of the field gets mended. Independent axis.
    //    Drives the single biggest visual difference: a whisper of gold ↔ a
    //    near-fully-gilded web. NOT tied to zoom/composition. ──
    const coverage = Math.pow(rD(), 1.25);                  // 0..1, biased low-mid
    // gilding regime: pooled/flooded gold plates vs pure linear seams. Continuous.
    const flood = Math.pow(rD(), 1.6) * (0.35 + coverage * 0.55); // 0..~0.9 chance a plate floods

    // ── SEAM CHARACTER — width regime varies hard: hairline fractures ↔ thick
    //    molten rivers. Independent stream so two pieces with same coverage still
    //    differ in line weight & feel. ──
    const seamBase = 0.0010 + Math.pow(rS(), 1.3) * 0.0042; // thin..thick base width
    const seamGain = 0.006 + rS() * 0.018;                  // prominence→width gain
    const wobAmp = (0.004 + rS() * 0.020) * ZS;             // crack meander amplitude
    const beadProb = 0.18 + rS() * 0.34;                    // node→bead bloom freq
    const branchMass = Math.pow(rS(), 1.1);                 // 0..1 tributary density

    // ── GLOBAL FIELD TRANSFORM — per-seed rotation + anisotropy + focal crop. ──
    const fieldRot = (rG() - 0.5) * 1.1;                    // ±0.55 rad whole-field tilt
    const cR = Math.cos(fieldRot), sR = Math.sin(fieldRot);
    const aniso = 0.70 + rG() * 0.7;                        // x/y stretch of the lattice
    const cropX = (rG() - 0.5) * 0.22;
    const cropY = (rG() - 0.5) * 0.22;

    // ── COMPOSITION FIELD — instead of one discrete mode, build a per-seed MIX
    //    of attractors. Each has an independent strength knob; the gold-prominence
    //    field is their weighted max. This is what guarantees no two seeds share
    //    a focal arrangement. ──
    const fcx0 = W * (0.20 + rC() * 0.60), fcy0 = H * (0.18 + rC() * 0.62);
    const fcx = fcx0 + W * cropX, fcy = fcy0 + H * cropY;

    const attractors = [];
    // 0) ALWAYS a primary focus at fc — guarantees every seed has a strong, legible
    //    gold concentration (the kintsugi "mend") regardless of the random mix.
    attractors.push({
      type: 'pt', x: fcx0, y: fcy0,
      rad: MN * (0.22 + rC() * 0.30),
      pw: 1.0 + rC() * 0.7,
      wt: 0.85 + rC() * 0.15,
    });
    // 1) point bursts (impact / archipelago islands)
    const nPts = rint(rC, 0, 4);
    for (let i = 0; i < nPts; i++) {
      attractors.push({
        type: 'pt',
        x: W * (0.12 + rC() * 0.76), y: H * (0.12 + rC() * 0.76),
        rad: MN * (0.10 + rC() * 0.34),
        pw: 1.1 + rC() * 0.6,
        wt: 0.5 + rC() * 0.5,
      });
    }
    // 2) a tilted band / fault (spine / riverbed / fault)
    let band = null;
    if (rC() < 0.62) {
      const ba = (rC() - 0.5) * Math.PI;        // any orientation
      band = {
        type: 'band',
        cx: W * (0.30 + rC() * 0.40), cy: H * (0.30 + rC() * 0.40),
        nx: Math.cos(ba), ny: Math.sin(ba),     // band normal
        half: MN * (0.10 + rC() * 0.26),
        pw: 1.0 + rC() * 0.8,
        wt: 0.6 + rC() * 0.4,
        wave: rC() * 1.4,                        // sinuous band drift
      };
      attractors.push(band);
    }
    // 3) a ring arc (halo / rim)
    let ring = null;
    if (rC() < 0.45) {
      ring = {
        type: 'ring',
        x: W * (0.30 + rC() * 0.40), y: H * (0.30 + rC() * 0.40),
        rad: MN * (0.18 + rC() * 0.26),
        wid: MN * (0.03 + rC() * 0.10),
        rot: rC() * Math.PI * 2,
        arc: rC() < 0.5 ? Math.PI * (0.6 + rC() * 1.0) : Math.PI * 2,
        wt: 0.6 + rC() * 0.4,
      };
      attractors.push(ring);
    }
    // 4) edge-frame (rim emphasis)
    let frame = null;
    if (rC() < 0.22) {
      frame = { type: 'frame', band: MN * (0.16 + rC() * 0.22), pw: 1.3 + rC() * 0.5, wt: 0.5 + rC() * 0.4 };
      attractors.push(frame);
    }
    // 5) THE UNCANNY FIGURE — head+shoulders mass that the cracks suggest.
    let fig = null;
    const figStrength = rC();
    if (figStrength > 0.66) {
      fig = {
        type: 'fig',
        hx: W * (0.34 + rC() * 0.32), hy: H * (0.24 + rC() * 0.16),
        hr: MN * (0.085 + rC() * 0.06),
        wt: 0.7 + rC() * 0.3,
      };
      fig.shy = fig.hy + fig.hr * (1.9 + rC() * 0.7);
      fig.shrx = MN * (0.26 + rC() * 0.10);
      fig.shry = MN * (0.15 + rC() * 0.06);
      attractors.push(fig);
    }
    // ALWAYS keep a faint global falloff toward fc so even maximal-spread seeds
    // have a centre of gravity (prevents flat boredom).
    const baseFalloff = 0.10 + rC() * 0.22;

    function rint(rr, a, b) { return a + Math.floor(rr() * (b - a + 1)); }

    // prominence field: weighted max of attractor responses, in 0..1
    function promAt(mx, my) {
      let p = baseFalloff * K.clamp(1 - dist(mx, my, fcx, fcy) / (MN * 1.15), 0, 1);
      for (const at of attractors) {
        let v = 0;
        if (at.type === 'pt') {
          v = Math.pow(K.clamp(1 - dist(mx, my, at.x, at.y) / at.rad, 0, 1), at.pw);
        } else if (at.type === 'band') {
          const ox = mx - at.cx, oy = my - at.cy;
          const along = -ox * at.ny + oy * at.nx;           // tangential coord
          const drift = Math.sin(along / (MN * 0.5)) * at.half * at.wave;
          const d = Math.abs(ox * at.nx + oy * at.ny - drift) / at.half;
          v = Math.pow(K.clamp(1 - d, 0, 1), at.pw);
        } else if (at.type === 'ring') {
          const rr = dist(mx, my, at.x, at.y);
          let vv = Math.pow(K.clamp(1 - Math.abs(rr - at.rad) / at.wid, 0, 1), 1.4);
          if (at.arc < Math.PI * 2) {
            let a = Math.atan2(my - at.y, mx - at.x) - at.rot;
            a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            if (a > at.arc) { const over = Math.min(a - at.arc, Math.PI * 2 - a) / 0.5; vv *= K.clamp(1 - over, 0, 1); }
          }
          v = vv;
        } else if (at.type === 'frame') {
          const ed = Math.min(mx, W - mx, my, H - my) / at.band;
          v = Math.pow(K.clamp(1 - ed, 0, 1), at.pw);
        } else if (at.type === 'fig') {
          const headD = dist(mx, my, at.hx, at.hy) / at.hr;
          const head = Math.pow(K.clamp(1.15 - headD, 0, 1), 1.1);
          const sx = (mx - at.hx) / at.shrx, sy = (my - at.shy) / at.shry;
          const sh = Math.pow(K.clamp(1.05 - Math.sqrt(sx * sx + sy * sy), 0, 1), 1.2);
          const neckD = (Math.abs(mx - at.hx) / (MN * 0.085)) + Math.max(0, (at.shy - my) / (MN * 0.7));
          const neck = (my > at.hy && my < at.shy) ? Math.pow(K.clamp(1 - neckD, 0, 1), 1.1) * 0.85 : 0;
          v = Math.max(head, sh, neck);
        }
        p = Math.max(p, v * at.wt);
      }
      // a touch of fbm so the prominence boundary is organic, never a clean disc
      p += (noise.noise2(mx / 300, my / 300)) * 0.12;
      return K.clamp(p, 0, 1);
    }

    // ── BASE: deep glaze fill with a slow value drift (chiaroscuro ground) ──
    {
      const g = x.createRadialGradient(fcx, fcy, 0, fcx, fcy, MN * (1.0 + r() * 0.45));
      g.addColorStop(0, K.mix(pal.glaze[0], '#ffffff', 0.03 + r() * 0.06));
      g.addColorStop(0.5, pal.glaze[0]);
      g.addColorStop(1, pal.deep);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 1. BUILD THE PLATE GRAPH (Voronoi shards from jittered seed points).
    //    Points are scattered with a per-seed bias toward the prominence field
    //    so the plate density itself tracks the composition (smaller plates where
    //    the gold concentrates), but with global rotation+anisotropy applied.
    // ────────────────────────────────────────────────────────────────────────
    const pts = [];
    function addPt(px, py, kind) { pts.push({ x: px, y: py, k: kind || 0 }); }
    function warp(px, py) {
      let dx = px - W / 2, dy = py - H / 2;
      dx *= aniso; dy /= aniso;
      const rx = dx * cR - dy * sR, ry = dx * sR + dy * cR;
      return { x: W / 2 + rx, y: H / 2 + ry };
    }
    const concentrate = 0.25 + r() * 0.55;   // how much plates cluster on the form
    let guard = 0;
    while (pts.length < NP && guard++ < NP * 90) {
      let px, py;
      if (r() < concentrate && attractors.length) {
        const at = attractors[(r() * attractors.length) | 0];
        let ax, ay, rad;
        if (at.type === 'pt') { ax = at.x; ay = at.y; rad = at.rad; }
        else if (at.type === 'ring') {
          const a = at.rot + r() * at.arc; ax = at.x + Math.cos(a) * at.rad; ay = at.y + Math.sin(a) * at.rad; rad = at.wid * 2.2;
        } else if (at.type === 'band') {
          ax = at.cx; ay = at.cy; rad = at.half * 2.0;
        } else if (at.type === 'fig') { ax = at.hx; ay = (at.hy + at.shy) / 2; rad = MN * 0.3; }
        else { ax = fcx; ay = fcy; rad = MN * 0.4; }
        const ang = r() * Math.PI * 2;
        const rr = Math.pow(r(), 1.4) * rad;
        const w0 = warp(ax + Math.cos(ang) * rr, ay + Math.sin(ang) * rr);
        px = w0.x; py = w0.y;
      } else {
        const w0 = warp(r() * W, r() * H);
        px = w0.x; py = w0.y;
      }
      if (px < -W * 0.14 || px > W * 1.14 || py < -H * 0.14 || py > H * 1.14) continue;
      let ok = true;
      for (const q of pts) { if (q.k === 9) continue; if (dist(px, py, q.x, q.y) < minGap) { ok = false; break; } }
      if (!ok) continue;
      addPt(px, py);
    }
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      addPt(W / 2 + Math.cos(a) * W * 0.85, H / 2 + Math.sin(a) * H * 0.85, 9);
    }

    function voronoiCell(i) {
      const bleed = MN * 0.2;
      let poly = [
        { x: -bleed, y: -bleed }, { x: W + bleed, y: -bleed },
        { x: W + bleed, y: H + bleed }, { x: -bleed, y: H + bleed },
      ];
      const a = pts[i];
      for (let j = 0; j < pts.length; j++) {
        if (j === i) continue;
        const b = pts[j];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const nx = b.x - a.x, ny = b.y - a.y;
        const out = [];
        for (let k = 0; k < poly.length; k++) {
          const p = poly[k], q = poly[(k + 1) % poly.length];
          const dp = (p.x - mx) * nx + (p.y - my) * ny;
          const dq = (q.x - mx) * nx + (q.y - my) * ny;
          if (dp <= 0) out.push(p);
          if ((dp <= 0) !== (dq <= 0)) {
            const t = dp / (dp - dq);
            out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
          }
        }
        poly = out;
        if (poly.length < 3) break;
      }
      return poly;
    }

    const cells = [];
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].k === 9) continue;
      const poly = voronoiCell(i);
      if (poly.length >= 3) cells.push({ site: pts[i], poly });
    }

    // ── PAINT each plate ──
    const lightDir = r() * Math.PI * 2;
    const ldx = Math.cos(lightDir), ldy = Math.sin(lightDir);
    const craze = 0.30 + r() * 0.50;
    for (const c of cells) {
      const p = c.poly, s = c.site;
      const prom = promAt(s.x, s.y);
      const d = dist(s.x, s.y, fcx, fcy) / MN;
      const lift = K.clamp(0.12 - d * 0.18, -0.13, 0.12);
      let body = pal.glaze[(K.rng((s.x * 131 + s.y * 7) | 0)() * pal.glaze.length) | 0];
      body = K.mix(body, lift >= 0 ? '#ffffff' : '#000000', Math.abs(lift));
      const jit = (noise.noise2(s.x / 240, s.y / 240)) * 0.05;
      body = K.mix(body, jit > 0 ? pal.gold : pal.ash, Math.abs(jit) * 0.5);
      const facet = (K.rng(((s.x * 53 + s.y * 197) | 0) >>> 0)() - 0.5);
      body = K.mix(body, facet > 0 ? '#ffffff' : '#000000', Math.abs(facet) * 0.14);

      // ── FLOODED GOLD PLATES — within the form, some plates fill with pooled,
      //    leafed gold rather than staying dark. This is the regime that gives a
      //    heavily-gilded piece vs a sparse-veined one. Continuous via `flood`. ──
      const floodHere = prom > 0.34 && K.rng(((s.x * 311 + s.y * 89) | 0) >>> 0)() < flood * prom;
      if (floodHere) {
        const t = 0.55 + prom * 0.35;
        body = K.mix(K.mix(body, pal.bronze, t), pal.gold, prom * 0.55);
      }

      x.beginPath();
      x.moveTo(p[0].x, p[0].y);
      for (let k = 1; k < p.length; k++) x.lineTo(p[k].x, p[k].y);
      x.closePath();
      x.fillStyle = body; x.fill();

      x.save(); x.clip();
      for (let k = 0; k < p.length; k++) {
        const a0 = p[k], b0 = p[(k + 1) % p.length];
        const ex = b0.x - a0.x, ey = b0.y - a0.y, el = Math.hypot(ex, ey) || 1;
        const enx = ey / el, eny = -ex / el;
        const facing = enx * ldx + eny * ldy;
        x.beginPath(); x.moveTo(a0.x, a0.y); x.lineTo(b0.x, b0.y);
        x.lineCap = 'round';
        if (facing > 0.15) {
          x.lineWidth = MN * 0.006 * ZS; x.strokeStyle = K.rgba(K.mix(body, '#fff', 0.45), 0.14 * facing + Math.max(0, lift) * 0.3);
        } else {
          x.lineWidth = MN * 0.01 * ZS; x.strokeStyle = K.rgba(pal.deep, 0.4);
        }
        x.stroke();
      }
      // sheen lobe — brighter & gold-tinted on flooded plates (leaf sheen)
      const ang = Math.atan2(fcy - s.y, fcx - s.x);
      const gx = s.x + Math.cos(ang) * MN * 0.05, gy = s.y + Math.sin(ang) * MN * 0.05;
      const sg = x.createRadialGradient(gx, gy, 0, gx, gy, MN * 0.14 * (0.7 + ZS * 0.4));
      const sheenCol = floodHere ? K.mix(pal.goldHi, '#ffffff', 0.4) : K.mix(body, '#ffffff', 0.55);
      sg.addColorStop(0, K.rgba(sheenCol, (floodHere ? 0.16 : 0.08) + Math.max(0, lift) * 0.6));
      sg.addColorStop(1, K.rgba(body, 0));
      x.fillStyle = sg; x.fillRect(s.x - MN, s.y - MN, MN * 2, MN * 2);
      x.lineWidth = MN * 0.016 * ZS;
      x.strokeStyle = K.rgba(pal.deep, 0.5);
      x.stroke();
      if (r() < craze) {
        const cn = 1 + (r() * 3 | 0);
        x.strokeStyle = K.rgba(pal.ash, 0.10 + r() * 0.08);
        x.lineWidth = Math.max(0.6, MN * 0.0015);
        for (let q = 0; q < cn; q++) {
          let cx0 = s.x + (r() - 0.5) * MN * 0.12 * ZS, cy0 = s.y + (r() - 0.5) * MN * 0.12 * ZS;
          x.beginPath(); x.moveTo(cx0, cy0);
          let aa = r() * Math.PI * 2;
          const segs = 3 + (r() * 4 | 0);
          for (let t = 0; t < segs; t++) {
            aa += (r() - 0.5) * 1.2;
            cx0 += Math.cos(aa) * MN * 0.03 * ZS; cy0 += Math.sin(aa) * MN * 0.03 * ZS;
            x.lineTo(cx0, cy0);
          }
          x.stroke();
        }
      }
      x.restore();
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. THE GOLD SEAMS — trace every break (shared Voronoi edge) once.
    // ────────────────────────────────────────────────────────────────────────
    const edgeMap = new Map();
    function keyOf(a, b) {
      const ax = Math.round(a.x), ay = Math.round(a.y), bx = Math.round(b.x), by = Math.round(b.y);
      return (ax < bx || (ax === bx && ay <= by)) ? `${ax},${ay},${bx},${by}` : `${bx},${by},${ax},${ay}`;
    }
    for (const c of cells) {
      const p = c.poly;
      for (let k = 0; k < p.length; k++) {
        const a = p[k], b = p[(k + 1) % p.length];
        const key = keyOf(a, b);
        if (!edgeMap.has(key)) edgeMap.set(key, { a, b, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } });
      }
    }
    const edges = [...edgeMap.values()].filter((e) =>
      !((e.a.x < 0 && e.b.x < 0) || (e.a.x > W && e.b.x > W) || (e.a.y < 0 && e.b.y < 0) || (e.a.y > H && e.b.y > H)));

    for (const e of edges) e.w = promAt(e.mid.x, e.mid.y);

    function goldSeam(a, b, prom) {
      const len = dist(a.x, a.y, b.x, b.y);
      if (len < 4) return;
      const steps = Math.max(2, Math.ceil(len / (MN * 0.04)));
      const nx = (b.y - a.y) / len, ny = -(b.x - a.x) / len;
      const path = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const wob = (noise.noise2((a.x + (b.x - a.x) * t) / 60, (a.y + (b.y - a.y) * t) / 60)) * MN * wobAmp;
        path.push({ x: a.x + (b.x - a.x) * t + nx * wob, y: a.y + (b.y - a.y) * t + ny * wob });
      }
      function stroke(wd, col, alpha, blend) {
        x.save();
        if (blend) x.globalCompositeOperation = blend;
        x.lineWidth = wd; x.strokeStyle = K.rgba(col, alpha);
        x.lineCap = 'round'; x.lineJoin = 'round';
        x.beginPath(); x.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) x.lineTo(path[i].x, path[i].y);
        x.stroke(); x.restore();
      }
      const bw = MN * (seamBase + prom * prom * seamGain) * ZS;
      stroke(bw * 2.4, pal.deep, 0.5, 'multiply');
      stroke(bw * 1.7, pal.bronze, 0.55 + prom * 0.25);
      stroke(bw, pal.gold, 0.85 + prom * 0.15);
      if (prom > 0.22) stroke(bw * 0.32, pal.goldHi, 0.45 + prom * 0.45, 'lighter');
      if (prom > 0.4 && r() < beadProb + prom * 0.4) {
        const br = bw * 1.3;
        x.save(); x.globalCompositeOperation = 'lighter';
        const bg = x.createRadialGradient(b.x, b.y, 0, b.x, b.y, br);
        bg.addColorStop(0, K.rgba(pal.goldHi, 0.5 + prom * 0.4));
        bg.addColorStop(0.55, K.rgba(pal.gold, 0.4 * prom));
        bg.addColorStop(1, K.rgba(pal.gold, 0));
        x.fillStyle = bg; x.beginPath(); x.arc(b.x, b.y, br, 0, 7); x.fill();
        x.fillStyle = K.rgba('#fffbe8', 0.5 * prom);
        x.beginPath(); x.arc(b.x - br * 0.25, b.y - br * 0.25, Math.max(0.6, br * 0.22), 0, 7); x.fill();
        x.restore();
      }
    }

    edges.sort((e1, e2) => e1.w - e2.w);
    // coverage maps prominence → probability the break is mended in gold. Low
    // coverage ⇒ only the very brightest breaks get gold (a whisper); high ⇒ the
    // whole web gilds. `gamma` controls how sharply gold falls off from the form.
    const gamma = 0.7 + rD() * 1.6;
    const ghostP = 0.25 + r() * 0.4;
    // floor: even a "whisper" piece must read as KINTSUGI — the brightest breaks
    // along the focal form always gild, so no seed is a bare Voronoi field.
    const goldFloor = 0.55 + coverage * 0.4;   // mend prob at the very top breaks
    for (const e of edges) {
      const w = e.w;
      let mendP = K.clamp(Math.pow(w, gamma) * (0.45 + coverage * 1.4), 0, 1);
      // guarantee the strongest seams gild regardless of coverage
      mendP = Math.max(mendP, K.clamp((w - 0.5) / 0.5, 0, 1) * goldFloor);
      if (r() > mendP) {
        if (w > 0.04 && r() < ghostP * (0.4 + coverage)) {
          x.save(); x.lineWidth = Math.max(0.5, MN * 0.0014 * ZS);
          x.strokeStyle = K.rgba(pal.deep, 0.4 + w * 0.3);
          x.beginPath(); x.moveTo(e.a.x, e.a.y); x.lineTo(e.b.x, e.b.y); x.stroke();
          x.restore();
        }
        continue;
      }
      goldSeam(e.a, e.b, w);
    }

    // ── BRANCHING TRIBUTARIES — count/length scale with branchMass & coverage. ──
    const brightCut = 0.4 + r() * 0.22;
    const bright = edges.filter((e) => e.w > brightCut);
    const branchP = (0.2 + r() * 0.35) * (0.5 + branchMass);
    for (const e of bright) {
      if (r() > branchP) continue;
      const branches = 1 + (r() * (1 + branchMass * 3) | 0);
      for (let bi = 0; bi < branches; bi++) {
        let px = e.b.x, py = e.b.y;
        let aa = Math.atan2(e.b.y - e.a.y, e.b.x - e.a.x) + (r() - 0.5) * 2.4;
        const segs = 3 + (r() * 6 | 0);
        const pth = [{ x: px, y: py }];
        for (let t = 0; t < segs; t++) {
          aa += (r() - 0.5) * 1.1;
          const step = MN * (0.018 + r() * 0.035) * ZS;
          px += Math.cos(aa) * step; py += Math.sin(aa) * step;
          pth.push({ x: px, y: py });
        }
        const w0 = MN * (0.0024 + r() * 0.0024) * ZS * (0.7 + branchMass * 0.6);
        x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
        for (let i = 1; i < pth.length; i++) {
          const tw = w0 * (1 - i / pth.length);
          x.lineWidth = Math.max(0.5, tw * 1.8); x.strokeStyle = K.rgba(pal.bronze, 0.4);
          x.beginPath(); x.moveTo(pth[i - 1].x, pth[i - 1].y); x.lineTo(pth[i].x, pth[i].y); x.stroke();
          x.lineWidth = Math.max(0.4, tw); x.strokeStyle = K.rgba(pal.gold, 0.7);
          x.beginPath(); x.moveTo(pth[i - 1].x, pth[i - 1].y); x.lineTo(pth[i].x, pth[i].y); x.stroke();
        }
        x.restore();
      }
    }

    // ── THE UNCANNY FIGURE — extra dense gold web inside the figural mass. ──
    if (fig) {
      const cxF = fig.hx, cyHead = fig.hy, headR = fig.hr;
      function inFigure(px, py) {
        const head = Math.hypot(px - cxF, py - cyHead) < headR;
        const sh = ((px - cxF) * (px - cxF)) / (fig.shrx * fig.shrx) +
                   ((py - fig.shy) * (py - fig.shy)) / (fig.shry * fig.shry) < 1;
        return head || sh;
      }
      x.save();
      const fcount = 22 + (r() * 26 | 0);
      for (let i = 0; i < fcount; i++) {
        let px, py, tries = 0;
        do { px = cxF + (r() - 0.5) * MN * 0.6; py = cyHead + (r() * 0.9) * MN * 0.7; tries++; }
        while (!inFigure(px, py) && tries < 12);
        if (!inFigure(px, py)) continue;
        let aa = r() * Math.PI * 2;
        const segs = 2 + (r() * 4 | 0);
        const pth = [{ x: px, y: py }];
        for (let t = 0; t < segs; t++) {
          aa += (r() - 0.5) * 1.4;
          px += Math.cos(aa) * MN * 0.025; py += Math.sin(aa) * MN * 0.025;
          if (!inFigure(px, py)) break;
          pth.push({ x: px, y: py });
        }
        if (pth.length < 2) continue;
        x.lineCap = 'round';
        x.lineWidth = MN * 0.0028; x.strokeStyle = K.rgba(pal.gold, 0.55);
        x.beginPath(); x.moveTo(pth[0].x, pth[0].y);
        for (let k = 1; k < pth.length; k++) x.lineTo(pth[k].x, pth[k].y); x.stroke();
        x.lineWidth = MN * 0.001; x.strokeStyle = K.rgba(pal.goldHi, 0.5);
        x.beginPath(); x.moveTo(pth[0].x, pth[0].y);
        for (let k = 1; k < pth.length; k++) x.lineTo(pth[k].x, pth[k].y); x.stroke();
      }
      x.restore();
      K.bloom(x, cxF, cyHead + headR, MN * 0.4, pal.gold, 0.05);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. ATMOSPHERE & TACTILE GRADE — haze, surface mottle, grain, vignette.
    //    (preserved — the signature grade of the palette-world.)
    // ────────────────────────────────────────────────────────────────────────
    const warmHaze = K.mix(pal.gold, '#ffffff', 0.2 + palBase.warm * 0.3);
    K.hazeSheet(x, W, H, noise, warmHaze, 0.05 + palBase.warm * 0.04, MN * 0.55, 'screen');
    K.bloom(x, fcx, fcy, MN * 0.7, warmHaze, 0.08 + palBase.warm * 0.05);
    K.hazeSheet(x, W, H, noise, pal.ash, 0.06, MN * 0.9, 'multiply');

    K.mottle(x, 0, 0, W, H, pal.glaze[1], 18, r, 'overlay');
    x.save(); x.globalCompositeOperation = 'lighter';
    const dust = Math.floor(W * H / 9000);
    for (let i = 0; i < dust; i++) {
      const dx = r() * W, dy = r() * H;
      const near = 1 - K.clamp(dist(dx, dy, fcx, fcy) / (MN * 0.9), 0, 1);
      if (r() > near * 0.7) continue;
      x.fillStyle = K.rgba(pal.goldHi, 0.04 + r() * 0.06);
      x.fillRect(dx, dy, 1, 1);
    }
    x.restore();

    K.grain(x, W, H, 4.5, r);
    K.vignette(x, W, H, 0.5 + (palBase.warm < 0 ? 0.06 : 0));

    return { aspect: W / H };
  }

  function traits(seed) {
    // mirror draw()'s axis streams (each axis on its own hashed stream).
    const rP = K.rng((seed ^ 0x85ebca6b) >>> 0);
    const rF = K.rng((seed ^ 0x27d4eb2f) >>> 0);
    const rZ = K.rng((seed ^ 0x165667b1) >>> 0);
    const rD = K.rng((seed ^ 0xd3a2646c) >>> 0);
    const pal = pickPalW(rP);
    const aspV = rF();
    const ar = 0.60 + Math.pow(aspV, 0.92) * 1.02;
    const f = ar < 0.92 ? 'Portrait' : ar > 1.08 ? 'Landscape' : 'Square';
    const zoom = 0.10 + Math.pow(rZ(), 0.80) * 0.90;
    const scale = zoom < 0.40 ? 'Macro' : zoom < 0.70 ? 'Mid' : 'Fine';
    const coverage = Math.pow(rD(), 1.25);
    const amount = coverage < 0.28 ? 'Whisper' : coverage < 0.6 ? 'Veined' : 'Gilded';
    return {
      Palette: pal.name, Scale: scale, Format: f, Gold: amount,
      Seam: pal.name === 'Gilt Ember' ? 'Firelit' : 'Molten',
    };
  }

  return { name: 'z_kintsugi', draw, traits };
})();
