/* K4 — CONFLUX  ·  the data-delta seen from above
 * An epic abstract AERIAL view of a luminous data-basin: braided rivers of light
 * (data streams) winding + splitting across dark textured terrain, contour-line
 * terracing drawn like a terminal topo map, pools/confluences where streams meet
 * and bloom, terminal map-callouts (coordinate boxes, reticles, station markers,
 * glyph labels) annotating the cartography, drifting fog over the basin, deep
 * saturated glow in the channels. Half flowing fluid-painting, half cyberpunk
 * topographic console. Streams are driven by curl-noise so they feel alive. */
window.ENGINE = (function () {
  const K = window.KIT;

  // ── Custom cyberpunk-terminal colorways. SATURATED, terminal-phosphor.
  //   bg=basin void, terr=terrain wash, deep=channel floor, flow=river core,
  //   hot=hottest stream / bloom, glyph=map HUD ink, mark=station/alert accent.
  const PALS = [
    { name: 'Cryoflux',    bg: '#020611', terr: '#0a1830', deep: '#0a3a66', flow: '#26b6ff', hot: '#9bf0ff', glyph: '#5fe0ff', mark: '#ff5da8' },
    { name: 'Acid Delta',  bg: '#04100a', terr: '#0c2412', deep: '#1c5a14', flow: '#7dff2a', hot: '#e3ff8a', glyph: '#aaff44', mark: '#ff37d0' },
    { name: 'Magma Run',   bg: '#0f0602', terr: '#2a1006', deep: '#7a2a06', flow: '#ff7a1f', hot: '#ffd66b', glyph: '#ffae3d', mark: '#3df0ff' },
    { name: 'Violet Basin',bg: '#0a0518', terr: '#1a0f3a', deep: '#3a1f8a', flow: '#9b5dff', hot: '#d8b6ff', glyph: '#b07bff', mark: '#3dffd0' },
    { name: 'Hemoflow',    bg: '#100309', terr: '#2c0814', deep: '#7a0e2c', flow: '#ff2d5d', hot: '#ffa6c2', glyph: '#ff6f9a', mark: '#5fe0ff' },
    { name: 'Phosphor',    bg: '#020e09', terr: '#0a2a1c', deep: '#0e6640', flow: '#23ffa0', hot: '#b6ffe0', glyph: '#5fffb6', mark: '#ff5d5d' },
    { name: 'Tideglass',   bg: '#03100f', terr: '#0a2a2c', deep: '#0e6a6a', flow: '#22f0e0', hot: '#b6fff4', glyph: '#5ffff0', mark: '#ffcf3d' },
    { name: 'Goldvein',    bg: '#0d0a02', terr: '#241c06', deep: '#6e5210', flow: '#ffcf2a', hot: '#fff0a6', glyph: '#ffd86b', mark: '#3d9bff' },
  ];

  const FMTS = [ { W: 1280, H: 1280, t: 'Plate' }, { W: 1280, H: 1024, t: 'Survey' }, { W: 1040, H: 1280, t: 'Core' } ];
  const FLOW = ['Braided', 'Meander', 'Radial', 'Fracture'];  // network topology
  const BASIN = ['Lowland', 'Highland', 'Canyon', 'Wetland'];  // terrain character
  const DENSITY = ['Sparse', 'Networked', 'Teeming'];          // stream count
  const MODE = ['Survey', 'Recon', 'Trace'];                   // HUD treatment
  // rare CHASE events
  const EVENTS = ['None', 'None', 'None', 'None', 'None', 'None', 'Flood Bloom', 'Delta Supernova', 'Glitch Storm'];
  const GLY = '0123456789ABCDEF°′″+×÷ΔΞΛΣΦΨΩ◊◆▮▯╱╲◷⊕⊗↑↗→↘░▒▓ｱｲｳｴｵｶｷｸﾊﾋﾌ';

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const flow = K.pick(FLOW, r);
    const basin = K.pick(BASIN, r);
    const density = K.pick(DENSITY, r);
    const mode = K.pick(MODE, r);
    const event = K.pick(EVENTS, r);
    return { pal, fmt, flow, basin, density, mode, event };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Flow: p.flow, Basin: p.basin, Density: p.density, Overlay: p.mode, Event: p.event };
  }

  // ── one braided light-stream traced through the curl field ─────────────────
  // Returns the polyline so confluence/contour passes can react to it.
  function traceStream(x, P, noise, sx, sy, W, H, steps, stepLen, fieldScale, swirl, baseW, glow, r) {
    let px = sx, py = sy;
    const pts = [];
    let dirx = 0, diry = 1; // current heading (momentum keeps channels smooth)
    for (let i = 0; i < steps; i++) {
      pts.push([px, py]);
      // angle field from fbm → organic meandering; curl adds the braided swirl.
      const ang = noise.fbm(px * fieldScale, py * fieldScale, 4, 0.55, 2.1) * Math.PI * (1.6 + swirl);
      let fx = Math.cos(ang), fy = Math.sin(ang);
      const c = K.curl(noise, px * 1.4, py * 1.4, 1.2); // curl over a finer field → braiding wobble
      fx += c[0] * 1.6; fy += c[1] * 1.6;
      // mild drainage pull so the whole network drifts toward the basin mouth
      fy += 0.32; fx += (W * 0.5 - px) / W * 0.5 * swirl;
      // blend with momentum so rivers curve, never zig-zag
      dirx = dirx * 0.78 + fx * 0.22; diry = diry * 0.78 + fy * 0.22;
      const m = Math.hypot(dirx, diry) || 1;
      px += (dirx / m) * stepLen;
      py += (diry / m) * stepLen;
      if (px < -W * 0.12 || px > W * 1.12 || py > H * 1.12 || py < -H * 0.12) break;
    }
    if (pts.length < 3) return pts;
    // paint as layered additive ribbon: dark bed → wide deep glow → bright core
    x.save();
    // channel bed (subtractive-ish dark groove for terrain relief)
    x.globalCompositeOperation = 'source-over';
    x.strokeStyle = K.rgba(P.deep, 0.5); x.lineWidth = baseW * 2.4; x.lineJoin = 'round'; x.lineCap = 'round';
    strokePts(x, pts);
    x.globalCompositeOperation = 'lighter';
    // wide soft glow
    x.strokeStyle = K.rgba(P.flow, 0.10 * glow); x.lineWidth = baseW * 3.2; strokePts(x, pts);
    x.strokeStyle = K.rgba(P.flow, 0.18 * glow); x.lineWidth = baseW * 1.7; strokePts(x, pts);
    // bright core, width tapering along length (delta widens toward mouth)
    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length;
      const wcore = baseW * (0.35 + t * 0.85);
      x.strokeStyle = K.rgba(K.mix(P.flow, P.hot, t * 0.7), (0.4 + t * 0.4) * glow);
      x.lineWidth = wcore;
      x.beginPath(); x.moveTo(pts[i - 1][0], pts[i - 1][1]); x.lineTo(pts[i][0], pts[i][1]); x.stroke();
    }
    // hot specular thread
    x.strokeStyle = K.rgba(P.hot, 0.5 * glow); x.lineWidth = Math.max(0.6, baseW * 0.3); strokePts(x, pts);
    x.restore();
    return pts;
  }
  function strokePts(x, pts) {
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.stroke();
  }

  // ── confluence pool: a bright bloom where streams meet ─────────────────────
  function pool(x, P, cx, cy, rad, glow, r) {
    K.bloom(x, cx, cy, rad * 2.2, P.flow, 0.22 * glow);
    K.bloom(x, cx, cy, rad * 1.1, P.hot, 0.3 * glow);
    x.save(); x.globalCompositeOperation = 'lighter';
    // concentric ripple rings (terminal sonar read)
    x.strokeStyle = K.rgba(P.glyph, 0.18); x.lineWidth = 1;
    for (let i = 1; i <= 3; i++) { x.beginPath(); x.arc(cx, cy, rad * (0.5 + i * 0.45), 0, Math.PI * 2); x.stroke(); }
    x.restore();
  }

  // ── topographic contour terracing — terminal-drawn elevation rings ─────────
  function contours(x, P, noise, W, H, levels, scale, alpha, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const step = Math.max(2, Math.floor(Math.min(W, H) / 420));
    // march a fine grid, draw a dot where fbm crosses a level band — iso-line
    // approximation that reads as crisp terminal topo contours when dense.
    const bands = [];
    for (let i = 0; i < levels; i++) bands.push((i + 0.5) / levels * 2 - 1);
    // adaptive eps: contour line ~constant on-screen thickness regardless of step
    const eps = 0.013;
    const cInk = K.mix(P.terr, P.glyph, 0.55);
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        const n = noise.fbm(xx / scale, yy / scale, 5, 0.55, 2.05);
        for (let b = 0; b < bands.length; b++) {
          if (Math.abs(n - bands[b]) < eps) {
            const idx = b > levels * 0.7;          // every few rings: brighter "index contour"
            const hot = (b % 4 === 0);
            x.fillStyle = K.rgba(idx ? P.glyph : cInk, alpha * (hot ? 1.6 : 1.0));
            x.fillRect(xx, yy, hot ? 1.8 : 1.3, hot ? 1.8 : 1.3);
            break;
          }
        }
      }
    }
    x.restore();
  }

  // ── terminal map callouts: coordinate boxes, station markers, glyph labels ──
  function coordBox(x, P, cx, cy, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const w = 54 + r() * 70, h = 26 + r() * 22;
    x.fillStyle = K.rgba(P.bg, 0.4); x.fillRect(cx, cy, w, h);
    x.strokeStyle = K.rgba(P.glyph, 0.55); x.lineWidth = 1; x.strokeRect(cx + 0.5, cy + 0.5, w, h);
    // tab corner
    x.fillStyle = K.rgba(P.glyph, 0.6); x.fillRect(cx, cy, 8, 4);
    x.font = `${Math.round(h * 0.32)}px monospace`; x.textBaseline = 'top';
    x.fillStyle = K.rgba(P.glyph, 0.85);
    const tag = ['N','E','S','W'][Math.floor(r()*4)] + (10 + Math.floor(r()*80)) + "°" + Math.floor(r()*60);
    x.fillText(tag, cx + 5, cy + 4);
    x.fillStyle = K.rgba(r() < 0.3 ? P.mark : P.flow, 0.7);
    x.fillText('Q'+Math.floor(r()*999), cx + 5, cy + 4 + h * 0.42);
    // little bar readout
    const bn = 4 + Math.floor(r() * 4);
    for (let i = 0; i < bn; i++) { x.fillStyle = K.rgba(P.glyph, 0.4 + r() * 0.4); x.fillRect(cx + w - 6 - i * 5, cy + h - 4 - r() * (h * 0.5), 3, 3 + r() * (h * 0.4)); }
    x.restore();
  }
  function station(x, P, cx, cy, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const rad = 5 + r() * 7;
    x.strokeStyle = K.rgba(P.mark, 0.85); x.lineWidth = 1.3;
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.moveTo(cx - rad * 1.7, cy); x.lineTo(cx + rad * 1.7, cy); x.moveTo(cx, cy - rad * 1.7); x.lineTo(cx, cy + rad * 1.7); x.stroke();
    x.fillStyle = K.rgba(P.mark, 0.9); x.beginPath(); x.arc(cx, cy, 1.6, 0, Math.PI * 2); x.fill();
    K.bloom(x, cx, cy, rad * 3, P.mark, 0.18);
    // leader line + label
    const lx = cx + (r() < 0.5 ? -1 : 1) * (rad + 22), ly = cy - rad - 12;
    x.strokeStyle = K.rgba(P.glyph, 0.4); x.lineWidth = 0.8;
    x.beginPath(); x.moveTo(cx, cy - rad); x.lineTo(lx, ly); x.stroke();
    x.font = '11px monospace'; x.textBaseline = 'bottom';
    x.fillStyle = K.rgba(P.glyph, 0.8);
    x.fillText(['STN','NODE','GATE','WELL','VENT'][Math.floor(r()*5)] + '-' + Math.floor(r()*99), lx + 2, ly);
    x.restore();
  }
  function reticle(x, P, cx, cy, rad, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.glyph, 0.5); x.lineWidth = 1;
    for (const rr of [rad, rad * 0.6]) { x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke(); }
    const ticks = 48; for (let i = 0; i < ticks; i++) { const a = i / ticks * Math.PI * 2, l = i % 4 === 0 ? rad * 0.12 : rad * 0.05; x.beginPath(); x.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.lineTo(cx + Math.cos(a) * (rad + l), cy + Math.sin(a) * (rad + l)); x.stroke(); }
    x.strokeStyle = K.rgba(P.glyph, 0.35); x.beginPath(); x.moveTo(cx - rad * 1.3, cy); x.lineTo(cx + rad * 1.3, cy); x.moveTo(cx, cy - rad * 1.3); x.lineTo(cx, cy + rad * 1.3); x.stroke();
    x.restore();
  }
  function glyphScatter(x, P, W, H, n, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    x.font = `${Math.round(W * 0.011)}px monospace`; x.textBaseline = 'top';
    for (let i = 0; i < n; i++) {
      x.fillStyle = K.rgba(r() < 0.12 ? P.mark : P.glyph, 0.2 + r() * 0.4);
      x.fillText(GLY[Math.floor(r() * GLY.length)], r() * W, r() * H);
    }
    x.restore();
  }
  // map grid graticule — faint lat/long lines anchoring the cartography
  function graticule(x, P, W, H, r) {
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.glyph, 0.07); x.lineWidth = 1;
    const gx = 8 + Math.floor(r() * 4), gy = 8 + Math.floor(r() * 4);
    for (let i = 1; i < gx; i++) { x.beginPath(); x.moveTo(W * i / gx, 0); x.lineTo(W * i / gx, H); x.stroke(); }
    for (let i = 1; i < gy; i++) { x.beginPath(); x.moveTo(0, H * i / gy); x.lineTo(W, H * i / gy); x.stroke(); }
    x.restore();
  }

  function densCount(d) { return d === 'Teeming' ? 26 : d === 'Networked' ? 17 : 10; }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    // ── basin floor: textured dark terrain wash (never flat black) ──
    const bg = x.createLinearGradient(0, 0, W * 0.3, H);
    bg.addColorStop(0, K.mix(P.bg, P.terr, 0.5));
    bg.addColorStop(0.5, P.bg);
    bg.addColorStop(1, K.mix(P.bg, P.terr, 0.7));
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // terrain relief via fbm shading — pools of darker/lighter ground
    const tstep = Math.max(4, Math.floor(Math.min(W, H) / 200));
    x.save();
    for (let yy = 0; yy < H; yy += tstep) {
      for (let xx = 0; xx < W; xx += tstep) {
        const n = (noise.fbm(xx / 260, yy / 260, 5, 0.55, 2.1) + 1) / 2;
        const ridge = Math.abs(noise.fbm(xx / 120 + 40, yy / 120 + 40, 4) );
        const c = K.mix(P.bg, P.terr, K.clamp(n * 1.2, 0, 1));
        x.fillStyle = K.rgba(c, 0.5);
        x.fillRect(xx, yy, tstep + 1, tstep + 1);
        if (ridge < 0.04) { x.fillStyle = K.rgba(P.terr, 0.25); x.fillRect(xx, yy, tstep, tstep); }
      }
    }
    x.restore();
    // big saturated basin glow so color reads even where there are no streams
    K.bloom(x, W * (0.4 + r() * 0.2), H * (0.55 + r() * 0.2), Math.max(W, H) * 0.5, P.deep, 0.22);
    K.bloom(x, W * (0.5 + (r() - 0.5) * 0.4), H * (0.35 + r() * 0.2), Math.max(W, H) * 0.32, P.flow, 0.1);

    // ── contour terracing (topo console) — UNDER the rivers ──
    const cLevels = p.basin === 'Highland' ? 26 : p.basin === 'Canyon' ? 18 : 22;
    const cScale = p.basin === 'Canyon' ? 150 : p.basin === 'Wetland' ? 300 : 210;
    contours(x, P, noise, W, H, cLevels, cScale, 0.62, r);

    // ── the braided river network ─────────────────────────────────────────
    const fieldScale = p.flow === 'Fracture' ? 0.0055 : p.flow === 'Meander' ? 0.0019 : p.flow === 'Radial' ? 0.003 : 0.0032;
    const swirl = p.flow === 'Radial' ? 1.8 : p.flow === 'Meander' ? 0.35 : p.flow === 'Fracture' ? 1.3 : 0.9;
    const steps = Math.floor(Math.min(W, H) * (p.basin === 'Canyon' ? 0.85 : 1.0));
    const stepLen = 4.2;
    const baseW = (p.basin === 'Wetland' ? 5 : p.basin === 'Canyon' ? 9 : 6.5) * (W / 1280);
    const glow = p.basin === 'Wetland' ? 1.15 : 1.0;
    const N = densCount(p.density);
    const heads = [];
    // seed stream heads along the top / upper sides (sources feeding the basin)
    for (let i = 0; i < N; i++) {
      let sx, sy;
      if (p.flow === 'Radial') { const a = (i / N) * Math.PI * 2; sx = W / 2 + Math.cos(a) * W * 0.45; sy = H * 0.45 + Math.sin(a) * H * 0.4; }
      else {
        // sources spread across the upper basin AND down the left/right margins,
        // so the network sweeps across the whole frame rather than raining down.
        const e = r();
        if (e < 0.55) { sx = (i / N) * W + (r() - 0.5) * W * 0.14; sy = -H * 0.04 + r() * H * 0.28; }
        else if (e < 0.8) { sx = -W * 0.05 + r() * W * 0.12; sy = r() * H * 0.7; }
        else { sx = W * 0.93 + r() * W * 0.12; sy = r() * H * 0.7; }
      }
      heads.push([sx, sy]);
    }
    const allPts = [];
    for (const [sx, sy] of heads) {
      const pts = traceStream(x, P, noise, sx, sy, W, H, steps, stepLen, fieldScale, swirl, baseW * (0.7 + r() * 0.7), glow * (0.8 + r() * 0.5), r);
      if (pts.length > 4) allPts.push(pts);
      // braiding: spawn 1-2 distributary branches mid-course
      if (pts.length > 20 && r() < (p.flow === 'Braided' || p.flow === 'Fracture' ? 0.8 : 0.4)) {
        const bn = K.rint(r, 1, 2);
        for (let b = 0; b < bn; b++) {
          const idx = Math.floor(pts.length * (0.3 + r() * 0.5));
          const bp = traceStream(x, P, noise, pts[idx][0] + (r() - 0.5) * 14, pts[idx][1], W, H, Math.floor(steps * 0.6), stepLen, fieldScale * (1 + r() * 0.3), swirl, baseW * 0.55, glow * 0.85, r);
          if (bp.length > 4) allPts.push(bp);
        }
      }
    }

    // ── confluence pools where streams pass near each other (sampled) ──
    let poolCount = 0;
    for (let i = 0; i < allPts.length && poolCount < 9; i++) {
      const A = allPts[i];
      const a = A[Math.floor(A.length * (0.55 + r() * 0.4))];
      if (!a) continue;
      for (let j = i + 1; j < allPts.length; j++) {
        const B = allPts[j];
        const b = B[Math.floor(B.length * (0.55 + r() * 0.4))];
        if (!b) continue;
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) < W * 0.05) {
          pool(x, P, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, W * (0.02 + r() * 0.03), glow, r);
          poolCount++; break;
        }
      }
    }
    // delta mouth bloom — where the network exits the basin bottom
    pool(x, P, W * (0.4 + r() * 0.2), H * (0.92 + r() * 0.06), W * 0.06, glow * 1.2, r);

    // a thin second contour pass ON TOP of the rivers, so the topo console reads
    // even across the bright channels (the cartographic "drawn-by-terminal" feel)
    contours(x, P, noise, W, H, cLevels, cScale, 0.18, r);

    // drifting haze over the basin (signature hazy wash) — over rivers
    K.hazeSheet(x, W, H, noise, K.mix(P.terr, P.flow, 0.3), 0.3, 150, 'screen');
    K.hazeSheet(x, W, H, noise, P.deep, 0.18, 70, 'screen');

    // ── rare CHASE events ──
    if (p.event === 'Flood Bloom') {
      // the whole delta lights — every channel floods bright
      x.save(); x.globalCompositeOperation = 'lighter';
      for (const A of allPts) { x.strokeStyle = K.rgba(P.hot, 0.5); x.lineWidth = baseW * 1.2; strokePts(x, A); }
      x.restore();
      K.bloom(x, W * 0.5, H * 0.55, Math.max(W, H) * 0.6, P.flow, 0.2);
      K.hazeSheet(x, W, H, noise, P.hot, 0.16, 200, 'screen');
    } else if (p.event === 'Delta Supernova') {
      const sx = W * (0.4 + r() * 0.2), sy = H * (0.85 + r() * 0.1);
      K.bloom(x, sx, sy, Math.max(W, H) * 0.7, P.hot, 0.5);
      K.bloom(x, sx, sy, Math.max(W, H) * 0.3, '#ffffff', 0.4);
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 60; i++) { const a = r() * Math.PI * 2, len = W * (0.1 + r() * 0.4); x.strokeStyle = K.rgba(i % 4 === 0 ? P.mark : P.hot, 0.3 + r() * 0.4); x.lineWidth = 0.6 + r() * 1.6; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len); x.stroke(); }
      x.restore();
    } else if (p.event === 'Glitch Storm') {
      const slices = K.rint(r, 8, 16); for (let i = 0; i < slices; i++) { const sy = r() * H, sh = 4 + r() * 30, off = (r() - 0.5) * W * 0.12; try { const im = x.getImageData(0, sy, W, sh); x.putImageData(im, off, sy); } catch (e) {} }
    }

    // ════ TERMINAL TOPO-MAP OVERLAY ════
    graticule(x, P, W, H, r);
    // coordinate boxes scattered at map edges
    const boxes = p.mode === 'Survey' ? K.rint(r, 4, 7) : K.rint(r, 2, 4);
    for (let i = 0; i < boxes; i++) {
      const edge = r();
      let bx, by;
      if (edge < 0.5) { bx = W * (0.03 + r() * 0.04); by = H * (0.05 + r() * 0.85); }
      else { bx = W * (0.78 - r() * 0.04); by = H * (0.05 + r() * 0.85); }
      coordBox(x, P, bx, by, r);
    }
    // station markers pinned onto confluences + scatter
    const stns = p.density === 'Teeming' ? K.rint(r, 6, 9) : K.rint(r, 3, 6);
    for (let i = 0; i < stns; i++) {
      if (allPts.length && r() < 0.6) { const A = K.pick(allPts, r); const pt = A[Math.floor(r() * A.length)]; if (pt) station(x, P, pt[0], pt[1], r); }
      else station(x, P, W * (0.15 + r() * 0.7), H * (0.15 + r() * 0.7), r);
    }
    // focal reticle (Recon / Trace) — over a hero stream point
    if (p.mode !== 'Survey') {
      let cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4);
      if (allPts.length) { const A = K.pick(allPts, r); const pt = A[Math.floor(A.length * (0.4 + r() * 0.4))]; if (pt) { cx = pt[0]; cy = pt[1]; } }
      reticle(x, P, cx, cy, Math.min(W, H) * (0.09 + r() * 0.05), r);
    }
    glyphScatter(x, P, W, H, p.mode === 'Trace' ? 40 : 22, r);
    // header readout strip (top-left, diegetic)
    x.save(); x.globalCompositeOperation = 'lighter'; x.font = `${Math.round(W * 0.012)}px monospace`; x.textBaseline = 'top';
    let hx = W * 0.04; const hy = H * 0.035;
    for (let i = 0; i < K.rint(r, 8, 14); i++) { x.fillStyle = K.rgba(r() < 0.15 ? P.mark : P.glyph, 0.5 + r() * 0.4); x.fillText(GLY[Math.floor(r() * GLY.length)], hx, hy); hx += W * 0.012 * (0.8 + r() * 0.8); }
    x.strokeStyle = K.rgba(P.glyph, 0.35); x.lineWidth = 1; x.beginPath(); x.moveTo(W * 0.04, hy + W * 0.02); x.lineTo(hx, hy + W * 0.02); x.stroke();
    x.fillStyle = K.rgba(P.glyph, 0.6); x.fillText('CONFLUX//BASIN ' + p.basin.toUpperCase() + ' · ' + p.flow.toUpperCase(), W * 0.04, hy + W * 0.026); x.restore();

    // ── finish: terminal CRT + film grade ──
    K.scanlines(x, W, H, 3, 0.1);
    K.chromaSplit(x, W, H, p.event === 'Glitch Storm' ? 3 : 1);
    K.hazeSheet(x, W, H, noise, P.flow, 0.06, 240, 'screen');
    K.grain(x, W, H, 520, r);
    K.vignette(x, W, H, 0.5);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'k4_conflux', draw, traits };
})();
