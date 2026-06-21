/* K2 — FLUX
 * Fluid color masses: large poured-pigment bodies (alcohol-ink in water, but
 * BRIGHT candy color + Promare flame-energy abstracted) sweeping edge-to-edge on
 * diagonals, wet-on-wet bleeding edges with bloom halos, complementary masses
 * kept vivid (anti-mud), curl-noise flow filaments riding the currents,
 * light-leak blooms. Off-center confluence on a thirds point; a big calm
 * negative-space field opposite the busy worked region. Bright ground always.
 *
 * Look, NOT the harness: built on the dirE contract but the dark aesthetic is
 * rejected — every ground here is a saturated color, never a void.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // 8 BRIGHT colorways. ground = the dominant atmospheric base (a COLOR), then
  // two-to-three vivid mass hues kept complementary-but-separated, plus a hot
  // accent for filaments/flares and a near-white highlight for bloom cores.
  const PALS = [
    { name: 'PROMARE BURN',    ground: '#ff8fd6', m1: '#ff2e9a', m2: '#37e0e6', m3: '#b967ff', accent: '#fffb96', hi: '#ffffff' },
    { name: 'ACID BLOOM',      ground: '#d6ff6e', m1: '#ff2bd6', m2: '#39ff9e', m3: '#7c4dff', accent: '#f6ffd6', hi: '#fbffe9' },
    { name: 'TANGERINE DUSK',  ground: '#ffa85e', m1: '#ff4f8f', m2: '#a05cff', m3: '#ffd23f', accent: '#fff0d6', hi: '#fff6e6' },
    { name: 'PEACHY HOLOGRAM', ground: '#8ff0e2', m1: '#f9a886', m2: '#af81e4', m3: '#e784ba', accent: '#b7f6af', hi: '#fbfff6' },
    { name: 'CYBER SORBET',    ground: '#ff8fd2', m1: '#01cdfe', m2: '#05ffa1', m3: '#b967ff', accent: '#fffb96', hi: '#ffffff' },
    { name: 'ELECTRIC GOLD',   ground: '#4fa0ff', m1: '#ffd23f', m2: '#00e5d0', m3: '#ff4fa3', accent: '#fff7d6', hi: '#ffffff' },
    { name: 'FUCHSIA STORM',   ground: '#f255a0', m1: '#2f5cff', m2: '#ff2e9a', m3: '#ffac53', accent: '#ffd9ec', hi: '#fff2f8' },
    { name: 'MINT CORAL',      ground: '#9bf2cf', m1: '#ff7a85', m2: '#4fb8ff', m3: '#ffd166', accent: '#fff7c8', hi: '#fffdf2' },
  ];

  // Varied formats — portrait, landscape, square minority. Long edge ≤ 1280.
  const FMTS = [
    { W: 1024, H: 1280, t: 'Tall' },     // 4:5 portrait
    { W: 860,  H: 1280, t: 'Column' },   // 2:3 portrait
    { W: 1280, H: 854,  t: 'Wide' },     // 3:2 landscape
    { W: 1280, H: 720,  t: 'Pano' },     // 16:9 landscape
    { W: 1100, H: 1100, t: 'Square' },   // 1:1 minority
  ];

  const FLOWS = ['Pour', 'Sweep', 'Bloom', 'Confluence'];     // current archetype
  const TEMPS = ['Warm Lead', 'Cool Lead', 'Split'];          // which mass dominates
  const DENS  = ['Airy', 'Lush', 'Dense'];                    // worked-region body

  // rare chase events: mostly None, occasional flare / vortex
  const EVENTS = ['None', 'None', 'None', 'None', 'None', 'None', 'Light Flare', 'Vortex'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const flow = K.pick(FLOWS, r);
    const temp = K.pick(TEMPS, r);
    const dens = K.pick(DENS, r);
    const event = K.pick(EVENTS, r);
    // confluence point on a thirds intersection (the off-center focal anchor)
    const fx = r() < 0.5 ? 0.34 : 0.66;
    const fy = r() < 0.5 ? 0.36 : 0.64;
    // primary diagonal angle (full-bleed energy direction)
    const ang = (r() < 0.5 ? -1 : 1) * (0.55 + r() * 0.55); // radians-ish slope
    return { pal, fmt, flow, temp, dens, event, fx, fy, ang };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Palette: p.pal.name, Format: p.fmt.t, Flow: p.flow,
      Temperature: p.temp, Body: p.dens, Event: p.event,
    };
  }

  // ── one poured mass: a chain of soft radial brush stamps advected by curl
  // noise, each stamp a screen-blended colored gradient so overlaps build glow
  // and the body reads as wet pigment with feathered, bleeding edges. ──
  function pourMass(x, W, H, noise, col, hi, opts, r) {
    const { sx, sy, ang, length, width, steps, jitter } = opts;
    x.save();
    // OPAQUE body pass (source-over) so the mass has real saturated pigment,
    // not transparent smoke. A second screen pass adds the wet glow on top.
    let px = sx, py = sy;
    let dirx = Math.cos(ang), diry = Math.sin(ang);
    const stepLen = length / steps;
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const c = K.curl(noise, px + 1000, py + 1000, 1.2);
      const bias = 0.62;
      let vx = dirx * bias + c[0] * (1 - bias) * 2.6;
      let vy = diry * bias + c[1] * (1 - bias) * 2.6;
      const vl = Math.hypot(vx, vy) || 1;
      vx /= vl; vy /= vl;
      px += vx * stepLen + (r() - 0.5) * jitter;
      py += vy * stepLen + (r() - 0.5) * jitter;
      const env = Math.sin(Math.pow(t, 0.85) * Math.PI);
      const rad = width * (0.22 + env * 1.0) * (0.85 + r() * 0.3);
      pts.push({ px, py, rad, env, t });
    }
    // pass A — solid pigment body: tighter falloff, source-over, builds an
    // actual mass with a defined wet edge instead of fog
    for (const q of pts) {
      const a = 0.16 + q.env * 0.30;
      const g = x.createRadialGradient(q.px, q.py, 0, q.px, q.py, q.rad);
      // saturated interior; edge stays the SAME hue (no fade-to-grey) and only
      // drops alpha — that keeps the wet bleeding edge vivid (anti-mud).
      g.addColorStop(0, K.rgba(K.mix(col, hi, 0.18), a));
      g.addColorStop(0.6, K.rgba(col, a * 0.9));
      g.addColorStop(0.9, K.rgba(col, a * 0.4));
      g.addColorStop(1, K.rgba(col, 0));
      x.fillStyle = g;
      x.beginPath(); x.arc(q.px, q.py, q.rad, 0, Math.PI * 2); x.fill();
    }
    // pass B — wet bright spill along the spine (screen) for the glow halo
    x.globalCompositeOperation = 'screen';
    for (const q of pts) {
      if (q.env < 0.4) continue;
      const a = 0.05 + q.env * 0.10;
      const rad = q.rad * 0.7;
      const g = x.createRadialGradient(q.px, q.py, 0, q.px, q.py, rad);
      g.addColorStop(0, K.rgba(K.mix(col, hi, 0.5), a));
      g.addColorStop(1, K.rgba(col, 0));
      x.fillStyle = g;
      x.beginPath(); x.arc(q.px, q.py, rad, 0, Math.PI * 2); x.fill();
    }
    x.restore();
    return { ex: px, ey: py };
  }

  // ── flow-field filaments (Hobbs-style) riding the currents: thin bright
  // streaks that trace the curl field, clustered near the confluence. ──
  function filaments(x, W, H, noise, col, hi, cx, cy, count, len, r) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let f = 0; f < count; f++) {
      // seed in a tight cluster near the focal confluence (gaussian-ish)
      const rr = Math.pow(r(), 1.6);
      const aa = r() * Math.PI * 2;
      let px = cx + Math.cos(aa) * rr * W * 0.42;
      let py = cy + Math.sin(aa) * rr * H * 0.42;
      const steps = len;
      const w = 0.9 + r() * 2.6;
      const a = 0.28 + r() * 0.40;
      x.lineWidth = w;
      x.lineCap = 'round';
      x.strokeStyle = K.rgba(r() < 0.35 ? hi : col, a);
      x.beginPath(); x.moveTo(px, py);
      for (let i = 0; i < steps; i++) {
        const c = K.curl(noise, px + 1000, py + 1000, 1.0);
        const sp = 5 + r() * 4;
        px += c[0] * sp * 3.0;
        py += c[1] * sp * 3.0;
        if (px < -20 || px > W + 20 || py < -20 || py > H + 20) break;
        x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const minWH = Math.min(W, H), maxWH = Math.max(W, H);

    const fx = W * p.fx, fy = H * p.fy;          // confluence (focal anchor)
    const calmx = W * (1 - p.fx), calmy = H * (1 - p.fy); // opposite negative-space field

    // ── 1. BRIGHT GROUND — a soft two-tone color field, never a void. A gentle
    //    diagonal gradient from ground toward a tinted highlight, so it reads as
    //    luminous atmosphere with the calm field carrying the lighter wash. ──
    {
      const g = x.createLinearGradient(calmx, calmy, fx, fy);
      g.addColorStop(0, K.mix(P.ground, P.hi, 0.42));
      g.addColorStop(0.5, P.ground);
      g.addColorStop(1, K.mix(P.ground, p.temp === 'Cool Lead' ? P.m2 : P.m1, 0.22));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
    // far hazy color drift across the ground — keeps it alive, sets depth plane 1
    K.hazeSheet(x, W, H, noise, K.mix(P.ground, P.m3, 0.5), 0.10, 140, 'screen');

    // ── 2. THE POURED MASSES (mid plane) — large soft pigment bodies sweeping
    //    full-bleed diagonals through the confluence. Warm vs cool kept vivid &
    //    separated to avoid mud. Mass count scales with Body density. ──
    const baseAng = p.ang; // slope; convert to angle in radians
    const A = Math.atan2(baseAng, 1);

    // choose lead/secondary by temperature
    const warm = [P.m1, P.m3];
    const cool = [P.m2];
    let order;
    if (p.temp === 'Warm Lead') order = [P.m1, P.m3, P.m2];
    else if (p.temp === 'Cool Lead') order = [P.m2, P.m3, P.m1];
    else order = [P.m1, P.m2, P.m3];

    const bodyMul = p.dens === 'Dense' ? 1.05 : p.dens === 'Lush' ? 0.88 : 0.78;
    const massCount = p.dens === 'Dense' ? 3 : 3;

    for (let mIdx = 0; mIdx < massCount; mIdx++) {
      const col = order[mIdx % order.length];
      // each mass enters from off-canvas, sweeps through near the confluence and
      // exits the far side — guarantees full-bleed, nothing boxed.
      const spread = (mIdx - (massCount - 1) / 2);
      const perpx = -Math.sin(A), perpy = Math.cos(A);
      const off = spread * minWH * 0.20 * (0.7 + r() * 0.6);
      const cxp = fx + perpx * off, cyp = fy + perpy * off;
      // start well off the upstream edge
      const reach = maxWH * 0.85;
      const sx = cxp - Math.cos(A) * reach * (0.6 + r() * 0.3);
      const sy = cyp - Math.sin(A) * reach * (0.6 + r() * 0.3);
      const width = minWH * (0.16 + r() * 0.10) * bodyMul * (mIdx === 0 ? 1.25 : 1.0);
      pourMass(x, W, H, noise, col, P.hi, {
        sx, sy, ang: A + (r() - 0.5) * 0.4,
        length: reach * (1.5 + r() * 0.6),
        width,
        steps: 54,
        jitter: minWH * 0.012,
        blend: 'screen',
      }, r);
      // a denser inner core pass for the lead mass → focal hierarchy
      if (mIdx === 0) {
        pourMass(x, W, H, noise, col, P.hi, {
          sx: cxp - Math.cos(A) * reach * 0.35, sy: cyp - Math.sin(A) * reach * 0.35,
          ang: A + (r() - 0.5) * 0.3,
          length: reach * 0.9, width: width * 0.6, steps: 40,
          jitter: minWH * 0.008, blend: 'screen',
        }, r);
      }
    }

    // ── 2a. ACTIVE NEGATIVE SPACE — a faint far-plane color drift sitting in
    //    the calm region opposite the confluence, so the breathing field carries
    //    color and counterweights the busy mass instead of reading as empty. ──
    {
      const driftCol = K.mix(P.ground, p.temp === 'Warm Lead' ? P.m2 : P.m1, 0.5);
      K.bloom(x, calmx + (r() - 0.5) * W * 0.2, calmy + (r() - 0.5) * H * 0.2,
              maxWH * (0.32 + r() * 0.12), driftCol, 0.10);
    }

    // ── 2b. WET-INK EDGE POOLING — alcohol-ink signature: short feathered
    //    tendrils of concentrated pigment branching off the masses near the
    //    confluence, where wet pigment pools and dendrites. Saturated, thin. ──
    {
      x.save();
      const tendrils = p.dens === 'Dense' ? 46 : p.dens === 'Lush' ? 34 : 22;
      for (let f = 0; f < tendrils; f++) {
        const rr = Math.pow(r(), 1.3);
        const aa = r() * Math.PI * 2;
        let px = fx + Math.cos(aa) * rr * minWH * 0.5;
        let py = fy + Math.sin(aa) * rr * minWH * 0.5;
        const col = order[K.rint(r, 0, order.length - 1)];
        // concentrated rim hue: push toward the pure mass color, not white
        x.strokeStyle = K.rgba(K.mix(col, P.accent, 0.15), 0.16 + r() * 0.18);
        x.lineWidth = 0.6 + r() * 1.2;
        x.lineCap = 'round';
        x.beginPath(); x.moveTo(px, py);
        const steps = 8 + Math.floor(r() * 10);
        for (let i = 0; i < steps; i++) {
          const c = K.curl(noise, px - 700, py - 700, 1.0);
          px += c[0] * 14 + (r() - 0.5) * 4;
          py += c[1] * 14 + (r() - 0.5) * 4;
          x.lineTo(px, py);
        }
        x.stroke();
      }
      x.restore();
    }

    // ── 3. WET-ON-WET BLOOM HALOS at the confluence — the wet edge glow where
    //    masses meet; this is the focal anchor's luminosity. ──
    K.bloom(x, fx, fy, minWH * (0.26 + r() * 0.10), K.mix(order[0], P.hi, 0.4), 0.24);
    K.bloom(x, fx + (r() - 0.5) * W * 0.10, fy + (r() - 0.5) * H * 0.10,
            minWH * (0.15 + r() * 0.08), K.mix(order[1], P.hi, 0.3), 0.20);
    // a soft bright incident to anchor the eye (the worked focal pop) — kept
    // diffuse so it never reads as a hard hot dot.
    K.sheen(x, fx + (r() - 0.5) * minWH * 0.08, fy + (r() - 0.5) * minWH * 0.08,
            minWH * 0.16, P.accent, 0.26);

    // ── 4. FLOW FILAMENTS (near plane) — bright currents riding the curl field,
    //    clustered at the confluence, sweeping out along the diagonal. ──
    const filCount = p.dens === 'Dense' ? 130 : p.dens === 'Lush' ? 95 : 65;
    filaments(x, W, H, noise, K.mix(order[0], P.accent, 0.55), P.hi, fx, fy, filCount, 30, r);
    filaments(x, W, H, noise, K.mix(order[1], P.hi, 0.4), P.accent, fx, fy, Math.floor(filCount * 0.6), 26, r);
    // a few bold hero filaments tracing the main current, brightest near focal
    filaments(x, W, H, noise, P.hi, P.accent, fx, fy, Math.floor(filCount * 0.18), 38, r);

    // ── 5. LIGHT-LEAK BLOOM from an edge — washes the palette brighter where it
    //    lands, near the confluence, leaking off-canvas (lead-in + exit). ──
    {
      const edge = r();
      let lx, ly;
      if (edge < 0.25) { lx = W * (0.2 + r() * 0.6); ly = -H * 0.05; }
      else if (edge < 0.5) { lx = W * 1.05; ly = H * (0.2 + r() * 0.6); }
      else if (edge < 0.75) { lx = W * (0.2 + r() * 0.6); ly = H * 1.05; }
      else { lx = -W * 0.05; ly = H * (0.2 + r() * 0.6); }
      K.bloom(x, lx, ly, maxWH * (0.45 + r() * 0.2), K.mix(P.accent, P.hi, 0.4), 0.3);
    }

    // ── 6. RARE CHASE EVENTS ──
    if (p.event === 'Light Flare') {
      // full-frame over-exposed flare across the confluence
      x.save(); x.globalCompositeOperation = 'lighter';
      const fg = x.createLinearGradient(0, 0, W, H);
      fg.addColorStop(0, K.rgba(P.hi, 0));
      fg.addColorStop(0.5, K.rgba(K.mix(P.accent, P.hi, 0.5), 0.34));
      fg.addColorStop(1, K.rgba(P.hi, 0));
      x.fillStyle = fg; x.fillRect(0, 0, W, H);
      // anamorphic streak through the focal point
      const sg = x.createLinearGradient(0, fy, W, fy);
      sg.addColorStop(0, K.rgba(P.accent, 0));
      sg.addColorStop(0.5, K.rgba(P.hi, 0.5));
      sg.addColorStop(1, K.rgba(P.accent, 0));
      x.fillStyle = sg; x.fillRect(0, fy - minWH * 0.012, W, minWH * 0.024);
      x.restore();
      K.bloom(x, fx, fy, maxWH * 0.6, P.hi, 0.5);
      K.sheen(x, fx, fy, minWH * 0.34, P.accent, 0.7);
    } else if (p.event === 'Vortex') {
      // a spun confluence: filaments wound into a spiral at the focal point
      x.save(); x.globalCompositeOperation = 'lighter';
      const turns = 3.2 + r() * 1.5, arms = 5, maxR = minWH * 0.32;
      for (let a = 0; a < arms; a++) {
        const a0 = (a / arms) * Math.PI * 2 + r();
        x.strokeStyle = K.rgba(K.mix(order[a % order.length], P.hi, 0.4), 0.4);
        x.lineWidth = 1.4; x.beginPath();
        for (let i = 0; i <= 120; i++) {
          const t = i / 120;
          const ang = a0 + t * turns * Math.PI * 2;
          const rad = t * maxR;
          const xx = fx + Math.cos(ang) * rad, yy = fy + Math.sin(ang) * rad;
          i === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy);
        }
        x.stroke();
      }
      x.restore();
      K.bloom(x, fx, fy, minWH * 0.22, P.hi, 0.5);
    }

    // ── 7. PAINTERLY FINISH — mottle for brushy tooth, fine grain over haze to
    //    keep big fields filmic, a soft warm vignette tint (NOT dark — a color
    //    edge wash so corners don't go void), subtle chroma shimmer at edges. ──
    // anti-mud separation: a faint accent veil only over the calm field so it
    // stays a clean bright negative space
    K.mottle(x, 0, 0, W, H, K.mix(P.ground, P.hi, 0.4), 2600, r, 'soft-light');
    // final atmospheric haze unifies the planes (light touch — don't milk it)
    K.hazeSheet(x, W, H, noise, K.mix(P.ground, P.accent, 0.4), 0.04, 240, 'screen');
    // gentle chroma shimmer (holographic edge) — restrained
    K.chromaSplit(x, W, H, 1);
    // grain to keep gradients alive
    K.grain(x, W, H, 650, r);
    // COLOR vignette (bright): darken corners only slightly toward a saturated
    // ground tint, never black — preserves the bright-ground mandate.
    {
      const g = x.createRadialGradient(W * 0.5, H * 0.46, minWH * 0.3, W * 0.5, H * 0.5, maxWH * 0.8);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, K.rgba(K.mix(P.ground, P.m3, 0.35), 0.22));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'k2_flux', draw, traits };
})();
