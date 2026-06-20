/* DIRECTION C — NETWORK
 * A city seen as pure data: a vast luminous node-graph organism — hubs, buses,
 * traces and traveling packets sprawling through atmospheric fog. Semi-abstract
 * "scene" of energy. Bloomed nodes, depth haze, one bright core anchor. */
window.ENGINE = (function () {
  const K = window.KIT;

  const PALS = [
    { name: 'Deep Cyber', bg: '#04060f', fog: '#0b2545', edge: '#1fa7b8', node: '#3de0e8', hot: '#7cf6ff', pkt: '#ffd23d' },
    { name: 'Reactor',    bg: '#04090a', fog: '#0a3a2e', edge: '#1fbf6b', node: '#39ff9e', hot: '#c8ffe0', pkt: '#ff4d6d' },
    { name: 'Magenta',    bg: '#08000a', fog: '#2a0535', edge: '#b026ff', node: '#ff4fd8', hot: '#ff9be8', pkt: '#3df0ff' },
    { name: 'Toxic Acid', bg: '#0a1200', fog: '#1a2e05', edge: '#9be600', node: '#c6ff00', hot: '#e8ff6b', pkt: '#ff2dba' },
    { name: 'Sodium',     bg: '#0a0703', fog: '#2b1600', edge: '#ff9a1f', node: '#ffc000', hot: '#ffe08a', pkt: '#34e0d0' },
    { name: 'Ultraviolet',bg: '#070416', fog: '#22115a', edge: '#6a4dff', node: '#9b5dff', hot: '#c79bff', pkt: '#3df0ff' },
  ];
  const FMTS = [ { W: 1340, H: 1340, t: 'Field' }, { W: 1500, H: 1120, t: 'Span' }, { W: 1120, H: 1500, t: 'Column' } ];
  const TOPO = ['Core', 'Mesh', 'Spine', 'Constellation'];

  function params(r) {
    return { pal: K.pick(PALS, r), fmt: K.pick(FMTS, r), topo: K.pick(TOPO, r), nodes: K.rint(r, 70, 150), tiers: 3 };
  }
  function traits(seed) { const p = params(K.rng(seed)); return { Palette: p.pal.name, Format: p.fmt.t, Topology: p.topo, Scale: p.nodes >= 120 ? 'Dense' : 'Open' }; }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const g = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, K.mix(P.bg, P.fog, 0.55)); g.addColorStop(1, K.mix(P.bg, '#000', 0.25)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    K.hazeSheet(x, W, H, noise, P.fog, 0.5, 160, 'screen');

    // place nodes across 3 depth tiers (size/brightness by depth)
    const cx = W * 0.5, cy = H * 0.5;
    const nodes = [];
    for (let i = 0; i < p.nodes; i++) {
      const tier = K.rint(r, 0, 2), depth = tier / 2;
      let nx, ny;
      if (p.topo === 'Core') { const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.7) * Math.min(W, H) * 0.48; nx = cx + Math.cos(a) * rad; ny = cy + Math.sin(a) * rad * (H < W ? 1 : 0.9); }
      else if (p.topo === 'Spine') { const t = r(); nx = W * (0.12 + t * 0.76) + K.randn(r) * W * 0.06; ny = cy + Math.sin(t * Math.PI * 2 + r()) * H * 0.28 + K.randn(r) * H * 0.08; }
      else if (p.topo === 'Constellation') { nx = W * (0.08 + r() * 0.84); ny = H * (0.08 + r() * 0.84); }
      else { nx = W * (0.08 + r() * 0.84); ny = H * (0.08 + r() * 0.84); }
      nodes.push({ x: nx, y: ny, depth, r: (1.5 + r() * 5) * (0.5 + depth), hub: false });
    }
    // promote some hubs
    const hubCount = p.topo === 'Core' ? 1 : K.rint(r, 3, 7);
    for (let i = 0; i < hubCount; i++) { const n = nodes[Math.floor(r() * nodes.length)]; n.hub = true; n.r *= 2.6; n.depth = 1; }
    if (p.topo === 'Core') { nodes[0].x = cx; nodes[0].y = cy; nodes[0].hub = true; nodes[0].r = 16; }

    // edges: connect each node to nearest few (k-NN-ish), brighter when near + same tier
    x.save();
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      // distance-sorted small neighborhood
      const near = nodes.map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 })).filter((o) => o.j !== i).sort((u, v) => u.d - v.d).slice(0, a.hub ? K.rint(r, 5, 9) : K.rint(r, 1, 3));
      for (const o of near) {
        const b = nodes[o.j]; const depth = (a.depth + b.depth) / 2;
        x.globalCompositeOperation = 'lighter';
        x.strokeStyle = K.rgba(P.edge, (0.05 + depth * 0.22) * (a.hub || b.hub ? 1.6 : 1));
        x.lineWidth = 0.4 + depth * 1.1;
        x.beginPath();
        if (r() < 0.4) { // curved bus
          const mx = (a.x + b.x) / 2 + K.randn(r) * 30, my = (a.y + b.y) / 2 + K.randn(r) * 30;
          x.moveTo(a.x, a.y); x.quadraticCurveTo(mx, my, b.x, b.y);
        } else { x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); }
        x.stroke();
        // traveling packet glint
        if (r() < 0.22) { const t = r(); const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t; K.bloom(x, px, py, 3 + depth * 6, P.pkt, 0.8); }
      }
    }
    x.restore();

    // draw nodes (back tier first)
    nodes.sort((u, v) => u.depth - v.depth);
    for (const n of nodes) {
      x.save(); x.globalCompositeOperation = 'lighter';
      K.bloom(x, n.x, n.y, n.r * (n.hub ? 6 : 3.4), n.hub ? P.hot : P.node, 0.18 + n.depth * 0.3);
      x.fillStyle = K.rgba(n.hub ? P.hot : P.node, 0.6 + n.depth * 0.4);
      x.beginPath(); x.arc(n.x, n.y, n.r, 0, Math.PI * 2); x.fill();
      if (n.hub) { x.strokeStyle = K.rgba(P.hot, 0.6); x.lineWidth = 1.2; x.beginPath(); x.arc(n.x, n.y, n.r * 2.2, 0, Math.PI * 2); x.stroke(); }
      x.restore();
    }

    // core anchor glow
    if (p.topo === 'Core') K.bloom(x, cx, cy, Math.min(W, H) * 0.4, P.hot, 0.22);

    // finishing atmosphere
    K.hazeSheet(x, W, H, noise, P.node, 0.08, 260, 'screen');
    K.grain(x, W, H, 540, r);
    K.vignette(x, W, H, 0.5);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'C_network', draw, traits };
})();
