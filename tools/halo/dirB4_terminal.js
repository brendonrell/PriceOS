/* TERMINAL v4 — break the black-bg/neon formula.
 * Most palettes now have BRIGHT or SATURATED grounds (black-on-yellow hazard,
 * light concrete OS, amber flood, acid lime, cyan print) so it reads nothing
 * like the dark Arcology city. Bold graphic poster treatment on light grounds
 * (heavy ink, big type, halftone), neon treatment only on the few dark ones. */
window.ENGINE = (function () {
  const K = window.KIT;

  // dark:false => BRIGHT/SATURATED ground, dark ink, no glow (poster look).
  // NO black backgrounds. Every ground is bright or saturated; dark/contrast ink.
  const PALS = [
    { name: 'Hazard',       bg: '#f2d400', dim: '#7a6c00', hot: '#e2231a', txt: '#0c0c00', alt: '#0c0c00', warn: '#e2231a', dark: false },
    { name: 'Bone OS',      bg: '#dde1e6', dim: '#8a93a0', hot: '#0a5cff', txt: '#11151c', alt: '#11151c', warn: '#e2231a', dark: false },
    { name: 'Amber Flood',  bg: '#e07814', dim: '#7a3e00', hot: '#103a6a', txt: '#2a1200', alt: '#fff2c0', warn: '#d61a2b', dark: false },
    { name: 'Acid Wash',    bg: '#c6e618', dim: '#5a7012', hot: '#ff2d8a', txt: '#13280a', alt: '#13280a', warn: '#ff2d8a', dark: false },
    { name: 'Cyan Print',   bg: '#d6ebef', dim: '#7aa6ae', hot: '#e2231a', txt: '#06242c', alt: '#06242c', warn: '#d61a2b', dark: false },
    { name: 'Signal Red',   bg: '#d61a2b', dim: '#7a0c14', hot: '#ffd400', txt: '#fff0e0', alt: '#fff0e0', warn: '#ffffff', dark: false },
    { name: 'Electric Teal',bg: '#16c0c0', dim: '#0a5a5a', hot: '#ff2d8a', txt: '#06303a', alt: '#06303a', warn: '#ffffff', dark: false },
    { name: 'Klein Blue',   bg: '#1f44d0', dim: '#0a2080', hot: '#ffd400', txt: '#eaf0ff', alt: '#eaf0ff', warn: '#ff5db0', dark: false },
  ];
  const FMTS = [ { W: 1320, H: 1320, t: 'Screen' }, { W: 1500, H: 1120, t: 'Console' }, { W: 1120, H: 1500, t: 'Stack' } ];
  const LAYOUTS = ['Boot', 'Flood', 'Breach', 'Dossier', 'Map', 'Alert'];
  const GLY = '0123456789ABCDEF░▒▓█▌▐│┤╡╢╖╕╣║╗╝┐└┴┬├─┼╞╟╚╔╩╦╠═╬⌐¬∷∴◊◆◇▮▯ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎ';

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    return { pal, fmt: K.pick(FMTS, r), layout: K.pick(LAYOUTS, r), cols: K.rint(r, 14, 30) };
  }
  function traits(seed) { const p = params(K.rng(seed)); return { Palette: p.pal.name, Format: p.fmt.t, Layout: p.layout, Density: p.cols >= 22 ? 'Dense' : 'Sparse' }; }
  const add = (x, P) => { if (P.dark) x.globalCompositeOperation = 'lighter'; };

  function halftone(x, W, H, ink, r) { // print texture for light grounds
    x.save(); x.globalCompositeOperation = 'multiply';
    const g = 6; for (let y = 0; y < H; y += g) for (let xx = 0; xx < W; xx += g) { const rad = 0.4 + r() * 1.1; x.fillStyle = K.rgba(ink, 0.05 + r() * 0.05); x.beginPath(); x.arc(xx, y, rad, 0, Math.PI * 2); x.fill(); } x.restore();
  }

  function ground(x, P, W, H, r) {
    if (P.dark) { const g = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75); g.addColorStop(0, K.mix(P.bg, P.dim, 0.6)); g.addColorStop(1, P.bg); x.fillStyle = g; x.fillRect(0, 0, W, H); return; }
    // bright/saturated ground + bold blocks + grid + halftone
    x.fillStyle = P.bg; x.fillRect(0, 0, W, H);
    x.strokeStyle = K.rgba(P.txt, 0.08); x.lineWidth = 1; const gg = W / 30; for (let i = 0; i < W; i += gg) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j < H; j += gg) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
    // a couple of bold ink blocks for graphic weight
    for (let i = 0; i < K.rint(r, 1, 3); i++) { x.fillStyle = K.rgba(i === 0 ? P.hot : P.txt, 0.9); const bw = W * (0.18 + r() * 0.3), bh = H * (0.02 + r() * 0.03); x.fillRect(W * (0.05 + r() * 0.4), H * (0.04 + r() * 0.86), bw, bh); }
  }

  function glyphRain(x, P, W, H, cols, alpha, r) {
    const cw = W / cols, fs = cw * 0.82; x.font = `${fs}px monospace`; x.textBaseline = 'top';
    for (let c = 0; c < cols; c++) { const cx = c * cw + cw * 0.12; const head = r() * H, len = H * (0.4 + r() * 0.9), step = fs * 1.06;
      for (let y = -H * 0.2; y < H; y += step) { const d = ((y - head) % len + len) % len / len; const a = (1 - d) * alpha * (0.5 + r() * 0.5); if (a < 0.05) continue;
        const col = d < 0.06 ? P.alt : (r() < 0.12 ? P.warn : P.txt); x.save(); add(x, P); x.fillStyle = K.rgba(col, a * (d < 0.06 ? 1 : 0.7)); x.fillText(GLY[Math.floor(r() * GLY.length)], cx, y); x.restore(); } }
  }

  function mark(x, P, cx, cy, rad, col, a) { // glow on dark, solid ink dot on light
    if (P.dark) { K.bloom(x, cx, cy, rad, col, a); }
    else { x.save(); x.fillStyle = K.rgba(col, Math.min(1, a + 0.3)); x.beginPath(); x.arc(cx, cy, Math.max(2, rad * 0.18), 0, Math.PI * 2); x.fill(); x.restore(); }
  }

  function panel(x, P, px, py, pw, ph, r, big) {
    x.save();
    x.fillStyle = P.dark ? K.rgba(P.bg, 0.55) : K.rgba('#ffffff', P.bg === '#dde1e6' || P.bg === '#d6ebef' ? 0.5 : 0.14);
    x.fillRect(px, py, pw, ph);
    x.strokeStyle = K.rgba(P.dark ? P.hot : P.txt, P.dark ? 0.7 : 0.9); x.lineWidth = big ? 3 : 1.8; x.strokeRect(px, py, pw, ph);
    const b = Math.min(pw, ph) * 0.16; x.lineWidth = big ? 3 : 2; x.strokeStyle = K.rgba(P.dark ? P.alt : P.hot, 0.9);
    [[px, py, 1, 1], [px + pw, py, -1, 1], [px, py + ph, 1, -1], [px + pw, py + ph, -1, -1]].forEach(([ax, ay, sx, sy]) => { x.beginPath(); x.moveTo(ax + sx * b, ay); x.lineTo(ax, ay); x.lineTo(ax, ay + sy * b); x.stroke(); });
    x.fillStyle = K.rgba(P.hot, P.dark ? 0.2 : 0.9); x.fillRect(px, py, pw, ph * 0.1);
    const kind = r(); x.save(); add(x, P);
    if (kind < 0.38) { x.strokeStyle = K.rgba(P.hot, 0.95); x.lineWidth = big ? 2.4 : 1.6; x.beginPath(); const my = py + ph * 0.58, amp = ph * 0.32; for (let i = 0; i <= 90; i++) { const t = i / 90, xx = px + 6 + t * (pw - 12), yy = my + Math.sin(t * Math.PI * (4 + r() * 9) + r()) * amp * Math.sin(t * Math.PI); i === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy); } x.stroke(); }
    else if (kind < 0.7) { const n = K.rint(r, 6, 13), bw = (pw - 12) / n; for (let i = 0; i < n; i++) { const bh = (ph * 0.72) * (0.1 + r()); x.fillStyle = K.rgba(r() < 0.22 ? P.warn : (P.dark ? P.hot : P.txt), P.dark ? 0.65 + r() * 0.35 : 0.85); x.fillRect(px + 6 + i * bw, py + ph - 6 - bh, bw * 0.7, bh); } }
    else { const rows = K.rint(r, 3, 6); for (let i = 0; i < rows; i++) { const ry = py + ph * 0.2 + i * (ph * 0.7 / rows); let c = px + 6; while (c < px + pw - 8) { const w = 4 + r() * pw * 0.24, red = r() < 0.18; x.fillStyle = K.rgba(red ? P.warn : (r() < 0.5 ? P.txt : (P.dark ? P.alt : P.hot)), red ? 0.85 : 0.45 + r() * 0.4); x.fillRect(c, ry, w, ph * 0.7 / rows * 0.5); c += w + 4 + r() * 8; } } }
    x.restore(); x.restore();
  }

  function bigGlyphs(x, P, W, H, str, col, r) {
    const fs = W * (0.13 + r() * 0.06); x.font = `bold ${fs}px monospace`; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.save(); add(x, P); const y = H * (0.4 + r() * 0.2);
    x.fillStyle = K.rgba(col, P.dark ? 0.9 : 1); x.fillText(str, W / 2, y);
    x.restore(); x.textAlign = 'left';
  }

  function reticle(x, P, cx, cy, rad, r) {
    x.save(); add(x, P); x.strokeStyle = K.rgba(P.dark ? P.alt : P.txt, 0.85); x.lineWidth = P.dark ? 1.4 : 2;
    for (const rr of [rad, rad * 0.62, rad * 0.3]) { x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke(); }
    const ticks = 48; for (let i = 0; i < ticks; i++) { const a = i / ticks * Math.PI * 2, l = i % 4 === 0 ? rad * 0.12 : rad * 0.05; x.beginPath(); x.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.lineTo(cx + Math.cos(a) * (rad + l), cy + Math.sin(a) * (rad + l)); x.stroke(); }
    x.strokeStyle = K.rgba(P.hot, 0.7); x.beginPath(); x.moveTo(cx - rad * 1.3, cy); x.lineTo(cx + rad * 1.3, cy); x.moveTo(cx, cy - rad * 1.3); x.lineTo(cx, cy + rad * 1.3); x.stroke();
    const sa = r() * Math.PI * 2; const sg = x.createLinearGradient(cx, cy, cx + Math.cos(sa) * rad, cy + Math.sin(sa) * rad); sg.addColorStop(0, K.rgba(P.hot, 0.6)); sg.addColorStop(1, K.rgba(P.hot, 0)); x.strokeStyle = sg; x.lineWidth = 4; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(sa) * rad, cy + Math.sin(sa) * rad); x.stroke();
    x.restore();
  }

  function gridScatter(x, P, W, H, n, r, fn) {
    const cols = K.rint(r, 3, 5), rows = K.rint(r, 3, 5), pad = W * 0.05; const cw = (W - pad * 2) / cols, ch = (H - pad * 2) / rows;
    const cells = []; for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) cells.push([cx, cy]);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    for (let i = 0; i < Math.min(n, cells.length); i++) { const [cx, cy] = cells[i]; fn(pad + cx * cw + cw * 0.06, pad + cy * ch + ch * 0.06, cw * 0.88, ch * 0.88); }
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    ground(x, P, W, H, r);

    switch (p.layout) {
      case 'Boot':
        glyphRain(x, { ...P, txt: P.dim, alt: P.txt, warn: P.dim }, W, H, Math.floor(p.cols * 0.5), P.dark ? 0.4 : 0.5, r);
        bigGlyphs(x, P, W, H, K.pick(['BOOT', 'INIT', 'LOAD', 'WAKE', 'ONLINE'], r), P.hot, r);
        for (let i = 0; i < 2; i++) { const bw = W * 0.5, bx = W * 0.25, by = H * (0.62 + i * 0.08); x.strokeStyle = K.rgba(P.dark ? P.hot : P.txt, 0.8); x.lineWidth = 2; x.strokeRect(bx, by, bw, H * 0.02); x.fillStyle = K.rgba(P.hot, 0.85); x.fillRect(bx, by, bw * r(), H * 0.02); }
        break;
      case 'Flood':
        glyphRain(x, { ...P, txt: P.dim, alt: P.txt, warn: P.dim }, W, H, p.cols, P.dark ? 0.5 : 0.55, r);
        glyphRain(x, P, W, H, Math.floor(p.cols * 0.8), P.dark ? 0.9 : 0.8, r);
        if (r() < 0.6) panel(x, P, W * 0.3, H * 0.4, W * 0.4, H * 0.2, r, true);
        break;
      case 'Breach':
        glyphRain(x, P, W, H, Math.floor(p.cols * 0.7), 0.7, r);
        for (let i = 0; i < K.rint(r, 8, 16); i++) { const bx = r() * W, by = r() * H, bw = W * (0.05 + r() * 0.25), bh = H * (0.01 + r() * 0.05); x.save(); add(x, P); x.fillStyle = K.rgba(r() < 0.3 ? P.warn : P.hot, P.dark ? 0.4 + r() * 0.5 : 0.85); x.fillRect(bx, by, bw, bh); x.restore(); }
        bigGlyphs(x, P, W, H, K.pick(['BREACH', 'ACCESS', '!ERR', 'NULL'], r), P.warn, r);
        break;
      case 'Dossier':
        glyphRain(x, { ...P, txt: P.dim, alt: P.txt, warn: P.dim }, W, H, Math.floor(p.cols * 0.5), 0.3, r);
        panel(x, P, W * 0.06, H * 0.08, W * 0.42, H * 0.5, r, true);
        gridScatter(x, P, W, H, K.rint(r, 4, 7), r, (px, py, pw, ph) => panel(x, P, px, py, pw, ph, r, false));
        if (r() < 0.6) reticle(x, P, W * 0.72, H * 0.7, W * 0.15, r);
        break;
      case 'Map':
        x.strokeStyle = K.rgba(P.dim, 0.6); x.lineWidth = 1; { const g = W / 24; for (let i = 0; i < W; i += g) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j < H; j += g) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); } }
        x.save(); add(x, P);
        for (let i = 0; i < K.rint(r, 26, 48); i++) { const nx = r() * W, ny = r() * H; mark(x, P, nx, ny, 6 + r() * 16, r() < 0.2 ? P.warn : P.hot, 0.7); if (r() < 0.6) { const tx = r() * W, ty = r() * H; x.strokeStyle = K.rgba(P.dark ? P.hot : P.txt, 0.3); x.beginPath(); x.moveTo(nx, ny); x.lineTo(tx, ty); x.stroke(); } }
        x.restore();
        reticle(x, P, W * (0.3 + r() * 0.4), H * (0.3 + r() * 0.4), W * 0.13, r);
        gridScatter(x, P, W, H, K.rint(r, 3, 5), r, (px, py, pw, ph) => panel(x, P, px, py, pw, ph * 0.6, r, false));
        break;
      case 'Alert':
        x.save(); add(x, P); x.fillStyle = K.rgba(P.warn, P.dark ? 0.06 : 0.12); x.fillRect(0, 0, W, H); x.restore();
        for (let i = 0; i < H; i += H * 0.12) { x.fillStyle = K.rgba(i % (H * 0.24) < H * 0.12 ? P.warn : P.hot, P.dark ? 0.05 : 0.12); x.fillRect(0, i, W, H * 0.06); }
        glyphRain(x, { ...P, txt: P.warn, alt: P.alt }, W, H, Math.floor(p.cols * 0.6), 0.5, r);
        bigGlyphs(x, P, W, H, K.pick(['ALERT', 'WARN', 'LOCK', '⚠'], r), P.warn, r);
        panel(x, P, W * 0.2, H * 0.66, W * 0.6, H * 0.16, r, true);
        break;
    }

    // finish — neon CRT on dark; bold print on light
    if (P.dark) {
      K.scanlines(x, W, H, 3, 0.16); K.chromaSplit(x, W, H, p.layout === 'Breach' ? 3 : 1);
      const noise = K.makeNoise(seed); K.hazeSheet(x, W, H, noise, P.hot, 0.05, 240, 'screen');
      K.grain(x, W, H, 480, r); K.vignette(x, W, H, 0.46);
    } else {
      K.scanlines(x, W, H, 3, 0.05); halftone(x, W, H, P.txt, r); K.grain(x, W, H, 900, r);
      x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.16); x.restore();
    }
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'B4_terminal', draw, traits };
})();
