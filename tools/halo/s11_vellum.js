/* DATUM (R&D s11_vellum) — engineering drawings of IMPOSSIBLE OBJECTS, rebuilt
 * 2026-06-28 from a fixed-mode template into a real GENERATIVE SYSTEM, per the
 * CEO note: "gen art is building a system you introduce randomness to; this
 * isn't mixing-and-matching modes."
 *
 * The impossible object itself is procedurally generated (a chain of 3–5 beams
 * assembled into a loop that cannot close — a generalised Penrose polygon).
 * Projection is a continuous parameter (azimuth + elevation per seed). Layout is
 * generated: 1–4 views of the SAME object at different zoom/projection so the
 * orthographic views genuinely disagree. Annotation density, exploded assembly,
 * layered vellum sheets, and the title block are all parametric. Six palettes
 * + drafting craft preserved.
 *
 * Mirrors lib/art/engines/datum.ts. window.ENGINE = { name, draw, traits }.
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  const PALS = [
    { name: 'Blueprint',   ground: '#14365e', ink: '#eaf2fb', note: '#7fc8e6', dim: '#bfe3f2', warm: false },
    { name: 'Whiteprint',  ground: '#ede3cc', ink: '#46341f', note: '#7a5f3e', dim: '#8f3f1f', warm: true  },
    { name: 'Drafting',    ground: '#e7e9ea', ink: '#33373b', note: '#5c6166', dim: '#b03a2e', warm: false },
    { name: 'Cyan Vellum', ground: '#cfe5e6', ink: '#1d3a55', note: '#3f6f86', dim: '#1d3a55', warm: false },
    { name: 'Foxed',       ground: '#e3d6b8', ink: '#6b5036', note: '#9a8358', dim: '#9a3b2c', warm: true  },
    { name: 'Graphite',    ground: '#6f7378', ink: '#16181b', note: '#cdd2d6', dim: '#e8ebed', warm: false },
  ];

  const FORMATS = [[1040, 1300], [1200, 1200], [1300, 1000]]; // portrait / square / landscape
  const LAYOUTS = ['Hero', 'Stacked Pair', 'Triptych', 'Quad Multiview'];
  const PROJECTIONS = ['Isometric', 'Axonometric', 'Orthographic', 'Oblique'];
  const OBJECTS = ['Tri-Loop', 'Quad-Frame', 'Penta-Brace', 'Twist Lattice'];
  const DENSITY = ['Sparse', 'Measured', 'Annotated', 'Overspecified'];

  const NUMS = ['12.5', '47.0', 'R8', 'Ø24', '108', '63.2', '15°', '2.4', 'M6', '300', 'Ø6', '1:1', '0.50', '88.9'];
  const NOTES = ['SECTION A-A', 'TYP.', 'DO NOT SCALE', 'BREAK ALL EDGES', 'MATL: VELLUM', 'TOL ±0.1',
    'SEE DETAIL B', 'NOT TO SCALE', 'REF ONLY', '4 PLACES', 'FILLET R2', 'DATUM A'];
  const TITLES = ['IMPOSSIBLE SOLID', 'NON-OBJECT ASSY', 'PENROSE UNIT', 'NULL MECHANISM', 'VOID FRAME', 'PARADOX BODY'];

  function paramsOf(r) {
    let palI = Math.floor(r() * PALS.length);
    if (window.FORCE_PAL) {
      const fi = PALS.findIndex((p) => p.name === window.FORCE_PAL);
      if (fi >= 0) palI = fi;
    }
    const fmtI       = Math.floor(r() * FORMATS.length);
    const layoutI    = Math.floor(r() * LAYOUTS.length);
    const projI      = Math.floor(r() * PROJECTIONS.length);
    const corners    = K.rint(r, 3, 5);
    const hand       = r() < 0.5 ? 1 : -1;
    const beamW      = 0.20 + r() * 0.18;
    const densityI   = Math.floor(r() * DENSITY.length);
    const exploded   = r() < 0.32;
    const sheets     = r() < 0.30 ? K.rint(r, 2, 3) : 1;
    const grid       = r() < 0.85;
    const azBase = projI === 3 ? -0.95 : -Math.PI / 6;
    const az = azBase + K.randn(r) * 0.18;
    const elBase = projI === 2 ? 0.06 : projI === 1 ? 0.30 : 0.46;
    const el = elBase + K.randn(r) * 0.06;
    return { palI, fmtI, layoutI, projI, corners, hand, beamW, densityI, exploded, sheets, grid, az, el };
  }

  const OBJECT_FOR = (corners, hand) =>
    hand < 0 ? OBJECTS[3] : OBJECTS[Math.min(2, corners - 3)];

  function draw(cv, seed) {
    const r = K.rng(seed);
    const P = paramsOf(r);
    const pal = PALS[P.palI];
    const fmt = FORMATS[P.fmtI];
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);
    const noise = K.makeNoise(seed * 7 + 3);

    const ix = [Math.cos(P.az), Math.sin(P.az) * P.el];
    const iy = [Math.cos(Math.PI - P.az), Math.sin(Math.PI - P.az) * P.el];
    const iz = [0, -1];

    x.fillStyle = pal.ground; x.fillRect(0, 0, W, H);
    x.save(); x.globalCompositeOperation = pal.name === 'Graphite' ? 'screen' : (pal.warm ? 'multiply' : 'screen');
    for (let i = 0; i < 5; i++) {
      const cx = r() * W, cy = r() * H, rad = S * (0.4 + r() * 0.5);
      const tint = K.mix(pal.ground, pal.warm ? '#fff6e0' : '#ffffff', 0.06 + r() * 0.06);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, K.rgba(tint, 0.5)); g.addColorStop(1, K.rgba(tint, 0));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
    x.restore();

    if (P.grid) drawGrid(x, W, H, pal, r);

    function setLine(col, w, alpha) {
      x.strokeStyle = K.rgba(col, alpha == null ? 1 : alpha);
      x.lineWidth = w; x.lineCap = 'butt'; x.lineJoin = 'miter'; x.setLineDash([]);
    }
    function poly(p, close) {
      x.beginPath(); x.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length; i++) x.lineTo(p[i][0], p[i][1]);
      if (close) x.closePath();
    }
    function centre(p, col, w, a) { setLine(col || pal.note, w || 1.0, a == null ? 0.8 : a); x.setLineDash([10, 3, 2, 3]); poly(p); x.stroke(); x.setLineDash([]); }
    function line(x0, y0, x1, y1, col, w, a) { setLine(col, w, a); x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); }

    function arrow(px, py, ang, col, sz) {
      sz = sz || S * 0.012;
      x.save(); x.fillStyle = K.rgba(col, 1);
      x.beginPath(); x.moveTo(px, py);
      x.lineTo(px - sz * Math.cos(ang - 0.34), py - sz * Math.sin(ang - 0.34));
      x.lineTo(px - sz * Math.cos(ang + 0.34), py - sz * Math.sin(ang + 0.34));
      x.closePath(); x.fill(); x.restore();
    }
    function dim(ax, ay, bx, by, off, col, txt) {
      col = col || pal.dim;
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const a2 = [ax + nx * off, ay + ny * off], b2 = [bx + nx * off, by + ny * off];
      line(ax + nx * off * 0.12, ay + ny * off * 0.12, a2[0] + nx * 4, a2[1] + ny * 4, col, 0.8, 0.85);
      line(bx + nx * off * 0.12, by + ny * off * 0.12, b2[0] + nx * 4, b2[1] + ny * 4, col, 0.8, 0.85);
      line(a2[0], a2[1], b2[0], b2[1], col, 1.0, 0.95);
      const ang = Math.atan2(b2[1] - a2[1], b2[0] - a2[0]);
      arrow(a2[0], a2[1], ang + Math.PI, col); arrow(b2[0], b2[1], ang, col);
      const mx = (a2[0] + b2[0]) / 2, my = (a2[1] + b2[1]) / 2;
      x.save(); x.translate(mx, my);
      let rot = ang; if (rot > Math.PI / 2 || rot < -Math.PI / 2) rot += Math.PI;
      x.rotate(rot);
      x.font = (S * 0.018 | 0) + 'px monospace'; x.textAlign = 'center';
      x.fillStyle = pal.ground; x.fillRect(-S * 0.03, -S * 0.014, S * 0.06, S * 0.02);
      x.fillStyle = K.rgba(col, 1);
      x.fillText(txt || K.pick(NUMS, r), 0, -S * 0.002);
      x.restore();
    }
    function leader(px, py, lx, ly, col, txt) {
      col = col || pal.note;
      arrow(px, py, Math.atan2(py - ly, px - lx), col, S * 0.01);
      line(px, py, lx + (px > lx ? -S * 0.04 : S * 0.04), ly, col, 0.9, 0.9);
      line(lx + (px > lx ? -S * 0.04 : S * 0.04), ly, lx, ly, col, 0.9, 0.9);
      x.save(); x.fillStyle = K.rgba(col, 1); x.font = (S * 0.016 | 0) + 'px monospace';
      x.textAlign = px > lx ? 'end' : 'start';
      x.fillText(txt || K.pick(NOTES, r), lx, ly - S * 0.006);
      x.restore();
    }
    function hatch(p, col, gap, ang, a) {
      col = col || pal.note; gap = gap || S * 0.016; ang = ang == null ? Math.PI / 4 : ang;
      x.save(); poly(p, true); x.clip();
      let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
      for (const pt of p) { minx = Math.min(minx, pt[0]); miny = Math.min(miny, pt[1]); maxx = Math.max(maxx, pt[0]); maxy = Math.max(maxy, pt[1]); }
      const diag = Math.hypot(maxx - minx, maxy - miny) + gap;
      setLine(col, 0.8, a == null ? 0.7 : a);
      const dxn = Math.cos(ang), dyn = Math.sin(ang);
      for (let d = -diag; d < diag; d += gap) {
        const ox = minx + (maxx - minx) / 2 - dyn * d, oy = miny + (maxy - miny) / 2 + dxn * d;
        x.beginPath(); x.moveTo(ox - dxn * diag, oy - dyn * diag); x.lineTo(ox + dxn * diag, oy + dyn * diag); x.stroke();
      }
      x.restore();
    }

    function project(a, b, c) {
      return [a * ix[0] + b * iy[0] + c * iz[0], a * ix[1] + b * iy[1] + c * iz[1]];
    }
    function impossibleLoop(cx, cy, R, beamFrac, corners, hand, col, w, fillA, explode) {
      const u = R / (corners <= 3 ? 2.0 : corners <= 4 ? 2.4 : 2.9);
      const pts = [];
      for (let i = 0; i < corners; i++) {
        const ang = hand * (i / corners) * Math.PI * 2 - Math.PI / 2;
        pts.push([Math.cos(ang) * u * 1.6, Math.sin(ang) * u * 1.6, i]);
      }
      const beams = [];
      for (let i = 0; i < corners; i++) {
        const A = pts[i], B = pts[(i + 1) % corners];
        const zA = i * beamFrac + (explode ? i * 0.9 : 0);
        const zB = (i + 1) * beamFrac + (explode ? (i + 1) * 0.9 : 0);
        const dx = B[0] - A[0], dy = B[1] - A[1], dl = Math.hypot(dx, dy) || 1;
        const px = -dy / dl * beamFrac * u, py = dx / dl * beamFrac * u;
        const c000 = project(A[0] - px, A[1] - py, zA), c001 = project(A[0] + px, A[1] + py, zA);
        const c011 = project(B[0] + px, B[1] + py, zB), c010 = project(B[0] - px, B[1] - py, zB);
        const t000 = project(A[0] - px, A[1] - py, zA + beamFrac), t001 = project(A[0] + px, A[1] + py, zA + beamFrac);
        const t011 = project(B[0] + px, B[1] + py, zB + beamFrac), t010 = project(B[0] - px, B[1] - py, zB + beamFrac);
        const depth = (c000[1] + c011[1] + t000[1] + t011[1]) / 4;
        beams.push({ depth, faces: [
          [t000, t001, t011, t010],
          [c001, t001, t011, c011],
          [c000, t000, t010, c010],
          [c010, t010, t011, c011],
        ] });
      }
      beams.sort((a, b) => a.depth - b.depth);
      x.save(); x.translate(cx, cy);
      for (const beam of beams) {
        beam.faces.forEach((face, fi) => {
          x.beginPath(); x.moveTo(face[0][0], face[0][1]);
          for (let k = 1; k < face.length; k++) x.lineTo(face[k][0], face[k][1]);
          x.closePath();
          x.fillStyle = fi === 0
            ? K.rgba(K.mix(pal.ground, pal.warm ? '#fff4dc' : '#ffffff', 0.10), 0.95)
            : K.rgba(pal.ground, 0.92);
          x.fill();
          if (fillA && fi === 0) { x.fillStyle = K.rgba(col, fillA); x.fill(); }
          setLine(col, w || 1.6, 1); x.stroke();
        });
      }
      x.restore();
    }

    function drawView(bx, by, bw, bh, label, zoom, allowDims) {
      const cx = bx + bw / 2, cy = by + bh / 2;
      const R = Math.min(bw, bh) * 0.34 * zoom;
      x.save(); x.fillStyle = K.rgba(pal.ink, 0.9); x.font = (S * 0.02 | 0) + 'px monospace';
      x.textAlign = 'start'; x.fillText(label, bx, by - S * 0.01); x.restore();
      centre([[bx + bw * 0.04, cy], [bx + bw * 0.96, cy]]);
      centre([[cx, by + bh * 0.04], [cx, by + bh * 0.96]]);
      const fillA = pal.warm ? 0.06 : 0.05;
      impossibleLoop(cx, cy, R, P.beamW, P.corners, P.hand, pal.ink, 1.6, fillA, P.exploded);

      if (P.exploded) {
        centre([[cx, by + bh * 0.06], [cx, by + bh * 0.94]], pal.dim, 1.1, 0.9);
        for (let i = 0; i < P.corners; i++) {
          const balY = by + bh * (0.16 + 0.66 * (i / Math.max(1, P.corners - 1)));
          x.beginPath(); x.arc(cx + R * 1.25, balY, S * 0.018, 0, 7);
          setLine(pal.note, 1.1, 1); x.stroke();
          x.fillStyle = K.rgba(pal.note, 1); x.font = (S * 0.018 | 0) + 'px monospace';
          x.textAlign = 'center'; x.textBaseline = 'middle';
          x.fillText(String(i + 1), cx + R * 1.25, balY); x.textBaseline = 'alphabetic'; x.textAlign = 'start';
        }
      }

      if (!allowDims) return { cx, cy, R };

      const tier = P.densityI;
      const dimN = [0, 1, 2, 3][tier];
      const ldrN = [1, 1, 2, 3][tier];
      if (dimN >= 1) dim(cx - R, cy + R * 1.25, cx + R, cy + R * 1.25, S * 0.05);
      if (dimN >= 2) dim(cx + R * 1.25, cy - R, cx + R * 1.25, cy + R, S * 0.05);
      if (dimN >= 3) dim(cx - R * 1.25, cy - R * 0.4, cx - R * 1.25, cy + R * 0.4, S * 0.045);
      for (let i = 0; i < ldrN; i++) {
        const ang = r() * Math.PI * 2;
        const sx = cx + Math.cos(ang) * R * 0.5, sy = cy + Math.sin(ang) * R * 0.5;
        const lx = cx + Math.cos(ang) * (R * 1.9 + bw * 0.12);
        const ly = cy + Math.sin(ang) * R * 1.6;
        leader(sx, sy, K.clamp(lx, bx + S * 0.03, bx + bw - S * 0.03), K.clamp(ly, by + S * 0.04, by + bh - S * 0.04),
               i === 0 ? pal.note : (r() < 0.4 ? pal.dim : pal.note),
               tier >= 2 && i === ldrN - 1 ? 'VIEWS DISAGREE' : null);
      }
      if (tier >= 3) {
        const hp = [[cx - R * 0.5, cy + R * 0.1], [cx + R * 0.2, cy - R * 0.4], [cx + R * 0.5, cy + R * 0.3], [cx - R * 0.2, cy + R * 0.6]];
        hatch(hp, pal.note, S * (0.010 + r() * 0.008), Math.PI / 4, 0.6);
      }
      return { cx, cy, R };
    }

    const margin = S * 0.07;
    const inner = { x: margin * 1.4, y: margin * 1.6, w: W - margin * 2.8, h: H - margin * 3.2 };

    function placeSheet() {
      if (P.layoutI === 0) {
        drawView(inner.x, inner.y, inner.w, inner.h, 'GENERAL VIEW', 1.0, true);
      } else if (P.layoutI === 1) {
        const gap = inner.h * 0.06, vh = (inner.h - gap) / 2;
        drawView(inner.x, inner.y, inner.w, vh, 'ELEV. A', 0.92, true);
        drawView(inner.x, inner.y + vh + gap, inner.w, vh, 'ELEV. B', 1.08, true);
      } else if (P.layoutI === 2) {
        const gap = inner.w * 0.04, vw = (inner.w - gap) / 2;
        const topH = inner.h * 0.52, botH = inner.h - topH - inner.h * 0.08;
        drawView(inner.x, inner.y, vw, topH, 'FRONT', 0.9, true);
        drawView(inner.x + vw + gap, inner.y, vw, topH, 'SIDE', 1.05, false);
        drawView(inner.x + inner.w * 0.16, inner.y + topH + inner.h * 0.08, inner.w * 0.68, botH, 'PLAN', 1.0, true);
      } else {
        const gx = inner.w * 0.04, gy = inner.h * 0.06;
        const vw = (inner.w - gx) / 2, vh = (inner.h - gy) / 2;
        const labels = ['TOP', 'RIGHT', 'FRONT', 'AUX'];
        let idx = 0;
        for (let ry = 0; ry < 2; ry++) for (let cxk = 0; cxk < 2; cxk++) {
          const vx = inner.x + cxk * (vw + gx), vy = inner.y + ry * (vh + gy);
          drawView(vx, vy, vw, vh, labels[idx], 0.82 + idx * 0.08, idx % 2 === 0);
          idx++;
        }
      }
    }

    for (let s = 0; s < P.sheets; s++) {
      x.save();
      if (s > 0) {
        const ox = (r() - 0.5) * S * 0.05, oy = (r() - 0.5) * S * 0.05, rot = (r() - 0.5) * 0.035;
        x.translate(W / 2 + ox, H / 2 + oy); x.rotate(rot); x.translate(-W / 2, -H / 2);
        x.globalAlpha = 0.5;
      }
      placeSheet();
      x.restore();
    }
    x.globalAlpha = 1;

    drawTitleBlock(x, W, H, pal, r, seed, P, S);

    setLine(pal.ink, 1.4, 0.7);
    x.strokeRect(margin * 0.5, margin * 0.5, W - margin, H - margin);
    setLine(pal.ink, 0.8, 0.4);
    x.strokeRect(margin * 0.5 + 6, margin * 0.5 + 6, W - margin - 12, H - margin - 12);

    const hazeCol = pal.warm ? K.mix(pal.ground, '#fff4dc', 0.4) : K.mix(pal.ground, '#ffffff', 0.35);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.12, S * 0.7, pal.name === 'Graphite' ? 'screen' : (pal.warm ? 'overlay' : 'screen'));
    K.mottle(x, 0, 0, W, H, pal.ground, 90, r, 'overlay');
    K.grain(x, W, H, 6.5, r);
    K.vignette(x, W, H, pal.name === 'Graphite' ? 0.42 : 0.26);

    return { aspect: W / H };
  }

  function drawGrid(x, W, H, pal, r) {
    const g = Math.max(W, H) / (22 + (r() * 8 | 0));
    x.save(); x.strokeStyle = K.rgba(pal.note, pal.name === 'Graphite' ? 0.16 : 0.12); x.lineWidth = 0.6;
    for (let xx = g; xx < W; xx += g) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, H); x.stroke(); }
    for (let yy = g; yy < H; yy += g) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
    x.strokeStyle = K.rgba(pal.note, pal.name === 'Graphite' ? 0.24 : 0.18); x.lineWidth = 0.9;
    for (let i = 0, xx = g; xx < W; xx += g, i++) { if (i % 5 === 0) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, H); x.stroke(); } }
    for (let i = 0, yy = g; yy < H; yy += g, i++) { if (i % 5 === 0) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); } }
    x.restore();
  }

  function drawTitleBlock(x, W, H, pal, r, seed, P, S) {
    const bw = Math.min(W * 0.34, S * 0.42), bh = S * 0.16;
    const corner = K.pick([[W - bw - S * 0.05, H - bh - S * 0.05], [S * 0.05, H - bh - S * 0.05]], r);
    const bx = corner[0], by = corner[1];
    x.save();
    x.fillStyle = K.rgba(pal.ground, 0.82); x.fillRect(bx, by, bw, bh);
    x.strokeStyle = K.rgba(pal.ink, 0.95); x.lineWidth = 1.4; x.strokeRect(bx, by, bw, bh);
    x.lineWidth = 0.8;
    x.beginPath(); x.moveTo(bx, by + bh * 0.4); x.lineTo(bx + bw, by + bh * 0.4); x.stroke();
    x.beginPath(); x.moveTo(bx, by + bh * 0.7); x.lineTo(bx + bw, by + bh * 0.7); x.stroke();
    x.beginPath(); x.moveTo(bx + bw * 0.62, by); x.lineTo(bx + bw * 0.62, by + bh * 0.7); x.stroke();
    x.beginPath(); x.moveTo(bx + bw * 0.30, by + bh * 0.4); x.lineTo(bx + bw * 0.30, by + bh); x.stroke();
    x.beginPath(); x.moveTo(bx + bw * 0.66, by + bh * 0.7); x.lineTo(bx + bw * 0.66, by + bh); x.stroke();
    x.fillStyle = K.rgba(pal.ink, 1);
    x.font = 'bold ' + (S * 0.022 | 0) + 'px monospace'; x.textAlign = 'start';
    x.fillText(K.pick(TITLES, r), bx + S * 0.012, by + bh * 0.27);
    x.font = (S * 0.014 | 0) + 'px monospace'; x.fillStyle = K.rgba(pal.note, 1);
    const pn = 'PD-' + (1000 + (seed * 137) % 9000) + '-' + String.fromCharCode(65 + seed % 26);
    x.fillText('PART No. ' + pn, bx + S * 0.012, by + bh * 0.56);
    x.fillText('SCALE 1:1', bx + S * 0.012, by + bh * 0.86);
    x.fillText('REV ' + (String.fromCharCode(65 + (seed % 4))), bx + bw * 0.34, by + bh * 0.86);
    x.fillStyle = K.rgba(pal.dim, 1); x.font = 'bold ' + (S * 0.013 | 0) + 'px monospace';
    x.fillText('DO NOT SCALE', bx + bw * 0.66, by + bh * 0.27);
    x.fillStyle = K.rgba(pal.note, 1); x.font = (S * 0.012 | 0) + 'px monospace';
    x.fillText('SHT 1 OF ' + P.sheets, bx + bw * 0.66, by + bh * 0.56);
    x.fillText(PROJECTIONS[P.projI].slice(0, 4).toUpperCase(), bx + bw * 0.68, by + bh * 0.86);
    x.restore();
  }

  function traits(seed) {
    const r = K.rng(seed);
    const P = paramsOf(r);
    return {
      Palette: PALS[P.palI].name,
      Format: ['Portrait', 'Square', 'Landscape'][P.fmtI],
      Layout: LAYOUTS[P.layoutI],
      Projection: PROJECTIONS[P.projI],
      Object: OBJECT_FOR(P.corners, P.hand),
      Annotation: DENSITY[P.densityI],
    };
  }

  return { name: 's11_vellum', draw, traits };
})();
