/* CAUSTICS — a rippling net of refracted light, with no water and no scene.
 * The bright woven mesh that water throws onto a surface — its luminous
 * filaments crossing, pooling and flickering across a dim teal-shadow field,
 * focused bright knots where the light concentrates — but no water above,
 * no horizon, no object. Just the caustic net itself, full frame.
 *
 * SURREAL = real-but-off: a refracted light-net with nothing to refract it.
 * Pure abstract LIGHT FIELD. Cool luminous palette world: aqua / pale gold /
 * seafoam filaments on a deep teal-shadow ground. Light is the subject.
 *
 * ── GENERATIVE CONTRACT (this is a SYSTEM, not a template picker) ──
 * Every salient parameter varies CONTINUOUSLY with the seed. There are NO
 * discrete "modes" and NO fixed palette swatches that get stamped onto the
 * frame. Instead:
 *   • The COMPOSITION is a continuous blend of flow archetypes (radial /
 *     vertical / diagonal / pool / rift / isotropic), each with its own
 *     per-seed weight, angle and focus — so two seeds occupy different points
 *     in a continuous composition space, never the same bucket.
 *   • The PALETTE is a continuous HSL world: a base hue sampled anywhere from
 *     warm gold through seafoam to cold cyan, with per-seed saturation, value,
 *     hue-spread and warmth, from which the ground / ramp / hot core are built
 *     procedurally. Named palettes (FORCE_PAL / the jury) are ANCHORS the seed
 *     jitters around — never a stamped swatch.
 *   • SCALE/ZOOM, DENSITY, ANISOTROPY, FORMAT (continuous aspect),
 *     focus, counts, widths, curvature and colour VALUES all roll from ranges.
 * Result: no two seeds are near-duplicates, all inside one luminous-cool world.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;
  const TAU = 6.283185307;
  const lerp = (a, b, t) => a + (b - a) * t;   // scalar lerp (hue/value ramps)

  /* ── PALETTE ANCHORS — points in a CONTINUOUS hsl light-world, not swatches.
     Each anchor is a small parameter set the per-seed sampler jitters around:
       hue   : base filament/ground hue (deg) — gold≈48, seafoam≈150, cyan≈190.
       warm  : 0 cold .. 1 warm — how far the hot end of the ramp drifts to gold.
       sat   : base chroma of the world.
       gv    : ground value (darkness of the field).
       temp  : coarse bucket, used only to balance selection.
     The named anchors keep FORCE_PAL / the colorway jury working — but every
     seed samples a NEW continuous world around its anchor, so two seeds on the
     same anchor still differ in hue/value/saturation/warmth. */
  const PALS = [
    { name: 'Pale Gold Pool', temp: 'warm', hue: 52,  warm: 0.92, sat: 0.52, gv: 0.20 },
    { name: 'Solar Shallows', temp: 'warm', hue: 58,  warm: 0.85, sat: 0.55, gv: 0.19 },
    { name: 'Amber Tide',     temp: 'warm', hue: 70,  warm: 0.80, sat: 0.50, gv: 0.22 },
    { name: 'Lagoon Floor',   temp: 'mid',  hue: 158, warm: 0.55, sat: 0.62, gv: 0.18 },
    { name: 'Seafoam Deep',   temp: 'mid',  hue: 168, warm: 0.45, sat: 0.60, gv: 0.16 },
    { name: 'Cenote',         temp: 'cold', hue: 184, warm: 0.32, sat: 0.66, gv: 0.16 },
    { name: 'Abyssal Aqua',   temp: 'cold', hue: 190, warm: 0.26, sat: 0.70, gv: 0.13 },
    { name: 'Glacier Rift',   temp: 'cold', hue: 198, warm: 0.30, sat: 0.62, gv: 0.16 },
  ];

  // ── Build a full continuous palette object from an anchor + the seed rng.
  //    Everything here is sampled from a RANGE around the anchor, then the
  //    concrete hex colours (ground / deep / fil ramp / hot / wash) are
  //    SYNTHESISED — so the colour VALUES vary continuously, never stamped. ──
  function buildPal(anchor, r) {
    // jitter the world around the anchor — wide enough that two seeds on the
    // same anchor read as different colour temperatures, narrow enough to stay
    // inside the luminous-cool caustic identity.
    const hue   = anchor.hue + (r() - 0.5) * 26;          // ±13° hue drift
    const warm  = K.clamp(anchor.warm + (r() - 0.5) * 0.30, 0, 1);
    const sat   = K.clamp(anchor.sat + (r() - 0.5) * 0.22, 0.30, 0.85);
    const gv    = K.clamp(anchor.gv  + (r() - 0.5) * 0.07, 0.08, 0.27);
    const spread = 14 + r() * 34;       // how far the ramp fans across hue
    // hot end: cold worlds → pale white-aqua; warm worlds → pale gold.
    const hotHue = lerp(hue + spread, 46, warm * 0.85);

    // ground / deep: low-value, desaturated-toward-shadow versions of base hue.
    const ground = K.hsl2hex(hue - 4,  K.clamp(sat * 0.85, 0, 0.9), gv);
    const deep   = K.hsl2hex(hue - 8,  K.clamp(sat * 0.7, 0, 0.85), gv * 0.55);
    const wash   = K.hsl2hex(hue + 2,  K.clamp(sat * 0.9, 0, 0.85), 0.34 + r() * 0.06);

    // filament ramp: 4 stops walking dim→hot, hue fanning toward the hot hue,
    // value & chroma climbing. Each stop is synthesised continuously.
    const fil = [];
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const fh = lerp(hue, hotHue, Math.pow(t, 0.85));
      const fs = K.clamp(sat * (0.92 - t * 0.45) + (r() - 0.5) * 0.05, 0.18, 0.9);
      const fl = 0.55 + t * 0.30 + (r() - 0.5) * 0.03;     // 0.55 → 0.85
      fil.push(K.hsl2hex(fh, fs, fl));
    }
    const hot = K.hsl2hex(hotHue, K.clamp(0.25 - warm * 0.05, 0.1, 0.3), 0.90 + r() * 0.06);

    return { name: anchor.name, temp: anchor.temp, deep, ground, fil, hot, wash, hue, warm };
  }

  function pickPal(r) {
    if (window.FORCE_PAL) {
      const a = PALS.find((p) => p.name === window.FORCE_PAL);
      if (a) return buildPal(a, r);
    }
    // balance by temperature so cyan worlds don't dominate the collection.
    const t = r();
    const want = t < 0.34 ? 'warm' : t < 0.62 ? 'cold' : t < 0.80 ? 'mid' : null;
    const pool = want ? PALS.filter((p) => p.temp === want) : PALS;
    return buildPal(K.pick(pool, r), r);
  }

  // Filament colour by intensity t (0 dim→1 hot), walking the synthesised ramp.
  function filColor(pal, t) {
    const F = pal.fil;
    const tt = K.clamp(t, 0, 0.999);
    const seg = tt * (F.length - 1);
    const i = Math.floor(seg);
    return K.mix(F[i], F[Math.min(F.length - 1, i + 1)], seg - i);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const noise2 = K.makeNoise(seed * 13 + 5);
    const pal = pickPal(r);

    // ── FORMAT — CONTINUOUS aspect, balanced HARD across portrait ↔ square ↔
    //    landscape (symmetric around 1.0 so neither orientation dominates),
    //    long edge held ~constant so detail density is even. ──
    const am = (r() - 0.5) * 2;                          // −1..1
    const aexp = Math.sign(am) * Math.pow(Math.abs(am), 0.85);
    const aspect = aexp >= 0 ? 1 + aexp * 0.62 : 1 / (1 - aexp * 0.62); // ~0.62 tall .. ~1.62 wide
    const LONG = 1180;
    let W, H;
    if (aspect >= 1) { W = LONG; H = Math.round(LONG / aspect); }
    else { H = LONG; W = Math.round(LONG * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const MN = Math.min(W, H);

    // ── COMPOSITION — a CONTINUOUS blend of flow archetypes. Each archetype
    //    gets its own per-seed weight; the strongest one shapes the frame, but
    //    the blend means the space is continuous (no discrete mode buckets).
    //    Rift and radial are gated rarer so they stay special, not default. ──
    const wRadial = Math.pow(r(), 1.6);
    const wVert   = Math.pow(r(), 1.5);
    const wDiag   = Math.pow(r(), 1.5);
    const wPool   = Math.pow(r(), 1.7);
    const wRift   = r() < 0.22 ? (0.5 + r() * 0.5) : 0;   // rift is a rarer mode
    // streak direction is fully continuous (no fixed h/v/diagonal)
    const streakAng = r() * TAU;
    const sca = Math.cos(streakAng), ssa = Math.sin(streakAng);
    const streakAniso = 1.0 + (wVert + wDiag) * (1.6 + r() * 2.4); // cross-flow squeeze

    // ── SCALE / ZOOM — continuous ripple wavelength AND a global zoom that
    //    crops the field harder or pulls way back. Together they give the big
    //    macro-fold ↔ fine-lace swing the contract demands. ──
    const freq = 1.0 + Math.pow(r(), 1.25) * 4.4;        // 1.0 (macro) .. 5.4 (lace)
    const zoom = 0.62 + Math.pow(r(), 1.1) * 1.5;        // 0.62 (pulled back) .. ~2.1 (cropped in)

    // ── DENSITY — continuous near-empty ↔ packed. Floor kept high enough that
    //    even the sparsest seed carries a legible woven spine (gallery floor). ──
    const density = 0.30 + Math.pow(r(), 0.9) * 0.82;    // 0.30 .. ~1.12

    // misc continuous warp params
    const warp  = 16 + r() * 20;
    const drift = 0.30 + r() * 0.55;
    const aniso = (1.1 + r() * 1.2) * (1 + (streakAniso - 1) * 0.6); // base + streak
    const ridge = 4.5 + r() * 5.5;
    const pooly = wPool > 0.55 || wRift > 0;             // softer caustic shoulder
    // knot / focus character rolled continuously
    const knotChance = 0.30 + r() * 0.62;
    const focusBias  = 0.30 + r() * 0.50;

    // ── DIM GROUND: deep field with a soft tonal gradient, angle rolled. ──
    {
      const ga = r() * TAU;
      const gx = Math.cos(ga), gy = Math.sin(ga);
      const bg = x.createLinearGradient(W * (0.5 - gx * 0.5), H * (0.5 - gy * 0.5), W * (0.5 + gx * 0.5), H * (0.5 + gy * 0.5));
      bg.addColorStop(0, K.mix(pal.ground, pal.deep, 0.25));
      bg.addColorStop(0.45 + r() * 0.2, pal.ground);
      bg.addColorStop(1, K.mix(pal.ground, pal.deep, 0.55));
      x.fillStyle = bg; x.fillRect(0, 0, W, H);
    }

    // ── FOCAL GEOMETRY — continuous off-centre focus; pulled harder when the
    //    radial/pool weights are high, looser otherwise. ──
    const focusPull = K.clamp(wRadial + wPool, 0, 1.4);
    const fx = W * (0.20 + r() * 0.60);
    const fy = H * (0.18 + r() * 0.62);
    const focusR = MN * (0.40 + r() * 0.42) * (1 + wPool * 0.4);

    // Rift seam (only meaningful when wRift>0): a line the bright channel rides.
    const riftAng = r() * TAU;
    const riftNx = Math.cos(riftAng), riftNy = Math.sin(riftAng);
    const riftHalf = MN * (0.05 + r() * 0.08);

    // Broad slow ambient pool of dimmer aqua light — the soft underglow.
    {
      const px = focusPull > 0.5 ? fx : W * (0.3 + r() * 0.4);
      const py = focusPull > 0.5 ? fy : H * (0.3 + r() * 0.4);
      const gr0 = x.createRadialGradient(px, py, 0, px, py, MN * (0.8 + wPool * 0.4));
      gr0.addColorStop(0, K.rgba(pal.wash, 0.14 + wPool * 0.12));
      gr0.addColorStop(0.5, K.rgba(pal.wash, 0.06));
      gr0.addColorStop(1, K.rgba(pal.wash, 0));
      x.save(); x.globalCompositeOperation = 'screen';
      x.fillStyle = gr0; x.fillRect(0, 0, W, H); x.restore();
    }

    // Warp offsets so each seed's flow is unique.
    const ox = r() * 1000, oy = r() * 1000;
    const ox2 = r() * 1000, oy2 = r() * 1000;
    const phase = r() * TAU;

    // ── CAUSTIC INTENSITY via ray-compression (optical, not iso-contours) ──
    // Refracting "surface" height h(x,y) (two layered fbm wavefronts). Refracted
    // rays land at P = (x,y)+str·∇h; light concentrates where the map FOLDS
    // (Jacobian det→0). The continuous flow weights warp the SAMPLING coords so
    // the whole composition takes a shape — blended, not a single archetype.
    const sc = (freq / MN) * zoom;
    const str = warp * 0.9;

    // global coordinate warp = weighted blend of archetype warps.
    function flowCoords(px, py) {
      let u = px, v = py;
      // radial: blend toward polar space around focus
      if (wRadial > 0.04) {
        const dx = px - fx, dy = py - fy;
        const rr = Math.hypot(dx, dy);
        const th = Math.atan2(dy, dx);
        const pu = rr, pv = th * focusR * 0.5;
        const w = K.clamp(wRadial, 0, 1);
        u = u * (1 - w) + pu * w;
        v = v * (1 - w) + pv * w;
      }
      // streak: rotate into streak frame and squeeze across-flow (covers both
      // "vertical curtain" and "diagonal sweep" continuously via streakAng).
      if (streakAniso > 1.05) {
        const rx = u * sca + v * ssa;
        const ry = -u * ssa + v * sca;
        const k = K.clamp((wVert + wDiag), 0, 1);
        const su = rx / (1 + k * 1.2);
        const sv = ry * (1 + k * 1.4);
        u = u * (1 - k) + su * k;
        v = v * (1 - k) + sv * k;
      }
      return [u, v];
    }

    function surf(px, py) {
      const c = flowCoords(px, py);
      const cu = c[0], cv2 = c[1];
      const a = noise.fbm(cu * sc + ox, cv2 * sc * aniso + oy, 5, 0.55, 2.05);
      const b = noise2.fbm(cu * sc * 1.6 + ox2 + 9, cv2 * sc * 1.6 + oy2 + 4, 4, 0.5, 2.1);
      return a + b * 0.55 + 0.25 * Math.sin(a * 5 + phase);
    }
    function field(px, py) {
      const e = Math.max(1.3, MN / 360);
      const c = surf(px, py);
      const hx1 = surf(px + e, py), hx0 = surf(px - e, py);
      const hy1 = surf(px, py + e), hy0 = surf(px, py - e);
      const hxy = (surf(px + e, py + e) - surf(px + e, py - e) - surf(px - e, py + e) + surf(px - e, py - e)) / (4 * e * e);
      const hxx = (hx1 - 2 * c + hx0) / (e * e);
      const hyy = (hy1 - 2 * c + hy0) / (e * e);
      const k = str * 26 * (9 / (freq * freq + 1));
      const det = (1 + k * hxx) * (1 + k * hyy) - (k * hxy) * (k * hxy);
      const soft = pooly ? 0.5 : 0.34;
      let b = soft / (soft + Math.abs(det));
      b = Math.pow(K.clamp(b, 0, 1), 1.25);
      if (wRift > 0) {
        const sd = Math.abs((px - W / 2) * riftNx + (py - H / 2) * riftNy);
        const band = K.clamp(1 - (sd / (riftHalf * 2.4)), 0, 1);
        const g = 0.30 + 1.15 * Math.pow(band, 1.3);
        b *= (1 - wRift) + wRift * g;
      }
      return b;
    }

    function focusW(px, py) {
      const d = Math.hypot(px - fx, py - fy) / focusR;
      return K.clamp(1 - d * d, 0, 1);
    }

    function grad(px, py) {
      const e = Math.max(1.2, MN / 520);
      const gx = field(px + e, py) - field(px - e, py);
      const gy = field(px, py + e) - field(px, py - e);
      return [gx, gy];
    }

    // ── DENSITY → coverage threshold (continuous). Low density cuts much more
    //    of the field away (near-empty); high density lets the weave join up. ──
    const cut = K.clamp(0.50 - (density - 0.5) * 0.42, 0.28, 0.59);
    const coreCut = cut + 0.18;

    // ── RENDER THE NET as a CONTINUOUS caustic raster. Cell size scales
    //    inversely with freq*zoom so macro seeds get a coarse grid, lace fine. ──
    const cell = Math.max(2, Math.round(MN / (440 + freq * zoom * 45)));
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let py = 0; py < H; py += cell) {
      for (let px = 0; px < W; px += cell) {
        const v = field(px + cell * 0.5, py + cell * 0.5);
        if (v < cut) continue;
        const fwt = focusW(px, py);
        const glow = Math.pow(v, 2.0) * (0.28 + fwt * 0.75);
        if (glow > 0.02) {
          const hueT = K.clamp(v * 0.55 + fwt * 0.3, 0, 0.999);
          x.fillStyle = K.rgba(filColor(pal, hueT), K.clamp(glow * 0.14, 0, 0.32));
          x.fillRect(px - cell, py - cell, cell * 3, cell * 3);
        }
        if (v > coreCut) {
          const crest = Math.pow((v - coreCut) / (1 - coreCut), 1.3 + ridge * 0.06);
          const inten = crest * (0.45 + fwt * 1.0);
          const hueT = K.clamp(crest * 0.55 + fwt * 0.5, 0, 0.999);
          x.fillStyle = K.rgba(filColor(pal, hueT), K.clamp(inten * 0.6, 0, 0.85));
          x.fillRect(px, py, cell + 1, cell + 1);
        }
      }
    }
    x.restore();

    // ── KNOTS: filaments converge into hot bright nodes. Count scales with
    //    density (continuous) so minimal seeds stay minimal. ──
    {
      const tries = 220 + (r() * 120 | 0);
      let placed = 0;
      const maxKnots = Math.round((4 + (r() * 9)) * (0.4 + density * 0.9));
      const knotPts = [];
      for (let i = 0; i < tries && placed < maxKnots; i++) {
        let kx, ky;
        if (r() < focusBias) {
          const a = r() * TAU, rr = Math.pow(r(), 0.7) * focusR * 0.8;
          kx = fx + Math.cos(a) * rr; ky = fy + Math.sin(a) * rr;
        } else { kx = r() * W; ky = r() * H; }
        if (kx < 0 || kx > W || ky < 0 || ky > H) continue;
        const v = field(kx, ky);
        if (v < 0.8) continue;
        if (r() > knotChance) continue;
        let ok = true;
        for (const p of knotPts) { if (Math.hypot(p[0] - kx, p[1] - ky) < MN * 0.06) { ok = false; break; } }
        if (!ok) continue;
        knotPts.push([kx, ky]);
        const fwt = focusW(kx, ky);
        const kbig = 1.0 + wPool * 0.7 + wRadial * 0.3;
        const kr = MN * (0.013 + r() * 0.03) * (0.6 + fwt) * kbig;
        K.bloom(x, kx, ky, kr * 1.8, pal.hot, 0.11 + fwt * 0.1);
        K.bloom(x, kx, ky, kr * 0.9, pal.fil[2], 0.14 + fwt * 0.12);
        x.save(); x.globalCompositeOperation = 'lighter';
        const flecks = 3 + (r() * 4 | 0);
        for (let fI = 0; fI < flecks; fI++) {
          const a = r() * TAU, rr = Math.pow(r(), 0.6) * kr * 1.1;
          const hx = kx + Math.cos(a) * rr, hy = ky + Math.sin(a) * rr;
          x.fillStyle = K.rgba(fI === 0 ? pal.hot : pal.fil[3], (fI === 0 ? 0.6 : 0.4) + fwt * 0.2);
          x.beginPath(); x.arc(hx, hy, (fI === 0 ? 1.3 : 0.8) + r() * 1.0, 0, TAU); x.fill();
        }
        x.restore();
        placed++;
      }
    }

    // ── CAUSTIC THREADS — bright filaments riding the ridge crest. Count scales
    //    with density (continuous), plus a freq lean so lace reads finer. ──
    {
      const base = 18 + freq * 7;                        // macro≈25 .. lace≈56
      const threads = Math.max(8, Math.round(base * (0.45 + density * 0.85)));
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let t = 0; t < threads; t++) {
        let px = 0, py = 0, best = -1;
        for (let a = 0; a < 6; a++) {
          let cx, cy;
          if (r() < 0.62) { const ang = r() * TAU, rr = Math.pow(r(), 0.6) * focusR; cx = fx + Math.cos(ang) * rr; cy = fy + Math.sin(ang) * rr; }
          else { cx = r() * W; cy = r() * H; }
          const vv = field(cx, cy);
          if (vv > best) { best = vv; px = cx; py = cy; }
        }
        if (best < 0.55) continue;
        const dir0 = r() < 0.5 ? 1 : -1;
        const lw = 0.6 + r() * 1.1;
        const spd = MN * 0.006 * (0.7 + drift);
        for (const sign of [1, -1]) {
          let cx = px, cy = py, pvx = 0, pvy = 0;
          const steps = 22 + (r() * 30 | 0);
          const dieT = 0.012 + r() * 0.02;
          let lx = cx, ly = cy, started = false;
          for (let s = 0; s < steps; s++) {
            const g = grad(cx, cy);
            const gm = Math.hypot(g[0], g[1]) || 1e-6;
            let tx = -g[1] / gm, ty = g[0] / gm;
            if (s > 0 && (tx * pvx + ty * pvy) < 0) { tx = -tx; ty = -ty; }
            else if (s === 0) { tx *= dir0 * sign; ty *= dir0 * sign; }
            pvx = tx; pvy = ty;
            cx += tx * spd + (g[0] / gm) * spd * 0.25 + (r() - 0.5) * spd * 0.5;
            cy += ty * spd + (g[1] / gm) * spd * 0.25 + (r() - 0.5) * spd * 0.5;
            const v = field(cx, cy);
            if (v < 0.5) break;
            if (r() < dieT) break;
            if (cx < -10 || cx > W + 10 || cy < -10 || cy > H + 10) break;
            const fwt = focusW(cx, cy);
            const inten = K.clamp(Math.pow(v, 1.8) * (0.3 + fwt * 0.85), 0, 1);
            if (started && inten > 0.07) {
              const hueT = K.clamp(v * 0.45 + fwt * 0.55, 0, 0.999);
              x.strokeStyle = K.rgba(filColor(pal, hueT), inten * 0.4);
              x.lineWidth = lw * (0.55 + fwt * 0.9);
              x.lineCap = 'round';
              x.beginPath(); x.moveTo(lx, ly); x.lineTo(cx, cy); x.stroke();
            }
            lx = cx; ly = cy; started = true;
          }
        }
      }
      x.restore();
    }

    // ── ATMOSPHERE & TEXTURE (grade preserved) ──
    K.hazeSheet(x, W, H, noise, K.mix(pal.wash, pal.fil[0], 0.4), 0.10, MN * 1.05, 'screen');
    {
      const grd = x.createRadialGradient(fx, fy, 0, fx, fy, focusR * 0.9);
      grd.addColorStop(0, K.rgba(pal.wash, 0.10));
      grd.addColorStop(1, K.rgba(pal.wash, 0));
      x.save(); x.globalCompositeOperation = 'screen';
      x.fillStyle = grd; x.fillRect(0, 0, W, H); x.restore();
    }
    K.mottle(x, 0, 0, W, H, pal.ground, 110, r, 'overlay');
    K.grain(x, W, H, 6, r);
    K.vignette(x, W, H, 0.42);

    return { aspect: W / H };
  }

  // traits() MUST mirror draw()'s rng consumption order exactly so labels match.
  function traits(seed) {
    const r = K.rng(seed);
    const pal = pickPal(r);                 // consumes the same palette rng as draw()

    const am = (r() - 0.5) * 2;
    const aexp = Math.sign(am) * Math.pow(Math.abs(am), 0.85);
    const aspect = aexp >= 0 ? 1 + aexp * 0.62 : 1 / (1 - aexp * 0.62);
    const wRadial = Math.pow(r(), 1.6);
    const wVert   = Math.pow(r(), 1.5);
    const wDiag   = Math.pow(r(), 1.5);
    const wPool   = Math.pow(r(), 1.7);
    const wRift   = r() < 0.22 ? (0.5 + r() * 0.5) : 0;
    r();                                     // streakAng
    const freq = 1.0 + Math.pow(r(), 1.25) * 4.4;
    const zoom = 0.62 + Math.pow(r(), 1.1) * 1.5;
    const density = 0.30 + Math.pow(r(), 0.9) * 0.82;

    const f = aspect > 1.08 ? 'Landscape' : aspect < 0.92 ? 'Portrait' : 'Square';
    const ef = freq * zoom;                  // effective on-screen scale
    const scale = ef < 1.7 ? 'Macro' : ef < 4.0 ? 'Mid' : 'Fine';
    const dens = density < 0.5 ? 'Sparse' : density < 0.85 ? 'Open' : 'Dense';
    // dominant composition character from the continuous weights.
    let comp = 'Woven', cw = 0.5;
    if (wRift > 0.45)            { comp = 'Rift'; cw = wRift; }
    if (wPool   > cw)           { comp = 'Pool'; cw = wPool; }
    if (wRadial > cw)           { comp = 'Convergence'; cw = wRadial; }
    if (Math.max(wVert, wDiag) > cw) { comp = 'Sweep'; cw = Math.max(wVert, wDiag); }
    return { Palette: pal.name, Flow: comp, Format: f, Scale: scale, Density: dens };
  }

  return { name: 'z_caustics', draw, traits };
})();
