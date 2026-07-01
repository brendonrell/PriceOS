/* BALLAST — heavy rough stones suspended over a quiet plain; gravity disobeyed.
 * Small monoliths and weathered boulders HANG in cool still air. Some are held
 * down by hairline threads to little iron pegs in the ground; some cast their
 * shadow far from where they hover; faint dust rings mark where they should have
 * landed. Tanguy-like calm strangeness: a real, plausible plain with ONE law
 * (weight) quietly broken. Cool slate-blue world, rust/ochre stone accents,
 * weathered grey, pale cold sky. Hazy, textured, never flat vector.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six palettes, all the same cool slate-and-rust WORLD, each a different
     weather/hour so the SET reads varied but unmistakably one project.
       sky[3] : zenith → mid → horizon band (cool, pale)
       plain  : the ground plane base
       far    : hazy distance wash near horizon
       stone  : lit face of stone     stoneShade : shaded face / underside
       accent : rust/ochre warm stone variant (the family's warm note)
       thread : hairline tether colour
       ink    : darkest — pegs, deep shadow, silhouettes
       dust   : ground ghost-ring / scuff colour */
  const PALS = [
    { name: 'Slate Calm',    sky: ['#aeb8c2', '#c2cad1', '#d6dade'], plain: '#8f99a3', far: '#c0c7cd', stone: '#6e7882', stoneShade: '#3d454e', accent: '#9a6a4e', thread: '#2f353c', ink: '#222932', dust: '#6b7178' },
    { name: 'Cold Morning',  sky: ['#c5cdd4', '#d6dce0', '#e6e9ea'], plain: '#a3aab0', far: '#d2d7da', stone: '#7b848d', stoneShade: '#474e57', accent: '#a9744f', thread: '#39403f', ink: '#2a3038', dust: '#7d8389' },
    { name: 'Rust Plain',    sky: ['#b6b2ad', '#c7c1b8', '#d8d1c4', ], plain: '#9b8d7d', far: '#cabfaf', stone: '#7a6f64', stoneShade: '#473d35', accent: '#b5805e', thread: '#3a322b', ink: '#2c2620', dust: '#8a7b6a' },
    { name: 'Dusk Slate',    sky: ['#6b7686', '#8a93a0', '#aab0b8'], plain: '#5e6670', far: '#9aa0a8', stone: '#565f69', stoneShade: '#2b313a', accent: '#8a5d44', thread: '#1f242b', ink: '#171c23', dust: '#4d545c' },
    { name: 'Verdigris Grey', sky: ['#aebcb9', '#c2cdca', '#d6dcd8'], plain: '#8a9893', far: '#c0cac6', stone: '#6c7873', stoneShade: '#384340', accent: '#94684d', thread: '#2b332f', ink: '#1f2623', dust: '#69736e' },
    { name: 'Pale Ochre',    sky: ['#c9cdce', '#d8dadb', '#e7e7e4'], plain: '#a89e8e', far: '#d6cfc0', stone: '#857a6c', stoneShade: '#4e453a', accent: '#c08a5e', thread: '#3e362c', ink: '#2e2920', dust: '#94897a' },
  ];

  const MODES = ['Single Float', 'Tethered Cluster', 'Balanced Stack', 'Low Hover', 'Rising Field', 'Displaced Shadow'];
  const FORMATS = [[1040, 1300], [1320, 880]]; // portrait 0.8 / wide 1.5

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  // ── tiny helpers ─────────────────────────────────────────────────────
  // Trace a smooth closed curve through points via midpoint quadratics — turns
  // a coarse polygon into an eroded boulder silhouette.
  function tracePath(x, pts) {
    const n = pts.length;
    const mx = (pts[n - 1][0] + pts[0][0]) / 2, my = (pts[n - 1][1] + pts[0][1]) / 2;
    x.moveTo(mx, my);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      x.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    x.closePath();
  }

  // The rust/ochre is an ACCENT in a muted world — desaturate it toward the
  // neutral stone so it reads as weathered iron-stained rock, never candy orange.
  function rstone(P, warm) { return warm ? K.mix(P.accent, P.stone, 0.28) : P.stone; }
  function rshade(P, warm) { return warm ? K.mix(K.mix(P.accent, P.stone, 0.28), P.ink, 0.55) : P.stoneShade; }

  /* Build a rough boulder/monolith outline (irregular polygon) around (0,0),
     roughly w wide and h tall, base at y=0, bulk above. Returns point list. */
  function stoneOutline(w, h, r, roughness) {
    const n = 14 + (r() * 6 | 0);
    // Craggy weathered rock: a base radius with multi-frequency lumps plus
    // occasional sharp inward chips (fracture facets). One light smoothing pass
    // only — keep the irregular, heavy silhouette, never a polished pebble.
    const raw = [];
    for (let i = 0; i < n; i++) {
      let v = 1 + (r() - 0.5) * roughness;
      if (r() < 0.18) v -= 0.12 + r() * 0.16;     // a chipped flat / fracture
      raw.push(v);
    }
    const rad = [];
    for (let i = 0; i < n; i++) {
      const a = raw[(i - 1 + n) % n], b = raw[i], c = raw[(i + 1) % n];
      rad.push((a + 4 * b + c) / 6);              // light smoothing, lumps survive
    }
    const pts = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const px = Math.cos(ang) * (w / 2) * rad[i];
      const py = -h / 2 + Math.sin(ang) * (h / 2) * rad[i];
      pts.push([px, py]);
    }
    return pts;
  }

  /* Paint a heavy rough stone centred at (cx,cy). Faceted: a lit body gradient,
     a darker underside (it's lit from above-ish), broken facet planes, mottle,
     a chiselled rim. warm = rust/ochre variant. tone shifts value for separation. */
  function paintStone(x, P, cx, cy, w, h, r, noise, warm, tone, depth, rot) {
    const base = K.mix(rstone(P, warm), tone >= 0 ? '#ffffff' : P.ink, Math.abs(tone) * 0.32);
    const shade = K.mix(rshade(P, warm), P.ink, 0.2);
    const lit = K.mix(base, '#ffffff', 0.2);
    // far stones fade toward haze — but kept light so stones stay SOLID rock,
    // never translucent. Only genuinely distant forms pick up real veil.
    const fade = K.clamp((0.55 - depth) * 0.55, 0, 0.32);

    const rough = 0.34 + r() * 0.24;
    const pts = stoneOutline(w, h, r, rough);

    x.save();
    x.translate(cx, cy);
    if (rot) x.rotate(rot);

    // soft contact/ambient darkening under the mass (self-occlusion, underside)
    x.save();
    x.globalCompositeOperation = 'multiply';
    const ug = x.createRadialGradient(0, h * 0.18, 0, 0, h * 0.18, w * 0.7);
    ug.addColorStop(0, K.rgba(P.ink, 0.22));
    ug.addColorStop(1, K.rgba(P.ink, 0));
    x.fillStyle = ug; x.beginPath(); x.ellipse(0, h * 0.22, w * 0.6, h * 0.4, 0, 0, 7); x.fill();
    x.restore();

    // body — opaque flat base first (guarantees no see-through), then gradient
    x.beginPath(); tracePath(x, pts);
    x.fillStyle = base; x.fill();
    const bg = x.createLinearGradient(-w * 0.3, -h * 0.6, w * 0.2, h * 0.55);
    bg.addColorStop(0, K.mix(lit, P.far, fade * 0.4));      // top-left lit
    bg.addColorStop(0.5, K.mix(base, P.far, fade * 0.3));
    bg.addColorStop(0.82, shade);                          // bottom-right shade
    bg.addColorStop(1, K.mix(shade, P.ink, 0.45));         // dark heavy underside
    x.fillStyle = bg; x.fill();

    // clip to the stone for all facet/texture work
    x.save();
    x.beginPath(); tracePath(x, pts); x.clip();

    // broken facet planes — a few angular shadow/light wedges for rock structure
    const facets = 3 + (r() * 4 | 0);
    for (let f = 0; f < facets; f++) {
      const fx = (r() - 0.5) * w, fy = (r() - 0.5) * h;
      const fw = w * (0.3 + r() * 0.6), fh = h * (0.3 + r() * 0.6);
      const ang = (r() - 0.5) * 1.4;
      const dark = r() < 0.55;
      x.save();
      x.translate(fx, fy); x.rotate(ang);
      x.globalCompositeOperation = dark ? 'multiply' : 'screen';
      x.fillStyle = K.rgba(dark ? P.ink : lit, 0.1 + r() * 0.14);
      x.beginPath();
      x.moveTo(-fw / 2, -fh / 2);
      x.lineTo(fw / 2, -fh / 2 + (r() - 0.5) * fh * 0.4);
      x.lineTo(fw / 2 * (0.6 + r() * 0.4), fh / 2);
      x.lineTo(-fw / 2 + (r() - 0.5) * fw * 0.3, fh / 2);
      x.closePath(); x.fill();
      x.restore();
    }

    // weathered grit / pitting
    K.mottle(x, -w / 2, -h / 2, w, h, base, depth > 0.5 ? 24 : 44, r, 'soft-light');
    K.mottle(x, -w / 2, -h / 2, w, h, base, 70, r, 'multiply');
    // fine speckle
    x.save(); x.globalCompositeOperation = 'overlay';
    const sp = Math.floor(w * h / 60);
    for (let i = 0; i < sp; i++) {
      x.fillStyle = K.rgba(r() < 0.5 ? '#000' : '#fff', 0.05 + r() * 0.09);
      x.fillRect((r() - 0.5) * w, (r() - 0.5) * h, 1 + r() * 1.4, 1 + r() * 1.4);
    }
    x.restore();

    // a couple of dark fissures
    const cracks = 1 + (r() * 2 | 0);
    x.save(); x.globalCompositeOperation = 'multiply'; x.lineCap = 'round';
    for (let c = 0; c < cracks; c++) {
      let px = (r() - 0.5) * w * 0.6, py = -h * 0.3 + r() * h * 0.5;
      x.strokeStyle = K.rgba(P.ink, 0.18 + r() * 0.14);
      x.lineWidth = 0.8 + r() * 1.4;
      x.beginPath(); x.moveTo(px, py);
      const seg = 3 + (r() * 3 | 0);
      for (let s = 0; s < seg; s++) { px += (r() - 0.5) * w * 0.25; py += r() * h * 0.18; x.lineTo(px, py); }
      x.stroke();
    }
    x.restore();

    // directional light read INSIDE the clip: a soft bright lobe top-left and a
    // deep terminator sweeping in from the lower-right — this is what makes it
    // read as a heavy lit solid rather than a flat faceted shape.
    x.save();
    x.globalCompositeOperation = 'screen';
    const litG = x.createRadialGradient(-w * 0.22, -h * 0.28, 0, -w * 0.22, -h * 0.28, w * 0.9);
    litG.addColorStop(0, K.rgba(K.mix(lit, '#ffffff', 0.35), 0.32 - fade));
    litG.addColorStop(1, K.rgba(lit, 0));
    x.fillStyle = litG; x.fillRect(-w / 2, -h / 2, w, h);
    x.restore();
    x.save();
    x.globalCompositeOperation = 'multiply';
    const darkG = x.createLinearGradient(-w * 0.1, -h * 0.1, w * 0.55, h * 0.6);
    darkG.addColorStop(0, K.rgba(P.ink, 0));
    darkG.addColorStop(0.55, K.rgba(P.ink, 0));
    darkG.addColorStop(1, K.rgba(P.ink, 0.4));
    x.fillStyle = darkG; x.fillRect(-w / 2, -h / 2, w, h);
    x.restore();
    x.restore(); // unclip

    // chiselled lit rim along the top-left edge — sells stone over blob
    x.save(); x.globalCompositeOperation = 'screen';
    x.strokeStyle = K.rgba(K.mix(lit, '#ffffff', 0.4), 0.32 - fade * 0.3);
    x.lineWidth = 1 + w * 0.01;
    x.beginPath();
    let started = false;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      // only the upper-left arc catches light
      if (p[1] < h * 0.05 && p[0] < w * 0.2) { if (!started) { x.moveTo(p[0], p[1]); started = true; } else x.lineTo(p[0], p[1]); }
    }
    x.stroke();
    x.restore();

    // crisp dark underside rim — weight + that it's lit from above
    x.save(); x.globalCompositeOperation = 'multiply';
    x.strokeStyle = K.rgba(P.ink, 0.3);
    x.lineWidth = 1 + w * 0.012;
    x.beginPath();
    let started2 = false;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p[1] > h * 0.1) { if (!started2) { x.moveTo(p[0], p[1]); started2 = true; } else x.lineTo(p[0], p[1]); }
    }
    x.stroke();
    x.restore();

    // distant haze veil
    if (fade > 0.12) {
      x.save();
      x.fillStyle = K.rgba(P.far, fade * 0.7);
      x.beginPath(); tracePath(x, pts); x.fill();
      x.restore();
    }

    x.restore();
  }

  /* A little iron peg driven into the ground at (gx,gy) on the plain. */
  function paintPeg(x, P, gx, gy, s) {
    x.save();
    // shadow nub
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = K.rgba(P.ink, 0.4);
    x.beginPath(); x.ellipse(gx + s * 0.4, gy + 1, s * 1.3, s * 0.4, 0, 0, 7); x.fill();
    x.restore();
    x.save();
    x.strokeStyle = P.ink; x.lineWidth = s * 0.5; x.lineCap = 'round';
    x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx, gy - s * 2.2); x.stroke();
    // tiny ring/loop top
    x.lineWidth = s * 0.32; x.strokeStyle = K.mix(P.ink, P.stone, 0.3);
    x.beginPath(); x.arc(gx, gy - s * 2.6, s * 0.55, 0, 7); x.stroke();
    x.restore();
  }

  /* A hairline thread from a peg-top to a point on a stone (taut, slightly bowed). */
  function paintThread(x, P, x0, y0, x1, y1, r) {
    x.save();
    x.strokeStyle = K.rgba(P.thread, 0.55);
    x.lineWidth = 0.9;
    // slight sag toward midpoint
    const mx = (x0 + x1) / 2 + (r() - 0.5) * 6;
    const my = (y0 + y1) / 2 + Math.abs(x1 - x0) * 0.04 + 4;
    x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(mx, my, x1, y1); x.stroke();
    // faint highlight strand
    x.strokeStyle = K.rgba('#ffffff', 0.10);
    x.lineWidth = 0.6;
    x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(mx, my, x1, y1); x.stroke();
    x.restore();
  }

  /* A faint dust ring / scuff on the plain — where the stone "should" have landed. */
  function paintDustMark(x, P, gx, gy, rad, r) {
    x.save();
    x.globalCompositeOperation = 'multiply';
    // disturbed darker centre
    const dg = x.createRadialGradient(gx, gy, 0, gx, gy, rad);
    dg.addColorStop(0, K.rgba(K.mix(P.dust, P.ink, 0.35), 0.22));
    dg.addColorStop(0.7, K.rgba(P.dust, 0.10));
    dg.addColorStop(1, K.rgba(P.dust, 0));
    x.fillStyle = dg;
    x.beginPath(); x.ellipse(gx, gy, rad, rad * 0.42, 0, 0, 7); x.fill();
    x.restore();
    // a faint scattered-grit ring
    x.save(); x.globalCompositeOperation = 'multiply';
    const n = 40 + (rad | 0);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, rr = rad * (0.6 + r() * 0.5);
      x.fillStyle = K.rgba(K.mix(P.dust, P.ink, 0.4), 0.05 + r() * 0.08);
      x.fillRect(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr * 0.42, 1 + r() * 1.5, 1 + r());
    }
    x.restore();
  }

  /* A cast shadow pool on the plain for a hovering stone, at (sx,sy), size by w.
     Soft, elongated, sits flat on the ground — possibly displaced from the stone. */
  function paintShadowPool(x, P, sx, sy, w, strength) {
    x.save();
    x.globalCompositeOperation = 'multiply';
    const pr = w * 0.62;
    const g = x.createRadialGradient(sx, sy, 0, sx, sy, pr);
    g.addColorStop(0, K.rgba(P.ink, 0.4 * strength));
    g.addColorStop(0.65, K.rgba(P.ink, 0.16 * strength));
    g.addColorStop(1, K.rgba(P.ink, 0));
    x.fillStyle = g;
    x.beginPath(); x.ellipse(sx, sy, pr, pr * 0.38, 0, 0, 7); x.fill();
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const pal = pickPal(r);
    const P = pal;
    const mode = MODES[(seed % MODES.length + MODES.length) % MODES.length];
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    // high, calm horizon — lots of plain (Tanguy)
    const hz = H * (0.34 + r() * 0.12);
    const groundH = H - hz;

    // ── SKY: pale cool vertical wash ──
    const g = x.createLinearGradient(0, 0, 0, hz + groundH * 0.1);
    g.addColorStop(0, P.sky[0]);
    g.addColorStop(0.62, P.sky[1]);
    g.addColorStop(1, P.sky[2]);
    x.fillStyle = g; x.fillRect(0, 0, W, hz + 2);

    // diffuse light source high in the sky (no hard sun — overcast calm)
    const lightX = W * (0.28 + r() * 0.44);
    const lightY = hz * (0.12 + r() * 0.22);
    K.bloom(x, lightX, lightY, Math.min(W, H) * (0.55 + r() * 0.3), K.mix(P.sky[0], '#ffffff', 0.5), 0.22);

    // soft drifting cloud bands in the upper sky
    x.save(); x.globalCompositeOperation = 'screen';
    const bands = 3 + (r() * 3 | 0);
    for (let i = 0; i < bands; i++) {
      const by = hz * (0.18 + (i / bands) * 0.7);
      const bh = hz * (0.06 + r() * 0.12);
      x.fillStyle = K.rgba(K.mix(P.sky[0], '#ffffff', 0.4), 0.05 + r() * 0.07);
      x.fillRect(0, by, W, bh);
    }
    x.restore();
    K.hazeSheet(x, W, hz + groundH * 0.12, noise, K.mix(P.sky[2], '#ffffff', 0.3), 0.1, Math.min(W, H) * 0.85, 'screen');

    // ── GROUND: quiet plain, far→near value shift ──
    const pg = x.createLinearGradient(0, hz, 0, H);
    pg.addColorStop(0, K.mix(P.plain, P.far, 0.62));      // far = hazy, pale
    pg.addColorStop(0.14, K.mix(P.plain, P.far, 0.18));
    pg.addColorStop(0.55, P.plain);
    pg.addColorStop(1, K.mix(P.plain, P.ink, 0.5));        // near = notably darker — tonal anchor
    x.fillStyle = pg; x.fillRect(0, hz, W, groundH);

    // ground-haze band hugging the horizon (depth/air)
    const gh = x.createLinearGradient(0, hz - H * 0.03, 0, hz + groundH * 0.18);
    const hazeCol = K.mix(P.far, '#ffffff', 0.25);
    gh.addColorStop(0, K.rgba(hazeCol, 0)); gh.addColorStop(0.5, K.rgba(hazeCol, 0.38)); gh.addColorStop(1, K.rgba(hazeCol, 0));
    x.fillStyle = gh; x.fillRect(0, hz - H * 0.03, W, groundH * 0.22);

    // faint receding seams on the plain (subtle ground reading)
    x.save(); x.globalCompositeOperation = 'multiply';
    const vpx = W * (0.5 + (r() - 0.5) * 0.4);
    const seams = 7 + (r() * 5 | 0);
    for (let i = 0; i < seams; i++) {
      const fx = (i / seams) * W + (r() - 0.5) * 30;
      x.strokeStyle = K.rgba(K.mix(P.plain, P.ink, 0.5), 0.05 + r() * 0.04);
      x.lineWidth = 1;
      x.beginPath(); x.moveTo(fx, H); x.lineTo(vpx + (fx - vpx) * 0.05, hz + 3); x.stroke();
    }
    // a few horizontal cracks
    for (let i = 0; i < 4; i++) {
      const t = (i + 1) / 6, yy = hz + groundH * t * t;
      x.strokeStyle = K.rgba(K.mix(P.plain, P.ink, 0.4), 0.05);
      x.lineWidth = 1; x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke();
    }
    x.restore();
    K.mottle(x, 0, hz, W, groundH, P.plain, 80, r, 'overlay');

    // ── BUILD STONES per mode ──
    // A "stone" record: {gx (ground x), gy (ground y this stone belongs to),
    //  cx,cy (centre of hovering mass), w,h, warm, tone, depth, hover(px)}
    const stones = [];
    const pegs = [];     // {gx,gy,s, toStone}
    const threads = [];  // {x0,y0,x1,y1}
    const dust = [];     // {gx,gy,rad}
    const pools = [];    // {sx,sy,w,strength}

    // wide format carries more horizontal room, so size up to avoid a small
    // subject lost in a big frame.
    const wide = W > H;
    const fmtScale = wide ? 1.25 : 1.0;

    // depth from a ground y: nearer (lower) = bigger
    function depthAt(gy) { return K.clamp((gy - hz) / groundH, 0, 1); }
    function scaleAt(depth) { return (0.4 + Math.pow(depth, 1.05) * 1.0) * fmtScale; }

    function addStone(gx, gy, sizeMul, hoverMul, warm, opts) {
      opts = opts || {};
      const depth = depthAt(gy);
      const sc = scaleAt(depth) * (sizeMul || 1);
      // boulders wider than tall; monoliths taller — pick per stone
      const monolith = opts.monolith != null ? opts.monolith : r() < 0.4;
      const baseW = groundH * (0.2 + r() * 0.12) * sc;
      const w = monolith ? baseW * (0.62 + r() * 0.18) : baseW * (1.0 + r() * 0.35);
      const h = monolith ? baseW * (1.5 + r() * 0.6) : baseW * (0.7 + r() * 0.3);
      let hover = (hoverMul != null ? hoverMul : (0.6 + r() * 1.2)) * h + groundH * 0.04;
      const cx = gx;
      let cy = gy - hover - h * 0.5;
      // keep the whole mass inside the frame with a comfortable top margin —
      // a stone floating out of view is a dead frame, never allowed.
      const topMargin = H * 0.1;
      if (cy - h / 2 < topMargin) { cy = topMargin + h / 2; hover = gy - cy - h * 0.5; }
      const tone = (r() - 0.5) * 0.4;
      // every floating mass gets its own slight tilt — gravity's broken, so they
      // don't all hang plumb. monoliths lean a touch more than squat boulders.
      const rotRange = (monolith ? 0.26 : 0.16) * (opts.rotMul != null ? opts.rotMul : 1);
      const rot = opts.rot != null ? opts.rot : (r() - 0.5) * 2 * rotRange;
      // small horizontal drift of the hovering centre off the ground anchor —
      // the mass need not float dead-plumb above where it "belongs".
      const driftX = opts.noDrift ? 0 : (r() - 0.5) * w * 0.5;
      stones.push({ gx, gy, cx: cx + driftX, cy, w, h, warm, tone, depth, hover, rot });
      return stones[stones.length - 1];
    }

    if (mode === 'Single Float') {
      // one substantial stone hovering, dead-calm composition. Anchor anywhere
      // across the plain; hover height, scale, tilt and ground anchor all roam
      // so no two single-floats are the same stone in the same spot.
      const gx = W * (0.18 + r() * 0.64);
      const gy = hz + groundH * (0.42 + r() * 0.42);
      const s = addStone(gx, gy, 1.35 + r() * 0.95, 0.45 + r() * 1.15, r() < 0.4, { rotMul: 1.3 });
      // its honest shadow pool below the ground anchor (not the drifted mass)
      pools.push({ sx: gx + (r() - 0.5) * s.w * 0.3, sy: gy, w: s.w * (0.9 + r() * 0.35), strength: 0.85 + r() * 0.3 });
      // faint dust ghost a touch off
      if (r() < 0.7) dust.push({ gx: gx + (r() - 0.5) * s.w * 0.9, gy: gy + 4 + r() * 8, rad: s.w * (0.55 + r() * 0.5) });
      // sometimes a much smaller far companion floating elsewhere
      if (r() < 0.5) {
        const fgx = W * (0.12 + r() * 0.76);
        const fgy = hz + groundH * (0.3 + r() * 0.35);
        const fs = addStone(fgx, fgy, 0.4 + r() * 0.35, 0.8 + r() * 1.4, r() < 0.3, { rotMul: 1.4 });
        if (r() < 0.6) pools.push({ sx: fgx, sy: fgy, w: fs.w, strength: 0.6 });
      }
      // a scatter of tiny grounded pebbles for scale + to break dead plain
      const npeb = 1 + (r() * 4 | 0);
      for (let i = 0; i < npeb; i++) {
        const px = W * (0.06 + r() * 0.88);
        const py = hz + groundH * (0.45 + r() * 0.5);
        const d = depthAt(py), sc = scaleAt(d) * (0.32 + r() * 0.22);
        const pw = groundH * 0.12 * sc, ph = groundH * 0.075 * sc;
        stones.push({ gx: px, gy: py, cx: px, cy: py - ph * 0.4, w: pw, h: ph, warm: r() < 0.3, tone: -0.1, depth: d, hover: 0, grounded: true, rot: (r() - 0.5) * 0.5 });
        pools.push({ sx: px, sy: py + 2, w: pw, strength: 1.1 });
      }
    } else if (mode === 'Tethered Cluster') {
      // a loose cluster of stones held down by threads to pegs
      const n = 2 + (r() * 4 | 0);
      const baseGx = W * (0.25 + r() * 0.5);
      const spread = W * (0.4 + r() * 0.4);
      for (let i = 0; i < n; i++) {
        const gx = K.clamp(baseGx + (r() - 0.5) * spread, W * 0.06, W * 0.94);
        const gy = hz + groundH * (0.32 + r() * 0.56);
        const s = addStone(gx, gy, 0.55 + r() * 0.75, 0.5 + r() * 1.1, r() < 0.32, { rotMul: 1.2 });
        // a peg slightly to the side, with a thread up to the stone's underside
        const pgx = gx + (r() - 0.5) * s.w * 1.2;
        const pgy = gy + (r() - 0.5) * 8;
        const ps = Math.max(3, s.w * 0.05);
        pegs.push({ gx: pgx, gy: pgy, s: ps });
        threads.push({ x0: pgx, y0: pgy - ps * 2.6, x1: s.cx + (r() - 0.5) * s.w * 0.3, y1: s.cy + s.h * 0.35 });
        pools.push({ sx: gx, sy: gy, w: s.w, strength: 0.85 });
      }
    } else if (mode === 'Balanced Stack') {
      // an impossible cairn — stones stacked with gaps of air between them. The
      // column wanders: each stone leans off the axis, tilts its own way, the
      // taper and gaps roam — so no two cairns are the same plumb tower recolored.
      const gx = W * (0.26 + r() * 0.48);
      const gy = hz + groundH * (0.82 + r() * 0.12);
      const n = 3 + (r() * 4 | 0);
      // overall lean of the whole cairn + how much each stone wanders sideways
      const leanDir = (r() - 0.5) * 2;
      const wander = w => w * (0.12 + r() * 0.4);
      const taperStep = 0.08 + r() * 0.1;
      let cursorY = gy;
      let curW = groundH * (0.28 + r() * 0.16) * fmtScale;
      let axisX = gx;
      const baseW = curW;
      for (let i = 0; i < n; i++) {
        const depth = depthAt(gy);
        const w = curW * (0.96 - i * taperStep) * (0.82 + r() * 0.32);
        const h = w * (0.42 + r() * 0.42);
        const gap = i === 0 ? 0 : groundH * (0.015 + r() * 0.075); // floating gaps between
        const cy = cursorY - h / 2;
        const tone = (r() - 0.5) * 0.4;
        // each stone drifts off the running axis; the axis itself creeps in the lean dir
        const cx = axisX + wander(w) * (r() - 0.5) * 2 + leanDir * w * 0.18;
        axisX += leanDir * w * 0.08 * (r() * 0.6 + 0.2);
        const rot = (r() - 0.5) * (0.18 + i * 0.04) + leanDir * 0.05;
        stones.push({ gx, gy, cx, cy, w, h, warm: r() < 0.32, tone, depth, hover: gy - cy, rot });
        cursorY = cy - h / 2 - gap;
      }
      pools.push({ sx: gx + leanDir * baseW * 0.15, sy: gy + 4, w: baseW * (1.0 + r() * 0.3), strength: 0.85 + r() * 0.3 });
      if (r() < 0.6) dust.push({ gx: gx + baseW * (r() - 0.2) * 0.9, gy: gy + 8, rad: baseW * (0.45 + r() * 0.3) });
    } else if (mode === 'Low Hover') {
      // a few stones hovering only just off the ground — quiet, almost landed
      const n = 2 + (r() * 4 | 0);
      const jitter = 0.4 + r() * 0.5;
      for (let i = 0; i < n; i++) {
        const gx = W * K.clamp(0.1 + (i + (r() - 0.5) * jitter) / n * 0.8 + (r() - 0.5) * 0.12, 0.05, 0.95);
        const gy = hz + groundH * (0.42 + r() * 0.5);
        const s = addStone(gx, gy, 0.6 + r() * 0.75, 0.08 + r() * 0.3, r() < 0.32);
        pools.push({ sx: gx + (r() - 0.5) * s.w * 0.2, sy: gy, w: s.w * (0.9 + r() * 0.3), strength: 0.85 + r() * 0.3 });
        if (r() < 0.45) dust.push({ gx: gx + (r() - 0.5) * s.w * 0.4, gy: gy + 4, rad: s.w * (0.45 + r() * 0.35) });
      }
    } else if (mode === 'Rising Field') {
      // many stones ascending across the plain, smaller/higher with distance
      const n = 5 + (r() * 6 | 0);
      // the rise sometimes sweeps left→right, sometimes radiates — pick per output
      const sweep = r() < 0.5 ? 1 : -1;
      const riseGain = 1.1 + r() * 1.2;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const gx = W * (0.04 + r() * 0.92);
        const gy = hz + groundH * (0.28 + r() * 0.66);
        // higher hover for those further "along" the rise (direction varies)
        const along = sweep > 0 ? t : 1 - t;
        const rise = 0.35 + along * riseGain + r() * 0.7;
        const s = addStone(gx, gy, 0.45 + r() * 0.6, rise, r() < 0.28, { rotMul: 1.3 });
        if (r() < 0.4) pools.push({ sx: gx + (r() - 0.5) * s.w * 0.3, sy: gy, w: s.w, strength: 0.6 + r() * 0.3 });
      }
    } else { // Displaced Shadow
      // one to three stones whose shadow pools sit far from where they hover
      const n = 1 + (r() * 3 | 0);
      for (let i = 0; i < n; i++) {
        const gx = W * (0.18 + r() * 0.64);
        const gy = hz + groundH * (0.48 + r() * 0.4);
        const s = addStone(gx, gy, 0.8 + r() * 0.8, 0.7 + r() * 1.1, r() < 0.3, { rotMul: 1.3 });
        // shadow displaced strongly to one side
        const dir = r() < 0.5 ? -1 : 1;
        const sx = K.clamp(gx + dir * W * (0.15 + r() * 0.26), W * 0.08, W * 0.92);
        pools.push({ sx, sy: gy + (r() - 0.5) * groundH * 0.08, w: s.w * (1.0 + r() * 0.3), strength: 1.0 + r() * 0.25 });
        // dust ghost where it should have fallen (under the stone)
        if (r() < 0.85) dust.push({ gx: gx + (r() - 0.5) * s.w * 0.3, gy: gy + 4, rad: s.w * (0.6 + r() * 0.4) });
      }
    }

    // ── PAINT ORDER: dust marks → shadow pools → pegs → stones(sorted far→near) → threads ──
    for (const d of dust) paintDustMark(x, P, d.gx, d.gy, d.rad, r);
    for (const p of pools) paintShadowPool(x, P, p.sx, p.sy, p.w, p.strength);
    for (const pg of pegs) paintPeg(x, P, pg.gx, pg.gy, pg.s);

    stones.sort((a, b) => a.depth - b.depth);
    for (const s of stones) paintStone(x, P, s.cx, s.cy, s.w, s.h, r, noise, s.warm, s.tone, s.depth, s.rot);

    // threads drawn after stones so they read in front, but with low alpha
    for (const t of threads) paintThread(x, P, t.x0, t.y0, t.x1, t.y1, r);

    // ── FINISHING ATMOSPHERE & TEXTURE ──
    // overall cool haze wash for air
    K.hazeSheet(x, W, H, noise, K.mix(P.far, '#ffffff', 0.2), 0.06, Math.min(W, H) * 0.95, 'screen');
    // gentle top-of-frame cool gradient for depth
    const tg = x.createLinearGradient(0, 0, 0, H);
    tg.addColorStop(0, K.rgba(P.sky[0], 0.16)); tg.addColorStop(0.45, 'rgba(0,0,0,0)');
    x.fillStyle = tg; x.fillRect(0, 0, W, H);
    K.grain(x, W, H, 5.0, r);
    K.vignette(x, W, H, P.name === 'Dusk Slate' ? 0.4 : 0.3);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = MODES[(seed % MODES.length + MODES.length) % MODES.length];
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Wide' : 'Portrait';
    const weatherMap = {
      'Slate Calm': 'Still', 'Cold Morning': 'Frost', 'Rust Plain': 'Dry',
      'Dusk Slate': 'Dusk', 'Verdigris Grey': 'Damp', 'Pale Ochre': 'Bleached',
    };
    return { Palette: pal.name, Mode: mode, Format: f, Weather: weatherMap[pal.name] };
  }

  return { name: 'h4_ballast', draw, traits };
})();
