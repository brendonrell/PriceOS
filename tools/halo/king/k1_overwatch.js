/* K1 — OVERWATCH  (the god's-eye data-sprawl)
 * An epic top-down / high-orbital view looking straight DOWN onto an abstract
 * megacity that is simultaneously a circuit-board and a star-map: glowing
 * district CELLS of varied density tessellate the map, luminous DATA-ARTERIES
 * thread between district hubs, terminal HUD annotations (callout boxes, target
 * reticles, glyph readouts, coordinate ticks) label regions, drifting CLOUD /
 * HAZE layers pass over the city, and a SCAN-SWEEP rakes across. Surveilling a
 * living machine-metropolis from orbit. Busy, deep, varied, color-forward.
 * NOT a skyline of towers — the view is straight down, a luminous map. */
window.ENGINE = (function () {
  const K = window.KIT;

  // ── Cyberpunk-terminal colorways. SATURATED jewel/phosphor grounds + vivid
  //    accents. roles: void=deep ground, deep=district fill base, glow=primary
  //    district light, art=data-artery, hub=node core, hud=interface, alert=hot
  //    event/chase, ink=cool secondary district light. NO outrun pastel sunsets.
  const PALS = [
    { name: 'Reactor Grid',  void: '#03100b', deep: '#06402c', glow: '#2dffa6', art: '#9bffd6', hub: '#ffd23d', hud: '#46ffb0', alert: '#ff3d6e', ink: '#16c8ff' },
    { name: 'Deep Cyan',     void: '#020a18', deep: '#062a52', glow: '#27b8ff', art: '#8ce8ff', hub: '#ff3df0', hud: '#3ce0ff', alert: '#ffd23d', ink: '#56ff9e' },
    { name: 'Ultraviolet',   void: '#0a0420', deep: '#2a126e', glow: '#9b5dff', art: '#d3a8ff', hub: '#3df0ff', hud: '#b07bff', alert: '#ff3d8a', ink: '#ff7adb' },
    { name: 'Magma Core',    void: '#16050a', deep: '#5a1410', glow: '#ff6a1f', art: '#ffc04d', hub: '#ffe23d', hud: '#ff8a4d', alert: '#36e0ff', ink: '#ff3d6e' },
    { name: 'Toxic Bloom',   void: '#070f02', deep: '#234a08', glow: '#b6ff1f', art: '#e6ff7d', hub: '#ff2dba', hud: '#c6ff2d', alert: '#27c0ff', ink: '#2dffd0' },
    { name: 'Magenta Drift', void: '#150318', deep: '#52084a', glow: '#ff2da0', art: '#ff9be8', hub: '#ffd23d', hud: '#ff5dc8', alert: '#3df0ff', ink: '#9b6bff' },
    { name: 'Glacier Net',   void: '#03101c', deep: '#0a3a5a', glow: '#27d8e8', art: '#aef4ff', hub: '#ff5db0', hub2: '#ffd23d', hud: '#7ae8ff', alert: '#ffc23d', ink: '#5d9bff' },
    { name: 'Gold Lattice',  void: '#120c02', deep: '#4a3208', glow: '#ffc41f', art: '#ffe89b', hub: '#36e0d0', hud: '#ffd24d', alert: '#ff3d6e', ink: '#ff8a3d' },
  ];

  const FMTS = [
    { W: 1280, H: 1280, t: 'Orbital' },     // square
    { W: 1100, H: 1280, t: 'Sector' },      // portrait
    { W: 1280, H: 1040, t: 'Sweep' },       // landscape
  ];
  const DENS  = ['Sparse', 'Settled', 'Dense', 'Megablock'];
  const GRID  = ['Voronoi', 'Radial', 'Quad'];           // district tessellation style
  const SCAN  = ['Sweep', 'Sonar', 'Pulse', 'Dark'];     // scan-sweep mode
  // rare CHASE events (collectability jackpots)
  const EVENT = ['None','None','None','None','None','None','Meltdown','Datastorm','Eclipse Pass'];
  const GLY = '0123456789ABCDEF░▒▓│┤╣║╗╝╚╔╩╦╠═╬⌐¬◊◆▮▯⟁⟁ｱｲｳｴｵｶｷｸﾊﾋﾌﾍﾎ';

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const dens = K.pick(DENS, r);
    const grid = K.pick(GRID, r);
    const scan = K.pick(SCAN, r);
    const event = K.pick(EVENT, r);
    return { pal, fmt, dens, grid, scan, event };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Density: p.dens, Grid: p.grid, Scan: p.scan, Event: p.event };
  }

  const densCount = (d) => d === 'Sparse' ? 0.55 : d === 'Settled' ? 0.85 : d === 'Dense' ? 1.25 : 1.7;

  // ── seeded site scatter for district cells (jittered grid → organic Voronoi) ──
  function sites(p, W, H, r) {
    const pts = [];
    const n = Math.round((p.grid === 'Radial' ? 30 : 26) * densCount(p.dens));
    if (p.grid === 'Radial') {
      // a great central hub-spiral that still fills the whole frame: dense core
      // ringed outward to the corners so it reads as a city, not a lens flare.
      const cx = W * (0.46 + (r() - 0.5) * 0.12), cy = H * (0.46 + (r() - 0.5) * 0.12);
      const maxR = Math.hypot(W, H) * 0.62;
      const rings = K.rint(r, 8, 11);
      pts.push({ x: cx, y: cy });
      for (let ri = 1; ri <= rings; ri++) {
        const rad = maxR * (ri / rings);              // even radial spacing → fills frame
        const cnt = 5 + ri * 3 + Math.round(r() * 3); // more per ring outward
        const off = r() * Math.PI * 2 + ri * 0.45;    // spiral twist
        for (let i = 0; i < cnt; i++) {
          const a = off + i / cnt * Math.PI * 2 + (r() - 0.5) * 0.3;
          const rr = rad * (0.9 + r() * 0.22);
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
          if (px < -W * 0.1 || px > W * 1.1 || py < -H * 0.1 || py > H * 1.1) continue;
          pts.push({ x: px, y: py });
        }
      }
    } else {
      const gc = p.grid === 'Quad' ? 6 : 7;
      const cw = W / gc, ch = H / gc;
      for (let gy = 0; gy < gc; gy++) for (let gx = 0; gx < gc; gx++) {
        if (p.dens === 'Sparse' && r() < 0.25) continue;
        const j = p.grid === 'Quad' ? 0.18 : 0.42;
        pts.push({ x: (gx + 0.5 + (r() - 0.5) * 2 * j) * cw, y: (gy + 0.5 + (r() - 0.5) * 2 * j) * ch });
      }
    }
    // trim/extend to roughly n
    return pts.slice(0, Math.max(8, Math.min(pts.length, n)));
  }

  // nearest-site assignment over a coarse grid → fill convex-ish district cells.
  // Returns per-site cell pixels rendered directly (fast: coarse cell raster).
  function paintDistricts(x, p, P, W, H, pts, noise, r) {
    const step = Math.max(5, Math.floor(Math.min(W, H) / 200)); // coarse raster
    // precompute per-site style
    const styles = pts.map((s, i) => {
      const t = i / pts.length;
      const lvl = r();                                  // brightness level
      const cool = r() < 0.42;
      const baseGlow = cool ? P.ink : P.glow;
      const fill = K.mix(P.void, P.deep, 0.5 + lvl * 0.5);
      const kr = r();
      const kind = kr < 0.4 ? 'grid' : kr < 0.7 ? 'sprawl' : 'core';
      return { lvl, fill, baseGlow, kind, hot: r() < 0.16, cool, hub: { x: s.x, y: s.y } };
    });
    // raster: assign each coarse cell to nearest 1 & 2 sites for borders
    x.save();
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        let b0 = 1e9, b1 = 1e9, i0 = 0;
        for (let i = 0; i < pts.length; i++) {
          const dx = xx - pts[i].x, dy = yy - pts[i].y;
          const d = dx * dx + dy * dy;
          if (d < b0) { b1 = b0; b0 = d; i0 = i; } else if (d < b1) { b1 = d; }
        }
        const st = styles[i0];
        // base district fill, modulated by noise so it isn't flat
        const nn = (noise.fbm(xx / 220, yy / 220, 3) + 1) / 2;
        const fc = K.mix(st.fill, st.baseGlow, 0.06 + nn * 0.10 + st.lvl * 0.08);
        x.fillStyle = fc;
        x.fillRect(xx, yy, step + 1, step + 1);
        // district border (Voronoi edge) where 1st and 2nd nearest are close —
        // a bright lit "wall"/canyon between districts (the map's defining lines)
        const edge = Math.sqrt(b1) - Math.sqrt(b0);
        if (edge < step * 2.2) {
          const k = 1 - edge / (step * 2.2);
          // dark canyon trench
          x.save(); x.globalCompositeOperation = 'multiply';
          x.fillStyle = K.rgba(P.void, 0.25 * k);
          x.fillRect(xx, yy, step + 1, step + 1);
          x.restore();
          // glowing edge wire on the sharp seam
          if (edge < step * 1.0) {
            x.save(); x.globalCompositeOperation = 'lighter';
            x.fillStyle = K.rgba(st.cool ? P.ink : P.hud, 0.16 + (1 - edge / step) * 0.30);
            x.fillRect(xx, yy, step + 1, step + 1);
            x.restore();
          }
        }
      }
    }
    x.restore();
    return styles;
  }

  // micro-texture inside districts: glowing "building blocks" / circuit cells.
  // Each district gets a character: GRID (orderly blocks on a lattice),
  // SPRAWL (organic scatter), or CORE (dense bright center) — for variety.
  function districtBlocks(x, p, P, W, H, pts, styles, r) {
    const perSite = Math.round(150 * densCount(p.dens));
    for (let i = 0; i < pts.length; i++) {
      const s = pts[i], st = styles[i];
      // local cell radius estimate: distance to nearest other site
      let nd = 1e9;
      for (let j = 0; j < pts.length; j++) { if (j === i) continue; const dx = s.x - pts[j].x, dy = s.y - pts[j].y; const d = dx * dx + dy * dy; if (d < nd) nd = d; }
      const R = Math.sqrt(nd) * 0.5;
      const inside = (bx, by) => { let bd = (bx - s.x) ** 2 + (by - s.y) ** 2; for (let j = 0; j < pts.length; j++) { if (j === i) continue; const d = (bx - pts[j].x) ** 2 + (by - pts[j].y) ** 2; if (d < bd) return false; } return true; };
      const lit = st.cool ? P.ink : P.glow;
      const kind = st.kind;
      x.save(); x.globalCompositeOperation = 'lighter';

      if (kind === 'grid' && R > 16) {
        // orderly city blocks on a rotated lattice
        const ang = r() * Math.PI; const ca = Math.cos(ang), sa = Math.sin(ang);
        const cell = Math.max(4, R / (4 + r() * 5));
        for (let gx = -R; gx < R; gx += cell) for (let gy = -R; gy < R; gy += cell) {
          if (r() > (0.35 + st.lvl * 0.55)) continue;
          const lx = gx + (r() - 0.5) * cell * 0.3, ly = gy + (r() - 0.5) * cell * 0.3;
          const bx = s.x + lx * ca - ly * sa, by = s.y + lx * sa + ly * ca;
          if (!inside(bx, by)) continue;
          const on = r(); const col = on < 0.7 ? lit : (on < 0.88 ? P.art : (st.hot ? P.alert : P.hub));
          x.fillStyle = K.rgba(col, (0.2 + st.lvl * 0.55) * (0.45 + r() * 0.55));
          const bw = cell * (0.4 + r() * 0.4), bh = cell * (0.4 + r() * 0.4);
          x.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
        }
      } else {
        // organic sprawl / core
        const cells = Math.round(perSite * (0.5 + st.lvl) * (kind === 'core' ? 1.3 : 1));
        for (let k = 0; k < cells; k++) {
          const a = r() * Math.PI * 2, rr = Math.pow(r(), kind === 'core' ? 1.4 : 0.7) * R;
          const bx = s.x + Math.cos(a) * rr, by = s.y + Math.sin(a) * rr;
          if (!inside(bx, by)) continue;
          const sz = 1.0 + r() * (2.4 + st.lvl * 3);
          const on = r();
          const col = on < 0.6 ? lit : (on < 0.82 ? P.art : (st.hot && on < 0.95 ? P.alert : P.hub));
          x.fillStyle = K.rgba(col, (0.16 + st.lvl * 0.5) * (0.4 + r() * 0.6));
          if (r() < 0.72) x.fillRect(bx, by, sz, sz * (0.5 + r()));
          else { x.beginPath(); x.arc(bx, by, sz * 0.6, 0, Math.PI * 2); x.fill(); }
        }
      }

      // street-grid wash inside denser districts (the circuit-board read)
      if (st.lvl > 0.4 && R > 26) {
        x.strokeStyle = K.rgba(lit, 0.04 + st.lvl * 0.07); x.lineWidth = 0.6;
        const g = Math.max(6, R / 8);
        for (let gx = -R; gx < R; gx += g) { x.beginPath(); x.moveTo(s.x + gx, s.y - R); x.lineTo(s.x + gx, s.y + R); x.stroke(); }
        for (let gy = -R; gy < R; gy += g) { x.beginPath(); x.moveTo(s.x - R, s.y + gy); x.lineTo(s.x + R, s.y + gy); x.stroke(); }
      }
      x.restore();
    }
  }

  // ── DATA-ARTERIES: luminous highways of light threading between hub nodes ──
  function arteries(x, p, P, W, H, pts, r, noise) {
    // build a sparse graph: connect each site to a few NEAREST sites only, so
    // arteries hug the local street grid instead of shooting across the frame.
    const maxLen = Math.min(W, H) * 0.34;
    const links = [];
    const seen = new Set();
    for (let i = 0; i < pts.length; i++) {
      const ds = pts.map((q, j) => ({ j, d: (pts[i].x - q.x) ** 2 + (pts[i].y - q.y) ** 2 })).sort((a, b) => a.d - b.d);
      const kc = K.rint(r, 2, 3);
      for (let m = 1; m <= kc && m < ds.length; m++) {
        const j = ds[m].j; if (Math.sqrt(ds[m].d) > maxLen) continue;
        const key = i < j ? i + ',' + j : j + ',' + i;
        if (seen.has(key)) continue; seen.add(key);
        links.push([i, j, ds[m].d]);
      }
    }
    x.save();
    for (const [i, j] of links) {
      const a = pts[i], b = pts[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      // curved artery via a perpendicular bow
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const nx = -(b.y - a.y) / dist, ny = (b.x - a.x) / dist;
      const bow = (r() - 0.5) * dist * 0.22;
      const cx = mx + nx * bow, cy = my + ny * bow;
      const major = r() < 0.36;
      const path = () => { x.beginPath(); x.moveTo(a.x, a.y); x.quadraticCurveTo(cx, cy, b.x, b.y); x.stroke(); };
      // dark casing under the light (road bed) for depth
      x.globalCompositeOperation = 'source-over';
      x.strokeStyle = K.rgba(P.void, 0.65); x.lineWidth = (major ? 8 : 3.6); path();
      // outer glow halo
      x.globalCompositeOperation = 'lighter';
      const col = major ? P.art : (r() < 0.5 ? P.glow : P.ink);
      x.strokeStyle = K.rgba(col, major ? 0.22 : 0.12); x.lineWidth = major ? 7 : 3.4; path();
      // glowing artery core
      x.strokeStyle = K.rgba(col, major ? 0.7 : 0.4); x.lineWidth = major ? 3 : 1.5; path();
      // bright hot center line
      x.strokeStyle = K.rgba('#ffffff', major ? 0.4 : 0.16); x.lineWidth = major ? 1.1 : 0.6; path();
      // traffic packets along the artery
      const pk = Math.floor(dist / (major ? 20 : 40));
      for (let s = 0; s < pk; s++) {
        const t = (s + r() * 0.6) / Math.max(1, pk);
        const px = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cx + t * t * b.x;
        const py = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cy + t * t * b.y;
        x.fillStyle = K.rgba(r() < 0.18 ? P.alert : (major ? '#ffffff' : col), 0.5 + r() * 0.5);
        const ps = major ? 1.6 + r() * 1.4 : 1 + r();
        x.fillRect(px - ps / 2, py - ps / 2, ps, ps);
      }
    }
    x.restore();
  }

  // ── HUB NODES: luminous cores where arteries converge (the bright stars) ──
  function hubs(x, p, P, W, H, pts, styles, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pts.length; i++) {
      const s = pts[i], st = styles[i];
      const major = st.lvl > 0.6 || st.hot;
      const col = st.hot ? P.alert : (st.cool ? P.ink : P.hub);
      const R = (major ? 16 : 8) + st.lvl * 18;
      K.bloom(x, s.x, s.y, R * 1.6, col, major ? 0.5 : 0.28);
      // core dot
      x.fillStyle = K.rgba('#ffffff', major ? 0.9 : 0.55);
      x.beginPath(); x.arc(s.x, s.y, major ? 2.4 : 1.4, 0, Math.PI * 2); x.fill();
      x.fillStyle = K.rgba(col, 0.8);
      x.beginPath(); x.arc(s.x, s.y, major ? 4.5 : 2.6, 0, Math.PI * 2); x.fill();
      // node ring for majors
      if (major) {
        x.strokeStyle = K.rgba(col, 0.5); x.lineWidth = 1;
        x.beginPath(); x.arc(s.x, s.y, R * 0.7, 0, Math.PI * 2); x.stroke();
      }
    }
    x.restore();
  }

  // ── HUD: callout boxes labelling regions (leader line + readout panel) ──
  function calloutBox(x, P, ax, ay, bx, by, bw, bh, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    // leader line from anchor (region) to box
    x.strokeStyle = K.rgba(P.hud, 0.5); x.lineWidth = 1;
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
    x.fillStyle = K.rgba(P.hud, 0.7); x.beginPath(); x.arc(ax, ay, 2, 0, Math.PI * 2); x.fill();
    // panel
    x.fillStyle = K.rgba(P.void, 0.45); x.globalCompositeOperation = 'source-over'; x.fillRect(bx, by, bw, bh);
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.hud, 0.6); x.lineWidth = 1; x.strokeRect(bx, by, bw, bh);
    const b = Math.min(bw, bh) * 0.22; x.lineWidth = 1.4; x.strokeStyle = K.rgba('#ffffff', 0.6);
    [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]].forEach(([px, py, sx, sy]) => { x.beginPath(); x.moveTo(px + sx * b, py); x.lineTo(px, py); x.lineTo(px, py + sy * b); x.stroke(); });
    // title bar
    x.fillStyle = K.rgba(P.hud, 0.18); x.fillRect(bx, by, bw, bh * 0.26);
    // glyph readout rows
    const fs = Math.max(7, bh * 0.16); x.font = `${fs}px monospace`; x.textBaseline = 'top';
    const rows = K.rint(r, 2, 4);
    for (let i = 0; i < rows; i++) {
      let c = bx + 4; const ry = by + bh * 0.30 + i * (bh * 0.62 / rows);
      const ng = K.rint(r, 4, 9);
      for (let k = 0; k < ng; k++) { x.fillStyle = K.rgba(r() < 0.16 ? P.alert : (r() < 0.5 ? P.hud : '#ffffff'), 0.4 + r() * 0.4); x.fillText(GLY[Math.floor(r() * GLY.length)], c, ry); c += fs * (0.7 + r() * 0.5); if (c > bx + bw - fs) break; }
    }
    x.restore();
  }

  // target reticle locked on a region
  function reticle(x, P, cx, cy, rad, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba('#ffffff', 0.7); x.lineWidth = 1.1;
    for (const rr of [rad, rad * 0.6]) { x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke(); }
    const ticks = 48; for (let i = 0; i < ticks; i++) { const a = i / ticks * Math.PI * 2, l = i % 4 === 0 ? rad * 0.12 : rad * 0.05; x.beginPath(); x.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.lineTo(cx + Math.cos(a) * (rad + l), cy + Math.sin(a) * (rad + l)); x.stroke(); }
    x.strokeStyle = K.rgba(P.hud, 0.5); x.beginPath(); x.moveTo(cx - rad * 1.3, cy); x.lineTo(cx + rad * 1.3, cy); x.moveTo(cx, cy - rad * 1.3); x.lineTo(cx, cy + rad * 1.3); x.stroke();
    // corner lock brackets
    const bs = rad * 0.5; x.strokeStyle = K.rgba('#ffffff', 0.8); x.lineWidth = 1.4;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const ax = cx + sx * rad * 0.78, ay = cy + sy * rad * 0.78; x.beginPath(); x.moveTo(ax - sx * bs * 0.4, ay); x.lineTo(ax, ay); x.lineTo(ax, ay - sy * bs * 0.4); x.stroke(); });
    x.restore();
  }

  // coordinate ticks / graticule around the frame margins
  function graticule(x, P, W, H, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.hud, 0.3); x.lineWidth = 1;
    const m = Math.min(W, H) * 0.035;
    const nx = 24, ny = 24;
    for (let i = 0; i <= nx; i++) { const px = m + (W - 2 * m) * i / nx; const l = i % 4 === 0 ? m * 0.5 : m * 0.22; x.beginPath(); x.moveTo(px, m); x.lineTo(px, m + l); x.moveTo(px, H - m); x.lineTo(px, H - m - l); x.stroke(); }
    for (let i = 0; i <= ny; i++) { const py = m + (H - 2 * m) * i / ny; const l = i % 4 === 0 ? m * 0.5 : m * 0.22; x.beginPath(); x.moveTo(m, py); x.lineTo(m + l, py); x.moveTo(W - m, py); x.lineTo(W - m - l, py); x.stroke(); }
    // frame brackets
    const b = Math.min(W, H) * 0.05; x.strokeStyle = K.rgba(P.hud, 0.55); x.lineWidth = 1.5;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([ax, ay, sx, sy]) => { x.beginPath(); x.moveTo(ax + sx * b, ay); x.lineTo(ax, ay); x.lineTo(ax, ay + sy * b); x.stroke(); });
    x.restore();
  }

  // header readout line, top-left, diegetic
  function header(x, P, W, H, r) {
    x.save(); x.globalCompositeOperation = 'lighter'; const fs = W * 0.013; x.font = `${fs}px monospace`; x.textBaseline = 'top';
    let hx = W * 0.06; const hy = H * 0.05;
    for (let i = 0; i < K.rint(r, 10, 18); i++) { x.fillStyle = K.rgba(r() < 0.14 ? P.alert : P.hud, 0.5 + r() * 0.4); x.fillText(GLY[Math.floor(r() * GLY.length)], hx, hy); hx += fs * (0.7 + r() * 0.8); }
    x.strokeStyle = K.rgba(P.hud, 0.35); x.lineWidth = 1; x.beginPath(); x.moveTo(W * 0.06, hy + fs * 1.5); x.lineTo(hx, hy + fs * 1.5); x.stroke();
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    // ── deep ground (never flat black: rich radial from void→deep) ──
    const g = x.createRadialGradient(W * 0.5, H * 0.46, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, K.mix(P.void, P.deep, 0.35));
    g.addColorStop(1, K.mix(P.void, '#000', 0.25));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // faint orbital base bloom so the map glows from within
    K.bloom(x, W * 0.5, H * 0.5, Math.max(W, H) * 0.55, P.glow, 0.06);

    // ── district cells (the megacity map) ──
    const pts = sites(p, W, H, r);
    const styles = paintDistricts(x, p, P, W, H, pts, noise, r);

    // low haze drift between map and detail (depth layer 1)
    K.hazeSheet(x, W, H, noise, K.mix(P.deep, P.glow, 0.3), 0.14, 110, 'screen');

    // district interior detail (the teeming blocks)
    districtBlocks(x, p, P, W, H, pts, styles, r);

    // ── rare CHASE: Eclipse Pass — a giant dark body shadowing part of the map ──
    if (p.event === 'Eclipse Pass') {
      x.save();
      const ex = W * (0.2 + r() * 0.6), ey = H * (0.2 + r() * 0.6), eR = Math.min(W, H) * (0.42 + r() * 0.12);
      const eg = x.createRadialGradient(ex, ey, eR * 0.3, ex, ey, eR);
      eg.addColorStop(0, K.rgba('#000', 0.72)); eg.addColorStop(0.82, K.rgba('#000', 0.5)); eg.addColorStop(1, K.rgba('#000', 0));
      x.globalCompositeOperation = 'multiply'; x.fillStyle = eg; x.fillRect(0, 0, W, H);
      // corona rim
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = K.rgba(P.art, 0.5); x.lineWidth = 2; x.beginPath(); x.arc(ex, ey, eR * 0.82, 0, Math.PI * 2); x.stroke();
      x.restore();
    }

    // ── data-arteries (highways of light) ──
    arteries(x, p, P, W, H, pts, r, noise);

    // ── hub nodes (bright convergence stars) ──
    hubs(x, p, P, W, H, pts, styles, r);

    // ── rare CHASE: Meltdown — a district goes critical (hot bloom + rings) ──
    if (p.event === 'Meltdown') {
      const s = pts[Math.floor(r() * pts.length)];
      x.save(); x.globalCompositeOperation = 'lighter';
      K.bloom(x, s.x, s.y, Math.min(W, H) * 0.34, P.alert, 0.5);
      for (let rr = 1; rr <= 4; rr++) { x.strokeStyle = K.rgba(P.alert, 0.4 / rr); x.lineWidth = 2; x.beginPath(); x.arc(s.x, s.y, Math.min(W, H) * 0.07 * rr, 0, Math.PI * 2); x.stroke(); }
      x.fillStyle = K.rgba('#ffffff', 0.9); x.beginPath(); x.arc(s.x, s.y, 4, 0, Math.PI * 2); x.fill();
      x.restore();
    }

    // ── drifting CLOUD / HAZE layers passing over the city (volumetric depth) ──
    K.hazeSheet(x, W, H, noise, K.mix(P.glow, '#ffffff', 0.2), 0.10, 200, 'screen');
    // a second, larger-scale cloud bank tinted cool
    const noise2 = K.makeNoise(seed ^ 0x9e3779b9);
    K.hazeSheet(x, W, H, noise2, K.mix(P.void, P.ink, 0.5), 0.16, 340, 'screen');

    // ── SCAN-SWEEP ──
    if (p.scan === 'Sweep') {
      const a0 = r() * Math.PI * 2; const cx = W * 0.5, cy = H * 0.5; const Rr = Math.hypot(W, H);
      x.save(); x.globalCompositeOperation = 'lighter';
      const sg = x.createLinearGradient(cx, cy, cx + Math.cos(a0) * Rr, cy + Math.sin(a0) * Rr);
      sg.addColorStop(0, K.rgba(P.hud, 0.0)); sg.addColorStop(0.85, K.rgba(P.hud, 0.06)); sg.addColorStop(1, K.rgba(P.hud, 0.16));
      // wedge
      x.fillStyle = sg; x.beginPath(); x.moveTo(cx, cy);
      x.arc(cx, cy, Rr, a0 - 0.16, a0 + 0.02); x.closePath(); x.fill();
      x.strokeStyle = K.rgba('#ffffff', 0.18); x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a0) * Rr, cy + Math.sin(a0) * Rr); x.stroke();
      x.restore();
    } else if (p.scan === 'Sonar') {
      const cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4);
      x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = K.rgba(P.hud, 0.3);
      for (let i = 0; i < 5; i++) { x.lineWidth = 1.4 - i * 0.2; x.globalAlpha = 0.5 - i * 0.08; x.beginPath(); x.arc(cx, cy, Math.min(W, H) * (0.08 + i * 0.1), 0, Math.PI * 2); x.stroke(); }
      x.restore();
    } else if (p.scan === 'Pulse') {
      // horizontal scanline band drifting
      const by = H * (0.2 + r() * 0.6);
      x.save(); x.globalCompositeOperation = 'lighter';
      const pg = x.createLinearGradient(0, by - H * 0.08, 0, by + H * 0.08);
      pg.addColorStop(0, K.rgba(P.hud, 0)); pg.addColorStop(0.5, K.rgba(P.hud, 0.14)); pg.addColorStop(1, K.rgba(P.hud, 0));
      x.fillStyle = pg; x.fillRect(0, by - H * 0.08, W, H * 0.16);
      x.strokeStyle = K.rgba('#ffffff', 0.2); x.lineWidth = 1; x.beginPath(); x.moveTo(0, by); x.lineTo(W, by); x.stroke();
      x.restore();
    }

    // ── rare CHASE: Datastorm — dense glyph rain sweeping the whole map ──
    if (p.event === 'Datastorm') {
      x.save(); x.globalCompositeOperation = 'lighter'; const fs = W * 0.014; x.font = `${fs}px monospace`; x.textBaseline = 'top';
      const cols = Math.floor(W / (fs * 1.1));
      for (let c = 0; c < cols; c++) { const cxp = c * fs * 1.1; const head = r() * H, len = H * (0.4 + r() * 0.6);
        for (let yy = 0; yy < H; yy += fs * 1.08) { const d = ((yy - head) % len + len) % len / len; const a = (1 - d) * 0.5; if (a < 0.05) continue; x.fillStyle = K.rgba(d < 0.08 ? '#ffffff' : (r() < 0.12 ? P.alert : P.hud), a); x.fillText(GLY[Math.floor(r() * GLY.length)], cxp, yy); } }
      x.restore();
    }

    // ════ HUD / TERMINAL OVERLAY (annotating the surveilled map) ════
    if (p.scan !== 'Dark') {
      header(x, P, W, H, r);
      graticule(x, P, W, H, r);
      // hero callout: lock onto the brightest district
      let heroI = 0, heroL = -1; for (let i = 0; i < styles.length; i++) { const v = styles[i].lvl + (styles[i].hot ? 0.5 : 0); if (v > heroL) { heroL = v; heroI = i; } }
      const hs = pts[heroI];
      reticle(x, P, hs.x, hs.y, Math.min(W, H) * (0.07 + r() * 0.04), r);
      // hero readout panel anchored off the reticle
      const hpw = W * (0.2 + r() * 0.06), hph = H * (0.12 + r() * 0.04);
      const hbx = K.clamp(hs.x + (hs.x < W * 0.5 ? W * 0.12 : -W * 0.12 - hpw), W * 0.05, W - hpw - W * 0.05);
      const hby = K.clamp(hs.y + (hs.y < H * 0.5 ? H * 0.1 : -H * 0.1 - hph), H * 0.07, H - hph - H * 0.07);
      calloutBox(x, P, hs.x, hs.y, hbx, hby, hpw, hph, r);
      // satellite callouts on other districts
      const sats = p.dens === 'Megablock' || p.dens === 'Dense' ? K.rint(r, 2, 4) : K.rint(r, 1, 2);
      const used = new Set([heroI]);
      for (let i = 0; i < sats; i++) {
        let pick = Math.floor(r() * pts.length); let guard = 0; while (used.has(pick) && guard++ < 8) pick = Math.floor(r() * pts.length);
        used.add(pick); const a = pts[pick];
        const pw = W * (0.11 + r() * 0.07), ph = H * (0.07 + r() * 0.05);
        const px = K.clamp(a.x + (r() - 0.5) * W * 0.2, W * 0.04, W - pw - W * 0.04);
        const py = K.clamp(a.y + (r() < 0.5 ? -H * 0.13 : H * 0.09), H * 0.05, H - ph - H * 0.05);
        calloutBox(x, P, a.x, a.y, px, py, pw, ph, r);
      }
      // a few free coordinate tags scattered on arteries
      x.save(); x.globalCompositeOperation = 'lighter'; const tfs = W * 0.011; x.font = `${tfs}px monospace`; x.textBaseline = 'top';
      for (let i = 0; i < K.rint(r, 3, 6); i++) { const a = pts[Math.floor(r() * pts.length)]; x.fillStyle = K.rgba(P.hud, 0.45); let s = ''; for (let k = 0; k < 4; k++) s += GLY[Math.floor(r() * 16)]; x.fillText(s, a.x + 6, a.y + 6); }
      x.restore();
    }

    // ── rare CHASE event tint ──
    if (p.event === 'Meltdown') K.hazeSheet(x, W, H, noise, P.alert, 0.06, 260, 'screen');

    // ── atmospheric falloff: keep deep corners rich, center luminous ──
    x.save(); x.globalCompositeOperation = 'screen';
    const lift = x.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.5);
    lift.addColorStop(0, K.rgba(K.mix(P.glow, P.deep, 0.5), 0.10)); lift.addColorStop(1, K.rgba(P.deep, 0));
    x.fillStyle = lift; x.fillRect(0, 0, W, H); x.restore();

    // ── CRT / film finish ──
    K.scanlines(x, W, H, 3, p.scan === 'Dark' ? 0.10 : 0.13);
    K.chromaSplit(x, W, H, p.event === 'Datastorm' ? 3 : 1);
    K.hazeSheet(x, W, H, noise, P.glow, 0.06, 240, 'screen');
    K.grain(x, W, H, 520, r);
    K.vignette(x, W, H, 0.5);
    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'k1_overwatch', draw, traits };
})();
