/* FOIL_FINAL — flagship halo · iridescent crumpled-holographic-foil, polished
 *
 * Final craft pass over JEWEL. Concept + the 10 bespoke palettes are APPROVED
 * and untouched. Four targeted fixes only:
 *   1. No blown-out white hotspot — specular is now thin CRISP GLINTS on the
 *      sharpest crease ridges only; saturated colour reads across the whole frame.
 *   2. ONE clear HERO FOLD — a single dominant diagonal drape-ridge anchored on
 *      a rule-of-thirds line catches the strongest oil-slick burst; every other
 *      fold is demoted (softer, lower contrast) → real focal hierarchy.
 *   3. SHAPED BREATHING ROOM — a calmer smooth iridescent gradient region opposite
 *      the hero fold, so it reads as a composed painting, not edge-to-edge static.
 *   4. NO MARBLE STATIC — the crinkle is now elegant flowing draped foil: smoother
 *      fold structure, far less high-frequency speckle, richer luxurious surface.
 *
 * Each palette stays its own saturated WORLD. Height field is a COARSE grid —
 * fast, no per-pixel loops. window.FORCE_PAL respected for colorways.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // 10 hand-picked DISTINCT jewel worlds. Roles:
  //   base   — the dominant saturated body (40%+ of the frame)
  //   shiftA/shiftB — the two thin-film hue-shift poles travelling along creases
  //   glint  — thin bright specular on the sharpest ridges
  //   deep   — COLOURED shadow trough (never black)
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

  // varied aspect — portrait / landscape / square (square the minority)
  const FMTS = [
    { W: 1024, H: 1280, t: 'Portrait' },   // 4:5
    { W: 1024, H: 1536, t: 'Tall' },       // 2:3
    { W: 1280, H: 853,  t: 'Vista' },      // 3:2
    { W: 1280, H: 720,  t: 'Wide' },       // 16:9
    { W: 1180, H: 1180, t: 'Square' },     // 1:1 (minority)
  ];
  function pickFmt(r) { const x = r(); return x < 0.26 ? FMTS[0] : x < 0.48 ? FMTS[1] : x < 0.70 ? FMTS[2] : x < 0.88 ? FMTS[3] : FMTS[4]; }

  const CRUMPLE = ['Soft Fold', 'Crinkle', 'Origami', 'Drape'];  // fold structure
  const FLOW    = ['Diagonal', 'Cascade', 'Sweep'];               // ridge direction
  // rare chase events
  const EVENTS = ['None','None','None','None','None','None','Spectrum Burst','Mirror Ridge'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = pickFmt(r);
    const crumple = K.pick(CRUMPLE, r);
    const flow = K.pick(FLOW, r);
    const event = K.pick(EVENTS, r);
    // fold geometry — gentler than JEWEL: lower freq + softer creases = flowing drape
    const ang = (flow === 'Diagonal' ? -0.6 : flow === 'Cascade' ? 1.1 : 0.25) + (r() - 0.5) * 0.5;
    const foldFreq = crumple === 'Crinkle' ? 3.0 + r() * 1.3 : crumple === 'Origami' ? 2.0 + r() * 0.9 : 1.3 + r() * 0.9;
    const sharp = crumple === 'Origami' ? 1.9 : crumple === 'Crinkle' ? 1.5 : 1.1; // softened crease hardness
    const shiftRate = 0.7 + r() * 1.3;   // how fast the oil-slick pole-to-pole shift cycles
    // HERO FOLD anchor — a thirds point; the single dominant drape-ridge crosses it
    const fx = (r() < 0.5 ? 0.34 : 0.66) + (r() - 0.5) * 0.04;
    const fy = (r() < 0.5 ? 0.34 : 0.66) + (r() - 0.5) * 0.04;
    // hero ridge is a broad diagonal band through (fx,fy); width controls how wide
    // the dominant drape reads. Demote everything off this band.
    const heroAng = ang + (r() - 0.5) * 0.35;
    const heroW = 0.16 + r() * 0.06;     // half-width of the hero band (normalised)
    return { pal, fmt, crumple, flow, event, ang, foldFreq, sharp, shiftRate, fx, fy, heroAng, heroW };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Crumple: p.crumple, Flow: p.flow, Event: p.event };
  }

  // signed, normalised distance from (u,v) to the hero ridge — a WANDERING fold
  // centreline through (fx,fy) along heroAng, displaced by low-freq noise so it
  // reads as an organic drape crease, not a straight cylinder. 0 on the ridge,
  // ~±1 at the band edge.
  function heroD(noise, u, v, p) {
    const dx = u - p.fx, dy = v - p.fy;
    const ca = Math.cos(p.heroAng), sa = Math.sin(p.heroAng);
    const along = dx * ca + dy * sa;            // position along the fold
    const perp  = -dx * sa + dy * ca;           // perpendicular offset
    // the centreline meanders with along-position → a curving drape, not a rod
    const wander = noise.fbm(along * 2.2 + 13.7, p.fx * 5.0, 3) * (p.heroW * 1.7);
    return (perp - wander) / p.heroW;
  }
  // calm weight 0..1: 1 = fully worked surface, →0 in the calm region opposite the
  // hero (active negative space). Smooth, shaped, anchored at (1-fx,1-fy).
  function calmW(noise, u, v, p) {
    const ncx = 1 - p.fx, ncy = 1 - p.fy;
    const d = Math.sqrt((u - ncx) * (u - ncx) + (v - ncy) * (v - ncy));
    // slight noisy edge so the calm region isn't a perfect circle
    const wob = noise.fbm(u * 2.0 + 9.3, v * 2.0 + 5.1, 3) * 0.10;
    const t = K.clamp((d - (0.18 + wob)) / 0.34, 0, 1); // 0 deep in calm .. 1 outside
    return t * t * (3 - 2 * t); // smoothstep
  }

  // height field of the crumpled sheet at normalised (u,v) → flowing drape folds
  // with ONE dominant hero CREASE; off-band folds demoted; high-freq speckle cut.
  function sheetH(noise, u, v, p, cw) {
    const c = Math.cos(p.ang), s = Math.sin(p.ang);
    const ru = u * c - v * s, rv = u * s + v * c;
    // macro warp — broad, low-frequency = flowing rather than crinkly
    const warp = noise.fbm(u * 1.1, v * 1.1, 3) * 0.6;
    // primary fold train — softer power so creases curve, not knife-edge
    let h = Math.sin((ru + warp) * Math.PI * p.foldFreq);
    h = Math.sign(h) * Math.pow(Math.abs(h), 1 / p.sharp);
    // cross drape, gentle
    h += 0.45 * Math.sin((rv + warp * 0.7) * Math.PI * (p.foldFreq * 0.5 + 1.2));
    // mid-scale drape body (the luxurious flow). Kept; this is the "cloth".
    h += 0.95 * noise.fbm(u * 2.4, v * 2.4, 4);
    // high-frequency detail SHARPLY reduced — this was the marble static.
    h += 0.18 * noise.fbm(u * 6.2, v * 6.2, 3);

    // ── HERO CREASE: a single dominant drape fold along the wandering centreline.
    // Modelled as a CREASE (a sharp V kink in the height), not a smooth tube, so it
    // catches a hard light-line. A couple of softer parallel folds flank it so it
    // reads as drapery. hd is the signed normalised distance to the crease line.
    const hd = heroD(noise, u, v, p);
    // sharp ridge: tall right at the line, falling off — abs() gives the crease kink
    const crease = (1 - K.clamp(Math.abs(hd), 0, 1));           // 1 on line → 0 at band edge
    const ridge = crease * crease * (3 - 2 * crease);            // smoothstep envelope
    // the crease itself: a kinked fold (sharp peak at hd=0) plus 2 flanking folds
    const heroFold = (1 - Math.abs(K.clamp(hd, -1, 1))) * 1.7    // the dominant kink
                   + 0.35 * Math.cos(hd * Math.PI * 1.6);        // flanking drape folds
    h += heroFold * ridge;

    // DEMOTE everything off the hero band + in the calm region: scale the crinkly
    // part down so contrast concentrates on the hero. cw is the calm weight (1
    // worked, 0 calm); ridge keeps full energy on the hero band.
    const demote = (0.5 + 0.5 * ridge) * (0.4 + 0.6 * cw);
    return h * demote + heroFold * ridge * 0.5;       // hero relief survives the demote
  }

  // thin-film shift parameter t in [0,1]: 0 = shiftA pole, 1 = shiftB pole.
  // marches along the fold axis + crumple so adjacent folds lean to different poles.
  function shiftT(noise, u, v, p, facing) {
    const c = Math.cos(p.ang), s = Math.sin(p.ang);
    const ru = u * c - v * s;
    const warp = noise.fbm(u * 1.3 + 4.1, v * 1.3 + 2.7, 4) * 0.5;
    const ph = (ru + warp) * p.foldFreq * p.shiftRate * 0.5
             + noise.fbm(u * 2.6, v * 2.6, 5) * 1.1
             + facing * 0.5;
    // triangle wave 0..1..0 so it oscillates between the two poles smoothly
    const w = ((ph % 1) + 1) % 1;
    return w < 0.5 ? w * 2 : (1 - w) * 2;
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal;
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    // colour anchors derived once
    const baseDark  = K.mix(P.base, P.deep, 0.55);   // deepest trough
    const baseMid   = K.mix(P.base, P.deep, 0.18);    // body shadow
    const baseLift  = K.mix(P.base, P.glint, 0.13);   // body in light (stays saturated — no pale stripe)
    // glint damp: pale palettes (Opal, Rose Gold) already sit bright, so scale the
    // white shine DOWN for them so no palette ever blows to a white hotspot.
    const gd = K.clamp(1.05 - K.lum(P.base) * 0.85, 0.45, 1);

    // ── 1. SATURATED GROUND — bold base colour, never pale ──
    const gg = x.createLinearGradient(0, 0, W, H);
    gg.addColorStop(0, baseLift);
    gg.addColorStop(0.5, P.base);
    gg.addColorStop(1, baseMid);
    x.fillStyle = gg; x.fillRect(0, 0, W, H);

    // ── 2. THE JEWEL MEMBRANE — coarse grid: saturated lit/shadowed base body
    //   with oil-slick shift ALONG creases + crisp specular on sharp folds.
    const step = Math.max(3, Math.floor(Math.min(W, H) / 260));
    const lx = p.fx, ly = p.fy;            // light anchor = hero fold anchor
    const du = 0.005, dv = 0.005;
    x.save();
    for (let yy = 0; yy < H; yy += step) {
      const v = yy / H;
      for (let xx = 0; xx < W; xx += step) {
        const u = xx / W;
        const cw = calmW(noise, u, v, p);                // calm weight (1 worked .. 0 calm)
        const h  = sheetH(noise, u, v, p, cw);
        const hu = sheetH(noise, u + du, v, p, cw) - h;
        const hv = sheetH(noise, u, v + dv, p, cw) - h;
        const slope = Math.sqrt(hu * hu + hv * hv) / du; // crease intensity
        // facet facing toward the light anchor (signed) → specular shaping
        const ndx = lx - u, ndy = ly - v;
        const nl = Math.sqrt(ndx * ndx + ndy * ndy) + 1e-4;
        const facing = (hu * ndx + hv * ndy) / (du * nl);

        // how close this cell is to the HERO crease (drives focal hierarchy)
        const hd = heroD(noise, u, v, p);
        const heroBoost = Math.exp(-hd * hd * 0.8);      // 1 on hero band .. 0 off

        // ── body colour: a SATURATED base, shaded by how the facet faces light.
        const lit = K.clamp(0.5 + facing * 0.5, 0, 1);   // 0 shadow .. 1 lit
        let body;
        if (lit < 0.5) body = K.mix(baseDark, P.base, lit * 2);        // trough→base
        else           body = K.mix(P.base, baseLift, (lit - 0.5) * 2); // base→lift

        // ── oil-slick: thin-film shift between the two accent poles, applied as a
        // restrained TINT on the creases. Strongest on the hero band; off-band and
        // calm regions stay closer to clean base hue.
        const t = shiftT(noise, u, v, p, facing);
        const pole = K.mix(P.shiftA, P.shiftB, t);
        const shiftAmt = K.clamp((slope - 1.4) * 0.06, 0, 0.30)
                       * (0.5 + lit * 0.5)
                       * (0.45 + 0.55 * heroBoost)        // demote shift off the hero
                       * (0.4 + 0.6 * cw);                 // calm region stays smooth base
        let cellCol = K.mix(body, pole, shiftAmt);

        x.globalCompositeOperation = 'source-over';
        x.fillStyle = K.rgba(cellCol, 1);
        x.fillRect(xx, yy, step + 1, step + 1);

        // ── HERO oil-slick burst: the strongest iridescent POLE tint on the hero's
        // creases — this is the focal "burst", a SATURATED colour shift, never a
        // pale wash. Applied as a tint (mix), not additive, so it can't blow to white.
        if (heroBoost > 0.12 && slope > 2.6) {
          const burst = K.clamp((slope - 2.6) * 0.05, 0, 0.42) * heroBoost;
          x.globalCompositeOperation = 'source-over';
          x.fillStyle = K.rgba(pole, burst);
          x.fillRect(xx, yy, step + 1, step + 1);
        }

        // ── crisp SPECULAR GLINT: thin bright shine ONLY on the very sharpest
        // micro-ridges. High slope gate + tiny coverage = pinpoint glints scattered
        // along the hero crease, never a continuous white bar.
        const glGate = 8.0 + (1 - heroBoost) * 3.5;       // 8 on hero .. 11.5 far off
        if (slope > glGate) {
          const gl = K.clamp((slope - glGate) * 0.04, 0, 0.30) * (0.45 + heroBoost * 0.55);
          x.globalCompositeOperation = 'lighter';
          // glint leans toward the local pole then up toward the bright glint colour
          x.fillStyle = K.rgba(K.mix(pole, P.glint, 0.45), gl);
          x.fillRect(xx, yy, step + 1, step + 1);
          // a tiny white-hot core ONLY on the very sharpest hero ridges (thin, faint)
          if (slope > glGate + 5.0 && heroBoost > 0.35) {
            x.fillStyle = K.rgba(P.glint, K.clamp((slope - glGate - 5.0) * 0.03, 0, 0.18) * heroBoost * gd);
            x.fillRect(xx, yy, step + 1, step + 1);
          }
        }
      }
    }
    x.restore();

    // ── 3. SHAPED CALM NEGATIVE SPACE — a smoother, calmer IRIDESCENT gradient
    // region opposite the hero fold. The crinkle is already demoted there by the
    // calm weight; this lays a soft saturated iridescent wash over it so it reads
    // as composed breathing room (active negative space), not a dead corner.
    x.save(); x.globalCompositeOperation = 'source-over';
    const ncx = (1 - lx) * W, ncy = (1 - ly) * H;
    // a calm pole — gentle thin-film tilt away from the hero, kept saturated
    const calmPole = K.mix(P.base, K.mix(P.shiftA, P.shiftB, 0.5), 0.22);
    const cg = x.createRadialGradient(ncx, ncy, 0, ncx, ncy, Math.max(W, H) * 0.6);
    cg.addColorStop(0, K.rgba(K.mix(baseMid, calmPole, 0.4), 0.72));
    cg.addColorStop(0.4, K.rgba(K.mix(P.base, P.deep, 0.08), 0.34));
    cg.addColorStop(1, K.rgba(P.base, 0));
    x.fillStyle = cg; x.fillRect(0, 0, W, H);
    x.restore();

    // ── 4. REFRACTION CAUSTICS — rippling oil-slick bands across the focal region
    x.save(); x.globalCompositeOperation = 'lighter';
    const cN = K.rint(r, 3, 5);
    for (let i = 0; i < cN; i++) {
      const cx0 = (lx + (r() - 0.5) * 0.45) * W;
      const cy0 = (ly + (r() - 0.5) * 0.45) * H;
      const len = (0.4 + r() * 0.5) * Math.max(W, H);
      const ca = p.ang + (r() - 0.5) * 0.6;
      const segs = 80;
      const pole = K.mix(P.shiftA, P.shiftB, r());
      x.lineWidth = 1 + r() * 1.6;
      x.strokeStyle = K.rgba(pole, 0.10 + r() * 0.10);
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

    // ── 5. HERO RIDGE LIGHT — the dominant fold catches the strongest oil-slick
    // burst, on the thirds anchor, running along the HERO axis. NO white bloom
    // blob: a soft COLOURED iridescent sheen + thin crisp glint streaks only.
    const fcx = lx * W, fcy = ly * H;
    const burstPole = K.mix(P.shiftA, P.shiftB, 0.5);
    // soft coloured iridescent lobe on the hero (saturated, low alpha — no wash-out)
    K.sheen(x, fcx, fcy, Math.max(W, H) * 0.18, K.mix(burstPole, P.glint, 0.25), 0.18 * gd);
    // thin crisp specular streaks along the HERO axis — the catch on the dominant
    // ridge. Narrow lines, modest alpha → bright glints, not a blown-out band.
    x.save(); x.globalCompositeOperation = 'lighter';
    const rsegs = 60, rlen = Math.max(W, H) * (0.6 + r() * 0.28);
    for (let band = 0; band < 3; band++) {
      const off = (band - 1) * 16;
      x.lineWidth = band === 1 ? 2.2 : 1.3;
      const bandCol = band === 1 ? K.mix(burstPole, P.glint, 0.4) : K.mix(burstPole, P.glint, 0.25);
      x.strokeStyle = K.rgba(bandCol, (band === 1 ? 0.24 : 0.12) * gd);
      x.beginPath();
      for (let sI = 0; sI <= rsegs; sI++) {
        const t = sI / rsegs;
        const along = (t - 0.5) * rlen;
        const wob = Math.sin(t * Math.PI * 2.4) * 30;
        const px = fcx + Math.cos(p.heroAng) * along - Math.sin(p.heroAng) * (wob + off);
        const py = fcy + Math.sin(p.heroAng) * along + Math.cos(p.heroAng) * (wob + off);
        sI === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();

    // ── 6. LIGHT-LEAK from an edge — COLOURED (pole-leaning), keeps it bright but
    // never white. Faint; just a directional warmth so the hero feels lit.
    const leakSide = r();
    const lkx = leakSide < 0.5 ? -W * 0.05 : W * 1.05;
    const lky = H * (0.15 + r() * 0.7);
    K.bloom(x, lkx, lky, Math.max(W, H) * 0.42, K.mix(P.shiftA, P.shiftB, 0.5), 0.12);

    // ── 7. RARE CHASE EVENTS ──
    if (p.event === 'Spectrum Burst') {
      x.save(); x.globalCompositeOperation = 'lighter';
      const bx = fcx, by = fcy, rings = 22;
      for (let i = 0; i < rings; i++) {
        const rr = (i / rings) * Math.max(W, H) * 0.5;
        const pole = K.mix(P.shiftA, P.shiftB, (Math.sin(i * 0.6) + 1) / 2);
        x.strokeStyle = K.rgba(pole, 0.09);
        x.lineWidth = 6; x.beginPath(); x.arc(bx, by, rr, 0, Math.PI * 2); x.stroke();
      }
      K.bloom(x, bx, by, Math.max(W, H) * 0.24, K.mix(burstPole, P.glint, 0.2), 0.16 * gd);
      x.restore();
    } else if (p.event === 'Mirror Ridge') {
      // an extra iridescent OIL-SLICK seam running along the hero — coloured poles,
      // a thin bright seam only. No chrome ramp, no solid white core (the old blow-out).
      x.save();
      const mw = Math.max(W, H) * 0.12, mh = Math.max(W, H) * 0.85;
      x.translate(fcx, fcy); x.rotate(p.heroAng);
      x.globalCompositeOperation = 'lighter';
      const grad = x.createLinearGradient(-mw / 2, 0, mw / 2, 0);
      grad.addColorStop(0, K.rgba(P.shiftA, 0));
      grad.addColorStop(0.4, K.rgba(P.shiftA, 0.30 * gd));
      grad.addColorStop(0.5, K.rgba(K.mix(burstPole, P.glint, 0.35), 0.34 * gd));
      grad.addColorStop(0.6, K.rgba(P.shiftB, 0.30 * gd));
      grad.addColorStop(1, K.rgba(P.shiftB, 0));
      x.fillStyle = grad; x.fillRect(-mw / 2, -mh / 2, mw, mh);
      x.restore();
      K.sheen(x, fcx, fcy, Math.max(W, H) * 0.12, K.mix(burstPole, P.glint, 0.3), 0.16 * gd);
    }

    // ── 8. FILMIC FINISH — chromatic shimmer, grain, COLOURED depth vignette.
    K.chromaSplit(x, W, H, 2);                              // holographic edge shimmer
    K.mottle(x, 0, 0, W, H, P.base, 5200, r, 'overlay');   // very subtle metal tooth (less speckle)
    K.grain(x, W, H, 1100, r);                              // lighter grain — luxe, not noisy
    // coloured depth vignette — DARKEN edges toward the deep trough hue (gives the
    // gem-metal weight) while the focal stays bright. NOT a white wash, NOT black.
    x.save(); x.globalCompositeOperation = 'multiply';
    const vg = x.createRadialGradient(fcx, fcy, Math.min(W, H) * 0.18, fcx, fcy, Math.max(W, H) * 0.85);
    vg.addColorStop(0, 'rgba(255,255,255,1)');
    vg.addColorStop(1, K.rgba(K.mix(P.deep, '#ffffff', 0.45), 1));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'foil_final', draw, traits };
})();
