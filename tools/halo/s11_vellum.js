/* VELLUM — drafting sheets of an IMPOSSIBLE OBJECT (engineering-drawing minimalism,
 * made conceptually impossible). Fine technical linework — plan / elevation /
 * section, dimension lines with arrowheads + numerals, leader callouts, 45°
 * section hatching, a corner title block — describing a thing that cannot exist:
 * a Penrose solid, three orthographic views that don't agree, a mechanism with
 * no function. Drawn on tinted vellum / blueprint with 1–3 translucent sheets
 * layered + slightly offset so tints add and lines double faintly.
 * SURREAL = real-but-off: perfectly correct drafting convention, impossible thing.
 * Hazy (translucent overlays), textured (paper tooth), art-snob.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Drafting / blueprint palette world: ground + line ink(s). `dim` is the
     special dimension/ferro accent; `note` the secondary annotation ink. */
  const PALS = [
    { name: 'Blueprint',   ground: '#14365e', ink: '#eaf2fb', note: '#7fc8e6', dim: '#bfe3f2', warm: false },
    { name: 'Whiteprint',  ground: '#ede3cc', ink: '#46341f', note: '#7a5f3e', dim: '#8f3f1f', warm: true  },
    { name: 'Drafting',    ground: '#e7e9ea', ink: '#33373b', note: '#5c6166', dim: '#b03a2e', warm: false },
    { name: 'Cyan Vellum', ground: '#cfe5e6', ink: '#1d3a55', note: '#3f6f86', dim: '#1d3a55', warm: false },
    { name: 'Foxed',       ground: '#e3d6b8', ink: '#6b5036', note: '#9a8358', dim: '#9a3b2c', warm: true  },
    { name: 'Graphite',    ground: '#6f7378', ink: '#16181b', note: '#cdd2d6', dim: '#e8ebed', warm: false },
  ];

  const MODES = ['Plan', 'Elevation', 'Exploded', 'Section', 'Detail', 'Overlay'];
  const FORMATS = [[1040, 1300], [1200, 1200], [1300, 1000]]; // portrait / square / landscape

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  /* ── tiny faux-text + numeral helpers (monospace, drafting numerals) ── */
  const NUMS = ['12.5', '47.0', 'R8', 'Ø24', '108', '63.2', '15°', '2.4', 'M6', '300', 'Ø6', '1:1', '0.50', '88.9'];
  const NOTES = [
    'SECTION A-A', 'TYP.', 'DO NOT SCALE', 'BREAK ALL EDGES',
    'MATL: VELLUM', 'TOL ±0.1', 'SEE DETAIL B', 'NOT TO SCALE',
    'REF ONLY', '4 PLACES', 'FILLET R2', 'DATUM A',
  ];

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 3);
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // ── BASE VELLUM GROUND with faint tonal unevenness ──
    x.fillStyle = pal.ground; x.fillRect(0, 0, W, H);
    // broad uneven tint wash so paper isn't flat
    x.save(); x.globalCompositeOperation = pal.name === 'Graphite' ? 'screen' : (pal.warm ? 'multiply' : 'screen');
    for (let i = 0; i < 5; i++) {
      const cx = r() * W, cy = r() * H, rad = S * (0.4 + r() * 0.5);
      const tint = K.mix(pal.ground, pal.warm ? '#fff6e0' : '#ffffff', 0.06 + r() * 0.06);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, K.rgba(tint, 0.5)); g.addColorStop(1, K.rgba(tint, 0));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
    x.restore();

    // engineering grid (very faint, behind everything) — most sheets
    if (r() < 0.85) drawGrid(x, W, H, pal, r);

    // ── line helpers (all share crisp thin defaults) ──
    function setLine(col, w, alpha) {
      x.strokeStyle = K.rgba(col, alpha == null ? 1 : alpha);
      x.lineWidth = w; x.lineCap = 'butt'; x.lineJoin = 'miter'; x.setLineDash([]);
    }
    function solid(p, col, w, a) { setLine(col || pal.ink, w || 1.4, a); poly(p); x.stroke(); }
    function hidden(p, col, w, a) { setLine(col || pal.ink, w || 1.1, a == null ? 0.8 : a); x.setLineDash([6, 4]); poly(p); x.stroke(); x.setLineDash([]); }
    function centre(p, col, w, a) { setLine(col || pal.note, w || 1.0, a == null ? 0.8 : a); x.setLineDash([10, 3, 2, 3]); poly(p); x.stroke(); x.setLineDash([]); }
    function poly(p) { x.beginPath(); x.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) x.lineTo(p[i][0], p[i][1]); }
    function line(x0, y0, x1, y1, col, w, a) { setLine(col, w, a); x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); }

    // arrowhead at (px,py) pointing along angle ang
    function arrow(px, py, ang, col, sz) {
      sz = sz || S * 0.012;
      x.save(); x.fillStyle = K.rgba(col, 1);
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px - sz * Math.cos(ang - 0.34), py - sz * Math.sin(ang - 0.34));
      x.lineTo(px - sz * Math.cos(ang + 0.34), py - sz * Math.sin(ang + 0.34));
      x.closePath(); x.fill(); x.restore();
    }

    // dimension line between two points with extension lines + arrows + numeral
    function dim(ax, ay, bx, by, off, col, txt) {
      col = col || pal.dim;
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len; // normal
      const a2 = [ax + nx * off, ay + ny * off], b2 = [bx + nx * off, by + ny * off];
      // extension lines (witness)
      line(ax + nx * off * 0.12, ay + ny * off * 0.12, a2[0] + nx * 4, a2[1] + ny * 4, col, 0.8, 0.85);
      line(bx + nx * off * 0.12, by + ny * off * 0.12, b2[0] + nx * 4, b2[1] + ny * 4, col, 0.8, 0.85);
      // dimension line
      line(a2[0], a2[1], b2[0], b2[1], col, 1.0, 0.95);
      const ang = Math.atan2(b2[1] - a2[1], b2[0] - a2[0]);
      arrow(a2[0], a2[1], ang + Math.PI, col); arrow(b2[0], b2[1], ang, col);
      // numeral, centred & upright on the line
      const mx = (a2[0] + b2[0]) / 2, my = (a2[1] + b2[1]) / 2;
      x.save(); x.translate(mx, my);
      let rot = ang; if (rot > Math.PI / 2 || rot < -Math.PI / 2) rot += Math.PI;
      x.rotate(rot);
      x.fillStyle = K.rgba(col, 1); x.font = (S * 0.018 | 0) + 'px monospace';
      x.textAlign = 'center';
      x.fillStyle = pal.ground; x.fillRect(-S * 0.03, -S * 0.014, S * 0.06, S * 0.02); // knock out line behind text
      x.fillStyle = K.rgba(col, 1);
      x.fillText(txt || K.pick(NUMS, r), 0, -S * 0.002);
      x.restore();
    }

    // leader line from a point to a small note off to the side
    function leader(px, py, lx, ly, col, txt) {
      col = col || pal.note;
      arrow(px, py, Math.atan2(py - ly, px - lx), col, S * 0.01);
      const knee = [lx + (px - lx) * 0.0, ly];
      line(px, py, lx + (px > lx ? -S * 0.04 : S * 0.04), ly, col, 0.9, 0.9);
      line(lx + (px > lx ? -S * 0.04 : S * 0.04), ly, lx, ly, col, 0.9, 0.9);
      x.save(); x.fillStyle = K.rgba(col, 1); x.font = (S * 0.016 | 0) + 'px monospace';
      x.textAlign = px > lx ? 'end' : 'start';
      x.fillText(txt || K.pick(NOTES, r), lx, ly - S * 0.006);
      x.restore();
    }

    // 45° section hatching clipped to a polygon
    function hatch(p, col, gap, ang, a) {
      col = col || pal.note; gap = gap || S * 0.016; ang = ang == null ? Math.PI / 4 : ang;
      x.save(); poly(p); x.closePath(); x.clip();
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

    // small filled callout note bubble (just a tag rectangle + faux text)
    function tag(tx, ty, txt, col) {
      col = col || pal.note;
      x.save(); x.font = (S * 0.016 | 0) + 'px monospace'; x.textAlign = 'start';
      const w = x.measureText(txt).width + S * 0.012;
      x.strokeStyle = K.rgba(col, 0.9); x.lineWidth = 1;
      x.strokeRect(tx, ty - S * 0.018, w, S * 0.024);
      x.fillStyle = K.rgba(col, 1); x.fillText(txt, tx + S * 0.006, ty);
      x.restore();
    }

    // ── IMPOSSIBLE-OBJECT primitives ───────────────────────────────────────
    // Penrose triangle drawn as three interlocking beams (the classic impossible)
    function penrose(cx, cy, R, col, w, fillA) {
      const beam = R * 0.30; // beam width
      // three rotated copies of an L-shaped beam end; build via parametric verts
      // Use the well-known 12-vertex outer/inner construction.
      const pts = [];
      const t = R, b = beam;
      // outer triangle corners
      const A = [cx, cy - t], B = [cx + t * 0.866, cy + t * 0.5], C = [cx - t * 0.866, cy + t * 0.5];
      function lerp(P, Q, u) { return [P[0] + (Q[0] - P[0]) * u, P[1] + (Q[1] - P[1]) * u]; }
      // three parallelogram beams, each overlapping the next to create the illusion
      const corners = [A, B, C];
      x.save();
      for (let i = 0; i < 3; i++) {
        const P = corners[i], Q = corners[(i + 1) % 3], Pr = corners[(i + 2) % 3];
        const inP = lerp(P, [cx, cy], b / R), inQ = lerp(Q, [cx, cy], b / R);
        const ext = lerp(Q, Pr, b / R * 0.9);
        const inExt = lerp(inQ, lerp(Pr, [cx, cy], b / R), b / R * 0.9);
        const face = [P, Q, ext, inExt, inQ, inP];
        x.beginPath(); x.moveTo(face[0][0], face[0][1]);
        for (let k = 1; k < face.length; k++) x.lineTo(face[k][0], face[k][1]);
        x.closePath();
        if (fillA) { x.fillStyle = K.rgba(col, fillA * (i === 0 ? 1 : i === 1 ? 0.7 : 0.45)); x.fill(); }
        setLine(col, w || 1.6, 1); x.stroke();
      }
      x.restore();
    }

    // Impossible isometric "blivet" / staircase cube — a box whose edges loop
    function impossibleBox(cx, cy, R, col, w) {
      const u = R * 0.5;
      // isometric basis
      const ix = [Math.cos(-Math.PI / 6) * u, Math.sin(-Math.PI / 6) * u];
      const iy = [Math.cos(-Math.PI * 5 / 6) * u, Math.sin(-Math.PI * 5 / 6) * u];
      const iz = [0, -u];
      // re-centre the figure (spans a,b,c ~0..2) on (cx,cy) via centroid offset
      const ctr = [1 * ix[0] + 1 * iy[0] + 1 * iz[0], 1 * ix[1] + 1 * iy[1] + 1 * iz[1]];
      const ocx = cx - ctr[0], ocy = cy - ctr[1];
      function P(a, b, c) { return [ocx + a * ix[0] + b * iy[0] + c * iz[0], ocy + a * ix[1] + b * iy[1] + c * iz[1]]; }
      // draw an impossible frame: three bars that should form a closed cube edge
      // but are connected with a twist (Escher cube vibe)
      const bars = [
        [P(0, 0, 0), P(2, 0, 0), P(2, 0, 1), P(0, 0, 1)],
        [P(2, 0, 0), P(2, 2, 0), P(2, 2, 1), P(2, 0, 1)],
        [P(2, 2, 1), P(0, 2, 1), P(0, 2, 2), P(2, 2, 2)], // shifted up — the impossible jump
        [P(0, 2, 2), P(0, 0, 2), P(0, 0, 1), P(0, 2, 1)],
      ];
      for (const face of bars) {
        x.beginPath(); x.moveTo(face[0][0], face[0][1]);
        for (let k = 1; k < face.length; k++) x.lineTo(face[k][0], face[k][1]);
        x.closePath();
        x.fillStyle = K.rgba(pal.ground, 0.85); x.fill();
        setLine(col, w || 1.5, 1); x.stroke();
      }
    }

    // An orthographic "view" box: a labelled framed region with a small drawing.
    // `kind` chooses which projection of the impossible object goes inside.
    function viewBox(bx, by, bw, bh, label, kind) {
      const cx = bx + bw / 2, cy = by + bh / 2;
      const R = Math.min(bw, bh) * 0.32;
      // view label
      x.save(); x.fillStyle = K.rgba(pal.ink, 0.9); x.font = (S * 0.02 | 0) + 'px monospace';
      x.textAlign = 'start'; x.fillText(label, bx, by - S * 0.01); x.restore();
      // centre lines
      centre([[bx + bw * 0.04, cy], [bx + bw * 0.96, cy]]);
      centre([[cx, by + bh * 0.04], [cx, by + bh * 0.96]]);
      if (kind === 'penrose') penrose(cx, cy, R, pal.ink, 1.6, pal.warm ? 0.06 : 0.05);
      else if (kind === 'iso') impossibleBox(cx, cy, R * 1.05, pal.ink, 1.5);
      else if (kind === 'circ') {
        // a circular plan that "doesn't match" — concentric + a square that pokes out
        x.beginPath(); x.arc(cx, cy, R, 0, 7); setLine(pal.ink, 1.5, 1); x.stroke();
        x.beginPath(); x.arc(cx, cy, R * 0.55, 0, 7); setLine(pal.ink, 1, 0.8); x.setLineDash([5, 3]); x.stroke(); x.setLineDash([]);
        solid([[cx - R * 0.7, cy - R * 0.7], [cx + R * 0.7, cy - R * 0.7], [cx + R * 0.7, cy + R * 0.7], [cx - R * 0.7, cy + R * 0.7], [cx - R * 0.7, cy - R * 0.7]], pal.ink, 1.3);
        hidden([[cx, cy - R * 1.0], [cx, cy + R * 1.0]]);
      } else if (kind === 'rect') {
        // a rectangular elevation with a notch + hidden bore
        const w2 = R * 1.5, h2 = R * 1.2;
        solid([[cx - w2, cy - h2], [cx + w2, cy - h2], [cx + w2, cy + h2], [cx - w2, cy + h2], [cx - w2, cy - h2]], pal.ink, 1.5);
        // a notch
        solid([[cx - w2 * 0.3, cy - h2], [cx - w2 * 0.3, cy - h2 * 0.4], [cx + w2 * 0.1, cy - h2 * 0.4], [cx + w2 * 0.1, cy - h2]], pal.ink, 1.3);
        hidden([[cx, cy - h2], [cx, cy + h2]]);
        hidden([[cx - w2 * 0.6, cy - h2 * 0.5], [cx + w2 * 0.6, cy - h2 * 0.5]]);
      }
      return { cx, cy, R };
    }

    // ── COMPOSE per mode ────────────────────────────────────────────────────
    const margin = S * 0.07;

    if (mode === 'Plan') {
      // top-down plan of the circular/penrose object + grid + dimensions
      const v = viewBox(W * 0.18, H * 0.16, W * 0.64, H * 0.5, 'PLAN VIEW', r() < 0.5 ? 'penrose' : 'iso');
      // dimension chain around it
      dim(v.cx - v.R, v.cy + v.R * 1.3, v.cx + v.R, v.cy + v.R * 1.3, S * 0.06);
      dim(v.cx + v.R * 1.3, v.cy - v.R, v.cx + v.R * 1.3, v.cy + v.R, S * 0.06);
      dim(v.cx - v.R * 1.3, v.cy - v.R * 0.4, v.cx - v.R * 1.3, v.cy + v.R * 0.4, S * 0.05);
      // a few leader callouts
      leader(v.cx + v.R * 0.5, v.cy - v.R * 0.5, v.cx + v.R * 1.9, v.cy - v.R * 1.1, pal.note);
      leader(v.cx - v.R * 0.4, v.cy + v.R * 0.3, v.cx - v.R * 1.9, v.cy + v.R * 1.0, pal.note);
    } else if (mode === 'Elevation') {
      // THE STAR: front + side views that disagree about the same object
      const top = H * 0.15, bh = H * 0.40, bw = W * 0.34;
      viewBox(W * 0.10, top, bw, bh, 'FRONT ELEV.', 'penrose');
      viewBox(W * 0.52, top, bw, bh, 'SIDE ELEV.', 'iso'); // a penrose front but an impossible-box side: cannot be one solid
      const v3 = viewBox(W * 0.30, H * 0.6, W * 0.4, H * 0.28, 'PLAN', 'circ'); // round plan — disagrees again
      dim(W * 0.10, top + bh * 1.14, W * 0.10 + bw, top + bh * 1.14, S * 0.04);
      dim(W * 0.52, top + bh * 1.14, W * 0.52 + bw, top + bh * 1.14, S * 0.04);
      leader(v3.cx, v3.cy - v3.R, v3.cx + W * 0.14, v3.cy - v3.R * 1.8, pal.dim, 'VIEWS DISAGREE');
    } else if (mode === 'Exploded') {
      // parts flying apart along a dashed assembly axis
      const axX = W * (0.42 + (r() - 0.5) * 0.1);
      const n = 3 + (r() * 2 | 0);
      // assembly axis
      centre([[axX, H * 0.08], [axX, H * 0.92]], pal.dim, 1.1, 0.9);
      let py = H * 0.16;
      for (let i = 0; i < n; i++) {
        const sz = S * (0.12 + r() * 0.05);
        const off = (i - (n - 1) / 2) * S * 0.02;
        const cx = axX + off;
        if (i % 2 === 0) impossibleBox(cx, py, sz, pal.ink, 1.4);
        else penrose(cx, py, sz * 0.7, pal.ink, 1.5, pal.warm ? 0.05 : 0.04);
        // dashed assembly link to next
        if (i < n - 1) hidden([[cx, py + sz * 0.7], [axX + ((i + 1) - (n - 1) / 2) * S * 0.02, py + S * 0.18]], pal.dim, 1.1, 0.85);
        // part number balloon
        x.save(); x.beginPath(); x.arc(cx + sz * 1.1, py - sz * 0.4, S * 0.02, 0, 7);
        setLine(pal.note, 1.1, 1); x.stroke();
        x.fillStyle = K.rgba(pal.note, 1); x.font = (S * 0.02 | 0) + 'px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(String(i + 1), cx + sz * 1.1, py - sz * 0.4); x.restore();
        x.textBaseline = 'alphabetic';
        py += H * 0.2;
      }
      leader(axX, H * 0.2, axX + W * 0.26, H * 0.12, pal.note, 'ASSY ORDER');
    } else if (mode === 'Section') {
      // a cut view with hatching + section line + callouts
      const cx = W * 0.5, cy = H * 0.42, R = S * 0.24;
      // outer profile of the cut object (an impossible C that closes on itself)
      const prof = [
        [cx - R, cy - R], [cx + R, cy - R], [cx + R, cy + R], [cx - R, cy + R],
      ];
      // section A-A line across the whole sheet
      const sy = cy;
      centre([[W * 0.06, sy], [W * 0.94, sy]], pal.dim, 1.2, 0.95);
      // section arrows + labels
      arrow(W * 0.06, sy, Math.PI, pal.dim, S * 0.016); arrow(W * 0.94, sy, 0, pal.dim, S * 0.016);
      x.save(); x.fillStyle = K.rgba(pal.dim, 1); x.font = 'bold ' + (S * 0.022 | 0) + 'px monospace'; x.textAlign = 'center';
      x.fillText('A', W * 0.05, sy - S * 0.02); x.fillText('A', W * 0.95, sy - S * 0.02); x.restore();
      // the cut solid: outer rect with an inner void = hatched ring, plus an
      // impossible inner loop that passes through itself
      const outer = [[cx - R, cy - R], [cx + R, cy - R], [cx + R, cy + R], [cx - R, cy + R], [cx - R, cy - R]];
      const inner = [[cx - R * 0.45, cy - R * 0.45], [cx + R * 0.45, cy - R * 0.45], [cx + R * 0.45, cy + R * 0.45], [cx - R * 0.45, cy + R * 0.45], [cx - R * 0.45, cy - R * 0.45]];
      // hatch the material ring (between outer and inner) via even-odd clip
      x.save();
      x.beginPath();
      x.moveTo(outer[0][0], outer[0][1]); for (let i = 1; i < outer.length; i++) x.lineTo(outer[i][0], outer[i][1]);
      x.moveTo(inner[0][0], inner[0][1]); for (let i = 1; i < inner.length; i++) x.lineTo(inner[i][0], inner[i][1]);
      x.clip('evenodd');
      hatch(outer, pal.note, S * 0.013, Math.PI / 4, 0.85);
      x.restore();
      solid(outer, pal.ink, 1.7); solid(inner, pal.ink, 1.4);
      // impossible self-passing loop inside the bore
      penrose(cx, cy, R * 0.36, pal.ink, 1.4, pal.warm ? 0.05 : 0.04);
      // dimensions + callouts
      dim(cx - R, cy + R * 1.5, cx + R, cy + R * 1.5, S * 0.05);
      dim(cx + R * 1.5, cy - R, cx + R * 1.5, cy + R, S * 0.05);
      leader(cx - R * 0.7, cy - R * 0.7, cx - R * 2.2, cy - R * 1.6, pal.note, 'TYP. ' + K.pick(NUMS, r));
    } else if (mode === 'Detail') {
      // a parent view + a zoomed detail circle connected by lines
      const v = viewBox(W * 0.06, H * 0.18, W * 0.5, H * 0.46, 'PARENT VIEW', r() < 0.5 ? 'iso' : 'penrose');
      // detail circle around a corner of the parent
      const dpx = v.cx + v.R * 0.6, dpy = v.cy - v.R * 0.5, dpr = v.R * 0.35;
      x.beginPath(); x.arc(dpx, dpy, dpr, 0, 7); setLine(pal.dim, 1.3, 1); x.stroke();
      x.fillStyle = K.rgba(pal.dim, 1); x.font = 'bold ' + (S * 0.022 | 0) + 'px monospace'; x.textAlign = 'center';
      x.fillText('B', dpx, dpy - dpr - S * 0.01);
      // blown-up detail on the right
      const bx = W * 0.72, by = H * 0.42, br = S * 0.18;
      x.beginPath(); x.arc(bx, by, br, 0, 7); setLine(pal.dim, 1.4, 1); x.stroke();
      // connector lines (the magnify leaders)
      line(dpx + dpr * 0.7, dpy - dpr * 0.7, bx - br * 0.7, by - br * 0.7, pal.dim, 0.9, 0.85);
      line(dpx + dpr * 0.7, dpy + dpr * 0.7, bx - br * 0.7, by + br * 0.7, pal.dim, 0.9, 0.85);
      // detail content: a clipped impossible knot
      x.save(); x.beginPath(); x.arc(bx, by, br * 0.96, 0, 7); x.clip();
      penrose(bx, by, br * 0.7, pal.ink, 1.8, pal.warm ? 0.07 : 0.06);
      x.restore();
      x.fillStyle = K.rgba(pal.ink, 0.9); x.font = (S * 0.02 | 0) + 'px monospace'; x.textAlign = 'center';
      x.fillText('DETAIL B', bx, by + br + S * 0.04); x.fillText('SCALE 4:1', bx, by + br + S * 0.066);
      x.textAlign = 'start';
      dim(bx - br, by + br * 1.3, bx + br, by + br * 1.3, S * 0.05);
    } else { // Overlay — 2–3 translucent sheets stacked + misaligned
      const sheets = 2 + (r() < 0.5 ? 1 : 0);
      for (let s = 0; s < sheets; s++) {
        const ox = (r() - 0.5) * S * 0.06, oy = (r() - 0.5) * S * 0.06;
        const rot = (r() - 0.5) * 0.04;
        x.save();
        x.translate(W / 2 + ox, H / 2 + oy); x.rotate(rot); x.translate(-W / 2, -H / 2);
        x.globalAlpha = s === 0 ? 1 : 0.55;
        // each sheet a different projection of the impossible object
        const kinds = ['penrose', 'iso', 'rect', 'circ'];
        const k = kinds[(seed + s) % kinds.length];
        const v = viewBox(W * 0.22, H * 0.22, W * 0.56, H * 0.46, ['SHEET 1', 'SHEET 2', 'SHEET 3'][s], k);
        if (s === 0) {
          dim(v.cx - v.R, v.cy + v.R * 1.4, v.cx + v.R, v.cy + v.R * 1.4, S * 0.05);
          leader(v.cx + v.R * 0.4, v.cy, v.cx + v.R * 2.1, v.cy - v.R, pal.note);
        }
        x.restore();
      }
      x.globalAlpha = 1;
    }

    // ── TITLE BLOCK (corner, ruled boxes + faux text) — most sheets ──
    if (mode !== 'Overlay' || r() < 0.6) drawTitleBlock(x, W, H, pal, r, seed, mode, S);

    // border frame (drawing sheet edge)
    setLine(pal.ink, 1.4, 0.7);
    x.strokeRect(margin * 0.5, margin * 0.5, W - margin, H - margin);
    setLine(pal.ink, 0.8, 0.4);
    x.strokeRect(margin * 0.5 + 6, margin * 0.5 + 6, W - margin - 12, H - margin - 12);

    // ── PAPER TOOTH + HAZE + VIGNETTE (the vellum grade) ──
    // translucent overlay haze so it reads as layered, slightly milky vellum
    const hazeCol = pal.warm ? K.mix(pal.ground, '#fff4dc', 0.4) : K.mix(pal.ground, '#ffffff', 0.35);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.12, S * 0.7, pal.name === 'Graphite' ? 'screen' : (pal.warm ? 'overlay' : 'screen'));
    // paper tooth — fine fibre mottle
    K.mottle(x, 0, 0, W, H, pal.ground, 90, r, 'overlay');
    K.grain(x, W, H, 6.5, r);
    // fold/edge shading for physical-sheet feel
    K.vignette(x, W, H, pal.name === 'Graphite' ? 0.42 : 0.26);

    return { aspect: W / H };
  }

  /* faint engineering grid behind everything */
  function drawGrid(x, W, H, pal, r) {
    const g = Math.max(W, H) / (22 + (r() * 8 | 0));
    x.save(); x.strokeStyle = K.rgba(pal.note, pal.name === 'Graphite' ? 0.16 : 0.12); x.lineWidth = 0.6;
    for (let xx = g; xx < W; xx += g) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, H); x.stroke(); }
    for (let yy = g; yy < H; yy += g) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
    // bolder every 5th
    x.strokeStyle = K.rgba(pal.note, pal.name === 'Graphite' ? 0.24 : 0.18); x.lineWidth = 0.9;
    for (let i = 0, xx = g; xx < W; xx += g, i++) { if (i % 5 === 0) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, H); x.stroke(); } }
    for (let i = 0, yy = g; yy < H; yy += g, i++) { if (i % 5 === 0) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); } }
    x.restore();
  }

  /* corner title block — ruled boxes, faux text, part number, SCALE, DO NOT SCALE */
  function drawTitleBlock(x, W, H, pal, r, seed, mode, S) {
    const bw = Math.min(W * 0.34, S * 0.42), bh = S * 0.16;
    const corner = K.pick([[W - bw - S * 0.05, H - bh - S * 0.05], [S * 0.05, H - bh - S * 0.05]], r);
    const bx = corner[0], by = corner[1];
    x.save();
    // background knock-out so the block reads clean over linework
    x.fillStyle = K.rgba(pal.ground, 0.82); x.fillRect(bx, by, bw, bh);
    x.strokeStyle = K.rgba(pal.ink, 0.95); x.lineWidth = 1.4; x.strokeRect(bx, by, bw, bh);
    x.lineWidth = 0.8;
    // internal rules
    x.beginPath(); x.moveTo(bx, by + bh * 0.4); x.lineTo(bx + bw, by + bh * 0.4); x.stroke();
    x.beginPath(); x.moveTo(bx, by + bh * 0.7); x.lineTo(bx + bw, by + bh * 0.7); x.stroke();
    x.beginPath(); x.moveTo(bx + bw * 0.62, by); x.lineTo(bx + bw * 0.62, by + bh * 0.7); x.stroke();
    x.beginPath(); x.moveTo(bx + bw * 0.30, by + bh * 0.4); x.lineTo(bx + bw * 0.30, by + bh); x.stroke();
    x.beginPath(); x.moveTo(bx + bw * 0.66, by + bh * 0.7); x.lineTo(bx + bw * 0.66, by + bh); x.stroke();
    // text
    x.fillStyle = K.rgba(pal.ink, 1);
    const titles = ['IMPOSSIBLE SOLID', 'NON-OBJECT ASSY', 'PENROSE UNIT', 'NULL MECHANISM', 'VOID FRAME', 'PARADOX BODY'];
    x.font = 'bold ' + (S * 0.022 | 0) + 'px monospace'; x.textAlign = 'start';
    x.fillText(K.pick(titles, r), bx + S * 0.012, by + bh * 0.27);
    x.font = (S * 0.014 | 0) + 'px monospace'; x.fillStyle = K.rgba(pal.note, 1);
    const pn = 'PD-' + (1000 + (seed * 137) % 9000) + '-' + String.fromCharCode(65 + seed % 26);
    x.fillText('PART No. ' + pn, bx + S * 0.012, by + bh * 0.56);
    x.fillText('SCALE 1:1', bx + S * 0.012, by + bh * 0.86);
    x.fillText('REV ' + (String.fromCharCode(65 + (seed % 4))), bx + bw * 0.34, by + bh * 0.86);
    x.fillStyle = K.rgba(pal.dim, 1); x.font = 'bold ' + (S * 0.013 | 0) + 'px monospace';
    x.fillText('DO NOT SCALE', bx + bw * 0.66, by + bh * 0.27);
    x.fillStyle = K.rgba(pal.note, 1); x.font = (S * 0.012 | 0) + 'px monospace';
    x.fillText('SHT 1 OF 1', bx + bw * 0.66, by + bh * 0.56);
    x.fillText(mode.toUpperCase(), bx + bw * 0.68, by + bh * 0.86);
    x.restore();
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    const objMap = ['Penrose', 'Escher Box', 'Null Bore', 'Paradox Loop'];
    return { Palette: pal.name, Mode: mode, Format: f, Object: objMap[seed % objMap.length] };
  }

  return { name: 's11_vellum', draw, traits };
})();
