/* TOPIARY — a formal night garden where the hedges are grown into glowing
 * circuit-board topiary: trimmed geometric forms threaded with light-traces and
 * lit nodes, light-fountains spraying particles that fall as data, drifting
 * drone-fireflies, low mist. Surreal: the hedges are plainly PCB-green circuitry
 * grown organic. SATURATED, deep-night, hazy, future-evoking.
 *
 * LAYOUT axis (seed-picked, structurally distinct PICTURES — not one scene
 * relocated): Allée (path receding to a vanishing point) · Hero Specimen (one
 * topiary close, full of circuit detail) · Parterre (formal knot-garden, plan
 * view from above) · Hedge Maze (overhead maze of hedge walls) · Promenade
 * (a single long row of topiary down one side, big sky) · Light Fountain (a
 * fountain-dominant scene, sparse).
 *
 * PALETTE: GARDEN CIRCUIT NIGHT — deep emerald body / electric-blue trace /
 * hot-amber lights, on a near-black-green ground. */
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
  const LAYOUTS = ['Allée', 'Hero Specimen', 'Parterre', 'Hedge Maze', 'Promenade', 'Light Fountain'];

  function params(r, seed) {
    // Decorrelate the layout choice from the main stream so small consecutive
    // seeds spread across all six layouts instead of clumping.
    const lr = K.rng(((seed >>> 0) * 2654435761 + 1994) >>> 0);
    const layout = K.pick(LAYOUTS, lr);
    // Hero & Parterre & Maze read best square-ish; Promenade & Allée like wide/tall.
    let fmt;
    if (layout === 'Parterre' || layout === 'Hedge Maze') fmt = K.pick([FMTS[1], FMTS[0]], r);
    else if (layout === 'Hero Specimen') fmt = K.pick([FMTS[1], FMTS[2]], r);
    else fmt = K.pick(FMTS, r);
    return {
      layout,
      pal: K.pick(PALS, r),
      fmt,
      hour: K.pick(HOURS, r),
      vanishX: 0.34 + r() * 0.32,
      rows: K.rint(r, 4, 6),
      fountains: K.rint(r, 1, 3),
      fireflies: K.rint(r, 26, 54),
      mist: 0.5 + r() * 0.5,
      shapeBias: K.pick(SHAPES, r),
      r,
    };
  }
  function traits(seed) {
    const p = params(K.rng(seed), seed);
    return { Layout: p.layout, Palette: p.pal.name, Format: p.fmt.t, Hour: p.hour };
  }

  /* ── shared: fill a silhouette path for a shape, return without filling ── */
  function shapePath(x, cx, by, w, h, shape) {
    x.beginPath();
    if (shape === 'sphere') {
      x.ellipse(cx, by - h * 0.5, w * 0.5, h * 0.5, 0, 0, 7);
    } else if (shape === 'cone') {
      x.moveTo(cx, by - h); x.lineTo(cx + w * 0.5, by); x.lineTo(cx - w * 0.5, by); x.closePath();
    } else if (shape === 'cube') {
      const r = Math.min(w, h) * 0.08;
      const x0 = cx - w * 0.5, y0 = by - h;
      x.moveTo(x0 + r, y0); x.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
      x.arcTo(x0 + w, y0 + h, x0, y0 + h, r); x.arcTo(x0, y0 + h, x0, y0, r);
      x.arcTo(x0, y0, x0 + w, y0, r); x.closePath();
    } else { // spiral — stacked shrinking tiers
      const tiers = 3;
      for (let t = 0; t < tiers; t++) {
        const ty = by - h * (t / tiers) - h * 0.16;
        const tw = w * 0.5 * (1 - t / (tiers + 1));
        x.ellipse(cx, ty, tw, h * 0.16, 0, 0, 7);
      }
    }
  }

  // a single circuit-topiary form. depth 0 far (hazy) .. 1 near (crisp/saturated).
  // detail scales the trace density (hero specimen wants very high detail).
  function topiary(x, P, cx, by, w, h, shape, depth, r, opt) {
    opt = opt || {};
    const detail = opt.detail || 1;
    const body = K.mix(K.mix(P.body, P.sky, (1 - depth) * 0.6), '#000', 0.1);
    const lw = 0.6 + depth * (1.4 * detail);
    x.save();
    K.softShadow(x, cx, by, w * 0.7, 0.3 + depth * 0.2);
    // rim-light stroke so the silhouette reads as a solid clipped form (esp. hero)
    if (opt.rim) {
      x.save();
      shapePath(x, cx, by, w, h, shape);
      x.strokeStyle = K.rgba(K.mix(P.node, '#fff', 0.3), 0.5 * depth);
      x.lineWidth = 1.5 + depth * 2; x.stroke();
      x.restore();
    }
    shapePath(x, cx, by, w, h, shape);
    x.fillStyle = K.rgba(body, 0.94);
    x.fill();
    x.clip();
    // base shading: rim-lit top (cool), dark bottom
    const sg = x.createLinearGradient(0, by - h, 0, by);
    sg.addColorStop(0, K.rgba(K.mix(body, P.node, 0.22 * depth), 0.65));
    sg.addColorStop(0.5, K.rgba(body, 0));
    sg.addColorStop(1, K.rgba('#000', 0.42));
    x.fillStyle = sg; x.fillRect(cx - w, by - h, w * 2, h);

    // CIRCUIT TRACES — orthogonal routed lines + lit nodes
    x.globalCompositeOperation = 'lighter';
    const cellsAcross = 5 + Math.floor(depth * 5 * detail);
    const cell = Math.max(6, w / cellsAcross);
    const traceA = 0.18 + depth * 0.45;
    x.lineWidth = lw;
    const nodes = [];
    for (let gx = cx - w * 0.5; gx < cx + w * 0.5; gx += cell) {
      for (let gy = by - h; gy < by; gy += cell) {
        if (r() < 0.46) continue;
        x.strokeStyle = K.rgba(P.trace, traceA * (0.5 + r() * 0.5));
        x.beginPath();
        x.moveTo(gx, gy);
        if (r() < 0.5) { x.lineTo(gx + cell, gy); x.lineTo(gx + cell, gy + cell); }
        else { x.lineTo(gx, gy + cell); x.lineTo(gx + cell, gy + cell); }
        x.stroke();
        if (r() < 0.42) nodes.push([gx + cell, gy + cell]);
      }
    }
    // when detail is high (hero close-up) keep node glow tight so the routed
    // traces stay legible instead of blooming into a flat sheet.
    const bloomR = cell * (0.7 + depth) / Math.max(1, detail * 0.85);
    const bloomA = (0.3 + depth * 0.3) / Math.max(1, detail * 0.7);
    for (const [nx, ny] of nodes) {
      const amber = r() < 0.18;
      const col = amber ? P.amber : P.node;
      K.bloom(x, nx, ny, bloomR, col, bloomA);
      x.fillStyle = K.rgba(K.mix(col, '#fff', 0.45), 0.8);
      x.fillRect(nx - lw, ny - lw, lw * 2, lw * 2);
    }
    x.restore();
  }

  /* ── shared background: sky + airglow + stars ── */
  function sky(x, P, W, HZ, seed, r, blue) {
    const g = x.createLinearGradient(0, 0, 0, HZ);
    g.addColorStop(0, K.mix(P.sky, '#000', 0.4));
    g.addColorStop(0.7, P.sky);
    g.addColorStop(1, K.mix(P.sky, P.body, blue ? 0.45 : 0.28));
    x.fillStyle = g; x.fillRect(0, 0, W, HZ);
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) { x.fillStyle = K.rgba(K.mix(P.node, '#fff', r()), 0.05 + r() * 0.18); x.fillRect(r() * W, r() * HZ * 0.85, 0.9, 0.9); }
    x.restore();
  }

  /* ── shared atmosphere finish: mist + haze + grain + vignette ── */
  function finish(x, P, W, H, noise, r, mist) {
    x.save(); x.globalCompositeOperation = 'screen';
    const mg = x.createLinearGradient(0, H * 0.58, 0, H);
    mg.addColorStop(0, K.rgba(P.body, 0));
    mg.addColorStop(1, K.rgba(K.mix(P.body, P.node, 0.2), 0.12 * mist));
    x.fillStyle = mg; x.fillRect(0, H * 0.58, W, H * 0.42);
    x.restore();
    K.hazeSheet(x, W, H, noise, K.mix(P.body, P.sky, 0.3), 0.1 * mist + 0.05, 260, 'screen');
    K.grain(x, W, H, 460, r);
    K.vignette(x, W, H, 0.55);
  }

  /* light-fountain at (cx,fy), spray scale `scale` ── reused by several layouts */
  function fountain(x, P, cx, fy, scale, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    K.bloom(x, cx, fy, scale * 1.7, P.node, 0.32);
    const n = 70;
    for (let s = 0; s < n; s++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 0.7;
      const v = scale * (0.5 + r() * 1.1);
      const life = r();
      const px = cx + Math.cos(a) * v * life * 2.2;
      const py = fy + Math.sin(a) * v * life * 2.2 + (life * life) * scale * 2.4;
      const col = r() < 0.3 ? P.amber : (r() < 0.6 ? P.node : P.trace);
      const al = (1 - life) * 0.8;
      K.bloom(x, px, py, 2 + (1 - life) * scale * 0.18, col, al * 0.5);
      x.fillStyle = K.rgba(K.mix(col, '#fff', 0.4), al);
      x.fillRect(px, py, 1.4, 1.4);
    }
    // falling "data" glyphs
    x.font = `${Math.max(7, scale * 0.16)}px monospace`;
    for (let s = 0; s < 12; s++) {
      const gx = cx + (r() - 0.5) * scale * 2;
      const gy = fy - scale * (0.4 + r() * 1.6);
      x.fillStyle = K.rgba(P.node, 0.18 + r() * 0.3);
      x.fillText(r() < 0.5 ? String(Math.floor(r() * 100)) : '01'[Math.floor(r() * 2)], gx, gy);
    }
    x.restore();
  }

  /* drone-fireflies drifting over a region */
  function fireflies(x, P, W, y0, y1, count, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const depth = r();
      const fx = r() * W, fy = y0 + r() * (y1 - y0);
      const sz = 1 + depth * 3.4;
      const col = r() < 0.65 ? P.amber : P.node;
      K.bloom(x, fx, fy, sz * (3 + depth * 4), col, 0.12 + depth * 0.2);
      x.fillStyle = K.rgba(K.mix(col, '#fff', 0.5), 0.5 + depth * 0.4);
      x.fillRect(fx - sz * 0.3, fy - sz * 0.3, sz * 0.6, sz * 0.6);
    }
    x.restore();
  }

  /* ════════════════════════════════════════════════════════════════════════
     LAYOUT A — ALLÉE: gravel path receding to a vanishing point, topiary rows
     flanking it. Busy, deep, classic one-point perspective.
     ════════════════════════════════════════════════════════════════════════ */
  function drawAllee(x, P, W, H, p, noise, seed) {
    const r = p.r, blue = p.hour === 'Blue Hour';
    const HZ = H * 0.42, vx = W * p.vanishX, vy = HZ;
    sky(x, P, W, HZ, seed, r, blue);
    K.bloom(x, vx, HZ, W * 0.5, P.body, blue ? 0.24 : 0.14);

    const gr = x.createLinearGradient(0, HZ, 0, H);
    gr.addColorStop(0, K.mix(P.sky, P.body, 0.18));
    gr.addColorStop(1, K.mix(P.sky, '#000', 0.2));
    x.fillStyle = gr; x.fillRect(0, HZ, W, H - HZ);
    // distant hedge wall on horizon
    x.fillStyle = K.rgba(K.mix(P.body, P.sky, 0.5), 0.6);
    x.beginPath(); x.moveTo(0, HZ);
    for (let xx = 0; xx <= W; xx += 24) x.lineTo(xx, HZ - (8 + noise.fbm(xx / 80, seed, 3) * 26));
    x.lineTo(W, HZ); x.closePath(); x.fill();

    // gravel path wedge
    const pathW = W * 0.22;
    x.save();
    x.beginPath();
    x.moveTo(W * 0.5 - pathW, H); x.lineTo(W * 0.5 + pathW, H);
    x.lineTo(vx + 6, vy); x.lineTo(vx - 6, vy); x.closePath();
    const pg = x.createLinearGradient(0, H, 0, vy);
    pg.addColorStop(0, K.mix(P.path, P.node, 0.06));
    pg.addColorStop(1, K.mix(P.path, P.body, 0.3));
    x.fillStyle = pg; x.fill();
    x.clip();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 360; i++) {
      const t = r(); const py = vy + (H - vy) * t;
      const halfW = 6 + (pathW - 6) * t;
      const px = (vx + (W * 0.5 - vx) * (1 - t)) + (r() - 0.5) * 2 * halfW;
      x.fillStyle = K.rgba(K.mix(P.path, P.node, 0.4), 0.04 + r() * 0.06);
      x.fillRect(px, py, 1.2, 1.2);
    }
    for (const s of [-0.5, 0.5]) {
      x.strokeStyle = K.rgba(P.trace, 0.25); x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(W * 0.5 + s * pathW, H); x.lineTo(vx + s * 6, vy); x.stroke();
    }
    x.restore();

    // topiary rows flanking the path
    const forms = [];
    for (let side = -1; side <= 1; side += 2) {
      for (let row = 0; row < p.rows; row++) {
        const t = row / p.rows;
        const depth = 1 - t;
        const py = H - (H - vy) * (t * 0.92 + 0.04);
        const pathHalf = 6 + (pathW - 6) * (1 - t);
        const baseX = (vx + (W * 0.5 - vx) * t);
        const offset = pathHalf + (40 + 120 * (1 - t));
        const cx = baseX + side * offset;
        if (cx < -50 || cx > W + 50) continue;
        const sz = 24 + depth * depth * 150;
        const shape = r() < 0.4 ? p.shapeBias : K.pick(SHAPES, r);
        forms.push({ cx, by: py, w: sz * (0.8 + r() * 0.5), h: sz * (0.9 + r() * 0.7), shape, depth, useed: (seed + side * 31 + row * 7) >>> 0 });
      }
    }
    forms.sort((a, b) => a.depth - b.depth);
    for (const f of forms) topiary(x, P, f.cx, f.by, f.w, f.h, f.shape, f.depth, K.rng(f.useed));

    // a fountain or two along the centre
    for (let i = 0; i < p.fountains; i++) {
      const t = 0.2 + (i + 0.5) / p.fountains * 0.55;
      const cx = (vx + (W * 0.5 - vx) * t);
      const fy = H - (H - vy) * (t * 0.9 + 0.06);
      fountain(x, P, cx, fy, 20 + (1 - t) * 90, r);
    }
    fireflies(x, P, W, HZ, H, p.fireflies, r);
  }

  /* ════════════════════════════════════════════════════════════════════════
     LAYOUT B — HERO SPECIMEN: ONE giant topiary, close, filling the frame, dense
     circuitry detail. Big negative-space sky above, shallow ground. A portrait.
     ════════════════════════════════════════════════════════════════════════ */
  function drawHero(x, P, W, H, p, noise, seed) {
    const r = p.r, blue = p.hour === 'Blue Hour';
    const HZ = H * 0.66;
    sky(x, P, W, HZ, seed, r, blue);
    // ground
    const gr = x.createLinearGradient(0, HZ, 0, H);
    gr.addColorStop(0, K.mix(P.sky, P.body, 0.16));
    gr.addColorStop(1, K.mix(P.sky, '#000', 0.25));
    x.fillStyle = gr; x.fillRect(0, HZ, W, H - HZ);
    // faint distant hedge line low on horizon
    x.fillStyle = K.rgba(K.mix(P.body, P.sky, 0.55), 0.4);
    x.beginPath(); x.moveTo(0, HZ);
    for (let xx = 0; xx <= W; xx += 24) x.lineTo(xx, HZ - (6 + noise.fbm(xx / 90, seed, 3) * 16));
    x.lineTo(W, HZ); x.closePath(); x.fill();

    // a couple of small far companion topiary for scale
    for (let i = 0; i < 3; i++) {
      const cx = (i === 1) ? W * (0.15 + r() * 0.12) : W * (0.78 + r() * 0.14);
      const by = HZ + 14 + r() * 18;
      topiary(x, P, cx, by, 40 + r() * 30, 60 + r() * 40, K.pick(SHAPES, r), 0.35, K.rng((seed + i * 13) >>> 0));
    }

    // THE hero — towers from near the bottom, capped so sky negative space reads
    const shape = p.shapeBias;
    const hw = W * (0.44 + r() * 0.12);
    const hh = (HZ - HZ * 0.02) * (0.92 + r() * 0.18);
    const hx = W * (0.44 + r() * 0.12);
    const hby = H * (0.95 + r() * 0.02);
    // soft halo behind hero (kept subtle so circuit detail stays crisp)
    K.bloom(x, hx, hby - hh * 0.55, hw * 0.8, P.node, blue ? 0.12 : 0.08);
    topiary(x, P, hx, hby, hw, hh, shape, 1, K.rng((seed * 7 + 1) >>> 0), { detail: 2.0, rim: true });

    // a light-fountain at the hero's base
    fountain(x, P, hx, hby - hh * 0.04, hw * 0.2, r);
    fireflies(x, P, W, HZ * 0.3, H, Math.floor(p.fireflies * 0.7), r);
  }

  /* ════════════════════════════════════════════════════════════════════════
     LAYOUT C — PARTERRE: formal knot-garden seen from ABOVE (plan view). A
     symmetric grid of clipped hedge beds with glowing circuit knotwork, gravel
     walks between. Flat, graphic, top-down — a totally different camera.
     ════════════════════════════════════════════════════════════════════════ */
  function drawParterre(x, P, W, H, p, noise, seed) {
    const r = p.r;
    // ground = dark gravel field
    const gr = x.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, K.mix(P.sky, P.path, 0.5));
    gr.addColorStop(1, K.mix(P.sky, '#000', 0.15));
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    // gravel speckle over whole field
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 900; i++) { x.fillStyle = K.rgba(K.mix(P.path, P.node, 0.3), 0.02 + r() * 0.05); x.fillRect(r() * W, r() * H, 1.1, 1.1); }
    x.restore();

    const m = Math.min(W, H) * 0.08;
    const gx0 = m, gy0 = m, gw = W - m * 2, gh = H - m * 2;
    const cols = K.rint(r, 2, 3), rows = K.rint(r, 2, 3);
    const gapX = gw * 0.05, gapY = gh * 0.05;
    const bw = (gw - gapX * (cols - 1)) / cols;
    const bh = (gh - gapY * (rows - 1)) / rows;

    // glowing gravel walks (the cross-paths between beds)
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.trace, 0.22); x.lineWidth = 2;
    for (let c = 1; c < cols; c++) { const lx = gx0 + c * bw + (c - 0.5) * gapX; x.beginPath(); x.moveTo(lx, gy0); x.lineTo(lx, gy0 + gh); x.stroke(); }
    for (let rr = 1; rr < rows; rr++) { const ly = gy0 + rr * bh + (rr - 0.5) * gapY; x.beginPath(); x.moveTo(gx0, ly); x.lineTo(gx0 + gw, ly); x.stroke(); }
    x.restore();

    // each bed = a clipped knot of hedge with symmetric circuit knotwork
    for (let c = 0; c < cols; c++) {
      for (let rr = 0; rr < rows; rr++) {
        const bx = gx0 + c * (bw + gapX), byy = gy0 + rr * (bh + gapY);
        const cx = bx + bw / 2, cy = byy + bh / 2;
        const useed = (seed + c * 101 + rr * 17) >>> 0;
        const br = K.rng(useed);
        // bed body
        const body = K.mix(P.body, P.sky, 0.18);
        x.save();
        K.softShadow(x, cx, cy + bh * 0.04, Math.max(bw, bh) * 0.6, 0.28);
        // rounded bed
        const rad = Math.min(bw, bh) * 0.12;
        x.beginPath();
        x.moveTo(bx + rad, byy);
        x.arcTo(bx + bw, byy, bx + bw, byy + bh, rad);
        x.arcTo(bx + bw, byy + bh, bx, byy + bh, rad);
        x.arcTo(bx, byy + bh, bx, byy, rad);
        x.arcTo(bx, byy, bx + bw, byy, rad);
        x.closePath();
        const bg = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(bw, bh) * 0.6);
        bg.addColorStop(0, K.rgba(K.mix(body, P.node, 0.1), 0.96));
        bg.addColorStop(1, K.rgba(K.mix(body, '#000', 0.25), 0.96));
        x.fillStyle = bg; x.fill();
        x.clip();
        // symmetric knotwork: concentric rounded rings + a quartered cross,
        // mirrored, like a real parterre — drawn as glowing circuit lines.
        x.globalCompositeOperation = 'lighter';
        const rings = K.rint(br, 2, 4);
        for (let k = 0; k < rings; k++) {
          const f = (k + 1) / (rings + 1);
          x.strokeStyle = K.rgba(br() < 0.5 ? P.trace : P.node, 0.22 + br() * 0.2);
          x.lineWidth = 1.2 + br() * 1.4;
          x.beginPath();
          x.ellipse(cx, cy, bw * 0.42 * f, bh * 0.42 * f, 0, 0, 7);
          x.stroke();
        }
        // diagonal + axial spokes
        const spokes = 4 + 2 * K.rint(br, 0, 2);
        for (let s = 0; s < spokes; s++) {
          const a = (s / spokes) * Math.PI * 2;
          x.strokeStyle = K.rgba(P.trace, 0.18 + br() * 0.16); x.lineWidth = 1.1;
          x.beginPath(); x.moveTo(cx, cy);
          x.lineTo(cx + Math.cos(a) * bw * 0.46, cy + Math.sin(a) * bh * 0.46); x.stroke();
        }
        // lit nodes at intersections + a hot centre
        const nodeN = K.rint(br, 8, 16);
        for (let s = 0; s < nodeN; s++) {
          const a = br() * Math.PI * 2, rr2 = (0.2 + br() * 0.7);
          const nx = cx + Math.cos(a) * bw * 0.42 * rr2, ny = cy + Math.sin(a) * bh * 0.42 * rr2;
          const amber = br() < 0.22;
          const col = amber ? P.amber : P.node;
          K.bloom(x, nx, ny, 5 + br() * 9, col, 0.3);
          x.fillStyle = K.rgba(K.mix(col, '#fff', 0.4), 0.7); x.fillRect(nx - 1.4, ny - 1.4, 2.8, 2.8);
        }
        K.bloom(x, cx, cy, Math.min(bw, bh) * 0.34, P.node, 0.22);
        x.restore();
      }
    }
    // a low fountain glow at the dead centre of the whole parterre
    if (r() < 0.7) fountain(x, P, W / 2, H / 2, Math.min(W, H) * 0.06, r);
    fireflies(x, P, W, 0, H, Math.floor(p.fireflies * 0.6), r);
  }

  /* ════════════════════════════════════════════════════════════════════════
     LAYOUT D — HEDGE MAZE: an oblique overhead view of a glowing hedge maze —
     a dense grid of circuit-hedge walls with dark walk-channels between, lit at
     junctions. Receding slightly so the far walls haze out. Teeming, structural.
     ════════════════════════════════════════════════════════════════════════ */
  function drawMaze(x, P, W, H, p, noise, seed) {
    const r = p.r, blue = p.hour === 'Blue Hour';
    const HZ = H * 0.16;
    // thin sky band at very top, then the maze fills the rest (high oblique)
    sky(x, P, W, HZ, seed, r, blue);
    const gr = x.createLinearGradient(0, HZ, 0, H);
    gr.addColorStop(0, K.mix(P.sky, P.body, 0.12));
    gr.addColorStop(1, K.mix(P.sky, '#000', 0.18));
    x.fillStyle = gr; x.fillRect(0, HZ, W, H - HZ);

    // maze grid in a pseudo-perspective: cells get bigger toward the bottom.
    const cols = K.rint(r, 9, 13);
    const top = HZ + 6, bot = H * 1.02;
    const rowsN = K.rint(r, 9, 13);
    // build a walls set: for each cell, randomly carve passages (just visual).
    // We draw hedge wall segments on a grid; channels stay dark.
    const wallCol = K.mix(P.body, P.sky, 0.1);
    for (let gy = 0; gy < rowsN; gy++) {
      const t0 = gy / rowsN, t1 = (gy + 1) / rowsN;
      // perspective: vertical compression toward top
      const y0 = top + (bot - top) * Math.pow(t0, 1.5);
      const y1 = top + (bot - top) * Math.pow(t1, 1.5);
      const depth = t0; // 0 far .. 1 near
      // horizontal inset shrinks the field toward the top (vanishing)
      const inset0 = W * 0.5 * (1 - t0) * 0.18;
      const inset1 = W * 0.5 * (1 - t1) * 0.18;
      const cw0 = (W - inset0 * 2) / cols;
      for (let gx = 0; gx < cols; gx++) {
        if (r() < 0.32) continue; // carve a passage (dark channel)
        const cellH = y1 - y0;
        const cellW = cw0;
        const px = inset0 + gx * cellW;
        const by = y1;
        const w = cellW * 0.86;
        const h = cellH * (1.4 + r() * 0.8); // walls taller than cell → hedge mass
        const cx = px + cellW / 2;
        // hedge wall block (use cube silhouette → wall-like)
        const useed = (seed + gx * 53 + gy * 7) >>> 0;
        topiary(x, P, cx, by, w, h, 'cube', K.clamp(0.25 + depth, 0, 1), K.rng(useed), { detail: 0.7 + depth * 0.6 });
      }
    }
    // a faint walk-channel glow grid overlay (the lit floor between hedges)
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let gy = 0; gy <= rowsN; gy++) {
      const t = gy / rowsN; const y = top + (bot - top) * Math.pow(t, 1.5);
      x.strokeStyle = K.rgba(P.trace, 0.06 + 0.1 * t); x.lineWidth = 1;
      x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
    }
    x.restore();
    fireflies(x, P, W, HZ, H, p.fireflies, r);
  }

  /* ════════════════════════════════════════════════════════════════════════
     LAYOUT E — PROMENADE: a single long row of topiary marching down ONE side,
     receding to a low side vanishing point. Huge calm sky/negative space on the
     other side. Sparse, asymmetric, atmospheric — the "far/tiny-scale" read.
     ════════════════════════════════════════════════════════════════════════ */
  function drawPromenade(x, P, W, H, p, noise, seed) {
    const r = p.r, blue = p.hour === 'Blue Hour';
    const HZ = H * 0.5;
    const side = r() < 0.5 ? -1 : 1;       // -1 = row on left, 1 = row on right
    const vx = side < 0 ? W * 0.18 : W * 0.82;
    sky(x, P, W, HZ, seed, r, blue);
    K.bloom(x, vx, HZ, W * 0.6, P.body, blue ? 0.2 : 0.12);
    // a low moon/light disc in the open sky
    const moonX = side < 0 ? W * 0.72 : W * 0.28, moonY = HZ * (0.4 + r() * 0.3);
    K.bloom(x, moonX, moonY, W * 0.18, K.mix(P.node, '#fff', 0.3), 0.16);
    x.save(); x.globalCompositeOperation = 'lighter';
    x.fillStyle = K.rgba(K.mix(P.node, '#fff', 0.5), 0.5);
    x.beginPath(); x.ellipse(moonX, moonY, W * 0.022, W * 0.022, 0, 0, 7); x.fill();
    x.restore();

    const gr = x.createLinearGradient(0, HZ, 0, H);
    gr.addColorStop(0, K.mix(P.sky, P.body, 0.24));
    gr.addColorStop(1, K.mix(P.sky, '#000', 0.14));
    x.fillStyle = gr; x.fillRect(0, HZ, W, H - HZ);
    // distant hedge wall low on far side
    x.fillStyle = K.rgba(K.mix(P.body, P.sky, 0.5), 0.45);
    x.beginPath(); x.moveTo(0, HZ);
    for (let xx = 0; xx <= W; xx += 24) x.lineTo(xx, HZ - (4 + noise.fbm(xx / 90, seed, 3) * 14));
    x.lineTo(W, HZ); x.closePath(); x.fill();

    // a glowing edge path along the row's side
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.trace, 0.22); x.lineWidth = 1.6;
    x.beginPath();
    x.moveTo(side < 0 ? W * 0.02 : W * 0.98, H);
    x.lineTo(vx, HZ); x.stroke();
    x.restore();

    // THE row — a clear march of specimens, big near → tiny far, same shape
    // (formal). Spread along the diagonal with a perspective curve so mid &
    // far ones stay visible instead of piling into the near corner.
    const N = K.rint(r, 8, 11);
    const shape = p.shapeBias;
    const forms = [];
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);                 // 0 near .. 1 far (even index)
      const t = Math.pow(u, 0.62);           // perspective: pack toward the far end
      const depth = 1 - t;
      const py = H - (H - HZ) * (t * 0.86 + 0.06);
      // x marches from the near-edge corner toward vx
      const nearX = side < 0 ? W * 0.2 : W * 0.8;
      const cx = nearX + (vx - nearX) * t;
      const sz = 30 + depth * depth * 150;
      forms.push({ cx, by: py, w: sz, h: sz * (1.05 + r() * 0.45), shape, depth, useed: (seed + i * 23) >>> 0 });
    }
    forms.sort((a, b) => a.depth - b.depth);
    for (const f of forms) topiary(x, P, f.cx, f.by, f.w, f.h, f.shape, f.depth, K.rng(f.useed), { detail: 1.3, rim: true });

    // one fountain near the foreground of the row
    const f0 = forms[forms.length - 1];
    if (r() < 0.6) fountain(x, P, f0.cx + (side < 0 ? f0.w * 0.7 : -f0.w * 0.7), f0.by, f0.w * 0.4, r);
    fireflies(x, P, W, HZ, H, Math.floor(p.fireflies * 0.8), r);
  }

  /* ════════════════════════════════════════════════════════════════════════
     LAYOUT F — LIGHT FOUNTAIN: a fountain-dominant centrepiece scene. A big
     central light-fountain on a circular plinth, ringed by a few topiary, lots
     of falling-data particles and bloom. Sparse, hero-of-light.
     ════════════════════════════════════════════════════════════════════════ */
  function drawFountainScene(x, P, W, H, p, noise, seed) {
    const r = p.r, blue = p.hour === 'Blue Hour';
    const HZ = H * 0.46;
    sky(x, P, W, HZ, seed, r, blue);
    const cx = W * 0.5, cy = H * 0.62;
    K.bloom(x, cx, HZ, W * 0.5, P.body, blue ? 0.2 : 0.12);

    const gr = x.createLinearGradient(0, HZ, 0, H);
    gr.addColorStop(0, K.mix(P.sky, P.body, 0.16));
    gr.addColorStop(1, K.mix(P.sky, '#000', 0.22));
    x.fillStyle = gr; x.fillRect(0, HZ, W, H - HZ);
    // distant hedge wall
    x.fillStyle = K.rgba(K.mix(P.body, P.sky, 0.5), 0.5);
    x.beginPath(); x.moveTo(0, HZ);
    for (let xx = 0; xx <= W; xx += 24) x.lineTo(xx, HZ - (6 + noise.fbm(xx / 80, seed, 3) * 20));
    x.lineTo(W, HZ); x.closePath(); x.fill();

    // a ring of small/mid topiary around the plinth (behind the fountain)
    const ringN = K.rint(r, 5, 7);
    const ring = [];
    for (let i = 0; i < ringN; i++) {
      const a = Math.PI + (i / (ringN - 1)) * Math.PI; // back arc
      const rad = W * 0.3;
      const tx = cx + Math.cos(a) * rad, ty = cy + Math.sin(a) * rad * 0.34;
      const depth = K.clamp(0.4 + (ty - HZ) / (H - HZ) * 0.6, 0.2, 1);
      const sz = 50 + depth * 90;
      ring.push({ cx: tx, by: ty + sz * 0.2, w: sz, h: sz * (1 + r() * 0.4), shape: K.pick(SHAPES, r), depth, useed: (seed + i * 37) >>> 0 });
    }
    ring.sort((a, b) => a.depth - b.depth);
    for (const f of ring) topiary(x, P, f.cx, f.by, f.w, f.h, f.shape, f.depth, K.rng(f.useed));

    // circular plinth glow
    x.save(); x.globalCompositeOperation = 'lighter';
    const pg = x.createRadialGradient(cx, cy + 30, 0, cx, cy + 30, W * 0.26);
    pg.addColorStop(0, K.rgba(P.node, 0.18));
    pg.addColorStop(1, K.rgba(P.node, 0));
    x.fillStyle = pg; x.beginPath(); x.ellipse(cx, cy + 30, W * 0.26, W * 0.09, 0, 0, 7); x.fill();
    x.restore();

    // THE big central fountain — twice the spray
    const scale = W * 0.13;
    fountain(x, P, cx, cy, scale, r);
    fountain(x, P, cx, cy, scale * 0.7, r);
    // tall central jet column glow
    x.save(); x.globalCompositeOperation = 'lighter';
    const jg = x.createLinearGradient(0, cy - scale * 3, 0, cy);
    jg.addColorStop(0, K.rgba(P.node, 0));
    jg.addColorStop(1, K.rgba(P.node, 0.16));
    x.fillStyle = jg; x.fillRect(cx - scale * 0.4, cy - scale * 3, scale * 0.8, scale * 3);
    x.restore();

    fireflies(x, P, W, HZ, H, p.fireflies, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r, seed), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    switch (p.layout) {
      case 'Hero Specimen': drawHero(x, P, W, H, p, noise, seed); break;
      case 'Parterre': drawParterre(x, P, W, H, p, noise, seed); break;
      case 'Hedge Maze': drawMaze(x, P, W, H, p, noise, seed); break;
      case 'Promenade': drawPromenade(x, P, W, H, p, noise, seed); break;
      case 'Light Fountain': drawFountainScene(x, P, W, H, p, noise, seed); break;
      default: drawAllee(x, P, W, H, p, noise, seed); break;
    }

    finish(x, P, W, H, noise, r, p.mist);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'topiary', draw, traits };
})();
