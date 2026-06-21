/* GLASS3 — CUT luminous glass: hard-edged faceted shards + real cast caustics
 *
 * glass2 read as frosted pebbles / a biology slide: every form was a SOFT radial
 * blob warped by fbm into a mushy fingerprint interior with rounded edges. That
 * is the opposite of cut glass. glass3 throws out the soft scalar-field form and
 * builds REAL geometry:
 *
 *   • SHARDS = angular convex polygons (sharp straight edges, beveled corners).
 *   • Each shard is split into FLAT internal FACETS (a fan triangulation), every
 *     facet filled with a DIFFERENT palette hue -> prismatic glass, not mono.
 *   • Each facet catches a flat specular gradient (a hot-line of light) for the
 *     planar "cut" read. Bright crisp edge highlights trace silhouette + seams.
 *   • REAL CAUSTICS: sharp rippling refracted light-bands cast onto the GROUND
 *     beside/beneath each shard, with chromatic (R/G/B) split.
 *
 * Composition is the primary trait, pushed harder than glass2:
 *   Hero (one big shard bleeding off-edge), Sparse (2-3 tiny shards in a corner +
 *   vast empty field), Shoal (edge-anchored dense run), Pair, Scatter, Cascade.
 *   Heroes anchor on thirds intersections, never dead centre.
 *
 * Palette pulls the full candy/vaporwave range. Ground dominates 40-55% as bright
 * atmosphere, never a void. Deterministic. window.FORCE_PAL respected. <=1280px.
 * Fast: vector path fills + bounded coarse caustic projection + one chromaSplit.
 *
 * Contract: window.ENGINE = { name:'glass3', draw(cv,seed), traits(seed) }.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // PALETTES — SOFT PASTEL PRISM. The distinct LIGHT/holographic-pastel world
  // (vs the siblings' warm-metal / deep-jewel / electric-neon). The GROUND/field
  // are milky candy pastels (peach, mint, lilac, aqua, butter, blush,
  // periwinkle, seafoam) — light, dreamy, luminous, never washed/muddy. The
  // glass facets still split into a full BRIGHT prismatic rainbow via spectrum[]
  // (the per-facet refracted hues), so the crystal pops vivid against the soft
  // pastel atmosphere. glint = near-white milk so highlights stay creamy.
  const PALS = [
    // Peach ground, full rainbow refraction.
    { name: 'Peach Prism',     ground: '#ffd6c0', field: '#ffe9dc', glint: '#fffaf4',
      spectrum: ['#ff4d6d', '#ff9e3d', '#ffe14d', '#3ddc84', '#3db8ff', '#9d6bff'] },
    // Mint ground, cool-to-warm rainbow.
    { name: 'Mint Crystal',    ground: '#c7f9dc', field: '#e3fcef', glint: '#f6fffb',
      spectrum: ['#1fd6a6', '#3dd6ff', '#6b7bff', '#c46bff', '#ff5ec7', '#ffd24d'] },
    // Lilac ground, violet-anchored spectrum.
    { name: 'Lilac Refraction',ground: '#e0c3fc', field: '#f0e6ff', glint: '#fcf8ff',
      spectrum: ['#9d4dff', '#5e7bff', '#3dd0ff', '#3ddc84', '#ffd24d', '#ff5e9e'] },
    // Aqua ground, sky-bright rainbow.
    { name: 'Aqua Facet',      ground: '#b3ecff', field: '#dcf6ff', glint: '#f4fdff',
      spectrum: ['#00b8ff', '#37e6c2', '#7aff5e', '#ffe14d', '#ff8a3d', '#ff4d9e'] },
    // Butter ground, sun-warm spectrum.
    { name: 'Butter Spectrum', ground: '#fff3b0', field: '#fffadd', glint: '#fffdf2',
      spectrum: ['#ffcf33', '#ff8a3d', '#ff4d6d', '#c46bff', '#3d9bff', '#2fd6a0'] },
    // Blush ground, rose-to-cyan rainbow.
    { name: 'Blush Quartz',    ground: '#ffd1e8', field: '#ffe6f3', glint: '#fff7fb',
      spectrum: ['#ff4d8d', '#ff7ad9', '#b86bff', '#5e8cff', '#3dd6c2', '#ffd24d'] },
    // Periwinkle ground, indigo-led spectrum.
    { name: 'Periwinkle Prism',ground: '#c3cbff', field: '#e2e6ff', glint: '#f6f7ff',
      spectrum: ['#5e6bff', '#3db8ff', '#37e6a8', '#caff4d', '#ffb13d', '#ff5e9e'] },
    // Seafoam ground, green-cool rainbow.
    { name: 'Seafoam Halo',    ground: '#b9fbc0', field: '#ddfde2', glint: '#f4fff6',
      spectrum: ['#16d99a', '#2fd6ff', '#6b8cff', '#c46bff', '#ff6ad0', '#ffd24d'] },
    // Peach+lilac sorbet ground, holographic split.
    { name: 'Sorbet Holo',     ground: '#ffd9d0', field: '#f2e2ff', glint: '#fff9f6',
      spectrum: ['#ff5e8a', '#ff9e6b', '#ffe066', '#5ed6a8', '#5ec2ff', '#a87aff'] },
    // Aqua+mint opal ground, full prismatic fan.
    { name: 'Opal Drift',      ground: '#c0f3ee', field: '#e6fbf3', glint: '#f6fffc',
      spectrum: ['#2fd6c2', '#3da8ff', '#8a6bff', '#ff6ad0', '#ffae3d', '#cfff4d'] },
  ];

  // varied aspect — portrait / landscape / square (square the minority). <=1280.
  const FMTS = [
    { W: 1024, H: 1280, t: 'Portrait' },   // 4:5
    { W: 1024, H: 1536, t: 'Tall' },       // 2:3
    { W: 1280, H: 853,  t: 'Vista' },      // 3:2
    { W: 1280, H: 720,  t: 'Wide' },       // 16:9
    { W: 1180, H: 1180, t: 'Square' },     // 1:1 (minority)
  ];
  function pickFmt(r) { const x = r(); return x < 0.26 ? FMTS[0] : x < 0.48 ? FMTS[1] : x < 0.70 ? FMTS[2] : x < 0.88 ? FMTS[3] : FMTS[4]; }

  const CUT   = ['Beveled', 'Splintered', 'Prismatic'];     // facet character
  const CAUST = ['Ripple', 'Fan', 'Lattice'];               // cast caustic geometry
  const EVENTS = ['None','None','None','None','None','None','Caustic Supernova','Prism Split'];

  // PRIMARY STRUCTURAL AXIS — forced divergence in scale/count/placement.
  const LAYOUTS = ['Hero', 'Sparse', 'Shoal', 'Pair', 'Scatter', 'Cascade'];

  const PHI = 0.382, IPHI = 0.618;
  function third(r) { return r() < 0.5 ? PHI : IPHI; }

  // build ONE convex angular shard polygon (sharp straight edges).
  function shardPoly(r, cx, cy, rad, squash, rot, sides, jag) {
    const verts = [];
    const angs = [];
    let a = 0;
    for (let i = 0; i < sides; i++) { angs.push(a); a += (0.55 + r() * 0.95); }
    const tot = a;
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < sides; i++) {
      const ang = (angs[i] / tot) * Math.PI * 2;
      const rr = rad * (1 - jag + r() * jag * 2);
      const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr * squash;
      const rx = px * c - py * s, ry = px * s + py * c;
      verts.push([cx + rx, cy + ry]);
    }
    return verts;
  }

  function centroid(poly) {
    let x = 0, y = 0; for (const p of poly) { x += p[0]; y += p[1]; }
    return [x / poly.length, y / poly.length];
  }

  // LAYOUT BUILDERS — return list of shard specs (px space) + a focal point.
  function buildLayout(layout, r, W, H, cut) {
    const M = Math.min(W, H);
    const shards = [];
    const sidesFor = () => cut === 'Splintered' ? K.rint(r, 3, 4) : cut === 'Prismatic' ? K.rint(r, 5, 7) : K.rint(r, 4, 6);
    const jagFor = () => cut === 'Splintered' ? 0.30 + r() * 0.22 : 0.10 + r() * 0.16;
    const mk = (cx, cy, rad, depth) => ({
      cx, cy, rad, squash: 0.6 + r() * 0.7, rot: r() * Math.PI * 2,
      sides: sidesFor(), jag: jagFor(), hueShift: r(), depth,
    });
    let focal = { x: W * 0.5, y: H * 0.5 };

    if (layout === 'Hero') {
      const tx = third(r), ty = third(r);
      const ex = tx < 0.5 ? -0.12 : 1.12, ey = ty < 0.5 ? -0.1 : 1.1;
      const blend = 0.35 + r() * 0.25;
      const cx = (tx * (1 - blend) + ex * blend) * W;
      const cy = (ty * (1 - blend) + ey * blend) * H;
      const rad = M * (0.62 + r() * 0.3);
      shards.push(mk(cx, cy, rad, 1.0));
      focal = { x: K.clamp(cx, W * 0.15, W * 0.85), y: K.clamp(cy, H * 0.15, H * 0.85) };
      if (r() < 0.85) {
        const ox = (1 - tx + (r() - 0.5) * 0.18) * W;
        const oy = (1 - ty + (r() - 0.5) * 0.18) * H;
        shards.push(mk(ox, oy, M * (0.05 + r() * 0.05), 0.5));
      }
      if (r() < 0.5) shards.push(mk(cx + (r() - 0.5) * rad * 0.6, cy + (r() - 0.5) * rad * 0.6, M * (0.1 + r() * 0.08), 0.7));
    }

    else if (layout === 'Sparse') {
      const corner = K.rint(r, 0, 3);
      const ax = (corner & 1) ? 0.78 + r() * 0.08 : 0.22 - r() * 0.08;
      const ay = (corner & 2) ? 0.78 + r() * 0.08 : 0.22 - r() * 0.08;
      const n = K.rint(r, 2, 3);
      let big = 0;
      for (let i = 0; i < n; i++) {
        const px = (ax + (r() - 0.5) * 0.16) * W;
        const py = (ay + (r() - 0.5) * 0.16) * H;
        const rad = M * (0.07 + Math.pow(r(), 1.4) * 0.12);
        shards.push(mk(px, py, rad, 0.7 + r() * 0.3));
        if (rad > big) { big = rad; focal = { x: px, y: py }; }
      }
    }

    else if (layout === 'Shoal') {
      const side = K.rint(r, 0, 3);
      const n = K.rint(r, 7, 12);
      let big = 0;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        let px, py;
        if (side === 0) { px = (0.04 + r() * 0.34) * W; py = (0.06 + t * 0.88) * H; }
        else if (side === 1) { px = (0.62 + r() * 0.34) * W; py = (0.06 + t * 0.88) * H; }
        else if (side === 2) { px = (0.06 + t * 0.88) * W; py = (0.04 + r() * 0.34) * H; }
        else { px = (0.06 + t * 0.88) * W; py = (0.62 + r() * 0.34) * H; }
        const rad = M * (0.06 + Math.pow(r(), 1.8) * 0.22);
        shards.push(mk(px, py, rad, 0.6 + r() * 0.4));
        if (rad > big) { big = rad; focal = { x: px, y: py }; }
      }
    }

    else if (layout === 'Pair') {
      const onLeft = r() < 0.5;
      const ax = (onLeft ? 0.30 : 0.70) + (r() - 0.5) * 0.06;
      const ay = third(r);
      const bx = (onLeft ? 0.72 : 0.28) + (r() - 0.5) * 0.06;
      const by = K.clamp(1 - ay + (r() - 0.5) * 0.3, 0.2, 0.8);
      const bigR = M * (0.3 + r() * 0.16);
      shards.push(mk(ax * W, ay * H, bigR, 1.0));
      shards.push(mk(bx * W, by * H, M * (0.1 + r() * 0.08), 0.7));
      if (r() < 0.4) shards.push(mk(ax * W + (r() - 0.5) * bigR, ay * H + (r() - 0.5) * bigR, M * 0.07, 0.55));
      focal = { x: ax * W, y: ay * H };
    }

    else if (layout === 'Scatter') {
      const pts = [];
      for (const px of [PHI, IPHI, 0.5]) for (const py of [PHI, IPHI, 0.5]) pts.push([px, py]);
      for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
      const n = K.rint(r, 5, 8);
      let big = 0;
      for (let i = 0; i < n; i++) {
        const [ax, ay] = pts[i % pts.length];
        const px = K.clamp(ax + (r() - 0.5) * 0.14, 0.08, 0.92) * W;
        const py = K.clamp(ay + (r() - 0.5) * 0.14, 0.08, 0.92) * H;
        const rad = M * (0.06 + Math.pow(r(), 1.5) * 0.16);
        shards.push(mk(px, py, rad, 0.55 + r() * 0.45));
        if (rad > big) { big = rad; focal = { x: px, y: py }; }
      }
    }

    else { // Cascade
      const dir = r() < 0.5 ? 1 : -1;
      const n = K.rint(r, 5, 8);
      const bend = (r() - 0.5) * 0.4;
      let big = 0;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const px = (-0.06 + t * 1.12) * W;
        let pyN = dir > 0 ? 0.04 + t * 0.92 : 0.96 - t * 0.92;
        pyN += Math.sin(t * Math.PI) * bend;
        const py = pyN * H;
        const rad = M * (0.07 + (0.4 + 0.6 * Math.sin(t * Math.PI + r())) * 0.16);
        shards.push(mk(px, py, rad, 0.5 + 0.5 * Math.sin(t * Math.PI)));
        if (rad > big && t > 0.15 && t < 0.85) { big = rad; focal = { x: K.clamp(px, W * 0.1, W * 0.9), y: K.clamp(py, H * 0.1, H * 0.9) }; }
      }
    }

    return { shards, focal };
  }

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = pickFmt(r);
    const layout = K.pick(LAYOUTS, r);
    const cut = K.pick(CUT, r);
    const caust = K.pick(CAUST, r);
    const event = K.pick(EVENTS, r);
    const lightAng = r() * Math.PI * 2;
    return { pal, fmt, layout, cut, caust, event, lightAng };
  }

  function countBand(n) { return n <= 1 ? 'Single' : n === 2 ? 'Pair' : n <= 5 ? 'Few' : n <= 9 ? 'Many' : 'Swarm'; }

  function traits(seed) {
    const r = K.rng(seed);
    const p = params(r);
    const L = buildLayout(p.layout, r, p.fmt.W, p.fmt.H, p.cut);
    return {
      Palette: p.pal.name, Layout: p.layout, Format: p.fmt.t,
      Count: countBand(L.shards.length), Cut: p.cut, Caustic: p.caust, Event: p.event,
    };
  }

  // draw a single faceted shard (fan triangulation, per-facet hue + specular).
  function drawShard(x, poly, spec, P, lightAng, glintW) {
    const [cx, cy] = centroid(poly);
    const n = poly.length;
    const spectrum = P.spectrum;
    const baseIdx = Math.floor(spec.hueShift * spectrum.length);
    const lx = Math.cos(lightAng), ly = Math.sin(lightAng);

    // soft contact shadow under the shard (depth / AO)
    K.softShadow(x, cx + spec.rad * 0.12, cy + spec.rad * 0.16, spec.rad * 1.2, 0.22 * spec.depth);

    // bevel-split point: a hot inner vertex offset toward the light, so each
    // fan triangle splits into TWO flat sub-facets meeting on a sharp seam ->
    // more cut planes, no big mushy single facet on large shards.
    const bx = cx + lx * spec.rad * 0.16, by = cy + ly * spec.rad * 0.16;

    // 1. flat translucent facet planes (two sub-facets per edge)
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const hue = spectrum[(baseIdx + i) % spectrum.length];
      const hue2 = spectrum[(baseIdx + i + 3) % spectrum.length];
      const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
      const ml = Math.hypot(mx, my) || 1;
      const facing = (mx / ml) * lx + (my / ml) * ly;

      const tri = (P0, P1, P2, baseHue, lift) => {
        const litMix = K.clamp(0.5 + facing * 0.5, 0, 1);
        // translucent saturated body: lit faces glow, away faces go jewel-deep
        let col = K.mix(baseHue, P.glint, litMix * 0.28 + lift * 0.18);
        col = K.mix(col, K.mix(baseHue, '#1a0636', 0.62), (1 - litMix) * 0.5);
        x.save();
        x.beginPath();
        x.moveTo(P0[0], P0[1]); x.lineTo(P1[0], P1[1]); x.lineTo(P2[0], P2[1]); x.closePath();
        x.globalAlpha = 0.7;                      // see-through glass body
        x.fillStyle = col; x.fill();
        x.restore();
      };
      // inner sub-facet (centroid side) and outer sub-facet (edge side)
      tri([cx, cy], a, [bx, by], hue, 0.10);
      tri([bx, by], a, b, hue2, 0.0);

      // flat specular hot-line skating across the outer facet (cut-plane catch)
      if (facing > 0.05) {
        x.save();
        x.beginPath(); x.moveTo(bx, by); x.lineTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.closePath();
        const g = x.createLinearGradient(cx - mx, cy - my, cx + mx * 1.5, cy + my * 1.5);
        g.addColorStop(0, K.rgba(P.glint, 0));
        g.addColorStop(0.62, K.rgba(P.glint, 0));
        g.addColorStop(0.82, K.rgba(P.glint, 0.55 * facing));
        g.addColorStop(0.94, K.rgba('#ffffff', 0.95 * facing));
        g.addColorStop(1, K.rgba(P.glint, 0));
        x.globalCompositeOperation = 'lighter';
        x.fillStyle = g; x.fill();
        x.restore();
      }
    }

    // 2. crisp bright EDGE highlights — internal seams + bevel seam + silhouette
    x.save();
    x.globalCompositeOperation = 'lighter';
    // internal seams: centroid -> bevel point -> each vertex (the cut creases)
    x.lineWidth = Math.max(0.7, spec.rad * 0.007);
    x.strokeStyle = K.rgba(P.glint, 0.22);
    for (let i = 0; i < n; i++) {
      x.beginPath(); x.moveTo(bx, by); x.lineTo(poly[i][0], poly[i][1]); x.stroke();
    }
    x.lineWidth = Math.max(0.6, spec.rad * 0.005);
    x.strokeStyle = K.rgba(P.glint, 0.12);
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(bx, by); x.stroke();
    // silhouette — bright crisp bevel edge, white core
    x.lineJoin = 'miter';
    x.beginPath();
    x.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < n; i++) x.lineTo(poly[i][0], poly[i][1]);
    x.closePath();
    x.lineWidth = glintW * 3.0; x.strokeStyle = K.rgba(P.glint, 0.4); x.stroke();
    x.lineWidth = glintW * 1.4; x.strokeStyle = K.rgba('#ffffff', 0.9); x.stroke();
    x.restore();

    // 3. hot corner glint (brightest cut vertex toward the light)
    let bv = poly[0], best = -2;
    for (const v of poly) {
      const dx = v[0] - cx, dy = v[1] - cy, dl = Math.hypot(dx, dy) || 1;
      const d = (dx / dl) * lx + (dy / dl) * ly;
      if (d > best) { best = d; bv = v; }
    }
    K.sheen(x, bv[0], bv[1], spec.rad * 0.38, P.glint, 0.5);
  }

  // project SHARP caustic light-bands onto the ground near a shard, RGB split.
  // Each band is drawn as: a wide soft colored channel halo (R/G/B offset) PLUS
  // a tight bright white core -> reads as a real refracted light-streak with a
  // chromatic fringe, not a faint scribble.
  function castCaustics(x, noise, shard, P, caust, lightAng) {
    const cx = shard.cx, cy = shard.cy, rad = shard.rad;
    const gx = cx - Math.cos(lightAng) * rad * 1.0;
    const gy = cy - Math.sin(lightAng) * rad * 1.0 + rad * 0.4;
    const reach = rad * 2.4;
    const ang = lightAng + Math.PI;
    const c = Math.cos(ang), s = Math.sin(ang);
    const nbands = caust === 'Lattice' ? 9 : caust === 'Fan' ? 6 : 7;

    // path generator for band b along the cast cone (deterministic ripple)
    const stroke1 = (b, fam) => {
      const t = b / (nbands - 1) - 0.5;
      const jitter = noise.fbm(b * 0.7, shard.hueShift * 5, 3) * rad * 0.14;
      const perp = t * reach * 0.95 + jitter;
      const segs = 26;
      x.beginPath();
      for (let i = 0; i <= segs; i++) {
        const ft = i / segs;
        const along = (ft - 0.08) * reach * 1.35;
        const rip = Math.sin(ft * Math.PI * (caust === 'Lattice' ? 5 : 3) + b * 1.3) * rad * 0.06
                  + noise.fbm(ft * 4 + b, shard.hueShift * 3, 3) * rad * 0.08;
        const pp = perp + rip;
        const ax = fam ? (gx - s * along - c * pp) : (gx + c * along - s * pp);
        const ay = fam ? (gy + c * along - s * pp) : (gy + s * along + c * pp);
        i === 0 ? x.moveTo(ax, ay) : x.lineTo(ax, ay);
      }
      x.stroke();
    };

    x.save();
    x.globalCompositeOperation = 'lighter';
    // colored fringe halos (R/G/B), wide & soft, slightly offset for split
    const channels = [
      { col: '#ff3355', ox:  rad * 0.05, oy:  rad * 0.025 },
      { col: '#39ff9a', ox:  0,          oy:  0 },
      { col: '#4d7bff', ox: -rad * 0.05, oy: -rad * 0.025 },
    ];
    for (const ch of channels) {
      x.translate(ch.ox, ch.oy);
      x.lineCap = 'round';
      x.lineWidth = 4.2; x.strokeStyle = K.rgba(ch.col, 0.16);
      for (let b = 0; b < nbands; b++) stroke1(b, false);
      if (caust === 'Lattice') for (let b = 0; b < nbands; b++) stroke1(b, true);
      x.translate(-ch.ox, -ch.oy);
    }
    // tight bright WHITE/glint cores on top — the sharp streak read
    x.lineWidth = 1.4; x.strokeStyle = K.rgba(K.mix(P.glint, '#ffffff', 0.6), 0.5);
    for (let b = 0; b < nbands; b++) stroke1(b, false);
    if (caust === 'Lattice') { x.lineWidth = 1.1; for (let b = 0; b < nbands; b++) stroke1(b, true); }
    // focused hot-spot where the cone converges
    K.bloom(x, gx, gy, rad * 0.6, K.mix(P.glint, P.field, 0.25), 0.16);
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal;
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const L = buildLayout(p.layout, r, W, H, p.cut);
    const M = Math.min(W, H);
    const glintW = Math.max(1.1, M * 0.0022);

    // 1. LUMINOUS GROUND — bright atmosphere, back-lit behind the focal.
    const fx = L.focal.x, fy = L.focal.y;
    const gg = x.createRadialGradient(fx, fy, 0, fx, fy, Math.max(W, H) * 1.0);
    gg.addColorStop(0, K.mix(P.field, P.glint, 0.4));
    gg.addColorStop(0.4, P.field);
    gg.addColorStop(1, K.mix(P.ground, P.field, 0.35));
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    const sg = x.createLinearGradient(0, 0, W, H);
    sg.addColorStop(0, K.rgba(P.ground, 0.42));
    sg.addColorStop(0.55, K.rgba(P.ground, 0.06));
    sg.addColorStop(1, K.rgba(P.field, 0));
    x.fillStyle = sg; x.fillRect(0, 0, W, H);
    K.hazeSheet(x, W, H, noise, K.mix(P.field, P.glint, 0.5), 0.2, M * 0.5, 'screen');

    // 2. CAST CAUSTICS on the ground first (glass sits over them).
    for (const shard of L.shards) {
      if (shard.rad < M * 0.04) continue;
      castCaustics(x, noise, shard, P, p.caust, p.lightAng);
    }

    // 3. THE GLASS — faceted shards, painted far->near.
    const ordered = L.shards.slice().sort((a, b) => a.depth - b.depth);
    for (const shard of ordered) {
      const poly = shardPoly(r, shard.cx, shard.cy, shard.rad, shard.squash, shard.rot, shard.sides, shard.jag);
      drawShard(x, poly, shard, P, p.lightAng, glintW);
    }

    // 4. gentle focal lens glow.
    K.bloom(x, fx, fy, M * 0.2, K.mix(P.field, P.glint, 0.5), 0.06);

    // 5. RARE CHASE EVENTS.
    if (p.event === 'Caustic Supernova') {
      x.save(); x.globalCompositeOperation = 'lighter';
      const rays = 110, maxR = Math.max(W, H) * 1.0;
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2 + noise.fbm(i * 0.3, 0, 3);
        const len = maxR * (0.4 + (noise.fbm(i * 0.7, 5, 3) * 0.5 + 0.5) * 0.6);
        const cc = K.mix(P.spectrum[i % P.spectrum.length], P.glint, 0.4);
        x.strokeStyle = K.rgba(cc, 0.09);
        x.lineWidth = 1 + (i % 4) * 0.6;
        x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + Math.cos(a) * len, fy + Math.sin(a) * len); x.stroke();
      }
      K.bloom(x, fx, fy, M * 0.3, P.glint, 0.25);
      x.restore();
    } else if (p.event === 'Prism Split') {
      x.save(); x.translate(fx, fy); x.rotate(p.lightAng);
      const pw = Math.max(W, H) * 0.55, ph = M * 0.1;
      x.globalCompositeOperation = 'lighter';
      const spec = P.spectrum;
      for (let i = 0; i < spec.length; i++) {
        const oy = (i - spec.length / 2) * ph * 0.42;
        const g = x.createLinearGradient(-pw / 2, 0, pw / 2, 0);
        g.addColorStop(0, K.rgba(spec[i], 0)); g.addColorStop(0.5, K.rgba(spec[i], 0.42)); g.addColorStop(1, K.rgba(spec[i], 0));
        x.fillStyle = g; x.fillRect(-pw / 2, oy - ph * 0.25, pw, ph * 0.5);
      }
      x.restore();
    }

    // 6. FILMIC FINISH.
    K.chromaSplit(x, W, H, 2);
    K.grain(x, W, H, 900, r);
    x.save(); x.globalCompositeOperation = 'multiply';
    const vg = x.createRadialGradient(fx, fy, Math.min(W, H) * 0.28, fx, fy, Math.max(W, H) * 0.95);
    vg.addColorStop(0, 'rgba(255,255,255,1)');
    vg.addColorStop(1, K.rgba(K.mix(P.ground, '#ffffff', 0.55), 1));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'glass3', draw, traits };
})();
