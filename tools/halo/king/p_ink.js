/* P_INK — flagship halo · marbled poured pigment (suminagashi / alcohol-ink)
 *
 * The matte FLUID project. Distinct from the shiny foil sibling: NO chrome, NO
 * blown specular, NO crinkle. This is pigment poured on wet paper —
 *   • suminagashi: concentric ink rings dropped off-centre then STRETCHED and
 *     COMBED by a curl-noise current (the kit's `curl`), bands stretching into
 *     long marbled filaments where the water pulls them;
 *   • alcohol-ink blooms: soft radial pours with feathered CELLULAR edges where
 *     a second pigment pushes the first into ringed cells;
 *   • fine veining: thin floating ink/metal-leaf veins tracing the flow;
 *   • tendrils where two colours meet but DON'T mud (clean transition hue).
 *
 * Composition: an off-centre confluence on a thirds line (the worked marbling),
 * a calm POOLED field of flat pigment opposite it (real shaped negative space),
 * full-bleed flow that runs off the edges. Matte, painterly, anime-saturated.
 *
 * BESPOKE PALETTE — 8 named ink-combination identities designed FOR marbled ink
 * (real pigment-pairing stories, not the bible's candy sets, not a rainbow).
 * Roles:
 *   paper   — the wet ground / pooled negative-space field (a COLOUR, never near-black)
 *   inkA    — the dominant poured pigment (the suminagashi ink)
 *   inkB    — the second pigment that blooms / combs against inkA
 *   inkC    — a third accent pigment, used sparingly in the confluence
 *   vein    — the fine floating veining / leaf line (metallic-leaning highlight)
 *   bleed   — the clean bright transition hue that keeps A↔B from mudding
 *
 * Deterministic per seed. Varied aspect. 2 rare chase events. Canvas ≤1280px.
 * Flow traces are step-capped; no full-res per-pixel loops. FORCE_PAL honoured.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  const PALS = [
    // Indigo sumi ink + vermilion bloom, threaded with gold leaf on warm rice paper.
    { name: 'Indigo & Vermilion', paper: '#f3d9a4', inkA: '#1f2f7a', inkB: '#ef3b2c', inkC: '#7a2bd6', vein: '#ffd86b', bleed: '#ff9d5c' },
    // Jade green ink poured against coral, cool celadon water, pale-jade veining.
    { name: 'Jade & Coral',       paper: '#bfeede', inkA: '#0f8a6a', inkB: '#ff6f6b', inkC: '#1d9bd1', vein: '#eafff4', bleed: '#ffd06b' },
    // Ultramarine pour + saffron bloom on a warm cream pool, copper veins.
    { name: 'Ultramarine & Saffron', paper: '#ffe7b0', inkA: '#244bd6', inkB: '#ffae12', inkC: '#ff4f8b', vein: '#ff9a3d', bleed: '#5cd6ff' },
    // Magenta and teal alcohol inks fighting over a mint pool, silver veining.
    { name: 'Magenta & Teal',     paper: '#c8f3ef', inkA: '#e21b8d', inkB: '#0fb6c4', inkC: '#7c4dff', vein: '#f4ffff', bleed: '#ffe14d' },
    // Violet sumi + chartreuse bloom on a lilac water, white-gold thread.
    { name: 'Violet & Chartreuse', paper: '#e3d4ff', inkA: '#6a2bd6', inkB: '#aef03d', inkC: '#ff5ec7', vein: '#fff3c0', bleed: '#5ce6ff' },
    // Crimson lake and cobalt marble on warm bone paper, brass veining.
    { name: 'Crimson & Cobalt',   paper: '#f6e3c8', inkA: '#d11e3c', inkB: '#1f54c4', inkC: '#16b59b', vein: '#ffcf6b', bleed: '#ff8fb0' },
    // Tangerine ink + plum bloom over peach water, rose-gold veins (warm world).
    { name: 'Tangerine & Plum',   paper: '#fbe9d0', inkA: '#e8470a', inkB: '#7a1ea8', inkC: '#ff2e88', vein: '#fff0d0', bleed: '#ffc21f' },
    // Emerald and ink-black-teal sumi on jade water, gold leaf (the deep-jewel world).
    { name: 'Emerald & Gold',     paper: '#a8e6c2', inkA: '#0e7a52', inkB: '#0a4a6e', inkC: '#ff9d2e', vein: '#ffe06b', bleed: '#7df0c0' },
  ];

  // varied aspect — portrait / landscape / square (square the minority)
  const FMTS = [
    { W: 1024, H: 1280, t: 'Portrait' },   // 4:5
    { W: 1000, H: 1500, t: 'Scroll' },     // 2:3 (suminagashi handscroll feel)
    { W: 1280, H: 853,  t: 'Vista' },      // 3:2
    { W: 1280, H: 720,  t: 'Wide' },       // 16:9
    { W: 1180, H: 1180, t: 'Square' },     // 1:1 (minority)
  ];
  function pickFmt(r) { const x = r(); return x < 0.26 ? FMTS[0] : x < 0.50 ? FMTS[1] : x < 0.72 ? FMTS[2] : x < 0.88 ? FMTS[3] : FMTS[4]; }

  const POURS = ['Suminagashi', 'Bloom', 'Confluence'];  // dominant marbling mode
  const COMB  = ['Calm', 'Combed', 'Torn'];               // how hard the current pulls
  // rare chase events
  const EVENTS = ['None','None','None','None','None','None','None','Gilded Veil','Eclipse Pool'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = pickFmt(r);
    const pour = K.pick(POURS, r);
    const comb = K.pick(COMB, r);
    const event = K.pick(EVENTS, r);
    // confluence anchor on a thirds intersection
    const cx = (r() < 0.5 ? 0.33 : 0.67) + (r() - 0.5) * 0.05;
    const cy = (r() < 0.5 ? 0.34 : 0.66) + (r() - 0.5) * 0.05;
    // current strength — how far the curl-flow combs the rings
    const flow = comb === 'Calm' ? 0.5 + r() * 0.4 : comb === 'Combed' ? 1.0 + r() * 0.6 : 1.6 + r() * 0.8;
    const ringCount = K.rint(r, 9, 16);            // suminagashi ring density
    const bloomCount = pour === 'Bloom' ? K.rint(r, 4, 7) : K.rint(r, 2, 4);
    const flowScale = 110 + r() * 90;              // curl noise spatial scale
    const drift = r() * Math.PI * 2;               // overall current bias direction
    return { pal, fmt, pour, comb, event, cx, cy, flow, ringCount, bloomCount, flowScale, drift };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Pour: p.pour, Current: p.comb, Event: p.event };
  }

  // MARBLING DISPLACEMENT — the heart of suminagashi. Returns the displaced
  // position of a point (px,py) after the current has dragged the ink. Combines
  // a coherent curl eddy (the water swirl) with a strong directional COMB rake
  // (the tine drag that creates the classic feathered marble). Magnitude is
  // LARGE — comparable to ring radius — so rings shear into long filaments.
  function marble(noise, px, py, p, W, H) {
    const minWH = Math.min(W, H);
    const sc = p.flowScale;                       // spatial scale of the eddy field
    // curl eddy — a GENTLE coherent swirl (keeps ring structure legible, just
    // bends it). Too much here shreds the rings into mush, so keep it modest.
    const v = K.curl(noise, px / sc * 100, py / sc * 100, 1);
    const eddy = p.flow * minWH * 0.30;
    let dx = v[0] * eddy, dy = v[1] * eddy;
    // directional COMB rake — the DOMINANT shear. A coherent sinusoidal drag
    // along the drift axis, phase varying across the perpendicular: this is what
    // turns concentric rings into the classic suminagashi feather. Smooth + big.
    const cd = Math.cos(p.drift), sd = Math.sin(p.drift);
    const perp = (-px * sd + py * cd) / minWH;    // position across the rake tines
    const rake = Math.sin(perp * Math.PI * (1.8 + p.flow * 1.0)) * p.flow * minWH * 0.16;
    dx += cd * rake; dy += sd * rake;
    return [px + dx, py + dy];
  }

  // Draw ONE combed suminagashi band: a closed contour around (ox,oy) at radius
  // rad, every sample point pushed by the marbling field so the circle stretches
  // into a feathered marble filament. Stroked (a thin ink contour line).
  function combRing(x, noise, ox, oy, rad, p, col, alpha, lw, W, H) {
    const segs = 160;
    x.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const px = ox + Math.cos(a) * rad;
      const py = oy + Math.sin(a) * rad;
      const m = marble(noise, px, py, p, W, H);
      i === 0 ? x.moveTo(m[0], m[1]) : x.lineTo(m[0], m[1]);
    }
    x.closePath();
    x.lineWidth = lw;
    x.strokeStyle = K.rgba(col, alpha);
    x.lineJoin = 'round';
    x.stroke();
  }

  // Filled combed blob (solid pigment body under/around the rings), marbled.
  function combBlob(x, noise, ox, oy, rad, p, col, alpha, W, H) {
    const segs = 120;
    x.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const px = ox + Math.cos(a) * rad;
      const py = oy + Math.sin(a) * rad;
      const m = marble(noise, px, py, p, W, H);
      i === 0 ? x.moveTo(m[0], m[1]) : x.lineTo(m[0], m[1]);
    }
    x.closePath();
    x.fillStyle = K.rgba(col, alpha);
    x.fill();
  }

  // Alcohol-ink BLOOM: a poured pigment cell whose body AND cellular edges are
  // pushed through the marble current, so it stretches into the same feathered
  // flow as the rings (no isolated fuzzy disc). Filled marbled body + a stack of
  // marbled cell contours where the second pigment has pushed the first out.
  function bloom(x, noise, bx, by, rad, p, core, edge, alpha, W, H) {
    // soft marbled body (clipped to a marbled outline so it's not a clean circle)
    x.save();
    x.beginPath();
    const segs = 90;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const wob = 1 + 0.14 * noise.fbm(Math.cos(a) * 2.2 + bx * 0.004, Math.sin(a) * 2.2 + by * 0.004, 3);
      const m = marble(noise, bx + Math.cos(a) * rad * wob, by + Math.sin(a) * rad * wob, p, W, H);
      j === 0 ? x.moveTo(m[0], m[1]) : x.lineTo(m[0], m[1]);
    }
    x.closePath();
    x.clip();
    // gradient body within the marbled clip — soft pour, feathered to nothing
    const g = x.createRadialGradient(bx, by, rad * 0.05, bx, by, rad * 1.25);
    g.addColorStop(0, K.rgba(core, alpha));
    g.addColorStop(0.55, K.rgba(core, alpha * 0.72));
    g.addColorStop(0.85, K.rgba(edge, alpha * 0.5));
    g.addColorStop(1, K.rgba(edge, 0));
    x.fillStyle = g;
    x.fillRect(bx - rad * 1.4, by - rad * 1.4, rad * 2.8, rad * 2.8);
    x.restore();
    // cellular feathered edges — concentric marbled cell rings (alcohol-ink cells)
    const cells = 3 + Math.floor(rad / 55);
    for (let i = 1; i <= cells; i++) {
      const rr = rad * (0.5 + 0.55 * (i / cells));
      x.beginPath();
      const cs = 80;
      for (let j = 0; j <= cs; j++) {
        const a = (j / cs) * Math.PI * 2;
        const wob = 1 + 0.10 * noise.fbm(Math.cos(a) * 2 + i * 3.1, Math.sin(a) * 2 + by * 0.003, 3);
        const m = marble(noise, bx + Math.cos(a) * rr * wob, by + Math.sin(a) * rr * wob, p, W, H);
        j === 0 ? x.moveTo(m[0], m[1]) : x.lineTo(m[0], m[1]);
      }
      x.closePath();
      x.lineWidth = 1.1;
      x.strokeStyle = K.rgba(edge, alpha * (0.28 + 0.14 * (1 - i / cells)));
      x.lineJoin = 'round';
      x.stroke();
    }
  }

  // Fine floating veins streaming along the current from a start point. Steps
  // along the curl direction (tangent to the marble flow), drifting full-bleed.
  function vein(x, noise, sx, sy, p, col, alpha, len, lw, W, H) {
    const sc = p.flowScale;
    let px = sx, py = sy;
    x.beginPath(); x.moveTo(px, py);
    const steps = Math.min(150, Math.floor(len));
    const cd = Math.cos(p.drift), sd = Math.sin(p.drift);
    for (let i = 0; i < steps; i++) {
      const v = K.curl(noise, px / sc * 100, py / sc * 100, 1);
      // normalise the curl direction → constant-speed stream
      const mag = Math.hypot(v[0], v[1]) + 1e-5;
      px += (v[0] / mag) * 2.6 + cd * 0.7;
      py += (v[1] / mag) * 2.6 + sd * 0.7;
      x.lineTo(px, py);
    }
    x.lineWidth = lw;
    x.strokeStyle = K.rgba(col, alpha);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.stroke();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal;
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const cx = p.cx * W, cy = p.cy * H;
    const minWH = Math.min(W, H);

    // ── 1. WET PAPER GROUND — the pool. A saturated coloured field, never dark.
    //   Gentle two-tone wash so the water reads as a real pigment-stained pool.
    const gg = x.createLinearGradient(0, 0, W, H);
    gg.addColorStop(0, K.mix(P.paper, P.bleed, 0.10));
    gg.addColorStop(0.55, P.paper);
    gg.addColorStop(1, K.mix(P.paper, P.inkA, 0.12));
    x.fillStyle = gg; x.fillRect(0, 0, W, H);

    // subtle fbm paper-stain so the pool isn't flat (matte, painterly)
    x.save(); x.globalCompositeOperation = 'multiply';
    const stainStep = Math.max(4, Math.floor(minWH / 150));
    const stainCol = K.h2r(K.mix(P.paper, P.inkA, 0.18));
    for (let yy = 0; yy < H; yy += stainStep) {
      for (let xx = 0; xx < W; xx += stainStep) {
        const n = (noise.fbm(xx / 240, yy / 240, 4) + 1) / 2;
        const a = K.clamp((n - 0.45) * 0.18, 0, 0.14);
        if (a < 0.01) continue;
        x.fillStyle = 'rgba(' + stainCol[0] + ',' + stainCol[1] + ',' + stainCol[2] + ',' + a + ')';
        x.fillRect(xx, yy, stainStep + 1, stainStep + 1);
      }
    }
    x.restore();

    // ── 2. CALM POOLED NEGATIVE SPACE — opposite the confluence. A soft flat
    //   wash of clean pigment-tinted water; shaped, breathing, no marbling.
    const ncx = (1 - p.cx) * W, ncy = (1 - p.cy) * H;
    x.save(); x.globalCompositeOperation = 'source-over';
    const cg = x.createRadialGradient(ncx, ncy, 0, ncx, ncy, Math.max(W, H) * 0.62);
    cg.addColorStop(0, K.rgba(K.mix(P.paper, P.bleed, 0.30), 0.55));
    cg.addColorStop(0.5, K.rgba(K.mix(P.paper, P.inkB, 0.06), 0.22));
    cg.addColorStop(1, K.rgba(P.paper, 0));
    x.fillStyle = cg; x.fillRect(0, 0, W, H);
    x.restore();

    // ── 3. THE CONFLUENCE — poured pigment bodies under the rings. A few combed
    //   blobs of inkA / inkB clustered around the anchor, stretched by the current.
    const bodyN = 3 + p.bloomCount;
    for (let i = 0; i < bodyN; i++) {
      const ang = r() * Math.PI * 2;
      const dist = (0.04 + r() * 0.22) * minWH;
      const ox = cx + Math.cos(ang) * dist;
      const oy = cy + Math.sin(ang) * dist;
      const rad = (0.07 + r() * 0.16) * minWH;
      const pick = r();
      const col = pick < 0.5 ? P.inkA : pick < 0.8 ? P.inkB : P.inkC;
      // saturated pigment body, lower opacity so it reads as a soft pour under the
      // rings rather than a flat muddy smear.
      combBlob(x, noise, ox, oy, rad, p, col, 0.18 + r() * 0.14, W, H);
    }

    // ── 4. SUMINAGASHI RINGS — concentric ink contours dropped at a few sources
    //   around the anchor, then combed into long marbled filaments by the curl flow.
    //   Alternating inkA / bleed rings (clean transition keeps it from mudding).
    const sources = 2 + Math.floor(p.bloomCount / 2);
    for (let s = 0; s < sources; s++) {
      const ang = r() * Math.PI * 2;
      const dist = (r() * 0.16) * minWH;
      const ox = cx + Math.cos(ang) * dist;
      const oy = cy + Math.sin(ang) * dist;
      const baseR = (0.02 + r() * 0.025) * minWH;
      const gap = (0.016 + r() * 0.016) * minWH;   // wider rings → marble sweeps further
      // contrast guard: if an ink reads too close to the paper's luminance the
      // marble goes flat — deepen it toward a richer pigment so the lines pop.
      const guard = (c) => Math.abs(K.lum(c) - K.lum(P.paper)) < 0.22 ? K.mix(c, P.inkA, 0.35) : c;
      const ringPair = r() < 0.5 ? [guard(P.inkA), guard(P.bleed)] : [guard(P.inkB), guard(P.bleed)];
      const n = p.ringCount;
      for (let i = 0; i < n; i++) {
        const rad = baseR + i * gap;
        const col = i % 2 === 0 ? ringPair[0] : ringPair[1];
        // crisp, legible concentric ink lines — keep contrast high so the marble
        // structure reads; only a slight outer falloff.
        const alpha = (i % 2 === 0 ? 0.82 : 0.62) * (1 - 0.4 * i / n);
        const lw = 1.4 + (1 - i / n) * 2.6;
        combRing(x, noise, ox, oy, rad, p, col, alpha, lw, W, H);
      }
    }

    // ── 5. ALCOHOL-INK BLOOMS — marbled cellular pours of inkB/inkC nested INTO
    //   the confluence (no isolated dots on clean paper — the calm pool stays
    //   empty by design). Each blooms within the worked region so it joins the flow.
    for (let i = 0; i < p.bloomCount; i++) {
      const ang = r() * Math.PI * 2;
      const dist = (0.03 + r() * 0.20) * minWH;   // kept inside the marble cluster
      const bx = cx + Math.cos(ang) * dist;
      const by = cy + Math.sin(ang) * dist;
      const rad = (0.07 + r() * 0.15) * minWH;
      const pick = r();
      const core = pick < 0.45 ? P.inkB : pick < 0.75 ? P.inkC : P.inkA;
      const edge = K.mix(core, P.bleed, 0.45);
      bloom(x, noise, bx, by, rad, p, core, edge, 0.5 + r() * 0.2, W, H);
    }

    // ── 6. TENDRILS where colours meet — short combed strokes of the clean bleed
    //   hue threading between A and B masses (anti-mud transition).
    x.save(); x.globalCompositeOperation = 'source-over';
    const tendN = 10 + Math.floor(p.flow * 8);
    for (let i = 0; i < tendN; i++) {
      const ang = r() * Math.PI * 2;
      const dist = (0.02 + r() * 0.28) * minWH;
      const sx = cx + Math.cos(ang) * dist;
      const sy = cy + Math.sin(ang) * dist;
      const col = K.mix(P.bleed, r() < 0.5 ? P.inkA : P.inkB, r() * 0.4);
      vein(x, noise, sx, sy, p, col, 0.14 + r() * 0.16, 30 + r() * 50, 1.0 + r() * 1.4, W, H);
    }
    x.restore();

    // ── 7. FLOATING VEINING — fine metal-leaf / fine-ink veins tracing the whole
    //   current, full-bleed (some start at edges and sweep across).
    const veinN = 14 + Math.floor(p.flow * 10);
    for (let i = 0; i < veinN; i++) {
      // half from the confluence, half from the frame edges (full-bleed flow)
      let sx, sy;
      if (i % 2 === 0) {
        const ang = r() * Math.PI * 2, dist = (0.02 + r() * 0.30) * minWH;
        sx = cx + Math.cos(ang) * dist; sy = cy + Math.sin(ang) * dist;
      } else {
        const edge = Math.floor(r() * 4);
        sx = edge === 0 ? 0 : edge === 1 ? W : r() * W;
        sy = edge === 2 ? 0 : edge === 3 ? H : r() * H;
      }
      const col = r() < 0.7 ? P.vein : K.mix(P.vein, P.inkC, 0.4);
      vein(x, noise, sx, sy, p, col, 0.16 + r() * 0.16, 100 + r() * 50, 0.7 + r() * 1.0, W, H);
    }

    // ── 8. RARE CHASE EVENTS ──
    if (p.event === 'Gilded Veil') {
      // a dense sweep of gold-leaf veining washing the confluence — opulent
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 60; i++) {
        const ang = r() * Math.PI * 2, dist = (r() * 0.34) * minWH;
        const sx = cx + Math.cos(ang) * dist, sy = cy + Math.sin(ang) * dist;
        vein(x, noise, sx, sy, p, P.vein, 0.08 + r() * 0.1, 80 + r() * 60, 0.5 + r() * 0.8, W, H);
      }
      K.bloom(x, cx, cy, minWH * 0.4, P.vein, 0.10);
      x.restore();
    } else if (p.event === 'Eclipse Pool') {
      // one large dark-ink suminagashi pool ringed by a bright bleed halo
      const er = minWH * 0.22;
      combBlob(x, noise, cx, cy, er, p, K.mix(P.inkA, '#10122a', 0.5), 0.6, W, H);
      for (let i = 0; i < 6; i++) {
        combRing(x, noise, cx, cy, er + i * minWH * 0.012, p, P.bleed, 0.4 * (1 - i / 8), 1.6, W, H);
      }
    }

    // ── 9. MATTE FINISH — paper tooth + fine grain, soft coloured edge settle.
    //   NO chroma split, NO chrome: this is a matte fluid surface.
    K.mottle(x, 0, 0, W, H, P.inkA, 6500, r, 'soft-light');  // faint paper tooth
    K.grain(x, W, H, 1500, r);                                 // light filmic grain
    // soft coloured edge settle (pigment pools slightly darker toward edges) —
    // a gentle paper vignette toward the inked paper hue, never black.
    x.save(); x.globalCompositeOperation = 'multiply';
    const vg = x.createRadialGradient(cx, cy, minWH * 0.2, cx, cy, Math.max(W, H) * 0.9);
    vg.addColorStop(0, 'rgba(255,255,255,1)');
    vg.addColorStop(1, K.rgba(K.mix(P.paper, P.inkA, 0.30), 1));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'p_ink', draw, traits };
})();
