/* PARALLAX — a foggy hillside array of radio telescopes at night, all tilted
 * skyward, under a luminous translucent star-chart projected across the whole
 * frame: register lines, a coordinate grid, labelled nodes, a central radial
 * coordinate rose, constellation lines that fuse into a face. The dishes listen
 * to a sky that is plainly a DIAGRAM, not real stars. Real fog vs glowing
 * line-work, two layers fighting.
 * OBSERVATORY UV palette — ultraviolet purple / electric cyan / gold star-points
 * on near-black violet. Deep night, bloom on bright nodes, layered haze, grain. */
window.ENGINE = (function () {
  const K = window.KIT;

  // OBSERVATORY UV family. bg = near-black violet ground; uv = ultraviolet purple
  // (atmosphere / dish glow); cy = electric cyan (chart line-work); au = gold
  // star-points; hill = silhouette base.
  const PALS = [
    { name: 'Observatory UV', bg: '#0b0820', uv: '#8a3cff', cy: '#2ee6ff', au: '#ffd86b', hill: '#070514' },
    { name: 'Deep Violet',    bg: '#0a0518', uv: '#7a2dff', cy: '#3ad8ff', au: '#ffcf57', hill: '#05030f' },
    { name: 'Cyan Drift',     bg: '#08101e', uv: '#6f4cff', cy: '#1ff0ff', au: '#ffe07a', hill: '#040810' },
    { name: 'Aurora UV',      bg: '#0c0a22', uv: '#a04cff', cy: '#34ffd0', au: '#ffd06b', hill: '#08061a' },
    { name: 'Magnetic',       bg: '#0a061c', uv: '#9a3cff', cy: '#2ec9ff', au: '#ffbf5a', hill: '#06040f' },
    { name: 'Nebular Gold',   bg: '#0e0a1e', uv: '#8a4cff', cy: '#2ee6ff', au: '#ffce4a', hill: '#080514' },
  ];

  const FMTS = [
    { W: 1480, H: 1100, t: 'Wide' },
    { W: 1240, H: 1240, t: 'Square' },
    { W: 1320, H: 1180, t: 'Field' },
  ];

  const CHARTS = ['Face Constellation', 'Coordinate Rose', 'Twin Grids', 'Wandering Lines'];
  const NIGHTS = ['Deep Night', 'Moonless', 'Pre-Dawn'];

  function params(r) {
    return {
      pal: K.pick(PALS, r),
      fmt: K.pick(FMTS, r),
      chart: K.pick(CHARTS, r),
      night: K.pick(NIGHTS, r),
      dishRows: K.rint(r, 3, 4),
      fogThick: 0.5 + r() * 0.5,
      roseX: 0.28 + r() * 0.44,
      roseY: 0.30 + r() * 0.22,
    };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Chart: p.chart, Night: p.night };
  }

  // ── a single radio-telescope dish silhouette, tilted skyward ──
  function dish(x, P, cx, by, scale, tilt, depth, r) {
    // depth 0 = far (hazy, desaturated, small contrast), 1 = near (crisp, dark)
    const sil = K.mix(P.hill, P.bg, (1 - depth) * 0.72);
    const edge = K.mix(P.uv, P.cy, 0.4);
    const mh = 70 * scale;        // mount / tower height
    const dr = 46 * scale;        // dish radius
    const lw = 0.8 + depth * 1.6;

    x.save();
    // tripod / pedestal mount
    x.strokeStyle = K.rgba(sil, 0.95);
    x.lineWidth = (3 + depth * 4) * scale * 0.16 + 1.4;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(cx - dr * 0.34, by); x.lineTo(cx, by - mh * 0.62);
    x.moveTo(cx + dr * 0.34, by); x.lineTo(cx, by - mh * 0.62);
    x.moveTo(cx, by); x.lineTo(cx, by - mh * 0.62);
    x.stroke();

    // dish apex (where the bowl pivots)
    const ax = cx, ay = by - mh * 0.62;
    // dish bowl: a tilted ellipse (parabolic) facing up-and-aside
    const dir = tilt;                       // radians, aim direction
    x.translate(ax, ay);
    x.rotate(dir);
    // bowl as filled silhouette ellipse
    x.fillStyle = K.rgba(sil, 0.96);
    x.beginPath();
    x.ellipse(0, -dr * 0.55, dr, dr * 0.42, 0, 0, Math.PI * 2);
    x.fill();
    // inner parabola rim glow (faint receiver light)
    x.strokeStyle = K.rgba(edge, 0.10 + depth * 0.45);
    x.lineWidth = lw;
    x.beginPath();
    x.ellipse(0, -dr * 0.55, dr * 0.92, dr * 0.36, 0, 0, Math.PI * 2);
    x.stroke();
    // feed arm + receiver node
    x.strokeStyle = K.rgba(sil, 0.9);
    x.lineWidth = lw * 1.1;
    x.beginPath();
    x.moveTo(0, -dr * 0.55); x.lineTo(0, -dr * 1.35);
    x.stroke();
    // receiver bloom (the dish "listening" point)
    if (depth > 0.25) {
      x.globalCompositeOperation = 'lighter';
      const rc = r() < 0.5 ? P.cy : P.au;
      const g = x.createRadialGradient(0, -dr * 1.35, 0, 0, -dr * 1.35, dr * 0.5);
      g.addColorStop(0, K.rgba(rc, 0.5 * depth));
      g.addColorStop(1, K.rgba(rc, 0));
      x.fillStyle = g;
      x.fillRect(-dr, -dr * 1.9, dr * 2, dr);
    }
    x.restore();
  }

  // ── glowing star-chart overlay primitives ──
  function gridOverlay(x, W, H, P, noise, r, fogMaskY) {
    x.save();
    x.globalCompositeOperation = 'screen';
    // coordinate grid — RA/Dec lines, fading where fog is thick (lower frame)
    const gx = K.rint(r, 9, 14), gy = K.rint(r, 7, 11);
    for (let i = 0; i <= gx; i++) {
      const px = (i / gx) * W;
      const grad = x.createLinearGradient(px, 0, px, H);
      grad.addColorStop(0, K.rgba(P.cy, 0.10));
      grad.addColorStop(fogMaskY, K.rgba(P.cy, 0.05));
      grad.addColorStop(1, K.rgba(P.cy, 0.0));
      x.strokeStyle = grad; x.lineWidth = i % 4 === 0 ? 1.1 : 0.6;
      x.beginPath(); x.moveTo(px, 0); x.lineTo(px, H); x.stroke();
    }
    for (let j = 0; j <= gy; j++) {
      const py = (j / gy) * H;
      const fade = 1 - K.clamp((py / H - 0.2) / 0.9, 0, 1) * 0.85;
      x.strokeStyle = K.rgba(P.cy, 0.07 * fade);
      x.lineWidth = j % 3 === 0 ? 1.0 : 0.5;
      x.beginPath(); x.moveTo(0, py); x.lineTo(W, py); x.stroke();
    }
    x.restore();
  }

  // a labelled node (small star-point with tick + numeric label)
  function node(x, P, px, py, bright, big, r) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const col = bright ? P.au : P.cy;
    const rad = big ? 9 + r() * 7 : 3 + r() * 4;
    K.bloom(x, px, py, rad * (bright ? 3.4 : 2.2), col, bright ? 0.55 : 0.32);
    // crisp core
    x.fillStyle = K.rgba(K.mix(col, '#ffffff', 0.5), 0.95);
    x.beginPath(); x.arc(px, py, big ? 2.4 : 1.4, 0, Math.PI * 2); x.fill();
    // registration tick cross
    x.strokeStyle = K.rgba(col, 0.5);
    x.lineWidth = 0.7;
    const t = rad * 0.9;
    x.beginPath();
    x.moveTo(px - t, py); x.lineTo(px + t, py);
    x.moveTo(px, py - t); x.lineTo(px, py + t);
    x.stroke();
    x.restore();
    return col;
  }

  function label(x, P, px, py, txt, col) {
    x.save();
    x.globalCompositeOperation = 'screen';
    x.font = '9px monospace';
    x.fillStyle = K.rgba(col, 0.55);
    x.fillText(txt, px + 7, py - 5);
    x.restore();
  }

  // central radial coordinate rose
  function rose(x, P, cx, cy, rad, r) {
    x.save();
    x.globalCompositeOperation = 'screen';
    // concentric range rings
    for (let i = 1; i <= 5; i++) {
      x.strokeStyle = K.rgba(P.cy, 0.09 + (i === 5 ? 0.06 : 0));
      x.lineWidth = i % 2 === 0 ? 1.0 : 0.6;
      x.beginPath(); x.arc(cx, cy, (rad * i) / 5, 0, Math.PI * 2); x.stroke();
    }
    // bearing spokes
    const spokes = 24;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const long = i % 6 === 0;
      x.strokeStyle = K.rgba(long ? P.au : P.cy, long ? 0.28 : 0.1);
      x.lineWidth = long ? 1.0 : 0.5;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * rad * (long ? 0.0 : 0.74), cy + Math.sin(a) * rad * (long ? 0.0 : 0.74));
      x.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      x.stroke();
    }
    // crosshair through center
    x.strokeStyle = K.rgba(P.au, 0.3); x.lineWidth = 0.8;
    x.beginPath();
    x.moveTo(cx - rad * 1.15, cy); x.lineTo(cx + rad * 1.15, cy);
    x.moveTo(cx, cy - rad * 1.15); x.lineTo(cx, cy + rad * 1.15);
    x.stroke();
    K.bloom(x, cx, cy, rad * 0.5, P.au, 0.22);
    x.restore();
  }

  // constellation: scattered nodes joined by thin lines; optionally fused into a
  // face (two eye-clusters + a mouth arc) so the "stars" form a face.
  function constellation(x, P, W, H, chart, noise, r) {
    const pts = [];
    const isFace = chart === 'Face Constellation';
    const skyTop = H * 0.06, skyBot = H * 0.62;

    if (isFace) {
      // build a face: two eyes, brow, nose ridge, mouth — as star anchors
      const fcx = W * (0.42 + r() * 0.16), fcy = H * (0.30 + r() * 0.08);
      const fw = W * (0.30 + r() * 0.1), fh = H * 0.30;
      const eyeY = fcy - fh * 0.12;
      const ex = fw * 0.34;
      // left + right eye clusters
      [-1, 1].forEach((s) => {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          pts.push({ x: fcx + s * ex + Math.cos(a) * fw * 0.07, y: eyeY + Math.sin(a) * fh * 0.05, eye: true, grp: 'eye' + s });
        }
      });
      // brow line
      [-1, 1].forEach((s) => {
        for (let i = 0; i < 3; i++) pts.push({ x: fcx + s * (ex - fw * 0.06 + i * fw * 0.06), y: eyeY - fh * 0.13 - i * fh * 0.01, grp: 'brow' + s });
      });
      // nose ridge
      for (let i = 0; i < 3; i++) pts.push({ x: fcx + (r() - 0.5) * fw * 0.05, y: eyeY + fh * (0.1 + i * 0.14), grp: 'nose' });
      // mouth arc
      for (let i = 0; i < 5; i++) {
        const t = i / 4, a = Math.PI * (0.15 + t * 0.7);
        pts.push({ x: fcx + Math.cos(a) * fw * 0.22, y: fcy + fh * 0.42 - Math.sin(a) * fh * 0.07, grp: 'mouth' });
      }
      // scattered field stars around
      for (let i = 0; i < 26; i++) pts.push({ x: r() * W, y: skyTop + r() * (skyBot - skyTop), grp: 'field', field: true });
    } else {
      const n = K.rint(r, 34, 50);
      for (let i = 0; i < n; i++) pts.push({ x: r() * W, y: skyTop + r() * (skyBot - skyTop), grp: 'field', field: true });
    }

    // draw connecting lines: within named groups (face), plus a few wandering links
    x.save();
    x.globalCompositeOperation = 'screen';
    function link(a, b, col, alpha) {
      const fade = 1 - K.clamp((Math.max(a.y, b.y) / H - 0.25) / 0.6, 0, 1) * 0.75;
      x.strokeStyle = K.rgba(col, alpha * fade);
      x.lineWidth = 0.8;
      x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
    }
    if (isFace) {
      const groups = {};
      pts.forEach((p) => { if (!p.field) { (groups[p.grp] = groups[p.grp] || []).push(p); } });
      Object.values(groups).forEach((g) => {
        for (let i = 0; i < g.length; i++) link(g[i], g[(i + 1) % g.length], P.cy, 0.4);
      });
      // join brows→eyes, eyes→nose→mouth to read as a face
      const find = (gn) => groups[gn] || [];
      const center = (g) => g.length ? { x: g.reduce((s, p) => s + p.x, 0) / g.length, y: g.reduce((s, p) => s + p.y, 0) / g.length } : null;
      const eL = center(find('eye-1')), eR = center(find('eye1')), no = center(find('nose')), mo = center(find('mouth'));
      if (eL && no) link(eL, no, P.au, 0.32);
      if (eR && no) link(eR, no, P.au, 0.32);
      if (no && mo) link(no, mo, P.au, 0.32);
      if (eL && eR) link(eL, eR, P.cy, 0.22);
    } else {
      // wandering polyline through nearest-ish neighbors
      const chain = K.shuffle(pts.filter((p) => !p.field), r).slice(0, 0);
      const fieldPts = pts.filter((p) => p.field);
      const sorted = fieldPts.slice().sort((a, b) => a.x - b.x);
      for (let i = 0; i < sorted.length - 1; i++) {
        if (r() < 0.55) link(sorted[i], sorted[i + 1], r() < 0.5 ? P.cy : P.au, 0.3);
      }
    }
    x.restore();

    // draw the nodes themselves (over lines)
    const labelled = K.shuffle(pts.slice(), r).slice(0, K.rint(r, 6, 10));
    pts.forEach((p) => {
      const bright = !p.field && r() < 0.7 || r() < 0.1;
      const big = (!p.field && r() < 0.4);
      const col = node(x, P, p.x, p.y, bright, big, r);
      p._col = col;
    });
    labelled.forEach((p) => {
      const ra = K.rint(r, 0, 23), dec = K.rint(r, 0, 59);
      label(x, P, p.x, p.y, (ra < 10 ? '0' + ra : ra) + 'h' + (dec < 10 ? '0' + dec : dec), p._col || P.cy);
    });
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const horizon = H * (0.58 + r() * 0.08);

    // ── base sky: near-black violet, slightly lighter low toward horizon haze ──
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, K.mix(P.bg, '#000', 0.35));
    g.addColorStop(0.45, P.bg);
    g.addColorStop(horizon / H - 0.05, K.mix(P.bg, P.uv, p.night === 'Pre-Dawn' ? 0.22 : 0.12));
    g.addColorStop(horizon / H, K.mix(P.bg, P.uv, 0.3));
    g.addColorStop(1, K.mix(P.hill, P.uv, 0.18));
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // faint UV airglow band near the horizon
    K.bloom(x, W * (0.3 + r() * 0.4), horizon * 1.02, W * (0.5 + r() * 0.2), P.uv, p.night === 'Moonless' ? 0.1 : 0.2);

    // ── BACKGROUND star-chart overlay (drawn first so fog can sit over it) ──
    gridOverlay(x, W, H, P, noise, r, horizon / H);
    constellation(x, P, W, H, p.chart, noise, r);
    rose(x, P, W * p.roseX, H * p.roseY, Math.min(W, H) * (0.16 + r() * 0.06), r);

    // ── MIDGROUND/FOREGROUND: hill silhouettes with dish arrays ──
    // far rolling hills (atmospheric — hazy, low contrast)
    for (let hl = 0; hl < 3; hl++) {
      const depth = hl / 2;
      const baseY = horizon + 6 + hl * (H - horizon) * 0.16;
      const amp = (10 + hl * 14) * (0.6 + r() * 0.6);
      const col = K.mix(P.hill, P.bg, (1 - depth) * 0.55);
      x.fillStyle = K.rgba(col, 0.96);
      x.beginPath();
      x.moveTo(0, H);
      x.lineTo(0, baseY);
      for (let px = 0; px <= W; px += 14) {
        const y = baseY + noise.fbm(px / 260 + hl * 9, hl * 3.1, 4) * amp;
        x.lineTo(px, y);
      }
      x.lineTo(W, H); x.closePath(); x.fill();

      // dish array marching across this hill ridge
      if (hl >= 1) {
        const depthD = (hl - 1) / 1.4 + 0.25;
        const count = K.rint(r, 5, 9) - (3 - hl);
        const sc = 0.45 + depthD * 0.9;
        for (let i = 0; i < count; i++) {
          const fx = (i + 0.5) / count;
          const px = fx * W * 1.04 - W * 0.02 + K.randn(r) * 20;
          const ridgeY = baseY + noise.fbm(px / 260 + hl * 9, hl * 3.1, 4) * amp;
          // all tilted skyward, with slight spread — surreal uniform listening
          const tilt = -0.55 + (fx - 0.5) * 0.5 + K.randn(r) * 0.12;
          dish(x, P, px, ridgeY + 2, sc * (0.8 + r() * 0.4), tilt, depthD, r);
        }
      }
    }

    // ── volumetric fog between hill layers (the haze that fights the diagram) ──
    K.hazeSheet(x, W, H, noise, K.mix(P.uv, P.bg, 0.4), p.fogThick * 0.55, 110, 'screen');
    // lower dense ground fog bank
    x.save();
    x.globalCompositeOperation = 'screen';
    const fg = x.createLinearGradient(0, horizon * 0.92, 0, H);
    fg.addColorStop(0, K.rgba(P.uv, 0));
    fg.addColorStop(0.55, K.rgba(K.mix(P.uv, P.cy, 0.2), 0.16 * p.fogThick));
    fg.addColorStop(1, K.rgba(K.mix(P.uv, P.bg, 0.3), 0.34 * p.fogThick));
    x.fillStyle = fg; x.fillRect(0, horizon * 0.9, W, H - horizon * 0.9);
    x.restore();
    K.hazeSheet(x, W, H, noise, K.mix(P.cy, P.bg, 0.5), p.fogThick * 0.3, 180, 'screen');

    // ── a faint second pass of the brightest chart nodes ON TOP of fog, so the
    // diagram "punches through" the haze in places (two layers fighting) ──
    x.save();
    x.globalCompositeOperation = 'screen';
    const punch = K.rint(r, 4, 7);
    for (let i = 0; i < punch; i++) {
      const px = r() * W, py = H * (0.05 + r() * 0.5);
      K.bloom(x, px, py, 18 + r() * 30, r() < 0.5 ? P.au : P.cy, 0.18);
    }
    x.restore();

    // central rose bloom punch-through for focal read
    K.bloom(x, W * p.roseX, H * p.roseY, Math.min(W, H) * 0.12, P.au, 0.14);

    // ── finishing: grain, vignette ──
    K.grain(x, W, H, 220, r);
    K.vignette(x, W, H, 0.55);

    return { aspect: cv.width / cv.height };
  }

  return { draw, traits };
})();
