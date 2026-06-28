/* TOPIARY — a formal night garden where the hedges are grown into glowing
 * circuit-board topiary: trimmed geometric forms threaded with light-traces and
 * lit nodes, light-fountains spraying particles that fall as data, drifting
 * drone-fireflies, a gravel path receding to a vanishing point, low mist.
 * Surreal: the hedges are plainly PCB-green circuitry grown organic.
 * PALETTE: GARDEN CIRCUIT NIGHT — deep emerald body / electric-blue trace /
 * hot-amber lights, on a near-black-green ground. Lush dark with electric accents. */
window.ENGINE = (function () {
  const K = window.KIT;

  // body = hedge emerald; trace = circuit line; node = lit junction; amber = warm
  // lights/fireflies; sky = night ground/sky; path = gravel.
  const PALS = [
    { name: 'Circuit Night', sky: '#06140e', body: '#0f7a4a', trace: '#2a6bff', node: '#5cf0ff', amber: '#ffb02e', path: '#1c2a22' },
    { name: 'Viridian',      sky: '#04120f', body: '#0c8a5a', trace: '#1e7aff', node: '#46ffd0', amber: '#ffc24a', path: '#182620' },
    { name: 'Teal Parterre', sky: '#05140f', body: '#0a7a66', trace: '#2e8cff', node: '#6cf6ff', amber: '#ff9e3c', path: '#16241e' },
    { name: 'Emerald Bloom', sky: '#07160c', body: '#149048', trace: '#3a64ff', node: '#7affc0', amber: '#ffd24a', path: '#1e2c20' },
    { name: 'Cyan Hedge',    sky: '#04100e', body: '#0e7a72', trace: '#22b0ff', node: '#5cf6ff', amber: '#ffb838', path: '#142420' },
    { name: 'Deep Garden',   sky: '#040f0a', body: '#0c6e44', trace: '#2a58ff', node: '#52e8ff', amber: '#ffa828', path: '#172218' },
  ];
  const FMTS = [
    { W: 1480, H: 1120, t: 'Wide' },
    { W: 1240, H: 1240, t: 'Square' },
    { W: 1180, H: 1420, t: 'Tall' },
  ];
  const HOURS = ['Moonless', 'Blue Hour', 'Deep Night'];
  const SHAPES = ['sphere', 'cone', 'cube', 'spiral', 'sphere', 'cube'];

  function params(r) {
    return {
      pal: K.pick(PALS, r),
      fmt: K.pick(FMTS, r),
      hour: K.pick(HOURS, r),
      vanishX: 0.34 + r() * 0.32,       // where the path recedes to
      rows: K.rint(r, 4, 6),            // topiary rows down each side
      fountains: K.rint(r, 1, 3),
      fireflies: K.rint(r, 24, 48),
      mist: 0.5 + r() * 0.5,
      shapeBias: K.pick(SHAPES, r),
    };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Hour: p.hour, Rows: p.rows, Fountains: p.fountains };
  }

  // a single topiary form: silhouette `shape`, filled with circuit traces + nodes.
  function topiary(x, P, cx, by, w, h, shape, depth, r, noise, seed) {
    // depth 0 far (hazy, small contrast) .. 1 near (crisp, saturated)
    const body = K.mix(K.mix(P.body, P.sky, (1 - depth) * 0.6), '#000', 0.12);
    const lw = 0.6 + depth * 1.4;
    x.save();
    // soft ground shadow
    K.softShadow(x, cx, by, w * 0.7, 0.3 + depth * 0.2);
    // build silhouette path
    x.beginPath();
    if (shape === 'sphere') {
      x.ellipse(cx, by - h * 0.5, w * 0.5, h * 0.5, 0, 0, 7);
    } else if (shape === 'cone') {
      x.moveTo(cx, by - h); x.lineTo(cx + w * 0.5, by); x.lineTo(cx - w * 0.5, by); x.closePath();
    } else if (shape === 'cube') {
      x.rect(cx - w * 0.5, by - h, w, h);
    } else { // spiral — stacked shrinking ellipses
      x.ellipse(cx, by - h * 0.18, w * 0.5, h * 0.16, 0, 0, 7);
    }
    if (shape === 'spiral') {
      // composite of tiers
      x.beginPath();
      const tiers = 3;
      for (let t = 0; t < tiers; t++) {
        const ty = by - h * (t / tiers) - h * 0.16;
        const tw = w * 0.5 * (1 - t / (tiers + 1));
        x.ellipse(cx, ty, tw, h * 0.16, 0, 0, 7);
      }
    }
    x.fillStyle = K.rgba(body, 0.92);
    x.fill();
    x.clip();
    // base shading: rim-lit top (cool), dark bottom
    const sg = x.createLinearGradient(0, by - h, 0, by);
    sg.addColorStop(0, K.rgba(K.mix(body, P.node, 0.18 * depth), 0.6));
    sg.addColorStop(0.5, K.rgba(body, 0));
    sg.addColorStop(1, K.rgba('#000', 0.4));
    x.fillStyle = sg; x.fillRect(cx - w, by - h, w * 2, h);

    // CIRCUIT TRACES inside the hedge — orthogonal routed lines + lit nodes
    x.globalCompositeOperation = 'lighter';
    const cell = Math.max(7, w / (5 + Math.floor(depth * 5)));
    const traceA = 0.18 + depth * 0.45;
    x.lineWidth = lw;
    const nodes = [];
    for (let gx = cx - w * 0.5; gx < cx + w * 0.5; gx += cell) {
      for (let gy = by - h; gy < by; gy += cell) {
        if (r() < 0.5) continue;
        x.strokeStyle = K.rgba(P.trace, traceA * (0.5 + r() * 0.5));
        x.beginPath();
        x.moveTo(gx, gy);
        // route an L-shaped trace
        if (r() < 0.5) { x.lineTo(gx + cell, gy); x.lineTo(gx + cell, gy + cell); }
        else { x.lineTo(gx, gy + cell); x.lineTo(gx + cell, gy + cell); }
        x.stroke();
        if (r() < 0.4) nodes.push([gx + cell, gy + cell]);
      }
    }
    // lit nodes (junctions glow) — cool with occasional amber
    for (const [nx, ny] of nodes) {
      const amber = r() < 0.18;
      const col = amber ? P.amber : P.node;
      K.bloom(x, nx, ny, cell * (0.7 + depth), col, 0.3 + depth * 0.3);
      x.fillStyle = K.rgba(K.mix(col, '#fff', 0.4), 0.7);
      x.fillRect(nx - lw, ny - lw, lw * 2, lw * 2);
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const HZ = H * 0.42;
    const vx = W * p.vanishX, vy = HZ;
    const blue = p.hour === 'Blue Hour';

    // ── 1. SKY: near-black green, faint emerald airglow at the horizon ──
    const g = x.createLinearGradient(0, 0, 0, HZ);
    g.addColorStop(0, K.mix(P.sky, '#000', 0.4));
    g.addColorStop(0.7, P.sky);
    g.addColorStop(1, K.mix(P.sky, P.body, blue ? 0.45 : 0.28));
    x.fillStyle = g; x.fillRect(0, 0, W, HZ);
    K.bloom(x, vx, HZ, W * 0.5, P.body, blue ? 0.24 : 0.14);
    // a few faint stars
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 60; i++) { x.fillStyle = K.rgba(K.mix(P.node, '#fff', r()), 0.05 + r() * 0.18); x.fillRect(r() * W, r() * HZ * 0.8, 0.9, 0.9); }
    x.restore();

    // ── 2. GROUND: dark garden, a gravel path receding to the vanishing point ──
    const gr = x.createLinearGradient(0, HZ, 0, H);
    gr.addColorStop(0, K.mix(P.sky, P.body, 0.18));
    gr.addColorStop(1, K.mix(P.sky, '#000', 0.2));
    x.fillStyle = gr; x.fillRect(0, HZ, W, H - HZ);
    // distant hedge wall on the horizon (hazy silhouette)
    x.fillStyle = K.rgba(K.mix(P.body, P.sky, 0.5), 0.6);
    x.beginPath(); x.moveTo(0, HZ);
    for (let xx = 0; xx <= W; xx += 24) x.lineTo(xx, HZ - (8 + noise.fbm(xx / 80, seed, 3) * 26));
    x.lineTo(W, HZ); x.closePath(); x.fill();

    // gravel path: a tapering wedge from wide foreground to the vanishing point
    const pathW = W * 0.22;
    x.save();
    x.beginPath();
    x.moveTo(W * 0.5 - pathW, H); x.lineTo(W * 0.5 + pathW, H);
    x.lineTo(vx + 6, vy); x.lineTo(vx - 6, vy); x.closePath();
    const pg = x.createLinearGradient(0, H, 0, vy);
    pg.addColorStop(0, K.mix(P.path, P.node, 0.06));
    pg.addColorStop(1, K.mix(P.path, P.body, 0.3));
    x.fillStyle = pg; x.fill();
    // gravel speckle + faint glowing inlay lines down the path
    x.clip();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 400; i++) {
      const t = r(); const py = vy + (H - vy) * t;
      const halfW = 6 + (pathW - 6) * t;
      const px = W * 0.5 + (r() - 0.5) * 2 * halfW * (W * 0.5 - vx) / (W * 0.5) * 0 + (vx + (W * 0.5 - vx) * (1 - t)) - (W * 0.5) + W * 0.5 + (r() - 0.5) * 2 * halfW;
      x.fillStyle = K.rgba(K.mix(P.path, P.node, 0.4), 0.04 + r() * 0.06);
      x.fillRect(px, py, 1.2, 1.2);
    }
    // inlay light strips
    for (const s of [-0.5, 0.5]) {
      x.strokeStyle = K.rgba(P.trace, 0.25); x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(W * 0.5 + s * pathW, H); x.lineTo(vx + s * 6, vy); x.stroke();
    }
    x.restore();

    // ── 3. TOPIARY ROWS flanking the path, receding (far first for depth) ──
    const forms = [];
    for (let side = -1; side <= 1; side += 2) {
      for (let row = 0; row < p.rows; row++) {
        const t = row / p.rows;                 // 0 near .. 1 far
        const depth = 1 - t;
        const py = H - (H - vy) * (t * 0.92 + 0.04);
        // x position: outside the path, splaying wider toward the foreground
        const splay = (vx + (W * 0.5 - vx) * 0) ; // unused; compute directly
        const pathHalf = 6 + (pathW - 6) * (1 - t);
        const baseX = (vx + (W * 0.5 - vx) * t); // path centre at this depth
        const offset = (pathHalf + (40 + 120 * (1 - t))) ;
        const cx = baseX + side * offset;
        if (cx < -50 || cx > W + 50) continue;
        const sz = (24 + depth * depth * 150);
        const shape = r() < 0.4 ? p.shapeBias : K.pick(SHAPES, r);
        forms.push({ cx, by: py, w: sz * (0.8 + r() * 0.5), h: sz * (0.9 + r() * 0.7), shape, depth, useed: (seed + side * 31 + row * 7) >>> 0 });
      }
    }
    forms.sort((a, b) => a.depth - b.depth); // far first
    for (const f of forms) topiary(x, P, f.cx, f.by, f.w, f.h, f.shape, f.depth, K.rng(f.useed), noise, seed);

    // ── 4. LIGHT-FOUNTAINS: upward sprays of particles arcing & falling as data ──
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < p.fountains; i++) {
      const t = 0.15 + (i + 0.5) / p.fountains * 0.6;
      const fx = vx + (W * 0.5 - vx) * (1 - t) * 0 + (vx + (W * 0.5 - vx) * t * 0) ; // place along path centre
      const cxp = (vx + (W * 0.5 - vx) * t);
      const fy = H - (H - vy) * (t * 0.9 + 0.06);
      const scale = 20 + (1 - t) * 90;
      // basin glow
      K.bloom(x, cxp, fy, scale * 1.6, P.node, 0.3);
      // particle jet
      const n = 60;
      for (let s = 0; s < n; s++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 0.7;
        const v = scale * (0.5 + r() * 1.1);
        const life = r();
        // ballistic arc
        const px = cxp + Math.cos(a) * v * life * 2.2;
        const py = fy + Math.sin(a) * v * life * 2.2 + (life * life) * scale * 2.4; // gravity
        const col = r() < 0.3 ? P.amber : (r() < 0.6 ? P.node : P.trace);
        const al = (1 - life) * 0.8;
        K.bloom(x, px, py, 2 + (1 - life) * scale * 0.18, col, al * 0.5);
        x.fillStyle = K.rgba(K.mix(col, '#fff', 0.4), al);
        x.fillRect(px, py, 1.4, 1.4);
      }
      // falling "data" glyphs near the fountain
      x.font = `${Math.max(7, scale * 0.16)}px monospace`;
      for (let s = 0; s < 10; s++) {
        const gx = cxp + (r() - 0.5) * scale * 2;
        const gy = fy - scale * (0.4 + r() * 1.6);
        x.fillStyle = K.rgba(P.node, 0.18 + r() * 0.3);
        x.fillText(r() < 0.5 ? (Math.floor(r() * 100)) : '01'[Math.floor(r() * 2)], gx, gy);
      }
    }
    x.restore();

    // ── 5. DRONE-FIREFLIES drifting at various depths ──
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < p.fireflies; i++) {
      const depth = r();
      const fx = r() * W, fy = HZ + r() * (H - HZ);
      const sz = 1 + depth * 3.4;
      const col = r() < 0.65 ? P.amber : P.node;
      K.bloom(x, fx, fy, sz * (3 + depth * 4), col, 0.12 + depth * 0.2);
      x.fillStyle = K.rgba(K.mix(col, '#fff', 0.5), 0.5 + depth * 0.4);
      x.fillRect(fx - sz * 0.3, fy - sz * 0.3, sz * 0.6, sz * 0.6);
    }
    x.restore();

    // ── 6. LOW MIST hugging the ground + signature haze, grain, vignette ──
    x.save(); x.globalCompositeOperation = 'screen';
    const mg = x.createLinearGradient(0, H * 0.62, 0, H);
    mg.addColorStop(0, K.rgba(P.body, 0));
    mg.addColorStop(1, K.rgba(K.mix(P.body, P.node, 0.2), 0.12 * p.mist));
    x.fillStyle = mg; x.fillRect(0, H * 0.62, W, H * 0.38);
    x.restore();
    K.hazeSheet(x, W, H, noise, K.mix(P.body, P.sky, 0.3), 0.10 * p.mist + 0.05, 260, 'screen');
    // a soft emerald god-glow from the vanishing point
    K.bloom(x, vx, vy + H * 0.04, W * 0.4, P.body, 0.08);
    K.grain(x, W, H, 460, r);
    K.vignette(x, W, H, 0.55);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'topiary', draw, traits };
})();
