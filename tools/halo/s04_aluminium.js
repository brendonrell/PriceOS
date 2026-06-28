/* ALUMINIUM — industrial-design abstract (Braun / Rams / unibody / TE).
 * Matte brushed/anodized aluminium + hard plastic, machined edges, anodized
 * accents, calm confident forms with intentional negative space and soft
 * contact shadows. SURREAL = real-but-off: extrusions that loop, fasteners
 * holding nothing, milled objects that couldn't be milled. Quiet uncanny.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six anodized-metal palettes. Metal stops are NEUTRAL graphite/silver; the
     single anodized accent is the only colour hit. bg = matte studio sweep. */
  const PALS = [
    { name: 'Graphite',   bg: ['#23262b', '#181a1e'], mHi: '#c6cace', mMid: '#7e848b', mLo: '#34383d', mEdge: '#e6e9ec', plastic: '#2c2f34', plHi: '#4a4e54', accent: '#3f6fb0', ink: '#101216' },
    { name: 'Space Grey', bg: ['#2a2622', '#1b1815'], mHi: '#c0b9b1', mMid: '#7d756c', mLo: '#3a352f', mEdge: '#e7e1d8', plastic: '#2b2723', plHi: '#48433c', accent: '#c86a32', ink: '#15110d' },
    { name: 'Natural',    bg: ['#2f3236', '#202327'], mHi: '#e3e6e9', mMid: '#9aa0a6', mLo: '#494e54', mEdge: '#ffffff', plastic: '#161719', plHi: '#34373b', accent: '#b5342b', ink: '#0c0d0f' },
    { name: 'Gold Anod',  bg: ['#2c2823', '#1d1a15'], mHi: '#ddccae', mMid: '#a08c6c', mLo: '#473e2e', mEdge: '#f4e8cb', plastic: '#16201f', plHi: '#2c3b39', accent: '#1f5d59', ink: '#120f0a' },
    { name: 'Bead Blast', bg: ['#34373a', '#24272a'], mHi: '#d4d7d9', mMid: '#9fa3a6', mLo: '#54585c', mEdge: '#eef0f1', plastic: '#26292c', plHi: '#42464a', accent: '#8fbf3f', ink: '#121417' },
    { name: 'Gunmetal',   bg: ['#202630', '#13171e'], mHi: '#aeb6c2', mMid: '#6b7280', mLo: '#2c333d', mEdge: '#dde3ec', plastic: '#1a1f27', plHi: '#333c48', accent: '#bcd6e6', ink: '#0a0d12' },
  ];

  const MODES = ['Extrusion', 'Stack', 'Section', 'Fastened', 'Lathe'];
  const FORMATS = [[1040, 1300], [1200, 1200], [1300, 1040]]; // portrait / square / landscape

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  /* ── MATTE metal ramp: like chromeRamp but white stops pulled WAY down so it
     reads brushed/anodized, not mirror. ang in radians. ── */
  function matteRamp(x, x0, y0, w, h, ang, pal) {
    const cx = x0 + w / 2, cy = y0 + h / 2, L = Math.max(w, h) * 1.1;
    const dx = Math.cos(ang) * L, dy = Math.sin(ang) * L;
    const g = x.createLinearGradient(cx - dx / 2, cy - dy / 2, cx + dx / 2, cy + dy / 2);
    g.addColorStop(0.00, pal.mLo);
    g.addColorStop(0.30, pal.mMid);
    g.addColorStop(0.50, K.mix(pal.mHi, pal.mMid, 0.25)); // soft bright band, not white
    g.addColorStop(0.66, pal.mMid);
    g.addColorStop(1.00, K.mix(pal.mLo, pal.ink, 0.3));
    return g;
  }

  /* ── Brushed grain: many faint parallel scratches along grain direction.
     Clipped by caller. gx,gy is grain unit-vector. ── */
  function brushGrain(x, x0, y0, w, h, gx, gy, tint, r, dens) {
    x.save();
    x.beginPath(); x.rect(x0, y0, w, h); x.clip();
    const span = Math.hypot(w, h) * 1.3;
    const px = -gy, py = gx; // perpendicular to grain = scratch spacing axis
    const n = Math.floor((w * h) / (dens || 480));
    for (let i = 0; i < n; i++) {
      const t = (r() - 0.5);
      const ox = x0 + w / 2 + px * t * span;
      const oy = y0 + h / 2 + py * t * span;
      const len = span * (0.4 + r() * 0.6);
      const lw = r() < 0.85 ? 0.6 : 1.2;
      const dark = r() < 0.55;
      const a = 0.015 + r() * 0.05;
      x.strokeStyle = dark ? 'rgba(0,0,0,' + a + ')' : K.rgba(tint, a * 1.1);
      x.lineWidth = lw;
      x.beginPath();
      x.moveTo(ox - gx * len / 2, oy - gy * len / 2);
      x.lineTo(ox + gx * len / 2, oy + gy * len / 2);
      x.stroke();
    }
    x.restore();
  }

  /* ── Anisotropic highlight band: a soft elongated specular streak along grain. ── */
  function anisoBand(x, cx, cy, len, wid, ang, col, a0) {
    x.save();
    x.translate(cx, cy); x.rotate(ang);
    x.globalCompositeOperation = 'lighter';
    const g = x.createLinearGradient(0, -wid, 0, wid);
    g.addColorStop(0, K.rgba(col, 0));
    g.addColorStop(0.5, K.rgba(col, a0));
    g.addColorStop(1, K.rgba(col, 0));
    x.fillStyle = g;
    x.fillRect(-len / 2, -wid, len, wid * 2);
    x.restore();
  }

  /* round-rect path */
  function rr(x, bx, by, bw, bh, rad) {
    const rr_ = Math.min(rad, bw / 2, bh / 2);
    x.beginPath();
    x.moveTo(bx + rr_, by);
    x.arcTo(bx + bw, by, bx + bw, by + bh, rr_);
    x.arcTo(bx + bw, by + bh, bx, by + bh, rr_);
    x.arcTo(bx, by + bh, bx, by, rr_);
    x.arcTo(bx, by, bx + bw, by, rr_);
    x.closePath();
  }

  /* ── A brushed-aluminium panel/bar: filled matte ramp + grain + chamfer
     catch-lights + anisotropic band. grainAng = direction of brushing. ── */
  function metalPanel(x, bx, by, bw, bh, rad, grainAng, pal, r, opts) {
    opts = opts || {};
    x.save();
    rr(x, bx, by, bw, bh, rad); x.clip();
    // base matte ramp (light dir roughly perpendicular to grain)
    x.fillStyle = matteRamp(x, bx, by, bw, bh, grainAng + Math.PI / 2, pal);
    x.fillRect(bx, by, bw, bh);
    // brushed grain along grainAng
    brushGrain(x, bx, by, bw, bh, Math.cos(grainAng), Math.sin(grainAng),
      pal.mEdge, r, opts.grainDens || 420);
    // faint mottle for blasted tooth
    K.mottle(x, bx, by, bw, bh, pal.mMid, 60, r, 'overlay');
    // anisotropic specular streak biased toward upper-left
    anisoBand(x, bx + bw * (0.32 + r() * 0.12), by + bh * (0.3 + r() * 0.1),
      Math.hypot(bw, bh) * 0.85, Math.min(bw, bh) * (0.12 + r() * 0.06),
      grainAng, pal.mEdge, 0.10 + r() * 0.06);
    x.restore();
    // chamfered edge catch-light (bright top/left thin inner stroke)
    x.save();
    rr(x, bx + 1, by + 1, bw - 2, bh - 2, Math.max(0, rad - 1));
    x.lineWidth = 1.4; x.strokeStyle = K.rgba(pal.mEdge, 0.55); x.stroke();
    // dark lower-right edge for depth
    rr(x, bx + 0.5, by + 0.5, bw - 1, bh - 1, rad);
    x.lineWidth = 1.2; x.strokeStyle = K.rgba(pal.ink, 0.5); x.stroke();
    x.restore();
  }

  /* ── Hard-plastic part: matte ABS fill, rounded radii, soft sheen lobe. ── */
  function plasticPart(x, bx, by, bw, bh, rad, pal, r, smoked) {
    x.save();
    rr(x, bx, by, bw, bh, rad); x.clip();
    const base = smoked ? K.mix(pal.plastic, pal.ink, 0.2) : pal.plastic;
    const g = x.createLinearGradient(bx, by, bx, by + bh);
    g.addColorStop(0, K.mix(base, pal.plHi, 0.5));
    g.addColorStop(0.5, base);
    g.addColorStop(1, K.mix(base, pal.ink, 0.4));
    x.fillStyle = g; x.fillRect(bx, by, bw, bh);
    if (smoked) { // translucent smoked: faint vertical sheen + transparency hint
      x.globalAlpha = 0.85;
    }
    K.mottle(x, bx, by, bw, bh, base, 120, r, 'soft-light');
    // soft sheen highlight near top
    K.sheen(x, bx + bw * (0.3 + r() * 0.2), by + bh * 0.2, Math.max(bw, bh) * 0.5, pal.plHi, 0.16);
    x.restore();
    // crisp radius edge
    x.save(); rr(x, bx + 0.75, by + 0.75, bw - 1.5, bh - 1.5, Math.max(0, rad - 1));
    x.lineWidth = 1; x.strokeStyle = K.rgba(pal.plHi, 0.3); x.stroke(); x.restore();
  }

  /* ── Countersunk hole: dark recessed cone with bright rim catch + anodized ring option. ── */
  function countersink(x, cx, cy, rad, pal, ring) {
    // outer chamfer (bright rim toward light = top-left)
    let g = x.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.2, cx, cy, rad);
    g.addColorStop(0, K.rgba(pal.mEdge, 0.5));
    g.addColorStop(0.55, K.rgba(pal.mMid, 0.2));
    g.addColorStop(1, K.rgba(pal.ink, 0.0));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
    // anodized ring
    if (ring) {
      x.lineWidth = rad * 0.16; x.strokeStyle = K.rgba(pal.accent, 0.95);
      x.beginPath(); x.arc(cx, cy, rad * 0.74, 0, 7); x.stroke();
    }
    // recessed bore (dark)
    g = x.createRadialGradient(cx - rad * 0.2, cy - rad * 0.2, 0, cx, cy, rad * 0.55);
    g.addColorStop(0, K.rgba(pal.mMid, 0.6));
    g.addColorStop(0.5, pal.mLo);
    g.addColorStop(1, pal.ink);
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad * 0.55, 0, 7); x.fill();
    // tiny bottom catch
    x.fillStyle = K.rgba(pal.mEdge, 0.3);
    x.beginPath(); x.arc(cx + rad * 0.12, cy + rad * 0.14, rad * 0.12, 0, 7); x.fill();
  }

  /* ── Knurled ring/band: diamond cross-hatch over a cylinder strip. ── */
  function knurl(x, bx, by, bw, bh, pal, r) {
    x.save(); x.beginPath(); x.rect(bx, by, bw, bh); x.clip();
    // cylinder shading
    const g = x.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, pal.mLo); g.addColorStop(0.3, pal.mMid);
    g.addColorStop(0.5, K.mix(pal.mHi, pal.mMid, 0.3));
    g.addColorStop(0.7, pal.mMid); g.addColorStop(1, K.mix(pal.mLo, pal.ink, 0.4));
    x.fillStyle = g; x.fillRect(bx, by, bw, bh);
    // diamond knurl
    const sp = Math.max(4, bh * 0.16);
    x.lineWidth = 0.8;
    for (let d = -bh; d < bw + bh; d += sp) {
      x.strokeStyle = 'rgba(0,0,0,0.28)';
      x.beginPath(); x.moveTo(bx + d, by); x.lineTo(bx + d + bh, by + bh); x.stroke();
      x.beginPath(); x.moveTo(bx + d + bh, by); x.lineTo(bx + d, by + bh); x.stroke();
      x.strokeStyle = K.rgba(pal.mEdge, 0.22);
      x.beginPath(); x.moveTo(bx + d + 0.8, by); x.lineTo(bx + d + bh + 0.8, by + bh); x.stroke();
    }
    x.restore();
    x.strokeStyle = K.rgba(pal.ink, 0.5); x.lineWidth = 1; x.strokeRect(bx, by, bw, bh);
  }

  /* ── Soft contact shadow ellipse under a form ── */
  function contact(x, cx, cy, rw, rh, a) {
    x.save(); x.globalCompositeOperation = 'multiply';
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rw, rh));
    g.addColorStop(0, 'rgba(0,0,0,' + a + ')');
    g.addColorStop(0.6, 'rgba(0,0,0,' + a * 0.5 + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.translate(cx, cy); x.scale(1, rh / Math.max(rw, rh)); x.translate(-cx, -cy);
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, Math.max(rw, rh), 0, 7); x.fill();
    x.restore();
  }

  /* ── End-on extruded profile cross-section (T-slot / heatsink-ish) ── */
  function profileSection(x, cx, cy, s, pal, r, kind) {
    // base square slab as metal, then carve slots
    const bx = cx - s / 2, by = cy - s / 2;
    metalPanel(x, bx, by, s, s, s * 0.06, Math.PI / 2 + (r() - 0.5) * 0.3, pal, r, { grainDens: 700 });
    // dark T-slot channels
    x.save(); x.fillStyle = K.rgba(pal.ink, 0.85);
    if (kind === 0) { // plus / T-slot
      const t = s * 0.16;
      x.fillRect(cx - t / 2, by + s * 0.1, t, s * 0.8);
      x.fillRect(bx + s * 0.1, cy - t / 2, s * 0.8, t);
      // inner T-mouths
      x.fillStyle = K.rgba(pal.mLo, 0.9);
      x.fillRect(cx - t * 0.9, by + s * 0.08, t * 1.8, t * 0.5);
    } else if (kind === 1) { // bore + ring
      x.restore(); x.save();
      countersink(x, cx, cy, s * 0.26, pal, r() < 0.5);
    } else { // corner slots
      const t = s * 0.12;
      for (const [sx, sy] of [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82]]) {
        x.fillStyle = pal.ink;
        x.beginPath(); x.arc(bx + s * sx, by + s * sy, t, 0, 7); x.fill();
        x.fillStyle = K.rgba(pal.mEdge, 0.25);
        x.beginPath(); x.arc(bx + s * sx - t * 0.3, by + s * sy - t * 0.3, t * 0.4, 0, 7); x.fill();
      }
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 23);
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // ── BACKGROUND: matte studio sweep (soft top→bottom + faint radial light) ──
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, pal.bg[0]); bg.addColorStop(1, pal.bg[1]);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // soft product-shot key light glow upper area
    K.bloom(x, W * (0.4 + r() * 0.2), H * 0.28, S * 0.9, K.mix(pal.bg[0], '#ffffff', 0.5), 0.10);

    const cxC = W / 2, cyC = H / 2;

    // ───────────────────────── COMPOSITIONS ─────────────────────────
    if (mode === 'Extrusion') {
      // long aluminium profiles running through the frame, slightly off-parallel
      const ang = (r() - 0.5) * 0.5 + (r() < 0.5 ? 0 : Math.PI / 2);
      const horiz = Math.abs(Math.cos(ang)) > 0.5;
      // horizontal bars read empty if too few/thin — give them more body & count
      const nBars = horiz ? 3 + (r() * 2 | 0) : 2 + (r() * 2 | 0);
      const bars = [];
      const axisLen = horiz ? H : W;
      // total bar mass should fill ~55-70% of the cross axis, centred
      const minT = horiz ? S * 0.1 : S * 0.07;
      let pos = axisLen * (horiz ? 0.16 + r() * 0.06 : 0.18 + r() * 0.1);
      for (let i = 0; i < nBars; i++) {
        const thick = minT + r() * S * 0.09;
        bars.push({ pos, thick, plastic: r() < 0.35 });
        pos += thick + S * (0.02 + r() * (horiz ? 0.05 : 0.08));
      }
      // contact shadow band first
      for (const b of bars) {
        if (horiz) contact(x, W / 2, b.pos + b.thick + S * 0.02, W * 0.55, b.thick * 0.7, 0.3);
        else contact(x, b.pos + b.thick + S * 0.02, H / 2, b.thick * 0.7, H * 0.55, 0.3);
      }
      for (const b of bars) {
        if (horiz) {
          if (b.plastic) plasticPart(x, -S * 0.1, b.pos, W + S * 0.2, b.thick, b.thick * 0.3, pal, r, r() < 0.5);
          else metalPanel(x, -S * 0.1, b.pos, W + S * 0.2, b.thick, b.thick * 0.28, 0, pal, r, { grainDens: 300 });
          // fin grooves along the bar
          x.save(); x.strokeStyle = K.rgba(pal.ink, 0.3); x.lineWidth = 1.5;
          for (let gy = b.pos + b.thick * 0.22; gy < b.pos + b.thick; gy += b.thick * 0.2) {
            x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke();
            x.strokeStyle = K.rgba(pal.mEdge, 0.18);
            x.beginPath(); x.moveTo(0, gy - 1.4); x.lineTo(W, gy - 1.4); x.stroke();
            x.strokeStyle = K.rgba(pal.ink, 0.3);
          }
          x.restore();
        } else {
          if (b.plastic) plasticPart(x, b.pos, -S * 0.1, b.thick, H + S * 0.2, b.thick * 0.3, pal, r, r() < 0.5);
          else metalPanel(x, b.pos, -S * 0.1, b.thick, H + S * 0.2, b.thick * 0.28, Math.PI / 2, pal, r, { grainDens: 300 });
        }
      }
      // anodized accent stripe (a thin anodized inlay channel)
      const ab = bars[bars.length - 1];
      x.fillStyle = K.rgba(pal.accent, 0.95);
      if (horiz) x.fillRect(0, ab.pos + ab.thick * 0.5 - 3, W, 6);
      else x.fillRect(ab.pos + ab.thick * 0.5 - 3, 0, 6, H);
      // a row of countersunk bolts marching along one metal bar (anchors it)
      const detailBar = bars.find((b) => !b.plastic) || bars[0];
      {
        const dn = 4 + (r() * 3 | 0);
        const br2 = detailBar.thick * 0.16;
        for (let k = 0; k < dn; k++) {
          const tt = (k + 0.5) / dn;
          if (horiz) countersink(x, W * (0.08 + tt * 0.84), detailBar.pos + detailBar.thick * 0.5, br2, pal, r() < 0.3);
          else countersink(x, detailBar.pos + detailBar.thick * 0.5, H * (0.08 + tt * 0.84), br2, pal, r() < 0.3);
        }
      }
      // SURREAL: one bar loops back — a soft impossible bend (almost always)
      if (r() < 0.9) {
        const lb = bars[0];
        x.save();
        const lr = lb.thick * 1.4;
        const lx = horiz ? W * (0.7 + r() * 0.18) : lb.pos + lb.thick / 2;
        const ly = horiz ? lb.pos + lb.thick / 2 : H * (0.7 + r() * 0.18);
        contact(x, lx + lr * 0.2, ly + lr * 0.5, lr * 1.1, lr * 0.5, 0.28);
        metalPanel(x, lx - lr, ly - lr, lr * 2, lr * 2, lr * 0.9, Math.PI / 4, pal, r, { grainDens: 400 });
        // bore through the loop showing background = impossible join
        x.globalCompositeOperation = 'destination-out';
        x.beginPath(); x.arc(lx, ly, lr * 0.42, 0, 7); x.fill();
        x.restore();
        // re-light the bore rim
        countersink(x, lx, ly, lr * 0.5, pal, false);
      }

    } else if (mode === 'Stack') {
      // panels/plates layered with hairline gaps, slight offsets (unibody slab stack)
      const n = 3 + (r() * 3 | 0);
      const pw = W * (0.46 + r() * 0.14);
      let py = H * 0.14;
      const px0 = (W - pw) / 2 + (r() - 0.5) * W * 0.06;
      contact(x, W / 2, H * 0.84, pw * 0.7, H * 0.07, 0.34);
      for (let i = 0; i < n; i++) {
        const ph = (H * 0.7 / n) * (0.7 + r() * 0.5);
        const off = (r() - 0.5) * W * 0.05;
        const isP = r() < 0.32;
        if (isP) plasticPart(x, px0 + off, py, pw, ph, S * 0.02, pal, r, r() < 0.4);
        else metalPanel(x, px0 + off, py, pw, ph, S * 0.018, (r() < 0.5 ? 0 : Math.PI / 2), pal, r, { grainDens: 380 });
        // hairline panel gap shadow under each
        x.fillStyle = K.rgba(pal.ink, 0.5);
        x.fillRect(px0 + off, py + ph, pw, 2);
        // a few countersunk bolts on some plates
        if (!isP && r() < 0.7) {
          const bn = 2 + (r() * 2 | 0);
          for (let k = 0; k < bn; k++) {
            countersink(x, px0 + off + pw * (0.12 + k * (0.76 / Math.max(1, bn - 1))),
              py + ph * 0.5, Math.min(ph, pw) * 0.07, pal, r() < 0.4);
          }
        }
        py += ph + S * (0.006 + r() * 0.01);
      }
      // anodized accent: a thin inlay edge on one plate
      x.fillStyle = K.rgba(pal.accent, 0.9);
      x.fillRect(px0 + (r() - 0.5) * W * 0.05, H * 0.14 + (r() * H * 0.4), pw, 4);

    } else if (mode === 'Section') {
      // grid of end-on extruded profile cross-sections (heatsink fins / T-slots)
      const cols = 2 + (r() * 2 | 0), rows = 2 + (r() * 2 | 0);
      const cell = Math.min(W / (cols + 0.6), H / (rows + 0.6));
      const gx0 = (W - cols * cell) / 2 + cell * 0.1;
      const gy0 = (H - rows * cell) / 2 + cell * 0.1;
      for (let cyi = 0; cyi < rows; cyi++) for (let cxi = 0; cxi < cols; cxi++) {
        const cx = gx0 + cxi * cell + cell * 0.4;
        const cy = gy0 + cyi * cell + cell * 0.4;
        const s = cell * (0.62 + r() * 0.14);
        contact(x, cx + s * 0.08, cy + s * 0.12, s * 0.62, s * 0.5, 0.26);
        // heatsink fins variant for some cells
        if (r() < 0.5) {
          const bx = cx - s / 2, by = cy - s / 2;
          metalPanel(x, bx, by, s, s, s * 0.05, Math.PI / 2, pal, r, { grainDens: 700 });
          x.save(); x.beginPath(); x.rect(bx, by, s, s); x.clip();
          const fn = 5 + (r() * 4 | 0);
          for (let f = 0; f < fn; f++) {
            const fx = bx + s * (0.08 + f * (0.84 / (fn - 1)));
            x.fillStyle = K.rgba(pal.ink, 0.6); x.fillRect(fx, by + s * 0.06, s * 0.03, s * 0.88);
            x.fillStyle = K.rgba(pal.mEdge, 0.35); x.fillRect(fx + s * 0.03, by + s * 0.06, 1.2, s * 0.88);
          }
          x.restore();
          x.strokeStyle = K.rgba(pal.mEdge, 0.4); x.lineWidth = 1.4; rr(x, bx, by, s, s, s * 0.05); x.stroke();
        } else {
          profileSection(x, cx, cy, s, pal, r, r() * 3 | 0);
        }
      }
      // one cell gets the anodized ring accent
      const acx = gx0 + (r() * cols | 0) * cell + cell * 0.4;
      const acy = gy0 + (r() * rows | 0) * cell + cell * 0.4;
      x.lineWidth = cell * 0.04; x.strokeStyle = K.rgba(pal.accent, 0.9);
      x.beginPath(); x.arc(acx, acy, cell * 0.2, 0, 7); x.stroke();

    } else if (mode === 'Fastened') {
      // a hero plate with countersunk bolts + knurled rings; fasteners hold nothing
      const pw = W * (0.62 + r() * 0.12), ph = H * (0.5 + r() * 0.14);
      const px0 = (W - pw) / 2, py0 = (H - ph) / 2 + (r() - 0.5) * H * 0.05;
      contact(x, W / 2, py0 + ph + S * 0.03, pw * 0.62, ph * 0.16, 0.34);
      metalPanel(x, px0, py0, pw, ph, S * 0.035, (r() < 0.5 ? 0 : Math.PI / 2), pal, r, { grainDens: 320 });
      // hairline machined panel-gap inset rectangle
      x.save(); x.strokeStyle = K.rgba(pal.ink, 0.4); x.lineWidth = 1.2;
      rr(x, px0 + pw * 0.08, py0 + ph * 0.1, pw * 0.84, ph * 0.8, S * 0.02); x.stroke();
      x.strokeStyle = K.rgba(pal.mEdge, 0.22); x.lineWidth = 1;
      rr(x, px0 + pw * 0.08 + 1.4, py0 + ph * 0.1 + 1.4, pw * 0.84, ph * 0.8, S * 0.02); x.stroke();
      x.restore();
      // corner countersunk bolts
      const br = Math.min(pw, ph) * 0.05;
      const margin = 0.12;
      for (const [fx, fy] of [[margin, margin], [1 - margin, margin], [margin, 1 - margin], [1 - margin, 1 - margin]]) {
        countersink(x, px0 + pw * fx, py0 + ph * fy, br, pal, false);
      }
      // a knurled ring/dial as hero detail (holding nothing)
      const kr = Math.min(pw, ph) * 0.2;
      const kcx = px0 + pw * (0.3 + r() * 0.4), kcy = py0 + ph * 0.5;
      contact(x, kcx, kcy + kr * 0.9, kr * 1.1, kr * 0.35, 0.3);
      // knurled disc
      x.save();
      x.beginPath(); x.arc(kcx, kcy, kr, 0, 7); x.clip();
      const dg = x.createRadialGradient(kcx - kr * 0.3, kcy - kr * 0.3, kr * 0.1, kcx, kcy, kr);
      dg.addColorStop(0, K.mix(pal.mHi, pal.mMid, 0.2)); dg.addColorStop(0.7, pal.mMid); dg.addColorStop(1, K.mix(pal.mLo, pal.ink, 0.4));
      x.fillStyle = dg; x.beginPath(); x.arc(kcx, kcy, kr, 0, 7); x.fill();
      // radial knurl ticks
      const tn = 48;
      for (let t = 0; t < tn; t++) {
        const a = (t / tn) * Math.PI * 2;
        x.strokeStyle = t % 2 ? 'rgba(0,0,0,0.3)' : K.rgba(pal.mEdge, 0.3); x.lineWidth = 1.2;
        x.beginPath(); x.moveTo(kcx + Math.cos(a) * kr * 0.78, kcy + Math.sin(a) * kr * 0.78);
        x.lineTo(kcx + Math.cos(a) * kr, kcy + Math.sin(a) * kr); x.stroke();
      }
      x.restore();
      // anodized accent inner ring + center bore
      x.lineWidth = kr * 0.1; x.strokeStyle = K.rgba(pal.accent, 0.95);
      x.beginPath(); x.arc(kcx, kcy, kr * 0.55, 0, 7); x.stroke();
      countersink(x, kcx, kcy, kr * 0.34, pal, false);
      x.strokeStyle = K.rgba(pal.mEdge, 0.45); x.lineWidth = 1.4;
      x.beginPath(); x.arc(kcx, kcy, kr, 0, 7); x.stroke();

    } else if (mode === 'Mono') {
      // one big hero unibody form, lots of negative space, machined cavity
      const portrait = H > W;
      const uw = (portrait ? W * 0.46 : W * 0.4) * (1 + r() * 0.1);
      const uh = (portrait ? H * 0.62 : H * 0.56) * (1 + r() * 0.1);
      const ux = (W - uw) / 2 + (r() - 0.5) * W * 0.04;
      const uy = (H - uh) / 2 + (r() - 0.5) * H * 0.04;
      contact(x, W / 2, uy + uh + S * 0.04, uw * 0.6, uh * 0.13, 0.36);
      const isPlastic = r() < 0.3;
      if (isPlastic) plasticPart(x, ux, uy, uw, uh, S * 0.1, pal, r, r() < 0.4);
      else metalPanel(x, ux, uy, uw, uh, S * 0.1, Math.PI / 2, pal, r, { grainDens: 260 });
      // machined recessed cavity (impossible: a clean blind pocket with a loop slot)
      const cw = uw * 0.5, ch = uh * 0.4;
      const ccx = ux + uw / 2, ccy = uy + uh * (0.38 + r() * 0.12);
      x.save();
      rr(x, ccx - cw / 2, ccy - ch / 2, cw, ch, S * 0.04); x.clip();
      const cg = x.createLinearGradient(0, ccy - ch / 2, 0, ccy + ch / 2);
      cg.addColorStop(0, K.mix(pal.mLo, pal.ink, 0.5)); cg.addColorStop(1, K.mix(pal.mMid, pal.mLo, 0.4));
      x.fillStyle = cg; x.fillRect(ccx - cw / 2, ccy - ch / 2, cw, ch);
      brushGrain(x, ccx - cw / 2, ccy - ch / 2, cw, ch, 1, 0, pal.mEdge, r, 600);
      x.restore();
      // recess inner shadow rim (top dark, bottom light = depth)
      x.save(); rr(x, ccx - cw / 2, ccy - ch / 2, cw, ch, S * 0.04);
      x.lineWidth = 2.4; x.strokeStyle = K.rgba(pal.ink, 0.55); x.stroke();
      rr(x, ccx - cw / 2, ccy - ch / 2 + 2.4, cw, ch, S * 0.04);
      x.lineWidth = 1.2; x.strokeStyle = K.rgba(pal.mEdge, 0.3); x.stroke();
      x.restore();
      // anodized accent: a single recessed pill button inside the cavity
      const bw2 = cw * 0.4, bh2 = ch * 0.16;
      x.save(); rr(x, ccx - bw2 / 2, ccy + ch * 0.12, bw2, bh2, bh2 / 2);
      x.fillStyle = K.rgba(pal.accent, 0.95); x.fill();
      x.lineWidth = 1; x.strokeStyle = K.rgba(pal.ink, 0.4); x.stroke();
      x.restore();
      // a lone countersunk bolt far below the form, on nothing (surreal)
      if (r() < 0.7) countersink(x, W * (0.2 + r() * 0.6), uy + uh + S * 0.14, S * 0.03, pal, r() < 0.5);

    } else { // Lathe
      // turned/cylindrical parts with grooves + anodized rings, on a baseline
      const n = 1 + (r() * 2 | 0);
      const baseY = H * (0.6 + r() * 0.12);
      let xpos = W * (0.5 - n * 0.13);
      for (let i = 0; i < n; i++) {
        const cylW = S * (0.16 + r() * 0.12);
        const cylH = S * (0.34 + r() * 0.3);
        const cx0 = xpos, top = baseY - cylH;
        contact(x, cx0 + cylW / 2, baseY + S * 0.015, cylW * 0.75, S * 0.04, 0.34);
        // cylinder body (horizontal metal ramp = round shading)
        x.save(); rr(x, cx0, top, cylW, cylH, cylW * 0.12); x.clip();
        const cg = x.createLinearGradient(cx0, 0, cx0 + cylW, 0);
        cg.addColorStop(0, K.mix(pal.mLo, pal.ink, 0.3)); cg.addColorStop(0.2, pal.mMid);
        cg.addColorStop(0.42, K.mix(pal.mHi, pal.mMid, 0.2)); cg.addColorStop(0.6, pal.mMid);
        cg.addColorStop(1, K.mix(pal.mLo, pal.ink, 0.4));
        x.fillStyle = cg; x.fillRect(cx0, top, cylW, cylH);
        brushGrain(x, cx0, top, cylW, cylH, 0, 1, pal.mEdge, r, 360);
        // turning grooves (horizontal rings)
        const gn = 4 + (r() * 5 | 0);
        for (let g = 0; g < gn; g++) {
          const gy = top + cylH * (0.1 + g * (0.8 / gn));
          x.fillStyle = K.rgba(pal.ink, 0.4); x.fillRect(cx0, gy, cylW, 2);
          x.fillStyle = K.rgba(pal.mEdge, 0.25); x.fillRect(cx0, gy + 2, cylW, 1);
        }
        x.restore();
        // top cap ellipse (turned face)
        x.save();
        x.fillStyle = K.mix(pal.mHi, pal.mMid, 0.3);
        x.beginPath(); x.ellipse(cx0 + cylW / 2, top, cylW / 2, cylW * 0.14, 0, 0, 7); x.fill();
        x.lineWidth = 1.4; x.strokeStyle = K.rgba(pal.mEdge, 0.5); x.stroke();
        // concentric turned grooves on cap + center bore
        x.lineWidth = 1; x.strokeStyle = K.rgba(pal.ink, 0.35);
        for (let cr = cylW * 0.4; cr > cylW * 0.08; cr -= cylW * 0.1) {
          x.beginPath(); x.ellipse(cx0 + cylW / 2, top, cr, cr * 0.28, 0, 0, 7); x.stroke();
        }
        x.restore();
        // anodized ring band around the cylinder
        const ringY = top + cylH * (0.3 + r() * 0.4);
        x.fillStyle = K.rgba(pal.accent, 0.92);
        x.fillRect(cx0, ringY, cylW, S * 0.022);
        x.fillStyle = K.rgba(pal.ink, 0.25); x.fillRect(cx0, ringY + S * 0.022, cylW, 1.5);
        // knurled grip band on some
        if (r() < 0.5) knurl(x, cx0, top + cylH * (0.62 + r() * 0.2), cylW, S * 0.05, pal, r);
        // outline
        x.save(); rr(x, cx0, top, cylW, cylH, cylW * 0.12);
        x.lineWidth = 1.2; x.strokeStyle = K.rgba(pal.ink, 0.4); x.stroke(); x.restore();
        xpos += cylW + S * (0.05 + r() * 0.06);
      }
      // baseline machined ground edge (subtle)
      x.fillStyle = K.rgba(pal.ink, 0.2); x.fillRect(0, baseY, W, 2);
    }

    // ───────────────────── ATMOSPHERE & TEXTURE GRADE ─────────────────────
    // subtle anodized-tinted haze for depth
    const hazeCol = K.mix(pal.bg[0], pal.accent, 0.12);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.10, S * 1.1, 'screen');
    // overall blasted-finish mottle on the whole frame (very faint)
    K.mottle(x, 0, 0, W, H, pal.mMid, 200, r, 'soft-light');
    // film grain + vignette for premium textured grade
    K.grain(x, W, H, 6.5, r);
    K.vignette(x, W, H, 0.36);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    const finishMap = {
      'Graphite': 'Anodized', 'Space Grey': 'Anodized', 'Natural': 'Raw Mill',
      'Gold Anod': 'Champagne', 'Bead Blast': 'Bead Blast', 'Gunmetal': 'Brushed',
    };
    return { Palette: pal.name, Mode: mode, Format: f, Finish: finishMap[pal.name] };
  }

  return { name: 's04_aluminium', draw, traits };
})();
