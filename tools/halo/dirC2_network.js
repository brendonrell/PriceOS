/* NETWORK v2 — a luminous, DENSE electric data-organism.
 * Identity vs the others: glowing line-and-node graphs, packets in motion,
 * bright neon/spectrum incl. CP2077 yellow/red — structured, not the sparse fog
 * starfield of v1. Six structurally distinct topologies (incl. a PCB-circuit
 * grid) + bright palettes = high variance. */
window.ENGINE = (function () {
  const K = window.KIT;

  const PALS = [
    { name: 'Electric',     bg: '#03040c', fog: '#0b1a3a', edge: '#1fa7ff', node: '#7cf6ff', hot: '#ffffff', pkt: '#ffe11f' },
    { name: 'Yellow Circuit',bg: '#0a0900', fog: '#241f00', edge: '#ffd400', node: '#ffe11f', hot: '#fffbe0', pkt: '#ff3b3b' },
    { name: 'Red Grid',     bg: '#0c0203', fog: '#2a0608', edge: '#ff3b3b', node: '#ff8a4d', hot: '#ffe9d0', pkt: '#ffd400' },
    { name: 'Plasma',       bg: '#0c0308', fog: '#2a0a14', edge: '#ff7a1f', node: '#ff3da0', hot: '#fff0d0', pkt: '#3df0ff' },
    { name: 'Magenta',      bg: '#0a000c', fog: '#2a0535', edge: '#b026ff', node: '#ff4fd8', hot: '#ffd6f4', pkt: '#3df0ff' },
    { name: 'Deep Cyber',   bg: '#04060f', fog: '#0b2545', edge: '#1fbf9a', node: '#3de0e8', hot: '#d6ffff', pkt: '#ffd23d' },
    { name: 'Solar',        bg: '#0a0600', fog: '#2e1500', edge: '#ff9a1f', node: '#ffc000', hot: '#fff0c8', pkt: '#3df0ff' },
    { name: 'Spectrum',     bg: '#05030f', fog: '#140b2a', edge: '#ff3d8a', node: '#3df0ff', hot: '#ffffff', pkt: '#b6ff1f', rainbow: true },
  ];
  const FMTS = [ { W: 1340, H: 1340, t: 'Field' }, { W: 1500, H: 1120, t: 'Span' }, { W: 1120, H: 1500, t: 'Column' } ];
  const TOPO = ['Core', 'Mesh', 'Spine', 'Circuit', 'Constellation', 'Burst'];
  // weighted pool: cap the "mesh blob", favour the distinct topologies (jury)
  const TOPO_POOL = ['Core', 'Mesh', 'Spine', 'Spine', 'Circuit', 'Circuit', 'Circuit', 'Constellation', 'Constellation', 'Burst', 'Burst'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    return { pal, fmt: K.pick(FMTS, r), topo: K.pick(TOPO_POOL, r), nodes: K.rint(r, 240, 480) };
  }
  function traits(seed) { const p = params(K.rng(seed)); return { Palette: p.pal.name, Format: p.fmt.t, Topology: p.topo, Scale: p.nodes >= 280 ? 'Dense' : 'Open' }; }

  function nodeCol(P, r) { return P.rainbow ? K.hsl2hex(r() * 360, 0.95, 0.62) : P.node; }

  function drawEdge(x, P, a, b, alpha, lw, curve, r, col) {
    x.globalCompositeOperation = 'lighter'; x.strokeStyle = K.rgba(col || P.edge, alpha); x.lineWidth = lw; x.beginPath();
    if (curve) { const mx = (a.x + b.x) / 2 + K.randn(r) * 26, my = (a.y + b.y) / 2 + K.randn(r) * 26; x.moveTo(a.x, a.y); x.quadraticCurveTo(mx, my, b.x, b.y); }
    else { x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); } x.stroke();
    if (r() < 0.3) { const t = r(); K.bloom(x, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 3 + r() * 6, P.pkt, 0.9); }
  }
  function drawNode(x, P, n, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const c = n.col || P.node;
    K.bloom(x, n.x, n.y, n.r * (n.hub ? 6 : 3.2), n.hub ? P.hot : c, 0.22 + n.depth * 0.3);
    x.fillStyle = K.rgba(n.hub ? P.hot : c, 0.7 + n.depth * 0.3); x.beginPath(); x.arc(n.x, n.y, n.r, 0, Math.PI * 2); x.fill();
    if (n.hub) { x.strokeStyle = K.rgba(c, 0.6); x.lineWidth = 1.3; x.beginPath(); x.arc(n.x, n.y, n.r * 2.3, 0, Math.PI * 2); x.stroke(); }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const cx = W / 2, cy = H / 2, S = Math.min(W, H);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
    g.addColorStop(0, K.mix(P.bg, P.fog, 0.6)); g.addColorStop(1, K.mix(P.bg, '#000', 0.3)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const noise = K.makeNoise(seed); K.hazeSheet(x, W, H, noise, P.fog, 0.28, 170, 'screen');

    if (p.topo === 'Circuit') {
      // PCB: orthogonal traces on a grid, pads + vias
      const step = S / K.rint(r, 16, 26);
      x.save(); x.globalCompositeOperation = 'lighter';
      const traces = K.rint(r, 70, 120);
      for (let i = 0; i < traces; i++) {
        let px = Math.round(r() * W / step) * step, py = Math.round(r() * H / step) * step;
        x.strokeStyle = K.rgba(P.edge, 0.3 + r() * 0.4); x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(px, py);
        const segs = K.rint(r, 2, 6); for (let s = 0; s < segs; s++) { if (r() < 0.5) px += (r() < 0.5 ? -1 : 1) * step * K.rint(r, 1, 4); else py += (r() < 0.5 ? -1 : 1) * step * K.rint(r, 1, 4); x.lineTo(px, py); } x.stroke();
        K.bloom(x, px, py, 4 + r() * 5, r() < 0.3 ? P.pkt : P.node, 0.8);
        x.fillStyle = K.rgba(P.node, 0.8); x.beginPath(); x.arc(px, py, 2 + r() * 2, 0, Math.PI * 2); x.fill();
      }
      // pads
      for (let i = 0; i < K.rint(r, 14, 30); i++) { const px = Math.round(r() * W / step) * step, py = Math.round(r() * H / step) * step; x.strokeStyle = K.rgba(P.hot, 0.6); x.lineWidth = 2; x.beginPath(); x.arc(px, py, step * 0.3, 0, Math.PI * 2); x.stroke(); K.bloom(x, px, py, step * 0.6, P.hot, 0.4); }
      x.restore();
    } else {
      // node-graph topologies
      const nodes = [];
      for (let i = 0; i < p.nodes; i++) {
        const tier = K.rint(r, 0, 2), depth = tier / 2; let nx, ny;
        if (p.topo === 'Core') { const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.6) * S * 0.48; nx = cx + Math.cos(a) * rad; ny = cy + Math.sin(a) * rad; }
        else if (p.topo === 'Spine') { const t = r(); nx = W * (0.1 + t * 0.8) + K.randn(r) * W * 0.05; ny = cy + Math.sin(t * Math.PI * 3 + r()) * H * 0.3 + K.randn(r) * H * 0.06; }
        else if (p.topo === 'Burst') { const a = r() * Math.PI * 2, rad = Math.pow(r(), 1.6) * S * 0.5; nx = cx + Math.cos(a) * rad; ny = cy + Math.sin(a) * rad; }
        else if (p.topo === 'Constellation') { const ci = Math.floor(r() * 6); const a = ci / 6 * Math.PI * 2; const ccx = cx + Math.cos(a) * S * 0.3, ccy = cy + Math.sin(a) * S * 0.3; nx = ccx + K.randn(r) * S * 0.12; ny = ccy + K.randn(r) * S * 0.12; }
        else { nx = W * (0.06 + r() * 0.88); ny = H * (0.06 + r() * 0.88); } // Mesh
        nodes.push({ x: nx, y: ny, depth, r: (1.6 + r() * 4.5) * (0.5 + depth), hub: false, col: nodeCol(P, r) });
      }
      const hubCount = p.topo === 'Core' || p.topo === 'Burst' ? 1 : K.rint(r, 4, 9);
      for (let i = 0; i < hubCount; i++) { const n = nodes[Math.floor(r() * nodes.length)]; n.hub = true; n.r *= 2.5; n.depth = 1; }
      if (p.topo === 'Core' || p.topo === 'Burst') { nodes[0].x = cx; nodes[0].y = cy; nodes[0].hub = true; nodes[0].r = 15; }

      x.save();
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (p.topo === 'Burst') { drawEdge(x, P, a, nodes[0], 0.12 + a.depth * 0.25, 0.5 + a.depth, false, r, a.col); continue; }
        const k = a.hub ? K.rint(r, 6, 11) : K.rint(r, 3, 5);
        const near = nodes.map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 })).filter((o) => o.j !== i).sort((u, v) => u.d - v.d).slice(0, k);
        for (const o of near) { const b = nodes[o.j], depth = (a.depth + b.depth) / 2; drawEdge(x, P, a, b, (0.18 + depth * 0.3) * (a.hub || b.hub ? 1.5 : 1), 0.5 + depth * 1.3, r() < 0.35, r, P.rainbow ? a.col : null); }
      }
      // Constellation: bright trunk lines linking the cluster centres
      if (p.topo === 'Constellation') { const cen = []; for (let ci = 0; ci < 6; ci++) { const a = ci / 6 * Math.PI * 2; cen.push({ x: cx + Math.cos(a) * S * 0.3, y: cy + Math.sin(a) * S * 0.3, depth: 1 }); } for (let i = 0; i < cen.length; i++) for (let j = i + 1; j < cen.length; j++) { if (r() < 0.45) drawEdge(x, P, cen[i], cen[j], 0.16, 0.8, true, r, P.rainbow ? P.hot : null); } }
      x.restore();
      nodes.sort((u, v) => u.depth - v.depth); for (const n of nodes) drawNode(x, P, n, r);
      if (p.topo === 'Core' || p.topo === 'Burst') K.bloom(x, cx, cy, S * 0.4, P.hot, 0.22);
    }

    K.hazeSheet(x, W, H, noise, P.node, 0.06, 260, 'screen');
    K.grain(x, W, H, 540, r);
    K.vignette(x, W, H, 0.5);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'C2_network', draw, traits };
})();
