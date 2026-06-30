/* JAZZ — flat, bold ORGANIC paper cut-out abstraction (Matisse-influenced, ours).
 * Curving blades, blobs, arcs, organic stars — scattered & overlapped with crisp
 * scissor edges and a whisper of paper lift, in joyful balanced rhythm across a
 * vivid-but-limited curated palette on warm cream. PURE NON-OBJECTIVE: form,
 * colour, rhythm, negative space. Depicts nothing nameable.
 *
 * Surface is screenprint/riso-grade: mottled printed ink, paper tooth grain,
 * a faint haze wash, a vignette grade, and slightly imperfect hand-cut edges.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;
  const TAU = Math.PI * 2;

  /* ── PALETTES — Matisse cut-outs on BOLD SATURATED grounds (cobalt, viridian,
     oxblood, midnight, saffron) with crisp contrasting cut shapes; one cream
     kept for breathing room. Each palette is restrained (the engine draws 3–4
     inks per piece from `inks`), hand-weighted, with the saturated `cream`
     (= ground), a near-neighbour `paper` for tooth/gradient, and a designated
     `dark` value anchor that reads as the deepest value AGAINST that ground.
     `darkGround` flips the finishing grade (haze/vignette) for dark grounds so
     they don't get muddy. Inks run LIGHT on the dark grounds to hold chiaroscuro
     and legibility. ── */
  const PALS = [
    // COBALT ground — light cream/coral/lemon cut shapes pop off deep blue.
    { name: 'Cobalt',    weight: 1.0, darkGround: true,  cream: '#16367f', paper: '#1b3e8e', dark: '#0a1430',
      inks: ['#f4e9cf', '#ef6a3c', '#f2c732', '#3ec6c0'] },
    // VIRIDIAN ground — warm light + coral against a deep green field.
    { name: 'Viridian',  weight: 1.0, darkGround: true,  cream: '#0e5a44', paper: '#136a50', dark: '#062019',
      inks: ['#f2e7cd', '#ef5d4a', '#f3bf2c', '#1f9ec4'] },
    // OXBLOOD ground — gold/cream/teal cut shapes on a deep wine-red ground.
    { name: 'Oxblood',   weight: 0.9, darkGround: true,  cream: '#6b1f24', paper: '#7a262b', dark: '#1f0a0c',
      inks: ['#efc33a', '#f2e6ce', '#1f9b8e', '#e98a5a'] },
    // MIDNIGHT ground — true near-black; vivid jewels + cream read as paper lift.
    { name: 'Midnight',  weight: 0.7, darkGround: true,  cream: '#161422', paper: '#1d1a2c', dark: '#efe2c6',
      inks: ['#f0c12a', '#e7553c', '#3aa6c4', '#e6e0cf'] }, // dark light: ground is dark, anchor is light
    // SAFFRON ground — a VIVID warm-light saturated ground for value range;
    // here the cut shapes run DARK (oxblood/cobalt/black) for contrast.
    { name: 'Saffron',   weight: 0.7, darkGround: false, cream: '#e7a418', paper: '#dd9b12', dark: '#241208',
      inks: ['#7a1f25', '#163f8c', '#1a1018', '#1f8b76'] },
    // RIVIERA — the one cream breather kept from the original world.
    { name: 'Riviera',   weight: 0.45, darkGround: false, cream: '#f3e7cf', paper: '#efe0c2', dark: '#161019',
      inks: ['#1f4fb6', '#e7553c', '#1f9e6e', '#f2c12e'] },
  ];

  const MODES = ['Drift', 'Arabesque', 'Bouquet', 'Tideline', 'Constellation', 'Colonnade'];
  const FORMATS = [[1040, 1280], [1180, 1180], [1280, 1040]]; // portrait / square / landscape

  /* continuous colour-value jitter WITHIN the palette world: nudge each ink's
     hue/sat/lum a touch so two same-family pieces never share identical inks,
     yet the world (cobalt/viridian/etc.) is preserved. Returns a fresh hex. */
  function jitterInk(hex, r, amt) {
    const c = K.h2r(hex);
    // to hsl
    const rr = c[0] / 255, gg = c[1] / 255, bb = c[2] / 255;
    const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    const d = mx - mn;
    if (d > 1e-6) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0));
      else if (mx === gg) h = (bb - rr) / d + 2;
      else h = (rr - gg) / d + 4;
      h *= 60;
    }
    const a = amt == null ? 1 : amt;
    h += (r() - 0.5) * 14 * a;
    s = K.clamp(s * (1 + (r() - 0.5) * 0.22 * a), 0, 1);
    const ll = K.clamp(l + (r() - 0.5) * 0.07 * a, 0.03, 0.97);
    return K.hsl2hex(h, s, ll);
  }

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return weightedPal(r);
  }
  function weightedPal(r) {
    let tot = 0; for (const p of PALS) tot += p.weight;
    let t = r() * tot;
    for (const p of PALS) { t -= p.weight; if (t <= 0) return p; }
    return PALS[0];
  }

  /* ── ORGANIC SHAPE GENERATORS ───────────────────────────────────────────
     All return an array of points (closed loop). We render through one
     scissor-path drawer that adds tiny hand-wobble so edges read hand-cut,
     not vector. ── */

  // smooth closed blob: radius modulated by a few low harmonics
  function blobPts(cx, cy, rad, r, squash, rot, lobes) {
    const N = 80;
    const a1 = 0.12 + r() * 0.30, a2 = 0.06 + r() * 0.22, a3 = 0.03 + r() * 0.14;
    const p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU;
    const k1 = lobes || (2 + (r() * 3 | 0)), k2 = k1 + 1 + (r() * 2 | 0), k3 = k2 + 2;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU;
      let rr = rad * (1 + a1 * Math.sin(k1 * a + p1) + a2 * Math.sin(k2 * a + p2) + a3 * Math.sin(k3 * a + p3));
      let px = Math.cos(a) * rr, py = Math.sin(a) * rr * squash;
      const c = Math.cos(rot), s = Math.sin(rot);
      pts.push([cx + px * c - py * s, cy + px * s + py * c]);
    }
    return pts;
  }

  // curving blade / leaf: a long tapered organic sliver with a hooked tip
  function bladePts(cx, cy, len, wid, ang, curve, r) {
    const N = 46;
    const spine = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const bend = curve * Math.sin(t * Math.PI) * len * 0.5;
      const along = (t - 0.5) * len;
      spine.push([along, bend]);
    }
    const pts = [];
    // taper: fat near base, sharp at tip (both ends pointy-ish, asymmetric)
    function half(arr, sign) {
      for (let i = 0; i < arr.length; i++) {
        const t = i / N;
        const w = wid * Math.pow(Math.sin(t * Math.PI), 0.7) * (0.55 + 0.7 * (1 - t));
        const i2 = Math.min(arr.length - 1, i + 1), i0 = Math.max(0, i - 1);
        const dx = arr[i2][0] - arr[i0][0], dy = arr[i2][1] - arr[i0][1];
        const L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L;
        pts.push([arr[i][0] + sign * nx * w, arr[i][1] + sign * ny * w]);
      }
    }
    half(spine, 1); half(spine.slice().reverse(), 1);
    const c = Math.cos(ang), s = Math.sin(ang);
    return pts.map((p) => [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c]);
  }

  // organic many-pointed "star that isn't a star": soft petals around a center
  function petalStarPts(cx, cy, rad, arms, r, rot) {
    const N = arms * 14;
    const inner = 0.34 + r() * 0.22;
    const jitter = 0.10;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU;
      const lobe = Math.pow(Math.abs(Math.cos(arms * (a) / 2)), 1.6);
      let rr = rad * (inner + (1 - inner) * lobe);
      rr *= 1 + (Math.sin(a * 3 + rot) * jitter);
      pts.push([cx + Math.cos(a + rot) * rr, cy + Math.sin(a + rot) * rr]);
    }
    return pts;
  }

  // crescent / arc-blade: outer blob minus inner offset blob → boomerang
  function crescentPts(cx, cy, rad, r, ang) {
    const N = 70;
    const thick = 0.30 + r() * 0.30;
    const span = Math.PI * (0.7 + r() * 0.7);
    const start = -span / 2;
    const pts = [];
    // outer arc
    for (let i = 0; i <= N; i++) {
      const a = start + span * (i / N);
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    }
    // inner arc (back), tighter radius, pulled in
    for (let i = N; i >= 0; i--) {
      const a = start + span * (i / N);
      const rr = rad * (1 - thick) * (1 + 0.12 * Math.sin(a * 2));
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    const c = Math.cos(ang), s = Math.sin(ang);
    return pts.map((p) => [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c]);
  }

  // wavy ribbon band: a horizontal-ish strip with two undulating edges
  function ribbonPts(x0, y0, x1, y1, wid, r, waves) {
    const N = 48;
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const w1 = r() * TAU, w2 = r() * TAU;
    const aw = waves || (1.5 + r() * 2.5);
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const bx = x0 + dx * t, by = y0 + dy * t;
      const wob = wid * (0.5 + 0.18 * Math.sin(aw * t * Math.PI * 2 + w1));
      const wob2 = wid * (0.5 + 0.18 * Math.sin(aw * t * Math.PI * 2 + w2 + 1.7));
      top.push([bx + nx * wob, by + ny * wob]);
      bot.push([bx - nx * wob2, by - ny * wob2]);
    }
    return top.concat(bot.reverse());
  }

  /* ── SCISSOR-EDGE PATH: smooth Catmull-Rom through points with tiny per-vertex
     hand-wobble so cuts read like real paper, not bezier-clean vector. ── */
  function cutPath(x, pts, noise, wobble, seedoff) {
    const P = pts.map((p, i) => {
      // hand-wobble along outward normal-ish: use noise for organic, coherent jitter
      const n = noise.noise2(p[0] * 0.03 + seedoff, p[1] * 0.03 - seedoff);
      const n2 = noise.noise2(p[0] * 0.09 - seedoff, p[1] * 0.09 + seedoff);
      return [p[0] + (n * 0.7 + n2 * 0.3) * wobble, p[1] + (n2 * 0.7 - n * 0.3) * wobble];
    });
    const n = P.length;
    x.beginPath();
    x.moveTo(P[0][0], P[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      x.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
    }
    x.closePath();
  }

  // bbox + centroid for shadow/texture placement
  function bbox(pts) {
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9, sx = 0, sy = 0;
    for (const p of pts) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; sx += p[0]; sy += p[1]; }
    return { minx, miny, maxx, maxy, w: maxx - minx, h: maxy - miny, cx: sx / pts.length, cy: sy / pts.length };
  }

  /* paint one cut-paper shape: soft drop shadow (paper lift) + flat ink fill +
     printed-ink mottle + a faint inner tooth. col is a hex ink. */
  function paintShape(x, pts, col, pal, noise, r, scale, lift) {
    const b = bbox(pts);
    const wob = Math.max(0.9, scale * 0.020); // hand-cut edge irregularity
    const so = r() * 40;

    // paper-lift drop shadow: offset, soft, low alpha (multiply)
    const off = lift == null ? scale * (0.010 + r() * 0.010) : lift;
    x.save();
    x.globalCompositeOperation = 'multiply';
    x.translate(off * 0.7, off);
    cutPath(x, pts, noise, wob, so);
    x.fillStyle = K.rgba(pal.dark, 0.18);
    x.shadowColor = K.rgba(pal.dark, 0.22);
    x.shadowBlur = Math.max(4, scale * 0.018);
    x.shadowOffsetX = off * 0.4; x.shadowOffsetY = off * 0.5;
    x.fill();
    x.restore();

    // flat ink body
    cutPath(x, pts, noise, wob, so);
    x.fillStyle = col;
    x.fill();

    // printed-ink mottle within the shape (clipped): uneven pigment density
    x.save();
    cutPath(x, pts, noise, wob, so);
    x.clip();
    // printed-ink texture: denser screenprint mottle + fine fbm pigment grain
    K.mottle(x, b.minx, b.miny, b.w, b.h, col, 16, r, 'multiply');
    K.mottle(x, b.minx, b.miny, b.w, b.h, col, 22, r, 'soft-light');
    // fbm ink-coverage breakup (riso grain — subtle darker speckle clusters)
    x.globalCompositeOperation = 'multiply';
    const gstep = Math.max(3, b.w / 90);
    for (let yy = b.miny; yy < b.maxy; yy += gstep) {
      for (let xx = b.minx; xx < b.maxx; xx += gstep) {
        const nv = (noise.fbm(xx * 0.02 + so, yy * 0.02 - so, 4, 0.5, 2.1) + 1) / 2;
        if (nv > 0.62) { x.fillStyle = K.rgba(K.mix(col, pal.dark, 0.4), (nv - 0.62) * 0.22); x.fillRect(xx, yy, gstep + 1, gstep + 1); }
      }
    }
    x.globalCompositeOperation = 'source-over';
    // a soft uneven ink-coverage gradient (one edge slightly heavier — squeegee feel)
    const ga = r() * TAU;
    const gx = b.cx + Math.cos(ga) * b.w * 0.5, gy = b.cy + Math.sin(ga) * b.h * 0.5;
    const g = x.createLinearGradient(gx, gy, b.cx - Math.cos(ga) * b.w * 0.5, b.cy - Math.sin(ga) * b.h * 0.5);
    g.addColorStop(0, K.rgba(K.mix(col, pal.dark, 0.5), 0.08));
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, K.rgba(K.mix(col, '#ffffff', 0.6), 0.06));
    x.globalCompositeOperation = 'soft-light';
    x.fillStyle = g; x.fillRect(b.minx, b.miny, b.w, b.h);
    x.restore();
  }

  // choose N distinct inks from the palette (weighted toward first inks)
  function chooseInks(pal, n, r) {
    const pool = pal.inks.slice();
    const out = [];
    for (let i = 0; i < n && pool.length; i++) {
      const idx = Math.min(pool.length - 1, (r() * r() * pool.length) | 0); // bias early
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  }

  /* ── DRAW ───────────────────────────────────────────────────────────────── */
  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    // ── CONTINUOUS FORMAT: jitter the base aspect each side so dimensions never
    // repeat across same-trait seeds (the discrete fmt only sets the trait label).
    const W = Math.round(fmt[0] * (0.9 + r() * 0.2));
    const H = Math.round(fmt[1] * (0.9 + r() * 0.2));
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);
    const inksRaw = chooseInks(pal, 3 + (r() < 0.45 ? 1 : 0), r);

    // ── CONTINUOUS COLOUR: jitter every chosen ink within the palette world, so
    // two same-palette pieces carry visibly different (but on-world) ink values.
    const inks = inksRaw.map((c) => jitterInk(c, r, 1));

    // ── GLOBAL COMPOSITION VARIATION: a seed-driven affine applied to the WHOLE
    // piece — zoom/crop, off-centre focal, and a slight whole-canvas tilt — so
    // even identical mode+palette seeds frame and sit completely differently.
    const zoom = 0.84 + r() * 0.54;            // 0.84 (wide, airy) … 1.38 (tight crop)
    const tilt = (r() - 0.5) * 0.5;            // whole-composition lean, ±0.25 rad
    const panX = (r() - 0.5) * 0.22 * W;       // focal pan — composition off-centre
    const panY = (r() - 0.5) * 0.22 * H;
    const density = 0.62 + r() * 0.78;         // global element-count multiplier
    const sizeMul = 0.78 + r() * 0.6;          // global scale of every shape
    function dcount(base) { return Math.max(2, Math.round(base * density)); }
    // begin the transformed world (ground is drawn first, untransformed, below)

    // ink picker that avoids repeating the previous ink AND favours a value jump,
    // so overlapping/adjacent shapes contrast instead of muddying together.
    let lastInk = null;
    function nextInk() {
      const cands = inks.filter((c) => c !== lastInk);
      const pool = cands.length ? cands : inks;
      let best = pool[(r() * pool.length) | 0];
      if (lastInk && r() < 0.65) {
        // pick the candidate with the largest luminance distance from lastInk
        const lv = K.lum(lastInk);
        let bd = -1;
        for (const c of pool) { const d = Math.abs(K.lum(c) - lv); if (d > bd) { bd = d; best = c; } }
      }
      lastInk = best; return best;
    }

    // ── GROUND: warm cream paper with faint vertical tone & paper tooth ──
    x.fillStyle = pal.cream; x.fillRect(0, 0, W, H);
    const bg = x.createLinearGradient(0, 0, W * 0.3, H);
    bg.addColorStop(0, K.rgba(pal.paper, 0.0));
    bg.addColorStop(1, K.rgba(K.mix(pal.paper, pal.dark, 0.06), 0.5));
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // paper fibre tooth (very subtle mottle over whole sheet)
    K.mottle(x, 0, 0, W, H, pal.paper, 90, r, 'multiply');

    // ── enter the transformed composition world: zoom/crop + pan + whole-tilt ──
    x.save();
    x.translate(W / 2 + panX, H / 2 + panY);
    x.rotate(tilt);
    x.scale(zoom, zoom);
    x.translate(-W / 2, -H / 2);

    const m = S * (0.085 + r() * 0.04); // designed margin

    // helper to drop one shape of a chosen kind at a spot/scale/ink
    function placeKind(kind, cx, cy, sc0, ink, ang) {
      const sc = sc0 * sizeMul;
      let pts;
      if (kind === 'blob') pts = blobPts(cx, cy, sc, r, 0.7 + r() * 0.5, ang == null ? r() * TAU : ang);
      else if (kind === 'blade') pts = bladePts(cx, cy, sc * 2.4, sc * 0.5, ang == null ? r() * TAU : ang, (r() - 0.5) * 1.4, r);
      else if (kind === 'star') pts = petalStarPts(cx, cy, sc, 4 + (r() * 5 | 0), r, ang == null ? r() * TAU : ang);
      else if (kind === 'crescent') pts = crescentPts(cx, cy, sc * 1.3, r, ang == null ? r() * TAU : ang);
      else pts = blobPts(cx, cy, sc, r, 0.8, ang == null ? r() * TAU : ang);
      paintShape(x, pts, ink, pal, noise, r, sc);
      return pts;
    }

    // value anchor: occasionally a large dark form grounds the composition
    function maybeAnchor(cx, cy, sc) {
      if (r() < 0.55) placeKind(r() < 0.5 ? 'blob' : 'blade', cx, cy, sc, pal.dark, r() * TAU);
    }

    // ── COMPOSE PER MODE ──
    if (mode === 'Drift') {
      // shapes drifting along a diagonal flow that traverses the WHOLE frame
      // corner-to-corner, so mass is spread and negative space is composed, not
      // dumped to one side.
      const dir = r() < 0.5 ? 1 : -1; // diagonal up or down
      maybeAnchor(W * (0.30 + r() * 0.40), H * (0.30 + r() * 0.40), S * (0.13 + r() * 0.10));
      const n = dcount(7 + (r() * 6 | 0));
      const baseAng = dir * (0.25 + r() * 0.85);
      // continuous flow geometry: the diagonal start/end span the frame at a
      // seed-chosen slant, with seed-chosen swing amplitude & wave count.
      const slant = (r() - 0.5) * 0.7;            // how steep/shallow the diagonal
      const swing = 0.06 + r() * 0.22;            // lateral undulation amplitude
      const wcount = 1.4 + r() * 2.4;             // waves along the run
      const wph = r() * TAU;
      const xLo = 0.06 + r() * 0.14, xHi = 0.94 - r() * 0.14;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n; // even march across the long axis, full span
        const fx = m + (W - 2 * m) * K.clamp(xLo + (xHi - xLo) * (t + noise.noise2(t * 3, 1.7) * 0.12), 0.02, 0.98);
        // travel along the diagonal + seed-driven swing + organic waver
        const yLine = dir > 0 ? t : 1 - t;
        const fy = m + (H - 2 * m) * K.clamp(0.15 + (0.7 - slant) * yLine + slant + Math.sin(t * Math.PI * wcount + wph) * swing + noise.noise2(t * 4, 5.1) * 0.12, 0.04, 0.96);
        const sc = S * (0.045 + r() * 0.13);
        const kinds = ['blob', 'blade', 'crescent', 'star', 'blade'];
        placeKind(K.pick(kinds, r), fx, fy, sc, nextInk(), baseAng + (r() - 0.5) * 1.6);
      }
    } else if (mode === 'Arabesque') {
      // shapes threaded along a flowing S-curve spine — rhythmic, dance-like.
      // Spine AXIS, centre, amplitude, frequency & phase all vary continuously,
      // so the thread runs at a seed-chosen angle/curl, never one fixed S.
      const axis = (r() - 0.5) * 1.2;             // overall lean of the whole spine
      const ca = Math.cos(axis), sa = Math.sin(axis);
      const cxs = W * (0.5 + (r() - 0.5) * 0.26), cys = H * (0.5 + (r() - 0.5) * 0.20);
      const amp = (W - 2 * m) * (0.20 + r() * 0.26);
      const reachT = (Math.min(W, H) - 2 * m) * (0.42 + r() * 0.12); // half-length along axis
      const phase = r() * TAU, freq = 1.0 + r() * 1.8;
      const n = dcount(9 + (r() * 6 | 0));
      // map a normalised position along the spine to a frame point
      function spineAt(t, lateral) {
        const along = (t - 0.5) * 2 * reachT;     // -reach … +reach along axis
        const off = Math.sin(t * Math.PI * freq + phase) * amp + lateral;
        return [cxs + along * sa + off * ca, cys - along * ca + off * sa];
      }
      // a ribbon following the spine first (under)
      if (r() < 0.7) {
        const a = spineAt(0.04, 0), b = spineAt(0.96, 0);
        const rb = ribbonPts(a[0], a[1], b[0], b[1], S * (0.04 + r() * 0.03), r, freq);
        paintShape(x, rb, nextInk(), pal, noise, r, S * 0.1);
      }
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const p = spineAt(t, (r() - 0.5) * amp * 0.3);
        const sc = S * (0.04 + (0.5 + 0.5 * Math.sin(t * Math.PI)) * (0.06 + r() * 0.07));
        const kinds = ['blob', 'star', 'blade', 'crescent'];
        placeKind(K.pick(kinds, r), p[0], p[1], sc, nextInk(), axis + Math.cos(t * Math.PI * freq) * 1.6);
      }
    } else if (mode === 'Bouquet') {
      // full radial burst around a roughly-centered node — petals/blades spread
      // 360° on an even spiral so mass is balanced, not corner-clumped.
      const ox = W * (0.5 + (r() - 0.5) * 0.34), oy = H * (0.5 + (r() - 0.5) * 0.32);
      maybeAnchor(ox, oy, S * (0.11 + r() * 0.08));
      const n = dcount(9 + (r() * 5 | 0));
      const a0 = r() * TAU;
      // spiral step varies around golden so the angular pattern itself shifts;
      // ellipticity squashes the burst along a seed-chosen axis.
      const step = Math.PI * (3 - Math.sqrt(5)) * (0.8 + r() * 0.5);
      const ell = 0.62 + r() * 0.5, eAx = r() * TAU;
      const growth = 0.30 + r() * 0.45;          // how fast outliers push out
      const reach = S * (0.14 + r() * 0.18);
      const placed = [];
      for (let i = 0; i < n; i++) {
        const a = a0 + i * step + (r() - 0.5) * 0.4;
        // spiral radius grows then varies — keeps a dense heart but pushes outliers out
        const dist = reach * (0.35 + (1 - growth) + growth * Math.pow(i / n, 0.5 + r() * 0.4)) * (0.8 + r() * 0.4);
        const ex = Math.cos(a) * dist, ey = Math.sin(a) * dist * ell;
        const cE = Math.cos(eAx), sE = Math.sin(eAx);
        let nx = ox + ex * cE - ey * sE, ny = oy + ex * sE + ey * cE;
        const sc = S * (0.045 + (1 - i / n) * (0.05 + r() * 0.04) + r() * 0.04); // bigger near center
        for (const p of placed) { const d = Math.hypot(nx - p[0], ny - p[1]); if (d < sc * 0.75) { nx += Math.cos(a) * sc * 0.8; ny += Math.sin(a) * sc * 0.8; } }
        nx = K.clamp(nx, m, W - m); ny = K.clamp(ny, m, H - m);
        const kinds = ['blade', 'blade', 'star', 'blob', 'crescent'];
        placeKind(K.pick(kinds, r), nx, ny, sc, nextInk(), a + Math.PI / 2);
        placed.push([nx, ny]);
      }
    } else if (mode === 'Tideline') {
      // stacked wavy ribbon bands across the sheet + punctuating shapes — horizontal calm
      const bands = dcount(3 + (r() * 3 | 0));
      const cols = K.shuffle(inks.concat([pal.dark]), r);
      const tideTilt = (r() - 0.5) * S * 0.34;    // bands run at a seed-chosen slant
      const spread = 0.55 + r() * 0.4;            // how much of the sheet the bands fill
      const y0 = (1 - spread) * 0.5;
      for (let b = 0; b < bands; b++) {
        const t = y0 + spread * (b + 0.5) / bands;
        const yy = m + (H - 2 * m) * t;
        const wid = S * (0.035 + r() * 0.065);
        const rb = ribbonPts(-S * 0.05, yy - tideTilt * 0.5 + (r() - 0.5) * S * 0.06, W + S * 0.05, yy + tideTilt * 0.5 + (r() - 0.5) * S * 0.06, wid, r, 1 + r() * 2.4);
        paintShape(x, rb, cols[b % cols.length], pal, noise, r, S * 0.1);
      }
      // floating cut shapes resting between tides
      const n = dcount(4 + (r() * 4 | 0));
      for (let i = 0; i < n; i++) {
        const sc = S * (0.04 + r() * 0.08);
        const kinds = ['blob', 'star', 'crescent', 'blade'];
        placeKind(K.pick(kinds, r), m + r() * (W - 2 * m), m + r() * (H - 2 * m), sc, nextInk());
      }
    } else if (mode === 'Constellation') {
      // sparse, deliberate placement — strong negative space, clear focal +
      // satellites spaced apart; one accented satellite carries a second colour
      const focal = { x: W * (0.30 + r() * 0.40), y: H * (0.30 + r() * 0.40) };
      placeKind(K.pick(['blob', 'star', 'crescent'], r), focal.x, focal.y, S * (0.13 + r() * 0.09), inks[0], r() * TAU);
      lastInk = inks[0];
      const n = dcount(5 + (r() * 3 | 0));
      const a0 = r() * TAU;
      const ringEll = 0.6 + r() * 0.6, ringAx = r() * TAU; // satellites on an elliptical ring
      const distBase = 0.20 + r() * 0.14, distVar = 0.10 + r() * 0.16;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * TAU + (r() - 0.5) * 0.6;
        const dist = S * (distBase + r() * distVar);
        const ex = Math.cos(a) * dist, ey = Math.sin(a) * dist * ringEll;
        const cE = Math.cos(ringAx), sE = Math.sin(ringAx);
        const fx = K.clamp(focal.x + ex * cE - ey * sE, m, W - m);
        const fy = K.clamp(focal.y + ex * sE + ey * cE, m, H - m);
        const sc = S * (0.035 + r() * 0.085);
        placeKind(K.pick(['blob', 'blade', 'star', 'crescent'], r), fx, fy, sc, nextInk(), r() * TAU);
      }
    } else { // Colonnade — a rhythm of tall slender shapes at varied tilts/heights,
      // multi-coloured, with off-axis cross-accents so it reads as composed rhythm,
      // NOT trees on a ground line.
      const cols = dcount(3 + (r() * 3 | 0));
      const gap = (W - 2 * m) / cols;
      const jit = 0.15 + r() * 0.45;              // how irregular the column spacing is
      // scattered short cross-bars at DIFFERENT heights (no single baseline)
      const bars = dcount(1 + (r() * 2 | 0));
      for (let b = 0; b < bars; b++) {
        const ly = H * (0.18 + r() * 0.66);
        const x0 = m + r() * (W - 2 * m) * 0.4, x1 = x0 + (W - 2 * m) * (0.35 + r() * 0.55);
        const rb = ribbonPts(x0, ly, x1, ly + (r() - 0.5) * S * 0.14, S * (0.022 + r() * 0.02), r, 1 + r());
        paintShape(x, rb, nextInk(), pal, noise, r, S * 0.07);
      }
      for (let c = 0; c < cols; c++) {
        const cx = m + gap * (c + 0.5) + (r() - 0.5) * gap * jit;
        const h = (H - 2 * m) * (0.34 + r() * 0.56);
        const cy = m + (r() * 0.45 + 0.12) * (H - 2 * m) + h * 0.4; // varied vertical seat
        const tilt = Math.PI / 2 + (r() - 0.5) * 1.0; // some lean noticeably
        if (r() < 0.55) placeKind('blade', cx, cy, h * 0.42, nextInk(), tilt);
        else { const pts = blobPts(cx, cy, h * 0.26, r, 1.9 + r() * 0.9, (r() - 0.5) * 0.5, 2); paintShape(x, pts, nextInk(), pal, noise, r, h * 0.26); }
        // a cap shape on top or bottom
        if (r() < 0.8) {
          const capY = cy - h * 0.42 * (r() < 0.5 ? 1 : -1);
          placeKind(K.pick(['blob', 'star', 'crescent'], r), cx, capY, S * (0.04 + r() * 0.05), nextInk());
        }
      }
    }

    x.restore(); // leave the transformed composition world

    // ── ATMOSPHERE & FINISHING GRADE ──
    // faint warm haze sheet for screenprint air/depth. On dark/saturated grounds
    // a soft-light white wash flattens the ground — instead lift with a light tone
    // and pull the second drift toward the lights, not the dark, so it stays vivid.
    const hazeCol = pal.darkGround ? K.mix(pal.cream, pal.inks[0], 0.45) : K.mix(pal.cream, '#ffffff', 0.5);
    K.hazeSheet(x, W, H, noise, hazeCol, pal.darkGround ? 0.10 : 0.13, S * 0.75, 'soft-light');
    // a second atmosphere drift — on dark grounds drift toward a light ink (screen)
    // so it reads as air/lift, not a dulling smear.
    if (pal.darkGround) {
      K.hazeSheet(x, W, H, noise, K.mix(pal.cream, pal.inks[0], 0.3), 0.05, S * 1.3, 'screen');
    } else {
      K.hazeSheet(x, W, H, noise, K.mix(pal.cream, pal.dark, 0.2), 0.06, S * 1.3, 'multiply');
    }
    // overall paper grain (tooth)
    K.grain(x, W, H, 4.2, r);
    // vignette grade — gentle, warmer corners; deeper on dark grounds for drama
    K.vignette(x, W, H, pal.darkGround ? 0.40 : 0.26);

    return { aspect: W / H };
  }

  /* ── TRAITS — pure, mirrors draw()'s rng consumption order exactly up to the
     point where layout-only randomness begins. ── */
  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : weightedPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    const inks = chooseInks(pal, 3 + (r() < 0.45 ? 1 : 0), r);
    const palette = mode === 'Constellation' ? 'Sparse' : inks.length >= 4 ? 'Quartet' : 'Trio';
    return { Palette: pal.name, Mode: mode, Format: f, Inks: palette };
  }

  return { name: 'b_jazz', draw, traits };
})();
