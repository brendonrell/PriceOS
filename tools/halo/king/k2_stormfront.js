/* K2 — STORMFRONT  (the weather of information)
 * A purely abstract atmospheric SCENE: a storm made of data. Sweeping bands of
 * glyph-rain fall like rain curtains; aurora-like ribbons of code ripple across
 * the frame; interference / scanline bands cut through sheets of volumetric haze
 * at varied depths; a deep luminous horizon glow burns behind it all; rare
 * lightning-strikes of signal and an eye-of-the-storm clearing give chase value.
 * Cool, hazy, textured, saturated, otherworldly — but unmistakably
 * cyberpunk-terminal (glyphs, code, HUD trim) graded onto CRT phosphor.
 * Tim Hecker / Autechre cover energy: a terminal decoding a storm. */
window.ENGINE = (function () {
  const K = window.KIT;

  // ── Custom cyberpunk-terminal colorways — SATURATED, cool, no outrun pastel.
  //    bg=deep ground, deep=secondary ground, glow=horizon reactor, ribbon=aurora
  //    of code, rain=glyph-rain, hot=signal/lightning, ink=structure trim.
  const PALS = [
    { name: 'Stormsignal',  bg: '#03101a', deep: '#06283f', glow: '#13b6ff', ribbon: '#36f1d8', rain: '#9bffe6', hot: '#ff3d8a', ink: '#0a3a55' },
    { name: 'Acid Squall',  bg: '#06120a', deep: '#0c3318', glow: '#9bff1f', ribbon: '#37ffb0', rain: '#e6ff8a', hot: '#ff2dba', ink: '#0e3a22' },
    { name: 'Violet Front', bg: '#0a0618', deep: '#22115a', glow: '#9b5dff', ribbon: '#3df0ff', rain: '#d6b0ff', hot: '#ff4d9e', ink: '#2a1a55' },
    { name: 'Magenta Rain', bg: '#11041a', deep: '#3a0a44', glow: '#ff2da0', ribbon: '#ff8a3d', rain: '#ffb0e6', hot: '#ffe23d', ink: '#3a1040' },
    { name: 'Sodium Haze',  bg: '#120a02', deep: '#3a1d00', glow: '#ff9a1f', ribbon: '#34e0d0', rain: '#ffd089', hot: '#ff3d52', ink: '#3a2410' },
    { name: 'Phosphor',     bg: '#02160e', deep: '#0a3d2a', glow: '#1fffa0', ribbon: '#7affd6', rain: '#c8ffe0', hot: '#ff5d9e', ink: '#0e3a2c' },
    { name: 'Ice Static',   bg: '#040b14', deep: '#0a2a44', glow: '#46c8ff', ribbon: '#a0e6ff', rain: '#eafaff', hot: '#ff6ad0', ink: '#103048' },
    { name: 'Ember Net',    bg: '#140404', deep: '#3a0c0c', glow: '#ff5a2d', ribbon: '#ffc63d', rain: '#ffb08a', hot: '#3df0ff', ink: '#3a1410' },
  ];

  const FMTS = [
    { W: 1024, H: 1280, t: 'Monolith' },
    { W: 1280, H: 1024, t: 'Vista' },
    { W: 1120, H: 1120, t: 'Square' },
    { W: 900,  H: 1280, t: 'Tower' },
  ];
  const INTENS = ['Drizzle', 'Squall', 'Tempest', 'Maelstrom'];
  const DIR    = ['Vertical', 'Driving', 'Sheared', 'Crosswind'];
  const DENS   = ['Sparse', 'Streaked', 'Dense', 'Whiteout'];
  // rare chase events: ~ mostly None
  const EVENTS = ['None','None','None','None','None','None','None','None','None','Signal Strike','Signal Strike','Eye of the Storm'];

  // glyph vocabulary — terminal hex/box/katakana, the "data" of the storm
  const GLY = '01234567890ABCDEF/\\|<>[]{}=+*-.:;¬⌐◊◆▮▯░▒▓│┤╡╢╖╕╣║╗╝╜╛┐╔╩╦╠═╬⌠⌡ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎﾑﾒﾓ';

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt   = K.pick(FMTS, r);
    const inten = K.pick(INTENS, r);
    const dir   = K.pick(DIR, r);
    const dens  = K.pick(DENS, r);
    const event = K.pick(EVENTS, r);
    return { pal, fmt, inten, dir, dens, event };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Palette: p.pal.name,
      Format: p.fmt.t,
      Intensity: p.inten,
      Wind: p.dir,
      Density: p.dens,
      Event: p.event,
    };
  }

  // intensity → multipliers
  function intMul(i) {
    return i === 'Maelstrom' ? 1.45 : i === 'Tempest' ? 1.18 : i === 'Squall' ? 0.92 : 0.7;
  }
  function densMul(d) {
    return d === 'Whiteout' ? 1.5 : d === 'Dense' ? 1.12 : d === 'Streaked' ? 0.78 : 0.5;
  }
  // wind → (slantX per unit fall, shear curve)
  function windVec(dir, r) {
    if (dir === 'Vertical')  return { slant: (r() - 0.5) * 0.05, shear: 0.0 };
    if (dir === 'Driving')   return { slant: (r() < 0.5 ? 1 : -1) * (0.28 + r() * 0.18), shear: 0.1 };
    if (dir === 'Sheared')   return { slant: (r() - 0.5) * 0.2, shear: 0.5 + r() * 0.4 };
    return { slant: (r() < 0.5 ? 1 : -1) * (0.16 + r() * 0.12), shear: 0.25 + r() * 0.25 }; // Crosswind
  }

  // ── a curtain of glyph-rain: dense vertical streaks of falling terminal chars
  //    with a bright leading head and a fading tail of dimmer glyphs. This is the
  //    BODY of the storm — it must read as legible terminal characters, not noise.
  function rainCurtain(x, P, W, H, noise, depth, count, wind, fs, alpha, r) {
    x.save();
    x.font = `bold ${fs}px monospace`;
    x.textBaseline = 'top';
    const step = fs * 1.04;
    for (let s = 0; s < count; s++) {
      const colX  = r() * W * 1.1 - W * 0.05;
      const len   = (0.22 + r() * 0.62) * H;
      const top   = -H * 0.12 + r() * H * 1.04;
      const headT = top + (0.25 + r() * 0.7) * len;   // bright head somewhere down the column
      const speed = 0.6 + r() * 0.8;
      const colHot = r() < 0.05;                        // a few rare hot columns
      for (let y = top; y < top + len; y += step) {
        const dh = (y - headT) / len;                  // 0 at head, + below, - above
        // head bright, tail (below head) fades; above-head is the faint upper trail
        const tail = dh >= 0 ? Math.max(0, 1 - dh * (1.9 + r() * 0.6)) : Math.max(0, 1 + dh * 5);
        let a = tail * alpha * (0.45 + depth * 0.7);
        if (a < 0.035) continue;
        // wind drift: slant + fbm gust shear deepening down the fall
        const gust = noise.fbm(colX / 240, y / 300 + s, 3) * wind.shear;
        const px = colX + (y - top) * wind.slant + gust * W * 0.07 * speed;
        const isHead = dh > -0.03 && dh < 0.06;
        x.save();
        if (isHead) {
          x.globalCompositeOperation = 'lighter';
          x.fillStyle = K.rgba(K.mix(P.rain, '#ffffff', 0.45), Math.min(1, a * 1.6));
        } else {
          x.globalCompositeOperation = 'lighter';
          const c = colHot ? P.hot : (r() < 0.14 ? P.ribbon : (r() < 0.22 ? P.glow : P.rain));
          x.fillStyle = K.rgba(c, a * (0.6 + r() * 0.4));
        }
        x.fillText(GLY[Math.floor(r() * GLY.length)], px, y);
        x.restore();
      }
    }
    x.restore();
  }

  // ── aurora ribbon of code: a flowing band that ripples across the frame,
  //    filled with a soft spectral wash + a thread of tiny glyphs riding it ──
  function codeRibbon(x, P, W, H, noise, cy, amp, thick, hueShift, alpha, glyphAlpha, r) {
    const N = 160;
    const pts = [];
    const baseFreq = 1.4 + r() * 2.2;
    const phase = r() * Math.PI * 2;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const xx = t * (W * 1.1) - W * 0.05;
      const n = noise.fbm(xx / 220, cy / 220 + phase, 4);
      const yy = cy + Math.sin(t * Math.PI * baseFreq + phase) * amp + n * amp * 1.4;
      pts.push([xx, yy]);
    }
    const ribCol = K.mix(P.ribbon, P.glow, hueShift / 720);
    // ── aurora curtain: a soft vertical drape hanging from the spine (the
    //    characteristic hanging-light look), drawn as a clipped vertical gradient ──
    const drape = thick * (5 + r() * 5);
    const down = r() < 0.5;
    x.save();
    x.globalCompositeOperation = 'screen';
    x.beginPath();
    x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= N; i++) x.lineTo(pts[i][0], pts[i][1]);
    const edge = down ? pts[N][1] + drape : pts[N][1] - drape;
    for (let i = N; i >= 0; i--) x.lineTo(pts[i][0], pts[i][1] + (down ? drape : -drape));
    x.closePath();
    x.clip();
    const gy0 = down ? cy - amp : cy + amp + drape;
    const gy1 = down ? cy + amp + drape : cy - amp;
    const dg = x.createLinearGradient(0, down ? cy - amp : gy0, 0, down ? cy + amp + drape : cy + amp);
    dg.addColorStop(down ? 0 : 1, K.rgba(ribCol, alpha * 0.6));
    dg.addColorStop(down ? 1 : 0, K.rgba(ribCol, 0));
    x.fillStyle = dg;
    x.fillRect(0, Math.min(gy0, gy1) - drape, W, Math.abs(gy1 - gy0) + drape * 2 + amp * 2);
    x.restore();
    // glowing core thread (additive) — soft halo + thin bright filament
    x.save();
    x.globalCompositeOperation = 'lighter';
    const layers = 4;
    for (let L = layers; L >= 1; L--) {
      const lw = thick * (L / layers);
      const la = alpha * (1 / L) * 0.85;
      const col = K.mix(ribCol, P.glow, (L / layers) * 0.4);
      x.strokeStyle = K.rgba(L === 1 ? K.mix(P.ribbon, '#ffffff', 0.7) : col, la);
      x.lineWidth = lw;
      x.lineJoin = 'round'; x.lineCap = 'round';
      x.beginPath();
      for (let i = 0; i <= N; i++) { const [px, py] = pts[i]; i ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.stroke();
    }
    x.restore();
    // glyph thread riding the ribbon
    if (glyphAlpha > 0.01) {
      x.save();
      x.globalCompositeOperation = 'lighter';
      const fs = Math.max(7, thick * 0.5);
      x.font = `${fs}px monospace`; x.textBaseline = 'middle';
      for (let i = 4; i < N; i += 3) {
        if (r() < 0.45) continue;
        const [px, py] = pts[i];
        x.fillStyle = K.rgba(r() < 0.12 ? P.hot : P.rain, glyphAlpha * (0.5 + r() * 0.5));
        x.fillText(GLY[Math.floor(r() * GLY.length)], px, py + (r() - 0.5) * thick * 0.5);
      }
      x.restore();
    }
  }

  // ── interference / scanline bands: horizontal slabs of brighter scan that sweep
  //    across, like signal interference rolling through the storm ──
  function interferenceBands(x, P, W, H, noise, n, alpha, r) {
    x.save();
    x.globalCompositeOperation = 'screen';
    for (let i = 0; i < n; i++) {
      const by = r() * H;
      const bh = H * (0.02 + r() * 0.1);
      const col = r() < 0.3 ? P.hot : (r() < 0.6 ? P.glow : P.ribbon);
      const g = x.createLinearGradient(0, by, 0, by + bh);
      g.addColorStop(0, K.rgba(col, 0));
      g.addColorStop(0.5, K.rgba(col, alpha * (0.4 + r() * 0.6)));
      g.addColorStop(1, K.rgba(col, 0));
      x.fillStyle = g;
      x.fillRect(0, by, W, bh);
      // fine scan ticks within the band
      x.fillStyle = K.rgba(K.mix(col, '#ffffff', 0.4), alpha * 0.5);
      for (let yy = by; yy < by + bh; yy += 3) {
        if (r() < 0.4) x.fillRect(0, yy, W, 1);
      }
    }
    x.restore();
  }

  function frameTrim(x, P, W, H, r) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const m = Math.min(W, H) * 0.04, b = Math.min(W, H) * 0.05;
    x.strokeStyle = K.rgba(P.ribbon, 0.5); x.lineWidth = 1.4;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([ax, ay, sx, sy]) => {
      x.beginPath(); x.moveTo(ax + sx * b, ay); x.lineTo(ax, ay); x.lineTo(ax, ay + sy * b); x.stroke();
    });
    // a diegetic readout strip top-left
    const fs = Math.max(8, W * 0.011);
    x.font = `${fs}px monospace`; x.textBaseline = 'top';
    let hx = m + b * 0.4; const hy = m - fs * 0.2;
    for (let i = 0; i < K.rint(r, 10, 18); i++) {
      x.fillStyle = K.rgba(r() < 0.16 ? P.hot : P.ribbon, 0.5 + r() * 0.4);
      x.fillText(GLY[Math.floor(r() * GLY.length)], hx, hy);
      hx += fs * (0.75 + r() * 0.85);
    }
    x.restore();
  }

  // ── jagged lightning bolt (signal strike) ──
  function bolt(x, x0, y0, x1, y1, gen, jitter, col, lw, r) {
    if (gen <= 0) {
      x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1);
      x.lineWidth = lw; x.strokeStyle = col; x.stroke();
      return;
    }
    const mx = (x0 + x1) / 2 + (r() - 0.5) * jitter;
    const my = (y0 + y1) / 2 + (r() - 0.5) * jitter;
    bolt(x, x0, y0, mx, my, gen - 1, jitter * 0.6, col, lw, r);
    bolt(x, mx, my, x1, y1, gen - 1, jitter * 0.6, col, lw, r);
    // fork
    if (r() < 0.4 && gen > 1) {
      bolt(x, mx, my, mx + (r() - 0.5) * jitter * 1.5, my + jitter * (0.4 + r()), gen - 1, jitter * 0.5, col, lw * 0.6, r);
    }
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal;
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const im = intMul(p.inten), dm = densMul(p.dens);
    const wind = windVec(p.dir, r);

    // ── deep luminous ground: vertical gradient, rich not flat-black ──
    const horizon = H * (0.58 + r() * 0.16);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, K.mix(P.bg, '#000', 0.25));
    g.addColorStop(Math.max(0.01, horizon / H - 0.28), P.bg);
    g.addColorStop(horizon / H, K.mix(P.deep, P.glow, 0.28));
    g.addColorStop(Math.min(1, horizon / H + 0.12), K.mix(P.deep, P.bg, 0.3));
    g.addColorStop(1, K.mix(P.bg, P.deep, 0.6));
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // base haze wash so nothing reads flat
    K.hazeSheet(x, W, H, noise, K.mix(P.deep, P.glow, 0.3), 0.34, 130, 'screen');

    // ── horizon reactor glow (the storm is lit from behind) ──
    const sunX = W * (0.3 + r() * 0.4);
    K.bloom(x, sunX, horizon, W * (0.45 + r() * 0.25), P.glow, 0.42);
    K.bloom(x, sunX, horizon, W * (0.22), K.mix(P.glow, '#ffffff', 0.4), 0.28);
    // a hotter secondary core
    if (r() < 0.55) K.bloom(x, sunX + (r() - 0.5) * W * 0.3, horizon * (0.94 + r() * 0.1), W * 0.16, P.hot, 0.16);

    // ── FAR haze layers (volumetric depth) ──
    K.hazeSheet(x, W, H, noise, K.mix(P.glow, P.ribbon, 0.4), 0.3 * im, 220, 'screen');
    K.hazeSheet(x, W, H, noise, P.deep, 0.26, 170, 'screen');

    // ── EYE OF THE STORM (rare): a calm bright clearing punched into the haze ──
    let eye = null;
    if (p.event === 'Eye of the Storm') {
      eye = { cx: W * (0.35 + r() * 0.3), cy: H * (0.32 + r() * 0.28), rad: Math.min(W, H) * (0.16 + r() * 0.08) };
      x.save();
      x.globalCompositeOperation = 'lighter';
      const eg = x.createRadialGradient(eye.cx, eye.cy, 0, eye.cx, eye.cy, eye.rad * 1.6);
      eg.addColorStop(0, K.rgba(K.mix(P.glow, '#ffffff', 0.5), 0.5));
      eg.addColorStop(0.5, K.rgba(P.glow, 0.18));
      eg.addColorStop(1, K.rgba(P.glow, 0));
      x.fillStyle = eg; x.fillRect(eye.cx - eye.rad * 1.6, eye.cy - eye.rad * 1.6, eye.rad * 3.2, eye.rad * 3.2);
      x.restore();
    }

    // helper: skip rain inside the eye clearing
    const inEye = (px, py) => eye && Math.hypot(px - eye.cx, py - eye.cy) < eye.rad * 0.92;

    // ── BACK aurora ribbons (behind the rain) — thin, dim, atmospheric ──
    const backRibbons = K.rint(r, 1, 3);
    for (let i = 0; i < backRibbons; i++) {
      codeRibbon(x, P, W, H, noise, H * (0.15 + r() * 0.55), H * (0.05 + r() * 0.12), Math.max(5, H * 0.012), r() * 360, 0.13 * im, 0.0, r);
    }

    // ── GLYPH-RAIN CURTAINS, back→front (the storm body — dominant) ──
    const layers = 5;
    for (let l = 0; l < layers; l++) {
      const depth = l / (layers - 1);
      const fs = Math.max(7, (W * 0.0105) * (0.5 + depth * 1.0));
      const count = Math.round((16 + depth * 38) * dm * (0.7 + im * 0.6));
      const alpha = (0.2 + depth * 0.4) * (p.dens === 'Whiteout' ? 1.3 : 1);
      // wrap curtain to skip eye
      if (eye) {
        // draw with clip excluding eye: cheaper to just let rainCurtain place and rely on eye glow overdraw;
        // instead punch eye after each layer with a soft ground re-bloom
      }
      rainCurtain(x, P, W, H, noise, depth, count, wind, fs, alpha, r);
      // interleave a haze sheet between rain layers for atmosphere/depth
      if (l < layers - 1) {
        K.hazeSheet(x, W, H, noise, K.mix(P.deep, P.ribbon, 0.3), (0.16 + (1 - depth) * 0.14) * im, 110 + l * 30, 'screen');
      }
      // re-punch the eye clearing so rain doesn't bury it
      if (eye) {
        x.save();
        x.globalCompositeOperation = 'destination-out';
        const cg = x.createRadialGradient(eye.cx, eye.cy, 0, eye.cx, eye.cy, eye.rad);
        cg.addColorStop(0, 'rgba(0,0,0,0.85)');
        cg.addColorStop(0.7, 'rgba(0,0,0,0.5)');
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = cg; x.fillRect(eye.cx - eye.rad, eye.cy - eye.rad, eye.rad * 2, eye.rad * 2);
        x.restore();
        // re-glow it
        x.save(); x.globalCompositeOperation = 'lighter';
        const eg2 = x.createRadialGradient(eye.cx, eye.cy, 0, eye.cx, eye.cy, eye.rad);
        eg2.addColorStop(0, K.rgba(K.mix(P.glow, '#ffffff', 0.4), 0.3));
        eg2.addColorStop(1, K.rgba(P.glow, 0));
        x.fillStyle = eg2; x.fillRect(eye.cx - eye.rad, eye.cy - eye.rad, eye.rad * 2, eye.rad * 2);
        x.restore();
      }
    }

    // ── interference / scanline bands rolling through ──
    interferenceBands(x, P, W, H, noise, K.rint(r, 3, 7), 0.22 * im, r);

    // ── FRONT aurora ribbons (over the rain — thin bright spectral threads
    //    with glyphs riding them; focal but not dominating) ──
    const frontRibbons = K.rint(r, 1, 2);
    for (let i = 0; i < frontRibbons; i++) {
      const cy = H * (0.18 + r() * 0.6);
      codeRibbon(x, P, W, H, noise, cy, H * (0.06 + r() * 0.13), Math.max(7, H * 0.016 * (0.7 + im * 0.4)), r() * 360, 0.28 * im, 0.55, r);
    }

    // ── SIGNAL STRIKE (rare): giant lightning bolt of signal ──
    if (p.event === 'Signal Strike') {
      const sx = W * (0.2 + r() * 0.6);
      const ex = sx + (r() - 0.5) * W * 0.3;
      const ey = H * (0.7 + r() * 0.25);
      const boltSeed = (seed ^ 0x9e3779b9) >>> 0;       // fixed seed → identical path each pass
      x.save();
      x.globalCompositeOperation = 'lighter';
      // outer bloom glow along the bolt
      K.bloom(x, sx, H * 0.1, W * 0.14, P.hot, 0.32);
      K.bloom(x, (sx + ex) / 2, H * 0.5, W * 0.18, K.mix(P.hot, '#ffffff', 0.35), 0.24);
      x.lineCap = 'round'; x.lineJoin = 'round';
      // wide soft underglow, then crisp near-white core — SAME jittered path
      bolt(x, sx, -H * 0.05, ex, ey, 6, W * 0.12, K.rgba(P.hot, 0.5), 9, K.rng(boltSeed));
      bolt(x, sx, -H * 0.05, ex, ey, 6, W * 0.12, K.rgba(K.mix(P.hot, '#ffffff', 0.6), 0.65), 4, K.rng(boltSeed));
      bolt(x, sx, -H * 0.05, ex, ey, 6, W * 0.12, K.rgba(K.mix(P.hot, '#ffffff', 0.9), 0.95), 1.8, K.rng(boltSeed));
      // full-frame flash wash
      x.fillStyle = K.rgba(K.mix(P.hot, '#ffffff', 0.2), 0.06);
      x.fillRect(0, 0, W, H);
      x.restore();
    }

    // ── falloff: dark crown up top, fog pooling low → guarantees depth ──
    const vf = x.createLinearGradient(0, 0, 0, H);
    vf.addColorStop(0, K.rgba(K.mix(P.bg, '#000', 0.5), 0.5));
    vf.addColorStop(0.32, K.rgba(P.bg, 0));
    vf.addColorStop(1, K.rgba(P.bg, 0));
    x.fillStyle = vf; x.fillRect(0, 0, W, H);

    x.save(); x.globalCompositeOperation = 'screen';
    const lowFog = x.createLinearGradient(0, H * 0.5, 0, H);
    lowFog.addColorStop(0, K.rgba(P.deep, 0));
    lowFog.addColorStop(1, K.rgba(K.mix(P.deep, P.glow, 0.18), 0.34 * im));
    x.fillStyle = lowFog; x.fillRect(0, H * 0.5, W, H * 0.5); x.restore();

    // ── HUD trim + diegetic readout ──
    frameTrim(x, P, W, H, r);

    // ── CRT / film finish ──
    K.scanlines(x, W, H, 3, 0.13);
    K.chromaSplit(x, W, H, p.inten === 'Maelstrom' ? 3 : 2);
    K.hazeSheet(x, W, H, noise, P.glow, 0.08 * im, 240, 'screen');
    K.mottle(x, 0, 0, W, H, P.ribbon, 1400, r, 'overlay');
    K.grain(x, W, H, 480, r);
    K.vignette(x, W, H, 0.5);

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'k2_stormfront', draw, traits };
})();
