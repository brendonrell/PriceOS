/* SLACK TIDE — a perfectly still tidal flat at the turn of the tide.
 * A mirror of water under a flat pale sky. The REFLECTION is the law broken:
 * it shows a DIFFERENT sky than the one above — an extra moon below, clouds
 * that aren't up top, a phantom second horizon. Surreal = real-but-off: a calm,
 * believable coastal scene where only the mirror lies. Cool, desaturated,
 * minimal, lots of negative space, faint distant forms drowned in haze.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six palettes, all in the pewter / pale-jade / oyster / faint-blue world.
     Desaturated and quiet; each shifts the hour & temperature so the SET reads
     varied without ever leaving the family.
       sky  = upper sky band gradient (top→horizon)
       wat  = water plane base (the mirror) — distinctly cooler/darker than sky
       far  = distant haze / land band colour at the horizon
       lo   = the moon / light disc colour
       ink  = darkest accent (posts, far forms, deep water)
       glow = atmospheric wash tint */
  const PALS = [
    { name: 'Pewter Slack', sky: ['#E7ECE8', '#D0D9D5', '#B7C3BE'], wat: '#8C9C98', far: '#9DB0A8', lo: '#F1F4F1', ink: '#2B3739', glow: '#C8D2CE' },
    { name: 'Jade Flats',   sky: ['#E3EAE5', '#C6D4CD', '#9FB6AE'], wat: '#74908A', far: '#6F8A86', lo: '#EAEFEB', ink: '#22363A', glow: '#A9C0B7' },
    { name: 'Oyster Calm',  sky: ['#EEEDE6', '#DBDCD2', '#C0C4BC'], wat: '#969A92', far: '#A6ACA3', lo: '#F5F3EC', ink: '#3C4443', glow: '#D2D6CE' },
    { name: 'Faint Blue',   sky: ['#E4E9EC', '#C7D2D8', '#A3B3BC'], wat: '#7E9099', far: '#7E929B', lo: '#EEF1F3', ink: '#293841', glow: '#B6C5CC' },
    { name: 'Cold Pewter',  sky: ['#DBE2E1', '#BAC7C4', '#93A8A2'], wat: '#6C817C', far: '#6F8A86', lo: '#E3EAE7', ink: '#1E2A2C', glow: '#9DB3AC' },
    { name: 'Tin Dawn',     sky: ['#EFEAE2', '#D6D2C8', '#B6B7AD'], wat: '#8E928A', far: '#94998F', lo: '#F8F2E7', ink: '#34382F', glow: '#CCCDC3' },
  ];

  const MODES = ['Empty Mirror', 'Wrong Moon', 'Cloud Mismatch', 'Lone Post', 'Causeway', 'Double Horizon'];
  const FORMATS = [[1280, 800], [1120, 1120]]; // wide landscape (1.6), square

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 3);
    const pal = pickPal(r);
    const mode = MODES[seed % MODES.length];
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    // The horizon — high, so the still water dominates (a flat, glassy mirror is
    // the subject). Wider per-seed range so framing genuinely shifts.
    const hz = Math.round(H * (0.30 + r() * 0.22));

    // ── Global camera: a per-output "where you stand & look" so two outputs of
    // the same family never frame identically. cam = horizontal look offset
    // (all key elements drift with it); focusX/focusY = where the sky's light
    // pools (vignette/glow focus); skew = a faint horizon-light asymmetry. ──
    const cam = (r() - 0.5) * W * 0.30;
    const focusX = W * (0.20 + r() * 0.60);
    const focusY = hz * (0.20 + r() * 0.45);
    // a single shared horizontal anchor so the "subject" can sit anywhere across
    // the flat, not pinned to centre — every family reads it.
    const anchorX = W * (0.16 + r() * 0.68);

    /* ───────────────────── REAL SKY (above the horizon) ───────────────────── */
    const sg = x.createLinearGradient(0, 0, 0, hz);
    sg.addColorStop(0, pal.sky[0]);
    sg.addColorStop(0.6, pal.sky[1]);
    sg.addColorStop(1, pal.sky[2]);
    x.fillStyle = sg; x.fillRect(0, 0, W, hz + 1);

    // Very faint real-sky luminosity drift, pooled at the per-seed focus point
    // (this sky is meant to be plain & flat, but WHERE the light gathers moves).
    K.bloom(x, focusX, focusY, Math.min(W, H) * (0.34 + r() * 0.30), pal.sky[0], 0.08 + r() * 0.06);

    // ── Decide what lives in the REAL sky vs the REFLECTED (false) sky ──
    const moonR = Math.min(W, H) * (0.038 + r() * 0.055);
    const moonX = W * (0.12 + r() * 0.76);
    const moonY = hz * (0.22 + r() * 0.50);

    let realMoon = null, realClouds = [], falseMoon = null, falseClouds = [];

    function makeClouds(rr, count) {
      const cl = [];
      for (let i = 0; i < count; i++) {
        cl.push({
          cx: W * (0.06 + rr() * 0.88),
          cy: hz * (0.10 + rr() * 0.64),
          cw: W * (0.08 + rr() * 0.34),       // wider size spread
          ch: Math.min(W, H) * (0.007 + rr() * 0.030),
          al: 0.7 + rr() * 0.6,                // per-cloud opacity scalar
        });
      }
      return cl;
    }

    if (mode === 'Empty Mirror') {
      if (r() < 0.55) realClouds = makeClouds(r, 1 + (r() * 2 | 0));
      falseClouds = makeClouds(r, 1 + (r() * 3 | 0));
    } else if (mode === 'Wrong Moon') {
      falseMoon = { x: moonX, y: moonY, r: moonR };
      if (r() < 0.45) realClouds = makeClouds(r, 1 + (r() * 2 | 0));
    } else if (mode === 'Cloud Mismatch') {
      realClouds = makeClouds(r, 2 + (r() * 3 | 0));
      falseClouds = makeClouds(r, 2 + (r() * 3 | 0));
      if (r() < 0.55) { (r() < 0.5 ? (realMoon = { x: moonX, y: moonY, r: moonR }) : (falseMoon = { x: W - moonX, y: moonY, r: moonR })); }
    } else if (mode === 'Lone Post') {
      if (r() < 0.6) falseMoon = { x: moonX, y: moonY, r: moonR };
      if (r() < 0.45) realClouds = makeClouds(r, 1 + (r() * 2 | 0));
    } else if (mode === 'Causeway') {
      falseClouds = makeClouds(r, 1 + (r() * 3 | 0));
      if (r() < 0.5) realMoon = { x: moonX, y: moonY, r: moonR };
    } else { // Double Horizon
      falseClouds = makeClouds(r, 1 + (r() * 3 | 0));
      if (r() < 0.5) realMoon = { x: moonX, y: moonY, r: moonR };
    }

    // ── a moon disc with a faint halo (in the SKY: a clean, lit disc) ──
    function paintMoon(m) {
      x.save();
      K.bloom(x, m.x, m.y, m.r * 2.8, pal.lo, 0.14);
      const mg = x.createRadialGradient(m.x - m.r * 0.28, m.y - m.r * 0.28, m.r * 0.1, m.x, m.y, m.r);
      mg.addColorStop(0, pal.lo);
      mg.addColorStop(0.7, K.mix(pal.lo, pal.sky[2], 0.35));
      mg.addColorStop(1, K.mix(pal.lo, pal.far, 0.5));
      x.fillStyle = mg;
      x.beginPath(); x.arc(m.x, m.y, m.r, 0, 7); x.fill();
      // faint terminator shading so it reads as a body, not a dot
      x.fillStyle = K.rgba(pal.far, 0.18);
      x.beginPath(); x.arc(m.x + m.r * 0.25, m.y + m.r * 0.18, m.r * 0.92, 0, 7); x.fill();
      x.restore();
    }

    function paintCloud(c, col, alpha) {
      x.save();
      const g = x.createRadialGradient(c.cx, c.cy, 0, c.cx, c.cy, c.cw);
      g.addColorStop(0, K.rgba(col, alpha));
      g.addColorStop(1, K.rgba(col, 0));
      x.fillStyle = g;
      x.translate(c.cx, c.cy);
      x.scale(1, c.ch / c.cw);
      x.beginPath(); x.arc(0, 0, c.cw, 0, 7); x.fill();
      x.restore();
    }

    // Real-sky moon + clouds (clouds in the real sky are slightly DARKER than sky)
    if (realMoon) paintMoon(realMoon);
    for (const c of realClouds) paintCloud(c, K.mix(pal.sky[2], pal.far, 0.45), 0.34 * (c.al || 1));

    // Faint distant land/form band on the real horizon (in haze)
    const haveBank = r() < 0.7;
    let bankH = 0, bankForms = [];
    if (haveBank) {
      bankH = Math.min(W, H) * (0.012 + r() * 0.03);
      const bg = x.createLinearGradient(0, hz - bankH, 0, hz);
      bg.addColorStop(0, K.rgba(pal.far, 0));
      bg.addColorStop(1, K.rgba(K.mix(pal.far, pal.ink, 0.2), 0.55 + r() * 0.2));
      x.fillStyle = bg; x.fillRect(0, hz - bankH, W, bankH);
      const nf = 1 + (r() * 5 | 0);
      for (let i = 0; i < nf; i++) {
        const fx = W * (0.04 + r() * 0.92) + cam * 0.4, fw = W * (0.012 + r() * 0.075), fh = bankH * (0.4 + r() * 2.0);
        bankForms.push({ fx, fw, fh });
        x.fillStyle = K.rgba(K.mix(pal.far, pal.ink, 0.4), 0.24 + r() * 0.22);
        x.fillRect(fx, hz - fh, fw, fh);
      }
    }

    /* ───────────────────── THE WATER (the mirror) ───────────────────── */
    // Base water plane — distinctly cooler & darker than the sky, deepening
    // toward the viewer. This gives the mirror real presence and tonal contrast.
    const wg = x.createLinearGradient(0, hz, 0, H);
    wg.addColorStop(0, K.mix(pal.wat, pal.far, 0.35));   // meets haze at horizon
    wg.addColorStop(0.45, pal.wat);
    wg.addColorStop(1, K.mix(pal.wat, pal.ink, 0.5));     // deep foreground
    x.fillStyle = wg; x.fillRect(0, hz, W, H - hz);

    // A faint honest reflection of the real sky's brightness near the horizon
    // (so the surface reads as a mirror at all). Kept subtle.
    const refl = x.createLinearGradient(0, hz, 0, hz + (H - hz) * 0.6);
    refl.addColorStop(0, K.rgba(pal.sky[1], 0.34));
    refl.addColorStop(1, K.rgba(pal.sky[1], 0));
    x.save(); x.globalCompositeOperation = 'soft-light';
    x.fillStyle = refl; x.fillRect(0, hz, W, (H - hz) * 0.6);
    x.restore();

    // Mirror the real land-bank just below the horizon — the mirror is HONEST
    // about the land; only the SKY disagrees (more uncanny).
    if (haveBank) {
      const bg2 = x.createLinearGradient(0, hz, 0, hz + bankH * 0.9);
      bg2.addColorStop(0, K.rgba(K.mix(pal.far, pal.ink, 0.15), 0.4 + r() * 0.12));
      bg2.addColorStop(1, K.rgba(pal.far, 0));
      x.fillStyle = bg2; x.fillRect(0, hz, W, bankH);
    }

    // ── FALSE-sky reflected moon: a wavering smeared column of cool light ──
    function reflectMoon(m, depth, drift, colW, squash, rip) {
      const cxr = m.x + drift;            // the column can lean off the moon's x
      const my = hz + (hz - m.y) * (0.72 + r() * 0.18) + depth;
      x.save();
      // soft glow under the false moon
      K.bloom(x, cxr, my, m.r * (2.2 + r() * 0.9), pal.lo, 0.10 + r() * 0.06);
      // reflection column (light smeared downward by the still water) — width and
      // brightness vary, and a slow lateral lean shifts where it lands.
      const g = x.createLinearGradient(cxr, my - m.r, cxr + drift * 0.6, Math.min(H, my + (H - my)));
      g.addColorStop(0, K.rgba(pal.lo, 0.0));
      g.addColorStop(0.14, K.rgba(pal.lo, 0.4 + r() * 0.25));
      g.addColorStop(0.45, K.rgba(pal.lo, 0.10 + r() * 0.10));
      g.addColorStop(1, K.rgba(pal.lo, 0.0));
      x.fillStyle = g;
      x.fillRect(cxr - m.r * colW, my - m.r, m.r * colW * 2.0, (H - my) + m.r);
      // disc core — a soft squashed glow, gently broken by a few ripple lines
      x.save(); x.translate(cxr, my); x.scale(1, squash);
      const mg = x.createRadialGradient(0, 0, m.r * 0.1, 0, 0, m.r);
      mg.addColorStop(0, K.rgba(pal.lo, 0.62));
      mg.addColorStop(0.6, K.rgba(pal.lo, 0.28));
      mg.addColorStop(1, K.rgba(pal.lo, 0));
      x.fillStyle = mg; x.beginPath(); x.arc(0, 0, m.r, 0, 7); x.fill();
      // faint ripple breaks across the disc (the still water just barely stirs)
      x.globalCompositeOperation = 'destination-out';
      for (let b = 0; b < rip; b++) {
        const yy = (-0.5 + b / Math.max(1, rip - 1)) * m.r * 1.1;
        x.fillStyle = 'rgba(0,0,0,0.18)';
        x.fillRect(-m.r, yy, m.r * 2, m.r * 0.06);
      }
      x.restore();
      x.restore();
    }

    function reflectCloud(c, col) {
      const cy = hz + (hz - c.cy) * 0.78;
      x.save();
      const g = x.createRadialGradient(c.cx, cy, 0, c.cx, cy, c.cw);
      g.addColorStop(0, K.rgba(col, 0.34));
      g.addColorStop(1, K.rgba(col, 0));
      x.fillStyle = g;
      x.translate(c.cx, cy);
      x.scale(1, (c.ch / c.cw) * 1.2);
      x.beginPath(); x.arc(0, 0, c.cw, 0, 7); x.fill();
      x.restore();
    }

    // Paint the FALSE sky into the mirror.
    for (const c of falseClouds) reflectCloud(c, K.mix(pal.glow, pal.far, 0.5));
    if (falseMoon) reflectMoon(
      falseMoon,
      Math.min(W, H) * (0.010 + r() * 0.05),   // depth
      (r() - 0.5) * W * 0.10,                   // lateral drift of the column
      0.7 + r() * 0.9,                          // column width scalar
      0.55 + r() * 0.40,                        // disc vertical squash
      3 + (r() * 4 | 0)                         // ripple-break count
    );

    /* ── mode-specific water structures ── */
    if (mode === 'Double Horizon') {
      const hz2 = hz + (H - hz) * (0.20 + r() * 0.42);   // false horizon sits anywhere mid-water
      const lh = Math.min(W, H) * (0.008 + r() * 0.026);
      const g = x.createLinearGradient(0, hz2 - lh, 0, hz2 + lh);
      g.addColorStop(0, K.rgba(pal.far, 0));
      g.addColorStop(0.5, K.rgba(K.mix(pal.far, pal.ink, 0.35), 0.45 + r() * 0.30));
      g.addColorStop(1, K.rgba(pal.far, 0));
      x.fillStyle = g; x.fillRect(0, hz2 - lh, W, lh * 2);
      const nf = (r() * 5 | 0);
      for (let i = 0; i < nf; i++) {
        const fx = W * (0.05 + r() * 0.9) + cam * 0.3, fw = W * (0.012 + r() * 0.06), fh = lh * (0.8 + r() * 2.6);
        x.fillStyle = K.rgba(K.mix(pal.far, pal.ink, 0.45), 0.2 + r() * 0.16);
        x.fillRect(fx, hz2 - fh, fw, fh);
      }
    }

    // Posts / poles
    function paintPost(px, topY, baseY, w, lean) {
      x.save();
      x.fillStyle = K.rgba(pal.ink, 0.88);
      x.beginPath();
      x.moveTo(px - w / 2, baseY);
      x.lineTo(px - w / 2 + lean, topY);
      x.lineTo(px + w / 2 + lean, topY);
      x.lineTo(px + w / 2, baseY);
      x.closePath(); x.fill();
      x.beginPath(); x.arc(px + lean, topY, w * 0.85, 0, 7); x.fill();
      x.restore();
      // reflection — fainter, fades down, broken into faint ripple gaps
      const reflLen = (baseY - topY) * (0.6 + r() * 0.35);
      x.save();
      const g = x.createLinearGradient(px, baseY, px, baseY + reflLen);
      g.addColorStop(0, K.rgba(pal.ink, 0.5));
      g.addColorStop(1, K.rgba(pal.ink, 0));
      x.fillStyle = g;
      x.fillRect(px - w * 0.6, baseY, w * 1.2, reflLen);
      x.restore();
    }

    if (mode === 'Lone Post') {
      // "Lone" reads as 1, but a quiet cluster of 1–3 leaning posts of differing
      // height/girth, scattered across the flat (anchored off-centre), reads far
      // more like a real tidal field than one centred stake every time.
      const np = 1 + (r() * 3 | 0);
      const spread = W * (0.12 + r() * 0.34);
      for (let i = 0; i < np; i++) {
        const px = anchorX + (i - (np - 1) / 2) * spread * (0.5 + r()) + (r() - 0.5) * W * 0.05;
        const baseY = hz + (H - hz) * (0.10 + r() * 0.30);
        const topY = hz - (H - hz) * (0.08 + r() * 0.28) * (0.6 + r() * 0.8);
        paintPost(px, topY, baseY, Math.max(3, W * (0.004 + r() * 0.006)), (r() - 0.5) * W * 0.024);
      }
    } else if (mode === 'Empty Mirror' && r() < 0.35) {
      const np = 1 + (r() * 2 | 0);
      for (let i = 0; i < np; i++) {
        const px = W * (0.12 + r() * 0.76);
        const baseY = hz + (H - hz) * (0.04 + r() * 0.14);
        paintPost(px, hz - (H - hz) * (0.02 + r() * 0.08), baseY, Math.max(2, W * (0.0025 + r() * 0.004)), (r() - 0.5) * W * 0.012);
      }
    }

    if (mode === 'Causeway') {
      // a thin path of exposed wet flat running from the FOREGROUND (bottom,
      // near centre) up to a vanishing point at the horizon — a believable
      // causeway tapering into the haze, not a stray diagonal.
      const vx = W * (0.22 + r() * 0.56) + cam * 0.3;  // vanishing x roams the horizon
      const bx = W * (0.14 + r() * 0.72);              // base x roams the foreground edge
      const topY = hz + (H - hz) * (0.02 + r() * 0.10);
      const halfBase = W * (0.05 + r() * 0.10);  // broad at the viewer (a path you'd walk)
      const halfTop = W * (0.004 + r() * 0.008); // pinched at the horizon
      x.save();
      // exposed wet flat — LIGHTER than the standing water (catching sky light),
      // brightest in the near foreground, dissolving into haze at the horizon.
      const pathCol = K.mix(pal.far, pal.lo, 0.35);
      const pg = x.createLinearGradient(0, topY, 0, H);
      pg.addColorStop(0, K.rgba(pathCol, 0.0));          // melts into horizon haze
      pg.addColorStop(0.25, K.rgba(pathCol, 0.4));
      pg.addColorStop(1, K.rgba(K.mix(pal.lo, pal.far, 0.45), 0.7)); // lit near sand
      x.fillStyle = pg;
      x.beginPath();
      x.moveTo(vx - halfTop, topY);
      x.lineTo(vx + halfTop, topY);
      x.lineTo(bx + halfBase, H);
      x.lineTo(bx - halfBase, H);
      x.closePath(); x.fill();
      // soft wet rims where the path meets standing water (a touch darker)
      x.globalCompositeOperation = 'multiply';
      x.strokeStyle = K.rgba(K.mix(pal.far, pal.ink, 0.3), 0.18); x.lineWidth = Math.max(1, W * 0.002);
      x.beginPath(); x.moveTo(vx - halfTop, topY); x.lineTo(bx - halfBase, H); x.stroke();
      x.beginPath(); x.moveTo(vx + halfTop, topY); x.lineTo(bx + halfBase, H); x.stroke();
      // a faint wet sheen running up the centre spine
      x.globalCompositeOperation = 'screen';
      x.strokeStyle = K.rgba(pal.lo, 0.12); x.lineWidth = Math.max(1, W * 0.006);
      x.beginPath(); x.moveTo((vx + bx) / 2, (topY + H) / 2); x.lineTo(vx, topY); x.stroke();
      x.restore();
      // a tiny far post (or two) near the path's end, swallowed by haze
      if (r() < 0.75) {
        const fp = 1 + (r() < 0.35 ? 1 : 0);
        for (let i = 0; i < fp; i++) {
          const fpx = vx + (r() - 0.5) * W * 0.06;
          paintPost(fpx, hz - (H - hz) * (0.02 + r() * 0.06), topY, Math.max(2, W * 0.003), (r() - 0.5) * W * 0.006);
        }
      }
    }

    /* ─────────── SECONDARY SCATTER: faint distant flotsam on the flat ───────────
     * A seeded handful of tiny far forms — stranded debris / distant stakes /
     * specks of exposed mud — sitting just below the horizon and drowned in haze.
     * Count, place, size all per-output, so even a near-empty mirror gets its own
     * quiet incident rather than reading as the same blank plane every time. */
    const scN = (r() * 7 | 0);
    for (let i = 0; i < scN; i++) {
      const t = r();                                   // 0 = at horizon, 1 = nearer
      const sy = hz + (H - hz) * (0.02 + t * 0.5);
      const sx = W * (0.04 + r() * 0.92) + cam * 0.5 * (1 - t);
      const sw = W * (0.004 + r() * 0.02) * (0.5 + t);
      const sh = sw * (0.25 + r() * 0.8);
      x.save();
      x.fillStyle = K.rgba(K.mix(pal.far, pal.ink, 0.3 + r() * 0.25), (0.12 + r() * 0.22) * (0.4 + t));
      x.fillRect(sx, sy - sh, sw, sh);
      // a barely-there mirror smudge beneath it
      const sg = x.createLinearGradient(sx, sy, sx, sy + sh * (1.2 + r()));
      sg.addColorStop(0, K.rgba(pal.ink, 0.16 * (0.4 + t)));
      sg.addColorStop(1, K.rgba(pal.ink, 0));
      x.fillStyle = sg; x.fillRect(sx, sy, sw, sh * (1.2 + r()));
      x.restore();
    }

    /* ─────────────── STILLNESS TEXTURE: faint horizontal water ripple ─────────────── */
    x.save();
    x.globalCompositeOperation = 'overlay';
    const streaks = 22 + (r() * 14 | 0);
    for (let i = 0; i < streaks; i++) {
      const t = i / streaks;
      const yy = hz + (H - hz) * (0.03 + t * 0.95);
      const a = 0.02 + 0.06 * (1 - t) * r();
      const lw = Math.max(0.6, (H - hz) * 0.0045 * (0.4 + t));
      x.strokeStyle = K.rgba(t < 0.4 ? pal.lo : pal.ink, a);
      x.lineWidth = lw;
      x.beginPath();
      const seg = 7;
      for (let s = 0; s <= seg; s++) {
        const xx = (W / seg) * s;
        const wob = noise.fbm(xx / (W * 0.35), yy / (H * 0.3), 3) * (H - hz) * 0.005 * (0.3 + t);
        if (s === 0) x.moveTo(xx, yy + wob); else x.lineTo(xx, yy + wob);
      }
      x.stroke();
    }
    x.restore();

    // a soft specular sheen where the bright sky meets water at the horizon
    x.save();
    x.globalCompositeOperation = 'screen';
    const hb = x.createLinearGradient(0, hz - 1, 0, hz + (H - hz) * 0.12);
    hb.addColorStop(0, K.rgba(pal.lo, 0.16));
    hb.addColorStop(1, K.rgba(pal.lo, 0));
    x.fillStyle = hb; x.fillRect(0, hz - 1, W, (H - hz) * 0.14);
    x.restore();

    /* ───────────────────── ATMOSPHERE & TEXTURE ───────────────────── */
    // Volumetric haze — kept gentle so it adds air without bleaching tone.
    const hazeCol = K.mix(pal.glow, pal.sky[0], 0.45);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.13, Math.min(W, H) * 1.1, 'screen');

    // dedicated horizon haze band — the distance dissolves into air
    const horizonHaze = x.createLinearGradient(0, hz - H * 0.12, 0, hz + H * 0.08);
    horizonHaze.addColorStop(0, K.rgba(hazeCol, 0));
    horizonHaze.addColorStop(0.5, K.rgba(hazeCol, 0.42));
    horizonHaze.addColorStop(1, K.rgba(hazeCol, 0));
    x.fillStyle = horizonHaze; x.fillRect(0, hz - H * 0.12, W, H * 0.2);

    // material surface texture
    K.mottle(x, 0, hz, W, H - hz, pal.wat, 55, r, 'overlay');
    K.mottle(x, 0, 0, W, hz, pal.sky[1], 90, r, 'soft-light');

    // film grain to seat everything in air
    K.grain(x, W, H, 6, r);

    // a per-seed directional vignette: darkness pools toward one corner/edge so
    // the "focus" of the frame shifts between outputs (not always dead-centre).
    x.save();
    const vfx = W * (0.30 + r() * 0.40), vfy = H * (0.30 + r() * 0.40);
    const dv = x.createRadialGradient(vfx, vfy, Math.min(W, H) * (0.18 + r() * 0.12), vfx, vfy, Math.max(W, H) * (0.7 + r() * 0.2));
    dv.addColorStop(0, 'rgba(0,0,0,0)');
    dv.addColorStop(1, 'rgba(0,0,0,' + (0.10 + r() * 0.10).toFixed(3) + ')');
    x.fillStyle = dv; x.fillRect(0, 0, W, H);
    x.restore();

    K.vignette(x, W, H, 0.30);

    // final whisper-thin cool wash to unify the palette
    x.save();
    x.globalCompositeOperation = 'soft-light';
    x.fillStyle = K.rgba(pal.glow, 0.12);
    x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = MODES[seed % MODES.length];
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : 'Square';
    return { Palette: pal.name, Mode: mode, Format: f };
  }

  return { name: 'h4_slacktide', draw, traits };
})();
