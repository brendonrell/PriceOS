/* MONOLITHS — a Dalí-esque surreal plain of colossal slabs.
 * A vast hazy plain (desert / salt-flat) under a saturated strange sky. Across it
 * stand and FLOAT colossal monolithic forms — slabs, arches, broken rectangles,
 * a tilted hovering cube, a leaning obelisk — casting LONG impossible shadows
 * that don't all agree on the light direction ("real but off"). Mirage heat-bands
 * shimmer the bases. Tiny silhouetted figures for scale. Deep atmospheric
 * perspective: forms fade into colored haze with distance.
 * Semi-abstract, saturated, future-evoking — NOT cyberpunk, NOT outrun. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Each palette = a saturated surreal world.
  // sky1=zenith, sky2=horizon glow, sun=light body, stone=monolith base,
  // stone2=secondary face tint, ground=plain, haze=distance wash, ink=silhouette.
  // ARID RED-EARTH territory: oxblood, terracotta, burnt sienna, rust, bone/sand
  // highlights, with bruise-violet or cold-slate shadow as the cool counterpoint.
  // Must read unmistakably "red desert" from afar — no green/teal/blue-dominant.
  // sky1=zenith (cool counterpoint), sky2=horizon glow (warm), sun=light body,
  // stone=monolith base, stone2=shadow-face tint, ground=plain, haze=distance, ink.
  const PALS = [
    { name: 'Oxblood Waste',    sky1: '#2a0712', sky2: '#c5314a', sun: '#ffba6e', stone: '#8a2230', stone2: '#4a1430', ground: '#b8534a', haze: '#e0644f', ink: '#160306' },
    { name: 'Terracotta Dusk',  sky1: '#3a1024', sky2: '#ff7a2e', sun: '#ffd27a', stone: '#c4663a', stone2: '#5e2438', ground: '#dd8b52', haze: '#ff9e5a', ink: '#1c0810' },
    { name: 'Burnt Sienna',     sky1: '#2c0e1e', sky2: '#e0532a', sun: '#ffc168', stone: '#a8482a', stone2: '#552038', ground: '#c46a3e', haze: '#f0784a', ink: '#190509' },
    { name: 'Bruised Rust',     sky1: '#1d0a2e', sky2: '#d6452f', sun: '#ffcaa0', stone: '#9c3f2e', stone2: '#3a1c5a', ground: '#bd5a3e', haze: '#e2705a', ink: '#120420' },
    { name: 'Bone & Clay',      sky1: '#3a1e1a', sky2: '#e89a5e', sun: '#fff0d4', stone: '#b56a44', stone2: '#6a3038', ground: '#d8a06c', haze: '#f0c290', ink: '#1e0e0a' },
    { name: 'Crimson Mesa',     sky1: '#240612', sky2: '#e22038', sun: '#ffb05e', stone: '#9e2a2e', stone2: '#4e1024', ground: '#c2483a', haze: '#e85a44', ink: '#150308' },
    { name: 'Cold-Slate Earth', sky1: '#1a1426', sky2: '#c86a4a', sun: '#ffd2a4', stone: '#a85636', stone2: '#39405e', ground: '#bd7050', haze: '#d68f68', ink: '#0e0b16' },
    { name: 'Ember Salt',       sky1: '#310a16', sky2: '#ff8a3a', sun: '#ffe2a0', stone: '#bf5e36', stone2: '#642a3e', ground: '#e0975a', haze: '#ffac66', ink: '#1a060c' },
  ];

  const FMTS = [ { W: 1500, H: 1000, t: 'Vista' }, { W: 1340, H: 1340, t: 'Window' }, { W: 1080, H: 1440, t: 'Portal' } ];
  const GROUNDS = ['Salt Flat', 'Desert', 'Mirror'];
  const SKIES = ['Clear', 'Banded', 'Eclipsed'];

  // monolith archetypes — weighted so slabs/obelisks dominate and Ring is rare
  // (a Ring should feel like a singular grand event, not scattered washers).
  const ARCHS = ['Slab', 'Slab', 'Slab', 'Obelisk', 'Obelisk', 'Arch', 'Broken', 'Cube', 'Plinth', 'Ring'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const ground = K.pick(GROUNDS, r);
    const sky = K.pick(SKIES, r);
    const count = K.rint(r, 5, 8);
    const figures = r() < 0.85;
    return { pal, fmt, ground, sky, count, figures };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Palette: p.pal.name,
      Format: p.fmt.t,
      Ground: p.ground,
      Sky: p.sky,
      Forms: p.count >= 7 ? 'Many' : 'Few',
    };
  }

  // ── SKY ──────────────────────────────────────────────────────────────
  function skyGradient(x, P, W, H, hY) {
    const g = x.createLinearGradient(0, 0, 0, hY);
    g.addColorStop(0, P.sky1);
    g.addColorStop(0.55, K.mix(P.sky1, P.sky2, 0.5));
    g.addColorStop(1, P.sky2);
    x.fillStyle = g; x.fillRect(0, 0, W, hY + 2);
  }

  function skyBands(x, P, W, hY, r, noise) {
    x.save(); x.globalCompositeOperation = 'screen';
    const n = K.rint(r, 7, 12);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const y = hY * (0.25 + 0.72 * t) - r() * 14;
      const h = 8 + r() * 46 * (0.3 + t);
      const a = 0.05 + t * 0.13 * r();
      x.fillStyle = K.rgba(K.mix(P.haze, P.sun, t * 0.5), a);
      x.fillRect(0, y, W, h);
    }
    x.restore();
  }

  function lightBody(x, P, W, hY, r, sx, sy, sunR, eclipse) {
    if (eclipse) {
      K.bloom(x, sx, sy, sunR * 3.4, P.sun, 0.5);
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 110; i++) { const a = r() * Math.PI * 2, len = sunR * (1.1 + r() * 1.5); x.strokeStyle = K.rgba(P.sun, 0.05 + r() * 0.09); x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(sx + Math.cos(a) * sunR, sy + Math.sin(a) * sunR); x.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len); x.stroke(); }
      x.restore();
      const g = x.createRadialGradient(sx, sy, sunR * 0.2, sx, sy, sunR); g.addColorStop(0, P.ink); g.addColorStop(0.86, P.ink); g.addColorStop(1, K.rgba(P.sun, 0.4));
      x.fillStyle = g; x.beginPath(); x.arc(sx, sy, sunR, 0, Math.PI * 2); x.fill();
    } else {
      K.bloom(x, sx, sy, sunR * 2.6, P.sun, 0.32);
      const g = x.createRadialGradient(sx - sunR * 0.2, sy - sunR * 0.2, sunR * 0.1, sx, sy, sunR);
      g.addColorStop(0, K.mix(P.sun, '#ffffff', 0.4));
      g.addColorStop(0.7, P.sun);
      g.addColorStop(1, K.mix(P.sun, P.sky2, 0.5));
      x.fillStyle = g; x.beginPath(); x.arc(sx, sy, sunR, 0, Math.PI * 2); x.fill();
    }
  }

  // ── GROUND ───────────────────────────────────────────────────────────
  function ground(x, P, W, H, hY, r, noise, kind) {
    const g = x.createLinearGradient(0, hY, 0, H);
    g.addColorStop(0, K.mix(P.ground, P.haze, 0.5));            // far = hazy
    g.addColorStop(0.35, K.mix(P.ground, P.sky2, 0.12));
    g.addColorStop(1, K.mix(P.ground, P.ink, 0.4));            // near = darker
    x.fillStyle = g; x.fillRect(0, hY, W, H - hY);

    // mottled texture on the plain
    K.mottle(x, 0, hY, W, H - hY, P.ground, 90, r, 'overlay');

    // cracked-flat / faint perspective lines toward horizon (salt-flat seams)
    if (kind !== 'Mirror') {
      x.save(); x.globalCompositeOperation = 'overlay';
      const vpx = W * (0.5 + (r() - 0.5) * 0.3);
      const lines = K.rint(r, 10, 18);
      for (let i = 0; i < lines; i++) {
        const fx = (i / lines) * W;
        x.strokeStyle = K.rgba(K.mix(P.ground, '#000', 0.4), 0.06 + r() * 0.05);
        x.lineWidth = 1;
        x.beginPath(); x.moveTo(fx, H); x.lineTo(vpx + (fx - vpx) * 0.04, hY + 4); x.stroke();
      }
      x.restore();
    }
  }

  // ── MONOLITH SHAPES ──────────────────────────────────────────────────
  // Returns the screen-space footprint center x for shadow casting.
  function drawMonolith(x, P, m, r, noise) {
    const { type, cx, baseY, w, h, lean, float, depth, tone } = m;
    // depth 0(far)..1(near). Far forms fade into haze + desaturate.
    const fade = 1 - depth; // amount of haze blend
    x.save();
    x.translate(cx, baseY - (float || 0));
    x.rotate(lean || 0);

    // per-form value shift so neighbours separate
    const tn = tone || 0;
    const stoneBase = tn >= 0 ? K.mix(P.stone, '#fff', tn) : K.mix(P.stone, P.ink, -tn);
    const lit = K.mix(stoneBase, '#fff', 0.16);
    const dark = K.mix(P.stone2, P.ink, 0.25);

    function box(bx, by, bw, bh, light) {
      // simple 2.5D: front face + a slim side face for solidity
      const side = bw * 0.16;
      // side face
      x.fillStyle = K.mix(dark, P.ink, 0.15);
      x.beginPath(); x.moveTo(bx + bw, by); x.lineTo(bx + bw + side, by - side * 0.5); x.lineTo(bx + bw + side, by + bh - side * 0.5); x.lineTo(bx + bw, by + bh); x.closePath(); x.fill();
      // top face
      x.fillStyle = K.mix(light ? lit : stoneBase, '#fff', 0.1);
      x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + side, by - side * 0.5); x.lineTo(bx + bw + side, by - side * 0.5); x.lineTo(bx + bw, by); x.closePath(); x.fill();
      // front face
      const fg = x.createLinearGradient(bx, by, bx + bw, by + bh);
      fg.addColorStop(0, K.mix(light ? lit : K.mix(P.stone2, P.ink, 0.2), P.haze, 0.04));
      fg.addColorStop(1, K.mix(light ? stoneBase : K.mix(P.stone2, P.ink, 0.35), P.ink, 0.14));
      x.fillStyle = fg;
      x.fillRect(bx, by, bw, bh);
      // bright lit edge (left) to catch the light body
      x.fillStyle = K.rgba(K.mix(lit, '#fff', 0.3), 0.4); x.fillRect(bx, by, Math.max(2, bw * 0.04), bh);
      // crisp dark base + right edge so near forms read as solid stone (not glass)
      if (depth > 0.4) {
        x.fillStyle = K.rgba(K.mix(P.stone2, P.ink, 0.4), 0.5 * depth);
        x.fillRect(bx, by + bh - Math.max(2, bh * 0.02), bw, Math.max(2, bh * 0.02));
        x.fillRect(bx + bw - Math.max(2, bw * 0.03), by, Math.max(2, bw * 0.03), bh);
      }
      // vertical striations + painterly grit
      x.save(); x.globalCompositeOperation = 'overlay';
      for (let i = 0; i < Math.floor(bw / 5); i++) { x.fillStyle = K.rgba(r() < 0.5 ? '#000' : '#fff', 0.03 + r() * 0.05); const lx = bx + r() * bw; x.fillRect(lx, by, 1, bh); }
      x.restore();
      K.mottle(x, bx, by, bw, bh, stoneBase, 55, r, 'soft-light');
    }

    function bodyGrad(x0, y0, ww, hh) {
      const g = x.createLinearGradient(x0, y0, x0 + ww, y0 + hh);
      g.addColorStop(0, K.mix(lit, P.haze, 0.04));
      g.addColorStop(1, K.mix(stoneBase, P.ink, 0.16));
      return g;
    }

    if (type === 'Slab') {
      box(-w / 2, -h, w, h, true);
    } else if (type === 'Obelisk') {
      // tapered tall form
      const tw = w * 0.4;
      x.fillStyle = bodyGrad(-w / 2, -h, w, h);
      x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(-tw / 2, -h); x.lineTo(tw / 2, -h); x.lineTo(w / 2, 0); x.closePath(); x.fill();
      // lit edge
      x.fillStyle = K.rgba(K.mix(lit, '#fff', 0.3), 0.5); x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(-tw / 2, -h); x.lineTo(-tw / 2 + 6, -h); x.lineTo(-w / 2 + 8, 0); x.closePath(); x.fill();
    } else if (type === 'Cube') {
      box(-w / 2, -h, w, h * 0.9, true);
    } else if (type === 'Plinth') {
      box(-w / 2, -h, w, h, true);
      box(-w * 0.32, -h - h * 0.5, w * 0.64, h * 0.5, true);
    } else if (type === 'Arch') {
      const th = w * 0.22; // leg thickness
      x.fillStyle = bodyGrad(-w / 2, -h, w, h);
      x.beginPath();
      x.moveTo(-w / 2, 0); x.lineTo(-w / 2, -h); x.lineTo(w / 2, -h); x.lineTo(w / 2, 0);
      x.lineTo(w / 2 - th, 0); x.lineTo(w / 2 - th, -h + th);
      // inner arch (rounded top)
      x.arc(0, -h + th, w / 2 - th, 0, Math.PI, true);
      x.lineTo(-w / 2 + th, 0);
      x.closePath(); x.fill();
      x.fillStyle = K.rgba(K.mix(lit, '#fff', 0.3), 0.4); x.fillRect(-w / 2, -h, Math.max(2, w * 0.03), h);
    } else if (type === 'Broken') {
      // a slab with a jagged top break
      const bh = h * (0.55 + r() * 0.3);
      x.fillStyle = bodyGrad(-w / 2, -bh, w, bh);
      x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(-w / 2, -bh);
      let steps = 5; for (let i = 0; i <= steps; i++) { const tx = -w / 2 + (w * i / steps); const ty = -bh + (r() - 0.5) * h * 0.4; x.lineTo(tx, ty); }
      x.lineTo(w / 2, 0); x.closePath(); x.fill();
      x.fillStyle = K.rgba(K.mix(lit, '#fff', 0.3), 0.4); x.fillRect(-w / 2, -bh, Math.max(2, w * 0.04), bh);
    } else if (type === 'Ring') {
      // a solid standing ring (a hole monolith). Fill the hole with ground/haze
      // colour (NOT transparent) so the light body never shows through.
      const cyR = -h * 0.62, rad = w * 0.5;
      x.fillStyle = bodyGrad(-rad, cyR - rad, rad * 2, rad * 2);
      x.beginPath(); x.arc(0, cyR, rad, 0, Math.PI * 2); x.fill();
      // inner hole = a darker recess, opaque
      x.fillStyle = K.mix(P.stone2, P.ink, 0.5);
      x.beginPath(); x.arc(0, cyR, rad * 0.42, 0, Math.PI * 2); x.fill();
      x.fillStyle = K.rgba(K.mix(lit, '#fff', 0.2), 0.35);
      x.lineWidth = rad * 0.06; x.strokeStyle = K.rgba(lit, 0.4);
      x.beginPath(); x.arc(0, cyR, rad * 0.78, Math.PI * 0.7, Math.PI * 1.5); x.stroke();
    }

    x.restore();

    // haze veil over distant forms (atmospheric perspective) — gated to truly
    // FAR forms only and kept light, so mid-ground stone stays solid (not glass).
    if (fade > 0.45) {
      const veil = (fade - 0.45) / 0.55;     // 0 at depth .55, 1 at far
      x.save();
      x.fillStyle = K.rgba(P.haze, veil * 0.42);
      const top = baseY - h - (float || 0) - 20, ht = h + (float || 0) + 40;
      x.fillRect(cx - w, top, w * 2.4, ht);
      x.restore();
    }
  }

  // long surreal shadow on the ground — each can disagree on light dir.
  // GROUNDED forms: shadow starts at the form's base. FLOATING forms: a detached
  // pool sits on the ground directly below, with a clear gap above — the read
  // that sells "hovering".
  function castShadow(x, P, m, hY, H, r) {
    const { cx, baseY, w, h, float } = m;
    const ang = m.shadowAng;            // light direction (per-form, "off")
    const len = m.shadowLen * h;
    const dx = Math.cos(ang) * len, dy = Math.abs(Math.sin(ang)) * len * 0.5 + 6;
    x.save();
    x.globalCompositeOperation = 'multiply';

    if (float) {
      // detached oval pool on the ground beneath the floating mass
      const gy = baseY;                 // the ground row this form belongs to
      const px = cx + dx * 0.35, py = gy + dy * 0.25;
      const pr = w * 0.6;
      const pg = x.createRadialGradient(px, py, 0, px, py, pr);
      pg.addColorStop(0, K.rgba(P.ink, 0.42));
      pg.addColorStop(1, K.rgba(P.ink, 0));
      x.fillStyle = pg;
      x.save(); x.translate(px, py); x.scale(1, 0.4); x.beginPath(); x.arc(0, 0, pr, 0, Math.PI * 2); x.fill(); x.restore();
    } else {
      const g = x.createLinearGradient(cx, baseY, cx + dx, baseY + dy);
      g.addColorStop(0, K.rgba(P.ink, 0.5));
      g.addColorStop(1, K.rgba(P.ink, 0));
      x.fillStyle = g;
      const hw = w * 0.5;
      x.beginPath();
      x.moveTo(cx - hw, baseY);
      x.lineTo(cx + hw, baseY);
      x.lineTo(cx + dx + hw * 0.3, baseY + dy);
      x.lineTo(cx + dx - hw * 0.3, baseY + dy);
      x.closePath(); x.fill();
    }
    x.restore();
  }

  // mirage heat-band shimmer at the base of forms / along horizon
  function mirage(x, P, W, hY, r, noise) {
    x.save(); x.globalCompositeOperation = 'screen';
    const bands = K.rint(r, 8, 13);
    for (let i = 0; i < bands; i++) {
      const y = hY + i * (3 + r() * 6);
      const a = 0.14 * (1 - i / bands);
      x.fillStyle = K.rgba(K.mix(P.haze, P.sun, 0.45), a);
      x.fillRect(0, y, W, 2 + r() * 3);
    }
    x.restore();
  }

  // tiny silhouetted figures for scale
  function figures(x, P, W, hY, H, r, noise) {
    const n = K.rint(r, 2, 5);
    x.save(); x.fillStyle = K.rgba(P.ink, 0.85);
    for (let i = 0; i < n; i++) {
      const t = r();                       // distance band
      const fy = hY + 14 + t * (H - hY) * 0.5;
      const fx = r() * W;
      const s = 4 + t * 16;
      // simple standing figure
      x.beginPath();
      x.ellipse(fx, fy - s, s * 0.18, s * 0.22, 0, 0, Math.PI * 2); // head
      x.fill();
      x.fillRect(fx - s * 0.12, fy - s * 0.78, s * 0.24, s * 0.78); // body
      // long shadow
      x.save(); x.globalCompositeOperation = 'multiply';
      x.fillStyle = K.rgba(P.ink, 0.4);
      x.fillRect(fx - s * 0.12, fy, s * 1.4 * (r() < 0.5 ? 1 : -1), s * 0.1);
      x.restore();
      x.fillStyle = K.rgba(P.ink, 0.85);
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const hY = H * (p.fmt.t === 'Portal' ? 0.52 : 0.46) + (r() - 0.5) * H * 0.06;

    // sky
    skyGradient(x, P, W, H, hY);
    if (p.sky === 'Banded') skyBands(x, P, W, hY, r, noise);
    K.hazeSheet(x, W, hY, noise, P.haze, 0.14, 300, 'screen');

    // light body
    const eclipse = p.sky === 'Eclipsed';
    const sunR = W * (0.06 + r() * 0.06);
    const sx = W * (0.2 + r() * 0.6), sy = hY * (0.25 + r() * 0.5);
    lightBody(x, P, W, hY, r, sx, sy, sunR, eclipse);

    // ground
    ground(x, P, W, H, hY, r, noise, p.ground);

    // build monoliths sorted far->near (depth). Distribute across depth bands
    // so the scene reads as a deep plain, not one giant slab. Cap near scale.
    const forms = [];
    const groundH = H - hY;
    for (let i = 0; i < p.count; i++) {
      // jittered even spread across depth, biased to keep most forms mid/far
      const depth = K.clamp(((i + 0.5) / p.count) + (r() - 0.5) * (0.7 / p.count), 0.02, 0.98);
      const dd = Math.pow(depth, 1.35);
      const baseY = hY + 6 + dd * groundH * 0.92;
      // size grows with nearness but capped so nothing eats the frame
      const scale = 0.22 + Math.pow(depth, 1.15) * 0.85;
      const type = K.pick(ARCHS, r);
      // Ring stands tall and grand; others normal range.
      const baseH = groundH * (type === 'Ring' ? 0.85 + r() * 0.5 : 0.55 + r() * 0.7) * scale;
      const w = baseH * (type === 'Slab' ? 0.2 + r() * 0.14 : type === 'Obelisk' ? 0.16 + r() * 0.08 : type === 'Ring' ? 0.62 + r() * 0.18 : 0.26 + r() * 0.3);
      const cx = W * (0.06 + r() * 0.88);
      // floating: a real, obvious gap above the ground — the signature surreal beat.
      const isFloat = r() < 0.28;
      const float = isFloat ? baseH * (0.5 + r() * 0.8) + 14 : 0;
      const lean = r() < 0.4 ? (r() - 0.5) * (isFloat ? 0.5 : 0.3) : 0;
      // each shadow disagrees on light dir — surreal. Wider spread = more "off".
      const shadowAng = (r() - 0.5) * 1.9;
      const shadowLen = 1.6 + r() * 2.8;
      // per-form value offset so adjacent slabs separate (not one flat mass)
      const tone = (r() - 0.5) * 0.45;
      forms.push({ type, cx, baseY, w, h: baseH, lean, float, depth, shadowAng, shadowLen, tone });
    }
    forms.sort((a, b) => a.depth - b.depth);

    // shadows first (so forms sit on top), then forms
    for (const m of forms) castShadow(x, P, m, hY, H, r);
    for (const m of forms) drawMonolith(x, P, m, r, noise);

    // mirage at horizon
    mirage(x, P, W, hY, r, noise);

    // figures
    if (p.figures) figures(x, P, W, hY, H, r, noise);

    // finishing atmosphere
    K.hazeSheet(x, W, H, noise, P.sky2, 0.05, 220, 'screen');
    K.bloom(x, sx, sy, sunR * 2.2, P.sun, 0.18);
    K.grain(x, W, H, 540, r);
    K.chromaSplit(x, W, H, 1);
    x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.36); x.restore();
    // top light gradient for depth
    const tg = x.createLinearGradient(0, 0, 0, H); tg.addColorStop(0, K.rgba(P.sky1, 0.22)); tg.addColorStop(0.5, 'rgba(0,0,0,0)'); x.fillStyle = tg; x.fillRect(0, 0, W, H);

    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 't_monoliths', draw, traits };
})();
