/* POLYCARBONATE — layered translucent hard plastic, made strange.
 * Smoked acrylic, frosted perspex, tinted gel sheets stacked & overlapping so
 * colour MULTIPLIES where they cross. Hazy, satin-textured, premium product
 * design (Fukasawa, smoked furniture). NOT neon, NOT glassy-cyberpunk.
 * SURREAL = real-but-off: sheets that pass through each other, a shadow that
 * doesn't match, depth that folds back. Quiet uncanny.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Smoked / tinted translucent-plastic palettes. Each: a pale|dark GROUND, a
     HAZE colour the far panels wash toward, and 3-5 TINTS chosen to look good
     MULTIPLIED (overlaps deepen + shift hue). EDGE = the catch-light hue. */
  const PALS = [
    { name: 'Smoke',       ground: '#d9d9da', haze: '#c4c4c8', edge: '#ffffff',
      tints: ['#4a4750', '#8a6a4a', '#9a9aa4', '#5d5560', '#b59a78'] },
    { name: 'Sea Glass',   ground: '#eef1ec', haze: '#cdd9d2', edge: '#fbfffd',
      tints: ['#6fa899', '#9fc9c1', '#cdbf9a', '#7fb0a6', '#bcd0c2'] },
    { name: 'Rose Quartz',  ground: '#f3e9e6', haze: '#e2cdcb', edge: '#fffafa',
      tints: ['#c08a8c', '#dba98c', '#b594a6', '#cf9d9a', '#e0bca6'] },
    { name: 'Graphite Ice', ground: '#1c2026', haze: '#2b3540', edge: '#eaf6ff',
      tints: ['#7fbce0', '#9aa9bf', '#bfe2f2', '#5f7e9c', '#c8d6e0'] },
    { name: 'Tea',          ground: '#e9e0cc', haze: '#d3c4a4', edge: '#fff7e4',
      tints: ['#8a6a3c', '#a98b52', '#7f7a44', '#c2a366', '#6e5a38'] },
    { name: 'Bruise',       ground: '#23222c', haze: '#322f40', edge: '#dfd6ff',
      tints: ['#6a4f8a', '#4a7a82', '#5a5f7a', '#7d5a86', '#3f5d6a'] },
  ];

  const MODES = ['Stack', 'Fan', 'Lattice', 'Monolith', 'Drift', 'Lens'];
  const FORMATS = [[1040, 1300], [1200, 1200], [1300, 1040]]; // portrait / square / landscape

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const dark = K.lum(pal.ground) < 0.4;
    const S = Math.min(W, H);

    /* ── GROUND: soft satin gradient, gently lit from one corner ── */
    const lightDir = r() < 0.5 ? -1 : 1;
    const gg = x.createLinearGradient(0, 0, W, H);
    gg.addColorStop(0, K.mix(pal.ground, pal.edge, dark ? 0.10 : 0.18));
    gg.addColorStop(0.55, pal.ground);
    gg.addColorStop(1, K.mix(pal.ground, dark ? '#000000' : pal.haze, 0.45));
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    // diffuse atmosphere wash so far panels sit in haze
    K.hazeSheet(x, W, H, noise, pal.haze, dark ? 0.20 : 0.16, S * 1.1, dark ? 'screen' : 'multiply');

    /* ── frost helper: a panel = soft shadow + multiplied translucent body +
       interior frost haze (edges crisper than centre) + bevel catch-light +
       satin mottle. depth 0..1 = far(soft/washed) .. near(big/sharp). ── */
    function frostPanel(cx, cy, w, h, rad, rot, tint, depth, kind) {
      const near = depth;                 // 0 far .. 1 near
      const bodyA = 0.30 + near * 0.30;   // nearer = more opaque tint
      const blur = (1 - near) * S * 0.018 + S * 0.004; // far = blurrier edges

      x.save();
      x.translate(cx, cy);
      x.rotate(rot);

      // path for this panel shape
      function shapePath(ctx, ox, oy, sx, sy) {
        ctx.beginPath();
        if (kind === 'disc') {
          ctx.ellipse(ox, oy, (w / 2) * sx, (h / 2) * sy, 0, 0, 7);
        } else if (kind === 'blob') {
          // soft rounded blob via 4 quadratics, slightly irregular but smooth
          const aw = (w / 2) * sx, ah = (h / 2) * sy;
          ctx.moveTo(ox, oy - ah);
          ctx.bezierCurveTo(ox + aw * 1.05, oy - ah * 0.9, ox + aw * 1.0, oy + ah * 0.95, ox, oy + ah);
          ctx.bezierCurveTo(ox - aw * 1.0, oy + ah * 0.95, ox - aw * 1.05, oy - ah * 0.9, ox, oy - ah);
        } else { // rounded-rect (sheet)
          const aw = w * sx, ah = h * sy, rr = Math.min(rad, aw / 2, ah / 2);
          const l = ox - aw / 2, t = oy - ah / 2, rt = ox + aw / 2, b = oy + ah / 2;
          ctx.moveTo(l + rr, t);
          ctx.lineTo(rt - rr, t); ctx.arcTo(rt, t, rt, t + rr, rr);
          ctx.lineTo(rt, b - rr); ctx.arcTo(rt, b, rt - rr, b, rr);
          ctx.lineTo(l + rr, b); ctx.arcTo(l, b, l, b - rr, rr);
          ctx.lineTo(l, t + rr); ctx.arcTo(l, t, l + rr, t, rr);
        }
        ctx.closePath();
      }

      // 1) soft contact shadow offset toward light's opposite (depth cue)
      x.save();
      x.globalCompositeOperation = 'multiply';
      x.filter = 'blur(' + (blur * 1.6) + 'px)';
      x.globalAlpha = 0.16 + near * 0.18;
      x.fillStyle = K.rgba(dark ? '#000000' : K.mix(tint, '#000000', 0.5), 1);
      shapePath(x, lightDir * S * 0.012 * (0.4 + near), S * 0.014 * (0.4 + near), 1, 1);
      x.fill();
      x.restore();

      // 2) TRANSLUCENT BODY — multiply (light grounds) / screen (dark grounds)
      x.save();
      x.globalCompositeOperation = dark ? 'screen' : 'multiply';
      x.filter = 'blur(' + blur + 'px)';
      const farTint = K.mix(tint, pal.haze, (1 - near) * 0.55); // far panels wash to haze
      x.globalAlpha = bodyA;
      x.fillStyle = farTint;
      shapePath(x, 0, 0, 1, 1);
      x.fill();
      x.restore();

      // 3) INTERIOR FROST — diffuse brighter core, edges stay crisp = frosted
      x.save();
      shapePath(x, 0, 0, 1, 1);
      x.clip();
      x.globalCompositeOperation = dark ? 'screen' : 'soft-light';
      x.filter = 'blur(' + (blur * 2.2 + S * 0.02) + 'px)';
      const fg = x.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.6);
      fg.addColorStop(0, K.rgba(pal.edge, dark ? 0.22 : 0.30));
      fg.addColorStop(0.6, K.rgba(pal.edge, 0.06));
      fg.addColorStop(1, K.rgba(pal.edge, 0));
      x.fillStyle = fg;
      x.fillRect(-w, -h, w * 2, h * 2);
      x.filter = 'none';
      // satin micro-texture inside the sheet (sanded finish)
      K.mottle(x, -w, -h, w * 2, h * 2, tint, 70 - near * 30, r, dark ? 'screen' : 'overlay');
      x.restore();

      // 4) BEVEL CATCH-LIGHT — bright crisp rim where the cut edge catches light
      x.save();
      shapePath(x, 0, 0, 1, 1);
      x.globalCompositeOperation = 'lighter';
      x.lineWidth = Math.max(1.2, S * 0.0016 * (0.6 + near));
      const eg = x.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      eg.addColorStop(0, K.rgba(pal.edge, (0.42 + near * 0.4) * (lightDir < 0 ? 1 : 0.25)));
      eg.addColorStop(0.5, K.rgba(pal.edge, 0.10));
      eg.addColorStop(1, K.rgba(pal.edge, (0.42 + near * 0.4) * (lightDir < 0 ? 0.25 : 1)));
      x.strokeStyle = eg;
      x.stroke();
      // a thin inner shade line to imply sheet THICKNESS
      x.globalCompositeOperation = dark ? 'lighter' : 'multiply';
      x.lineWidth = Math.max(1, S * 0.001);
      x.strokeStyle = K.rgba(dark ? pal.edge : K.mix(tint, '#000', 0.4), 0.18);
      x.translate(-lightDir * S * 0.003, S * 0.003);
      shapePath(x, 0, 0, 0.985, 0.985);
      x.stroke();
      x.restore();

      // 5) specular streak — a soft diagonal sheen lobe near one edge
      if (near > 0.45) {
        x.save();
        shapePath(x, 0, 0, 1, 1);
        x.clip();
        K.sheen(x, lightDir * w * 0.28, -h * 0.3, Math.max(w, h) * 0.5, pal.edge, 0.10 + near * 0.10);
        x.restore();
      }

      x.restore();
      return; // (cx,cy,w,h,rot) captured by caller for accents
    }

    // drilled hole / registration dot (real product cue) at canvas coords
    function hole(hx, hy, hr) {
      x.save();
      K.softShadow(x, hx, hy, hr * 2.4, 0.25);
      x.globalCompositeOperation = dark ? 'screen' : 'multiply';
      x.fillStyle = K.rgba(dark ? '#000' : pal.haze, 0.5);
      x.beginPath(); x.arc(hx, hy, hr, 0, 7); x.fill();
      x.globalCompositeOperation = 'lighter';
      x.lineWidth = Math.max(1, S * 0.0014);
      x.strokeStyle = K.rgba(pal.edge, 0.5);
      x.beginPath(); x.arc(hx - hr * 0.15, hy - hr * 0.15, hr * 0.92, Math.PI * 0.9, Math.PI * 1.9); x.stroke();
      x.restore();
    }

    // pick a set of tints (allow repeats so overlaps of same tint deepen)
    const tints = K.shuffle(pal.tints, r);
    function tintAt(i) { return tints[i % tints.length]; }

    /* ── COMPOSE per mode ── */
    const cxc = W / 2, cyc = H / 2;

    if (mode === 'Stack') {
      // parallel sheets receding on a diagonal — overlapping bands
      const n = 4 + (r() * 2 | 0);
      const ang = (-0.18 + r() * 0.36);
      const sw = W * (0.46 + r() * 0.12), sh = H * (0.5 + r() * 0.12);
      const stepx = W * (0.10 + r() * 0.04) * (r() < 0.5 ? 1 : -1);
      const stepy = -H * (0.085 + r() * 0.04);
      for (let i = 0; i < n; i++) {
        const depth = i / (n - 1);
        const sc = 0.7 + depth * 0.45;
        frostPanel(cxc + (i - (n - 1) / 2) * stepx, cyc + (i - (n - 1) / 2) * -stepy,
          sw * sc, sh * sc, S * 0.05, ang, tintAt(i), depth, 'sheet');
      }
      // a couple registration holes on the nearest sheet
      if (r() < 0.8) { hole(cxc + sw * 0.28, cyc - sh * 0.30, S * 0.012); hole(cxc - sw * 0.26, cyc + sh * 0.30, S * 0.012); }

    } else if (mode === 'Fan') {
      // panels splayed like a card fan from a low pivot
      const n = 5 + (r() * 3 | 0);
      const pivx = cxc + (r() - 0.5) * W * 0.2, pivy = H * (0.9 + r() * 0.12);
      const spread = (0.9 + r() * 0.5);
      const pw = W * 0.20, ph = H * (0.62 + r() * 0.12);
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const a = (t - 0.5) * spread;
        const depth = 0.35 + 0.65 * (1 - Math.abs(t - 0.5) * 2 * 0.8); // centre cards nearer
        const px = pivx + Math.sin(a) * H * 0.42;
        const py = pivy - Math.cos(a) * H * 0.46;
        frostPanel(px, py, pw, ph, S * 0.06, a, tintAt(i), depth, 'sheet');
      }

    } else if (mode === 'Lattice') {
      // grid of HEAVILY overlapping discs/squares — overlaps are the star
      const cols = 3 + (r() * 2 | 0), rows = 3 + (r() * 2 | 0);
      const k = r() < 0.5 ? 'disc' : 'sheet';
      // tile the cells edge-to-edge with margin, then make each form bigger than
      // its cell so neighbours genuinely cross and multiply
      const mx = W * 0.08, my = H * 0.08;
      const cellw = (W - mx * 2) / cols, cellh = (H - my * 2) / rows;
      const d = Math.max(cellw, cellh) * (1.35 + r() * 0.30); // >>cell → strong overlap
      const order = [];
      for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) order.push([gx, gy]);
      K.shuffle(order, r).forEach((g, i) => {
        const gx = g[0], gy = g[1];
        const px = mx + cellw * (gx + 0.5) + (r() - 0.5) * cellw * 0.12;
        const py = my + cellh * (gy + 0.5) + (r() - 0.5) * cellh * 0.12;
        const depth = 0.3 + r() * 0.7;
        frostPanel(px, py, d, d, S * 0.045, (r() - 0.5) * 0.3, tintAt(gx + gy * 2 + i), depth, k);
      });

    } else if (mode === 'Monolith') {
      // one big frosted slab + small tinted accents (+ the surreal off-shadow)
      const bw = W * (0.40 + r() * 0.10), bh = H * (0.66 + r() * 0.12);
      // SURREAL: cast shadow points a different way than the accents' light
      x.save();
      x.globalCompositeOperation = 'multiply';
      x.filter = 'blur(' + S * 0.03 + 'px)';
      x.globalAlpha = 0.18;
      x.fillStyle = dark ? '#000' : K.mix(pal.haze, '#000', 0.3);
      x.translate(cxc, cyc);
      x.rotate(0.04);
      x.fillRect(-bw / 2 - lightDir * S * 0.10, -bh / 2 + S * 0.06, bw, bh); // wrong-side shadow
      x.restore();
      frostPanel(cxc + (r() - 0.5) * W * 0.06, cyc, bw, bh, S * 0.06, (r() - 0.5) * 0.05, tintAt(0), 0.92, 'sheet');
      // small accents overlapping its edges
      const na = 3 + (r() * 2 | 0);
      for (let i = 0; i < na; i++) {
        const ax = cxc + (r() - 0.5) * bw * 1.3;
        const ay = cyc + (r() - 0.5) * bh * 1.2;
        const aw = S * (0.10 + r() * 0.12);
        frostPanel(ax, ay, aw, aw * (0.7 + r() * 0.8), S * 0.03,
          (r() - 0.5) * 0.8, tintAt(i + 1), 0.4 + r() * 0.4, r() < 0.5 ? 'disc' : 'sheet');
      }
      hole(cxc, cyc - bh * 0.36, S * 0.013);

    } else if (mode === 'Drift') {
      // panels floating apart in deep haze — varied scale, sparse, airy
      const n = 5 + (r() * 3 | 0);
      const kinds = ['sheet', 'disc', 'blob'];
      const items = [];
      for (let i = 0; i < n; i++) {
        items.push({ depth: r(), x: 0.15 + r() * 0.7, y: 0.15 + r() * 0.7, i });
      }
      items.sort((a, b) => a.depth - b.depth); // far first
      items.forEach((it) => {
        const sc = 0.16 + it.depth * 0.34;
        frostPanel(W * it.x, H * it.y, S * sc, S * sc * (0.7 + r() * 0.7),
          S * 0.05, (r() - 0.5) * 1.0, tintAt(it.i), it.depth, K.pick(kinds, r));
      });

    } else { // Lens — concentric translucent rings forming a soft lens/eye
      const n = 4 + (r() * 3 | 0);
      const offx = (r() - 0.5) * W * 0.12, offy = (r() - 0.5) * H * 0.12;
      const big = S * (0.78 + r() * 0.14);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const d = big * (1 - t * 0.78);
        // each ring slightly off-centre = the surreal "depth folds back"
        const wob = (1 - t);
        // alternate tints so each concentric ring multiplies into a new hue
        const tnt = tintAt(i % 2 === 0 ? i : i + 2);
        frostPanel(cxc + offx * wob + (r() - 0.5) * S * 0.02 * wob,
          cyc + offy * wob + (r() - 0.5) * S * 0.02 * wob,
          d, d, S * 0.5, 0, tnt, 0.25 + t * 0.7, 'disc');
      }
      hole(cxc + offx, cyc + offy, S * 0.02);
    }

    /* ── GLOBAL ATMOSPHERE & TEXTURE GRADE ── */
    // depth haze: a second soft wash to seat far panels into the air
    const hazeCol = dark ? K.mix(pal.haze, pal.edge, 0.18) : pal.haze;
    K.hazeSheet(x, W, H, noise, hazeCol, dark ? 0.14 : 0.12, S * 0.55, dark ? 'screen' : 'soft-light');
    // a faint top-corner room light to keep it premium product-shot
    K.sheen(x, lightDir < 0 ? W * 0.12 : W * 0.88, H * 0.1, S * 0.7, pal.edge, dark ? 0.05 : 0.07);
    // satin grain over everything (sanded plastic surface)
    K.grain(x, W, H, 6.5, r);
    K.vignette(x, W, H, dark ? 0.5 : 0.32);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    const finishMap = {
      'Smoke': 'Smoked', 'Sea Glass': 'Frosted', 'Rose Quartz': 'Satin',
      'Graphite Ice': 'Tinted', 'Tea': 'Perspex', 'Bruise': 'Smoked',
    };
    return { Palette: pal.name, Mode: mode, Format: f, Finish: finishMap[pal.name] };
  }

  return { name: 's05_polycarbonate', draw, traits };
})();
