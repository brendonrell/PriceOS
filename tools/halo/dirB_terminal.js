/* DIRECTION B — TERMINAL
 * A cyberpunk operator's screen as art: a deep wall of scrolling glyph columns,
 * data-dense HUD reticles + bracket frames + readout panels + oscilloscope
 * traces + redacted blocks, graded onto CRT phosphor with scanlines, bloom,
 * chromatic aberration and fog. Busy, on-brand "terminal." */
window.ENGINE = (function () {
  const K = window.KIT;

  const PALS = [
    { name: 'Phosphor',   bg: '#02160b', dim: '#0b3d2e', hot: '#5bff9e', txt: '#1fbf6b', alt: '#c8ffe0', warn: '#ff5d5d' },
    { name: 'Toxic Acid', bg: '#0a1200', dim: '#1a2e05', hot: '#c6ff00', txt: '#9be600', alt: '#e8ff6b', warn: '#ff2dba' },
    { name: 'Deep Cyber', bg: '#040a1a', dim: '#0b2545', hot: '#3de0e8', txt: '#1fa7b8', alt: '#7cf6ff', warn: '#ffb020' },
    { name: 'Magenta',    bg: '#08000a', dim: '#1a0322', hot: '#ff4fd8', txt: '#b026ff', alt: '#ff9be8', warn: '#3df0ff' },
    { name: 'Sodium',     bg: '#100800', dim: '#2b1600', hot: '#ffc000', txt: '#ffa300', alt: '#ffe08a', warn: '#34e0d0' },
    { name: 'Ice Break',  bg: '#03060f', dim: '#0a2036', hot: '#8fd6ff', txt: '#3d8fff', alt: '#d6ecff', warn: '#ff5db0' },
  ];
  const FMTS = [ { W: 1320, H: 1320, t: 'Screen' }, { W: 1480, H: 1120, t: 'Console' }, { W: 1120, H: 1480, t: 'Stack' } ];
  const MODES = ['Boot', 'Trace', 'Breach', 'Idle'];
  const GLY = '0123456789ABCDEF░▒▓█▌▐│┤╡╢╖╕╣║╗╝┐└┴┬├─┼╞╟╚╔╩╦╠═╬⌐¬∷∴⟁⟐◊◆◇▮▯ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎ';

  function params(r) {
    return { pal: K.pick(PALS, r), fmt: K.pick(FMTS, r), mode: K.pick(MODES, r), cols: K.rint(r, 14, 26), panels: K.rint(r, 3, 6) };
  }
  function traits(seed) { const p = params(K.rng(seed)); return { Palette: p.pal.name, Format: p.fmt.t, Mode: p.mode, Density: p.cols >= 21 ? 'Dense' : 'Sparse' }; }

  function glyphRain(x, P, W, H, cols, r) {
    const cw = W / cols, fs = cw * 0.82;
    x.font = `${fs}px monospace`; x.textBaseline = 'top';
    for (let c = 0; c < cols; c++) {
      const cx = c * cw + cw * 0.12;
      const head = r() * H, len = H * (0.4 + r() * 0.9), step = fs * 1.06;
      for (let y = -H * 0.2; y < H; y += step) {
        const d = ((y - head) % len + len) % len / len; // 0 at head → 1 at tail
        const a = (1 - d) * (0.5 + r() * 0.5);
        if (a < 0.04) continue;
        const ch = GLY[Math.floor(r() * GLY.length)];
        const col = d < 0.06 ? P.alt : (r() < 0.12 ? P.warn : P.txt);
        x.save(); if (d < 0.1) x.globalCompositeOperation = 'lighter';
        x.fillStyle = K.rgba(col, a * (d < 0.06 ? 1 : 0.7)); x.fillText(ch, cx, y);
        x.restore();
      }
    }
  }

  function panel(x, P, px, py, pw, ph, r) {
    x.save();
    x.fillStyle = K.rgba(P.bg, 0.55); x.fillRect(px, py, pw, ph);
    x.strokeStyle = K.rgba(P.hot, 0.6); x.lineWidth = 1.3; x.strokeRect(px, py, pw, ph);
    // bracket corners
    const b = Math.min(pw, ph) * 0.16; x.lineWidth = 2; x.strokeStyle = K.rgba(P.alt, 0.85);
    [[px, py, 1, 1], [px + pw, py, -1, 1], [px, py + ph, 1, -1], [px + pw, py + ph, -1, -1]].forEach(([ax, ay, sx, sy]) => {
      x.beginPath(); x.moveTo(ax + sx * b, ay); x.lineTo(ax, ay); x.lineTo(ax, ay + sy * b); x.stroke();
    });
    // title bar
    x.fillStyle = K.rgba(P.hot, 0.18); x.fillRect(px, py, pw, ph * 0.12);
    // content: bars / oscilloscope / readout rows
    const kind = r();
    if (kind < 0.4) { // oscilloscope
      x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = K.rgba(P.hot, 0.9); x.lineWidth = 1.4;
      x.beginPath(); const my = py + ph * 0.58, amp = ph * 0.3;
      for (let i = 0; i <= 80; i++) { const t = i / 80, xx = px + 6 + t * (pw - 12); const yy = my + Math.sin(t * Math.PI * (4 + r() * 8) + r()) * amp * (0.4 + r() * 0.6) * Math.sin(t * Math.PI); i === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy); }
      x.stroke(); x.restore();
    } else if (kind < 0.72) { // bar graph
      const n = K.rint(r, 5, 11), bw = (pw - 12) / n;
      for (let i = 0; i < n; i++) { const bh = (ph * 0.7) * (0.1 + r()); x.fillStyle = K.rgba(r() < 0.2 ? P.warn : P.txt, 0.6 + r() * 0.4); x.fillRect(px + 6 + i * bw, py + ph - 6 - bh, bw * 0.7, bh); }
    } else { // readout rows + redaction
      const rows = K.rint(r, 3, 6);
      for (let i = 0; i < rows; i++) { const ry = py + ph * 0.2 + i * (ph * 0.7 / rows); let cxp = px + 6; while (cxp < px + pw - 8) { const w = 4 + r() * pw * 0.22; const red = r() < 0.18; x.fillStyle = K.rgba(red ? P.warn : (r() < 0.5 ? P.txt : P.alt), red ? 0.7 : 0.4 + r() * 0.4); x.fillRect(cxp, ry, w, ph * 0.7 / rows * 0.5); cxp += w + 4 + r() * 8; } }
    }
    x.restore();
  }

  function reticle(x, P, cx, cy, rad, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    K.bloom(x, cx, cy, rad * 1.4, P.hot, 0.16);
    x.strokeStyle = K.rgba(P.alt, 0.8); x.lineWidth = 1.2;
    for (const rr of [rad, rad * 0.66, rad * 0.34]) { x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke(); }
    // tick ring
    const ticks = 48; for (let i = 0; i < ticks; i++) { const a = i / ticks * Math.PI * 2, l = i % 4 === 0 ? rad * 0.12 : rad * 0.05; x.beginPath(); x.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.lineTo(cx + Math.cos(a) * (rad + l), cy + Math.sin(a) * (rad + l)); x.stroke(); }
    // crosshair
    x.strokeStyle = K.rgba(P.hot, 0.7); x.beginPath(); x.moveTo(cx - rad * 1.2, cy); x.lineTo(cx + rad * 1.2, cy); x.moveTo(cx, cy - rad * 1.2); x.lineTo(cx, cy + rad * 1.2); x.stroke();
    // sweep
    const sa = r() * Math.PI * 2; const sg = x.createLinearGradient(cx, cy, cx + Math.cos(sa) * rad, cy + Math.sin(sa) * rad); sg.addColorStop(0, K.rgba(P.hot, 0.5)); sg.addColorStop(1, K.rgba(P.hot, 0)); x.strokeStyle = sg; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(sa) * rad, cy + Math.sin(sa) * rad); x.stroke();
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    // ground
    const g = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, K.mix(P.bg, P.dim, 0.6)); g.addColorStop(1, P.bg); x.fillStyle = g; x.fillRect(0, 0, W, H);

    // far dim glyph rain (depth tier 1)
    x.save(); x.globalAlpha = 0.5; glyphRain(x, { ...P, txt: P.dim, alt: P.txt, warn: P.dim }, W, H, p.cols, r); x.restore();
    K.hazeSheet(x, W, H, noise, P.dim, 0.35, 140, 'screen');
    // mid glyph rain (tier 2)
    glyphRain(x, P, W, H, Math.floor(p.cols * 0.7), r);

    // HUD panels on a loose grid (governed chaos)
    for (let i = 0; i < p.panels; i++) {
      const pw = W * (0.16 + r() * 0.22), ph = H * (0.12 + r() * 0.2);
      const px = W * (0.04 + r() * 0.72), py = H * (0.06 + r() * 0.74);
      panel(x, P, Math.min(px, W - pw - 8), Math.min(py, H - ph - 8), pw, ph, r);
    }

    // focal reticle (one hero anchor) for non-Idle modes
    if (p.mode !== 'Idle') reticle(x, P, W * (0.32 + r() * 0.36), H * (0.34 + r() * 0.3), Math.min(W, H) * (0.16 + r() * 0.08), r);

    // breach mode: glitch slice displacement
    if (p.mode === 'Breach') {
      const slices = K.rint(r, 5, 12);
      for (let i = 0; i < slices; i++) { const sy = r() * H, sh = 6 + r() * 40, off = (r() - 0.5) * W * 0.12; try { const im = x.getImageData(0, sy, W, sh); x.putImageData(im, off, sy); } catch (e) {} }
    }

    // CRT finish: scanlines, chroma split, fog, grain, vignette
    K.scanlines(x, W, H, 3, p.mode === 'Boot' ? 0.10 : 0.18);
    K.chromaSplit(x, W, H, p.mode === 'Breach' ? 3 : 1);
    K.hazeSheet(x, W, H, noise, P.hot, 0.07, 240, 'screen');
    K.grain(x, W, H, 480, r);
    K.vignette(x, W, H, 0.5);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'B_terminal', draw, traits };
})();
