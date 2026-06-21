/* FOILA — JEWEL · saturated gem-and-metal crumpled holographic foil
 *
 * The CHOSEN flagship FOIL look, fixed. The original blew its body out to white
 * parchment so every palette read as the same pale marble. JEWEL keeps the
 * crumpled-foil height-field and oil-slick crease shift, but the SHEET BODY is
 * now DOMINATED by a bold saturated BASE colour (40%+ of frame). The thin-film
 * iridescence travels between two accent poles (shiftA↔shiftB) ALONG the creases
 * only; white is reserved for thin specular shine on the sharpest folds. Deep
 * COLOURED shadow troughs + crisp specular ridges = real gleaming gem-metal.
 *
 * Each palette is its own WORLD: a Molten Gold piece reads unmistakably gold; an
 * Emerald piece unmistakably green. No washed-out marble, ever.
 *
 * Height field is a COARSE grid (like the original) — fast, no per-pixel loops.
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
    // fold geometry
    const ang = (flow === 'Diagonal' ? -0.6 : flow === 'Cascade' ? 1.1 : 0.25) + (r() - 0.5) * 0.5;
    const foldFreq = crumple === 'Crinkle' ? 4.4 + r() * 2.2 : crumple === 'Origami' ? 2.6 + r() * 1.3 : 1.6 + r() * 1.2;
    const sharp = crumple === 'Origami' ? 2.6 : crumple === 'Crinkle' ? 1.9 : 1.2; // crease hardness
    const shiftRate = 0.7 + r() * 1.3;   // how fast the oil-slick pole-to-pole shift cycles
    // focal sheen ridge on a thirds point
    const fx = (r() < 0.5 ? 0.32 : 0.67) + (r() - 0.5) * 0.05;
    const fy = (r() < 0.5 ? 0.33 : 0.66) + (r() - 0.5) * 0.05;
    return { pal, fmt, crumple, flow, event, ang, foldFreq, sharp, shiftRate, fx, fy };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Crumple: p.crumple, Flow: p.flow, Event: p.event };
  }

  // height field of the crumpled sheet at normalised (u,v) → folds + macro drape
  function sheetH(noise, u, v, p) {
    const c = Math.cos(p.ang), s = Math.sin(p.ang);
    const ru = u * c - v * s, rv = u * s + v * c;
    const warp = noise.fbm(u * 1.3, v * 1.3, 4) * 0.55;
    let h = Math.sin((ru + warp) * Math.PI * p.foldFreq);
    h = Math.sign(h) * Math.pow(Math.abs(h), 1 / p.sharp); // sharpen creases
    h += 0.5 * Math.sin((rv + warp * 0.7) * Math.PI * (p.foldFreq * 0.55 + 1.5));
    h += 0.9 * noise.fbm(u * 3.2, v * 3.2, 5);
    h += 0.4 * noise.fbm(u * 7.0, v * 7.0, 4);
    return h;
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
    const baseLift  = K.mix(P.base, P.glint, 0.22);   // body in light (still saturated)

    // ── 1. SATURATED GROUND — bold base colour, never pale ──
    const gg = x.createLinearGradient(0, 0, W, H);
    gg.addColorStop(0, baseLift);
    gg.addColorStop(0.5, P.base);
    gg.addColorStop(1, baseMid);
    x.fillStyle = gg; x.fillRect(0, 0, W, H);

    // ── 2. THE JEWEL MEMBRANE — coarse grid: saturated lit/shadowed base body
    //   with oil-slick shift ALONG creases + crisp specular on sharp folds.
    const step = Math.max(3, Math.floor(Math.min(W, H) / 260));
    const lx = p.fx, ly = p.fy;            // light anchor (the focal)
    const du = 0.005, dv = 0.005;
    x.save();
    for (let yy = 0; yy < H; yy += step) {
      const v = yy / H;
      for (let xx = 0; xx < W; xx += step) {
        const u = xx / W;
        const h  = sheetH(noise, u, v, p);
        const hu = sheetH(noise, u + du, v, p) - h;
        const hv = sheetH(noise, u, v + dv, p) - h;
        const slope = Math.sqrt(hu * hu + hv * hv) / du; // crease intensity
        // facet facing toward the light anchor (signed) → specular shaping
        const ndx = lx - u, ndy = ly - v;
        const nl = Math.sqrt(ndx * ndx + ndy * ndy) + 1e-4;
        const facing = (hu * ndx + hv * ndy) / (du * nl);

        // ── body colour: a SATURATED base, shaded by how the facet faces light.
        // away-facing facets sink toward the deep coloured trough; toward-facing
        // lift slightly toward base+glint but stay clearly the base hue.
        const lit = K.clamp(0.5 + facing * 0.5, 0, 1);   // 0 shadow .. 1 lit
        let body;
        if (lit < 0.5) body = K.mix(baseDark, P.base, lit * 2);        // trough→base
        else           body = K.mix(P.base, baseLift, (lit - 0.5) * 2); // base→lift

        // ── oil-slick: thin-film shift between the two accent poles, applied as a
        // restrained TINT on the creases (mid slopes), strongest where the sheet
        // bends. Keeps the base dominant; the shift is a sheen, not a repaint.
        const t = shiftT(noise, u, v, p, facing);
        const pole = K.mix(P.shiftA, P.shiftB, t);
        // shift visibility rises with slope (creases) but is capped so flats stay base
        const shiftAmt = K.clamp((slope - 1.6) * 0.07, 0, 0.34) * (0.5 + lit * 0.5);
        let cellCol = K.mix(body, pole, shiftAmt);

        // focal region gets a touch more iridescent pop; far corner stays calmer
        const fd = Math.sqrt((u - lx) * (u - lx) + (v - ly) * (v - ly));
        const focalBoost = K.clamp(1.15 - fd * 0.9, 0.0, 1.0);

        x.globalCompositeOperation = 'source-over';
        x.fillStyle = K.rgba(cellCol, 1);
        x.fillRect(xx, yy, step + 1, step + 1);

        // ── extra oil-slick burst near the focal: stronger pole tint on creases
        if (focalBoost > 0.05 && slope > 2.2) {
          const burst = K.clamp((slope - 2.2) * 0.05, 0, 0.30) * focalBoost;
          x.globalCompositeOperation = 'lighter';
          x.fillStyle = K.rgba(pole, burst);
          x.fillRect(xx, yy, step + 1, step + 1);
        }

        // ── crisp SPECULAR: thin bright glint on the sharpest creases only.
        if (slope > 5.0) {
          const gl = K.clamp((slope - 5.0) * 0.07, 0, 0.5) * (0.35 + focalBoost * 0.65);
          x.globalCompositeOperation = 'lighter';
          // glint leans toward the local pole then up to the bright glint colour
          x.fillStyle = K.rgba(K.mix(pole, P.glint, 0.55), gl);
          x.fillRect(xx, yy, step + 1, step + 1);
          if (slope > 8.5) { // white-hot shine on the very sharpest ridges
            x.fillStyle = K.rgba(P.glint, K.clamp((slope - 8.5) * 0.05, 0, 0.38) * (0.4 + focalBoost * 0.6));
            x.fillRect(xx, yy, step + 1, step + 1);
          }
        }
      }
    }
    x.restore();

    // ── 3. SHAPED CALM NEGATIVE SPACE — smooth saturated wash settling into the
    // corner opposite the focal, so it isn't uniform all-over crumple. Stays the
    // base hue (deeper, calmer) — NOT a pale field.
    x.save(); x.globalCompositeOperation = 'source-over';
    const ncx = (1 - lx) * W, ncy = (1 - ly) * H;
    const cg = x.createRadialGradient(ncx, ncy, 0, ncx, ncy, Math.max(W, H) * 0.55);
    cg.addColorStop(0, K.rgba(baseMid, 0.62));
    cg.addColorStop(0.45, K.rgba(K.mix(P.base, P.deep, 0.10), 0.28));
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

    // ── 5. FOCAL LIGHT-RIDGE — the dominant hero fold catching the strongest
    // oil-slick burst, on a thirds line. Demote the rest.
    const fcx = lx * W, fcy = ly * H;
    // colour the focal burst from a mid pole so it reads iridescent, not just white
    const burstPole = K.mix(P.shiftA, P.shiftB, 0.5);
    K.sheen(x, fcx, fcy, Math.max(W, H) * 0.20, K.mix(P.glint, burstPole, 0.4), 0.34);
    K.bloom(x, fcx, fcy, Math.max(W, H) * 0.13, P.glint, 0.20);
    // a tight specular hero streak along the ridge (full-bleed-ish diagonal)
    x.save(); x.globalCompositeOperation = 'lighter';
    const rsegs = 60, rlen = Math.max(W, H) * (0.62 + r() * 0.3);
    for (let band = 0; band < 3; band++) {
      const off = (band - 1) * 13;
      x.lineWidth = (3 - band) * 2.4;
      const bandCol = band === 1 ? P.glint : K.mix(burstPole, P.glint, 0.3);
      x.strokeStyle = K.rgba(bandCol, 0.22 - band * 0.05);
      x.beginPath();
      for (let sI = 0; sI <= rsegs; sI++) {
        const t = sI / rsegs;
        const along = (t - 0.5) * rlen;
        const wob = Math.sin(t * Math.PI * 3) * 24;
        const px = fcx + Math.cos(p.ang) * along - Math.sin(p.ang) * (wob + off);
        const py = fcy + Math.sin(p.ang) * along + Math.cos(p.ang) * (wob + off);
        sI === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();

    // ── 6. LIGHT-LEAK BLOOM from an edge — coloured (pole-leaning), keeps it bright
    const leakSide = r();
    const lkx = leakSide < 0.5 ? -W * 0.05 : W * 1.05;
    const lky = H * (0.15 + r() * 0.7);
    K.bloom(x, lkx, lky, Math.max(W, H) * 0.45, K.mix(P.shiftA, P.glint, 0.45), 0.16);

    // small counter-weight glint opposite the focal (asymmetric balance)
    const ogx = (1 - lx) * W + (r() - 0.5) * 0.1 * W;
    const ogy = (1 - ly) * H + (r() - 0.5) * 0.1 * H;
    K.bloom(x, ogx, ogy, Math.max(W, H) * 0.05, P.glint, 0.45);
    K.bloom(x, ogx, ogy, Math.max(W, H) * 0.12, K.mix(P.shiftB, P.glint, 0.2), 0.16);

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
      K.bloom(x, bx, by, Math.max(W, H) * 0.26, P.glint, 0.26);
      x.restore();
    } else if (p.event === 'Mirror Ridge') {
      x.save();
      const mw = Math.max(W, H) * 0.16, mh = Math.max(W, H) * 0.9;
      x.translate(fcx, fcy); x.rotate(p.ang);
      const grad = x.createLinearGradient(-mw / 2, 0, mw / 2, 0);
      grad.addColorStop(0, K.rgba(P.shiftA, 0)); grad.addColorStop(0.5, K.rgba(P.glint, 1)); grad.addColorStop(1, K.rgba(P.shiftB, 0));
      x.fillStyle = K.chromeRamp(x, -mw / 2, -mh / 2, mw, mh, Math.PI / 2, P.base);
      x.globalAlpha = 0.38; x.fillRect(-mw / 2, -mh / 2, mw, mh);
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = 1; x.fillStyle = grad;
      x.fillRect(-mw / 2, -mh / 2, mw, mh);
      x.restore();
      K.sheen(x, fcx, fcy, Math.max(W, H) * 0.16, P.glint, 0.4);
    }

    // ── 8. FILMIC FINISH — chromatic shimmer, grain, COLOURED depth vignette.
    K.chromaSplit(x, W, H, 2);                              // holographic edge shimmer
    K.mottle(x, 0, 0, W, H, P.base, 2400, r, 'overlay');   // subtle metal tooth
    K.grain(x, W, H, 720, r);
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

  return { name: 'foilA_jewel', draw, traits };
})();
