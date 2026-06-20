/* NETWORK v4 — break the black-bg/neon formula.
 * Half the palettes now have LIGHT or SATURATED grounds: blueprint (dark wires
 * on pale blue), amber-day, acid-lime, concrete — drawn as crisp dark line-work
 * (architectural/PCB diagram), no glow. Dark neon kept for range. */
window.ENGINE = (function () {
  const K = window.KIT;

  // NO black (or near-black) backgrounds. Every ground is bright or saturated.
  const PALS = [
    { name: 'Blueprint',   bg: '#dde7ec', fog: '#c2d2da', edge: '#16455f', node: '#0a2a3a', hot: '#e2231a', pkt: '#0a66ff', dark: false },
    { name: 'Concrete',    bg: '#d6d9de', fog: '#bcc0c8', edge: '#1a2230', node: '#0a0e16', hot: '#0a5cff', pkt: '#e2231a', dark: false },
    { name: 'Acid',        bg: '#c6e618', fog: '#a6c810', edge: '#2a4a0a', node: '#13280a', hot: '#ff2d8a', pkt: '#0a3a14', dark: false },
    { name: 'Amber Day',   bg: '#e08a1a', fog: '#c06e10', edge: '#5a2e00', node: '#2a1400', hot: '#103a6a', pkt: '#b01020', dark: false },
    { name: 'Signal Red',  bg: '#d61a2b', fog: '#a81020', edge: '#ffe9d0', node: '#fff0e0', hot: '#ffd400', pkt: '#2a0006', dark: false },
    { name: 'Viola',       bg: '#7a3ad0', fog: '#5a2aa0', edge: '#e6d8ff', node: '#ffffff', hot: '#ffe11f', pkt: '#2af0ff', dark: false },
    { name: 'Teal Sea',    bg: '#14b0b0', fog: '#0e8a8a', edge: '#06303a', node: '#062028', hot: '#ff2d8a', pkt: '#fff0c0', dark: false },
    { name: 'Magenta Day', bg: '#e01f8a', fog: '#b01070', edge: '#3a0420', node: '#2a0418', hot: '#2af0ff', pkt: '#ffe11f', dark: false },
  ];
  const FMTS = [ { W: 1340, H: 1340, t: 'Field' }, { W: 1500, H: 1120, t: 'Span' }, { W: 1120, H: 1500, t: 'Column' } ];
  const TOPO = ['Core', 'Mesh', 'Spine', 'Circuit', 'Constellation', 'Burst'];
  const TOPO_POOL = ['Core', 'Mesh', 'Spine', 'Spine', 'Circuit', 'Circuit', 'Circuit', 'Constellation', 'Constellation', 'Burst', 'Burst'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    return { pal, fmt: K.pick(FMTS, r), topo: K.pick(TOPO_POOL, r), nodes: K.rint(r, 240, 480) };
  }
  function traits(seed) { const p = params(K.rng(seed)); return { Palette: p.pal.name, Format: p.fmt.t, Topology: p.topo, Scale: p.nodes >= 280 ? 'Dense' : 'Open' }; }
  const add = (x, P) => { if (P.dark) x.globalCompositeOperation = 'lighter'; };

  function halftone(x, W, H, ink, r) { x.save(); x.globalCompositeOperation = 'multiply'; const g = 6; for (let y = 0; y < H; y += g) for (let xx = 0; xx < W; xx += g) { x.fillStyle = K.rgba(ink, 0.04 + r() * 0.05); x.beginPath(); x.arc(xx, y, 0.4 + r() * 1.0, 0, Math.PI * 2); x.fill(); } x.restore(); }

  function packet(x, P, px, py, col) { if (P.dark) K.bloom(x, px, py, 3 + Math.random() * 6, col, 0.9); else { x.fillStyle = K.rgba(col, 0.95); x.beginPath(); x.arc(px, py, 2.4, 0, Math.PI * 2); x.fill(); } }

  function drawEdge(x, P, a, b, alpha, lw, curve, r, col) {
    add(x, P); x.strokeStyle = K.rgba(col || P.edge, P.dark ? alpha : Math.min(0.85, alpha + 0.25)); x.lineWidth = lw; x.beginPath();
    if (curve) { const mx = (a.x + b.x) / 2 + K.randn(r) * 26, my = (a.y + b.y) / 2 + K.randn(r) * 26; x.moveTo(a.x, a.y); x.quadraticCurveTo(mx, my, b.x, b.y); } else { x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); }
    x.stroke();
    if (r() < 0.28) { const t = r(); packet(x, P, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, P.pkt); }
  }
  function drawNode(x, P, n) {
    x.save(); add(x, P); const c = n.col || P.node;
    if (P.dark) { K.bloom(x, n.x, n.y, n.r * (n.hub ? 6 : 3.2), n.hub ? P.hot : c, 0.22 + n.depth * 0.3); x.fillStyle = K.rgba(n.hub ? P.hot : c, 0.7 + n.depth * 0.3); }
    else { x.fillStyle = K.rgba(n.hub ? P.hot : c, 0.95); }
    x.beginPath(); x.arc(n.x, n.y, n.r * (P.dark ? 1 : 1.1), 0, Math.PI * 2); x.fill();
    if (n.hub) { x.strokeStyle = K.rgba(P.dark ? c : P.hot, P.dark ? 0.6 : 0.9); x.lineWidth = P.dark ? 1.3 : 2; x.beginPath(); x.arc(n.x, n.y, n.r * 2.3, 0, Math.PI * 2); x.stroke(); }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const cx = W / 2, cy = H / 2, S = Math.min(W, H);
    if (P.dark) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7); g.addColorStop(0, K.mix(P.bg, P.fog, 0.6)); g.addColorStop(1, K.mix(P.bg, '#000', 0.3)); x.fillStyle = g; x.fillRect(0, 0, W, H); const noise = K.makeNoise(seed); K.hazeSheet(x, W, H, noise, P.fog, 0.28, 170, 'screen'); }
    else { x.fillStyle = P.bg; x.fillRect(0, 0, W, H); x.strokeStyle = K.rgba(P.edge, 0.06); x.lineWidth = 1; const gg = W / 28; for (let i = 0; i < W; i += gg) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j < H; j += gg) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); } }

    if (p.topo === 'Circuit') {
      const step = S / K.rint(r, 16, 26); x.save(); add(x, P); const traces = K.rint(r, 70, 120);
      for (let i = 0; i < traces; i++) { let px = Math.round(r() * W / step) * step, py = Math.round(r() * H / step) * step; x.strokeStyle = K.rgba(P.edge, P.dark ? 0.3 + r() * 0.4 : 0.5 + r() * 0.3); x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(px, py); const segs = K.rint(r, 2, 6); for (let s = 0; s < segs; s++) { if (r() < 0.5) px += (r() < 0.5 ? -1 : 1) * step * K.rint(r, 1, 4); else py += (r() < 0.5 ? -1 : 1) * step * K.rint(r, 1, 4); x.lineTo(px, py); } x.stroke(); packet(x, P, px, py, r() < 0.3 ? P.pkt : P.node); x.fillStyle = K.rgba(P.node, P.dark ? 0.8 : 0.95); x.beginPath(); x.arc(px, py, 2 + r() * 2, 0, Math.PI * 2); x.fill(); }
      for (let i = 0; i < K.rint(r, 14, 30); i++) { const px = Math.round(r() * W / step) * step, py = Math.round(r() * H / step) * step; x.strokeStyle = K.rgba(P.hot, P.dark ? 0.6 : 0.85); x.lineWidth = 2; x.beginPath(); x.arc(px, py, step * 0.3, 0, Math.PI * 2); x.stroke(); if (P.dark) K.bloom(x, px, py, step * 0.6, P.hot, 0.4); }
      x.restore();
    } else {
      const nodes = [];
      for (let i = 0; i < p.nodes; i++) { const tier = K.rint(r, 0, 2), depth = tier / 2; let nx, ny;
        if (p.topo === 'Core') { const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.6) * S * 0.48; nx = cx + Math.cos(a) * rad; ny = cy + Math.sin(a) * rad; }
        else if (p.topo === 'Spine') { const t = r(); nx = W * (0.1 + t * 0.8) + K.randn(r) * W * 0.05; ny = cy + Math.sin(t * Math.PI * 3 + r()) * H * 0.3 + K.randn(r) * H * 0.06; }
        else if (p.topo === 'Burst') { const a = r() * Math.PI * 2, rad = Math.pow(r(), 1.6) * S * 0.5; nx = cx + Math.cos(a) * rad; ny = cy + Math.sin(a) * rad; }
        else if (p.topo === 'Constellation') { const ci = Math.floor(r() * 6); const a = ci / 6 * Math.PI * 2; const ccx = cx + Math.cos(a) * S * 0.3, ccy = cy + Math.sin(a) * S * 0.3; nx = ccx + K.randn(r) * S * 0.12; ny = ccy + K.randn(r) * S * 0.12; }
        else { nx = W * (0.06 + r() * 0.88); ny = H * (0.06 + r() * 0.88); }
        nodes.push({ x: nx, y: ny, depth, r: (1.6 + r() * 4.5) * (0.5 + depth), hub: false, col: P.node });
      }
      const hubCount = p.topo === 'Core' || p.topo === 'Burst' ? 1 : K.rint(r, 4, 9);
      for (let i = 0; i < hubCount; i++) { const n = nodes[Math.floor(r() * nodes.length)]; n.hub = true; n.r *= 2.5; n.depth = 1; }
      if (p.topo === 'Core' || p.topo === 'Burst') { nodes[0].x = cx; nodes[0].y = cy; nodes[0].hub = true; nodes[0].r = 15; }
      x.save();
      for (let i = 0; i < nodes.length; i++) { const a = nodes[i];
        if (p.topo === 'Burst') { drawEdge(x, P, a, nodes[0], 0.12 + a.depth * 0.25, 0.5 + a.depth, false, r); continue; }
        const k = a.hub ? K.rint(r, 6, 11) : K.rint(r, 3, 5);
        const near = nodes.map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 })).filter((o) => o.j !== i).sort((u, v) => u.d - v.d).slice(0, k);
        for (const o of near) { const b = nodes[o.j], depth = (a.depth + b.depth) / 2; drawEdge(x, P, a, b, (0.18 + depth * 0.3) * (a.hub || b.hub ? 1.5 : 1), 0.5 + depth * 1.3, r() < 0.35, r); }
      }
      if (p.topo === 'Constellation') { const cen = []; for (let ci = 0; ci < 6; ci++) { const a = ci / 6 * Math.PI * 2; cen.push({ x: cx + Math.cos(a) * S * 0.3, y: cy + Math.sin(a) * S * 0.3, depth: 1 }); } for (let i = 0; i < cen.length; i++) for (let j = i + 1; j < cen.length; j++) { if (r() < 0.45) drawEdge(x, P, cen[i], cen[j], 0.18, 1, true, r); } }
      x.restore();
      nodes.sort((u, v) => u.depth - v.depth); for (const n of nodes) drawNode(x, P, n);
      if ((p.topo === 'Core' || p.topo === 'Burst') && P.dark) K.bloom(x, cx, cy, S * 0.4, P.hot, 0.22);
    }

    if (P.dark) { const noise = K.makeNoise(seed); K.hazeSheet(x, W, H, noise, P.node, 0.06, 260, 'screen'); K.grain(x, W, H, 540, r); K.vignette(x, W, H, 0.5); }
    else { halftone(x, W, H, P.edge, r); K.grain(x, W, H, 1000, r); x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.14); x.restore(); }
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'C4_network', draw, traits };
})();
