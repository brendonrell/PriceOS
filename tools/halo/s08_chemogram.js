/* LATENT — cameraless darkroom photography (chemigram / luminogram).
 * Liquid emulsion worked by hand: developer & fixer BLOOM where chemistry
 * pooled, chemical TIDE-LINES meander where wet met dry, heavy silver GRAIN
 * clumps in the shadows, dust & hairs cling, a warm LIGHT LEAK fogs one edge —
 * and, half-dissolved in the stain, a LATENT ghost (a horizon, a disc, a face,
 * a hand) almost resolves before sinking back into chemistry.
 * SURREAL = real-but-off: a tide-line that becomes an impossible horizon, a
 * coin that is also a moon, a form you can never quite be sure you saw.
 * Toned silver-gelatin palette world — never garish, gallery fine-art.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six toned silver-gelatin palettes. Each = a base paper tone + a chemical
     toning bias (shadow tint / highlight tint), so they read as different
     darkroom chemistries from across the room, not one wash reskinned.
     paper = lightest highlight, base = mid emulsion, deep = darkest silver,
     tone = the chromatic toning bias (split-tone shadows toward this),
     glow = highlight/leak warmth, leak = the light-leak flare colour. */
  const PALS = [
    { name: 'Selenium',  paper: '#cfcad2', base: '#7d7682', mid: '#4c4654', deep: '#211c2c', tone: '#2a2238', glow: '#d9d2dc', leak: '#7e6b8e', cool: true },
    { name: 'Sepia',     paper: '#efe4cf', base: '#b39468', mid: '#7c5a37', deep: '#34241a', tone: '#5a3b22', glow: '#f3e6c6', leak: '#caa257', cool: false },
    { name: 'Cyanotype', paper: '#dfe7e9', base: '#5d8197', mid: '#2f5471', deep: '#0e2236', tone: '#16324f', glow: '#e6eef0', leak: '#4f86a8', cool: true },
    { name: 'Lith',      paper: '#f0ddca', base: '#c08d72', mid: '#5a4658', deep: '#181425', tone: '#241a33', glow: '#f6d9bb', leak: '#e0936a', cool: false, split: true },
    { name: 'Bleach',    paper: '#e9e6df', base: '#b9b4a9', mid: '#8e8a80', deep: '#56524a', tone: '#6b6358', glow: '#f1eee8', leak: '#cfc6b4', cool: false, high: true },
    { name: 'Fog',       paper: '#cdcdce', base: '#8f9092', mid: '#5f6164', deep: '#2e3033', tone: '#3a3d40', glow: '#d6d7d8', leak: '#9aa0a6', cool: true, flat: true },
  ];

  const MODES = ['Bloom', 'Tideline', 'Leak', 'Latent', 'Pour', 'Damage'];
  const GHOSTS = ['Horizon', 'Disc', 'Face', 'Hand'];
  const FORMATS = [[1040, 1280], [1180, 1180], [1280, 1020]]; // portrait / square / landscape

  function minWHof(W, H) { return Math.min(W, H); }

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  /* a soft irregular tonal field: an fbm-masked radial wash. Used for blooms,
     pours and base mottling. `polarity` <0 darkens (more silver), >0 lightens. */
  function tonalField(x, W, H, noise, cx, cy, rad, col, opacity, polarity, scale, r) {
    const step = Math.max(3, Math.floor(Math.min(W, H) / 200));
    const c = K.h2r(col);
    const ph = r() * 1000;
    x.save();
    x.globalCompositeOperation = polarity < 0 ? 'multiply' : 'screen';
    for (let yy = 0; yy < H; yy += step) {
      const rowOff = (r() - 0.5) * step; // stagger rows so no vertical lattice
      for (let xx0 = -step; xx0 < W; xx0 += step) {
        const xx = xx0 + rowOff;
        const dx = (xx - cx), dy = (yy - cy);
        const d = Math.sqrt(dx * dx + dy * dy) / rad;
        if (d > 1.35) continue;
        // soft falloff + fbm break-up so the edge is ragged, never a clean disc
        const fall = K.clamp(1 - d, 0, 1);
        const n = (noise.fbm((xx + ph) / scale, (yy + ph) / scale, 5, 0.55, 2.1) + 1) / 2;
        let a = fall * fall * (0.35 + n * 0.9) * opacity;
        // ragged chemistry edge: noise pushes the boundary in/out
        if (d > 0.7) a *= K.clamp(1 - (d - 0.7) / (0.65) + (n - 0.5) * 1.2, 0, 1);
        if (a < 0.012) continue;
        x.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + K.clamp(a, 0, 1) + ')';
        // overlap + jitter so cells never read as a regular lattice
        const j = step * 0.6;
        x.fillRect(xx - j * r(), yy - j * r(), step + 1 + j * 1.6, step + 1 + j * 1.6);
      }
    }
    x.restore();
  }

  /* a meandering chemical tide-line: a noise-displaced horizontal front, with a
     darker ridge above/below where the chemistry crusted. yBase 0..1. */
  function tideLine(x, W, H, noise, yBase, amp, col, ridgeCol, r, thick) {
    const yc = H * yBase;
    const ph = r() * 500;
    const sc = 180 + r() * 220;
    const pts = [];
    for (let xx = 0; xx <= W; xx += 4) {
      const n = noise.fbm((xx + ph) / sc, ph / 90, 4, 0.5, 2.2);
      const n2 = noise.fbm((xx + ph) / (sc * 0.33), 99 + ph / 50, 3, 0.5, 2.2);
      pts.push([xx, yc + n * amp + n2 * amp * 0.32]);
    }
    // soft tonal step across the front (one side wetter / darker) — feathered
    // over a wide band so it reads as a chemical front, never a hard digital edge
    const feather = amp * 6 + minWHof(W, H) * 0.12;
    x.save();
    x.globalCompositeOperation = 'multiply';
    x.beginPath();
    x.moveTo(0, yc - feather); x.lineTo(pts[0][0], pts[0][1]);
    for (const p of pts) x.lineTo(p[0], p[1]);
    x.lineTo(W, yc - feather); x.closePath();
    const peak = 0.20 + r() * 0.12;
    const g = x.createLinearGradient(0, yc - feather, 0, yc + amp + 4);
    g.addColorStop(0, K.rgba(col, 0));
    g.addColorStop(0.82, K.rgba(col, peak * 0.6));
    g.addColorStop(1, K.rgba(col, peak));
    x.fillStyle = g; x.fill();
    x.restore();
    // the crusted ridge itself — a soft darker meniscus (blurred, never a wire)
    x.save();
    x.globalCompositeOperation = 'soft-light';
    x.lineWidth = thick || (2.5 + r() * 4.5);
    x.lineJoin = 'round'; x.lineCap = 'round';
    x.strokeStyle = K.rgba(ridgeCol, 0.28 + r() * 0.18);
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) x.lineTo(p[0], p[1]);
    x.stroke();
    // a faint bright lip just below (dried salt edge) — broken, not continuous
    x.globalCompositeOperation = 'screen';
    x.lineWidth = 1.3;
    x.strokeStyle = K.rgba('#ffffff', 0.06 + r() * 0.06);
    x.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i === 0 || r() < 0.18) x.moveTo(p[0], p[1] + 3.5);
      else x.lineTo(p[0], p[1] + 3.5);
    }
    x.stroke();
    x.restore();
  }

  /* the LATENT ghost pass — a very low-contrast suggestion of a form, drawn
     into an offscreen buffer at near-threshold alpha then chemistry-masked so
     it half-dissolves. Never a clean illustration. */
  function ghostPass(x, W, H, noise, kind, col, r, strength) {
    strength = strength || 0.5;
    const o = document.createElement('canvas'); o.width = W; o.height = H;
    const g = o.getContext('2d');
    const S = Math.min(W, H);
    g.fillStyle = K.rgba(col, 1);
    g.lineCap = 'round'; g.lineJoin = 'round';
    // forms are SOFT FILLED MASSES (developed silver), not wire outlines, so the
    // shape survives the chemistry mask and actually reads as half-emerged.
    g.filter = 'blur(' + (S * 0.006) + 'px)';
    const cx = W * (0.42 + r() * 0.16), cy = H * (0.42 + r() * 0.14);
    if (kind === 'Disc') {
      const rad = S * (0.20 + r() * 0.09);
      const dg = g.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
      dg.addColorStop(0, K.rgba(col, 0.9)); dg.addColorStop(0.7, K.rgba(col, 0.7)); dg.addColorStop(0.92, K.rgba(col, 0.3)); dg.addColorStop(1, K.rgba(col, 0));
      g.fillStyle = dg; g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.fill();
    } else if (kind === 'Horizon') {
      const yy = H * (0.5 + r() * 0.08);
      // land mass below, faint disc above — solid tonal blocks, soft edges
      const lg = g.createLinearGradient(0, yy - S * 0.05, 0, H);
      lg.addColorStop(0, K.rgba(col, 0)); lg.addColorStop(0.25, K.rgba(col, 0.7)); lg.addColorStop(1, K.rgba(col, 0.85));
      g.fillStyle = lg;
      g.beginPath(); g.moveTo(0, H);
      for (let xx = 0; xx <= W; xx += 6) g.lineTo(xx, yy + noise.fbm(xx / 240, 4, 3) * H * 0.025);
      g.lineTo(W, H); g.closePath(); g.fill();
      const sr = S * 0.085, sx = W * (0.3 + r() * 0.4), sy = yy - S * 0.12;
      const sg = g.createRadialGradient(sx, sy, 0, sx, sy, sr);
      sg.addColorStop(0, K.rgba(col, 0.85)); sg.addColorStop(1, K.rgba(col, 0));
      g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, sr, 0, 7); g.fill();
    } else if (kind === 'Hand') {
      const s = S * 0.17;
      g.save(); g.translate(cx, cy + s * 0.35); g.rotate((r() - 0.5) * 0.35);
      g.fillStyle = K.rgba(col, 0.8);
      // palm
      g.beginPath(); g.ellipse(0, 0, s * 0.5, s * 0.62, 0, 0, 7); g.fill();
      // five tapering fingers as thick rounded strokes (filled mass)
      g.strokeStyle = K.rgba(col, 0.8); g.lineWidth = s * 0.18;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.4;
        const fl = s * (i === 0 ? 0.65 : i === 2 ? 1.05 : 0.88);
        const bx = Math.cos(a) * s * 0.4, by = Math.sin(a) * s * 0.5 - s * 0.25;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(Math.cos(a) * (s * 0.4 + fl), Math.sin(a) * (s * 0.5 + fl) - s * 0.25); g.stroke();
      }
      g.restore();
    } else { // Face — a smooth filled oval with darker eye/shadow hollows
      const fw = S * 0.15, fh = fw * 1.32;
      const fg = g.createRadialGradient(cx, cy, fw * 0.2, cx, cy, fh);
      fg.addColorStop(0, K.rgba(col, 0.85)); fg.addColorStop(0.8, K.rgba(col, 0.55)); fg.addColorStop(1, K.rgba(col, 0));
      g.fillStyle = fg; g.beginPath(); g.ellipse(cx, cy, fw, fh, 0, 0, 7); g.fill();
      // eye/brow hollows carved darker
      g.save(); g.globalCompositeOperation = 'destination-out';
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.beginPath(); g.ellipse(cx - fw * 0.4, cy - fh * 0.06, fw * 0.2, fw * 0.12, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(cx + fw * 0.4, cy - fh * 0.06, fw * 0.2, fw * 0.12, 0, 0, 7); g.fill();
      g.restore();
    }
    g.filter = 'none';
    // chemistry mask: erase the form with fbm so it half-dissolves into stain —
    // but lightly, so a clear silver suggestion remains (this IS the subject).
    // two-scale erase: a coarse mask removes whole regions (so part of the form
    // vanishes entirely), a finer mask mottles what's left. The surviving piece
    // keeps its silhouette — a hand half there, a face fading at one cheek.
    g.globalCompositeOperation = 'destination-out';
    const step = Math.max(3, Math.floor(S / 200));
    const ph = r() * 1000, ph2 = r() * 1000;
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        const coarse = (noise.fbm((xx + ph) / (S * 0.5), (yy + ph) / (S * 0.5), 3, 0.6, 2.2) + 1) / 2;
        const fine = (noise.fbm((xx + ph2) / 80, (yy + ph2) / 80, 5, 0.6, 2.2) + 1) / 2;
        // coarse: hard-cut whole regions; fine: soft mottle in the kept region
        let erase = K.clamp((0.62 - coarse) * 3, 0, 1);       // big bites
        erase = Math.max(erase, K.clamp(0.15 + (fine - 0.5) * 1.3, 0, 1)); // mottle
        if (erase < 0.02) continue;
        g.fillStyle = 'rgba(0,0,0,' + erase + ')';
        const j = step * 0.7;
        g.fillRect(xx - j * r(), yy - j * r(), step + 1 + j * 1.8, step + 1 + j * 1.8);
      }
    }
    // composite the surviving silver form into the print. Darker toned forms
    // multiply (silver settling in); the result reads as latent in the emulsion.
    x.save();
    x.globalAlpha = strength;
    x.globalCompositeOperation = K.lum(col) < 0.5 ? 'multiply' : 'screen';
    x.drawImage(o, 0, 0);
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 23);
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const ghostKind = K.pick(GHOSTS, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const minWH = Math.min(W, H);

    // ── BASE EMULSION: paper tone with an uneven hand-coated wash ──
    x.fillStyle = pal.base; x.fillRect(0, 0, W, H);
    // broad uneven coat gradient (one corner thinner / lighter)
    const cg = x.createLinearGradient(0, 0, W * (r() < 0.5 ? 1 : -0.2), H);
    cg.addColorStop(0, K.rgba(pal.paper, 0.5));
    cg.addColorStop(0.5, K.rgba(pal.base, 0.0));
    cg.addColorStop(1, K.rgba(pal.deep, 0.45));
    x.save(); x.globalCompositeOperation = 'soft-light'; x.fillStyle = cg; x.fillRect(0, 0, W, H); x.restore();

    // large slow fbm tone modulation across the whole sheet (developer unevenness)
    {
      const step = Math.max(4, Math.floor(minWH / 150));
      const ph = r() * 1000;
      const lo = pal.flat ? 0.10 : 0.22;
      x.save(); x.globalCompositeOperation = 'overlay';
      for (let yy = 0; yy < H; yy += step) {
        const rowOff = (r() - 0.5) * step;
        for (let xx0 = -step; xx0 < W; xx0 += step) {
          const xx = xx0 + rowOff;
          const n = noise.fbm((xx + ph) / (minWH * 0.55), (yy + ph) / (minWH * 0.55), 4, 0.55, 2.2);
          const col = n < 0 ? pal.deep : pal.paper;
          const a = Math.abs(n) * lo;
          if (a < 0.012) continue;
          const c = K.h2r(col);
          x.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
          const j = step * 0.7;
          x.fillRect(xx - j * r(), yy - j * r(), step + 1 + j * 1.8, step + 1 + j * 1.8);
        }
      }
      x.restore();
    }

    // split-tone shadows toward the toning bias (Lith / Selenium chemistry)
    {
      x.save(); x.globalCompositeOperation = 'multiply';
      const tg = x.createRadialGradient(W / 2, H / 2, minWH * 0.1, W / 2, H / 2, minWH * 0.9);
      tg.addColorStop(0, K.rgba(pal.tone, 0));
      tg.addColorStop(1, K.rgba(pal.tone, pal.split ? 0.34 : 0.18));
      x.fillStyle = tg; x.fillRect(0, 0, W, H); x.restore();
    }

    // ── MODE COMPOSITION ──
    const darkN = pal.high ? 1 : 2;       // bleach high-key = fewer dark blooms
    const blowN = pal.flat ? 1 : 2;

    if (mode === 'Bloom') {
      // one dominant central developer bloom + a few satellites
      const cx = W * (0.5 + (r() - 0.5) * 0.18), cy = H * (0.5 + (r() - 0.5) * 0.18);
      tonalField(x, W, H, noise, cx, cy, minWH * (0.5 + r() * 0.2), pal.deep, pal.high ? 0.4 : 0.75, -1, minWH * 0.4, r);
      tonalField(x, W, H, noise, cx + (r() - 0.5) * W * 0.2, cy + (r() - 0.5) * H * 0.2, minWH * 0.22, pal.glow, 0.6, 1, minWH * 0.3, r);
      for (let i = 0; i < 2; i++) tonalField(x, W, H, noise, r() * W, r() * H, minWH * (0.18 + r() * 0.16), r() < 0.5 ? pal.deep : pal.mid, 0.4, -1, minWH * 0.3, r);
    } else if (mode === 'Tideline') {
      // stacked chemical fronts → uncanny horizon
      const nL = 3 + (r() * 2 | 0);
      for (let i = 0; i < nL; i++) {
        const yb = 0.28 + i * (0.5 / nL) + (r() - 0.5) * 0.05;
        tideLine(x, W, H, noise, yb, minWH * (0.02 + r() * 0.05), pal.deep, pal.mid, r);
      }
      // a darker chemistry pool below the lowest front
      tonalField(x, W, H, noise, W * 0.5, H * 0.85, minWH * 0.6, pal.deep, 0.5, -1, minWH * 0.5, r);
      tonalField(x, W, H, noise, W * (0.3 + r() * 0.4), H * 0.22, minWH * 0.3, pal.glow, 0.4, 1, minWH * 0.4, r);
    } else if (mode === 'Leak') {
      // corner light-leak + flare dominant — handled in leak block, add a soft pour
      tonalField(x, W, H, noise, W * (r() < 0.5 ? 0.2 : 0.8), H * 0.6, minWH * 0.45, pal.deep, 0.5, -1, minWH * 0.45, r);
    } else if (mode === 'Latent') {
      // mottled chemistry ground so the ghost emerges from stain (no centred
      // halo, no glow-orb). The ghost pass below is the subject.
      const gx = W * (0.5 + (r() - 0.5) * 0.12), gy = H * (0.46 + (r() - 0.5) * 0.08);
      tonalField(x, W, H, noise, gx, gy, minWH * 0.6, pal.mid, 0.5, -1, minWH * 0.5, r);
      for (let i = 0; i < 3; i++) tonalField(x, W, H, noise, r() * W, r() * H, minWH * (0.2 + r() * 0.2), r() < 0.5 ? pal.deep : pal.mid, 0.45, -1, minWH * 0.4, r);
    } else if (mode === 'Pour') {
      // organic poured / dripped stains: several overlapping ragged fields + drips
      const n = 4 + (r() * 3 | 0);
      for (let i = 0; i < n; i++) {
        const cx = r() * W, cy = r() * H * 0.8;
        tonalField(x, W, H, noise, cx, cy, minWH * (0.22 + r() * 0.24), r() < 0.6 ? pal.deep : pal.mid, 0.5, -1, minWH * (0.25 + r() * 0.2), r);
        // a drip running down from the pool
        if (r() < 0.7) {
          x.save(); x.globalCompositeOperation = 'multiply';
          const dw = 2 + r() * 6, dl = H * (0.1 + r() * 0.4);
          const dg = x.createLinearGradient(0, cy, 0, cy + dl);
          dg.addColorStop(0, K.rgba(pal.deep, 0.4)); dg.addColorStop(1, K.rgba(pal.deep, 0));
          x.fillStyle = dg; x.fillRect(cx - dw / 2 + (r() - 0.5) * 20, cy, dw, dl);
          x.restore();
        }
      }
      tonalField(x, W, H, noise, r() * W, r() * H * 0.4, minWH * 0.25, pal.glow, 0.4, 1, minWH * 0.3, r);
    } else { // Damage — sparse tone, scratches/dust/emulsion-lift forward
      tonalField(x, W, H, noise, W * (0.3 + r() * 0.4), H * (0.4 + r() * 0.3), minWH * 0.4, pal.mid, 0.4, -1, minWH * 0.5, r);
      // emulsion-lift flakes: pale ragged patches where the gelatin peeled
      x.save(); x.globalCompositeOperation = 'screen';
      for (let i = 0; i < 14; i++) {
        const fx = r() * W, fy = r() * H, fr = minWH * (0.01 + r() * 0.05);
        x.fillStyle = K.rgba(pal.paper, 0.10 + r() * 0.18);
        x.beginPath();
        const segs = 7 + (r() * 5 | 0);
        for (let s = 0; s <= segs; s++) { const a = s / segs * Math.PI * 2; const rr = fr * (0.5 + r() * 0.8); const px = fx + Math.cos(a) * rr, py = fy + Math.sin(a) * rr; s === 0 ? x.moveTo(px, py) : x.lineTo(px, py); }
        x.closePath(); x.fill();
      }
      x.restore();
    }

    // ── secondary tide-lines on non-Tideline modes (chemistry always meanders) ──
    if (mode !== 'Tideline' && r() < 0.8) {
      const nL = 1 + (r() * 2 | 0);
      for (let i = 0; i < nL; i++) tideLine(x, W, H, noise, 0.3 + r() * 0.45, minWH * (0.015 + r() * 0.04), pal.deep, pal.mid, r);
    }

    // ── LATENT GHOST PASS (always present, strongest in Latent mode) ──
    if (mode === 'Latent' || r() < 0.62) {
      const gcol = pal.cool ? pal.deep : pal.tone;
      const gStrength = mode === 'Latent' ? (0.7 + r() * 0.12) : (0.34 + r() * 0.14);
      ghostPass(x, W, H, noise, ghostKind, gcol, r, gStrength);
    }

    // ── chemical surface mottle (the grainy emulsion tooth) ──
    K.mottle(x, 0, 0, W, H, pal.base, pal.flat ? 30 : 18, r, 'overlay');

    // ── LIGHT LEAK: one warm flare/leak from an edge or corner ──
    {
      const leakStrong = mode === 'Leak';
      const corners = [[0, 0], [W, 0], [0, H], [W, H], [W / 2, 0], [W, H / 2]];
      const cc = K.pick(corners, r);
      const lr = minWH * (leakStrong ? 0.85 + r() * 0.3 : 0.5 + r() * 0.25);
      // wedge flare
      K.bloom(x, cc[0], cc[1], lr, pal.leak, leakStrong ? 0.5 : 0.26);
      K.bloom(x, cc[0], cc[1], lr * 0.45, pal.glow, leakStrong ? 0.55 : 0.3);
      if (leakStrong) {
        // a streaked light-leak band shooting across — soft, wobbling edges and
        // a feathered falloff so it reads as fogged film, not a hard wedge
        x.save(); x.globalCompositeOperation = 'lighter';
        x.translate(cc[0], cc[1]); x.rotate(Math.atan2(H / 2 - cc[1], W / 2 - cc[0]) + (r() - 0.5) * 0.6);
        const bw = minWH * (0.07 + r() * 0.12), bl = Math.hypot(W, H) * 1.1;
        const ph = r() * 500;
        x.filter = 'blur(' + (minWH * 0.02) + 'px)';
        x.beginPath();
        // top edge (wobbled)
        for (let s = 0; s <= bl; s += 14) { const w = bw * (0.55 + 0.45 * (noise.fbm(s / 240 + ph, 0, 3) + 1) / 2); s === 0 ? x.moveTo(s, -w / 2) : x.lineTo(s, -w / 2); }
        // bottom edge back
        for (let s = bl; s >= 0; s -= 14) { const w = bw * (0.55 + 0.45 * (noise.fbm(s / 240 + ph, 9, 3) + 1) / 2); x.lineTo(s, w / 2); }
        x.closePath();
        const bg = x.createLinearGradient(0, 0, bl, 0);
        bg.addColorStop(0, K.rgba(pal.leak, 0.45)); bg.addColorStop(0.35, K.rgba(pal.glow, 0.18)); bg.addColorStop(1, K.rgba(pal.leak, 0));
        x.fillStyle = bg; x.fill();
        x.restore();
      }
    }

    // overall soft darkroom FOG gradient (uneven, warm/cool per palette)
    {
      const fc = K.mix(pal.glow, pal.leak, 0.4);
      const fg = x.createRadialGradient(W * (0.4 + r() * 0.2), H * (0.35 + r() * 0.2), minWH * 0.05, W / 2, H / 2, minWH * 1.0);
      fg.addColorStop(0, K.rgba(fc, pal.flat ? 0.12 : 0.20));
      fg.addColorStop(1, K.rgba(fc, 0));
      x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = fg; x.fillRect(0, 0, W, H); x.restore();
    }

    // ── HEAVY SILVER GRAIN clumping in shadows ──
    // base fine grain everywhere
    K.grain(x, W, H, 3.0, r);
    // extra clumped grain weighted into the darker regions
    {
      x.save();
      const n2 = noise;
      const count = Math.floor(W * H / 9);
      const ph = r() * 1000;
      for (let i = 0; i < count; i++) {
        const px = r() * W, py = r() * H;
        // sample tone: darker areas (negative fbm) get more/heavier grain
        const t = n2.fbm((px + ph) / (minWH * 0.5), (py + ph) / (minWH * 0.5), 3, 0.55, 2.2);
        if (t > 0 && r() > 0.35) continue; // skip most highlight grain
        const g = r() < 0.55 ? 0 : 255;
        const a = 0.04 + r() * 0.12 * (t < 0 ? 1.4 : 0.5);
        x.fillStyle = 'rgba(' + g + ',' + g + ',' + g + ',' + K.clamp(a, 0, 0.3) + ')';
        const s = r() < 0.85 ? 1 : 2;
        x.fillRect(px, py, s, s);
      }
      x.restore();
    }

    // ── DUST specks + a few fine SCRATCHES / hairs ──
    {
      x.save();
      // bright dust specks
      for (let i = 0; i < 60 + (r() * 80 | 0); i++) {
        x.fillStyle = K.rgba(r() < 0.7 ? '#ffffff' : '#000000', 0.15 + r() * 0.4);
        const s = r() < 0.8 ? 1 : 2;
        x.fillRect(r() * W, r() * H, s, s);
      }
      // fine scratches (vertical-ish hairline)
      const nsc = mode === 'Damage' ? 6 + (r() * 6 | 0) : 1 + (r() * 3 | 0);
      for (let i = 0; i < nsc; i++) {
        const sx = r() * W, sy = r() * H * 0.3, len = H * (0.2 + r() * 0.6);
        const bright = r() < 0.6;
        x.strokeStyle = K.rgba(bright ? '#ffffff' : '#000000', 0.10 + r() * 0.18);
        x.lineWidth = r() < 0.85 ? 0.7 : 1.4;
        x.beginPath(); x.moveTo(sx, sy);
        let cxp = sx;
        for (let yy = sy; yy < sy + len; yy += 8) { cxp += (r() - 0.5) * 2.5; x.lineTo(cxp, yy); }
        x.stroke();
      }
      // a curled hair (long wandering curve) on some prints
      if (r() < 0.4) {
        x.strokeStyle = K.rgba('#000000', 0.22); x.lineWidth = 1;
        x.beginPath();
        let hx = r() * W, hy = r() * H, ang = r() * 7;
        x.moveTo(hx, hy);
        for (let s = 0; s < 40; s++) { ang += (r() - 0.5) * 0.8; hx += Math.cos(ang) * 6; hy += Math.sin(ang) * 6; x.lineTo(hx, hy); }
        x.stroke();
      }
      x.restore();
    }

    // ── final vignette / darkroom edge burn ──
    K.vignette(x, W, H, pal.high ? 0.22 : pal.flat ? 0.3 : 0.42);
    // a soft warm edge-burn re-lift on one side so corners aren't dead black
    {
      x.save(); x.globalCompositeOperation = 'screen';
      const eg = x.createRadialGradient(W / 2, H / 2, minWH * 0.5, W / 2, H / 2, minWH * 0.95);
      eg.addColorStop(0, K.rgba(pal.tone, 0));
      eg.addColorStop(1, K.rgba(pal.cool ? pal.tone : pal.leak, 0.06));
      x.fillStyle = eg; x.fillRect(0, 0, W, H); x.restore();
    }

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    const ghostKind = K.pick(GHOSTS, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    return { Palette: pal.name, Process: mode, Latent: ghostKind, Format: f };
  }

  return { name: 's08_chemogram', draw, traits };
})();
