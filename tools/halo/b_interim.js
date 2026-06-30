/* INTERIM — non-objective constructivist abstraction (El Lissitzky "Proun" lineage,
 * but its own work). Tilted PLANES, bars, discs and ruling LINES suspended in an
 * ambiguous AXONOMETRIC space: flat shapes implying a weightless 3-D scaffold that
 * never resolves into an object, building, scene or figure. The work IS composition —
 * form, value, balance, tension, rhythm. Depicts NOTHING.
 *
 * Palette world (owned): pale spatial GROUND (white/grey), BLACK ruling LINES,
 * primary PLANES (red / black / ochre / blue). Cool, constructed, precise.
 * Surface: paper tooth, printed-ink mottle, faint haze, slight hand-imperfect edges,
 * vignette grade — a fine screenprint, not flat clip-art.
 *
 * GENERATIVE SYSTEM (not a template picker): there are NO discrete "modes". Every
 * composition is built by a continuous COMPOSER — each piece samples its own
 * structure from continuous knobs driven entirely by the seed: a focal blend
 * (slab/disc/wedge/lattice mixed by weight, never one-of-N), element counts,
 * scale/zoom, density (near-empty void ↔ packed), focal position, asymmetry,
 * rotations, spacings, curvature, format, and colour VALUES jittered in HSL within
 * the palette world. Two seeds essentially never collide because the parameter space
 * is continuous in ~20 independent dimensions, not N×M buckets.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* ── PALETTES — constructivist line + plane world, MIXED ground field. ─────── */
  const PALS = [
    { name: 'Blueprint Ink', w: 10,
      ground: ['#0d1a2b', '#0a1623', '#06101b'], line: '#e8eef6',
      inks: ['#dfe7f2', '#c23a2c', '#e0b23e', '#5f86b8', '#aebfd6'] },
    { name: 'Cyanotype Deep', w: 8,
      ground: ['#0b2233', '#082a3f', '#061a2a'], line: '#dfeef5',
      inks: ['#bce0ea', '#e8e2cf', '#d2563a', '#e2b84a', '#9fc6d6'] },
    { name: 'Proun Prime',  w: 6,
      ground: ['#eceae3', '#e2dfd6', '#d6d2c7'], line: '#181410',
      inks: ['#b8332a', '#1b1814', '#caa23f', '#2f4f7a', '#e7e3d8'] },
    { name: 'Oxblood Press', w: 5,
      ground: ['#2a0f10', '#23100f', '#180a0b'], line: '#f0e4d6',
      inks: ['#e8d9c4', '#e0b24a', '#c9402f', '#7d8aa0', '#f3ead9'] },
    { name: 'Press Ochre',   w: 4,
      ground: ['#efe9da', '#e6dec9', '#dbd1b8'], line: '#1a150d',
      inks: ['#c79324', '#1c160d', '#a8331f', '#3a5566', '#f2ecdc'] },
    { name: 'Drafting Blue', w: 4,
      ground: ['#e7eaee', '#dadfe6', '#cdd4dd'], line: '#13171d',
      inks: ['#274b78', '#15171c', '#b9412f', '#a9b3bf', '#eef1f4'] },
    { name: 'Constructivist Red', w: 4,
      ground: ['#ece7df', '#e1dacd', '#d3c9b8'], line: '#15100c',
      inks: ['#b22a22', '#7a1c17', '#171310', '#d8b24a', '#efe9dd'] },
  ];

  /* CONTINUOUS formats: aspect sampled across portrait↔landscape so format is a
     dial, not 3 buckets. */
  function pickFormat(r) {
    // bias toward variety: occasional strong portrait / strong landscape / square-ish
    const u = r();
    let aspect;
    if (u < 0.30) aspect = 0.66 + r() * 0.20;        // portrait 0.66–0.86
    else if (u < 0.58) aspect = 0.92 + r() * 0.16;   // near-square 0.92–1.08
    else if (u < 0.84) aspect = 1.16 + r() * 0.26;   // landscape 1.16–1.42
    else aspect = 1.42 + r() * 0.30;                 // wide 1.42–1.72
    const longEdge = 1180 + (r() * 140 | 0);
    let W, H;
    if (aspect >= 1) { W = Math.round(longEdge); H = Math.round(longEdge / aspect); }
    else { H = Math.round(longEdge); W = Math.round(longEdge * aspect); }
    return [W, H];
  }

  function wpick(arr, weights, r) {
    let t = 0; for (const w of weights) t += w;
    let v = r() * t;
    for (let i = 0; i < arr.length; i++) { v -= weights[i]; if (v <= 0) return arr[i]; }
    return arr[arr.length - 1];
  }

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return wpick(PALS, PALS.map((p) => p.w), r);
  }

  /* ── COLOUR jitter in HSL: shift a palette ink by a small continuous amount so
     the same swatch is never literally repeated. Keeps it inside the world
     (small hue drift, modest sat/val drift). ─────────────────────────────────── */
  function rgb2hsl(hex) {
    const c = K.h2r(hex).map((v) => v / 255);
    const max = Math.max(c[0], c[1], c[2]), min = Math.min(c[0], c[1], c[2]);
    let h = 0, s = 0; const l = (max + min) / 2;
    const d = max - min;
    if (d > 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === c[0]) h = ((c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0));
      else if (max === c[1]) h = (c[2] - c[0]) / d + 2;
      else h = (c[0] - c[1]) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function jit(hex, r, hAmt, sAmt, lAmt) {
    const hsl = rgb2hsl(hex);
    const h = hsl[0] + (r() - 0.5) * 2 * (hAmt == null ? 9 : hAmt);
    const s = K.clamp(hsl[1] + (r() - 0.5) * 2 * (sAmt == null ? 0.10 : sAmt), 0, 1);
    const l = K.clamp(hsl[2] + (r() - 0.5) * 2 * (lAmt == null ? 0.07 : lAmt), 0.02, 0.98);
    return K.hsl2hex(h, s, l);
  }

  /* axonometric projection (seed-tilted). */
  function makeProj(ax) {
    const e1 = [Math.cos(-ax), Math.sin(-ax) * 0.5];
    const e2 = [-Math.cos(ax * 0.92), Math.sin(ax * 0.92) * 0.5];
    const up = [0, -1];
    return function (p, cx, cy, s) {
      return [
        cx + (p[0] * e1[0] + p[1] * e2[0]) * s,
        cy + (p[0] * e1[1] + p[1] * e2[1] + p[2] * up[1]) * s,
      ];
    };
  }

  /* draw a quad with hand-imperfect edges + ink fill, keyline, printed mottle. */
  function inkQuad(x, pts, fill, lineCol, lw, r, noise, jitAmt) {
    jitAmt = jitAmt == null ? 1.1 : jitAmt;
    const q = pts.map((p) => [p[0] + (r() - 0.5) * jitAmt, p[1] + (r() - 0.5) * jitAmt]);
    x.save();
    x.beginPath();
    x.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < q.length; i++) x.lineTo(q[i][0], q[i][1]);
    x.closePath();
    x.fillStyle = fill; x.fill();
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const p of q) { minx = Math.min(minx, p[0]); miny = Math.min(miny, p[1]); maxx = Math.max(maxx, p[0]); maxy = Math.max(maxy, p[1]); }
    const gw = maxx - minx, gh = maxy - miny;
    if (gw > 2 && gh > 2) {
      x.save();
      x.beginPath();
      x.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) x.lineTo(q[i][0], q[i][1]); x.closePath();
      x.clip();
      const g = x.createLinearGradient(minx, miny, maxx, maxy);
      g.addColorStop(0, K.rgba(K.mix(fill, '#ffffff', 0.10), 0.30));
      g.addColorStop(0.5, K.rgba(fill, 0));
      g.addColorStop(1, K.rgba(K.mix(fill, '#000000', 0.16), 0.34));
      x.fillStyle = g; x.fillRect(minx, miny, gw, gh);
      K.mottle(x, minx, miny, gw, gh, fill, 30, r, 'overlay');
      x.restore();
    }
    if (lw > 0) {
      x.lineJoin = 'round'; x.lineWidth = lw; x.strokeStyle = lineCol;
      x.beginPath();
      x.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) x.lineTo(q[i][0], q[i][1]); x.closePath();
      x.stroke();
    }
    x.restore();
    return q;
  }

  /* a BAR in axonometric space (extruded box: top + 2 sides). */
  function axonBar(x, proj, cx, cy, s, p0, p1, half, thick, faceCol, line, lw, r, noise) {
    half *= 1.5; thick *= 2.0;
    const dir = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    let perp = [-dir[1], dir[0], 0];
    const pl = Math.hypot(perp[0], perp[1], perp[2]) || 1;
    perp = [perp[0] / pl, perp[1] / pl, perp[2] / pl];
    function corner(t, w, h) {
      return [p0[0] + dir[0] * t + perp[0] * w, p0[1] + dir[1] * t + perp[1] * w, p0[2] + dir[2] * t + h];
    }
    const P = (c) => proj(c, cx, cy, s);
    inkQuad(x, [P(corner(0, half, thick)), P(corner(1, half, thick)), P(corner(1, half, -thick)), P(corner(0, half, -thick))],
      K.mix(faceCol, '#000000', 0.30), line, lw, r, noise, 0.5);
    inkQuad(x, [P(corner(0, -half, thick)), P(corner(1, -half, thick)), P(corner(1, -half, -thick)), P(corner(0, -half, -thick))],
      K.mix(faceCol, '#000000', 0.12), line, lw, r, noise, 0.5);
    inkQuad(x, [P(corner(0, half, thick)), P(corner(1, half, thick)), P(corner(1, -half, thick)), P(corner(0, -half, thick))],
      K.mix(faceCol, '#ffffff', 0.14), line, lw, r, noise, 0.5);
  }

  /* a hovering DISC (ellipse, faintly tilted) with ink texture. */
  function inkDisc(x, dx, dy, rad, squash, ang, fill, line, lw, r, noise, ring) {
    x.save();
    x.translate(dx, dy); x.rotate(ang);
    x.save(); x.scale(1, squash);
    x.beginPath(); x.arc(0, 0, rad, 0, 7); x.fillStyle = fill; x.fill();
    const g = x.createLinearGradient(-rad, -rad, rad, rad);
    g.addColorStop(0, K.rgba(K.mix(fill, '#fff', 0.16), 0.34));
    g.addColorStop(1, K.rgba(K.mix(fill, '#000', 0.20), 0.36));
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, rad, 0, 7); x.fill();
    x.restore();
    K.mottle(x, -rad, -rad * squash, rad * 2, rad * 2 * squash, fill, 26, r, 'overlay');
    if (lw > 0) {
      x.lineWidth = lw; x.strokeStyle = line;
      x.save(); x.scale(1, squash); x.beginPath(); x.arc(0, 0, rad, 0, 7); x.stroke(); x.restore();
    }
    if (ring) {
      x.lineWidth = lw * 0.8; x.strokeStyle = line;
      x.save(); x.scale(1, squash); x.beginPath(); x.arc(0, 0, rad * (1.18 + r() * 0.18), 0, 7); x.stroke(); x.restore();
    }
    x.restore();
  }

  /* a long ruling LINE piercing the composition, rounded caps + slight wobble. */
  function rulingLine(x, x0, y0, x1, y1, col, lw, r, dot, curveAmt) {
    const ca = curveAmt == null ? 4 : curveAmt;
    const mx = (x0 + x1) / 2 + (r() - 0.5) * ca, my = (y0 + y1) / 2 + (r() - 0.5) * ca;
    x.save();
    x.lineCap = 'round'; x.lineWidth = lw; x.strokeStyle = col;
    x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(mx, my, x1, y1); x.stroke();
    if (dot) {
      const ex = r() < 0.5 ? x0 : x1, ey = ex === x0 ? y0 : y1;
      x.beginPath(); x.arc(ex, ey, lw * (1.7 + r() * 0.6), 0, 7); x.fillStyle = col; x.fill();
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const pal = pickPal(r);
    const fmt = pickFormat(r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);
    const line = pal.line;
    const lwBase = S * 0.0045;

    // ── GROUND wash ──
    const bg = x.createLinearGradient(0, 0, W * (0.2 + r() * 0.5), H);
    bg.addColorStop(0, pal.ground[0]); bg.addColorStop(0.55, pal.ground[1]); bg.addColorStop(1, pal.ground[2]);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    const lpx = W * (0.28 + r() * 0.44), lpy = H * (0.26 + r() * 0.44);
    K.bloom(x, lpx, lpy, S * (0.8 + r() * 0.5), '#ffffff', 0.08 + r() * 0.06);

    // axonometric projector — tilt varies per seed
    const ax = 0.34 + r() * 0.34;
    const proj = makeProj(ax);

    // ── CONTINUOUS GLOBAL KNOBS (all seed-driven, independent) ──
    // ZOOM: how big the whole composition reads (small minimal ↔ large cropped)
    const zoom = 0.72 + Math.pow(r(), 0.85) * 1.05;     // 0.72 .. 1.77
    // DENSITY: near-empty void ↔ packed
    const density = Math.pow(r(), 1.15);                // 0 .. 1, biased lower
    // ASYMMETRY: how far the focal sits off-centre
    const asym = 0.06 + r() * 0.26;
    // focal centre, pushed off geometric centre
    const fa = r() * 6.283;
    const cx = W * (0.5 + Math.cos(fa) * asym);
    const cy = H * (0.5 + Math.sin(fa) * asym * 0.9);
    const s = S * 0.0016 * (0.82 + zoom * 0.5);          // world→screen unit, zoom-scaled
    // dominant compositional axis (one continuous angle drives thrust/balance)
    const mainAng = (r() - 0.5) * 1.7;
    const dM = [Math.cos(mainAng), Math.sin(mainAng)];

    // ── CONTINUOUS FOCAL BLEND — weights for the four structural families.
    // Each piece is a *mix*, not a choice: a dominant family plus secondary
    // presence. This is what de-correlates structure from palette and kills twins. */
    let wSlab = Math.pow(r(), 1.3), wDisc = Math.pow(r(), 1.3),
        wWedge = Math.pow(r(), 1.6), wLatt = Math.pow(r(), 1.4);
    const wt = wSlab + wDisc + wWedge + wLatt || 1;
    wSlab /= wt; wDisc /= wt; wWedge /= wt; wLatt /= wt;
    const fam = [['slab', wSlab], ['disc', wDisc], ['wedge', wWedge], ['latt', wLatt]]
      .sort((a, b) => b[1] - a[1]);
    const domFam = fam[0][0];

    // colour assignment with HSL jitter so swatches never literally repeat
    const planeInks = pal.inks.slice(0, 4);
    const paperInk = pal.inks[4];
    function planeColor(i) { return jit(planeInks[i % planeInks.length], r); }
    function paperCol() { return jit(paperInk, r, 6, 0.06, 0.05); }
    function lineCol() { return jit(line, r, 6, 0.05, 0.04); }
    // focal ink: most chromatic mid-value plane, then jittered
    const focalBase = planeInks.reduce((best, c) => {
      const lc = K.lum(c), lb = K.lum(best);
      const score = (v) => (v > 0.16 && v < 0.62 ? 1 : 0);
      return score(lc) >= score(lb) && lc > lb ? c : best;
    }, planeInks[0]);

    // ── shared primitives ──
    function hoverShadow(px, py, rad, a) {
      x.save(); x.globalCompositeOperation = 'multiply';
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, K.rgba(K.mix(pal.ground[2], '#000', 0.5), a));
      g.addColorStop(1, K.rgba(pal.ground[2], 0));
      x.fillStyle = g; x.save(); x.translate(px, py); x.scale(1, 0.42); x.translate(-px, -py);
      x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill(); x.restore(); x.restore();
    }
    function tiltedPlane(px, py, w, h, rot, skew, fill, lw, shadow) {
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const local = [[-w / 2, -h / 2], [w / 2, -h / 2 + skew * h], [w / 2, h / 2 + skew * h], [-w / 2, h / 2]];
      const pts = local.map((p) => [px + p[0] * cos - p[1] * sin, py + p[0] * sin + p[1] * cos]);
      if (shadow) {
        const sy = py + Math.max(w, h) * (0.5 + r() * 0.3);
        hoverShadow(px + Math.max(w, h) * 0.1, sy, Math.max(w, h) * 0.62, 0.22);
      }
      return inkQuad(x, pts, fill, lineCol(), lw, r, noise, 1.2);
    }
    function bigWedge() {
      // a heavy triangular value-mass wedged from a continuously chosen edge
      const dark = planeInks.reduce((a, b) => (K.lum(b) < K.lum(a) ? b : a));
      const edge = r();                       // continuous edge position
      const span = 0.42 + r() * 0.36;
      const depth = 0.40 + r() * 0.42;
      // anchor along a chosen corner but with continuous reach
      const corner = (r() * 4 | 0);
      const cs = [[0, 0], [W, 0], [W, H], [0, H]][corner];
      const wpts = [
        [cs[0] + (r() - 0.5) * W * 0.1, cs[1] + (r() - 0.5) * H * 0.1],
        [cs[0] === 0 ? W * span : W * (1 - span), cs[1] + (corner < 2 ? H * (r() * 0.12) : -H * (r() * 0.12))],
        [cs[0] + (corner % 3 === 0 ? W * (r() * 0.12) : -W * (r() * 0.12)), cs[1] === 0 ? H * depth : H * (1 - depth)],
      ];
      inkQuad(x, wpts, jit(dark, r, 5, 0.05, 0.04), lineCol(), lwBase * 1.2, r, noise, 1.4);
      return [(wpts[0][0] + wpts[1][0] + wpts[2][0]) / 3, (wpts[0][1] + wpts[1][1] + wpts[2][1]) / 3];
    }

    // a soft cast pool under the focal for hover/depth
    function castFocalShadow(rad) { hoverShadow(cx + rad * 0.15, cy + rad * 1.0, rad * 1.1, 0.2 + r() * 0.08); }

    // ── COMPOSE: lay families in back-to-front order, weighted by the blend ──
    const built = [];

    // 0) background long ruling line that threads the focal axis (curvature varies)
    const curve = (r() - 0.5) * S * 0.10;
    const lineWeight = lwBase * (0.8 + r() * 0.8);
    if (r() < 0.85) {
      rulingLine(x, cx - dM[0] * W * 1.1, cy - dM[1] * W * 1.1,
        cx + dM[0] * W * 1.1, cy + dM[1] * W * 1.1, lineCol(), lineWeight, r, r() < 0.7, curve);
    }

    // 1) WEDGE family — heavy value-mass (present when weighted)
    let wedgeCentroid = null;
    if (wWedge > 0.16) {
      wedgeCentroid = bigWedge();
      built.push('wedge');
    }

    // 2) LATTICE family — open ruled grid, weighted struts. Count + angles continuous.
    if (wLatt > 0.14) {
      const a1 = mainAng * 0.5 + (r() - 0.5) * 0.5;
      const a2 = a1 + (0.85 + r() * 0.7) * (r() < 0.5 ? 1 : -1);
      const d1 = [Math.cos(a1), Math.sin(a1)], d2 = [Math.cos(a2), Math.sin(a2)];
      const p1 = [-d1[1], d1[0]], p2 = [-d2[1], d2[0]];
      const n1 = 2 + ((wLatt * 6 + r() * 2) | 0);
      const n2 = 1 + ((wLatt * 5 + r() * 2) | 0);
      const gap = S * (0.10 + r() * 0.08);
      const reach = S * (0.5 + r() * 0.35) * (0.8 + zoom * 0.4);
      x.save(); x.lineCap = 'round';
      for (let i = 0; i < n1; i++) {
        const o = (i - (n1 - 1) / 2) * gap;
        const ox = cx + p1[0] * o, oy = cy + p1[1] * o;
        const e0 = reach * (0.7 + r() * 0.5), e1 = reach * (0.7 + r() * 0.5);
        x.lineWidth = lwBase * (1.1 + r() * 0.7); x.strokeStyle = lineCol();
        x.beginPath(); x.moveTo(ox - d1[0] * e0, oy - d1[1] * e0); x.lineTo(ox + d1[0] * e1, oy + d1[1] * e1); x.stroke();
      }
      for (let i = 0; i < n2; i++) {
        const o = (i - (n2 - 1) / 2) * gap * 1.2;
        const ox = cx + p2[0] * o, oy = cy + p2[1] * o;
        const e0 = reach * (0.6 + r() * 0.5), e1 = reach * (0.6 + r() * 0.5);
        const col = (i === (n2 >> 1) && r() < 0.5) ? (planeInks.find((c) => K.lum(c) > 0.32) ? jit(planeInks.find((c) => K.lum(c) > 0.32), r) : lineCol()) : lineCol();
        x.lineWidth = lwBase * (1.1 + r() * 0.7); x.strokeStyle = col;
        x.beginPath(); x.moveTo(ox - d2[0] * e0, oy - d2[1] * e0); x.lineTo(ox + d2[0] * e1, oy + d2[1] * e1); x.stroke();
      }
      x.restore();
      const joints = ((wLatt * 5 + r() * 2) | 0);
      for (let i = 0; i < joints; i++) {
        const t1 = (r() - 0.5) * reach * 1.2, t2 = (r() - 0.5) * gap * (n1 - 1);
        const jx = cx + d1[0] * t1 + p1[0] * t2, jy = cy + d1[1] * t1 + p1[1] * t2;
        x.fillStyle = lineCol(); x.beginPath(); x.arc(jx, jy, lwBase * (1.4 + r() * 0.9), 0, 7); x.fill();
      }
      built.push('latt');
    }

    // 3) PLANES (slab family) — count + scale + placement continuous.
    // The dominant plane scales with wSlab and zoom; secondary planes scatter.
    const nPlanes = 1 + ((wSlab * 3.2 + density * 1.6 + r() * 1.2) | 0);
    for (let i = 0; i < nPlanes; i++) {
      const isDom = i === 0 && wSlab > 0.2;
      // along-axis offset gives rhythm; first sits at focal
      const along = i === 0 ? 0 : (r() - 0.5) * S * (0.7 + zoom * 0.4);
      const cross = i === 0 ? 0 : (r() - 0.5) * S * (0.5 + zoom * 0.3);
      const perpM = [-dM[1], dM[0]];
      const px = cx + dM[0] * along + perpM[0] * cross;
      const py = cy + dM[1] * along + perpM[1] * cross;
      // proportions: dominant is broad slab; some are long thin bars-as-planes
      const longish = r() < 0.42;
      const baseScale = isDom ? (0.40 + wSlab * 0.5) : (0.14 + r() * 0.22);
      let pw = S * baseScale * (longish ? (1.3 + r() * 0.6) : (0.8 + r() * 0.5)) * (0.7 + zoom * 0.5);
      let ph = S * baseScale * (longish ? (0.26 + r() * 0.16) : (0.6 + r() * 0.4)) * (0.7 + zoom * 0.5);
      const rot = mainAng * (isDom ? 1 : (r() - 0.5) * 1.8) + (r() - 0.5) * (isDom ? 0.22 : 0.9);
      const skew = -0.22 + r() * 0.44;
      const fill = isDom ? jit(focalBase, r, 8, 0.10, 0.07) : planeColor(1 + i);
      tiltedPlane(px, py, pw, ph, rot, skew, fill, lwBase, isDom || r() < 0.5);
    }

    // 4) DISC family — focal disc when weighted, plus satellites.
    if (wDisc > 0.18) {
      const dr = S * (0.10 + wDisc * 0.16) * (0.8 + zoom * 0.4);
      castFocalShadow(dr);
      inkDisc(x, cx + (r() - 0.5) * S * 0.1, cy + (r() - 0.5) * S * 0.08, dr,
        0.55 + r() * 0.2, (r() - 0.5) * 0.8, jit(planeInks[0], r, 8, 0.1, 0.07), lineCol(), lwBase * 1.05, r, noise, r() < 0.5);
    }
    // bar(s) piercing — count tied to density
    const nBars = (density * 2.2 + r() * 1.2) | 0;
    for (let i = 0; i < nBars; i++) {
      const bx = cx + (r() - 0.5) * W * 0.3, by = cy + (r() - 0.5) * H * 0.3;
      const L = 60 + r() * 90, ang3 = r() * 6.28;
      axonBar(x, proj, bx, by, s,
        [-Math.cos(ang3) * L, -Math.sin(ang3) * L, 4 + r() * 12],
        [Math.cos(ang3) * L, Math.sin(ang3) * L, 4 + r() * 12],
        5 + r() * 5, 5 + r() * 4, planeColor(2 + i), lineCol(), lwBase * 0.7, r, noise);
    }
    // satellite discs — count tied to density
    const nSat = (density * 2.4 + r() * 1.0) | 0;
    for (let i = 0; i < nSat; i++) {
      const px = W * (0.12 + r() * 0.76), py = H * (0.12 + r() * 0.76);
      inkDisc(x, px, py, S * (0.03 + r() * 0.06), 0.6 + r() * 0.25, r() * 6.28,
        planeColor(3 + i), lineCol(), lwBase * 0.8, r, noise, r() < 0.3);
    }

    // 5) bright punch disc on the wedge (max value contrast) when a wedge exists
    if (wedgeCentroid && r() < 0.85) {
      inkDisc(x, wedgeCentroid[0], wedgeCentroid[1], S * (0.07 + r() * 0.05) * (0.8 + zoom * 0.3),
        0.85 + r() * 0.12, (r() - 0.5) * 0.6, paperCol(), lineCol(), lwBase, r, noise, r() < 0.6);
    }

    // ── universal small accents (count tied to density) ──
    const nNodes = (density * 2 + r() * 1.2) | 0;
    for (let i = 0; i < nNodes; i++) {
      const nx = W * (0.08 + r() * 0.84), ny = H * (0.08 + r() * 0.84);
      const ns = S * (0.015 + r() * 0.022);
      x.save(); x.translate(nx, ny); x.rotate(r() * 0.9 - 0.45);
      x.fillStyle = r() < 0.5 ? lineCol() : planeColor(3); x.fillRect(-ns / 2, -ns / 2, ns, ns); x.restore();
    }
    // a secondary ruling line for some pieces (cross-thread)
    if (r() < 0.5 + density * 0.3) {
      const a = r() * 6.28;
      rulingLine(x, cx - Math.cos(a) * W, cy - Math.sin(a) * W,
        cx + Math.cos(a) * W, cy + Math.sin(a) * H, lineCol(), lwBase * (0.7 + r() * 0.5), r, r() < 0.5, (r() - 0.5) * S * 0.08);
    }

    // ── ATMOSPHERE + SURFACE GRADE ──
    K.hazeSheet(x, W, H, noise, K.mix(pal.ground[2], '#ffffff', 0.4), 0.10, S * 0.5, 'multiply');
    K.hazeSheet(x, W, H, noise, '#ffffff', 0.07, S * 0.9, 'screen');
    K.grain(x, W, H, 4.2, r);
    K.mottle(x, 0, 0, W, H, pal.ground[1], 80, r, 'multiply');
    K.vignette(x, W, H, 0.22 + r() * 0.08);

    return { aspect: W / H };
  }

  /* traits MUST mirror draw()'s rng order up to the values it reports. We replay
     the same opening draws: pal, format, then the focal-blend that defines the
     dominant family + a density/zoom read. */
  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : wpick(PALS, PALS.map((p) => p.w), r);
    // mirror pickFormat
    const u = r();
    let aspect;
    if (u < 0.30) aspect = 0.66 + r() * 0.20;
    else if (u < 0.58) aspect = 0.92 + r() * 0.16;
    else if (u < 0.84) aspect = 1.16 + r() * 0.26;
    else aspect = 1.42 + r() * 0.30;
    r(); // longEdge consume
    const f = aspect > 1.07 ? 'Landscape' : aspect < 0.9 ? 'Portrait' : 'Square';
    // mirror: bloom alpha consume happens in draw after ground; but traits only needs
    // the focal blend, which in draw is sampled after: bg grad x-stop r(), lpx,lpy,
    // bloom rad, bloom alpha, ax, zoom, density, asym, fa, mainAng. Replay them.
    r();                 // bg gradient x
    r(); r();            // lpx, lpy
    r();                 // bloom rad
    r();                 // bloom alpha
    r();                 // ax
    const zoom = 0.72 + Math.pow(r(), 0.85) * 1.05;
    const density = Math.pow(r(), 1.15);
    r();                 // asym
    r();                 // fa
    r();                 // mainAng
    const wSlab = Math.pow(r(), 1.3), wDisc = Math.pow(r(), 1.3),
          wWedge = Math.pow(r(), 1.6), wLatt = Math.pow(r(), 1.4);
    const fams = [['Slab', wSlab], ['Disc', wDisc], ['Wedge', wWedge], ['Lattice', wLatt]]
      .sort((a, b) => b[1] - a[1]);
    const dens = density < 0.33 ? 'Sparse' : density < 0.66 ? 'Balanced' : 'Dense';
    const scl = zoom < 1.05 ? 'Wide' : zoom < 1.45 ? 'Mid' : 'Close';
    return { Palette: pal.name, Focus: fams[0][0], Density: dens, Scale: scl, Format: f };
  }

  return { name: 'b_interim', draw, traits };
})();
