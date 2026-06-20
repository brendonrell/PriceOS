/* TERMINAL v2 — a bright, high-contrast cyberpunk operator's console.
 * Identity vs the others: FLAT graphic punch (minimal haze), text/UI driven,
 * high-key palettes incl. CP2077 yellow/red/white — not the moody city look.
 * Six STRUCTURALLY distinct layouts (not the same screen reskinned) + a wide
 * palette range = high variance within the set. */
window.ENGINE = (function () {
  const K = window.KIT;

  // bright + dark range. CP2077 leans black/yellow/red/white.
  const PALS = [
    { name: 'Yellow Alert', bg: '#0a0900', dim: '#2b2400', hot: '#ffe11f', txt: '#ffd400', alt: '#fff6b0', warn: '#ff2d2d', bright: true },
    { name: 'Red Team',     bg: '#0c0203', dim: '#2e0608', hot: '#ff3b3b', txt: '#ff5c4d', alt: '#ffd9cf', warn: '#ffe23d', bright: true },
    { name: 'Hazard',       bg: '#0a0a02', dim: '#262300', hot: '#f5ff1f', txt: '#d6e000', alt: '#ffffff', warn: '#ff7a00', bright: true },
    { name: 'Amber CRT',    bg: '#100800', dim: '#2b1600', hot: '#ffc000', txt: '#ffa300', alt: '#ffe08a', warn: '#34e0d0', bright: true },
    { name: 'Phosphor',     bg: '#02160b', dim: '#0b3d2e', hot: '#5bff9e', txt: '#1fbf6b', alt: '#c8ffe0', warn: '#ff5d5d', bright: false },
    { name: 'Deep Cyber',   bg: '#040a1a', dim: '#0b2545', hot: '#3de0e8', txt: '#1fa7b8', alt: '#7cf6ff', warn: '#ffb020', bright: false },
    { name: 'Magenta',      bg: '#08000a', dim: '#1a0322', hot: '#ff4fd8', txt: '#b026ff', alt: '#ff9be8', warn: '#ffe23d', bright: false },
    { name: 'Schematic',    bg: '#050a16', dim: '#0d2240', hot: '#2af0ff', txt: '#3da8ff', alt: '#d6f4ff', warn: '#ff5db0', bright: true, grid: true },
  ];
  const FMTS = [ { W: 1320, H: 1320, t: 'Screen' }, { W: 1500, H: 1120, t: 'Console' }, { W: 1120, H: 1500, t: 'Stack' } ];
  const LAYOUTS = ['Boot', 'Flood', 'Breach', 'Dossier', 'Map', 'Alert'];
  const GLY = '0123456789ABCDEF░▒▓█▌▐│┤╡╢╖╕╣║╗╝┐└┴┬├─┼╞╟╚╔╩╦╠═╬⌐¬∷∴◊◆◇▮▯ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎ';

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    return { pal, fmt: K.pick(FMTS, r), layout: K.pick(LAYOUTS, r), cols: K.rint(r, 14, 30), seedFlip: r() };
  }
  function traits(seed) { const p = params(K.rng(seed)); return { Palette: p.pal.name, Format: p.fmt.t, Layout: p.layout, Density: p.cols >= 22 ? 'Dense' : 'Sparse' }; }

  function ground(x, P, W, H, r) {
    const g = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, K.mix(P.bg, P.dim, 0.6)); g.addColorStop(1, P.bg); x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (P.grid) { // dark navy schematic grid (replaces the old light blueprint)
      x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = K.rgba(P.dim, 0.7); x.lineWidth = 1; const gg = W / 32;
      for (let i = 0; i < W; i += gg) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
      for (let j = 0; j < H; j += gg) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
      x.strokeStyle = K.rgba(P.txt, 0.18); for (let i = 0; i < W; i += gg * 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } x.restore();
    }
  }

  function glyphRain(x, P, W, H, cols, alpha, r) {
    const cw = W / cols, fs = cw * 0.82; x.font = `${fs}px monospace`; x.textBaseline = 'top';
    for (let c = 0; c < cols; c++) { const cx = c * cw + cw * 0.12; const head = r() * H, len = H * (0.4 + r() * 0.9), step = fs * 1.06;
      for (let y = -H * 0.2; y < H; y += step) { const d = ((y - head) % len + len) % len / len; const a = (1 - d) * alpha * (0.5 + r() * 0.5); if (a < 0.04) continue;
        const col = d < 0.06 ? P.alt : (r() < 0.12 ? P.warn : P.txt); x.save(); if (d < 0.1 && !P.light) x.globalCompositeOperation = 'lighter'; x.fillStyle = K.rgba(col, a * (d < 0.06 ? 1 : 0.7)); x.fillText(GLY[Math.floor(r() * GLY.length)], cx, y); x.restore(); } }
  }

  function panel(x, P, px, py, pw, ph, r, big) {
    x.save();
    x.fillStyle = K.rgba(P.light ? P.bg : P.bg, P.light ? 0.4 : 0.55); x.fillRect(px, py, pw, ph);
    x.strokeStyle = K.rgba(P.hot, 0.7); x.lineWidth = big ? 2 : 1.3; x.strokeRect(px, py, pw, ph);
    const b = Math.min(pw, ph) * 0.16; x.lineWidth = big ? 3 : 2; x.strokeStyle = K.rgba(P.alt, 0.9);
    [[px, py, 1, 1], [px + pw, py, -1, 1], [px, py + ph, 1, -1], [px + pw, py + ph, -1, -1]].forEach(([ax, ay, sx, sy]) => { x.beginPath(); x.moveTo(ax + sx * b, ay); x.lineTo(ax, ay); x.lineTo(ax, ay + sy * b); x.stroke(); });
    x.fillStyle = K.rgba(P.hot, P.light ? 0.25 : 0.2); x.fillRect(px, py, pw, ph * 0.1);
    const kind = r(); x.save(); if (!P.light) x.globalCompositeOperation = 'lighter';
    if (kind < 0.38) { x.strokeStyle = K.rgba(P.hot, 0.95); x.lineWidth = big ? 2 : 1.4; x.beginPath(); const my = py + ph * 0.58, amp = ph * 0.32; for (let i = 0; i <= 90; i++) { const t = i / 90, xx = px + 6 + t * (pw - 12), yy = my + Math.sin(t * Math.PI * (4 + r() * 9) + r()) * amp * Math.sin(t * Math.PI); i === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy); } x.stroke(); }
    else if (kind < 0.7) { const n = K.rint(r, 6, 13), bw = (pw - 12) / n; for (let i = 0; i < n; i++) { const bh = (ph * 0.72) * (0.1 + r()); x.fillStyle = K.rgba(r() < 0.22 ? P.warn : P.hot, 0.65 + r() * 0.35); x.fillRect(px + 6 + i * bw, py + ph - 6 - bh, bw * 0.7, bh); } }
    else { const rows = K.rint(r, 3, 6); for (let i = 0; i < rows; i++) { const ry = py + ph * 0.2 + i * (ph * 0.7 / rows); let c = px + 6; while (c < px + pw - 8) { const w = 4 + r() * pw * 0.24, red = r() < 0.18; x.fillStyle = K.rgba(red ? P.warn : (r() < 0.5 ? P.txt : P.alt), red ? 0.8 : 0.4 + r() * 0.4); x.fillRect(c, ry, w, ph * 0.7 / rows * 0.5); c += w + 4 + r() * 8; } } }
    x.restore(); x.restore();
  }

  function bigGlyphs(x, P, W, H, str, r) { // huge boot/alert lettering
    const fs = W * (0.12 + r() * 0.05); x.font = `bold ${fs}px monospace`; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.save(); if (!P.light) x.globalCompositeOperation = 'lighter';
    const y = H * (0.4 + r() * 0.2);
    x.fillStyle = K.rgba(P.hot, 0.9); x.fillText(str, W / 2, y);
    x.restore(); x.textAlign = 'left';
  }

  function reticle(x, P, cx, cy, rad, r) {
    x.save(); if (!P.light) x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.alt, 0.85); x.lineWidth = 1.4;
    for (const rr of [rad, rad * 0.62, rad * 0.3]) { x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke(); }
    const ticks = 48; for (let i = 0; i < ticks; i++) { const a = i / ticks * Math.PI * 2, l = i % 4 === 0 ? rad * 0.12 : rad * 0.05; x.beginPath(); x.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.lineTo(cx + Math.cos(a) * (rad + l), cy + Math.sin(a) * (rad + l)); x.stroke(); }
    x.strokeStyle = K.rgba(P.hot, 0.7); x.beginPath(); x.moveTo(cx - rad * 1.3, cy); x.lineTo(cx + rad * 1.3, cy); x.moveTo(cx, cy - rad * 1.3); x.lineTo(cx, cy + rad * 1.3); x.stroke();
    const sa = r() * Math.PI * 2; const sg = x.createLinearGradient(cx, cy, cx + Math.cos(sa) * rad, cy + Math.sin(sa) * rad); sg.addColorStop(0, K.rgba(P.hot, 0.6)); sg.addColorStop(1, K.rgba(P.hot, 0)); x.strokeStyle = sg; x.lineWidth = 4; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(sa) * rad, cy + Math.sin(sa) * rad); x.stroke();
    x.restore();
  }

  function gridScatter(x, P, W, H, n, r, fn) { // governed chaos on a modular grid
    const cols = K.rint(r, 3, 5), rows = K.rint(r, 3, 5), pad = W * 0.05;
    const cw = (W - pad * 2) / cols, ch = (H - pad * 2) / rows;
    const cells = []; for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) cells.push([cx, cy]);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    for (let i = 0; i < Math.min(n, cells.length); i++) { const [cx, cy] = cells[i]; fn(pad + cx * cw + cw * 0.06, pad + cy * ch + ch * 0.06, cw * 0.88, ch * 0.88); }
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    ground(x, P, W, H, r);

    switch (p.layout) {
      case 'Boot': // sparse, big lettering + a couple loading bars
        glyphRain(x, { ...P, txt: P.dim, alt: P.txt, warn: P.dim }, W, H, Math.floor(p.cols * 0.5), 0.4, r);
        bigGlyphs(x, P, W, H, K.pick(['BOOT', 'INIT', 'LOAD', 'WAKE', 'ONLINE'], r), r);
        for (let i = 0; i < 2; i++) { const bw = W * 0.5, bx = W * 0.25, by = H * (0.62 + i * 0.08); x.strokeStyle = K.rgba(P.hot, 0.7); x.strokeRect(bx, by, bw, H * 0.02); x.fillStyle = K.rgba(P.hot, 0.7); x.fillRect(bx, by, bw * r(), H * 0.02); }
        break;
      case 'Flood': // dense matrix wall
        glyphRain(x, { ...P, txt: P.dim, alt: P.txt, warn: P.dim }, W, H, p.cols, 0.5, r);
        glyphRain(x, P, W, H, Math.floor(p.cols * 0.8), 0.9, r);
        if (r() < 0.6) panel(x, P, W * 0.3, H * 0.4, W * 0.4, H * 0.2, r, true);
        break;
      case 'Breach': // heavy glitch + corrupted blocks + alert
        glyphRain(x, P, W, H, Math.floor(p.cols * 0.7), 0.7, r);
        for (let i = 0; i < K.rint(r, 6, 14); i++) { const bx = r() * W, by = r() * H, bw = W * (0.05 + r() * 0.25), bh = H * (0.01 + r() * 0.05); x.fillStyle = K.rgba(r() < 0.3 ? P.warn : P.hot, 0.4 + r() * 0.5); x.fillRect(bx, by, bw, bh); }
        bigGlyphs(x, { ...P, hot: P.warn }, W, H, K.pick(['BREACH', 'ACCESS', '!ERR', 'NULL'], r), r);
        break;
      case 'Dossier': // big HUD panels dominate, grid-governed
        glyphRain(x, { ...P, txt: P.dim, alt: P.txt, warn: P.dim }, W, H, Math.floor(p.cols * 0.5), 0.3, r);
        panel(x, P, W * 0.06, H * 0.08, W * 0.42, H * 0.5, r, true);
        gridScatter(x, P, W, H, K.rint(r, 4, 7), r, (px, py, pw, ph) => panel(x, P, px, py, pw, ph, r, false));
        if (r() < 0.6) reticle(x, P, W * 0.72, H * 0.7, W * 0.15, r);
        break;
      case 'Map': // wireframe map grid + nodes + readouts
        x.strokeStyle = K.rgba(P.dim, 0.6); x.lineWidth = 1; { const g = W / 24; for (let i = 0; i < W; i += g) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j < H; j += g) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); } }
        x.save(); x.globalCompositeOperation = 'lighter';
        for (let i = 0; i < K.rint(r, 26, 48); i++) { const nx = r() * W, ny = r() * H; K.bloom(x, nx, ny, 6 + r() * 16, r() < 0.2 ? P.warn : P.hot, 0.7); if (r() < 0.6) { const tx = r() * W, ty = r() * H; x.strokeStyle = K.rgba(P.hot, 0.3); x.beginPath(); x.moveTo(nx, ny); x.lineTo(tx, ty); x.stroke(); } }
        x.restore();
        reticle(x, P, W * (0.3 + r() * 0.4), H * (0.3 + r() * 0.4), W * 0.13, r);
        gridScatter(x, P, W, H, K.rint(r, 3, 5), r, (px, py, pw, ph) => panel(x, P, px, py, pw, ph * 0.6, r, false));
        break;
      case 'Alert': // full warning state, big warn glyphs, hazard
        x.fillStyle = K.rgba(P.warn, 0.06); x.fillRect(0, 0, W, H);
        for (let i = 0; i < H; i += H * 0.12) { x.fillStyle = K.rgba(i % (H * 0.24) < H * 0.12 ? P.warn : P.hot, 0.05); x.fillRect(0, i, W, H * 0.06); }
        glyphRain(x, { ...P, txt: P.warn, alt: P.alt }, W, H, Math.floor(p.cols * 0.6), 0.5, r);
        bigGlyphs(x, { ...P, hot: P.warn }, W, H, K.pick(['ALERT', 'WARN', 'LOCK', '⚠'], r), r);
        panel(x, { ...P, hot: P.warn }, W * 0.2, H * 0.66, W * 0.6, H * 0.16, r, true);
        break;
    }

    // finish — punchy, light haze (Terminal is flatter than Arcology)
    K.scanlines(x, W, H, 3, P.light ? 0.06 : 0.16);
    K.chromaSplit(x, W, H, p.layout === 'Breach' ? 3 : 1);
    if (!P.light) { const noise = K.makeNoise(seed); K.hazeSheet(x, W, H, noise, P.hot, 0.05, 240, 'screen'); }
    K.grain(x, W, H, 480, r);
    K.vignette(x, W, H, P.light ? 0.2 : 0.46);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'B2_terminal', draw, traits };
})();
