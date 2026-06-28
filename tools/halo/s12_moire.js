/* INTERFERENCE — soft optical moiré.
 * Two or more fine printed grids (lines / dot-screens) overlaid and gently
 * WARPED by a smooth displacement field, so the moiré beats emerge from the
 * math and FLOW around invisible forms — a bulge with no object, a ripple
 * where nothing dropped, an interference that briefly RESOLVES into a faint
 * ghost (a face, a coin, a word) then dissolves.
 * SURREAL = real-but-off: a correct printed screen, bending around nothing.
 * Hazy, low-contrast, hypnotic — NOT harsh black-and-white op-art.
 *
 * Rendered analytically per-pixel (ImageData) so beats bloom into soft tonal
 * bands with no aliasing; grids = smooth sinusoidal screens, never hard lines.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Each palette = a printed-interference WORLD: a ground tone + two grid tints
     chosen to beat softly against each other. Restrained, tasteful, never garish. */
  const PALS = [
    { name: 'Sodium', ground: '#2b2722', tA: '#e0a85a', tB: '#7f93b4', glow: '#f4d49a', depth: 0.9 }, // warm grey + amber + steel-blue
    { name: 'Tide',   ground: '#dfe7e6', tA: '#3f8d8a', tB: '#c9b48c', glow: '#ffffff', depth: 0.7 }, // pale cyan + teal + sand
    { name: 'Ash',    ground: '#e9e3d6', tA: '#8a857c', tB: '#2a2622', glow: '#ffffff', depth: 0.8 }, // cream + warm grey + soft black ink
    { name: 'Dusk',   ground: '#222838', tA: '#9a86a6', tB: '#d8c187', glow: '#cdbce0', depth: 0.95 }, // deep blue-grey + mauve + pale gold
    { name: 'Bone',   ground: '#efe9df', tA: '#bdb6aa', tB: '#9a9389', glow: '#ffffff', depth: 0.55 }, // warm white + two close greys, very subtle
    { name: 'Oil',    ground: '#191b20', tA: '#5f8d86', tB: '#8a6f93', glow: '#bfe0d6', depth: 1.0 }, // dark ground + faint iridescent two-tone
  ];

  const MODES = ['Beat', 'Lens', 'Ripple', 'Glass', 'Watermark', 'Weave'];
  const FORMATS = [[1040, 1300], [1200, 1200], [1300, 1040]]; // portrait / square / landscape

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  /* ── ghost masks: scalar field in [0..1] that biases the local phase so the
     beat resolves into a faint recognizable shape, then fades. All smooth. ── */
  function ghostField(kind, u, v) {
    // u,v in 0..1 (centered shapes). Return soft signed bump ~[-1..1].
    if (kind === 'coin') {
      const dx = u - 0.5, dy = v - 0.5, d = Math.sqrt(dx * dx + dy * dy);
      const ring = Math.exp(-Math.pow((d - 0.27) / 0.05, 2));        // rim
      const disc = Math.exp(-Math.pow(d / 0.30, 2));                  // body
      return disc * 0.6 + ring * 0.7;
    }
    if (kind === 'face') {
      const dx = u - 0.5, dy = (v - 0.47);
      const head = Math.exp(-(dx * dx / 0.045 + dy * dy / 0.075));    // oval head
      const eyeL = Math.exp(-((u - 0.42) ** 2 + (v - 0.44) ** 2) / 0.0016);
      const eyeR = Math.exp(-((u - 0.58) ** 2 + (v - 0.44) ** 2) / 0.0016);
      const mouth = Math.exp(-((u - 0.5) ** 2 / 0.006 + (v - 0.60) ** 2 / 0.0009));
      return head * 0.8 - (eyeL + eyeR) * 0.7 - mouth * 0.6;
    }
    if (kind === 'orb') { // a simple breathing sphere
      const dx = u - 0.5, dy = v - 0.5, d = Math.sqrt(dx * dx + dy * dy);
      return Math.exp(-Math.pow(d / 0.28, 2)) * 1.0;
    }
    // 'glyph' — an abstract bar-mark (reads like a stamped word/sigil)
    const bars = Math.cos((v - 0.5) * 26) * Math.exp(-Math.pow((v - 0.5) / 0.16, 2));
    const body = Math.exp(-Math.pow((u - 0.5) / 0.24, 2));
    return bars * body * 0.8;
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    // spread mode + palette across the seed space so the SET varies (the pure
    // K.pick was clustering Ripple/Tide). Still deterministic, still uses r() after.
    const pal = window.FORCE_PAL ? pickPal(r) : (r(), PALS[(seed * 5 + 2) % PALS.length]);
    const mode = MODES[(seed + (seed / MODES.length | 0)) % MODES.length];
    r(); // keep rng cadence
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const minWH = Math.min(W, H);

    // ── grid parameters: fine screens, slight offsets so beats are LONG & soft.
    const cell = minWH / (130 + r() * 90);        // base screen pitch (px)
    const fGrid = (Math.PI * 2) / cell;           // base spatial frequency
    const baseAng = (r() - 0.5) * 0.5;            // base rotation
    const dAng = (0.5 + r() * 1.4) * Math.PI / 180; // tiny angle offset → moiré
    const scaleB = 1 + (0.5 + r() * 2.5) / 100;   // tiny scale offset → moiré
    const dotScreen = r() < 0.42;                 // line grids vs dot screens
    const thirdGrid = r() < 0.34;                 // sometimes a 3rd tint grid
    const ang3 = baseAng - dAng * (1.7 + r());

    // displacement field setup (per-mode)
    const cx = 0.5 + (r() - 0.5) * 0.36, cy = 0.5 + (r() - 0.5) * 0.36; // form centre
    const lensR = 0.22 + r() * 0.18;
    const lensAmt = (mode === 'Lens' ? 1 : 0.35) * (0.5 + r() * 0.6) * pal.depth;
    const rippleN = 6 + (r() * 6 | 0);
    const ripPhase = r() * Math.PI * 2;
    const glassAmt = 0.5 + r() * 0.7;
    const flowAmt = (mode === 'Beat' ? 0.25 : 0.6) * (0.6 + r() * 0.8);
    const flowScale = 1.6 + r() * 1.8;            // fbm warp wavelength (in cells)
    const ghostKind = K.pick(['coin', 'face', 'orb', 'glyph'], r);
    const ghostAmt = mode === 'Watermark' ? (2.6 + r() * 1.0) : (r() < 0.45 ? 0.5 : 0);
    const isWeave = mode === 'Weave';

    // colour vectors
    const gnd = K.h2r(pal.ground);
    const cA = K.h2r(pal.tA);
    const cB = K.h2r(pal.tB);
    const cG = K.h2r(pal.glow);
    const dark = K.lum(pal.ground) < 0.42; // dark-ground worlds composite additively

    // contrast/softness controls — keep it gentle
    const beatGain = 0.5 + r() * 0.22;     // how strongly grids tint the ground
    const softFloor = dark ? 0.0 : 0.0;

    const img = x.createImageData(W, H);
    const D = img.data;
    const ca = Math.cos(baseAng), sa = Math.sin(baseAng);
    const ca2 = Math.cos(baseAng + dAng), sa2 = Math.sin(baseAng + dAng);
    const ca3 = Math.cos(ang3), sa3 = Math.sin(ang3);

    // one screen value at world coords -> ~[0..1], soft sinusoid (no hard lines)
    function screen(X, Y, c, s, freq, ph, dot) {
      const u = (X * c - Y * s) * freq + ph;
      if (dot) {
        const v = (X * s + Y * c) * freq + ph;
        // soft dot screen = product of two raised cosines
        return (0.5 + 0.5 * Math.cos(u)) * (0.5 + 0.5 * Math.cos(v));
      }
      return 0.5 + 0.5 * Math.cos(u); // soft line screen
    }

    for (let py = 0; py < H; py++) {
      const v0 = py / H;
      for (let px = 0; px < W; px++) {
        const u0 = px / W;
        // --- displacement (smooth, in normalized space) ---
        let du = 0, dv = 0;
        const ddx = u0 - cx, ddy = (v0 - cy) * (H / W); // aspect-correct radius
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);

        if (mode === 'Lens' || lensAmt) {
          // invisible bulge: radial push that peaks at a soft radius
          const g = Math.exp(-Math.pow(dist / lensR, 2));
          const k = lensAmt * 0.10 * g;
          du += ddx * k; dv += ddy * k;
        }
        if (mode === 'Ripple') {
          const w = Math.cos(dist * rippleN * Math.PI - ripPhase) * Math.exp(-dist * 2.2);
          const k = 0.045 * w;
          du += (ddx / (dist + 1e-3)) * k; dv += (ddy / (dist + 1e-3)) * k;
        }
        if (mode === 'Glass') {
          // vertical wavy hand-blown glass: horizontal shear varying with y
          const wy = noise.fbm(v0 * 5.0, u0 * 1.2, 4, 0.55, 2.1);
          du += glassAmt * 0.035 * (Math.sin(v0 * 22 + wy * 3) + wy);
          dv += glassAmt * 0.010 * Math.cos(u0 * 9 + wy * 2);
        }
        // organic fbm drift on every mode (the "wavy old glass" undercurrent)
        const fx = noise.fbm(u0 * flowScale, v0 * flowScale, 4, 0.55, 2.1);
        const fy = noise.fbm(u0 * flowScale + 11.3, v0 * flowScale + 4.7, 4, 0.55, 2.1);
        du += flowAmt * 0.022 * fx;
        dv += flowAmt * 0.022 * fy;

        // world coords (px scale) after displacement
        const X = (px + du * W);
        const Y = (py + dv * H);

        // --- ghost: bias phase locally so beats resolve into a shape ---
        let ph2extra = 0, ph1extra = 0, ghostLift = 0;
        if (ghostAmt) {
          const gv = ghostField(ghostKind, u0, v0);
          ph2extra = gv * ghostAmt * 1.7; // shift 2nd grid phase where the ghost is
          ph1extra = -gv * ghostAmt * 0.4;
          ghostLift = gv; // also lift tone where the ghost is, so it reads
        }

        // --- sample the overlaid screens ---
        // Weave makes grid-2 perpendicular → true plaid/tartan moiré.
        const c2 = isWeave ? -sa2 : ca2, s2 = isWeave ? ca2 : sa2;
        const g1 = screen(X, Y, ca, sa, fGrid, ph1extra, dotScreen);
        const g2 = screen(X, Y, c2, s2, fGrid * scaleB, Math.PI * 0.5 + ph2extra, dotScreen);
        let g3 = 0;
        if (thirdGrid) g3 = screen(X, Y, ca3, sa3, fGrid * (2 - scaleB), 1.7, dotScreen);

        // --- composite to soft colour. Beats = where the screens reinforce. ---
        let R, G, B;
        const beat = g1 * g2;             // moiré product → soft tonal band
        if (dark) {
          // additive printing on dark ground (Sodium / Dusk / Oil). Keep the
          // ground DARK: faint per-grid tint, but the BEAT (reinforcement) is
          // what glows. Gains kept low so it never washes to white.
          const a1 = g1 * beatGain * 0.16, a2 = g2 * beatGain * 0.16, a3 = g3 * beatGain * 0.12;
          const bg = beat * 0.42; // the luminous moiré band
          R = gnd[0] + cA[0] * a1 + cB[0] * a2 + cG[0] * bg;
          G = gnd[1] + cA[1] * a1 + cB[1] * a2 + cG[1] * bg;
          B = gnd[2] + cA[2] * a1 + cB[2] * a2 + cG[2] * bg;
          if (thirdGrid) { R += cG[0] * a3; G += cG[1] * a3; B += cG[2] * a3; }
        } else {
          // subtractive printing on light ground (Tide / Ash / Bone) — inks darken
          const i1 = (1 - g1) * beatGain, i2 = (1 - g2) * beatGain;
          const i3 = thirdGrid ? (1 - g3) * beatGain * 0.6 : 0;
          R = gnd[0] - (gnd[0] - cA[0]) * i1 * 0.55 - (gnd[0] - cB[0]) * i2 * 0.55 - (gnd[0] - cB[0]) * i3 * 0.4;
          G = gnd[1] - (gnd[1] - cA[1]) * i1 * 0.55 - (gnd[1] - cB[1]) * i2 * 0.55 - (gnd[1] - cB[1]) * i3 * 0.4;
          B = gnd[2] - (gnd[2] - cA[2]) * i1 * 0.55 - (gnd[2] - cB[2]) * i2 * 0.55 - (gnd[2] - cB[2]) * i3 * 0.4;
        }

        // ghost tonal lift: nudge toward glow where the shape is (keeps it faint)
        if (ghostLift) {
          const gl = ghostLift * (dark ? 14 : -12);
          R += (cG[0] - R) * 0 + gl; G += (cG[1] - G) * 0 + gl; B += (cG[2] - B) * 0 + gl;
        }

        const o = (py * W + px) * 4;
        D[o] = R < 0 ? 0 : R > 255 ? 255 : R;
        D[o + 1] = G < 0 ? 0 : G > 255 ? 255 : G;
        D[o + 2] = B < 0 ? 0 : B > 255 ? 255 : B;
        D[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);

    // ── soft blur-feel: a couple of slightly offset, low-alpha overdraws of the
    //    rendered image → anti-aliased haze without killing the beats. Use a
    //    plain alpha blend (NOT lighter) so dark grounds stay dark. ──
    x.save();
    x.globalAlpha = 0.30;
    x.globalCompositeOperation = 'source-over';
    const bo = Math.max(1, Math.round(minWH / 700));
    x.drawImage(cv, bo, 0); x.drawImage(cv, -bo, 0);
    x.drawImage(cv, 0, bo); x.drawImage(cv, 0, -bo);
    x.restore();

    // ── atmosphere: faint glow lifting the ghost / form centre, then haze ──
    if (ghostAmt > 0.8 || mode === 'Lens' || mode === 'Ripple') {
      K.bloom(x, cx * W, cy * H, minWH * (0.34 + r() * 0.16), pal.glow, dark ? 0.06 : 0.07);
    }
    const hazeCol = dark ? K.mix(pal.ground, pal.glow, 0.35) : K.mix(pal.ground, '#ffffff', 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, dark ? 0.09 : 0.20, minWH * 0.95, dark ? 'screen' : 'soft-light');

    // subtle paper mottle so it reads as PRINTED, not vector-clean
    K.mottle(x, 0, 0, W, H, K.mix(pal.ground, pal.tA, 0.3), 60, r, dark ? 'screen' : 'overlay');

    K.grain(x, W, H, 6.5, r);
    K.vignette(x, W, H, dark ? 0.42 : 0.26);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    // mirror draw() EXACTLY: pal, r(), mode, r(), fmt, then cell, then dotScreen.
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : (r(), PALS[(seed * 5 + 2) % PALS.length]);
    const mode = MODES[(seed + (seed / MODES.length | 0)) % MODES.length];
    r();
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    r(); // cell
    const screenKind = r() < 0.42 ? 'Dot' : 'Line';
    return { Palette: pal.name, Mode: mode, Format: f, Screen: screenKind };
  }

  return { name: 's12_moire', draw, traits };
})();
